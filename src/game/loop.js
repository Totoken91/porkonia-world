// Boucle d'image : mise à jour, résolution adaptative, masquage au loin, rendu
import * as THREE from 'three';
import { $, lerp, fatal } from '../engine/util.js';
import { Q, QKEY } from '../engine/quality.js';
import { hAt } from '../world/land.js';
import { canvas, camera, gradePass, renderer, composer, bloomPass } from '../engine/renderer.js';
import { SUN_DIR, sky, updateSunShadow, WS, TIME_LISTENERS, TKEY } from '../engine/lighting.js';
import { WATERS, renderReflection, reflectRT } from '../world/water.js';
import { PROPS, ANIMATED } from '../world/registry.js';
import { game, clock, EX } from './state.js';
import { scenery } from '../world/scenery.js';
import { updateTownLOD } from '../world/towns.js';
import { updateCitizens, updateHerds } from '../world/creatures.js';
import { updateVegetation } from '../world/vegetation.js';
import { updateBirds, puff, updateSmoke } from '../world/ambiance.js';
import { cam, train, updateTrainPose, updateCamera, updateSleepers, fitFov } from './train.js';
import { exUpdate, exCamera } from './explore.js';
import { audio } from './audio.js';
import { save, physicsStep, checkStops, ticker, ANNOUNCES } from './railgame.js';
import { drawMap } from './map.js';
import { updateHud } from './hud.js';

