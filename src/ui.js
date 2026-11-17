// Interface partagée : messages et ouverture de la carte
import { $ } from './core.js';

// ---------- interface
export function toast(html, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = html;
  $('toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 3600); setTimeout(() => el.remove(), 4200);
}

// ---------- carte du réseau
export const mapState = { base: null, sel: -1, zoom: 1, cx: 0.5, cy: 0.5, ox: 0, oy: 0, w: 0, h: 0 };
export function openMap() { $('map').classList.add('open'); requestAnimationFrame(() => mapState.draw()); }
export function closeMap() { $('map').classList.remove('open'); }
