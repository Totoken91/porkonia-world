import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import numpy as np, sys
def rbox(p, c, b, r):
    q = np.abs(p - np.array(c)) - (np.array(b) - r)
    return np.linalg.norm(np.maximum(q, 0), axis=-1) + np.minimum(q.max(-1), 0) - r
def smin(a, b, k): h = np.maximum(k - np.abs(a - b), 0) / k; return np.minimum(a, b) - h * h * k * 0.25
def smax(a, b, k): return -smin(-a, -b, k)
def cylx(p, c, r, hw, rd=0.0):
    d1 = np.hypot(p[..., 1] - c[1], p[..., 2] - c[2]) - (r - rd); d2 = np.abs(p[..., 0] - c[0]) - (hw - rd)
    return np.minimum(np.maximum(d1, d2), 0) + np.hypot(np.maximum(d1, 0), np.maximum(d2, 0)) - rd
def ell(p, c, r):
    q = (p - np.array(c)); r = np.array(r); k0 = np.linalg.norm(q / r, axis=-1); k1 = np.linalg.norm(q / (r ** 2), axis=-1); return k0 * (k0 - 1) / (k1 + 1e-6)
WZ = [1.22, -1.18]; WR = 0.36
def field(p):
    x, y, z = p[..., 0], p[..., 1], p[..., 2]; ax = np.abs(x)
    pm = np.stack([ax, y, z], -1)
    # caisse : coque basse bien ronde, plus étroite aux extrémités
    body = rbox(p, [0, 0.64, 0.0], [0.82, 0.25, 1.92], 0.22)
    body = smax(body, ax - (0.83 - 0.10 * np.clip((np.abs(z) - 1.1) / 0.85, 0, 1) ** 2), 0.08)
    body = smax(body, y - (0.90 - 0.10 * np.clip((z - 0.55) / 1.4, 0, 1) ** 1.5 - 0.05 * np.clip((-z - 1.1) / 0.8, 0, 1)), 0.06)   # capot plongeant, coffre
    # habitacle en bulle
    cab = rbox(p, [0, 1.15, -0.28], [0.72, 0.39, 0.98], 0.30)
    cab = smax(cab, (z - 0.62) * 0.74 + (y - 0.92) * 0.67 - 0.0, 0.08)        # pare-brise incliné
    cab = smax(cab, (-z - 1.22) * 0.86 + (y - 0.92) * 0.50 - 0.0, 0.08)       # lunette
    cab = smax(cab, ax - (0.74 - 0.20 * np.clip((y - 0.95) / 0.5, 0, 1)), 0.06)   # flancs rentrants
    d = smin(body, cab, 0.07)
    # ailes galbées autour des roues
    for wz in WZ:
        fl = ell(pm, [0.73, 0.50, wz], [0.20, 0.37, 0.52]); d = smin(d, np.maximum(fl, 0.34 - y), 0.10)
    for wz in WZ: d = np.maximum(d, -cylx(pm, [0.90, WR, wz], WR + 0.075, 0.26))
    d = np.maximum(d, 0.26 - y)
    mat = np.zeros(d.shape, np.int8)
    def un(e, m):
        nonlocal d, mat
        k = e < d; d = np.where(k, e, d); mat = np.where(k, m, mat)
    for wz in WZ:
        un(cylx(pm, [0.75, WR, wz], WR, 0.125, 0.07), 2)
        un(cylx(pm, [0.865, WR, wz], 0.215, 0.03, 0.02), 3)
        un(ell(pm, [0.89, WR, wz], [0.03, 0.09, 0.09]), 6)
    un(rbox(pm, [0, 0.43, 1.93], [0.78, 0.08, 0.09], 0.06), 3); un(rbox(pm, [0, 0.43, -1.93], [0.78, 0.08, 0.09], 0.06), 3)
    un(ell(pm, [0.52, 0.70, 1.86], [0.17, 0.17, 0.10]), 4)                 # phares ronds
    un(ell(pm, [0.52, 0.70, 1.845], [0.205, 0.205, 0.07]), 3)              # cerclage chromé
    un(rbox(pm, [0.56, 0.74, -1.90], [0.17, 0.07, 0.05], 0.035), 5)        # feux arrière
    un(rbox(pm, [0, 0.66, 1.90], [0.24, 0.07, 0.04], 0.03), 6)             # calandre
    un(smin(ell(pm, [0.80, 1.02, 0.56], [0.06, 0.07, 0.11]), ell(pm, [0.74, 0.98, 0.50], [0.05, 0.03, 0.04]), 0.03), 0)   # rétroviseurs
    return d, mat
PAL = {0: (0.80, 0.10, 0.14), 1: (0.10, 0.2, 0.32), 2: (0.04, 0.04, 0.045), 3: (0.85, 0.85, 0.88), 4: (1.0, 0.95, 0.75), 5: (0.9, 0.1, 0.06), 6: (0.05, 0.05, 0.06)}
def glass(p, n, mat):
    x, y, z = p[..., 0], p[..., 1], p[..., 2]
    band = (mat == 0) & (y > 1.0) & (y < 1.43)
    side = band & (np.abs(n[..., 0]) > 0.5) & (z < 0.42) & (z > -0.98) & ~((z > -0.34) & (z < -0.25))
    front = band & (n[..., 2] > 0.3) & (np.abs(x) < 0.60) & (z > 0.3); back = band & (n[..., 2] < -0.3) & (np.abs(x) < 0.58) & (z < -0.95)
    return side | front | back
