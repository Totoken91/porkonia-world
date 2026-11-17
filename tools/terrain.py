import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
"""Builds Porkonia's terrain, station layout and SCPB rail network for the train sim.
Outputs build/world.js (module ES : export default {...}) with base64 binary blobs."""
import json, base64, heapq, math
import numpy as np
from scipy import ndimage as ndi
from scipy.spatial import cKDTree

rng = np.random.default_rng(1212)
cls_img = np.load(ROOT + '/data/cls.npy')
IH, IW = cls_img.shape
NX, NZ = 385, 289          # vertices
WW, HH = 24000.0, 18000.0  # metres
CELL = WW / (NX - 1)       # 62.5 m

ii, jj = np.meshgrid(np.arange(NX), np.arange(NZ))
px = np.clip(np.round(ii / (NX - 1) * (IW - 1)).astype(int), 0, IW - 1)
py = np.clip(np.round(jj / (NZ - 1) * (IH - 1)).astype(int), 0, IH - 1)
cls = cls_img[py, px].astype(np.uint8)
# majority filter to clean speckles
def mode_filter(a, k=3):
    out = a.copy()
    counts = np.stack([ndi.uniform_filter((a == c).astype(float), k) for c in range(6)])
    return counts.argmax(0).astype(np.uint8)
cls = mode_filter(cls, 3)

sea = cls == 0
lake = cls == 5
land = ~sea

def noise(fx, fz, order=3):
    g = rng.random((fz, fx))
    z = ndi.zoom(g, (NZ / fz, NX / fx), order=order, mode='reflect')
    return z[:NZ, :NX] * 2 - 1

def fbm(oct=5, base=4):
    s = np.zeros((NZ, NX)); amp = 1; tot = 0
    for o in range(oct):
        f = base * 2 ** o
        s += amp * noise(int(f * 4 / 3) + 2, f + 2); tot += amp; amp *= 0.5
    return s / tot

n_low = fbm(4, 3)
n_mid = fbm(4, 8)
ridge = 1 - np.abs(fbm(5, 6)); ridge = ridge ** 2

dist_sea = ndi.distance_transform_edt(~sea)
dist_land = ndi.distance_transform_edt(sea)
hills = ndi.gaussian_filter((cls == 3).astype(float), 2.2)
snow = ndi.gaussian_filter((cls == 4).astype(float), 3.0)
snow_wide = ndi.gaussian_filter((cls == 4).astype(float), 9.0)
forest = ndi.gaussian_filter((cls == 2).astype(float), 2.0)

h = 4 + 46 * (1 - np.exp(-dist_sea / 14.0))
h += hills * (55 + 55 * (0.5 + 0.5 * n_mid))
h += snow ** 1.15 * (430 + 300 * ridge) + snow_wide * 140
h += forest * 10 + n_low * 14 + n_mid * 4
h = np.where(land, h, 0)
h = ndi.gaussian_filter(h, 0.9)
coast = land & (dist_sea < 2.5)
h = np.where(coast, np.minimum(h, 0.8 + (dist_sea - 1) * 3.5), h)
h = np.where(sea, -4 - 28 * np.minimum(1, dist_land / 7.0), h)

# lakes
lake_lab, nlakes = ndi.label(lake)
lake_levels = []
lake_id = np.zeros_like(cls)
for k in range(1, nlakes + 1):
    m = lake_lab == k
    if m.sum() < 4:
        cls[m] = 1; continue
    ring = ndi.binary_dilation(m, iterations=2) & ~m & land
    level = float(np.percentile(h[ring], 15)) - 1.0
    lid = len(lake_levels) + 1
    lake_levels.append(round(level, 2))
    lake_id[m] = lid
    d = ndi.distance_transform_edt(m)
    h[m] = level - 2.5 - np.minimum(9, d[m] * 2.5)
    ring1 = ndi.binary_dilation(m, iterations=1) & ~m
    h[ring1] = np.maximum(h[ring1], level + 0.7)
lake = lake_id > 0

