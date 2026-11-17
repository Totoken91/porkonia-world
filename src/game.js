// Économie, itinéraires, interface, sons, boucle principale, démarrage
import * as THREE from 'three';
import { Q, STATIONS, clamp, $, fmtMoney, NX, NZ, HGT, CLS, LAKE, WW, HH, lerp, canvas, QKEY, applyTime, SUN_DIR, camera, hAt, sky, updateSunShadow, WS, WATERS, gradePass, renderer, renderReflection, composer, bloomPass, reflectRT, TIME_LISTENERS, TKEY, setStatus, buildTextures, hashStr, scene, buildTerrain, buildWater, TIMES, STATION_BY_NAME, waterAt, clsAt, slopeAt, tmGet } from './core.js';
import { ROADS, PROPS, ANIMATED, groundAt } from './registry.js';
import { game, input, clock } from './state.js';
import { TRACKS, DEPART, STUBS, STOP_MARK, PLATFORM_HALF, markTrackMask, buildNetwork, buildSleepers, PILLARS, PORTALS } from './tracks.js';
import { PRODUITS, scenery, LANDMARK_SPOTS, BUILDINGS, DRAPES } from './scenery.js';
import { updateTownLOD, PART_MESHES } from './towns.js';
import { citizens, updateCitizens, updateHerds } from './creatures.js';
import { updateVegetation, VEG, treeMaterial } from './vegetation.js';
import { updateBirds, puff, updateSmoke } from './ambiance.js';
import { train, cam, rebuildConsist, updateTrainPose, headPos, locate, LOCO_LEN, WAGON_LEN, GAP, flipTrain, stationOffset, nextOptions, headDir, CAM_MODES, setCamMode, CAM_LABELS, upcomingLimit, chosenNext, advanceHead, updateCamera, updateSleepers, fitFov, trainMaterials, buildLoco, buildCab, placeTrainAt } from './train.js';
import { toast, mapState, closeMap, openMap } from './ui.js';
import { EX, exMapInfo, exUpdate, exCamera, exStart, exTeleport, exToggleCar, NPC, updateNpcs, exSetView, exPlacePlayer, exToggleView, exTogglePig, exPlaceCar, exInit } from './explore.js';
import { buildScenery } from './world.js';

let pixelRatio = Math.min(window.devicePixelRatio || 1, Q.pr);

const SAVE_KEY = 'porkonia-express-v1';

