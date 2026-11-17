// Conduite : physique d'arcade (adhérence, dérapage, contre-braquage), collisions, objets et cochons projetés,
// traces de pneus, fumée, caméra de poursuite, score de dérapage.
//
// Le principe du dérapage : la vitesse est un vecteur du monde, distinct du cap de la voiture. À chaque pas, la part
// de la vitesse perpendiculaire au cap (la glisse) est rognée par l'adhérence. Forte adhérence : la voiture suit son
// nez. Frein à main ou glisse déjà installée : l'adhérence tombe, la voiture part en travers et il faut contre-braquer.
import * as THREE from 'three';
import { $, clamp, lerp } from '../engine/util.js';
import { WW, HH, tmGet } from '../world/land.js';
import { scene, camera } from '../engine/renderer.js';
import { lazyDrop } from '../engine/lazy.js';
import { PROPS, groundAt, knockNear } from '../world/registry.js';
import { MODELES, MODELE_IDS, carGeo, carMaterial, rouesDe } from '../world/cars.js';
import { herds } from '../world/creatures.js';
import { puff } from '../world/ambiance.js';
import { collide, inWater } from '../world/roads.js';
import { EX } from './state.js';
import { toast } from './ui.js';
import { NPC } from './npc.js';
import { launch, launchMesh } from './flyers.js';
import { sfxEngine, sfxCrash, sfxKnock, sfxOink } from './sfx.js';

export const DRIVE = { score: 0, scoreT: 0, last: 0, best: 0, renverses: 0, shake: 0 };
const BEST_KEY = 'porkonia-derapage';
try { DRIVE.best = +localStorage.getItem(BEST_KEY) || 0; } catch (e) { /* stockage indisponible */ }
const PAINT = [123, 30, 46];
const _q = { x: 0, z: 0 }, _hits = [], _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _col = new THREE.Color();

// ---------- la voiture du joueur : caisse suspendue, quatre roues qui tournent et braquent
export function carSetModel(id) {
  const c = EX.car, m = MODELES[id] || MODELES.porkette; c.model = MODELES[id] ? id : 'porkette'; c.spec = m;
  if (!c.mesh) { c.mesh = new THREE.Group(); scene.add(c.mesh); }
  for (const o of [...c.mesh.children]) { c.mesh.remove(o); o.traverse(k => k.dispose?.()); }
  const g = carGeo(c.model), mat = carMaterial();
  const body = new THREE.InstancedMesh(g.caisse, mat, 1); body.setMatrixAt(0, _m.identity()); body.setColorAt(0, _col.setRGB(PAINT[0] / 255, PAINT[1] / 255, PAINT[2] / 255, THREE.SRGBColorSpace));
  body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
  c.chassis = new THREE.Group(); c.chassis.add(body); c.body = body; c.mesh.add(c.chassis);
  c.wheels = rouesDe(m).map(([x, z], i) => { const piv = new THREE.Group(); piv.position.set(x, m.roue, z); const w = new THREE.Mesh(g.roue, mat); w.castShadow = true; piv.add(w); c.mesh.add(piv); return { piv, w, avant: i < 2, x, z }; });
  c.cabin = null;   // habitacle refait à la prochaine vue intérieure
  const zs = m.bas.map(p => p[0]); c.half = (Math.max(...zs) - Math.min(...zs)) / 2; c.cz = (Math.max(...zs) + Math.min(...zs)) / 2;
}
export function carNextModel() { carSetModel(MODELE_IDS[(MODELE_IDS.indexOf(EX.car.model) + 1) % MODELE_IDS.length]); toast(`Au volant : <b>${EX.car.spec.nom}</b>`); }

