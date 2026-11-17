// Exploration libre : piéton, voiture, cochon de monte, habitants
import * as THREE from 'three';
import { scene, STATION_BY_NAME, STATIONS, $, camera, clamp, WW, HH, lerp, tmGet, canvas, QKEY, hashStr, hAt } from './core.js';
import { groundAt, CARS, TOWN_SEGS, SPOTS, ROADS } from './registry.js';
import { game, clock } from './state.js';
import { Mset } from './scenery.js';
import { makeCarInterior, makePorc, makeCitizenPool } from './assets.js';
import { buildColliders, inWater, collide } from './roads.js';
import { rebuildConsist, setCamMode, cam, train, stationOffset, nextOptions, advanceHead, flipTrain } from './train.js';
import { toast, mapState, closeMap, openMap } from './ui.js';

// ---------- état de l'exploration
export const EX = {
  on: true, mode: 'pied', view: 'cockpit',
  P: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, bob: 0, run: false },
  car: { x: 0, y: 0, z: 0, yaw: 0, v: 0, pitch: 0, roll: 0, mesh: null, orbit: 0, orbitP: 0.3, lookY: 0, lookP: 0, steer: 0 },
  inp: { fx: 0, fz: 0, kx: 0, kz: 0, jx: 0, jz: 0, run: false, brake: false },
  city: -1, hudT: 0, saveT: 0,
  pig: { x: 0, y: 0, z: 0, yaw: 0, mesh: null, U: null, ph: 0, amp: 0 },
};
const EX_SAVE = 'porkonia-explore-v1';
export function exPlacePlayer(x, z, yaw) { const P = EX.P; P.x = x; P.z = z; if (yaw !== undefined) P.yaw = yaw; P.y = groundAt(x, z) + 1.62; }
export function exPlaceCar(x, z, yaw) { const c = EX.car; c.x = x; c.z = z; c.yaw = yaw; c.v = 0; c.y = groundAt(x, z); }
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
  // voiture du joueur
  const mat = CARS.mat.clone(); mat.color = new THREE.Color().setRGB(123 / 255, 30 / 255, 46 / 255, THREE.SRGBColorSpace);
  mat.onBeforeCompile = CARS.mat.onBeforeCompile; mat.customProgramCacheKey = CARS.mat.customProgramCacheKey;
  const body = new THREE.Mesh(CARS.geoHi, mat); body.castShadow = true; body.receiveShadow = true;
  const m = new THREE.Group(); m.add(body); EX.car.cabin = null; scene.add(m); EX.car.mesh = m;   // habitacle : fabriqué à la première vue intérieure
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
  I.fx = clamp(I.kx + I.jx, -1, 1); I.fz = clamp(I.kz + I.jz, -1, 1);
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
  } else {
    const c = EX.car;
    const onRoad = (() => { const m = tmGet(c.x, c.z); return m === 4 || m === 6; })();
    const thr = I.fz, vmax = onRoad ? 40 : 15;
    if (I.brake) c.v -= Math.sign(c.v) * Math.min(Math.abs(c.v), 16 * dt);
    else if (thr > 0.05) c.v += (c.v < 0 ? 14 : 6.5 * (1 - clamp(c.v / vmax, 0, 1) * 0.85)) * thr * dt;
    else if (thr < -0.05) c.v += (c.v > 0.5 ? 13 : 4) * thr * dt;
    c.v -= c.v * (onRoad ? 0.12 : 0.55) * dt + Math.sign(c.v) * Math.min(Math.abs(c.v), 0.35 * dt);
    c.v = clamp(c.v, -8, vmax);
    const steer = -I.fx; c.steer = lerp(c.steer, steer, 1 - Math.pow(0.001, dt));
    c.yaw += steer * clamp(c.v / 6, -1, 1) * 1.55 / (1 + Math.abs(c.v) / 16) * dt;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    _ep.x = c.x + fx * c.v * dt; _ep.z = c.z + fz * c.v * dt;
    if (collide(_ep, 1.5)) c.v *= 0.35;
    if (inWater(_ep.x, _ep.z)) c.v = 0; else { c.x = clamp(_ep.x, -WW / 2 + 20, WW / 2 - 20); c.z = clamp(_ep.z, -HH / 2 + 20, HH / 2 - 20); }
    const hf = groundAt(c.x + fx * 1.4, c.z + fz * 1.4), hb = groundAt(c.x - fx * 1.4, c.z - fz * 1.4), hl = groundAt(c.x + fz * 0.85, c.z - fx * 0.85), hr = groundAt(c.x - fz * 0.85, c.z + fx * 0.85);
    const k = 1 - Math.pow(0.0002, dt);
    c.y = lerp(c.y, (hf + hb + hl + hr) / 4, k);
    c.pitch = lerp(c.pitch, Math.atan2(hb - hf, 2.8), k); c.roll = lerp(c.roll, Math.atan2(hl - hr, 1.7), k);
    EX.P.x = c.x; EX.P.z = c.z;
    if (!EX.dragging && Math.abs(c.v) > 2) c.orbit *= Math.pow(0.12, dt);
  }
  { const g = EX.pig; g.y = lerp(g.y || groundAt(g.x, g.z), groundAt(g.x, g.z), 1 - Math.pow(0.001, dt)); g.mesh.position.set(g.x, g.y, g.z); g.mesh.rotation.y = g.yaw; g.U.uPorc.value.set(g.ph, g.amp); }
  const c = EX.car;
  c.mesh.position.set(c.x, c.y + 0.02, c.z); c.mesh.rotation.set(c.pitch, c.yaw, c.roll, 'YXZ');
  updateNpcs(dt);
  EX.hudT -= dt; if (EX.hudT <= 0) { EX.hudT = 0.25; exHud(false); }
  EX.saveT -= dt; if (EX.saveT <= 0) { EX.saveT = 5; try { localStorage.setItem(EX_SAVE, JSON.stringify({ x: EX.P.x, z: EX.P.z, yaw: EX.P.yaw, cx: c.x, cz: c.z, cyaw: c.yaw })); } catch (e) { } }
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
    camera.position.set(0.36, 1.26, -0.26).applyMatrix4(c.mesh.matrixWorld);
    _eq.setFromEuler(_ee.set(c.lookP, Math.PI + c.lookY, 0, 'YXZ'));
    camera.quaternion.copy(c.mesh.quaternion).multiply(_eq);
    if (!EX.dragging && Math.abs(c.v) > 1.5) { c.lookY *= Math.pow(0.25, dt); c.lookP *= Math.pow(0.25, dt); }
    const ud = c.cabin.userData; ud.wheel.rotation.z = -c.steer * 1.7; ud.needle.rotation.z = -(-135 + clamp(Math.abs(c.v) * 3.6, 0, 160) / 160 * 270) * Math.PI / 180;
  } else {
    const c = EX.car, a = c.yaw + c.orbit, d = 8.6, cp = Math.cos(c.orbitP);
    let x = c.x - Math.sin(a) * d * cp, z = c.z - Math.cos(a) * d * cp, y = c.y + 1.4 + Math.sin(c.orbitP) * d;
    y = Math.max(y, groundAt(x, z) + 0.7);
    const k = 1 - Math.pow(0.00002, dt);
    camera.position.set(lerp(camera.position.x, x, k), lerp(camera.position.y, y, k), lerp(camera.position.z, z, k));
    camera.lookAt(c.x, c.y + 1.5, c.z);
  }
}
const _eq = new THREE.Quaternion(), _ee = new THREE.Euler();
export function exSetView() {
  const cockpit = EX.mode === 'auto' && EX.view === 'cockpit';
  if (cockpit && !EX.car.cabin) { EX.car.cabin = makeCarInterior([123, 30, 46]); EX.car.mesh.add(EX.car.cabin); }
  if (EX.car.cabin) EX.car.cabin.visible = cockpit;
  camera.near = cockpit ? 0.06 : 0.2; camera.fov = cockpit ? 74 : 68; camera.updateProjectionMatrix();
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
    if (Math.abs(c.v) > 3) { toast('Arrêtez-vous avant de descendre'); return; }
    const lx = Math.cos(c.yaw), lz = -Math.sin(c.yaw);
    _ep.x = c.x + lx * 2.2; _ep.z = c.z + lz * 2.2; collide(_ep, 0.45);
    EX.mode = 'pied'; exPlacePlayer(_ep.x, _ep.z, c.yaw + Math.PI); P.pitch = 0; c.v = 0;
  } else if (Math.hypot(c.x - P.x, c.z - P.z) < 7) { EX.mode = 'auto'; c.orbit = 0; c.lookY = c.lookP = 0; }
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
  br.innerHTML = '<div id="ex-speed"><span id="ex-kmh">0</span><small>km/h</small></div><button id="ex-view">Vue extérieure</button><button id="ex-run">Courir</button><button id="ex-pig">Cochon</button><button id="ex-act">Voiture</button>';
  document.body.appendChild(br);
  const joy = document.createElement('div'); joy.id = 'ex-joy'; joy.innerHTML = '<i></i>'; document.body.appendChild(joy);
  const help = document.createElement('div'); help.id = 'ex-help'; help.textContent = 'ZQSD / flèches : bouger · souris : regarder · Maj : courir · E : voiture · P : cochon · V : vue · Espace : frein · M : carte';
  document.body.appendChild(help);
  $('ex-act').onclick = e => { e.stopPropagation(); exToggleCar(); };
  $('ex-pig').onclick = e => { e.stopPropagation(); exTogglePig(); };
  $('ex-view').onclick = e => { e.stopPropagation(); exToggleView(); };
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
  if (auto) $('ex-kmh').textContent = Math.round(Math.abs(EX.car.v) * 3.6);
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
    I.run = !!K.Shift; I.brake = !!K[' '];
  };
  window.addEventListener('keydown', e => {
    if (!game.started) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    K[k] = true; sync();
    if (e.repeat) return;
    if (k === 'e' || k === 'Enter') exToggleCar();
    else if (k === 'v' || k === 'c') { if (EX.mode !== 'pied') exToggleView(); }
    else if (k === 'p' || k === 'f') exTogglePig();
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

// ---------- habitants : piétons sur les trottoirs, voitures dans les rues et sur les routes
export const NPC = { walks: [], wgrid: new Map(), lanes: [], lgrid: new Map(), peds: [], cars: [], pm: null, cm: null, cur: 0, ccur: 0 };
function buildNpcs() {
  const gadd = (grid, cell, x, z, id) => { const k = Math.floor(x / cell) + ':' + Math.floor(z / cell); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(id); };
  const ends = new Map();
  for (const s of TOWN_SEGS) {
    const size = STATIONS[s.st].meta.size;
    s.sides.forEach((has, si) => {
      if (!has) return;
      const o = (si === 0 ? -1 : 1) * (s.hw + s.sw * 0.55);
      const w = { x0: s.p0[0] + s.n[0] * o, z0: s.p0[1] + s.n[1] * o, x1: s.p1[0] + s.n[0] * o, z1: s.p1[1] + s.n[1] * o, size };
      w.len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0); if (w.len < 6) return;
      NPC.walks.push(w); gadd(NPC.wgrid, 160, (w.x0 + w.x1) / 2, (w.z0 + w.z1) / 2, NPC.walks.length - 1);
    });
    const lane = { pts: [s.p0, s.p1], ka: s.ka, kb: s.kb, v: 8.5, town: true };
    const id = NPC.lanes.length; NPC.lanes.push(lane); gadd(NPC.lgrid, 400, (s.p0[0] + s.p1[0]) / 2, (s.p0[1] + s.p1[1]) / 2, id);
    for (const k of [s.ka, s.kb]) { let a = ends.get(k); if (!a) ends.set(k, a = []); a.push(id); }
  }
  NPC.ends = ends;
  NPC.sgrid = new Map(); SPOTS.forEach((sp, i) => gadd(NPC.sgrid, 160, sp.x, sp.z, i));
  for (const r of ROADS) for (let k = 0; k + 1 < r.pts.length; k += 50) {
    const pts = r.pts.slice(k, k + 51).map(p => [p[0], p[2]]); if (pts.length < 2) continue;
    const id = NPC.lanes.length; NPC.lanes.push({ pts, v: 21, town: false, road: r, k0: k });
    const m = pts[(pts.length / 2) | 0]; gadd(NPC.lgrid, 400, m[0], m[1], id);
  }
  for (const l of NPC.lanes) { l.cum = [0]; for (let k = 1; k < l.pts.length; k++) l.cum.push(l.cum[k - 1] + Math.hypot(l.pts[k][0] - l.pts[k - 1][0], l.pts[k][1] - l.pts[k - 1][1])); l.len = l.cum[l.cum.length - 1]; }
  const mobile = QKEY === 'mobile', NP = mobile ? 70 : QKEY === 'haute' ? 130 : 200, NC = mobile ? 16 : QKEY === 'haute' ? 30 : 44;
  const col = new THREE.Color();
  const mk = (g, n, m2) => { const m = new THREE.InstancedMesh(g, m2, n); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; scene.add(m); return m; };
  NPC.pool = makeCitizenPool(NP); for (const e of NPC.pool.meshes) scene.add(e.m);
  for (let i = 0; i < NP; i++) { const h = hashStr('ped' + i); NPC.peds.push({ w: null, t: 0, dir: 1, v: 1.0 + (h % 70) / 100, ph: (h % 628) / 100, lat: ((h >>> 3) % 100) / 100 - 0.5, sc: 1.1 + ((h >>> 6) % 20) / 100, s: 0 }); }
  NPC.cm = mk(CARS.geo, NC, CARS.mat);
  const cols = [[226, 36, 48], [36, 110, 230], [250, 246, 235], [250, 200, 30], [50, 180, 110], [250, 130, 40], [240, 130, 170], [70, 200, 210], [150, 80, 200]];
  for (let i = 0; i < NC; i++) { const c = cols[i % cols.length]; NPC.cm.setColorAt(i, col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace)); NPC.cars.push({ l: null, s: 0, dir: 1, x: 0, z: 0, yaw: 0 }); }
  const hide = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < NC; i++) NPC.cm.setMatrixAt(i, hide);
}
function npcPick(grid, cell, list, rmin, rmax) {
  const px = EX.P.x, pz = EX.P.z, R = Math.ceil(rmax / cell);
  for (let tries = 0; tries < 6; tries++) {
    const a = grid.get((Math.floor(px / cell) + ((Math.random() * (2 * R + 1)) | 0) - R) + ':' + (Math.floor(pz / cell) + ((Math.random() * (2 * R + 1)) | 0) - R));
    if (!a) continue;
    const id = a[(Math.random() * a.length) | 0], o = list[id];
    const mx = o.pts ? o.pts[(o.pts.length / 2) | 0][0] : (o.x0 + o.x1) / 2, mz = o.pts ? o.pts[(o.pts.length / 2) | 0][1] : (o.z0 + o.z1) / 2;
    const d = Math.hypot(mx - px, mz - pz);
    if (d >= rmin && d <= rmax) return o;
  }
  return null;
}
function npcPickSpot() {
  const px = EX.P.x, pz = EX.P.z;
  for (let tries = 0; tries < 8; tries++) {
    const a = NPC.sgrid.get((Math.floor(px / 160) + ((Math.random() * 3) | 0) - 1) + ':' + (Math.floor(pz / 160) + ((Math.random() * 3) | 0) - 1)); if (!a) continue;
    const sp = SPOTS[a[(Math.random() * a.length) | 0]]; if (sp.used) continue;
    const d = Math.hypot(sp.x - px, sp.z - pz); if (d > 6 && d < 170) return sp;
  }
  return null;
}
const _nm = new THREE.Matrix4();
export function updateNpcs(dt) {
  const px = EX.P.x, pz = EX.P.z, t = clock.simT;
  const PROB = [0, 0.3, 0.45, 0.6, 0.8, 1];
  // piétons
  for (let q = 0; q < 6; q++) {
    const i = NPC.cur = (NPC.cur + 1) % NPC.peds.length, p = NPC.peds[i];
    if (p.spot && Math.hypot(p.spot.x - px, p.spot.z - pz) < 190) continue;
    if (p.w && Math.hypot(lerp(p.w.x0, p.w.x1, p.t) - px, lerp(p.w.z0, p.w.z1, p.t) - pz) < 190) continue;
    if (p.spot) { p.spot.used = false; p.spot = null; }
    if (Math.random() < 0.45) { const sp = npcPickSpot(); if (sp) { sp.used = true; p.spot = sp; p.w = null; continue; } }
    const w = npcPick(NPC.wgrid, 160, NPC.walks, 12, 170);
    p.w = w && Math.random() < PROB[w.size] ? w : null;
    if (p.w) { p.t = Math.random(); p.dir = Math.random() < 0.5 ? 1 : -1; }
  }
  NPC.peds.forEach((p, i) => {
    if (p.spot) { const sp = p.spot; NPC.pool.set(i, Mset(_nm, sp.x, groundAt(sp.x, sp.z) + 0.14, sp.z, p.sc, p.sc, p.sc, sp.yaw + Math.sin(t * 0.5 + p.ph) * 0.25), Math.sin(t * 1.3 + p.ph) * 0.5, 0.12); return; }
    if (!p.w) { NPC.pool.set(i, _nm.makeScale(0, 0, 0), 0, 0); return; }
    const w = p.w;
    p.t += p.dir * p.v * dt / w.len; p.s += p.v * dt;
    if (p.t > 1) { p.t = 1; p.dir = -1; } else if (p.t < 0) { p.t = 0; p.dir = 1; }
    const ux = (w.x1 - w.x0) / w.len, uz = (w.z1 - w.z0) / w.len;
    const x = lerp(w.x0, w.x1, p.t) - uz * p.lat * 1.6, z = lerp(w.z0, w.z1, p.t) + ux * p.lat * 1.6;
    NPC.pool.set(i, Mset(_nm, x, hAt(x, z) + 0.2, z, p.sc, p.sc, p.sc, Math.atan2(ux * p.dir, uz * p.dir)), p.s * 4.6 + p.ph, 1);
  });
  NPC.pool.flush();
  // circulation
  for (let q = 0; q < 3; q++) {
    const i = NPC.ccur = (NPC.ccur + 1) % NPC.cars.length, c = NPC.cars[i];
    if (c.l && Math.hypot(c.x - px, c.z - pz) < 620) continue;
    c.l = npcPick(NPC.lgrid, 400, NPC.lanes, 70, 560);
    if (c.l) { c.s = Math.random() * c.l.len; c.dir = Math.random() < 0.5 ? 1 : -1; c.yaw = NaN; }
  }
  NPC.cars.forEach((c, i) => {
    if (!c.l) { NPC.cm.setMatrixAt(i, _nm.makeScale(0, 0, 0)); return; }
    let l = c.l;
    c.s += c.dir * l.v * dt;
    if (c.s > l.len || c.s < 0) {
      const endKey = l.town ? (c.s > l.len ? l.kb : l.ka) : null;
      let next = null;
      if (endKey) { const opts = NPC.ends.get(endKey).filter(id => NPC.lanes[id] !== l); if (opts.length) next = NPC.lanes[opts[(Math.random() * opts.length) | 0]]; }
      else if (l.road) { const k = l.k0 + (c.s > l.len ? 50 : -50); next = NPC.lanes.find(o => o.road === l.road && o.k0 === k) || null; }
      if (next) { const fromA = next.town ? next.ka === endKey : c.s > l.len; c.l = l = next; c.dir = fromA ? 1 : -1; c.s = fromA ? 0 : l.len; }
      else { c.dir = -c.dir; c.s = clamp(c.s, 0, l.len); }
    }
    let k = 0; while (k < l.cum.length - 2 && l.cum[k + 1] < c.s) k++;
    const a = l.pts[k], b = l.pts[k + 1], f = clamp((c.s - l.cum[k]) / Math.max(1e-6, l.cum[k + 1] - l.cum[k]), 0, 1);
    const dx = (b[0] - a[0]) * c.dir, dz = (b[1] - a[1]) * c.dir, dl = Math.hypot(dx, dz) || 1;
    c.x = lerp(a[0], b[0], f) - dz / dl * 1.75; c.z = lerp(a[1], b[1], f) + dx / dl * 1.75;
    const yaw = Math.atan2(dx, dz);
    if (isNaN(c.yaw)) c.yaw = yaw; else { let d = yaw - c.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.yaw += d * Math.min(1, dt * 6); }
    NPC.cm.setMatrixAt(i, Mset(_nm, c.x, groundAt(c.x, c.z) + 0.12, c.z, 1, 1, 1, c.yaw));
  });
  NPC.cm.instanceMatrix.needsUpdate = true;
}
