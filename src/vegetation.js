// Végétation : atlas, essences, forêts, bottes de foin
import * as THREE from 'three';
import { mulberry, worldShading, noiseAt, TEX, WW, HH, Q, idxAt, CLS, LAKE, hAt, tmGet, slopeAt, clsAt, hashStr, waterAt, freeAfterUpload, H, STATIONS, HTEX, NX, NZ, scene } from './core.js';
import { PROPS, lazyShow, lazyFar, lazyRankStart, lazyRank } from './registry.js';
import { TRACKS } from './tracks.js';
import { linCol, Geo, M, TOWN_TREES, Mset, scenery } from './scenery.js';

// ---------- végétation : espèces, LOD par tuiles, vent, translucidité
// ---------- arbres procéduraux : tronc et branches réels, feuillage en cartes détourées
// Atlas 1024 (coordonnées canvas) : A feuillus, B petites feuilles rondes, C rameau de sapin, D écorce, E buisson dense
const ATLAS = {
  A: [0, 0, 512, 512], B: [512, 0, 512, 512], C: [0, 512, 512, 512], D: [528, 528, 480, 224], E: [512, 768, 512, 256],
};
function atlasUV(key, u, v) { // u,v dans [0,1] du sous-rectangle → uv texture (flipY)
  const r = ATLAS[key];
  return [(r[0] + u * r[2]) / 1024, 1 - (r[1] + (1 - v) * r[3]) / 1024];
}
let TREE_TEX = null, TREE_MAT = null;
function makeTreeAtlas() {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'); const rnd = mulberry(4242);
  const leafPath = (L, W, round) => {
    g.beginPath(); g.moveTo(0, 0);
    g.bezierCurveTo(L * 0.25, -W * (round ? 1.1 : 0.9), L * (round ? 0.85 : 0.7), -W * (round ? 0.9 : 0.6), L, 0);
    g.bezierCurveTo(L * (round ? 0.85 : 0.7), W * (round ? 0.9 : 0.6), L * 0.25, W * (round ? 1.1 : 0.9), 0, 0);
  };
  const leaf = (x, y, ang, L, W, round, lum) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, L, 0);
    const h = 0.9 + rnd() * 0.1;
    const c0 = `rgb(${(lum * 170 * h) | 0},${(lum * 205) | 0},${(lum * 150) | 0})`, c1 = `rgb(${(lum * 235 * h) | 0},${(lum * 252) | 0},${(lum * 205) | 0})`;
    gr.addColorStop(0, c0); gr.addColorStop(1, c1);
    g.fillStyle = gr; leafPath(L, W, round); g.fill();
    // côté ombré d'un demi-limbe
    g.fillStyle = 'rgba(40,60,20,0.16)'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * 0.25, W * 0.9, L * 0.7, W * 0.6, L, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(70,90,40,0.55)'; g.lineWidth = Math.max(0.8, W * 0.12); g.beginPath(); g.moveTo(0, 0); g.lineTo(L * 0.92, 0); g.stroke();
    g.restore();
  };
  const twig = (x0, y0, x1, y1, w) => { g.strokeStyle = 'rgb(112,96,80)'; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + (rnd() - 0.5) * 30, (y0 + y1) / 2 + (rnd() - 0.5) * 30, x1, y1); g.stroke(); };
  // amas de feuilles le long de rameaux qui rayonnent depuis le centre
  const cluster = (rect, nTw, nLeaves, Lmin, Lmax, round, rad) => {
    const [rx, ry, rw, rh] = rect, cx = rx + rw / 2, cy = ry + rh / 2, R = Math.min(rw, rh) / 2 - 14;
    const tws = [];
    for (let k = 0; k < nTw; k++) {
      const a = k / nTw * 6.283 + rnd() * 0.6, L = R * (0.55 + rnd() * 0.35) * rad;
      const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * (rh / rw);
      twig(cx, cy, ex, ey, 4); tws.push([cx, cy, ex, ey, a]);
    }
    for (let i = 0; i < nLeaves; i++) {
      const tw = tws[(rnd() * tws.length) | 0], u = Math.pow(rnd(), 0.75);
      let x = tw[0] + (tw[2] - tw[0]) * u + (rnd() - 0.5) * 40, y = tw[1] + (tw[3] - tw[1]) * u + (rnd() - 0.5) * 40;
      const L = Lmin + rnd() * (Lmax - Lmin), W = L * (round ? 0.42 : 0.3);
      const ang = tw[4] + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.9);
      // ne pas déborder du rectangle
      const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L;
      if (ex < rx + 6 || ex > rx + rw - 6 || ey < ry + 6 || ey > ry + rh - 6) continue;
      const depth = Math.hypot(x - cx, y - cy) / R;
      leaf(x, y, ang, L, W, round, 0.62 + 0.38 * Math.min(1, depth + rnd() * 0.5));
    }
  };
  cluster(ATLAS.A, 9, 520, 30, 54, false, 1.0);
  cluster(ATLAS.B, 10, 760, 18, 30, true, 1.0);
  cluster(ATLAS.E, 11, 560, 16, 30, false, 1.0);
  // rameau de sapin : axe de gauche (base) à droite (pointe), aiguilles des deux côtés, rameaux secondaires
  {
    const [rx, ry, rw, rh] = ATLAS.C, cy = ry + rh * 0.42;
    const spine = (x0, y0, x1, y1, len) => {
      g.strokeStyle = 'rgb(96,78,60)'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      const n = Math.floor(len / 3.2);
      for (let i = 0; i < n; i++) {
        const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        const a = Math.atan2(y1 - y0, x1 - x0);
        for (const sd of [-1, 1]) {
          const nl = (14 + rnd() * 10) * (1 - t * 0.45), na = a + sd * (0.9 + rnd() * 0.35);
          const lum = 0.6 + rnd() * 0.4;
          g.strokeStyle = `rgb(${(lum * 180) | 0},${(lum * 222) | 0},${(lum * 175) | 0})`; g.lineWidth = 2.6;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(na) * nl, y + Math.sin(na) * nl + 3); g.stroke();
        }
      }
    };
    const x0 = rx + 10, x1 = rx + rw - 18;
    // contour en fer de lance : rameaux latéraux de plus en plus courts
    for (let k = 0; k < 11; k++) {
      const t = 0.06 + k * 0.085, x = x0 + (x1 - x0) * t, sideLen = (rh * 0.36) * (1 - t * 0.85);
      for (const sd of [-1, 1]) { const ex = x + sideLen * 0.75, ey = cy + sd * sideLen + sideLen * 0.18; spine(x, cy, ex, ey, sideLen); }
    }
    spine(x0, cy, x1, cy + 10, x1 - x0);
  }
  // écorce (opaque)
  {
    const [rx, ry, rw, rh] = ATLAS.D;
    g.fillStyle = 'rgb(150,132,114)'; g.fillRect(rx, ry, rw, rh);
    for (let i = 0; i < 900; i++) {
      const x = rx + rnd() * rw, y = ry + rnd() * rh, l = 8 + rnd() * 40, lum = rnd();
      g.strokeStyle = lum < 0.5 ? `rgba(70,58,48,${0.25 + rnd() * 0.4})` : `rgba(210,196,178,${0.15 + rnd() * 0.25})`;
      g.lineWidth = 1 + rnd() * 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 4, y + l); g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
export function treeMaterial() {
  if (TREE_MAT) return TREE_MAT;
  TREE_TEX = makeTreeAtlas();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: TREE_TEX, alphaTest: 0.5, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.8, envMapIntensity: 0.6 });
  worldShading(m, {
    key: 'tree3', after: sh => {
      sh.vertexShader = 'attribute float aLeaf; varying float vLeaf; uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vLeaf = aLeaf;
        { float hg = max(position.y, 0.0);
          vec2 ip = vec2(0.0);
          #ifdef USE_INSTANCING
          ip = instanceMatrix[3].xz;
          #endif
          float ph = dot(ip, vec2(0.031, 0.047));
          float sw = (sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 1.9 + ph * 1.7) * 0.3) * 0.006 * hg * hg / (6.0 + hg);
          transformed.x += sw; transformed.z += sw * 0.6;
          float fl = step(0.5, aLeaf);
          transformed += objectNormal * sin(uTime * 3.4 + ph * 3.0 + position.y * 1.9 + position.x * 1.3) * 0.05 * fl; }`);
      sh.fragmentShader = 'varying float vLeaf;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          if (vLeaf > 0.5) { vec2 tx = vMapUv * 1024.0; float lod = max(0.0, 0.5 * log2(max(dot(dFdx(tx), dFdx(tx)), dot(dFdy(tx), dFdy(tx)))));
            diffuseColor.a = clamp((diffuseColor.a - 0.5) * (1.0 + lod * 0.7) + 0.5 + lod * 0.035, 0.0, 1.0); }`)
        .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
        .replace('#include <color_fragment>', `#include <color_fragment>
          if (vLeaf > 1.5) { vec3 wn = inverseTransformDirection(normalize(vNormal), viewMatrix) * (gl_FrontFacing ? 1.0 : -1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 1.0) * (0.75 + 0.25 * diffuseColor.a), smoothstep(0.1, 0.6, wn.y) * 0.85); }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vLeaf > 0.5 ? 0.62 : 0.95;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (vLeaf > 0.5 && vLeaf < 1.5) { float tr = pow(max(dot(-normalize(vViewPosition), uSunView), 0.0), 4.0);
          totalEmissiveRadiance += diffuseColor.rgb * uSunColU * (tr * 1.4 + 0.05) * wShade; }`);
    },
  });
  m.customProgramCacheKey = () => 'tree3';
  TREE_MAT = m; return m;
}
// --- constructeurs de géométrie
class TreeGeo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.leaf = []; }
  v(p, n, c, uv, leaf) { this.p.push(p.x, p.y, p.z); this.n.push(n.x, n.y, n.z); this.c.push(c[0], c[1], c[2]); this.uv.push(uv[0], uv[1]); this.leaf.push(leaf); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(this.leaf, 1));
    g.computeBoundingSphere();
    return g;
  }
  get tris() { return this.p.length / 9; }
}
const _tv = () => new THREE.Vector3();
// tube conique le long d'une polyligne (écorce)
function tubeAlong(G, pts, radii, sides, col) {
  const lc = linCol(col);
  const rings = [];
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const t = _tv();
    if (i < pts.length - 1) t.subVectors(pts[i + 1], pts[i]); else t.subVectors(pts[i], pts[i - 1]);
    t.normalize();
    const a = Math.abs(t.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = _tv().crossVectors(t, a).normalize(), w = _tv().crossVectors(t, u);
    if (i > 0) len += pts[i].distanceTo(pts[i - 1]);
    const ring = [];
    for (let k = 0; k <= sides; k++) {
      const ang = k / sides * Math.PI * 2, n = _tv().copy(u).multiplyScalar(Math.cos(ang)).addScaledVector(w, Math.sin(ang));
      ring.push({ p: _tv().copy(pts[i]).addScaledVector(n, radii[i]), n, uv: atlasUV('D', k / sides * 0.98 + 0.01, Math.min(0.99, 0.02 + len * 0.07)) });
    }
    rings.push(ring);
  }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) {
    const a = rings[i][k], b = rings[i][k + 1], c = rings[i + 1][k + 1], d = rings[i + 1][k];
    const ao = (i === 0 ? 0.75 : 1);
    const cc = [lc[0] * ao, lc[1] * ao, lc[2] * ao];
    for (const q of [a, b, c, a, c, d]) G.v(q.p, q.n, cc, q.uv, 0);
  }
}
// carte de feuillage : centre p, normale n, demi-taille s, rotation, sous-atlas
const _cu = new THREE.Vector3(), _cw = new THREE.Vector3(), _cn = new THREE.Vector3();
function leafCard(G, p, n, s, rot, key, col, leaf, lightN, sx = 1) {
  const up = Math.abs(n.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  _cu.crossVectors(up, n).normalize(); _cw.crossVectors(n, _cu);
  const c = Math.cos(rot), si = Math.sin(rot);
  const a = _tv().copy(_cu).multiplyScalar(c).addScaledVector(_cw, si).multiplyScalar(s * sx), b = _tv().copy(_cu).multiplyScalar(-si).addScaledVector(_cw, c).multiplyScalar(s);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({ p: _tv().copy(p).addScaledVector(a, i).addScaledVector(b, j), uv: atlasUV(key, i * 0.5 + 0.5, j * 0.5 + 0.5) }));
  const nn = lightN || n;
  for (const k of [0, 1, 2, 0, 2, 3]) G.v(corners[k].p, nn, col, corners[k].uv, leaf);
}
// carte de rameau de sapin : de la base b vers la pointe t, largeur w, plan tourné de roll autour de l'axe
function branchCard(G, base, tip, w, roll, col, leaf, lightN) {
  const ax = _tv().subVectors(tip, base); const L = ax.length(); ax.normalize();
  const ref = Math.abs(ax.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const side = _tv().crossVectors(ax, ref).normalize(), nrm = _tv().crossVectors(side, ax).normalize();
  const sd = _tv().copy(side).multiplyScalar(Math.cos(roll)).addScaledVector(nrm, Math.sin(roll)).multiplyScalar(w / 2);
  const P = [_tv().copy(base).sub(sd), _tv().copy(tip).sub(sd), _tv().copy(tip).add(sd), _tv().copy(base).add(sd)];
  const UV = [atlasUV('C', 0, 0.08), atlasUV('C', 1, 0.08), atlasUV('C', 1, 0.92), atlasUV('C', 0, 0.92)];
  for (const k of [0, 1, 2, 0, 2, 3]) G.v(P[k], lightN, col, UV[k], leaf);
  void L;
}
// feuillu générique
function broadleaf(rnd, o, lv) {
  const detail = lv === 0, far = lv === 2;
  const G = new TreeGeo();
  const bark = o.bark, lcol = linCol(o.leafCol);
  const T = (x, y, z) => new THREE.Vector3(x, y, z);
  // tronc légèrement courbe
  const tp = [], tr = [];
  const lean = (rnd() - 0.5) * 0.25, la = rnd() * 6.28;
  const nT = detail ? 5 : 2;
  for (let i = 0; i <= nT; i++) { const t = i / nT, y = t * o.trunkH; tp.push(T(Math.cos(la) * lean * y * y / o.trunkH, y, Math.sin(la) * lean * y * y / o.trunkH)); tr.push(o.trunkR * (1.25 - t * 0.55) * (i === 0 ? 1.25 : 1)); }
  tubeAlong(G, far ? [tp[0], tp[tp.length - 1]] : tp, far ? [tr[0], tr[tr.length - 1]] : tr, detail ? 7 : far ? 3 : 4, bark);
  const top = tp[tp.length - 1];
  const C = T(top.x, o.crownY, top.z); // centre du houppier
  const inside = (p) => { const dx = (p.x - C.x) / o.crownR, dy = (p.y - C.y) / o.crownH, dz = (p.z - C.z) / o.crownR; return Math.sqrt(dx * dx + dy * dy + dz * dz); };
  // branches maîtresses
  const tips = [];
  const nMain = detail ? o.nMain : far ? 0 : Math.min(4, o.nMain);
  for (let i = 0; i < nMain; i++) {
    const a = i * 2.39996 + rnd() * 0.5;
    const hs = o.trunkH * (o.branchFrom + (1 - o.branchFrom) * (i / nMain) * 0.9 + rnd() * 0.05);
    const el = o.upAngle + (rnd() - 0.5) * 0.35;
    const d = T(Math.cos(a) * Math.sin(el), Math.cos(el), Math.sin(a) * Math.sin(el)).normalize();
    const s = T(tp[0].x + (top.x - tp[0].x) * hs / o.trunkH, hs, tp[0].z + (top.z - tp[0].z) * hs / o.trunkH);
    // longueur jusqu'au bord du houppier
    let L = 0.5; while (L < 30 && inside(_tv().copy(s).addScaledVector(d, L)) < 0.88) L += 0.4;
    const pts = [s], rad = [o.trunkR * 0.55];
    const seg = detail ? 3 : 1;
    for (let k = 1; k <= seg; k++) { const t = k / seg; const p = _tv().copy(s).addScaledVector(d, L * t); p.y += Math.sin(t * Math.PI) * L * 0.08 - (o.droop || 0) * t * t * L * 0.3; pts.push(p); rad.push(o.trunkR * 0.55 * (1 - t * 0.85)); }
    if (detail || i < 3) tubeAlong(G, pts, rad, detail ? 5 : 3, bark);
    tips.push(pts[pts.length - 1]);
    // ramifications
    const nSub = detail ? o.nSub : 0;
    for (let j = 0; j < nSub; j++) {
      const t = 0.35 + rnd() * 0.5, sp = _tv().copy(pts[0]).lerp(pts[pts.length - 1], t);
      const sd = _tv().copy(d).add(T((rnd() - 0.5) * 1.4, (rnd() - 0.2) * 0.9, (rnd() - 0.5) * 1.4)).normalize();
      let L2 = 0.4; while (L2 < 16 && inside(_tv().copy(sp).addScaledVector(sd, L2)) < 0.92) L2 += 0.35;
      const ep = _tv().copy(sp).addScaledVector(sd, L2 * 0.9);
      if (j % 2 === 0) tubeAlong(G, [sp, ep], [o.trunkR * 0.22, 0.03], 3, bark);
      tips.push(ep);
    }
  }
  // grappes de cartes : bouts de branches + coquille externe du houppier
  const nCl = detail ? o.clusters : Math.round(o.clusters * (far ? 0.09 : 0.3));
  const pts = tips.slice();
  for (let k = pts.length; k < nCl; k++) {
    const d = T(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() > 1 || d.lengthSq() < 0.05) { k--; continue; }
    const r = Math.pow(rnd(), 0.35) * 0.95; d.normalize().multiplyScalar(r);
    pts.push(T(C.x + d.x * o.crownR, C.y + d.y * o.crownH, C.z + d.z * o.crownR));
  }
  // remplissage intérieur sombre (évite les trous dans le houppier)
  {
    const nIn = detail ? Math.round(o.clusters * 0.3) : far ? 2 : 5, lc = lcol;
    for (let k = 0; k < nIn; k++) {
      const d = T(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() > 1) { k--; continue; }
      d.multiplyScalar(0.55);
      const p = T(C.x + d.x * o.crownR, C.y + d.y * o.crownH, C.z + d.z * o.crownR);
      const ao = 0.38 + 0.2 * (d.y + 0.5);
      const n = T(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).normalize();
      leafCard(G, p, n, o.cardS * (detail ? 1.9 : 3.0), rnd() * 6.28, o.tile, [lc[0] * ao, lc[1] * ao, lc[2] * ao], 1, _tv().copy(d).normalize());
    }
  }
  const cardS = detail ? o.cardS : o.cardS * (far ? 2.7 : 1.8);
  const perCl = detail ? o.perCl : far ? 2 : 3;
  for (const p of pts) {
    const out = _tv().subVectors(p, C); out.x /= o.crownR; out.y /= o.crownH; out.z /= o.crownR;
    const depth = Math.min(1, out.length()); out.normalize();
    const ao = 0.5 + 0.5 * Math.pow(depth, 1.2) * (0.78 + 0.22 * (out.y * 0.5 + 0.5));
    const col = [lcol[0] * ao, lcol[1] * ao, lcol[2] * ao];
    for (let q = 0; q < perCl; q++) {
      const n = _tv().copy(out).add(T((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 1.6 + 0.3, (rnd() - 0.5) * 1.6)).normalize();
      const ln = _tv().copy(out).multiplyScalar(0.75).addScaledVector(n, 0.25).normalize();
      const jit = T((rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5)).multiplyScalar(cardS * 0.6);
      leafCard(G, _tv().copy(p).add(jit), n, cardS * (0.8 + rnd() * 0.4), rnd() * 6.28, o.tile, col, 1, ln);
    }
  }
  return G;
}
function conifer(rnd, o, lv) {
  const detail = lv === 0, far = lv === 2;
  const G = new TreeGeo();
  const T = (x, y, z) => new THREE.Vector3(x, y, z);
  const H = o.H;
  tubeAlong(G, [T(0, 0, 0), T(0, H * 0.5, 0), T(0, H, 0)], [o.trunkR, o.trunkR * 0.55, 0.04], detail ? 6 : 3, o.bark);
  const y0 = H * o.base, step = detail ? o.step : o.step * (far ? 3.6 : 1.8);
  let w = 0;
  for (let y = y0; y < H - 0.6; y += step * (0.85 + rnd() * 0.3), w++) {
    const t = (y - y0) / (H - y0);
    const R = o.R * Math.pow(1 - t, 0.92) + 0.35;
    const n = detail ? 5 + ((rnd() * 3) | 0) : far ? 4 : 5;
    const ao = 0.62 + 0.38 * Math.min(1, t * 1.4 + 0.25);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + w * 0.9 + rnd() * 0.4;
      const dir = T(Math.cos(a), -o.droop - rnd() * 0.12, Math.sin(a)).normalize();
      const base = T(0, y, 0), tip = _tv().copy(base).addScaledVector(dir, R);
      tip.y -= R * 0.12;
      const ln = T(Math.cos(a) * 0.7, 0.75, Math.sin(a) * 0.7).normalize();
      const snowy = o.snow && rnd() < 0.55 + t * 0.4;
      const lc = linCol(o.leafCol), col = [lc[0] * ao, lc[1] * ao, lc[2] * ao];
      const width = Math.max(detail ? 0.9 : 1.3, R * (detail ? 0.95 : far ? 1.9 : 1.45));
      branchCard(G, _tv().copy(base).addScaledVector(dir, -0.15), tip, width, (rnd() - 0.5) * 0.3, col, snowy ? 2 : 1, ln);
      if (detail && (i % 2 === 0)) branchCard(G, _tv().copy(base).addScaledVector(dir, R * 0.1), _tv().copy(tip).addScaledVector(dir, -R * 0.1), width * 0.55, Math.PI / 2, col, 1, ln);
    }
  }
  // flèche
  const col = linCol(o.leafCol);
  for (let k = 0; k < (detail ? 3 : far ? 1 : 2); k++) { const a = k * 1.05; branchCard(G, T(0, H - 2.4, 0), T(0, H + 0.3, 0), 1.6, a, col, 1, T(Math.cos(a), 0.6, Math.sin(a)).normalize()); }
  return G;
}
function bushGeo(rnd, o, lv) {
  const detail = lv === 0;
  const G = new TreeGeo();
  const T = (x, y, z) => new THREE.Vector3(x, y, z);
  const n = detail ? o.n : 4;
  for (let k = 0; k < n; k++) {
    const d = T(rnd() * 2 - 1, rnd() * 0.9 + 0.1, rnd() * 2 - 1); if (d.lengthSq() > 1) { k--; continue; }
    const p = T(d.x * o.R, d.y * o.Hb + 0.2, d.z * o.R);
    const out = T(d.x, d.y * 0.8 + 0.3, d.z).normalize();
    const ao = 0.5 + 0.5 * Math.min(1, d.length());
    const nrm = _tv().copy(out).add(T((rnd() - 0.5) * 1.4, (rnd() - 0.5) * 1.2, (rnd() - 0.5) * 1.4)).normalize();
    const lc = linCol(o.col); leafCard(G, p, nrm, (detail ? o.s : o.s * 1.6) * (0.8 + rnd() * 0.4), rnd() * 6.28, 'E', [lc[0] * ao, lc[1] * ao, lc[2] * ao], 1, out);
  }
  return G;
}
function makeSpecies() {
  treeMaterial();
  const S = {};
  const mk = (fn, o, seed) => { const a = fn(mulberry(seed), o, 0), b = fn(mulberry(seed), o, 1), c = fn(mulberry(seed), o, 2); return { lod0: a.geometry(), lod1: b.geometry(), lod2: c.geometry(), tris: [a.tris, b.tris, c.tris] }; };
  S.chene = { ...mk(broadleaf, { bark: [120, 104, 88], leafCol: [86, 132, 50], trunkH: 5.2, trunkR: 0.42, crownY: 9.2, crownR: 6.2, crownH: 4.6, nMain: 7, nSub: 4, upAngle: 0.95, branchFrom: 0.55, clusters: 105, perCl: 4, cardS: 1.75, tile: 'A' }, 11), h: 14 };
  S.platane = { ...mk(broadleaf, { bark: [176, 166, 140], leafCol: [96, 136, 56], trunkH: 6.2, trunkR: 0.3, crownY: 10.2, crownR: 4.2, crownH: 3.6, nMain: 6, nSub: 3, upAngle: 0.85, branchFrom: 0.8, clusters: 70, perCl: 4, cardS: 1.4, tile: 'A' }, 91), h: 14 };
  S.bouleau = { ...mk(broadleaf, { bark: [236, 232, 226], leafCol: [128, 164, 66], trunkH: 7.5, trunkR: 0.2, crownY: 10.2, crownR: 3.0, crownH: 4.4, nMain: 6, nSub: 3, upAngle: 0.5, branchFrom: 0.45, droop: 0.6, clusters: 70, perCl: 4, cardS: 1.25, tile: 'B' }, 23), h: 14 };
  S.peuplier = { ...mk(broadleaf, { bark: [140, 128, 112], leafCol: [80, 128, 52], trunkH: 5, trunkR: 0.3, crownY: 12.5, crownR: 2.3, crownH: 8.5, nMain: 8, nSub: 3, upAngle: 0.22, branchFrom: 0.5, clusters: 90, perCl: 4, cardS: 1.2, tile: 'B' }, 37), h: 21 };
  S.epicea = { ...mk(conifer, { bark: [110, 84, 64], leafCol: [66, 116, 74], H: 19, trunkR: 0.34, base: 0.12, step: 0.78, R: 3.9, droop: 0.22 }, 51), h: 19 };
  S.pinNeige = { ...mk(conifer, { bark: [104, 80, 62], leafCol: [70, 112, 84], H: 14, trunkR: 0.28, base: 0.1, step: 0.74, R: 3.1, droop: 0.3, snow: true }, 63), h: 14 };
  S.buisson = { ...mk(bushGeo, { col: [92, 130, 56], R: 1.9, Hb: 1.5, n: 34, s: 1.0 }, 77), h: 2 };
  { // rocher
    const make = (det) => { const ico = new THREE.IcosahedronGeometry(1, det); const p = ico.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 0.7 + noiseAt(x * 0.3 + 0.5, z * 0.3 + y * 0.2, 2) * 0.6; p.setXYZ(i, x * k * 1.3, y * k * 0.8, z * k); } ico.computeVertexNormals(); const g = new Geo(); g.add(ico, M(0, 0.3, 0, 1, 1, 1), [150, 144, 136]); return g.geometry(); };
    S.rocher = { lod0: make(2), lod1: make(1), lod2: make(0), h: 2, rock: true };
  }
  console.log('arbres (triangles lod0/lod1)', Object.entries(S).filter(([k, v]) => v.tris).map(([k, v]) => k + ' ' + v.tris.join('/')).join(', '));
  return S;
}