if __name__ == '__main__' and sys.argv[1] == 'view':
    from PIL import Image
    W, Hh = 520, 300; ims = []
    for cam, tgt in [((4.2, 2.2, 4.6), (0, 0.7, 0)), ((-4.6, 1.6, -3.4), (0, 0.7, 0)), ((6.5, 0.9, 0.0), (0, 0.75, 0))]:
        cam = np.array(cam, float); f = np.array(tgt) - cam; f /= np.linalg.norm(f); r = np.cross([0, 1, 0], f); r /= np.linalg.norm(r); u = np.cross(f, r)
        px, py = np.meshgrid((np.arange(W) + 0.5) / W * 2 - 1, 1 - (np.arange(Hh) + 0.5) / Hh * 2)
        rd = f * 2.6 + r * px[..., None] * W / Hh * -1 + u * py[..., None]; rd /= np.linalg.norm(rd, axis=-1, keepdims=True)
        t = np.full((Hh, W), 2.0); hit = np.zeros((Hh, W), bool)
        for i in range(90):
            dd, _ = field(cam + rd * t[..., None]); dd = np.minimum(dd, cam[1] + rd[..., 1] * t + 0.0)
            hit |= dd < 0.002; t = np.where(hit, t, t + dd * 0.9)
        P = cam + rd * t[..., None]; e = 0.003
        n = np.stack([field(P + np.array(o) * e)[0] - field(P - np.array(o) * e)[0] for o in ([1, 0, 0], [0, 1, 0], [0, 0, 1])], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
        _, m = field(P); g = glass(P, n, m); m = np.where(g, 1, m)
        col = np.array([PAL[k] for k in range(7)])[m]
        L = np.array([0.5, 0.8, 0.35]); L /= np.linalg.norm(L)
        ground = P[..., 1] < 0.004
        sh = 0.35 + 0.75 * np.clip((n * L).sum(-1), 0, 1) + 0.25 * np.clip((n * (L + -rd) / np.linalg.norm(L - rd, axis=-1, keepdims=True)).sum(-1), 0, 1) ** 30
        img = col * sh[..., None]; img[ground] = (0.45, 0.47, 0.5); img[~hit] = (0.6, 0.78, 0.95)
        ims.append((np.clip(img, 0, 1) ** 0.45 * 255).astype(np.uint8))
    Image.fromarray(np.concatenate(ims, 1)).save(ROOT + '/bake/car_view.png')

if __name__ == '__main__' and sys.argv[1] == 'mesh':
    import gzip, base64, json
    from skimage import measure
    import fast_simplification
    H = 0.0125
    xs = np.arange(-1.0, 1.001, H); ys = np.arange(-0.03, 1.66, H); zs = np.arange(-2.15, 2.151, H)
    d = np.concatenate([field(np.stack(np.meshgrid(xs[i:i + 6], ys, zs, indexing='ij'), -1))[0] for i in range(0, len(xs), 6)], 0)
    v, f, _, _ = measure.marching_cubes(d.astype(np.float32), 0.0, spacing=(H, H, H)); v += np.array([xs[0], ys[0], zs[0]], np.float32)
    out = {}; blob = bytearray()
    for name, target, agg in (('hi', 18000, 3), ('lo', 2300, 5)):
        v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32), target_reduction=float(1 - target / len(f)), agg=agg)
        e = 0.004
        n = np.stack([field(v2 + np.array(o) * e)[0] - field(v2 - np.array(o) * e)[0] for o in ([1, 0, 0], [0, 1, 0], [0, 0, 1])], 1); n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
        slot = field(v2)[1].astype(int); f3 = f2.copy()
        for i, (a, b, c) in enumerate(f2):
            s_ = [slot[a], slot[b], slot[c]]; maj = max(set(s_), key=s_.count); k = s_.index(maj) if s_.count(maj) < 3 else 2
            f3[i] = [(a, b, c)[(k + 1) % 3], (a, b, c)[(k + 2) % 3], (a, b, c)[k]]
        out[name] = {'nv': len(v2), 'nf': len(f3), 'off': len(blob)}
        for arr in (np.round(v2 / 4.0 * 32767).astype('<i2'), np.round(n * 127).astype(np.int8), np.stack([slot, slot * 0, slot * 0], 1).astype(np.uint8), f3.astype('<u2')): blob += arr.tobytes(); blob += b'\0' * ((-len(blob)) % 2)
        print(name, len(v2), len(f3), np.bincount(slot))
    out['geo'] = base64.b64encode(gzip.compress(bytes(blob), 9)).decode()
    js = 'export default ' + json.dumps(out) + ';\n'; open(ROOT + '/data/car.js', 'w').write(js); print(len(js) // 1024, 'KB')