// ---------- traces de pneus : un anneau de petits rectangles posés au sol
const SKID = { mesh: null, i: 0, n: 500, last: [null, null] };
function skidInit() {
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x18181a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  SKID.mesh = new THREE.InstancedMesh(g, mat, SKID.n); SKID.mesh.frustumCulled = false; SKID.mesh.renderOrder = 2;
  const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < SKID.n; i++) SKID.mesh.setMatrixAt(i, hide);
  scene.add(SKID.mesh);
}
function skidMark(k, x, z, on) {
  const l = SKID.last[k];
  if (!on) { SKID.last[k] = null; return; }
  if (!l) { SKID.last[k] = [x, z]; return; }
  const dx = x - l[0], dz = z - l[1], d = Math.hypot(dx, dz); if (d < 0.5) return;
  if (d < 4) {
    const mx = (x + l[0]) / 2, mz = (z + l[1]) / 2;
    _m.makeRotationY(Math.atan2(dx, dz)); _m.scale(_v.set(0.2, 1, d + 0.08)); _m.setPosition(mx, groundAt(mx, mz) + 0.05, mz);
    SKID.mesh.setMatrixAt(SKID.i, _m); SKID.i = (SKID.i + 1) % SKID.n; SKID.mesh.instanceMatrix.needsUpdate = true;
  }
  SKID.last[k] = [x, z];
}

// ---------- affichage du dérapage
let driftEl = null;
function driftHud(text, hot) {
  if (!driftEl) { driftEl = document.createElement('div'); driftEl.id = 'ex-drift'; document.body.appendChild(driftEl); }
  driftEl.textContent = text; driftEl.classList.toggle('on', !!text); driftEl.classList.toggle('hot', !!hot);
}

