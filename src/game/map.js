// Carte du pays
import * as THREE from 'three';
import { clamp, $, lerp } from '../engine/util.js';
import { NX, NZ, HGT, CLS, LAKE, WW, HH, STATIONS } from '../world/land.js';
import { ROADS } from '../world/registry.js';
import { EX, game } from './state.js';
import { TRACKS } from '../world/tracks.js';
import { PRODUITS } from '../world/cities.js';
import { headPos, headDir } from './train.js';
import { mapState } from './ui.js';
import { exMapInfo } from './explore.js';
import { pkm, SP, setRoute } from './railgame.js';

export function buildMapBase() {
  const c = document.createElement('canvas'); c.width = NX; c.height = NZ; const g = c.getContext('2d');
  const img = g.createImageData(NX, NZ);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, h = HGT[k], cl = CLS[k];
    let col;
    if (LAKE[k]) col = [80, 150, 220]; else if (cl === 0 || h < 0) col = [28, 84, 170]; else if (cl === 4) col = [240, 242, 248]; else if (cl === 2) col = [56, 128, 60]; else if (cl === 3) col = [182, 150, 96]; else col = [116, 186, 82];
    const sh = 1 + clamp((h - (i > 0 ? HGT[k - 1] : h)) * 0.02, -0.2, 0.2);
    img.data.set([col[0] * sh, col[1] * sh, col[2] * sh, 255], k * 4);
  }
  g.putImageData(img, 0, 0);
  mapState.base = c;
}
function mapXY(x, z) { return [mapState.ox + (x / WW + 0.5) * mapState.w, mapState.oy + (z / HH + 0.5) * mapState.h]; }
export function drawMap() {
  const cv = $('map-canvas'), box = cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = box.width, H = box.height;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const s = Math.min(W / NX, H / NZ) * 0.96 * mapState.zoom;
  mapState.w = NX * s; mapState.h = NZ * s;
  const hx = Math.max(0, (mapState.w - W) / 2) / mapState.w, hy = Math.max(0, (mapState.h - H) / 2) / mapState.h;
  mapState.cx = clamp(mapState.cx, 0.5 - hx, 0.5 + hx); mapState.cy = clamp(mapState.cy, 0.5 - hy, 0.5 + hy);
  mapState.ox = W / 2 - mapState.cx * mapState.w; mapState.oy = H / 2 - mapState.cy * mapState.h;
  g.fillStyle = '#1c54aa'; g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = true; g.drawImage(mapState.base, mapState.ox, mapState.oy, mapState.w, mapState.h);
  const p = new THREE.Vector3();
  const line = (t, s0, s1, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / 60)); for (let k = 0; k <= n; k++) { t.pos(lerp(s0, s1, k / n), p); const [x, y] = mapXY(p.x, p.z); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  g.lineCap = 'round'; g.lineJoin = 'round';
  const lw = clamp(mapState.zoom, 1, 2.2);
  if (EX.on) { g.strokeStyle = '#3a3a3e'; g.lineWidth = 1.6 * lw; for (const r of ROADS) { g.beginPath(); for (let k = 0; k < r.pts.length; k += 6) { const [x, y] = mapXY(r.pts[k][0], r.pts[k][2]); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } }
  for (const t of TRACKS) line(t, 0, t.L, '#f3e7c9', 4.5 * lw);
  for (const t of TRACKS) line(t, 0, t.L, '#7b1e2e', 2.2 * lw);
  if (game.route) for (const st of game.route.states) line(st.t, 0, st.t.L, '#f2b630', 3.4 * lw);
  const targets = new Set(game.slots.filter(Boolean).map(c => c.to));
  const dense = s < 2.6;
  for (const st of STATIONS) {
    const [x, y] = mapXY(st.x, st.z);
    const big = st.meta.size >= 3;
    if (targets.has(st.id)) { g.strokeStyle = '#f2b630'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 11, 0, 7); g.stroke(); }
    g.fillStyle = st.id === mapState.sel ? '#f2b630' : '#f3e7c9'; g.strokeStyle = '#17110e'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(x, y, big ? 6 : 4.5, 0, 7); g.fill(); g.stroke();
    const showLabel = !dense || big || targets.has(st.id) || st.id === mapState.sel || (game.route && game.route.target === st.id);
    if (!showLabel) continue;
    g.font = `${big ? 700 : 600} ${big ? 14 : 12}px "Barlow Condensed", sans-serif`;
    g.lineWidth = 3; g.strokeStyle = 'rgba(23,17,14,.85)'; g.fillStyle = '#fff8e8';
    g.strokeText(st.name, x + 8, y - 6); g.fillText(st.name, x + 8, y - 6);
  }
  headPos(p); const d = headDir(new THREE.Vector3());
  if (EX.on) { p.set(EX.P.x, 0, EX.P.z); if (EX.mode === 'auto') d.set(Math.sin(EX.car.yaw), 0, Math.cos(EX.car.yaw)); else d.set(-Math.sin(EX.P.yaw), 0, -Math.cos(EX.P.yaw)); }
  const [tx, ty] = mapXY(p.x, p.z);
  g.save(); g.translate(tx, ty); g.rotate(Math.atan2(d.z, d.x));
  g.fillStyle = '#e0442c'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, 0); g.lineTo(-7, -6); g.lineTo(-4, 0); g.lineTo(-7, 6); g.closePath(); g.fill(); g.stroke();
  g.restore();
  if (dense) { g.font = '600 13px "Barlow Condensed", sans-serif'; g.fillStyle = 'rgba(255,248,232,.85)'; g.fillText('Zoomez pour voir tous les noms', 10, H - 10); }
  renderMapInfo();
}
mapState.draw = drawMap;
function zoomMap(f, px, py) {
  const cv = $('map-canvas'), r = cv.getBoundingClientRect();
  px = px ?? r.width / 2; py = py ?? r.height / 2;
  const mx = (px - mapState.ox) / mapState.w, my = (py - mapState.oy) / mapState.h;
  const nz = clamp(mapState.zoom * f, 1, 6);
  const k = nz / mapState.zoom; mapState.zoom = nz;
  mapState.cx = mx - (px - r.width / 2) / (mapState.w * k); mapState.cy = my - (py - r.height / 2) / (mapState.h * k);
  drawMap();
}
function renderMapInfo() {
  if (EX.on) return exMapInfo();
  const el = $('map-info');
  const st = STATIONS[mapState.sel];
  if (!st) { el.innerHTML = `<p class="muted">Touchez une gare pour la voir et tracer un itinéraire. Le tracé doré règle les aiguillages tout seul.</p>${game.route ? `<button class="btn small ghost" id="m-clear">Effacer l’itinéraire vers ${STATIONS[game.route.target].name}</button>` : ''}`; const b = $('m-clear'); if (b) b.onclick = () => { game.route = null; game.routeManual = true; game.routeReverseAt = -1; drawMap(); }; return; }
  const offers = game.offers[st.id];
  const prods = st.meta.prod.map(k => PRODUITS[k].nom).join(', ');
  el.innerHTML = `<h3>${st.name}</h3><p>${st.meta.devise || ''}</p><p class="muted">Produit : ${prods}. ${st.meta.size >= 3 ? 'Dépôt SCPB sur place.' : ''}</p><p class="muted">À ${pkm(SP[game.lastStation][st.id])} de ${STATIONS[game.lastStation].name} par le rail.${offers ? ` ${offers.length} offres vues.` : ''}</p><button class="btn small" id="m-route">Itinéraire vers ${st.name}</button>`;
  $('m-route').onclick = () => { setRoute(st.id); game.routeManual = true; drawMap(); };
}
(() => {
  const cv = $('map-canvas'), pts = new Map();
  let moved = 0, pinch0 = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); const dx = e.clientX - prev[0], dy = e.clientY - prev[1];
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0 > 0) { const r = cv.getBoundingClientRect(); zoomMap(d / pinch0, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); } pinch0 = d; moved = 99; return; }
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6 && mapState.zoom > 1) { mapState.cx -= dx / mapState.w; mapState.cy -= dy / mapState.h; drawMap(); }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (moved > 6 || pts.size) return;
    const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    let best = -1, bd = 26;
    for (const st of STATIONS) { const [sx, sy] = mapXY(st.x, st.z); const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = st.id; } }
    mapState.sel = best; drawMap();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => pts.delete(e.pointerId));
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomMap(e.deltaY < 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  $('map-zin').onclick = () => zoomMap(1.5);
  $('map-zout').onclick = () => zoomMap(1 / 1.5);
})();
