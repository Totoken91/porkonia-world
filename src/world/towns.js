// Villes : plan des rues, îlots, bâtiments, façades, toits
import * as THREE from 'three';
import { mulberry } from '../engine/util.js';
import { Q } from '../engine/quality.js';
import { tmGet, waterAt, slopeAt, hAt, tmMark, WW, HH, clsAt, STATIONS } from './land.js';
import { freeAfterUpload } from '../engine/renderer.js';
import { noiseAt, TEX } from '../engine/textures.js';
import { worldShading } from '../engine/lighting.js';
import { lazyRankStart, lazyRank, lazyShow, lazyFar } from '../engine/lazy.js';
import { linCol, M, TPL } from '../engine/geo.js';
import { TOWN_SEGS, propAdd } from './registry.js';
import { BUILDINGS, newDrape, drapeRect, drapeWall, LAMPS, TOWN_TREES, STREETS, WALLS, ROOFS, FOUNTAINS, TOWERS, HEDGES, CHALET, GWALLS, siteOk, reserve, FARMS, scenery, DRAPE, Kit, groundMaterial, DRAPES, facadePoint } from './scenery.js';
import { propsSidewalk, propsShop, propsSquare, propsIndustry, propsPark, propsPlot, yawTo, updateProps } from './props.js';

// --- formes d'un bâtiment : règle unique (JS + shader) pour placer les fenêtres
// style : 0 maison de ville, 1 chalet, 2 tour, 3 grange, 4 immeuble haussmannien, 5 pavillon
const STYLE = {
  0: { bay: 2.9, winW: 1.1, winH: 1.5, sill: 0.95, shutters: true },
  1: { bay: 3.1, winW: 1.1, winH: 1.35, sill: 0.95, shutters: true },
  2: { bay: 0, winW: 0, winH: 0, sill: 0, shutters: false },
  3: { bay: 0, winW: 0, winH: 0, sill: 0, shutters: false },
  4: { bay: 3.0, winW: 1.2, winH: 2.05, sill: 0.6, shutters: false },
  5: { bay: 3.4, winW: 1.15, winH: 1.4, sill: 0.95, shutters: true },
};
function bays(L, bay) { const m = 1.0; const n = Math.max(1, Math.floor((L - 2 * m) / bay)); return { n, sp: (L - 2 * m) / n, m }; }
const SHUTTER_COLS = [[46, 92, 60], [52, 82, 120], [118, 36, 44], [150, 146, 134], [196, 170, 110], [70, 104, 110]];
const DOOR_COLS = [[60, 40, 28], [40, 62, 46], [42, 58, 92], [110, 30, 38], [36, 36, 40]];
const AWNING_COLS = [[150, 30, 40], [30, 90, 60], [40, 60, 120], [196, 120, 40], [90, 90, 96], [123, 30, 46]];

function townFrame(st) {
  const U = [st.dir.x, st.dir.y], V = [-st.dir.y, st.dir.x];
  const C = [st.x + V[0] * 80, st.z + V[1] * 80];
  // signe de U×V (vers le haut ?) pour l'ordre des triangles
  const cross = U[1] * V[0] - U[0] * V[1];
  return { U, V, C, flip: cross < 0 };
}
// yaw tel que l'axe x local du bâtiment suive dir et l'axe z local pointe vers 'away'
function yawFor(dx, dz) { return Math.atan2(-dz, dx); }

function addBuilding(o) {
  // o: x,z,lo,hi,w,d,theta,floors,style,wall,roofType,roofCol,roofH,shop,attL,attR,sideWin,seed,shut,door
  const floorY = (o.hi - o.lo) + 1.1;           // niveau du rez-de-chaussée au-dessus de la base
  const gh = o.style === 4 || o.shop ? 3.9 : o.style === 2 ? 4.2 : 3.0, fh = o.style === 4 ? 3.2 : o.style === 2 ? 3.6 : 2.85;
  const wallFloors = o.roofType === 2 ? o.floors - 1 : o.floors;
  const h = o.style === 3 ? floorY + o.hBarn : floorY + gh + Math.max(0, wallFloors - 1) * fh + (o.style === 2 ? 1.2 : 0.35);
  const b = { ...o, base: o.lo - 0.75, floorY, gh, fh, wallFloors, h, bc: [o.x, o.lo, o.z] };
  BUILDINGS.push(b);
  return b;
}