// ---------- un pas de physique
const GEARS = [0, 9, 17, 27, 39, 70];
export function driveUpdate(dt, I, driving) {
  const c = EX.car; if (!c.spec) return;
  if (!SKID.mesh) skidInit();
  const T = c.spec.tenue;
  const thr = driving ? I.fz : 0, hb = driving && I.brake, steerIn = driving ? -I.fx : 0;
  c.steer = lerp(c.steer, steerIn, 1 - Math.pow(0.0004, dt));
  let impact = 0, slipMax = 0, accel = 0;
  const N = Math.max(1, Math.ceil(dt / 0.009)), h = dt / N;
  const m4 = tmGet(c.x, c.z), route = m4 === 4 || m4 === 6;
  for (let s = 0; s < N; s++) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;   // avant, droite
    let vf = c.vx * fx + c.vz * fz, vl = c.vx * rx + c.vz * rz;
    const vmax = T.vmax * (route ? 1 : 0.6);
    // moteur, frein, marche arrière
    let a = 0;
    if (thr > 0.05) a = vf < -0.5 ? 18 * thr : T.puissance * thr * (1 - Math.pow(clamp(vf / vmax, 0, 1), 2.2)) * (c.drift ? 0.85 : 1);
    else if (thr < -0.05) a = vf > 0.8 ? 20 * thr : (vf > -9 ? T.puissance * 0.6 * thr : 0);
    if (hb) a -= Math.sign(vf) * Math.min(Math.abs(vf) / h, 7);
    a -= vf * (route ? 0.05 : 0.42) + Math.sign(vf) * Math.min(Math.abs(vf) / h, 0.4);
    vf += a * h; accel = a;
    // glisse : installée par le frein à main ou par un virage trop serré, entretenue tant que la voiture est en travers
    const slip = Math.abs(vl), spd = Math.hypot(vf, vl);
    if (!c.drift && ((hb && spd > 6) || slip > 4.2)) c.drift = true;
    else if (c.drift && slip < 1.1 && !hb) c.drift = false;
    const grip = (c.drift ? T.glisse * (hb ? 0.55 : 1) : T.adherence) * (route ? 1 : 0.62);
    vl *= Math.exp(-grip * h);
    slipMax = Math.max(slipMax, Math.abs(vl));
    // direction : moins d'angle à haute vitesse, plus de vivacité en dérapage
    const delta = c.steer * T.braquage * 0.62 / (1 + Math.abs(vf) / 17);
    // en adhérence, le virage est borné par ce que les pneus encaissent (sous-virage à la limite) ; en dérapage, non
    let wCible = vf / c.spec.empattement * Math.tan(delta);
    if (c.drift) wCible *= 1.5; else { const wMax = T.adherence * 1.7 / Math.max(3, Math.abs(vf)); wCible = clamp(wCible, -wMax, wMax); }
    if (hb && spd > 5) wCible += c.steer * 0.9;
    // les voitures puissantes partent en travers à pleins gaz, volant braqué
    if (!c.drift && T.puissance > 11 && thr > 0.9 && Math.abs(c.steer) > 0.85 && vf > 9 && vf < 24) c.drift = true;
    c.yawRate = lerp(c.yawRate, wCible, 1 - Math.exp(-(c.drift ? 6 : 14) * h));
    c.vx = fx * vf + rx * vl; c.vz = fz * vf + rz * vl;
    c.yaw += c.yawRate * h;
    // déplacement et obstacles fixes : deux cercles, un à l'avant, un à l'arrière
    let nx = c.x + c.vx * h, nz = c.z + c.vz * h;
    for (const sg of [1, -1]) {
      const off = c.cz + sg * c.half * 0.52, rad = c.spec.larg * 0.56;
      _q.x = nx + fx * off; _q.z = nz + fz * off; const bx = _q.x, bz = _q.z;
      if (!collide(_q, rad)) continue;
      const dx = _q.x - bx, dz = _q.z - bz, d = Math.hypot(dx, dz); if (d < 1e-5) continue;
      nx += dx; nz += dz;
      const ux = dx / d, uz = dz / d, vn = c.vx * ux + c.vz * uz;
      if (vn < 0) {
        impact = Math.max(impact, -vn);
        c.vx -= 1.3 * vn * ux; c.vz -= 1.3 * vn * uz; c.vx *= 0.94; c.vz *= 0.94;
        c.yawRate += sg * (fx * uz - fz * ux) * Math.min(-vn, 14) * 0.16;
      }
    }
    if (inWater(nx, nz)) { c.vx *= -0.2; c.vz *= -0.2; } else { c.x = clamp(nx, -WW / 2 + 20, WW / 2 - 20); c.z = clamp(nz, -HH / 2 + 20, HH / 2 - 20); }
  }
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = -fz, rz = fx;
  c.v = c.vx * fx + c.vz * fz; const vl = c.vx * rx + c.vz * rz, spd = Math.hypot(c.vx, c.vz);
  if (driving) impact = Math.max(impact, hitThings(c, spd, fx, fz, rx, rz));
  if (impact > 2.5) { sfxCrash(impact / 22); DRIVE.shake = Math.min(1.2, DRIVE.shake + impact * 0.035); c.drift = false; DRIVE.score = 0; for (let k = 0; k < 4; k++) puff(c.x + fx * c.half, c.y + 0.6, c.z + fz * c.half, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.5, 0.6); }

  // pose sur le relief, suspension, roues
  const hf = groundAt(c.x + fx * 1.3, c.z + fz * 1.3), hbk = groundAt(c.x - fx * 1.3, c.z - fz * 1.3), hl = groundAt(c.x - rx * 0.8, c.z - rz * 0.8), hr = groundAt(c.x + rx * 0.8, c.z + rz * 0.8);
  const k = 1 - Math.pow(0.0002, dt);
  c.y = lerp(c.y, (hf + hbk + hl + hr) / 4, k); c.pitch = lerp(c.pitch, Math.atan2(hbk - hf, 2.6), k); c.roll = lerp(c.roll, Math.atan2(hl - hr, 1.6), k);
  const latAcc = c.yawRate * c.v;
  c.lean = lerp(c.lean, clamp(latAcc * 0.012 + vl * 0.02, -0.16, 0.16), 1 - Math.pow(0.002, dt));
  c.dive = lerp(c.dive, clamp(-accel * 0.006, -0.07, 0.09), 1 - Math.pow(0.002, dt));
  c.mesh.position.set(c.x, c.y + 0.03, c.z); c.mesh.rotation.set(c.pitch, c.yaw, c.roll, 'YXZ');
  c.chassis.rotation.set(c.dive, 0, c.lean); c.chassis.position.y = route ? 0 : Math.sin(c.spin * 0.5) * 0.012 * Math.min(1, spd / 6);
  c.spin += c.v / c.spec.roue * dt;
  for (const w of c.wheels) { w.piv.rotation.y = w.avant ? c.steer * T.braquage * 0.5 : 0; w.w.rotation.x = hb && !w.avant ? w.w.rotation.x : c.spin; }

  // traces, fumée, poussière
  const glisse = Math.abs(vl), patine = glisse > 2.4 || (hb && spd > 3) || (thr < -0.5 && c.v > 8);
  c.wheels.forEach((w, i) => { if (w.avant) return; const wx = c.x + rx * w.x + fx * w.z, wz = c.z + rz * w.x + fz * w.z; skidMark(i - 2, wx, wz, patine && route);
    if (patine && Math.random() < dt * (route ? 26 : 34)) puff(wx, c.y + 0.25, wz, (Math.random() - 0.5) * 1.6 - c.vx * 0.05, 0.6 + Math.random(), (Math.random() - 0.5) * 1.6 - c.vz * 0.05, route ? 0.55 : 0.8, route ? 0.8 : 1.1); });
  if (!route && spd > 9 && Math.random() < dt * 14) puff(c.x - fx * c.half, c.y + 0.2, c.z - fz * c.half, (Math.random() - 0.5), 0.7, (Math.random() - 0.5), 0.9, 1.2);

  // score de dérapage : des points tant que la voiture est franchement en travers, perdus au premier choc
  const angle = Math.atan2(Math.abs(vl), Math.abs(c.v) + 0.01);
  if (driving && spd > 8 && angle > 0.2 && route) { DRIVE.score += spd * angle * dt * 14; DRIVE.scoreT = 0.9; driftHud('Dérapage ' + Math.round(DRIVE.score), DRIVE.score > 300); }
  else if (DRIVE.scoreT > 0) {
    DRIVE.scoreT -= dt;
    if (DRIVE.scoreT <= 0) {
      const pts = Math.round(DRIVE.score); DRIVE.score = 0; driftHud('');
      if (pts >= 80) { if (pts > DRIVE.best) { DRIVE.best = pts; try { localStorage.setItem(BEST_KEY, String(pts)); } catch (e) { /* stockage indisponible */ } toast(`<b>Dérapage : ${pts} points</b> · record battu`); } else toast(`Dérapage : ${pts} points · record ${DRIVE.best}`); }
    }
  }
  // son du moteur : régime en dents de scie au fil des rapports
  let g = 0; const av = Math.abs(c.v); while (g < GEARS.length - 2 && av > GEARS[g + 1]) g++;
  sfxEngine(driving, clamp(0.12 + 0.88 * (av - GEARS[g]) / (GEARS[g + 1] - GEARS[g]), 0, 1), Math.abs(thr), clamp((glisse - 1.5) / 6, 0, 1) + (hb && spd > 3 ? 0.4 : 0), !route);
  DRIVE.shake *= Math.pow(0.004, dt);
}

