// Session 21 (M10.2): the 1903 railway line in the ground: its bed (partly
// open: saplings and brush back on it), its grade, the hills its two
// tunnels are bored into, and where the pathways cross it.
import { describe, it, expect } from 'vitest';
import { config, makeMap, makeGround } from './mapFixture.js';
import { railCrossings, railZAt, railDistance, buildRailway } from '../src/world/railway.js';
import { makeGeometry } from '../src/world/mapGeometry.js';

const rc = config.map.railway;
const ground = makeGround(1234);
const map = ground.map;
const line = map.railway;

describe('the railway in the ground', () => {
  it('builds the same line from config alone', () => {
    expect(buildRailway(makeGeometry(config.map), rc).points).toEqual(line.points);
  });

  it('has a bed of worn ballast, open enough to walk, not as open as a pathway', () => {
    let samples = 0;
    for (let x = -400; x <= 400; x += 23) {
      const z = railZAt(line, x);
      if (map.clearings.some((c) => Math.hypot(c.x - x, c.z - z) < c.radius + 12)) continue;
      if (map.paths.some((p) => p.points.some((q) => Math.hypot(q.x - x, q.z - z) < 8))) continue;
      samples++;
      expect(ground.openAt(x, z)).toBeGreaterThan(rc.bedOpen - 0.2);
      expect(ground.openAt(x, z)).toBeLessThanOrEqual(rc.bedOpen + 0.04);
      expect(ground.dirtAt(x, z)).toBeGreaterThan(0.3);
      expect(ground.regrowthAt(x, z)).toBe(1);
      // Forest a little way off it.
      expect(ground.regrowthAt(x, z + 12)).toBe(0);
    }
    expect(samples).toBeGreaterThan(15);
  });

  it('is graded: smoother along its line than the ground beside it', () => {
    const rough = (off) => {
      let sum = 0;
      let prev = null;
      for (let x = -380; x <= 380; x += 4) {
        const h = ground.heightAt(x, railZAt(line, x) + off);
        if (prev !== null) sum += Math.abs(h - prev);
        prev = h;
      }
      return sum;
    };
    expect(rough(0)).toBeLessThan(rough(40) * 0.8);
  });

  it('runs into a hill at each edge, its portal in a cutting', () => {
    for (const t of line.tunnels) {
      const inFront = ground.heightAt(t.x + t.facing * 30, t.z);
      const behind = ground.heightAt(t.x - t.facing * 8, t.z);
      const bank = ground.heightAt(t.x + t.facing * 2, t.z + 12);
      const bed = ground.heightAt(t.x + t.facing * 2, t.z);
      expect(behind - inFront).toBeGreaterThan(rc.tunnel.hillHeight * 0.5);
      expect(bank - bed).toBeGreaterThan(2); // the cutting's sides rise either side of the bed
    }
  });

  it('finds every pathway crossing, each on the line and on its pathway', () => {
    const xs = railCrossings(line, map.paths);
    expect(xs.length).toBeGreaterThan(1);
    for (const c of xs) {
      expect(railDistance(line, c.x, c.z).distance).toBeLessThan(0.05);
      const p = map.paths[c.path];
      expect(p.points.some((q) => Math.hypot(q.x - c.x, q.z - c.z) < 5)).toBe(true);
      expect(Math.hypot(c.tx, c.tz)).toBeCloseTo(1);
    }
    // Every pathway with ends either side of the line crosses it.
    for (let i = 0; i < map.paths.length; i++) {
      const p = map.paths[i];
      const a = p.points[0];
      const b = p.points[p.points.length - 1];
      if ((a.z - railZAt(line, a.x)) * (b.z - railZAt(line, b.x)) < 0) expect(xs.some((c) => c.path === i)).toBe(true);
    }
  });
});
