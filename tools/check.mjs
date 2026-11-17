// Contrôle sans écran, en une minute : le jeu démarre, ne lève aucune erreur, le monde généré a l'empreinte attendue,
// et quelques images se rendent dans une ville et sur une route.
//   node tools/check.mjs            compare à tools/world-signature.json
//   node tools/check.mjs --update   réécrit l'empreinte après un changement voulu du décor
// Lancer `npm run build` avant (ou `npm run check`, qui fait les deux).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist, CHROME_ARGS, blockNetwork } from './serve.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REF = join(ROOT, 'tools/world-signature.json');
const { chromium } = createRequire(import.meta.url)('playwright');
const update = process.argv.includes('--update');
const srv = await serveDist();
const b = await chromium.launch({ args: CHROME_ARGS });
const errors = [];
let sig = null, info = null;
for (const q of ['mobile', 'haute', 'ultra']) {
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(`try{localStorage.setItem('porkonia-q3','${q}')}catch(e){}`);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(600000);
  pg.on('pageerror', e => errors.push(`[${q}] ${e.message}`));
  pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('panne injectée')) errors.push(`[${q}] console : ${m.text().slice(0, 300)}`); });
  await blockNetwork(pg);
  await pg.goto(srv.url + '?pause');
  await pg.waitForFunction("!!(window.__pe && window.__pe.render) || /Erreur/.test(document.getElementById('loading-status')?.textContent || '')", null, { polling: 500 });
  if (!(await pg.evaluate('!!window.__pe'))) { errors.push(`[${q}] le démarrage a échoué : ` + await pg.evaluate("document.getElementById('loading-status').textContent")); await ctx.close(); continue; }
  const s = await pg.evaluate('window.__pe.worldSignature()');
  // le décor ne dépend pas du réglage de qualité : les trois empreintes doivent être égales
  if (sig && JSON.stringify(s) !== JSON.stringify(sig)) errors.push(`[${q}] l'empreinte du monde dépend du réglage de qualité`);
  sig = sig || s; info = info || await pg.evaluate('window.__pe.info');
  if (q === 'mobile') {
    // une ville, une route, retour en ville : les mêmes maillages doivent être affichés à l'aller et au retour
    const vus = await pg.evaluate(`(async () => { const pe = window.__pe; document.getElementById('title').classList.add('gone'); pe.exStart(); const out = [];
      const st = pe.STATION_BY_NAME['Nouvelle Groin']; const r = pe.ROADS[0].pts[pe.ROADS[0].pts.length >> 1];
      for (const [x, z] of [[st.town.C[0], st.town.C[1]], [r[0], r[2]], [st.town.C[0], st.town.C[1]]]) { pe.go(x, z, 0, 0); await pe.render(3); let n = 0; pe.scene.traverseVisible(o => { if (o.isInstancedMesh) n++; }); out.push(n); }
      return out; })()`);
    // conduite : deux secondes pleins gaz en ville, puis frein à main braqué ; la voiture doit avancer sans erreur
    const roule = await pg.evaluate(`(async () => { const pe = window.__pe, st = pe.STATION_BY_NAME['Nouvelle Groin'], T = st.town.T;
      pe.go(st.town.C[0], st.town.C[1], Math.atan2(T.U[0], T.U[1]), 0, 'auto'); const c = pe.EX.car, x0 = c.x, z0 = c.z;
      pe.EX.inp.kz = 1; await pe.render(40); pe.EX.inp.kx = 1; pe.EX.inp.kb = true; await pe.render(15); pe.EX.inp.kz = pe.EX.inp.kx = 0; pe.EX.inp.kb = false;
      return Math.hypot(c.x - x0, c.z - z0); })()`);
    if (!(roule > 5)) errors.push('[mobile] la voiture n\'avance pas : ' + roule);
    // panne injectée : deux images qui plantent ne doivent ni figer la boucle ni afficher l'écran d'erreur
    const survit = await pg.evaluate(`(async () => { const pe = window.__pe, o = pe.composer.render.bind(pe.composer); let k = 0;
      pe.composer.render = dt => { if (k++ < 2) throw new Error('panne injectée'); o(dt); }; await pe.render(5); pe.composer.render = o;
      return k >= 5 && !document.getElementById('loading').dataset.fatal; })()`);
    if (!survit) errors.push('[mobile] la boucle d\'image ne survit pas à une erreur passagère');
    if (!(vus[0] > 0 && vus[2] === vus[0])) errors.push(`[mobile] tuiles à la demande incohérentes après un aller-retour : ${vus}`);
  }
  await ctx.close();
}
await b.close(); srv.close();
if (sig) {
  if (update || !existsSync(REF)) { writeFileSync(REF, JSON.stringify(sig, null, 1) + '\n'); console.log('empreinte du monde écrite dans tools/world-signature.json'); }
  else { const ref = JSON.parse(readFileSync(REF, 'utf8'));
    for (const k of new Set([...Object.keys(ref), ...Object.keys(sig)])) if (JSON.stringify(ref[k]) !== JSON.stringify(sig[k])) errors.push(`le décor a changé : ${k} ${JSON.stringify(ref[k])} -> ${JSON.stringify(sig[k])}`); }
  console.log('monde :', Object.entries(sig).map(([k, v]) => k + ' ' + v.n).join(', '));
}
if (errors.length) { console.error('ÉCHEC\n' + errors.join('\n')); process.exit(1); }
console.log('OK : démarrage sans erreur dans les trois réglages, décor conforme à l\'empreinte');
