// The world (M3): generates the map from the run's seed and builds
// everything standing on it: the rolling ground, rocks, the northern
// cliff, the forest and undergrowth, and the placeholder signposts for
// encounters and sigil grounds. Other systems use `ground` (heights,
// undergrowth, bounds) and `map` (clearings and pathways).

import { generateMap } from './MapGenerator.js';
import { GroundField } from './GroundField.js';
import { Terrain } from './Terrain.js';
import { Cliff } from '../render/Cliff.js';
import { Forest } from '../render/Forest.js';
import { Landmarks } from '../render/Landmarks.js';
import encountersData from '../data/encounters.json';
import sigilGroundsData from '../data/sigilGrounds.json';
import clearingTypesData from '../data/clearingTypes.json';
import openingClusterData from '../data/openingCluster.json';

export const MAP_DATA = {
  encounters: encountersData.encounters,
  sigilGrounds: sigilGroundsData.grounds,
  clearingTypes: clearingTypesData.types,
  cluster: openingClusterData,
};

// Clearings without a type (home, the hut) raise ordinary citizens.
const DEFAULT_VARIANTS = { citizen: 1 };

export class World {
  constructor(cfg, rng, seed) {
    this.cfg = cfg;
    this.rng = rng;
    this.seed = seed;
  }

  init(scene, colliders) {
    const cfg = this.cfg;
    const t0 = performance.now();
    this.map = generateMap(cfg.map, MAP_DATA, this.rng.fork('map'), this.seed);
    this.ground = new GroundField(this.map, cfg.map, cfg.terrain);
    this.typeNames = Object.fromEntries(MAP_DATA.clearingTypes.map((t) => [t.id, t.name]));
    this.typeColors = Object.fromEntries(MAP_DATA.clearingTypes.map((t) => [t.id, t.mapColor]));
    this.typeVariants = Object.fromEntries(MAP_DATA.clearingTypes.map((t) => [t.id, t.variants]));

    this.terrain = new Terrain(cfg.terrain, this.rng.fork('terrain'));
    this.terrain.init(scene, colliders, this.ground, this.map);
    this.cliff = new Cliff(cfg.map.cliff, cfg.terrain, this.rng.fork('cliff'));
    this.cliff.init(scene, colliders, this.ground);
    this.forest = new Forest(cfg.forest, this.rng.fork('forest'));
    this.forest.init(scene, colliders, this.ground);
    this.landmarks = new Landmarks(cfg.landmarks);
    this.landmarks.init(scene, colliders, this.map, this.ground, this.typeNames);
    this.buildMs = performance.now() - t0;
  }

  get home() {
    return this.map.clearings[this.map.homeIndex];
  }

  get hut() {
    return this.map.clearings[this.map.hutIndex];
  }

  // Where a run starts: home, facing south (toward the rest of the map).
  get spawn() {
    const h = this.home;
    return { x: h.x, z: h.z, yaw: Math.PI };
  }

  // The clearing (x, z) is in, or null.
  clearingAt(x, z) {
    for (const c of this.map.clearings) if (Math.hypot(c.x - x, c.z - z) <= c.radius) return c;
    return null;
  }

  // The nearest clearing to (x, z), with its distance.
  nearestClearing(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const c of this.map.clearings) {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return { clearing: best, distance: bestD };
  }

  // The zombie variant mix of a clearing's type ({ citizen: 0.7, ... }).
  variantMix(clearing) {
    return this.typeVariants[clearing.clearingType] ?? DEFAULT_VARIANTS;
  }

  // The variant mix where (x, z) is: that of the nearest clearing's type.
  variantMixAt(x, z) {
    return this.variantMix(this.nearestClearing(x, z).clearing);
  }

  // Short display name, e.g. "Gas station" or "Bog clearing".
  clearingName(c) {
    if (c.kind === 'wild') return `${this.typeNames[c.clearingType] ?? 'Plain'} clearing`;
    return c.name;
  }

  update(dt, cameraPosition) {
    this.terrain.update(dt, cameraPosition);
    this.cliff.update(dt, cameraPosition);
    this.forest.update(dt, cameraPosition);
    this.landmarks.update(dt, cameraPosition);
  }

  setDrawDistance(distance) {
    this.terrain.setDrawDistance(distance);
    this.cliff.setDrawDistance(distance);
    this.forest.setDrawDistance(distance);
    this.landmarks.setDrawDistance(distance);
  }

  dispose() {
    this.landmarks.dispose();
    this.forest.dispose();
    this.cliff.dispose();
    this.terrain.dispose();
  }
}
