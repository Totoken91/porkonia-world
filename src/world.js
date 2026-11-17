// Assemblage du décor dans l'ordre (le générateur aléatoire est partagé : ne pas réordonner)
import { mulberry, STATIONS, setStatus, tick, scene } from './core.js';
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
  const rnd = mulberry(1212);
  for (const st of STATIONS) buildStation(st);
  for (const st of STATIONS) for (const k of st.meta.lm) landmark(k, st, rnd);
  for (const st of STATIONS) layoutTown2(st, rnd);
  setStatus('Tracé des routes…'); await tick();
  const nRoads = buildRoads();
  placeFarms2(rnd);
  propsCountry(rnd);
  const nProps = buildProps();
  buildTown3();
  setStatus('Plantation des forêts…'); await tick();
  buildCitizens();
  buildHerds(rnd);
  const nTrees = buildVegetation(rnd);
  buildHay(rnd);
  buildGoblins();
  setStatus("Pousse de l'herbe…"); await tick();
  // herbe en brins retirée (sol travaillé dans le shader du terrain)
  buildSmoke();
  buildBirds(rnd);
  buildCars(rnd);
  buildParked();
  scene.add(scenery);
  return { nTrees, nBuildings: BUILDINGS.length, streets: STREETS.length, roads: nRoads, props: nProps, spots: SPOTS.length, parked: PARKED.length };
}
