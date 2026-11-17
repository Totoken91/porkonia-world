// Le train (modèles, chemin, pose) et ses caméras
import * as THREE from 'three';
import { clamp, lerp } from '../engine/util.js';
import { hAt, tmGet } from '../world/land.js';
import { camera, scene } from '../engine/renderer.js';
import { TEX } from '../engine/textures.js';
import { worldShading } from '../engine/lighting.js';
import { M, Mset } from '../engine/geo.js';
import { game, input } from './state.js';
import { DEPART, STOP_MARK, SLEEPERS } from '../world/tracks.js';
import { PRODUITS } from '../world/cities.js';
import { SMAT, Kit, signMesh } from '../world/scenery.js';
import { makePigGeometry } from '../world/assets.js';

export const LOCO_LEN = 17, WAGON_LEN = 18, GAP = 0.9;
const TC = { bord: [128, 22, 40], creme: [243, 231, 201], gris: [70, 72, 80], noir: [26, 26, 30], acier: [190, 192, 198], bois: [150, 100, 62], rose: [244, 162, 178], jaune: [240, 196, 40] };
export function trainMaterials() {
  SMAT.carro = worldShading(new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 }), { key: 'carro' });
  SMAT.tmetal = worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.75, envMapIntensity: 0.9 }), { key: 'tmetal' });
  SMAT.chrome = worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.14, metalness: 1, envMapIntensity: 1.4 }), { key: 'chrome' });
  SMAT.rubber = worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0.05 }), { key: 'rubber' });
  SMAT.tglass = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.03, metalness: 0.0, envMapIntensity: 2.0, clearcoat: 1 });
  SMAT.twood = worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.wood, roughness: 0.8 }), { key: 'twood' });
  SMAT.cabglass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 1.2, depthWrite: false });
  SMAT.cabglass.userData.noShadow = true;
}
function roundedSection(w, h, r, y0) { // section de caisse arrondie (plan XY), à extruder en Z
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw + 0.05, y0); s.lineTo(hw - 0.05, y0); s.lineTo(hw, y0 + 0.2);
  s.lineTo(hw, y0 + h - r); s.quadraticCurveTo(hw, y0 + h, hw - r, y0 + h); s.lineTo(-hw + r, y0 + h); s.quadraticCurveTo(-hw, y0 + h, -hw, y0 + h - r);
  s.lineTo(-hw, y0 + 0.2); s.lineTo(-hw + 0.05, y0);
  return s;
}
function extrudeZ(shape, len, bevel = 0.06) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
  g.translate(0, 0, -len / 2); return g;
}
function bogie(K, z) {
  K.on('tmetal').box(0, 0.86, z, 2.5, 0.42, 3.4, [44, 44, 48]);
  for (const x of [-1.18, 1.18]) { K.on('tmetal').box(x, 0.72, z, 0.16, 0.5, 3.0, [52, 52, 56]); for (const dz of [-1.1, 1.1]) K.on('tmetal').box(x * 1.04, 0.5, z + dz, 0.22, 0.32, 0.4, [30, 30, 32]); K.on('chrome').add('cyl', M(x * 0.98, 0.95, z, 0.3, 0.42, 0.3), [120, 120, 126]); }
  for (const dz of [-1.1, 1.1]) for (const x of [-0.78, 0.78]) { K.on('chrome').add('cyl24', M(x, 0.47, z + dz, 0.96, 0.12, 0.96, 0, 0, Math.PI / 2), [170, 170, 176]); K.on('tmetal').add('cyl24', M(x * 1.08, 0.47, z + dz, 0.7, 0.06, 0.7, 0, 0, Math.PI / 2), [40, 40, 44]); }
  for (const dz of [-1.1, 1.1]) K.on('tmetal').add('cyl', M(0, 0.47, z + dz, 0.16, 1.7, 0.16, 0, 0, Math.PI / 2), [60, 60, 64]);
}
function buffers(K, zEnd) {
  const s = Math.sign(zEnd);
  for (const x of [-0.88, 0.88]) { K.on('tmetal').add('cyl', M(x, 1.25, zEnd - s * 0.1, 0.26, 0.5, 0.26, 0, Math.PI / 2), [50, 50, 54]); K.on('chrome').add('cyl24', M(x, 1.25, zEnd + s * 0.18, 0.48, 0.06, 0.48, 0, Math.PI / 2), [200, 200, 206]); }
  K.on('tmetal').box(0, 1.2, zEnd, 0.3, 0.3, 0.5, [40, 40, 44]);
}
export function buildLoco() {
  const K = new Kit(), grp = new THREE.Group();
  const body = extrudeZ(roundedSection(2.96, 2.9, 0.42, 1.38), 13.6, 0.05);
  K.on('carro').add(body, M(0, 0, -0.1, 1, 1, 1), TC.bord);
  // nez (cabines aux deux bouts, pare-brise inclinés)
  const nose = new THREE.Shape();
  nose.moveTo(0, 1.38); nose.lineTo(0.92, 1.38); nose.lineTo(1.08, 2.45); nose.lineTo(0.86, 3.0); nose.lineTo(0.28, 4.14); nose.lineTo(0, 4.28); nose.lineTo(0, 1.38);
  const ng = new THREE.ExtrudeGeometry(nose, { depth: 2.9, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 });
  ng.translate(0, 0, -1.45); ng.rotateY(-Math.PI / 2);
  for (const sgn of [1, -1]) {
    const P = M(0, 0, sgn * 6.7, 1, 1, 1, sgn > 0 ? 0 : Math.PI);
    K.on('carro').add(ng, M(0, 0, 0, 1, 1, 1), TC.bord, P);
    // pare-brise et montants
    for (const x of [-0.72, 0.72]) K.on('tglass').add('box', M(x, 3.57, 0.6, 1.3, 1.2, 0.04, 0, -0.47), [24, 34, 48], P);
    K.on('carro').add('box', M(0, 3.57, 0.62, 0.12, 1.22, 0.08, 0, -0.47), TC.bord, P);
    // groin
    K.on('carro').add('cyl24', M(0, 2.02, 1.16, 1.9, 0.16, 1.18, 0, Math.PI / 2 - 0.13), TC.rose, P);
    K.on('glow').add('cyl24', M(-0.38, 2.02, 1.27, 0.46, 0.06, 0.58, 0, Math.PI / 2 - 0.13), sgn > 0 ? [255, 246, 214] : [255, 40, 30], P);
    K.on('glow').add('cyl24', M(0.38, 2.02, 1.27, 0.46, 0.06, 0.58, 0, Math.PI / 2 - 0.13), sgn > 0 ? [255, 246, 214] : [255, 40, 30], P);
    K.on('carro').box(0, 2.7, 1.0, 2.8, 0.34, 0.12, TC.creme, 0, P);
    for (const x of [-1.15, 1.15]) K.on('glow').add('sph', M(x, 1.62, 1.14, 0.16, 0.16, 0.1), sgn > 0 ? [255, 236, 200] : [255, 30, 20], P);
    K.on('tmetal').box(0, 3.0, 1.06, 0.08, 0.5, 0.05, [20, 20, 22], 0.3, P);
    buffers(K, sgn * 8.55);
  }
  // bandes crème, jupe, toit
  for (const x of [-1.49, 1.49]) { K.on('carro').box(x, 2.45, -0.1, 0.04, 0.36, 13.4, TC.creme); K.on('carro').box(x, 1.52, -0.1, 0.06, 0.28, 13.4, [40, 34, 36]); }
  K.on('tmetal').box(0, 1.2, 0, 2.9, 0.4, 16.8, [34, 34, 38]);
  K.on('tmetal').box(0, 4.32, -0.4, 2.2, 0.08, 11.6, [92, 94, 100]);
  for (const z of [-3.4, -1.4]) { K.on('tmetal').add('cyl24', M(0, 4.42, z, 1.3, 0.14, 1.3), [60, 62, 66]); for (let k = 0; k < 6; k++) K.on('tmetal').box(0, 4.5, z, 1.2, 0.04, 0.08, [30, 30, 32], k * 0.52); }
  K.on('tmetal').add('cyl', M(0.5, 4.6, 1.3, 0.34, 0.6, 0.34), [36, 36, 40]).add('cyl', M(-0.5, 4.5, 2.4, 0.18, 0.4, 0.18), [200, 196, 150]);
  for (const x of [-1.5, 1.5]) for (let k = 0; k < 8; k++) K.on('tmetal').box(x, 3.25, -4.6 + k * 0.32, 0.04, 1.0, 0.12, [40, 40, 44]);
  // portes, fenêtres latérales, mains courantes
  for (const sgn of [1, -1]) for (const x of [-1.49, 1.49]) {
    K.on('tglass').box(x, 3.45, sgn * 5.85, 0.05, 0.85, 1.25, [24, 34, 48]);
    K.on('carro').box(x, 2.75, sgn * 4.75, 0.05, 2.4, 0.9, [104, 18, 32]);
    K.on('chrome').add('cyl', M(x * 1.03, 2.7, sgn * 4.25, 0.05, 1.6, 0.05), [210, 210, 214]);
    K.on('tmetal').box(x * 0.98, 1.05, sgn * 4.75, 0.5, 0.06, 0.6, [40, 40, 44]);
  }
  for (const x of [-1.52, 1.52]) K.on('chrome').add('cyl', M(x, 3.95, -0.1, 0.05, 9, 0.05, 0, Math.PI / 2), [210, 210, 214]);
  bogie(K, -5.2); bogie(K, 5.2);
  K.on('tmetal').box(0, 0.95, 0, 2.2, 0.7, 5, [30, 30, 34]);
  for (const m of K.meshes()) grp.add(m);
  for (const sd of [-1, 1]) {
    const s = signMesh('SCPB', 3.2, 0.9, { bg: '#7b1e2e', fg: '#f3e7c9', border: false, glow: 0 });
    s.material.roughness = 0.3; s.position.set(sd * 1.505, 3.15, -1.5); s.rotation.y = sd * Math.PI / 2; grp.add(s);
    const n = signMesh('BB 12012', 2.2, 0.42, { bg: '#f3e7c9', fg: '#7b1e2e', border: false, cw: 256, ch: 52, glow: 0 });
    n.position.set(sd * 1.505, 2.45, 3.0); n.rotation.y = sd * Math.PI / 2; grp.add(n);
  }
  grp.userData.body = grp.children.slice();
  // phares (lumière réelle sur la voie)
  const spot = new THREE.SpotLight(0xfff0d0, 0, 260, 0.42, 0.55, 1.6);
  spot.position.set(0, 2.1, 8.7); spot.target.position.set(0, -2, 60);
  grp.add(spot, spot.target);
  grp.userData.spot = spot;
  return grp;
}
function buildWagon(type, tint) {
  const K = new Kit(), grp = new THREE.Group();
  const L = WAGON_LEN;
  bogie(K, -(L / 2 - 3.2)); bogie(K, L / 2 - 3.2);
  K.on('tmetal').box(0, 1.22, 0, 2.9, 0.36, L - 0.5, [34, 34, 38]);
  buffers(K, L / 2); buffers(K, -L / 2);
  const label = (txt, y, opt) => { for (const sd of [-1, 1]) { const s = signMesh(txt, opt.w || 6, opt.h || 0.8, { glow: 0, ...opt }); s.position.set(sd * (opt.x || 1.5), y, 0); s.rotation.y = sd * Math.PI / 2; grp.add(s); } };
  switch (type) {
    case 'voyageurs': {
      K.on('carro').add(extrudeZ(roundedSection(2.94, 2.95, 0.6, 1.38), L - 0.8, 0.05), M(0, 0, 0, 1, 1, 1), TC.creme);
      for (const x of [-1.48, 1.48]) { K.on('carro').box(x, 1.95, 0, 0.04, 1.1, L - 1.0, TC.bord); K.on('carro').box(x, 2.56, 0, 0.045, 0.1, L - 1.0, [200, 160, 60]); }
      for (let k = 0; k < 9; k++) for (const x of [-1.48, 1.48]) K.on('tglass').box(x, 3.3, -7 + k * 1.75, 0.05, 0.85, 1.3, [26, 36, 50]);
      for (const x of [-1.48, 1.48]) for (const z of [-8.1, 8.1]) { K.on('carro').box(x, 2.65, z, 0.05, 2.3, 0.85, [104, 18, 32]); K.on('tglass').box(x * 1.002, 3.35, z, 0.05, 0.6, 0.4, [26, 36, 50]); }
      for (let k = -2; k <= 2; k++) K.on('tmetal').box(0, 4.36, k * 3.4, 0.9, 0.12, 1.4, [80, 82, 88]);
      label('SCPB · 1re et 2e', 2.0, { bg: '#7b1e2e', fg: '#f3e7c9', border: false, w: 5, h: 0.5, x: 1.505 });
      break;
    }
    case 'citerne': {
      const col = tint || [220, 140, 40];
      K.on('tmetal').box(0, 1.6, 0, 2.6, 0.3, L - 1.4, [34, 34, 38]);
      K.on(tint ? 'carro' : 'copper').add('cyl24', M(0, 2.85, 0, 2.7, L - 2.4, 2.7, 0, Math.PI / 2), col);
      for (const z of [-(L - 2.4) / 2, (L - 2.4) / 2]) K.on(tint ? 'carro' : 'copper').add('sph', M(0, 2.85, z, 2.7, 2.7, 1.2), col);
      K.on('tmetal').add('cyl24', M(0, 4.3, 0, 1, 0.5, 1), [70, 70, 74]);
      for (const z of [-4, 0, 4]) K.on('tmetal').add('torus', M(0, 2.85, z, 2.76, 2.76, 2.76), [50, 50, 54]);
      K.on('chrome').box(0, 4.25, 0, 0.06, 0.06, L - 3, [200, 200, 204]);
      label(tint ? 'SCPB · CITERNE' : 'DOUZI AMBRÉE', 2.85, { bg: tint ? '#f3e7c9' : '#d68a1e', fg: tint ? '#7b1e2e' : '#2a1408', border: false, w: 6.5, h: 1, x: 1.38 });
      break;
    }
    case 'futs': {
      K.on('twood').box(0, 1.55, 0, 2.9, 0.3, L - 0.6, TC.bois);
      const col = tint || [150, 96, 54];
      for (let k = 0; k < 11; k++) for (const x of [-0.9, 0, 0.9]) {
        const z = -7.6 + k * 1.52;
        K.on('twood').add('cyl24', M(x, 2.3, z, 0.86, 1.2, 0.86), col).add('cyl24', M(x, 2.3, z, 0.93, 0.5, 0.93), col);
        K.on('tmetal').add('cyl24', M(x, 1.95, z, 0.9, 0.08, 0.9), [40, 40, 44]).add('cyl24', M(x, 2.65, z, 0.9, 0.08, 0.9), [40, 40, 44]);
      }
      for (const x of [-1.45, 1.45]) for (let k = -4; k <= 4; k++) K.on('tmetal').box(x, 1.9, k * 2, 0.08, 0.7, 0.08, [40, 40, 44]);
      break;
    }
    case 'porcs': {
      K.on('twood').box(0, 1.55, 0, 2.9, 0.3, L - 0.6, TC.bois);
      for (const x of [-1.42, 1.42]) for (let k = 0; k < 4; k++) K.on('twood').box(x, 1.9 + k * 0.32, 0, 0.08, 0.18, L - 0.6, [172, 122, 78]);
      for (const x of [-1.42, 1.42]) for (let k = -4; k <= 4; k++) K.on('tmetal').box(x * 1.02, 2.3, k * 2, 0.08, 1.4, 0.1, [50, 50, 54]);
      for (const z of [-(L - 0.7) / 2, (L - 0.7) / 2]) K.on('twood').box(0, 2.4, z, 2.9, 1.5, 0.1, [172, 122, 78]);
      const pigG = makePigGeometry(false);
      for (let k = 0; k < 8; k++) for (const x of [-0.6, 0.6]) {
        const z = -7 + k * 2 + (x > 0 ? 0.7 : 0), rot = ((k * 7 + (x > 0 ? 3 : 0)) % 5 - 2) * 0.4;
        K.on('paint').add(pigG, M(x, 1.7, z, 1.15, 1.15, 1.15, rot), TC.rose);
      }
      break;
    }
    case 'couvert': case 'frigo': {
      const frigo = type === 'frigo';
      K.on(frigo ? 'carro' : 'twood').add(extrudeZ(roundedSection(2.94, 2.95, 0.3, 1.38), L - 0.7, 0.04), M(0, 0, 0, 1, 1, 1), frigo ? [240, 240, 238] : (tint || TC.bois));
      if (frigo) for (const x of [-1.48, 1.48]) { K.on('carro').box(x, 2.0, 0, 0.04, 0.32, L - 0.9, TC.bord); }
      for (const x of [-1.48, 1.48]) { K.on(frigo ? 'carro' : 'twood').box(x, 2.75, 0, 0.06, 2.3, 2.8, frigo ? [224, 224, 222] : [116, 74, 46]); K.on('chrome').box(x * 1.01, 2.75, 1.0, 0.04, 1.6, 0.08, [200, 200, 204]); }
      for (let k = -4; k <= 4; k++) if (k) for (const x of [-1.48, 1.48]) K.on('tmetal').box(x, 2.8, k * 1.9, 0.05, 2.8, 0.08, frigo ? [200, 200, 200] : [80, 60, 40]);
      label(frigo ? 'FRIGO · SCPB' : 'SCPB', 3.6, { bg: frigo ? '#eeeeec' : '#f3e7c9', fg: '#7b1e2e', border: false, w: frigo ? 4.2 : 2, h: 0.6, x: 1.52 });
      break;
    }
    case 'tremie': {
      const heap = tint || [232, 200, 90];
      K.on('carro').box(0, 2.7, 0, 2.9, 2.5, L - 1, [118, 120, 126]);
      for (let k = 0; k < 4; k++) K.on('carro').add('tcone', M(0, 1.55, -6 + k * 4, 2.6, 0.9, 3.2, 0, Math.PI), [100, 102, 108]);
      K.on('rubber').add('roof', M(0, 3.95, 0, 2.6, 0.9, L - 1.6), heap);
      for (let k = -3; k <= 3; k++) for (const x of [-1.46, 1.46]) K.on('tmetal').box(x, 2.7, k * 2.4, 0.07, 2.5, 0.14, [80, 82, 88]);
      break;
    }
    case 'chaises': {
      K.on('twood').box(0, 1.55, 0, 2.9, 0.3, L - 0.6, TC.bois);
      for (let k = 0; k < 7; k++) for (const x of [-0.7, 0.7]) for (let h = 0; h < 5; h++) {
        const z = -7.4 + k * 2.4, y = 1.95 + h * 0.42;
        K.on('twood').box(x, y, z, 1.0, 0.08, 1.0, [170, 110, 64]).box(x, y + 0.35, z - 0.46, 1.0, 0.7, 0.07, [150, 96, 56]);
      }
      K.on('paint').box(0, 3.95, 0, 0.1, 0.06, L - 1.2, TC.jaune);
      break;
    }
    default: K.on('twood').box(0, 1.55, 0, 2.9, 0.3, L - 0.6, TC.bois);
  }
  for (const m of K.meshes()) grp.add(m);
  return grp;
}
function speedDialTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#f3e7c9'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
  g.strokeStyle = '#17110e'; g.lineWidth = 3;
  g.font = 'bold 20px "Barlow Condensed", sans-serif'; g.fillStyle = '#17110e'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let v = 0; v <= 260; v += 20) {
    const a = (-225 + v / 260 * 270) * Math.PI / 180;
    g.beginPath(); g.moveTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); g.lineTo(128 + Math.cos(a) * (v % 40 ? 102 : 94), 128 + Math.sin(a) * (v % 40 ? 102 : 94)); g.stroke();
    if (v % 40 === 0) g.fillText(v, 128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76);
  }
  g.font = '18px Bungee, sans-serif'; g.fillStyle = '#7b1e2e'; g.fillText('km/h', 128, 178);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function buildCab() {
  const K = new Kit(), grp = new THREE.Group();
  const D = [40, 42, 46], F = [96, 22, 36], P = [196, 192, 180];
  K.on('rubber').box(0, 2.02, 7.25, 2.9, 0.8, 1.5, D);
  K.on('rubber').box(0, 2.45, 7.7, 2.9, 0.12, 0.8, [56, 58, 64], 0);
  K.on('carro').box(0, 1.62, 8.6, 2.95, 0.9, 1.4, TC.bord);
  K.on('carro').box(0, 2.1, 8.85, 2.95, 0.12, 0.9, TC.creme);
  for (const x of [-1.42, 1.42]) K.on('carro').box(x, 3.3, 7.9, 0.14, 1.7, 0.14, F);
  K.on('carro').box(0, 3.3, 7.95, 0.06, 1.7, 0.06, F);
  K.on('carro').box(0, 4.18, 7.75, 2.9, 0.2, 0.5, F);
  K.on('paint').box(0, 4.24, 5.8, 2.9, 0.1, 4.2, P);
  for (const x of [-1.47, 1.47]) { K.on('paint').box(x, 2.45, 6.2, 0.1, 0.9, 3.4, P); K.on('carro').box(x, 4.0, 6.2, 0.1, 0.35, 3.4, F); K.on('carro').box(x, 3.2, 4.6, 0.1, 2.0, 0.2, F); }
  K.on('rubber').box(0.9, 1.4, 5.6, 0.9, 0.5, 0.9, [70, 40, 32]).box(0.9, 2.0, 5.15, 0.9, 0.9, 0.15, [70, 40, 32]);
  const cols = [[220, 60, 50], [60, 180, 80], [240, 200, 60], [60, 120, 220], [230, 230, 230]];
  for (let k = 0; k < 5; k++) K.on('glow').box(-0.9 + k * 0.18, 2.53, 7.55, 0.07, 0.03, 0.07, cols[k].map(c => c * 0.25));
  K.on('chrome').add('cyl', M(-1.0, 2.65, 7.0, 0.06, 0.4, 0.06), [200, 200, 204]); K.on('rubber').add('sph', M(-1.0, 2.86, 7.0, 0.12, 0.12, 0.12), [20, 20, 20]);
  K.on('copper').add('cyl24', M(1.2, 2.62, 7.25, 0.13, 0.22, 0.13), [214, 140, 40]); K.on('chrome').add('cyl24', M(1.2, 2.74, 7.25, 0.135, 0.03, 0.135), [200, 200, 200]);
  K.on('rubber').box(0.55, 4.05, 7.55, 1.1, 0.04, 0.5, [30, 30, 32], 0);
  for (const x of [-0.72, 0.72]) K.on('rubber').box(x + 0.3, 2.95, 8.25, 0.9, 0.025, 0.02, [16, 16, 16], 0);
  for (const m of K.meshes(false)) grp.add(m);
  // vitres (légers reflets)
  for (const x of [-0.72, 0.72]) { const gp = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.6), SMAT.cabglass); gp.position.set(x, 3.3, 7.92); grp.add(gp); }
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshStandardMaterial({ map: speedDialTexture(), roughness: 0.3, emissiveMap: null }));
  dial.position.set(0.42, 2.58, 7.42); dial.rotation.set(0.85, Math.PI, 0); grp.add(dial);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.01).translate(0, 0.055, 0), new THREE.MeshBasicMaterial({ color: 0xc0182a }));
  needle.position.set(0, 0, 0.005); dial.add(needle);
  const dname = signMesh('SCPB', 0.5, 0.16, { bg: '#7b1e2e', border: false, cw: 256, ch: 80, glow: 0.1 }); dname.position.set(-0.15, 2.58, 7.45); dname.rotation.set(0.85, Math.PI, 0); grp.add(dname);
  const bob = new THREE.Mesh(makePigGeometry(false), worldShading(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xf2a8b6, roughness: 0.5 }), { key: 'bob' }));
  bob.scale.setScalar(0.17); bob.position.set(-0.55, 2.52, 7.8); bob.rotation.y = Math.PI * 0.9;
  grp.add(bob);
  grp.userData = { needle, bob };
  return grp;
}

