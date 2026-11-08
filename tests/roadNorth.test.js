// Session 21 (M10.2): the road north, its ROAD CLOSED barrier at the old
// tunnel, and Bigfoot's cave behind brush on the spur of rock just south
// of the barrier (world/roadNorth.js, world/RoadNorth.js).
import { describe, it, expect } from 'vitest';
import { roadFrame, roadDistance, roadProps } from '../src/world/road.js';
import { roadNorthLayout, inBrush, roadNorthColliders } from '../src/world/roadNorth.js';
import { RoadNorth } from '../src/world/RoadNorth.js';
import { gateLayout } from '../src/world/gates.js';
import { resolveCircles } from '../src/world/collision.js';
import { cliffZ } from '../src/world/mapGeometry.js';
import { EventBus } from '../src/core/EventBus.js';
import { makeMap, makeGround, config, MAP_DATA } from './mapFixture.js';

const rc = config.map.road;
const nc = config.map.roadNorth;
const SEEDS = [1, 7, 1234];
const maps = SEEDS.map((s) => makeMap(s));
const byKey = (map, key) => map.clearings.find((c) => c.key === key);

describe('the road north', () => {
  it('is the same on every seed', () => {
    for (const map of maps) {
      expect(map.road.north.points).toEqual(maps[0].road.north.points);
      expect(map.roadNorth).toEqual(maps[0].roadNorth);
    }
  });

  it('forks off the main road west of the gas station and runs north to the foot of the cliff', () => {
    const map = maps[0];
    const n = map.road.north;
    const fork = n.points[0];
    expect(roadDistance(map.road, fork.x, fork.z).distance).toBeLessThan(0.01);
    const gas = byKey(map, 'gasStation');
    expect(fork.x).toBeLessThan(gas.x - gas.radius);
    const end = n.points[n.points.length - 1];
    expect(end.z).toBeLessThan(byKey(map, 'campsite').z);
    expect(end.z - cliffZ(map.geometry, end.x)).toBeLessThan(10);
    // North all the way (never doubling back south).
    for (let i = 8; i < n.points.length; i++) expect(n.points[i].z).toBeLessThan(n.points[i - 8].z + 0.5);
  });

  it('keeps clear of the cluster\'s other places', () => {
    const map = maps[0];
    for (const c of map.clearings) {
      if (['gasStation', 'bigfootCave'].includes(c.key) || !c.cluster) continue;
      expect(roadDistance(map.road.north, c.x, c.z).distance).toBeGreaterThan(c.radius + rc.width);
    }
  });

  it('is open ground its whole length, shoulders included', () => {
    const ground = makeGround(SEEDS[0]);
    const n = maps[0].road.north;
    for (let d = 0; d < n.length; d += 5) {
      const f = roadFrame(n, d);
      for (const side of [-1, 0, 1]) {
        const off = side * (rc.width / 2 + rc.shoulder * 0.5);
        expect(ground.openAt(f.x + f.rx * off, f.z + f.rz * off)).toBeGreaterThan(0.9);
      }
    }
  });

  it("is the gas station's pathway to the cave: along the main road to the fork, then up the road north", () => {
    const map = maps[0];
    const path = map.paths.find((p) => p.roadNorth);
    expect([map.clearings[path.a].key, map.clearings[path.b].key]).toEqual(['gasStation', 'bigfootCave']);
    for (const p of path.points.slice(1, -1)) {
      const d = Math.min(roadDistance(map.road, p.x, p.z).distance, roadDistance(map.road.north, p.x, p.z).distance);
      expect(d).toBeLessThan(0.01);
    }
  });

  it('has its own poles beside it, and none of the main road\'s standing on it', () => {
    const map = maps[0];
    const props = roadProps(map.road, rc);
    expect(props.northPoles.length).toBeGreaterThan(3);
    for (const p of props.northPoles) expect(roadDistance(map.road.north, p.x, p.z).distance).toBeCloseTo(rc.poles.offset, 0);
    for (const p of props.poles) expect(roadDistance(map.road.north, p.x, p.z).distance).toBeGreaterThan(rc.width / 2 + 1);
  });

  it('is shut on Day 1 by a fallen oak near the fork (it opens with the gas station trail, on day2)', () => {
    const map = maps[0];
    const gates = gateLayout(map, MAP_DATA.cluster.gates, config.map.gates);
    const g = gates.find((x) => x.id === 'roadNorth');
    expect(g.kind).toBe('fallenTree');
    expect(g.opensOn).toBe('day2');
    expect(roadDistance(map.road.north, g.x, g.z).distance).toBeLessThan(0.01);
    expect(roadDistance(map.road.north, g.x, g.z).along).toBeLessThan(80);
  });
});

