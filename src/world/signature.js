// Empreinte du monde généré : une somme de contrôle par famille d'objets (bâtiments, accessoires, arbres…).
// `npm run check` la compare à tools/world-signature.json : toute modification involontaire du décor se voit
// en vingt secondes, sans rendre une seule image. Après un changement voulu : `npm run check -- --update`.
import { STATIONS } from './land.js';
import { PROPS, TOWN_SEGS, ROADS, PARKED, SPOTS } from './registry.js';
import { BUILDINGS, STREETS, FARMS, LANDMARK_SPOTS, FOUNTAINS, LAMPS, HEDGES, GWALLS, TOWN_TREES } from './scenery.js';

function fnv(h, s) { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h; }
// nombres arrondis au dixième de millimètre ; objets parcourus par clés triées ; objets three.js ignorés
function digest(v, h = 2166136261, depth = 0) {
  if (typeof v === 'number') return fnv(h, v.toFixed(4) + ';');
  if (typeof v === 'string' || typeof v === 'boolean') return fnv(h, v + ';');
  if (v == null || typeof v !== 'object' || depth > 4 || v.isObject3D || v.isBufferGeometry || v.isMaterial) return h;
  if (Array.isArray(v) || ArrayBuffer.isView(v)) { for (let i = 0; i < v.length; i++) h = digest(v[i], h, depth + 1); return fnv(h, ']'); }
  for (const k of Object.keys(v).sort()) h = digest(v[k], fnv(h, k + ':'), depth + 1);
  return fnv(h, '}');
}
const entry = list => ({ n: list.length, h: (digest(list) >>> 0).toString(16) });

export function worldSignature() {
  const props = {}; for (const k of Object.keys(PROPS.where).sort()) props[k] = PROPS.where[k];
  return {
    stations: entry(STATIONS.map(s => [s.name, s.x, s.z])),
    buildings: entry(BUILDINGS), streets: entry(STREETS), streetSegments: entry(TOWN_SEGS.map(s => [s.p0, s.p1, s.hw, s.sw])),
    farms: entry(FARMS), landmarks: entry(LANDMARK_SPOTS), fountains: entry(FOUNTAINS), lamps: entry(LAMPS), hedges: entry(HEDGES), lowWalls: entry(GWALLS),
    townTrees: entry(TOWN_TREES), roads: entry(ROADS.map(r => r.pts)),
    props: { n: PROPS.n, h: (digest(props) >>> 0).toString(16) }, parked: entry(PARKED), spots: entry(SPOTS.map(s => [s.x, s.z, s.yaw])),
  };
}
