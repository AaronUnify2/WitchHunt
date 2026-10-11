import { describe, it, expect } from 'vitest';
import { PathRoutes } from '../src/ai/pathRoutes.js';
import { Rng } from '../src/core/Rng.js';
import { makeMap } from './mapFixture.js';

// Walk a point along the routes at `speed` m/s; returns the clearings visited.
function walk(map, start, seconds, speed = 3) {
  const routes = new PathRoutes(map);
  const rng = new Rng(3);
  const w = { x: start.x, z: start.z, hasGoal: false };
  const visited = [];
  const dt = 0.1;
  let maxOff = 0;
  for (let t = 0; t < seconds; t += dt) {
    if (routes.step(w, rng, 2.5) && w.route && w.routeIndex === 1) visited.push(w.routeFrom);
    const dx = w.goalX - w.x;
    const dz = w.goalZ - w.z;
    const d = Math.hypot(dx, dz);
    const step = Math.min(d, speed * dt);
    if (d > 0) {
      w.x += (dx / d) * step;
      w.z += (dz / d) * step;
    }
    if (w.route) {
      // Distance from the walker to its pathway's polyline.
      let best = Infinity;
      const pts = w.route.points;
      for (const p of pts) best = Math.min(best, Math.hypot(p.x - w.x, p.z - w.z));
      maxOff = Math.max(maxOff, best);
    }
  }
  return { visited, maxOff, routes };
}

describe('PathRoutes', () => {
  it('heads for the nearest clearing first', () => {
    const map = makeMap(4);
    const routes = new PathRoutes(map);
    const c = map.clearings[7];
    const w = { x: c.x + 20, z: c.z + 5, hasGoal: false };
    routes.step(w, new Rng(1), 2.5);
    expect(w.routeNode).toBe(7);
    expect(w.goalX).toBe(c.x);
    expect(w.goalZ).toBe(c.z);
  });

  it('wanders from clearing to neighbouring clearing along the pathways', () => {
    const map = makeMap(4);
    const home = map.clearings[map.homeIndex];
    const { visited, maxOff } = walk(map, home, 1200);
    expect(visited.length).toBeGreaterThan(5);
    // Each hop is along a real pathway.
    const edges = new Set(map.edges.map((e) => `${Math.min(e.a, e.b)}-${Math.max(e.a, e.b)}`));
    for (let i = 1; i < visited.length; i++) {
      const a = visited[i - 1];
      const b = visited[i];
      expect(edges.has(`${Math.min(a, b)}-${Math.max(a, b)}`)).toBe(true);
    }
    // Stays on the trail (points are a few metres apart).
    expect(maxOff).toBeLessThan(20);
    // Doesn't just bounce between two clearings.
    expect(new Set(visited).size).toBeGreaterThan(3);
  });
});