// ---------- ce que la voiture percute : mobilier, voitures garées, citoyens, cochons, circulation
const inBox = (c, x, z, r, fx, fz, rx, rz) => { const dx = x - c.x, dz = z - c.z, lz = dx * fx + dz * fz - c.cz, lx = dx * rx + dz * rz; return Math.abs(lz) < c.half + r && Math.abs(lx) < c.spec.larg / 2 + r; };
function bump(c, x, z, r) {   // obstacle rond qui ne bouge pas : la voiture est repoussée et rebondit
  const dx = c.x - x, dz = c.z - z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d, vn = c.vx * ux + c.vz * uz;
  const pen = r + c.spec.larg * 0.6 - d; if (pen > 0) { c.x += ux * pen; c.z += uz * pen; }
  if (vn < 0) { c.vx -= 1.3 * vn * ux; c.vz -= 1.3 * vn * uz; return -vn; }
  return 0;
}
function hitThings(c, spd, fx, fz, rx, rz) {
  let impact = 0;
  const up = () => 3 + spd * 0.28 + Math.random() * 2, side = () => (Math.random() - 0.5) * (2 + spd * 0.2);
  for (const o of knockNear(c.x, c.z, c.half + 1.6, _hits)) {
    if (!inBox(c, o.x, o.z, o.r, fx, fz, rx, rz)) continue;
    const y = groundAt(o.x, o.z);
    if (o.kind === 'prop') {
      if (spd < 2.2) continue;
      o.gone = true; o.p[6] = 1; lazyDrop(o.tile);
      const d = PROPS.defs[o.type], im = new THREE.InstancedMesh(d.geo, PROPS.mat, 1), t = o.p[5] || [255, 255, 255];
      im.setMatrixAt(0, _m.identity()); im.setColorAt(0, _col.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace)); im.castShadow = true;
      launchMesh(im, scene, { x: o.x, y: y + 0.3, z: o.z, yaw: o.p[3], scale: o.p[4], vx: c.vx * (0.8 + Math.random() * 0.5) + side(), vy: up(), vz: c.vz * (0.8 + Math.random() * 0.5) + side(), h: 0.25, rest: 5, couche: true });
      const k = 1 - Math.min(0.5, o.masse * 0.3); c.vx *= k; c.vz *= k; sfxKnock(); DRIVE.shake = Math.min(1, DRIVE.shake + o.masse * 0.25);
    } else if (spd > 9) {   // voiture garée percutée fort : elle s'envole
      o.gone = true; o.p.gone = true; lazyDrop(o.tile);
      const im = new THREE.InstancedMesh(carGeo(o.p.model).fixe, carMaterial(), 1);
      im.setMatrixAt(0, _m.identity()); im.setColorAt(0, _col.setRGB(o.p.col[0] / 255, o.p.col[1] / 255, o.p.col[2] / 255, THREE.SRGBColorSpace)); im.castShadow = true;
      launchMesh(im, scene, { x: o.x, y: y + 0.5, z: o.z, yaw: o.p.yaw, vx: c.vx * 0.75 + side(), vy: 2.5 + spd * 0.16, vz: c.vz * 0.75 + side(), h: 0.75, rest: 7, couche: Math.random() < 0.5 });
      c.vx *= 0.45; c.vz *= 0.45; impact = Math.max(impact, spd * 0.7);
    } else impact = Math.max(impact, bump(c, o.x, o.z, o.r));
  }
  if (spd > 1.8) {
    // citoyens : ils volent en gesticulant, restent étendus un instant, puis se relèvent
    NPC.peds.forEach((p, i) => {
      if (p.fly || p.x === undefined || !inBox(c, p.x, p.z, 0.4, fx, fz, rx, rz)) return;
      if (p.spot) { p.spot.used = false; p.spot = null; }
      p.w = null;
      p.fly = launch({ x: p.x, y: groundAt(p.x, p.z) + 0.6, z: p.z, yaw: p.yaw || 0, scale: p.sc, vx: c.vx * (0.9 + Math.random() * 0.4) + side(), vy: up(), vz: c.vz * (0.9 + Math.random() * 0.4) + side(), h: 0.22, rest: 2.4, couche: true,
        onMatrix: (m, f) => { p.x = f.x; p.z = f.z; NPC.pool.set(i, m, f.t * 22, f.sol > 0 ? 0.25 : 1.8); },
        onEnd: f => { p.fly = null; p.spot = { x: f.x, z: f.z, yaw: Math.random() * 6.28, used: true }; } });
      c.vx *= 0.97; c.vz *= 0.97; sfxOink(); renverse();
    });
    // cochons des troupeaux
    for (const p of herds.pigs) {
      if (p.fly || Math.abs(p.x - c.x) > 6 || Math.abs(p.z - c.z) > 6 || !inBox(c, p.x, p.z, 0.45, fx, fz, rx, rz)) continue;
      p.fm = p.fm || new THREE.Matrix4();
      p.fly = launch({ x: p.x, y: groundAt(p.x, p.z) + 0.5, z: p.z, yaw: p.rot, scale: p.sc, vx: c.vx * (0.9 + Math.random() * 0.4) + side(), vy: up(), vz: c.vz * (0.9 + Math.random() * 0.4) + side(), h: 0.3 * p.sc, rest: 2, couche: true,
        onMatrix: (m, f) => { p.fm.copy(m); p.x = f.x; p.z = f.z; },
        onEnd: f => { p.fly = null; p.tx = p.x; p.tz = p.z; p.wait = 1 + Math.random() * 2; } });
      c.vx *= 0.97; c.vz *= 0.97; sfxOink(true); renverse();
    }
  }
  // circulation : choc fort, la voiture d'en face s'envole ; choc faible, on se repousse
  for (const n of NPC.cars) {
    if (!n.l || n.fly || !inBox(c, n.x, n.z, 1.2, fx, fz, rx, rz)) continue;
    const nvx = Math.sin(n.yaw) * n.l.v, nvz = Math.cos(n.yaw) * n.l.v, rel = Math.hypot(c.vx - nvx, c.vz - nvz);
    if (rel > 8) {
      n.fly = launch({ x: n.x, y: groundAt(n.x, n.z) + 0.6, z: n.z, yaw: n.yaw, vx: c.vx * 0.6 + nvx * 0.4 + side(), vy: 2.5 + rel * 0.18, vz: c.vz * 0.6 + nvz * 0.4 + side(), h: 0.75, rest: 6, couche: Math.random() < 0.5, fade: true,
        onMatrix: m => { n.im.setMatrixAt(n.k, m); n.im.instanceMatrix.needsUpdate = true; },
        onEnd: () => { n.fly = null; n.l = null; } });
      c.vx *= 0.5; c.vz *= 0.5; impact = Math.max(impact, rel * 0.7);
    } else impact = Math.max(impact, bump(c, n.x, n.z, 1.3));
  }
  return impact;
}
const PALIERS = { 1: 'Premier cochon renversé. Il s\'en remettra.', 10: '10 renversés. Ils se relèvent tous, promis.', 25: '25 renversés. La SCPB décline toute responsabilité.', 50: '50 renversés. Le pays entier vous évite.', 100: '100 renversés. Une statue est à l\'étude.' };
function renverse() { DRIVE.renverses++; if (PALIERS[DRIVE.renverses]) toast(PALIERS[DRIVE.renverses]); const el = $('ex-hits'); if (el) { el.textContent = DRIVE.renverses + (DRIVE.renverses > 1 ? ' renversés' : ' renversé'); el.style.display = 'block'; } }