// ---------- distances entre gares (plus court chemin sur le réseau)
const SP = STATIONS.map(() => new Float64Array(STATIONS.length).fill(Infinity));
for (const src of STATIONS) {
  const dist = SP[src.id]; dist[src.id] = 0;
  const done = new Set();
  while (done.size < STATIONS.length) {
    let u = -1, best = Infinity;
    for (let i = 0; i < STATIONS.length; i++) if (!done.has(i) && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break; done.add(u);
    for (const t of TRACKS) {
      const v = t.a === u ? t.b : t.b === u ? t.a : -1;
      if (v >= 0 && dist[u] + t.L < dist[v]) dist[v] = dist[u] + t.L;
    }
  }
}

// ---------- itinéraire (Dijkstra sur les états voie+sens, avec demi-tours)
const REVERSE_COST = 2200;
function computeRoute(target) {
  const key = (t, d) => t.id + ':' + d;
  const dist = new Map(), prev = new Map(), Q = [];
  const push = (t, d, c, p, how) => { const k = key(t, d); if (c < (dist.get(k) ?? Infinity)) { dist.set(k, c); prev.set(k, { p, how }); Q.push({ t, d, c, k }); } };
  const c0 = train.cur;
  push(c0.t, c0.d, (c0.d > 0 ? c0.t.L - c0.s : c0.s), null, 'start');
  if (train.v < 0.5) push(c0.t, -c0.d, (c0.d > 0 ? c0.s : c0.t.L - c0.s) + 400, null, 'flip');
  let found = null;
  while (Q.length) {
    Q.sort((a, b) => a.c - b.c);
    const q = Q.shift();
    if (q.c > (dist.get(q.k) ?? Infinity)) continue;
    const end = q.d > 0 ? q.t.b : q.t.a;
    if (end === target) { found = q; break; }
    if (end < 0) continue;
    const arr = q.d > 0 ? q.t.sb : q.t.sa;
    for (const o of DEPART[end][-arr]) if (!o.t.stub) push(o.t, o.d, q.c + o.t.L, q.k, 'through');
    for (const o of DEPART[end][arr]) if (!o.t.stub) push(o.t, o.d, q.c + o.t.L + REVERSE_COST, q.k, 'reverse');
  }
  if (!found) return null;
  const states = [];
  let k = found.k;
  while (k) { const [tid, d] = k.split(':'); const p = prev.get(k); states.unshift({ t: ALLTRACKS[+tid], d: +d, how: p.how }); k = p.p; }
  return { target, states, len: found.c };
}
const ALLTRACKS = {}; for (const t of [...TRACKS, ...STUBS]) ALLTRACKS[t.id] = t;
const LEVELS = [
  { nom: 'BB 12012 d’origine', vmax: 140, power: 2.4e6, f0: 290e3, prix: 0 },
  { nom: 'Moteur Brasswagen V12', vmax: 180, power: 3.6e6, f0: 330e3, prix: 2800 },
  { nom: 'Turbo au saindoux', vmax: 220, power: 5.0e6, f0: 380e3, prix: 7500 },
  { nom: 'Groin-Express intégral', vmax: 260, power: 6.8e6, f0: 430e3, prix: 16000 },
];
const WAGON_PRICES = [0, 0, 0, 1400, 2600, 4200, 6400, 9000]; // prix du wagon n°(index+1)
const GROUPS = ['Supporters de Groinball', 'Pèlerins du Cube de Porc', 'Classe de neige', 'Délégation du Sénat des Taverniers', 'Noce (la douzième place est réservée)',
  'Contrôleurs de Pork ID en repos', 'Chorale des charcutiers', 'Touristes qui se croyaient ailleurs', 'Retraités de la Mousse', 'Groinball junior et parents',
  'Agents des Affaires Trop Compliquées', 'Fanfare municipale', 'Fans des Ranga Boyz', 'Livreurs de Douzi Ambrée en congé', 'Club de raclette du jeudi'];
const ANNOUNCES = [
  'La SCPB rappelle que la douzième place de chaque voiture est réservée. Surtout si elle a l’air libre.',
  'Le wagon-bar est ouvert. Personne ne se souvient de sa fermeture.',
  'Suite à un incident de mousse en gare de Biermont, les trains circulent avec un léger arrière-goût.',
  'Un porcelet voyage seul en voiture 3. Il a son billet. Merci de ne pas lui demander d’où il vient.',
  'Contrôle des Pork ID : les voyageurs de niveau VII peuvent rester assis, les autres restent debout avec dignité.',
  'La climatisation diffuse désormais un parfum de saucisson. Cette décision est irréversible.',
  'Le conducteur sait où il va. Il n’a simplement pas de preuve.',
  'Nous traversons une zone sans PigNet. Profitez-en pour regarder un cochon.',
  'En cas de gobelin sur la voie, ne pas le signaler : l’État a confirmé qu’il n’existe pas.',
  'La voiture 5 est une voiture silencieuse. La voiture 5 n’existe pas. Le silence, si.',
  'Il est interdit de tirer le signal d’alarme pour commander une raclette.',
  'Objets trouvés : une louche, deux chopes, un ministère. Se présenter au guichet muni de sa Pork ID.',
  'Les horaires de la SCPB sont fixés par décret. Ils peuvent être constatés, jamais modifiés.',
];

function newOffers(st) {
  const list = [];
  const n = 3 + (st.meta.size >= 3 ? 2 : 1) + (Math.random() < 0.5 ? 1 : 0);
  for (let k = 0; k < n; k++) {
    const pax = Math.random() < 0.42;
    const good = pax ? 'voyageurs' : st.meta.prod[(Math.random() * st.meta.prod.length) | 0];
    let dest = -1, tries = 0;
    while (tries++ < 40) {
      const c = (Math.random() * STATIONS.length) | 0;
      if (c === st.id) continue;
      const d = SP[st.id][c] / 1000;
      const w = Math.exp(-Math.pow((d - 9) / 8, 2)) + 0.12;
      if (Math.random() < w) { dest = c; break; }
    }
    if (dest < 0) dest = (st.id + 1) % STATIONS.length;
    const dist = SP[st.id][dest];
    const units = pax ? 18 + ((Math.random() * 46) | 0) : 1;
    const taux = PRODUITS[good].taux * (pax ? 0.55 + units / 70 : 1);
    const pay = Math.round((160 + dist / 1000 * taux * 1.25) / 5) * 5;
    const deadline = Math.round((dist / (78 / 3.6)) * 1.45 + 150);
    list.push({ id: Math.random().toString(36).slice(2, 9), good, from: st.id, to: dest, units, pay, deadline, dist, flavor: pax ? GROUPS[(Math.random() * GROUPS.length) | 0] : '' });
  }
  return list;
}
function offersFor(st) {
  if (!game.offers[st.id] || game.now - (game.offersAt[st.id] ?? -1e9) > 300) { game.offers[st.id] = newOffers(st); game.offersAt[st.id] = game.now; refreshPlatform(st.id); }
  return game.offers[st.id];
}
function refreshPlatform(stId) {
  const offers = game.offers[stId] || [];
  const pax = offers.filter(o => o.good === 'voyageurs').reduce((a, o) => a + o.units, 0);
  const want = clamp(Math.round(pax / 6) + 2, 2, 24);
  let n = 0;
  for (const c of citizens.list) if (c.st === stId && !c.walk) { c.visible = n < want; n++; }
}
function massTotal() {
  let m = 84000;
  for (const w of train.wagons) m += 22000 + (w.contract ? (w.contract.good === 'voyageurs' ? 6000 : 22000) : 0);
  return m;
}
function applyLevel() { const L = LEVELS[game.lvl]; train.vmax = L.vmax / 3.6; train.power = L.power; train.f0 = L.f0; }

// ---------- sauvegarde
function saveObj() { return { money: game.money, cap: game.cap, lvl: game.lvl, horn: game.horn, slots: game.slots, lastStation: game.lastStation, stats: game.stats, sound: game.sound, voice: game.voice, now: game.now }; }
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj())); } catch (e) { } }
function loadSave(hotData) {
  let d = hotData && hotData.money !== undefined ? hotData : null;
  if (!d) try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
  if (!d) return false;
  Object.assign(game, { money: d.money ?? 1500, cap: d.cap ?? 3, lvl: d.lvl ?? 0, horn: d.horn || 'classique', lastStation: d.lastStation ?? 0, stats: d.stats || game.stats, sound: d.sound ?? true, voice: !!d.voice, now: d.now || 0 });
  game.slots = Array.from({ length: game.cap }, (_, i) => (d.slots && d.slots[i]) || null);
  return true;
}

// ---------- sons (tout est synthétisé)
const audio = {
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
function speak(text) {
  if (!game.voice || !window.speechSynthesis) return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 1.0; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { }
}
function ticker(text) {
  const el = $('ticker');
  el.querySelector('span').textContent = text;
  el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
}
function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function pkm(m) { return (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' pkm'; }
const WAGON_NAMES = { voyageurs: 'Voiture', citerne: 'Citerne', futs: 'Plat à fûts', porcs: 'Bétaillère', couvert: 'Couvert', frigo: 'Frigo', tremie: 'Trémie', chaises: 'Plat', vide: 'Vide' };

function flap(el, text) { // effet tableau à palettes
  el.innerHTML = '';
  [...text].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'flap'; s.style.animationDelay = (i * 0.045) + 's'; s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); });
}

let lastDeliveries = [];
function arriveAt(st, off) {
  game.stoppedAt = st.id; game.lastStation = st.id;
  const lines = [];
  let total = 0;
  game.slots.forEach((c, i) => {
    if (!c || c.to !== st.id) return;
    let pay = c.pay; const late = game.now > c.dueAt;
    if (late) pay = Math.round(pay * 0.6);
    let tip = 0;
    if (c.good === 'voyageurs') tip = Math.round(c.pay * 0.25 * (c.comfort ?? 100) / 100);
    total += pay + tip;
    lines.push({ c, pay, tip, late });
    game.slots[i] = null;
    game.stats.livraisons++;
  });
  let perfect = 0;
  if (Math.abs(off - STOP_MARK) < 8) { perfect = 40; total += perfect; }
  if (total) { game.money += total; game.stats.gains += total; audio.cash(); }
  lastDeliveries = lines;
  if (lines.length) rebuildConsist(game.slots);
  if (perfect) toast('<b>Arrêt parfait</b> au repère · +40 Pork$', 'or');
  for (const l of lines) toast(`<b>+${fmtMoney(l.pay + l.tip)} Pork$</b> · ${l.c.good === 'voyageurs' ? l.c.units + ' voyageurs' : PRODUITS[l.c.good].nom} livrés à ${st.name}${l.late ? ' (en retard)' : ''}`, 'ok');
  offersFor(st);
  if (game.route && game.route.target === st.id) { game.route = null; game.routeReverseAt = -1; game.routeManual = false; toast(`Destination atteinte : <b>${st.name}</b>`); }
  audio.chime();
  speak(`${st.name}. ${st.name}.`);
  save();
  openStation(st);
}

