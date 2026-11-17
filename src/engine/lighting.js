// Lumière : heures du jour, soleil et ombres, ciel, environnement, ombrage commun des matériaux
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { clamp } from './util.js';
import { Q } from './quality.js';
import { WW, HH, hAt } from '../world/land.js';
import { scene, renderer, bloomPass, gradePass } from './renderer.js';
import { NOISE } from './textures.js';

// ---------- heures de la journée
export const TIMES = {
  matin: { nom: 'Matin', elev: 9, az: 105, turb: 2.3, ray: 1.4, mie: 0.0032, sun: [1.0, 0.84, 0.66], sunI: 3.4, exp: 0.56, fog: 0xc9c6c4, dens: 0.00008, lit: 0.04, cloud: 0.42, skyMul: 0.8 },
  midi: { nom: 'Plein jour', elev: 52, az: 175, turb: 2.0, ray: 0.9, mie: 0.004, sun: [1.0, 0.97, 0.92], sunI: 4.2, exp: 0.46, fog: 0xa9c4e0, dens: 0.00006, lit: 0.0, cloud: 0.48, skyMul: 0.8 },
  doree: { nom: 'Heure dorée', elev: 11, az: 248, turb: 2.3, ray: 1.6, mie: 0.0034, sun: [1.0, 0.78, 0.5], sunI: 3.8, exp: 0.55, fog: 0xc7b7a3, dens: 0.00008, lit: 0.05, cloud: 0.45, skyMul: 0.75 },
  crepuscule: { nom: 'Crépuscule', elev: 1.5, az: 258, turb: 3.6, ray: 2.6, mie: 0.0055, sun: [1.0, 0.56, 0.3], sunI: 2.0, exp: 0.85, fog: 0x7a6676, dens: 0.00009, lit: 0.6, cloud: 0.5, skyMul: 0.85 },
};
export let TKEY = (() => { try { return localStorage.getItem('porkonia-express-t') || 'midi'; } catch (e) { return 'midi'; } })();
if (!TIMES[TKEY]) TKEY = 'doree';
export const SUN_DIR = new THREE.Vector3();
export const SUN_COL = new THREE.Color();
function sunVector(t) {
  const e = THREE.MathUtils.degToRad(t.elev), a = THREE.MathUtils.degToRad(t.az);
  return new THREE.Vector3(Math.cos(e) * Math.sin(a), Math.sin(e), -Math.cos(e) * Math.cos(a)).normalize();
}

// lumière du soleil (ombres qui suivent la caméra)
const sun = new THREE.DirectionalLight(0xffffff, 4);
sun.castShadow = true;
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.45;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x55603a, 0.25);
scene.add(hemi);
function configureShadows() {
  sun.shadow.mapSize.set(Q.shadow, Q.shadow);
  const r = Q.shadowR;
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: 4000 });
  sun.shadow.camera.updateProjectionMatrix();
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
}
configureShadows();
export const _sx = new THREE.Vector3(), _sy = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
export function updateSunShadow(focus) {
  const texel = (2 * Q.shadowR) / Q.shadow;
  _sx.crossVectors(_up, SUN_DIR).normalize(); _sy.crossVectors(SUN_DIR, _sx);
  let u = focus.dot(_sx), v = focus.dot(_sy); const w = focus.dot(SUN_DIR);
  u = Math.round(u / texel) * texel; v = Math.round(v / texel) * texel;
  sun.target.position.set(0, 0, 0).addScaledVector(_sx, u).addScaledVector(_sy, v).addScaledVector(SUN_DIR, w);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 1800);
  sun.target.updateMatrixWorld();
}

