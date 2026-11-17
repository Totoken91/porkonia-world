// Ambiance : gobelins, fumées, oiseaux, modèle des voitures
import * as THREE from 'three';
import { hAt, STATIONS } from './land.js';
import { scene } from '../engine/renderer.js';
import { NOISE } from '../engine/textures.js';
import { SUN_DIR, SUN_COL } from '../engine/lighting.js';
import { M, Mset } from '../engine/geo.js';
import { SMOKERS, CARS } from './registry.js';
import { GOBLIN_SPOTS } from './tracks.js';
import { Kit, scenery } from './scenery.js';
import { makeCarAssets } from './assets.js';
import { _cm } from './creatures.js';

// ---------- gobelins réseau (n'existent pas)
export function buildGoblins() {
  for (const s of GOBLIN_SPOTS) {
    const K = new Kit();
    K.on('paint').box(0, 0.35, 0, 0.3, 0.7, 0.2, [70, 150, 60]).box(0, 0.62, 0, 0.42, 0.42, 0.26, [244, 120, 30]);
    K.on('paint').add('sph', M(0, 1.02, 0, 0.4, 0.38, 0.34), [90, 170, 70]).add('cone', M(-0.26, 1.08, 0, 0.12, 0.26, 0.08, 0, 0, 1.2), [90, 170, 70]).add('cone', M(0.26, 1.08, 0, 0.12, 0.26, 0.08, 0, 0, -1.2), [90, 170, 70]);
    K.on('wood').add('cyl24', M(0.55, 0.35, 0.1, 0.7, 0.5, 0.7, 0, Math.PI / 2), [180, 140, 90]);
    const g = K.group(); g.position.set(s.x, hAt(s.x, s.z), s.z); g.rotation.y = s.ang; g.scale.setScalar(1.6);
    scenery.add(g);
  }
}

// ---------- fumées (billboards doux)
const smoke = { mesh: null, parts: [], i: 0 };
export function buildSmoke() {
  const N = 360;
  const g = new THREE.PlaneGeometry(1, 1);
  const ig = new THREE.InstancedBufferGeometry().copy(g);
  const aP = new Float32Array(N * 4), aC = new Float32Array(N);
  ig.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 4)); ig.setAttribute('aA', new THREE.InstancedBufferAttribute(aC, 1));
  ig.instanceCount = N;
  const mat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSunDir: { value: SUN_DIR }, uSunCol: { value: SUN_COL }, tNz: { value: NOISE } }]),
    vertexShader: `attribute vec4 aP; attribute float aA; varying float vA; varying vec2 vUv; varying float vSeed;
      #include <fog_pars_vertex>
      void main(){ vUv = uv; vA = aA; vSeed = aP.x * 0.13 + aP.z * 0.07;
        vec4 mvPosition = viewMatrix * vec4(aP.xyz, 1.0); mvPosition.xy += position.xy * aP.w;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform vec3 uSunDir, uSunCol; uniform sampler2D tNz; varying float vA; varying vec2 vUv; varying float vSeed;
      #include <fog_pars_fragment>
      void main(){ vec2 d = vUv - 0.5; float r = length(d) * 2.0; float n = texture2D(tNz, vUv * 0.5 + vSeed).r;
        float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.5) * vA; if (a < 0.01) discard;
        vec3 c = vec3(0.62, 0.6, 0.58) * (0.45 + 0.4 * max(uSunDir.y + 0.3, 0.0)) + uSunCol * 0.25 * (0.5 - d.y);
        gl_FragColor = vec4(c, a * 0.55);
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  const mesh = new THREE.Mesh(ig, mat); mesh.frustumCulled = false; mesh.layers.set(1);
  for (let i = 0; i < N; i++) smoke.parts.push({ life: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, s: 0, max: 1 });
  smoke.mesh = mesh; smoke.aP = aP; smoke.aA = aC; smoke.geo = ig;
  scene.add(mesh);
}
export function puff(x, y, z, vx, vy, vz, s, life) { const p = smoke.parts[smoke.i]; smoke.i = (smoke.i + 1) % smoke.parts.length; Object.assign(p, { x, y, z, vx, vy, vz, s, life, max: life }); }
export function updateSmoke(dt, camPos) {
  for (const s of SMOKERS) {
    if (s.x === undefined) continue;
    const dx = s.x - camPos.x, dz = s.z - camPos.z;
    if (dx * dx + dz * dz > 3500 * 3500) continue;
    s.acc = (s.acc || 0) + dt * s.rate;
    while (s.acc > 1) { s.acc -= 1; puff(s.x, s.y, s.z, 1.2 + Math.random(), 2.4, 0.5, s.size || 2.4, 9); }
  }
  smoke.parts.forEach((p, i) => {
    if (p.life <= 0) { smoke.aA[i] = 0; return; }
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy *= 1 - dt * 0.15;
    const k = 1 - p.life / p.max;
    smoke.aP[i * 4] = p.x; smoke.aP[i * 4 + 1] = p.y; smoke.aP[i * 4 + 2] = p.z; smoke.aP[i * 4 + 3] = p.s * (0.8 + k * 3.2);
    smoke.aA[i] = Math.min(1, k * 6) * (1 - k);
  });
  smoke.geo.attributes.aP.needsUpdate = true; smoke.geo.attributes.aA.needsUpdate = true;
}

// ---------- oiseaux
const birds = { mesh: null, flocks: [] };
export function buildBirds(rnd) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -0.9, 0.15, -0.1, 0, 0, -0.2, 0, 0, 0.3, 0, 0, -0.2, 0.9, 0.15, -0.1], 3));
  g.computeVertexNormals();
  const N = 120;
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.8, side: THREE.DoubleSide }), N);
  mesh.frustumCulled = false; mesh.layers.set(1);
  for (let f = 0; f < 10; f++) { const st = STATIONS[(rnd() * STATIONS.length) | 0]; birds.flocks.push({ cx: st.x + (rnd() - 0.5) * 800, cz: st.z + (rnd() - 0.5) * 800, cy: st.y + 60 + rnd() * 60, r: 60 + rnd() * 90, sp: 0.15 + rnd() * 0.1, ph: rnd() * 6 }); }
  birds.mesh = mesh; birds.n = N; scene.add(mesh);
}
export function updateBirds(t) {
  const { mesh, flocks } = birds; if (!mesh) return;
  for (let i = 0; i < birds.n; i++) {
    const f = flocks[i % flocks.length], k = Math.floor(i / flocks.length);
    const a = t * f.sp + f.ph + k * 0.12, r = f.r + Math.sin(k * 1.7) * 14;
    const x = f.cx + Math.cos(a) * r, z = f.cz + Math.sin(a) * r, y = f.cy + Math.sin(t * 0.7 + k) * 6;
    const flap = 1 + Math.sin(t * 9 + k * 1.3) * 0.5;
    mesh.setMatrixAt(i, Mset(_cm, x, y, z, flap * 1.4, 1.4, 1.4, -a));
  }
  mesh.instanceMatrix.needsUpdate = true;
}
export function buildCars() { const a = makeCarAssets(); CARS.geo = a.geo; CARS.geoHi = a.geoHi; CARS.mat = a.mat; }