def hsample(x, z):
    fi = (x / WW + 0.5) * (NX - 1); fj = (z / HH + 0.5) * (NZ - 1)
    fi = np.clip(fi, 0, NX - 1.001); fj = np.clip(fj, 0, NZ - 1.001)
    i0 = np.floor(fi).astype(int); j0 = np.floor(fj).astype(int)
    tx = fi - i0; tz = fj - j0
    a = h[j0, i0]; b = h[j0, i0 + 1]; c = h[j0 + 1, i0]; d = h[j0 + 1, i0 + 1]
    return a * (1 - tx) * (1 - tz) + b * tx * (1 - tz) + c * (1 - tx) * tz + d * tx * tz

def water_level(x, z):
    fi = np.clip(np.round((x / WW + 0.5) * (NX - 1)).astype(int), 0, NX - 1)
    fj = np.clip(np.round((z / HH + 0.5) * (NZ - 1)).astype(int), 0, NZ - 1)
    lid = lake_id[fj, fi]
    lv = np.array([0.0] + lake_levels)[lid]
    wet = sea[fj, fi] | (lid > 0)
    return np.where(wet, lv, -1e9)

# ---------------- stations
cities = json.load(open(ROOT + '/data/cities.json'))
names = list(cities.keys())
spos = {n: np.array([(u - 0.5) * WW, (v - 0.5) * HH]) for n, (u, v) in cities.items()}

EDGES = [["Nouvelle Groin", "Lard-sur-Mer"], ["Lard-sur-Mer", "Côte-Rib"], ["Côte-Rib", "Port-Cochon"], ["Lard-sur-Mer", "Bièreval"], ["Bièreval", "Saint-Jambon"], ["Saint-Jambon", "Val-Lardon"], ["Val-Lardon", "Biermont"], ["Biermont", "Douzi City"], ["Saint-Jambon", "Lardombre"], ["Lardombre", "Douzi City"], ["Lardombre", "Brassefort"], ["Brassefort", "Groin-des-Champs"], ["Truffe-sur-Neige", "Groinkbourg"], ["Groinkbourg", "Douzi City"], ["Groinkbourg", "Hamelot"], ["Hamelot", "Rôtiville"], ["Groinkbourg", "Saucissonnia"], ["Saucissonnia", "Rôtiville"], ["Saucissonnia", "Charcuta"], ["Charcuta", "Porcinia"], ["Rôtiville", "Porcheville"], ["Porcheville", "Douzi City"], ["Porcinia", "Belle-Côte"], ["Douzi City", "Groin-des-Champs"], ["Groin-des-Champs", "Salais-sur-Feu"], ["Salais-sur-Feu", "Belle-Côte"], ["Douzi City", "Jambonneau"], ["Jambonneau", "Verres-en-Vallée"], ["Verres-en-Vallée", "Fumeterre"], ["Fumeterre", "Saint-Grill"], ["Saint-Grill", "Lardonville"], ["Verres-en-Vallée", "Grasset Occidental"], ["Jambonneau", "Belle-Côte"], ["Jambonneau", "Lardanne"], ["Lardanne", "Belle-Côte"], ["Lardanne", "Porcalis"], ["Porcalis", "Grasset du Cap Goustru"], ["Grasset du Cap Goustru", "Belle-Côte"]]
for a, b in EDGES:
    assert a in spos and b in spos, (a, b)

nbrs = {n: [] for n in names}
for a, b in EDGES:
    nbrs[a].append(b); nbrs[b].append(a)

axis = {}
for n in names:
    ds = [(spos[m] - spos[n]) / np.linalg.norm(spos[m] - spos[n]) for m in nbrs[n]]
    if len(ds) == 1:
        axis[n] = ds[0]; continue
    best = None
    for deg in range(0, 180, 3):
        a = np.array([math.cos(math.radians(deg)), math.sin(math.radians(deg))])
        dots = [float(d @ a) for d in ds]
        pos = sum(1 for d in dots if d > 0); neg = len(dots) - pos
        if pos == 0 or neg == 0: continue
        score = sum(abs(d) for d in dots) - 0.35 * abs(pos - neg) - 0.6 * sum(1 for d in dots if abs(d) < 0.25)
        if best is None or score > best[0]:
            best = (score, a)
    axis[n] = best[1]