// ---------- le train
export const train = {
  group: new THREE.Group(), loco: null, cab: null, wagons: [],
  cur: null, hist: [], v: 0, notch: 0, vmax: 140 / 3.6, power: 2.4e6, f0: 290e3,
  comfort: 100, odo: 0, switchSel: {}, bump: 0,
};
function wagonVisual(contract) {
  if (!contract) return { type: 'vide' };
  const p = PRODUITS[contract.good];
  return { type: p.wagon, tint: p.tint || (contract.good === 'saindoux' ? [238, 232, 210] : contract.good === 'sauce' ? [150, 54, 34] : contract.good === 'vin' ? [110, 40, 46] : contract.good === 'moutarde' ? [230, 190, 50] : null) };
}
export function rebuildConsist(slots) {
  for (const w of train.wagons) {
    train.group.remove(w.grp);
    w.grp.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.map && o.material.map.isCanvasTexture && !Object.values(SMAT).includes(o.material)) { o.material.map.dispose(); o.material.dispose(); } });
  }
  train.wagons = slots.map(c => { const vis = wagonVisual(c); const grp = buildWagon(vis.type, vis.tint); train.group.add(grp); return { grp, contract: c }; });
}
function trainLength() { return LOCO_LEN + train.wagons.length * (WAGON_LEN + GAP); }
export function placeTrainAt(stId, side) {
  const o = DEPART[stId][side][0];
  train.cur = { t: o.t, d: o.d, s: o.d > 0 ? STOP_MARK : o.t.L - STOP_MARK };
  const back = DEPART[stId][-side][0];
  train.hist = [{ t: back.t, d: -back.d }];
  train.v = 0; train.notch = 0;
}
export function locate(dist) {
  let { t, d, s } = train.cur;
  const avail = d > 0 ? s : t.L - s;
  if (dist <= avail) return { t, s: s - d * dist, d };
  dist -= avail;
  for (let i = train.hist.length - 1; i >= 0; i--) {
    const h = train.hist[i];
    if (dist <= h.t.L) return { t: h.t, s: h.d > 0 ? h.t.L - dist : dist, d: h.d };
    dist -= h.t.L;
  }
  const h = train.hist[0] || train.cur;
  return { t: h.t, s: h.d > 0 ? 0 : h.t.L, d: h.d };
}
export function nextOptions() {
  const { t, d } = train.cur;
  if (t.stub && d > 0) return { st: -1, opts: [] };
  const st = d > 0 ? t.b : t.a, arr = d > 0 ? t.sb : t.sa;
  return { st, opts: DEPART[st][-arr] };
}
export function chosenNext(st, opts) { if (!opts.length) return null; const k = train.switchSel[st]; return opts[clamp(k ?? 0, 0, opts.length - 1)]; }
export function advanceHead(ds) {
  const c = train.cur;
  c.s += c.d * ds;
  let guard = 0;
  while ((c.s > c.t.L || c.s < 0) && guard++ < 4) {
    const over = c.s > c.t.L ? c.s - c.t.L : -c.s;
    if (c.t.stub && c.d > 0) { c.s = c.t.L - 0.01; return 'heurtoir'; }
    const { st, opts } = nextOptions();
    const nx = chosenNext(st, opts);
    train.hist.push({ t: c.t, d: c.d });
    delete train.switchSel[st];
    c.t = nx.t; c.d = nx.d; c.s = nx.d > 0 ? over : nx.t.L - over;
    game.onPassStation && game.onPassStation(st);
  }
  let tot = c.d > 0 ? c.s : c.t.L - c.s;
  for (let i = train.hist.length - 1; i >= 0; i--) { if (tot > trainLength() + 400) { train.hist.splice(0, i + 1); break; } tot += train.hist[i].t.L; }
  return null;
}
export function flipTrain() {
  const Ltr = trainLength();
  const rear = locate(Ltr);
  const segs = [{ t: train.cur.t, d: train.cur.d }];
  let dist = Ltr - (train.cur.d > 0 ? train.cur.s : train.cur.t.L - train.cur.s);
  for (let i = train.hist.length - 1; i >= 0 && dist > 0; i--) { segs.push(train.hist[i]); dist -= train.hist[i].t.L; }
  const newHist = segs.slice(0, -1).map(x => ({ t: x.t, d: -x.d }));
  train.cur = { t: rear.t, d: -rear.d, s: rear.s };
  train.hist = newHist;
  train.switchSel = {};
}
function lookAhead(dist, cb) {
  let { t, d, s } = train.cur;
  let acc = 0;
  for (let n = 0; n < 6 && acc < dist; n++) {
    const end = d > 0 ? t.L : 0, len = Math.abs(end - s);
    const take = Math.min(len, dist - acc);
    if (cb(t, d, s, s + d * take, acc) === false) return;
    acc += take;
    if (take < len) return;
    if (t.stub && d > 0) return;
    const st = d > 0 ? t.b : t.a, arr = d > 0 ? t.sb : t.sa;
    const nx = chosenNext(st, DEPART[st][-arr]); if (!nx) return;
    t = nx.t; d = nx.d; s = d > 0 ? 0 : t.L;
  }
}
export function upcomingLimit(range) {
  let best = { v: 1e9, at: 0 };
  lookAhead(range, (t, d, s0, s1, acc) => {
    const step = 10 * Math.sign(s1 - s0 || 1);
    for (let s = s0, a = acc; (step > 0 ? s <= s1 : s >= s1); s += step, a += 10) {
      const v = t.vlim(s);
      const need = Math.sqrt(v * v + 2 * 0.55 * Math.max(0, a - 15));
      if (best.need === undefined || need < best.need) best = { v, at: a, need };
    }
  });
  return best;
}
export function stationOffset() {
  const { t, d, s } = train.cur;
  const fromStart = d > 0 ? s : t.L - s, toEnd = t.L - fromStart;
  const startSt = d > 0 ? t.a : t.b, endSt = d > 0 ? t.b : t.a;
  if (fromStart < 420 && startSt >= 0) return { st: startSt, off: fromStart };
  if (toEnd < 420 && endSt >= 0 && !(t.stub && d > 0)) return { st: endSt, off: -toEnd };
  return null;
}
const _p1 = new THREE.Vector3(), _p2 = new THREE.Vector3(), _tg = new THREE.Vector3();
function placeVehicle(obj, dFront, len) {
  const a = locate(dFront + 2.6), b = locate(dFront + len - 2.6);
  a.t.pos(a.s, _p1); b.t.pos(b.s, _p2);
  obj.position.set((_p1.x + _p2.x) / 2, (_p1.y + _p2.y) / 2 + 0.17, (_p1.z + _p2.z) / 2);
  _tg.copy(obj.position).add(_p1).sub(_p2);
  obj.lookAt(_tg);
}
export function updateTrainPose() {
  placeVehicle(train.loco, 0, LOCO_LEN);
  let d = LOCO_LEN + GAP;
  for (const w of train.wagons) { placeVehicle(w.grp, d, WAGON_LEN); d += WAGON_LEN + GAP; }
}
export function headPos(out) { const c = train.cur; return c.t.pos(c.s, out); }
export function headDir(out) { const c = train.cur; c.t.tan(c.s, out); return out.multiplyScalar(c.d); }
function locateWorld(dist, out) { const l = locate(dist); return l.t.pos(l.s, out); }

