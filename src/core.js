// Socle : outils, qualité, données du monde, rendu, ciel, lumière, textures, terrain, eau
import { worldData } from './data.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Sky } from 'three/addons/objects/Sky.js';

export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
export function mulberry(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function b64(s, T) { const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new T(u8.buffer); }
export async function gunzip(s) {
  const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const stream = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export const fmtMoney = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
export const setStatus = t => { const el = $('loading-status'); if (el) el.textContent = t; };
export const tick = () => new Promise(r => setTimeout(r, 0));

// ---------- détection des capacités et niveau de qualité
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const QUALITIES = {
  ultra: { label: 'Ultra', pr: 2.0, shadow: 4096, shadowR: 220, shadowEvery: 1, grass: 64000, grassR: 78, treeNear: 520, cardR: 700, detailR: 700, propK: 1.2, treeMid: 2400, treeFar: 8000, reflect: 0.5, rays: true, msaa: 4, trees: 1.0, bloom: 1 },
  haute: { label: 'Haute', pr: 1.25, shadow: 2048, shadowR: 170, shadowEvery: 2, grass: 34000, grassR: 62, treeNear: 330, cardR: 520, detailR: 420, propK: 0.8, treeMid: 1700, treeFar: 4800, reflect: 0, rays: false, msaa: 2, trees: 0.85, bloom: 1 },
  mobile: { label: 'Économe', pr: 1.0, shadow: 1024, shadowR: 110, shadowEvery: 3, grass: 15000, grassR: 46, treeNear: 190, cardR: 260, detailR: 240, propK: 0.5, treeMid: 1100, treeFar: 3200, reflect: 0, rays: false, msaa: 0, trees: 0.6, bloom: 0 },
};
export let QKEY = (() => { try { return localStorage.getItem('porkonia-q3') || (IS_TOUCH ? 'mobile' : 'haute'); } catch (e) { return 'haute'; } })();
if (!QUALITIES[QKEY]) QKEY = 'haute';
export let Q = QUALITIES[QKEY];

// ---------- données du monde
setStatus('Décompression de la carte de Porkonia…');
export const PW = await worldData;
export const NX = PW.NX, NZ = PW.NZ, WW = PW.W, HH = PW.H, CELL = WW / (NX - 1);
const _hraw = new Int16Array((await gunzip(PW.heights)).buffer);
export const H = new Float32Array(_hraw.length); for (let i = 0; i < _hraw.length; i++) H[i] = _hraw[i] / 10;
export const HGT = H;
const CLSP = await gunzip(PW.cls);
const AOV = await gunzip(PW.ao);
export const CLS = new Uint8Array(CLSP.length), LAKE = new Uint8Array(CLSP.length);
for (let i = 0; i < CLSP.length; i++) { CLS[i] = CLSP[i] & 7; LAKE[i] = CLSP[i] >> 3; }
const LAKE_LV = [0, ...PW.lakes];

export function hAt(x, z) {
  let fi = (x / WW + 0.5) * (NX - 1), fj = (z / HH + 0.5) * (NZ - 1);
  fi = clamp(fi, 0, NX - 1.0001); fj = clamp(fj, 0, NZ - 1.0001);
  const i = fi | 0, j = fj | 0, tx = fi - i, tz = fj - j;
  const h00 = H[j * NX + i], h10 = H[j * NX + i + 1], h01 = H[(j + 1) * NX + i], h11 = H[(j + 1) * NX + i + 1];
  if (tz >= tx) return h00 + (h11 - h01) * tx + (h01 - h00) * tz;
  return h00 + (h10 - h00) * tx + (h11 - h10) * tz;
}
export function idxAt(x, z) {
  const i = clamp(Math.round((x / WW + 0.5) * (NX - 1)), 0, NX - 1), j = clamp(Math.round((z / HH + 0.5) * (NZ - 1)), 0, NZ - 1);
  return j * NX + i;
}
export const clsAt = (x, z) => CLS[idxAt(x, z)];
export function waterAt(x, z) { const k = idxAt(x, z); if (LAKE[k]) return LAKE_LV[LAKE[k]]; if (CLS[k] === 0) return 0; return -1e9; }
export function slopeAt(x, z) { const d = 6; return Math.hypot(hAt(x + d, z) - hAt(x - d, z), hAt(x, z + d) - hAt(x, z - d)) / (2 * d); }

// masque fin (12,5 m) : 1 voie, 2 gare, 3 bâti, 4 rue, 5 réservé
const TRACKMASK_RES = 12.5;
const TMW = Math.ceil(WW / TRACKMASK_RES), TMH = Math.ceil(HH / TRACKMASK_RES);
const TRACKMASK = new Uint8Array(TMW * TMH);
function tmIdx(x, z) { const i = Math.floor((x + WW / 2) / TRACKMASK_RES), j = Math.floor((z + HH / 2) / TRACKMASK_RES); if (i < 0 || j < 0 || i >= TMW || j >= TMH) return -1; return j * TMW + i; }
export function tmMark(x, z, r, v) {
  const n = Math.ceil(r / TRACKMASK_RES);
  const ci = Math.floor((x + WW / 2) / TRACKMASK_RES), cj = Math.floor((z + HH / 2) / TRACKMASK_RES);
  for (let j = cj - n; j <= cj + n; j++) for (let i = ci - n; i <= ci + n; i++) {
    if (i < 0 || j < 0 || i >= TMW || j >= TMH) continue;
    const dx = (i + 0.5) * TRACKMASK_RES - WW / 2 - x, dz = (j + 0.5) * TRACKMASK_RES - HH / 2 - z;
    if (dx * dx + dz * dz <= r * r) { const k = j * TMW + i; TRACKMASK[k] = Math.max(TRACKMASK[k], v); }
  }
}
export const tmGet = (x, z) => { const k = tmIdx(x, z); return k < 0 ? 0 : TRACKMASK[k]; };

export const STATIONS = PW.stations.map((s, i) => ({ ...s, id: i, dir: new THREE.Vector2(Math.cos(s.ax), Math.sin(s.ax)) }));
export const STATION_BY_NAME = Object.fromEntries(STATIONS.map(s => [s.name, s]));

// ---------- moteur de rendu
export const canvas = $('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 16000);
camera.layers.enable(1); camera.layers.enable(2);
scene.add(camera);
scene.fog = new THREE.FogExp2(0xd9c3a5, 0.000085);
const composerRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa });
export const composer = new EffectComposer(renderer, composerRT);
composer.addPass(new RenderPass(scene, camera));
export const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.42, 1.6);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uSun: { value: new THREE.Vector2(0.5, 0.5) }, uSunVis: { value: 0 }, uSunCol: { value: new THREE.Color(1, 0.8, 0.5) },
    uRays: { value: 0 }, uSat: { value: 1.3 }, uContrast: { value: 1.05 }, uVig: { value: 0.32 }, uWarm: { value: 0.02 }, uFade: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uSunVis, uRays, uSat, uContrast, uVig, uWarm, uFade; uniform vec2 uRes, uSun; uniform vec3 uSunCol;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float circle(vec2 p, vec2 c, float r, float soft){ float d = length((p - c) * vec2(uRes.x/uRes.y, 1.0)); return smoothstep(r, r*soft, d); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec3 c;
      c.r = texture2D(tDiffuse, vUv - d * 0.0035 * r2 * 4.0).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv + d * 0.0035 * r2 * 4.0).b;
      // rayons crépusculaires (qualité ultra)
      if (uRays > 0.5 && uSunVis > 0.01) {
        vec2 dir = (uSun - vUv) / 22.0; vec2 p = vUv; float acc = 0.0, w = 1.0;
        for (int i = 0; i < 22; i++) { p += dir; vec3 s = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb; float l = dot(s, vec3(0.3,0.59,0.11)); acc += smoothstep(0.82, 1.0, l) * w; w *= 0.93; }
        c += uSunCol * acc * 0.045 * uSunVis;
      }
      // reflets d'objectif
      if (uSunVis > 0.01) {
        vec2 axis = vec2(0.5) - uSun; float f = 0.0; vec3 fl = vec3(0.0);
        fl += vec3(1.0, 0.7, 0.4) * circle(vUv, uSun + axis * 0.55, 0.035, 0.2) * 0.10;
        fl += vec3(0.5, 0.8, 1.0) * circle(vUv, uSun + axis * 0.85, 0.06, 0.6) * 0.07;
        fl += vec3(1.0, 0.5, 0.8) * circle(vUv, uSun + axis * 1.3, 0.022, 0.1) * 0.09;
        fl += vec3(0.6, 1.0, 0.7) * circle(vUv, uSun + axis * 1.7, 0.09, 0.8) * 0.05;
        float glow = circle(vUv, uSun, 0.2, 0.0) * 0.045;
        c += (fl + uSunCol * glow) * uSunVis;
      }
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c += vec3(uWarm, uWarm * 0.4, -uWarm * 0.6);
      c *= 1.0 - uVig * smoothstep(0.12, 0.62, r2 * 2.0);
      c += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.018;
      c = mix(c, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};
