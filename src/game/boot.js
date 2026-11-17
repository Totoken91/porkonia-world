// Démarrage : construit le monde étape par étape puis lance la boucle
import { setStatus, hashStr, $, fmtMoney, fatal } from '../engine/util.js';
import { QKEY } from '../engine/quality.js';
import { STATIONS, STATION_BY_NAME } from '../world/land.js';
import { scene, renderer, camera } from '../engine/renderer.js';
import { buildTextures } from '../engine/textures.js';
import { applyTime, TKEY, TIMES } from '../engine/lighting.js';
import { buildTerrain } from '../world/terrain.js';
import { buildWater } from '../world/water.js';
import { game, EX } from './state.js';
import { markTrackMask, buildNetwork, buildSleepers, DEPART, STOP_MARK } from '../world/tracks.js';
import { prewarmTownTiles } from '../world/towns.js';
import { citizens } from '../world/creatures.js';
import { updateVegetation } from '../world/vegetation.js';
import { trainMaterials, train, buildLoco, buildCab, cam, placeTrainAt, rebuildConsist, updateTrainPose, setCamMode } from './train.js';
import { exInit, exStart } from './explore.js';
import { buildScenery } from '../world/world.js';
import { audio } from './audio.js';
import { loadSave, applyLevel, renderLever, arriveAt, ticker } from './railgame.js';
import { buildMapBase } from './map.js';
import { onTimeChanged, resize, _camPos, frame, registerFarCull } from './loop.js';
import { installDebug } from './debug.js';
import { updateHedges } from '../world/hedges.js';

async function boot() {
  try { await Promise.race([Promise.all([document.fonts.load('40px Bungee'), document.fonts.load('600 20px "Barlow Condensed"')]), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  const T0 = performance.now(); const step = async (msg) => { console.log('boot', Math.round(performance.now() - T0), msg); setStatus(msg); await new Promise(r => setTimeout(r, 16)); };
  await step('Fabrication des textures…');
  buildTextures();
  await step('Pose des rails…');
  markTrackMask();
  await step('Calcul de la lumière…');
  applyTime(TKEY);
  await step('Sculpture des montagnes…');
  const fieldCenters = STATIONS.map(st => ({ x: st.x, z: st.z, cx: st.x - st.dir.y * 80, cz: st.z + st.dir.x * 80, urb: 0, r2: Math.pow((st.meta.R || 300) * 2.3 + 650, 2), inner2: Math.pow((st.meta.R || 300) + 40, 2), angle: (hashStr(st.name) % 314) / 100 }));
  scene.add(buildTerrain(fieldCenters));
  scene.add(buildWater());
  await step('Construction des viaducs et des tunnels…');
  scene.add(buildNetwork());
  await step('Installation des 31 gares…');
  const info = await buildScenery();
  await step('Attelage de la BB 12012…');
  trainMaterials();
  buildSleepers();
  train.loco = buildLoco(); train.cab = buildCab();
  train.loco.add(train.cab); train.loco.add(cam.rig);
  train.group.add(train.loco); scene.add(train.group);
  buildMapBase();
  for (const c of citizens.list) c.visible = false;
  if (citizens.meshes) for (const k in citizens.meshes) citizens.meshes[k].visible = false;
  const had = loadSave();
  applyLevel();
  onTimeChanged(TIMES[TKEY]);
  const startSt = STATIONS[game.lastStation] || STATION_BY_NAME['Douzi City'];
  placeTrainAt(startSt.id, DEPART[startSt.id][1][0].t.stub ? -1 : 1);
  rebuildConsist(game.slots);
  updateTrainPose();
  setCamMode('drone');
  $('opt-sound').checked = game.sound; $('opt-voice').checked = game.voice;
  document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('on', b.dataset.q === QKEY));
  renderLever();
  resize();
  await step('Premier rendu…');
  // les tuiles à la demande voisines du départ sont fabriquées ici : leurs matériaux se compilent pendant le chargement
  _camPos.set(startSt.x, 0, startSt.z); updateVegetation(_camPos); updateHedges(_camPos); prewarmTownTiles(_camPos);
  renderer.compile(scene, camera);
  $('loading').classList.add('done');
  $('title-sub').textContent = had ? `Reprise du service à ${startSt.name} · ${fmtMoney(game.money)} Pork$ en caisse` : 'Exploration libre · 31 villes · à pied, en voiture';
  console.log('boot', Math.round(performance.now() - T0), 'fin'); console.log('Porkonia Express prêt', JSON.stringify(info));
  installDebug(info);
  // mesure des performances sur l'appareil : module chargé seulement si l'adresse finit par ?mesure
  if (new URLSearchParams(location.search).has('mesure')) import('./mesure.js');
  requestAnimationFrame(frame);
  exInit(); console.log('farcull', registerFarCull());
  $('b-start').onclick = () => {
    if (EX.on) { exStart(); return; }
    audio.init(); audio.resume();
    game.started = true;
    $('title').classList.add('gone');
    document.body.classList.add('playing');
    setCamMode('cabine');
    game.stoppedAt = -1;
    arriveAt(startSt, STOP_MARK + 100);
    ticker(`Bienvenue à bord. Vous êtes en gare de ${startSt.name}. Chargez des wagons, puis montez la manette.`);
    game.tickerT = 40;
  };
}
try {
  await boot();
} catch (e) { console.error(e); fatal('Erreur au chargement : ' + e.message + '.'); }