describe('the end of the road north', () => {
  const map = maps[0];
  const l = map.roadNorth;

  it('has the tunnel in the cliff at the road\'s end, its face where Tom can walk up to it', () => {
    const end = map.road.north.points[map.road.north.points.length - 1];
    expect(l.portal.x).toBeCloseTo(end.x);
    const line = cliffZ(map.geometry, l.portal.x);
    expect(l.portal.face).toBeGreaterThan(line);
    expect(l.portal.face).toBeLessThan(line + config.map.cliff.walkMargin);
    expect(l.portal.back).toBeLessThan(line);
  });

  it('closes the road with a barrier across it, in front of the tunnel', () => {
    expect(l.barrier.z).toBeGreaterThan(l.portal.face);
    expect(l.barrier.half * 2).toBeGreaterThan(rc.width + rc.shoulder * 2);
    expect(l.barrier.jersey).toBeLessThan(l.barrier.z);
    expect(l.barrier.jersey).toBeGreaterThan(l.portal.face);
  });

  it('puts the cave just south of the barrier, east of the road, in a spur of rock out from the cliff', () => {
    expect(l.mouth.z).toBeGreaterThan(l.barrier.z);
    expect(l.mouth.z - l.barrier.z).toBeLessThan(25);
    expect(roadDistance(map.road.north, l.mouth.x, l.mouth.z).distance).toBeGreaterThan(rc.width / 2 + rc.shoulder);
    expect(l.mouth.x).toBeGreaterThan(l.portal.x);
    expect(l.outcrop.x0).toBeGreaterThan(l.portal.x + rc.width / 2 + rc.shoulder);
    expect(l.mouth.x).toBeGreaterThan(l.outcrop.x0);
    expect(l.mouth.x).toBeLessThan(l.outcrop.x1);
    // In the cave's clearing.
    const cave = byKey(map, 'bigfootCave');
    expect(Math.hypot(l.mouth.x - cave.x, l.mouth.z - cave.z)).toBeLessThan(cave.radius + 5);
  });

  it('hides the mouth behind brush, packed against it', () => {
    expect(l.brush.z - l.brush.hz).toBeGreaterThanOrEqual(l.mouth.z);
    expect(l.brush.z - l.brush.hz).toBeLessThan(l.mouth.z + 1);
    expect(l.brush.hx * 2).toBeGreaterThan(l.mouth.width);
    expect(inBrush(l, l.mouth.x, l.mouth.z + 1)).toBe(true);
  });

  it('keeps the ground open (no trees) at the road\'s end, on the spur and in the brush', () => {
    const ground = makeGround(SEEDS[0]);
    expect(ground.openAt(l.brush.x, l.brush.z)).toBeGreaterThan(0.9);
    expect(ground.openAt((l.outcrop.x0 + l.outcrop.x1) / 2, l.outcrop.line + 6)).toBeGreaterThan(0.9);
    expect(ground.openAt(l.barrier.x, l.barrier.z)).toBeGreaterThan(0.9);
  });

  it('lays out the same from its parts (pure)', () => {
    expect(roadNorthLayout(map.geometry, map.road.north, nc)).toEqual(l);
  });

  it('stops everyone at the barrier, Tom (not the dozer) at the brush', () => {
    const cols = roadNorthColliders(l, nc);
    const bar = cols.filter((c) => c.what === 'barrier');
    expect(bar).toHaveLength(1);
    const p = { x: l.barrier.x, z: l.barrier.z + 0.2 };
    resolveCircles(p, 0.4, bar, false);
    expect(Math.abs(p.z - (l.barrier.z + l.barrier.jersey) / 2)).toBeGreaterThan(0.3);
    const brush = cols.filter((c) => c.what === 'brush');
    expect(brush.length).toBeGreaterThan(4);
    for (const c of brush) expect(c.playerOnly).toBe(true);
    const q = { x: l.brush.x, z: l.brush.z };
    const before = { ...q };
    resolveCircles(q, 0.4, brush, false);
    expect(q).toEqual(before); // a vehicle goes through
    resolveCircles(q, 0.4, brush, true);
    expect(q).not.toEqual(before); // Tom doesn't
  });
});

