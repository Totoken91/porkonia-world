// ============================================================================
//  Partie B : réseau SCPB — voies, aiguillages, viaducs, tunnels, poteaux
// ============================================================================
const FIX = 240;
const STOP_MARK = 130;
const PLATFORM_HALF = 150;

class Track {
  constructor(id, a, b, sa, sb, pts) {
    this.id = id; this.a = a; this.b = b; this.sa = sa; this.sb = sb;
    const dense = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
      for (let q = 0; q < 4; q++) {
        const t = q / 4, t2 = t * t, t3 = t2 * t;
        const f = i => 0.5 * ((2 * p1[i]) + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
        dense.push([f(0), f(1), f(2)]);
      }
    }
    dense.push(pts[pts.length - 1]);
    const cum = [0];
    for (let k = 1; k < dense.length; k++) cum.push(cum[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][2] - dense[k - 1][2]));
    const L = cum[cum.length - 1];
    const n = Math.max(2, Math.round(L / 5) + 1);
    this.L = L; this.n = n; this.step = L / (n - 1);
    this.X = new Float32Array(n); this.Y = new Float32Array(n); this.Z = new Float32Array(n);
    let j = 0;
    for (let k = 0; k < n; k++) {
      const s = k * this.step;
      while (j < cum.length - 2 && cum[j + 1] < s) j++;
      const t = clamp((s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), 0, 1);
      this.X[k] = lerp(dense[j][0], dense[j + 1][0], t); this.Y[k] = lerp(dense[j][1], dense[j + 1][1], t); this.Z[k] = lerp(dense[j][2], dense[j + 1][2], t);
    }
    this.VLIM = new Float32Array(n);
    const raw = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const k0 = Math.max(0, k - 5), k1 = Math.min(n - 1, k + 5);
      if (k1 - k0 < 2) { raw[k] = 90; continue; }
      const km = (k0 + k1) >> 1;
      const a1 = Math.atan2(this.Z[km] - this.Z[k0], this.X[km] - this.X[k0]);
      const a2 = Math.atan2(this.Z[k1] - this.Z[km], this.X[k1] - this.X[km]);
      let da = Math.abs(a2 - a1); if (da > Math.PI) da = 2 * Math.PI - da;
      const R = (this.step * (k1 - k0) / 2) / Math.max(da, 1e-5);
      raw[k] = Math.min(Math.sqrt(3.0 * R), 330 / 3.6);
    }
    for (let k = 0; k < n; k++) { let m = 1e9; for (let q = Math.max(0, k - 8); q <= Math.min(n - 1, k + 8); q++) m = Math.min(m, raw[q]); this.VLIM[k] = m; }
  }
  pos(s, out) { const f = clamp(s / this.step, 0, this.n - 1.0001), k = f | 0, t = f - k; out.set(lerp(this.X[k], this.X[k + 1], t), lerp(this.Y[k], this.Y[k + 1], t), lerp(this.Z[k], this.Z[k + 1], t)); return out; }
  tan(s, out) { const f = clamp(s / this.step, 0, this.n - 1.0001), k = f | 0; out.set(this.X[k + 1] - this.X[k], this.Y[k + 1] - this.Y[k], this.Z[k + 1] - this.Z[k]).normalize(); return out; }
  vlim(s) { return this.VLIM[clamp(Math.round(s / this.step), 0, this.n - 1)]; }
  grade(s) { const f = clamp(s / this.step, 0, this.n - 1.0001), k = f | 0; return (this.Y[k + 1] - this.Y[k]) / this.step; }
}
function straightPts(x0, z0, x1, z1, y) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.ceil(L / 20) + 1), pts = [];
  for (let k = 0; k < n; k++) { const t = k / (n - 1); pts.push([lerp(x0, x1, t), y, lerp(z0, z1, t)]); }
  return pts;
}
const TRACKS = [];
for (const e of PW.edges) {
  const xs = b64(e.x, Int32Array), zs = b64(e.z, Int32Array), ys = b64(e.y, Int32Array);
  const pts = []; for (let k = 0; k < xs.length; k++) pts.push([xs[k] / 4, ys[k] / 20, zs[k] / 4]);
  TRACKS.push(new Track(TRACKS.length, e.a, e.b, e.sa, e.sb, pts));
}
const DEPART = STATIONS.map(() => ({ '1': [], '-1': [] }));
for (const t of TRACKS) { DEPART[t.a][t.sa].push({ t, d: 1 }); DEPART[t.b][t.sb].push({ t, d: -1 }); }
const STUBS = [];
for (const st of STATIONS) for (const side of [1, -1]) {
  if (DEPART[st.id][side].length) continue;
  const dx = st.dir.x * side, dz = st.dir.y * side;
  const t = new Track(TRACKS.length + STUBS.length + 1000, st.id, -1, side, 0, straightPts(st.x, st.z, st.x + dx * 330, st.z + dz * 330, st.y));
  t.stub = true; STUBS.push(t);
  DEPART[st.id][side].push({ t, d: 1 });
}
for (const st of STATIONS) for (const side of [1, -1]) {
  const ax = st.dir.x * side, az = st.dir.y * side;
  for (const o of DEPART[st.id][side]) {
    const far = o.t.stub ? null : STATIONS[o.d > 0 ? o.t.b : o.t.a];
    o.to = far ? far.id : -1;
    if (!far) { o.ang = 0; continue; }
    const vx = far.x - st.x, vz = far.z - st.z, l = Math.hypot(vx, vz);
    o.ang = Math.acos(clamp((vx * ax + vz * az) / l, -1, 1));
  }
  DEPART[st.id][side].sort((p, q) => p.ang - q.ang);
}