function openStation(st) {
  game.panelOpen = true;
  const p = $('station');
  p.classList.add('open');
  flap($('st-name'), st.name.toUpperCase());
  $('st-devise').textContent = st.meta.devise || '';
  renderStation(st);
}
function closeStation() { game.panelOpen = false; $('station').classList.remove('open'); }
function freeSlot() { return game.slots.findIndex(s => !s); }
function renderStation(st) {
  const offers = offersFor(st);
  const del = $('st-deliveries');
  del.innerHTML = lastDeliveries.length ? '<h3>Livraisons</h3>' + lastDeliveries.map(l => `<div class="row done"><span class="chip">${WAGON_NAMES[PRODUITS[l.c.good].wagon]}</span><span class="what">${l.c.good === 'voyageurs' ? l.c.units + ' voyageurs' : PRODUITS[l.c.good].nom}${l.late ? ' <em>retard</em>' : ''}${l.tip ? ` <em>pourboire ${fmtMoney(l.tip)}</em>` : ''}</span><span class="pay">+${fmtMoney(l.pay + l.tip)}</span></div>`).join('') : '';
  const free = freeSlot();
  $('st-offers').innerHTML = '<h3>Départs proposés</h3>' + (offers.length ? offers.map(o => {
    const p = PRODUITS[o.good];
    const what = o.good === 'voyageurs' ? `${o.units} voyageurs <small>${o.flavor}</small>` : `${p.nom}`;
    return `<div class="row"><span class="chip">${WAGON_NAMES[p.wagon]}</span><span class="what">${what}<small>vers <b>${STATIONS[o.to].name}</b> · ${pkm(o.dist)} · délai ${fmtTime(o.deadline)}</small></span><span class="pay">${fmtMoney(o.pay)}</span><button class="btn small" data-load="${o.id}" ${free < 0 ? 'disabled' : ''}>Charger</button></div>`;
  }).join('') : '<p class="muted">Plus rien à charger ici pour le moment.</p>');
  $('st-train').innerHTML = `<h3>Votre train <small>${game.slots.filter(Boolean).length}/${game.cap} wagons chargés</small></h3>` + game.slots.map((c, i) => c ?
    `<div class="row"><span class="chip">${WAGON_NAMES[PRODUITS[c.good].wagon]}</span><span class="what">${c.good === 'voyageurs' ? c.units + ' voyageurs' : PRODUITS[c.good].nom}<small>vers <b>${STATIONS[c.to].name}</b> · reste ${fmtTime(c.dueAt - game.now)}</small></span><button class="btn small ghost" data-drop="${i}">Décrocher</button></div>` :
    `<div class="row empty"><span class="chip">Vide</span><span class="what muted">Wagon ${i + 1} disponible</span></div>`).join('');
  const depot = st.meta.size >= 3;
  const nextL = LEVELS[game.lvl + 1], nextW = WAGON_PRICES[game.cap];
  $('st-depot').innerHTML = depot ? `<h3>Dépôt SCPB</h3>
    <div class="row"><span class="what">Locomotive : <b>${LEVELS[game.lvl].nom}</b><small>${LEVELS[game.lvl].vmax} km/h maxi</small></span>${nextL ? `<button class="btn small" data-up="loco" ${game.money < nextL.prix ? 'disabled' : ''}>${nextL.nom} · ${fmtMoney(nextL.prix)}</button>` : '<span class="muted">Au maximum</span>'}</div>
    <div class="row"><span class="what">Wagons : <b>${game.cap}</b><small>8 au maximum</small></span>${game.cap < 8 ? `<button class="btn small" data-up="wagon" ${game.money < nextW ? 'disabled' : ''}>+1 wagon · ${fmtMoney(nextW)}</button>` : '<span class="muted">Complet</span>'}</div>
    <div class="row"><span class="what">Klaxon : <b>${game.horn === 'groin' ? 'Groin' : 'Classique'}</b></span><button class="btn small" data-up="horn" ${game.horn !== 'groin' && game.money < 300 ? 'disabled' : ''}>${game.horn === 'groin' ? 'Revenir au classique' : 'Klaxon Groin · 300'}</button></div>` :
    `<h3>Dépôt SCPB</h3><p class="muted">Améliorations disponibles dans les grandes gares : Douzi City, Hamelot, Port-Cochon, Nouvelle Groin, Saint-Jambon, Groinkbourg…</p>`;
  // boutons de départ
  const dep = $('st-depart');
  const rt = game.route;
  const needFlip = rt && rt.states[0] && rt.states[0].how === 'flip';
  dep.innerHTML = `<button class="btn ghost" id="b-flip">Inverser le sens${needFlip ? ' <small>(itinéraire)</small>' : ''}</button><button class="btn big" id="b-go">Fermer les portes</button>`;
  $('b-go').onclick = () => { closeStation(); audio.chime(); };
  $('b-flip').onclick = () => doFlip();
  if (needFlip) $('b-flip').classList.add('pulse');
}
function loadOffer(id) {
  const st = STATIONS[game.stoppedAt]; if (!st) return;
  const list = game.offers[st.id]; const k = list.findIndex(o => o.id === id); if (k < 0) return;
  const slot = freeSlot(); if (slot < 0) return;
  const o = list.splice(k, 1)[0];
  game.slots[slot] = { ...o, dueAt: game.now + o.deadline, comfort: 100 };
  rebuildConsist(game.slots); updateTrainPose();
  // les voyageurs montent
  if (o.good === 'voyageurs') {
    let n = Math.min(10, Math.round(o.units / 6));
    const head = headPos(new THREE.Vector3());
    for (const c of citizens.list) if (c.st === st.id && c.visible && !c.walk && n-- > 0) {
      const l = locate(LOCO_LEN + (slot + 0.5) * (WAGON_LEN + GAP)); const p = l.t.pos(l.s, new THREE.Vector3());
      c.walk = { x0: c.x, z0: c.z, tx: p.x + (c.x - p.x) * 0.25, tz: p.z + (c.z - p.z) * 0.25, t: 0, dur: 1.6 + Math.random() * 1.4 };
    }
  }
  audio.tone(660, 0.15, 'square', 0.06); audio.tone(880, 0.2, 'square', 0.06, 0.1);
  if (!game.routeManual) autoRoute();
  save(); renderStation(st);
}
function dropSlot(i) {
  const c = game.slots[i]; if (!c) return;
  const fee = Math.round(c.pay * 0.1);
  game.money -= fee; game.slots[i] = null; rebuildConsist(game.slots); updateTrainPose();
  toast(`Wagon décroché · frais de dossier ${fmtMoney(fee)} Pork$`, 'ko');
  save(); renderStation(STATIONS[game.stoppedAt]);
}
function upgrade(kind) {
  if (kind === 'loco') { const n = LEVELS[game.lvl + 1]; if (!n || game.money < n.prix) return; game.money -= n.prix; game.lvl++; applyLevel(); toast(`Locomotive améliorée : <b>${n.nom}</b> (${n.vmax} km/h)`, 'or'); }
  if (kind === 'wagon') { const p = WAGON_PRICES[game.cap]; if (game.cap >= 8 || game.money < p) return; game.money -= p; game.cap++; game.slots.push(null); rebuildConsist(game.slots); updateTrainPose(); toast('Nouveau wagon attelé', 'or'); }
  if (kind === 'horn') { if (game.horn === 'groin') game.horn = 'classique'; else { if (game.money < 300) return; game.money -= 300; game.horn = 'groin'; } audio.horn(); }
  audio.cash(); save(); renderStation(STATIONS[game.stoppedAt]);
}
function doFlip() {
  if (train.v > 0.3) { toast('Arrêtez le train avant d’inverser le sens.', 'ko'); return; }
  const f = $('fade'); f.classList.add('on');
  setTimeout(() => { flipTrain(); updateTrainPose(); if (game.route) setRoute(game.route.target, true); f.classList.remove('on'); toast('Changement de cabine effectué'); if (game.panelOpen && game.stoppedAt >= 0) renderStation(STATIONS[game.stoppedAt]); }, 450);
}
function autoRoute() {
  const dests = game.slots.filter(Boolean).map(c => c.to);
  if (!dests.length) { game.route = null; game.routeReverseAt = -1; return; }
  const from = game.stoppedAt >= 0 ? game.stoppedAt : game.lastStation;
  dests.sort((a, b) => SP[from][a] - SP[from][b]);
  setRoute(dests[0], true);
  game.routeManual = false;
}
function setRoute(target, quiet) {
  const r = computeRoute(target);
  game.route = r;
  if (!r) { toast('Aucun itinéraire trouvé.', 'ko'); return; }
  applyRouteSwitches();
  if (!quiet) toast(`Itinéraire vers <b>${STATIONS[target].name}</b> · ${pkm(r.len)}`);
}
function applyRouteSwitches() {
  const r = game.route; if (!r) return;
  const so0 = stationOffset();
  if (so0 && so0.st === r.target && so0.off > -30) { game.routeReverseAt = -1; return; }
  if (so0 && game.routeReverseAt >= 0 && so0.st === game.routeReverseAt && so0.off > -30) return; // on attend l'inversion
  // retrouver l'état courant dans l'itinéraire
  let k = r.states.findIndex(s => s.t === train.cur.t && s.d === train.cur.d);
  if (k < 0) { const nr = computeRoute(r.target); game.route = nr; if (!nr) return; k = 0; if (nr.states[0].t !== train.cur.t || nr.states[0].d !== train.cur.d) return; }
  const nxt = game.route.states[k + 1]; if (!nxt) return;
  const { st, opts } = nextOptions();
  if (nxt.how === 'through') { const i = opts.findIndex(o => o.t === nxt.t && o.d === nxt.d); if (i >= 0) train.switchSel[st] = i; }
  game.routeReverseAt = nxt.how === 'reverse' ? st : -1;
}
game.onPassStation = st => {
  if (game.route) applyRouteSwitches();
};
function buildMapBase() {
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
function drawMap() {
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
function setNotch(n) { train.notch = clamp(n, -3, 5); renderLever(); }
function renderLever() {
  const n = train.notch;
  $('lever-knob').style.setProperty('--pos', ((5 - n) / 8).toFixed(3));
  $('lever-label').textContent = n > 0 ? 'TRACTION ' + n : n === 0 ? 'NEUTRE' : n === -3 ? 'URGENCE' : 'FREIN ' + (-n);
  $('lever').dataset.state = n > 0 ? 'go' : n < 0 ? 'stop' : 'idle';
}
function cycleSwitch(dir) {
  const { st, opts } = nextOptions();
  if (st < 0 || opts.length < 2) return;
  const k = (train.switchSel[st] ?? 0) + dir;
  train.switchSel[st] = (k + opts.length) % opts.length;
  game.routeOverride = true;
  audio.tone(520, 0.08, 'square', 0.05);
  updateHud(true);
}
function cycleCam() { const i = CAM_MODES.indexOf(cam.mode); setCamMode(CAM_MODES[(i + 1) % CAM_MODES.length]); toast('Vue : ' + CAM_LABELS[cam.mode]); }
window.addEventListener('keydown', e => {
  if (!game.started || EX.on) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.repeat && !['ArrowUp', 'ArrowDown', 'z', 'w', 's'].includes(k)) return;
  audio.resume();
  switch (k) {
    case 'ArrowUp': case 'z': case 'w': setNotch(train.notch + 1); break;
    case 'ArrowDown': case 's': setNotch(train.notch - 1); break;
    case ' ': setNotch(-3); e.preventDefault(); break;
    case 'ArrowLeft': case 'q': case 'a': cycleSwitch(-1); break;
    case 'ArrowRight': case 'd': cycleSwitch(1); break;
    case 'h': audio.horn(); break;
    case 'c': case 'v': cycleCam(); break;
    case 'm': $('map').classList.contains('open') ? closeMap() : openMap(); break;
    case 'f': toggleFF(); break;
    case 'r': doFlip(); break;
    case 'e': case 'Enter': if (game.stoppedAt >= 0 && train.v < 0.3) game.panelOpen ? closeStation() : openStation(STATIONS[game.stoppedAt]); break;
    case 'Escape': closeMap(); closeStation(); $('menu').classList.remove('open'); break;
  }
});
// manette tactile
(() => {
  const lev = $('lever');
  let active = false;
  const fromY = y => { const r = lev.querySelector('.track').getBoundingClientRect(); const k = clamp((y - r.top) / r.height, 0, 1); setNotch(Math.round(5 - k * 8)); };
  lev.addEventListener('pointerdown', e => { active = true; lev.setPointerCapture(e.pointerId); fromY(e.clientY); audio.resume(); e.stopPropagation(); });
  lev.addEventListener('pointermove', e => { if (active) fromY(e.clientY); });
  lev.addEventListener('pointerup', () => { active = false; });
  lev.addEventListener('pointercancel', () => { active = false; });
})();
// regarder autour / orbiter
(() => {
  let last = null;
  canvas.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; input.dragging = true; cam.idle = 0; audio.resume(); });
  window.addEventListener('pointermove', e => {
    if (!last) return;
    const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY];
    if (cam.mode === 'cabine') { cam.yaw = clamp(cam.yaw - dx * 0.005, -2.4, 2.4); cam.pitch = clamp(cam.pitch - dy * 0.004, -0.8, 0.6); cam.idle = 0; }
    else if (cam.mode === 'poursuite') { cam.orbitYaw -= dx * 0.006; cam.orbitPitch = clamp(cam.orbitPitch + dy * 0.004, 0.02, 1.3); }
  });
  window.addEventListener('pointerup', () => { last = null; input.dragging = false; });
  canvas.addEventListener('wheel', e => { if (cam.mode === 'poursuite') cam.orbitDist = clamp(cam.orbitDist * (e.deltaY > 0 ? 1.1 : 0.9), 18, 160); }, { passive: true });
})();
function toggleFF() { game.ff = game.ff === 1 ? 3 : 1; $('b-ff').textContent = game.ff === 1 ? '×1' : '×3'; $('b-ff').classList.toggle('on', game.ff > 1); }
$('b-map').onclick = () => openMap();
$('map-close').onclick = () => closeMap();
$('b-cam').onclick = () => cycleCam();
$('b-ff').onclick = () => toggleFF();
$('b-horn').onpointerdown = e => { e.stopPropagation(); audio.resume(); audio.horn(); };
$('b-sw-l').onclick = () => cycleSwitch(-1);
$('b-sw-r').onclick = () => cycleSwitch(1);
$('b-gare').onclick = () => { if (game.stoppedAt >= 0 && train.v < 0.3) openStation(STATIONS[game.stoppedAt]); };
$('b-flip-hud').onclick = () => doFlip();
$('b-menu').onclick = () => $('menu').classList.add('open');
$('menu-close').onclick = () => $('menu').classList.remove('open');
$('opt-sound').onchange = e => { game.sound = e.target.checked; audio.setOn(game.sound); save(); };
$('opt-voice').onchange = e => { game.voice = e.target.checked; save(); };
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { if (b.dataset.q === QKEY) return; try { localStorage.setItem('porkonia-q3', b.dataset.q); } catch (e) { } save(); location.reload(); });
document.querySelectorAll('[data-time]').forEach(b => b.onclick = () => { applyTime(b.dataset.time); });
$('opt-reset').onclick = () => { if ($('opt-reset').dataset.armed) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } location.reload(); } else { $('opt-reset').dataset.armed = '1'; $('opt-reset').textContent = 'Touchez encore pour confirmer'; } };
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.load) loadOffer(b.dataset.load);
  if (b.dataset.drop) dropSlot(+b.dataset.drop);
  if (b.dataset.up) upgrade(b.dataset.up);
});

