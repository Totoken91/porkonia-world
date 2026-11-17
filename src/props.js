// Décor de détail : mobilier urbain, commerces, industrie, campagne
import * as THREE from 'three';
import { hAt, worldShading, freeAfterUpload, Q, tmGet, waterAt, noiseAt, clsAt, slopeAt, STATIONS, clamp, WW, HH, hashStr } from './core.js';
import { SPOTS, PROPS, PROP_CHUNK, propAdd, PARKED, PROP_COLL, SMOKERS, CARS, groundAt, lazyShow, lazyFar, lazyRankStart, lazyRank } from './registry.js';
import { Geo, M, scenery, facadePoint, TOWN_TREES, HEDGES, signMesh, FARMS, freeSpot, reserve } from './scenery.js';

      // gros objets infranchissables : {x, z, r}
const TINTS = [[226, 44, 56], [250, 200, 40], [44, 120, 226], [56, 176, 96], [246, 130, 44], [156, 80, 200], [244, 130, 170], [60, 190, 200], [250, 246, 235], [123, 30, 46]];
const tintOf = rnd => TINTS[(rnd() * TINTS.length) | 0];
const propG = (x, z, dy = 0.12) => hAt(x, z) + dy;
export const yawTo = (dx, dz) => Math.atan2(dx, dz);
function spot(x, z, yaw) { SPOTS.push({ x, z, yaw }); }

