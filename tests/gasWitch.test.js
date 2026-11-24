// Nov 24 (Aaron): the mutant down, Tom pauses on the body, the camera swivels to the witch (who must be
// visible), slower so the music lands.
import { describe, it, expect } from 'vitest';
import { distToSegment, forecourtBlockers, lineClear, pickWitchSpot } from '../src/encounters/gasWitchSpot.js';
import { easeTurn, angleBetween } from '../src/story/Cutscenes.js';
import { GasStation } from '../src/encounters/GasStation.js';
import { config } from '../src/config.js';
import gas from '../src/data/gasStation.json';
import cutscenes from '../src/data/cutscenes.json';

const list = Array.isArray(cutscenes) ? cutscenes : cutscenes.cutscenes;
const scene = list.find((c) => c.id === 'gas.witch');
const w = config.gasStation.witch;

describe('her spot across the road', () => {
  it('measures a line', () => {
    expect(distToSegment({ x: 0, z: 5 }, { x: -1, z: 0 }, { x: 1, z: 0 })).toBe(5);
    expect(distToSegment({ x: 3, z: 0 }, { x: -1, z: 0 }, { x: 1, z: 0 })).toBe(2);
  });

  it('skips a spot with a car in the line and takes the next most nearly across', () => {
    const spots = [{ x: 0, z: 20 }, { x: -4, z: 20 }, { x: 6, z: 20 }];
    const blockers = [{ x: 0, z: 10, r: 2.4 }];
    expect(pickWitchSpot({ x: 0, z: 0 }, spots, blockers, w)).toEqual({ x: 6, z: 20 }); // (-4's line clips the car too)
    expect(pickWitchSpot({ x: 0, z: 0 }, spots, [], w)).toEqual({ x: 0, z: 20 });
  });

  it('with nothing clear, the spot with the fewest things in the way', () => {
    const spots = [{ x: 0, z: 20 }, { x: 5, z: 20 }];
    const blockers = [{ x: 0, z: 10, r: 1 }, { x: 0, z: 15, r: 1 }, { x: 2.5, z: 10, r: 1 }];
    expect(pickWitchSpot({ x: 0, z: 0 }, spots, blockers, w)).toEqual({ x: 5, z: 20 });
  });

  it('from anywhere out on the forecourt (as authored; not pressed against a pump island), a spot is in clear sight and in range', () => {
    const blockers = forecourtBlockers(gas, config.gasStation.look, gas.cars);
    const free = (p) => blockers.every((b) => Math.hypot(b.x - p.x, b.z - p.z) > b.r + 0.8); // (0.8: up against a kerb the pumps fill the view)
    let tried = 0;
    for (let x = gas.forecourt.x0; x <= gas.forecourt.x1; x += 1) {
      for (let z = gas.building.z1 + 0.6; z <= gas.forecourt.z1; z += 1) {
        const p = { x, z };
        if (!free(p)) continue; // not standing inside a car or a pump
        tried++;
        const ok = gas.witch.spots.some((s) => {
          const d = Math.hypot(s.x - x, s.z - z);
          return d >= w.minDistance && d <= w.maxDistance && lineClear(p, s, blockers, w.margin);
        });
        expect(ok, `from ${x},${z}`).toBe(true);
      }
    }
    expect(tried).toBeGreaterThan(100);
  });
});

describe('the eased turn', () => {
  it('eases in and out, and turns the short way round', () => {
    expect(easeTurn(0)).toBe(0);
    expect(easeTurn(1)).toBe(1);
    expect(easeTurn(0.5)).toBeCloseTo(0.5);
    expect(easeTurn(0.1)).toBeLessThan(0.1);
    expect(angleBetween(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleBetween(0, 1)).toBeCloseTo(1);
  });
});

describe('gas.witch, slowed (Nov 24)', () => {
  const at = (pred) => scene.tracks.find(pred)?.at;
  it('rests on the body, then turns to her in an eased swivel', () => {
    expect(scene.tracks[0]).toMatchObject({ at: 0, do: 'lookAt', target: 'gasMutantBody' });
    const turn = scene.tracks.find((t) => t.do === 'lookAt' && t.target === 'herSpot');
    expect(turn.at).toBeGreaterThanOrEqual(2);
    expect(turn.seconds).toBeGreaterThan(1);
  });
  it('lands the sting as she settles into view, and holds on her before she runs', () => {
    const turn = scene.tracks.find((t) => t.do === 'lookAt' && t.target === 'herSpot');
    const sting = at((t) => t.do === 'music' && t.sting === 'stingWitch');
    expect(sting).toBeGreaterThan(turn.at + turn.seconds * 0.5);
    expect(sting).toBeLessThanOrEqual(turn.at + turn.seconds);
    const run = at((t) => t.do === 'move' && t.actor === 'her');
    expect(run - sting).toBeGreaterThanOrEqual(3.5);
    expect(scene.duration).toBeGreaterThan(run + 1.5);
  });
});

describe('the kill starts it (Nov 24)', () => {
  function station(local) {
    return {
      gc: config.gasStation,
      mutantState: 'awake',
      witchSeen: false,
      witchIn: -1,
      mutant: { x: 4, z: 6 },
      inside: (l) => l.inside,
      local: () => local,
      progress: { setFlag() {} },
      bus: { emit() {} },
      dialogue: { play() {} },
    };
  }
  it('outside: the witch a beat after, and the body remembered', () => {
    const st = station({ inside: false });
    GasStation.prototype.mutantDown.call(st);
    expect(st.witchIn).toBe(w.afterKill);
    expect(st.bodyAt).toEqual({ x: 4, z: 6 });
  });
  it('inside the store: she waits for him to come out, as before', () => {
    const st = station({ inside: true });
    GasStation.prototype.mutantDown.call(st);
    expect(st.witchIn).toBe(-1);
  });
});
