// Registres partagés du décor : accessoires, rues, routes, sols praticables, objets animés
import { hAt } from './land.js';

// ---------- objets animés, fumées et lumières des monuments
export const ANIMATED = [], SMOKERS = [], LIGHTS = [];

export const TOWN_SEGS = [];   // tronçons de rue : {st, p0, p1, n, hw, sw, sides, ka, kb}
export const ROADS = [];       // routes entre villes : {pts:[[x,y,z]...], a, b}

// ---------- surfaces praticables au-dessus du relief (voies, quais, routes)
const SURF = new Map();
function surfKey(x, z) { return (Math.floor(x * 0.5) + 8192) * 16384 + (Math.floor(z * 0.5) + 8192); }
export function surfStamp(x, z, y) { const k = surfKey(x, z), o = SURF.get(k); if (o === undefined || y > o) SURF.set(k, y); }
export function groundAt(x, z) { const h = hAt(x, z), s = SURF.get(surfKey(x, z)); return s !== undefined && s > h ? s : h; }

export const PROP_CHUNK = 260;
export const PROPS = { map: new Map(), meshes: [], defs: {}, n: 0, where: {} };
export const SPOTS = [];          // emplacements d'habitants à l'arrêt : {x, z, yaw}
export const PROP_COLL = [];
export function propAdd(type, x, y, z, yaw = 0, s = 1, tint = null) {
  const k = type + ':' + Math.floor(x / PROP_CHUNK) + ':' + Math.floor(z / PROP_CHUNK);
  let L = PROPS.map.get(k); if (!L) PROPS.map.set(k, L = { type, list: [] });
  L.list.push([x, y, z, yaw, s, tint]); PROPS.n++; (PROPS.where[type] || (PROPS.where[type] = [])).push([x, z]);
}
export const PARKED = [];

// ---------- obstacles : troncs et rochers (infranchissables), petit mobilier et voitures garées (renversables)
const TREE_CELL = 16, KNOCK_CELL = 12;
const TREES = new Map(), KNOCK = new Map();
const cellKey = (x, z, c) => (Math.floor(x / c) + 4096) * 8192 + Math.floor(z / c) + 4096;
export function treeAdd(x, z, r) { const k = cellKey(x, z, TREE_CELL); let a = TREES.get(k); if (!a) TREES.set(k, a = []); a.push(x, z, r); }
// pousse p hors des troncs voisins ; renvoie true s'il y a eu contact
export function treePush(p, rad) {
  let hit = false;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = TREES.get(cellKey(p.x + i * TREE_CELL, p.z + j * TREE_CELL, TREE_CELL)); if (!a) continue;
    for (let k = 0; k < a.length; k += 3) { const dx = p.x - a[k], dz = p.z - a[k + 1], d = Math.hypot(dx, dz), R = a[k + 2] + rad; if (d < R && d > 0.01) { hit = true; p.x = a[k] + dx / d * R; p.z = a[k + 1] + dz / d * R; } }
  }
  return hit;
}
// objet renversable : { x, z, r, masse, ... } ; `gone` passe à vrai quand il a été renversé
export function knockAdd(o) { const k = cellKey(o.x, o.z, KNOCK_CELL); let a = KNOCK.get(k); if (!a) KNOCK.set(k, a = []); a.push(o); return o; }
export function knockNear(x, z, rad, out) {
  out.length = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = KNOCK.get(cellKey(x + i * KNOCK_CELL, z + j * KNOCK_CELL, KNOCK_CELL)); if (!a) continue;
    for (const o of a) if (!o.gone && Math.hypot(o.x - x, o.z - z) < o.r + rad) out.push(o);
  }
  return out;
}