// --- implantation d'une ville
export function layoutTown2(st, rnd) {
  const sz = st.meta.size, mont = !!st.meta.montagne, capital = sz >= 5;
  const T = townFrame(st);
  newDrape(st.x, st.z);
  const R = st.meta.R || [0, 240, 340, 450, 580, 1000][sz];
  const S = capital ? 78 : mont ? 62 : 70;
  const W = (a, b) => [T.C[0] + T.U[0] * a + T.V[0] * b, T.C[1] + T.U[1] * a + T.V[1] * b];
  const K = Math.ceil(R / S) + 1;
  const mainW = sz >= 3 ? 12 : 10, sideW = 8, swMain = sz >= 3 ? 4 : 3, swSide = 2.6;
  const hwA = (j) => (j === 0 ? mainW : sideW) / 2, hwB = (i) => (i === 0 ? mainW : sideW) / 2;
  const swA = (j) => j === 0 ? swMain : swSide, swB = (i) => i === 0 ? swMain : swSide;
  const blocks = new Map(), key = (i, j) => i + ',' + j;
  for (let j = -K; j < K; j++) for (let i = -K; i < K; i++) {
    const ac = (i + 0.5) * S, bc = (j + 0.5) * S, [x, z] = W(ac, bc);
    const d = Math.hypot(ac, bc);
    if (d > R * (0.8 + 0.32 * noiseAt(x * 0.0013, z * 0.0013, 1))) continue;
    let bad = false, lm = false, lo = 1e9, hi = -1e9;
    for (let q = 0; q <= 4 && !bad; q++) for (let r = 0; r <= 4; r++) {
      const [px, pz] = W(i * S + 5 + (S - 10) * q / 4, j * S + 5 + (S - 10) * r / 4);
      const m = tmGet(px, pz);
      if (m === 1 || m === 2 || waterAt(px, pz) > -1e8 || slopeAt(px, pz) > (mont ? 0.5 : 0.24)) { bad = true; break; }
      if (m === 3) lm = true;
      const hh = hAt(px, pz); lo = Math.min(lo, hh); hi = Math.max(hi, hh);
    }
    if (bad || hi - lo > (mont ? 42 : 16) || lo < 1.2) continue;
    blocks.set(key(i, j), { i, j, ac, bc, x, z, dn: d / R, lm, lo, hi });
  }
  if (!blocks.size) return;
  // zonage
  let best = null;
  for (const bk of blocks.values()) if (!bk.lm && bk.j >= 0 && (!best || Math.hypot(bk.ac, bk.bc) < Math.hypot(best.ac, best.bc))) best = bk;
  for (const bk of blocks.values()) {
    const dn = bk.dn;
    if (bk.lm) bk.type = 'landmark';
    else if (mont) bk.type = dn < 0.35 ? 'chaletCore' : 'chalet';
    else if (capital) bk.type = dn < 0.36 ? (rnd() < 0.3 ? 'towers' : 'haussmann') : dn < 0.6 ? 'core' : dn < 0.8 ? 'mid' : 'pavillon';
    else if (sz === 4) bk.type = dn < 0.34 ? 'core' : dn < 0.64 ? 'mid' : 'pavillon';
    else if (sz === 3) bk.type = dn < 0.3 ? 'core' : dn < 0.62 ? 'mid' : 'pavillon';
    else bk.type = dn < 0.22 ? 'core' : dn < 0.5 ? 'mid' : 'pavillon';
  }
  if (best && sz >= 2) best.type = 'square';
  if (sz >= 3) { const mids = [...blocks.values()].filter(b => b.type === 'mid' || b.type === 'pavillon'); if (mids.length > 3) mids[(rnd() * mids.length) | 0].type = 'park'; }
  { const outer = [...blocks.values()].filter(b => (b.type === 'pavillon' || b.type === 'mid' || b.type === 'chalet') && b.dn > 0.5 && b.hi - b.lo < 6); for (let q = 0; q < (sz >= 4 ? 3 : sz >= 2 ? 2 : 1) && outer.length; q++) outer.splice((rnd() * outer.length) | 0, 1)[0].type = 'industrie'; }
  // rues : arêtes du quadrillage bordées d'au moins un îlot
  const has = (i, j) => blocks.has(key(i, j));
  const edgeOK = (a0, b0, a1, b1, hw) => {
    const n = Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 5);
    for (let s = 0; s <= n; s++) {
      const a = a0 + (a1 - a0) * s / n, b = b0 + (b1 - b0) * s / n;
      const ta = (a1 - a0) !== 0 ? 0 : 1, tb = 1 - ta;
      for (const o of [-hw - 1.5, 0, hw + 1.5]) {
        const [x, z] = W(a + ta * o, b + tb * o);
        const m = tmGet(x, z); if (m === 1 || m === 2 || m === 3 || waterAt(x, z) > -1e8) return false;
      }
    }
    return true;
  };
  const hE = new Map(), vE = new Map();
  for (let j = -K; j <= K; j++) for (let i = -K; i < K; i++) if (has(i, j - 1) || has(i, j)) { if (edgeOK(i * S, j * S, (i + 1) * S, j * S, hwA(j))) hE.set(key(i, j), true); }
  for (let j = -K; j < K; j++) for (let i = -K; i <= K; i++) if (has(i - 1, j) || has(i, j)) { if (edgeOK(i * S, j * S, i * S, (j + 1) * S, hwB(i))) vE.set(key(i, j), true); }
  const nodes = new Set();
  for (const k of hE.keys()) { const [i, j] = k.split(',').map(Number); nodes.add(key(i, j)); nodes.add(key(i + 1, j)); }
  for (const k of vE.keys()) { const [i, j] = k.split(',').map(Number); nodes.add(key(i, j)); nodes.add(key(i, j + 1)); }
  // carrefours
  for (const k of nodes) {
    const [i, j] = k.split(',').map(Number);
    drapeRect(T, i * S - hwB(i), i * S + hwB(i), j * S - hwA(j), j * S + hwA(j), 0, 0.07, 6);
  }
  const markOn = (a0, b0, a1, b1, r) => { const n = Math.ceil(Math.hypot(a1 - a0, b1 - b0) / 6); for (let s = 0; s <= n; s++) { const [x, z] = W(a0 + (a1 - a0) * s / n, b0 + (b1 - b0) * s / n); tmMark(x, z, r, 4); } };
  const core = (bk) => bk && ['core', 'haussmann', 'towers', 'square', 'chaletCore'].includes(bk.type);
  // tronçons de rue
  const roadSeg = (horiz, i, j) => {
    // horiz : le long de a, à b = j*S, de i*S à (i+1)*S
    const hw = horiz ? hwA(j) : hwB(i), sw = horiz ? swA(j) : swB(i), main = horiz ? j === 0 : i === 0;
    const s0 = horiz ? i * S + hwB(i) : j * S + hwA(j), s1 = horiz ? (i + 1) * S - hwB(i + 1) : (j + 1) * S - hwA(j + 1);
    const c = horiz ? j * S : i * S;
    const R2 = (t0, t1, l0, l1, kind, off, cell = 8) => horiz ? drapeRect(T, t0, t1, c + l0, c + l1, kind, off, cell) : drapeRect(T, c + l0, c + l1, t0, t1, kind, off, cell);
    R2(s0, s1, -hw, hw, 0, 0.07, 9);
    // marquages
    const L = s1 - s0;
    if (main) {
      for (let t = s0 + 2; t < s1 - 4; t += 7) R2(t, t + 3.5, -0.08, 0.08, 5, 0.1);
      R2(s0, s1, -hw + 0.35, -hw + 0.5, 5, 0.1); R2(s0, s1, hw - 0.5, hw - 0.35, 5, 0.1);
    }
    const sideBlocks = horiz ? [blocks.get(key(i, j - 1)), blocks.get(key(i, j))] : [blocks.get(key(i - 1, j)), blocks.get(key(i, j))];
    if (L > 16 && (main || core(sideBlocks[0]) || core(sideBlocks[1]))) for (const [e, dirn] of [[s0, 1], [s1, -1]]) {
      for (let q = -hw + 0.9; q < hw - 0.6; q += 1.1) R2(dirn > 0 ? e + 0.6 : e - 3.6, dirn > 0 ? e + 3.6 : e - 0.6, q, q + 0.55, 5, 0.1);
    }
    // trottoirs, bordures, lampadaires, arbres d'alignement
    sideBlocks.forEach((bk, si) => {
      if (!bk) return;
      const sg = si === 0 ? -1 : 1;
      const l0 = sg > 0 ? hw : -hw - sw, l1 = sg > 0 ? hw + sw : -hw;
      R2(s0 - (sg > 0 ? 0 : 0), s1, l0, l1, 1, 0.2);
      // bordure : face verticale côté chaussée + chant
      const lc = sg * hw;
      if (horiz) { drapeWall(T, s0, c + lc, s1, c + lc, 0.04, 0.2, 6, [0, -sg]); R2(s0, s1, sg > 0 ? hw : -hw - 0.18, sg > 0 ? hw + 0.18 : -hw, 6, 0.205); }
      else { drapeWall(T, c + lc, s0, c + lc, s1, 0.04, 0.2, 6, [-sg, 0]); R2(s0, s1, sg > 0 ? hw : -hw - 0.18, sg > 0 ? hw + 0.18 : -hw, 6, 0.205); }
      // extrémités du trottoir (vers le carrefour)
      for (const [e, dn] of [[s0, -1], [s1, 1]]) { if (horiz) drapeWall(T, e, c + l0, e, c + l1, 0.04, 0.2, 6, [dn, 0]); else drapeWall(T, c + l0, e, c + l1, e, 0.04, 0.2, 6, [0, dn]); }
      const latLamp = sg * (hw + 0.45);
      for (let t = s0 + 8 + (si * 12); t < s1 - 4; t += 26) { const [x, z] = horiz ? W(t, c + latLamp) : W(c + latLamp, t); LAMPS.push({ x, z, y: hAt(x, z) + 0.2, rot: Math.atan2(-sg * (horiz ? T.V[1] : T.U[1]), -sg * (horiz ? T.V[0] : T.U[0])) }); }
      if (main && sw >= 3.5 && !mont) for (let t = s0 + 7; t < s1 - 3; t += 15) { const lat = sg * (hw + sw * 0.55); const [x, z] = horiz ? W(t, c + lat) : W(c + lat, t); TOWN_TREES.push({ sp: 'platane', x, z, s: 0.8 + rnd() * 0.12, col: [1, 1.02, 0.94] }); }
      propsSidewalk({ W, T, horiz, c, s0, s1, hw, sw, sg, main, core: core(bk), mont, rnd, size: sz });
    });
    TOWN_SEGS.push({ st: st.id, p0: horiz ? W(s0, c) : W(c, s0), p1: horiz ? W(s1, c) : W(c, s1), n: horiz ? T.V : T.U, hw, sw, sides: [!!sideBlocks[0], !!sideBlocks[1]], ka: st.id + ':' + i + ',' + j, kb: st.id + ':' + (horiz ? (i + 1) + ',' + j : i + ',' + (j + 1)) });
    // rue pour les voitures
    const pts = []; for (let t = s0; t <= s1; t += 6) pts.push(horiz ? W(t, c) : W(c, t));
    if (pts.length >= 6) STREETS.push({ pts, w: hw * 2 });
    if (horiz) markOn(s0, c, s1, c, hw + sw); else markOn(c, s0, c, s1, hw + sw);
  };
  for (const k of hE.keys()) { const [i, j] = k.split(',').map(Number); roadSeg(true, i, j); }
  for (const k of vE.keys()) { const [i, j] = k.split(',').map(Number); roadSeg(false, i, j); }
  for (const k of nodes) { const [i, j] = k.split(',').map(Number); const [x, z] = W(i * S, j * S); tmMark(x, z, Math.max(hwA(j), hwB(i)) + 3, 4); }
  st.town = { T, S, C: T.C, nodes: [...nodes].map(k => { const [i, j] = k.split(',').map(Number); return W(i * S, j * S); }), spawn: W(hwB(0) + swB(0) * 0.3, hwA(0) + swA(0) * 0.3), carSpot: W(hwB(0) + 16, hwA(0) - 1.4) };
  // verdure : cellules sans îlot (emprise ferroviaire, abords) et îlots de monument
  for (let j = -K; j < K; j++) for (let i = -K; i < K; i++) {
    const bk = blocks.get(key(i, j));
    if (bk && bk.type !== 'landmark') continue;
    const ac = (i + 0.5) * S, bc = (j + 0.5) * S;
    if (Math.hypot(ac, bc) > R * 0.95) continue;
    const nT = bk ? 9 : 13;
    for (let q = 0; q < nT; q++) {
      const [x, z] = W(i * S + 6 + rnd() * (S - 12), j * S + 6 + rnd() * (S - 12));
      if (tmGet(x, z) !== 0 || waterAt(x, z) > -1e8 || slopeAt(x, z) > 0.45 || hAt(x, z) < 1.2) continue;
      const r = rnd();
      TOWN_TREES.push({ sp: mont ? (r < 0.7 ? 'epicea' : 'bouleau') : r < 0.4 ? 'chene' : r < 0.6 ? 'bouleau' : r < 0.8 ? 'platane' : r < 0.9 ? 'peuplier' : 'buisson', x, z, s: 0.5 + rnd() * 0.45, col: [1, 1, 1] });
    }
  }
  // îlots
  for (const bk of blocks.values()) fillBlock(T, W, bk, S, { hwA, hwB, swA, swB, has: (dI, dJ) => true }, rnd, st, capital, mont, sz);
}
function fillBlock(T, W, bk, S, P, rnd, st, capital, mont, sz) {
  const { i, j } = bk;
  const a0 = i * S + P.hwB(i) + P.swB(i), a1 = (i + 1) * S - P.hwB(i + 1) - P.swB(i + 1);
  const b0 = j * S + P.hwA(j) + P.swA(j), b1 = (j + 1) * S - P.hwA(j + 1) - P.swA(j + 1);
  const t = bk.type;
  const groundKind = t === 'square' ? 2 : (t === 'haussmann' || t === 'core' || t === 'towers' || t === 'chaletCore' || t === 'industrie') ? 7 : 3;
  drapeRect(T, a0, a1, b0, b1, groundKind, 0.12, 9);
  // masque : pas d'arbres sauvages dans l'îlot
  for (let q = 0; q <= 6; q++) for (let r = 0; r <= 6; r++) { const [x, z] = W(a0 + (a1 - a0) * q / 6, b0 + (b1 - b0) * r / 6); tmMark(x, z, 7, 4); }
  const Wd = (a, b) => W(a, b);
  // rangée de bâtiments le long d'un côté de l'îlot ; front sur la rue
  // side : 0 côté b0 (rue en -b), 1 côté b1 (+b), 2 côté a0 (-a), 3 côté a1 (+a)
  const sideFrame = (side) => {
    if (side === 0) return { from: [a0, b0], dir: [1, 0], inw: [0, 1], len: a1 - a0 };
    if (side === 1) return { from: [a1, b1], dir: [-1, 0], inw: [0, -1], len: a1 - a0 };
    if (side === 2) return { from: [a0, b1], dir: [0, -1], inw: [1, 0], len: b1 - b0 };
    return { from: [a1, b0], dir: [0, 1], inw: [-1, 0], len: b1 - b0 };
  };
  const toWorldDir = (d) => [T.U[0] * d[0] + T.V[0] * d[1], T.U[1] * d[0] + T.V[1] * d[1]];
  const place = (F, t0, w, setback, d, spec) => {
    const ca = F.from[0] + F.dir[0] * (t0 + w / 2) + F.inw[0] * (setback + d / 2), cb = F.from[1] + F.dir[1] * (t0 + w / 2) + F.inw[1] * (setback + d / 2);
    const [x, z] = Wd(ca, cb);
    const dw = toWorldDir(F.dir), iw = toWorldDir(F.inw);
    // axe x local = dir ; axe z local doit pointer vers l'intérieur (dos du bâtiment)
    let theta = yawFor(dw[0], dw[1]);
    const lz = [Math.sin(theta), Math.cos(theta)];
    let flipX = false;
    if (lz[0] * iw[0] + lz[1] * iw[1] < 0) { theta += Math.PI; flipX = true; }
    // emprise : hauteurs au sol
    let lo = 1e9, hi = -1e9;
    for (const [u, v] of [[0, 0], [0.5, 0.5], [-0.5, 0.5], [0.5, -0.5], [-0.5, -0.5]]) { const px = x + dw[0] * u * w + iw[0] * v * d, pz = z + dw[1] * u * w + iw[1] * v * d; const hh = hAt(px, pz); lo = Math.min(lo, hh); hi = Math.max(hi, hh); }
    if (hi - lo > (spec.style === 1 ? 10 : 6)) return null;
    const attL = spec.attL, attR = spec.attR;
    const nb = addBuilding({ x, z, lo, hi, w, d, theta, ...spec, attL: flipX ? attR : attL, attR: flipX ? attL : attR, seed: rnd() });
    if (spec.shop) propsShop(nb, rnd, t === 'core' || t === 'haussmann');
    return nb;
  };
  const wallCol = () => WALLS[(rnd() * WALLS.length) | 0], roofCol = () => ROOFS[(rnd() * ROOFS.length) | 0];
  const shutC = () => (rnd() * SHUTTER_COLS.length) | 0;
  if (t === 'square') {
    const [x, z] = Wd((a0 + a1) / 2, (b0 + b1) / 2);
    FOUNTAINS.push({ x, z, y: hAt(x, z) + 0.12 });
    for (const [ta, tb] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85], [0.5, 0.12], [0.5, 0.88], [0.12, 0.5], [0.88, 0.5]]) { const [tx, tz] = Wd(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * tb); TOWN_TREES.push({ sp: 'platane', x: tx, z: tz, s: 0.85, col: [1, 1.02, 0.94] }); }
    for (const [ta, tb] of [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]]) { const [lx, lz] = Wd(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * tb); LAMPS.push({ x: lx, z: lz, y: hAt(lx, lz) + 0.12, rot: 0 }); }
    propsSquare(Wd, T, a0, a1, b0, b1, rnd);
    return;
  }
  if (t === 'industrie') { propsIndustry(Wd, T, a0, a1, b0, b1, rnd, st); return; }
  if (t === 'park' || t === 'landmark') {
    if (t === 'park') {
      propsPark(Wd, T, a0, a1, b0, b1, rnd);
      const cA = (a0 + a1) / 2, cB = (b0 + b1) / 2;
      drapeRect(T, a0, a1, cB - 1.6, cB + 1.6, 8, 0.15, 6); drapeRect(T, cA - 1.6, cA + 1.6, b0, b1, 8, 0.15, 6);
      for (let k = 0; k < 14; k++) { const ta = a0 + 4 + rnd() * (a1 - a0 - 8), tb = b0 + 4 + rnd() * (b1 - b0 - 8); if (Math.abs(ta - cA) < 5 || Math.abs(tb - cB) < 5) continue; const [x, z] = Wd(ta, tb); TOWN_TREES.push({ sp: rnd() < 0.6 ? 'chene' : 'bouleau', x, z, s: 0.55 + rnd() * 0.3, col: [1, 1, 1] }); }
    }
    return;
  }
  if (t === 'towers') {
    drapeRect(T, a0 + 2, a1 - 2, b0 + 2, b1 - 2, 2, 0.14, 6);
    const n = rnd() < 0.5 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const w = n === 1 ? 26 + rnd() * 10 : 18 + rnd() * 6, d = 20 + rnd() * 8;
      const F = sideFrame(k === 0 ? 0 : 1);
      const off = ((a1 - a0) - w) * (n === 1 ? 0.5 : 0.15);
      const floors = 10 + ((Math.pow(rnd(), 1.4) * 22 * (1 - bk.dn)) | 0);
      place(F, off, w, 4, d, { floors, style: 2, wall: TOWERS[(rnd() * TOWERS.length) | 0], roofType: 3, roofCol: [90, 90, 96], roofH: 0, shop: 0, attL: false, attR: false, sideWin: true, shut: 0 });
    }
    return;
  }
  const isCore = t === 'core' || t === 'haussmann' || t === 'chaletCore';
  if (isCore) {
    const dep = t === 'haussmann' ? 14 + rnd() * 2 : 11 + rnd() * 2;
    if (t !== 'chaletCore') {
      const ia0 = a0 + dep + 3.5, ia1 = a1 - dep - 3.5, ib0 = b0 + dep + 3.5, ib1 = b1 - dep - 3.5;
      if (ia1 - ia0 > 8 && ib1 - ib0 > 8) {
        drapeRect(T, ia0, ia1, ib0, ib1, 3, 0.17, 6);
        const nt = 2 + ((rnd() * 3) | 0);
        for (let k = 0; k < nt; k++) { const [tx, tz] = Wd(ia0 + 2 + rnd() * (ia1 - ia0 - 4), ib0 + 2 + rnd() * (ib1 - ib0 - 4)); TOWN_TREES.push({ sp: rnd() < 0.5 ? 'chene' : rnd() < 0.6 ? 'bouleau' : 'platane', x: tx, z: tz, s: 0.4 + rnd() * 0.25, col: [1, 1, 1] }); }
        for (const [ta, tb] of [[0.5, 0.08], [0.5, 0.92]]) { const [hx, hz] = Wd(ia0 + (ia1 - ia0) * ta, ib0 + (ib1 - ib0) * tb); HEDGES.push({ x: hx, z: hz, y: hAt(hx, hz), len: (ia1 - ia0) * 0.8, h: 1.0, dep: 0.8, rot: yawFor(T.U[0], T.U[1]) }); }
        if (typeof propAdd === 'function') { const [px, pz] = Wd((ia0 + ia1) / 2, (ib0 + ib1) / 2); propAdd(rnd() < 0.5 ? 'linge' : 'table_pique', px, hAt(px, pz) + 0.17, pz, rnd() * 6.28); const [qx, qz] = Wd(ia0 + 3, (ib0 + ib1) / 2); propAdd('banc', qx, hAt(qx, qz) + 0.17, qz, rnd() * 6.28); }
      }
    }
    for (const side of [0, 1, 2, 3]) {
      const F = sideFrame(side);
      const start = side >= 2 ? dep : 0, end = side >= 2 ? F.len - dep : F.len;
      let x = start;
      const lots = [];
      while (x < end - 4) {
        let w = t === 'haussmann' ? 13 + rnd() * 6 : t === 'chaletCore' ? 11 + rnd() * 3 : 7 + rnd() * 5;
        if (end - (x + w) < 6) w = end - x;
        lots.push([x, w]); x += w + (t === 'chaletCore' ? 3 + rnd() * 3 : 0);
      }
      lots.forEach(([lx, w], k) => {
        const first = k === 0, last = k === lots.length - 1;
        const exposedL = side < 2 && first, exposedR = side < 2 && last;
        let spec;
        if (t === 'haussmann') spec = { floors: 5 + ((rnd() * 2) | 0), style: 4, wall: [226, 214, 190], roofType: 2, roofCol: [96, 104, 116], roofH: 4.6, shop: 1, sideWin: true, shut: 0 };
        else if (t === 'chaletCore') spec = { floors: 2 + ((rnd() * 2) | 0), style: 1, wall: CHALET[(rnd() * CHALET.length) | 0], roofType: 0, roofCol: [238, 242, 248], roofH: 4.2 + rnd() * 1.4, shop: rnd() < 0.5 ? 1 : 0, sideWin: true, shut: shutC() };
        else { const dn = bk.dn; const fl = capital ? 3 + ((rnd() * 3) | 0) : sz >= 4 ? 2 + ((rnd() * 3) | 0) : 2 + ((rnd() * 2) | 0); spec = { floors: fl + (dn < 0.15 ? 1 : 0), style: 0, wall: wallCol(), roofType: 0, roofCol: roofCol(), roofH: 3.2 + rnd() * 1.6, shop: rnd() < (dn < 0.4 ? 0.8 : 0.35) ? 1 : 0, sideWin: true, shut: shutC() }; }
        const att = t !== 'chaletCore';
        place(F, lx, w, t === 'chaletCore' ? 1.5 : 0, side >= 2 ? Math.min(dep, (F.len) * 0.3) : dep, { ...spec, attL: att && !exposedL, attR: att && !exposedR });
      });
    }
    return;
  }
  if (t === 'mid') {
    for (const side of [0, 1, 2, 3]) {
      const F = sideFrame(side);
      const dep = 9 + rnd() * 2, set = 3;
      const start = side >= 2 ? dep + set + 2 : 0, end = side >= 2 ? F.len - dep - set - 2 : F.len;
      let x = start + 1;
      while (x < end - 8) {
        const w = Math.min(8 + rnd() * 4, end - x - 1), gap = 2 + rnd() * 3;
        place(F, x, w, set, dep, { floors: 2 + ((rnd() * 1.6) | 0), style: 0, wall: wallCol(), roofType: rnd() < 0.3 ? 1 : 0, roofCol: roofCol(), roofH: 3 + rnd() * 1.4, shop: 0, attL: false, attR: false, sideWin: true, shut: shutC() });
        // muret de jardin sur rue
        const ga = F.from[0] + F.dir[0] * (x + w / 2) + F.inw[0] * 0.3, gb = F.from[1] + F.dir[1] * (x + w / 2) + F.inw[1] * 0.3;
        const [gx, gz] = Wd(ga, gb); const dw = toWorldDir(F.dir);
        GWALLS.push({ x: gx, z: gz, y: hAt(gx, gz), len: w + gap, h: 0.9, dep: 0.35, rot: yawFor(dw[0], dw[1]) });
        if (rnd() < 0.5) { const ta = F.from[0] + F.dir[0] * (x + w / 2) + F.inw[0] * (set + dep + 4), tb = F.from[1] + F.dir[1] * (x + w / 2) + F.inw[1] * (set + dep + 4); const [tx, tz] = Wd(ta, tb); TOWN_TREES.push({ sp: rnd() < 0.5 ? 'chene' : 'bouleau', x: tx, z: tz, s: 0.38 + rnd() * 0.2, col: [1, 1, 1] }); }
        x += w + gap;
      }
    }
    return;
  }
  // pavillons (ou chalets) sur parcelles le long des deux grands côtés
  const chalet = t === 'chalet';
  for (const side of [0, 1]) {
    const F = sideFrame(side);
    const plotD = (b1 - b0) / 2;
    let x = 0;
    while (x < F.len - 14) {
      let pw = 18 + rnd() * 6; if (F.len - (x + pw) < 14) pw = F.len - x;
      const w = chalet ? 10 + rnd() * 3 : 9 + rnd() * 3, d = chalet ? 9 + rnd() * 2 : 8 + rnd() * 2;
      const set = 5 + rnd() * 2.5, side0 = 1.5 + rnd() * (pw - w - 5.5);
      const b = place(F, x + side0, w, set, d, chalet
        ? { floors: 2 + ((rnd() * 1.5) | 0), style: 1, wall: CHALET[(rnd() * CHALET.length) | 0], roofType: 0, roofCol: [238, 242, 248], roofH: 4 + rnd() * 1.6, shop: 0, attL: false, attR: false, sideWin: true, shut: shutC() }
        : { floors: 1 + ((rnd() * 1.7) | 0), style: 5, wall: wallCol(), roofType: rnd() < 0.6 ? 1 : 0, roofCol: roofCol(), roofH: 2.8 + rnd() * 1.2, shop: 0, attL: false, attR: false, sideWin: true, shut: shutC() });
      const dw = toWorldDir(F.dir), iw = toWorldDir(F.inw);
      const rotH = yawFor(dw[0], dw[1]);
      const at = (u, v) => Wd(F.from[0] + F.dir[0] * u + F.inw[0] * v, F.from[1] + F.dir[1] * u + F.inw[1] * v);
      // allée de garage (gravier) jusqu'au côté de la maison
      const dx0 = x + side0 + w + 0.6, dx1 = Math.min(x + pw - 0.8, dx0 + 3.2);
      if (b && dx1 - dx0 > 2.4) {
        const A = F.from, Dd = F.dir, I = F.inw;
        const ca0 = A[0] + Dd[0] * dx0, ca1 = A[0] + Dd[0] * dx1, cb0 = A[1] + Dd[1] * dx0, cb1 = A[1] + Dd[1] * dx1;
        const ia = I[0] * (set + d * 0.8), ib = I[1] * (set + d * 0.8);
        drapeRect(T, Math.min(ca0, ca1, ca0 + ia, ca1 + ia), Math.max(ca0, ca1, ca0 + ia, ca1 + ia), Math.min(cb0, cb1, cb0 + ib, cb1 + ib), Math.max(cb0, cb1, cb0 + ib, cb1 + ib), 4, 0.15, 6);
      }
      // haies : sur rue (sauf l'allée), entre parcelles, au fond
      const hedge = (u0, u1, v0, v1, hh) => { const [p0x, p0z] = at(u0, v0), [p1x, p1z] = at(u1, v1); const len = Math.hypot(p1x - p0x, p1z - p0z); if (len < 1) return; HEDGES.push({ x: (p0x + p1x) / 2, z: (p0z + p1z) / 2, y: hAt((p0x + p1x) / 2, (p0z + p1z) / 2), len, h: hh, dep: 0.8, rot: Math.atan2(-(p1z - p0z), p1x - p0x) }); };
      hedge(x + 0.4, Math.max(x + 0.5, dx0 - 0.3), 0.5, 0.5, 1.2);
      if (dx1 + 0.3 < x + pw - 0.4) hedge(dx1 + 0.3, x + pw - 0.4, 0.5, 0.5, 1.2);
      hedge(x + pw, x + pw, 1.2, plotD - 0.6, 1.5);
      hedge(x + 0.4, x + pw - 0.4, plotD - 0.4, plotD - 0.4, 1.7);
      for (let k = 0; k < 1 + ((rnd() * 2.2) | 0); k++) { const [tx, tz] = at(x + 3 + rnd() * (pw - 6), set + d + 3 + rnd() * Math.max(1, plotD - set - d - 6)); TOWN_TREES.push({ sp: chalet ? 'epicea' : (rnd() < 0.55 ? 'chene' : rnd() < 0.5 ? 'bouleau' : 'buisson'), x: tx, z: tz, s: chalet ? 0.5 : 0.36 + rnd() * 0.22, col: [1, 1, 1] }); }
      if (b) propsPlot(at, yawTo(iw[0], iw[1]), x, pw, set, d, side0, w, plotD, dx0, dx1, rnd);
      void rotH;
      x += pw;
    }
  }
}

