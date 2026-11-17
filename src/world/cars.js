// Voitures de Porkonia : quatre modèles cartoon calculés en code (profil extrudé aux bords arrondis, vitres, phares,
// pare-chocs, roues séparées). Un seul matériau ; la peinture prend la couleur de l'instance, le reste garde la sienne.
import * as THREE from 'three';
import { worldShading } from '../engine/lighting.js';
import { Geo, M } from '../engine/geo.js';

// rôle de chaque sommet, rangé dans l'attribut aLeaf du kit de modélisation
const FIXE = 0, PEINTURE = 1, PHARE = 2, FEU = 3, VITRE = 4, PNEU = 5, CHROME = 6;
const NOIR = [26, 26, 30], GRIS = [150, 152, 158], CHROME_C = [214, 216, 222], VERRE = [38, 62, 84], BLANC = [255, 255, 255];

// profil latéral : liste de points [z, y, rayon d'arrondi], dans le sens trigonométrique vu du côté gauche
function profil(pts) {
  const s = new THREE.Shape(), n = pts.length;
  const at = i => pts[(i + n) % n];
  for (let i = 0; i < n; i++) {
    const p = at(i), a = at(i - 1), b = at(i + 1), r = p[2] || 0;
    const la = Math.hypot(p[0] - a[0], p[1] - a[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const ra = Math.min(r, la * 0.45), rb = Math.min(r, lb * 0.45);
    const x0 = p[0] + (a[0] - p[0]) / la * ra, y0 = p[1] + (a[1] - p[1]) / la * ra, x1 = p[0] + (b[0] - p[0]) / lb * rb, y1 = p[1] + (b[1] - p[1]) / lb * rb;
    if (i === 0) s.moveTo(x0, y0); else s.lineTo(x0, y0);
    if (r > 0) s.quadraticCurveTo(p[0], p[1], x1, y1);
  }
  s.closePath(); return s;
}
// extrusion d'un profil sur la largeur de la voiture, bords adoucis
function extrude(shape, width, bevel = 0.06) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 5, steps: 1 });
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2);
  return g;
}
const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1).toNonIndexed(); CYL.rotateZ(Math.PI / 2);   // axe sur la largeur
const SPH = new THREE.SphereGeometry(0.5, 10, 8).toNonIndexed();
const BOX = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();

// Les modèles. Longueurs en mètres ; z vers l'avant, y vers le haut, conduite à gauche.
// `bas` et `haut` : profils de la caisse et de l'habitacle ; `tenue` : caractère de conduite (voir game/drive.js).
export const MODELES = {
  porkette: {
    nom: 'Porkette', larg: 1.52, roue: 0.31, empattement: 2.1, voie: 1.3,
    bas: [[-1.62, 0.34, 0.1], [1.62, 0.34, 0.1], [1.7, 0.62, 0.16], [1.5, 0.86, 0.2], [0.72, 0.96, 0.1], [-1.2, 0.98, 0.14], [-1.68, 0.84, 0.2]],
    haut: [[-1.3, 0.94, 0.02], [0.78, 0.94, 0.02], [0.42, 1.44, 0.26], [-0.8, 1.5, 0.3], [-1.26, 1.28, 0.3]],
    hautLarg: 0.9, phareY: 0.72, toit: null,
    tenue: { puissance: 7.5, vmax: 30, adherence: 9.5, glisse: 2.6, braquage: 1.0, masse: 0.8 },
  },
  berline: {
    nom: 'Berline Groin', larg: 1.72, roue: 0.33, empattement: 2.65, voie: 1.48,
    bas: [[-2.12, 0.36, 0.1], [2.12, 0.36, 0.1], [2.2, 0.6, 0.14], [2.08, 0.82, 0.16], [0.9, 0.92, 0.08], [-1.5, 0.94, 0.1], [-2.18, 0.86, 0.18]],
    haut: [[-1.52, 0.9, 0.02], [1.0, 0.9, 0.02], [0.4, 1.4, 0.22], [-0.82, 1.42, 0.24], [-1.4, 1.04, 0.1]],
    hautLarg: 0.86, phareY: 0.7, toit: null,
    tenue: { puissance: 9, vmax: 38, adherence: 8.5, glisse: 2.1, braquage: 0.92, masse: 1.0 },
  },
  fourgon: {
    nom: 'Fourgon du Marché', larg: 1.86, roue: 0.36, empattement: 2.9, voie: 1.58,
    bas: [[-2.28, 0.4, 0.1], [2.24, 0.4, 0.1], [2.32, 0.7, 0.14], [2.2, 1.0, 0.2], [1.5, 1.08, 0.08], [-2.3, 1.08, 0.1]],
    haut: [[-2.28, 1.04, 0.02], [1.62, 1.04, 0.02], [1.22, 1.9, 0.3], [-2.26, 1.96, 0.16]],
    hautLarg: 0.97, phareY: 0.84, toit: 'galerie', fourgon: true,
    tenue: { puissance: 6.2, vmax: 27, adherence: 7.2, glisse: 2.4, braquage: 0.8, masse: 1.5 },
  },
  bolide: {
    nom: 'Bolide Truffe', larg: 1.82, roue: 0.34, empattement: 2.5, voie: 1.56,
    bas: [[-2.05, 0.3, 0.1], [2.1, 0.3, 0.1], [2.22, 0.5, 0.12], [1.9, 0.72, 0.2], [0.7, 0.8, 0.1], [-1.4, 0.84, 0.1], [-2.12, 0.8, 0.14]],
    haut: [[-1.24, 0.8, 0.02], [0.74, 0.78, 0.02], [0.02, 1.2, 0.2], [-0.62, 1.2, 0.2]],
    hautLarg: 0.82, phareY: 0.6, toit: 'aileron',
    tenue: { puissance: 12.5, vmax: 50, adherence: 9, glisse: 1.5, braquage: 1.0, masse: 0.9 },
  },
};
export const MODELE_IDS = Object.keys(MODELES);

