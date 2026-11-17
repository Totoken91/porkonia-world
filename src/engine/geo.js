// Géométrie : matrices, gabarits, assemblage de maillages colorés
import * as THREE from 'three';

// ---------- kit de modélisation multi-matériaux
export const TPL = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 12, 1).toNonIndexed(),
  cyl24: new THREE.CylinderGeometry(0.5, 0.5, 1, 24, 1).toNonIndexed(),
  cyl6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1).toNonIndexed(),
  tcone: new THREE.CylinderGeometry(0.3, 0.5, 1, 10, 1).toNonIndexed(),
  cone: new THREE.ConeGeometry(0.5, 1, 12, 1).toNonIndexed(),
  sph: new THREE.SphereGeometry(0.5, 16, 12).toNonIndexed(),
  hemi: new THREE.SphereGeometry(0.5, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed(),
  torus: new THREE.TorusGeometry(0.5, 0.08, 6, 16).toNonIndexed(),
  ico: new THREE.IcosahedronGeometry(0.5, 1),
  ring: new THREE.TorusGeometry(0.5, 0.009, 6, 40, Math.PI).toNonIndexed(),
  roof: (() => {
    const p = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, 0.5, 0, 0.5, -0.5, 0, 0.5, 0, 1, 0.5,
      -0.5, 0, 0.5, -0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0, 1, -0.5, 0, 1, 0.5,
      0.5, 0, -0.5, 0.5, 0, 0.5, 0, 1, 0.5, 0.5, 0, -0.5, 0, 1, 0.5, 0, 1, -0.5];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
    const uv = []; for (let i = 0; i < p.length; i += 3) uv.push(p[i] + 0.5, p[i + 1] + p[i + 2]); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
  })(),
};
const _n3 = new THREE.Matrix3(), _vv = new THREE.Vector3();
export function M(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')); return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz)); }
const _mq = new THREE.Quaternion(), _me = new THREE.Euler(), _mp = new THREE.Vector3(), _ms = new THREE.Vector3();
export function Mset(out, x, y, z, sx, sy, sz, ry = 0) { _me.set(0, ry, 0); _mq.setFromEuler(_me); return out.compose(_mp.set(x, y, z), _mq, _ms.set(sx, sy, sz)); }
const LINC = new Map();
export function linCol(c) { const k = c.join(','); let v = LINC.get(k); if (!v) { const col = new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); v = [col.r, col.g, col.b]; LINC.set(k, v); } return v; }
export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.uv = []; this.leaf = []; }
  add(tpl, m, col, parent, leaf = 0, uvScale = 1) {
    const mm = parent ? new THREE.Matrix4().multiplyMatrices(parent, m) : m;
    _n3.getNormalMatrix(mm);
    const g = typeof tpl === 'string' ? TPL[tpl] : tpl;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    const lc = linCol(col);
    for (let i = 0; i < P.count; i++) {
      _vv.fromBufferAttribute(P, i).applyMatrix4(mm); this.p.push(_vv.x, _vv.y, _vv.z);
      _vv.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); this.n.push(_vv.x, _vv.y, _vv.z);
      this.c.push(lc[0], lc[1], lc[2]); this.leaf.push(leaf);
      if (U) this.uv.push(U.getX(i) * uvScale, U.getY(i) * uvScale); else this.uv.push(0, 0);
    }
    return this;
  }
  box(x, y, z, sx, sy, sz, col, ry, parent) { return this.add('box', M(x, y, z, sx, sy, sz, ry || 0), col, parent); }
  get empty() { return this.p.length === 0; }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('aLeaf', new THREE.Float32BufferAttribute(this.leaf, 1));
    g.computeBoundingSphere();
    return g;
  }
}
