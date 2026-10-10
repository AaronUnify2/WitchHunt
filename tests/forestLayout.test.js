import { describe, it, expect } from 'vitest';
import { layoutForest } from '../src/world/forestLayout.js';
import { Rng } from '../src/core/Rng.js';

const cfg = {
  clearingRadius: 16,
  forestRadius: 60,
  cellSize: 3.4,
  jitter: 0.75,
  heightMin: 9,
  heightMax: 17,
  widthRatioMin: 0.38,
  widthRatioMax: 0.5,
  textureVariants: 3,
};

describe('layoutForest', () => {
  it('is the same for the same seed', () => {
    expect(layoutForest(cfg, new Rng(5))).toEqual(layoutForest(cfg, new Rng(5)));
  });

  it('differs for different seeds', () => {
    expect(layoutForest(cfg, new Rng(5))).not.toEqual(layoutForest(cfg, new Rng(6)));
  });

  it('keeps the clearing empty and stays inside the forest radius', () => {
    for (const t of layoutForest(cfg, new Rng(1))) {
      const r = Math.hypot(t.x, t.z);
      expect(r).toBeGreaterThanOrEqual(cfg.clearingRadius);
      expect(r).toBeLessThanOrEqual(cfg.forestRadius);
    }
  });

  it('never puts two trees closer than the jittered-grid minimum', () => {
    const trees = layoutForest(cfg, new Rng(2));
    const minSpacing = cfg.cellSize * (1 - cfg.jitter);
    for (let i = 0; i < trees.length; i++) {
      for (let j = i + 1; j < trees.length; j++) {
        const d = Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z);
        expect(d).toBeGreaterThanOrEqual(minSpacing - 1e-9);
      }
    }
  });

  it('keeps sizes and variants in range', () => {
    for (const t of layoutForest(cfg, new Rng(3))) {
      expect(t.height).toBeGreaterThanOrEqual(cfg.heightMin);
      expect(t.height).toBeLessThan(cfg.heightMax);
      expect(t.width / t.height).toBeGreaterThanOrEqual(cfg.widthRatioMin);
      expect(Number.isInteger(t.variant)).toBe(true);
      expect(t.variant).toBeGreaterThanOrEqual(0);
      expect(t.variant).toBeLessThan(cfg.textureVariants);
    }
  });
});
