// Décor, bases : produits et villes, géométrie, matériaux, enseignes, nappes de sol
import * as THREE from 'three';
import { STATIONS, clamp, worldShading, TEX, tmMark, tmGet, waterAt, hAt, NOISE } from './core.js';

export const PRODUITS = {
  voyageurs: { nom: 'Voyageurs', wagon: 'voyageurs', taux: 34 },
  biere: { nom: 'Fûts de Douzi Ambrée', wagon: 'futs', taux: 30 },
  citerne: { nom: 'Bière en citerne', wagon: 'citerne', taux: 32 },
  malt: { nom: "Malt d'orge", wagon: 'tremie', tint: [226, 190, 110], taux: 22 },
  vin: { nom: 'Vin des Grands Coteaux', wagon: 'futs', taux: 34 },
  truffes: { nom: 'Truffes des neiges', wagon: 'frigo', taux: 52 },
  raclette: { nom: 'Meules de raclette', wagon: 'frigo', taux: 30 },
  saucissons: { nom: 'Saucissons de minuit', wagon: 'frigo', taux: 31 },
  charcuterie: { nom: 'Charcuterie fine', wagon: 'frigo', taux: 33 },
  jambons: { nom: 'Jambons fumés', wagon: 'frigo', taux: 32 },
  lardons: { nom: 'Lardons', wagon: 'frigo', taux: 24 },
  porcelets: { nom: 'Porcelets (vivants, bavards)', wagon: 'porcs', taux: 40 },
  cereales: { nom: 'Céréales', wagon: 'tremie', tint: [232, 200, 90], taux: 20 },
  sel: { nom: 'Sel de la Frontière', wagon: 'tremie', tint: [245, 245, 245], taux: 21 },
  charbon: { nom: 'Charbon de bois', wagon: 'tremie', tint: [44, 40, 38], taux: 20 },
  chaises: { nom: 'Chaises de banquet niveau VI', wagon: 'chaises', taux: 28 },
  chopes: { nom: 'Chopes et verres (fragile)', wagon: 'couvert', taux: 36 },
  terminaux: { nom: 'Terminaux beiges', wagon: 'couvert', taux: 30 },
  cornichons: { nom: 'Cornichons homologués', wagon: 'couvert', taux: 25 },
  saindoux: { nom: 'Saindoux', wagon: 'citerne', taux: 26 },
  sauce: { nom: 'Sauce Douzi', wagon: 'citerne', taux: 31 },
  moutarde: { nom: 'Moutarde de Belle-Côte', wagon: 'couvert', taux: 27 },
  poisson: { nom: 'Poisson du port', wagon: 'frigo', taux: 29 },
  formulaires: { nom: 'Formulaires B77 (vierges)', wagon: 'couvert', taux: 26 },
  cotes: { nom: 'Côtes de porc', wagon: 'frigo', taux: 30 },
  frites: { nom: 'Frites de Lardombre', wagon: 'frigo', taux: 27 },
};
const META = {
  'Douzi City': { size: 5, prod: ['chaises', 'formulaires'], lm: ['palais', 'statue'], devise: 'Capitale. Sept terrasses, 11 400 tavernes.' },
  'Hamelot': { size: 4, prod: ['vin', 'jambons'], lm: ['chateau'], devise: 'Forteresse, tram et vignes de Stanley.' },
  'Port-Cochon': { size: 4, prod: ['poisson', 'sel'], lm: ['phare'], devise: 'Le port. Contrôle des bateaux très sérieux.' },
  'Nouvelle Groin': { size: 3, prod: ['terminaux', 'cereales'], lm: ['antenne'], devise: 'Ville nouvelle, câbles anciens.' },
  'Belle-Côte': { size: 3, prod: ['moutarde', 'poisson'], lm: ['phare', 'eglise'], devise: 'Côte est, moutarde forte.' },
  'Saucissonnia': { size: 3, prod: ['saucissons'], lm: ['fumoir', 'eglise'], devise: 'Ici, minuit dure un saucisson.' },
  'Bièreval': { size: 3, prod: ['biere', 'citerne'], lm: ['brasserie'], devise: 'Sur la Route du Malt.' },
  'Brassefort': { size: 3, prod: ['biere', 'malt'], lm: ['brasserie', 'chateau'], devise: 'Ville-brasserie fortifiée.' },
  'Biermont': { size: 2, prod: ['malt', 'biere'], lm: ['brasserie'], devise: 'Malterie de montagne.' },
  'Truffe-sur-Neige': { size: 2, prod: ['truffes', 'raclette'], lm: ['eglise'], montagne: true, devise: 'Neige, chalets, truffes.' },
  'Verres-en-Vallée': { size: 2, prod: ['chopes'], lm: ['eglise'], montagne: true, devise: 'Souffleurs de chopes.' },
  'Fumeterre': { size: 2, prod: ['jambons', 'charbon'], lm: ['fumoir'], devise: 'Ville de brumes aromatiques.' },
  'Lard-sur-Mer': { size: 2, prod: ['poisson', 'lardons'], lm: ['phare'], devise: 'Baie du Lard.' },
  'Val-Lardon': { size: 2, prod: ['lardons', 'cereales'], lm: ['moulin'], devise: 'Au bord de la rivière.' },
  'Porcheville': { size: 2, prod: ['porcelets'], lm: ['statue'], devise: 'Élevage et lac tranquille.' },
  'Groin-des-Champs': { size: 2, prod: ['cereales', 'porcelets'], lm: ['moulin'], devise: 'Grenier de la plaine centrale.' },
  'Jambonneau': { size: 2, prod: ['jambons'], lm: ['chope'], devise: 'Jambonneaux et quais venteux.' },
  'Côte-Rib': { size: 2, prod: ['cotes'], lm: ['phare'], devise: 'Au bout du viaduc de la baie.' },
  'Rôtiville': { size: 2, prod: ['charbon', 'cotes'], lm: ['fumoir'], devise: 'Entre deux lacs, un barbecue.' },
  'Saint-Jambon': { size: 3, prod: ['jambons', 'charcuterie'], lm: ['eglise'], devise: 'Le jambon y est consacré.' },
  'Lardanne': { size: 2, prod: ['lardons'], lm: ['chope'], devise: 'Plaine est.' },
  'Saint-Grill': { size: 2, prod: ['charbon'], lm: ['eglise', 'fumoir'], devise: 'Côte est, braises perpétuelles.' },
  'Charcuta': { size: 2, prod: ['charcuterie'], lm: ['fumoir'], devise: 'Charcutiers du nord-est.' },
  'Groinkbourg': { size: 3, prod: ['cornichons'], lm: ['statue'], devise: 'Capitale du cornichon homologué.' },
  'Porcinia': { size: 2, prod: ['porcelets'], lm: ['moulin'], devise: 'Bout du réseau, côté levant.' },
  'Salais-sur-Feu': { size: 2, prod: ['sel'], lm: ['fumoir'], devise: 'Sel et fumée sur la côte sud.' },
  'Grasset Occidental': { size: 2, prod: ['saindoux'], lm: ['chope'], devise: "L'un des deux Grasset." },
  'Grasset du Cap Goustru': { size: 1, prod: ['saindoux', 'poisson'], lm: ['phare'], devise: "L'autre Grasset, tout au bout." },
  'Porcalis': { size: 3, prod: ['sauce'], lm: ['eglise'], devise: 'Patrie de la Sauce Douzi.' },
  'Lardonville': { size: 2, prod: ['lardons', 'frites'], lm: ['chope'], devise: 'Façade ouest, pluie loyale.' },
  'Lardombre': { size: 2, prod: ['frites'], lm: ['moulin'], devise: 'Frites et poules Wi-Fi.' },
};
const CITY = {"Douzi City": {"pop": 2800000, "region": "Bassin central de la Mousse", "spec": "Administration, cuisines centrales, fret alimentaire", "lm": ["palais", "statue"]}, "Truffe-sur-Neige": {"pop": 18400, "region": "Terres Gelées du Groin", "spec": "Truffes sous serre, entretien des convois, bière de garde", "lm": ["eglise"]}, "Nouvelle Groin": {"pop": 192000, "region": "Lisière nord-ouest de la Forêt des Défenses", "spec": "Bois de construction, tonnellerie, quartier industriel", "lm": ["antenne"]}, "Lard-sur-Mer": {"pop": 118000, "region": "Baie du Lard", "spec": "Station maritime, cabotage, porc aux algues", "lm": ["phare"]}, "Bièreval": {"pop": 73000, "region": "Forêt des Défenses", "spec": "Brassage forestier, merrains et malt fumé", "lm": ["brasserie"]}, "Côte-Rib": {"pop": 17600, "region": "Côte occidentale", "spec": "Côtes de porc fumées, réparation des treuils", "lm": ["fumoir"]}, "Port-Cochon": {"pop": 346000, "region": "Baie du Lard", "spec": "Commerce maritime, entrepôts froids, douanes", "lm": ["phare", "statue"]}, "Saint-Jambon": {"pop": 129000, "region": "Forêt des Défenses", "spec": "Pèlerinage charcutier, hôtellerie, jambons de procession", "lm": ["eglise"]}, "Val-Lardon": {"pop": 97000, "region": "Vallée occidentale de la Mousse", "spec": "Navigation intérieure, logements ouvriers, maintenance", "lm": ["moulin"]}, "Biermont": {"pop": 214000, "region": "Vallée des Brasseurs", "spec": "Université brassicole, analyses, petites brasseries", "lm": ["brasserie", "chope"]}, "Lardonville": {"pop": 156000, "region": "Côte du Bacon", "spec": "Administration régionale, marchés couverts, fret côtier", "lm": ["statue"]}, "Saint-Grill": {"pop": 22400, "region": "Côte du Bacon", "spec": "Grilles, broches, métallurgie culinaire", "lm": ["fumoir"]}, "Fumeterre": {"pop": 88000, "region": "Comté du Grésil", "spec": "Fumage, séchage du bois, bière fumée", "lm": ["fumoir"]}, "Verres-en-Vallée": {"pop": 121000, "region": "Presqu’île de la Couenne et Plaines Grasses", "spec": "Verrerie, bouteilles, petits vignobles", "lm": ["chope"]}, "Grasset Occidental": {"pop": 44000, "region": "Presqu’île de la Couenne", "spec": "Pêche, petites conserveries, cabotage des archipels", "lm": ["phare"]}, "Groinkbourg": {"pop": 173000, "region": "Piémont des Monts du Porc", "spec": "Garnison, réparations routières, réserves alimentaires", "lm": ["chateau"]}, "Hamelot": {"pop": 66000, "region": "Monts du Jambon", "spec": "Fumoirs, brasseries, Grands Coteaux viticoles", "lm": ["chateau", "fumoir"]}, "Saucissonnia": {"pop": 231000, "region": "Nord-Est intérieur", "spec": "Boyaux alimentaires et techniques, saucisses, pompes", "lm": ["fumoir", "eglise"]}, "Rôtiville": {"pop": 142000, "region": "Monts du Jambon", "spec": "Bains, rôtis, récupération de chaleur des fours", "lm": ["fumoir"]}, "Porcheville": {"pop": 109000, "region": "Piémont oriental", "spec": "Halles à porches, maçonnerie et transit", "lm": ["statue"]}, "Charcuta": {"pop": 187000, "region": "Côte nord-est", "spec": "Découpe, emballage, exportation et design culinaire", "lm": ["antenne"]}, "Porcinia": {"pop": 264000, "region": "Façade orientale", "spec": "Tourisme balnéaire, hôtellerie, restauration portuaire", "lm": ["phare"]}, "Groin-des-Champs": {"pop": 32800, "region": "Plaines Grasses", "spec": "Élevage, aliments porcins, coopératives céréalières", "lm": ["moulin"]}, "Salais-sur-Feu": {"pop": 28600, "region": "Grande Prairie et bord du Lac des Rillettes", "spec": "Conserves de porc, autoclaves et chaleur géothermale", "lm": ["fumoir"]}, "Jambonneau": {"pop": 138000, "region": "Coteaux de la Bière", "spec": "Ambassades, congrès, houblon et bière diplomatique", "lm": ["statue", "chope"]}, "Lardanne": {"pop": 24700, "region": "Val Fumé", "spec": "Fumoirs, tuiles noires, vergers et jambon fumé", "lm": ["fumoir"]}, "Belle-Côte": {"pop": 203000, "region": "Mer de Porkonia", "spec": "Séjours balnéaires, port de plaisance, cuisine littorale", "lm": ["phare", "eglise"]}, "Porcalis": {"pop": 38400, "region": "Pâturages du Sud", "spec": "Élevage de plein air, jardins, pépinières et maltage", "lm": ["moulin"]}, "Grasset du Cap Goustru": {"pop": 47000, "region": "Cap Goustru", "spec": "Sel, réserves de secours, desserte du cap", "lm": ["phare"]}, "Brassefort": {"pop": 92000, "region": "Vallée des Brasseurs", "spec": "Brasseries fortifiées, chaudières et tonnellerie", "lm": ["brasserie", "chateau"]}, "Lardombre": {"pop": 12600, "region": "Lisière orientale de la Forêt des Défenses", "spec": "Salaisons en caves, marché nocturne et bière de cave", "lm": ["chope"]}};
for (const st of STATIONS) {
  const m = st.meta = META[st.name] || { size: 2, prod: ['cereales'], lm: [] };
  const c = CITY[st.name]; if (!c) continue;
  Object.assign(m, c);
  m.size = c.pop > 1e6 ? 5 : c.pop >= 135000 ? 4 : c.pop >= 60000 ? 3 : c.pop >= 25000 ? 2 : 1;
  m.R = c.pop > 1e6 ? 1000 : clamp(62 * Math.pow(c.pop / 1000, 0.33), 190, 460);
  m.montagne = st.name === 'Truffe-sur-Neige';
}

