// Pure, seeded tree placement: a jittered grid over a ring around the
// clearing. One tree per cell keeps spacing even without overlaps.

export function layoutForest(cfg, rng) {
  const trees = [];
  const { cellSize, jitter, clearingRadius, forestRadius } = cfg;
  const cells = Math.ceil((forestRadius * 2) / cellSize);
  const origin = -cells * cellSize * 0.5;

  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < cells; j++) {
      // Always draw the same numbers per cell so the layout only depends on the seed.
      const jx = rng.range(-0.5, 0.5) * jitter * cellSize;
      const jz = rng.range(-0.5, 0.5) * jitter * cellSize;
      const height = rng.range(cfg.heightMin, cfg.heightMax);
      const widthRatio = rng.range(cfg.widthRatioMin, cfg.widthRatioMax);
      const variant = rng.int(0, cfg.textureVariants - 1);

      const x = origin + (i + 0.5) * cellSize + jx;
      const z = origin + (j + 0.5) * cellSize + jz;
      const r = Math.hypot(x, z);
      if (r < clearingRadius || r > forestRadius) continue;
      trees.push({ x, z, height, width: height * widthRatio, variant });
    }
  }
  return trees;
}