// ---------- modèles (repère : posé sur y = 0, face vers +z ; dernier argument de teinte = zone coloriable)
export function propDefs() {
  const D = PROPS.defs;
  // la géométrie d'un modèle n'est fabriquée qu'à la première tuile qui l'affiche
  const def = (name, R, cast, fn) => { let geo = null; D[name] = { R, cast, get geo() { if (!geo) { const g = new Geo(); const o = {
    b: (x, y, z, sx, sy, sz, col, ry = 0, lf = 0) => (g.add('box', M(x, y, z, sx, sy, sz, ry), col, null, lf), o),
    c: (x, y, z, d, h, col, lf = 0, tpl = 'cyl') => (g.add(tpl, M(x, y, z, d, h, d), col, null, lf), o),
    m: (tpl, mat, col, lf = 0) => (g.add(tpl, mat, col, null, lf), o),
  }; fn(o); geo = g.geometry(); } return geo; } }; };
  const WOOD = [150, 104, 62], WOOD2 = [116, 78, 46], IRON = [44, 48, 46], STONE = [206, 198, 184], WHITE = [246, 242, 232], GREEN = [40, 110, 62], LEAF = [72, 150, 60], STEEL = [196, 202, 210], COPPER = [214, 128, 70], BRICK = [176, 84, 60], CONC = [198, 194, 186], SOIL = [96, 66, 44], GOLD = [232, 190, 80];
  def('banc', 150, false, o => { for (let k = 0; k < 3; k++) o.b(0, 0.46, -0.12 + k * 0.15, 1.7, 0.05, 0.12, WOOD); for (let k = 0; k < 2; k++) o.b(0, 0.72 + k * 0.17, -0.26, 1.7, 0.12, 0.05, WOOD); for (const x of [-0.7, 0.7]) o.b(x, 0.23, 0, 0.07, 0.46, 0.44, IRON).b(x, 0.62, -0.27, 0.07, 0.5, 0.06, IRON); });
  def('poubelle', 110, false, o => o.c(0, 0.45, 0, 0.5, 0.9, GREEN, 0, 'cyl').c(0, 0.93, 0, 0.56, 0.08, [30, 80, 46]).c(0, 0.6, 0, 0.52, 0.06, GOLD));
  def('jardiniere', 150, false, o => { o.b(0, 0.25, 0, 1.5, 0.5, 0.6, STONE).b(0, 0.52, 0, 1.36, 0.1, 0.46, LEAF); for (let k = 0; k < 7; k++) o.m('sph', M(-0.55 + k * 0.18, 0.62 + (k % 2) * 0.05, (k % 3 - 1) * 0.12, 0.2, 0.18, 0.2), [255, 255, 255], 1); });
  def('bouche', 110, false, o => o.c(0, 0.3, 0, 0.26, 0.6, [214, 40, 44]).m('sph', M(0, 0.62, 0, 0.3, 0.24, 0.3), [214, 40, 44]).b(0, 0.4, 0, 0.5, 0.12, 0.12, [214, 40, 44]));
  def('boite', 130, false, o => o.c(0, 0.5, 0, 0.1, 1.0, IRON).b(0, 1.2, 0, 0.5, 0.6, 0.34, [250, 200, 30]).b(0, 1.3, 0.175, 0.34, 0.05, 0.02, IRON));
  def('cabine', 220, true, o => { o.b(0, 1.15, 0, 1.0, 2.3, 1.0, [123, 30, 46]).b(0, 2.36, 0, 1.12, 0.14, 1.12, [90, 20, 34]); for (const [x, z, ry] of [[0, 0.505, 0], [0, -0.505, 0], [0.505, 0, Math.PI / 2], [-0.505, 0, Math.PI / 2]]) o.b(x, 1.3, z, 0.74, 1.5, 0.02, [150, 200, 226], ry); o.b(0, 2.2, 0.51, 0.8, 0.16, 0.02, GOLD); });
  def('abribus', 260, true, o => { for (const x of [-1.6, 1.6]) o.c(x, 1.2, -0.5, 0.1, 2.4, IRON); o.b(0, 2.45, 0, 3.8, 0.1, 1.5, [123, 30, 46]).b(0, 1.3, -0.52, 3.1, 1.7, 0.04, [150, 200, 226]).b(0, 0.46, -0.25, 2.4, 0.06, 0.36, WOOD).b(1.75, 1.5, 0.3, 0.06, 1.6, 0.8, [250, 200, 40]).c(-2.3, 1.4, 0.4, 0.07, 2.8, IRON).m('cyl24', M(-2.3, 2.7, 0.4, 0.6, 0.06, 0.6, 0, Math.PI / 2), [44, 120, 226]); });
  def('kiosque', 300, true, o => { o.c(0, 1.2, 0, 2.4, 2.4, GREEN, 0, 'cyl6').c(0, 2.5, 0, 3.0, 0.16, [30, 86, 50], 0, 'cyl6').m('cone', M(0, 3.0, 0, 2.6, 0.9, 2.6), [30, 86, 50]).m('sph', M(0, 3.5, 0, 0.3, 0.3, 0.3), GOLD).b(0, 1.25, 1.06, 1.4, 0.9, 0.06, [250, 240, 200]).b(0, 0.85, 1.2, 1.6, 0.06, 0.34, WOOD); for (let k = 0; k < 4; k++) o.b(-0.5 + k * 0.33, 1.25, 1.1, 0.26, 0.36, 0.02, TINTS[k]); });
  def('feu', 220, false, o => { o.c(0, 1.6, 0, 0.12, 3.2, IRON).b(0, 3.3, 0.06, 0.34, 0.95, 0.3, [30, 32, 30]); o.m('sph', M(0, 3.6, 0.2, 0.22, 0.22, 0.12), [230, 40, 40]).m('sph', M(0, 3.3, 0.2, 0.22, 0.22, 0.12), [250, 190, 30]).m('sph', M(0, 3.0, 0.2, 0.22, 0.22, 0.12), [50, 200, 90]); });
  def('stop', 170, false, o => o.c(0, 1.1, 0, 0.08, 2.2, STEEL).m('cyl', M(0, 2.3, 0.03, 0.74, 0.05, 0.74, 0, Math.PI / 2), [214, 40, 44]).m('cyl', M(0, 2.3, 0.045, 0.5, 0.05, 0.5, 0, Math.PI / 2), WHITE).b(0, 2.3, 0.075, 0.36, 0.1, 0.02, [214, 40, 44]));
  def('fleche', 170, false, o => o.c(0, 1.2, 0, 0.08, 2.4, STEEL).b(0.35, 2.2, 0, 1.1, 0.34, 0.05, [44, 100, 200]).b(-0.3, 1.8, 0, 0.9, 0.3, 0.05, WHITE));
  def('terrasse', 170, false, o => { o.c(0, 0.37, 0, 0.08, 0.74, IRON).c(0, 0.76, 0, 0.9, 0.05, WHITE, 0, 'cyl24').c(0, 0.03, 0, 0.5, 0.05, IRON); for (const [x, z] of [[-0.85, 0.1], [0.85, -0.1]]) o.b(x, 0.44, z, 0.42, 0.05, 0.42, [200, 60, 50]).b(x * 1.22, 0.7, z, 0.05, 0.5, 0.42, [200, 60, 50]).c(x, 0.22, z, 0.06, 0.44, IRON); o.c(0, 1.45, 0, 0.05, 1.4, WOOD2).m('cone', M(0, 2.3, 0, 2.5, 0.55, 2.5), [255, 255, 255], 1).m('cone', M(0, 2.33, 0, 1.3, 0.5, 1.3), WHITE).m('sph', M(0.1, 0.87, 0.05, 0.12, 0.2, 0.12), [230, 150, 40]); });
  def('ardoise', 110, false, o => o.b(0, 0.5, 0.1, 0.6, 0.95, 0.04, [30, 34, 32], 0).b(0, 0.5, -0.1, 0.6, 0.95, 0.04, WOOD).b(0, 0.62, 0.125, 0.44, 0.06, 0.01, WHITE).b(0, 0.48, 0.125, 0.36, 0.05, 0.01, WHITE).b(0, 0.34, 0.125, 0.4, 0.05, 0.01, [250, 200, 40]));
  def('enseigne', 190, false, o => o.b(0, 0.32, 0.4, 0.05, 0.05, 0.8, IRON).b(0, 0, 0.5, 0.07, 0.56, 0.7, [255, 255, 255], 0, 1).b(0, 0, 0.5, 0.09, 0.36, 0.5, WHITE).m('sph', M(0, 0, 0.5, 0.1, 0.24, 0.24), GOLD));
  def('caisses', 130, false, o => { for (const [x, y, z, t] of [[0, 0.22, 0, 0], [0.75, 0.22, 0.05, 1], [0.35, 0.66, 0, 2], [-0.7, 0.22, 0.1, 3]]) { o.b(x, y, z, 0.7, 0.44, 0.5, WOOD).b(x, y + 0.2, z, 0.6, 0.1, 0.4, [[214, 60, 50], [250, 190, 40], [90, 170, 70], [240, 140, 60]][t]); } });
  def('tonneaux', 150, false, o => { for (const [x, y] of [[-0.45, 0.42], [0.45, 0.42], [0, 1.2]]) { o.m('cyl24', M(x, y, 0, 0.84, 1.1, 0.84, 0, Math.PI / 2), WOOD); for (const dz of [-0.36, 0.36]) o.m('cyl24', M(x, y, dz, 0.88, 0.07, 0.88, 0, Math.PI / 2), IRON); } });
  def('futs', 150, false, o => { for (const [x, z, y] of [[0, 0, 0.3], [0.62, 0, 0.3], [0.31, 0.5, 0.3], [0.31, 0.17, 0.9]]) o.c(x, y, z, 0.56, 0.6, STEEL, 0, 'cyl24').c(x, y + 0.27, z, 0.6, 0.06, [150, 156, 164], 0, 'cyl24').c(x, y - 0.27, z, 0.6, 0.06, [150, 156, 164], 0, 'cyl24'); });
  def('etal', 260, true, o => { for (const [x, z] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.8], [1.5, 0.8]]) o.c(x, 1.2, z, 0.07, 2.4, WOOD2); o.b(0, 0.8, 0.1, 3.0, 0.08, 1.3, WOOD);
    for (let k = 0; k < 6; k++) o.b(-1.375 + k * 0.55, 2.5 - 0.0, 0, 0.55, 0.06, 2.2, k % 2 ? WHITE : [255, 255, 255], 0, k % 2 ? 0 : 1); for (let k = 0; k < 6; k++) o.b(-1.375 + k * 0.55, 2.3, 1.1, 0.55, 0.36, 0.04, k % 2 ? WHITE : [255, 255, 255], 0, k % 2 ? 0 : 1);
    for (let k = 0; k < 5; k++) o.b(-1.2 + k * 0.6, 0.95, 0.15, 0.5, 0.2, 0.9, WOOD2).b(-1.2 + k * 0.6, 1.07, 0.15, 0.42, 0.1, 0.8, [[214, 60, 50], [250, 190, 40], [90, 170, 70], [240, 150, 170], [236, 120, 50]][k]); });
  def('parterre', 170, false, o => { o.m('sph', M(0, 0.05, 0, 3.0, 0.5, 3.0), LEAF); for (let k = 0; k < 14; k++) { const a = k * 2.4, r = 0.3 + (k % 5) * 0.24; o.m('sph', M(Math.cos(a) * r, 0.3, Math.sin(a) * r, 0.34, 0.26, 0.34), [255, 255, 255], k % 3 ? 1 : 0); } });
  def('kiosque_musique', 500, true, o => { o.c(0, 0.4, 0, 9, 0.8, STONE, 0, 'cyl24'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; o.c(Math.cos(a) * 3.9, 2.4, Math.sin(a) * 3.9, 0.2, 3.2, WHITE); } o.c(0, 4.1, 0, 9.4, 0.2, [123, 30, 46], 0, 'cyl24').m('cone', M(0, 5.3, 0, 9.4, 2.2, 9.4), [123, 30, 46]).m('sph', M(0, 6.6, 0, 0.6, 0.6, 0.6), GOLD); for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * 6.283; o.b(Math.cos(a) * 3.9, 1.25, Math.sin(a) * 3.9, 3.0, 0.08, 0.08, IRON, -a + Math.PI / 2); } });
  def('jeux', 260, true, o => { o.b(0, 1.0, 0, 0.9, 0.1, 0.9, [250, 200, 40]); for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) o.c(x, 0.5, z, 0.08, 1.0, [44, 120, 226]); o.m('box', M(0, 0.55, 1.5, 0.7, 0.06, 2.4, 0, 0.42), [226, 44, 56]).b(0, 0.5, -0.9, 0.6, 0.05, 1.0, WOOD, 0);
    for (const x of [3.0, 5.0]) o.c(x, 1.2, 0, 0.09, 2.4, [56, 176, 96]); o.b(4, 2.4, 0, 2.2, 0.09, 0.09, [56, 176, 96]); for (const x of [3.6, 4.4]) o.b(x, 1.5, 0, 0.02, 1.8, 0.02, IRON); o.b(4, 0.6, 0, 0.9, 0.05, 0.3, [226, 44, 56]); });
  def('table_pique', 170, false, o => o.b(0, 0.76, 0, 1.8, 0.07, 0.8, WOOD).b(0, 0.45, 0.62, 1.8, 0.06, 0.28, WOOD).b(0, 0.45, -0.62, 1.8, 0.06, 0.28, WOOD).b(-0.7, 0.38, 0, 0.08, 0.76, 1.4, WOOD2).b(0.7, 0.38, 0, 0.08, 0.76, 1.4, WOOD2));
  def('abri', 260, true, o => { o.b(0, 1.0, 0, 2.4, 2.0, 2.0, [255, 255, 255], 0, 1).m('roof', M(0, 2.0, 0, 2.5, 0.8, 2.8, Math.PI / 2), [80, 70, 64]).b(0, 0.95, 1.01, 0.8, 1.7, 0.03, WOOD2).b(0.8, 1.3, 1.01, 0.5, 0.5, 0.03, [150, 200, 226]); });
  def('potager', 150, false, o => { o.b(0, 0.05, 0, 4.0, 0.1, 3.0, SOIL); for (let r = 0; r < 4; r++) for (let k = 0; k < 6; k++) o.m('sph', M(-1.6 + k * 0.64, 0.2, -1.1 + r * 0.74, 0.36, 0.3 + (r % 2) * 0.16, 0.36), r === 1 ? [226, 80, 50] : r === 3 ? [240, 160, 50] : LEAF); for (const x of [-1.9, 1.9]) o.c(x, 0.5, 1.3, 0.05, 1.0, WOOD2); });
  def('linge', 170, false, o => { for (const x of [-2, 2]) o.c(x, 0.95, 0, 0.07, 1.9, WOOD2).b(x, 1.85, 0, 0.06, 0.06, 0.8, WOOD2); o.b(0, 1.86, 0, 4, 0.015, 0.015, WHITE); o.b(-1.2, 1.5, 0, 0.8, 0.7, 0.02, [255, 255, 255], 0, 1).b(-0.2, 1.4, 0, 0.6, 0.9, 0.02, WHITE).b(0.6, 1.55, 0, 0.5, 0.6, 0.02, [255, 255, 255], 0, 1).b(1.3, 1.45, 0, 0.6, 0.8, 0.02, [150, 200, 226]); });
  def('piscine', 150, false, o => o.c(0, 0.2, 0, 3.0, 0.4, [60, 130, 220], 0, 'cyl24').c(0, 0.36, 0, 2.8, 0.1, [130, 215, 240], 0, 'cyl24').m('torus', M(0.5, 0.42, 0.3, 0.7, 0.7, 0.7, 0, Math.PI / 2), [250, 200, 40]));
  // industrie
  def('silos', 4000, true, o => { for (const [x, z] of [[-4, -2.2], [4, -2.2], [0, 2.2]]) { o.c(x, 10, z, 7, 20, CONC, 0, 'cyl24').m('cone', M(x, 21.2, z, 7.2, 2.4, 7.2), [170, 170, 176]).c(x, 22.8, z, 1.2, 1.0, STEEL); for (const y of [4, 9, 14, 19]) o.c(x, y, z, 7.1, 0.25, [170, 166, 158], 0, 'cyl24'); } o.b(0, 23.6, 0, 9.5, 0.5, 1.2, [123, 30, 46]).m('box', M(7, 11.5, 2.2, 1.0, 1.0, 24, 0, 0.0, 0), STEEL).b(-7.6, 11, -2.2, 0.5, 22, 0.5, IRON); });
  def('cuves', 4000, true, o => { for (const [x, z, h] of [[-3.2, -1.6, 11], [3.2, -1.6, 11], [-3.2, 3.0, 8.5], [3.2, 3.0, 8.5]]) { o.c(x, h / 2 + 1.5, z, 4.2, h, STEEL, 0, 'cyl24').m('cone', M(x, h + 2.2, z, 4.2, 1.4, 4.2), STEEL).m('cone', M(x, 1.0, z, 4.2, 1.2, 4.2, 0, Math.PI), STEEL).c(x, h + 3.2, z, 0.5, 0.8, [150, 156, 164]); for (const [dx, dz] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) o.c(x + dx, 0.75, z + dz, 0.22, 1.5, IRON); o.c(x, h * 0.6, z, 4.26, 0.3, [123, 30, 46], 0, 'cyl24'); } o.b(0, 9.2, 0.7, 7, 0.4, 0.4, COPPER).b(0, 6.0, 0.7, 0.4, 6.4, 0.4, COPPER).b(0, 12.6, -1.6, 9.5, 0.12, 1.4, IRON); });
  def('alambic', 3000, true, o => { o.c(0, 1.0, 0, 5.0, 2.0, BRICK, 0, 'cyl24').m('sph', M(0, 3.2, 0, 4.8, 4.6, 4.8), COPPER).c(0, 5.9, 0, 1.3, 1.8, COPPER, 0, 'cyl24').m('sph', M(0, 7.2, 0, 1.9, 1.5, 1.9), COPPER).m('box', M(1.9, 8.1, 0, 3.6, 0.36, 0.36, 0, 0, -0.35), COPPER).c(3.6, 4.6, 0, 1.3, 6.0, COPPER, 0, 'cyl24').c(0, 2.2, 0, 4.86, 0.2, GOLD, 0, 'cyl24'); });
  def('cheminee', 5000, true, o => { o.b(0, 2.0, 0, 3.6, 4.0, 3.6, BRICK); for (let k = 0; k < 9; k++) { const d = 2.9 - k * 0.16; o.c(0, 5.4 + k * 2.8, 0, d, 2.82, k % 4 === 3 ? WHITE : BRICK, 0, 'cyl24'); } o.c(0, 30.4, 0, 1.9, 0.5, [100, 50, 40], 0, 'cyl24'); });
  def('hangar', 2500, true, o => { o.b(0, 3.2, 0, 22, 6.4, 13, [255, 255, 255], 0, 1).m('roof', M(0, 6.4, 0, 13.6, 2.6, 22.6, Math.PI / 2), [150, 154, 160]).b(-4, 2.4, 6.52, 5.0, 4.8, 0.06, [70, 74, 80]).b(5, 1.2, 6.52, 1.2, 2.4, 0.06, [70, 74, 80]); for (let k = 0; k < 5; k++) o.b(-8 + k * 4, 5.3, 6.52, 2.0, 0.9, 0.05, [150, 200, 226]); o.b(0, 0.5, 0, 22.2, 1.0, 13.2, CONC); });
  def('conteneurs', 2000, true, o => { const cs = [[226, 44, 56], [44, 120, 226], [250, 200, 40], [56, 176, 96], [246, 130, 44]]; let k = 0; for (const [x, y, z] of [[0, 1.3, 0], [0, 1.3, 2.7], [0, 3.9, 0.6], [6.4, 1.3, 0.4], [6.4, 3.9, 0.4], [6.4, 1.3, 3.1]]) { o.b(x, y, z, 6.1, 2.55, 2.45, cs[k++ % 5]); for (let q = 0; q < 9; q++) o.b(x - 2.6 + q * 0.65, y, z + 1.23, 0.12, 2.3, 0.04, [40, 40, 44]); } });
  def('grue', 5000, true, o => { const Y = [250, 200, 40]; for (const [x, z] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) o.c(x, 9, z, 0.7, 18, Y); o.b(0, 18.3, 0, 9.4, 1.0, 7.4, Y).b(0, 20.4, 0, 3, 3.2, 3, [123, 30, 46]).m('box', M(0, 24, 8, 1.2, 1.2, 30, 0, -0.18), Y).m('box', M(0, 22.5, -5, 1.4, 1.4, 9, 0, 0.25), Y).b(0, 17, 19, 0.12, 11, 0.12, IRON).b(0, 11.4, 19, 2.6, 0.5, 1.2, IRON).b(0, 9.4, 0, 9.4, 0.5, 0.5, Y); });
  def('chateau_eau', 6000, true, o => { o.c(0, 11, 0, 3.0, 22, CONC, 0, 'cyl24'); o.m('cone', M(0, 23.5, 0, 12, 5, 12, 0, Math.PI), CONC).c(0, 28.5, 0, 12, 5.2, WHITE, 0, 'cyl24').m('cone', M(0, 31.8, 0, 12, 1.4, 12), [150, 154, 160]).c(0, 27.4, 0, 12.1, 1.0, [123, 30, 46], 0, 'cyl24').m('sph', M(0, 32.6, 0, 0.8, 0.8, 0.8), GOLD); });
  // campagne et côtes
  def('barque', 700, false, o => { o.m('sph', M(0, 0.1, 0, 1.7, 0.9, 4.6), [255, 255, 255], 1).b(0, 0.42, 0, 1.3, 0.1, 3.4, WOOD).b(0, 0.5, 0.4, 1.4, 0.06, 0.3, WOOD2).b(0, 0.5, -0.9, 1.3, 0.06, 0.3, WOOD2); });
  def('voilier', 1600, true, o => { o.m('sph', M(0, 0.2, 0, 2.6, 1.6, 8.6), WHITE).b(0, 0.95, -0.6, 1.8, 0.7, 3.0, [255, 255, 255], 0, 1).c(0, 6.2, 0.6, 0.14, 11, WOOD2).m('box', M(0.03, 6.4, -1.2, 0.03, 8.6, 3.4, 0, 0, 0), WHITE).m('box', M(-0.03, 5.0, 2.3, 0.03, 6.4, 2.6), [255, 255, 255], 1).b(0, 1.9, -1.2, 0.08, 0.08, 3.6, WOOD2); });
  def('ponton', 500, false, o => { o.b(0, 0.5, 0, 2.6, 0.14, 16, WOOD); for (let k = 0; k < 6; k++) for (const x of [-1.2, 1.2]) o.c(x, -0.3, -7.4 + k * 2.96, 0.24, 2.2, WOOD2); });
  def('cloture', 190, false, o => { for (const x of [-3, 0, 3]) o.b(x, 0.55, 0, 0.14, 1.1, 0.14, WOOD2); o.b(0, 0.85, 0, 6.1, 0.1, 0.06, WOOD).b(0, 0.45, 0, 6.1, 0.1, 0.06, WOOD); });
  def('vigne', 320, false, o => { for (const x of [-4, 0, 4]) o.b(x, 0.7, 0, 0.1, 1.4, 0.1, WOOD2); o.b(0, 1.2, 0, 8.1, 0.02, 0.02, IRON); for (let k = 0; k < 8; k++) o.m('sph', M(-3.5 + k, 0.95, 0, 1.0, 0.9, 0.6), k % 2 ? LEAF : [90, 160, 60]).m('sph', M(-3.5 + k, 0.62, 0.22, 0.2, 0.26, 0.2), [110, 50, 130]); });
  def('houblon', 420, false, o => { for (const x of [-3, 0, 3]) { o.c(x, 3, 0, 0.12, 6, WOOD2).m('cone', M(x, 2.9, 0, 1.5, 5.4, 1.5), [80, 160, 60]); } o.b(0, 5.9, 0, 6.2, 0.03, 0.03, IRON); });
  def('epouvantail', 220, false, o => o.c(0, 1.0, 0, 0.08, 2.0, WOOD2).b(0, 1.5, 0, 1.6, 0.08, 0.08, WOOD2).b(0, 1.35, 0, 0.6, 0.7, 0.3, [255, 255, 255], 0, 1).m('sph', M(0, 2.0, 0, 0.44, 0.44, 0.44), [236, 200, 150]).m('cone', M(0, 2.36, 0, 0.8, 0.4, 0.8), [200, 160, 60]));
  def('tracteur', 420, true, o => { o.b(0, 1.25, 0.5, 1.2, 0.8, 2.2, [255, 255, 255], 0, 1).b(0, 2.1, -0.5, 1.3, 1.3, 1.3, [255, 255, 255], 0, 1).b(0, 2.2, -0.5, 1.34, 0.8, 1.1, [150, 200, 226]).c(0.35, 2.5, 1.2, 0.12, 1.2, IRON); for (const x of [-0.85, 0.85]) { o.m('cyl24', M(x, 0.85, -0.7, 1.7, 0.5, 1.7, 0, 0, Math.PI / 2), [26, 26, 28]).m('cyl24', M(x * 1.2, 0.85, -0.7, 0.8, 0.14, 0.8, 0, 0, Math.PI / 2), [250, 200, 40]).m('cyl24', M(x, 0.5, 1.3, 1.0, 0.36, 1.0, 0, 0, Math.PI / 2), [26, 26, 28]).m('cyl24', M(x * 1.16, 0.5, 1.3, 0.46, 0.1, 0.46, 0, 0, Math.PI / 2), [250, 200, 40]); } });
  def('delineateur', 110, false, o => o.b(0, 0.5, 0, 0.12, 1.0, 0.06, WHITE).b(0, 0.82, 0.035, 0.1, 0.16, 0.01, [226, 44, 56]));
  def('poteau', 320, false, o => o.c(0, 4, 0, 0.22, 8, WOOD2).b(0, 7.4, 0, 2.0, 0.12, 0.12, WOOD2).c(-0.8, 7.6, 0, 0.12, 0.2, STEEL).c(0.8, 7.6, 0, 0.12, 0.2, STEEL));
  def('serre', 900, true, o => { o.m('cyl24', M(0, 0, 0, 7, 14, 4.6, 0, Math.PI / 2), [214, 236, 240]); for (let k = 0; k < 6; k++) o.m('cyl24', M(0, 0, -6.6 + k * 2.64, 7.1, 0.16, 4.7, 0, Math.PI / 2), WHITE); });
  def('siloferme', 1500, true, o => o.c(0, 5, 0, 3.6, 10, [255, 255, 255], 1, 'cyl24').m('hemi', M(0, 10, 0, 3.6, 2.6, 3.6), STEEL).c(0, 3, 0, 3.66, 0.2, WHITE, 0, 'cyl24').c(0, 7, 0, 3.66, 0.2, WHITE, 0, 'cyl24'));
  def('montgolfiere', 9000, false, o => { o.m('sph', M(0, 9, 0, 13, 15, 13), [255, 255, 255], 1).c(0, 9, 0, 13.15, 2.2, WHITE, 0, 'cyl24').c(0, 13.4, 0, 9.9, 1.2, WHITE, 0, 'cyl24').c(0, 4.6, 0, 9.9, 1.2, WHITE, 0, 'cyl24').m('sph', M(0, 16.2, 0, 3, 1, 3), GOLD); o.m('cone', M(0, 1.6, 0, 6.5, 4.4, 6.5, 0, Math.PI), [255, 255, 255], 1).b(0, -2.2, 0, 2.0, 1.4, 2.0, WOOD); for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) o.b(x, -0.7, z, 0.04, 2.2, 0.04, IRON); });
  def('panneau_pub', 600, true, o => { for (const x of [-2.6, 2.6]) o.c(x, 2, 0, 0.2, 4, IRON); o.b(0, 5.0, 0, 7.2, 3.4, 0.2, [123, 30, 46]).b(0, 5.0, 0.11, 6.8, 3.0, 0.02, [250, 240, 205]).m('cyl24', M(-1.6, 5.0, 0.14, 1.9, 0.04, 1.9, 0, Math.PI / 2), [232, 150, 40]).m('cyl24', M(-1.6, 5.75, 0.15, 2.0, 0.05, 0.7, 0, Math.PI / 2), WHITE).b(1.4, 5.5, 0.13, 3.0, 0.5, 0.02, [123, 30, 46]).b(1.4, 4.6, 0.13, 2.2, 0.3, 0.02, [232, 150, 40]); });
}
// la sphère « grillagée » de la montgolfière : six fuseaux blancs — on ne garde qu'une tranche fine de chaque sphère
function propsMaterial() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, envMapIntensity: 0.6 });
  worldShading(m, {
    key: 'props', after: sh => {
      sh.vertexShader = 'attribute float aLeaf;\n' + sh.vertexShader.replace('#include <color_vertex>', `vColor = vec3(1.0);
        #ifdef USE_COLOR
        vColor *= color;
        #endif
        #ifdef USE_INSTANCING_COLOR
        vColor *= mix(vec3(1.0), instanceColor, aLeaf);
        #endif`);
    },
  });
  m.customProgramCacheKey = () => 'props';
  return m;
}
export function buildProps() {
  const mat = propsMaterial(), col = new THREE.Color(), grp = new THREE.Group();
  lazyRankStart();
  for (const [, L] of PROPS.map) {
    const d = PROPS.defs[L.type]; if (!d) continue;
    const list = L.list;
    const make = () => {
    const im = new THREE.InstancedMesh(d.geo, mat, list.length);
    list.forEach((p, i) => { im.setMatrixAt(i, M(p[0], p[1], p[2], p[4], p[4], p[4], p[3])); const t = p[5] || [255, 255, 255]; im.setColorAt(i, col.setRGB(t[0] / 255, t[1] / 255, t[2] / 255, THREE.SRGBColorSpace)); });
    im.computeBoundingSphere(); im.castShadow = d.cast; im.receiveShadow = true;
    freeAfterUpload(null, [im.instanceMatrix, im.instanceColor]);
    return im;
    };
    PROPS.meshes.push({ mesh: null, make, parent: grp, rank: lazyRank(), cx: (Math.floor(L.list[0][0] / PROP_CHUNK) + 0.5) * PROP_CHUNK, cz: (Math.floor(L.list[0][2] / PROP_CHUNK) + 0.5) * PROP_CHUNK, R: d.R * (Q.propK || 1) + PROP_CHUNK * 0.72 });
  }
  PROPS.map.clear();
  scenery.add(grp);
  return PROPS.n;
}
export function updateProps(camPos) {
  for (const p of PROPS.meshes) {
    const d = Math.hypot(p.cx - camPos.x, p.cz - camPos.z);
    if (p.make) lazyShow(p, d < p.R, d > lazyFar(p.R)); else p.mesh.visible = d < p.R;
  }
}

