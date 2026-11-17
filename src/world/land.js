// Le relief de Porkonia : altitudes, occupation du sol, lacs, masque des voies, gares
import { worldData } from '../data.js';
import * as THREE from 'three';
import { setStatus, gunzip, clamp } from '../engine/util.js';

// ---------- données du monde
setStatus('Décompression de la carte de Porkonia…');
export const PW = await worldData;
export const NX = PW.NX, NZ = PW.NZ, WW = PW.W, HH = PW.H, CELL = WW / (NX - 1);
const _hraw = new Int16Array((await gunzip(PW.heights)).buffer);
export const H = new Float32Array(_hraw.length); for (let i = 0; i < _hraw.length; i++) H[i] = _hraw[i] / 10;
export const HGT = H;
const CLSP = await gunzip(PW.cls);
export const AOV = await gunzip(PW.ao);
export const CLS = new Uint8Array(CLSP.length), LAKE = new Uint8Array(CLSP.length);
for (let i = 0; i < CLSP.length; i++) { CLS[i] = CLSP[i] & 7; LAKE[i] = CLSP[i] >> 3; }
export const LAKE_LV = [0, ...PW.lakes];

export function hAt(x, z) {
  let fi = (x / WW + 0.5) * (NX - 1), fj = (z / HH + 0.5) * (NZ - 1);
  fi = clamp(fi, 0, NX - 1.0001); fj = clamp(fj, 0, NZ - 1.0001);
  const i = fi | 0, j = fj | 0, tx = fi - i, tz = fj - j;
  const h00 = H[j * NX + i], h10 = H[j * NX + i + 1], h01 = H[(j + 1) * NX + i], h11 = H[(j + 1) * NX + i + 1];
  if (tz >= tx) return h00 + (h11 - h01) * tx + (h01 - h00) * tz;
  return h00 + (h10 - h00) * tx + (h11 - h10) * tz;
}
export function idxAt(x, z) {
  const i = clamp(Math.round((x / WW + 0.5) * (NX - 1)), 0, NX - 1), j = clamp(Math.round((z / HH + 0.5) * (NZ - 1)), 0, NZ - 1);
  return j * NX + i;
}
export const clsAt = (x, z) => CLS[idxAt(x, z)];
export function waterAt(x, z) { const k = idxAt(x, z); if (LAKE[k]) return LAKE_LV[LAKE[k]]; if (CLS[k] === 0) return 0; return -1e9; }
export function slopeAt(x, z) { const d = 6; return Math.hypot(hAt(x + d, z) - hAt(x - d, z), hAt(x, z + d) - hAt(x, z - d)) / (2 * d); }

// masque fin (12,5 m) : 1 voie, 2 gare, 3 bâti, 4 rue, 5 réservé
const TRACKMASK_RES = 12.5;
const TMW = Math.ceil(WW / TRACKMASK_RES), TMH = Math.ceil(HH / TRACKMASK_RES);
const TRACKMASK = new Uint8Array(TMW * TMH);
function tmIdx(x, z) { const i = Math.floor((x + WW / 2) / TRACKMASK_RES), j = Math.floor((z + HH / 2) / TRACKMASK_RES); if (i < 0 || j < 0 || i >= TMW || j >= TMH) return -1; return j * TMW + i; }
export function tmMark(x, z, r, v) {
  const n = Math.ceil(r / TRACKMASK_RES);
  const ci = Math.floor((x + WW / 2) / TRACKMASK_RES), cj = Math.floor((z + HH / 2) / TRACKMASK_RES);
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
    if (i < 0 || j < 0 || i >= TMW || j >= TMH) continue;
    const dx = (i + 0.5) * TRACKMASK_RES - WW / 2 - x, dz = (j + 0.5) * TRACKMASK_RES - HH / 2 - z;
    if (dx * dx + dz * dz <= r * r) { const k = j * TMW + i; TRACKMASK[k] = Math.max(TRACKMASK[k], v); }
  }
}
export const tmGet = (x, z) => { const k = tmIdx(x, z); return k < 0 ? 0 : TRACKMASK[k]; };

export const STATIONS = PW.stations.map((s, i) => ({ ...s, id: i, dir: new THREE.Vector2(Math.cos(s.ax), Math.sin(s.ax)) }));
export const STATION_BY_NAME = Object.fromEntries(STATIONS.map(s => [s.name, s]));
