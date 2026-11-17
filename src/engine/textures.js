// Textures calculées (bruit, sols, matières)
import * as THREE from 'three';
import { mulberry, smooth, lerp, clamp, hashStr } from './util.js';

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