// --- fermes isolées
export function placeFarms2(rnd) {
  let n = 0;
  for (let tries = 0; tries < 6000 && n < 140; tries++) {
    const x = (rnd() - 0.5) * WW * 0.9, z = (rnd() - 0.5) * HH * 0.9;
    if (clsAt(x, z) !== 1) continue;
    if (STATIONS.some(st => Math.hypot(x - st.x, z - st.z) < 800)) continue;
    const rot = rnd() * Math.PI, c = Math.cos(rot), s = Math.sin(rot);
    const s1 = siteOk(x, z, 14, 10, rot, 4); if (!s1) continue;
    const bx = x + c * 22, bz = z + s * 22;
    const s2 = siteOk(bx, bz, 20, 13, rot, 5); if (!s2) continue;
    const theta = yawFor(c, s);
    const T = { C: [x, z], U: [c, s], V: [-s, c], flip: (s * -s - c * c) < 0 };
    newDrape(x, z);
    drapeRect(T, -10, 36, -14, 14, 4, 0.12, 8);
    addBuilding({ x, z, lo: s1.lo, hi: s1.hi, w: 14, d: 10, theta, floors: 2, style: 0, wall: WALLS[(rnd() * WALLS.length) | 0], roofType: 0, roofCol: ROOFS[(rnd() * ROOFS.length) | 0], roofH: 3.8, shop: 0, attL: false, attR: false, sideWin: true, shut: (rnd() * SHUTTER_COLS.length) | 0, seed: rnd() });
    addBuilding({ x: bx, z: bz, lo: s2.lo, hi: s2.hi, w: 20, d: 13, theta, floors: 1, style: 3, hBarn: 6.2, wall: [150, 98, 62], roofType: 0, roofCol: [110, 104, 98], roofH: 4.6, shop: 0, attL: false, attR: false, sideWin: false, shut: 0, seed: rnd() });
    reserve(x, z, 10); reserve(bx, bz, 13);
    FARMS.push({ x, z, rot });
    n++;
  }
}