// traverses 3D le long du trajet (de 150 m derrière à 700 m devant la tête)
const _sm = new THREE.Matrix4(), _sp = new THREE.Vector3(), _st = new THREE.Vector3();
export function updateSleepers() {
  const S = SLEEPERS; if (!S.mesh) return;
  let i = 0;
  const sp = S.spacing;
  const back = Math.min(150, trainLength() + 60);
  for (let dd = back; dd > 0 && i < S.n; dd -= sp) {
    const l = locate(dd); const s0 = Math.round(l.s / sp) * sp;
    l.t.pos(s0, _sp); l.t.tan(s0, _st);
    S.mesh.setMatrixAt(i++, Mset(_sm, _sp.x, _sp.y, _sp.z, 1, 1, 1, Math.atan2(_st.x, _st.z)));
  }
  lookAhead(S.n * sp, (t, d, s0, s1) => {
    const a = Math.min(s0, s1), b = Math.max(s0, s1);
    for (let s = Math.ceil(a / sp) * sp; s <= b && i < S.n; s += sp) { t.pos(s, _sp); t.tan(s, _st); S.mesh.setMatrixAt(i++, Mset(_sm, _sp.x, _sp.y, _sp.z, 1, 1, 1, Math.atan2(_st.x, _st.z))); }
    return i < S.n;
  });
  for (let k = i; k < S.n; k++) S.mesh.setMatrixAt(k, Mset(_sm, 0, -9999, 0, 0.001, 0.001, 0.001));
  S.mesh.instanceMatrix.needsUpdate = true;
}

