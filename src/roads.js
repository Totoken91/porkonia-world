// Routes entre villes et collisions
import { clamp, STATIONS, NX, NZ, WW, HH, hAt, waterAt, slopeAt, tmGet, mulberry, lerp, tmMark } from './core.js';
import { surfStamp, groundAt, ROADS, PROP_COLL } from './registry.js';
import { TRACKS, STUBS, sampleFrames, PLATFORM_HALF } from './tracks.js';
import { Drape, DRAPES, terrainN, BUILDINGS, LANDMARK_SPOTS, FOUNTAINS } from './scenery.js';
import { propsRoad } from './props.js';

function stampTracks() {
  for (const t of [...TRACKS, ...STUBS]) {
    const F = sampleFrames(t, 0, t.L, 2);
    for (const f of F) {
      if (f.mode !== 'remblai') continue;
      for (let o = -2.4; o <= 2.4; o += 0.8) surfStamp(f.x + f.rx * o, f.z + f.rz * o, f.y + 0.18);
      const da = clamp(f.y - f.ground + 1.0, 0.8, 16);
      for (let o = 2.6; o < 1.9 + da * 1.15; o += 0.9) for (const sg of [-1, 1]) surfStamp(f.x + f.rx * o * sg, f.z + f.rz * o * sg, f.y - (o - 1.9) / 1.15);
    }
  }
  for (const st of STATIONS) {
    const rx = -st.dir.y, rz = st.dir.x;
    for (const sd of (st.meta.size >= 3 ? [1, -1] : [1])) for (let u = -PLATFORM_HALF; u <= PLATFORM_HALF; u += 1.5) for (let o = 1.9; o <= 6.2; o += 0.8)
      surfStamp(st.x + st.dir.x * u + rx * o * sd, st.z + st.dir.y * u + rz * o * sd, st.y + 0.97);
  }
}

