// Session 16 (Aaron): the wrecked car on the trail to the campsite is there every run, bloody.
import { describe, it, expect } from 'vitest';
import { Campsite } from '../src/encounters/Campsite.js';
import { placeVehicles } from '../src/world/vehiclePlacement.js';
import vehicleData from '../src/data/vehicles.json';
import { makeMap, makeGround, config } from './mapFixture.js';
import { Rng } from '../src/core/Rng.js';

describe('the wreck on the trail to the campsite', () => {
  for (const seed of [1, 7, 1234, 99]) {
    it(`seed ${seed}: is placed, bloody, near the path`, () => {
      const map = makeMap(seed);
      const ground = makeGround(seed);
      const spots = Campsite.trailWreckSpots(map);
      expect(spots.length).toBeGreaterThan(0);
      const placed = placeVehicles(map, ground, vehicleData, config.vehicles, new Rng(seed), [], [], { trail: spots });
      const wreck = placed.find((v) => v.bloody);
      expect(wreck).toBeTruthy();
      expect(spots.some((s) => Math.hypot(s.x - wreck.x, s.z - wreck.z) < 0.01)).toBe(true);
    });
  }
});
