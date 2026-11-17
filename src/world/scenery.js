// Décor, bases : matériaux, enseignes, réservations de terrain, nappes de sol des villes
import * as THREE from 'three';
import { tmMark, tmGet, waterAt, hAt } from './land.js';
import { TEX, NOISE } from '../engine/textures.js';
import { worldShading } from '../engine/lighting.js';
import { Geo } from '../engine/geo.js';

export class Kit { // une Geo par matériau
  constructor() { this.g = {}; }
  on(mat) { return this.g[mat] || (this.g[mat] = new Geo()); }
  meshes(cast = true) { return Object.entries(this.g).filter(([k, g]) => !g.empty).map(([k, g]) => { const m = new THREE.Mesh(g.geometry(), SMAT[k]); m.castShadow = cast && !SMAT[k].userData.noShadow; m.receiveShadow = true; return m; }); }
  group(cast = true) { const grp = new THREE.Group(); for (const m of this.meshes(cast)) grp.add(m); return grp; }
}
export let SMAT = null;
export function sceneryMaterials() {
  const std = (o, key) => worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, ...o }), { key });
  SMAT = {
    plaster: std({ map: TEX.plaster, roughness: 0.9 }, 'plaster'),
    stone: std({ map: TEX.stone, roughness: 0.88 }, 'stone2'),
    wood: std({ map: TEX.wood, roughness: 0.8 }, 'wood'),
    roof: std({ roughness: 0.7 }, 'roof'),
    paint: std({ roughness: 0.42, metalness: 0.1 }, 'paint'),
    metal: std({ roughness: 0.38, metalness: 0.85 }, 'metal'),
    dark: std({ roughness: 0.6, metalness: 0.3 }, 'dark'),
    glass: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.6, clearcoat: 1 }),
    gold: std({ roughness: 0.22, metalness: 1.0, envMapIntensity: 1.4 }, 'gold'),
    copper: std({ roughness: 0.32, metalness: 1.0, envMapIntensity: 1.2 }, 'copper'),
    glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: true }),
    hall: new THREE.MeshPhysicalMaterial({ color: 0xbfe0ff, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.32, side: THREE.DoubleSide, envMapIntensity: 1.5, depthWrite: false }),
    leaf: null,
  };
  SMAT.glow.userData.noShadow = true; SMAT.hall.userData.noShadow = true;
  // couleurs des lampes amplifiées pour le bloom
  SMAT.glow.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= 5.0;'); };
}

