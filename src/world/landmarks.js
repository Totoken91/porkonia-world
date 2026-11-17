// Monuments et gares
import * as THREE from 'three';
import { hashStr } from '../engine/util.js';
import { waterAt } from './land.js';
import { M } from '../engine/geo.js';
import { ANIMATED, SMOKERS } from './registry.js';
import { PLATFORM_HALF, STOP_MARK, FIX, DEPART } from './tracks.js';
import { Kit, freeSpot, SMAT, signMesh, scenery, reserve, LANDMARK_SPOTS } from './scenery.js';
import { makePigGeometry } from './assets.js';

export function landmark(kind, st, rnd) {
  const K = new Kit();
  let spot;
  const S = [214, 200, 172];
  switch (kind) {
    case 'palais': {
      spot = freeSpot(st, rnd, 150, 300, 52, 9); if (!spot) return;
      K.on('stone').box(0, 8, 0, 74, 16, 44, S).box(0, 17, 0, 54, 4, 32, [200, 186, 160]);
      K.on('stone').add('cyl24', M(0, 22, 0, 24, 8, 24), S);
      K.on('copper').add('hemi', M(0, 26, 0, 26, 24, 26), [120, 190, 160]);
      for (const sx of [-32, 32]) for (const sz2 of [-17, 17]) { K.on('stone').add('cyl24', M(sx, 12, sz2, 8, 24, 8), S); K.on('roof').add('cone', M(sx, 28, sz2, 10, 9, 10), [123, 30, 46]); }
      for (let k = -5; k <= 5; k++) K.on('stone').add('cyl', M(k * 5.4, 7, 22.6, 1.6, 14, 1.6), [246, 240, 228]);
      K.on('stone').box(0, 15.5, 22.6, 60, 1.8, 2.4, [236, 226, 206]);
      for (let k = -6; k <= 6; k++) for (const fl of [5, 11]) K.on('glass').box(k * 5.2, fl, -22.1, 2, 3.2, 0.2, [60, 70, 80]);
      const grp = K.group();
      const statue = new THREE.Mesh(makePigGeometry(true), SMAT.gold); statue.scale.setScalar(6.5); statue.position.set(0, 38.5, 0); statue.castShadow = true;
      grp.add(statue); ANIMATED.push({ obj: statue, kind: 'spin' });
      const flag = signMesh('PORKONIA', 16, 3.4, { bg: '#7b1e2e' }); flag.position.set(0, 18.3, 24); grp.add(flag);
      place(grp, spot, st, kind, 55); return;
    }
    case 'statue': {
      spot = freeSpot(st, rnd, 80, 240, 13); if (!spot) return;
      K.on('stone').box(0, 2.5, 0, 9, 5, 9, [210, 200, 186]).box(0, 5.6, 0, 7, 1.2, 7, [190, 180, 166]);
      const grp = K.group();
      const statue = new THREE.Mesh(makePigGeometry(true), SMAT.gold); statue.scale.setScalar(3.6); statue.position.set(0, 6.2, 0); statue.rotation.y = rnd() * 6; statue.castShadow = true;
      grp.add(statue); place(grp, spot, st, kind, 14); return;
    }
    case 'chateau': {
      spot = freeSpot(st, rnd, 200, 460, 42, 16); if (!spot) return;
      K.on('stone').box(0, 10, 0, 34, 20, 26, S);
      for (const [x, z] of [[-22, -18], [22, -18], [-22, 18], [22, 18]]) { K.on('stone').add('cyl24', M(x, 13, z, 10, 26, 10), S); K.on('roof').add('cone', M(x, 30, z, 12, 10, 12), [70, 74, 92]); }
      K.on('stone').add('cyl24', M(0, 26, 0, 12, 16, 12), S); K.on('roof').add('cone', M(0, 40, 0, 14, 14, 14), [70, 74, 92]);
      K.on('stone').box(0, 5, -20, 36, 10, 2, S).box(0, 5, 20, 36, 10, 2, S).box(-22, 5, 0, 2, 10, 32, S).box(22, 5, 0, 2, 10, 32, S);
      for (let k = -8; k <= 8; k++) for (const z of [-20, 20]) K.on('stone').box(k * 2.1, 10.6, z, 1, 1.2, 2.2, S);
      place(K.group(), spot, st, kind, 40);
      // vignes de Stanley
      const vs = freeSpot(st, rnd, 260, 560, 32, 22);
      if (vs) { const V = new Kit(); for (let k = 0; k < 14; k++) V.on('wood').box(0, 0.9, k * 4.6 - 30, 54, 1.8, 1.2, [70, 120, 50]); const vg = V.group(); vg.position.set(vs.x, vs.y, vs.z); vg.rotation.y = rnd() * 3; scenery.add(vg); reserve(vs.x, vs.z, 32); }
      return;
    }
    case 'brasserie': {
      spot = freeSpot(st, rnd, 90, 320, 27); if (!spot) return;
      K.on('plaster').box(0, 7, 0, 36, 14, 20, [176, 92, 60]); K.on('roof').add('roof', M(0, 14, 0, 21, 5, 37, Math.PI / 2), [80, 84, 96]);
      for (let k = 0; k < 4; k++) { K.on('copper').add('cyl24', M(-14 + k * 9.5, 9, 15, 7, 18, 7), [220, 150, 90]); K.on('copper').add('hemi', M(-14 + k * 9.5, 18, 15, 7, 4, 7), [230, 160, 96]); }
      K.on('stone').add('cyl', M(14, 18, -6, 2.4, 36, 2.4), [150, 70, 50]);
      for (let k = 0; k < 7; k++) K.on('glass').box(-15 + k * 5, 8, -10.1, 2.2, 4, 0.2, [60, 70, 80]);
      const grp = K.group();
      const sign = signMesh('DOUZI AMBRÉE', 16, 3, { bg: '#d68a1e', fg: '#2a1408', glow: 0.5 }); sign.position.set(0, 11.5, -10.4); sign.rotation.y = Math.PI; grp.add(sign);
      SMOKERS.push({ rel: [14, 37, -6], rate: 0.7, size: 3.2 });
      place(grp, spot, st, kind, 28); return;
    }
    case 'phare': {
      let best = null;
      for (let k = 0; k < 160; k++) { const sp = freeSpot(st, rnd, 120, 600, 7, 10); if (!sp) continue; let near = false; for (let a = 0; a < 6.28; a += 0.6) if (waterAt(sp.x + Math.cos(a) * 45, sp.z + Math.sin(a) * 45) > -1e8) near = true; if (near) { best = sp; break; } }
      spot = best || freeSpot(st, rnd, 120, 420, 8, 8); if (!spot) return;
      for (let k = 0; k < 6; k++) K.on('paint').add('cyl24', M(0, 2.6 + k * 5.2, 0, 6 - k * 0.45, 5.2, 6 - k * 0.45), k % 2 ? [238, 238, 236] : [190, 32, 40]);
      K.on('glass').add('cyl24', M(0, 33, 0, 4.4, 3.2, 4.4), [200, 220, 230]); K.on('paint').add('cone', M(0, 36.2, 0, 5.6, 3, 5.6), [190, 32, 40]);
      K.on('glow').add('sph', M(0, 33, 0, 2.2, 2.2, 2.2), [255, 236, 170]);
      K.on('metal').add('torus', M(0, 31.4, 0, 6.4, 6.4, 6.4, 0, Math.PI / 2), [60, 60, 64]);
      place(K.group(), spot, st, kind, 9); return;
    }
    case 'eglise': {
      spot = freeSpot(st, rnd, 80, 340, 19); if (!spot) return;
      const SS = st.meta.montagne ? [226, 220, 204] : [230, 216, 184];
      K.on('stone').box(0, 6.5, 0, 12, 13, 26, SS); K.on('roof').add('roof', M(0, 13, 0, 13.4, 6.5, 27.4), [80, 84, 96]);
      K.on('stone').box(0, 12, -15, 7.5, 24, 7.5, SS); K.on('roof').add('cone', M(0, 29.5, -15, 6.6, 11, 6.6), [80, 84, 96]);
      for (let k = -3; k <= 3; k++) K.on('glass').box(6.1, 7, k * 3.4, 0.2, 4.5, 1.2, [120, 60, 70]).box(-6.1, 7, k * 3.4, 0.2, 4.5, 1.2, [60, 70, 140]);
      const grp = K.group();
      const clock = signMesh('12:12', 3.6, 3.6, { bg: '#f3e7c9', fg: '#17110e', border: false, cw: 128, ch: 128 }); clock.position.set(0, 19, -18.9); clock.rotation.y = Math.PI; grp.add(clock);
      place(grp, spot, st, kind, 20); return;
    }
    case 'moulin': {
      spot = freeSpot(st, rnd, 140, 520, 11, 8); if (!spot) return;
      K.on('plaster').add('tcone', M(0, 6.5, 0, 9, 13, 9), [240, 232, 214]); K.on('roof').add('cone', M(0, 15, 0, 8.5, 5, 8.5), [150, 70, 50]);
      const grp = K.group();
      const B = new Kit();
      for (let k = 0; k < 4; k++) { const R = M(0, 0, 0, 1, 1, 1, 0, 0, k * Math.PI / 2); B.on('wood').box(0, 0, 0, 0.5, 11, 0.4, [130, 90, 60], 0, R.clone().multiply(M(0, 5.5, 0, 1, 1, 1))); B.on('plaster').box(0, 0, 0, 2.6, 8.5, 0.12, [246, 240, 226], 0, R.clone().multiply(M(1.6, 6.2, 0, 1, 1, 1))); }
      const blades = B.group(); blades.position.set(0, 13.5, 4.8); grp.add(blades);
      ANIMATED.push({ obj: blades, kind: 'mill' });
      place(grp, spot, st, kind, 12); return;
    }
    case 'chope': {
      spot = freeSpot(st, rnd, 90, 350, 10); if (!spot) return;
      K.on('metal').add('cyl', M(0, 9, 0, 2.2, 18, 2.2), [190, 190, 196]);
      K.on('glass').add('cyl24', M(0, 23, 0, 11, 11, 11), [236, 150, 30]); K.on('plaster').add('cyl24', M(0, 29.3, 0, 11.8, 2.6, 11.8), [252, 250, 240]);
      K.on('plaster').add('sph', M(0, 31, 0, 11, 3.5, 11), [252, 250, 240]);
      K.on('glass').box(7.2, 23, 0, 1.8, 8, 1.8, [230, 230, 236]).box(6, 27, 0, 3, 1.6, 1.8, [230, 230, 236]).box(6, 19, 0, 3, 1.6, 1.8, [230, 230, 236]);
      place(K.group(), spot, st, kind, 11); return;
    }
    case 'fumoir': {
      spot = freeSpot(st, rnd, 90, 360, 15); if (!spot) return;
      K.on('wood').box(0, 4, 0, 18, 8, 12, [120, 84, 60]); K.on('roof').add('roof', M(0, 8, 0, 13, 4, 19, Math.PI / 2), [70, 60, 56]);
      for (const x of [-5, 5]) K.on('stone').add('cyl', M(x, 13, 0, 1.8, 12, 1.8), [96, 70, 56]);
      SMOKERS.push({ rel: [-5, 19.5, 0], rate: 1.0, size: 2.4 }, { rel: [5, 19.5, 0], rate: 1.0, size: 2.4 });
      place(K.group(), spot, st, kind, 16); return;
    }
    case 'antenne': {
      spot = freeSpot(st, rnd, 120, 400, 10, 10); if (!spot) return;
      for (let k = 0; k < 8; k++) K.on('paint').box(0, 4 + k * 8, 0, 4 - k * 0.35, 8, 4 - k * 0.35, k % 2 ? [236, 236, 236] : [190, 32, 40]);
      K.on('glow').add('sph', M(0, 68, 0, 1.6, 1.6, 1.6), [255, 60, 40]);
      const grp = K.group();
      const sign = signMesh('PIGNET', 8, 2, { bg: '#17110e', fg: '#f2b630', glow: 0.8 }); sign.position.set(0, 10, 2.4); grp.add(sign);
      place(grp, spot, st, kind, 11); return;
    }
  }
}
function place(grp, spot, st, kind, r) {
  grp.position.set(spot.x, spot.y - 0.4, spot.z);
  grp.rotation.y = -st.ax + (hashStr(st.name + kind) % 4) * Math.PI / 2;
  grp.updateMatrixWorld(true);
  for (const s of SMOKERS) if (s.rel && !s.done) { const v = new THREE.Vector3(...s.rel).applyMatrix4(grp.matrixWorld); s.x = v.x; s.y = v.y; s.z = v.z; s.done = true; }
  scenery.add(grp); reserve(spot.x, spot.z, r);
  LANDMARK_SPOTS.push({ st: st.id, kind, x: spot.x, z: spot.z });
}