def station_y(p):
    xs = p[0] + np.linspace(-150, 150, 7); zs = p[1] + np.linspace(-150, 150, 7)
    X, Z = np.meshgrid(xs, zs)
    v = hsample(X.ravel(), Z.ravel())
    return float(max(np.median(v), 1.8))

sy = {n: station_y(spos[n]) for n in names}

# ---------------- A*
slope = np.hypot(*np.gradient(h, CELL))
cost = 1 + slope * 55 + np.maximum(0, h - 120) / 25 + (cls == 2) * 0.4
cost = np.where(sea, 70, cost)
cost = np.where(lake, 35, cost)

def to_cell(p):
    i = int(round((p[0] / WW + 0.5) * (NX - 1))); j = int(round((p[1] / HH + 0.5) * (NZ - 1)))
    return min(max(j, 0), NZ - 1), min(max(i, 0), NX - 1)

def to_world(c):
    j, i = c
    return np.array([(i / (NX - 1) - 0.5) * WW, (j / (NZ - 1) - 0.5) * HH])

MOVES = [(-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1), (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]
def astar(s, t):
    INF = 1e18
    g = np.full((NZ, NX), INF); g[s] = 0
    came = {}
    pq = [(0, s)]
    tj, ti = t
    while pq:
        f, c = heapq.heappop(pq)
        if c == t: break
        j, i = c
        gc = g[c]
        if f - math.hypot(j - tj, i - ti) > gc + 1e-6: continue
        for dj, di, w in MOVES:
            nj, ni = j + dj, i + di
            if not (0 <= nj < NZ and 0 <= ni < NX): continue
            ng = gc + w * 0.5 * (cost[j, i] + cost[nj, ni])
            if ng < g[nj, ni]:
                g[nj, ni] = ng; came[(nj, ni)] = c
                heapq.heappush(pq, (ng + math.hypot(nj - tj, ni - ti), (nj, ni)))
    path = [t]
    while path[-1] != s:
        path.append(came[path[-1]])
    return path[::-1]

def resample(pts, step):
    pts = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    keep = np.concatenate([[True], seg > 1e-6]); pts = pts[keep]
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    n = max(2, int(round(cum[-1] / step)) + 1)
    t = np.linspace(0, cum[-1], n)
    return np.stack([np.interp(t, cum, pts[:, 0]), np.interp(t, cum, pts[:, 1])], 1)

FIX = 240.0   # metres kept dead straight from each station
edges_out = []
all_track = []
paths = []
for a, b in EDGES:
    pa, pb = spos[a], spos[b]
    sa = 1 if (pb - pa) @ axis[a] > 0 else -1
    sb = 1 if (pa - pb) @ axis[b] > 0 else -1
    da, db = axis[a] * sa, axis[b] * sb
    s_cell = to_cell(pa + da * 480); t_cell = to_cell(pb + db * 480)
    path = astar(s_cell, t_cell)
    mid = [to_world(c) for c in path]
    mid = [m for m in mid if (m - pa) @ da > FIX + 160 and (m - pb) @ db > FIX + 160]
    raw = [pa, pa + da * 120, pa + da * FIX, pa + da * 360] + mid + [pb + db * 360, pb + db * FIX, pb + db * 120, pb]
    P = resample(raw, 10.0)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)])
    L = cum[-1]
    dend = np.minimum(cum, L - cum)
    w = np.clip((dend - FIX) / 420.0, 0, 1); w = w * w * (3 - 2 * w)
    for sigma in (22, 16, 11, 8):
        S = np.stack([ndi.gaussian_filter1d(P[:, 0], sigma, mode='nearest'), ndi.gaussian_filter1d(P[:, 1], sigma, mode='nearest')], 1)
        P = P * (1 - w[:, None]) + S * w[:, None]
    # re-impose straight station throats
    for k in range(len(P)):
        if cum[k] <= FIX: P[k] = pa + da * cum[k]
        elif L - cum[k] <= FIX: P[k] = pb + db * (L - cum[k])
    P = resample(P, 10.0)
    paths.append((a, b, sa, sb, P))


# =====================================================================
#  Partie fine : grille 2x, détails, érosion, lacs, gares, voies, AO
# =====================================================================
import gzip, time
t0 = time.time()
h_coarse = h.copy()