// A RoadNorth with stand-ins for the game around it.
function makeRoadNorth(map) {
  const bus = new EventBus();
  bus.init();
  const flags = new Set();
  const notes = [];
  const inserted = [];
  const player = { position: { x: 0, z: 0 }, riding: null, teleport(x, z) { this.position.x = x; this.position.z = z; } };
  const dozer = { riding: false, speed: 0, qc: { bladeFront: 3 }, x: 0, z: 0, toWorld(lx, lz) { return { x: this.x + lx, z: this.z - lz }; } };
  const rn = new RoadNorth(config, bus);
  rn.init({
    world: { map, ground: { heightAt: () => 0 }, roadNorthProps: null },
    colliders: { insert: (c) => inserted.push(c) },
    player,
    progress: { setFlag: (f) => flags.add(f), has: (f) => flags.has(f) },
    notify: (t) => notes.push(t),
    dozer,
  });
  return { rn, flags, notes, inserted, player, dozer, bus };
}

describe('the brush and the cave (in play)', () => {
  const map = maps[0];
  const l = map.roadNorth;

  it('says the brush is too thick when Tom walks into it, and the barrier is closed', () => {
    const { rn, notes, player } = makeRoadNorth(map);
    player.position.x = l.brush.x;
    player.position.z = l.brush.z + l.brush.hz + 0.5;
    rn.update(0.1, true);
    expect(notes.some((n) => n.includes('Too thick'))).toBe(true);
    player.position.x = l.barrier.x;
    player.position.z = l.barrier.z + 0.6;
    rn.update(0.1, true);
    expect(notes.some((n) => n.includes('ROAD CLOSED'))).toBe(true);
    expect(rn.brushCleared).toBe(false);
    expect(rn.hud.prompt).toBe('');
  });

  it('is torn away by the dozer\'s blade: the colliders go, caveFound is set, and the mouth has its prompt', () => {
    const { rn, flags, inserted, player, dozer, bus } = makeRoadNorth(map);
    const heard = [];
    bus.on('roadNorth:brushCleared', (e) => heard.push(e.by));
    dozer.riding = true;
    dozer.speed = 1;
    // Driving north (blade ahead) toward the brush.
    dozer.x = l.brush.x;
    dozer.z = l.brush.z + l.brush.hz + 10;
    rn.update(0.1, true);
    expect(rn.brushCleared).toBe(false);
    dozer.z = l.brush.z + l.brush.hz + 3.3;
    rn.update(0.1, true);
    expect(rn.brushCleared).toBe(true);
    expect(flags.has('caveFound')).toBe(true);
    expect(heard).toEqual(['dozer']);
    for (const c of inserted.filter((x) => x.what === 'brush')) expect(c.off).toBe(true);
    expect(inserted.filter((x) => x.what === 'barrier' && x.off)).toHaveLength(0);
    dozer.riding = false;
    player.position.x = l.mouth.x;
    player.position.z = l.mouth.z + 2;
    rn.update(0.1, true);
    expect(rn.hud.prompt).toContain('cave');
  });

  it('does nothing with the dozer parked or idling', () => {
    const { rn, dozer } = makeRoadNorth(map);
    dozer.x = l.brush.x;
    dozer.z = l.brush.z + l.brush.hz + 3.3;
    rn.update(0.1, true);
    dozer.riding = true;
    dozer.speed = 0;
    rn.update(0.1, true);
    expect(rn.brushCleared).toBe(false);
  });

  it('saves and loads whether it\'s cleared', () => {
    const a = makeRoadNorth(map);
    a.rn.clearBrush('debug');
    const saved = JSON.parse(JSON.stringify(a.rn.saveState()));
    const b = makeRoadNorth(map);
    b.rn.loadState(saved);
    expect(b.rn.brushCleared).toBe(true);
    expect(b.flags.has('caveFound')).toBe(true);
    expect(b.notes).toEqual([]); // quietly, on loading
    const c = makeRoadNorth(map);
    c.rn.loadState(null);
    expect(c.rn.brushCleared).toBe(false);
  });
});
