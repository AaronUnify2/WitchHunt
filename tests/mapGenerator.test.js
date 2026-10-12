import { describe, it, expect } from 'vitest';
import { config, makeMap, MAP_DATA } from './mapFixture.js';
import { cliffZ } from '../src/world/mapGeometry.js';
import { hopCounts, isConnected, segmentsCross, graphDistance } from '../src/world/mapGraph.js';

const m = config.map;
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 7 + 1);
const maps = SEEDS.map((s) => makeMap(s));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

describe('generateMap: determinism', () => {
  it('is the same for the same seed', () => {
    expect(JSON.stringify(makeMap(42))).toBe(JSON.stringify(makeMap(42)));
  });

  it('differs for different seeds', () => {
    expect(JSON.stringify(makeMap(42).clearings)).not.toBe(JSON.stringify(makeMap(43).clearings));
  });

  it('accepts string seeds', () => {
    expect(JSON.stringify(makeMap('witch'))).toBe(JSON.stringify(makeMap('witch')));
  });
});

describe('generateMap: the roster', () => {
  it(`has ${m.clearingCount} clearings, one home and one hut`, () => {
    for (const map of maps) {
      expect(map.clearings).toHaveLength(m.clearingCount);
      expect(map.clearings.filter((c) => c.kind === 'home')).toHaveLength(1);
      expect(map.clearings.filter((c) => c.kind === 'hut')).toHaveLength(1);
    }
  });

  it('always has every guaranteed encounter', () => {
    const every = MAP_DATA.encounters.filter((e) => e.appears === 'every' && e.clearing !== false).map((e) => e.id);
    for (const map of maps) {
      const keys = map.clearings.map((c) => c.key);
      for (const id of every) expect(keys).toContain(id);
    }
  });

  it('puts the sigil grounds two north, two in the middle, one south (Aaron, M6)', () => {
    for (const map of maps) {
      const count = { north: 0, middle: 0, south: 0 };
      for (const c of map.clearings) if (c.kind === 'sigilGround') count[c.band]++;
      expect(count).toEqual(m.sigilGrounds.perBand);
    }
  });

  it('puts the Car Armory in the north (Aaron, M6)', () => {
    for (const map of maps) expect(map.clearings.find((c) => c.key === 'carArmory').band).toBe('north');
  });

  it(`has ${m.sigilGrounds.min}-${m.sigilGrounds.max} different sigil grounds`, () => {
    for (const map of maps) {
      const grounds = map.clearings.filter((c) => c.kind === 'sigilGround').map((c) => c.key);
      expect(grounds.length).toBeGreaterThanOrEqual(m.sigilGrounds.min);
      expect(grounds.length).toBeLessThanOrEqual(m.sigilGrounds.max);
      expect(new Set(grounds).size).toBe(grounds.length);
    }
  });

  it('has 2-3 staircases and keeps radio events off the map', () => {
    for (const map of maps) {
      const stairs = map.clearings.filter((c) => c.key === 'stairs').length;
      expect(stairs).toBeGreaterThanOrEqual(2);
      expect(stairs).toBeLessThanOrEqual(3);
      expect(map.clearings.some((c) => c.key === 'caller')).toBe(false);
      for (const e of map.radioEvents) expect(e.key).toBe('caller');
    }
  });

  it('gives every clearing but home and the hut a known clearing type', () => {
    const ids = MAP_DATA.clearingTypes.map((t) => t.id);
    for (const map of maps) {
      for (const c of map.clearings) {
        if (c.kind === 'home' || c.kind === 'hut') expect(c.clearingType).toBeNull();
        else expect(ids).toContain(c.clearingType);
      }
    }
  });
});