// ---------- routes entre les villes (A* sur le relief, profil lissé, ruban drapé)
export function buildRoads() {
  stampTracks();
  const GX = ((NX - 1) >> 1) + 1, GZ = ((NZ - 1) >> 1) + 1, N = GX * GZ;
  const wx = i => (i / (GX - 1) - 0.5) * WW, wz = j => (j / (GZ - 1) - 0.5) * HH;
  const cellOf = (x, z) => clamp(Math.round((z / HH + 0.5) * (GZ - 1)), 0, GZ - 1) * GX + clamp(Math.round((x / WW + 0.5) * (GX - 1)), 0, GX - 1);
  const base = new Float32Array(N), town = new Uint8Array(N);
  for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
    const x = wx(i), z = wz(j), k = j * GX + i, h = hAt(x, z);
    if (waterAt(x, z) > -1e8 || h < 1.2) { base[k] = Infinity; continue; }
    let c = 1 + slopeAt(x, z) * 30 + Math.max(0, h - 300) / 50;
    const m = tmGet(x, z);
    if (m === 2 || m === 3 || m === 4) town[k] = 1;
    if (m === 1) c += 6;
    base[k] = c;
  }
  const g = new Float32Array(N), came = new Int32Array(N), closed = new Uint8Array(N);
  const hf = [], hk = [];
  const push = (f, k) => { let i = hf.length; hf.push(f); hk.push(k); while (i > 0) { const p = (i - 1) >> 1; if (hf[p] <= f) break; hf[i] = hf[p]; hk[i] = hk[p]; i = p; } hf[i] = f; hk[i] = k; };
  const pop = () => { const k0 = hk[0], f = hf.pop(), k = hk.pop(), n = hf.length; if (n) { let i = 0; for (;;) { let c = i * 2 + 1; if (c >= n) break; if (c + 1 < n && hf[c + 1] < hf[c]) c++; if (hf[c] >= f) break; hf[i] = hf[c]; hk[i] = hk[c]; i = c; } hf[i] = f; hk[i] = k; } return k0; };
  const route = (sx, sz, tx, tz) => {
    const s = cellOf(sx, sz), t = cellOf(tx, tz), si = s % GX, sj = (s / GX) | 0, ti = t % GX, tj = (t / GX) | 0;
    g.fill(Infinity); closed.fill(0); hf.length = 0; hk.length = 0;
    g[s] = 0; came[s] = -1; push(0, s);
    while (hf.length) {
      const k = pop(); if (closed[k]) continue; closed[k] = 1; if (k === t) break;
      const i = k % GX, j = (k / GX) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ) continue;
        const nk = nj * GX + ni; if (closed[nk]) continue;
        let c = base[nk];
        const nearEnd = Math.max(Math.abs(ni - si), Math.abs(nj - sj)) <= 2 || Math.max(Math.abs(ni - ti), Math.abs(nj - tj)) <= 2;
        if (town[nk]) c = nearEnd ? 25 : Infinity; else if (c === Infinity && nearEnd && nk === t) c = 5;
        if (c === Infinity) continue;
        const ng = g[k] + c * (di && dj ? 1.414 : 1);
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; push(ng + Math.hypot(ni - ti, nj - tj), nk); }
      }
    }
    if (g[t] === Infinity) return null;
    const cells = []; for (let k = t; k >= 0; k = came[k]) cells.push(k); cells.reverse();
    return cells;
  };
  const pairs = new Map();
  const addPair = (a, b) => { if (a < 0 || b < 0 || a === b) return; pairs.set(Math.min(a, b) + ':' + Math.max(a, b), [a, b]); };
  for (const t of TRACKS) addPair(t.a, t.b);
  const byName = n => STATIONS.findIndex(s => s.name === n);
  addPair(byName('Port-Cochon'), byName('Lardonville')); addPair(byName('Biermont'), byName('Brassefort')); addPair(byName('Port-Cochon'), byName('Val-Lardon'));
  const exitNode = (st, tx, tz) => {
    const tw = st.town;
    if (!tw || !tw.nodes.length) return [st.x - st.dir.y * 60, st.z + st.dir.x * 60];
    const dx = tx - tw.C[0], dz = tz - tw.C[1], l = Math.hypot(dx, dz) || 1;
    let best = null, bs = -1e9;
    for (const n of tw.nodes) { const s = ((n[0] - tw.C[0]) * dx + (n[1] - tw.C[1]) * dz) / l; if (s > bs) { bs = s; best = n; } }
    return best;
  };
  const drapes = new Map();
  const drapeFor = (x, z) => { const k = Math.floor(x / 1500) + ':' + Math.floor(z / 1500); let d = drapes.get(k); if (!d) { d = new Drape(); drapes.set(k, d); DRAPES.push({ d, x: (Math.floor(x / 1500) + 0.5) * 1500, z: (Math.floor(z / 1500) + 0.5) * 1500 }); } return d; };
  const HW = 3.6, rndR = mulberry(4711);
  let ri = 0;
  for (const [a, b] of pairs.values()) {
    const A = STATIONS[a], B = STATIONS[b];
    const pa = exitNode(A, B.x, B.z), pb = exitNode(B, A.x, A.z);
    const cells = route(pa[0], pa[1], pb[0], pb[1]);
    if (!cells) continue;
    let pts = cells.map(k => [wx(k % GX), wz((k / GX) | 0)]);
    pts[0] = pa; pts[pts.length - 1] = pb;
    for (let pass = 0; pass < 3; pass++) {
      const q = [pts[0]];
      for (let k = 0; k < pts.length - 1; k++) { const p0 = pts[k], p1 = pts[k + 1]; q.push([p0[0] * 0.75 + p1[0] * 0.25, p0[1] * 0.75 + p1[1] * 0.25], [p0[0] * 0.25 + p1[0] * 0.75, p0[1] * 0.25 + p1[1] * 0.75]); }
      q.push(pts[pts.length - 1]); pts = q;
    }
    // rééchantillonnage tous les 6 m
    const S = [pts[0]]; let acc = 0;
    for (let k = 1; k < pts.length; k++) {
      let p0 = pts[k - 1]; const p1 = pts[k]; let d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
      while (acc + d >= 6) { const t = (6 - acc) / d; p0 = [lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)]; S.push(p0); d = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]); acc = 0; }
      acc += d;
    }
    const n = S.length; if (n < 4) continue;
    let prof = new Float32Array(n);
    for (let k = 0; k < n; k++) prof[k] = groundAt(S[k][0], S[k][1]);
    for (let pass = 0; pass < 2; pass++) { const q = new Float32Array(n); for (let k = 0; k < n; k++) { let s = 0, c = 0; for (let o = -4; o <= 4; o++) { const kk = k + o; if (kk >= 0 && kk < n) { s += prof[kk]; c++; } } q[k] = s / c; } prof = q; }
    const rows = [];
    for (let k = 0; k < n; k++) {
      const p = S[k], pn = S[Math.min(n - 1, k + 1)], pp = S[Math.max(0, k - 1)];
      const tx = pn[0] - pp[0], tz = pn[1] - pp[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
      const yc = Math.max(prof[k], groundAt(p[0], p[1])) + 0.1 + ri * 0.004;
      const L = [p[0] + nx * HW, p[1] + nz * HW], R = [p[0] - nx * HW, p[1] - nz * HW];
      rows.push({ x: p[0], z: p[1], y: yc, nx, nz, L, R, yl: Math.max(yc, hAt(L[0], L[1]) + 0.1), yr: Math.max(yc, hAt(R[0], R[1]) + 0.1), gl: hAt(L[0], L[1]), gr: hAt(R[0], R[1]) });
    }
    for (let k = 0; k < n - 1; k++) {
      const A0 = rows[k], B0 = rows[k + 1], D = drapeFor(A0.x, A0.z), up = terrainN(A0.x, A0.z);
      const V = (x, y, z, kind) => D.v(x, y, z, up[0], up[1], up[2], kind, x, z);
      const quad = (a, b, c, d, kind) => { V(...a, kind); V(...b, kind); V(...c, kind); V(...a, kind); V(...c, kind); V(...d, kind); };
      const P = (r, o, dy) => [r.x + r.nx * o, (o >= 0 ? lerp(r.y, r.yl, o / HW) : lerp(r.y, r.yr, -o / HW)) + dy, r.z + r.nz * o];
      quad(P(A0, HW, 0), P(B0, HW, 0), P(B0, 0, 0), P(A0, 0, 0), 0);
      quad(P(A0, 0, 0), P(B0, 0, 0), P(B0, -HW, 0), P(A0, -HW, 0), 0);
      if (k % 3 < 2) quad(P(A0, 0.08, 0.03), P(B0, 0.08, 0.03), P(B0, -0.08, 0.03), P(A0, -0.08, 0.03), 5);
      for (const sg of [-1, 1]) {
        quad(P(A0, sg * (HW - 0.25), 0.03), P(B0, sg * (HW - 0.25), 0.03), P(B0, sg * (HW - 0.4), 0.03), P(A0, sg * (HW - 0.4), 0.03), 5);
        // talus quand la route est au-dessus du terrain
        const ya = sg > 0 ? A0.yl : A0.yr, yb = sg > 0 ? B0.yl : B0.yr, ga = sg > 0 ? A0.gl : A0.gr, gb = sg > 0 ? B0.gl : B0.gr;
        if (ya - ga > 0.3 || yb - gb > 0.3) {
          const da = Math.max(0.3, ya - ga) * 1.3 + 0.4, db = Math.max(0.3, yb - gb) * 1.3 + 0.4;
          const a = P(A0, sg * HW, 0), bq = P(B0, sg * HW, 0);
          const ao = [A0.x + A0.nx * sg * (HW + da), 0, A0.z + A0.nz * sg * (HW + da)], bo = [B0.x + B0.nx * sg * (HW + db), 0, B0.z + B0.nz * sg * (HW + db)];
          ao[1] = hAt(ao[0], ao[2]) - 0.15; bo[1] = hAt(bo[0], bo[2]) - 0.15;
          quad(a, bq, bo, ao, 4);
        }
      }
      for (let q = 0; q < 3; q++) { const t = q / 3, x = lerp(A0.x, B0.x, t), z = lerp(A0.z, B0.z, t), y = lerp(A0.y, B0.y, t); for (let o = -HW; o <= HW; o += 1.2) surfStamp(x + A0.nx * o, z + A0.nz * o, y); }
      if (k % 2 === 0) tmMark(A0.x, A0.z, 8, 6);
    }
    propsRoad(rows, a, b, rndR, ri);
    ROADS.push({ a, b, pts: rows.map(r => [r.x, r.y, r.z]) });
    ri++;
  }
  return ROADS.length;
}