// ---------- ciel atmosphérique + nuages (un seul passage)
export const sky = new Sky();
sky.scale.setScalar(10000);
sky.frustumCulled = false;
sky.material.uniforms.tNoise = { value: NOISE };
sky.material.uniforms.uTime = { value: 0 };
sky.material.uniforms.uCover = { value: 0.45 };
sky.material.uniforms.uSkyMul = { value: 1.0 };
sky.material.uniforms.uCloudCol = { value: new THREE.Color(1, 0.9, 0.8) };
sky.material.fragmentShader = sky.material.fragmentShader
  .replace('uniform vec3 up;', `uniform vec3 up;\nuniform sampler2D tNoise; uniform float uTime, uCover, uSkyMul; uniform vec3 uCloudCol;
    float cloudFbm(vec2 p){ float f = texture2D(tNoise, p).r * 0.5 + texture2D(tNoise, p * 2.03 + 0.17).g * 0.28 + texture2D(tNoise, p * 4.1 + 0.37).b * 0.14 + texture2D(tNoise, p * 8.3).r * 0.08; return f; }`)
  .replace('gl_FragColor = vec4( retColor, 1.0 );', `
    vec3 dir = normalize(vWorldPosition - cameraPosition);
    vec3 col = retColor * uSkyMul;
    if (dir.y > 0.0) {
      float t = (2600.0 - cameraPosition.y) / max(dir.y, 0.02);
      vec2 p = (cameraPosition.xz + dir.xz * t) * 0.000045 + vec2(uTime * 0.0006, uTime * 0.0002);
      float d = cloudFbm(p);
      float cov = smoothstep(1.0 - uCover, 1.0 - uCover + 0.28, d);
      vec2 ps = p + normalize(vSunDirection.xz + 0.0001) * 0.012;
      float d2 = cloudFbm(ps);
      float shade = clamp(1.0 - (d2 - d) * 4.0, 0.25, 1.15);
      float sunDot = max(dot(dir, vSunDirection), 0.0);
      vec3 lit = uCloudCol * (0.75 + 0.25 * vSunE / 1000.0) * shade;
      vec3 shadowCol = retColor * 0.55 + vec3(0.08, 0.09, 0.12);
      vec3 cc = mix(shadowCol, lit, clamp(shade, 0.0, 1.0)) + uCloudCol * pow(sunDot, 12.0) * (1.0 - cov) * 2.0 * cov;
      float horizon = smoothstep(0.0, 0.22, dir.y);
      col = mix(col, cc * (0.6 + 0.4 * vSunfade), cov * horizon * 0.92);
    }
    gl_FragColor = vec4( col, 1.0 );`);
sky.material.needsUpdate = true;
scene.add(sky);

const skyScene = new THREE.Scene();
export const envCubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
const cubeCam = new THREE.CubeCamera(1, 20000, envCubeRT);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;

// partagé par les matériaux du monde : ombres des montagnes et des nuages
export const WS = {
  uSunVis: { value: null }, uCloud: { value: NOISE }, uTime: { value: 0 }, uCover: { value: 0.45 },
  uWorld: { value: new THREE.Vector2(WW, HH) }, uSunDirW: { value: SUN_DIR }, uSunView: { value: new THREE.Vector3() }, uSunColU: { value: SUN_COL },
  uLit: { value: 0 },
};
const WS_PARS = `
  uniform sampler2D uSunVis; uniform sampler2D uCloud; uniform float uTime, uCover, uLit; uniform vec2 uWorld; uniform vec3 uSunDirW, uSunView, uSunColU;
  varying vec3 vWP;
  float worldShade(){
    vec2 uv = vWP.xz / uWorld + 0.5;
    float sv = (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) ? 1.0 : texture2D(uSunVis, uv).r;
    float t = (2600.0 - vWP.y) / max(uSunDirW.y, 0.05);
    vec2 p = (vWP.xz + uSunDirW.xz * t) * 0.000045 + vec2(uTime * 0.0006, uTime * 0.0002);
    float d = texture2D(uCloud, p).r * 0.5 + texture2D(uCloud, p * 2.03 + 0.17).g * 0.28 + texture2D(uCloud, p * 4.1 + 0.37).b * 0.14;
    float cs = 1.0 - smoothstep(1.0 - uCover, 1.0 - uCover + 0.28, d) * 0.72;
    return sv * cs;
  }`;
