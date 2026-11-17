// Corps projetés : tout ce que la voiture envoie en l'air (citoyens, cochons, mobilier, voitures).
// Chaque corps est un solide qui vole, rebondit, roule puis s'immobilise. Il ne possède pas de maillage : il remet
// à chaque image sa matrice à qui l'affiche (instance d'un groupe de citoyens, d'un troupeau, ou maillage à part).
import * as THREE from 'three';
import { groundAt } from '../world/registry.js';

const G = 24;                       // pesanteur un peu forte : chute plus nerveuse, plus cartoon
const LIST = [];
const _q = new THREE.Quaternion(), _dq = new THREE.Quaternion(), _ax = new THREE.Vector3(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

// o : { x, y, z, yaw, scale, vx, vy, vz, h (hauteur du centre quand le corps est couché), rest (secondes passées
//       au sol avant la fin), couche (vrai : finit sur le flanc), onMatrix(m, f), onEnd(f) }
export function launch(o) {
  const f = { ...o, q: new THREE.Quaternion().setFromAxisAngle(_up, o.yaw || 0), w: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9), t: 0, sol: 0, fini: false };
  f.scale = o.scale ?? 1; f.rest = o.rest ?? 3; f.h = o.h ?? 0.4;
  LIST.push(f); return f;
}
export function updateFlyers(dt) {
  for (let i = LIST.length - 1; i >= 0; i--) {
    const f = LIST[i]; f.t += dt;
    if (f.sol <= 0) {
      f.vy -= G * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      const a = f.w.length();
      if (a > 1e-4) { _dq.setFromAxisAngle(_ax.copy(f.w).divideScalar(a), a * dt); f.q.premultiply(_dq); }
      const g = groundAt(f.x, f.z) + f.h;
      if (f.y < g) {
        f.y = g;
        if (f.vy < -3.5) { f.vy *= -0.38; f.vx *= 0.7; f.vz *= 0.7; f.w.multiplyScalar(0.6); f.onBounce?.(f); }
        else { f.vy = 0; const k = Math.pow(0.02, dt); f.vx *= k; f.vz *= k; f.w.multiplyScalar(Math.pow(0.01, dt)); if (Math.hypot(f.vx, f.vz) < 0.6) f.sol = 1e-3; }
      }
    } else {
      // au sol : le corps se pose sur le flanc (ou debout), puis attend
      f.sol += dt;
      const yaw = Math.atan2(2 * (f.q.w * f.q.y + f.q.x * f.q.z), 1 - 2 * (f.q.y * f.q.y + f.q.x * f.q.x));
      _q.setFromAxisAngle(_up, yaw); if (f.couche) _q.multiply(_dq.setFromAxisAngle(_ax.set(0, 0, 1), Math.PI / 2));
      f.q.slerp(_q, 1 - Math.pow(0.001, dt));
      f.y = groundAt(f.x, f.z) + f.h;
      if (f.sol > f.rest) f.fini = true;
    }
    const s = f.fade && f.sol > f.rest - 0.35 ? Math.max(0, (f.rest - f.sol) / 0.35) * f.scale : f.scale;
    f.onMatrix(_m.compose(_p.set(f.x, f.y, f.z), f.q, _s.set(s, s, s)), f);
    if (f.fini) { LIST.splice(i, 1); f.onEnd?.(f); }
  }
}
// lance un maillage indépendant (mobilier, voiture) : il disparaît en rétrécissant, puis est libéré
export function launchMesh(mesh, parent, o) {
  mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; parent.add(mesh);
  return launch({ ...o, fade: true, onMatrix: m => { mesh.matrix.copy(m); mesh.matrixWorldNeedsUpdate = true; }, onEnd: () => { parent.remove(mesh); mesh.dispose?.(); } });
}
export const flyerCount = () => LIST.length;
