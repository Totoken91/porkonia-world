// Registres partagés du monde : accessoires, rues, routes, sols praticables, objets animés
import { hAt } from './core.js';

// ---------- objets animés, fumées et lumières des monuments
export const ANIMATED = [], SMOKERS = [], LIGHTS = [];


// ---------- voitures (modèle partagé entre la circulation et le stationnement)
export const CARS = { mesh: null, list: [] };

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