// ---------- textures de texte
function textTexture(text, opt = {}) {
  const w = opt.cw || 512, h = opt.ch || 112;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = opt.bg || '#7b1e2e'; g.fillRect(0, 0, w, h);
  if (opt.border !== false) { g.strokeStyle = opt.fg || '#f3e7c9'; g.lineWidth = h * 0.06; g.strokeRect(h * 0.08, h * 0.08, w - h * 0.16, h - h * 0.16); }
  g.fillStyle = opt.fg || '#f3e7c9'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let fs = opt.size || h * 0.52;
  const font = opt.font || 'Bungee, "Arial Black", Impact, sans-serif';
  g.font = `${fs}px ${font}`;
  while (g.measureText(text).width > w * 0.86 && fs > 10) { fs -= 2; g.font = `${fs}px ${font}`; }
  g.fillText(text, w / 2, h / 2 + fs * 0.06);
  if (opt.sub) { g.font = `${h * 0.16}px "Barlow Condensed", sans-serif`; g.fillText(opt.sub, w / 2, h * 0.86); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function signMesh(text, w, h, opt = {}) {
  const ch = opt.ch || 112, cw = opt.cw || Math.min(1024, Math.round(ch * w / h / 8) * 8);
  const tex = textTexture(text, { ...opt, cw, ch });
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: opt.glow ?? 0.25, roughness: 0.5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

export const WALLS = [[255, 222, 140], [250, 160, 130], [160, 205, 238], [255, 240, 200], [186, 226, 170], [246, 178, 205], [255, 252, 236], [244, 190, 96], [205, 180, 235], [150, 215, 205]];
export const ROOFS = [[222, 72, 48], [58, 92, 160], [196, 58, 52], [236, 124, 48], [64, 138, 116], [150, 60, 110]];
export const CHALET = [[156, 102, 60], [134, 86, 52], [172, 118, 72]];
export const TOWERS = [[150, 184, 214], [214, 204, 190], [118, 156, 196], [123, 30, 46], [236, 230, 214], [180, 190, 196]];
export const BUILDINGS = []; // {x,y,z,w,d,h,rot,wall,roof,roofH,style,shut,seed}
export const STREETS = [];   // {pts:[[x,z]...], w}
export const LANDMARK_SPOTS = [];
export const scenery = new THREE.Group();

export function reserve(x, z, r) { tmMark(x, z, r, 3); }
export function freeSpot(st, rnd, rMin, rMax, rad, maxSlope = 6) {
  for (let tries = 0; tries < 200; tries++) {
    const a = rnd() * Math.PI * 2, d = rMin + rnd() * (rMax - rMin);
    const x = st.x + Math.cos(a) * d, z = st.z + Math.sin(a) * d;
    let ok = true, lo = 1e9, hi = -1e9;
    for (const [ox, oz] of [[0, 0], [rad, 0], [-rad, 0], [0, rad], [0, -rad], [rad * .7, rad * .7], [-rad * .7, -rad * .7], [rad * .7, -rad * .7], [-rad * .7, rad * .7]]) {
      const px = x + ox, pz = z + oz;
      if (tmGet(px, pz) || waterAt(px, pz) > -1e8) { ok = false; break; }
      const h = hAt(px, pz); lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    if (!ok || hi - lo > maxSlope || lo < 1.2) continue;
    return { x, z, y: lo, a };
  }
  return null;
}
export function siteOk(x, z, w, d, rot, maxDrop) {
  const c = Math.cos(rot), s = Math.sin(rot);
  let lo = 1e9, hi = -1e9;
  for (const [u, v] of [[0, 0], [w / 2 + 1.5, d / 2 + 1.5], [-w / 2 - 1.5, d / 2 + 1.5], [w / 2 + 1.5, -d / 2 - 1.5], [-w / 2 - 1.5, -d / 2 - 1.5], [w / 2 + 1.5, 0], [-w / 2 - 1.5, 0]]) {
    const px = x + u * c - v * s, pz = z + u * s + v * c;
    if (tmGet(px, pz) || waterAt(px, pz) > -1e8) return null;
    const hh = hAt(px, pz); lo = Math.min(lo, hh); hi = Math.max(hi, hh);
  }
  if (hi - lo > maxDrop || lo < 1.0) return null;
  return { lo, hi };
}

export const FARMS = [];
// ======================= VILLES : rues, trottoirs, îlots, façades détaillées =======================
export const TOWN_TREES = [];      // {sp, x, z, s, col}
export const LAMPS = [];           // {x, z, y, rot}
export const HEDGES = [];          // {x, z, y, len, h, dep, rot}
export const GWALLS = [];          // murets {x, z, y, len, h, dep, rot}
export const FOUNTAINS = [];
// --- sol drapé sur le relief (types : 0 enrobé, 1 trottoir, 2 pavés de place, 3 pelouse, 4 gravier, 5 marquage, 6 bordure, 7 dalles de cour, 8 allée)
export class Drape {
  constructor() { this.p = []; this.n = []; this.k = []; this.l = []; }
  v(x, y, z, nx, ny, nz, k, la, lb) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.k.push(k); this.l.push(la, lb); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('aKind', new THREE.Float32BufferAttribute(this.k, 1));
    g.setAttribute('aLoc', new THREE.Float32BufferAttribute(this.l, 2));
    g.computeBoundingSphere();
    return g;
  }
}
export let DRAPE = new Drape();
export function newDrape(x, z) { DRAPE = new Drape(); DRAPES.push({ d: DRAPE, x, z }); }
export const DRAPES = [];
export function terrainN(x, z) { const d = 2; const nx = hAt(x - d, z) - hAt(x + d, z), nz = hAt(x, z - d) - hAt(x, z + d); const l = Math.hypot(nx, 2 * d, nz); return [nx / l, 2 * d / l, nz / l]; }
// rectangle en coordonnées de ville (a le long de U, b le long de V)
export function drapeRect(T, a0, a1, b0, b1, kind, off, cell = 6) {
  if (a1 - a0 < 0.05 || b1 - b0 < 0.05) return;
  const na = Math.max(1, Math.ceil((a1 - a0) / cell)), nb = Math.max(1, Math.ceil((b1 - b0) / cell));
  const P = [];
  for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) {
    const a = a0 + (a1 - a0) * i / na, b = b0 + (b1 - b0) * j / nb;
    const x = T.C[0] + T.U[0] * a + T.V[0] * b, z = T.C[1] + T.U[1] * a + T.V[1] * b;
    P.push([x, hAt(x, z) + off, z, terrainN(x, z), a, b]);
  }
  const put = (q) => DRAPE.v(q[0], q[1], q[2], q[3][0], q[3][1], q[3][2], kind, q[4], q[5]);
  for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) {
    const p00 = P[j * (na + 1) + i], p10 = P[j * (na + 1) + i + 1], p01 = P[(j + 1) * (na + 1) + i], p11 = P[(j + 1) * (na + 1) + i + 1];
    // orientation : la normale doit pointer vers le haut quel que soit le sens de U×V
    if (T.flip) { put(p00); put(p11); put(p10); put(p00); put(p01); put(p11); }
    else { put(p00); put(p10); put(p11); put(p00); put(p11); put(p01); }
  }
}
// face verticale (bordure de trottoir) le long d'un segment en coordonnées de ville
export function drapeWall(T, a0, b0, a1, b1, y0, y1, kind, nrm) {
  const n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 6));
  const W = (a, b) => [T.C[0] + T.U[0] * a + T.V[0] * b, T.C[1] + T.U[1] * a + T.V[1] * b];
  const nx = T.U[0] * nrm[0] + T.V[0] * nrm[1], nz = T.U[1] * nrm[0] + T.V[1] * nrm[1];
  for (let s = 0; s < n; s++) {
    const ta = s / n, tb = (s + 1) / n;
    const A = W(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * ta), B = W(a0 + (a1 - a0) * tb, b0 + (b1 - b0) * tb);
    const ha = hAt(A[0], A[1]), hb = hAt(B[0], B[1]);
    const q = [[A[0], ha + y0, A[1]], [B[0], hb + y0, B[1]], [B[0], hb + y1, B[1]], [A[0], ha + y1, A[1]]];
    const la = a0 + (a1 - a0) * ta, lb = b0 + (b1 - b0) * ta;
    for (const k of [0, 1, 2, 0, 2, 3]) DRAPE.v(q[k][0], q[k][1], q[k][2], nx, 0, nz, kind, la + k * 0.3, lb + q[k][1] * 0.3);
  }
}
export function groundMaterial() {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.9, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -6, side: THREE.DoubleSide });
  worldShading(m, {
    key: 'urbground', after: sh => {
      Object.assign(sh.uniforms, { tAsph: { value: TEX.asphalt }, tGr: { value: TEX.grass }, tGv: { value: TEX.gravel }, tSt: { value: TEX.stone }, tNzU: { value: NOISE } });
      sh.vertexShader = 'attribute float aKind; attribute vec2 aLoc; varying float vKind; varying vec2 vLoc2;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vKind = aKind; vLoc2 = aLoc;');
      sh.fragmentShader = 'uniform sampler2D tAsph, tGr, tGv, tSt, tNzU; varying float vKind; varying vec2 vLoc2; float gRough = 0.9;\nfloat hU(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `{
          int k = int(vKind + 0.5);
          vec3 c = vec3(0.5);
          float mac = texture2D(tNzU, vWP.xz * 0.004).r;
          if (k == 0) { c = texture2D(tAsph, vWP.xz * 0.12).rgb * vec3(1.75, 1.75, 1.8) * (0.85 + mac * 0.3);
            c *= 0.93 + 0.07 * texture2D(tNzU, vWP.xz * 0.05).g; gRough = 0.8; }
          else if (k == 1) { vec2 q = vLoc2 / vec2(0.5, 0.25); q.x += floor(q.y) * 0.5; vec2 f = fract(q); vec2 id = floor(q);
            float j = smoothstep(0.0, 0.07, f.x) * smoothstep(1.0, 0.93, f.x) * smoothstep(0.0, 0.12, f.y) * smoothstep(1.0, 0.88, f.y);
            c = vec3(0.6, 0.57, 0.53) * (0.86 + 0.16 * hU(id)) * mix(0.62, 1.0, j) * (0.9 + mac * 0.2); gRough = 0.86; }
          else if (k == 2) { vec2 q = vLoc2 / vec2(0.24, 0.2); q.x += floor(q.y) * 0.37; vec2 f = fract(q) - 0.5; vec2 id = floor(q);
            float r = length(f * vec2(1.0, 1.1)); float j = smoothstep(0.52, 0.36, r);
            c = mix(vec3(0.42, 0.39, 0.36), vec3(0.55, 0.5, 0.45), hU(id)) * mix(0.45, 1.0, j);
            float band = step(fract(vLoc2.x / 9.0), 0.06) + step(fract(vLoc2.y / 9.0), 0.06);
            c = mix(c, vec3(0.66, 0.62, 0.56) * (0.9 + 0.1 * hU(floor(vLoc2 * 2.0))), clamp(band, 0.0, 1.0)); gRough = 0.75; }
          else if (k == 3) { vec3 g1 = texture2D(tGr, vWP.xz * 0.11).rgb, g2 = texture2D(tGr, vWP.xz * 0.023 + 0.37).rgb;
            c = mix(g1, g2, 0.45) * vec3(0.98, 1.08, 0.86) * (0.84 + mac * 0.3);
            c *= 0.94 + 0.06 * sign(sin(vLoc2.x * 0.55)); gRough = 0.95; }
          else if (k == 4 || k == 8) { c = texture2D(tGv, vWP.xz * 0.35).rgb * (k == 8 ? vec3(1.08, 1.02, 0.92) : vec3(0.92)); gRough = 0.95; }
          else if (k == 5) { c = vec3(0.82, 0.82, 0.78) * (0.85 + 0.15 * texture2D(tNzU, vWP.xz * 0.3).g); gRough = 0.7; }
          else if (k == 6) { c = vec3(0.7, 0.68, 0.64) * (0.9 + 0.1 * texture2D(tNzU, vWP.xz * 0.5).g); gRough = 0.8; }
          else if (k == 7) { vec2 q = vLoc2 / vec2(0.9, 0.6); q.x += floor(q.y) * 0.5; vec2 f = fract(q); vec2 id = floor(q);
            float j = smoothstep(0.0, 0.03, f.x) * smoothstep(1.0, 0.97, f.x) * smoothstep(0.0, 0.05, f.y) * smoothstep(1.0, 0.95, f.y);
            c = vec3(0.66, 0.62, 0.56) * (0.88 + 0.14 * hU(id)) * mix(0.7, 1.0, j) * (0.9 + mac * 0.2); gRough = 0.82; }
          diffuseColor.rgb = c; }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = gRough;');
    },
  });
  return m;
}
// points de façade → monde
export function facadePoint(b, face, u, y, out) {
  // face 0 avant (-z local), 1 arrière (+z), 2 gauche (-x), 3 droite (+x) ; u le long de la façade (de gauche à droite vu de l'extérieur)
  let lx, lz, yaw;
  if (face === 0) { lx = -u; lz = -b.d / 2; yaw = b.theta + Math.PI; }
  else if (face === 1) { lx = u; lz = b.d / 2; yaw = b.theta; }
  else if (face === 2) { lx = -b.w / 2; lz = u; yaw = b.theta - Math.PI / 2; }
  else { lx = b.w / 2; lz = -u; yaw = b.theta + Math.PI / 2; }
  const c = Math.cos(b.theta), s = Math.sin(b.theta);
  out[0] = b.x + c * lx + s * lz; out[1] = b.base + y; out[2] = b.z - s * lx + c * lz; out[3] = yaw;
  return out;
}
