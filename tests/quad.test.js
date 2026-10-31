// Session 15b pass 3: the quad bike's numbers hang together.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import gas from '../src/data/gasStation.json';

describe('the quad bike', () => {
  const q = config.quad;
  const sprint = config.player.walkSpeed * config.player.sprintMultiplier;

  it('is quicker than running on a pathway, and the brush holds it back', () => {
    expect(q.maxSpeed).toBeGreaterThan(sprint * 1.5);
    expect(q.maxSpeed * q.undergrowthMultiplier).toBeLessThan(sprint);
    expect(q.reverseSpeed).toBeLessThan(q.maxSpeed / 2);
  });

  it('makes the witch faster while Tom rides it (Aaron)', () => {
    expect(q.witchSpeedScale).toBeGreaterThan(1);
  });

  it('can only be got off once it has slowed right down', () => {
    expect(q.dismountSpeed).toBeLessThan(q.bumpSpeed + 0.01);
  });

  it('is parked behind the store, clear of it and inside the clearing', () => {
    const b = gas.building;
    expect(q.parked.z).toBeLessThan(b.z0 - 1.5);
    expect(Math.hypot(q.parked.x, q.parked.z)).toBeLessThan(24);
    const d = gas.dumpster;
    expect(Math.hypot(q.parked.x - d.x, q.parked.z - d.z)).toBeGreaterThan(3);
  });

  it('knocks a level-1 citizen down when it hits one at full speed', () => {
    expect(q.ram.damage).toBeGreaterThanOrEqual(config.zombies.health);
  });
});
