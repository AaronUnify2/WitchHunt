// Session 21 (M10.2): the fixed story spine, the optional encounters the
// seed deals, the off-path stairs and the 1903 railway line on the map.
import { describe, it, expect } from 'vitest';
import { config, makeMap, MAP_DATA } from './mapFixture.js';
import { railDistance, railZAt } from '../src/world/railway.js';
import { hopCounts } from '../src/world/mapGraph.js';

const m = config.map;
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 13 + 5);
const maps = SEEDS.map((s) => makeMap(s));
const spineKeys = MAP_DATA.spine.places.map((p) => p.key);
const optionalKeys = MAP_DATA.encounters.filter((e) => e.placement === 'optional').map((e) => e.id);

describe('the story spine', () => {
  it('places every spine place, the same way on every seed', () => {
    const strip = (c) => ({ key: c.key, x: c.x, z: c.z, radius: c.radius, clearingType: c.clearingType, beat: c.beat, id: c.id });
    const first = maps[0].clearings.filter((c) => c.spine).map(strip);
    expect(first.map((c) => c.key)).toEqual(spineKeys);
    for (const map of maps) expect(map.clearings.filter((c) => c.spine).map(strip)).toEqual(first);
  });

  it('puts them where the data says, from home', () => {
    for (const map of maps) {
      const home = map.clearings[map.homeIndex];
      for (const p of MAP_DATA.spine.places) {
        const c = map.clearings.find((x) => x.spine && x.key === p.key);
        expect(c.x - home.x).toBeCloseTo(p.dx);
        expect(c.z - home.z).toBeCloseTo(p.dz);
      }
    }
  });

  it('keeps each spine place in its band, the hut deep in the south', () => {
    const bandOf = Object.fromEntries(MAP_DATA.encounters.map((e) => [e.id, e.band]));
    for (const c of maps[0].clearings.filter((x) => x.spine)) {
      const [lo, hi] = m.bands[bandOf[c.key]];
      expect(c.southness).toBeGreaterThanOrEqual(lo + m.bandPadding - 1e-9);
      expect(c.southness).toBeLessThanOrEqual(hi - m.bandPadding + 1e-9);
    }
    expect(maps[0].clearings[maps[0].hutIndex].spine).toBe(true);
    expect(maps[0].clearings[maps[0].hutIndex].southness).toBeGreaterThanOrEqual(m.hut.southnessMin);
  });

  it("runs the checkpoint's pathway to the crashed plane: the first stop after the outpost", () => {
    for (const map of maps) {
      const p = map.paths.find((q) => q.checkpoint);
      expect(map.clearings[p.b].key).toBe('crashedPlane');
      expect(map.cluster.frontierEntryIndex).toBe(p.b);
    }
  });

  it('puts the Bigfoot cave north, in the fixed cluster, at the end of the road north', () => {
    for (const map of maps) {
      const cave = map.clearings.find((c) => c.key === 'bigfootCave');
      expect(cave.cluster).toBe(true);
      expect(cave.z).toBeLessThan(map.clearings.find((c) => c.key === 'gasStation').z);
      const end = map.road.north.points[map.road.north.points.length - 1];
      expect(Math.hypot(end.x - cave.x, end.z - cave.z)).toBeLessThan(cave.radius + 4);
      // A secret until the story calls for it.
      expect(cave.hiddenAs).toBeTruthy();
      expect(cave.revealedBy).toBeTruthy();
    }
  });

  it('hangs the stairs off the map by one faint trail, and no loops', () => {
    for (const map of maps) {
      const stairs = map.clearings.find((c) => c.key === 'stairs');
      expect(stairs.offPath).toBe(true);
      const touching = map.paths.filter((p) => p.a === stairs.id || p.b === stairs.id);
      expect(touching).toHaveLength(1);
      expect(touching[0].faint).toBe(true);
      expect(map.paths.filter((p) => p.faint)).toHaveLength(1);
    }
  });

  it('keeps the spine out of reach of the hop-rule swaps (nothing moves a spine place)', () => {
    for (const map of maps) for (const c of map.clearings.filter((x) => x.spine)) expect(spineKeys).toContain(c.key);
  });
});

