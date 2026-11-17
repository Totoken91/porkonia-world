// ============================================================================
//  Partie C : gares, villes, monuments, végétation, herbe, animaux, fumées
// ============================================================================
const PRODUITS = {
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
const TPL = {
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
function M(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); }
const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
function Mset(out, x, y, z, sx, sy, sz, ry = 0) { _me.set(0, ry, 0); _mq.setFromEuler(_me); return out.compose(_mp.set(x, y, z), _mq, _ms.set(sx, sy, sz)); }
const LINC = new Map();
function linCol(c) { const k = c.join(','); let v = LINC.get(k); if (!v) { const col = new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); v = [col.r, col.g, col.b]; LINC.set(k, v); } return v; }
class Geo {
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
class Kit { // une Geo par matériau
  constructor() { this.g = {}; }
  on(mat) { return this.g[mat] || (this.g[mat] = new Geo()); }
  meshes(cast = true) { return Object.entries(this.g).filter(([k, g]) => !g.empty).map(([k, g]) => { const m = new THREE.Mesh(g.geometry(), SMAT[k]); m.castShadow = cast && !SMAT[k].userData.noShadow; m.receiveShadow = true; return m; }); }
  group(cast = true) { const grp = new THREE.Group(); for (const m of this.meshes(cast)) grp.add(m); return grp; }
}
let SMAT = null;
function sceneryMaterials() {
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
function signMesh(text, w, h, opt = {}) {
  const ch = opt.ch || 112, cw = opt.cw || Math.min(1024, Math.round(ch * w / h / 8) * 8);
  const tex = textTexture(text, { ...opt, cw, ch });
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: opt.glow ?? 0.25, roughness: 0.5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

const WALLS = [[255, 222, 140], [250, 160, 130], [160, 205, 238], [255, 240, 200], [186, 226, 170], [246, 178, 205], [255, 252, 236], [244, 190, 96], [205, 180, 235], [150, 215, 205]];
const ROOFS = [[222, 72, 48], [58, 92, 160], [196, 58, 52], [236, 124, 48], [64, 138, 116], [150, 60, 110]];
const CHALET = [[156, 102, 60], [134, 86, 52], [172, 118, 72]];
const TOWERS = [[150, 184, 214], [214, 204, 190], [118, 156, 196], [123, 30, 46], [236, 230, 214], [180, 190, 196]];
const BUILDINGS = []; // {x,y,z,w,d,h,rot,wall,roof,roofH,style,shut,seed}
const STREETS = [];   // {pts:[[x,z]...], w}
const LANDMARK_SPOTS = [];
const scenery = new THREE.Group();

function reserve(x, z, r) { tmMark(x, z, r, 3); }
function freeSpot(st, rnd, rMin, rMax, rad, maxSlope = 6) {
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
function siteOk(x, z, w, d, rot, maxDrop) {
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

const FARMS = [];
// ======================= VILLES : rues, trottoirs, îlots, façades détaillées =======================
const TOWN_TREES = [];      // {sp, x, z, s, col}
const LAMPS = [];           // {x, z, y, rot}
const HEDGES = [];          // {x, z, y, len, h, dep, rot}
const GWALLS = [];          // murets {x, z, y, len, h, dep, rot}
const FOUNTAINS = [];
// --- sol drapé sur le relief (types : 0 enrobé, 1 trottoir, 2 pavés de place, 3 pelouse, 4 gravier, 5 marquage, 6 bordure, 7 dalles de cour, 8 allée)
class Drape {
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
let DRAPE = new Drape();
const DRAPES = [];
function terrainN(x, z) { const d = 2; const nx = hAt(x - d, z) - hAt(x + d, z), nz = hAt(x, z - d) - hAt(x, z + d); const l = Math.hypot(nx, 2 * d, nz); return [nx / l, 2 * d / l, nz / l]; }
// rectangle en coordonnées de ville (a le long de U, b le long de V)
function drapeRect(T, a0, a1, b0, b1, kind, off, cell = 6) {
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
function drapeWall(T, a0, b0, a1, b1, y0, y1, kind, nrm) {
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
function groundMaterial() {
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
  const S = STYLE[o.style];
  const floorY = (o.hi - o.lo) + 1.1;           // niveau du rez-de-chaussée au-dessus de la base
  const gh = o.style === 4 || o.shop ? 3.9 : o.style === 2 ? 4.2 : 3.0, fh = o.style === 4 ? 3.2 : o.style === 2 ? 3.6 : 2.85;
  const wallFloors = o.roofType === 2 ? o.floors - 1 : o.floors;
  const h = o.style === 3 ? floorY + o.hBarn : floorY + gh + Math.max(0, wallFloors - 1) * fh + (o.style === 2 ? 1.2 : 0.35);
  const b = { ...o, base: o.lo - 0.75, floorY, gh, fh, wallFloors, h, bc: [o.x, o.lo, o.z] };
  BUILDINGS.push(b);
  return b;
}

// --- implantation d'une ville
function layoutTown2(st, rnd) {
  const sz = st.meta.size, mont = !!st.meta.montagne, capital = sz >= 5;
  const T = townFrame(st);
  DRAPE = new Drape(); DRAPES.push({ d: DRAPE, x: st.x, z: st.z });
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
function placeFarms2(rnd) {
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
    DRAPE = new Drape(); DRAPES.push({ d: DRAPE, x, z });
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
class PartSet {
  constructor() { this.map = new Map(); }
  add(type, x, y, z, yaw, sx, sy, sz, col, bc) {
    const ck = type + ':' + Math.floor(x / PART_CHUNK) + ':' + Math.floor(z / PART_CHUNK);
    let L = this.map.get(ck); if (!L) { L = { type, list: [] }; this.map.set(ck, L); }
    L.list.push([x, y, z, yaw, sx, sy, sz, col, bc]);
  }
}
const PARTS = new PartSet();
const PART_MESHES = [];
const _pm = new THREE.Matrix4();
function buildTown3() {
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
    addFacadeParts(b);
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
      addRoofParts(b, t);
    });
    rm.geometry.setAttribute('aWallC', new THREE.InstancedBufferAttribute(wc, 3));
    rm.geometry.setAttribute('aRK', new THREE.InstancedBufferAttribute(rk, 1));
    rm.computeBoundingSphere(); rm.castShadow = true; rm.receiveShadow = true; rm.frustumCulled = false; scenery.add(rm);
    freeAfterUpload(null, [rm.instanceMatrix, rm.instanceColor, rm.geometry.attributes.aWallC, rm.geometry.attributes.aRK]);
  });
  for (const L of LAMPS) PARTS.add('lamp', L.x, L.y, L.z, L.rot, 1, 1, 1, [255, 255, 255], [L.x, L.y, L.z]);
  // maillages par tuile
  for (const [, L] of PARTS.map) {
    const geo = G[L.type];
    const im = new THREE.InstancedMesh(geo, partsMat, L.list.length);
    const bc = new Float32Array(L.list.length * 3);
    let cx = 0, cz = 0;
    L.list.forEach((p, i) => {
      im.setMatrixAt(i, M(p[0], p[1], p[2], p[4], p[5], p[6], p[3]));
      const lc = linCol(p[7]); im.setColorAt(i, col.setRGB(lc[0], lc[1], lc[2]));
      if (p[8]) bc.set(p[8], i * 3); else bc.set([-1e9, 0, 0], i * 3);
      cx += p[0]; cz += p[2];
    });
    im.geometry = im.geometry.clone();
    im.geometry.setAttribute('aBC', new THREE.InstancedBufferAttribute(bc, 3));
    im.computeBoundingSphere();
    im.castShadow = L.type === 'chim' || L.type === 'lamp' || L.type === 'balcWood'; im.receiveShadow = true;
    freeAfterUpload(null, [im.instanceMatrix, im.instanceColor, im.geometry.attributes.aBC]);
    scenery.add(im);
    PART_MESHES.push({ mesh: im, cx: (Math.floor(L.list[0][0] / PART_CHUNK) + 0.5) * PART_CHUNK, cz: (Math.floor(L.list[0][2] / PART_CHUNK) + 0.5) * PART_CHUNK, lod: true });
  }
  { const cnt = {}; for (const [, L] of PARTS.map) cnt[L.type] = (cnt[L.type] || 0) + L.list.length; console.log('PV parts', JSON.stringify(cnt), 'drape tris', DRAPE.p.length / 9, 'hedges', HEDGES.length, 'walls', GWALLS.length, 'lamps', LAMPS.length); }
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
  PARTS.map.clear();
}
function updateTownLOD(camPos) {
  const R = DET_U.value + PART_CHUNK * 0.75;
  for (const p of PART_MESHES) p.mesh.visible = Math.hypot(p.cx - camPos.x, p.cz - camPos.z) < R;
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
// points de façade → monde
function facadePoint(b, face, u, y, out) {
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

// ---------- monuments
const ANIMATED = [], SMOKERS = [], LIGHTS = [];
function landmark(kind, st, rnd) {
  const K = new Kit();
  let spot;
  const S = [214, 200, 172];
  switch (kind) {
    case 'palais': {
      spot = freeSpot(st, rnd, 150, 300, 52, 9); if (!spot) return;
      K.on('stone').box(0, 8, 0, 74, 16, 44, S).box(0, 17, 0, 54, 4, 32, [200, 186, 160]);
      K.on('stone').add('cyl24', M(0, 22, 0, 24, 8, 24), S);
      K.on('copper').add('hemi', M(0, 26, 0, 26, 24, 26), [120, 190, 160]);
      for (const sx of [-32, 32]) for (const sz2 of [-17, 17]) { K.on('stone').add('cyl24', M(sx, 12, sz2, 8, 24, 8), S); K.on('roof').add('cone', M(sx, 28, sz2, 10, 9, 10), [123, 30, 46]); }
      for (let k = -5; k <= 5; k++) K.on('stone').add('cyl', M(k * 5.4, 7, 22.6, 1.6, 14, 1.6), [246, 240, 228]);
      K.on('stone').box(0, 15.5, 22.6, 60, 1.8, 2.4, [236, 226, 206]);
      for (let k = -6; k <= 6; k++) for (const fl of [5, 11]) K.on('glass').box(k * 5.2, fl, -22.1, 2, 3.2, 0.2, [60, 70, 80]);
      const grp = K.group();
      const statue = new THREE.Mesh(makePigGeometry(true), SMAT.gold); statue.scale.setScalar(6.5); statue.position.set(0, 38.5, 0); statue.castShadow = true;
      grp.add(statue); ANIMATED.push({ obj: statue, kind: 'spin' });
      const flag = signMesh('PORKONIA', 16, 3.4, { bg: '#7b1e2e' }); flag.position.set(0, 18.3, 24); grp.add(flag);
      place(grp, spot, st, kind, 55); return;
    }
    case 'statue': {
      spot = freeSpot(st, rnd, 80, 240, 13); if (!spot) return;
      K.on('stone').box(0, 2.5, 0, 9, 5, 9, [210, 200, 186]).box(0, 5.6, 0, 7, 1.2, 7, [190, 180, 166]);
      const grp = K.group();
      const statue = new THREE.Mesh(makePigGeometry(true), SMAT.gold); statue.scale.setScalar(3.6); statue.position.set(0, 6.2, 0); statue.rotation.y = rnd() * 6; statue.castShadow = true;
      grp.add(statue); place(grp, spot, st, kind, 14); return;
    }
    case 'chateau': {
      spot = freeSpot(st, rnd, 200, 460, 42, 16); if (!spot) return;
      K.on('stone').box(0, 10, 0, 34, 20, 26, S);
      for (const [x, z] of [[-22, -18], [22, -18], [-22, 18], [22, 18]]) { K.on('stone').add('cyl24', M(x, 13, z, 10, 26, 10), S); K.on('roof').add('cone', M(x, 30, z, 12, 10, 12), [70, 74, 92]); }
      K.on('stone').add('cyl24', M(0, 26, 0, 12, 16, 12), S); K.on('roof').add('cone', M(0, 40, 0, 14, 14, 14), [70, 74, 92]);
      K.on('stone').box(0, 5, -20, 36, 10, 2, S).box(0, 5, 20, 36, 10, 2, S).box(-22, 5, 0, 2, 10, 32, S).box(22, 5, 0, 2, 10, 32, S);
      for (let k = -8; k <= 8; k++) for (const z of [-20, 20]) K.on('stone').box(k * 2.1, 10.6, z, 1, 1.2, 2.2, S);
      place(K.group(), spot, st, kind, 40);
      // vignes de Stanley
      const vs = freeSpot(st, rnd, 260, 560, 32, 22);
      if (vs) { const V = new Kit(); for (let k = 0; k < 14; k++) V.on('wood').box(0, 0.9, k * 4.6 - 30, 54, 1.8, 1.2, [70, 120, 50]); const vg = V.group(); vg.position.set(vs.x, vs.y, vs.z); vg.rotation.y = rnd() * 3; scenery.add(vg); reserve(vs.x, vs.z, 32); }
      return;
    }
    case 'brasserie': {
      spot = freeSpot(st, rnd, 90, 320, 27); if (!spot) return;
      K.on('plaster').box(0, 7, 0, 36, 14, 20, [176, 92, 60]); K.on('roof').add('roof', M(0, 14, 0, 21, 5, 37, Math.PI / 2), [80, 84, 96]);
      for (let k = 0; k < 4; k++) { K.on('copper').add('cyl24', M(-14 + k * 9.5, 9, 15, 7, 18, 7), [220, 150, 90]); K.on('copper').add('hemi', M(-14 + k * 9.5, 18, 15, 7, 4, 7), [230, 160, 96]); }
      K.on('stone').add('cyl', M(14, 18, -6, 2.4, 36, 2.4), [150, 70, 50]);
      for (let k = 0; k < 7; k++) K.on('glass').box(-15 + k * 5, 8, -10.1, 2.2, 4, 0.2, [60, 70, 80]);
      const grp = K.group();
      const sign = signMesh('DOUZI AMBRÉE', 16, 3, { bg: '#d68a1e', fg: '#2a1408', glow: 0.5 }); sign.position.set(0, 11.5, -10.4); sign.rotation.y = Math.PI; grp.add(sign);
      SMOKERS.push({ rel: [14, 37, -6], rate: 0.7, size: 3.2 });
      place(grp, spot, st, kind, 28); return;
    }
    case 'phare': {
      let best = null;
      for (let k = 0; k < 160; k++) { const sp = freeSpot(st, rnd, 120, 600, 7, 10); if (!sp) continue; let near = false; for (let a = 0; a < 6.28; a += 0.6) if (waterAt(sp.x + Math.cos(a) * 45, sp.z + Math.sin(a) * 45) > -1e8) near = true; if (near) { best = sp; break; } }
      spot = best || freeSpot(st, rnd, 120, 420, 8, 8); if (!spot) return;
      for (let k = 0; k < 6; k++) K.on('paint').add('cyl24', M(0, 2.6 + k * 5.2, 0, 6 - k * 0.45, 5.2, 6 - k * 0.45), k % 2 ? [238, 238, 236] : [190, 32, 40]);
      K.on('glass').add('cyl24', M(0, 33, 0, 4.4, 3.2, 4.4), [200, 220, 230]); K.on('paint').add('cone', M(0, 36.2, 0, 5.6, 3, 5.6), [190, 32, 40]);
      K.on('glow').add('sph', M(0, 33, 0, 2.2, 2.2, 2.2), [255, 236, 170]);
      K.on('metal').add('torus', M(0, 31.4, 0, 6.4, 6.4, 6.4, 0, Math.PI / 2), [60, 60, 64]);
      place(K.group(), spot, st, kind, 9); return;
    }
    case 'eglise': {
      spot = freeSpot(st, rnd, 80, 340, 19); if (!spot) return;
      const SS = st.meta.montagne ? [226, 220, 204] : [230, 216, 184];
      K.on('stone').box(0, 6.5, 0, 12, 13, 26, SS); K.on('roof').add('roof', M(0, 13, 0, 13.4, 6.5, 27.4), [80, 84, 96]);
      K.on('stone').box(0, 12, -15, 7.5, 24, 7.5, SS); K.on('roof').add('cone', M(0, 29.5, -15, 6.6, 11, 6.6), [80, 84, 96]);
      for (let k = -3; k <= 3; k++) K.on('glass').box(6.1, 7, k * 3.4, 0.2, 4.5, 1.2, [120, 60, 70]).box(-6.1, 7, k * 3.4, 0.2, 4.5, 1.2, [60, 70, 140]);
      const grp = K.group();
      const clock = signMesh('12:12', 3.6, 3.6, { bg: '#f3e7c9', fg: '#17110e', border: false, cw: 128, ch: 128 }); clock.position.set(0, 19, -18.9); clock.rotation.y = Math.PI; grp.add(clock);
      place(grp, spot, st, kind, 20); return;
    }
    case 'moulin': {
      spot = freeSpot(st, rnd, 140, 520, 11, 8); if (!spot) return;
      K.on('plaster').add('tcone', M(0, 6.5, 0, 9, 13, 9), [240, 232, 214]); K.on('roof').add('cone', M(0, 15, 0, 8.5, 5, 8.5), [150, 70, 50]);
      const grp = K.group();
      const B = new Kit();
      for (let k = 0; k < 4; k++) { const R = M(0, 0, 0, 1, 1, 1, 0, 0, k * Math.PI / 2); B.on('wood').box(0, 0, 0, 0.5, 11, 0.4, [130, 90, 60], 0, R.clone().multiply(M(0, 5.5, 0, 1, 1, 1))); B.on('plaster').box(0, 0, 0, 2.6, 8.5, 0.12, [246, 240, 226], 0, R.clone().multiply(M(1.6, 6.2, 0, 1, 1, 1))); }
      const blades = B.group(); blades.position.set(0, 13.5, 4.8); grp.add(blades);
      ANIMATED.push({ obj: blades, kind: 'mill' });
      place(grp, spot, st, kind, 12); return;
    }
    case 'chope': {
      spot = freeSpot(st, rnd, 90, 350, 10); if (!spot) return;
      K.on('metal').add('cyl', M(0, 9, 0, 2.2, 18, 2.2), [190, 190, 196]);
      K.on('glass').add('cyl24', M(0, 23, 0, 11, 11, 11), [236, 150, 30]); K.on('plaster').add('cyl24', M(0, 29.3, 0, 11.8, 2.6, 11.8), [252, 250, 240]);
      K.on('plaster').add('sph', M(0, 31, 0, 11, 3.5, 11), [252, 250, 240]);
      K.on('glass').box(7.2, 23, 0, 1.8, 8, 1.8, [230, 230, 236]).box(6, 27, 0, 3, 1.6, 1.8, [230, 230, 236]).box(6, 19, 0, 3, 1.6, 1.8, [230, 230, 236]);
      place(K.group(), spot, st, kind, 11); return;
    }
    case 'fumoir': {
      spot = freeSpot(st, rnd, 90, 360, 15); if (!spot) return;
      K.on('wood').box(0, 4, 0, 18, 8, 12, [120, 84, 60]); K.on('roof').add('roof', M(0, 8, 0, 13, 4, 19, Math.PI / 2), [70, 60, 56]);
      for (const x of [-5, 5]) K.on('stone').add('cyl', M(x, 13, 0, 1.8, 12, 1.8), [96, 70, 56]);
      SMOKERS.push({ rel: [-5, 19.5, 0], rate: 1.0, size: 2.4 }, { rel: [5, 19.5, 0], rate: 1.0, size: 2.4 });
      place(K.group(), spot, st, kind, 16); return;
    }
    case 'antenne': {
      spot = freeSpot(st, rnd, 120, 400, 10, 10); if (!spot) return;
      for (let k = 0; k < 8; k++) K.on('paint').box(0, 4 + k * 8, 0, 4 - k * 0.35, 8, 4 - k * 0.35, k % 2 ? [236, 236, 236] : [190, 32, 40]);
      K.on('glow').add('sph', M(0, 68, 0, 1.6, 1.6, 1.6), [255, 60, 40]);
      const grp = K.group();
      const sign = signMesh('PIGNET', 8, 2, { bg: '#17110e', fg: '#f2b630', glow: 0.8 }); sign.position.set(0, 10, 2.4); grp.add(sign);
      place(grp, spot, st, kind, 11); return;
    }
  }
}
function place(grp, spot, st, kind, r) {
  grp.position.set(spot.x, spot.y - 0.4, spot.z);
  grp.rotation.y = -st.ax + (hashStr(st.name + kind) % 4) * Math.PI / 2;
  grp.updateMatrixWorld(true);
  for (const s of SMOKERS) if (s.rel && !s.done) { const v = new THREE.Vector3(...s.rel).applyMatrix4(grp.matrixWorld); s.x = v.x; s.y = v.y; s.z = v.z; s.done = true; }
  scenery.add(grp); reserve(spot.x, spot.z, r);
  LANDMARK_SPOTS.push({ st: st.id, kind, x: spot.x, z: spot.z });
}

// ---------- gares
const PLATFORM_SLOTS = [];
function buildStation(st) {
  const K = new Kit(), sg = new THREE.Group();
  const ax = st.ax;
  const R = M(st.x, 0, st.z, 1, 1, 1, -ax);
  const right = [-st.dir.y, st.dir.x];
  const big = st.meta.size >= 3;
  const Y = st.y;
  const sides = big ? [1, -1] : [1];
  const slots = [];
  const D = [52, 54, 60], BORD = [123, 30, 46];
  for (const sd of sides) {
    const off = sd * 3.95;
    K.on('plaster').box(0, Y + 0.28, off, PLATFORM_HALF * 2, 1.36, 4.6, [200, 196, 188], 0, R);
    K.on('paint').box(0, Y + 0.97, off - sd * 1.95, PLATFORM_HALF * 2, 0.03, 0.32, [246, 240, 230], 0, R);
    K.on('paint').box(0, Y + 0.975, off - sd * 1.55, PLATFORM_HALF * 2, 0.03, 0.12, [242, 196, 40], 0, R);
    const nAbri = st.meta.size >= 4 ? 5 : big ? 3 : 2;
    for (let k = 0; k < nAbri; k++) {
      const x = (k - (nAbri - 1) / 2) * 32;
      for (let px = -10; px <= 10; px += 5) K.on('metal').add('cyl', M(x + px, Y + 2.6, off + sd * 1.2, 0.22, 3.3, 0.22), D, R);
      K.on('paint').box(x, Y + 4.35, off + sd * 0.4, 24, 0.3, 4.8, BORD, 0, R);
      K.on('metal').box(x, Y + 4.2, off + sd * 1.2, 24, 0.25, 0.25, D, 0, R);
      K.on('wood').box(x - 3, Y + 1.5, off + sd * 1.7, 4, 0.12, 0.7, [150, 102, 62], 0, R).box(x - 3, Y + 1.9, off + sd * 2.0, 4, 0.7, 0.1, [150, 102, 62], 0, R);
      K.on('metal').box(x + 4, Y + 1.5, off + sd * 1.9, 0.7, 1.1, 0.5, [60, 110, 70], 0, R);
    }
    for (let x = -PLATFORM_HALF + 12; x <= PLATFORM_HALF - 12; x += 24) {
      K.on('metal').add('cyl', M(x, Y + 3.2, off + sd * 1.9, 0.16, 4.4, 0.16), D, R);
      K.on('dark').box(x, Y + 5.45, off + sd * 1.5, 0.5, 0.25, 1.1, D, 0, R);
      K.on('glow').box(x, Y + 5.3, off + sd * 1.5, 0.36, 0.06, 0.9, [255, 226, 170], 0, R);
    }
    for (const x of [-105, -40, 40, 105]) {
      K.on('metal').box(x - 2.6, Y + 2.4, off + sd * 1.7, 0.16, 3, 0.16, D, 0, R).box(x + 2.6, Y + 2.4, off + sd * 1.7, 0.16, 3, 0.16, D, 0, R);
      const sign = signMesh(st.name.toUpperCase(), 6, 1.15);
      const wx = st.x + st.dir.x * x + right[0] * (off + sd * 1.7), wz = st.z + st.dir.y * x + right[1] * (off + sd * 1.7);
      sign.position.set(wx, Y + 3.5, wz); sign.rotation.y = -ax + (sd > 0 ? Math.PI : 0); sg.add(sign);
    }
    for (let k = 0; k < 24; k++) slots.push({ a: (k / 24 - 0.5) * 220 + (hashStr(st.name + k) % 7) - 3, c: off + sd * (0.2 + (k % 3) * 0.6) });
  }
  for (const sd of [1, -1]) {
    const x = sd * STOP_MARK, off = 2.2;
    K.on('metal').add('cyl', M(x, Y + 1.6, off, 0.12, 3.2, 0.12), D, R);
    const sign = signMesh('ARRÊT', 1.2, 1.2, { bg: '#f3e7c9', fg: '#7b1e2e', cw: 128, ch: 128, size: 34, glow: 0.4 });
    sign.position.set(st.x + st.dir.x * x + right[0] * off, Y + 3.0, st.z + st.dir.y * x + right[1] * off);
    sign.rotation.y = Math.atan2(-sd * st.dir.x, -sd * st.dir.y); sg.add(sign);
  }
  // signaux d'entrée (feux verts)
  for (const sd of [1, -1]) {
    const x = sd * (FIX + 40);
    K.on('metal').add('cyl', M(x, Y + 3, -3.4 * sd, 0.2, 6, 0.2), D, R);
    K.on('dark').box(x, Y + 6.3, -3.4 * sd, 0.6, 1.4, 0.4, [24, 24, 26], 0, R);
    K.on('glow').add('sph', M(x, Y + 6.7, -3.4 * sd - 0.22 * sd, 0.28, 0.28, 0.28), [80, 255, 120], R);
    K.on('dark').add('sph', M(x, Y + 6.1, -3.4 * sd - 0.2 * sd, 0.26, 0.26, 0.26), [70, 20, 20], R);
  }
  // bâtiment voyageurs
  const bl = [0, 26, 34, 48, 70, 120][st.meta.size], bz = 3.95 + 2.3 + 8;
  K.on('plaster').box(0, Y + 4.5, bz, bl, 9, 14, [240, 230, 206], 0, R);
  K.on('roof').add('roof', M(0, Y + 9, bz, 15.6, 4.5, bl + 2, Math.PI / 2), [123, 30, 46], R);
  K.on('stone').box(0, Y + 0.4, bz, bl + 0.4, 0.8, 14.4, [170, 160, 148], 0, R);
  for (let k = 0; k < Math.floor(bl / 4.5); k++) { const x = -bl / 2 + 2.6 + k * 4.5; if (Math.abs(x) < 4) continue; for (const fl of [2.4, 6.2]) K.on('glass').box(x, Y + fl, bz - 7.05, 1.6, 2.2, 0.12, [60, 70, 80], 0, R); }
  K.on('wood').box(0, Y + 1.7, bz - 7.05, 4.6, 3.4, 0.2, [96, 60, 40], 0, R);
  const bigSign = signMesh(st.name.toUpperCase(), Math.min(bl * 0.8, 30), 2.4, { sub: 'SCPB', glow: 0.45 });
  bigSign.position.set(st.x + right[0] * (bz - 7.15), Y + 7.2, st.z + right[1] * (bz - 7.15)); bigSign.rotation.y = -ax + Math.PI; sg.add(bigSign);
  const clock = signMesh('12:12', 2.2, 2.2, { bg: '#f3e7c9', fg: '#17110e', border: false, cw: 128, ch: 128, glow: 0.4 });
  clock.position.set(st.x + st.dir.x * (bl * 0.42) + right[0] * (bz - 7.15), Y + 7.2, st.z + st.dir.y * (bl * 0.42) + right[1] * (bz - 7.15)); clock.rotation.y = -ax + Math.PI; sg.add(clock);
  if (st.meta.size >= 5) {
    for (let x = -110; x <= 110; x += 20) for (const sd of [-1, 1]) K.on('metal').box(x, Y + 6, sd * 12.5, 0.6, 12, 0.6, D, 0, R);
    for (let x = -110; x <= 110; x += 10) K.on('metal').add('ring', M(x, Y + 12, 0, 26, 26, 26, Math.PI / 2), D, R);
    const hall = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 230, 28, 1, true, 0, Math.PI), SMAT.hall);
    const holder = new THREE.Group(); holder.add(hall); holder.position.set(st.x, Y + 12, st.z); holder.rotation.y = -ax; hall.rotation.set(0, 0, Math.PI / 2);
    sg.add(holder);
  }
  for (const side of [1, -1]) {
    const o = DEPART[st.id][side][0];
    if (o && o.t.stub) {
      const x = side * (o.t.L - 3);
      K.on('paint').box(x, Y + 0.7, 0, 1.2, 1.4, 3.6, [196, 36, 44], 0, R);
      K.on('paint').box(x, Y + 1.0, -1.6, 0.6, 0.6, 0.6, [246, 220, 60], 0, R).box(x, Y + 1.0, 1.6, 0.6, 0.6, 0.6, [246, 220, 60], 0, R);
    }
  }
  for (const m of K.meshes()) sg.add(m);
  scenery.add(sg);
  PLATFORM_SLOTS[st.id] = slots.map(s => ({ x: st.x + st.dir.x * s.a + right[0] * s.c, z: st.z + st.dir.y * s.a + right[1] * s.c, y: Y + 0.97 }));
}

// ---------- cochons
function makePigGeometry(gold) {
  const g = new Geo();
  const P = [255, 255, 255], S = [228, 196, 204], D = [60, 44, 44];
  g.add('sph', M(0, 0.78, 0, 0.84, 0.74, 1.42), P);
  g.add('sph', M(0, 0.98, 0.78, 0.66, 0.6, 0.6), P);
  g.add('cyl', M(0, 0.92, 1.1, 0.34, 0.16, 0.28, 0, Math.PI / 2), S);
  g.add('cyl', M(-0.075, 0.93, 1.185, 0.07, 0.02, 0.09, 0, Math.PI / 2), D).add('cyl', M(0.075, 0.93, 1.185, 0.07, 0.02, 0.09, 0, Math.PI / 2), D);
  g.add('cone', M(-0.2, 1.3, 0.72, 0.2, 0.26, 0.1, 0, -0.3, 0.35), P).add('cone', M(0.2, 1.3, 0.72, 0.2, 0.26, 0.1, 0, -0.3, -0.35), P);
  g.add('sph', M(-0.17, 1.07, 1.02, 0.07, 0.08, 0.04), D).add('sph', M(0.17, 1.07, 1.02, 0.07, 0.08, 0.04), D);
  for (const [x, z] of [[-0.24, 0.42], [0.24, 0.42], [-0.24, -0.42], [0.24, -0.42]]) { g.add('cyl', M(x, 0.24, z, 0.2, 0.5, 0.2), P); g.add('cyl', M(x, 0.03, z, 0.21, 0.06, 0.21), D); }
  g.add('torus', M(0, 0.98, -0.74, 0.22, 0.22, 0.22, Math.PI / 2), P);
  if (gold) for (let i = 0; i < g.c.length; i++) g.c[i] = 1;
  return g.geometry();
}
function makeCitizenGeometries() {
  const skin = new Geo(), shirt = new Geo(), pants = new Geo();
  const W = [255, 255, 255], S = [228, 196, 204], D = [50, 40, 40];
  pants.add('cyl', M(-0.12, 0.45, 0, 0.2, 0.9, 0.22), W).add('cyl', M(0.12, 0.45, 0, 0.2, 0.9, 0.22), W);
  pants.box(-0.12, 0.05, 0.05, 0.2, 0.1, 0.32, [40, 36, 34]).box(0.12, 0.05, 0.05, 0.2, 0.1, 0.32, [40, 36, 34]);
  shirt.add('cyl', M(0, 1.22, 0, 0.56, 0.72, 0.34), W).add('cyl', M(-0.36, 1.2, 0, 0.14, 0.6, 0.14, 0, 0, 0.12), W).add('cyl', M(0.36, 1.2, 0, 0.14, 0.6, 0.14, 0, 0, -0.12), W);
  skin.add('sph', M(0, 1.8, 0, 0.5, 0.46, 0.46), W).add('cyl', M(0, 1.74, 0.24, 0.22, 0.1, 0.18, 0, Math.PI / 2), S);
  skin.add('sph', M(-0.05, 1.745, 0.295, 0.04, 0.05, 0.02), D).add('sph', M(0.05, 1.745, 0.295, 0.04, 0.05, 0.02), D);
  skin.add('cone', M(-0.17, 2.06, 0.02, 0.14, 0.18, 0.06, 0, 0, 0.3), W).add('cone', M(0.17, 2.06, 0.02, 0.14, 0.18, 0.06, 0, 0, -0.3), W);
  skin.add('sph', M(-0.1, 1.88, 0.2, 0.06, 0.06, 0.03), D).add('sph', M(0.1, 1.88, 0.2, 0.06, 0.06, 0.03), D);
  skin.add('sph', M(-0.38, 0.86, 0, 0.13, 0.13, 0.13), W).add('sph', M(0.38, 0.86, 0, 0.13, 0.13, 0.13), W);
  return { skin: skin.geometry(), shirt: shirt.geometry(), pants: pants.geometry() };
}
const PIG_SKINS = [[242, 168, 182], [138, 92, 62], [52, 42, 40], [232, 150, 164], [168, 112, 80]];
const SHIRTS = [[123, 30, 46], [243, 231, 201], [47, 127, 214], [242, 182, 48], [70, 140, 70], [120, 120, 130], [230, 90, 60], [96, 70, 140]];
const PANTS = [[50, 54, 70], [90, 70, 50], [40, 40, 44], [110, 110, 120], [70, 80, 110]];
const creatureMat = () => worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), { key: 'creature' });
const citizens = { meshes: null, list: [] };
function buildCitizens() {
  const geos = makeCitizenGeometries();
  const count = STATIONS.reduce((a, s) => a + PLATFORM_SLOTS[s.id].length, 0);
  const mat = creatureMat();
  const mk = g => { const m = new THREE.InstancedMesh(g, mat, count); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; return m; };
  citizens.meshes = { skin: mk(geos.skin), shirt: mk(geos.shirt), pants: mk(geos.pants) };
  const col = new THREE.Color();
  let i = 0;
  for (const st of STATIONS) PLATFORM_SLOTS[st.id].forEach((p, k) => {
    const h = hashStr(st.name + ':' + k);
    const c = { st: st.id, k, x: p.x, y: p.y, z: p.z, rot: -st.ax + Math.PI / 2 + ((h % 100) / 100 - 0.5) * 1.4, visible: false, walk: null, phase: (h % 628) / 100, i };
    citizens.list.push(c);
    const sk = PIG_SKINS[h % PIG_SKINS.length], sh = SHIRTS[(h >>> 4) % SHIRTS.length], pa = PANTS[(h >>> 8) % PANTS.length];
    citizens.meshes.skin.setColorAt(i, col.setRGB(sk[0] / 255, sk[1] / 255, sk[2] / 255, THREE.SRGBColorSpace));
    citizens.meshes.shirt.setColorAt(i, col.setRGB(sh[0] / 255, sh[1] / 255, sh[2] / 255, THREE.SRGBColorSpace));
    citizens.meshes.pants.setColorAt(i, col.setRGB(pa[0] / 255, pa[1] / 255, pa[2] / 255, THREE.SRGBColorSpace));
    i++;
  });
  for (const m of Object.values(citizens.meshes)) scenery.add(m);
}
const _cm = new THREE.Matrix4();
function updateCitizens(t, dt, camPos) {
  const ms = citizens.meshes; if (!ms) return;
  let any = false;
  for (const c of citizens.list) {
    const near = Math.abs(c.x - camPos.x) < 700 && Math.abs(c.z - camPos.z) < 700;
    if (!near && !c.walk && c.shown === c.visible) continue;
    c.shown = c.visible; any = true;
    let s = c.visible ? 1 : 0;
    if (c.walk) {
      c.walk.t += dt;
      const k = clamp(c.walk.t / c.walk.dur, 0, 1);
      c.x = lerp(c.walk.x0, c.walk.tx, k); c.z = lerp(c.walk.z0, c.walk.tz, k);
      c.rot = Math.atan2(c.walk.tx - c.walk.x0, c.walk.tz - c.walk.z0);
      if (k >= 1) { c.visible = false; c.walk = null; const p = PLATFORM_SLOTS[c.st][c.k]; c.x = p.x; c.z = p.z; s = 0; }
    }
    const bob = c.walk ? Math.abs(Math.sin(t * 9 + c.phase)) * 0.08 : Math.sin(t * 2 + c.phase) * 0.02;
    Mset(_cm, c.x, c.y + bob, c.z, s, s, s, c.rot);
    ms.skin.setMatrixAt(c.i, _cm); ms.shirt.setMatrixAt(c.i, _cm); ms.pants.setMatrixAt(c.i, _cm);
  }
  if (any) ms.skin.instanceMatrix.needsUpdate = ms.shirt.instanceMatrix.needsUpdate = ms.pants.instanceMatrix.needsUpdate = true;
}
const herds = { mesh: null, pigs: [] };
function buildHerds(rnd) {
  const pigs = [];
  const spots = [];
  for (const st of STATIONS) for (let h = 0; h < 1 + st.meta.size; h++) { const sp = freeSpot(st, rnd, 300, 1400, 22, 5); if (sp) spots.push(sp); }
  for (const f of FARMS) spots.push({ x: f.x + Math.cos(f.rot + 1.6) * 30, z: f.z + Math.sin(f.rot + 1.6) * 30 });
  for (const sp of spots) {
    const n = 5 + (rnd() * 7 | 0), skin = PIG_SKINS[(rnd() * 3) | 0];
    for (let k = 0; k < n; k++) { const x = sp.x + (rnd() - 0.5) * 30, z = sp.z + (rnd() - 0.5) * 30; pigs.push({ cx: sp.x, cz: sp.z, x, z, rot: rnd() * 6.28, tx: x, tz: z, wait: rnd() * 4, skin, sc: 0.8 + rnd() * 0.5 }); }
    reserve(sp.x, sp.z, 20);
  }
  const pa = makePorc(); herds.U = pa.U;
  const mesh = new THREE.InstancedMesh(pa.geo, pa.mat, pigs.length);
  const col = new THREE.Color();
  pigs.forEach((p, i) => { const h = rnd(); p.sc *= 0.5; if (h < 0.05) col.setRGB(1.05, 1.55, 0.6); else if (h < 0.3) col.setRGB(0.86, 0.8, 0.8); else if (h < 0.4) col.setRGB(0.5, 0.42, 0.3); else col.setRGB(1, 1, 1); mesh.setColorAt(i, col); p.col = col.clone(); });
  mesh.count = 0;
  mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = true;
  herds.mesh = mesh; herds.pigs = pigs; herds.rnd = rnd;
  scenery.add(mesh);
}
function updateHerds(t, dt, camPos) {
  const { mesh, pigs, rnd } = herds; if (!mesh) return;
  let j = 0; const HR = 520;
  pigs.forEach((p, i) => {
    if (Math.abs(p.x - camPos.x) > HR || Math.abs(p.z - camPos.z) > HR) return;
    const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { p.wait -= dt; if (p.wait < 0) { p.tx = p.cx + (rnd() - 0.5) * 34; p.tz = p.cz + (rnd() - 0.5) * 34; p.wait = 2 + rnd() * 6; } }
    else { const sp = Math.min(d, 0.9 * dt); p.x += dx / d * sp; p.z += dz / d * sp; const want = Math.atan2(dx, dz); let da = want - p.rot; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; p.rot += da * Math.min(1, dt * 3); }
    const walk = d > 0.3 ? Math.abs(Math.sin(t * 10 + i)) * 0.03 : 0;
    mesh.setMatrixAt(j, Mset(_cm, p.x, hAt(p.x, p.z) + walk, p.z, p.sc, p.sc, p.sc, p.rot)); mesh.setColorAt(j, p.col); j++;
  });
  mesh.count = j; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

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
function treeMaterial() {
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

const VEG = { chunks: [], species: null, CH: 750 };
function buildVegetation(rnd) {
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
    const lod0 = mk(spec.lod0, true), lod1 = mk(spec.lod1, false), lod2 = mk(spec.lod2, false);
    lod1.visible = false; lod0.visible = false; lod2.visible = false;
    scenery.add(lod0, lod1, lod2);

    const cx = (+ci + 0.5) * CH - WW / 2, cz = (+cj + 0.5) * CH - HH / 2;
    VEG.chunks.push({ cx, cz, lod0, lod1, lod2, rock: !!spec.rock, small: sp === 'buisson' });
  }
  void NCX; void NCZ;
  return count;
}
function updateVegetation(camPos) {
  const near = Q.treeNear, far = Q.treeFar || 6000, half = VEG.CH * 0.7071;
  for (const c of VEG.chunks) {
    const d = Math.max(0, Math.hypot(c.cx - camPos.x, c.cz - camPos.z) - half);
    const lim = c.small ? Math.min(near, 900) : near;
    c.lod0.visible = d < lim;
    c.lod1.visible = !c.lod0.visible && d < (c.rock || c.small ? 1800 : Q.treeMid);
    c.lod2.visible = !c.lod0.visible && !c.lod1.visible && d < (c.rock || c.small ? 3500 : far);
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
function buildHay(rnd) {
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

// ---------- gobelins réseau (n'existent pas)
function buildGoblins() {
  for (const s of GOBLIN_SPOTS) {
    const K = new Kit();
    K.on('paint').box(0, 0.35, 0, 0.3, 0.7, 0.2, [70, 150, 60]).box(0, 0.62, 0, 0.42, 0.42, 0.26, [244, 120, 30]);
    K.on('paint').add('sph', M(0, 1.02, 0, 0.4, 0.38, 0.34), [90, 170, 70]).add('cone', M(-0.26, 1.08, 0, 0.12, 0.26, 0.08, 0, 0, 1.2), [90, 170, 70]).add('cone', M(0.26, 1.08, 0, 0.12, 0.26, 0.08, 0, 0, -1.2), [90, 170, 70]);
    K.on('wood').add('cyl24', M(0.55, 0.35, 0.1, 0.7, 0.5, 0.7, 0, Math.PI / 2), [180, 140, 90]);
    const g = K.group(); g.position.set(s.x, hAt(s.x, s.z), s.z); g.rotation.y = s.ang; g.scale.setScalar(1.6);
    scenery.add(g);
  }
}

// ---------- fumées (billboards doux)
const smoke = { mesh: null, parts: [], i: 0 };
function buildSmoke() {
  const N = 360;
  const g = new THREE.PlaneGeometry(1, 1);
  const ig = new THREE.InstancedBufferGeometry().copy(g);
  const aP = new Float32Array(N * 4), aC = new Float32Array(N);
  ig.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); ig.setAttribute('aA', new THREE.InstancedBufferAttribute(aC, 1));
  ig.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSunDir: { value: SUN_DIR }, uSunCol: { value: SUN_COL }, tNz: { value: NOISE } }]),
    vertexShader: `attribute vec4 aP; attribute float aA; varying float vA; varying vec2 vUv; varying float vSeed;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vA = aA; vSeed = aP.x * 0.13 + aP.z * 0.07;
        vec4 mvPosition = viewMatrix * vec4(aP.xyz, 1.0); mvPosition.xy += position.xy * aP.w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSunDir, uSunCol; uniform sampler2D tNz; varying float vA; varying vec2 vUv; varying float vSeed;
      #include <fog_pars_fragment>
      void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; float n = texture2D(tNz, vUv * 0.5 + vSeed).r;
        float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.5) * vA; if (a < 0.01) discard;
        vec3 c = vec3(0.62, 0.6, 0.58) * (0.45 + 0.4 * max(uSunDir.y + 0.3, 0.0)) + uSunCol * 0.25 * (0.5 - d.y);
        gl_FragColor = vec4(c, a * 0.55);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  const mesh = new THREE.Mesh(ig, mat); mesh.frustumCulled = false; mesh.layers.set(1);
  for (let i = 0; i < N; i++) smoke.parts.push({ life: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, s: 0, max: 1 });
  smoke.mesh = mesh; smoke.aP = aP; smoke.aA = aC; smoke.geo = ig;
  scene.add(mesh);
}
function puff(x, y, z, vx, vy, vz, s, life) { const p = smoke.parts[smoke.i]; smoke.i = (smoke.i + 1) % smoke.parts.length; Object.assign(p, { x, y, z, vx, vy, vz, s, life, max: life }); }
function updateSmoke(dt, camPos) {
  for (const s of SMOKERS) {
    if (s.x === undefined) continue;
    const dx = s.x - camPos.x, dz = s.z - camPos.z;
    if (dx * dx + dz * dz > 3500 * 3500) continue;
    s.acc = (s.acc || 0) + dt * s.rate;
    while (s.acc > 1) { s.acc -= 1; puff(s.x, s.y, s.z, 1.2 + Math.random(), 2.4, 0.5, s.size || 2.4, 9); }
  }
  smoke.parts.forEach((p, i) => {
    if (p.life <= 0) { smoke.aA[i] = 0; return; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy *= 1 - dt * 0.15;
    const k = 1 - p.life / p.max;
    smoke.aP[i * 4] = p.x; smoke.aP[i * 4 + 1] = p.y; smoke.aP[i * 4 + 2] = p.z; smoke.aP[i * 4 + 3] = p.s * (0.8 + k * 3.2);
    smoke.aA[i] = Math.min(1, k * 6) * (1 - k);
  });
  smoke.geo.attributes.aP.needsUpdate = true; smoke.geo.attributes.aA.needsUpdate = true;
}

// ---------- oiseaux
const birds = { mesh: null, flocks: [] };
function buildBirds(rnd) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -0.9, 0.15, -0.1, 0, 0, -0.2, 0, 0, 0.3, 0, 0, -0.2, 0.9, 0.15, -0.1], 3));
  g.computeVertexNormals();
  const N = 120;
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.8, side: THREE.DoubleSide }), N);
  mesh.frustumCulled = false; mesh.layers.set(1);
  for (let f = 0; f < 10; f++) { const st = STATIONS[(rnd() * STATIONS.length) | 0]; birds.flocks.push({ cx: st.x + (rnd() - 0.5) * 800, cz: st.z + (rnd() - 0.5) * 800, cy: st.y + 60 + rnd() * 60, r: 60 + rnd() * 90, sp: 0.15 + rnd() * 0.1, ph: rnd() * 6 }); }
  birds.mesh = mesh; birds.n = N; scene.add(mesh);
}
function updateBirds(t) {
  const { mesh, flocks } = birds; if (!mesh) return;
  for (let i = 0; i < birds.n; i++) {
    const f = flocks[i % flocks.length], k = Math.floor(i / flocks.length);
    const a = t * f.sp + f.ph + k * 0.12, r = f.r + Math.sin(k * 1.7) * 14;
    const x = f.cx + Math.cos(a) * r, z = f.cz + Math.sin(a) * r, y = f.cy + Math.sin(t * 0.7 + k) * 6;
    const flap = 1 + Math.sin(t * 9 + k * 1.3) * 0.5;
    mesh.setMatrixAt(i, Mset(_cm, x, y, z, flap * 1.4, 1.4, 1.4, -a));
  }
  mesh.instanceMatrix.needsUpdate = true;
}


// ---------- voitures qui circulent dans les rues
const CARS = { mesh: null, list: [] };
function buildCars(rnd) { const a = makeCarAssets(); CARS.geo = a.geo; CARS.geoHi = a.geoHi; CARS.mat = a.mat; }
function updateCars(dt, camPos) {
  const { mesh, list } = CARS; if (!mesh) return;
  list.forEach((c, i) => {
    const p = c.r.pts, n = p.length - 1;
    const near = Math.abs(p[0][0] - camPos.x) < 2500 && Math.abs(p[0][1] - camPos.z) < 2500;
    if (!near && c.placed) return;
    c.placed = true;
    c.t += c.dir * c.v * dt;
    if (c.t > n) { c.t = n; c.dir = -1; } else if (c.t < 0) { c.t = 0; c.dir = 1; }
    const k = Math.min(n - 1, Math.floor(c.t)), f = c.t - k;
    const a = p[k], b = p[k + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l * c.lane * c.dir, nz = dx / l * c.lane * c.dir;
    const x = lerp(a[0], b[0], f) + nx, z = lerp(a[1], b[1], f) + nz;
    mesh.setMatrixAt(i, Mset(_cm, x, hAt(x, z) + 0.12, z, 1, 1, 1, Math.atan2(dx * c.dir, dz * c.dir)));
  });
  mesh.instanceMatrix.needsUpdate = true;
}

async function buildScenery() {
  sceneryMaterials();
  propDefs();
  const rnd = mulberry(1212);
  for (const st of STATIONS) buildStation(st);
  for (const st of STATIONS) for (const k of st.meta.lm) landmark(k, st, rnd);
  for (const st of STATIONS) layoutTown2(st, rnd);
  setStatus('Tracé des routes…'); await tick();
  const nRoads = buildRoads();
  placeFarms2(rnd);
  propsCountry(rnd);
  const nProps = buildProps();
  buildTown3();
  setStatus('Plantation des forêts…'); await tick();
  buildCitizens();
  buildHerds(rnd);
  const nTrees = buildVegetation(rnd);
  buildHay(rnd);
  buildGoblins();
  setStatus("Pousse de l'herbe…"); await tick();
  // herbe en brins retirée (sol travaillé dans le shader du terrain)
  buildSmoke();
  buildBirds(rnd);
  buildCars(rnd);
  buildParked();
  scene.add(scenery);
  return { nTrees, nBuildings: BUILDINGS.length, streets: STREETS.length, roads: nRoads, props: nProps, spots: SPOTS.length, parked: PARKED.length };
}
