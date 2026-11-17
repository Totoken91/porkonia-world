// Commun aux outils sans écran : petit serveur de dist/, options de Chrome en rendu logiciel, coupure du réseau.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const CHROME_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

export async function serveDist() {
  if (!existsSync(join(ROOT, 'dist/index.html'))) { console.error('dist/ absent : lancer `npm run build` d\'abord'); process.exit(1); }
  const srv = createServer(async (req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\]|\.\.)+/, '');
    const file = p || 'index.html';
    try { const buf = await readFile(join(ROOT, 'dist', file)); res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }); res.end(buf); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() };
}
// ni réseau ni polices ; three.js vient de node_modules pour les anciennes pages qui le chargeaient d'un CDN
export const blockNetwork = pg => pg.route('**/*', r => { const u = r.request().url();
  if (u.includes('three@0.160.0/')) return r.fulfill({ path: join(ROOT, 'node_modules/three', u.split('three@0.160.0/')[1]), contentType: 'application/javascript' });
  if (u.includes('fonts.g')) return r.fulfill({ body: '', contentType: 'text/css' });
  return r.continue(); });