// ---------- HUD
let hudT = 0;
function updateHud(force) {
  hudT -= 1; if (hudT > 0 && !force) return; hudT = 6;
  $('money').textContent = fmtMoney(game.money);
  $('speed').textContent = Math.round(train.v * 3.6);
  const lim = upcomingLimit(900);
  const limKmh = Math.min(Math.round(lim.v * 3.6 / 5) * 5, LEVELS[game.lvl].vmax);
  const curLim = train.cur.t.vlim(train.cur.s);
  const over = train.v > curLim * 1.08;
  $('limit').textContent = limKmh;
  $('limit-box').classList.toggle('over', over);
  $('limit-at').textContent = lim.at > 40 ? 'dans ' + Math.round(lim.at / 10) * 10 + ' m' : 'ici';
  // prochain arrêt
  const { st, opts } = nextOptions();
  const c = train.cur;
  const remain = c.d > 0 ? c.t.L - c.s : c.s;
  const so = stationOffset();
  const atPlatform = so && train.v < 0.3 && so.off > -PLATFORM_HALF + 20 && so.off < PLATFORM_HALF + 20;
  const inPlat = so && so.off >= 0 && so.off < PLATFORM_HALF + 20;
  if (inPlat) {
    $('next-k').textContent = train.v < 0.3 ? 'À quai' : 'En gare';
    $('next-name').textContent = STATIONS[so.st].name;
    $('next-dist').textContent = so.off < STOP_MARK ? `repère d'arrêt dans ${Math.round(STOP_MARK - so.off)} m` : `repère dépassé de ${Math.round(so.off - STOP_MARK)} m`;
  } else if (st < 0) { $('next-k').textContent = 'Voie en impasse'; $('next-name').textContent = 'Heurtoir'; $('next-dist').textContent = 'dans ' + Math.round(remain) + ' m'; }
  else {
    const d = remain + STOP_MARK;
    $('next-k').textContent = 'Prochain arrêt';
    $('next-name').textContent = STATIONS[st].name;
    $('next-dist').textContent = d > 1000 ? pkm(d) : `repère d'arrêt dans ${Math.round(d)} m`;
  }
  // aiguillage
  const sw = $('switch');
  if (st >= 0 && opts.length > 1 && remain < 2500) {
    sw.classList.add('show');
    const ch = chosenNext(st, opts);
    $('sw-to').textContent = ch.to >= 0 ? STATIONS[ch.to].name : 'Voie en impasse';
    $('sw-at').textContent = 'Aiguillage à ' + STATIONS[st].name;
    $('sw-count').textContent = (opts.indexOf(ch) + 1) + '/' + opts.length;
  } else sw.classList.remove('show');
  // itinéraire
  const rb = $('route');
  if (game.route) {
    rb.classList.add('show');
    $('route-to').textContent = STATIONS[game.route.target].name;
    const st0 = game.route.states[0];
    $('route-hint').textContent = game.routeReverseAt >= 0 ? `Arrêtez-vous à ${STATIONS[game.routeReverseAt].name} et inversez le sens` : (st0 && st0.how === 'flip' && st0.t === train.cur.t && st0.d === train.cur.d ? 'Aiguillages réglés' : st0 && st0.how === 'flip' ? 'Inversez le sens pour partir' : 'Aiguillages réglés');
  } else rb.classList.remove('show');
  // wagons
  $('cargo').innerHTML = game.slots.map(cn => cn ? `<div class="cg ${game.now > cn.dueAt ? 'late' : ''}"><b>${STATIONS[cn.to].name}</b><span>${cn.good === 'voyageurs' ? cn.units + ' voy.' : PRODUITS[cn.good].nom.split(' (')[0]} · ${fmtTime(cn.dueAt - game.now)}</span></div>` : '').join('');
  const paxAboard = game.slots.some(cn => cn && cn.good === 'voyageurs');
  $('comfort').style.display = paxAboard ? '' : 'none';
  $('comfort-v').textContent = Math.round(train.comfort) + ' %';
  $('comfort').classList.toggle('low', train.comfort < 60);
  $('b-gare').style.display = atPlatform && !game.panelOpen ? '' : 'none';
  $('b-flip-hud').style.display = train.v < 0.3 && !game.panelOpen ? '' : 'none';
  $('clock').textContent = clockText();
}
function clockText() { const m = (6 * 60 + 12 + Math.floor(game.now / 4)) % (24 * 60); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

// ---------- simulation
function physicsStep(dt) {
  const mass = massTotal();
  const n = train.notch;
  let F = 0;
  if (n > 0) { const f = n / 5; F = Math.min(train.f0 * f, train.power * f / Math.max(train.v, 2.5)); }
  const brake = n < 0 ? [0, 0.4, 0.8, 1.5][-n] : 0;
  const grade = train.cur.t.grade(train.cur.s) * train.cur.d;
  let a = F / mass - 9.81 * grade * 0.6 - (0.05 + 0.00016 * train.v * train.v) * (train.v > 0.05 ? 1 : 0);
  if (train.v > train.vmax) a = Math.min(a, -0.5 * (train.v - train.vmax));
  if (train.v > 0.01) a -= brake;
  const v0 = train.v;
  train.v = Math.max(0, train.v + a * dt);
  if (n <= 0 && train.v < 0.08 && v0 < 0.08) train.v = 0;
  train.acc = (train.v - v0) / Math.max(dt, 1e-4);
  const r = advanceHead(train.v * dt);
  train.odo += train.v * dt; game.stats.km += train.v * dt / 1000;
  if (r === 'heurtoir') {
    if (train.v > 3) { const fine = 200; game.money -= fine; toast(`<b>Heurtoir percuté</b> à ${Math.round(train.v * 3.6)} km/h · amende ${fine} Pork$`, 'ko'); audio.thud(); }
    train.v = 0; setNotch(-1);
  }
  // confort et vitesse en courbe
  const vl = train.cur.t.vlim(train.cur.s);
  game.screech = train.v > vl * 1.12 && train.v > 8 ? clamp((train.v / vl - 1.12) * 4, 0, 1) : 0;
  const pax = game.slots.some(c => c && c.good === 'voyageurs');
  if (pax) {
    const dec = -train.acc;
    if (dec > 1.0) train.comfort -= (dec - 1.0) * 10 * dt;
    if (game.screech) train.comfort -= game.screech * 14 * dt;
    train.comfort = clamp(train.comfort + 0.5 * dt, 0, 100);
    for (const c of game.slots) if (c && c.good === 'voyageurs') c.comfort = Math.min(c.comfort ?? 100, train.comfort);
  } else train.comfort = 100;
  if (train.v > vl * 1.6 && train.v > 16 && game.now > game.nextOverspeed) {
    game.nextOverspeed = game.now + 12;
    setNotch(-3);
    const fine = 150; game.money -= fine;
    toast(`<b>Déraillement évité de justesse</b> · ${Math.round(train.v * 3.6)} km/h pour ${Math.round(vl * 3.6)} autorisés · amende ${fine}`, 'ko');
  }
}

function checkStops() {
  const so = stationOffset();
  if (game.stoppedAt >= 0) {
    if (train.v > 1.5) {
      // départ
      const st = STATIONS[game.stoppedAt];
      game.stoppedAt = -1; closeStation();
      if (!game.routeManual) autoRoute();
      else if (game.route && game.route.states[0] && game.route.states[0].how === 'flip') setRoute(game.route.target, true);
      const { st: nx } = nextOptions();
      if (nx >= 0) { ticker(`Prochain arrêt : ${STATIONS[nx].name}. La SCPB vous souhaite un agréable voyage.`); speak(`Prochain arrêt : ${STATIONS[nx].name}`); }
      game.tickerT = 50;
    }
    return;
  }
  if (so && train.v === 0 && train.notch <= 0 && so.off > -PLATFORM_HALF + 20 && so.off < PLATFORM_HALF + 20) arriveAt(STATIONS[so.st], so.off);
}
function resize() {
  setRenderSize();
  if ($('map').classList.contains('open')) drawMap();
}
window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); if (audio.ctx) audio.ctx.suspend().catch(() => { }); }
  else if (audio.ctx && game.started) audio.ctx.resume().catch(() => { });
});
let clockPrev = performance.now(), titleT = 0;
const perf = { acc: 0, frames: 0, t: 0, low: 0, high: 0 };
const _focus = new THREE.Vector3(), _fwd = new THREE.Vector3(), _sunScreen = new THREE.Vector3(), _camPos = new THREE.Vector3();
let sunVisSmooth = 0;
function sunVisibility(camPos) {
  _sunScreen.copy(camPos).addScaledVector(SUN_DIR, 5000).project(camera);
  if (_sunScreen.z > 1 || Math.abs(_sunScreen.x) > 1.3 || Math.abs(_sunScreen.y) > 1.3 || SUN_DIR.y < -0.02) return 0;
  const hl = Math.hypot(SUN_DIR.x, SUN_DIR.z) || 1e-6, tanE = SUN_DIR.y / hl;
  for (let t = 20; t < 9000; t *= 1.15) {
    const x = camPos.x + SUN_DIR.x / hl * t, z = camPos.z + SUN_DIR.z / hl * t;
    if (hAt(x, z) > camPos.y + t * tanE) return 0;
  }
  if (cam.mode === 'cabine') { // les montants de la cabine cachent un peu le soleil
    const sx = _sunScreen.x, sy = _sunScreen.y; if (sy > 0.62 || sy < -0.55) return 0.25;
  }
  return 1;
}
function adaptResolution(rdt) {
  perf.acc += rdt; perf.frames++;
  if (perf.acc < 2) return;
  const fps = perf.frames / perf.acc; perf.acc = 0; perf.frames = 0;
  const maxPR = Math.min(window.devicePixelRatio || 1, Q.pr);
  if (fps < 40 && pixelRatio > 0.5) { pixelRatio = Math.max(0.5, pixelRatio * (fps < 24 ? 0.72 : 0.85)); setRenderSize(); }
  else if (fps > 57 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio * 1.08); setRenderSize(); }
  const el = $('fps'); if (el) el.textContent = Math.round(fps) + ' i/s · ' + Math.round(pixelRatio * 100) + ' %';
}
const PAUSE = { on: new URLSearchParams(location.search).has('pause'), once: 0, cb: null };
let frameN = 0;
// masque au loin les petits objets isolés du décor (gares, monuments, fermes…)
function registerFarCull() {
  const managed = new Set(PROPS.meshes.map(p => p.mesh)), box = new THREE.Box3(), sph = new THREE.Sphere();
  const k = QKEY === 'mobile' ? 0.7 : QKEY === 'haute' ? 1 : 1.5;
  let n = 0;
  const visit = (o, depth) => {
    if (o.isInstancedMesh || managed.has(o) || !o.visible || !(o.isGroup || o.isMesh)) return;
    let skip = false; o.traverse(c => { if (c.isInstancedMesh || managed.has(c) || c.isPoints || c.isSprite) skip = true; });
    if (skip) { if (depth < 2 && o.isGroup) for (const c of o.children.slice()) visit(c, depth + 1); return; }
    box.setFromObject(o); if (box.isEmpty()) return; box.getBoundingSphere(sph);
    if (sph.radius > 600) { if (depth < 2 && o.isGroup) for (const c of o.children.slice()) visit(c, depth + 1); return; }
    PROPS.meshes.push({ mesh: o, cx: sph.center.x, cz: sph.center.z, R: (1100 + sph.radius * 45) * k }); n++;
  };
  for (const o of scenery.children.slice()) visit(o, 0);
  return n;
}
function frame(now) {
  if (PAUSE.on && PAUSE.once <= 0) { requestAnimationFrame(frame); return; }
  if (PAUSE.on) { PAUSE.once--; if (PAUSE.once === 0 && PAUSE.cb) { const cb = PAUSE.cb; PAUSE.cb = null; setTimeout(cb, 0); } }
  const rdt = Math.min(0.05, (now - clockPrev) / 1000); clockPrev = now;
  clock.simT += rdt;
  if (EX.on) { if (game.started) exUpdate(rdt); else titleT += rdt; }
  else if (game.started) {
    const paused = game.panelOpen || $('map').classList.contains('open') || $('menu').classList.contains('open');
    for (let k = 0; k < game.ff; k++) {
      const sub = 2, dt = rdt / sub;
      for (let q = 0; q < sub; q++) { if (!paused) { physicsStep(dt); game.now += dt; } }
    }
    checkStops();
    game.tickerT -= rdt;
    if (game.tickerT < 0) { game.tickerT = 70 + Math.random() * 50; ticker(ANNOUNCES[(Math.random() * ANNOUNCES.length) | 0]); }
    train.bump = Math.max(0, train.bump - rdt * 6);
    updateHud();
    audio.update(rdt * game.ff);
  } else {
    titleT += rdt;
  }
  updateTrainPose();
  if (EX.on && game.started) exCamera(rdt); else updateCamera(rdt, clock.simT);
  camera.updateMatrixWorld();
  camera.getWorldPosition(_camPos);
  sky.position.copy(_camPos);
  updateCitizens(clock.simT, rdt, _camPos);
  updateHerds(clock.simT, rdt, _camPos);
  updateVegetation(_camPos);
  updateTownLOD(_camPos);
  updateSleepers();
  updateBirds(clock.simT);
  if (train.notch > 0 && Math.random() < 0.3 + train.notch * 0.1) {
    const p = new THREE.Vector3(0, 5.0, 1.3).applyMatrix4(train.loco.matrixWorld);
    puff(p.x, p.y, p.z, (Math.random() - 0.5) * 0.6, 2.2 + train.notch * 0.5, (Math.random() - 0.5) * 0.6, 0.45 + train.notch * 0.08, 2.6);
  }
  updateSmoke(rdt, _camPos);
  for (const a of ANIMATED) { if (a.kind === 'spin') a.obj.rotation.y += rdt * 0.25; if (a.kind === 'mill') a.obj.rotation.z += rdt * 0.6; }
  // ombres : centrées un peu devant la caméra
  camera.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize();
  _focus.copy(_camPos).addScaledVector(_fwd, Q.shadowR * 0.45); _focus.y = hAt(_focus.x, _focus.z);
  if ((frameN + 1) % (Q.shadowEvery || 1) === 0) updateSunShadow(_focus);
  WS.uTime.value = clock.simT; sky.material.uniforms.uTime.value = clock.simT;
  for (const w of WATERS) w.uniforms.uTime.value = clock.simT;
  WS.uSunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);
  const sv = sunVisibility(_camPos); sunVisSmooth = lerp(sunVisSmooth, sv, 1 - Math.pow(0.002, rdt));
  const gu = gradePass.uniforms; gu.uTime.value = clock.simT; gu.uSun.value.set(_sunScreen.x * 0.5 + 0.5, _sunScreen.y * 0.5 + 0.5); gu.uSunVis.value = sunVisSmooth * (cam.mode === 'cabine' ? 0.7 : 1);
  gu.uRays.value = Q.rays ? 1 : 0;
  frameN++; if (frameN % (Q.shadowEvery || 1) === 0) renderer.shadowMap.needsUpdate = true;
  renderReflection();
  composer.render(rdt);
  adaptResolution(rdt);
  requestAnimationFrame(frame);
}
function setRenderSize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(w, h);
  bloomPass.strength = 0.3 * Q.bloom + 0.04; bloomPass.enabled = Q.bloom > 0;
  gradePass.uniforms.uRes.value.set(w * pixelRatio, h * pixelRatio);
  if (Q.reflect) reflectRT.setSize(Math.max(64, Math.round(w * pixelRatio * Q.reflect)), Math.max(64, Math.round(h * pixelRatio * Q.reflect)));
  camera.aspect = w / h; fitFov();
}
TIME_LISTENERS.push(onTimeChanged);
function onTimeChanged(t) {
  if (train.loco && train.loco.userData.spot) train.loco.userData.spot.intensity = { matin: 400, midi: 0, doree: 420, crepuscule: 2400 }[TKEY] ?? 600;
  document.querySelectorAll('[data-time]').forEach(b => b.classList.toggle('on', b.dataset.time === TKEY));
}