// ---------- kit de modélisation multi-matériaux
export const TPL = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1).toNonIndexed(),
  cyl24: new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 1).toNonIndexed(),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1).toNonIndexed(),
  tcone: new THREE.CylinderGeometry(0.3, 0.5, 1, 10, 1).toNonIndexed(),
  cone: new THREE.ConeGeometry(0.5, 1, 12, 1).toNonIndexed(),
  sph: new THREE.SphereGeometry(0.5, 16, 12).toNonIndexed(),
  hemi: new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(),
  torus: new THREE.TorusGeometry(0.5, 0.08, 6, 16).toNonIndexed(),
  ico: new THREE.IcosahedronGeometry(0.5, 1),
  ring: new THREE.TorusGeometry(0.5, 0.009, 6, 40, Math.PI).toNonIndexed(),
  roof: (() => {
    const p = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0.5,
      -0.5, 0, 0.5, -0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5,
      0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < p.length; i += 3) uv.push(p[i] + 0.5, p[i + 1] + p[i + 2]); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
  })(),
};
const _n3 = new THREE.Matrix3(), _vv = new THREE.Vector3();
export function M(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); }
const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
export function Mset(out, x, y, z, sx, sy, sz, ry = 0) { _me.set(0, ry, 0); _mq.setFromEuler(_me); return out.compose(_mp.set(x, y, z), _mq, _ms.set(sx, sy, sz)); }
const LINC = new Map();
export function linCol(c) { const k = c.join(','); let v = LINC.get(k); if (!v) { const col = new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); v = [col.r, col.g, col.b]; LINC.set(k, v); } return v; }
export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.leaf = []; }
  add(tpl, m, col, parent, leaf = 0, uvScale = 1) {
    const mm = parent ? new THREE.Matrix4().multiplyMatrices(parent, m) : m;
    _n3.getNormalMatrix(mm);
    const g = typeof tpl === 'string' ? TPL[tpl] : tpl;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const lc = linCol(col);
    for (let i = 0; i < P.count; i++) {
      _vv.fromBufferAttribute(P, i).applyMatrix4(mm); this.p.push(_vv.x, _vv.y, _vv.z);
      _vv.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); this.n.push(_vv.x, _vv.y, _vv.z);
      this.c.push(lc[0], lc[1], lc[2]); this.leaf.push(leaf);
      if (U) this.uv.push(U.getX(i) * uvScale, U.getY(i) * uvScale); else this.uv.push(0, 0);
    }
    return this;
  }
  box(x, y, z, sx, sy, sz, col, ry, parent) { return this.add('box', M(x, y, z, sx, sy, sz, ry || 0), col, parent); }
  get empty() { return this.p.length === 0; }
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
}
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