export const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);


// libère la copie CPU des attributs statiques une fois envoyés à la carte graphique
export function freeAfterUpload(geo, extra = []) {
  const f = function () { this.array = null; };
  if (geo) for (const k in geo.attributes) if (k !== 'position' || geo.boundingSphere) geo.attributes[k].onUpload(f);
  for (const a of extra) if (a) a.onUpload(f);
}
// ---------- textures procédurales
function makeNoiseTexture(size = 256) {
  // 4 canaux de bruit tuilable (valeur, plusieurs fréquences)
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry(1234);
  const lattice = (f, seed) => { const r = mulberry(seed); const g = new Float32Array(f * f); for (let i = 0; i < f * f; i++) g[i] = r(); return g; };
  const sample = (g, f, x, y) => { // x,y en [0,f)
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = smooth(x - x0), ty = smooth(y - y0);
    const a = g[(y0 % f) * f + (x0 % f)], b = g[(y0 % f) * f + ((x0 + 1) % f)], c = g[((y0 + 1) % f) * f + (x0 % f)], d = g[((y0 + 1) % f) * f + ((x0 + 1) % f)];
    return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
  };
  const chans = [[4, 6], [8, 5], [16, 4], [2, 6]];
  const lats = chans.map(([f0, oct], ci) => Array.from({ length: oct }, (_, o) => lattice(f0 << o, 77 + ci * 31 + o)));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (let c = 0; c < 4; c++) {
      const [f0, oct] = chans[c]; let s = 0, amp = 1, tot = 0;
      for (let o = 0; o < oct; o++) { const f = f0 << o; s += amp * sample(lats[c][o], f, x / size * f, y / size * f); tot += amp; amp *= 0.5; }
      data[(y * size + x) * 4 + c] = clamp(s / tot * 255, 0, 255);
    }
  }
  void rnd;
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
export const NOISE = makeNoiseTexture(256);
const NOISE_DATA = NOISE.image.data;
export function noiseAt(u, v, c = 0) { const s = 256; const x = ((Math.floor(u * s) % s) + s) % s, y = ((Math.floor(v * s) % s) + s) % s; return NOISE_DATA[(y * s + x) * 4 + c] / 255; }