describe('the optional encounters', () => {
  it(`deals ${m.optional.min}-${m.optional.max} from the pool, each at most once`, () => {
    for (const map of maps) {
      const keys = map.clearings.filter((c) => c.optional).map((c) => c.key);
      expect(keys.length).toBeGreaterThanOrEqual(m.optional.min);
      expect(keys.length).toBeLessThanOrEqual(m.optional.max);
      expect(new Set(keys).size).toBe(keys.length);
      for (const k of keys) expect(optionalKeys).toContain(k);
      expect([...keys].sort()).toEqual([...map.dealt].sort());
    }
  });

  it('deals all five designed ones (Aaron, Session 21: as many as fit)', () => {
    for (const k of optionalKeys) expect(maps.filter((map) => map.clearings.some((c) => c.key === k)).length).toBe(maps.length);
  });

  it('places them where the seed says (they move between runs)', () => {
    const where = (map, k) => map.clearings.find((c) => c.key === k);
    const xs = new Set();
    for (const map of maps) {
      const c = where(map, 'sawmill');
      if (c) xs.add(Math.round(c.x));
    }
    expect(xs.size).toBeGreaterThan(3);
  });

  it('puts the railway cutting on the 1903 line', () => {
    let seen = 0;
    for (const map of maps) {
      const c = map.clearings.find((x) => x.key === 'railwayCutting');
      if (!c) continue;
      seen++;
      expect(c.onRailway).toBe(true);
      expect(Math.abs(c.z - railZAt(map.railway, c.x))).toBeLessThan(0.5);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe('the 1903 railway line on the map', () => {
  it('is the same on every seed, the full width east to west, on the middle/south border', () => {
    for (const map of maps) expect(map.railway.points).toEqual(maps[0].railway.points);
    const r = maps[0].railway;
    const g = maps[0].geometry;
    expect(r.points[0].x).toBeLessThan(g.xMin);
    expect(r.points[r.points.length - 1].x).toBeGreaterThan(g.xMax);
    for (const p of r.points) expect(Math.abs(p.z - r.z0)).toBeLessThan(20);
    // West to east, never doubling back.
    for (let i = 1; i < r.points.length; i++) expect(r.points[i].x).toBeGreaterThan(r.points[i - 1].x);
  });

  it('keeps every clearing but the railway cutting clear of it', () => {
    for (const map of maps) {
      for (const c of map.clearings) {
        if (c.onRailway) continue;
        expect(railDistance(map.railway, c.x, c.z).distance).toBeGreaterThanOrEqual(c.radius + m.railway.clearance - 1e-6);
      }
    }
  });

  it('has its two collapsed tunnels just beyond the walkable area', () => {
    const r = maps[0].railway;
    const g = maps[0].geometry;
    expect(r.tunnels).toHaveLength(2);
    expect(r.tunnels[0].x).toBeLessThan(g.walk.xMin);
    expect(r.tunnels[1].x).toBeGreaterThan(g.walk.xMax);
  });

  it('still lets every clearing be reached, the hut many pathways from home', () => {
    for (const map of maps) {
      const edges = map.paths.map((p) => [p.a, p.b]);
      const hops = hopCounts(map.clearings.length, edges, map.homeIndex);
      expect(hops.every((h) => h < Infinity)).toBe(true);
      expect(hops[map.hutIndex]).toBeGreaterThanOrEqual(m.hut.minHops);
    }
  });

  it('generates in a few attempts on any seed', () => {
    const attempts = maps.map((map) => map.attempts);
    expect(Math.max(...attempts)).toBeLessThan(m.maxAttempts / 2);
  });
});

describe('the witch and the spine', () => {
  it('keeps her routes clear of the spine and the cave (her hut excepted), and of home', async () => {
    const { Witch } = await import('../src/ai/Witch.js');
    const { GraphRoutes } = await import('../src/ai/witchRoutes.js');
    for (const map of maps.slice(0, 10)) {
      const avoided = Witch.avoided(map);
      expect(avoided).toContain(map.homeIndex);
      expect(avoided).not.toContain(map.hutIndex);
      for (const c of map.clearings) if ((c.spine && c.kind !== 'hut') || c.key === 'bigfootCave') expect(avoided).toContain(c.id);
      // Between two plain clearings, she goes round a spine place when the graph lets her.
      const routes = new GraphRoutes(map, avoided);
      const plain = map.clearings.filter((c) => c.kind === 'wild');
      for (const a of plain) {
        for (const b of plain) {
          if (a === b || routes.dist[a.id][b.id] >= routes.avoidPenalty) continue;
          const route = routes.route(a.x, a.z, b.x, b.z);
          for (const p of route) {
            for (const c of map.clearings) {
              if (!avoided.includes(c.id)) continue;
              expect(Math.hypot(p.x - c.x, p.z - c.z)).toBeGreaterThan(c.radius * 0.5);
            }
          }
        }
      }
    }
  });
});