// ---------- gares
export const PLATFORM_SLOTS = [];
export function buildStation(st) {
  const K = new Kit(), sg = new THREE.Group();
  const ax = st.ax;
  const R = M(st.x, 0, st.z, 1, 1, 1, -ax);
  const right = [-st.dir.y, st.dir.x];
  const big = st.meta.size >= 3;
  const Y = st.y;
  const sides = big ? [1, -1] : [1];
  const slots = [];
  const D = [52, 54, 60], BORD = [123, 30, 46];
  for (const sd of sides) {
    const off = sd * 3.95;
    K.on('plaster').box(0, Y + 0.28, off, PLATFORM_HALF * 2, 1.36, 4.6, [200, 196, 188], 0, R);
    K.on('paint').box(0, Y + 0.97, off - sd * 1.95, PLATFORM_HALF * 2, 0.03, 0.32, [246, 240, 230], 0, R);
    K.on('paint').box(0, Y + 0.975, off - sd * 1.55, PLATFORM_HALF * 2, 0.03, 0.12, [242, 196, 40], 0, R);
    const nAbri = st.meta.size >= 4 ? 5 : big ? 3 : 2;
    for (let k = 0; k < nAbri; k++) {
      const x = (k - (nAbri - 1) / 2) * 32;
      for (let px = -10; px <= 10; px += 5) K.on('metal').add('cyl', M(x + px, Y + 2.6, off + sd * 1.2, 0.22, 3.3, 0.22), D, R);
      K.on('paint').box(x, Y + 4.35, off + sd * 0.4, 24, 0.3, 4.8, BORD, 0, R);
      K.on('metal').box(x, Y + 4.2, off + sd * 1.2, 24, 0.25, 0.25, D, 0, R);
      K.on('wood').box(x - 3, Y + 1.5, off + sd * 1.7, 4, 0.12, 0.7, [150, 102, 62], 0, R).box(x - 3, Y + 1.9, off + sd * 2.0, 4, 0.7, 0.1, [150, 102, 62], 0, R);
      K.on('metal').box(x + 4, Y + 1.5, off + sd * 1.9, 0.7, 1.1, 0.5, [60, 110, 70], 0, R);
    }
    for (let x = -PLATFORM_HALF + 12; x <= PLATFORM_HALF - 12; x += 24) {
      K.on('metal').add('cyl', M(x, Y + 3.2, off + sd * 1.9, 0.16, 4.4, 0.16), D, R);
      K.on('dark').box(x, Y + 5.45, off + sd * 1.5, 0.5, 0.25, 1.1, D, 0, R);
      K.on('glow').box(x, Y + 5.3, off + sd * 1.5, 0.36, 0.06, 0.9, [255, 226, 170], 0, R);
    }
    for (const x of [-105, -40, 40, 105]) {
      K.on('metal').box(x - 2.6, Y + 2.4, off + sd * 1.7, 0.16, 3, 0.16, D, 0, R).box(x + 2.6, Y + 2.4, off + sd * 1.7, 0.16, 3, 0.16, D, 0, R);
      const sign = signMesh(st.name.toUpperCase(), 6, 1.15);
      const wx = st.x + st.dir.x * x + right[0] * (off + sd * 1.7), wz = st.z + st.dir.y * x + right[1] * (off + sd * 1.7);
      sign.position.set(wx, Y + 3.5, wz); sign.rotation.y = -ax + (sd > 0 ? Math.PI : 0); sg.add(sign);
    }
    for (let k = 0; k < 24; k++) slots.push({ a: (k / 24 - 0.5) * 220 + (hashStr(st.name + k) % 7) - 3, c: off + sd * (0.2 + (k % 3) * 0.6) });
  }
  for (const sd of [1, -1]) {
    const x = sd * STOP_MARK, off = 2.2;
    K.on('metal').add('cyl', M(x, Y + 1.6, off, 0.12, 3.2, 0.12), D, R);
    const sign = signMesh('ARRÊT', 1.2, 1.2, { bg: '#f3e7c9', fg: '#7b1e2e', cw: 128, ch: 128, size: 34, glow: 0.4 });
    sign.position.set(st.x + st.dir.x * x + right[0] * off, Y + 3.0, st.z + st.dir.y * x + right[1] * off);
    sign.rotation.y = Math.atan2(-sd * st.dir.x, -sd * st.dir.y); sg.add(sign);
  }
  // signaux d'entrée (feux verts)
  for (const sd of [1, -1]) {
    const x = sd * (FIX + 40);
    K.on('metal').add('cyl', M(x, Y + 3, -3.4 * sd, 0.2, 6, 0.2), D, R);
    K.on('dark').box(x, Y + 6.3, -3.4 * sd, 0.6, 1.4, 0.4, [24, 24, 26], 0, R);
    K.on('glow').add('sph', M(x, Y + 6.7, -3.4 * sd - 0.22 * sd, 0.28, 0.28, 0.28), [80, 255, 120], R);
    K.on('dark').add('sph', M(x, Y + 6.1, -3.4 * sd - 0.2 * sd, 0.26, 0.26, 0.26), [70, 20, 20], R);
  }
  // bâtiment voyageurs
  const bl = [0, 26, 34, 48, 70, 120][st.meta.size], bz = 3.95 + 2.3 + 8;
  K.on('plaster').box(0, Y + 4.5, bz, bl, 9, 14, [240, 230, 206], 0, R);
  K.on('roof').add('roof', M(0, Y + 9, bz, 15.6, 4.5, bl + 2, Math.PI / 2), [123, 30, 46], R);
  K.on('stone').box(0, Y + 0.4, bz, bl + 0.4, 0.8, 14.4, [170, 160, 148], 0, R);
  for (let k = 0; k < Math.floor(bl / 4.5); k++) { const x = -bl / 2 + 2.6 + k * 4.5; if (Math.abs(x) < 4) continue; for (const fl of [2.4, 6.2]) K.on('glass').box(x, Y + fl, bz - 7.05, 1.6, 2.2, 0.12, [60, 70, 80], 0, R); }
  K.on('wood').box(0, Y + 1.7, bz - 7.05, 4.6, 3.4, 0.2, [96, 60, 40], 0, R);
  const bigSign = signMesh(st.name.toUpperCase(), Math.min(bl * 0.8, 30), 2.4, { sub: 'SCPB', glow: 0.45 });
  bigSign.position.set(st.x + right[0] * (bz - 7.15), Y + 7.2, st.z + right[1] * (bz - 7.15)); bigSign.rotation.y = -ax + Math.PI; sg.add(bigSign);
  const clock = signMesh('12:12', 2.2, 2.2, { bg: '#f3e7c9', fg: '#17110e', border: false, cw: 128, ch: 128, glow: 0.4 });
  clock.position.set(st.x + st.dir.x * (bl * 0.42) + right[0] * (bz - 7.15), Y + 7.2, st.z + st.dir.y * (bl * 0.42) + right[1] * (bz - 7.15)); clock.rotation.y = -ax + Math.PI; sg.add(clock);
  if (st.meta.size >= 5) {
    for (let x = -110; x <= 110; x += 20) for (const sd of [-1, 1]) K.on('metal').box(x, Y + 6, sd * 12.5, 0.6, 12, 0.6, D, 0, R);
    for (let x = -110; x <= 110; x += 10) K.on('metal').add('ring', M(x, Y + 12, 0, 26, 26, 26, Math.PI / 2), D, R);
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 230, 28, 1, true, 0, Math.PI), SMAT.hall);
    const holder = new THREE.Group(); holder.add(hall); holder.position.set(st.x, Y + 12, st.z); holder.rotation.y = -ax; hall.rotation.set(0, 0, Math.PI / 2);
    sg.add(holder);
  }
  for (const side of [1, -1]) {
    const o = DEPART[st.id][side][0];
    if (o && o.t.stub) {
      const x = side * (o.t.L - 3);
      K.on('paint').box(x, Y + 0.7, 0, 1.2, 1.4, 3.6, [196, 36, 44], 0, R);
      K.on('paint').box(x, Y + 1.0, -1.6, 0.6, 0.6, 0.6, [246, 220, 60], 0, R).box(x, Y + 1.0, 1.6, 0.6, 0.6, 0.6, [246, 220, 60], 0, R);
    }
  }
  for (const m of K.meshes()) sg.add(m);
  scenery.add(sg);
  PLATFORM_SLOTS[st.id] = slots.map(s => ({ x: st.x + st.dir.x * s.a + right[0] * s.c, z: st.z + st.dir.y * s.a + right[1] * s.c, y: Y + 0.97 }));
}