// ---------- collisions avec le bâti
const COLL = { grid: new Map(), circles: [] };
export function buildColliders() {
  const add = (k, b) => { let a = COLL.grid.get(k); if (!a) COLL.grid.set(k, a = []); a.push(b); };
  for (const b of BUILDINGS) {
    const r = Math.hypot(b.w, b.d) / 2 + 2, c = Math.cos(b.theta), s = Math.sin(b.theta);
    const o = { x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, c, s };
    for (let j = Math.floor((b.z - r) / 24); j <= Math.floor((b.z + r) / 24); j++) for (let i = Math.floor((b.x - r) / 24); i <= Math.floor((b.x + r) / 24); i++) add(i + ':' + j, o);
  }
  const RAD = { palais: 42, chateau: 30, brasserie: 22, eglise: 14, fumoir: 12, moulin: 7, phare: 5, statue: 6, chope: 6, antenne: 5 };
  for (const l of LANDMARK_SPOTS) COLL.circles.push({ x: l.x, z: l.z, r: RAD[l.kind] || 8 });
  for (const f of FOUNTAINS) COLL.circles.push({ x: f.x, z: f.z, r: 4.8 });
  for (const c of PROP_COLL) COLL.circles.push(c);
}
export function collide(p, rad) { // pousse p hors des bâtiments ; renvoie true s'il y a eu contact
  let hit = false;
  const a = COLL.grid.get(Math.floor(p.x / 24) + ':' + Math.floor(p.z / 24));
  if (a) for (const b of a) {
    const dx = p.x - b.x, dz = p.z - b.z, lx = b.c * dx - b.s * dz, lz = b.s * dx + b.c * dz;
    const px = b.hw + rad - Math.abs(lx), pz = b.hd + rad - Math.abs(lz);
    if (px <= 0 || pz <= 0) continue;
    hit = true;
    let nlx = lx, nlz = lz;
    if (px < pz) nlx = Math.sign(lx || 1) * (b.hw + rad); else nlz = Math.sign(lz || 1) * (b.hd + rad);
    p.x = b.x + b.c * nlx + b.s * nlz; p.z = b.z - b.s * nlx + b.c * nlz;
  }
  for (const c of COLL.circles) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz); if (d < c.r + rad && d > 0.01) { hit = true; p.x = c.x + dx / d * (c.r + rad); p.z = c.z + dz / d * (c.r + rad); } }
  return hit;
}
export function inWater(x, z) { const w = waterAt(x, z); return w > -1e8 && groundAt(x, z) < w - 0.55; }
