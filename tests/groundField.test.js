import { describe, it, expect } from 'vitest';
import { config, makeGround } from './mapFixture.js';
import { cliffZ } from '../src/world/mapGeometry.js';

const ground = makeGround(3);
const map = ground.map;
const geo = ground.geo;

describe('GroundField heights', () => {
  it('is the same for the same seed', () => {
    const other = makeGround(3);
    expect(other.heightAt(12.3, 45.6)).toBe(ground.heightAt(12.3, 45.6));
    expect(makeGround(4).heightAt(12.3, 45.6)).not.toBe(ground.heightAt(12.3, 45.6));
  });

  it('matches the height grid at grid points and changes smoothly between them', () => {
    const cell = ground.heightCell;
    expect(ground.heightAt(geo.xMin + 10 * cell, geo.zMin + 20 * cell)).toBeCloseTo(ground.gridHeight(10, 20));
    for (let k = 0; k < 200; k++) {
      const x = -300 + k * 3.1;
      const z = 100 + k * 1.7;
      expect(Math.abs(ground.heightAt(x + 0.2, z) - ground.heightAt(x, z))).toBeLessThan(0.5);
    }
  });

  it('has rolling hills a few metres high', () => {
    const south = [];
    for (let z = 0; z < 500; z += 10) for (let x = -400; x < 400; x += 10) south.push(ground.heightAt(x, z));
    const range = Math.max(...south) - Math.min(...south);
    expect(range).toBeGreaterThan(2);
    expect(range).toBeLessThan(25);
  });

  it('levels the clearings', () => {
    for (const c of map.clearings) {
      const centre = ground.heightAt(c.x, c.z);
      for (let a = 0; a < 8; a++) {
        const r = c.radius * 0.5;
        const h = ground.heightAt(c.x + Math.cos(a) * r, c.z + Math.sin(a) * r);
        expect(Math.abs(h - centre)).toBeLessThan(0.8);
      }
    }
  });

  it('lifts the plateau above the cliff', () => {
    for (let x = -400; x <= 400; x += 100) {
      const line = cliffZ(geo, x);
      const below = ground.heightAt(x, line + 2);
      const above = ground.heightAt(x, line - config.map.cliff.rampWidth - 5);
      expect(above - below).toBeGreaterThan(config.map.cliff.height - config.map.cliff.heightVariation - 3);
    }
  });
});

describe('GroundField masks', () => {
  it('is open (and bare) in clearing centres and along pathways', () => {
    for (const c of map.clearings) {
      expect(ground.openAt(c.x, c.z)).toBeGreaterThan(0.99);
      expect(ground.dirtAt(c.x, c.z)).toBeGreaterThan(0.9);
    }
    for (const p of map.paths) {
      const q = p.points[Math.floor(p.points.length / 2)];
      expect(ground.openAt(q.x, q.z)).toBeGreaterThan(0.95);
      expect(ground.undergrowthAt(q.x, q.z)).toBeLessThan(0.05);
    }
  });

  it('is undergrowth away from pathways and clearings', () => {
    let forest = 0;
    let samples = 0;
    for (let z = -500; z < 600; z += 37) {
      for (let x = -400; x < 400; x += 41) {
        samples++;
        if (ground.undergrowthAt(x, z) > 0.99) forest++;
      }
    }
    expect(forest / samples).toBeGreaterThan(0.7);
  });

  it('gives the dirt mask as bytes for the ground texture', () => {
    const bytes = ground.dirtBytes();
    expect(bytes).toHaveLength(ground.maskNx * ground.maskNz);
    expect(Math.max(...bytes.slice(0, 50000))).toBeLessThanOrEqual(255);
  });
});

describe('GroundField rays and bounds', () => {
  it('finds the ground under a ray pointing down', () => {
    const x = 50;
    const z = 50;
    const h = ground.heightAt(x, z);
    const t = ground.rayDistance({ x, y: h + 10, z }, { x: 0, y: -1, z: 0 }, 100, 0.5);
    expect(t).toBeCloseTo(10, 1);
  });

  it('returns the max distance for a ray high above the hills', () => {
    expect(ground.rayDistance({ x: 0, y: ground.maxHeight + 50, z: 0 }, { x: 1, y: 0, z: 0 }, 80, 1)).toBe(80);
  });

  it('keeps positions inside the walkable area and off the cliff', () => {
    const pos = ground.clamp({ x: 9999, z: -9999 });
    expect(pos.x).toBe(geo.walk.xMax);
    expect(pos.z).toBeCloseTo(cliffZ(geo, pos.x) + config.map.cliff.walkMargin);
    expect(ground.clamp({ x: 0, z: 9999 }).z).toBe(geo.walk.zMax);
  });
});
