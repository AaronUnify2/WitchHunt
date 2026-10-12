import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GraphRoutes, routeLength, advanceAlong } from '../src/ai/witchRoutes.js';
import { Witch, plantingsTonight } from '../src/ai/Witch.js';
import { sigilDanger } from '../src/base/danger.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { pointSegmentDistance } from '../src/world/mapGraph.js';
import { makeMap, makeGround, config } from './mapFixture.js';

// How far (x, z) is from the nearest pathway.
function offPath(map, x, z) {
  let best = Infinity;
  for (const p of map.paths) {
    for (let i = 0; i < p.points.length - 1; i++) {
      const a = p.points[i];
      const b = p.points[i + 1];
      best = Math.min(best, pointSegmentDistance(x, z, a.x, a.z, b.x, b.z));
    }
  }
  return best;
}

describe('witch routes', () => {
  for (const seed of [3, 11, 1234]) {
    it(`seed ${seed}: every clearing reaches every other along the pathways`, () => {
      const map = makeMap(seed);
      const routes = new GraphRoutes(map, [map.homeIndex]);
      const onPath = new Set();
      for (const p of map.paths) for (const q of p.points) onPath.add(`${q.x},${q.z}`);
      for (const from of map.clearings) {
        for (const to of map.clearings) {
          if (from === to) continue;
          const r = routes.route(from.x, from.z, to.x, to.z);
          const end = r[r.length - 1];
          expect(Math.hypot(end.x - to.x, end.z - to.z)).toBeLessThan(1e-6);
          // Every waypoint is a pathway point (the route never cuts through the woods).
          for (const p of r) expect(onPath.has(`${p.x},${p.z}`) || p === end).toBe(true);
          // No longer than a big detour would be (sanity: the shortest way, give or take the station).
          expect(routeLength(from.x, from.z, r)).toBeLessThan(Math.hypot(to.x - from.x, to.z - from.z) * 6 + 400);
        }
      }
    });

    it(`seed ${seed}: she never passes through the ranger station's clearing unless it is the only way`, () => {
      const map = makeMap(seed);
      const routes = new GraphRoutes(map, [map.homeIndex]);
      const free = new GraphRoutes({ clearings: map.clearings, paths: map.paths.filter((p) => p.a !== map.homeIndex && p.b !== map.homeIndex) });
      const home = map.clearings[map.homeIndex];
      for (const from of map.clearings) {
        for (const to of map.clearings) {
          if (from === to || from === home || to === home) continue;
          if (free.dist[map.clearings.indexOf(from)][map.clearings.indexOf(to)] === Infinity) continue; // home is the only way
          const r = routes.route(from.x, from.z, to.x, to.z);
          for (const p of r) expect(Math.hypot(p.x - home.x, p.z - home.z)).toBeGreaterThan(home.radius * 0.5);
        }
      }
    });
  }

  it('an off-path goal is reached by the pathway nearest it, then straight in', () => {
    const map = makeMap(11);
    const routes = new GraphRoutes(map, [map.homeIndex]);
    const hut = map.clearings[map.hutIndex];
    const p = map.paths[0].points[Math.floor(map.paths[0].points.length / 2)];
    const goal = { x: p.x + 12, z: p.z };
    const r = routes.route(hut.x, hut.z, goal.x, goal.z);
    expect(r[r.length - 1]).toEqual(goal);
    expect(offPath(map, r[r.length - 2].x, r[r.length - 2].z)).toBeLessThan(0.5);
  });

  it('advanceAlong walks a route by distance and stops at its end', () => {
    const w = { x: 0, z: 0, facing: 0, route: [{ x: 10, z: 0 }, { x: 10, z: 10 }], routeIndex: 0 };
    expect(advanceAlong(w, 5)).toBe(false);
    expect(w.x).toBeCloseTo(5);
    expect(advanceAlong(w, 10)).toBe(false);
    expect(w.x).toBeCloseTo(10);
    expect(w.z).toBeCloseTo(5);
    expect(advanceAlong(w, 100)).toBe(true);
    expect(w.z).toBeCloseTo(10);
  });
});

describe('her nightly plan', () => {
  const wc = config.witch;

  it('night 1 is safe, night 2 is one sigil, later nights one or two', () => {
    const rng = new Rng(5);
    expect(plantingsTonight(1, wc, rng)).toBe(0);
    for (let i = 0; i < 50; i++) expect(plantingsTonight(2, wc, rng)).toBe(1);
    const later = new Set();
    for (let i = 0; i < 200; i++) later.add(plantingsTonight(5, wc, rng));
    expect([...later].sort()).toEqual([1, 2]);
  });

  it("a sigil she hasn't planted yet counts for less: its zombies start later", () => {
    const night = 360;
    const now = sigilDanger(600, 2, config, night, 0);
    const later = sigilDanger(600, 2, config, night, 200);
    expect(later.value).toBeLessThan(now.value);
    expect(later.firstArrival).toBeCloseTo(now.firstArrival + 200);
    expect(sigilDanger(600, 2, config, night, night).value).toBe(0);
  });
});