# ---- relax station heights (same rule as before)
G_ST = 0.032
for it in range(200):
    changed = False
    for a, b, sa, sb, P in paths:
        L = float(np.sum(np.linalg.norm(np.diff(P, axis=0), axis=1))) - 500
        lim = G_ST * max(L, 300)
        if sy[a] - sy[b] > lim: sy[a] = sy[b] + lim; changed = True
        elif sy[b] - sy[a] > lim: sy[b] = sy[a] + lim; changed = True
    if not changed: break

NXF, NZF = 769, 577
CF = WW / (NXF - 1)  # 31.25 m
iiF, jjF = np.meshgrid(np.arange(NXF), np.arange(NZF))
pxF = np.clip(np.round(iiF / (NXF - 1) * (IW - 1)).astype(int), 0, IW - 1)
pyF = np.clip(np.round(jjF / (NZF - 1) * (IH - 1)).astype(int), 0, IH - 1)
clsF = cls_img[pyF, pxF].astype(np.uint8)
counts = np.stack([ndi.uniform_filter((clsF == c).astype(float), 3) for c in range(6)])
clsF = counts.argmax(0).astype(np.uint8)

# upsample the coarse height (before lakes carving influence is fine) — bicubic
hF = ndi.zoom(h_coarse, (NZF / NZ, NXF / NX), order=3)[:NZF, :NXF]