// ---------- placement : trottoirs
export function propsSidewalk(o) {
  const { W, T, horiz, c, s0, s1, hw, sw, sg, main, core, mont, rnd, size } = o;
  const Wl = (t, lat) => horiz ? W(t, c + lat) : W(c + lat, t);
  const n = horiz ? T.V : T.U, u = horiz ? T.U : T.V;
  const face = yawTo(-sg * n[0], -sg * n[1]), along = yawTo(u[0], u[1]);
  const put = (type, t, lat, yaw, s = 1, tint = null, dy = 0.2) => { const [x, z] = Wl(t, lat); propAdd(type, x, propG(x, z, dy), z, yaw, s, tint); return [x, z]; };
  const inner = sg * (hw + sw - 0.5), curb = sg * (hw + 0.55), L = s1 - s0;
  if (sw >= 2.5) for (let t = s0 + 21; t < s1 - 6; t += 26) {
    if (rnd() < (core ? 0.75 : 0.4)) { const [x, z] = put('banc', t, inner, face); if (rnd() < 0.45) spot(x - sg * n[0] * 0.9, z - sg * n[1] * 0.9, face); }
    if (rnd() < 0.5) put('poubelle', t + 2.2, inner, face);
  }
  if ((main || core) && !mont) for (let t = s0 + 14.5; t < s1 - 4; t += 15) if (rnd() < 0.7) put('jardiniere', t, curb + sg * 0.25, along, 1, tintOf(rnd));
  if (rnd() < 0.3) put('bouche', s0 + 5 + rnd() * (L - 10), curb, face);
  if (rnd() < 0.16) put('boite', s0 + 6 + rnd() * (L - 12), inner, face);
  if (core && rnd() < 0.1) put('cabine', s0 + 8 + rnd() * (L - 16), inner + sg * -0.2, face);
  if (core && sw >= 3.5 && rnd() < 0.1) { const [x, z] = put('kiosque', s0 + L / 2, sg * (hw + sw * 0.55), face); spot(x - sg * n[0] * 2.0, z - sg * n[1] * 2.0, face + Math.PI); }
  if (main && L > 44 && rnd() < 0.3) { const [x, z] = put('abribus', s0 + L * 0.5 + 6, inner + sg * -0.4, face); for (let k = 0; k < 2; k++) if (rnd() < 0.7) spot(x + u[0] * (k * 1.2 - 0.6) - sg * n[0] * 0.8, z + u[1] * (k * 1.2 - 0.6) - sg * n[1] * 0.8, face); }
  if (L > 20) { if (main) { if (rnd() < 0.5) put('feu', sg > 0 ? s1 - 2.2 : s0 + 2.2, curb, along + (sg > 0 ? Math.PI : 0)); } else if (rnd() < 0.4) put('stop', sg > 0 ? s1 - 2.2 : s0 + 2.2, curb, along + (sg > 0 ? Math.PI : 0)); }
  if (rnd() < 0.12) put('fleche', s0 + 3, curb, along);
  // voitures garées le long des grandes rues
  if (main && size >= 2) for (let t = s0 + 10; t < s1 - 9; t += 6.2) if (rnd() < 0.32) { const [x, z] = Wl(t, sg * (hw - 1.15)); PARKED.push({ x, z, yaw: along + (sg > 0 ? 0 : Math.PI) }); }
}
// ---------- commerces : enseigne, terrasse, ardoise, caisses
export function propsShop(b, rnd, core) {
  const fp = [0, 0, 0, 0];
  facadePoint(b, 0, (rnd() - 0.5) * (b.w - 2.4), b.floorY + b.gh - 0.75, fp);
  propAdd('enseigne', fp[0], fp[1], fp[2], fp[3], 1, tintOf(rnd));
  const ox = Math.sin(fp[3]), oz = Math.cos(fp[3]), ax = Math.cos(fp[3]), az = -Math.sin(fp[3]);
  const at = (u, out) => { facadePoint(b, 0, u, 0, fp); return [fp[0] + ox * out, fp[2] + oz * out]; };
  if (rnd() < (core ? 0.5 : 0.3)) { const n = b.w > 9 ? 2 : 1, tint = tintOf(rnd); for (let k = 0; k < n; k++) { const [x, z] = at((k - (n - 1) / 2) * 3.4, 1.9); propAdd('terrasse', x, propG(x, z, 0.2), z, fp[3] + rnd() * 0.6, 1, tint); if (rnd() < 0.8) spot(x + ax * 0.2 + ox * 0.9, z + az * 0.2 + oz * 0.9, fp[3] + Math.PI + (rnd() - 0.5)); if (rnd() < 0.4) spot(x - ax * 1.3, z - az * 1.3, fp[3] + Math.PI / 2); } }
  if (rnd() < 0.4) { const [x, z] = at(b.w / 2 - 0.9, 1.0); propAdd('ardoise', x, propG(x, z, 0.2), z, fp[3] + (rnd() - 0.5) * 0.5); }
  if (rnd() < 0.35) { const [x, z] = at(-(b.w / 2 - 1.2), 0.75); propAdd(rnd() < 0.5 ? 'caisses' : rnd() < 0.5 ? 'tonneaux' : 'futs', x, propG(x, z, 0.2), z, fp[3]); }
}
// ---------- place du marché
export function propsSquare(Wd, T, a0, a1, b0, b1, rnd) {
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2, r = Math.min(a1 - a0, b1 - b0) / 2;
  const dirW = (da, db) => [T.U[0] * da + T.V[0] * db, T.U[1] * da + T.V[1] * db];
  const N = 9;
  for (let k = 0; k < N; k++) {
    const a = k / N * 6.283 + 0.3, rr = r * 0.56, [x, z] = Wd(ca + Math.cos(a) * rr, cb + Math.sin(a) * rr), d = dirW(Math.cos(a), Math.sin(a)), yaw = yawTo(d[0], d[1]);
    propAdd('etal', x, propG(x, z), z, yaw, 1, tintOf(rnd));
    spot(x - d[0] * 1.2, z - d[1] * 1.2, yaw);
    if (rnd() < 0.8) spot(x + d[0] * 2.3, z + d[1] * 2.3, yaw + Math.PI); if (rnd() < 0.4) spot(x + d[0] * 2.5 + d[1] * 1.1, z + d[1] * 2.5 - d[0] * 1.1, yaw + Math.PI + 0.3);
    if (rnd() < 0.5) propAdd(rnd() < 0.5 ? 'caisses' : 'tonneaux', x - d[1] * 2.4, propG(x - d[1] * 2.4, z + d[0] * 2.4), z + d[0] * 2.4, yaw);
  }
  for (let k = 0; k < 4; k++) { const a = k / 4 * 6.283 + 0.78, [x, z] = Wd(ca + Math.cos(a) * 8.5, cb + Math.sin(a) * 8.5), d = dirW(-Math.cos(a), -Math.sin(a)); propAdd('banc', x, propG(x, z), z, yawTo(d[0], d[1])); if (rnd() < 0.6) spot(x + d[0] * 0.9, z + d[1] * 0.9, yawTo(d[0], d[1])); }
  for (const [ta, tb] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) { const [x, z] = Wd(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * tb); propAdd('parterre', x, propG(x, z), z, 0, 1.3, tintOf(rnd)); }
  for (let k = 0; k < 3; k++) { const a = rnd() * 6.28, rr = r * (0.25 + rnd() * 0.2), [x, z] = Wd(ca + Math.cos(a) * rr, cb + Math.sin(a) * rr), y = rnd() * 6.28; spot(x, z, y); spot(x + Math.sin(y) * 1.1, z + Math.cos(y) * 1.1, y + Math.PI); }
}
export function propsPark(Wd, T, a0, a1, b0, b1, rnd) {
  const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
  const dirW = (da, db) => [T.U[0] * da + T.V[0] * db, T.U[1] * da + T.V[1] * db];
  { const [x, z] = Wd(ca, cb); propAdd('kiosque_musique', x, propG(x, z), z, 0); PROP_COLL.push({ x, z, r: 4.6 }); }
  for (const [ta, tb, da, db] of [[0.25, 0.5, 0, 1], [0.75, 0.5, 0, -1], [0.5, 0.22, 1, 0], [0.5, 0.78, -1, 0], [0.12, 0.5, 0, -1], [0.88, 0.5, 0, 1]]) { const [x, z] = Wd(a0 + (a1 - a0) * ta + db * 2.4, b0 + (b1 - b0) * tb + da * 2.4), d = dirW(-db, -da); propAdd('banc', x, propG(x, z), z, yawTo(d[0], d[1])); if (rnd() < 0.5) spot(x + d[0] * 0.9, z + d[1] * 0.9, yawTo(d[0], d[1])); }
  for (let k = 0; k < 7; k++) { const [x, z] = Wd(a0 + 5 + rnd() * (a1 - a0 - 10), b0 + 5 + rnd() * (b1 - b0 - 10)); if (Math.hypot(x - Wd(ca, cb)[0], z - Wd(ca, cb)[1]) < 9) continue; propAdd('parterre', x, propG(x, z), z, rnd() * 6, 0.8 + rnd() * 0.8, tintOf(rnd)); }
  { const [x, z] = Wd(a0 + (a1 - a0) * 0.22, b0 + (b1 - b0) * 0.24); propAdd('jeux', x, propG(x, z), z, rnd() * 6); spot(x + 2, z + 2.4, rnd() * 6); }
  for (const [ta, tb] of [[0.78, 0.25], [0.76, 0.8]]) { const [x, z] = Wd(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * tb); propAdd('table_pique', x, propG(x, z), z, rnd() * 6); if (rnd() < 0.7) spot(x + 1.3, z, -Math.PI / 2); }
}
// ---------- jardin d'un pavillon
export function propsPlot(at, yawIn, x, pw, set, d, side0, w, plotD, dx0, dx1, rnd) {
  const put = (type, u, v, yaw, s = 1, tint = null) => { const [px, pz] = at(u, v); propAdd(type, px, propG(px, pz), pz, yaw, s, tint); return [px, pz]; };
  put('boite', Math.max(x + 0.8, dx0 - 0.7), 0.95, yawIn + Math.PI);
  if (dx1 - dx0 > 2.4 && rnd() < 0.55) { const [px, pz] = at((dx0 + dx1) / 2, set + d * 0.3); PARKED.push({ x: px, z: pz, yaw: yawIn + (rnd() < 0.5 ? 0 : Math.PI) }); }
  const back = plotD - set - d;
  if (back > 5) {
    if (rnd() < 0.4) put('abri', x + 2.4, plotD - 2.6, yawIn + Math.PI, 0.9, tintOf(rnd));
    if (rnd() < 0.35) put('potager', x + pw - 3.4, plotD - 3.2, yawIn);
    if (rnd() < 0.3) put('linge', x + side0 + w / 2, set + d + 2.6, yawIn, 0.9, tintOf(rnd));
    else if (rnd() < 0.4) { const [px, pz] = put('terrasse', x + side0 + w / 2, set + d + 2.4, rnd() * 6, 1, tintOf(rnd)); if (rnd() < 0.5) spot(px + 1.1, pz + 0.4, rnd() * 6); }
    if (rnd() < 0.1) put('piscine', x + pw / 2, plotD - 5.5, 0);
  }
}
// ---------- zone d'activité, selon la spécialité de la ville
export function propsIndustry(Wd, T, a0, a1, b0, b1, rnd, st) {
  const sp = (st.meta.spec || '').toLowerCase();
  const kind = /brass|bière|malt|houblon|brasser/.test(sp) ? 'brew' : /fum|jambon|saucis|charcut|salais|rôti|grill|côtes|conserv/.test(sp) ? 'smoke' : /céréal|élevage|aliment|coopérat|pépini/.test(sp) ? 'grain' : /maritime|pêche|cabotage|plaisance|douane|port|sel|fret/.test(sp) ? 'port' : 'divers';
  const P = (ta, tb) => Wd(a0 + (a1 - a0) * ta, b0 + (b1 - b0) * tb);
  const yaw = yawTo(T.V[0], T.V[1]);
  const put = (type, ta, tb, r, y = yaw, s = 1, tint = null) => { const [x, z] = P(ta, tb); propAdd(type, x, propG(x, z), z, y, s, tint); if (r) PROP_COLL.push({ x, z, r }); return [x, z]; };
  const LAY = {
    brew: () => { put('cuves', 0.28, 0.3, 6.5); put('cuves', 0.72, 0.3, 6.5, yaw + Math.PI); put('alambic', 0.22, 0.74, 3.4); put('alambic', 0.46, 0.76, 3.4, yaw + 1.2); put('hangar', 0.76, 0.76, 0, yaw + Math.PI / 2, 0.75, [176, 84, 60]); for (let k = 0; k < 5; k++) put(k % 2 ? 'futs' : 'tonneaux', 0.12 + k * 0.1, 0.52, 0, rnd() * 6); },
    smoke: () => { put('hangar', 0.32, 0.3, 0, yaw, 0.9, [176, 84, 60]); const c1 = put('cheminee', 0.2, 0.72, 2.2), c2 = put('cheminee', 0.5, 0.74, 2.2, yaw, 0.8); for (const [c, h] of [[c1, 31], [c2, 25]]) SMOKERS.push({ x: c[0], y: hAt(c[0], c[1]) + h, z: c[1], rate: 0.8, size: 3.2 }); put('hangar', 0.76, 0.72, 0, yaw + Math.PI / 2, 0.7, TINTS[4]); for (let k = 0; k < 4; k++) put('caisses', 0.62 + k * 0.08, 0.4, 0, rnd() * 6); },
    grain: () => { put('silos', 0.3, 0.3, 8); put('silos', 0.7, 0.32, 8, yaw + 2); put('hangar', 0.35, 0.76, 0, yaw, 0.85, TINTS[3]); put('tracteur', 0.72, 0.7, 0, rnd() * 6, 1, TINTS[0]); put('tracteur', 0.82, 0.82, 0, rnd() * 6, 1, TINTS[3]); },
    port: () => { put('hangar', 0.3, 0.28, 0, yaw, 0.9, TINTS[2]); put('grue', 0.74, 0.3, 5); put('conteneurs', 0.2, 0.7, 4, yaw); put('conteneurs', 0.5, 0.8, 4, yaw + Math.PI / 2); put('conteneurs', 0.8, 0.72, 4, yaw + 0.2); },
    divers: () => { put('hangar', 0.3, 0.3, 0, yaw, 0.9, tintOf(rnd)); put('hangar', 0.7, 0.72, 0, yaw + Math.PI / 2, 0.8, tintOf(rnd)); put('conteneurs', 0.74, 0.26, 4); put('futs', 0.3, 0.7, 0); put('caisses', 0.4, 0.74, 0); },
  };
  LAY[kind]();
  for (let k = 0; k < 4; k++) { const [x, z] = P(0.2 + rnd() * 0.6, 0.45 + rnd() * 0.12); spot(x, z, rnd() * 6.28); }
}
// ---------- le long des routes
export function propsRoad(rows, A, B, rnd, ri) {
  const n = rows.length;
  for (let k = 6; k < n - 6; k++) {
    const r = rows[k];
    if (tmGet(r.x, r.z) === 4) continue;
    if (k % 8 === 0) for (const sg of [-1, 1]) propAdd('delineateur', r.x + r.nx * sg * 4.3, hAt(r.x + r.nx * sg * 4.3, r.z + r.nz * sg * 4.3), r.z + r.nz * sg * 4.3, yawTo(r.nz, -r.nx));
    if (k % 10 === 5) { const x = r.x + r.nx * 7.2, z = r.z + r.nz * 7.2; if (waterAt(x, z) < -1e8) propAdd('poteau', x, hAt(x, z) - 0.2, z, yawTo(r.nz, -r.nx)); }
    const nz1 = noiseAt(r.x * 0.0009 + ri * 0.13, r.z * 0.0009, 1), nz2 = noiseAt(r.x * 0.0012 + 0.5, r.z * 0.0012 + ri * 0.21, 2);
    if (nz1 > 0.56 && clsAt(r.x, r.z) === 1) for (const sg of [-1, 1]) { const x = r.x + r.nx * sg * 5.6, z = r.z + r.nz * sg * 5.6; if (waterAt(x, z) < -1e8 && !tmGet(x, z)) propAdd('cloture', x, hAt(x, z) - 0.05, z, yawTo(r.nz, -r.nx) + Math.PI / 2); }
    if (nz2 > 0.6 && k % 3 === 0 && clsAt(r.x, r.z) !== 4) for (const sg of [-1, 1]) { const x = r.x + r.nx * sg * 7.6, z = r.z + r.nz * sg * 7.6; if (waterAt(x, z) < -1e8 && !tmGet(x, z) && slopeAt(x, z) < 0.3) TOWN_TREES.push({ sp: 'platane', x, z, s: 0.95 + rnd() * 0.2, col: [1, 1.02, 0.94] }); }
    // bocage : arbres isolés, bosquets, haies le long de la route
    if (clsAt(r.x, r.z) !== 4) for (const sg of [-1, 1]) {
      const q = rnd();
      if (q < 0.16) { const o = 9 + rnd() * 16, x = r.x + r.nx * sg * o, z = r.z + r.nz * sg * o; if (waterAt(x, z) < -1e8 && !tmGet(x, z) && slopeAt(x, z) < 0.35) { const t = rnd(); TOWN_TREES.push({ sp: t < 0.4 ? 'chene' : t < 0.6 ? 'bouleau' : t < 0.75 ? 'peuplier' : 'buisson', x, z, s: 0.55 + rnd() * 0.5, col: [1, 1, 1] }); } }
      else if (q < 0.19) { const o = 14 + rnd() * 14, cx = r.x + r.nx * sg * o, cz = r.z + r.nz * sg * o; for (let c = 0; c < 5; c++) { const x = cx + (rnd() - 0.5) * 16, z = cz + (rnd() - 0.5) * 16; if (waterAt(x, z) < -1e8 && !tmGet(x, z) && slopeAt(x, z) < 0.35) TOWN_TREES.push({ sp: rnd() < 0.6 ? 'chene' : 'bouleau', x, z, s: 0.6 + rnd() * 0.5, col: [1, 1, 1] }); } }
      else if (q < 0.24 && nz1 <= 0.56 && k % 2 === 0) { const x = r.x + r.nx * sg * 6.4, z = r.z + r.nz * sg * 6.4; if (waterAt(x, z) < -1e8 && !tmGet(x, z) && slopeAt(x, z) < 0.2) HEDGES.push({ x, z, y: hAt(x, z), len: 12.4, h: 1.3 + rnd() * 0.5, dep: 1.1, rot: Math.atan2(r.nx, r.nz) }); }
    }
    if (k % 97 === 40) { const x = r.x + r.nx * 9, z = r.z + r.nz * 9; if (waterAt(x, z) < -1e8 && slopeAt(x, z) < 0.2) propAdd('panneau_pub', x, hAt(x, z) - 0.1, z, yawTo(r.nz, -r.nx) + (rnd() < 0.5 ? 0.4 : Math.PI - 0.4)); }
  }
  // panneaux d'entrée de ville
  for (const [k, st, dirSign] of [[9, STATIONS[A], 1], [n - 10, STATIONS[B], -1]]) {
    const r = rows[clamp(k, 0, n - 1)], sgn = dirSign, x = r.x - r.nx * 5.2 * sgn, z = r.z - r.nz * 5.2 * sgn;
    const s = signMesh(st.name, 3.6, 1.0, { bg: '#fffaf0', fg: '#17110e', glow: 0.12 }); s.position.set(x, hAt(x, z) + 2.1, z); s.rotation.y = yawTo(r.nz * sgn, -r.nx * sgn); scenery.add(s);
    for (const o of [-1.5, 1.5]) propAdd('delineateur', x + Math.cos(s.rotation.y) * o, hAt(x, z), z - Math.sin(s.rotation.y) * o, s.rotation.y, 2.3);
  }
}
// ---------- campagne, fermes, côtes, ciel
export function propsCountry(rnd) {
  for (const f of FARMS) {
    const c = Math.cos(f.rot), s = Math.sin(f.rot), at = (u, v) => [f.x + c * u - s * v, f.z + s * u + c * v];
    { const [x, z] = at(34, -8); propAdd('siloferme', x, propG(x, z, 0), z, 0, 1, tintOf(rnd)); PROP_COLL.push({ x, z, r: 2.2 }); }
    { const [x, z] = at(8, 12); propAdd('tracteur', x, propG(x, z, 0.1), z, rnd() * 6, 1, rnd() < 0.5 ? TINTS[0] : TINTS[3]); }
    { const [x, z] = at(-6, -11); propAdd('potager', x, propG(x, z, 0.05), z, yawTo(c, s), 1.3); }
    for (let k = 0; k < 5; k++) { const [x, z] = at(-9 + k * 6, 17); propAdd('cloture', x, hAt(x, z), z, yawTo(c, s) + Math.PI / 2); }
    if (rnd() < 0.6) { const [x, z] = at(16, -13); propAdd('tonneaux', x, propG(x, z, 0.05), z, rnd() * 6); }
    spot(...at(4, 9), rnd() * 6.28);
  }
  let n = 0;
  for (let tries = 0; tries < 9000 && n < 520; tries++) {
    const x = (rnd() - 0.5) * WW * 0.92, z = (rnd() - 0.5) * HH * 0.92;
    if (clsAt(x, z) !== 1 || tmGet(x, z) || waterAt(x, z) > -1e8 || slopeAt(x, z) > 0.12) continue;
    const t = rnd();
    if (t < 0.3) propAdd('epouvantail', x, hAt(x, z), z, rnd() * 6, 1, tintOf(rnd));
    else if (t < 0.45) propAdd('tracteur', x, hAt(x, z) + 0.05, z, rnd() * 6, 1, rnd() < 0.5 ? TINTS[0] : TINTS[3]);
    else if (t < 0.6) propAdd('table_pique', x, hAt(x, z), z, rnd() * 6);
    else { const a = rnd() * 3.14, len = 3 + (rnd() * 6 | 0); for (let k = 0; k < len; k++) { const px = x + Math.cos(a) * k * 6.05, pz = z + Math.sin(a) * k * 6.05; if (!tmGet(px, pz) && waterAt(px, pz) < -1e8) propAdd('cloture', px, hAt(px, pz) - 0.05, pz, a + Math.PI / 2 + Math.PI / 2 * 0); } }
    n++;
  }
  for (const st of STATIONS) {
    const R = st.meta.R || 300, sp = (st.meta.spec || '').toLowerCase();
    if (st.meta.size >= 2) { const s = freeSpot(st, rnd, R + 90, R + 320, 9, 8); if (s) { propAdd('chateau_eau', s.x, s.y - 0.3, s.z, 0); PROP_COLL.push({ x: s.x, z: s.z, r: 2.4 }); reserve(s.x, s.z, 10); } }
    // vignes, houblonnières, serres, vergers
    const crop = /vign|viticol/.test(sp) ? 'vigne' : /houblon/.test(sp) ? 'houblon' : /serre/.test(sp) ? 'serre' : /verger|jardin|pépini/.test(sp) ? 'verger' : null;
    if (crop) for (let q = 0; q < (crop === 'serre' ? 9 : 5); q++) {
      const s = freeSpot(st, rnd, R + 60, R + 520, crop === 'serre' ? 10 : 34, crop === 'serre' ? 5 : 9); if (!s) continue;
      const a = rnd() * 3.14, c = Math.cos(a), sn = Math.sin(a);
      if (crop === 'serre') { propAdd('serre', s.x, s.y - 0.2, s.z, a); reserve(s.x, s.z, 9); continue; }
      reserve(s.x, s.z, 32);
      if (crop === 'verger') { for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) { const x = s.x + c * i * 8 - sn * j * 8, z = s.z + sn * i * 8 + c * j * 8; TOWN_TREES.push({ sp: 'chene', x, z, s: 0.34 + rnd() * 0.08, col: [1.15, 1.0, 0.7] }); } continue; }
      const step = crop === 'vigne' ? 3.2 : 4.4, len = crop === 'vigne' ? 8 : 6;
      for (let i = -8; i <= 8; i++) for (let j = -3; j <= 3; j++) { const x = s.x + c * j * len - sn * i * step, z = s.z + sn * j * len + c * i * step; if (slopeAt(x, z) < 0.5) propAdd(crop, x, hAt(x, z) - 0.05, z, a + Math.PI / 2); }
    }
    // bateaux, pontons
    let boats = 0;
    for (let tries = 0; tries < 260 && boats < 12; tries++) {
      const a = rnd() * 6.283, d = R * 0.5 + rnd() * (R + 420), x = st.x + Math.cos(a) * d, z = st.z + Math.sin(a) * d, wl = waterAt(x, z);
      if (wl < -1e8 || hAt(x, z) > wl - 1.2) continue;
      let near = false; for (let q = 0; q < 8; q++) { const b = q / 8 * 6.283; if (waterAt(x + Math.cos(b) * 110, z + Math.sin(b) * 110) < -1e8) near = true; }
      if (!near) continue;
      propAdd(rnd() < 0.62 ? 'barque' : 'voilier', x, wl - 0.05, z, rnd() * 6.28, 1, tintOf(rnd)); boats++;
    }
  }
  // montgolfières
  for (let k = 0; k < 9; k++) { const x = (rnd() - 0.5) * WW * 0.8, z = (rnd() - 0.5) * HH * 0.8; propAdd('montgolfiere', x, Math.max(hAt(x, z), 0) + 150 + rnd() * 220, z, rnd() * 6, 1, tintOf(rnd)); }
}
export function buildParked() {
  if (!PARKED.length) return;
  const cols = [[226, 36, 48], [36, 110, 230], [250, 246, 235], [250, 200, 30], [50, 180, 110], [250, 130, 40], [240, 130, 170], [70, 200, 210], [150, 80, 200], [60, 60, 70]];
  const by = new Map();
  for (const p of PARKED) { const k = Math.floor(p.x / 200) + ':' + Math.floor(p.z / 200); let a = by.get(k); if (!a) by.set(k, a = []); a.push(p); }
  const col = new THREE.Color();
  lazyRankStart();
  for (const [, a] of by) {
    for (const p of a) PROP_COLL.push({ x: p.x, z: p.z, r: 1.5 });
    const make = () => {
    const im = new THREE.InstancedMesh(CARS.geo, CARS.mat, a.length);
    a.forEach((p, i) => { im.setMatrixAt(i, M(p.x, groundAt(p.x, p.z) + 0.1, p.z, 1, 1, 1, p.yaw)); const c = cols[(hashStr('pk' + p.x.toFixed(1) + p.z.toFixed(1)) >>> 2) % cols.length]; im.setColorAt(i, col.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace)); });
    im.computeBoundingSphere(); im.castShadow = true; im.receiveShadow = true;
    return im;
    };
    PROPS.meshes.push({ mesh: null, make, parent: scenery, rank: lazyRank(), cx: (Math.floor(a[0].x / 200) + 0.5) * 200, cz: (Math.floor(a[0].z / 200) + 0.5) * 200, R: 170 * (Q.propK || 1) + 145 });
  }
}