async function boot(hotData) {
  try { await Promise.race([Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('600 20px "Barlow Condensed"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  const T0 = performance.now(); const step = async (msg) => { console.log('boot', Math.round(performance.now() - T0), msg); setStatus(msg); await new Promise(r => setTimeout(r, 16)); };
  await step('Fabrication des textures…');
  buildTextures();
  await step('Pose des rails…');
  markTrackMask();
  await step('Calcul de la lumière…');
  applyTime(TKEY);
  await step('Sculpture des montagnes…');
  const fieldCenters = STATIONS.map(st => ({ x: st.x, z: st.z, cx: st.x - st.dir.y * 80, cz: st.z + st.dir.x * 80, urb: 0, r2: Math.pow((st.meta.R || 300) * 2.3 + 650, 2), inner2: Math.pow((st.meta.R || 300) + 40, 2), angle: (hashStr(st.name) % 314) / 100 }));
  scene.add(buildTerrain(fieldCenters));
  scene.add(buildWater());
  await step('Construction des viaducs et des tunnels…');
  scene.add(buildNetwork());
  await step('Installation des 31 gares…');
  const info = await buildScenery();
  await step('Attelage de la BB 12012…');
  trainMaterials();
  buildSleepers();
  train.loco = buildLoco(); train.cab = buildCab();
  train.loco.add(train.cab); train.loco.add(cam.rig);
  train.group.add(train.loco); scene.add(train.group);
  buildMapBase();
  for (const c of citizens.list) c.visible = false;
  if (citizens.meshes) for (const k in citizens.meshes) citizens.meshes[k].visible = false;
  const had = loadSave(hotData);
  applyLevel();
  onTimeChanged(TIMES[TKEY]);
  const startSt = STATIONS[game.lastStation] || STATION_BY_NAME['Douzi City'];
  placeTrainAt(startSt.id, DEPART[startSt.id][1][0].t.stub ? -1 : 1);
  rebuildConsist(game.slots);
  updateTrainPose();
  setCamMode('drone');
  $('opt-sound').checked = game.sound; $('opt-voice').checked = game.voice;
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === QKEY));
  renderLever();
  resize();
  await step('Premier rendu…');
  renderer.compile(scene, camera);
  $('loading').classList.add('done');
  $('title-sub').textContent = had ? `Reprise du service à ${startSt.name} · ${fmtMoney(game.money)} Pork$ en caisse` : 'Exploration libre · 31 villes · à pied, en voiture';
  console.log('boot', Math.round(performance.now() - T0), 'fin'); console.log('Porkonia Express prêt', JSON.stringify(info));
  window.__pe = { train, game, cam, setCamMode, setNotch, STATIONS, TRACKS, physicsStep, updateTrainPose, openMap, closeMap, setRoute, placeTrainAt, rebuildConsist, closeStation, PILLARS, PORTALS, camera, scene, hAt, LANDMARK_SPOTS, BUILDINGS, renderer, checkStops, loadOffer, stationOffset, nextOptions, upcomingLimit, STOP_MARK, offersFor, applyRouteSwitches, flipTrain, applyTime, Q, VEG, composer, waterAt, THREE, PART_MESHES, DRAPES, scenery, EX, exStart, exTeleport, exToggleCar, groundAt, ROADS, NPC, updateNpcs, STATION_BY_NAME, exUpdate, exCamera };
  window.__pe.PROPS = PROPS; window.__pe.view = (type, k, dist, h, ang = 0.6) => { const a = PROPS.where[type]; const p = a[Math.min(a.length - 1, k)]; const x = p[0] + Math.sin(ang) * dist, z = p[1] + Math.cos(ang) * dist; EX.mode = 'pied'; exSetView(); exPlacePlayer(x, z, ang); EX.P.y = groundAt(x, z) + h; EX.P.pitch = -Math.atan2(h - 1.5, dist) * 0.9; for (let q = 0; q < 90; q++) updateNpcs(0.05); return type + ' ' + a.length; };
  window.__pe.exToggleView = exToggleView; window.__pe.exTogglePig = exTogglePig; window.__pe.exSetView = exSetView;
  window.__pe.go = (x, z, yaw, pitch = 0, mode = 'pied') => { EX.mode = mode; exSetView(); if (mode === 'auto') { exPlaceCar(x, z, yaw); EX.car.orbit = 0; camera.position.set(x - Math.sin(yaw) * 7, groundAt(x, z) + 3.5, z - Math.cos(yaw) * 7); } else { exPlacePlayer(x, z, yaw); EX.P.pitch = pitch; } EX.P.x = x; EX.P.z = z; };
  window.__pe.render = (n = 1) => new Promise(r => { PAUSE.once = n; PAUSE.cb = r; });
  window.__pe.look = (x, y, z, tx, ty, tz) => { setCamMode('cabine'); setCamMode('poursuite'); cam.mode = 'libre'; scene.add(camera); camera.position.set(x, y, z); camera.lookAt(tx, ty, tz); camera.updateMatrixWorld(); };
  window.__pe.treeRow = () => {
    let best = null;
    for (let k = 0; k < 4000 && !best; k++) {
      const x = (Math.random() - 0.5) * WW * 0.8, z = (Math.random() - 0.5) * HH * 0.8;
      if (clsAt(x, z) !== 1 || slopeAt(x, z) > 0.04 || hAt(x, z) < 6 || tmGet(x, z)) continue;
      if (STATIONS.some(st => Math.hypot(st.x - x, st.z - z) < 900)) continue;
      let ok = true; for (let i = -60; i <= 60 && ok; i += 20) for (let j = -40; j <= 40; j += 20) if (tmGet(x + i, z + j) || slopeAt(x + i, z + j) > 0.08) { ok = false; break; }
      if (ok) best = { x, z };
    }
    const sp = ['chene', 'bouleau', 'peuplier', 'epicea', 'pinNeige', 'buisson'];
    const mat = treeMaterial();
    sp.forEach((k, i) => {
      for (const [lod, dz] of [['lod0', 0], ['lod1', 40]]) {
        const m = new THREE.Mesh(VEG.species[k][lod], mat); const x = best.x + (i - 2.5) * 17, z = best.z + dz;
        m.position.set(x, hAt(x, z) - 0.2, z); m.castShadow = true; m.receiveShadow = true; m.material.vertexColors = true; scene.add(m);
      }
    });
    return best;
  };
  window.claude?.hot?.snapshot?.(() => saveObj());
  requestAnimationFrame(frame);
  exInit(); console.log('farcull', registerFarCull());
  $('b-start').onclick = () => {
    if (EX.on) { exStart(); return; }
    audio.init(); audio.resume();
    game.started = true;
    $('title').classList.add('gone');
    document.body.classList.add('playing');
    setCamMode('cabine');
    game.stoppedAt = -1;
    arriveAt(startSt, STOP_MARK + 100);
    ticker(`Bienvenue à bord. Vous êtes en gare de ${startSt.name}. Chargez des wagons, puis montez la manette.`);
    game.tickerT = 40;
  };
}
try {
  window.claude?.hot?.ready ? window.claude.hot.ready(boot) : await boot(window.claude?.hot?.data ?? {});
} catch (e) { console.error(e); setStatus('Erreur au chargement : ' + e.message); }