// ---------- géométrie
class Strip { // triangles avec normales de face, UV et couleurs
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  tri(a, b, c, col, ua = [0, 0], ub = [0, 0], uc = [0, 0]) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const q of [a, b, c]) { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); this.c.push(col[0], col[1], col[2]); }
    this.uv.push(...ua, ...ub, ...uc);
  }
  quad(a, b, c, d, col, uvs) { const u = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]]; this.tri(a, b, c, col, u[0], u[1], u[2]); this.tri(a, c, d, col, u[0], u[2], u[3]); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere();
    return g;
  }
  mesh(mat, cast = false) { if (!this.p.length) return null; const m = new THREE.Mesh(this.geometry(), mat); m.receiveShadow = true; m.castShadow = cast; return m; }
}
const lin = (r, g, b) => { const c = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); return [c.r, c.g, c.b]; };
let MAT = null;
function trackMaterials() {
  const ballastMap = TEX.ballast; ballastMap.repeat.set(1, 1);
  MAT = {
    ballast: worldShading(new THREE.MeshStandardMaterial({ map: TEX.ballast, normalMap: TEX.ballastN, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.96, vertexColors: true, envMapIntensity: 0.5 }), { key: 'ballast' }),
    skirt: worldShading(new THREE.MeshStandardMaterial({ map: TEX.gravel, roughness: 0.95, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 0.5 }), { key: 'skirt2', after: (sh) => {
      sh.uniforms.tGrassS = { value: TEX.grass }; sh.uniforms.tRockS = { value: TEX.rock };
      sh.fragmentShader = 'uniform sampler2D tGrassS, tRockS;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        vec4 sgv = texture2D(map, vMapUv) * vec4(0.66, 0.55, 0.42, 1.0);
        vec4 ggv = texture2D(tGrassS, vWP.xz * 0.045 + vMapUv.x * 0.3) * vec4(0.82, 0.9, 0.7, 1.0);
        vec4 rkv = texture2D(tRockS, vec2(vMapUv.y * 0.5, vWP.y * 0.25)) * vec4(0.82, 0.8, 0.76, 1.0);
        float mv = texture2D(tGrassS, vWP.xz * 0.011).g;
        float gm = smoothstep(0.14, 0.42, vMapUv.x);
        float rm = max(smoothstep(0.85, 1.4, vMapUv.x + (mv - 0.5) * 0.4), smoothstep(2.8, 0.9, vWP.y));
        diffuseColor *= mix(mix(sgv, ggv, gm), rkv, rm) * (0.82 + mv * 0.36);`);
    } }),
    rail: worldShading(new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.92, roughness: 0.26, vertexColors: true, envMapIntensity: 1.2 }), { key: 'rail' }),
    stone: worldShading(new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: 0.9, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 0.5 }), { key: 'stone' }),
    tunnel: new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: 0.92, vertexColors: true, side: THREE.DoubleSide, envMapIntensity: 0.08, fog: false }),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.38).multiplyScalar(6) }),
    sleeper: worldShading(new THREE.MeshStandardMaterial({ color: 0x8c8780, roughness: 0.9, map: TEX.plaster }), { key: 'sleeper' }),
    pole: worldShading(new THREE.MeshStandardMaterial({ map: TEX.wood, roughness: 0.85, color: 0x9a7a5a }), { key: 'pole' }),
    wire: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.4 }),
  };
}
const COL = { talus: lin(250, 250, 250), herbe: lin(250, 250, 250), pierre: lin(255, 246, 232), deck: lin(210, 204, 196), railTop: lin(230, 230, 236), railSide: lin(120, 92, 74), tunnel: lin(150, 140, 130) };
const PILLARS = [], PORTALS = [], GOBLIN_SPOTS = [], POLES = [], TUNNEL_LAMPS = [];

const PROF = {
  viaduc: [[-1.9, 0], [-2.5, 0], [-2.5, 1.0], [-2.85, 1.0], [-2.85, -1.9], [2.85, -1.9], [2.85, 1.0], [2.5, 1.0], [2.5, 0], [1.9, 0]],
  tunnel: (() => { const a = [[3.45, -0.6]]; for (let k = 0; k <= 14; k++) { const th = k / 14 * Math.PI; a.push([3.4 * Math.cos(th), -0.3 + 6.6 * Math.sin(th)]); } a.push([-3.45, -0.6]); return a; })(),
};
function sampleFrames(track, s0, s1, step) {
  const out = [], p = new THREE.Vector3(), t = new THREE.Vector3();
  const n = Math.max(1, Math.round((s1 - s0) / step));
  for (let k = 0; k <= n; k++) {
    const s = s0 + (s1 - s0) * k / n;
    track.pos(s, p); track.tan(s, t);
    const hl = Math.hypot(t.x, t.z) || 1, fx = t.x / hl, fz = t.z / hl, rx = -fz, rz = fx;
    const ground = Math.min(hAt(p.x, p.z), hAt(p.x + rx * 2.5, p.z + rz * 2.5), hAt(p.x - rx * 2.5, p.z - rz * 2.5));
    const wl = waterAt(p.x, p.z), top = hAt(p.x, p.z);
    let mode = 'remblai';
    if (top > p.y + 8.5) mode = 'tunnel';
    else if ((wl > -1e8 && wl > ground - 0.6) || p.y - ground > 11) mode = 'viaduc';
    out.push({ s, x: p.x, y: p.y, z: p.z, rx, rz, fx, fz, ground: Math.max(ground, wl > -1e8 ? Math.min(ground, wl) : ground), wet: wl > -1e8, wl, mode });
  }
  for (let pass = 0; pass < 2; pass++) {
    let k = 0;
    while (k < out.length) {
      let e = k; while (e + 1 < out.length && out[e + 1].mode === out[k].mode) e++;
      if (e - k < 2 && out.length > 6) { const m = k > 0 ? out[k - 1].mode : (e + 1 < out.length ? out[e + 1].mode : out[k].mode); for (let q = k; q <= e; q++) out[q].mode = m; }
      k = e + 1;
    }
  }
  return out;
}
function buildTrackGeometry(track, s0, s1, B, opts = {}) {
  const F = sampleFrames(track, s0, s1, 8);
  const P = (f, ox, oy) => [f.x + f.rx * ox, f.y + oy, f.z + f.rz * ox];
  for (let k = 0; k < F.length - 1; k++) {
    const A = F[k], Bf = F[k + 1];
    const va = A.s / 2.4, vb = Bf.s / 2.4;
    B.ballast.quad(P(A, -1.9, 0), P(A, 1.9, 0), P(Bf, 1.9, 0), P(Bf, -1.9, 0), [1, 1, 1], [[0, va], [1, va], [1, vb], [0, vb]]);
    for (const off of [-0.72, 0.72]) {
      B.rail.quad(P(A, off - 0.035, 0.172), P(A, off + 0.035, 0.172), P(Bf, off + 0.035, 0.172), P(Bf, off - 0.035, 0.172), COL.railTop);
      B.rail.quad(P(A, off - 0.035, 0.03), P(A, off - 0.035, 0.172), P(Bf, off - 0.035, 0.172), P(Bf, off - 0.035, 0.03), COL.railSide);
      B.rail.quad(P(A, off + 0.035, 0.172), P(A, off + 0.035, 0.03), P(Bf, off + 0.035, 0.03), P(Bf, off + 0.035, 0.172), COL.railSide);
      B.rail.quad(P(A, off - 0.075, 0.03), P(A, off + 0.075, 0.03), P(Bf, off + 0.075, 0.03), P(Bf, off - 0.075, 0.03), COL.railSide);
    }
    const mode = A.mode === Bf.mode ? A.mode : (A.mode === 'remblai' ? Bf.mode : A.mode);
    if (mode === 'viaduc') {
      const pr = PROF.viaduc;
      for (let j = 0; j < pr.length - 1; j++) {
        const len = Math.hypot(pr[j + 1][0] - pr[j][0], pr[j + 1][1] - pr[j][1]);
        const u0 = 0, u1 = len / 3;
        B.stone.quad(P(A, pr[j][0], pr[j][1]), P(A, pr[j + 1][0], pr[j + 1][1]), P(Bf, pr[j + 1][0], pr[j + 1][1]), P(Bf, pr[j][0], pr[j][1]), j === 1 || j === 7 ? COL.deck : COL.pierre, [[u0, A.s / 3], [u1, A.s / 3], [u1, Bf.s / 3], [u0, Bf.s / 3]]);
      }
    } else if (mode === 'tunnel') {
      const pr = PROF.tunnel;
      for (let j = 0; j < pr.length - 1; j++) B.tunnel.quad(P(A, pr[j][0], pr[j][1]), P(A, pr[j + 1][0], pr[j + 1][1]), P(Bf, pr[j + 1][0], pr[j + 1][1]), P(Bf, pr[j][0], pr[j][1]), COL.tunnel, [[j * 0.4, A.s / 3], [(j + 1) * 0.4, A.s / 3], [(j + 1) * 0.4, Bf.s / 3], [j * 0.4, Bf.s / 3]]);
      B.skirt.quad(P(A, -1.9, 0), P(A, -3.45, -0.6), P(Bf, -3.45, -0.6), P(Bf, -1.9, 0), COL.talus, [[0, A.s / 4], [0.4, A.s / 4], [0.4, Bf.s / 4], [0, Bf.s / 4]]);
      B.skirt.quad(P(A, 1.9, 0), P(Bf, 1.9, 0), P(Bf, 3.45, -0.6), P(A, 3.45, -0.6), COL.talus, [[0, A.s / 4], [0, Bf.s / 4], [0.4, Bf.s / 4], [0.4, A.s / 4]]);
      if ((A.s % 36) < 8) TUNNEL_LAMPS.push({ x: A.x, y: A.y + 5.6, z: A.z, ang: Math.atan2(A.fx, A.fz) });
    } else {
      const da = clamp(A.y - A.ground + 1.0, 0.8, 16), db = clamp(Bf.y - Bf.ground + 1.0, 0.8, 16);
      for (const sg of [-1, 1]) {
        const c = (da + db) * 0.5 > 4 ? COL.herbe : COL.talus;
        const pa = P(A, 1.9 * sg, 0), pb = P(A, (1.9 + da * 1.15) * sg, -da), pc = P(Bf, (1.9 + db * 1.15) * sg, -db), pd = P(Bf, 1.9 * sg, 0);
        if (sg > 0) B.skirt.quad(pa, pb, pc, pd, c, [[0, A.s / 4], [da / 4, A.s / 4], [db / 4, Bf.s / 4], [0, Bf.s / 4]]);
        else B.skirt.quad(pa, pd, pc, pb, c, [[0, A.s / 4], [0, Bf.s / 4], [db / 4, Bf.s / 4], [da / 4, A.s / 4]]);
      }
    }
  }
  if (opts.noExtras) return;
  let lastPillar = -1e9, lastPole = -1e9;
  for (let k = 0; k < F.length; k++) {
    const f = F[k];
    if (f.mode === 'viaduc' && f.s - lastPillar > 30) {
      const bottom = f.wet ? Math.min(f.ground, f.wl - 6) : f.ground;
      if (f.y - 1.9 - bottom > 1.5) { PILLARS.push({ x: f.x, z: f.z, y0: bottom - 2, y1: f.y - 1.9, ang: Math.atan2(f.fx, f.fz) }); lastPillar = f.s; }
    }
    if (f.mode === 'remblai' && f.s - lastPole > 52 && !f.wet) {
      const side = (track.id % 2) ? 1 : -1, off = 5.2 * side;
      const px = f.x + f.rx * off, pz = f.z + f.rz * off;
      if (tmGet(px, pz) !== 2) { POLES.push({ x: px, y: Math.max(hAt(px, pz), f.y - 1.5), z: pz, ang: Math.atan2(f.fx, f.fz) }); lastPole = f.s; }
    }
    if (k > 0 && (F[k - 1].mode === 'tunnel') !== (f.mode === 'tunnel')) {
      const inside = f.mode === 'tunnel' ? f : F[k - 1];
      const outward = f.mode === 'tunnel' ? -1 : 1;
      PORTALS.push({ x: inside.x, y: inside.y, z: inside.z, ang: Math.atan2(inside.fx * outward, inside.fz * outward) });
      if (GOBLIN_SPOTS.length < 4 && (hashStr(track.id + ':' + k) % 5 === 0)) GOBLIN_SPOTS.push({ x: inside.x + inside.rx * 7 - inside.fx * outward * 6, z: inside.z + inside.rz * 7 - inside.fz * outward * 6, ang: Math.atan2(inside.rx, inside.rz) });
    }
  }
}
function markTrackMask() {
  const p = new THREE.Vector3();
  for (const t of [...TRACKS, ...STUBS]) for (let s = 0; s <= t.L; s += 6) { t.pos(s, p); tmMark(p.x, p.z, 9, 1); }
  for (const st of STATIONS) {
    const wide = st.meta && st.meta.size >= 5 ? 50 : 34;
    for (let a = -FIX; a <= FIX; a += 8) for (let c = -wide; c <= wide; c += 8) tmMark(st.x + st.dir.x * a - st.dir.y * c, st.z + st.dir.y * a + st.dir.x * c, 8, 2);
  }
}
function newStrips() { return { ballast: new Strip(), skirt: new Strip(), rail: new Strip(), stone: new Strip(), tunnel: new Strip() }; }
function flushStrips(B, group) {
  const add = m => { if (m) group.add(m); };
  add(B.ballast.mesh(MAT.ballast)); add(B.skirt.mesh(MAT.skirt)); add(B.rail.mesh(MAT.rail)); add(B.stone.mesh(MAT.stone, true)); add(B.tunnel.mesh(MAT.tunnel));
}
function buildNetwork() {
  trackMaterials();
  const group = new THREE.Group();
  for (const t of [...TRACKS, ...STUBS]) {
    const B = newStrips();
    const s0 = FIX - 3, s1 = t.stub ? t.L : t.L - FIX + 3;
    if (s1 > s0) buildTrackGeometry(t, s0, s1, B);
    flushStrips(B, group);
  }
  for (const st of STATIONS) {
    const t = new Track(-1, st.id, -1, 1, 0, straightPts(st.x - st.dir.x * FIX, st.z - st.dir.y * FIX, st.x + st.dir.x * FIX, st.z + st.dir.y * FIX, st.y));
    const B = newStrips(); buildTrackGeometry(t, 0, t.L, B, { noExtras: true }); flushStrips(B, group);
  }
  const _m = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), _p2 = new THREE.Vector3(), _s2 = new THREE.Vector3();
  const inst = (geo, mat, list, fn, cast = true) => {
    if (!list.length) return;
    const by = new Map();
    for (const it of list) { fn(it, _p2, _e2, _s2); const k = Math.floor(_p2.x / 600) + ':' + Math.floor(_p2.z / 600); let a = by.get(k); if (!a) by.set(k, a = []); a.push(it); }
    for (const [k, a] of by) {
      const im = new THREE.InstancedMesh(geo, mat, a.length);
      a.forEach((it, i) => { fn(it, _p2, _e2, _s2); _q2.setFromEuler(_e2); _m.compose(_p2, _q2, _s2); im.setMatrixAt(i, _m); });
      im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true;
      group.add(im);
      const [ci, cj] = k.split(':').map(Number);
      PROPS.meshes.push({ mesh: im, cx: (ci + 0.5) * 600, cz: (cj + 0.5) * 600, R: 1500 });
    }
  };
  // piles de viaduc en pierre (fût + chapiteau)
  { const g = new THREE.BoxGeometry(4.4, 1, 2.6); g.translate(0, 0.5, 0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1.5, uv.getY(i) * 6);
    inst(g, MAT.stone, PILLARS, (p, pos, e, s) => { pos.set(p.x, p.y0, p.z); e.set(0, p.ang, 0); s.set(1, p.y1 - p.y0, 1); }); }
  // poteaux télégraphiques et fils
  {
    const g = new THREE.CylinderGeometry(0.11, 0.15, 8, 7); g.translate(0, 4, 0);
    const arm = new THREE.BoxGeometry(1.8, 0.14, 0.14); arm.translate(0, 7.4, 0);
    const merged = mergeGeos([g, arm]);
    inst(merged, MAT.pole, POLES, (p, pos, e, s) => { pos.set(p.x, p.y - 0.3, p.z); e.set(0, p.ang, 0); s.set(1, 1, 1); });
    const wires = [];
    for (let i = 0; i < POLES.length - 1; i++) {
      const a = POLES[i], b = POLES[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z);
      if (d > 80) continue;
      for (const o of [-0.75, 0.75]) {
        const ca = Math.cos(a.ang), sa = Math.sin(a.ang), cb = Math.cos(b.ang), sb = Math.sin(b.ang);
        const ax = a.x + ca * o, az = a.z - sa * o, bx = b.x + cb * o, bz = b.z - sb * o;
        wires.push({ ax, ay: a.y + 7.1, az, bx, by: b.y + 7.1, bz });
      }
    }
    const wg = new THREE.BoxGeometry(0.025, 0.025, 1); wg.translate(0, 0, 0.5);
    const look = new THREE.Object3D();
    inst(wg, MAT.wire, wires, (w, pos, e, s) => { look.position.set(w.ax, w.ay, w.az); look.lookAt(w.bx, w.by, w.bz); pos.copy(look.position); e.copy(look.rotation); s.set(1, 1, Math.hypot(w.bx - w.ax, w.by - w.ay, w.bz - w.az)); }, false);
  }
  // lampes de tunnel (émissives, pour le bloom)
  { const g = new THREE.BoxGeometry(0.5, 0.18, 1.4); inst(g, MAT.lamp, TUNNEL_LAMPS, (l, pos, e, s) => { pos.set(l.x, l.y, l.z); e.set(0, l.ang, 0); s.set(1, 1, 1); }, false); }
  // portails de tunnel en pierre
  if (PORTALS.length) {
    const sh = new THREE.Shape(); sh.moveTo(-6.5, -1.2); sh.lineTo(6.5, -1.2); sh.lineTo(6.5, 8.5); sh.lineTo(4.5, 10.2); sh.lineTo(-4.5, 10.2); sh.lineTo(-6.5, 8.5); sh.lineTo(-6.5, -1.2);
    const hole = new THREE.Path(); hole.moveTo(3.4, -1.2); for (let k = 0; k <= 18; k++) { const th = k / 18 * Math.PI; hole.lineTo(3.4 * Math.cos(th), -0.3 + 6.6 * Math.sin(th)); } hole.lineTo(-3.4, -1.2); hole.lineTo(3.4, -1.2);
    sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 2.4, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 1 });
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.2, uv.getY(i) * 0.2);
    for (const p of PORTALS) { const m = new THREE.Mesh(g, MAT.stone); m.position.set(p.x, p.y, p.z); m.rotation.y = p.ang; m.translateZ(-1.2); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  }
  return group;
}
function mergeGeos(list) {
  const geos = list.map(g => g.index ? g.toNonIndexed() : g);
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const arrs = geos.map(g => g.attributes[name]); if (arrs.some(a => !a)) continue;
    const total = arrs.reduce((s, a) => s + a.array.length, 0); const buf = new Float32Array(total); let o = 0;
    for (const a of arrs) { buf.set(a.array, o); o += a.array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(buf, arrs[0].itemSize));
  }
  out.computeBoundingSphere();
  return out;
}

// ---------- traverses 3D autour de la caméra (le long du trajet du train)
const SLEEPERS = { mesh: null, n: 1400, spacing: 0.62 };
function buildSleepers() {
  const g = new THREE.BoxGeometry(2.5, 0.2, 0.26); g.translate(0, 0.05, 0);
  const m = new THREE.InstancedMesh(g, MAT.sleeper, SLEEPERS.n);
  m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false;
  m.layers.set(1);
  SLEEPERS.mesh = m; scene.add(m);
}
