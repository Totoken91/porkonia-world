// Balade libre : piéton, voiture, cochon de monte
import * as THREE from 'three';
import { $, clamp, lerp } from '../engine/util.js';
import { STATION_BY_NAME, STATIONS, WW, HH } from '../world/land.js';
import { scene, camera, canvas } from '../engine/renderer.js';
import { groundAt } from '../world/registry.js';
import { EX, EX_SAVE, game } from './state.js';
import { makePorc, makeCarInterior } from '../world/assets.js';
import { buildColliders, inWater, collide } from '../world/roads.js';
import { rebuildConsist, setCamMode, cam, train, stationOffset, nextOptions, advanceHead, flipTrain } from './train.js';
import { toast, mapState, closeMap, openMap } from './ui.js';
import { buildNpcs, updateNpcs } from './npc.js';
import { updateFlyers } from './flyers.js';
import { sfxInit, sfxHorn } from './sfx.js';
import { DRIVE, carSetModel, carNextModel, driveUpdate, driveCamera } from './drive.js';

export function exPlacePlayer(x, z, yaw) { const P = EX.P; P.x = x; P.z = z; if (yaw !== undefined) P.yaw = yaw; P.y = groundAt(x, z) + 1.62; }
export function exPlaceCar(x, z, yaw) { const c = EX.car; c.x = x; c.z = z; c.yaw = yaw; c.camYaw = yaw; c.v = c.vx = c.vz = c.yawRate = 0; c.drift = false; c.y = groundAt(x, z); }
function exTownSpawn(st) {
  const tw = st.town;
  if (tw && tw.spawn) return { p: tw.spawn, car: tw.carSpot, yaw: Math.atan2(-tw.T.U[0], -tw.T.U[1]), carYaw: Math.atan2(tw.T.U[0], tw.T.U[1]) };
  const x = st.x - st.dir.y * 14, z = st.z + st.dir.x * 14;
  return { p: [x, z], car: [x - st.dir.y * 8, z + st.dir.x * 8], yaw: 0, carYaw: Math.atan2(st.dir.x, st.dir.y) };
}
export function exTeleport(st) {
  const s = exTownSpawn(st);
  exPlacePlayer(s.p[0], s.p[1], s.yaw); exPlaceCar(s.car[0], s.car[1], s.carYaw);
  { const g = EX.pig; g.x = s.p[0] - Math.sin(s.yaw) * 5 + Math.cos(s.yaw) * 2; g.z = s.p[1] - Math.cos(s.yaw) * 5 - Math.sin(s.yaw) * 2; g.yaw = s.yaw + 2.2; if (EX.mode === 'porc') { g.x = s.p[0]; g.z = s.p[1]; } }
  if (EX.mode === 'auto') { EX.car.x = s.car[0]; EX.car.z = s.car[1]; }
  EX.city = -1; exHud(true);
}
export function exInit() {
  buildColliders();
  buildNpcs();
  let modele = 'porkette'; try { modele = JSON.parse(localStorage.getItem(EX_SAVE) || '{}').model || modele; } catch (e) { /* sauvegarde illisible */ }
  carSetModel(modele);
  { const pa = makePorc(); const pm = new THREE.Mesh(pa.geo, pa.mat); pm.castShadow = true; pm.receiveShadow = true; pm.scale.setScalar(0.82); scene.add(pm); EX.pig.mesh = pm; EX.pig.U = pa.U; }
  const st = STATION_BY_NAME['Douzi City'] || STATIONS[0];
  exTeleport(st);
  try { const s = JSON.parse(localStorage.getItem(EX_SAVE) || 'null'); if (s && isFinite(s.x) && !inWater(s.x, s.z)) { exPlacePlayer(s.x, s.z, s.yaw); if (isFinite(s.cx)) exPlaceCar(s.cx, s.cz, s.cyaw || 0); } } catch (e) { }
  exBuildHud(); exBindInput();
  // train autonome avec quelques wagons
  try { rebuildConsist([{ good: 'voyageurs' }, { good: 'voyageurs' }, { good: 'biere' }, { good: 'cereales' }, { good: 'jambons' }]); } catch (e) { }
}
export function exStart() {
  game.started = true;
  $('title').classList.add('gone');
  document.body.classList.add('playing', 'explore');
  setCamMode('poursuite'); cam.mode = 'libre'; scene.add(camera);
  camera.near = 0.2; camera.fov = 68; camera.updateProjectionMatrix();
  exSetView(); exHud(true);
  toast('<b>Bienvenue à Porkonia</b> · baladez-vous à pied, appelez votre voiture, ouvrez la carte pour changer de ville');
}