function canvasTex(size, draw, srgb = true, repeat = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
// texture de pixels générée par fonction (bruits tuilables)
function pixelTex(size, fn, srgb = true) {
  return canvasTex(size, (g, s) => {
    const img = g.createImageData(s, s); const d = img.data;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) { const c = fn(x / s, y / s, x, y); const k = (y * s + x) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
    g.putImageData(img, 0, 0);
  }, srgb);
}
function nz(u, v, c, f = 1) { return noiseAt(u * f, v * f, c); }

// textures de sol peintes (brins vus de dessus, trèfle, fleurettes, litière) — tuilables
function strokeTex(size, seed, base, layers) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const rnd = mulberry(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  // grandes taches de variation
  for (let i = 0; i < 70; i++) { const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 110, l = rnd(); for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r); gr.addColorStop(0, l < 0.5 ? 'rgba(20,30,0,0.16)' : 'rgba(255,240,170,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2); } }
  for (const L of layers) {
    if (L.kind === 'blades') {
      // traits groupés par teinte pour aller vite
      for (const [col, w, n] of L.groups) {
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath();
        for (let i = 0; i < n; i++) {
          const x = rnd() * size, y = rnd() * size, a = rnd() * 6.283, l = L.len[0] + rnd() * (L.len[1] - L.len[0]);
          const dx = Math.cos(a) * l, dy = Math.sin(a) * l, bx = (rnd() - 0.5) * l * 0.4;
          for (const ox of (x < l + 2 ? [0, size] : x > size - l - 2 ? [0, -size] : [0])) for (const oy of (y < l + 2 ? [0, size] : y > size - l - 2 ? [0, -size] : [0])) {
            g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + dx * 0.5 + bx, y + oy + dy * 0.5, x + ox + dx, y + oy + dy);
          }
        }
        g.stroke();
      }
    } else if (L.kind === 'blobs') {
      for (let i = 0; i < L.n; i++) {
        const x = rnd() * size, y = rnd() * size, r = L.r[0] + rnd() * (L.r[1] - L.r[0]);
        g.fillStyle = L.cols[(rnd() * L.cols.length) | 0];
        for (const ox of (x < r * 3 ? [0, size] : x > size - r * 3 ? [0, -size] : [0])) for (const oy of (y < r * 3 ? [0, size] : y > size - r * 3 ? [0, -size] : [0])) {
          if (L.leaf) { g.save(); g.translate(x + ox, y + oy); g.rotate(rnd() * 6.28); g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(0, -r * 0.55, r, 0); g.quadraticCurveTo(0, r * 0.55, -r, 0); g.fill(); g.restore(); }
          else if (L.clover) { for (let k = 0; k < 3; k++) { const a = k * 2.09 + rnd(); g.beginPath(); g.arc(x + ox + Math.cos(a) * r * 0.55, y + oy + Math.sin(a) * r * 0.55, r * 0.55, 0, 6.29); g.fill(); } }
          else { g.beginPath(); g.arc(x + ox, y + oy, r, 0, 6.29); g.fill(); }
        }
      }
    }
  }
  return c;
}
function texFromCanvas(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function normalFromCanvas(c, strength) {
  const S = c.width, src = c.getContext('2d').getImageData(0, 0, S, S).data;
  const L = new Float32Array(S * S); for (let i = 0; i < S * S; i++) L[i] = (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11) / 255;
  const o = document.createElement('canvas'); o.width = o.height = S; const g = o.getContext('2d'); const img = g.createImageData(S, S); const d = img.data;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const xm = (x + S - 1) % S, xp = (x + 1) % S, ym = (y + S - 1) % S, yp = (y + 1) % S;
    const dx = (L[y * S + xp] - L[y * S + xm]) * strength, dy = (L[yp * S + x] - L[ym * S + x]) * strength;
    const l = Math.hypot(dx, dy, 1), k = (y * S + x) * 4;
    d[k] = (-dx / l * 0.5 + 0.5) * 255; d[k + 1] = (-dy / l * 0.5 + 0.5) * 255; d[k + 2] = (1 / l * 0.5 + 0.5) * 255; d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0); return texFromCanvas(o, false);
}
export const TEX = {};
export function buildTextures() {
  {
    const gc = strokeTex(1024, 501, 'rgb(58,96,34)', [
      { kind: 'blades', len: [6, 15], groups: [['rgb(42,74,26)', 2.2, 9000], ['rgb(66,108,38)', 1.8, 9000], ['rgb(84,128,44)', 1.6, 9000], ['rgb(104,146,54)', 1.4, 7000], ['rgb(128,160,66)', 1.2, 4000], ['rgb(150,150,80)', 1.1, 1500]] },
      { kind: 'blobs', n: 900, r: [3, 6], cols: ['rgb(60,112,40)', 'rgb(74,124,46)'], clover: true },
      { kind: 'blobs', n: 140, r: [1.2, 2.2], cols: ['rgb(236,232,214)', 'rgb(236,210,70)', 'rgb(200,180,230)'] },
      { kind: 'blobs', n: 120, r: [2, 5], cols: ['rgba(90,70,40,0.5)'] },
      { kind: 'blades', len: [5, 11], groups: [['rgb(96,140,50)', 1.3, 6000], ['rgb(118,156,62)', 1.1, 4000]] },
    ]);
    TEX.grass = texFromCanvas(gc); TEX.grassN = normalFromCanvas(gc, 7);
    const dc = strokeTex(1024, 777, 'rgb(150,132,72)', [
      { kind: 'blades', len: [7, 18], groups: [['rgb(120,104,56)', 2, 8000], ['rgb(168,148,82)', 1.6, 9000], ['rgb(190,170,100)', 1.4, 8000], ['rgb(140,140,70)', 1.6, 5000], ['rgb(96,110,50)', 1.8, 3000]] },
      { kind: 'blobs', n: 160, r: [2, 6], cols: ['rgba(110,90,60,0.5)'] },
    ]);
    TEX.dry = texFromCanvas(dc);
    const fc = strokeTex(1024, 313, 'rgb(70,62,40)', [
      { kind: 'blobs', n: 5000, r: [4, 9], cols: ['rgb(110,78,44)', 'rgb(140,100,52)', 'rgb(92,70,42)', 'rgb(160,120,60)', 'rgb(80,60,36)'], leaf: true },
      { kind: 'blobs', n: 500, r: [6, 16], cols: ['rgba(62,92,40,0.75)', 'rgba(76,106,44,0.7)'] },
      { kind: 'blades', len: [8, 16], groups: [['rgb(100,84,58)', 1.2, 2500], ['rgb(70,96,40)', 1.6, 2500]] },
    ]);
    TEX.forest = texFromCanvas(fc);
  }
  TEX.rock = pixelTex(512, (u, v) => { const n = nz(u, v, 2, 3), m = nz(u, v, 1, 6), c = Math.abs(nz(u, v, 0, 5) - 0.5) < 0.03 ? 0.6 : 1; const k = (0.62 + n * 0.45) * c; return [138 * k + m * 12, 128 * k + m * 8, 118 * k]; });
  TEX.snow = pixelTex(512, (u, v) => { const n = nz(u, v, 2, 3); const k = 0.9 + n * 0.12; return [238 * k, 243 * k, 252 * Math.min(1, k + 0.03)]; });
  TEX.sand = pixelTex(512, (u, v) => { const n = nz(u, v, 2, 5), m = nz(u, v, 3, 2); const k = 0.86 + n * 0.2; return [222 * k, 200 * k + m * 6, 150 * k]; });
  TEX.gravel = pixelTex(512, (u, v) => { const n = nz(u, v, 2, 6), m = nz(u, v, 0, 8); const k = 0.6 + n * 0.5 + (m > 0.7 ? 0.15 : 0); return [150 * k, 132 * k, 112 * k]; });
  TEX.ballast = pixelTex(512, (u, v, x, y) => { const m = nz(u, v, 2, 8), s = nz(u * 1.7, v * 1.3, 0, 11); const k = 0.5 + m * 0.4 + (s > 0.62 ? 0.25 : s < 0.35 ? -0.12 : 0);
    const sl = (v * 4) % 1; if (sl < 0.11 && u > 0.17 && u < 0.83) { const c = 0.62 + nz(u, v, 1, 9) * 0.2; return [150 * c, 146 * c, 140 * c]; }
    return [128 * k + 10, 118 * k + 6, 104 * k]; });
  TEX.asphalt = pixelTex(256, (u, v) => { const n = nz(u, v, 2, 6); const k = 0.8 + n * 0.25; return [68 * k, 68 * k, 72 * k]; });
  TEX.plaster = pixelTex(256, (u, v) => { const n = nz(u, v, 2, 3), m = nz(u, v, 1, 6); const k = 0.88 + n * 0.12 + m * 0.06; return [255 * k, 255 * k, 255 * k]; });
  TEX.wood = pixelTex(256, (u, v) => { const g = Math.sin((u * 18 + nz(u, v, 0, 2) * 6) * Math.PI) * 0.5 + 0.5, n = nz(u, v, 2, 6); const k = 0.65 + g * 0.2 + n * 0.15; const plank = (v * 8) % 1 < 0.04 ? 0.6 : 1; return [150 * k * plank, 100 * k * plank, 62 * k * plank]; });
  TEX.stone = pixelTex(256, (u, v) => { const rows = 8, ry = Math.floor(v * rows), off = (ry % 2) * 0.5, rx = Math.floor(u * 6 + off); const fx = (u * 6 + off) % 1, fy = (v * rows) % 1; const joint = fx < 0.04 || fy < 0.06 ? 0.55 : 1; const n = nz(u, v, 2, 5), sh = (hashStr(rx + ':' + ry) % 100) / 100; const k = (0.75 + sh * 0.2 + n * 0.15) * joint; return [200 * k, 186 * k, 160 * k]; });
  // carte de normales de détail (terrain / roche)
  TEX.detailN = pixelTex(512, (u, v) => {
    const e = 1 / 512, f = 6, h = (a, b) => nz(a, b, 2, f) * 0.7 + nz(a, b, 0, f * 2) * 0.3;
    const dx = (h(u + e, v) - h(u - e, v)) * 40, dy = (h(u, v + e) - h(u, v - e)) * 40;
    const l = Math.hypot(dx, dy, 1); return [(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  }, false);
  TEX.waterN = pixelTex(512, (u, v) => {
    const e = 1 / 512; const h = (a, b) => nz(a, b, 2, 4) * 0.6 + nz(a, b, 0, 8) * 0.25 + nz(a, b, 1, 16) * 0.15;
    const dx = (h(u + e, v) - h(u - e, v)) * 60, dy = (h(u, v + e) - h(u, v - e)) * 60;
    const l = Math.hypot(dx, dy, 1); return [(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  }, false);
  TEX.ballastN = pixelTex(256, (u, v) => {
    const e = 1 / 256; const h = (a, b) => nz(a * 1.7, b * 1.3, 0, 11) + nz(a, b, 2, 8) * 0.5;
    const dx = (h(u + e, v) - h(u - e, v)) * 30, dy = (h(u, v + e) - h(u, v - e)) * 30;
    const l = Math.hypot(dx, dy, 1); return [(-dx / l * 0.5 + 0.5) * 255, (-dy / l * 0.5 + 0.5) * 255, (1 / l * 0.5 + 0.5) * 255];
  }, false);
}

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
const _sx = new THREE.Vector3(), _sy = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
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
const envCubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
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
const svTex = new THREE.DataTexture(svData, SV_W, SV_H, THREE.RedFormat);
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

// ---------- terrain (LOD par tuiles, mélange de textures, AO, normales de détail)
let TERRAIN_MAT = null;
function terrainMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.55 });
  worldShading(m, {
    key: 'terrain', after: sh => {
      Object.assign(sh.uniforms, {
        tGrass: { value: TEX.grass }, tDry: { value: TEX.dry }, tForest: { value: TEX.forest }, tRock: { value: TEX.rock }, tSnow: { value: TEX.snow },
        tSand: { value: TEX.sand }, tGravel: { value: TEX.gravel }, tDetN: { value: TEX.detailN }, tNoiseT: { value: NOISE }, tGrassN: { value: TEX.grassN },
      });
      sh.vertexShader = 'attribute vec4 aSplat; attribute vec4 aMisc; attribute float aAO; varying vec4 vSplat; varying vec4 vMisc; varying float vAO; varying vec3 vWN;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vSplat = aSplat; vMisc = aMisc; vAO = aAO; vWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = `uniform sampler2D tGrass, tDry, tForest, tRock, tSnow, tSand, tGravel, tDetN, tNoiseT, tGrassN;
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
          // parcelles agricoles
          if (vMisc.x > 0.01) {
            float a = vMisc.y * 3.14159;
            vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * vWP.xz;
            vec2 sz = vec2(165.0, 105.0);
            vec2 cell = floor(q / sz); vec2 f = fract(q / sz);
            float hh = h21(cell + floor(vMisc.y * 50.0));
            vec3 fc = hh < 0.2 ? vec3(0.62, 0.52, 0.2) : hh < 0.38 ? vec3(0.42, 0.55, 0.16) : hh < 0.52 ? vec3(0.38, 0.27, 0.16) : hh < 0.62 ? vec3(0.7, 0.62, 0.12) : hh < 0.75 ? vec3(0.26, 0.42, 0.13) : vec3(0.0);
            float rows = 0.86 + 0.14 * sin((hh > 0.5 ? q.x : q.y) * 2.4);
            float edge = min(min(f.x, 1.0 - f.x) * sz.x, min(f.y, 1.0 - f.y) * sz.y);
            if (hh < 0.75) col = mix(col, fc * rows * (0.85 + 0.3 * texture2D(tGrass, uvA * 0.5).g), vMisc.x * smoothstep(1.2, 3.5, edge));
            col = mix(col, vec3(0.12, 0.2, 0.07), vMisc.x * (1.0 - smoothstep(0.6, 2.2, edge)) * step(0.3, h21(cell * 1.7)));
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
    let fm = 0, fa = 0;
    if (CLS[k] === 1 && ny / l > 0.94 && !sand) for (const f of fieldCenters) {
      const dx = x - f.x, dz = z - f.z, d2 = dx * dx + dz * dz;
      if (d2 < f.r2 && d2 > f.inner2 * 0.6) { fm = clamp((Math.sqrt(f.r2) - Math.sqrt(d2)) / 300, 0, 1) * clamp((Math.sqrt(d2) - Math.sqrt(f.inner2) * 0.75) / 120, 0, 1); fa = f.angle; break; }
    }
    if (fm === 0 && CLS[k] === 1 && ny / l > 0.95 && !sand) {
      const nf = noiseAt(x * 0.0007 + 31.7, z * 0.0007 + 12.3, 7);
      if (nf > 0.5) { fm = clamp((nf - 0.5) / 0.05, 0, 1) * 0.9; const hx = Math.floor(x / 700), hz = Math.floor(z / 700); fa = (Math.abs(Math.sin(hx * 127.1 + hz * 311.7) * 43758.5453) % 1) * Math.PI; }
    }
    const tm = tmGet(x, z);
    const grav = (tm === 1 || tm === 2) && ny / l < 0.93 ? 1 : 0;
    let urb = 0;
    for (const f of fieldCenters) { const d = Math.hypot(x - f.cx, z - f.cz); if (d < f.urb) { urb = Math.max(urb, clamp((f.urb - d) / (f.urb * 0.35), 0, 1)); } }
    misc[k * 4] = fm * 255 * (1 - urb); misc[k * 4 + 1] = fa / Math.PI * 255; misc[k * 4 + 2] = grav * 200; misc[k * 4 + 3] = urb * 255;
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

// ---------- eau : vagues, profondeur, écume, reflets (ciel + scène miroir)
export const HTEX = (() => { const t = new THREE.DataTexture(H, NX, NZ, THREE.RedFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const reflectRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
const reflCam = new THREE.PerspectiveCamera();
reflCam.layers.set(0);
const reflTexMatrix = new THREE.Matrix4();
export const WATERS = [];
function waterMaterial(level, planar) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tH: { value: HTEX }, uHS: { value: new THREE.Vector2(NX, NZ) }, tN: { value: null }, tR: { value: reflectRT.texture }, tEnv: { value: envCubeRT.texture },
      tNz: { value: NOISE }, uRefl: { value: 0 }, uTime: { value: 0 }, uLevel: { value: level }, uSunDir: { value: SUN_DIR }, uSunCol: { value: SUN_COL },
      uWorld: { value: new THREE.Vector2(WW, HH) }, uTexMat: { value: reflTexMatrix }, uSunVis: { value: svTex }, uSunI: { value: 4 }, uRough: { value: planar ? 0.62 : 0.42 },
    }]),
    vertexShader: `uniform mat4 uTexMat; varying vec3 vWP; varying vec4 vRefl;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vRefl = uTexMat * wp; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D tH, tN, tR, tNz, uSunVis; uniform samplerCube tEnv; uniform vec2 uHS, uWorld; uniform float uRefl, uTime, uLevel, uSunI, uRough; uniform vec3 uSunDir, uSunCol;
      varying vec3 vWP; varying vec4 vRefl;
      #include <fog_pars_fragment>
      float terrainH(vec2 xz){ vec2 g = (xz / uWorld + 0.5) * (uHS - 1.0); if (g.x < 0.0 || g.y < 0.0 || g.x > uHS.x - 1.0 || g.y > uHS.y - 1.0) return -60.0;
        ivec2 i = ivec2(floor(g)); vec2 f = fract(g);
        float a = texelFetch(tH, i, 0).r, b = texelFetch(tH, i + ivec2(1, 0), 0).r, c = texelFetch(tH, i + ivec2(0, 1), 0).r, d = texelFetch(tH, i + ivec2(1, 1), 0).r;
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
      void main(){
        vec2 uv = vWP.xz;
        vec3 n1 = texture2D(tN, uv * 0.011 + vec2(uTime * 0.0065, uTime * 0.0041)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(tN, uv * 0.029 - vec2(uTime * 0.0092, -uTime * 0.0107)).xyz * 2.0 - 1.0;
        vec3 n3 = texture2D(tN, uv * 0.0026 + vec2(uTime * 0.0012, uTime * 0.0007)).xyz * 2.0 - 1.0;
        vec3 n4 = texture2D(tN, uv * 0.09 + vec2(-uTime * 0.02, uTime * 0.017)).xyz * 2.0 - 1.0;
        float dist = length(cameraPosition - vWP);
        vec2 wv = n1.xy + n2.xy * 0.75 + n3.xy * 0.9 + n4.xy * 0.35 * smoothstep(400.0, 60.0, dist);
        vec3 N = normalize(vec3(wv.x * uRough, 3.2 + dist * 0.003, wv.y * uRough));
        vec3 V = normalize(cameraPosition - vWP);
        float depth = uLevel - terrainH(vWP.xz);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = textureCube(tEnv, R).rgb;
        if (uRefl > 0.5) { vec2 ruv = vRefl.xy / vRefl.w + N.xz * 0.045; refl = texture2D(tR, ruv).rgb; }
        vec2 svuv = vWP.xz / uWorld + 0.5;
        float sv = (svuv.x < 0.0 || svuv.y < 0.0 || svuv.x > 1.0 || svuv.y > 1.0) ? 1.0 : texture2D(uSunVis, svuv).r;
        float amb = 0.25 + 0.75 * smoothstep(-0.05, 0.4, uSunDir.y);
        vec3 deep = vec3(0.004, 0.032, 0.07), shallow = vec3(0.03, 0.2, 0.2);
        float dd = 1.0 - exp(-max(depth, 0.0) * 0.16);
        vec3 body = mix(shallow, deep, dd) * amb * (0.6 + 0.4 * sv);
        float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * 0.0;
        vec3 Hh = normalize(uSunDir + V);
        float nh = max(dot(N, Hh), 0.0);
        float spec = (pow(nh, 1600.0) * 70.0 + pow(nh, 260.0) * 0.6) * sv;
        vec3 col = mix(body, refl, fres) + uSunCol * spec * uSunI * 0.25;
        float nz = texture2D(tNz, uv * 0.06 + vec2(uTime * 0.01, 0.0)).g;
        float foam = smoothstep(1.6, 0.0, depth) * smoothstep(0.45, 0.8, nz + 0.35 * sin(depth * 5.0 - uTime * 1.3));
        col = mix(col, vec3(0.85, 0.88, 0.9) * amb * (0.5 + 0.5 * sv), clamp(foam, 0.0, 1.0) * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  m.uniforms.tN.value = TEX.waterN; m.uniforms.tR.value = reflectRT.texture; m.uniforms.tEnv.value = envCubeRT.texture; m.uniforms.tH.value = HTEX; m.uniforms.tNz.value = NOISE; m.uniforms.uSunVis.value = svTex;
  m.uniforms.uSunDir.value = SUN_DIR; m.uniforms.uSunCol.value = SUN_COL; m.uniforms.uTexMat.value = reflTexMatrix;
  m.userData.planar = planar;
  WATERS.push(m);
  return m;
}
export function buildWater() {
  const group = new THREE.Group();
  const seaMat = waterMaterial(0, true);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000, 1, 1), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.layers.set(2); sea.userData.mirror = true;
  group.add(sea);
  // lacs : une maille par lac (cellules grossies)
  const byLake = new Map();
  for (let j = 0; j < NZ - 1; j += 2) for (let i = 0; i < NX - 1; i += 2) {
    let id = 0;
    for (let dj = -1; dj <= 3 && !id; dj++) for (let di = -1; di <= 3 && !id; di++) { const ii = clamp(i + di, 0, NX - 1), jj = clamp(j + dj, 0, NZ - 1); id = LAKE[jj * NX + ii]; }
    if (!id) continue;
    if (!byLake.has(id)) byLake.set(id, []);
    const x0 = (i / (NX - 1) - 0.5) * WW, x1 = ((i + 2) / (NX - 1) - 0.5) * WW, z0 = (j / (NZ - 1) - 0.5) * HH, z1 = ((j + 2) / (NZ - 1) - 0.5) * HH;
    const y = LAKE_LV[id];
    byLake.get(id).push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
  }
  for (const [id, p] of byLake) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, waterMaterial(LAKE_LV[id], false)); mesh.layers.set(2);
    group.add(mesh);
  }
  return group;
}
const _rv = new THREE.Vector3(), _rt = new THREE.Vector3(), _rl = new THREE.Vector3(), _rplane = new THREE.Plane(), _rclip = new THREE.Vector4(), _rq = new THREE.Vector4(), _rrot = new THREE.Matrix4();
export function renderReflection() {
  if (!Q.reflect) { for (const w of WATERS) w.uniforms.uRefl.value = 0; return; }
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  if (camPos.y < 0.5) return;
  { let near = false; for (const [ox, oz] of [[0, 0], [350, 0], [-350, 0], [0, 350], [0, -350], [800, 0], [-800, 0], [0, 800], [0, -800]]) if (waterAt(camPos.x + ox, camPos.z + oz) > -1e8) { near = true; break; } if (!near) return; }
  _rrot.extractRotation(camera.matrixWorld);
  _rv.set(camPos.x, -camPos.y, camPos.z);
  _rl.set(0, 0, -1).applyMatrix4(_rrot).add(camPos);
  _rt.set(_rl.x, -_rl.y, _rl.z);
  reflCam.position.copy(_rv);
  reflCam.up.set(0, 1, 0).applyMatrix4(_rrot); reflCam.up.y *= -1;
  reflCam.lookAt(_rt);
  reflCam.far = camera.far; reflCam.near = camera.near;
  reflCam.updateMatrixWorld();
  reflCam.projectionMatrix.copy(camera.projectionMatrix);
  reflTexMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  reflTexMatrix.multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  _rplane.setFromNormalAndCoplanarPoint(_up, new THREE.Vector3(0, 0, 0)).applyMatrix4(reflCam.matrixWorldInverse);
  _rclip.set(_rplane.normal.x, _rplane.normal.y, _rplane.normal.z, _rplane.constant);
  const pm = reflCam.projectionMatrix.elements;
  _rq.x = (Math.sign(_rclip.x) + pm[8]) / pm[0]; _rq.y = (Math.sign(_rclip.y) + pm[9]) / pm[5]; _rq.z = -1; _rq.w = (1 + pm[10]) / pm[14];
  _rclip.multiplyScalar(2 / _rclip.dot(_rq));
  pm[2] = _rclip.x; pm[6] = _rclip.y; pm[10] = _rclip.z + 1 - 0.003; pm[14] = _rclip.w;
  renderer.setRenderTarget(reflectRT);
  renderer.clear();
  renderer.render(scene, reflCam);
  renderer.setRenderTarget(null);
  for (const w of WATERS) w.uniforms.uRefl.value = w.userData.planar ? 1 : 0;
}
