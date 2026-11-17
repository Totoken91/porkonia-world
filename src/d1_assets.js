// ============================================================================
//  Partie D1 : modèles issus du moteur Porkonia 3D — le citoyen standard (citizen.h) et la voiture
// ============================================================================
function unpackMesh(buf, off, nv, nf, scale) {
  let o = off; const al = n => { const r = o; o += n; o += o & 1; return r; };
  const pos = new Int16Array(buf.buffer, buf.byteOffset + al(nv * 6), nv * 3), nor = new Int8Array(buf.buffer, buf.byteOffset + al(nv * 3), nv * 3);
  const misc = new Uint8Array(buf.buffer, buf.byteOffset + al(nv * 3), nv * 3), idx = new Uint16Array(buf.buffer, buf.byteOffset + al(nf * 6), nf * 3);
  const P = new Float32Array(nv * 3), Nn = new Float32Array(nv * 3), Mi = new Float32Array(nv * 3);
  for (let i = 0; i < nv * 3; i++) { P[i] = pos[i] * scale / 32767; Nn[i] = nor[i] / 127; }
  for (let i = 0; i < nv; i++) { Mi[i * 3] = misc[i * 3]; Mi[i * 3 + 1] = misc[i * 3 + 1]; Mi[i * 3 + 2] = misc[i * 3 + 2] / 255; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3)); g.setAttribute('aMisc', new THREE.BufferAttribute(Mi, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1)); g.computeBoundingSphere();
  return g;
}
const CZD = await gunzip(window.PORK_CZ.geo), CARD = await gunzip(window.PORK_CAR.geo);
const CZ_HIP = window.PORK_CZ.meta.hipy;
const CZ_SKINS = [[0.92, 0.37, 0.38], [0.95, 0.50, 0.50], [0.80, 0.30, 0.32], [0.42, 0.22, 0.15], [0.98, 0.62, 0.58], [0.92, 0.37, 0.38], [0.86, 0.42, 0.36]];
const CZ_CLOTH = [[214, 40, 60], [250, 196, 40], [40, 120, 220], [60, 170, 90], [240, 120, 40], [150, 70, 190], [245, 240, 225], [30, 60, 120], [240, 120, 160], [90, 60, 40], [40, 170, 170], [123, 30, 46]];
function citizenMaterial(v) {
  const tex = new THREE.TextureLoader().load(window.PORK_CZ.heads[v]); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
  const m = new THREE.MeshStandardMaterial({ roughness: 0.62, envMapIntensity: 0.6 });
  worldShading(m, {
    key: 'citizen', after: sh => {
      sh.uniforms.tHead = { value: tex };
      sh.vertexShader = `attribute vec3 aMisc; attribute vec3 aSkin; attribute vec3 aC1; attribute vec3 aC2; attribute vec3 aC3; attribute vec2 aAnim;
        flat varying float vSlot; varying vec3 vRest; flat varying vec3 vSkin; flat varying vec3 vC1; flat varying vec3 vC2; flat varying vec3 vC3;
        float czAng; vec3 czPiv;
        vec3 czRot(vec3 v) { float c = cos(czAng), s = sin(czAng); return vec3(v.x, c * v.y + s * v.z, -s * v.y + c * v.z); }
        ` + sh.vertexShader.replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        { int bone = int(aMisc.y + 0.5); float sw = sin(aAnim.x); czAng = 0.0; czPiv = vec3(0.0);
          if (bone == 1) { czAng = sw * 0.62; czPiv = vec3(0.128, ${CZ_HIP.toFixed(4)}, 0.0); } else if (bone == 2) { czAng = -sw * 0.62; czPiv = vec3(-0.128, ${CZ_HIP.toFixed(4)}, 0.0); }
          else if (bone == 3) { czAng = -sw * 0.55; czPiv = vec3(0.215, ${(CZ_HIP + 0.45).toFixed(4)}, 0.0); } else if (bone == 4) { czAng = sw * 0.55; czPiv = vec3(-0.215, ${(CZ_HIP + 0.45).toFixed(4)}, 0.0); }
          czAng *= aAnim.y * aMisc.z; objectNormal = czRot(objectNormal); }`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vRest = position; vSlot = aMisc.x; vSkin = aSkin; vC1 = aC1; vC2 = aC2; vC3 = aC3;
          transformed = czPiv + czRot(transformed - czPiv);
          transformed.y += abs(cos(aAnim.x)) * 0.022 * aAnim.y;
          transformed.x += sin(aAnim.x) * 0.012 * aAnim.y * step(${CZ_HIP.toFixed(3)}, position.y);`);
      sh.fragmentShader = `uniform sampler2D tHead; flat varying float vSlot; varying vec3 vRest; flat varying vec3 vSkin; flat varying vec3 vC1; flat varying vec3 vC2; flat varying vec3 vC3; float czR = 0.62;
        ` + sh.fragmentShader.replace('#include <color_fragment>', `{ int sl = int(vSlot + 0.5); vec3 c = vSkin;
          if (sl == 1) { vec3 d = normalize(vRest - vec3(0.0, ${(CZ_HIP + 0.76).toFixed(4)}, 0.03));
            if (d.z > 0.02) { vec2 uv = vec2(clamp(atan(d.x, d.z) / 3.14159265 + 0.5, 0.004, 0.996), asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5);
              c = texture2D(tHead, vec2(uv.x * 0.5, uv.y)).rgb + texture2D(tHead, vec2(0.5 + uv.x * 0.5, uv.y)).rgb * vSkin; } czR = 0.5; }
          else if (sl == 0) czR = 0.5;
          else if (sl == 2) { c = vec3(0.115, 0.062, 0.05); czR = 0.3; } else if (sl == 3) c = vC1; else if (sl == 4) c = vC2; else if (sl == 5) c = vC3;
          else if (sl == 6) c = vec3(0.88, 0.86, 0.80); else if (sl == 7) { c = vec3(1.0, 0.70, 0.24); czR = 0.3; }
          diffuseColor.rgb = c; }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = czR;');
    },
  });
  m.customProgramCacheKey = () => 'citizen';
  return m;
}
// un lot de citoyens instanciés par silhouette ; set(i, matrice, phase, amplitude)
function makeCitizenPool(n) {
  const V = window.PORK_CZ.meta.variants, per = Math.ceil(n / V.length), pool = { n, meshes: [], per };
  const lin = c => { const k = new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); return [k.r, k.g, k.b]; };
  V.forEach((vv, vi) => {
    const g = unpackMesh(CZD, vv.off, vv.nv, vv.nf, 2.0);
    const mk = () => new Float32Array(per * 3);
    const skin = mk(), c1 = mk(), c2 = mk(), c3 = mk(), anim = new Float32Array(per * 2);
    for (let i = 0; i < per; i++) {
      const h = hashStr('cz' + vi + ':' + i);
      skin.set(CZ_SKINS[h % CZ_SKINS.length], i * 3);
      c1.set(lin(CZ_CLOTH[(h >>> 3) % CZ_CLOTH.length]), i * 3); c2.set(lin(CZ_CLOTH[(h >>> 7) % CZ_CLOTH.length]).map(x => x * 0.55), i * 3); c3.set(lin(CZ_CLOTH[(h >>> 11) % CZ_CLOTH.length]), i * 3);
    }
    g.setAttribute('aSkin', new THREE.InstancedBufferAttribute(skin, 3)); g.setAttribute('aC1', new THREE.InstancedBufferAttribute(c1, 3));
    g.setAttribute('aC2', new THREE.InstancedBufferAttribute(c2, 3)); g.setAttribute('aC3', new THREE.InstancedBufferAttribute(c3, 3));
    const an = new THREE.InstancedBufferAttribute(anim, 2); an.setUsage(THREE.DynamicDrawUsage); g.setAttribute('aAnim', an);
    const m = new THREE.InstancedMesh(g, citizenMaterial(vi), per); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
    const hide = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < per; i++) m.setMatrixAt(i, hide);
    pool.meshes.push({ m, an });
  });
  pool.set = (i, mat, phase, amp) => { const e = pool.meshes[i % V.length], k = (i / V.length) | 0; e.m.setMatrixAt(k, mat); e.an.array[k * 2] = phase; e.an.array[k * 2 + 1] = amp; };
  pool.flush = () => { for (const e of pool.meshes) { e.m.instanceMatrix.needsUpdate = true; e.an.needsUpdate = true; } };
  return pool;
}
function makeCarAssets() {
  const PC = window.PORK_CAR, geo = unpackMesh(CARD, PC.lo.off, PC.lo.nv, PC.lo.nf, 4.0), geoHi = unpackMesh(CARD, PC.hi.off, PC.hi.nv, PC.hi.nf, 4.0);
  const mat = new THREE.MeshPhysicalMaterial({ roughness: 0.35, metalness: 0.0, clearcoat: 0.45, clearcoatRoughness: 0.12, envMapIntensity: 0.7 });
  worldShading(mat, {
    key: 'car2', after: sh => {
      sh.vertexShader = 'attribute vec3 aMisc; flat varying float vSlot; varying vec3 vLocC; varying vec3 vNoC;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vSlot = aMisc.x; vLocC = position; vNoC = normal;');
      sh.fragmentShader = 'flat varying float vSlot; varying vec3 vLocC; varying vec3 vNoC; float carR = 0.3; float carM = 0.0; vec3 carE = vec3(0.0);\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
        { int sl = int(vSlot + 0.5); vec3 p = vLocC; vec3 n = normalize(vNoC);
          if (sl == 0) {
            bool band = p.y > 1.0 && p.y < 1.43;
            bool side = band && abs(n.x) > 0.5 && p.z < 0.42 && p.z > -0.98 && !(p.z > -0.34 && p.z < -0.25);
            bool front = band && n.z > 0.3 && abs(p.x) < 0.60 && p.z > 0.3, back = band && n.z < -0.3 && abs(p.x) < 0.58 && p.z < -0.95;
            if (side || front || back) { diffuseColor.rgb = vec3(0.05, 0.12, 0.2); carR = 0.3; carE = vec3(0.02, 0.05, 0.09); }
            else if (abs(n.x) > 0.6 && p.y > 0.5 && p.y < 1.0 && (abs(p.z - 0.47) < 0.012 || abs(p.z + 0.30) < 0.012)) diffuseColor.rgb *= 0.35;
          }
          else if (sl == 2) { diffuseColor.rgb = vec3(0.02, 0.02, 0.022); carR = 0.85; }
          else if (sl == 3) { diffuseColor.rgb = vec3(0.86, 0.86, 0.88); carM = 1.0; carR = 0.18; }
          else if (sl == 4) { diffuseColor.rgb = vec3(1.0, 0.96, 0.8); carR = 0.1; carE = vec3(1.0, 0.9, 0.6) * (0.15 + 4.0 * smoothstep(0.02, 0.4, uLit)); }
          else if (sl == 5) { diffuseColor.rgb = vec3(0.75, 0.05, 0.04); carR = 0.15; carE = vec3(1.0, 0.08, 0.04) * (0.1 + 2.0 * smoothstep(0.02, 0.4, uLit)); }
          else if (sl == 6) { diffuseColor.rgb = vec3(0.03, 0.03, 0.035); carR = 0.6; } }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = carR;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = carM;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += carE;');
    },
  });
  mat.customProgramCacheKey = () => 'car2';
  return { geo, geoHi, mat };
}

// habitacle : vu seulement depuis le siège du conducteur
function makeCarInterior(bodyCol) {
  const K = new Kit(), grp = new THREE.Group();
  const DASH = [58, 52, 54], TRIM = [224, 208, 176], SEAT = [150, 40, 50], DARK = [26, 24, 26];
  const beam = (mat, a, b, w, h, col) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), m = new THREE.Matrix4().lookAt(va, vb, new THREE.Vector3(0, 1, 0)); m.setPosition(va.clone().add(vb).multiplyScalar(0.5)); m.scale(new THREE.Vector3(w, h, va.distanceTo(vb))); K.on(mat).add('box', m, col); };
  // capot et ailes devant le pare-brise
  K.on('carro').add('sph', M(0, 0.80, 1.30, 1.62, 0.44, 1.5), bodyCol);
  for (const sx of [-1, 1]) K.on('carro').add('sph', M(sx * 0.70, 0.84, 1.25, 0.42, 0.40, 1.1), bodyCol);
  // planche de bord, casquette des compteurs
  K.on('dark').add('box', M(0, 0.89, 0.56, 1.46, 0.20, 0.36), DASH).add('box', M(0, 0.995, 0.64, 1.46, 0.03, 0.26), DARK);
  K.on('dark').add('box', M(0.36, 1.06, 0.60, 0.30, 0.13, 0.10), DASH);
  K.on('paint').add('box', M(-0.30, 0.88, 0.375, 0.5, 0.11, 0.01), TRIM);
  K.on('metal').add('box', M(0, 0.86, 0.376, 0.26, 0.09, 0.012), [30, 30, 32]);
  for (const x of [-0.07, 0, 0.07]) K.on('metal').add('cyl', M(x, 0.86, 0.372, 0.035, 0.02, 0.035, 0, Math.PI / 2), [200, 200, 205]);
  // montants, pavillon, portes
  for (const sx of [-1, 1]) {
    beam('carro', [sx * 0.70, 0.98, 0.70], [sx * 0.57, 1.50, 0.16], 0.06, 0.06, bodyCol);
    beam('carro', [sx * 0.72, 0.98, -0.30], [sx * 0.60, 1.50, -0.30], 0.07, 0.10, bodyCol);
    beam('carro', [sx * 0.70, 0.98, -1.06], [sx * 0.57, 1.50, -0.80], 0.09, 0.09, bodyCol);
    beam('carro', [sx * 0.585, 1.50, 0.16], [sx * 0.585, 1.50, -0.80], 0.07, 0.05, bodyCol);
    K.on('paint').add('box', M(sx * 0.745, 0.70, -0.20, 0.07, 0.58, 1.86), TRIM);
    K.on('carro').add('box', M(sx * 0.75, 0.995, -0.20, 0.09, 0.03, 1.86), bodyCol);
    K.on('dark').add('box', M(sx * 0.70, 0.78, -0.05, 0.03, 0.05, 0.42), DARK);
  }
  beam('carro', [-0.58, 1.50, 0.16], [0.58, 1.50, 0.16], 0.07, 0.05, bodyCol); beam('carro', [-0.58, 1.50, -0.80], [0.58, 1.50, -0.80], 0.07, 0.05, bodyCol);
  K.on('paint').add('box', M(0, 1.535, -0.32, 1.24, 0.03, 1.02), TRIM);
  K.on('dark').add('box', M(0, 0.42, -0.2, 1.46, 0.04, 2.0), DARK);
  // sièges, banquette, plage arrière
  for (const sx of [-1, 1]) { K.on('paint').add('box', M(sx * 0.36, 0.60, -0.28, 0.5, 0.14, 0.5), SEAT).add('box', M(sx * 0.36, 0.95, -0.56, 0.5, 0.62, 0.13, 0, -0.18), SEAT).add('box', M(sx * 0.36, 1.30, -0.63, 0.26, 0.16, 0.09, 0, -0.18), SEAT); }
  K.on('paint').add('box', M(0, 0.60, -1.0, 1.36, 0.14, 0.44), SEAT).add('box', M(0, 0.92, -1.24, 1.36, 0.56, 0.12, 0, -0.2), SEAT);
  K.on('dark').add('box', M(0, 1.0, -1.36, 1.36, 0.03, 0.26), DASH);
  // rétroviseur, levier, cochon porte-bonheur
  K.on('dark').add('box', M(-0.02, 1.455, 0.20, 0.2, 0.055, 0.02), DARK);
  K.on('metal').add('cyl', M(0, 0.62, 0.02, 0.025, 0.26, 0.025, 0, 0.3), [200, 200, 205]); K.on('dark').add('sph', M(0, 0.76, 0.06, 0.07, 0.07, 0.07), DARK);
  for (const m of K.meshes(false)) { m.receiveShadow = false; grp.add(m); }
  const pig = new THREE.Mesh(makePigGeometry(false), creatureMat()); pig.material.vertexColors = true; pig.geometry = pig.geometry.clone();
  { const c = pig.geometry.attributes.color; for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * 0.92, c.getY(i) * 0.37, c.getZ(i) * 0.38); }
  pig.scale.setScalar(0.075); pig.position.set(-0.22, 1.01, 0.60); pig.rotation.y = Math.PI + 0.4; grp.add(pig);
  // volant
  const wheel = new THREE.Group(), WK = new Kit();
  WK.on('dark').add('torus', M(0, 0, 0, 0.33, 0.33, 0.2), DARK);
  WK.on('dark').add('box', M(0, 0, 0, 0.30, 0.03, 0.016), DARK).add('box', M(0, -0.08, 0, 0.03, 0.15, 0.016), DARK);
  WK.on('paint').add('cyl24', M(0, 0, 0.01, 0.075, 0.016, 0.075, 0, Math.PI / 2), [220, 180, 60]);
  for (const m of WK.meshes(false)) { m.receiveShadow = false; wheel.add(m); }
  const col = new THREE.Group(); col.position.set(0.36, 0.875, 0.36); col.rotation.x = 0.5; col.add(wheel); grp.add(col);
  K.on('dark');
  const colK = new Kit(); colK.on('dark').add('cyl', M(0.36, 0.84, 0.44, 0.05, 0.2, 0.05, 0, Math.PI / 2 - 0.5), DARK); for (const m of colK.meshes(false)) grp.add(m);
  // compteur
  const dial = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f3e7c9'; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.strokeStyle = '#7b1e2e'; g.lineWidth = 8; g.stroke();
    g.fillStyle = '#17110e'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let v = 0; v <= 160; v += 20) { const a = (-225 + v / 160 * 270) * Math.PI / 180; g.fillText(String(v), 128 + Math.cos(a) * 88, 128 + Math.sin(a) * 88); g.fillRect(126 + Math.cos(a) * 112, 126 + Math.sin(a) * 112, 5, 5); }
    g.font = 'bold 18px sans-serif'; g.fillText('km/h', 128, 180); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const dm = new THREE.Mesh(new THREE.CircleGeometry(0.058, 32), new THREE.MeshBasicMaterial({ map: dial })); dm.position.set(0.36, 1.063, 0.548); dm.rotation.set(0.1, Math.PI, 0); grp.add(dm);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.046, 0.003), new THREE.MeshBasicMaterial({ color: 0xc8202c })); needle.geometry.translate(0, 0.02, 0);
  const nh = new THREE.Group(); nh.position.set(0.36, 1.063, 0.544); nh.rotation.set(0.1, Math.PI, 0); nh.add(needle); grp.add(nh);
  grp.userData = { wheel, needle };
  return grp;
}

// le porc de marche (porc4.h) : monture et troupeaux
function makePorc() {
  const pm = window.PORK_CZ.meta.porc, geo = unpackMesh(CZD, pm.off, pm.nv, pm.nf, 2.0);
  const U = { uPorc: { value: new THREE.Vector2(0, 0) } };
  const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(0.95, 0.47, 0.52), roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.7 });
  worldShading(mat, {
    key: 'porc4', after: sh => {
      sh.uniforms.uPorc = U.uPorc;
      sh.vertexShader = 'attribute vec3 aMisc; uniform vec2 uPorc; flat varying float vSlot;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vSlot = aMisc.x;
        { float sg = aMisc.y > 1.5 ? -1.0 : (aMisc.y > 0.5 ? 1.0 : 0.0); transformed.z += sg * 0.2 * uPorc.y * sin(uPorc.x) * aMisc.z * sign(position.z); transformed.y += 0.06 * abs(sin(uPorc.x)) * uPorc.y * (1.0 - aMisc.z); }`);
      sh.fragmentShader = 'flat varying float vSlot; float pR = 0.42; float pM = 0.0;\n' + sh.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          { int sl = int(vSlot + 0.5); if (sl == 1) { diffuseColor.rgb = vec3(0.02); pR = 0.08; } else if (sl == 2) { diffuseColor.rgb = vec3(1.0, 0.74, 0.30); pM = 1.0; pR = 0.22; } }`)
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = pR;').replace('#include <metalnessmap_fragment>', 'float metalnessFactor = pM;');
    },
  });
  mat.customProgramCacheKey = () => 'porc4';
  return { geo, mat, U };
}
