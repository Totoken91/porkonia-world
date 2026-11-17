// Parcellaire du bocage : un pavage de champs irréguliers qui se répète tous les 2 048 m.
// Calculé une fois ; le shader du terrain le lit pour colorer chaque champ et tracer ses limites, et les haies en 3D
// (world/hedges.js) le lisent aussi, si bien que les buissons tombent exactement sur les limites dessinées au sol.
import * as THREE from 'three';
import { mulberry } from '../engine/util.js';

export const PARCEL_SIZE = 2048, PARCEL_PX = 1024;             // mètres couverts, pixels (2 m par pixel)
const G = 13;                                                  // 13 × 13 champs par dalle : environ 160 m de côté
const N = PARCEL_PX, M = PARCEL_SIZE / PARCEL_PX;
export const PARCEL_ID = new Uint8Array(N * N);                // numéro du champ (0..255), décide de la culture
export const PARCEL_EDGE = new Uint8Array(N * N);              // distance à la limite du champ, 8 pas par mètre, bornée à 31 m
export const PARCEL_HEDGE = new Uint8Array(N * N);             // 255 si la limite la plus proche porte une haie
export const PARCEL_TEX = { id: null, edge: null };

(function build() {
  const rnd = mulberry(20261117), cell = N / G;
  const sx = new Float32Array(G * G), sz = new Float32Array(G * G), sid = new Uint8Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const k = j * G + i; sx[k] = (i + 0.18 + rnd() * 0.64) * cell; sz[k] = (j + 0.18 + rnd() * 0.64) * cell; sid[k] = (rnd() * 256) | 0; }
  const idTex = new Uint8Array(N * N * 4), edgeTex = new Uint8Array(N * N * 4);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const ci = Math.floor(x / cell), cj = Math.floor(z / cell);
    let d1 = 1e9, d2 = 1e9, k1 = 0, k2 = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = (ci + di + G) % G, jj = (cj + dj + G) % G, k = jj * G + ii;
      // la dalle se répète : les sites voisins sont pris de l'autre côté du bord
      const px = sx[k] + (ci + di - ii) * cell, pz = sz[k] + (cj + dj - jj) * cell, d = Math.hypot(px - x, pz - z);
      if (d < d1) { d2 = d1; k2 = k1; d1 = d; k1 = k; } else if (d < d2) { d2 = d; k2 = k; }
    }
    const p = z * N + x, edge = (d2 - d1) * 0.5 * M;            // distance approchée à la médiatrice, en mètres
    const a = Math.min(k1, k2), b = Math.max(k1, k2), hedge = ((a * 73 + b * 151) % 100) < 58;
    PARCEL_ID[p] = sid[k1]; PARCEL_EDGE[p] = Math.min(255, edge * 8); PARCEL_HEDGE[p] = hedge ? 255 : 0;
    idTex[p * 4] = sid[k1]; idTex[p * 4 + 1] = (sid[k1] * 97 + 31) & 255; idTex[p * 4 + 3] = 255;
    edgeTex[p * 4] = PARCEL_EDGE[p]; edgeTex[p * 4 + 1] = hedge ? 255 : 0; edgeTex[p * 4 + 3] = 255;
  }
  const mk = (data, filter, mips) => { const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = filter; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : filter; t.generateMipmaps = mips; t.needsUpdate = true; return t; };
  PARCEL_TEX.id = mk(idTex, THREE.NearestFilter, false);        // sans mélange : chaque champ garde sa couleur, même au loin
  PARCEL_TEX.edge = mk(edgeTex, THREE.LinearFilter, true);
})();
// lecture depuis le monde : { edge (m), hedge (bool), id }
export function parcelAt(x, z) {
  const px = ((Math.floor(x / M) % N) + N) % N, pz = ((Math.floor(z / M) % N) + N) % N, p = pz * N + px;
  return { edge: PARCEL_EDGE[p] / 8, hedge: PARCEL_HEDGE[p] > 0, id: PARCEL_ID[p] };
}