// --- matériaux
function wallMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, map: TEX.plaster, envMapIntensity: 0.5 });
  worldShading(m, {
    key: 'walls3', after: sh => {
      sh.uniforms.uDetR = DET_U; sh.uniforms.tStoneW = { value: TEX.stone }; sh.uniforms.tWoodW = { value: TEX.wood };
      sh.vertexShader = 'attribute vec4 aB1; attribute vec4 aB2; uniform float uDetR; varying vec4 vB1; varying vec4 vB2; varying vec3 vLoc; varying vec3 vNo; varying vec3 vSize; varying float vFar;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vLoc = position * sc; vNo = normal; vSize = sc; vB1 = aB1; vB2 = aB2;
        vFar = step(uDetR, distance(instanceMatrix[3].xyz, cameraPosition));`);
      sh.fragmentShader = `uniform sampler2D tStoneW, tWoodW; varying vec4 vB1; varying vec4 vB2; varying vec3 vLoc; varying vec3 vNo; varying vec3 vSize; varying float vFar; float glassF = 0.0; float litF = 0.0;
        float hb(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
        ` + sh.fragmentShader
        .replace('#include <map_fragment>', `
          // vB1 : style, rez (floorY), gh, fh ; vB2 : flags (1 attL, 2 attR, 4 sideWin, 8 shop), volets, graine, étages de façade
          vec3 tint = vColor.rgb;
          int style = int(vB1.x + 0.5);
          float floorY = vB1.y, gh = vB1.z, fh = vB1.w;
          int fl = int(vB2.x + 0.5);
          bool attL = mod(float(fl), 2.0) > 0.5, attR = mod(floor(float(fl) / 2.0), 2.0) > 0.5, sideWin = mod(floor(float(fl) / 4.0), 2.0) > 0.5, shop = mod(floor(float(fl) / 8.0), 2.0) > 0.5;
          vec3 wall = texture2D(map, vLoc.xy * 0.16 + vLoc.zy * 0.16).rgb * tint;
          float yRel = vLoc.y - floorY;
          if (abs(vNo.y) < 0.5) {
            bool sideX = abs(vNo.x) > 0.5;
            float u = sideX ? vLoc.z * sign(vNo.x) : -vLoc.x * sign(vNo.z);
            float L = sideX ? vSize.z : vSize.x;
            bool front = !sideX && vNo.z < 0.0;
            bool party = sideX && ((vNo.x < 0.0 && attL) || (vNo.x > 0.0 && attR)) && (style == 0 || style == 4);
            bool blind = sideX && !party && ((vNo.x < 0.0 && attL) || (vNo.x > 0.0 && attR) || !sideWin);
            // matières de base
            if (style == 4) { vec2 q = vec2((u + 40.0) / 1.1, vLoc.y / 0.5); q.x += floor(q.y) * 0.5; vec2 f = fract(q);
              float j = smoothstep(0.0, 0.03, f.x) * smoothstep(1.0, 0.97, f.x) * smoothstep(0.0, 0.06, f.y) * smoothstep(1.0, 0.94, f.y);
              wall = tint * (0.9 + 0.1 * hb(floor(q))) * mix(0.82, 1.0, j) * (0.92 + 0.08 * texture2D(map, vLoc.xy * 0.3 + vLoc.zy * 0.3).r); }
            if (style == 1 && yRel > gh) { float pl = fract((u + 40.0) / 0.24); wall = texture2D(tWoodW, vec2(u * 0.25, vLoc.y * 0.06)).rgb * tint * (0.86 + 0.14 * smoothstep(0.0, 0.12, pl)); }
            if (style == 1 && yRel <= gh) wall = texture2D(tStoneW, vec2(u, vLoc.y) * 0.25).rgb * vec3(0.95, 0.92, 0.88);
            if (style == 3) { float pl = fract((u + 40.0) / 0.3); wall = texture2D(tWoodW, vec2(u * 0.2, vLoc.y * 0.05)).rgb * tint * (0.8 + 0.2 * smoothstep(0.0, 0.1, pl)); }
            // soubassement, bandeaux, chaînages d'angle, salissures
            if (style != 2) {
              wall = mix(wall, texture2D(tStoneW, vec2(u, vLoc.y) * 0.3).rgb * vec3(0.72, 0.7, 0.66), step(yRel, 0.15));
              if (style == 0 || style == 5) { float sc2 = step(abs(yRel - gh + 0.05), 0.11) * step(1.0, float(int(vB2.w))) ; wall = mix(wall, wall * 1.12 + 0.03, sc2 * 0.8); }
              if (style == 0 || style == 4) { float q = step(L * 0.5 - 0.55, abs(u)) * step(0.5, fract(vLoc.y / 0.9)) * (blind ? 0.0 : 1.0); wall = mix(wall, wall * 0.84 + vec3(0.06), q * (style == 4 ? 0.0 : 0.8)); }
              float grime = smoothstep(2.2, 0.0, yRel) * 0.18 + smoothstep(vSize.y - 1.8, vSize.y, vLoc.y) * 0.08;
              wall *= 1.0 - grime * (0.6 + 0.4 * texture2D(map, vec2(u * 0.05, vLoc.y * 0.4)).r);
              if (vFar > 0.5 && style != 3) { float cor = step(vSize.y - 0.45, vLoc.y); wall = mix(wall, vec3(0.86, 0.83, 0.77) * tint.r, cor * 0.7); }
            }
            // fenêtres peintes (au loin, ou toujours pour les tours)
            if ((vFar > 0.5 || style == 2 || party) && !blind && style != 3) {
              if (style == 2) {
                vec2 c = vec2((u + L * 0.5) / 1.8, vLoc.y / fh); vec2 f = fract(c); vec2 id = floor(c);
                float inside = step(abs(u), L * 0.5 - 0.4) * step(gh, vLoc.y) * step(vLoc.y, vSize.y - 1.0);
                float win = step(0.06, f.x) * step(f.x, 0.94) * step(0.12, f.y) * step(f.y, 0.88) * inside;
                wall = mix(wall, vec3(0.18), (1.0 - win) * inside * 0.0);
                wall = mix(wall, mix(vec3(0.04, 0.07, 0.1), vec3(0.08, 0.12, 0.16), hb(id)), win);
                glassF = win; litF = step(hb(id + vec2(vB2.z * 37.0, sideX ? 3.0 : 0.0)), uLit) * win;
                if (yRel < gh && yRel > 0.2 && front) { wall = mix(wall, vec3(0.05, 0.07, 0.09), step(abs(u), L * 0.5 - 1.0)); glassF = 1.0; }
              } else {
                float bay = style == 4 ? 3.0 : style == 1 ? 3.1 : style == 5 ? 3.4 : 2.9;
                float ww = style == 4 ? 1.2 : style == 5 ? 1.15 : 1.1, wh = style == 4 ? 2.05 : style == 1 ? 1.35 : style == 5 ? 1.4 : 1.5, sill = style == 4 ? 0.6 : 0.95;
                float m = 1.0; float n = max(1.0, floor((L - 2.0 * m) / bay)); float sp = (L - 2.0 * m) / n;
                float k = floor((u + L * 0.5 - m) / sp); float lu = (u + L * 0.5 - m) - (k + 0.5) * sp;
                float flo = yRel < gh ? 0.0 : 1.0 + floor((yRel - gh) / fh);
                float y0 = flo < 0.5 ? 0.0 : gh + (flo - 1.0) * fh;
                float lv = yRel - y0 - (flo < 0.5 ? 0.85 : sill);
                float okk = step(0.0, k) * step(k, n - 1.0) * step(flo, vB2.w - 0.5);
                float win = step(abs(lu), ww * 0.5) * step(0.0, lv) * step(lv, wh) * okk;
                float frame = step(abs(lu), ww * 0.5 + 0.14) * step(-0.12, lv) * step(lv, wh + 0.14) * okk * (1.0 - win);
                float shopF = 0.0;
                if (shop && front && flo < 0.5) { shopF = step(abs(lu), sp * 0.5 - 0.25) * step(0.25, yRel) * step(yRel, gh - 0.9) * step(0.0, k) * step(k, n - 1.0); win = 0.0; frame = 0.0; }
                bool shutters = (style == 0 || style == 5 || style == 1) && vB2.y >= 0.0;
                float shut = shutters ? step(ww * 0.5 + 0.02, abs(lu)) * step(abs(lu), ww * 1.0 + 0.04) * step(0.0, lv) * step(lv, wh) * okk * (flo > 0.5 || !shop || !front ? 1.0 : 0.0) : 0.0;
                int si = int(vB2.y + 0.5);
                vec3 shutterCol = si == 0 ? vec3(0.027, 0.105, 0.045) : si == 1 ? vec3(0.034, 0.085, 0.19) : si == 2 ? vec3(0.18, 0.017, 0.025) : si == 3 ? vec3(0.3, 0.29, 0.23) : si == 4 ? vec3(0.55, 0.4, 0.15) : vec3(0.06, 0.14, 0.15);
                wall = mix(wall, vec3(0.86, 0.84, 0.78), frame);
                wall = mix(wall, shutterCol, shut);
                float lit = step(hb(vec2(k, flo) + vec2(vB2.z * 37.0, sideX ? 3.0 : 0.0)), uLit) * (win + shopF);
                wall = mix(wall, vec3(0.03, 0.035, 0.04), win);
                wall = mix(wall, vec3(0.05, 0.07, 0.08), shopF);
                glassF = max(win, shopF); litF = lit;
              }
            }
          } else if (vNo.y > 0.5) {
            wall = vec3(0.36, 0.35, 0.34) * (0.9 + 0.1 * texture2D(map, vLoc.xz * 0.1).r);
          }
          diffuseColor.rgb = wall;`)
        .replace('#include <color_fragment>', '')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(0.9, 0.15, glassF);')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = 0.0;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.62, 0.3) * litF * 3.2;');
    },
  });
  m.vertexColors = false;
  return m;
}
const DET_U = { value: 600 };
function roofMaterial3() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, map: TEX.plaster });
  worldShading(m, {
    key: 'roofs3', after: sh => {
      sh.vertexShader = 'attribute vec3 aWallC; attribute float aRK; attribute float aGable; varying vec3 vLocR; varying vec3 vNoR; varying vec3 vWallC; varying float vRK; varying float vGable;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 scr = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz)); vLocR = position * scr; vNoR = normal; vWallC = aWallC; vRK = aRK; vGable = aGable;`);
      sh.fragmentShader = 'varying vec3 vLocR; varying vec3 vNoR; varying vec3 vWallC; varying float vRK; varying float vGable; float rRough = 0.75;\nfloat hR(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }\n' + sh.fragmentShader
        .replace('#include <map_fragment>', '')
        .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 base = diffuseColor.rgb;
          if (vGable > 0.5) { // pignon : enduit du mur
            diffuseColor.rgb = vWallC * (0.9 + 0.1 * texture2D(map, vLocR.xy * 0.16).r); rRough = 0.9;
          } else {
            int rk = int(vRK + 0.5);
            float along = vLocR.z; float up = length(vec2(vLocR.x, vLocR.y));
            if (rk == 1) { // ardoise / zinc
              float seam = smoothstep(0.0, 0.04, fract(along / 0.5)) * smoothstep(1.0, 0.94, fract(along / 0.5));
              float rowS = fract(up / 0.28); vec2 idS = vec2(floor(along / 0.25 + floor(up / 0.28) * 0.5), floor(up / 0.28));
              float sl = (0.78 + 0.22 * smoothstep(0.0, 0.25, rowS)) * (1.0 - 0.3 * step(fract(along / 0.25 + floor(up / 0.28) * 0.5), 0.06));
              diffuseColor.rgb = base * (vRK > 0.5 && vRK < 1.5 && seam < 2.0 ? sl : 1.0) * (0.86 + 0.18 * hR(idS)); rRough = 0.42;
            } else if (rk == 2) { // neige sur chalet
              diffuseColor.rgb = base * (0.94 + 0.06 * hR(floor(vLocR.xz * 2.0))); rRough = 0.5;
            } else { // tuiles
              float row = fract(up / 0.36); vec2 id = vec2(floor(along / 0.3 + floor(up / 0.36) * 0.5), floor(up / 0.36));
              float tile = (0.74 + 0.26 * smoothstep(0.0, 0.3, row)) * (1.0 - 0.25 * step(fract(along / 0.3 + floor(up / 0.36) * 0.5), 0.07));
              diffuseColor.rgb = base * tile * (0.84 + 0.22 * hR(id)) * (0.9 + 0.1 * texture2D(map, vLocR.xz * 0.05).r);
            }
          } }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = rRough;');
    },
  });
  return m;
}
// pièces de façade : 0 pierre/couleur de sommet, 1 vitre, 2 peinture (couleur d'instance, lames), 3 store (rayures), 4 fer, 6 lanterne
function partsMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.9 });
  worldShading(m, {
    key: 'parts3', after: sh => {
      sh.uniforms.uDetR = DET_U;
      sh.vertexShader = 'attribute float aPart; attribute vec3 aBC; uniform float uDetR; varying float vPart; varying vec2 vUvP; varying float vSeedP; varying vec3 vIC;\n' + sh.vertexShader.replace('#include <color_vertex>', `vColor = vec3(1.0);
        #ifdef USE_COLOR
        vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
        vIC = instanceColor;
        #else
        vIC = vec3(1.0);
        #endif`).replace('#include <begin_vertex>', `#include <begin_vertex>
        vPart = aPart; vUvP = uv;
        #ifdef USE_INSTANCING
        vSeedP = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        if (aBC.x > -1e8 && distance(aBC, cameraPosition) > uDetR) transformed = vec3(0.0);
        #else
        vSeedP = 0.5;
        #endif`);
      sh.fragmentShader = 'varying float vPart; varying vec2 vUvP; varying float vSeedP; varying vec3 vIC; float pRough = 0.8; float pMetal = 0.0; vec3 pEmit = vec3(0.0);\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `
          int pt = int(vPart + 0.5);
          #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
          vec3 vc = vColor.rgb;
          #else
          vec3 vc = vec3(1.0);
          #endif
          vec3 ic = vIC;
          if (pt == 1) { diffuseColor.rgb = vec3(0.025, 0.03, 0.036); pRough = 0.06; float lit = step(vSeedP, uLit); pEmit = vec3(1.0, 0.62, 0.3) * lit * 2.6; }
          else if (pt == 2) { float sl = 0.82 + 0.18 * smoothstep(0.0, 0.25, fract(vUvP.y * 16.0)); diffuseColor.rgb = vc * ic * sl; pRough = 0.6; }
          else if (pt == 5) { diffuseColor.rgb = vc * ic; pRough = 0.85; }
          else if (pt == 3) { float st = step(0.5, fract(vUvP.x * 6.0)); diffuseColor.rgb = mix(ic, vec3(0.8, 0.78, 0.72), st); pRough = 0.85; }
          else if (pt == 4) { diffuseColor.rgb = vec3(0.035, 0.035, 0.04); pRough = 0.45; pMetal = 0.6; }
          else if (pt == 6) { diffuseColor.rgb = vec3(0.9, 0.85, 0.7); pEmit = vec3(1.0, 0.75, 0.42) * (0.2 + 5.0 * smoothstep(0.02, 0.4, uLit)); }
          else { diffuseColor.rgb = vc; }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = pRough;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = pMetal;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += pEmit;');
    },
  });
  m.customProgramCacheKey = () => 'parts3';
  return m;
}
// --- géométries unitaires (façade dans le plan z = 0, extérieur vers +z)
class PartGeo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.pt = []; }
  quad(a, b, c, d, n, col, part, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    const lc = linCol(col);
    for (const [q, t] of [[a, uv[0]], [b, uv[1]], [c, uv[2]], [a, uv[0]], [c, uv[2]], [d, uv[3]]]) { this.p.push(...q); this.n.push(...n); this.c.push(...lc); this.uv.push(...t); this.pt.push(part); }
  }
  // boîte sans face arrière (collée au mur) : centre, demi-tailles
  box(cx, cy, cz, hx, hy, hz, col, part, back = false, uvScale = 1) {
    const x0 = cx - hx, x1 = cx + hx, y0 = cy - hy, y1 = cy + hy, z0 = cz - hz, z1 = cz + hz;
    const U = [[0, 0], [uvScale, 0], [uvScale, 1], [0, 1]];
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, part, U);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, part);
    this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], col, part);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, part);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, part);
    if (back) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, part);
    return this;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.pt, 1));
    g.computeBoundingSphere();
    return g;
  }
}
function makeParts() {
  const STONE = [232, 226, 212], WHITE = [240, 238, 232], DARK = [40, 40, 44];
  const P = {};
  // fenêtre 1,1 × 1,5 : encadrement en saillie, vitre en retrait, croisillon, appui, linteau
  {
    const g = new PartGeo(), w = 0.55, h = 0.75, f = 0.13, dz = 0.07;
    g.box(0, h + f / 2, dz / 2, w + f, f / 2, dz / 2, STONE, 0).box(0, -h - f / 2, dz / 2, w + f, f / 2, dz / 2, STONE, 0);
    g.box(-w - f / 2, 0, dz / 2, f / 2, h, dz / 2, STONE, 0).box(w + f / 2, 0, dz / 2, f / 2, h, dz / 2, STONE, 0);
    g.quad([-w, -h, 0.01], [w, -h, 0.01], [w, h, 0.01], [-w, h, 0.01], [0, 0, 1], WHITE, 1);
    g.quad([-0.03, -h, 0.03], [0.03, -h, 0.03], [0.03, h, 0.03], [-0.03, h, 0.03], [0, 0, 1], WHITE, 0); g.quad([-w, h * 0.38 - 0.03, 0.03], [w, h * 0.38 - 0.03, 0.03], [w, h * 0.38 + 0.03, 0.03], [-w, h * 0.38 + 0.03, 0.03], [0, 0, 1], WHITE, 0);
    g.box(0, -h - f - 0.04, 0.1, w + f + 0.08, 0.05, 0.1, STONE, 0);
    g.box(0, h + f + 0.06, 0.06, w + f + 0.05, 0.07, 0.06, STONE, 0);
    P.win = g.geometry();
    for (const sd of [-1, 1]) g.box(sd * (w + 0.13 + 0.3), 0, 0.03, 0.29, h, 0.025, [255, 255, 255], 2);
    P.winS = g.geometry();
  }
  // volets (paire)
  {
    const g = new PartGeo(), w = 0.55, h = 0.75;
    for (const sd of [-1, 1]) g.box(sd * (w + 0.13 + 0.3), 0, 0.03, 0.29, h, 0.025, [255, 255, 255], 2);
    P.shut = g.geometry();
  }
  // porte d'entrée 1,2 × 2,4
  {
    const g = new PartGeo();
    g.box(0, 1.25, 0.04, 0.85, 0.06, 0.04, STONE, 0).box(-0.78, 0.6, 0.04, 0.07, 1.25, 0.04, STONE, 0).box(0.78, 0.6, 0.04, 0.07, 1.25, 0.04, STONE, 0);
    g.box(0, 0.45, 0.02, 0.7, 0.8, 0.02, [255, 255, 255], 2);
    g.quad([-0.7, 1.28, 0.01], [0.7, 1.28, 0.01], [0.7, 1.75, 0.01], [-0.7, 1.75, 0.01], [0, 0, 1], WHITE, 1);
    g.box(0, -0.42, 0.25, 1.0, 0.08, 0.25, STONE, 0);
    P.door = g.geometry();
  }
  // devanture de boutique (largeur 2,8) : vitrine, bandeau d'enseigne, store
  {
    const g = new PartGeo();
    g.quad([-1.25, 0.25, 0.02], [1.25, 0.25, 0.02], [1.25, 2.55, 0.02], [-1.25, 2.55, 0.02], [0, 0, 1], WHITE, 1);
    g.box(0, 0.12, 0.08, 1.4, 0.13, 0.08, DARK, 0).box(-1.33, 1.4, 0.06, 0.08, 1.3, 0.06, DARK, 0).box(1.33, 1.4, 0.06, 0.08, 1.3, 0.06, DARK, 0);
    g.box(0, 1.4, 0.04, 0.04, 1.15, 0.03, DARK, 0);
    g.box(0, 2.95, 0.1, 1.42, 0.32, 0.1, [255, 255, 255], 2);
    // store incliné
    const yA = 2.6, yB = 2.1, zB = 1.3;
    g.quad([-1.3, yB, zB], [1.3, yB, zB], [1.3, yA, 0.15], [-1.3, yA, 0.15], [0, 0.93, 0.36], [255, 255, 255], 3, [[0, 0], [1, 0], [1, 1], [0, 1]]);
    g.quad([-1.3, yA, 0.15], [1.3, yA, 0.15], [1.3, yB, zB], [-1.3, yB, zB], [0, -0.93, -0.36], [255, 255, 255], 3, [[0, 1], [1, 1], [1, 0], [0, 0]]);
    g.quad([-1.3, yB - 0.25, zB], [1.3, yB - 0.25, zB], [1.3, yB, zB], [-1.3, yB, zB], [0, 0, 1], [255, 255, 255], 3);
    P.shop = g.geometry();
  }
  // balcon filant (unité de 3 m) : dalle + garde-corps en fer
  {
    const g = new PartGeo();
    g.box(0, 0, 0.32, 1.5, 0.08, 0.32, STONE, 0);
    g.box(0, 1.0, 0.6, 1.5, 0.025, 0.025, DARK, 4).box(0, 0.12, 0.6, 1.5, 0.02, 0.02, DARK, 4);
    for (let k = -7; k <= 7; k++) g.box(k * 0.2, 0.55, 0.6, 0.012, 0.43, 0.012, DARK, 4);
    P.balc = g.geometry();
  }
  // balcon de chalet (unité 3 m) : bois plein
  {
    const g = new PartGeo(), WOOD = [150, 100, 60];
    g.box(0, 0, 0.55, 1.5, 0.1, 0.55, WOOD, 0);
    g.box(0, 0.55, 1.08, 1.5, 0.45, 0.03, WOOD, 0).box(0, 1.05, 1.08, 1.5, 0.05, 0.06, [120, 80, 50], 0);
    P.balcWood = g.geometry();
  }
  // corniche (unité 1 m de long, étirée)
  { const g = new PartGeo(); g.box(0, 0, 0.14, 0.5, 0.18, 0.14, [255, 255, 255], 5).box(0, 0.2, 0.24, 0.5, 0.05, 0.24, [255, 255, 255], 5); P.cornice = g.geometry(); }
  // lucarne
  {
    const g = new PartGeo(), Z = [150, 158, 170];
    g.box(0, 0.7, 0.35, 0.6, 0.7, 0.35, Z, 0, true);
    g.quad([-0.38, 0.35, 0.72], [0.38, 0.35, 0.72], [0.38, 1.25, 0.72], [-0.38, 1.25, 0.72], [0, 0, 1], WHITE, 1);
    g.quad([-0.75, 1.4, 0.8], [0.75, 1.4, 0.8], [0.0, 1.95, 0.8], [0.0, 1.95, 0.8], [0, 0, 1], Z, 0);
    g.quad([-0.75, 1.4, 0.8], [0.0, 1.95, 0.8], [0.0, 1.95, -0.2], [-0.75, 1.4, -0.2], [-0.6, 0.8, 0], Z, 0);
    g.quad([0.75, 1.4, -0.2], [0.0, 1.95, -0.2], [0.0, 1.95, 0.8], [0.75, 1.4, 0.8], [0.6, 0.8, 0], Z, 0);
    P.dormer = g.geometry();
  }
  // cheminée
  { const g = new PartGeo(); g.box(0, 0.9, 0, 0.45, 0.9, 0.3, [200, 186, 168], 0, true).box(0, 1.85, 0, 0.55, 0.06, 0.4, [150, 140, 130], 0, true); g.box(-0.18, 2.0, 0, 0.08, 0.12, 0.08, [140, 70, 50], 0, true).box(0.18, 2.0, 0, 0.08, 0.12, 0.08, [140, 70, 50], 0, true); P.chim = g.geometry(); }
  // réverbère
  {
    const g = new PartGeo(), I = [34, 38, 36];
    g.box(0, 0.25, 0, 0.14, 0.25, 0.14, I, 4, true).box(0, 2.3, 0, 0.055, 2.1, 0.055, I, 4, true).box(0, 4.45, 0, 0.12, 0.05, 0.12, I, 4, true);
    g.box(0, 4.82, 0, 0.2, 0.3, 0.2, [255, 255, 255], 6, true).box(0, 5.17, 0, 0.26, 0.05, 0.26, I, 4, true);
    P.lamp = g.geometry();
  }
  return P;
}
// --- maillages instanciés par tuile (pour le niveau de détail)
const PART_CHUNK = 350;
// Éléments de façade : fenêtres, volets, portes, balcons, corniches, cheminées, lucarnes, lampadaires.
// Ils se déduisent entièrement des bâtiments (aucun tirage au hasard) : on n'en garde aucune liste.
// Chaque tuile de 350 m recalcule les siens à la demande, dans le même ordre qu'un calcul global.
class PartSet {
  constructor() { this.map = new Map(); this.tx = 0; this.tz = 0; }
  begin(tx, tz) { this.map.clear(); this.tx = tx; this.tz = tz; }
  add(type, x, y, z, yaw, sx, sy, sz, col, bc) {
    if (Math.floor(x / PART_CHUNK) !== this.tx || Math.floor(z / PART_CHUNK) !== this.tz) return;
    let L = this.map.get(type); if (!L) this.map.set(type, L = []);
    L.push([x, y, z, yaw, sx, sy, sz, col, bc]);
  }
}
const PARTS = new PartSet();
export const PART_MESHES = [];   // une entrée par tuile : { mesh: groupe ou null, make, cx, cz }
const PART_TILES = new Map();    // "tx:tz" -> { tx, tz, blds: bâtiments dont l'emprise touche la tuile, lamps }
function partTile(tx, tz) {
  const k = tx + ':' + tz; let T = PART_TILES.get(k);
  if (!T) PART_TILES.set(k, T = { tx, tz, blds: [], lamps: [] });
  return T;
}
function makePartTile(T, G, partsMat) {
  PARTS.begin(T.tx, T.tz);
  for (const b of T.blds) addFacadeParts(b);
  for (let t = 0; t < 3; t++) for (const b of T.blds) if (b.roofType === t) addRoofParts(b, t);
  for (const L of T.lamps) PARTS.add('lamp', L.x, L.y, L.z, L.rot, 1, 1, 1, [255, 255, 255], [L.x, L.y, L.z]);
  const grp = new THREE.Group(), col = new THREE.Color();
  for (const [type, list] of PARTS.map) {
    const im = new THREE.InstancedMesh(G[type], partsMat, list.length);
    const bc = new Float32Array(list.length * 3);
    list.forEach((p, i) => {
      im.setMatrixAt(i, M(p[0], p[1], p[2], p[4], p[5], p[6], p[3]));
      const lc = linCol(p[7]); im.setColorAt(i, col.setRGB(lc[0], lc[1], lc[2]));
      if (p[8]) bc.set(p[8], i * 3); else bc.set([-1e9, 0, 0], i * 3);
    });
    im.geometry = im.geometry.clone();
    im.geometry.setAttribute('aBC', new THREE.InstancedBufferAttribute(bc, 3));
    im.computeBoundingSphere();
    im.castShadow = type === 'chim' || type === 'lamp' || type === 'balcWood'; im.receiveShadow = true;
    freeAfterUpload(null, [im.instanceMatrix, im.instanceColor, im.geometry.attributes.aBC]);
    grp.add(im);
  }
  PARTS.map.clear();
  return grp;
}
const _pm = new THREE.Matrix4();
export function buildTown3() {
  DET_U.value = Q.detailR || 600;
  const wallMat = wallMaterial(), roofMat = roofMaterial3(), partsMat = partsMaterial();
  const G = makeParts();
  const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
  const n = BUILDINGS.length;
  const B1 = new Float32Array(n * 4), B2 = new Float32Array(n * 4);
  const walls = new THREE.InstancedMesh(box, wallMat, n);
  const col = new THREE.Color();
  const roofsByType = [[], [], []];
  BUILDINGS.forEach((b, i) => {
    walls.setMatrixAt(i, M(b.x, b.base, b.z, b.w, b.h, b.d, b.theta));
    walls.setColorAt(i, col.setRGB(b.wall[0] / 255, b.wall[1] / 255, b.wall[2] / 255, THREE.SRGBColorSpace));
    const flags = (b.attL ? 1 : 0) + (b.attR ? 2 : 0) + (b.sideWin ? 4 : 0) + (b.shop ? 8 : 0);
    B1.set([b.style, b.floorY, b.gh, b.fh], i * 4);
    B2.set([flags, STYLE[b.style].shutters ? b.shut : -1, b.seed, b.wallFloors], i * 4);
    if (b.roofType < 3) roofsByType[b.roofType].push(b);
  });
  walls.geometry.setAttribute('aB1', new THREE.InstancedBufferAttribute(B1, 4));
  walls.geometry.setAttribute('aB2', new THREE.InstancedBufferAttribute(B2, 4));
  walls.computeBoundingSphere(); walls.castShadow = true; walls.receiveShadow = true; walls.frustumCulled = false; scenery.add(walls);
  freeAfterUpload(null, [walls.instanceMatrix, walls.instanceColor, walls.geometry.attributes.aB1, walls.geometry.attributes.aB2]);
  // toits
  const roofGeos = [gableGeo(), hipRoofGeo(), mansardGeo()];
  roofsByType.forEach((list, t) => {
    if (!list.length) return;
    const g = roofGeos[t].clone();
    const rm = new THREE.InstancedMesh(g, roofMat, list.length);
    const wc = new Float32Array(list.length * 3), rk = new Float32Array(list.length);
    list.forEach((b, i) => {
      const ovL = b.attL ? 0 : 0.35, ovR = b.attR ? 0 : 0.35, ovD = b.style === 1 ? 1.4 : t === 2 ? 0.1 : 0.45;
      const ovW = b.style === 1 ? 1.2 : 0;
      const len = b.w + ovL + ovR + ovW * 2, shift = (ovR - ovL) / 2;
      const c = Math.cos(b.theta), s = Math.sin(b.theta);
      const px = b.x + c * shift, pz = b.z - s * shift;
      rm.setMatrixAt(i, M(px, b.base + b.h - 0.02, pz, b.d + ovD * 2, b.roofH, len, b.theta + Math.PI / 2));
      rm.setColorAt(i, col.setRGB(b.roofCol[0] / 255, b.roofCol[1] / 255, b.roofCol[2] / 255, THREE.SRGBColorSpace));
      const lw = linCol(b.wall); wc.set(lw, i * 3);
      rk[i] = t === 2 ? 1 : b.style === 1 ? 2 : (b.roofCol[2] > b.roofCol[0] ? 1 : 0);
    });
    rm.geometry.setAttribute('aWallC', new THREE.InstancedBufferAttribute(wc, 3));
    rm.geometry.setAttribute('aRK', new THREE.InstancedBufferAttribute(rk, 1));
    rm.computeBoundingSphere(); rm.castShadow = true; rm.receiveShadow = true; rm.frustumCulled = false; scenery.add(rm);
    freeAfterUpload(null, [rm.instanceMatrix, rm.instanceColor, rm.geometry.attributes.aWallC, rm.geometry.attributes.aRK]);
  });
  // éléments de façade : chaque bâtiment est inscrit dans les tuiles que son emprise touche (les éléments restent dans l'emprise)
  for (const b of BUILDINGS) {
    const r = Math.hypot(b.w, b.d) / 2 + 1;
    for (let tx = Math.floor((b.x - r) / PART_CHUNK); tx <= Math.floor((b.x + r) / PART_CHUNK); tx++)
      for (let tz = Math.floor((b.z - r) / PART_CHUNK); tz <= Math.floor((b.z + r) / PART_CHUNK); tz++) partTile(tx, tz).blds.push(b);
  }
  for (const L of LAMPS) partTile(Math.floor(L.x / PART_CHUNK), Math.floor(L.z / PART_CHUNK)).lamps.push(L);
  lazyRankStart();
  for (const T of PART_TILES.values()) PART_MESHES.push({ mesh: null, rank: lazyRank(), make: () => makePartTile(T, G, partsMat), parent: scenery, own: true, cx: (T.tx + 0.5) * PART_CHUNK, cz: (T.tz + 0.5) * PART_CHUNK });
  console.log('PV tuiles de façade', PART_TILES.size, 'drape tris', DRAPE.p.length / 9, 'hedges', HEDGES.length, 'walls', GWALLS.length, 'lamps', LAMPS.length);
  // haies et murets
  const hedgeMat = hedgeMaterial();
  for (const [list, mat, cast] of [[HEDGES, hedgeMat, true], [GWALLS, worldShading(new THREE.MeshStandardMaterial({ map: TEX.stone, color: 0xd8d0c0, roughness: 0.9 }), { key: 'gwall' }), true]]) {
    if (!list.length) continue;
    const bx = new THREE.BoxGeometry(1, 1, 1); bx.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(bx, mat, list.length);
    list.forEach((h, i) => im.setMatrixAt(i, M(h.x, h.y - 0.1, h.z, h.len, h.h + 0.1, h.dep, h.rot)));
    im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; scenery.add(im);
  }
  // fontaines
  for (const f of FOUNTAINS) {
    const K = new Kit();
    K.on('stone').add('cyl24', M(0, 0.35, 0, 9, 0.7, 9), [214, 206, 192]).add('cyl24', M(0, 0.62, 0, 8.2, 0.1, 8.2), [70, 120, 130]);
    K.on('stone').add('cyl', M(0, 1.4, 0, 1.0, 2.2, 1.0), [214, 206, 192]).add('cyl24', M(0, 2.6, 0, 3.2, 0.3, 3.2), [214, 206, 192]).add('sph', M(0, 3.2, 0, 1, 1, 1), [214, 206, 192]);
    const g = K.group(); g.position.set(f.x, f.y, f.z); scenery.add(g);
  }
  // sol des villes (un maillage par ville, masqué au loin)
  const gmat = groundMaterial();
  for (const D of DRAPES) { if (!D.d.p.length) { D.d = null; continue; } const gg = D.d.geometry(); D.d = null; freeAfterUpload(gg); const gm = new THREE.Mesh(gg, gmat); gm.receiveShadow = true; scenery.add(gm); D.mesh = gm; }
}
function updateParts(camPos) {
  const R = DET_U.value + PART_CHUNK * 0.75;
  for (const p of PART_MESHES) { const d = Math.hypot(p.cx - camPos.x, p.cz - camPos.z); lazyShow(p, d < R, d > lazyFar(R)); }
}
// fabrique les tuiles à la demande voisines d'un point, sans toucher à la visibilité du reste du décor
export function prewarmTownTiles(camPos) { updateParts(camPos); updateProps(camPos); }
export function updateTownLOD(camPos) {
  updateParts(camPos);
  for (const D of DRAPES) if (D.mesh) D.mesh.visible = Math.hypot(D.x - camPos.x, D.z - camPos.z) < 4200;
  updateProps(camPos);
}
function hedgeMaterial() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); const rnd = mulberry(99);
  g.fillStyle = '#2c4a1e'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const x = rnd() * 256, y = rnd() * 256, l = 0.45 + rnd() * 0.55; g.fillStyle = `rgb(${(l * 90) | 0},${(l * 140) | 0},${(l * 60) | 0})`; g.beginPath(); g.ellipse(x, y, 3 + rnd() * 3, 1.6 + rnd() * 1.4, rnd() * 3, 0, 6.3); g.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.92 });
  worldShading(m, { key: 'hedge', after: sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `vec3 aw = abs(inverseTransformDirection(normalize(vNormal), viewMatrix)); vec2 huv = aw.y > 0.6 ? vWP.xz : (aw.x > aw.z ? vWP.zy : vWP.xy); diffuseColor *= texture2D(map, huv * 0.45);`); } });
  return m;
}
function gableGeo() {
  const g = TPL.roof.clone(); const nr = g.attributes.normal; const a = new Float32Array(nr.count);
  for (let i = 0; i < nr.count; i++) a[i] = Math.abs(nr.getZ(i)) > 0.9 ? 1 : 0;
  g.setAttribute('aGable', new THREE.Float32BufferAttribute(a, 1)); return g;
}
function hipRoofGeo() {
  const r = 0.3; // retrait du faîtage
  const A = [-0.5, 0, -0.5], B = [0.5, 0, -0.5], C = [0.5, 0, 0.5], D = [-0.5, 0, 0.5], E = [0, 1, -0.5 + r], F = [0, 1, 0.5 - r];
  const p = [...A, ...D, ...F, ...A, ...F, ...E, ...C, ...B, ...E, ...C, ...E, ...F, ...B, ...A, ...E, ...D, ...C, ...F];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  g.setAttribute('aGable', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3), 1));
  return g;
}
function mansardGeo() {
  // brisis raide puis terrasson peu pentu
  const i1 = 0.12, y1 = 0.78;
  const B0 = [[-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5]];
  const B1 = [[-0.5 + i1, y1, -0.5 + i1 * 0.5], [0.5 - i1, y1, -0.5 + i1 * 0.5], [0.5 - i1, y1, 0.5 - i1 * 0.5], [-0.5 + i1, y1, 0.5 - i1 * 0.5]];
  const T0 = [0, 1, -0.5 + 0.2], T1 = [0, 1, 0.5 - 0.2];
  const p = [];
  const quad = (a, b, c, d) => p.push(...a, ...b, ...c, ...a, ...c, ...d);
  for (let k = 0; k < 4; k++) { const a = B0[k], b = B0[(k + 1) % 4], c = B1[(k + 1) % 4], d = B1[k]; quad(a, d, c, b); }
  p.push(...B1[0], ...B1[3], ...T1, ...B1[0], ...T1, ...T0, ...B1[2], ...B1[1], ...T0, ...B1[2], ...T0, ...T1, ...B1[1], ...B1[0], ...T0, ...B1[3], ...B1[2], ...T1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
  g.setAttribute('aGable', new THREE.Float32BufferAttribute(new Float32Array(p.length / 3), 1));
  return g;
}
const _fp = [0, 0, 0, 0];
function addFacadeParts(b) {
  const S = STYLE[b.style];
  if (!S.bay) return;
  const shut = SHUTTER_COLS[b.shut % SHUTTER_COLS.length] || SHUTTER_COLS[0];
  const doorCol = DOOR_COLS[Math.floor(b.seed * 97) % DOOR_COLS.length];
  const awn = AWNING_COLS[Math.floor(b.seed * 131) % AWNING_COLS.length];
  const stoneTrim = b.style === 4 ? [236, 228, 210] : [234, 228, 216];
  const winSX = S.winW / 1.1, winSY = S.winH / 1.5;
  for (let face = 0; face < 4; face++) {
    const side = face >= 2;
    if (side && (!b.sideWin || (face === 2 && b.attL) || (face === 3 && b.attR))) continue;
    const L = side ? b.d : b.w;
    const { n, sp, m } = bays(L, S.bay);
    const doorBay = Math.floor(b.seed * 13) % n;
    for (let k = 0; k < n; k++) {
      const u = -L / 2 + m + (k + 0.5) * sp;
      for (let fl = 0; fl < b.wallFloors; fl++) {
        const y0 = b.floorY + (fl === 0 ? 0 : b.gh + (fl - 1) * b.fh);
        if (fl === 0 && face === 0) {
          if (b.shop) { facadePoint(b, face, u, y0, _fp); PARTS.add('shop', _fp[0], _fp[1], _fp[2], _fp[3], Math.min(1.15, (sp - 0.3) / 2.8), 1, 1, awn, b.bc); continue; }
          if (k === doorBay) { facadePoint(b, face, u, y0 + 0.42, _fp); PARTS.add('door', _fp[0], _fp[1], _fp[2], _fp[3], 1, 1, 1, doorCol, b.bc); continue; }
        }
        const yc = y0 + (fl === 0 ? 0.85 : S.sill) + S.winH / 2;
        facadePoint(b, face, u, yc, _fp);
        if (S.shutters && !(fl === 0 && b.shop)) PARTS.add('winS', _fp[0], _fp[1], _fp[2], _fp[3], winSX, winSY, 1, shut, b.bc);
        else PARTS.add('win', _fp[0], _fp[1], _fp[2], _fp[3], winSX, winSY, 1, [255, 255, 255], b.bc);
      }
      // balcons
      if (b.style === 4 && !side) for (const fl of [2, b.wallFloors - 1]) {
        if (fl < 1 || fl >= b.wallFloors) continue;
        const y0 = b.floorY + b.gh + (fl - 1) * b.fh + 0.05;
        facadePoint(b, face, u, y0, _fp); PARTS.add('balc', _fp[0], _fp[1], _fp[2], _fp[3], sp / 3.0, 1, 1, [255, 255, 255], b.bc);
      }
    }
    if (b.style === 1 && !side && b.wallFloors >= 2) { const y0 = b.floorY + b.gh + 0.02; facadePoint(b, face, 0, y0, _fp); PARTS.add('balcWood', _fp[0], _fp[1], _fp[2], _fp[3], (L - 1.6) / 3.0, 1, 1, [255, 255, 255], b.bc); }
    // corniche
    if (b.style === 0 || b.style === 4 || b.style === 5) { facadePoint(b, face, 0, b.h - 0.32, _fp); PARTS.add('cornice', _fp[0], _fp[1], _fp[2], _fp[3], L + (side ? 0 : 0.05), b.style === 4 ? 1.4 : 1, b.style === 4 ? 1.3 : 1, stoneTrim, b.bc); }
  }
}
function addRoofParts(b, t) {
  const c = Math.cos(b.theta), s = Math.sin(b.theta);
  const W = (lx, y, lz) => [b.x + c * lx + s * lz, b.base + y, b.z - s * lx + c * lz];
  // cheminées : sur les murs mitoyens pour les maisons en bande, sinon près du faîtage
  if (b.style !== 2 && b.style !== 3) {
    const xs = b.attL || b.attR ? [b.attL ? -b.w / 2 + 0.3 : null, b.attR ? b.w / 2 - 0.3 : null].filter(v => v !== null) : [b.seed > 0.4 ? b.w * 0.28 : -b.w * 0.25];
    for (const lx of xs) { const p = W(lx, b.h + b.roofH * (t === 2 ? 0.95 : 0.62), b.d * 0.05); PARTS.add('chim', p[0], p[1], p[2], b.theta, 1, 1 + b.roofH * 0.15, 1, [255, 255, 255], b.bc); }
  }
  // lucarnes des toits à la Mansart
  if (t === 2) {
    const { n, sp, m } = bays(b.w, 3.0);
    for (const face of [0, 1]) for (let k = 0; k < n; k++) {
      const u = -b.w / 2 + m + (k + 0.5) * sp;
      const lz = (face === 0 ? -1 : 1) * (b.d / 2 - 0.1 - 0.12 * b.d * 0.5);
      const lx = face === 0 ? -u : u;
      const p = W(lx, b.h + 0.15, lz);
      PARTS.add('dormer', p[0], p[1], p[2], b.theta + (face === 0 ? Math.PI : 0), 1, 1, 1, [255, 255, 255], b.bc);
    }
  }
}
