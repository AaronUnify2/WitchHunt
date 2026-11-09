import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { steerTo, circlePoint, passEnd, climbEnd, nextMove } from '../src/ai/flyerPath.js';
import { rayEnemiesAll } from '../src/combat/hitscan.js';

const f = config.spikes.flyer;

describe('The flyer spike (Session 22): its flight', () => {
  it('steers round toward a target and reaches it', () => {
    const p = { x: 0, y: 20, z: 0 };
    const v = { x: f.circleSpeed, y: 0, z: 0 }; // heading east
    const target = { x: 0, y: 2, z: 40 }; // south and down
    let d = Infinity;
    for (let i = 0; i < 600 && d > f.strikeRange; i++) d = steerTo(p, v, target, f.diveSpeed, f.steer * 1.6, 1 / 60);
    expect(d).toBeLessThan(f.strikeRange);
  });

  it('turns gradually, not in a snap', () => {
    const p = { x: 0, y: 0, z: 0 };
    const v = { x: 10, y: 0, z: 0 };
    steerTo(p, v, { x: -100, y: 0, z: 0 }, 10, f.steer, 1 / 60);
    expect(v.x).toBeGreaterThan(8); // still mostly going the old way after one frame
  });

  it('a pass goes over Tom and carries on past him', () => {
    const end = passEnd({ x: -50, y: 20, z: 0 }, 0, 0, 0, f.flyoverPast, f.flyoverHeight);
    expect(end.x).toBeCloseTo(f.flyoverPast);
    expect(end.y).toBe(f.flyoverHeight);
  });

  it('circles at its radius and climbs away after a dive', () => {
    const c = circlePoint(10, 0, 10, f.circleRadius, f.circleHeight, 1.2);
    expect(Math.hypot(c.x - 10, c.z - 10)).toBeCloseTo(f.circleRadius);
    const up = climbEnd({ x: 0, y: 1, z: 0 }, { x: 0, y: -5, z: 10 }, 0, f.climbDistance, f.circleHeight);
    expect(up.z).toBeCloseTo(f.climbDistance);
    expect(up.y).toBe(f.circleHeight);
  });

  it('works through its script and then leaves', () => {
    expect(nextMove(f.script, 0)).toBe(f.script[0]);
    expect(nextMove(f.script, f.script.length)).toBe('leave');
    expect(f.script).toContain('flyover');
    expect(f.script).toContain('dive');
  });

  it('can be shot where it flies (the hitscan finds its shape up in the air)', () => {
    const target = { x: 0, y: 12 - f.height * 0.55, z: -20, hitRadius: f.hitRadius, height: f.height, headBottom: f.headBottom, headRadius: f.headRadius };
    const origin = { x: 0, y: 1.6, z: 0 };
    const dx = 0;
    const dy = 12 - 1.6;
    const dz = -20;
    const len = Math.hypot(dx, dy, dz);
    const out = [];
    const n = rayEnemiesAll(origin, { x: dx / len, y: dy / len, z: dz / len }, [target], 100, out);
    expect(n).toBe(1);
    expect(out[0].distance).toBeLessThan(len);
  });
});
