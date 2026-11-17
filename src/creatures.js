// Citoyens des quais et troupeaux
import * as THREE from 'three';
import { STATIONS, hashStr, clamp, lerp, hAt } from './core.js';
import { Geo, M, scenery, Mset, freeSpot, FARMS, reserve } from './scenery.js';
import { creatureMat, makePorc } from './assets.js';
import { PLATFORM_SLOTS } from './landmarks.js';

function makeCitizenGeometries() {
  const skin = new Geo(), shirt = new Geo(), pants = new Geo();
  const W = [255, 255, 255], S = [228, 196, 204], D = [50, 40, 40];
  pants.add('cyl', M(-0.12, 0.45, 0, 0.2, 0.9, 0.22), W).add('cyl', M(0.12, 0.45, 0, 0.2, 0.9, 0.22), W);
  pants.box(-0.12, 0.05, 0.05, 0.2, 0.1, 0.32, [40, 36, 34]).box(0.12, 0.05, 0.05, 0.2, 0.1, 0.32, [40, 36, 34]);
  shirt.add('cyl', M(0, 1.22, 0, 0.56, 0.72, 0.34), W).add('cyl', M(-0.36, 1.2, 0, 0.14, 0.6, 0.14, 0, 0, 0.12), W).add('cyl', M(0.36, 1.2, 0, 0.14, 0.6, 0.14, 0, 0, -0.12), W);
  skin.add('sph', M(0, 1.8, 0, 0.5, 0.46, 0.46), W).add('cyl', M(0, 1.74, 0.24, 0.22, 0.1, 0.18, 0, Math.PI / 2), S);
  skin.add('sph', M(-0.05, 1.745, 0.295, 0.04, 0.05, 0.02), D).add('sph', M(0.05, 1.745, 0.295, 0.04, 0.05, 0.02), D);
  skin.add('cone', M(-0.17, 2.06, 0.02, 0.14, 0.18, 0.06, 0, 0, 0.3), W).add('cone', M(0.17, 2.06, 0.02, 0.14, 0.18, 0.06, 0, 0, -0.3), W);
  skin.add('sph', M(-0.1, 1.88, 0.2, 0.06, 0.06, 0.03), D).add('sph', M(0.1, 1.88, 0.2, 0.06, 0.06, 0.03), D);
  skin.add('sph', M(-0.38, 0.86, 0, 0.13, 0.13, 0.13), W).add('sph', M(0.38, 0.86, 0, 0.13, 0.13, 0.13), W);
  return { skin: skin.geometry(), shirt: shirt.geometry(), pants: pants.geometry() };
}
const PIG_SKINS = [[242, 168, 182], [138, 92, 62], [52, 42, 40], [232, 150, 164], [168, 112, 80]];
const SHIRTS = [[123, 30, 46], [243, 231, 201], [47, 127, 214], [242, 182, 48], [70, 140, 70], [120, 120, 130], [230, 90, 60], [96, 70, 140]];
const PANTS = [[50, 54, 70], [90, 70, 50], [40, 40, 44], [110, 110, 120], [70, 80, 110]];
export const citizens = { meshes: null, list: [] };
export function buildCitizens() {
  const geos = makeCitizenGeometries();
  const count = STATIONS.reduce((a, s) => a + PLATFORM_SLOTS[s.id].length, 0);
  const mat = creatureMat();
  const mk = g => { const m = new THREE.InstancedMesh(g, mat, count); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; return m; };
  citizens.meshes = { skin: mk(geos.skin), shirt: mk(geos.shirt), pants: mk(geos.pants) };
  const col = new THREE.Color();
  let i = 0;
  for (const st of STATIONS) PLATFORM_SLOTS[st.id].forEach((p, k) => {
    const h = hashStr(st.name + ':' + k);
    const c = { st: st.id, k, x: p.x, y: p.y, z: p.z, rot: -st.ax + Math.PI / 2 + ((h % 100) / 100 - 0.5) * 1.4, visible: false, walk: null, phase: (h % 628) / 100, i };
    citizens.list.push(c);
    const sk = PIG_SKINS[h % PIG_SKINS.length], sh = SHIRTS[(h >>> 4) % SHIRTS.length], pa = PANTS[(h >>> 8) % PANTS.length];
    citizens.meshes.skin.setColorAt(i, col.setRGB(sk[0] / 255, sk[1] / 255, sk[2] / 255, THREE.SRGBColorSpace));
    citizens.meshes.shirt.setColorAt(i, col.setRGB(sh[0] / 255, sh[1] / 255, sh[2] / 255, THREE.SRGBColorSpace));
    citizens.meshes.pants.setColorAt(i, col.setRGB(pa[0] / 255, pa[1] / 255, pa[2] / 255, THREE.SRGBColorSpace));
    i++;
  });
  for (const m of Object.values(citizens.meshes)) scenery.add(m);
}
export const _cm = new THREE.Matrix4();
export function updateCitizens(t, dt, camPos) {
  const ms = citizens.meshes; if (!ms) return;
  let any = false;
  for (const c of citizens.list) {
    const near = Math.abs(c.x - camPos.x) < 700 && Math.abs(c.z - camPos.z) < 700;
    if (!near && !c.walk && c.shown === c.visible) continue;
    c.shown = c.visible; any = true;
    let s = c.visible ? 1 : 0;
    if (c.walk) {
      c.walk.t += dt;
      const k = clamp(c.walk.t / c.walk.dur, 0, 1);
      c.x = lerp(c.walk.x0, c.walk.tx, k); c.z = lerp(c.walk.z0, c.walk.tz, k);
      c.rot = Math.atan2(c.walk.tx - c.walk.x0, c.walk.tz - c.walk.z0);
      if (k >= 1) { c.visible = false; c.walk = null; const p = PLATFORM_SLOTS[c.st][c.k]; c.x = p.x; c.z = p.z; s = 0; }
    }
    const bob = c.walk ? Math.abs(Math.sin(t * 9 + c.phase)) * 0.08 : Math.sin(t * 2 + c.phase) * 0.02;
    Mset(_cm, c.x, c.y + bob, c.z, s, s, s, c.rot);
    ms.skin.setMatrixAt(c.i, _cm); ms.shirt.setMatrixAt(c.i, _cm); ms.pants.setMatrixAt(c.i, _cm);
  }
  if (any) ms.skin.instanceMatrix.needsUpdate = ms.shirt.instanceMatrix.needsUpdate = ms.pants.instanceMatrix.needsUpdate = true;
}
const herds = { mesh: null, pigs: [] };
export function buildHerds(rnd) {
  const pigs = [];
  const spots = [];
  for (const st of STATIONS) for (let h = 0; h < 1 + st.meta.size; h++) { const sp = freeSpot(st, rnd, 300, 1400, 22, 5); if (sp) spots.push(sp); }
  for (const f of FARMS) spots.push({ x: f.x + Math.cos(f.rot + 1.6) * 30, z: f.z + Math.sin(f.rot + 1.6) * 30 });
  for (const sp of spots) {
    const n = 5 + (rnd() * 7 | 0), skin = PIG_SKINS[(rnd() * 3) | 0];
    for (let k = 0; k < n; k++) { const x = sp.x + (rnd() - 0.5) * 30, z = sp.z + (rnd() - 0.5) * 30; pigs.push({ cx: sp.x, cz: sp.z, x, z, rot: rnd() * 6.28, tx: x, tz: z, wait: rnd() * 4, skin, sc: 0.8 + rnd() * 0.5 }); }
    reserve(sp.x, sp.z, 20);
  }
  const pa = makePorc(); herds.U = pa.U;
  const mesh = new THREE.InstancedMesh(pa.geo, pa.mat, pigs.length);
  const col = new THREE.Color();
  pigs.forEach((p, i) => { const h = rnd(); p.sc *= 0.5; if (h < 0.05) col.setRGB(1.05, 1.55, 0.6); else if (h < 0.3) col.setRGB(0.86, 0.8, 0.8); else if (h < 0.4) col.setRGB(0.5, 0.42, 0.3); else col.setRGB(1, 1, 1); mesh.setColorAt(i, col); p.col = col.clone(); });
  mesh.count = 0;
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true;
  herds.mesh = mesh; herds.pigs = pigs; herds.rnd = rnd;
  scenery.add(mesh);
}
export function updateHerds(t, dt, camPos) {
  const { mesh, pigs, rnd } = herds; if (!mesh) return;
  let j = 0; const HR = 520;
  pigs.forEach((p, i) => {
    if (Math.abs(p.x - camPos.x) > HR || Math.abs(p.z - camPos.z) > HR) return;
    const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { p.wait -= dt; if (p.wait < 0) { p.tx = p.cx + (rnd() - 0.5) * 34; p.tz = p.cz + (rnd() - 0.5) * 34; p.wait = 2 + rnd() * 6; } }
    else { const sp = Math.min(d, 0.9 * dt); p.x += dx / d * sp; p.z += dz / d * sp; const want = Math.atan2(dx, dz); let da = want - p.rot; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; p.rot += da * Math.min(1, dt * 3); }
    const walk = d > 0.3 ? Math.abs(Math.sin(t * 10 + i)) * 0.03 : 0;
    mesh.setMatrixAt(j, Mset(_cm, p.x, hAt(p.x, p.z) + walk, p.z, p.sc, p.sc, p.sc, p.rot)); mesh.setColorAt(j, p.col); j++;
  });
  mesh.count = j; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}