// ---------- train autonome
const AT = { wait: 0, served: -1 };
function autoTrain(dt) {
  if (AT.wait > 0) { AT.wait -= dt; train.v = 0; train.notch = 0; return; }
  let target = Math.min(train.cur.t.vlim(train.cur.s), 23);
  const so = stationOffset();
  if (!so) AT.served = -1;
  else if (so.st !== AT.served && so.off < 0) {
    target = Math.min(target, 2 + Math.sqrt(Math.max(0, -so.off - 6)));
    if (so.off > -8) {
      AT.wait = 14; AT.served = so.st; train.v = 0;
      try { const { st, opts } = nextOptions(); if (st >= 0 && opts.length) train.switchSel[st] = (Math.random() * opts.length) | 0; } catch (e) { }
      return;
    }
  }
  train.v += clamp(target - train.v, -0.9 * dt, 0.45 * dt);
  train.notch = train.v < target - 0.5 ? 3 : 0;
  if (advanceHead(train.v * dt) === 'heurtoir') { train.v = 0; try { flipTrain(); } catch (e) { } AT.wait = 6; }
}

// ---------- déplacements
const _ep = { x: 0, z: 0 };
export function exUpdate(dt) {
  autoTrain(dt);
  const I = EX.inp;
  I.fx = clamp(I.kx + I.jx, -1, 1); I.fz = clamp(I.kz + I.jz, -1, 1); I.brake = !!(I.kb || I.hb);
  if (EX.mode !== 'auto') {
    const P = EX.P, mag = Math.min(1, Math.hypot(I.fx, I.fz)), ride = EX.mode === 'porc';
    const run = I.run || P.run || Math.hypot(I.jx, I.jz) > 0.93;
    const sp = (ride ? (run ? 15 : 7) : (run ? 7.5 : 2.6)) * mag;
    if (mag > 0.02) {
      const s = Math.sin(P.yaw), c = Math.cos(P.yaw);
      const dx = (-s * I.fz + c * I.fx) / Math.max(mag, 1e-6) * sp * dt, dz = (-c * I.fz - s * I.fx) / Math.max(mag, 1e-6) * sp * dt;
      _ep.x = P.x + dx; _ep.z = P.z + dz;
      collide(_ep, ride ? 0.9 : 0.45);
      if (ride) { const g = EX.pig; let da = Math.atan2(dx, dz) - g.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); g.yaw += da * Math.min(1, dt * 7); g.ph += sp * dt * 1.5; }
      if (!inWater(_ep.x, _ep.z)) { P.x = clamp(_ep.x, -WW / 2 + 20, WW / 2 - 20); P.z = clamp(_ep.z, -HH / 2 + 20, HH / 2 - 20); }
      P.bob += sp * dt * 1.9;
    }
    const g = EX.pig; g.amp = lerp(g.amp, ride && mag > 0.02 ? 1 : 0, 1 - Math.pow(0.01, dt));
    if (ride) { g.x = P.x; g.z = P.z; }
    const gy = groundAt(P.x, P.z) + (ride ? 2.02 + 0.05 * Math.abs(Math.sin(g.ph)) * g.amp : 1.62);
    P.y = lerp(P.y, gy, 1 - Math.pow(0.0005, dt));
  } else { EX.P.x = EX.car.x; EX.P.z = EX.car.z; if (!EX.dragging && Math.abs(EX.car.v) > 2) EX.car.orbit *= Math.pow(0.12, dt); }
  driveUpdate(dt, I, EX.mode === 'auto');   // la voiture garde son élan même quand on en est descendu
  updateFlyers(dt);
  { const g = EX.pig; g.y = lerp(g.y || groundAt(g.x, g.z), groundAt(g.x, g.z), 1 - Math.pow(0.001, dt)); g.mesh.position.set(g.x, g.y, g.z); g.mesh.rotation.y = g.yaw; g.U.uPorc.value.set(g.ph, g.amp); }
  const c = EX.car;
  updateNpcs(dt);
  EX.hudT -= dt; if (EX.hudT <= 0) { EX.hudT = 0.25; exHud(false); }
  EX.saveT -= dt; if (EX.saveT <= 0) { EX.saveT = 5; try { localStorage.setItem(EX_SAVE, JSON.stringify({ x: EX.P.x, z: EX.P.z, yaw: EX.P.yaw, cx: c.x, cz: c.z, cyaw: c.yaw, model: c.model })); } catch (e) { } }
}
export function exCamera(dt) {
  if (EX.mode === 'porc' && EX.view !== 'cockpit') {
    const P = EX.P, g = EX.pig, d = 6.2, cp = Math.cos(0.32);
    let x = P.x + Math.sin(P.yaw) * d * cp, z = P.z + Math.cos(P.yaw) * d * cp, y = g.y + 1.6 + Math.sin(0.32 - P.pitch * 0.6) * d;
    y = Math.max(y, groundAt(x, z) + 0.6); camera.position.set(x, y, z); camera.lookAt(P.x, g.y + 1.5, P.z);
  } else if (EX.mode !== 'auto') {
    const P = EX.P, ride = EX.mode === 'porc';
    const bx = ride ? Math.sin(EX.pig.yaw) * -0.25 : 0, bz = ride ? Math.cos(EX.pig.yaw) * -0.25 : 0;
    camera.position.set(P.x + bx, P.y + (ride ? 0 : Math.sin(P.bob) * 0.035), P.z + bz);
    camera.rotation.set(P.pitch, P.yaw, 0, 'YXZ');
  } else if (EX.view === 'cockpit') {
    const c = EX.car; c.mesh.updateMatrixWorld(true);
    const e = OEIL[c.model]; camera.position.set(e[0], e[1], e[2]).applyMatrix4(c.chassis.matrixWorld);
    _eq.setFromEuler(_ee.set(c.lookP, Math.PI + c.lookY, 0, 'YXZ'));
    camera.quaternion.copy(c.mesh.quaternion).multiply(_eq);
    if (DRIVE.shake > 0.01) camera.position.y += (Math.random() - 0.5) * DRIVE.shake * 0.08;
    if (!EX.dragging && Math.abs(c.v) > 1.5) { c.lookY *= Math.pow(0.25, dt); c.lookP *= Math.pow(0.25, dt); }
    const ud = c.cabin.userData; ud.wheel.rotation.z = -c.steer * 1.7; ud.needle.rotation.z = -(-135 + clamp(Math.abs(c.v) * 3.6, 0, 160) / 160 * 270) * Math.PI / 180;
  } else driveCamera(dt);
}
// position des yeux du conducteur dans chaque modèle (conduite à gauche)
const OEIL = { porkette: [0.3, 1.2, -0.3], berline: [0.36, 1.16, -0.3], fourgon: [0.4, 1.56, 0.62], bolide: [0.36, 1.0, -0.32] };
const _eq = new THREE.Quaternion(), _ee = new THREE.Euler();
export function exSetView() {
  const cockpit = EX.mode === 'auto' && EX.view === 'cockpit';
  if (cockpit && !EX.car.cabin) { const e = OEIL[EX.car.model]; EX.car.cabin = makeCarInterior([123, 30, 46]); EX.car.cabin.position.set(e[0] - 0.36, e[1] - 1.26, e[2] + 0.26); EX.car.chassis.add(EX.car.cabin); }
  if (EX.car.body) EX.car.body.visible = !cockpit;
  if (EX.car.cabin) EX.car.cabin.visible = cockpit;
  camera.near = cockpit ? 0.06 : 0.2; camera.fov = cockpit ? 74 : 68; camera.updateProjectionMatrix();
  document.body.classList.toggle('driving', EX.mode === 'auto');
  const b = $('ex-view'); if (b) { b.style.display = EX.mode !== 'pied' ? '' : 'none'; b.textContent = EX.view === 'cockpit' ? 'Vue extérieure' : EX.mode === 'porc' ? 'Vue cavalier' : 'Vue habitacle'; }
}
export function exToggleView() { EX.view = EX.view === 'cockpit' ? 'ext' : 'cockpit'; EX.car.lookY = EX.car.lookP = 0; exSetView(); }
export function exTogglePig() {
  const g = EX.pig, P = EX.P;
  if (EX.mode === 'auto') return;
  if (EX.mode === 'porc') { EX.mode = 'pied'; const lx = Math.cos(g.yaw), lz = -Math.sin(g.yaw); _ep.x = g.x + lx * 1.6; _ep.z = g.z + lz * 1.6; collide(_ep, 0.45); exPlacePlayer(_ep.x, _ep.z); }
  else if (Math.hypot(g.x - P.x, g.z - P.z) < 6) { EX.mode = 'porc'; P.x = g.x; P.z = g.z; }
  else { const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw); _ep.x = P.x + fx * 4; _ep.z = P.z + fz * 4; collide(_ep, 1.0); if (inWater(_ep.x, _ep.z)) { toast('Le cochon refuse de nager'); return; } g.x = _ep.x; g.z = _ep.z; g.yaw = P.yaw + Math.PI / 2; g.y = groundAt(g.x, g.z); toast('Votre cochon est arrivé'); }
  exSetView(); exHud(true);
}
export function exToggleCar() {
  if (EX.mode === 'porc') return;
  const c = EX.car, P = EX.P;
  if (EX.mode === 'auto') {
    if (Math.hypot(c.vx, c.vz) > 3) { toast('Arrêtez-vous avant de descendre'); return; }
    const lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw);
    _ep.x = c.x + lx * 2.2; _ep.z = c.z + lz * 2.2; collide(_ep, 0.45);
    EX.mode = 'pied'; exPlacePlayer(_ep.x, _ep.z, c.yaw + Math.PI); P.pitch = 0; c.v = 0;
  } else if (Math.hypot(c.x - P.x, c.z - P.z) < 7) { EX.mode = 'auto'; c.orbit = 0; c.lookY = c.lookP = 0; c.camYaw = c.yaw; sfxInit(); }
  else {
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    _ep.x = P.x + fx * 6; _ep.z = P.z + fz * 6; collide(_ep, 1.6);
    if (inWater(_ep.x, _ep.z)) { toast('Pas de place pour la voiture ici'); return; }
    exPlaceCar(_ep.x, _ep.z, P.yaw + Math.PI / 2 + Math.PI);
    toast('Votre voiture est arrivée');
  }
  exSetView(); exHud(true);
}

