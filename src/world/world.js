// Assemblage du décor. Chaque ville et chaque phase a son propre générateur aléatoire (seeds.js).
// L'ordre compte encore là où une phase lit ce qu'une autre a posé (terrains réservés, rues, arbres des villes).
import { setStatus, tick } from '../engine/util.js';
import { STATIONS } from './land.js';
import { scene } from '../engine/renderer.js';
import { rngMonuments, rngVille, rngPhase } from './seeds.js';
import { SPOTS, PARKED } from './registry.js';
import { sceneryMaterials, scenery, BUILDINGS, STREETS } from './scenery.js';
import { propDefs, propsCountry, buildProps, buildParked } from './props.js';
import { layoutTown2, placeFarms2, buildTown3 } from './towns.js';
import { buildStation, landmark } from './landmarks.js';
import { buildCitizens, buildHerds } from './creatures.js';
import { buildVegetation, buildHay } from './vegetation.js';
import { buildGoblins, buildSmoke, buildBirds, buildCars } from './ambiance.js';
import { buildRoads } from './roads.js';

export async function buildScenery() {
  sceneryMaterials();
  propDefs();
  for (const st of STATIONS) buildStation(st);
  for (const st of STATIONS) { const rnd = rngMonuments(st.name); for (const k of st.meta.lm) landmark(k, st, rnd); }
  for (const st of STATIONS) layoutTown2(st, rngVille(st.name));
  setStatus('Tracé des routes…'); await tick();
  const nRoads = buildRoads();
  placeFarms2(rngPhase('fermes'));
  propsCountry(rngPhase('campagne'));
  const nProps = buildProps();
  buildTown3();
  setStatus('Plantation des forêts…'); await tick();
  buildCitizens();
  buildHerds(rngPhase('troupeaux'));
  const nTrees = buildVegetation(rngPhase('forets'));
  buildHay(rngPhase('foin'));
  buildGoblins();
  setStatus("Pousse de l'herbe…"); await tick();
  buildSmoke();
  buildBirds(rngPhase('oiseaux'));
  buildCars();
  buildParked();
  scene.add(scenery);
  return { nTrees, nBuildings: BUILDINGS.length, streets: STREETS.length, roads: nRoads, props: nProps, spots: SPOTS.length, parked: PARKED.length };
}
