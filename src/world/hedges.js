// Haies du bocage : buissons et arbres plantés sur les limites de champs du parcellaire (world/parcels.js).
// Rien n'est stocké : chaque dalle de 256 m calcule ses plants à la demande, à partir de la position seule.
import * as THREE from 'three';
import { Q } from '../engine/quality.js';
import { STATIONS, WW, HH, hAt, clsAt, slopeAt, waterAt, tmGet } from './land.js';
import { freeAfterUpload } from '../engine/renderer.js';
import { Mset } from '../engine/geo.js';
import { lazyShow, lazyFar, lazyRankStart, lazyRank } from '../engine/lazy.js';
import { treeAdd } from './registry.js';
import { PARCEL_PX, PARCEL_SIZE, PARCEL_EDGE, PARCEL_HEDGE } from './parcels.js';
import { scenery, FARMS } from './scenery.js';
import { VEG, treeMaterial } from './vegetation.js';

const TILE = 256, M = PARCEL_SIZE / PARCEL_PX;
const TILES = [];
// hasard stable tiré d'une position entière : le même plant renaît au même endroit
const h2 = (a, b, s) => { let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const GREENS = [[1, 1, 1], [0.86, 0.95, 0.8], [1.12, 1.05, 0.85], [0.9, 1.0, 1.05], [1.2, 1.1, 0.7]];

let BLOCK = null;   // villes et fermes : pas de haie au milieu des rues
function blocked(x, z) {
  if (!BLOCK) { BLOCK = []; for (const st of STATIONS) BLOCK.push(st.town ? st.town.C[0] : st.x, st.town ? st.town.C[1] : st.z, (st.meta.R || 300) + 90, st.x, st.z, 190); for (const f of FARMS) BLOCK.push(f.x, f.z, 55); }
  for (let k = 0; k < BLOCK.length; k += 3) if (Math.abs(x - BLOCK[k]) < BLOCK[k + 2] && Math.abs(z - BLOCK[k + 1]) < BLOCK[k + 2] && Math.hypot(x - BLOCK[k], z - BLOCK[k + 1]) < BLOCK[k + 2]) return true;
  return false;
}
function makeTile(T) {
  const bush = [], tree = [];
  const i0 = Math.floor(T.x0 / M), j0 = Math.floor(T.z0 / M), n = TILE / M;
  for (let j = j0; j < j0 + n; j++) for (let i = i0; i < i0 + n; i++) {
    const p = (((j % PARCEL_PX) + PARCEL_PX) % PARCEL_PX) * PARCEL_PX + (((i % PARCEL_PX) + PARCEL_PX) % PARCEL_PX);
    if (!PARCEL_HEDGE[p] || PARCEL_EDGE[p] > 13) continue;      // à moins de 1,6 m d'une limite plantée
    const r = h2(i, j, 1); if (r > 0.3) continue;
    const x = (i + h2(i, j, 2)) * M, z = (j + h2(i, j, 3)) * M;
    if (clsAt(x, z) !== 1 || tmGet(x, z) || waterAt(x, z) > -1e8 || slopeAt(x, z) > 0.3 || blocked(x, z)) continue;
    const y = hAt(x, z), k = h2(i, j, 4);
    if (r < 0.022) tree.push([x, y - 0.25, z, 0.62 + k * 0.5, k * 6.28, GREENS[(k * 5) | 0], k < 0.55 ? 'chene' : k < 0.8 ? 'bouleau' : 'peuplier']);
    else bush.push([x, y - 0.25, z, 1.25 + k * 1.1, k * 6.28, GREENS[(h2(i, j, 5) * 5) | 0]]);
  }
  const grp = new THREE.Group(), mat = treeMaterial(), col = new THREE.Color(), mtx = new THREE.Matrix4();
  const add = (geo, arr, cast) => {
    if (!arr.length) return;
    const im = new THREE.InstancedMesh(geo, mat, arr.length);
    arr.forEach((a, n2) => { im.setMatrixAt(n2, Mset(mtx, a[0], a[1], a[2], a[3], a[3] * 0.82, a[3], a[4])); im.setColorAt(n2, col.setRGB(a[5][0], a[5][1], a[5][2])); });
    im.computeBoundingSphere(); im.castShadow = cast; im.receiveShadow = true;
    freeAfterUpload(null, [im.instanceMatrix, im.instanceColor]); grp.add(im);
  };
  add(VEG.species.buisson.lod1, bush, false);
  for (const sp of ['chene', 'bouleau', 'peuplier']) add(VEG.species[sp].lod1, tree.filter(t => t[6] === sp), true);
  if (!T.solid) { T.solid = true; for (const t of tree) treeAdd(t[0], t[2], 0.32 * t[3]); }   // troncs infranchissables, une seule fois
  return grp;
}
export function buildHedges() {
  lazyRankStart();
  for (let z0 = -HH / 2; z0 < HH / 2; z0 += TILE) for (let x0 = -WW / 2; x0 < WW / 2; x0 += TILE) {
    // une dalle sans plaine cultivable n'aura jamais de haie
    let farm = false; for (const [dx, dz] of [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) if (clsAt(x0 + dx * TILE, z0 + dz * TILE) === 1) { farm = true; break; }
    if (!farm) continue;
    const T = { x0, z0, solid: false, mesh: null, parent: scenery, rank: lazyRank(), cx: x0 + TILE / 2, cz: z0 + TILE / 2 };
    T.make = () => makeTile(T); TILES.push(T);
  }
  return TILES.length;
}
export function updateHedges(camPos) {
  const R = Q.treeNear + 300;
  for (const T of TILES) { const d = Math.hypot(T.cx - camPos.x, T.cz - camPos.z); lazyShow(T, d < R, d > lazyFar(R)); }
}
