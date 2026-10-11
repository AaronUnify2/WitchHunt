import { describe, it, expect } from 'vitest';
import { config, makeGround } from './mapFixture.js';
import { layoutForest, layoutUndergrowth } from '../src/world/forestLayout.js';
import { cliffZ } from '../src/world/mapGeometry.js';
import { Rng } from '../src/core/Rng.js';

const f = config.forest;
const u = f.undergrowth;
const ground = makeGround(5);
const trees = layoutForest(f, ground, new Rng('trees'));
const bushes = layoutUndergrowth(u, ground, new Rng('bushes'), f.densityScale);

describe('layoutForest', () => {
  it('is the same for the same seed and differs for another', () => {
    const again = layoutForest(f, ground, new Rng('trees'));
    expect(again.length).toBe(trees.length);
    expect(again[1000]).toEqual(trees[1000]);
    expect(layoutForest(f, ground, new Rng('other'))[1000]).not.toEqual(trees[1000]);
  });

  it('fills the map with tens of thousands of trees', () => {
    expect(trees.length).toBeGreaterThan(30000);
  });

  it('keeps pathways and clearings free of trees', () => {
    for (const t of trees) expect(ground.openAt(t.x, t.z)).toBeLessThanOrEqual(f.maxOpen + 1e-6);
  });

  it('keeps trees off the cliff face (plateau trees are fine)', () => {
    for (const t of trees) {
      const line = cliffZ(ground.geo, t.x);
      expect(t.z > line + f.cliffGap || t.z < line - ground.geo.cliff.rampWidth).toBe(true);
    }
  });

  it('stands each tree on the ground', () => {
    for (let i = 0; i < trees.length; i += 97) expect(trees[i].y).toBeCloseTo(ground.heightAt(trees[i].x, trees[i].z));
  });

  it('never puts two trees closer than the jittered-grid minimum', () => {
    const near = trees.filter((t) => t.x > 0 && t.x < 120 && t.z > 0 && t.z < 120);
    const minSpacing = f.cellSize * (1 - f.jitter);
    for (let i = 0; i < near.length; i++) {
      for (let j = i + 1; j < near.length; j++) {
        expect(Math.hypot(near[i].x - near[j].x, near[i].z - near[j].z)).toBeGreaterThanOrEqual(minSpacing - 1e-9);
      }
    }
  });

  it('keeps sizes and variants in range', () => {
    for (const t of trees) {
      expect(t.height).toBeGreaterThanOrEqual(f.heightMin);
      expect(t.height).toBeLessThan(f.heightMax);
      expect(t.width / t.height).toBeGreaterThanOrEqual(f.widthRatioMin - 1e-9);
      expect(Number.isInteger(t.variant)).toBe(true);
      expect(t.variant).toBeGreaterThanOrEqual(0);
      expect(t.variant).toBeLessThan(f.textureVariants);
    }
  });
});

describe('layoutUndergrowth', () => {
  it('grows bushes off the pathways only, south of the cliff', () => {
    expect(bushes.length).toBeGreaterThan(30000);
    for (const b of bushes) {
      expect(ground.openAt(b.x, b.z)).toBeLessThanOrEqual(u.maxOpen + 1e-6);
      expect(b.z).toBeGreaterThan(cliffZ(ground.geo, b.x));
    }
  });

  it('keeps sizes and variants in range', () => {
    for (const b of bushes) {
      expect(b.height).toBeGreaterThanOrEqual(u.heightMin);
      expect(b.height).toBeLessThan(u.heightMax);
      expect(b.variant).toBeGreaterThanOrEqual(0);
      expect(b.variant).toBeLessThan(u.variants);
    }
  });
});
