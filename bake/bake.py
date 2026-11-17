import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import numpy as np, subprocess, struct, gzip, base64, json, io
from skimage import measure
import fast_simplification
from PIL import Image
H = 0.008; TARGET = 3000
out = []; blob = bytearray()
for v in range(6):
    p = subprocess.run(['./cz', 'grid', str(v), str(H)], capture_output=True)
    nx, ny, nz = map(int, p.stderr.split())
    g = np.frombuffer(p.stdout, np.float32).reshape(nx, ny, nz).copy()
    verts, faces, _, _ = measure.marching_cubes(g, 0.0, spacing=(H, H, H))
    verts += np.array([-0.65, -0.1, -0.5], np.float32)
    red = 1 - TARGET / len(faces)
    v2, f2 = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=float(red), agg=5)
    r = subprocess.run(['./cz', 'pts', str(v)], input=v2.astype(np.float32).tobytes(), capture_output=True)
    a = np.frombuffer(r.stdout, np.float32).reshape(-1, 8)
    # provoking vertex (dernier sommet en WebGL) : réordonner chaque triangle pour que son dernier sommet porte la matière majoritaire
    slot = a[:, 3].astype(int); f3 = f2.copy()
    for i, (x, y, z) in enumerate(f2):
        s = [slot[x], slot[y], slot[z]]; maj = max(set(s), key=s.count); k = s.index(maj) if s.count(maj) < 3 else 2
        f3[i] = [(x, y, z)[(k + 1) % 3], (x, y, z)[(k + 2) % 3], (x, y, z)[k]]
    pos = np.clip(np.round(v2 / 2.0 * 32767), -32767, 32767).astype('<i2')
    nor = np.clip(np.round(a[:, :3] * 127), -127, 127).astype(np.int8)
    misc = np.stack([a[:, 3], a[:, 4], np.round(a[:, 5] * 255)], 1).astype(np.uint8)
    idx = f3.astype('<u2')
    out.append({'nv': len(v2), 'nf': len(f3), 'off': len(blob)})
    for arr in (pos, nor, misc, idx): blob += arr.tobytes(); blob += b'\0' * ((-len(blob)) % 2)
    print(v, len(verts), len(faces), '->', len(v2), len(f3), 'slots', np.bincount(slot), 'ymax', v2[:, 1].max())
    # textures du visage : A (peau noire) et B = (peau blanche - A)
    A = np.frombuffer(subprocess.run(['./cz', 'head', str(v), '0'], capture_output=True).stdout, np.float32).reshape(512, 512, 3)
    W1 = np.frombuffer(subprocess.run(['./cz', 'head', str(v), '1'], capture_output=True).stdout, np.float32).reshape(512, 512, 3)
    B = np.clip(W1 - A, 0, 1)
    enc = lambda x: Image.fromarray((np.clip(x, 0, 1) ** (1 / 2.2) * 255 + 0.5).astype(np.uint8))
    im = Image.new('RGB', (1024, 512)); im.paste(enc(A), (0, 0)); im.paste(enc(B), (512, 0))
    im.save(f'head{v}.png'); out[-1]['head'] = f'head{v}.png'
    if v == 0: Image.fromarray((np.clip(A + B * np.array([0.92, 0.37, 0.38]), 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)).save('head_preview.png')
# le porc de marche (porc4.h)
p = subprocess.run(['./cz', 'p4grid', '0.016'], capture_output=True); nx, ny, nz = map(int, p.stderr.split())
g = np.frombuffer(p.stdout, np.float32).reshape(nx, ny, nz).copy()
verts, faces, _, _ = measure.marching_cubes(g, 0.0, spacing=(0.016,) * 3); verts += np.array([-1.0, -0.1, -1.5], np.float32)
v2, f2 = fast_simplification.simplify(verts.astype(np.float32), faces.astype(np.int32), target_reduction=float(1 - 1700 / len(faces)), agg=4)
a = np.frombuffer(subprocess.run(['./cz', 'p4pts'], input=v2.astype(np.float32).tobytes(), capture_output=True).stdout, np.float32).reshape(-1, 8)
slot = a[:, 3].astype(int); f3 = f2.copy()
for i, (x, y, z) in enumerate(f2):
    s = [slot[x], slot[y], slot[z]]; maj = max(set(s), key=s.count); k = s.index(maj) if s.count(maj) < 3 else 2
    f3[i] = [(x, y, z)[(k + 1) % 3], (x, y, z)[(k + 2) % 3], (x, y, z)[k]]
porc = {'nv': len(v2), 'nf': len(f3), 'off': len(blob)}
for arr in (np.clip(np.round(v2 / 2.0 * 32767), -32767, 32767).astype('<i2'), np.clip(np.round(a[:, :3] * 127), -127, 127).astype(np.int8), np.stack([a[:, 3], a[:, 4], np.round(a[:, 5] * 255)], 1).astype(np.uint8), f3.astype('<u2')): blob += arr.tobytes(); blob += b'\0' * ((-len(blob)) % 2)
print('porc', len(v2), len(f3), np.bincount(slot))
hipy = 0.060 + 0.285 * 0.97
meta = {'variants': out, 'hipy': hipy, 'porc': porc}
heads = []
for o in out:
    b = io.BytesIO(); Image.open(o['head']).save(b, 'PNG', optimize=True); heads.append('data:image/png;base64,' + base64.b64encode(b.getvalue()).decode()); o.pop('head')
js = 'export default ' + json.dumps({'meta': meta, 'geo': base64.b64encode(gzip.compress(bytes(blob), 9)).decode(), 'heads': heads}) + ';\n'
open(ROOT + '/data/cz.js', 'w').write(js); print('cz.js', len(js) // 1024, 'KB', 'heads', sum(len(h) for h in heads) // 1024)
