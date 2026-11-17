// Outils de base : accès au DOM, maths, hasard à graine, décompression

export const $ = id => document.getElementById(id);
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
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
// erreur dont le jeu ne se relève pas : écran de chargement réaffiché avec le message, un appui recharge la page
export function fatal(message) {
  const el = $('loading'); if (!el || el.dataset.fatal) return;
  el.dataset.fatal = '1'; el.classList.remove('done'); el.style.cursor = 'pointer'; el.onclick = () => location.reload();
  setStatus(message + ' Touchez l\'écran pour recharger.');
}
export const tick = () => new Promise(r => setTimeout(r, 0));
