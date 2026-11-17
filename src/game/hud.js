// Boutons, menu des réglages, clavier, affichage de conduite
import { $, clamp, fmtMoney } from '../engine/util.js';
import { QKEY } from '../engine/quality.js';
import { STATIONS } from '../world/land.js';
import { canvas } from '../engine/renderer.js';
import { applyTime } from '../engine/lighting.js';
import { game, EX, input } from './state.js';
import { PLATFORM_HALF, STOP_MARK } from '../world/tracks.js';
import { PRODUITS } from '../world/cities.js';
import { nextOptions, train, CAM_MODES, cam, setCamMode, CAM_LABELS, upcomingLimit, stationOffset, chosenNext } from './train.js';
import { toast, closeMap, openMap } from './ui.js';
import { audio } from './audio.js';
import { setNotch, doFlip, closeStation, openStation, save, SAVE_KEY, loadOffer, dropSlot, upgrade, LEVELS, pkm, fmtTime } from './railgame.js';

function cycleSwitch(dir) {
  const { st, opts } = nextOptions();
  if (st < 0 || opts.length < 2) return;
  const k = (train.switchSel[st] ?? 0) + dir;
  train.switchSel[st] = (k + opts.length) % opts.length;
  game.routeOverride = true;
  audio.tone(520, 0.08, 'square', 0.05);
  updateHud(true);
}
function cycleCam() { const i = CAM_MODES.indexOf(cam.mode); setCamMode(CAM_MODES[(i + 1) % CAM_MODES.length]); toast('Vue : ' + CAM_LABELS[cam.mode]); }
window.addEventListener('keydown', e => {
  if (!game.started || EX.on) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.repeat && !['ArrowUp', 'ArrowDown', 'z', 'w', 's'].includes(k)) return;
  audio.resume();
  switch (k) {
    case 'ArrowUp': case 'z': case 'w': setNotch(train.notch + 1); break;
    case 'ArrowDown': case 's': setNotch(train.notch - 1); break;
    case ' ': setNotch(-3); e.preventDefault(); break;
    case 'ArrowLeft': case 'q': case 'a': cycleSwitch(-1); break;
    case 'ArrowRight': case 'd': cycleSwitch(1); break;
    case 'h': audio.horn(); break;
    case 'c': case 'v': cycleCam(); break;
    case 'm': $('map').classList.contains('open') ? closeMap() : openMap(); break;
    case 'f': toggleFF(); break;
    case 'r': doFlip(); break;
    case 'e': case 'Enter': if (game.stoppedAt >= 0 && train.v < 0.3) game.panelOpen ? closeStation() : openStation(STATIONS[game.stoppedAt]); break;
    case 'Escape': closeMap(); closeStation(); $('menu').classList.remove('open'); break;
  }
});
// manette tactile
(() => {
  const lev = $('lever');
  let active = false;
  const fromY = y => { const r = lev.querySelector('.track').getBoundingClientRect(); const k = clamp((y - r.top) / r.height, 0, 1); setNotch(Math.round(5 - k * 8)); };
  lev.addEventListener('pointerdown', e => { active = true; lev.setPointerCapture(e.pointerId); fromY(e.clientY); audio.resume(); e.stopPropagation(); });
  lev.addEventListener('pointermove', e => { if (active) fromY(e.clientY); });
  lev.addEventListener('pointerup', () => { active = false; });
  lev.addEventListener('pointercancel', () => { active = false; });
})();
// regarder autour / orbiter
(() => {
  let last = null;
  canvas.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; input.dragging = true; cam.idle = 0; audio.resume(); });
  window.addEventListener('pointermove', e => {
    if (!last) return;
    const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
    if (cam.mode === 'cabine') { cam.yaw = clamp(cam.yaw - dx * 0.005, -2.4, 2.4); cam.pitch = clamp(cam.pitch - dy * 0.004, -0.8, 0.6); cam.idle = 0; }
    else if (cam.mode === 'poursuite') { cam.orbitYaw -= dx * 0.006; cam.orbitPitch = clamp(cam.orbitPitch + dy * 0.004, 0.02, 1.3); }
  });
  window.addEventListener('pointerup', () => { last = null; input.dragging = false; });
  canvas.addEventListener('wheel', e => { if (cam.mode === 'poursuite') cam.orbitDist = clamp(cam.orbitDist * (e.deltaY > 0 ? 1.1 : 0.9), 18, 160); }, { passive: true });
})();
function toggleFF() { game.ff = game.ff === 1 ? 3 : 1; $('b-ff').textContent = game.ff === 1 ? '×1' : '×3'; $('b-ff').classList.toggle('on', game.ff > 1); }
$('b-map').onclick = () => openMap();
$('map-close').onclick = () => closeMap();
$('b-cam').onclick = () => cycleCam();
$('b-ff').onclick = () => toggleFF();
$('b-horn').onpointerdown = e => { e.stopPropagation(); audio.resume(); audio.horn(); };
$('b-sw-l').onclick = () => cycleSwitch(-1);
$('b-sw-r').onclick = () => cycleSwitch(1);
$('b-gare').onclick = () => { if (game.stoppedAt >= 0 && train.v < 0.3) openStation(STATIONS[game.stoppedAt]); };
$('b-flip-hud').onclick = () => doFlip();
$('b-menu').onclick = () => $('menu').classList.add('open');
$('menu-close').onclick = () => $('menu').classList.remove('open');
$('opt-sound').onchange = e => { game.sound = e.target.checked; audio.setOn(game.sound); save(); };
$('opt-voice').onchange = e => { game.voice = e.target.checked; save(); };
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === QKEY) return; try { localStorage.setItem('porkonia-q3', b.dataset.q); } catch (e) { } save(); location.reload(); });
document.querySelectorAll('[data-time]').forEach(b => b.onclick = () => { applyTime(b.dataset.time); });
$('opt-reset').onclick = () => { if ($('opt-reset').dataset.armed) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); } else { $('opt-reset').dataset.armed = '1'; $('opt-reset').textContent = 'Touchez encore pour confirmer'; } };
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.load) loadOffer(b.dataset.load);
  if (b.dataset.drop) dropSlot(+b.dataset.drop);
  if (b.dataset.up) upgrade(b.dataset.up);
});

