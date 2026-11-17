// Jeu de conduite de train : itinéraires, fret, gares, manette. En sommeil : la balade a la priorité, ce code ne tourne que si EX.on est faux
import * as THREE from 'three';
import { clamp, $, fmtMoney } from '../engine/util.js';
import { STATIONS } from '../world/land.js';
import { game } from './state.js';
import { TRACKS, DEPART, STUBS, STOP_MARK, PLATFORM_HALF } from '../world/tracks.js';
import { PRODUITS } from '../world/cities.js';
import { citizens } from '../world/creatures.js';
import { train, rebuildConsist, updateTrainPose, locate, LOCO_LEN, WAGON_LEN, GAP, flipTrain, stationOffset, nextOptions, advanceHead } from './train.js';
import { toast } from './ui.js';
import { audio } from './audio.js';

export const SAVE_KEY = 'porkonia-express-v1';

// ---------- distances entre gares (plus court chemin sur le réseau)
export const SP = STATIONS.map(() => new Float64Array(STATIONS.length).fill(Infinity));
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
export const LEVELS = [
  { nom: 'BB 12012 d’origine', vmax: 140, power: 2.4e6, f0: 290e3, prix: 0 },
  { nom: 'Moteur Brasswagen V12', vmax: 180, power: 3.6e6, f0: 330e3, prix: 2800 },
  { nom: 'Turbo au saindoux', vmax: 220, power: 5.0e6, f0: 380e3, prix: 7500 },
  { nom: 'Groin-Express intégral', vmax: 260, power: 6.8e6, f0: 430e3, prix: 16000 },
];
const WAGON_PRICES = [0, 0, 0, 1400, 2600, 4200, 6400, 9000]; // prix du wagon n°(index+1)
const GROUPS = ['Supporters de Groinball', 'Pèlerins du Cube de Porc', 'Classe de neige', 'Délégation du Sénat des Taverniers', 'Noce (la douzième place est réservée)',
  'Contrôleurs de Pork ID en repos', 'Chorale des charcutiers', 'Touristes qui se croyaient ailleurs', 'Retraités de la Mousse', 'Groinball junior et parents',
  'Agents des Affaires Trop Compliquées', 'Fanfare municipale', 'Fans des Ranga Boyz', 'Livreurs de Douzi Ambrée en congé', 'Club de raclette du jeudi'];
