// Story progress flags and the cluster's gates (M9.1): the soft-gated path
// order (DESIGN.md "Fixed opening cluster"), with today's stand-in triggers.
import { describe, it, expect } from 'vitest';
import { ProgressFlags, runTriggers } from '../src/story/progressFlags.js';
import { gateLayout, gateCollider, clusterPath } from '../src/world/gates.js';
import { resolveCircles } from '../src/world/collision.js';
import progress from '../src/data/progress.json';
import { makeMap, makeGround, config, MAP_DATA } from './mapFixture.js';

const flags = () => new ProgressFlags(progress.flags);
const ctx = (over = {}) => ({ event: null, day: 1, clearing: null, cleared: () => false, south: false, ...over });

describe('progress flags', () => {
  it('set, clear, save and load; unknown flags throw', () => {
    const f = flags();
    expect(f.set('night1')).toBe(true);
    expect(f.set('night1')).toBe(false);
    expect(f.has('night1')).toBe(true);
    const g = flags();
    g.loadState([...f.saveState(), 'noSuchFlag']);
    expect(g.list()).toEqual(['night1']);
    g.loadState(undefined);
    expect(g.list()).toEqual([]);
    expect(() => f.set('nope')).toThrow();
  });

  it("every trigger's flags exist, and every gate opens on a real flag", () => {
    const ids = progress.flags.map((d) => d.id);
    for (const d of progress.flags) for (const a of d.trigger.after ?? []) expect(ids).toContain(a);
    for (const g of MAP_DATA.cluster.gates) expect(ids).toContain(g.opensOn);
  });

  it('opens the path order with the stand-ins: shelter at Night 1, gas station on Day 2 after the campsite, outpost after both visits, checkpoint once it is cleared', () => {
    const f = flags();
    // Day 1: walk to the campsite; nothing opens but the visit.
    expect(runTriggers(f, ctx({ clearing: 'campsite' }))).toEqual(['campsiteVisited']);
    // Dusk 1: Night 1.
    expect(runTriggers(f, ctx({ event: 'dusk', day: 1 }))).toEqual(['night1']);
    // Dawn 2: the gas station trail.
    expect(runTriggers(f, ctx({ event: 'dawn', day: 2 }))).toEqual(['day2']);
    expect(runTriggers(f, ctx({ clearing: 'gasStation' }))).toEqual(['gasStationVisited']);
    // The shelter: the rifle (stand-in) and Ellen's call come with it.
    expect(runTriggers(f, ctx({ clearing: 'stormShelter' }))).toEqual(['shelterVisited', 'rifleClaimed', 'outpostCall']);
    // The outpost: entered, then cleared.
    expect(runTriggers(f, ctx({ clearing: 'outpost' }))).toEqual(['outpostEntered']);
    expect(runTriggers(f, ctx({ clearing: 'outpost', cleared: () => true }))).toEqual(['outpostCleared']);
    expect(runTriggers(f, ctx({ south: true }))).toEqual(['crossedCordon']);
  });

  it("doesn't open the gas station trail on a dawn before the campsite", () => {
    const f = flags();
    expect(runTriggers(f, ctx({ event: 'dawn', day: 2 }))).toEqual([]);
    expect(f.has('day2')).toBe(false);
  });

  it("can't count the cordon crossed before the checkpoint opens (a teleport south)", () => {
    const f = flags();
    expect(runTriggers(f, ctx({ south: true }))).toEqual([]);
  });
});

describe('the gates', () => {
  const map = makeMap(1);
  const ground = makeGround(1);
  const gc = config.map.gates;
  const gates = gateLayout(map, MAP_DATA.cluster.gates, gc);
  const byId = Object.fromEntries(gates.map((g) => [g.id, g]));

  it('is the same on every seed', () => {
    expect(gateLayout(makeMap(99), MAP_DATA.cluster.gates, gc)).toEqual(gates);
  });

  it('stands one gate on each gated path, between its clearings', () => {
    for (const g of MAP_DATA.cluster.gates) {
      const at = byId[g.id];
      if (g.path) {
        const pts = clusterPath(map, g.path[0], g.path[1]);
        const near = Math.min(...pts.map((p) => Math.hypot(p.x - at.x, p.z - at.z)));
        expect(near).toBeLessThan(3);
      }
      // Outside every clearing (the checkpoint stands on the cordon).
      if (g.kind !== 'checkpoint') for (const c of map.clearings) expect(Math.hypot(c.x - at.x, c.z - at.z)).toBeGreaterThan(c.radius);
    }
    expect(byId.checkpoint.z).toBe(map.cluster.cordonZ);
  });

  it("puts the outpost's road gate after the closed-road sign, before the outpost", () => {
    const g = MAP_DATA.cluster.gates.find((x) => x.id === 'outpostRoad');
    expect(g.road).toBeGreaterThan(config.map.road.sign.along);
    const outpost = map.clearings[map.cluster.outpostIndex];
    expect(Math.hypot(byId.outpostRoad.x - outpost.x, byId.outpostRoad.z - outpost.z)).toBeGreaterThan(outpost.radius);
  });

  it('stops the player walking the path while shut, and lets them through open; never the dead', () => {
    for (const g of gates) {
      if (g.kind === 'checkpoint') continue;
      const col = gateCollider(g, gc, (x, z) => ground.heightAt(x, z));
      const tryWalk = (isPlayer) => {
        const pos = { x: g.x - g.tx * 3, z: g.z - g.tz * 3 };
        for (let i = 0; i < 60; i++) {
          pos.x += g.tx * 0.1;
          pos.z += g.tz * 0.1;
          resolveCircles(pos, 0.4, [col], isPlayer);
        }
        return (pos.x - g.x) * g.tx + (pos.z - g.z) * g.tz > 0;
      };
      expect(tryWalk(true), g.id).toBe(false);
      expect(tryWalk(false), g.id).toBe(true);
      col.off = true;
      expect(tryWalk(true), g.id).toBe(true);
    }
  });

  it('reaches well off the path either side (a soft funnel, not a door in the open)', () => {
    for (const g of gates) if (g.kind !== 'checkpoint') expect(g.half).toBeGreaterThan(config.map.paths.width / 2 + config.map.paths.clearance + 4);
  });
});
