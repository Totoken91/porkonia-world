// Rendu : canevas, scène, caméra, post-traitement
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { $ } from './util.js';
import { Q } from './quality.js';

// ---------- moteur de rendu
export const canvas = $('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
export const scene = new THREE.Scene();
export const camera = new THREE.PerspectiveCamera(65, 1, 0.3, 16000);
camera.layers.enable(1); camera.layers.enable(2);
scene.add(camera);
scene.fog = new THREE.FogExp2(0xd9c3a5, 0.000085);
const composerRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa });
export const composer = new EffectComposer(renderer, composerRT);
composer.addPass(new RenderPass(scene, camera));
export const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.42, 1.6);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uSun: { value: new THREE.Vector2(0.5, 0.5) }, uSunVis: { value: 0 }, uSunCol: { value: new THREE.Color(1, 0.8, 0.5) },
    uRays: { value: 0 }, uSat: { value: 1.3 }, uContrast: { value: 1.05 }, uVig: { value: 0.32 }, uWarm: { value: 0.02 }, uFade: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uSunVis, uRays, uSat, uContrast, uVig, uWarm, uFade; uniform vec2 uRes, uSun; uniform vec3 uSunCol;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float circle(vec2 p, vec2 c, float r, float soft){ float d = length((p - c) * vec2(uRes.x/uRes.y, 1.0)); return smoothstep(r, r*soft, d); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d);
      vec3 c;
      c.r = texture2D(tDiffuse, vUv - d * 0.0035 * r2 * 4.0).r;
      c.g = texture2D(tDiffuse, vUv).g;
      c.b = texture2D(tDiffuse, vUv + d * 0.0035 * r2 * 4.0).b;
      // rayons crépusculaires (qualité ultra)
      if (uRays > 0.5 && uSunVis > 0.01) {
        vec2 dir = (uSun - vUv) / 22.0; vec2 p = vUv; float acc = 0.0, w = 1.0;
        for (int i = 0; i < 22; i++) { p += dir; vec3 s = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb; float l = dot(s, vec3(0.3,0.59,0.11)); acc += smoothstep(0.82, 1.0, l) * w; w *= 0.93; }
        c += uSunCol * acc * 0.045 * uSunVis;
      }
      // reflets d'objectif
      if (uSunVis > 0.01) {
        vec2 axis = vec2(0.5) - uSun; float f = 0.0; vec3 fl = vec3(0.0);
        fl += vec3(1.0, 0.7, 0.4) * circle(vUv, uSun + axis * 0.55, 0.035, 0.2) * 0.10;
        fl += vec3(0.5, 0.8, 1.0) * circle(vUv, uSun + axis * 0.85, 0.06, 0.6) * 0.07;
        fl += vec3(1.0, 0.5, 0.8) * circle(vUv, uSun + axis * 1.3, 0.022, 0.1) * 0.09;
        fl += vec3(0.6, 1.0, 0.7) * circle(vUv, uSun + axis * 1.7, 0.09, 0.8) * 0.05;
        float glow = circle(vUv, uSun, 0.2, 0.0) * 0.045;
        c += (fl + uSunCol * glow) * uSunVis;
      }
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      c += vec3(uWarm, uWarm * 0.4, -uWarm * 0.6);
      c *= 1.0 - uVig * smoothstep(0.12, 0.62, r2 * 2.0);
      c += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * 0.018;
      c = mix(c, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};
export const gradePass = new ShaderPass(GradeShader);
composer.addPass(gradePass);

// libère la copie CPU des attributs statiques une fois envoyés à la carte graphique
export function freeAfterUpload(geo, extra = []) {
  const f = function () { this.array = null; };
  if (geo) for (const k in geo.attributes) if (k !== 'position' || geo.boundingSphere) geo.attributes[k].onUpload(f);
  for (const a of extra) if (a) a.onUpload(f);
}
