// Captures et profilage sans écran (Chrome sans carte graphique, rendu logiciel).
//   node tools/shot.mjs <ultra|haute|mobile> <préfixe> <L> <H> "js1||js2" [prof]
// Sert dist/ sur un port local, ouvre la page avec ?pause, exécute chaque expression, rend deux images et
// enregistre <préfixe>_<i>.png. Avec un sixième argument, affiche triangles et appels de dessin.
// Variables d'environnement :
//   SHOT_URL=http://…   viser une page déjà servie (une autre version, par exemple) au lieu de dist/
//   SHOT_FIXE=1         horloge et hasard figés, messages éphémères masqués : deux captures de la même scène
//                       sont identiques au pixel près (comparer avec tools/diff.py)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveDist, CHROME_ARGS, blockNetwork } from './serve.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const [q, out, W, H, js, prof] = process.argv.slice(2);
if (!js) { console.error('usage : node tools/shot.mjs <ultra|haute|mobile> <préfixe> <L> <H> "js1||js2" [prof]'); process.exit(1); }

// Mode figé. Horloge : chaque image avance de 1/60 s, quel que soit le temps réel. Hasard : même graine au début de
// chaque image et de chaque expression, car three.js tire au hasard l'identifiant de tout objet créé ; sans cela, le
// nombre d'objets fabriqués avant une capture décalerait la position des habitants. Messages éphémères masqués.
const FIXE = `(() => { let t = 1000, s = 12345;
  performance.now = () => t;
  Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let r = Math.imul(s ^ s >>> 15, 1 | s); r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r; return ((r ^ r >>> 14) >>> 0) / 4294967296; };
  const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => raf(() => { t += 1000 / 60; s = 12345; cb(t); });
  window.__shotGraine = () => { s = 12345; };
  window.__shotSaut = () => { t += 1000; };   // avant chaque capture : la première image avance toujours du pas maximal
  addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '#toasts,#ticker,#title,#loading{display:none!important}'; document.head.appendChild(st); }); })();`;

const srv = process.env.SHOT_URL ? null : await serveDist();
const base = process.env.SHOT_URL || srv.url;
const b = await chromium.launch({ args: CHROME_ARGS });
const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1 });
await ctx.addInitScript(`try{localStorage.setItem('porkonia-q3','${q}')}catch(e){}` + (process.env.SHOT_FIXE ? FIXE : ''));
const pg = await ctx.newPage(); pg.setDefaultTimeout(1200000);
pg.on('pageerror', e => console.log('ERR', e.message, (e.stack || '').slice(0, 900)));
pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 300)); });
await blockNetwork(pg);
const t0 = Date.now();
await pg.goto(base + (base.includes('?') ? '&' : '?') + 'pause');
await pg.waitForFunction('!!(window.__pe && window.__pe.render)', null, { timeout: 1200000, polling: 500 });
await pg.evaluate("document.getElementById('title').classList.add('gone'); window.pe = window.__pe; 1");
await pg.evaluate(readFileSync(join(ROOT, 'tools/aer.js'), 'utf8')); await pg.evaluate(readFileSync(join(ROOT, 'tools/prof.js'), 'utf8'));
let i = 0;
for (const part of js.split('||')) {
  await pg.evaluate('window.__shotGraine && window.__shotGraine()');
  const r = await pg.evaluate(part);
  await pg.evaluate('window.__shotSaut && window.__shotSaut(); window.__pe.render(2)');
  await pg.screenshot({ path: `${out}_${i}.png` }); console.log('shot', i, r, Math.round((Date.now() - t0) / 1000));
  if (prof) console.log(await pg.evaluate('prof()'));
  i++;
}
await b.close(); srv?.close();