export const ANNOUNCES = [
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
export function offersFor(st) {
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
export function applyLevel() { const L = LEVELS[game.lvl]; train.vmax = L.vmax / 3.6; train.power = L.power; train.f0 = L.f0; }

// ---------- sauvegarde
export function saveObj() { return { money: game.money, cap: game.cap, lvl: game.lvl, horn: game.horn, slots: game.slots, lastStation: game.lastStation, stats: game.stats, sound: game.sound, voice: game.voice, now: game.now }; }
export function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saveObj())); } catch (e) { } }
export function loadSave(hotData) {
  let d = hotData && hotData.money !== undefined ? hotData : null;
  if (!d) try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
  if (!d) return false;
  Object.assign(game, { money: d.money ?? 1500, cap: d.cap ?? 3, lvl: d.lvl ?? 0, horn: d.horn || 'classique', lastStation: d.lastStation ?? 0, stats: d.stats || game.stats, sound: d.sound ?? true, voice: !!d.voice, now: d.now || 0 });
  game.slots = Array.from({ length: game.cap }, (_, i) => (d.slots && d.slots[i]) || null);
  return true;
}
function speak(text) {
  if (!game.voice || !window.speechSynthesis) return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 1.0; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) { }
}
export function ticker(text) {
  const el = $('ticker');
  el.querySelector('span').textContent = text;
  el.classList.remove('run'); void el.offsetWidth; el.classList.add('run');
}
export function fmtTime(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
export function pkm(m) { return (m / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' pkm'; }
const WAGON_NAMES = { voyageurs: 'Voiture', citerne: 'Citerne', futs: 'Plat à fûts', porcs: 'Bétaillère', couvert: 'Couvert', frigo: 'Frigo', tremie: 'Trémie', chaises: 'Plat', vide: 'Vide' };

function flap(el, text) { // effet tableau à palettes
  el.innerHTML = '';
  [...text].forEach((ch, i) => { const s = document.createElement('span'); s.className = 'flap'; s.style.animationDelay = (i * 0.045) + 's'; s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); });
}

let lastDeliveries = [];
export function arriveAt(st, off) {
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

export function openStation(st) {
  game.panelOpen = true;
  const p = $('station');
  p.classList.add('open');
  flap($('st-name'), st.name.toUpperCase());
  $('st-devise').textContent = st.meta.devise || '';
  renderStation(st);
}
export function closeStation() { game.panelOpen = false; $('station').classList.remove('open'); }
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
export function loadOffer(id) {
  const st = STATIONS[game.stoppedAt]; if (!st) return;
  const list = game.offers[st.id]; const k = list.findIndex(o => o.id === id); if (k < 0) return;
  const slot = freeSlot(); if (slot < 0) return;
  const o = list.splice(k, 1)[0];
  game.slots[slot] = { ...o, dueAt: game.now + o.deadline, comfort: 100 };
  rebuildConsist(game.slots); updateTrainPose();
  // les voyageurs montent
  if (o.good === 'voyageurs') {
    let n = Math.min(10, Math.round(o.units / 6));
    for (const c of citizens.list) if (c.st === st.id && c.visible && !c.walk && n-- > 0) {
      const l = locate(LOCO_LEN + (slot + 0.5) * (WAGON_LEN + GAP)); const p = l.t.pos(l.s, new THREE.Vector3());
      c.walk = { x0: c.x, z0: c.z, tx: p.x + (c.x - p.x) * 0.25, tz: p.z + (c.z - p.z) * 0.25, t: 0, dur: 1.6 + Math.random() * 1.4 };
    }
  }
  audio.tone(660, 0.15, 'square', 0.06); audio.tone(880, 0.2, 'square', 0.06, 0.1);
  if (!game.routeManual) autoRoute();
  save(); renderStation(st);
}
export function dropSlot(i) {
  const c = game.slots[i]; if (!c) return;
  const fee = Math.round(c.pay * 0.1);
  game.money -= fee; game.slots[i] = null; rebuildConsist(game.slots); updateTrainPose();
  toast(`Wagon décroché · frais de dossier ${fmtMoney(fee)} Pork$`, 'ko');
  save(); renderStation(STATIONS[game.stoppedAt]);
}
export function upgrade(kind) {
  if (kind === 'loco') { const n = LEVELS[game.lvl + 1]; if (!n || game.money < n.prix) return; game.money -= n.prix; game.lvl++; applyLevel(); toast(`Locomotive améliorée : <b>${n.nom}</b> (${n.vmax} km/h)`, 'or'); }
  if (kind === 'wagon') { const p = WAGON_PRICES[game.cap]; if (game.cap >= 8 || game.money < p) return; game.money -= p; game.cap++; game.slots.push(null); rebuildConsist(game.slots); updateTrainPose(); toast('Nouveau wagon attelé', 'or'); }
  if (kind === 'horn') { if (game.horn === 'groin') game.horn = 'classique'; else { if (game.money < 300) return; game.money -= 300; game.horn = 'groin'; } audio.horn(); }
  audio.cash(); save(); renderStation(STATIONS[game.stoppedAt]);
}
export function doFlip() {
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
export function setRoute(target, quiet) {
  const r = computeRoute(target);
  game.route = r;
  if (!r) { toast('Aucun itinéraire trouvé.', 'ko'); return; }
  applyRouteSwitches();
  if (!quiet) toast(`Itinéraire vers <b>${STATIONS[target].name}</b> · ${pkm(r.len)}`);
}
export function applyRouteSwitches() {
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
export function setNotch(n) { train.notch = clamp(n, -3, 5); renderLever(); }
export function renderLever() {
  const n = train.notch;
  $('lever-knob').style.setProperty('--pos', ((5 - n) / 8).toFixed(3));
  $('lever-label').textContent = n > 0 ? 'TRACTION ' + n : n === 0 ? 'NEUTRE' : n === -3 ? 'URGENCE' : 'FREIN ' + (-n);
  $('lever').dataset.state = n > 0 ? 'go' : n < 0 ? 'stop' : 'idle';
}

// ---------- simulation
export function physicsStep(dt) {
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

export function checkStops() {
  const so = stationOffset();
  if (game.stoppedAt >= 0) {
    if (train.v > 1.5) {
      // départ
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
