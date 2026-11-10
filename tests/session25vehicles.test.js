// Session 25, batch 3: Aaron's notes on the experimental vehicles (the pure parts).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { Ute } from '../src/world/Ute.js';
import { Dozer } from '../src/world/Dozer.js';
import { LandClearing } from '../src/world/LandClearing.js';

describe("the ute's gun (Session 25)", () => {
  const ute = Object.create(Ute.prototype);
  ute.qc = config.ute;
  ute.heading = 0;

  it('dips far enough over the sides and the back to hit the dead at the tray', () => {
    const g = config.ute.gun;
    expect(ute.pitchFloor(0)).toBeCloseTo(g.pitchMin, 5); // over the cab: as it was
    for (const yaw of [Math.PI / 2, -Math.PI / 2, Math.PI]) expect(ute.pitchFloor(yaw)).toBeCloseTo(g.pitchMinSide, 5);
    // A zombie's chest (1.2 m) beside the tray, about 2.1 m from the gunner's eye (about 2.6 m up).
    expect(Math.tan(-g.pitchMinSide) * 2.1).toBeGreaterThan(2.6 - 1.2);
  });

  it('its lamps are duller and wider (no lights added: numbers only)', () => {
    expect(config.ute.headlamp.intensity).toBeLessThan(1000);
    expect(config.ute.headlamp.angle).toBeGreaterThan(24);
    expect(config.dozer.headlamp.intensity).toBeLessThan(800);
    expect(config.dozer.headlamp.angle).toBeGreaterThan(26);
  });
});

describe('the dozer (Session 25)', () => {
  const dozer = Object.create(Dozer.prototype);
  dozer.qc = config.dozer;
  dozer.x = 0;
  dozer.z = 0;
  dozer.heading = 0; // facing -z
  const car = { def: { size: [4.48, 1.78, 1.45] } };

  it("won't let a winched car touch it (so it can't shove it along)", () => {
    // In front of the blade (the blade's at -z), turned across it.
    expect(dozer.carClear(car, 0, -8, Math.PI / 2, 0.6)).toBe(true);
    expect(dozer.carClear(car, 0, -4.2, Math.PI / 2, 0.6)).toBe(false);
    // Alongside, touching the body.
    expect(dozer.carClear(car, 2.6, 0, 0, 0.6)).toBe(false);
    expect(dozer.carClear(car, 6, 0, 0, 0.6)).toBe(true);
  });

  it('breaks loose rocks: a moment for a small one, longer for a boulder, and remembers them', () => {
    const lc = Object.create(LandClearing.prototype);
    lc.cfg = config.dozer.clearing;
    lc.broken = [];
    lc.felled = [];
    lc.stamps = [];
    const rocks = [{ x: 0, z: 0, size: 0.4, col: {} }, { x: 5, z: 0, size: 1.1, col: {} }];
    lc.terrain = { rocks, breakRock: (i) => (rocks[i].broken ? null : ((rocks[i].broken = true), (rocks[i].col.off = true), rocks[i])) };
    const small = lc.rockStrain(rocks[0]);
    const big = lc.rockStrain(rocks[1]);
    expect(small).toBeLessThan(0.6);
    expect(big).toBeGreaterThan(small);
    expect(big).toBeLessThan(2);
    expect(lc.breakRock(1, true)).toBe(true);
    expect(rocks[1].col.off).toBe(true);
    expect(lc.breakRock(1, true)).toBe(false);
    expect(lc.saveState()).toEqual({ felled: [], stamps: [], rocks: [1] });
    // A save from before rocks broke has no list: nothing breaks.
    const fresh = Object.create(LandClearing.prototype);
    Object.assign(fresh, { cfg: lc.cfg, broken: [], felled: [], stamps: [], terrain: lc.terrain, forest: { trees: [] } });
    expect(fresh.saveState()).toBeUndefined();
  });
});
