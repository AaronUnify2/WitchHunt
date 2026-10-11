// Shared test helpers: the real map config and data, and a cached
// generated map + ground per seed (building one takes a moment).

import { config } from '../src/config.js';
import { Rng } from '../src/core/Rng.js';
import { generateMap } from '../src/world/MapGenerator.js';
import { GroundField } from '../src/world/GroundField.js';
import encounters from '../src/data/encounters.json';
import sigilGrounds from '../src/data/sigilGrounds.json';
import clearingTypes from '../src/data/clearingTypes.json';

export const MAP_DATA = {
  encounters: encounters.encounters,
  sigilGrounds: sigilGrounds.grounds,
  clearingTypes: clearingTypes.types,
};

export function makeMap(seed) {
  return generateMap(config.map, MAP_DATA, new Rng(seed), seed);
}

const grounds = new Map();
export function makeGround(seed) {
  if (!grounds.has(seed)) {
    const map = makeMap(seed);
    grounds.set(seed, new GroundField(map, config.map, config.terrain));
  }
  return grounds.get(seed);
}

export { config };