export const VEG = { chunks: [], species: null, CH: 750 };
export function buildVegetation(rnd) {
  const species = VEG.species = makeSpecies();
  const fol = treeMaterial();
  const rockMat = worldShading(new THREE.MeshStandardMaterial({ map: TEX.rock, roughness: 0.9, vertexColors: true }), { key: 'rockinst' });
  const CH = VEG.CH, NCX = Math.ceil(WW / CH), NCZ = Math.ceil(HH / CH);
  const lists = new Map();
  const push = (sp, x, y, z, s, rot, col) => {
    const key = (Math.floor((x + WW / 2) / CH)) + ':' + (Math.floor((z + HH / 2) / CH)) + ':' + sp;
    if (!lists.has(key)) lists.set(key, []);
    lists.get(key).push([x, y, z, s, rot, col]);
  };
  const dens = Q.trees;
  const STEP = 13;
  const tint = (base, v) => [base[0] * v[0], base[1] * v[1], base[2] * v[2]];
  const greens = [[1, 1, 1], [0.86, 0.95, 0.8], [1.12, 1.05, 0.85], [0.9, 1.0, 1.05], [1.2, 1.1, 0.7]];
  const autumn = [[1.9, 1.05, 0.45], [2.1, 0.75, 0.35], [1.6, 1.25, 0.4]];
  let count = 0;
  for (let z = -HH / 2; z < HH / 2; z += STEP) for (let x = -WW / 2; x < WW / 2; x += STEP) {
    const px = x + rnd() * STEP, pz = z + rnd() * STEP;
    const k = idxAt(px, pz), c = CLS[k];
    if (c === 0 || LAKE[k]) continue;
    const h = hAt(px, pz);
    if (h < 2.0 || h > 760) continue;
    const m = tmGet(px, pz);
    if (m && m !== 0) continue;
    const sl = slopeAt(px, pz);
    const clump = noiseAt(px * 0.0016, pz * 0.0016, 1);
    let prob = c === 2 ? 0.62 : c === 4 ? 0.07 : c === 3 ? 0.05 + clump * 0.06 : 0.004 + (clump > 0.62 ? 0.07 : 0);
    if (h > 560) prob *= 0.5;
    if (rnd() > prob * dens) continue;
    if (sl > 0.75) { if (rnd() < 0.5 && h > 80) push('rocher', px, h - 0.4, pz, 1.2 + rnd() * 2.6, rnd() * 6, [1, 1, 1]); continue; }
    let sp;
    if (c === 4 || h > 380) sp = 'pinNeige';
    else if (c === 2) sp = rnd() < 0.55 ? 'epicea' : rnd() < 0.7 ? 'chene' : 'bouleau';
    else sp = rnd() < 0.25 ? 'buisson' : rnd() < 0.55 ? 'chene' : rnd() < 0.6 ? 'bouleau' : 'epicea';
    const v = rnd() < 0.06 && sp !== 'epicea' && sp !== 'pinNeige' ? autumn[(rnd() * autumn.length) | 0] : greens[(rnd() * greens.length) | 0];
    push(sp, px, h - 0.3, pz, 0.7 + rnd() * 0.65, rnd() * 6.28, v);
    count++;
    if (c === 2 && rnd() < 0.25) push('buisson', px + (rnd() - 0.5) * 8, hAt(px, pz) - 0.2, pz + (rnd() - 0.5) * 8, 0.7 + rnd() * 0.6, rnd() * 6, greens[(rnd() * 5) | 0]);
  }
  // rochers des montagnes et des côtes
  for (let i = 0; i < 9000 * dens; i++) {
    const px = (rnd() - 0.5) * WW, pz = (rnd() - 0.5) * HH; const c = clsAt(px, pz); const h = hAt(px, pz);
    if (c === 0 || h < 1.5 || tmGet(px, pz)) continue;
    const sl = slopeAt(px, pz);
    if ((c === 3 || c === 4) && rnd() < 0.6 || sl > 0.45 || (h < 6 && rnd() < 0.3)) push('rocher', px, h - 0.5, pz, 0.8 + rnd() * 3.2, rnd() * 6, [1, 1, 1]);
  }
  // peupliers en alignement le long des voies et des lacs
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  for (const t of TRACKS) {
    if (hashStr('pp' + t.id) % 3) continue;
    const side = hashStr('ps' + t.id) % 2 ? 1 : -1;
    for (let s = 300; s < t.L - 300; s += 16) {
      if (noiseAt(s * 0.0012 + t.id * 0.17, 0.3, 1) < 0.5) continue;
      t.pos(s, p); t.tan(s, tg); const hl = Math.hypot(tg.x, tg.z) || 1;
      const x = p.x - tg.z / hl * 22 * side, z = p.z + tg.x / hl * 22 * side;
      if (tmGet(x, z) || waterAt(x, z) > -1e8 || clsAt(x, z) !== 1) continue;
      push('peuplier', x, hAt(x, z) - 0.3, z, 0.85 + rnd() * 0.3, rnd() * 6, greens[(rnd() * 5) | 0]);
    }
  }
  // arbres des villes (jardins, places, avenues)
  for (const t of TOWN_TREES) push(t.sp, t.x, hAt(t.x, t.z) - 0.2, t.z, t.s, rnd() * 6.28, t.col);
  const col = new THREE.Color(), mtx = new THREE.Matrix4();
  lazyRankStart();
  for (const [key, arr] of lists) {
    const [ci, cj, sp] = key.split(':');
    const spec = species[sp];
    const mat = spec.rock ? rockMat : fol;
    const mk = (geo, cast, mt = mat) => {
      const im = new THREE.InstancedMesh(geo, mt, arr.length);
      arr.forEach((a, i) => { im.setMatrixAt(i, Mset(mtx, a[0], a[1], a[2], a[3], a[3] * (0.9 + (i % 5) * 0.05), a[3], a[4])); im.setColorAt(i, col.setRGB(a[5][0], a[5][1], a[5][2])); });
      im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true;
      freeAfterUpload(null, [im.instanceMatrix, im.instanceColor]);
      return im;
    };
    // un maillage par niveau de détail, fabriqué quand ce niveau s'affiche pour la première fois
    const lod = (geo, cast) => ({ mesh: null, make: () => mk(geo, cast), parent: scenery, rank: lazyRank() });
    const lod0 = lod(spec.lod0, true), lod1 = lod(spec.lod1, false), lod2 = lod(spec.lod2, false);

    const cx = (+ci + 0.5) * CH - WW / 2, cz = (+cj + 0.5) * CH - HH / 2;
    VEG.chunks.push({ cx, cz, lod0, lod1, lod2, rock: !!spec.rock, small: sp === 'buisson' });
  }
  void NCX; void NCZ;
  return count;
}
export function updateVegetation(camPos) {
  const near = Q.treeNear, far = Q.treeFar || 6000, half = VEG.CH * 0.7071;
  for (const c of VEG.chunks) {
    const d = Math.max(0, Math.hypot(c.cx - camPos.x, c.cz - camPos.z) - half);
    const lim = c.small ? Math.min(near, 900) : near;
    const v0 = d < lim, v1 = !v0 && d < (c.rock || c.small ? 1800 : Q.treeMid), v2 = !v0 && !v1 && d < (c.rock || c.small ? 3500 : far);
    const gone = d > lazyFar(c.rock || c.small ? 3500 : far);
    // un niveau masqué mais voisin de celui affiché reste en mémoire : la caméra y revient souvent
    lazyShow(c.lod0, v0, !v1); lazyShow(c.lod1, v1, !v0 && !v2); lazyShow(c.lod2, v2, gone);
  }
}

