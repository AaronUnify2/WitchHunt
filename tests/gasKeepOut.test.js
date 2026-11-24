// Nov 24 (Aaron: "make sure that all the zombies spawn in the car park or by the gas pumps ... I don't want any to
// spawn inside, because it increases the chance that you accidentally trigger the mutant"): keep-out areas.
import { describe, it, expect } from 'vitest';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { ZombieBrain } from '../src/ai/ZombieBrain.js';
import { GasStation } from '../src/encounters/GasStation.js';
import { Rng } from '../src/core/Rng.js';
import { frameToWorld } from '../src/world/clearingFrame.js';
import { config } from '../src/config.js';
import gas from '../src/data/gasStation.json';

const frame = { x: 100, z: -40, rx: 0.6, rz: 0.8, fx: -0.8, fz: 0.6 }; // turned, off the origin
const station = () => Object.assign(Object.create(GasStation.prototype), { frame, data: gas, gc: config.gasStation, player: { position: { x: 0, z: 0 } } });

describe('the shop is kept out (Nov 24)', () => {
  it('knows its walls (and the margin past them)', () => {
    const st = station();
    const b = gas.building;
    const m = config.gasStation.keepOutMargin;
    const w = (x, z) => frameToWorld(frame, x, z);
    const inside = w((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
    expect(st.inShop(inside.x, inside.z)).toBe(true);
    const justOut = w(0, b.z1 + m + 0.2); // on the forecourt by the door
    expect(st.inShop(justOut.x, justOut.z)).toBe(false);
    for (const p of gas.pack) {
      const q = w(p.x, p.z);
      expect(st.inShop(q.x, q.z), `${p.x},${p.z}`).toBe(false);
    }
  });

  it('the spawner re-rolls a point inside a keep-out', () => {
    const em = Object.assign(Object.create(EnemyManager.prototype), { rng: new Rng(7), keepOuts: [] });
    em.addKeepOut((x, z) => x > -5 && x < 5 && z > -5 && z < 5);
    for (let i = 0; i < 300; i++) {
      const p = em.ringPoint(0, 0, 0, 10);
      expect(em.inKeepOut(p.x, p.z)).toBe(false);
    }
    const drop = em.addKeepOut(() => false);
    expect(em.keepOuts).toHaveLength(2);
    drop();
    expect(em.keepOuts).toHaveLength(1);
  });

  it("the forecourt pack's strolling never takes them into the shop", () => {
    const st = station();
    const brain = Object.assign(Object.create(ZombieBrain.prototype), { rng: new Rng(3), wander: config.wander });
    brain.keepOut = (x, z) => st.inShop(x, z);
    const c = frameToWorld(frame, 0, config.gasStation.pack.centreZ);
    const z = { lingerX: c.x, lingerZ: c.z, lingerRadius: config.gasStation.pack.lingerRadius, x: c.x, z: c.z, hasGoal: false };
    let insideBefore = 0;
    const bare = Object.assign(Object.create(ZombieBrain.prototype), { rng: new Rng(3), wander: config.wander });
    for (let i = 0; i < 2000; i++) {
      z.hasGoal = false;
      brain.stepLinger(z);
      expect(st.inShop(z.goalX, z.goalZ)).toBe(false);
      const y = { ...z, hasGoal: false };
      bare.stepLinger(y);
      if (st.inShop(y.goalX, y.goalZ)) insideBefore++;
    }
    expect(insideBefore).toBeGreaterThan(0); // (without it, some of their goals were inside: the bug)
  });
});
