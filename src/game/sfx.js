// Sons de la balade, tous synthétisés : moteur, crissement des pneus, chocs, couinements.
// Le contexte audio n'est créé qu'au premier geste du joueur (règle des navigateurs).
import { game } from './state.js';

let ctx = null, master = null, moteur = null, pneus = null, bruit = null;
function noiseBuffer() {
  const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
export function sfxInit() {
  if (ctx || !(window.AudioContext || window.webkitAudioContext)) { ctx?.resume?.(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    bruit = noiseBuffer();
    // moteur : deux oscillateurs désaccordés dans un filtre qui s'ouvre avec le régime
    const g = ctx.createGain(); g.gain.value = 0; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 3;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; const o2 = ctx.createOscillator(); o2.type = 'square'; const g2 = ctx.createGain(); g2.gain.value = 0.35;
    o1.connect(f); o2.connect(g2).connect(f); f.connect(g).connect(master); o1.start(); o2.start();
    moteur = { g, f, o1, o2 };
    // pneus : bruit filtré en bande, dont le volume suit la glisse
    const s = ctx.createBufferSource(); s.buffer = bruit; s.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 5;
    const pg = ctx.createGain(); pg.gain.value = 0; s.connect(bp).connect(pg).connect(master); s.start();
    pneus = { g: pg, f: bp };
  } catch (e) { ctx = null; }
}
const on = () => ctx && game.sound;
// regime 0..1 (dans le rapport en cours), charge 0..1 (accélérateur), glisse 0..1, actif : le joueur conduit
export function sfxEngine(actif, regime, charge, glisse, terre) {
  if (!ctx) return;
  const t = ctx.currentTime, v = on() && actif ? 1 : 0;
  const hz = 46 + regime * 105;
  moteur.o1.frequency.setTargetAtTime(hz, t, 0.04); moteur.o2.frequency.setTargetAtTime(hz * 0.502, t, 0.04);
  moteur.f.frequency.setTargetAtTime(260 + regime * 1500 + charge * 500, t, 0.05);
  moteur.g.gain.setTargetAtTime(v * (0.05 + charge * 0.07 + regime * 0.03), t, 0.06);
  pneus.f.frequency.setTargetAtTime(terre ? 500 : 1700, t, 0.1);
  pneus.g.gain.setTargetAtTime(v * Math.min(0.3, glisse * (terre ? 0.16 : 0.3)), t, 0.05);
}
// choc : coup sourd et froissement, proportionnels à la force (0..1)
export function sfxCrash(force) {
  if (!on()) return;
  const t = ctx.currentTime, k = Math.min(1, force);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.55 * k, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
  const s = ctx.createBufferSource(); s.buffer = bruit; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900 + 2600 * k;
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.4 * k, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2 + 0.25 * k); s.connect(f).connect(g2).connect(master); s.start(t, Math.random()); s.stop(t + 0.5);
}
// petit objet renversé : claquement sec
export function sfxKnock() {
  if (!on()) return;
  const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = bruit; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 900; f.Q.value = 1.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + 0.15);
}
// couinement de cochon : une note qui monte puis retombe, avec un trémolo
export function sfxOink(grave = false) {
  if (!on()) return;
  const t = ctx.currentTime, base = (grave ? 360 : 620) * (0.85 + Math.random() * 0.4), d = 0.32 + Math.random() * 0.2;
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * 2.1, t + d * 0.35); o.frequency.exponentialRampToValueAtTime(base * 0.8, t + d);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 28; const lg = ctx.createGain(); lg.gain.value = base * 0.12; lfo.connect(lg).connect(o.frequency);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = base * 2.2; f.Q.value = 2.5;
  const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(f).connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + d + 0.02); lfo.stop(t + d + 0.02);
}
// klaxon à deux tons
export function sfxHorn() {
  if (!on()) return;
  const t = ctx.currentTime;
  for (const hz of [392, 494]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz; const g = ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.setValueAtTime(0.07, t + 0.3); g.gain.linearRampToValueAtTime(0.001, t + 0.36); o.connect(g).connect(master); o.start(t); o.stop(t + 0.4); }
}