// ---------- affichage
function exBuildHud() {
  const css = document.createElement('style');
  css.textContent = `
    body.explore #next, body.explore #route, body.explore #cargo, body.explore #purse, body.explore #b-cam, body.explore #b-ff, body.explore #hud-bl, body.explore #hud-br { display: none !important; }
    #ex-loc { padding: 10px 16px 12px; }
    #ex-loc .k { font: 600 12px/1.1 var(--f-body); letter-spacing: .12em; text-transform: uppercase; opacity: .8; }
    #ex-loc .n { font: 22px/1.05 var(--f-display); margin-top: 4px; }
    #ex-loc .s { font: 600 14px/1.25 var(--f-body); margin-top: 5px; opacity: .92; }
    #ex-br { position: fixed; right: 14px; bottom: 16px; display: none; flex-direction: column; align-items: flex-end; gap: 10px; z-index: 6; }
    body.explore #ex-br { display: flex; }
    #ex-br button { font: 600 16px/1 var(--f-body); letter-spacing: .04em; padding: 14px 18px; border-radius: 999px; border: 3px solid var(--bordeaux); background: var(--creme); color: var(--bordeaux); box-shadow: 0 5px 0 var(--bordeaux-deep); touch-action: manipulation; }
    #ex-br button.on { background: var(--bordeaux); color: var(--creme); }
    #ex-speed { font: 28px/1 var(--f-display); color: var(--creme); background: var(--bordeaux); padding: 10px 16px; border-radius: 10px; display: none; font-variant-numeric: tabular-nums; }
    #ex-speed small { font: 600 12px var(--f-body); margin-left: 4px; }
    #ex-hits { font: 600 13px var(--f-body); color: var(--creme); background: var(--bordeaux-deep); padding: 5px 10px; border-radius: 8px; display: none; }
    #ex-hb, #ex-model { display: none; }
    body.driving #ex-hb { display: block; user-select: none; -webkit-user-select: none; }
    body.driving #ex-model.ok { display: block; }
    #ex-drift { position: fixed; left: 50%; top: 18%; transform: translateX(-50%) scale(.9); font: 26px/1 var(--f-display); color: var(--creme); background: var(--bordeaux); padding: 10px 18px 9px; border-radius: 10px; box-shadow: 0 5px 0 var(--bordeaux-deep); opacity: 0; transition: opacity .2s, transform .2s; z-index: 6; pointer-events: none; white-space: nowrap; font-variant-numeric: tabular-nums; }
    #ex-drift.on { opacity: 1; transform: translateX(-50%) scale(1); }
    #ex-drift.hot { background: var(--or); color: var(--encre); }
    #ex-joy { position: fixed; width: 120px; height: 120px; margin: -60px 0 0 -60px; border-radius: 50%; border: 3px solid rgba(243,231,201,.7); background: rgba(23,17,14,.25); display: none; z-index: 5; pointer-events: none; }
    #ex-joy i { position: absolute; left: 50%; top: 50%; width: 52px; height: 52px; margin: -26px; border-radius: 50%; background: rgba(243,231,201,.85); }
    #ex-help { position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%); font: 600 13px var(--f-body); color: rgba(255,248,232,.9); text-shadow: 0 1px 3px #000; display: none; z-index: 4; white-space: nowrap; }
    @media (hover: hover) and (pointer: fine) and (min-width: 1000px) { body.explore #ex-help { display: block; } }
    @media (max-width: 700px) { #ex-loc .n { font-size: 17px; } #ex-loc .s { font-size: 12px; } }`;
  document.head.appendChild(css);
  const loc = document.createElement('div'); loc.id = 'ex-loc'; loc.className = 'plate passive';
  loc.innerHTML = '<div class="k" id="ex-k"></div><div class="n" id="ex-n"></div><div class="s" id="ex-s"></div>';
  $('hud-tl').prepend(loc);
  const br = document.createElement('div'); br.id = 'ex-br';
  br.innerHTML = '<div id="ex-hits"></div><div id="ex-speed"><span id="ex-kmh">0</span><small>km/h</small></div><button id="ex-hb">Frein à main</button><button id="ex-model">Changer de voiture</button><button id="ex-view">Vue extérieure</button><button id="ex-run">Courir</button><button id="ex-pig">Cochon</button><button id="ex-act">Voiture</button>';
  document.body.appendChild(br);
  const joy = document.createElement('div'); joy.id = 'ex-joy'; joy.innerHTML = '<i></i>'; document.body.appendChild(joy);
  const help = document.createElement('div'); help.id = 'ex-help'; help.textContent = 'ZQSD / flèches : bouger · souris : regarder · Maj : courir · E : voiture · P : cochon · V : vue · Espace : frein à main · G : changer de voiture · H : klaxon · M : carte';
  document.body.appendChild(help);
  $('ex-act').onclick = e => { e.stopPropagation(); exToggleCar(); };
  $('ex-pig').onclick = e => { e.stopPropagation(); exTogglePig(); };
  $('ex-view').onclick = e => { e.stopPropagation(); exToggleView(); };
  $('ex-model').onclick = e => { e.stopPropagation(); carNextModel(); exSetView(); };
  { const hb = $('ex-hb'), set = v => e => { e.stopPropagation(); e.preventDefault(); EX.inp.hb = v; hb.classList.toggle('on', v); };
    hb.addEventListener('pointerdown', set(true)); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) hb.addEventListener(ev, set(false)); }
  $('ex-run').onclick = e => { e.stopPropagation(); EX.P.run = !EX.P.run; $('ex-run').classList.toggle('on', EX.P.run); };
}
function exNearestCity() { let best = null, bd = 1e9; for (const st of STATIONS) { const tw = st.town, cx = tw ? tw.C[0] : st.x, cz = tw ? tw.C[1] : st.z, d = Math.hypot(cx - EX.P.x, cz - EX.P.z); if (d < bd) { bd = d; best = st; } } return { st: best, d: bd }; }
function exHud(force) {
  if (!$('ex-k')) return;
  const { st, d } = exNearestCity(), m = st.meta, inside = d < (m.R || 300) + 140;
  const key = inside ? st.id : -2 - st.id;
  if (force || key !== EX.city) {
    if (inside) {
      $('ex-k').textContent = m.region || 'Porkonia'; $('ex-n').textContent = st.name;
      $('ex-s').textContent = (m.pop ? m.pop.toLocaleString('fr-FR') + ' habitants · ' : '') + (m.spec || '');
      if (!force && game.started) toast(`<b>${st.name}</b> · ${m.spec || ''}`);
    } else { $('ex-k').textContent = 'Campagne de Porkonia'; $('ex-n').textContent = 'Vers ' + st.name; }
    EX.city = key;
  }
  if (!inside) $('ex-s').textContent = (d / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' km à vol de cochon';
  const auto = EX.mode === 'auto', near = Math.hypot(EX.car.x - EX.P.x, EX.car.z - EX.P.z) < 7;
  $('ex-act').textContent = auto ? 'Descendre' : near ? 'Monter en voiture' : 'Appeler la voiture';
  $('ex-run').style.display = auto ? 'none' : '';
  { const ride = EX.mode === 'porc', np = Math.hypot(EX.pig.x - EX.P.x, EX.pig.z - EX.P.z) < 6; $('ex-pig').style.display = auto ? 'none' : ''; $('ex-pig').textContent = ride ? 'Descendre du cochon' : np ? 'Monter sur le cochon' : 'Appeler le cochon'; $('ex-act').style.display = ride ? 'none' : ''; $('ex-run').textContent = ride ? 'Galoper' : 'Courir'; }
  $('ex-speed').style.display = auto ? 'block' : 'none';
  if (auto) { $('ex-kmh').textContent = Math.round(Math.hypot(EX.car.vx, EX.car.vz) * 3.6); $('ex-model').classList.toggle('ok', Math.hypot(EX.car.vx, EX.car.vz) < 1); }
}
export function exMapInfo() {
  const el = $('map-info'), st = STATIONS[mapState.sel];
  if (!st) { el.innerHTML = '<p class="muted">Touchez une ville pour la découvrir et vous y rendre.</p>'; return; }
  const m = st.meta;
  el.innerHTML = `<h3>${st.name}</h3><p>${m.region || ''}</p><p class="muted">${m.pop ? m.pop.toLocaleString('fr-FR') + ' habitants. ' : ''}${m.spec || ''}.</p><button class="btn small" id="m-go">S’y rendre</button>`;
  $('m-go').onclick = () => { exTeleport(st); closeMap(); toast(`Vous voici à <b>${st.name}</b>`); };
}

// ---------- commandes
function exBindInput() {
  const K = {};
  const sync = () => {
    const I = EX.inp;
    I.kz = (K.z || K.w || K.ArrowUp ? 1 : 0) - (K.s || K.ArrowDown ? 1 : 0);
    I.kx = (K.d || K.ArrowRight ? 1 : 0) - (K.q || K.a || K.ArrowLeft ? 1 : 0);
    I.run = !!K.Shift; I.kb = !!K[' '];
  };
  window.addEventListener('keydown', e => {
    if (!game.started) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    K[k] = true; sync();
    if (e.repeat) return;
    if (k === 'e' || k === 'Enter') exToggleCar();
    else if (k === 'v' || k === 'c') { if (EX.mode !== 'pied') exToggleView(); }
    else if (k === 'p' || k === 'f') exTogglePig();
    else if (k === 'g') { if (EX.mode === 'auto' && Math.hypot(EX.car.vx, EX.car.vz) < 1) { carNextModel(); exSetView(); } }
    else if (k === 'h') { sfxInit(); sfxHorn(); }
    else if (k === 'm') { $('map').classList.contains('open') ? closeMap() : (document.exitPointerLock && document.exitPointerLock(), openMap()); }
    else if (k === 'Escape') { closeMap(); $('menu').classList.remove('open'); }
    if (k === ' ' || k.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; K[k] = false; sync(); });
  window.addEventListener('blur', () => { for (const k in K) K[k] = false; sync(); });
  const look = (dx, dy) => {
    if (EX.mode !== 'auto') { EX.P.yaw -= dx * 0.0042; EX.P.pitch = clamp(EX.P.pitch - dy * 0.0036, -1.25, 1.25); }
    else if (EX.view === 'cockpit') { EX.car.lookY = clamp(EX.car.lookY - dx * 0.004, -2.5, 2.5); EX.car.lookP = clamp(EX.car.lookP - dy * 0.0035, -0.7, 0.6); }
    else { EX.car.orbit -= dx * 0.005; EX.car.orbitP = clamp(EX.car.orbitP + dy * 0.003, 0.05, 1.1); }
  };
  let joyId = null, joy0 = null, lookId = null, last = null;
  const joy = $('ex-joy');
  canvas.addEventListener('pointerdown', e => {
    if (!game.started) return;
    if (e.pointerType === 'mouse') { if (document.pointerLockElement !== canvas && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (er) { } } lookId = e.pointerId; last = [e.clientX, e.clientY]; EX.dragging = true; return; }
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { }
    if (joyId === null && e.clientX < window.innerWidth * 0.45) { joyId = e.pointerId; joy0 = [e.clientX, e.clientY]; joy.style.display = 'block'; joy.style.left = e.clientX + 'px'; joy.style.top = e.clientY + 'px'; joy.firstChild.style.transform = ''; }
    else if (lookId === null) { lookId = e.pointerId; last = [e.clientX, e.clientY]; EX.dragging = true; }
  });
  window.addEventListener('pointermove', e => {
    if (document.pointerLockElement === canvas) { look(e.movementX || 0, e.movementY || 0); return; }
    if (e.pointerId === joyId) {
      let dx = e.clientX - joy0[0], dy = e.clientY - joy0[1]; const l = Math.hypot(dx, dy), m = 52; if (l > m) { dx *= m / l; dy *= m / l; }
      EX.inp.jx = dx / m; EX.inp.jz = -dy / m; joy.firstChild.style.transform = `translate(${dx}px,${dy}px)`;
    } else if (e.pointerId === lookId && last) { look((e.clientX - last[0]) * 1.4, (e.clientY - last[1]) * 1.4); last = [e.clientX, e.clientY]; }
  });
  const up = e => {
    if (e.pointerId === joyId) { joyId = null; EX.inp.jx = EX.inp.jz = 0; joy.style.display = 'none'; }
    if (e.pointerId === lookId) { lookId = null; last = null; EX.dragging = false; }
  };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
}