// ---------- herbe dense calculée sur le GPU autour de la caméra
const GRASS = { mesh: null, mat: null, cell: 1 };
function buildGrass() {
  // masque d'herbe (25 m) : R densité, G sécheresse
  const MW = Math.ceil(WW / 25), MH = Math.ceil(HH / 25);
  const data = new Uint8Array(MW * MH * 4);
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
    const x = (i + 0.5) * 25 - WW / 2, z = (j + 0.5) * 25 - HH / 2;
    const k = idxAt(x, z), c = CLS[k], h = H[k];
    let d = c === 1 ? 1 : c === 3 ? 0.75 : c === 2 ? 0.5 : 0;
    if (LAKE[k] || h < 2.6 || h > 650) d = 0;
    const m = tmGet(x, z); if (m === 1 || m === 2 || m === 4) d *= 0.15; if (m === 3) d *= 0.6;
    if (slopeAt(x, z) > 0.55) d *= 0.3;
    for (const st of STATIONS) { const dd = Math.hypot(x - st.x, z - st.z), R = [0, 200, 290, 380, 480, 820][st.meta.size]; if (dd < R) d *= 0.35 + 0.65 * dd / R; }
    data[(j * MW + i) * 4] = d * 255; data[(j * MW + i) * 4 + 1] = (c === 3 ? 0.7 : 0.15) * 255;
  }
  const mask = new THREE.DataTexture(data, MW, MH, THREE.RGBAFormat); mask.magFilter = mask.minFilter = THREE.LinearFilter; mask.needsUpdate = true;
  // touffe de 4 brins
  const pos = [], uvs = [];
  for (let b = 0; b < 4; b++) {
    const a = b * 0.8 + 0.3, ox = Math.cos(a * 2.1) * 0.12, oz = Math.sin(a * 2.1) * 0.12, ca = Math.cos(a), sa = Math.sin(a), w = 0.065;
    const P = (u, y) => [ox + ca * u * w * (1 - y * 0.85), y, oz + sa * u * w * (1 - y * 0.85)];
    const v = [P(-1, 0), P(1, 0), P(-1, 0.5), P(1, 0.5), P(0, 1)];
    for (const tri of [[0, 1, 3], [0, 3, 2], [2, 3, 4]]) for (const q of tri) { pos.push(...v[q]); uvs.push(q === 4 ? 0.5 : (q % 2), v[q][1]); }
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  const R = Q.grassR, count = Q.grass;
  const m = Math.ceil(Math.sqrt(count * 4 / Math.PI));
  const cell = 2 * R / m;
  const offs = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const ox = i - m / 2, oz = j - m / 2; if ((ox * ox + oz * oz) * cell * cell <= R * R) offs.push(ox, oz); }
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(offs), 2));
  geo.instanceCount = offs.length / 2;
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide, envMapIntensity: 0.6 });
  const U = { tHG: { value: HTEX }, uHSG: { value: new THREE.Vector2(NX, NZ) }, tMask: { value: mask }, uCamCell: { value: new THREE.Vector2() }, uCell: { value: cell }, uRad: { value: R } };
  worldShading(mat, {
    key: 'grass', after: sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = `uniform vec2 uWorld; uniform float uTime; attribute vec2 aOff; uniform sampler2D tHG, tMask; uniform vec2 uHSG, uCamCell; uniform float uCell, uRad; varying vec3 vGcol; varying float vGy;
        float g21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float gH(vec2 xz){ vec2 g = (xz / uWorld + 0.5) * (uHSG - 1.0); g = clamp(g, vec2(0.0), uHSG - 1.001); ivec2 i = ivec2(floor(g)); vec2 f = fract(g);
          float a = texelFetch(tHG, i, 0).r, b = texelFetch(tHG, i + ivec2(1, 0), 0).r, c = texelFetch(tHG, i + ivec2(0, 1), 0).r, d = texelFetch(tHG, i + ivec2(1, 1), 0).r;
          return f.y >= f.x ? a + (d - c) * f.x + (c - a) * f.y : a + (b - a) * f.x + (d - b) * f.y; }\n` + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
        .replace('#include <begin_vertex>', `
          vec2 cid = uCamCell + aOff;
          vec2 base = (cid + vec2(g21(cid), g21(cid + 7.31))) * uCell;
          vec4 mk = texture2D(tMask, base / uWorld + 0.5);
          float r = length(base - cameraPosition.xz);
          float hs = g21(cid * 1.37 + 2.0);
          float keep = step(hs, mk.r) * smoothstep(uRad, uRad * 0.72, r);
          float bh = (0.35 + g21(cid + 5.0) * 0.65) * keep * (0.55 + mk.r * 0.6);
          float ang = g21(cid + 3.1) * 6.2831;
          vec3 p = position; p.y *= bh; p.xz *= keep * (0.9 + bh);
          float ca = cos(ang), sa = sin(ang); p.xz = mat2(ca, -sa, sa, ca) * p.xz;
          float wind = sin(uTime * 1.7 + base.x * 0.07 + base.y * 0.05) * 0.5 + sin(uTime * 3.0 + base.x * 0.13 + base.y * 0.11) * 0.22;
          float yy = position.y;
          p.x += yy * yy * (0.16 + wind * 0.22) * bh; p.z += yy * yy * wind * 0.12 * bh;
          vec3 transformed = vec3(base.x + p.x, gH(base) + p.y, base.y + p.z);
          float hue = g21(cid + 11.0);
          vec3 gc = mix(vec3(0.16, 0.34, 0.06), vec3(0.3, 0.42, 0.1), hue);
          gc = mix(gc, vec3(0.48, 0.44, 0.16), mk.g * 0.8);
          float fl = g21(cid + 9.0);
          if (fl < 0.025 && yy > 0.9) gc = fl < 0.008 ? vec3(0.95, 0.85, 0.15) : fl < 0.016 ? vec3(0.95, 0.95, 0.92) : vec3(0.55, 0.3, 0.75);
          vGcol = gc; vGy = yy;`);
      sh.fragmentShader = 'varying vec3 vGcol; varying float vGy;\n' + sh.fragmentShader.replace('#include <color_fragment>', 'diffuseColor.rgb = vGcol * mix(0.35, 1.15, vGy);');
    },
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
  mesh.layers.set(1);
  GRASS.mesh = mesh; GRASS.mat = mat; GRASS.cell = cell; GRASS.U = U;
  scene.add(mesh);
}
function updateGrass(camPos) {
  if (!GRASS.mesh) return;
  GRASS.U.uCamCell.value.set(Math.floor(camPos.x / GRASS.cell), Math.floor(camPos.z / GRASS.cell));
}