export function worldShading(mat, extra = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    Object.assign(sh.uniforms, WS);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
      { vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        wp4 = instanceMatrix * wp4;
        #endif
        vWP = (modelMatrix * wp4).xyz; }`);
    sh.fragmentShader = WS_PARS + '\n' + sh.fragmentShader
      .replace('#include <lights_fragment_begin>', THREE.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );', 'getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= wShade;'))
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n\tfloat wShade = worldShade();');
    if (prev) prev(sh, r);
    if (extra.after) extra.after(sh);
  };
  mat.customProgramCacheKey = () => (extra.key || 'ws') + (mat.vertexColors ? 'v' : '') + (mat.map ? 'm' : '');
  return mat;
}

// visibilité du soleil sur le relief (ombres portées des montagnes à grande échelle)
const SV_W = 193, SV_H = 145;
const svData = new Uint8Array(SV_W * SV_H);
export const svTex = new THREE.DataTexture(svData, SV_W, SV_H, THREE.RedFormat);
svTex.magFilter = svTex.minFilter = THREE.LinearFilter; svTex.needsUpdate = true;
WS.uSunVis.value = svTex;
function computeSunVis() {
  const d = SUN_DIR, hl = Math.hypot(d.x, d.z) || 1e-6, dx = d.x / hl, dz = d.z / hl, tanE = d.y / hl;
  for (let j = 0; j < SV_H; j++) for (let i = 0; i < SV_W; i++) {
    const x = (i / (SV_W - 1) - 0.5) * WW, z = (j / (SV_H - 1) - 0.5) * HH;
    const y0 = Math.max(hAt(x, z), 0) + 3;
    let vis = 1;
    for (let t = 60; t < 9000; t *= 1.07) {
      const px = x + dx * t, pz = z + dz * t;
      if (px < -WW / 2 || px > WW / 2 || pz < -HH / 2 || pz > HH / 2) break;
      const ray = y0 + t * tanE;
      if (ray > 1300) break;
      const m = (ray - hAt(px, pz)) / (6 + t * 0.012);
      if (m < vis) { vis = m; if (vis <= 0) { vis = 0; break; } }
    }
    svData[j * SV_W + i] = clamp(vis, 0, 1) * 255;
  }
  svTex.needsUpdate = true;
}

export const TIME_LISTENERS = [];   // appelés à chaque changement d'heure
export function applyTime(key) {
  TKEY = key; const t = TIMES[key];
  try { localStorage.setItem('porkonia-express-t', key); } catch (e) { }
  SUN_DIR.copy(sunVector(t));
  SUN_COL.setRGB(t.sun[0], t.sun[1], t.sun[2]);
  sun.color.copy(SUN_COL); sun.intensity = t.sunI;
  hemi.intensity = 0.18 + t.elev / 200;
  const u = sky.material.uniforms;
  u.turbidity.value = t.turb; u.rayleigh.value = t.ray; u.mieCoefficient.value = t.mie; u.mieDirectionalG.value = 0.93;
  u.sunPosition.value.copy(SUN_DIR);
  bloomPass.threshold = 1.15 / t.exp; u.uCover.value = t.cloud; WS.uCover.value = t.cloud; u.uSkyMul.value = t.skyMul;
  u.uCloudCol.value.setRGB(1, 0.86 + t.elev / 300, 0.72 + t.elev / 140);
  renderer.toneMappingExposure = t.exp;
  scene.fog.color.set(t.fog); scene.fog.density = t.dens;
  WS.uLit.value = t.lit;
  gradePass.uniforms.uSunCol.value.copy(SUN_COL);
  gradePass.uniforms.uWarm.value = key === 'midi' ? 0.0 : 0.022;
  computeSunVis();
  updateEnvironment();
  for (const f of TIME_LISTENERS) f(t);
}
function updateEnvironment() {
  const sp = sky.position.clone();
  skyScene.add(sky);
  cubeCam.position.set(0, 200, 0); sky.position.copy(cubeCam.position);
  cubeCam.update(renderer, skyScene);
  scene.add(sky); sky.position.copy(sp);
  if (envRT) envRT.dispose();
  envRT = pmrem.fromCubemap(envCubeRT.texture);
  scene.environment = envRT.texture;
}