// ---------- HUD
let hudT = 0;
export function updateHud(force) {
  hudT -= 1; if (hudT > 0 && !force) return; hudT = 6;
  $('money').textContent = fmtMoney(game.money);
  $('speed').textContent = Math.round(train.v * 3.6);
  const lim = upcomingLimit(900);
  const limKmh = Math.min(Math.round(lim.v * 3.6 / 5) * 5, LEVELS[game.lvl].vmax);
  const curLim = train.cur.t.vlim(train.cur.s);
  const over = train.v > curLim * 1.08;
  $('limit').textContent = limKmh;
  $('limit-box').classList.toggle('over', over);
  $('limit-at').textContent = lim.at > 40 ? 'dans ' + Math.round(lim.at / 10) * 10 + ' m' : 'ici';
  // prochain arrêt
  const { st, opts } = nextOptions();
  const c = train.cur;
  const remain = c.d > 0 ? c.t.L - c.s : c.s;
  const so = stationOffset();
  const atPlatform = so && train.v < 0.3 && so.off > -PLATFORM_HALF + 20 && so.off < PLATFORM_HALF + 20;
  const inPlat = so && so.off >= 0 && so.off < PLATFORM_HALF + 20;
  if (inPlat) {
    $('next-k').textContent = train.v < 0.3 ? 'À quai' : 'En gare';
    $('next-name').textContent = STATIONS[so.st].name;
    $('next-dist').textContent = so.off < STOP_MARK ? `repère d'arrêt dans ${Math.round(STOP_MARK - so.off)} m` : `repère dépassé de ${Math.round(so.off - STOP_MARK)} m`;
  } else if (st < 0) { $('next-k').textContent = 'Voie en impasse'; $('next-name').textContent = 'Heurtoir'; $('next-dist').textContent = 'dans ' + Math.round(remain) + ' m'; }
  else {
    const d = remain + STOP_MARK;
    $('next-k').textContent = 'Prochain arrêt';
    $('next-name').textContent = STATIONS[st].name;
    $('next-dist').textContent = d > 1000 ? pkm(d) : `repère d'arrêt dans ${Math.round(d)} m`;
  }
  // aiguillage
  const sw = $('switch');
  if (st >= 0 && opts.length > 1 && remain < 2500) {
    sw.classList.add('show');
    const ch = chosenNext(st, opts);
    $('sw-to').textContent = ch.to >= 0 ? STATIONS[ch.to].name : 'Voie en impasse';
    $('sw-at').textContent = 'Aiguillage à ' + STATIONS[st].name;
    $('sw-count').textContent = (opts.indexOf(ch) + 1) + '/' + opts.length;
  } else sw.classList.remove('show');
  // itinéraire
  const rb = $('route');
  if (game.route) {
    rb.classList.add('show');
    $('route-to').textContent = STATIONS[game.route.target].name;
    const st0 = game.route.states[0];
    $('route-hint').textContent = game.routeReverseAt >= 0 ? `Arrêtez-vous à ${STATIONS[game.routeReverseAt].name} et inversez le sens` : (st0 && st0.how === 'flip' && st0.t === train.cur.t && st0.d === train.cur.d ? 'Aiguillages réglés' : st0 && st0.how === 'flip' ? 'Inversez le sens pour partir' : 'Aiguillages réglés');
  } else rb.classList.remove('show');
  // wagons
  $('cargo').innerHTML = game.slots.map(cn => cn ? `<div class="cg ${game.now > cn.dueAt ? 'late' : ''}"><b>${STATIONS[cn.to].name}</b><span>${cn.good === 'voyageurs' ? cn.units + ' voy.' : PRODUITS[cn.good].nom.split(' (')[0]} · ${fmtTime(cn.dueAt - game.now)}</span></div>` : '').join('');
  const paxAboard = game.slots.some(cn => cn && cn.good === 'voyageurs');
  $('comfort').style.display = paxAboard ? '' : 'none';
  $('comfort-v').textContent = Math.round(train.comfort) + ' %';
  $('comfort').classList.toggle('low', train.comfort < 60);
  $('b-gare').style.display = atPlatform && !game.panelOpen ? '' : 'none';
  $('b-flip-hud').style.display = train.v < 0.3 && !game.panelOpen ? '' : 'none';
  $('clock').textContent = clockText();
}
function clockText() { const m = (6 * 60 + 12 + Math.floor(game.now / 4)) % (24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