let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.pr);
export function resize() {
  setRenderSize();
  if ($('map').classList.contains('open')) drawMap();
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); if (audio.ctx) audio.ctx.suspend().catch(() => { }); }
  else if (audio.ctx && game.started) audio.ctx.resume().catch(() => { });
});
let clockPrev = performance.now();
const perf = { acc: 0, frames: 0, t: 0, low: 0, high: 0 };
export const _focus = new THREE.Vector3(), _fwd = new THREE.Vector3(), _sunScreen = new THREE.Vector3(), _camPos = new THREE.Vector3();
let sunVisSmooth = 0;
function sunVisibility(camPos) {
  _sunScreen.copy(camPos).addScaledVector(SUN_DIR, 5000).project(camera);
  if (_sunScreen.z > 1 || Math.abs(_sunScreen.x) > 1.3 || Math.abs(_sunScreen.y) > 1.3 || SUN_DIR.y < -0.02) return 0;
  const hl = Math.hypot(SUN_DIR.x, SUN_DIR.z) || 1e-6, tanE = SUN_DIR.y / hl;
  for (let t = 20; t < 9000; t *= 1.15) {
    const x = camPos.x + SUN_DIR.x / hl * t, z = camPos.z + SUN_DIR.z / hl * t;
    if (hAt(x, z) > camPos.y + t * tanE) return 0;
  }
  if (cam.mode === 'cabine') { // les montants de la cabine cachent un peu le soleil
    const sy = _sunScreen.y; if (sy > 0.62 || sy < -0.55) return 0.25;
  }
  return 1;
}
function adaptResolution(rdt) {
  perf.acc += rdt; perf.frames++;
  if (perf.acc < 2) return;
  const fps = perf.frames / perf.acc; perf.acc = 0; perf.frames = 0;
  const maxPR = Math.min(window.devicePixelRatio || 1, Q.pr);
  if (fps < 40 && pixelRatio > 0.5) { pixelRatio = Math.max(0.5, pixelRatio * (fps < 24 ? 0.72 : 0.85)); setRenderSize(); }
  else if (fps > 57 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio * 1.08); setRenderSize(); }
  const el = $('fps'); if (el) el.textContent = Math.round(fps) + ' i/s · ' + Math.round(pixelRatio * 100) + ' %';
}
export const PAUSE = { on: new URLSearchParams(location.search).has('pause'), once: 0, cb: null };
let frameN = 0;
// masque au loin les petits objets isolés du décor (gares, monuments, fermes…)
export function registerFarCull() {
  const managed = new Set(PROPS.meshes.map(p => p.mesh)), box = new THREE.Box3(), sph = new THREE.Sphere();
  const k = QKEY === 'mobile' ? 0.7 : QKEY === 'haute' ? 1 : 1.5;
  let n = 0;
  const visit = (o, depth) => {
    if (o.isInstancedMesh || managed.has(o) || !o.visible || !(o.isGroup || o.isMesh)) return;
    let skip = false; o.traverse(c => { if (c.isInstancedMesh || managed.has(c) || c.isPoints || c.isSprite) skip = true; });
    if (skip) { if (depth < 2 && o.isGroup) for (const c of o.children.slice()) visit(c, depth + 1); return; }
    box.setFromObject(o); if (box.isEmpty()) return; box.getBoundingSphere(sph);
    if (sph.radius > 600) { if (depth < 2 && o.isGroup) for (const c of o.children.slice()) visit(c, depth + 1); return; }
    PROPS.meshes.push({ mesh: o, cx: sph.center.x, cz: sph.center.z, R: (1100 + sph.radius * 45) * k }); n++;
  };
  for (const o of scenery.children.slice()) visit(o, 0);
  return n;
}
// Une image. Une erreur dans une mise à jour ne doit pas figer le jeu : l'image suivante est toujours demandée,
// l'erreur est consignée, et si elle se répète une seconde entière le joueur est prévenu au lieu de regarder un écran gelé.
let frameErrors = 0;
export function frame(now) {
  if (frameErrors >= 60) return;
  requestAnimationFrame(frame);
  if (PAUSE.on && PAUSE.once <= 0) return;
  if (PAUSE.on) { PAUSE.once--; if (PAUSE.once === 0 && PAUSE.cb) { const cb = PAUSE.cb; PAUSE.cb = null; setTimeout(cb, 0); } }
  try { step(now); frameErrors = 0; }
  catch (e) {
    if (frameErrors++ < 3) console.error(e);
    if (frameErrors >= 60) fatal('Erreur d\'affichage : ' + e.message + '.');
  }
}
function step(now) {
  const rdt = Math.min(0.05, (now - clockPrev) / 1000); clockPrev = now;
  clock.simT += rdt;
  if (EX.on) { if (game.started) exUpdate(rdt); }
  else if (game.started) {
    const paused = game.panelOpen || $('map').classList.contains('open') || $('menu').classList.contains('open');
    for (let k = 0; k < game.ff; k++) {
      const sub = 2, dt = rdt / sub;
      for (let q = 0; q < sub; q++) { if (!paused) { physicsStep(dt); game.now += dt; } }
    }
    checkStops();
    game.tickerT -= rdt;
    if (game.tickerT < 0) { game.tickerT = 70 + Math.random() * 50; ticker(ANNOUNCES[(Math.random() * ANNOUNCES.length) | 0]); }
    train.bump = Math.max(0, train.bump - rdt * 6);
    updateHud();
    audio.update(rdt * game.ff);
  }
  updateTrainPose();
  if (EX.on && game.started) exCamera(rdt); else updateCamera(rdt, clock.simT);
  camera.updateMatrixWorld();
  camera.getWorldPosition(_camPos);
  sky.position.copy(_camPos);
  updateCitizens(clock.simT, rdt, _camPos);
  updateHerds(clock.simT, rdt, _camPos);
  updateSleepers();
  updateBirds(clock.simT);
  if (train.notch > 0 && Math.random() < 0.3 + train.notch * 0.1) {
    const p = new THREE.Vector3(0, 5.0, 1.3).applyMatrix4(train.loco.matrixWorld);
    puff(p.x, p.y, p.z, (Math.random() - 0.5) * 0.6, 2.2 + train.notch * 0.5, (Math.random() - 0.5) * 0.6, 0.45 + train.notch * 0.08, 2.6);
  }
  updateSmoke(rdt, _camPos);
  // tuiles à la demande : en dernier avant le rendu, après tout ce qui tire au hasard dans l'image
  updateVegetation(_camPos);
  updateTownLOD(_camPos);
  for (const a of ANIMATED) { if (a.kind === 'spin') a.obj.rotation.y += rdt * 0.25; if (a.kind === 'mill') a.obj.rotation.z += rdt * 0.6; }
  // ombres : centrées un peu devant la caméra
  camera.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize();
  _focus.copy(_camPos).addScaledVector(_fwd, Q.shadowR * 0.45); _focus.y = hAt(_focus.x, _focus.z);
  if ((frameN + 1) % (Q.shadowEvery || 1) === 0) updateSunShadow(_focus);
  WS.uTime.value = clock.simT; sky.material.uniforms.uTime.value = clock.simT;
  for (const w of WATERS) w.uniforms.uTime.value = clock.simT;
  WS.uSunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
  const sv = sunVisibility(_camPos); sunVisSmooth = lerp(sunVisSmooth, sv, 1 - Math.pow(0.002, rdt));
  const gu = gradePass.uniforms; gu.uTime.value = clock.simT; gu.uSun.value.set(_sunScreen.x * 0.5 + 0.5, _sunScreen.y * 0.5 + 0.5); gu.uSunVis.value = sunVisSmooth * (cam.mode === 'cabine' ? 0.7 : 1);
  gu.uRays.value = Q.rays ? 1 : 0;
  frameN++; if (frameN % (Q.shadowEvery || 1) === 0) renderer.shadowMap.needsUpdate = true;
  renderReflection();
  composer.render(rdt);
  adaptResolution(rdt);
}
// le navigateur peut retirer la carte graphique à la page (mémoire saturée, onglet en arrière-plan sur téléphone)
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); fatal('La carte graphique a décroché, souvent par manque de mémoire. Essayez le réglage Économe.'); });
function setRenderSize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
  bloomPass.strength = 0.3 * Q.bloom + 0.04; bloomPass.enabled = Q.bloom > 0;
  gradePass.uniforms.uRes.value.set(w * pixelRatio, h * pixelRatio);
  if (Q.reflect) reflectRT.setSize(Math.max(64, Math.round(w * pixelRatio * Q.reflect)), Math.max(64, Math.round(h * pixelRatio * Q.reflect)));
  camera.aspect = w / h; fitFov();
}
TIME_LISTENERS.push(onTimeChanged);
export function onTimeChanged(t) {
  if (train.loco && train.loco.userData.spot) train.loco.userData.spot.intensity = { matin: 400, midi: 0, doree: 420, crepuscule: 2400 }[TKEY] ?? 600;
  document.querySelectorAll('[data-time]').forEach(b => b.classList.toggle('on', b.dataset.time === TKEY));
}