// ---------- caméras
export const cam = { mode: 'cabine', yaw: 0, pitch: -0.04, idle: 0, orbitYaw: 2.6, orbitPitch: 0.28, orbitDist: 48, cine: null, cineT: 0, rig: new THREE.Object3D() };
export const CAM_MODES = ['cabine', 'poursuite', 'bord', 'drone'];
export const CAM_LABELS = { cabine: 'Cabine', poursuite: 'Poursuite', bord: 'Bord de voie', drone: 'Drone' };
export function setCamMode(m) {
  cam.mode = m;
  const inCab = m === 'cabine';
  train.cab.visible = inCab;
  for (const o of train.loco.userData.body) o.visible = !inCab;
  if (inCab) { cam.rig.add(camera); camera.position.set(0, 0, 0); camera.rotation.set(0, 0, 0); }
  else scene.add(camera);
  camera.near = inCab ? 0.12 : 0.5;
  fitFov();
  cam.cine = null;
}
const _c1 = new THREE.Vector3(), _c2 = new THREE.Vector3(), _c3 = new THREE.Vector3();
export function updateCamera(dt, t) {
  if (cam.mode === 'libre') return;
  if (cam.mode === 'cabine') {
    cam.idle += dt;
    if (cam.idle > 2.6 && !input.dragging) { cam.yaw *= Math.pow(0.04, dt); cam.pitch = lerp(cam.pitch, -0.04, 1 - Math.pow(0.05, dt)); }
    const shake = Math.min(1, train.v / 40);
    cam.rig.position.set(0.5, 3.36 + Math.sin(t * 13) * 0.006 * shake + train.bump * 0.04, 5.85);
    cam.rig.rotation.set(0, Math.PI, 0);
    camera.rotation.set(cam.pitch + Math.sin(t * 7.3) * 0.002 * shake, cam.yaw, Math.sin(t * 3.1) * 0.003 * shake, 'YXZ');
    const ud = train.cab.userData;
    ud.needle.rotation.z = -(-225 + clamp(train.v * 3.6, 0, 260) / 260 * 270 + 90) * Math.PI / 180;
    const acc = train.acc || 0;
    ud.bobV = (ud.bobV || 0) + (-(ud.bobA || 0) * 60 - (ud.bobV || 0) * 3 - acc * 4) * dt;
    ud.bobA = clamp((ud.bobA || 0) + ud.bobV * dt, -0.6, 0.6);
    ud.bob.rotation.x = ud.bobA;
    return;
  }
  const center = _c1; locateWorld(trainLength() * 0.3, center);
  if (cam.mode === 'poursuite' || cam.mode === 'drone') {
    headDir(_c2);
    const drone = cam.mode === 'drone';
    const base = Math.atan2(_c2.x, _c2.z) + cam.orbitYaw + (drone ? t * 0.03 : 0);
    const pitch = drone ? 0.55 : cam.orbitPitch, dist = drone ? 260 : cam.orbitDist;
    const cp = Math.cos(pitch);
    const tx = camera.position.x, ty = camera.position.y, tz = camera.position.z;
    let x = center.x + Math.sin(base) * dist * cp, y = center.y + 4 + Math.sin(pitch) * dist, z = center.z + Math.cos(base) * dist * cp;
    y = Math.max(y, hAt(x, z) + 3);
    const far = Math.hypot(tx - x, tz - z) > 700;
    const k = drone && !far ? 1 - Math.pow(0.15, dt) : 1;
    camera.position.set(lerp(tx, x, k), lerp(ty, y, k), lerp(tz, z, k));
    camera.position.y = Math.max(camera.position.y, hAt(camera.position.x, camera.position.z) + 3);
    camera.lookAt(center.x, center.y + 3, center.z);
    return;
  }
  const head = headPos(_c3);
  if (!cam.cine || cam.cineT > 16 || cam.cine.passed > 140) {
    let target = null;
    const ahead = 120 + Math.random() * 160;
    lookAhead(ahead, (tr, d, s0, s1, acc) => { if (acc + Math.abs(s1 - s0) >= ahead - 1) { const s = s0 + Math.sign(s1 - s0) * (ahead - acc); target = { tr, s }; return false; } });
    if (!target) target = { tr: train.cur.t, s: train.cur.s };
    const p = target.tr.pos(target.s, new THREE.Vector3()), tg = target.tr.tan(target.s, new THREE.Vector3());
    let best = null;
    for (let k = 0; k < 10 && !best; k++) {
      const side = Math.random() < 0.5 ? -1 : 1, off = 9 + Math.random() * 14 + k * 3;
      const x = p.x - tg.z * off * side, z = p.z + tg.x * off * side;
      let ok = tmGet(x, z) !== 3;
      for (let q = 1; q < 8 && ok; q++) if (tmGet(lerp(x, p.x, q / 8), lerp(z, p.z, q / 8)) === 3) ok = false;
      if (ok) best = { x, z, y: Math.max(hAt(x, z), p.y) + 1.6 + Math.random() * 5 };
    }
    if (!best) { const x = p.x - tg.z * 26, z = p.z + tg.x * 26; best = { x, z, y: Math.max(hAt(x, z), p.y) + 34 }; }
    cam.cine = { pos: new THREE.Vector3(best.x, best.y, best.z), passed: -1e9 };
    cam.cineT = 0;
  }
  cam.cineT += dt;
  camera.position.copy(cam.cine.pos);
  const dirv = headDir(_c2);
  cam.cine.passed = (head.x - cam.cine.pos.x) * dirv.x + (head.z - cam.cine.pos.z) * dirv.z;
  _c2.set(lerp(center.x, head.x, 0.5), lerp(center.y, head.y, 0.5) + 2.5, lerp(center.z, head.z, 0.5));
  camera.lookAt(_c2);
}

// ---------- démarrage
export function fitFov() {
  const base = cam.mode === 'cabine' ? 68 : 58;
  const minH = cam.mode === 'cabine' ? 54 : 48; // champ horizontal minimal (portrait)
  const need = 2 * Math.atan(Math.tan(minH * Math.PI / 360) / camera.aspect) * 180 / Math.PI;
  camera.fov = Math.min(Math.max(base, need), 92);
  camera.updateProjectionMatrix();
}