def noiseF(fx, fz, order=3, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    g = r.random((fz, fx))
    z = ndi.zoom(g, (NZF / fz, NXF / fx), order=order, mode='reflect')
    return z[:NZF, :NXF] * 2 - 1

def fbmF(octs, base, seed):
    s = np.zeros((NZF, NXF)); amp = 1; tot = 0
    for o in range(octs):
        f = base * 2 ** o
        s += amp * noiseF(int(f * 4 / 3) + 2, f + 2, seed=seed + o); tot += amp; amp *= 0.5
    return s / tot

seaF = clsF == 0
landF = ~seaF
snowF = ndi.gaussian_filter((clsF == 4).astype(float), 5)
hillF = ndi.gaussian_filter((clsF == 3).astype(float), 4)
mount = np.clip(snowF * 1.4 + hillF * 0.35, 0, 1)
ridgeF = 1 - np.abs(fbmF(6, 10, 100)); ridgeF = ridgeF ** 2.2
detail = fbmF(5, 24, 200)
# pics plus spectaculaires + crêtes fines
hF += snowF ** 1.3 * (260 * ridgeF + 120)
rolling = fbmF(4, 6, 300)
hF += mount * (ridgeF - 0.35) * 70 + detail * (2.5 + mount * 16 + hillF * 8) + hillF * (ridgeF - 0.3) * 40 + rolling * 9 * landF
hF = np.where(landF, hF, hF)
print('fine base', time.time() - t0)

# ---- érosion hydraulique par gouttes (vectorisée)
def erode(H0, mask, n_drops=160000, batch=5000, steps=48):
    SC = 1.0
    H = H0.copy()
    r = np.random.default_rng(7)
    inertia, cap_k, min_slope, erode_k, dep_k, evap, grav = 0.1, 3.0, 0.01, 0.08, 0.2, 0.02, 2.0
    Hn, Wn = H.shape
    # tirer les gouttes surtout dans les zones montagneuses
    cand = np.argwhere(mask > 0.15)
    for b0 in range(0, n_drops, batch):
        idx = cand[r.integers(0, len(cand), batch)]
        y = idx[:, 0] + r.random(batch); x = idx[:, 1] + r.random(batch)
        dx = np.zeros(batch); dy = np.zeros(batch)
        speed = np.ones(batch); water = np.ones(batch); sed = np.zeros(batch)
        alive = np.ones(batch, bool)
        for s in range(steps):
            xi = np.clip(x.astype(int), 0, Wn - 2); yi = np.clip(y.astype(int), 0, Hn - 2)
            fx = x - xi; fy = y - yi
            h00 = H[yi, xi]; h10 = H[yi, xi + 1]; h01 = H[yi + 1, xi]; h11 = H[yi + 1, xi + 1]
            gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
            gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
            hcur = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            dx = dx * inertia - gx * (1 - inertia); dy = dy * inertia - gy * (1 - inertia)
            ln = np.hypot(dx, dy) + 1e-9; dx /= ln; dy /= ln
            nx_ = x + dx; ny_ = y + dy
            out = (nx_ < 0) | (nx_ >= Wn - 1) | (ny_ < 0) | (ny_ >= Hn - 1)
            alive &= ~out
            nxi = np.clip(nx_.astype(int), 0, Wn - 2); nyi = np.clip(ny_.astype(int), 0, Hn - 2)
            nfx = nx_ - nxi; nfy = ny_ - nyi
            hn = (H[nyi, nxi] * (1 - nfx) * (1 - nfy) + H[nyi, nxi + 1] * nfx * (1 - nfy) + H[nyi + 1, nxi] * (1 - nfx) * nfy + H[nyi + 1, nxi + 1] * nfx * nfy)
            dh = hn - hcur
            slope = -dh / CF
            cap = np.maximum(slope, min_slope) * speed * water * cap_k
            dep = np.where((sed > cap) | (dh > 0), np.where(dh > 0, np.minimum(dh, sed), (sed - cap) * dep_k), 0.0)
            ero = np.where((sed <= cap) & (dh <= 0), np.minimum((cap - sed) * erode_k, -dh * 0.3), 0.0)
            amt = (dep - ero) * alive
            sed = sed - dep + ero
            for (oy, ox, w) in ((0, 0, (1 - fx) * (1 - fy)), (0, 1, fx * (1 - fy)), (1, 0, (1 - fx) * fy), (1, 1, fx * fy)):
                np.add.at(H, (yi + oy, xi + ox), amt * w)
            speed = np.clip(np.sqrt(np.maximum(speed * speed + slope * grav, 0.0001)), 0, 3)
            water *= (1 - evap)
            x, y = nx_, ny_
            if not alive.any(): break
    return H * SC

mask_er = np.clip(mount * 1.2, 0, 1) * landF
hE = erode(hF, mask_er)
hE = hF + np.clip(ndi.gaussian_filter(hE - hF, 0.9), -70, 35)
blend = ndi.gaussian_filter(mask_er, 3)
hF = hF * (1 - blend) + hE * blend
hF = ndi.gaussian_filter(hF, 0.6) * 0.35 + hF * 0.65
print('erosion', time.time() - t0)

# ---- côtes et mer
dist_seaF = ndi.distance_transform_edt(~seaF)
dist_landF = ndi.distance_transform_edt(seaF)
coastF = landF & (dist_seaF < 14)
hF = np.where(coastF, np.minimum(hF, 0.6 + (dist_seaF - 1) * 2.2 + np.maximum(0, dist_seaF - 2) ** 2 * 3.5 + detail * 0.6), hF)
hF = np.where(seaF, -2.5 - 30 * np.minimum(1, dist_landF / 16.0) + detail * 1.5, hF)

# ---- lacs (niveaux recalculés sur la grille fine)
lakeF = clsF == 5
lab, nl = ndi.label(lakeF)
lake_levels = []
lake_idF = np.zeros_like(clsF)
for k in range(1, nl + 1):
    m = lab == k
    if m.sum() < 12:
        clsF[m] = 1; continue
    ring = ndi.binary_dilation(m, iterations=3) & ~m & landF
    level = float(np.percentile(hF[ring], 12)) - 0.6
    lid = len(lake_levels) + 1
    lake_levels.append(round(level, 2)); lake_idF[m] = lid
    d = ndi.distance_transform_edt(m)
    hF[m] = level - 1.2 - np.minimum(12, d[m] * 1.6)
    ring1 = ndi.binary_dilation(m, iterations=1) & ~m
    hF[ring1] = np.maximum(hF[ring1], level + 0.5)
lakeF = lake_idF > 0

def hsF(x, z, H=None):
    H = hF if H is None else H
    fi = np.clip((x / WW + 0.5) * (NXF - 1), 0, NXF - 1.001); fj = np.clip((z / HH + 0.5) * (NZF - 1), 0, NZF - 1.001)
    i0 = np.floor(fi).astype(int); j0 = np.floor(fj).astype(int); tx = fi - i0; tz = fj - j0
    return H[j0, i0] * (1 - tx) * (1 - tz) + H[j0, i0 + 1] * tx * (1 - tz) + H[j0 + 1, i0] * (1 - tx) * tz + H[j0 + 1, i0 + 1] * tx * tz

def wlF(x, z):
    fi = np.clip(np.round((x / WW + 0.5) * (NXF - 1)).astype(int), 0, NXF - 1)
    fj = np.clip(np.round((z / HH + 0.5) * (NZF - 1)).astype(int), 0, NZF - 1)
    lid = lake_idF[fj, fi]
    lv = np.array([0.0] + lake_levels)[lid]
    wet = seaF[fj, fi] | (lid > 0)
    return np.where(wet, lv, -1e9)

# ---- cuvettes / cols autour des gares en hauteur
VXF = (iiF / (NXF - 1) - 0.5) * WW; VZF = (jjF / (NZF - 1) - 0.5) * HH
for n in names:
    dd = np.hypot(VXF - spos[n][0], VZF - spos[n][1])
    f = np.clip(1 - dd / 1400.0, 0, 1) ** 1.4
    over = np.maximum(hF - (sy[n] + 2), 0)
    hF = hF - over * f
print('stations bowls', time.time() - t0)

# ---- profils de voie sur la grille fine
edges_out = []; all_track = []
for a, b, sa, sb, P in paths:
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1); cum = np.concatenate([[0], np.cumsum(seg)]); L = cum[-1]
    tang = np.gradient(P, axis=0); tang /= np.linalg.norm(tang, axis=1)[:, None] + 1e-9
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
    env = np.maximum.reduce([hsF(*(P + nrm * o).T) for o in (-14, -6, 0, 6, 14)])
    wl = wlF(*P.T)
    y0 = np.maximum(env, np.where(wl > -1e8, wl + 9, -1e9))
    y = y0.copy()
    for it in range(5):
        y = ndi.gaussian_filter1d(np.maximum(y, y0 - 3.5), 22, mode='nearest')
    y = np.maximum(y, np.where(wl > -1e8, wl + 7, -1e9))
    dend = np.minimum(cum, L - cum)
    ya = sy[a]; yb = sy[b]
    ystat = np.where(cum < L / 2, ya, yb)
    bw = np.clip((dend - 250) / 450.0, 0, 1); bw = bw * bw * (3 - 2 * bw)
    y = ystat * (1 - bw) + y * bw
    GR = 0.042
    ca = np.maximum(0, cum - 250); cb = np.maximum(0, L - cum - 250)
    lo = np.maximum(ya - GR * ca, yb - GR * cb); hi = np.minimum(ya + GR * ca, yb + GR * cb)
    y = np.clip(y, lo, hi)
    ds = np.diff(cum)
    for k in range(1, len(y)): y[k] = np.clip(y[k], y[k - 1] - GR * ds[k - 1], y[k - 1] + GR * ds[k - 1])
    for k in range(len(y) - 2, -1, -1): y[k] = np.clip(y[k], y[k + 1] - GR * ds[k], y[k + 1] + GR * ds[k])
    y[dend < 250] = ystat[dend < 250]
    y = ndi.gaussian_filter1d(y, 5, mode='nearest')
    y[dend < 200] = ystat[dend < 200]
    edges_out.append(dict(a=names.index(a), b=names.index(b), sa=sa, sb=sb, P=P, y=y, L=L))
    all_track.append(np.column_stack([P, y]))