// ---------- caméra de poursuite : elle suit le cap avec retard (on voit la voiture partir en travers),
// recule et élargit le champ avec la vitesse, tremble aux chocs
export function driveCamera(dt) {
  const c = EX.car, spd = Math.hypot(c.vx, c.vz);
  if (c.camYaw === undefined) c.camYaw = c.yaw;
  let d = c.yaw - c.camYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); c.camYaw += d * (1 - Math.exp(-dt * (c.drift ? 2.4 : 4)));
  const a = c.camYaw + c.orbit, dist = 6.6 + c.half + spd * 0.07, cp = Math.cos(c.orbitP);
  let x = c.x - Math.sin(a) * dist * cp, z = c.z - Math.cos(a) * dist * cp, y = c.y + 1.3 + Math.sin(c.orbitP) * dist;
  y = Math.max(y, groundAt(x, z) + 0.8);
  const k = 1 - Math.pow(0.000001, dt), sh = DRIVE.shake * 0.35;
  camera.position.set(lerp(camera.position.x, x, k) + (Math.random() - 0.5) * sh, lerp(camera.position.y, y, k) + (Math.random() - 0.5) * sh, lerp(camera.position.z, z, k) + (Math.random() - 0.5) * sh);
  camera.lookAt(c.x + Math.sin(c.yaw) * 1.2, c.y + 1.25, c.z + Math.cos(c.yaw) * 1.2);
  const fov = 64 + Math.min(18, spd * 0.5);
  if (Math.abs(fov - camera.fov) > 0.05) { camera.fov = lerp(camera.fov, fov, 1 - Math.pow(0.01, dt)); camera.updateProjectionMatrix(); }
}