describe('generateMap: placement', () => {
  it('puts encounters in their band (by southness)', () => {
    const bandOf = Object.fromEntries(MAP_DATA.encounters.map((e) => [e.id, e.band]));
    for (const map of maps) {
      for (const c of map.clearings) {
        if (c.kind !== 'encounter' || c.key === 'campsite') continue;
        const [lo, hi] = m.bands[bandOf[c.key]];
        expect(c.southness).toBeGreaterThanOrEqual(lo);
        expect(c.southness).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('keeps clearings apart (the campsite may sit close to home)', () => {
    const gap = m.clearing.minGap * m.clearing.relaxedGapFactor;
    for (const map of maps) {
      const cs = map.clearings;
      for (let i = 0; i < cs.length; i++) {
        for (let j = i + 1; j < cs.length; j++) {
          const pair = [cs[i].key, cs[j].key];
          const extra = pair.includes('home') && pair.includes('campsite') ? 0 : gap;
          expect(dist(cs[i], cs[j])).toBeGreaterThanOrEqual(cs[i].radius + cs[j].radius + extra - 1e-6);
        }
      }
    }
  });

  it('keeps every clearing inside the walkable area and south of the cliff', () => {
    for (const map of maps) {
      const g = map.geometry;
      for (const c of map.clearings) {
        expect(c.x - c.radius).toBeGreaterThanOrEqual(g.walk.xMin);
        expect(c.x + c.radius).toBeLessThanOrEqual(g.walk.xMax);
        expect(c.z + c.radius).toBeLessThanOrEqual(g.walk.zMax);
        if (c.kind !== 'home') expect(c.z - c.radius).toBeGreaterThanOrEqual(cliffZ(g, c.x));
      }
    }
  });

  it('puts home against the cliff and the campsite next to it', () => {
    for (const map of maps) {
      const home = map.clearings[map.homeIndex];
      expect(home.z - cliffZ(map.geometry, home.x)).toBeCloseTo(m.home.offsetFromCliff);
      const camp = map.clearings.find((c) => c.key === 'campsite');
      expect(dist(home, camp)).toBeGreaterThanOrEqual(m.campsite.distanceMin - 1e-6);
      expect(dist(home, camp)).toBeLessThanOrEqual(m.campsite.distanceMax + 1e-6);
    }
  });

  it('puts the hut deep in the south, many pathways from home', () => {
    for (const map of maps) {
      const hut = map.clearings[map.hutIndex];
      expect(hut.southness).toBeGreaterThanOrEqual(m.hut.southnessMin);
      expect(hut.hopsFromHome).toBeGreaterThanOrEqual(m.hut.minHops);
    }
  });
});

describe('generateMap: pathways', () => {
  it('connects every clearing', () => {
    for (const map of maps) {
      expect(isConnected(map.clearings.length, map.edges.map((e) => [e.a, e.b]))).toBe(true);
    }
  });

  it('has loops on top of the spanning tree', () => {
    for (const map of maps) expect(map.edges.length).toBeGreaterThan(map.clearings.length - 1);
  });

  it('never crosses one pathway with another', () => {
    for (const map of maps) {
      const cs = map.clearings;
      const es = map.edges;
      for (let i = 0; i < es.length; i++) {
        for (let j = i + 1; j < es.length; j++) {
          const [a, b, c, d] = [es[i].a, es[i].b, es[j].a, es[j].b];
          if (a === c || a === d || b === c || b === d) continue;
          expect(segmentsCross(cs[a], cs[b], cs[c], cs[d])).toBe(false);
        }
      }
    }
  });

  it('keeps every north clearing a sensible walk from home', () => {
    for (const map of maps) {
      const cs = map.clearings;
      const pairs = map.edges.map((e) => [e.a, e.b]);
      const home = cs[map.homeIndex];
      for (const c of cs) {
        if (c.band !== 'north' || c === home) continue;
        expect(graphDistance(cs, pairs, home.id, c.id)).toBeLessThanOrEqual(m.edges.maxNorthDetour * dist(home, c) + 1e-6);
      }
    }
  });

  it('runs each pathway from one clearing centre to the other', () => {
    for (const map of maps) {
      for (const p of map.paths) {
        const first = p.points[0];
        const last = p.points[p.points.length - 1];
        expect(dist(first, map.clearings[p.a])).toBeCloseTo(0);
        expect(dist(last, map.clearings[p.b])).toBeCloseTo(0);
      }
    }
  });

  it('records the hop count from home on each clearing', () => {
    const map = maps[0];
    const hops = hopCounts(map.clearings.length, map.edges.map((e) => [e.a, e.b]), map.homeIndex);
    map.clearings.forEach((c, i) => expect(c.hopsFromHome).toBe(hops[i]));
  });
});
