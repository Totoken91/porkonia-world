// Habitants et circulation autour du joueur
import * as THREE from 'three';
import { hashStr, lerp, clamp } from '../engine/util.js';
import { QKEY } from '../engine/quality.js';
import { STATIONS, hAt } from '../world/land.js';
import { scene } from '../engine/renderer.js';
import { Mset } from '../engine/geo.js';
import { TOWN_SEGS, SPOTS, ROADS, CARS, groundAt } from '../world/registry.js';
import { EX, clock } from './state.js';
import { makeCitizenPool } from '../world/assets.js';

// ---------- habitants : piétons sur les trottoirs, voitures dans les rues et sur les routes
export const NPC = { walks: [], wgrid: new Map(), lanes: [], lgrid: new Map(), peds: [], cars: [], pm: null, cm: null, cur: 0, ccur: 0 };
export function buildNpcs() {
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
