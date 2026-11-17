import * as THREE from 'three';
import { Q } from '../engine/quality.js';
import { STATIONS, hAt, waterAt, STATION_BY_NAME, WW, HH, clsAt, slopeAt, tmGet } from '../world/land.js';
import { camera, scene, renderer, composer } from '../engine/renderer.js';
import { applyTime } from '../engine/lighting.js';
import { LAZY } from '../engine/lazy.js';
import { groundAt, ROADS, PROPS } from '../world/registry.js';
import { game, EX } from './state.js';
import { TRACKS, PILLARS, PORTALS, STOP_MARK } from '../world/tracks.js';
import { LANDMARK_SPOTS, BUILDINGS, DRAPES, scenery } from '../world/scenery.js';
import { PART_MESHES } from '../world/towns.js';
import { VEG, treeMaterial } from '../world/vegetation.js';
import { train, cam, setCamMode, updateTrainPose, placeTrainAt, rebuildConsist, stationOffset, nextOptions, upcomingLimit, flipTrain } from './train.js';
import { openMap, closeMap } from './ui.js';
import { NPC, updateNpcs } from './npc.js';
import { exStart, exTeleport, exToggleCar, exUpdate, exCamera, exSetView, exPlacePlayer, exToggleView, exTogglePig, exPlaceCar } from './explore.js';
import { worldSignature } from '../world/signature.js';
import { setNotch, physicsStep, setRoute, closeStation, checkStops, loadOffer, offersFor, applyRouteSwitches } from './railgame.js';
import { PAUSE } from './loop.js';
import { carSetModel, DRIVE, driveUpdate } from './drive.js';
import { carGeo } from '../world/cars.js';

// ---------- outils de test : window.__pe, utilisé par tools/*.mjs, tools/aer.js et le mode ?mesure
export function installDebug(info) {
  window.__pe = { train, game, cam, setCamMode, setNotch, STATIONS, TRACKS, physicsStep, updateTrainPose, openMap, closeMap, setRoute, placeTrainAt, rebuildConsist, closeStation, PILLARS, PORTALS, camera, scene, hAt, LANDMARK_SPOTS, BUILDINGS, renderer, checkStops, loadOffer, stationOffset, nextOptions, upcomingLimit, STOP_MARK, offersFor, applyRouteSwitches, flipTrain, applyTime, Q, VEG, composer, waterAt, THREE, PART_MESHES, DRAPES, scenery, EX, exStart, exTeleport, exToggleCar, groundAt, ROADS, NPC, updateNpcs, STATION_BY_NAME, exUpdate, exCamera };
  window.__pe.carGeo = carGeo; window.__pe.carSetModel = carSetModel; window.__pe.DRIVE = DRIVE; window.__pe.driveUpdate = driveUpdate;
  window.__pe.PROPS = PROPS; window.__pe.LAZY = LAZY; window.__pe.info = info; window.__pe.worldSignature = worldSignature; window.__pe.view = (type, k, dist, h, ang = 0.6) => { const a = PROPS.where[type]; const p = a[Math.min(a.length - 1, k)]; const x = p[0] + Math.sin(ang) * dist, z = p[1] + Math.cos(ang) * dist; EX.mode = 'pied'; exSetView(); exPlacePlayer(x, z, ang); EX.P.y = groundAt(x, z) + h; EX.P.pitch = -Math.atan2(h - 1.5, dist) * 0.9; for (let q = 0; q < 90; q++) updateNpcs(0.05); return type + ' ' + a.length; };
  window.__pe.exToggleView = exToggleView; window.__pe.exTogglePig = exTogglePig; window.__pe.exSetView = exSetView;
  window.__pe.go = (x, z, yaw, pitch = 0, mode = 'pied') => { EX.mode = mode; exSetView(); if (mode === 'auto') { exPlaceCar(x, z, yaw); EX.car.orbit = 0; camera.position.set(x - Math.sin(yaw) * 7, groundAt(x, z) + 3.5, z - Math.cos(yaw) * 7); } else { exPlacePlayer(x, z, yaw); EX.P.pitch = pitch; } EX.P.x = x; EX.P.z = z; };
  window.__pe.render = (n = 1) => new Promise(r => { PAUSE.once = n; PAUSE.cb = r; });
  window.__pe.look = (x, y, z, tx, ty, tz) => { setCamMode('cabine'); setCamMode('poursuite'); cam.mode = 'libre'; scene.add(camera); camera.position.set(x, y, z); camera.lookAt(tx, ty, tz); camera.updateMatrixWorld(); };
  window.__pe.treeRow = () => {
    let best = null;
    for (let k = 0; k < 4000 && !best; k++) {
      const x = (Math.random() - 0.5) * WW * 0.8, z = (Math.random() - 0.5) * HH * 0.8;
      if (clsAt(x, z) !== 1 || slopeAt(x, z) > 0.04 || hAt(x, z) < 6 || tmGet(x, z)) continue;
      if (STATIONS.some(st => Math.hypot(st.x - x, st.z - z) < 900)) continue;
      let ok = true; for (let i = -60; i <= 60 && ok; i += 20) for (let j = -40; j <= 40; j += 20) if (tmGet(x + i, z + j) || slopeAt(x + i, z + j) > 0.08) { ok = false; break; }
      if (ok) best = { x, z };
    }
    const sp = ['chene', 'bouleau', 'peuplier', 'epicea', 'pinNeige', 'buisson'];
    const mat = treeMaterial();
    sp.forEach((k, i) => {
      for (const [lod, dz] of [['lod0', 0], ['lod1', 40]]) {
        const m = new THREE.Mesh(VEG.species[k][lod], mat); const x = best.x + (i - 2.5) * 17, z = best.z + dz;
        m.position.set(x, hAt(x, z) - 0.2, z); m.castShadow = true; m.receiveShadow = true; m.material.vertexColors = true; scene.add(m);
      }
    });
    return best;
  };
}
