"""Compare deux séries de captures : python3 tools/diff.py <dossierA> <dossierB> [dossierEcarts]
Affiche pour chaque image le nombre de pixels différents et l'écart maximal ; code de sortie 1 s'il y en a."""
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else None
bad = 0
for f in sorted(os.listdir(a)):
    if not f.endswith('.png'): continue
    if not os.path.exists(os.path.join(b, f)): print(f, 'ABSENT'); bad += 1; continue
    A, B = Image.open(os.path.join(a, f)).convert('RGB'), Image.open(os.path.join(b, f)).convert('RGB')
    if A.size != B.size: print(f, 'TAILLES', A.size, B.size); bad += 1; continue
    d = ImageChops.difference(A, B); bbox = d.getbbox()
    if not bbox: print(f, 'identique'); continue
    g = d.convert('L'); n = sum(1 for v in g.getdata() if v); mx = max(max(band.getextrema()) for band in d.split())
    print(f, n, 'pixels différents (%.3f %%)' % (100.0 * n / (A.size[0] * A.size[1])), 'écart max', mx, 'zone', bbox); bad += 1
    if out: os.makedirs(out, exist_ok=True); g.point(lambda v: 255 if v else 0).save(os.path.join(out, f))
sys.exit(1 if bad else 0)