// ---------- bottes de foin
export function buildHay(rnd) {
  const items = [];
  for (const st of STATIONS) {
    const R = (st.meta.R || 300) * 2.2 + 600;
    for (let i = 0; i < 50 + st.meta.size * 20; i++) {
      const a = rnd() * 6.28, d = R * (0.4 + rnd() * 0.6), x = st.x + Math.cos(a) * d, z = st.z + Math.sin(a) * d;
      if (clsAt(x, z) !== 1 || tmGet(x, z) || slopeAt(x, z) > 0.08 || waterAt(x, z) > -1e8) continue;
      const n = 3 + (rnd() * 6 | 0), ang = rnd() * 6;
      for (let k = 0; k < n; k++) { const bx = x + Math.cos(ang) * k * 6 + (rnd() - 0.5) * 3, bz = z + Math.sin(ang) * k * 6 + (rnd() - 0.5) * 3; items.push([bx, hAt(bx, bz) + 0.62, bz, rnd() * 6]); }
    }
  }
  if (!items.length) return;
  const g = new THREE.CylinderGeometry(0.75, 0.75, 1.3, 16); g.rotateZ(Math.PI / 2);
  const mat = worldShading(new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.95, map: TEX.dry }), { key: 'hay' });
  const by = new Map();
  for (const it of items) { const k = Math.floor(it[0] / 500) + ':' + Math.floor(it[2] / 500); let a = by.get(k); if (!a) by.set(k, a = []); a.push(it); }
  for (const [k, a] of by) {
    const im = new THREE.InstancedMesh(g, mat, a.length);
    a.forEach((it, i) => im.setMatrixAt(i, M(it[0], it[1], it[2], 1, 1, 1, it[3])));
    im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); scenery.add(im);
    const [ci, cj] = k.split(':').map(Number);
    PROPS.meshes.push({ mesh: im, cx: (ci + 0.5) * 500, cz: (cj + 0.5) * 500, R: 1500 * (Q.propK || 1) + 360 });
  }
}