T = np.vstack(all_track)
tree = cKDTree(T[:, :2])
V = np.column_stack([VXF.ravel(), VZF.ravel()])
d, idx = tree.query(V, distance_upper_bound=110)
ok = np.isfinite(d)
hf = hF.ravel().copy()
ty = T[np.minimum(idx, len(T) - 1), 2]
allowed = ty - 1.2 + np.maximum(0, d - 7) * 0.75
depth = hf - ty
cut = ok & (depth < 28)
hf[cut] = np.minimum(hf[cut], allowed[cut])
# léger remblai : rapprocher le terrain bas de la voie sur les bords immédiats
fill = ok & (d < 22) & (hf < ty - 2)
hf[fill] = hf[fill] + (ty[fill] - 2 - hf[fill]) * np.clip(1 - (d[fill] - 6) / 16, 0, 1) * 0.85
hF = hf.reshape(NZF, NXF)
for n in names:
    p = spos[n]; ax = axis[n]; nm = np.array([-ax[1], ax[0]])
    rel = V - p
    al = np.abs(rel @ ax); ac = np.abs(rel @ nm)
    t = np.clip(np.maximum((al - 240) / 160, (ac - 70) / 130), 0, 1)
    near = t < 1
    hf = hF.ravel()
    target = sy[n] - 0.35
    blendw = (1 - t) ** 2
    hf[near] = hf[near] * (1 - blendw[near]) + target * blendw[near]
    hF = hf.reshape(NZF, NXF)
