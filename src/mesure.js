// Mesure des performances sur l'appareil réel : ouvrir le jeu avec ?mesure à la fin de l'adresse.
// Chargé à la demande par game.js, ce module ne pèse rien en jeu normal. Il téléporte le joueur à Douzi City,
// à Nouvelle Groin puis sur une route de campagne, et relève images par seconde, appels de dessin et triangles.
const pe = window.__pe;
const $ = id => document.getElementById(id);
const QKEY = (() => { try { return localStorage.getItem('porkonia-q3'); } catch (e) { return null; } })() || (matchMedia('(pointer: coarse)').matches ? 'mobile' : 'haute');
const NOMS = { ultra: 'Ultra', haute: 'Haute', mobile: 'Économe' };
const SAVE = 'porkonia-mesure';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// milieu de la route la plus éloignée de toute gare
function routeDeCampagne() {
  let best = null, bd = 0;
  for (const r of pe.ROADS) {
    const p = r.pts[r.pts.length >> 1]; let d = 1e9;
    for (const s of pe.STATIONS) d = Math.min(d, Math.hypot(s.x - p[0], s.z - p[2]));
    if (d > bd) { bd = d; best = r; }
  }
  const k = best.pts.length >> 1, p = best.pts[k], n = best.pts[k + 1];
  return { x: p[0], z: p[2], yaw: Math.atan2(n[0] - p[0], n[2] - p[2]) };
}
function centreVille(nom) {
  const st = pe.STATION_BY_NAME[nom], T = st.town.T;
  return { x: st.town.C[0], z: st.town.C[1], yaw: Math.atan2(T.U[0], T.U[1]) };
}
const LIEUX = [['Douzi City', () => centreVille('Douzi City')], ['Nouvelle Groin', () => centreVille('Nouvelle Groin')], ['Route de campagne', routeDeCampagne]];

function carteGraphique() {
  try { const gl = pe.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (e) { return 'inconnue'; }
}

// relève pendant `ms` millisecondes : images par seconde, pire image, appels de dessin et triangles par image
function releve(ms) {
  return new Promise(done => {
    const info = pe.renderer.info; info.autoReset = false; info.reset();
    const t0 = performance.now(); let n = 0, prev = t0, pire = 0;
    const tick = () => {
      const now = performance.now(); n++; pire = Math.max(pire, now - prev); prev = now;
      if (now - t0 < ms) { requestAnimationFrame(tick); return; }
      const r = { ips: n * 1000 / (now - t0), pire, appels: info.render.calls / n, triangles: info.render.triangles / n, resolution: pe.renderer.getPixelRatio() };
      info.autoReset = true; done(r);
    };
    requestAnimationFrame(tick);
  });
}

const sheet = document.createElement('div'); sheet.className = 'sheet open'; sheet.style.zIndex = 60;
sheet.innerHTML = '<div class="card"><div class="board"><div class="k">Mesure des performances</div><b style="font:22px var(--f-display);color:var(--creme)" id="mes-titre"></b></div><div class="body" id="mes-corps"></div></div>';
document.body.appendChild(sheet);

function lire() { try { return JSON.parse(sessionStorage.getItem(SAVE) || '{}'); } catch (e) { return {}; } }
function tableau(tous) {
  const f = (v, d = 0) => v.toLocaleString('fr-FR', { maximumFractionDigits: d });
  let h = '<table style="width:100%;border-collapse:collapse;font:600 15px var(--f-body);margin-top:10px"><tr style="text-align:left;color:var(--bordeaux)"><th>Réglage · lieu</th><th>Images/s</th><th>Pire image</th><th>Appels</th><th>Triangles</th><th>Résolution</th></tr>';
  for (const q of ['ultra', 'haute', 'mobile']) for (const r of tous[q] || [])
    h += `<tr style="border-top:1px solid #d9c9a3"><td>${NOMS[q]} · ${r.lieu}</td><td>${f(r.ips, 1)}</td><td>${f(r.pire)} ms</td><td>${f(r.appels)}</td><td>${f(r.triangles / 1e6, 2)} M</td><td>${f(r.resolution * 100)} %</td></tr>`;
  return h + '</table>';
}
function boutonsReglage() {
  return '<p class="muted">Mesurer un autre réglage (la page se recharge, les résultats sont gardés) :</p><div style="display:flex;gap:8px;flex-wrap:wrap">'
    + ['ultra', 'haute', 'mobile'].filter(q => q !== QKEY).map(q => `<button class="btn small" data-mes-q="${q}">${NOMS[q]}</button>`).join('') + '</div>';
}
function brancher() {
  sheet.querySelectorAll('[data-mes-q]').forEach(b => b.onclick = () => { try { localStorage.setItem('porkonia-q3', b.dataset.mesQ); } catch (e) { } location.reload(); });
  const go = $('mes-go'); if (go) go.onclick = lancer;
  const fin = $('mes-fin'); if (fin) fin.onclick = () => { location.href = location.pathname; };
}
function accueil() {
  const tous = lire();
  $('mes-titre').textContent = 'Réglage ' + NOMS[QKEY];
  $('mes-corps').innerHTML = `<p>Le jeu va vous déposer à Douzi City, à Nouvelle Groin puis sur une route de campagne, et mesurer chaque lieu pendant quelques secondes. Ne touchez à rien pendant la mesure (environ 30 secondes).</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="mes-go">Lancer la mesure</button><button class="btn small ghost" id="mes-fin">Quitter</button></div>`
    + (Object.keys(tous).length ? tableau(tous) + boutonsReglage() : '');
  brancher();
}
async function lancer() {
  sheet.classList.remove('open');
  pe.exStart();
  const res = [];
  for (const [lieu, pos] of LIEUX) {
    const p = pos(); pe.go(p.x, p.z, p.yaw, 0);
    await sleep(4000);                       // le temps de fabriquer les tuiles et d'ajuster la résolution
    res.push({ lieu, ...(await releve(6000)) });
  }
  const tous = lire(); tous[QKEY] = res;
  try { sessionStorage.setItem(SAVE, JSON.stringify(tous)); } catch (e) { }
  $('mes-titre').textContent = 'Résultats';
  $('mes-corps').innerHTML = tableau(tous)
    + `<p class="muted">Carte graphique : ${carteGraphique()} · écran ${innerWidth} × ${innerHeight}, densité ${devicePixelRatio}. Une capture d'écran de ce tableau suffit.</p>`
    + boutonsReglage() + '<div style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn small ghost" id="mes-fin">Quitter</button></div>';
  brancher();
  sheet.classList.add('open');
}
accueil();