function carrosserie(m) {
  const g = new Geo(), W = m.larg, ident = new THREE.Matrix4();
  g.add(extrude(profil(m.bas), W, 0.09), ident, BLANC, null, PEINTURE);
  g.add(extrude(profil(m.haut), W * m.hautLarg, 0.1), ident, BLANC, null, PEINTURE);
  // vitres latérales : le profil de l'habitacle rentré, un peu plus large que lui
  const cz = m.haut.reduce((s, p) => s + p[0], 0) / m.haut.length, y0 = m.haut[0][1] + 0.1, y1 = Math.max(...m.haut.map(p => p[1]));
  const cy = (y0 + y1) / 2, k = 0.76;
  const vit = m.haut.map(p => [cz + (p[0] - cz) * (m.fourgon ? 0.3 : k) + (m.fourgon ? 0.95 : 0), Math.max(y0, cy + (p[1] - cy) * 0.74), 0.08]);
  g.add(extrude(profil(vit), W * m.hautLarg + 0.03, 0.01), ident, VERRE, null, VITRE);
  // pare-brise et lunette : panneaux posés sur les pentes de l'habitacle
  const pan = (a, b, larg) => {
    const dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy), mz = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const nz = dy / l, ny = -dz / l;   // normale sortante du profil
    g.add(BOX, M(0, my + ny * 0.1, mz + nz * 0.1, larg, l * 0.7, 0.06, 0, Math.atan2(dz, dy)), VERRE, null, VITRE);
  };
  const H = m.haut, iAv = 1, iAr = H.length - 1;
  pan(H[iAv], H[iAv + 1], W * m.hautLarg * 0.84);
  if (!m.fourgon) pan(H[iAr], H[0], W * m.hautLarg * 0.8);
  // pare-chocs, calandre, phares, feux, plaques
  const zAv = Math.max(...m.bas.map(p => p[0])), zAr = Math.min(...m.bas.map(p => p[0])), yb = m.bas[0][1];
  g.add(BOX, M(0, yb + 0.1, zAv - 0.02, W * 0.98, 0.16, 0.2), CHROME_C, null, CHROME);
  g.add(BOX, M(0, yb + 0.1, zAr + 0.02, W * 0.98, 0.16, 0.2), CHROME_C, null, CHROME);
  g.add(BOX, M(0, m.phareY - 0.02, zAv - 0.06, W * 0.44, 0.16, 0.1), NOIR, null, FIXE);
  for (const sx of [-1, 1]) {
    g.add(SPH, M(sx * W * 0.34, m.phareY, zAv - 0.02, 0.3, 0.3, 0.22), [255, 246, 214], null, PHARE);
    g.add(BOX, M(sx * W * 0.36, m.phareY + 0.02, zAr + 0.04, 0.26, 0.14, 0.1), [214, 30, 30], null, FEU);
    g.add(BOX, M(sx * (W / 2 + 0.05), y0 + 0.02, H[iAv][0] - 0.12, 0.16, 0.1, 0.07), BLANC, null, PEINTURE);   // rétroviseurs
  }
  g.add(BOX, M(0, yb + 0.24, zAr + 0.0, 0.5, 0.13, 0.04), [250, 244, 224], null, FIXE);
  g.add(BOX, M(0, yb + 0.14, zAv + 0.09, 0.5, 0.13, 0.03), [250, 244, 224], null, FIXE);
  if (m.toit === 'galerie') { for (const z of [-1.9, -1.0, -0.1, 0.8]) g.add(BOX, M(0, y1 + 0.1, z, W * 0.8, 0.04, 0.05), GRIS, null, CHROME); for (const sx of [-1, 1]) g.add(BOX, M(sx * W * 0.4, y1 + 0.1, -0.55, 0.04, 0.04, 2.8), GRIS, null, CHROME); }
  if (m.toit === 'aileron') { g.add(BOX, M(0, 1.06, zAr + 0.22, W * 0.92, 0.05, 0.3), BLANC, null, PEINTURE); for (const sx of [-1, 1]) g.add(BOX, M(sx * W * 0.34, 0.94, zAr + 0.26, 0.05, 0.22, 0.16), NOIR, null, FIXE); }
  // passages de roue sombres : ils donnent l'illusion d'une arche creusée
  for (const [x, z] of rouesDe(m)) g.add(CYL, M(x * 0.985, m.roue, z, 0.1, m.roue * 2.5, m.roue * 2.5), NOIR, null, FIXE);
  return g;
}
export function rouesDe(m) { const e = m.empattement / 2, v = m.voie / 2, c = (Math.max(...m.bas.map(p => p[0])) + Math.min(...m.bas.map(p => p[0]))) / 2; return [[v, c + e], [-v, c + e], [v, c - e], [-v, c - e]]; }
function roue(g, r, parent) {
  g.add(CYL, M(0, 0, 0, 0.24, r * 2, r * 2), NOIR, parent, PNEU);
  g.add(CYL, M(0, 0, 0, 0.26, r * 1.15, r * 1.15), CHROME_C, parent, CHROME);
  g.add(BOX, M(0, 0, 0, 0.27, r * 0.95, 0.07), GRIS, parent, FIXE); g.add(BOX, M(0, 0, 0, 0.27, 0.07, r * 0.95), GRIS, parent, FIXE);
}