print('tracks carved', time.time() - t0)

# ---- occlusion ambiante (horizon, 8 directions)
def shifted(A, dy, dx):
    out = np.empty_like(A)
    ys = slice(max(dy, 0), A.shape[0] + min(dy, 0)); yd = slice(max(-dy, 0), A.shape[0] + min(-dy, 0))
    xs = slice(max(dx, 0), A.shape[1] + min(dx, 0)); xd = slice(max(-dx, 0), A.shape[1] + min(-dx, 0))
    out[:] = A
    out[yd, xd] = A[ys, xs]
    return out
Hl = np.maximum(hF, 0)
occ = np.zeros_like(Hl)
dirs = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0), (-1, 1)]
for dy, dx in dirs:
    best = np.zeros_like(Hl)
    for st in (1, 2, 4, 7, 12, 20, 34, 56):
        dist = st * CF * np.hypot(dy, dx)
        best = np.maximum(best, (shifted(Hl, dy * st, dx * st) - Hl) / dist)
    occ += np.sin(np.arctan(best))
ao = np.clip(1 - occ / len(dirs) * 1.25, 0, 1)
ao = ndi.gaussian_filter(ao, 0.8)
print('ao', time.time() - t0)

# ---- export
def b64gz(a):
    return base64.b64encode(gzip.compress(np.ascontiguousarray(a).tobytes(), 9)).decode()
heights = np.clip(np.round(hF * 10), -32000, 32000).astype('<i2')
packed = (clsF | (lake_idF.astype(np.uint8) << 3)).astype(np.uint8)
stations = []
for k, n in enumerate(names):
    stations.append(dict(name=n, x=round(float(spos[n][0]), 1), z=round(float(spos[n][1]), 1), y=round(sy[n], 2),
                         ax=round(float(math.atan2(axis[n][1], axis[n][0])), 4), u=cities[n][0], v=cities[n][1]))
edges_js = []
for e in edges_out:
    P = e['P'][::2]; yv = e['y'][::2]
    if not np.allclose(P[-1], e['P'][-1]):
        P = np.vstack([P, e['P'][-1]]); yv = np.append(yv, e['y'][-1])
    edges_js.append(dict(a=e['a'], b=e['b'], sa=e['sa'], sb=e['sb'],
                         x=base64.b64encode(np.round(P[:, 0] * 4).astype('<i4').tobytes()).decode(),
                         z=base64.b64encode(np.round(P[:, 1] * 4).astype('<i4').tobytes()).decode(),
                         y=base64.b64encode(np.round(yv * 20).astype('<i4').tobytes()).decode()))
world = dict(NX=NXF, NZ=NZF, W=WW, H=HH, gz=True, heights=b64gz(heights), cls=b64gz(packed), ao=b64gz(np.round(ao * 255).astype(np.uint8)),
             lakes=lake_levels, stations=stations, edges=edges_js)
open(ROOT + '/data/world2.js', 'w').write('export default ' + json.dumps(world, ensure_ascii=False, separators=(',', ':')) + ';\n')
np.save(ROOT + '/data/hF.npy', hF); np.save(ROOT + '/data/aoF.npy', ao)
print('size KB', len(open(ROOT + '/data/world2.js').read()) // 1024, 'h range', hF.min(), hF.max(), 'lakes', lake_levels, 'total', time.time() - t0)
