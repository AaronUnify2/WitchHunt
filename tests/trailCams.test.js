import { describe, it, expect } from 'vitest';
import { placeTrailCams, camSees } from '../src/story/trailCamPlacement.js';
import { Rng } from '../src/core/Rng.js';
import { config } from '../src/config.js';
import { makeMap, MAP_DATA } from './mapFixture.js';

describe('trail camera placement', () => {
  const tc = config.trailCams;

  for (const seed of [1, 42, 1234]) {
    it(`seed ${seed}: the same every time, in the north and middle, spaced out`, () => {
      const map = makeMap(seed);
      const a = placeTrailCams(map, new Rng(`${seed}:trailcams`), tc);
      const b = placeTrailCams(map, new Rng(`${seed}:trailcams`), tc);
      expect(a.some((c) => map.clearings[c.clearingId].cluster)).toBe(false); // M9.1: the seeded ones are in the frontier
      expect(a).toEqual(b);
      expect(a.length).toBeGreaterThan(0);
      expect(a.length).toBeLessThanOrEqual(tc.count);
      const byId = new Map(map.clearings.map((c) => [c.id, c]));
      for (const cam of a) {
        const c = byId.get(cam.clearingId);
        expect(tc.bands).toContain(c.band);
        expect(['home', 'hut']).not.toContain(c.kind);
        // Facing the clearing's centre.
        expect(camSees(cam, c.x, c.z, Infinity)).toBe(true);
      }
      // Their clearings are minSpacing apart (the posts sit at the edges).
      for (let i = 0; i < a.length; i++) {
        for (let j = i + 1; j < a.length; j++) {
          const ci = byId.get(a[i].clearingId);
          const cj = byId.get(a[j].clearingId);
          expect(Math.hypot(ci.x - cj.x, ci.z - cj.z)).toBeGreaterThanOrEqual(tc.minSpacing);
        }
      }
      // Numbered north to south.
      for (let i = 1; i < a.length; i++) expect(a[i].z).toBeGreaterThanOrEqual(a[i - 1].z);
      expect(a.map((c) => c.id)).toEqual(a.map((_, i) => i + 1));
    });
  }

  it("puts camera six by the storm shelter, the same every run, facing it (M9.1, #153)", () => {
    const fixed = MAP_DATA.cluster.trailCams;
    const lists = [1, 42, 1234].map((seed) => placeTrailCams(makeMap(seed), new Rng(`${seed}:trailcams`), tc, fixed));
    for (const list of lists) {
      expect(list).toHaveLength(tc.count);
      const six = list.find((c) => c.id === 6);
      expect(six.fixed).toBe(true);
      expect(six).toEqual(lists[0].find((c) => c.id === 6));
      expect(list.filter((c) => !c.fixed).map((c) => c.id)).toEqual([1, 2, 3, 4, 5]);
    }
    const map = makeMap(1);
    const shelter = map.clearings.find((c) => c.key === 'stormShelter');
    const six = lists[0].find((c) => c.id === 6);
    expect(camSees(six, shelter.x, shelter.z, tc.range)).toBe(true);
  });

  it('sees in front within range, not behind or too far', () => {
    const cam = { x: 0, z: 0, facing: 0 }; // looks toward -z
    expect(camSees(cam, 0, -10, 20)).toBe(true);
    expect(camSees(cam, 0, 10, 20)).toBe(false);
    expect(camSees(cam, 0, -30, 20)).toBe(false);
  });
});
