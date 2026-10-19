import { describe, it, expect } from 'vitest';
import { config, makeGround } from './mapFixture.js';
import { layoutForest, layoutUndergrowth, pickTreeKind } from '../src/world/forestLayout.js';
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
    // South of the cordon the run's seed decides (north of it, see below).
    const south = (list) => list.filter((t) => !ground.isFixed(t.z + f.cellSize * 2));
    expect(south(layoutForest(f, ground, new Rng('other')))[1000]).not.toEqual(south(trees)[1000]);
  });

  it('grows the same trees north of the cordon whatever the seed (the opening cluster, M9.1)', () => {
    const north = (list) => list.filter((t) => ground.isFixed(t.z + f.cellSize * 2)).map((t) => [t.x, t.z, t.height, t.variant]);
    const other = makeGround(77);
    const mine = north(trees);
    expect(mine.length).toBeGreaterThan(1000);
    // Heights differ only through the ground under them; positions and kinds match.
    expect(north(layoutForest(f, other, new Rng('another'))).map((t) => [t[0], t[1], t[3]])).toEqual(mine.map((t) => [t[0], t[1], t[3]]));
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

  it("keeps each tree's size within its kind's range", () => {
    for (const t of trees) {
      expect(Number.isInteger(t.variant)).toBe(true);
      expect(t.variant).toBeGreaterThanOrEqual(0);
      expect(t.variant).toBeLessThan(f.kinds.length);
      const kind = f.kinds[t.variant];
      expect(t.height).toBeGreaterThanOrEqual(kind.height[0]);
      expect(t.height).toBeLessThan(kind.height[1]);
      expect(t.width / t.height).toBeGreaterThanOrEqual(kind.widthRatio[0] - 1e-9);
      expect(t.width / t.height).toBeLessThanOrEqual(kind.widthRatio[1] + 1e-9);
    }
  });

  it('grows each kind of tree in about its share', () => {
    const total = f.kinds.reduce((sum, k) => sum + k.weight, 0);
    const counts = f.kinds.map(() => 0);
    for (const t of trees) counts[t.variant]++;
    f.kinds.forEach((k, i) => expect(counts[i] / trees.length).toBeCloseTo(k.weight / total, 1));
  });

  it('picks kinds by weight', () => {
    const kinds = [{ weight: 1 }, { weight: 3 }];
    expect(pickTreeKind(kinds, 0)).toBe(0);
    expect(pickTreeKind(kinds, 0.24)).toBe(0);
    expect(pickTreeKind(kinds, 0.26)).toBe(1);
    expect(pickTreeKind(kinds, 0.999)).toBe(1);
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
    // Checked in plain code, then asserted once: four expects on each of
    // ~190,000 bushes timed out when the whole suite ran in parallel.
    const bad = bushes.filter((b) => !(b.height >= u.heightMin && b.height < u.heightMax && b.variant >= 0 && b.variant < u.variants));
    expect(bad).toEqual([]);
  });
});
