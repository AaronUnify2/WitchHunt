// The military cordon's layout (pure; M9.1, DESIGN.md "Fixed opening
// cluster"): a straight fence along the cordon line, edge to edge of the
// map, split into panels between posts. Most panels are whole; a few are
// torn (gaps the dead pulled open from the far side); the road crosses at
// the checkpoint, where the fence leaves room for its gate. Signs,
// floodlight posts and concrete barriers stand along it. The same every
// run (the cordon is part of the fixed opening cluster).
//
// Colliders: a whole panel stops everyone; a torn one stops only the
// player (`playerOnly`); none stops shots (it's chain-link).

import { segmentCollider } from './collision.js';

// map: from generateMap() (its geometry and cluster). cfg: config.map.cordon.
// Returns { z, panels: [{ ax, az, bx, bz, kind: 'whole' | 'torn' }],
// posts: [{ x, z }], signs: [{ x, z }], lamps: [{ x, z }],
// barriers: [{ x, z }], checkpoint: { x, z, half } }.
export function cordonLayout(map, cfg) {
  const geo = map.geometry;
  const z = map.cluster.cordonZ;
  const home = geo.cluster.home;
  const cp = { x: map.cluster.checkpoint.x, z, half: cfg.checkpointHalf };
  const gaps = cfg.gaps.map((dx) => home.x + dx);

  const panels = [];
  const posts = [];
  // Two runs of posts, west of the checkpoint and east of it, each ending
  // exactly at the checkpoint's gateposts.
  const runs = [
    [geo.xMin, cp.x - cp.half],
    [cp.x + cp.half, geo.xMax],
  ];
  for (const [x0, x1] of runs) {
    const n = Math.max(1, Math.round((x1 - x0) / cfg.panelLength));
    const step = (x1 - x0) / n;
    for (let i = 0; i <= n; i++) posts.push({ x: x0 + i * step, z });
    for (let i = 0; i < n; i++) {
      const ax = x0 + i * step;
      const bx = ax + step;
      const torn = gaps.some((g) => g >= ax && g < bx);
      panels.push({ ax, az: z, bx, bz: z, kind: torn ? 'torn' : 'whole' });
    }
  }

  const along = (spacing, offset, keep) => {
    const out = [];
    for (let x = geo.xMin + offset; x < geo.xMax; x += spacing) if (keep(x)) out.push({ x, z });
    return out;
  };
  const clearOf = (x, d) => Math.abs(x - cp.x) > cp.half + d && gaps.every((g) => Math.abs(x - g) > d);
  const signs = along(cfg.signSpacing, cfg.signSpacing / 2, (x) => clearOf(x, cfg.panelLength * 2));
  const lamps = along(cfg.lampSpacing, cfg.lampSpacing / 3, (x) => clearOf(x, cfg.panelLength * 3));
  const barriers = [];
  for (const side of [-1, 1]) {
    for (let d = cp.half + cfg.barrierLength / 2 + 0.5; d < cfg.barrierReach; d += cfg.barrierLength + 0.15) {
      barriers.push({ x: cp.x + side * d, z: z + cfg.thickness + 0.6 });
    }
  }
  return { z, panels, posts, signs, lamps, barriers, checkpoint: cp };
}

// The fence's colliders (segments, base and top from the ground under
// each panel). heightAt(x, z): the ground.
export function cordonColliders(layout, cfg, heightAt) {
  return layout.panels.map((p) => {
    const base = Math.min(heightAt(p.ax, p.az), heightAt(p.bx, p.bz));
    const c = segmentCollider(p.ax, p.az, p.bx, p.bz, cfg.thickness, base - 1, base + cfg.height + cfg.coilHeight, false);
    if (p.kind === 'torn') c.playerOnly = true;
    c.cordon = true;
    return c;
  });
}

// The checkpoint gate's collider: across the road gap, stopping only the
// player while it's shut (the dead walk through). `off` when open.
export function checkpointGateCollider(layout, cfg, heightAt) {
  const cp = layout.checkpoint;
  const base = heightAt(cp.x, cp.z);
  const c = segmentCollider(cp.x - cp.half, cp.z, cp.x + cp.half, cp.z, cfg.thickness, base - 1, base + cfg.height, false);
  c.playerOnly = true;
  c.cordon = true;
  return c;
}
