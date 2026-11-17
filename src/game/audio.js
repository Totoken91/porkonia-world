// Sons (synthétisés)
import { game } from './state.js';
import { train, cam } from './train.js';

// ---------- sons (tout est synthétisé)
export const audio = {
  ctx: null, master: null,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = game.sound ? 0.8 : 0; this.master.connect(ctx.destination);
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = noiseBuf;
    // moteur diesel
    this.engGain = ctx.createGain(); this.engGain.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; this.engLP = lp;
    this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth'; this.o1.frequency.value = 38;
    this.o2 = ctx.createOscillator(); this.o2.type = 'square'; this.o2.frequency.value = 57;
    const g2 = ctx.createGain(); g2.gain.value = 0.35;
    this.o1.connect(lp); this.o2.connect(g2).connect(lp); lp.connect(this.engGain).connect(this.master);
    this.o1.start(); this.o2.start();
    // vent / roulement
    const wn = ctx.createBufferSource(); wn.buffer = noiseBuf; wn.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6; this.windBP = bp;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0;
    wn.connect(bp).connect(this.windGain).connect(this.master); wn.start();
    // crissement
    this.sq = ctx.createOscillator(); this.sq.type = 'triangle'; this.sq.frequency.value = 2400;
    this.sqGain = ctx.createGain(); this.sqGain.gain.value = 0; this.sq.connect(this.sqGain).connect(this.master); this.sq.start();
    this.clackT = 0;
  },
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => { }); },
  setOn(on) { if (this.master) this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05); },
  update(dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, v = train.v, th = Math.max(0, train.notch) / 5;
    this.o1.frequency.setTargetAtTime(34 + th * 30 + v * 0.4, t, 0.3);
    this.o2.frequency.setTargetAtTime(51 + th * 45 + v * 0.6, t, 0.3);
    this.engLP.frequency.setTargetAtTime(260 + th * 700, t, 0.3);
    const inCab = cam.mode === 'cabine';
    this.engGain.gain.setTargetAtTime((0.05 + th * 0.12) * (inCab ? 1 : 0.6), t, 0.2);
    this.windGain.gain.setTargetAtTime(Math.min(0.22, v * v * 0.00012) * (inCab ? 0.8 : 1), t, 0.2);
    this.windBP.frequency.setTargetAtTime(300 + v * 18, t, 0.3);
    const braking = train.notch < 0 && v > 2 ? (-train.notch) / 3 : 0;
    this.sqGain.gain.setTargetAtTime(braking * 0.03 * Math.min(1, v / 20) + (game.screech || 0) * 0.04, t, 0.08);
    this.sq.frequency.setTargetAtTime(2200 + Math.sin(t * 9) * 140, t, 0.05);
    // tac-tac des joints de rail
    if (v > 1) {
      this.clackT -= v * dt;
      if (this.clackT <= 0) { this.clackT += 25; this.clack(0); this.clack(0.06 + 3 / Math.max(v, 3)); train.bump = 1; }
    }
  },
  clack(delay) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 180 + Math.random() * 60; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + 0.12);
  },
  tone(freq, dur, type, vol, delay = 0, glide) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  horn() {
    if (!this.ctx) return;
    if (game.horn === 'groin') { // grognement de cochon synthétique
      for (let k = 0; k < 3; k++) { this.tone(180 - k * 20, 0.16, 'sawtooth', 0.22, k * 0.17, 90); this.tone(95, 0.16, 'square', 0.12, k * 0.17, 60); }
      return;
    }
    for (const [f, d] of [[370, 0], [466, 0]]) this.tone(f, 1.1, 'square', 0.09, d);
    for (const [f, d] of [[311, 1.15], [392, 1.15]]) this.tone(f, 0.6, 'square', 0.09, d);
  },
  chime() { [[784, 0], [988, 0.28], [1175, 0.56]].forEach(([f, d]) => { this.tone(f, 1.2, 'sine', 0.16, d); this.tone(f * 2, 0.6, 'sine', 0.04, d); }); },
  cash() { this.tone(1568, 0.12, 'square', 0.08, 0); this.tone(2093, 0.3, 'square', 0.08, 0.08); },
  thud() { this.tone(70, 0.5, 'sawtooth', 0.4, 0, 35); },
};