// A whole night with a stand-in director: she sets out at dusk, travels,
// kneels for the ritual, the sigil appears, and she goes home.
describe('the witch out for a night', () => {
  function setup(seed) {
    const map = makeMap(seed);
    const ground = makeGround(seed);
    const bus = new EventBus();
    bus.init();
    const planted = [];
    const sigils = { list: planted, groundFree: (id) => !planted.some((s) => s.groundId === id), get full() { return planted.length >= 5; } };
    const ground1 = map.clearings.find((c) => c.kind === 'sigilGround');
    const director = {
      sigils,
      chooseSpot: (plan) => {
        const g = map.clearings.filter((c) => c.kind === 'sigilGround' && sigils.groundFree(c.id) && !plan.some((p) => p.groundId === c.id))[0] ?? ground1;
        return { x: g.x + 3, z: g.z, y: 0, groundId: g.id, clearingId: g.id };
      },
      plant: (spot) => {
        const s = { ...spot };
        planted.push(s);
        return s;
      },
      describe: () => 'at a sigil ground',
    };
    const clock = { phase: 'dusk', phaseProgress: 0 };
    const player = { position: { x: map.clearings[map.homeIndex].x, z: map.clearings[map.homeIndex].z } };
    const sounds = [];
    const combat = { sfx: { play: (name) => sounds.push(name) } };
    const world = { map, ground, hut: map.clearings[map.hutIndex] };
    const witch = new Witch(config, new Rng(seed), bus);
    witch.init(new THREE.Scene(), { world, director, player, colliders: new SpatialGrid(config.world.colliderCellSize), combat, clock });
    return { witch, bus, planted, clock, player, sounds, map };
  }

  it('rests unseen by day, and stays home on night 1', () => {
    const { witch, bus } = setup(11);
    expect(witch.state).toBe('resting');
    bus.emit('phase:dusk', { day: 1 });
    expect(witch.state).toBe('resting');
  });

  for (const seed of [3, 11]) {
    it(`seed ${seed}: night 2 she walks out, plants one sigil and goes home`, () => {
      const { witch, bus, planted, clock, sounds } = setup(seed);
      const events = [];
      bus.on('witch:ritualStarted', () => events.push('ritual'));
      bus.on('witch:planted', () => events.push('planted'));
      bus.on('witch:home', () => events.push('home'));
      bus.emit('phase:dusk', { day: 2 });
      expect(witch.state).toBe('roaming');
      expect(witch.pendingPlantings().length).toBe(1);
      const dt = 1 / 10;
      for (let i = 0; i < 20000 && events[events.length - 1] !== 'home'; i++) {
        if (i === 600) clock.phase = 'night';
        witch.update(dt, true, null);
      }
      expect(events).toEqual(['ritual', 'planted', 'home']);
      expect(planted.length).toBe(1);
      expect(witch.state).toBe('resting');
      expect(sounds).toContain('witchSong');
      expect(sounds).toContain('witchPlanted');
    });
  }

  it('the ritual takes plantSeconds, and her forecast counts it until it is done', () => {
    const { witch, bus, planted } = setup(11);
    bus.emit('phase:dusk', { day: 2 });
    for (let i = 0; i < 20000 && witch.state !== 'planting'; i++) witch.update(0.1, true, null);
    expect(witch.state).toBe('planting');
    const left = witch.pendingPlantings()[0].inSeconds;
    expect(left).toBeCloseTo(config.witch.plantSeconds, 0);
    for (let t = 0; t < config.witch.plantSeconds - 1; t += 0.5) witch.update(0.5, true, null);
    expect(planted.length).toBe(0);
    witch.update(2, true, null);
    expect(planted.length).toBe(1);
    expect(witch.pendingPlantings().length).toBe(0);
  });

  it('dawn calls her home before she gets there (but a ritual under way is finished)', () => {
    const { witch, bus, planted } = setup(3);
    bus.emit('phase:dusk', { day: 2 });
    witch.update(1, true, null);
    bus.emit('phase:dawn', {});
    expect(witch.goal).toBe('home');
    for (let i = 0; i < 20000 && witch.state !== 'resting'; i++) witch.update(0.1, true, null);
    expect(witch.state).toBe('resting');
    expect(planted.length).toBe(0);
  });

  it('a second sigil the same night, if the night allows', () => {
    const { witch, bus, planted, clock } = setup(11);
    bus.emit('phase:dusk', { day: 4 });
    witch.setOut(4, 2);
    expect(witch.pendingPlantings().length).toBe(2);
    clock.phase = 'night';
    for (let i = 0; i < 40000 && !(planted.length === 2 && witch.state === 'resting'); i++) witch.update(0.1, true, null);
    expect(planted.length).toBe(2);
    expect(planted[0].groundId).not.toBe(planted[1].groundId);
  });

  it('near the player she is drawn and runs at her own pace; far away she is unseen and faster', () => {
    const { witch, bus, player } = setup(11);
    bus.emit('phase:dusk', { day: 2 });
    player.position.x = witch.x;
    player.position.z = witch.z;
    const camera = { x: witch.x, z: witch.z };
    witch.update(0.5, true, camera);
    expect(witch.tier).not.toBe('abstract');
    expect(witch.renderer.root.visible).toBe(true);
    const near = witch.moved;
    expect(near).toBeLessThanOrEqual(config.witch.roamSpeed * 0.5 + 1e-6);
    player.position.x += 5000;
    witch.update(0.5, true, camera);
    expect(witch.tier).toBe('abstract');
    expect(witch.renderer.root.visible).toBe(false);
  });
});

describe('her contortions', () => {
  it('snapValue jumps to a new angle quickly, then holds still', async () => {
    const { snapValue } = await import('../src/render/WitchRenderer.js');
    const rate = 2;
    const snapTime = 0.1;
    // Mid-hold: no movement.
    const a = snapValue(0.3, rate, snapTime, 1, -1, 1);
    const b = snapValue(0.45, rate, snapTime, 1, -1, 1);
    expect(a).toBeCloseTo(b, 10);
    // Always within range, and it does change between intervals.
    const seen = new Set();
    for (let t = 0; t < 10; t += 0.05) {
      const v = snapValue(t, rate, snapTime, 3, -1, 1);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
      seen.add(v.toFixed(3));
    }
    expect(seen.size).toBeGreaterThan(5);
  });
});
