// Maillage et matériau du terrain
import * as THREE from 'three';
import { clamp } from '../engine/util.js';
import { NX, NZ, CLS, LAKE, H, CELL, AOV, WW, HH, tmGet, hAt } from './land.js';
import { freeAfterUpload } from '../engine/renderer.js';
import { TEX, NOISE } from '../engine/textures.js';
import { worldShading } from '../engine/lighting.js';
import { PARCEL_TEX } from './parcels.js';

// ---------- terrain (LOD par tuiles, mélange de textures, AO, normales de détail)
let TERRAIN_MAT = null;
function terrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.55 });
  worldShading(m, {
    key: 'terrain', after: sh => {
      Object.assign(sh.uniforms, {
        tGrass: { value: TEX.grass }, tDry: { value: TEX.dry }, tForest: { value: TEX.forest }, tRock: { value: TEX.rock }, tSnow: { value: TEX.snow },
        tSand: { value: TEX.sand }, tGravel: { value: TEX.gravel }, tDetN: { value: TEX.detailN }, tNoiseT: { value: NOISE }, tGrassN: { value: TEX.grassN },
        tParcelId: { value: PARCEL_TEX.id }, tParcelEdge: { value: PARCEL_TEX.edge },
      });
      sh.vertexShader = 'attribute vec4 aSplat; attribute vec4 aMisc; attribute float aAO; varying vec4 vSplat; varying vec4 vMisc; varying float vAO; varying vec3 vWN;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vSplat = aSplat; vMisc = aMisc; vAO = aAO; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = `uniform sampler2D tGrass, tDry, tForest, tRock, tSnow, tSand, tGravel, tDetN, tNoiseT, tGrassN, tParcelId, tParcelEdge;
        varying vec4 vSplat; varying vec4 vMisc; varying float vAO; varying vec3 vWN;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float snowW_g; float rockW_g;\n` + sh.fragmentShader
        .replace('#include <map_fragment>', `
          vec3 wn = normalize(vWN);
          vec2 uvA = vWP.xz * 0.115;
          float macro = texture2D(tNoiseT, vWP.xz * 0.0011).r;
          float macro2 = texture2D(tNoiseT, vWP.xz * 0.0043).g;
          float tsel = texture2D(tNoiseT, vWP.xz * 0.006).b;
          vec2 uvB = mat2(0.8, -0.6, 0.6, 0.8) * uvA * 0.83 + vec2(0.31, 0.57);
          vec3 grass = mix(texture2D(tGrass, uvA).rgb, texture2D(tGrass, uvB).rgb, smoothstep(0.35, 0.65, tsel));
          grass = mix(grass, texture2D(tGrass, uvA * 0.27 + 0.13).rgb * vec3(1.06, 1.0, 0.84), 0.3);
          grass *= mix(vec3(0.78, 0.86, 0.7), vec3(1.15, 1.08, 0.95), macro) * vec3(0.98, 1.16, 0.82);
          grass = mix(grass, grass * vec3(1.18, 1.05, 0.72), smoothstep(0.55, 0.8, macro2) * 0.6);
          { float fd = length(cameraPosition - vWP);
            if (fd < 80.0) { vec2 fq = vWP.xz * 2.6; vec2 fc = floor(fq); float fh = h21(fc), pt = texture2D(tNoiseT, vWP.xz * 0.012).g;
              if (fh > 0.965 - 0.05 * smoothstep(0.45, 0.75, pt)) { vec2 ff = fract(fq) - 0.5 - (vec2(h21(fc + 3.1), h21(fc + 7.7)) - 0.5) * 0.5; float fk = h21(fc + 11.3);
                vec3 fcol = fk < 0.34 ? vec3(1.0, 0.82, 0.1) : fk < 0.67 ? vec3(1.0, 0.98, 0.92) : fk < 0.85 ? vec3(1.0, 0.4, 0.6) : vec3(0.55, 0.4, 1.0);
                grass = mix(grass, fcol, smoothstep(0.2, 0.1, length(ff)) * smoothstep(80.0, 45.0, fd)); } } }
          vec3 dry = texture2D(tDry, uvA).rgb * (0.85 + macro * 0.3);
          vec3 forest = texture2D(tForest, uvA).rgb;
          vec3 bl = pow(abs(wn), vec3(4.0)); bl /= dot(bl, vec3(1.0));
          vec3 rock = texture2D(tRock, vWP.zy * 0.045).rgb * bl.x + texture2D(tRock, vWP.xz * 0.045).rgb * bl.y + texture2D(tRock, vWP.xy * 0.045).rgb * bl.z;
          rock *= 0.85 + macro2 * 0.35;
          vec3 snow = texture2D(tSnow, uvA * 0.6).rgb;
          vec3 sand = texture2D(tSand, uvA).rgb;
          vec3 gravel = texture2D(tGravel, uvA * 1.5).rgb;
          float slope = 1.0 - wn.y;
          vec3 col = grass;
          col = mix(col, dry, clamp(vSplat.y * 1.2 + (macro - 0.5) * 0.4, 0.0, 1.0));
          col = mix(col, forest, clamp(vSplat.x * 1.1, 0.0, 1.0));
          // bocage : chaque champ du parcellaire a sa culture ; chemins de terre et pieds de haie sur les limites
          if (vMisc.x > 0.01) {
            vec2 pu = vWP.xz / 2048.0;
            vec4 pid = texture2D(tParcelId, pu); vec4 ped = texture2D(tParcelEdge, pu);
            float hh = pid.r, edge = ped.r * 31.875, hedge = step(0.5, ped.g), fd2 = length(cameraPosition - vWP);
            vec3 gr2 = texture2D(tGrass, uvA * 0.5).rgb;
            vec3 fc; float sillons = 0.0;
            if (hh < 0.18) { fc = vec3(0.78, 0.56, 0.17); sillons = 0.22; }                   // blé mûr
            else if (hh < 0.27) { fc = vec3(0.88, 0.74, 0.07); sillons = 0.12; }              // colza
            else if (hh < 0.5) fc = grass * vec3(1.75, 1.5, 1.0) + vec3(0.03, 0.04, 0.0);      // prairie claire
            else if (hh < 0.66) fc = grass * vec3(1.35, 1.3, 1.0);                             // pâture
            else if (hh < 0.78) { fc = vec3(0.36, 0.56, 0.16); sillons = 0.2; }                // luzerne
            else if (hh < 0.9) { fc = vec3(0.4, 0.26, 0.16); sillons = 0.34; }                 // labour
            else if (hh < 0.94) { fc = vec3(0.5, 0.4, 0.76); sillons = 0.34; }                 // lavande
            else { fc = vec3(0.7, 0.58, 0.32); sillons = 0.26; }                               // chaume
            if (sillons > 0.0) {
              float a = pid.g * 3.14159; vec2 dir = vec2(cos(a), sin(a));
              float rows = sin(dot(vWP.xz, dir) * 1.9);
              fc *= 1.0 - sillons * (0.5 + 0.5 * rows) * smoothstep(260.0, 60.0, fd2);
              fc *= 0.72 + 0.62 * gr2.g;
            }
            fc *= 0.92 + 0.16 * macro2;
            col = mix(col, fc, vMisc.x);
            float lim = 1.0 - smoothstep(0.9, 2.4, edge);
            col = mix(col, vec3(0.6, 0.5, 0.34) * (0.85 + 0.3 * gr2.r), vMisc.x * lim * (1.0 - hedge) * 0.85);
            col = mix(col, vec3(0.1, 0.19, 0.07), vMisc.x * (1.0 - smoothstep(1.4, 3.4, edge)) * hedge);
          }
          col = mix(col, sand, clamp(vSplat.w, 0.0, 1.0));
          float rockW = smoothstep(0.34, 0.56, slope + (macro2 - 0.5) * 0.16) * (1.0 - vSplat.w);
          col = mix(col, rock, rockW);
          float alp = clamp(vSplat.z * 1.3, 0.0, 1.0);
          col = mix(col, mix(dry * vec3(0.9, 0.88, 0.8), rock, 0.35 + macro2 * 0.3), alp * smoothstep(120.0, 300.0, vWP.y) * 0.7);
          float snowLine = 360.0 + (macro - 0.5) * 220.0 + (macro2 - 0.5) * 90.0;
          float snowW = alp * smoothstep(snowLine, snowLine + 110.0, vWP.y) * smoothstep(0.66, 0.3, slope + (macro - 0.5) * 0.2);
          snowW = max(snowW, smoothstep(700.0, 820.0, vWP.y + macro * 120.0) * smoothstep(0.75, 0.4, slope));
          col = mix(col, snow, snowW);
          col = mix(col, gravel, clamp(vMisc.z, 0.0, 1.0) * (1.0 - snowW));
          { vec3 pave = texture2D(tGravel, uvA * 0.6).rgb * vec3(0.95, 0.93, 0.9) * (0.85 + macro2 * 0.3); float u = vMisc.w * smoothstep(0.35, 0.65, texture2D(tNoiseT, vWP.xz * 0.012).b + vMisc.w * 0.4); col = mix(col, mix(pave, grass * 0.9, 0.35), u * 0.75); }
          col *= mix(1.0, vAO, 0.8);
          diffuseColor.rgb = col;
          snowW_g = snowW; rockW_g = rockW;`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(mix(0.95, 0.82, rockW_g), 0.46, snowW_g);')
        .replace('#include <normal_fragment_maps>', `
          { vec3 dn = texture2D(tDetN, vWP.xz * 0.07).xyz * 2.0 - 1.0; vec3 dn2 = texture2D(tDetN, vWP.xz * 0.013).xyz * 2.0 - 1.0;
            vec3 gn = texture2D(tGrassN, vWP.xz * 0.115).xyz * 2.0 - 1.0;
            float st = mix(0.55, 1.1, rockW_g) * (1.0 - snowW_g * 0.6);
            float gnear = (1.0 - rockW_g) * (1.0 - snowW_g) * smoothstep(90.0, 10.0, length(cameraPosition - vWP));
            vec3 nW = normalize(normalize(vWN) + (vec3(dn.x, 0.0, dn.y) * 0.6 + vec3(dn2.x, 0.0, dn2.y) * 0.5) * st + vec3(gn.x, 0.0, gn.y) * 0.55 * gnear);
            normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }`);
    },
  });
  return m;
}

export function buildTerrain(fieldCenters) {
  const group = new THREE.Group();
  // attributs par sommet sur toute la grille fine
  const N = NX * NZ;
  const nrm = new Float32Array(N * 3), splat = new Uint8Array(N * 4), misc = new Uint8Array(N * 4), ao = new Float32Array(N);
  const blur = (fn) => { const a = new Float32Array(N); for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { let s = 0, c = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue; s += fn(jj * NX + ii); c++; } a[j * NX + i] = s / c; } return a; };
  const forestM = blur(k => CLS[k] === 2 ? 1 : 0), hillM = blur(k => CLS[k] === 3 ? 1 : 0), snowM = blur(k => CLS[k] === 4 ? 1 : 0);
  const seaNear = blur(k => CLS[k] === 0 || LAKE[k] ? 1 : 0);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    const hl = H[j * NX + Math.max(i - 1, 0)], hr = H[j * NX + Math.min(i + 1, NX - 1)], hd = H[Math.max(j - 1, 0) * NX + i], hu = H[Math.min(j + 1, NZ - 1) * NX + i];
    let nx = -(hr - hl) / (2 * CELL), ny = 1, nz2 = -(hu - hd) / (2 * CELL); const l = Math.hypot(nx, ny, nz2);
    nrm[k * 3] = nx / l; nrm[k * 3 + 1] = ny / l; nrm[k * 3 + 2] = nz2 / l;
    const h = H[k];
    const sand = (seaNear[k] > 0.05 && h < 3.2 && CLS[k] !== 4) ? 1 : 0;
    splat[k * 4] = forestM[k] * 255; splat[k * 4 + 1] = hillM[k] * 255; splat[k * 4 + 2] = snowM[k] * 255; splat[k * 4 + 3] = sand * 255;
    ao[k] = AOV[k] / 255;
    const x = (i / (NX - 1) - 0.5) * WW, z = (j / (NZ - 1) - 0.5) * HH;
    // bocage : toute la plaine cultivable porte des champs (le parcellaire vient de world/parcels.js)
    let fm = CLS[k] === 1 && ny / l > 0.93 && !sand ? 1 : 0;
    // pas de champs dans l'emprise des villes : ils s'effacent à l'approche des faubourgs
    if (fm) for (const f of fieldCenters) { const dx = x - f.x, dz = z - f.z, d2 = dx * dx + dz * dz; if (d2 < f.inner2 * 1.9) fm = Math.min(fm, clamp((Math.sqrt(d2) - Math.sqrt(f.inner2)) / 110, 0, 1)); }
    const tm = tmGet(x, z);
    const grav = (tm === 1 || tm === 2) && ny / l < 0.93 ? 1 : 0;
    let urb = 0;
    for (const f of fieldCenters) { const d = Math.hypot(x - f.cx, z - f.cz); if (d < f.urb) { urb = Math.max(urb, clamp((f.urb - d) / (f.urb * 0.35), 0, 1)); } }
    misc[k * 4] = fm * 255 * (1 - urb); misc[k * 4 + 1] = 0; misc[k * 4 + 2] = grav * 200; misc[k * 4 + 3] = urb * 255;
  }
  TERRAIN_MAT = terrainMaterial();
  const CH = 64;
  const makeChunk = (ci, cj, step) => {
    const i0 = ci * CH, j0 = cj * CH;
    const n = CH / step + 1;
    const vcount = n * n + 4 * n;
    const pos = new Float32Array(vcount * 3), nor = new Float32Array(vcount * 3), sp = new Uint8Array(vcount * 4), mi = new Uint8Array(vcount * 4), aa = new Float32Array(vcount);
    let v = 0;
    const put = (i, j, drop) => {
      i = Math.min(i, NX - 1); j = Math.min(j, NZ - 1);
      const k = j * NX + i;
      pos[v * 3] = (i / (NX - 1) - 0.5) * WW; pos[v * 3 + 1] = H[k] - drop; pos[v * 3 + 2] = (j / (NZ - 1) - 0.5) * HH;
      nor[v * 3] = nrm[k * 3]; nor[v * 3 + 1] = nrm[k * 3 + 1]; nor[v * 3 + 2] = nrm[k * 3 + 2];
      for (let c = 0; c < 4; c++) { sp[v * 4 + c] = splat[k * 4 + c]; mi[v * 4 + c] = misc[k * 4 + c]; }
      aa[v] = ao[k]; v++;
    };
    for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) put(i0 + a * step, j0 + b * step, 0);
    const idx = [];
    for (let b = 0; b < n - 1; b++) for (let a = 0; a < n - 1; a++) {
      const p00 = b * n + a, p10 = p00 + 1, p01 = p00 + n, p11 = p01 + 1;
      idx.push(p00, p01, p11, p00, p11, p10);
    }
    // jupes contre les fissures entre niveaux de détail
    const skirt = (list) => { const base = v; for (const [a, b] of list) put(i0 + a * step, j0 + b * step, 18); return base; };
    const edges = [[...Array(n).keys()].map(a => [a, 0]), [...Array(n).keys()].map(a => [a, n - 1]), [...Array(n).keys()].map(b => [0, b]), [...Array(n).keys()].map(b => [n - 1, b])];
    for (const e of edges) {
      const base = skirt(e);
      for (let q = 0; q < n - 1; q++) { const t0 = e[q][1] * n + e[q][0], t1 = e[q + 1][1] * n + e[q + 1][0]; idx.push(t0, base + q, base + q + 1, t0, base + q + 1, t1, t0, base + q + 1, base + q, t0, t1, base + q + 1); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('aSplat', new THREE.BufferAttribute(sp, 4, true));
    g.setAttribute('aMisc', new THREE.BufferAttribute(mi, 4, true));
    g.setAttribute('aAO', new THREE.BufferAttribute(aa, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, TERRAIN_MAT); freeAfterUpload(g);
    mesh.receiveShadow = true; mesh.castShadow = step === 1;
    return mesh;
  };
  for (let cj = 0; cj * CH < NZ - 1; cj++) for (let ci = 0; ci * CH < NX - 1; ci++) {
    let allSea = true;
    for (let j = cj * CH; j <= Math.min((cj + 1) * CH, NZ - 1) && allSea; j += 4) for (let i = ci * CH; i <= Math.min((ci + 1) * CH, NX - 1); i += 4) if (H[j * NX + i] > -3) { allSea = false; break; }
    if (allSea) continue;
    const lod = new THREE.LOD();
    lod.addLevel(makeChunk(ci, cj, 1), 0);
    lod.addLevel(makeChunk(ci, cj, 2), 2600);
    lod.addLevel(makeChunk(ci, cj, 4), 6500);
    const cx = ((ci + 0.5) * CH / (NX - 1) - 0.5) * WW, cz = ((cj + 0.5) * CH / (NZ - 1) - 0.5) * HH;
    lod.position.set(0, 0, 0);
    // LOD mesure la distance au centre de la tuile
    for (const l of lod.levels) { l.object.position.set(0, 0, 0); }
    lod.userData.center = new THREE.Vector3(cx, hAt(cx, cz), cz);
    lod.update = function (cam) {
      const d = cam.position.distanceTo(this.userData.center);
      const lv = this.levels;
      let k = 0; for (let i = 1; i < lv.length; i++) if (d >= lv[i].distance) k = i;
      for (let i = 0; i < lv.length; i++) lv[i].object.visible = i === k;
      this._currentLevel = k;
    };
    group.add(lod);
  }
  return group;
}