let MAT = null;
export function carMaterial() {
  if (MAT) return MAT;
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 0.8 });
  worldShading(mat, {
    key: 'car3', after: sh => {
      sh.vertexShader = 'attribute float aLeaf; flat varying float vRole;\n' + sh.vertexShader.replace('#include <color_vertex>', `vRole = aLeaf; vColor = color;
        #ifdef USE_INSTANCING_COLOR
        if (aLeaf > 0.5 && aLeaf < 1.5) vColor *= instanceColor;
        #endif`);
      sh.fragmentShader = 'flat varying float vRole; float carR = 0.34; float carM = 0.0; float carC = 1.0; vec3 carE = vec3(0.0);\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
        { int r = int(vRole + 0.5);
          if (r == 2) { carR = 0.12; carE = diffuseColor.rgb * (0.12 + 3.5 * smoothstep(0.02, 0.4, uLit)); }
          else if (r == 3) { carR = 0.2; carE = diffuseColor.rgb * (0.08 + 1.6 * smoothstep(0.02, 0.4, uLit)); }
          else if (r == 4) { carR = 0.08; }
          else if (r == 5) { carR = 0.9; carC = 0.0; }
          else if (r == 6) { carR = 0.2; carM = 0.9; }
          else if (r == 0) { carR = 0.6; carC = 0.0; } }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = carR;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = carM;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += carE;');
    },
  });
  mat.customProgramCacheKey = () => 'car3';
  return MAT = mat;
}

// Géométries d'un modèle, fabriquées au premier usage :
//   fixe   caisse et roues d'un bloc (circulation, stationnement)
//   caisse sans les roues, et `roue` seule, pour la voiture du joueur dont les roues tournent et braquent
const CACHE = {};
export function carGeo(id) {
  if (CACHE[id]) return CACHE[id];
  const m = MODELES[id];
  const fixe = carrosserie(m); for (const [x, z] of rouesDe(m)) roue(fixe, m.roue, M(x, m.roue, z, 1, 1, 1));
  const r = new Geo(); roue(r, m.roue, null);
  return CACHE[id] = { fixe: fixe.geometry(), caisse: carrosserie(m).geometry(), roue: r.geometry() };
}
export const CAR_COLORS = [[226, 36, 48], [36, 110, 230], [250, 246, 235], [250, 200, 30], [50, 180, 110], [250, 130, 40], [240, 130, 170], [70, 200, 210], [150, 80, 200], [60, 60, 70]];
