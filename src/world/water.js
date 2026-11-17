// Mer, lacs et reflets
import * as THREE from 'three';
import { clamp } from '../engine/util.js';
import { Q } from '../engine/quality.js';
import { H, NX, NZ, WW, HH, LAKE, LAKE_LV, waterAt } from './land.js';
import { camera, renderer, scene } from '../engine/renderer.js';
import { NOISE, TEX } from '../engine/textures.js';
import { envCubeRT, SUN_DIR, SUN_COL, svTex, _up } from '../engine/lighting.js';

// ---------- eau : vagues, profondeur, écume, reflets (ciel + scène miroir)
const HTEX = (() => { const t = new THREE.DataTexture(H, NX, NZ, THREE.RedFormat, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
export const reflectRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
const reflCam = new THREE.PerspectiveCamera();
reflCam.layers.set(0);
const reflTexMatrix = new THREE.Matrix4();
export const WATERS = [];
function waterMaterial(level, planar) {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      tH: { value: HTEX }, uHS: { value: new THREE.Vector2(NX, NZ) }, tN: { value: null }, tR: { value: reflectRT.texture }, tEnv: { value: envCubeRT.texture },
      tNz: { value: NOISE }, uRefl: { value: 0 }, uTime: { value: 0 }, uLevel: { value: level }, uSunDir: { value: SUN_DIR }, uSunCol: { value: SUN_COL },
      uWorld: { value: new THREE.Vector2(WW, HH) }, uTexMat: { value: reflTexMatrix }, uSunVis: { value: svTex }, uSunI: { value: 4 }, uRough: { value: planar ? 0.62 : 0.42 },
    }]),
    vertexShader: `uniform mat4 uTexMat; varying vec3 vWP; varying vec4 vRefl;
      #include <fog_pars_vertex>
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; vRefl = uTexMat * wp; vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `uniform sampler2D tH, tN, tR, tNz, uSunVis; uniform samplerCube tEnv; uniform vec2 uHS, uWorld; uniform float uRefl, uTime, uLevel, uSunI, uRough; uniform vec3 uSunDir, uSunCol;
      varying vec3 vWP; varying vec4 vRefl;
      #include <fog_pars_fragment>
      float terrainH(vec2 xz){ vec2 g = (xz / uWorld + 0.5) * (uHS - 1.0); if (g.x < 0.0 || g.y < 0.0 || g.x > uHS.x - 1.0 || g.y > uHS.y - 1.0) return -60.0;
        ivec2 i = ivec2(floor(g)); vec2 f = fract(g);
        float a = texelFetch(tH, i, 0).r, b = texelFetch(tH, i + ivec2(1, 0), 0).r, c = texelFetch(tH, i + ivec2(0, 1), 0).r, d = texelFetch(tH, i + ivec2(1, 1), 0).r;
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
      void main(){
        vec2 uv = vWP.xz;
        vec3 n1 = texture2D(tN, uv * 0.011 + vec2(uTime * 0.0065, uTime * 0.0041)).xyz * 2.0 - 1.0;
        vec3 n2 = texture2D(tN, uv * 0.029 - vec2(uTime * 0.0092, -uTime * 0.0107)).xyz * 2.0 - 1.0;
        vec3 n3 = texture2D(tN, uv * 0.0026 + vec2(uTime * 0.0012, uTime * 0.0007)).xyz * 2.0 - 1.0;
        vec3 n4 = texture2D(tN, uv * 0.09 + vec2(-uTime * 0.02, uTime * 0.017)).xyz * 2.0 - 1.0;
        float dist = length(cameraPosition - vWP);
        vec2 wv = n1.xy + n2.xy * 0.75 + n3.xy * 0.9 + n4.xy * 0.35 * smoothstep(400.0, 60.0, dist);
        vec3 N = normalize(vec3(wv.x * uRough, 3.2 + dist * 0.003, wv.y * uRough));
        vec3 V = normalize(cameraPosition - vWP);
        float depth = uLevel - terrainH(vWP.xz);
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
        vec3 R = reflect(-V, N); R.y = abs(R.y);
        vec3 refl = textureCube(tEnv, R).rgb;
        if (uRefl > 0.5) { vec2 ruv = vRefl.xy / vRefl.w + N.xz * 0.045; refl = texture2D(tR, ruv).rgb; }
        vec2 svuv = vWP.xz / uWorld + 0.5;
        float sv = (svuv.x < 0.0 || svuv.y < 0.0 || svuv.x > 1.0 || svuv.y > 1.0) ? 1.0 : texture2D(uSunVis, svuv).r;
        float amb = 0.25 + 0.75 * smoothstep(-0.05, 0.4, uSunDir.y);
        vec3 deep = vec3(0.004, 0.032, 0.07), shallow = vec3(0.03, 0.2, 0.2);
        float dd = 1.0 - exp(-max(depth, 0.0) * 0.16);
        vec3 body = mix(shallow, deep, dd) * amb * (0.6 + 0.4 * sv);
        float sss = pow(max(dot(V, -uSunDir), 0.0), 3.0) * 0.0;
        vec3 Hh = normalize(uSunDir + V);
        float nh = max(dot(N, Hh), 0.0);
        float spec = (pow(nh, 1600.0) * 70.0 + pow(nh, 260.0) * 0.6) * sv;
        vec3 col = mix(body, refl, fres) + uSunCol * spec * uSunI * 0.25;
        float nz = texture2D(tNz, uv * 0.06 + vec2(uTime * 0.01, 0.0)).g;
        float foam = smoothstep(1.6, 0.0, depth) * smoothstep(0.45, 0.8, nz + 0.35 * sin(depth * 5.0 - uTime * 1.3));
        col = mix(col, vec3(0.85, 0.88, 0.9) * amb * (0.5 + 0.5 * sv), clamp(foam, 0.0, 1.0) * 0.85);
        gl_FragColor = vec4(col, 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
  m.uniforms.tN.value = TEX.waterN; m.uniforms.tR.value = reflectRT.texture; m.uniforms.tEnv.value = envCubeRT.texture; m.uniforms.tH.value = HTEX; m.uniforms.tNz.value = NOISE; m.uniforms.uSunVis.value = svTex;
  m.uniforms.uSunDir.value = SUN_DIR; m.uniforms.uSunCol.value = SUN_COL; m.uniforms.uTexMat.value = reflTexMatrix;
  m.userData.planar = planar;
  WATERS.push(m);
  return m;
}
export function buildWater() {
  const group = new THREE.Group();
  const seaMat = waterMaterial(0, true);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000, 1, 1), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.layers.set(2); sea.userData.mirror = true;
  group.add(sea);
  // lacs : une maille par lac (cellules grossies)
  const byLake = new Map();
  for (let j = 0; j < NZ - 1; j += 2) for (let i = 0; i < NX - 1; i += 2) {
    let id = 0;
    for (let dj = -1; dj <= 3 && !id; dj++) for (let di = -1; di <= 3 && !id; di++) { const ii = clamp(i + di, 0, NX - 1), jj = clamp(j + dj, 0, NZ - 1); id = LAKE[jj * NX + ii]; }
    if (!id) continue;
    if (!byLake.has(id)) byLake.set(id, []);
    const x0 = (i / (NX - 1) - 0.5) * WW, x1 = ((i + 2) / (NX - 1) - 0.5) * WW, z0 = (j / (NZ - 1) - 0.5) * HH, z1 = ((j + 2) / (NZ - 1) - 0.5) * HH;
    const y = LAKE_LV[id];
    byLake.get(id).push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
  }
  for (const [id, p] of byLake) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, waterMaterial(LAKE_LV[id], false)); mesh.layers.set(2);
    group.add(mesh);
  }
  return group;
}
const _rv = new THREE.Vector3(), _rt = new THREE.Vector3(), _rl = new THREE.Vector3(), _rplane = new THREE.Plane(), _rclip = new THREE.Vector4(), _rq = new THREE.Vector4(), _rrot = new THREE.Matrix4();
export function renderReflection() {
  if (!Q.reflect) { for (const w of WATERS) w.uniforms.uRefl.value = 0; return; }
  const camPos = camera.getWorldPosition(new THREE.Vector3());
  if (camPos.y < 0.5) return;
  { let near = false; for (const [ox, oz] of [[0, 0], [350, 0], [-350, 0], [0, 350], [0, -350], [800, 0], [-800, 0], [0, 800], [0, -800]]) if (waterAt(camPos.x + ox, camPos.z + oz) > -1e8) { near = true; break; } if (!near) return; }
  _rrot.extractRotation(camera.matrixWorld);
  _rv.set(camPos.x, -camPos.y, camPos.z);
  _rl.set(0, 0, -1).applyMatrix4(_rrot).add(camPos);
  _rt.set(_rl.x, -_rl.y, _rl.z);
  reflCam.position.copy(_rv);
  reflCam.up.set(0, 1, 0).applyMatrix4(_rrot); reflCam.up.y *= -1;
  reflCam.lookAt(_rt);
  reflCam.far = camera.far; reflCam.near = camera.near;
  reflCam.updateMatrixWorld();
  reflCam.projectionMatrix.copy(camera.projectionMatrix);
  reflTexMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  reflTexMatrix.multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  _rplane.setFromNormalAndCoplanarPoint(_up, new THREE.Vector3(0, 0, 0)).applyMatrix4(reflCam.matrixWorldInverse);
  _rclip.set(_rplane.normal.x, _rplane.normal.y, _rplane.normal.z, _rplane.constant);
  const pm = reflCam.projectionMatrix.elements;
  _rq.x = (Math.sign(_rclip.x) + pm[8]) / pm[0]; _rq.y = (Math.sign(_rclip.y) + pm[9]) / pm[5]; _rq.z = -1; _rq.w = (1 + pm[10]) / pm[14];
  _rclip.multiplyScalar(2 / _rclip.dot(_rq));
  pm[2] = _rclip.x; pm[6] = _rclip.y; pm[10] = _rclip.z + 1 - 0.003; pm[14] = _rclip.w;
  renderer.setRenderTarget(reflectRT);
  renderer.clear();
  renderer.render(scene, reflCam);
  renderer.setRenderTarget(null);
  for (const w of WATERS) w.uniforms.uRefl.value = w.userData.planar ? 1 : 0;
}
