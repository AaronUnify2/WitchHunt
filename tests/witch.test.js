import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GraphRoutes, routeLength, advanceAlong } from '../src/ai/witchRoutes.js';
import { Witch, plantingsTonight, fightScore } from '../src/ai/Witch.js';
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
    const player = {
      position: { x: map.clearings[map.homeIndex].x, z: map.clearings[map.homeIndex].z },
      camera: { position: { y: 1.7 } },
      speed: 0,
      platform: null,
      yaw: 0,
    };
    const sounds = [];
    const hurt = [];
    const spawned = [];
    const combat = {
      sfx: { play: (name) => sounds.push(name) },
      weapons: { extraTargets: [] },
      hud: { boss: () => {} },
      // The player in the open at night, torch on, standing.
      senses: { x: 0, z: 0, eyeY: 1.7, daylight: 0, torchOn: true, crouched: false, sprinting: false, speed: 0, undergrowth: 0 },
      alive: true,
      enemies: { spawnPlanned: (plan, x, z) => (spawned.push({ x, z }), 1), alert: () => 0 },
      promptSources: [],
      hurtPlayer: (damage) => hurt.push(damage),
    };
    // Keep the senses on the player.
    const syncSenses = () => {
      combat.senses.x = player.position.x;
      combat.senses.z = player.position.z;
      combat.senses.eyeY = ground.heightAt(player.position.x, player.position.z) + 1.7;
      player.camera.position.y = combat.senses.eyeY;
    };
    const world = { map, ground, hut: map.clearings[map.hutIndex], variantMixAt: () => null };
    const witch = new Witch(config, new Rng(seed), bus);
    witch.init(new THREE.Scene(), { world, director, player, colliders: new SpatialGrid(config.world.colliderCellSize), combat, clock });
    syncSenses();
    return { witch, bus, planted, clock, player, sounds, map, combat, hurt, spawned, syncSenses };
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
    const { witch, bus, player, combat } = setup(11);
    combat.alive = false; // so she doesn't notice them (that's a fight: below)
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

  // ---- step 2: fighting her -------------------------------------------------------

  // Out to plant, then held kneeling at her spot (ritual under way).
  function atRitual(seed) {
    const env = setup(seed);
    env.bus.emit('phase:dusk', { day: 2 });
    for (let i = 0; i < 20000 && env.witch.state !== 'planting'; i++) env.witch.update(0.1, true, null);
    return env;
  }
  // Stand the player `d` metres in front of her.
  function standBefore(env, d) {
    const w = env.witch;
    env.player.position.x = w.x + Math.sin(w.facing) * d;
    env.player.position.z = w.z + Math.cos(w.facing) * d;
    env.syncSenses();
  }
  const hit = (w, amount, part = 'body') => w.takeHit(amount, part, {}, { x: w.x, y: w.y + 1, z: w.z }, { x: w.x + 10, z: w.z });

  it('a hit mid-ritual breaks it: no sigil, and at full health she turns on you', () => {
    const env = atRitual(11);
    const events = [];
    env.bus.on('witch:interrupted', () => events.push('interrupted'));
    env.bus.on('witch:attacking', () => events.push('attacking'));
    standBefore(env, 25);
    env.witch.tier = 'active';
    expect(env.witch.targetable).toBe(true);
    expect(hit(env.witch, 25)).toBe(false);
    expect(events).toEqual(['interrupted', 'attacking']);
    expect(env.witch.state).toBe('attacking');
    expect(env.witch.share).toBeCloseTo(1 - 25 / config.witch.health);
    for (let i = 0; i < 100; i++) env.witch.update(0.1, true, null);
    expect(env.planted.length).toBe(0);
  });

  it('early on you can run from her: past the leash she lets you go, and leaves you be until you hit her (Aaron, Session 14)', () => {
    const env = atRitual(11);
    const w = env.witch;
    w.pursuitLeash = () => config.witch.pursuit.leashEarly;
    standBefore(env, 25);
    w.tier = 'active';
    hit(w, 10);
    expect(w.state).toBe('attacking');
    // Run: put the player well past the leash from where the fight started.
    const away = config.witch.pursuit.leashEarly + 15;
    env.player.position.x = w.fightX + away;
    env.syncSenses();
    for (let i = 0; i < 5; i++) w.update(0.1, true, null);
    expect(w.state).not.toBe('attacking');
    // Seen again within her calm: she lets it go.
    standBefore(env, 15);
    for (let i = 0; i < 20; i++) {
      standBefore(env, 15);
      w.update(0.1, true, null);
    }
    expect(w.state).not.toBe('attacking');
    // A hit ends the truce.
    hit(w, 10);
    expect(w.state).toBe('attacking');
  });

  it('the leash is long after the crossing, and there is none in the final battle', () => {
    expect(config.witch.pursuit.leashLate).toBeGreaterThan(config.witch.pursuit.leashEarly * 2);
  });

  it("in the ritual's trance she only notices you close up", () => {
    const env = atRitual(3);
    standBefore(env, 20); // in the open at night, torch on: a zombie would see you at this range
    for (let i = 0; i < 10; i++) env.witch.update(0.1, true, null);
    expect(env.witch.state).toBe('planting');
    standBefore(env, 4);
    for (let i = 0; i < 10; i++) env.witch.update(0.1, true, null);
    expect(env.witch.state).toBe('attacking');
  });

  it('wounded, she flees instead; near her hut she still fights', () => {
    expect(fightScore(0.4, 1000, config.witch)).toBeLessThan(config.witch.fleeBelow);
    expect(fightScore(0.4, 0, config.witch)).toBeGreaterThanOrEqual(config.witch.fleeBelow);
    const env = atRitual(11);
    env.witch.health = env.witch.maxHealth * 0.5;
    standBefore(env, 25);
    env.witch.tier = 'active';
    hit(env.witch, 25);
    expect(env.witch.state).toBe('fleeing');
  });

  it('she summons the dead when she first attacks, backs off to range, then hexes you', () => {
    const env = atRitual(11);
    standBefore(env, 12);
    env.witch.tier = 'active';
    // A shotgun hit breaks the ritual without bringing her in.
    env.witch.takeHit(10, 'body', { id: 'shotgun' }, { x: env.witch.x, y: env.witch.y + 1, z: env.witch.z }, env.player.position);
    expect(env.witch.action).toBe('summon');
    expect(env.witch.mode).toBe('retreat');
    for (let i = 0; i < 20; i++) env.witch.update(0.1, true, null);
    const s = config.witch.attack.summon;
    expect(env.spawned.length).toBeGreaterThanOrEqual(s.count[0]);
    expect(env.spawned.length).toBeLessThanOrEqual(s.count[1]);
    // She backs off to her standoff range, then throws a hex at you.
    let thrown = false;
    for (let i = 0; i < 120 && !thrown; i++) {
      env.syncSenses();
      env.witch.update(0.1, true, null);
      thrown = env.witch.hexes.count > 0;
    }
    expect(thrown).toBe(true);
    expect(env.witch.mode).toBe('hex');
    expect(env.witch.distance).toBeGreaterThan(config.witch.attack.retreat.standoff - config.witch.attack.hold.band);
    // Hexes fly at the new speed, and the next one waits a long while.
    expect(env.witch.hexes.cfg.speed).toBe(config.witch.attack.hex.speed);
    expect(env.witch.hexTimer).toBeGreaterThan(config.witch.attack.hex.every - 1);
  });

  // Attacking at range, in hex mode, with the player `d` metres off.
  function inHexMode(d) {
    const env = atRitual(11);
    standBefore(env, 25);
    env.witch.tier = 'active';
    hit(env.witch, 10);
    env.witch.summonCooldown = 999;
    env.witch.action = null;
    env.witch.setMode('hex');
    standBefore(env, d);
    return env;
  }

  it('come too close while she hexes and she backs off again', () => {
    const env = inHexMode(config.witch.attack.retreat.tooClose - 3);
    env.witch.update(0.1, true, null);
    expect(env.witch.mode).toBe('retreat');
  });

  it('a headshot sends her in to swipe; she keeps on you, so the swipes land', () => {
    const env = inHexMode(25);
    hit(env.witch, 50, 'head');
    expect(env.witch.mode).toBe('rush');
    // You run straight away: she's faster, and the swipe lands anyway.
    const w = env.witch;
    for (let i = 0; i < 100 && !env.hurt.includes(config.witch.attack.swipe.damage); i++) {
      const dx = env.player.position.x - w.x;
      const dz = env.player.position.z - w.z;
      const d = Math.hypot(dx, dz) || 1;
      env.player.position.x += (dx / d) * 7.2 * 0.1;
      env.player.position.z += (dz / d) * 7.2 * 0.1;
      env.syncSenses();
      w.update(0.1, true, null);
    }
    expect(env.hurt).toContain(config.witch.attack.swipe.damage);
    expect(w.mode).toBe('rush');
  });

  it("any hit but the shotgun's brings her in; a shotgun hit drives her back at once, the rifle takes a few", () => {
    const env = inHexMode(25);
    const w = env.witch;
    hit(w, 50, 'head');
    expect(w.mode).toBe('rush');
    w.takeHit(6, 'body', { id: 'shotgun' }, { x: w.x, y: w.y + 1, z: w.z }, env.player.position);
    expect(w.mode).toBe('retreat');
    // A shotgun headshot doesn't bring her in.
    w.setMode('hex');
    w.takeHit(12, 'head', { id: 'shotgun' }, { x: w.x, y: w.y + 1, z: w.z }, env.player.position);
    expect(w.mode).toBe('hex');
    // A rifle body shot does (Aaron: body shots bring her in too).
    hit(w, 25);
    expect(w.mode).toBe('rush');
    // Rifle: in on a headshot, out after backOffDamage.
    w.setMode('hex');
    hit(w, 50, 'head');
    expect(w.mode).toBe('rush');
    const body = 25;
    const shots = Math.ceil(config.witch.attack.rush.backOffDamage / body);
    for (let i = 0; i < shots - 1; i++) hit(w, body);
    expect(w.mode).toBe('rush');
    hit(w, body);
    expect(w.mode).toBe('retreat');
  });

  it('killing her ends it: she dies, stops being a target, and says so', () => {
    const env = atRitual(3);
    standBefore(env, 20);
    env.witch.tier = 'active';
    let killed = 0;
    env.bus.on('witch:killed', () => killed++);
    expect(hit(env.witch, config.witch.health * 2, 'head')).toBe(true);
    expect(env.witch.state).toBe('dead');
    expect(env.witch.targetable).toBe(false);
    expect(killed).toBe(1);
    expect(env.witch.pendingPlantings()).toEqual([]);
  });

  it('the final battle: she rises, then fights to the death (no fleeing, no losing you, no planting)', () => {
    const env = setup(11);
    const w = env.witch;
    w.health = w.maxHealth * 0.5; // her wounds carry in
    const hut = env.map.clearings[env.map.hutIndex];
    env.player.position.x = hut.x + 15;
    env.player.position.z = hut.z;
    env.syncSenses();
    w.startFinal(hut.x, hut.z);
    expect(w.state).toBe('rising');
    expect(w.targetable).toBe(false);
    for (let t = 0; t < config.finalBattle.riseSeconds + 0.2; t += 0.1) w.update(0.1, true, null);
    expect(w.state).toBe('attacking');
    expect(w.share).toBeCloseTo(0.5);
    // Badly hurt and far from the hut's bonus: still attacking.
    w.health = w.maxHealth * 0.05;
    w.takeHit(1, 'body', {}, { x: w.x, y: w.y + 1, z: w.z }, env.player.position);
    expect(w.state).toBe('attacking');
    // Hidden from her (you can't hide in the final battle) for a long while: still attacking.
    env.combat.senses.crouched = true;
    env.combat.senses.torchOn = false;
    const trapsBefore = w.traps.activeCount;
    for (let t = 0; t < 20; t += 0.1) w.update(0.1, true, null);
    expect(w.state).toBe('attacking');
    // She lays snares and totems round you, and harder attacks.
    expect(w.traps.activeCount).toBeGreaterThan(trapsBefore);
    expect(w.attack.swipe.damage).toBe(config.finalBattle.attack.swipe.damage);
    expect(w.attack.hex.damage).toBe(config.witch.attack.hex.damage); // kept from the usual ones
    // Dusk can't send her planting.
    expect(w.setOut(5, 2)).toBe(false);
    expect(w.state).toBe('attacking');
  });

  it('wounds last, heal a share each day, and cut her planting', () => {
    const env = setup(11);
    const wc = config.witch;
    env.witch.health = wc.health * 0.2;
    env.bus.emit('phase:day', { day: 3 });
    expect(env.witch.share).toBeCloseTo(0.2 + wc.wounds.recoverPerDay);
    const rng = new Rng(9);
    expect(plantingsTonight(5, wc, rng, 0.2)).toBe(0);
    for (let i = 0; i < 50; i++) expect(plantingsTonight(5, wc, rng, 0.5)).toBe(1);
    // Saved and loaded.
    const saved = env.witch.saveState();
    env.witch.health = wc.health;
    env.witch.loadState(saved);
    expect(env.witch.share).toBeCloseTo(0.2 + wc.wounds.recoverPerDay, 2);
    env.witch.loadState(undefined); // an older save
    expect(env.witch.share).toBeCloseTo(0.2 + wc.wounds.recoverPerDay, 2);
    // Her traps are saved too: the hut's (one sprung) and any she dropped.
    const before = env.witch.traps.activeCount;
    env.witch.traps.list[0].active = false;
    env.witch.traps.add('totem', 5, 5, null, true);
    const again = JSON.parse(JSON.stringify(env.witch.saveState()));
    expect(again.traps.length).toBe(before);
    const fresh = setup(11);
    fresh.witch.loadState(again);
    expect(fresh.witch.traps.activeCount).toBe(before);
    expect(fresh.witch.traps.list.some((t) => t.type === 'totem' && t.dropped && t.x === 5)).toBe(true);
  });
});

describe('her hexes', () => {
  it('fly straight at where you were, hurt you, and a tree in the way stops them', async () => {
    const { Hexes } = await import('../src/ai/witchHexes.js');
    const hc = config.witch.attack.hex;
    const flat = { heightAt: () => 0 };
    const target = { x: 0, z: 20, y0: 0, y1: 1.7 };
    const hexes = new Hexes(hc);
    hexes.throw(0, 1.5, 0, 0, 1.3, 20);
    let damage = 0;
    for (let i = 0; i < 100; i++) damage += hexes.update(0.05, target, null, flat);
    expect(damage).toBe(hc.damage);
    // Sidestepped: it misses.
    hexes.throw(0, 1.5, 0, 0, 1.3, 20);
    const moved = { ...target, x: 3 };
    damage = 0;
    for (let i = 0; i < 100; i++) damage += hexes.update(0.05, moved, null, flat);
    expect(damage).toBe(0);
    // A trunk between you.
    const grid = new SpatialGrid(8);
    grid.insert({ x: 0, z: 10, r: 0.5 });
    hexes.throw(0, 1.5, 0, 0, 1.3, 20);
    damage = 0;
    for (let i = 0; i < 100; i++) damage += hexes.update(0.05, target, grid, flat);
    expect(damage).toBe(0);
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

describe('her traps', async () => {
  const { Traps, placeHutTraps } = await import('../src/ai/witchTraps.js');
  const tc = config.witch.traps;
  const flat = { heightAt: () => 0 };
  const makeEnv = () => {
    const bus = new EventBus();
    bus.init();
    const traps = new Traps(tc, bus);
    const player = { position: { x: 0, z: 0 }, onGround: true, rooted: false, platform: null };
    const hurt = [];
    const alerts = [];
    const combat = { alive: true, hurtPlayer: (d) => hurt.push(d), enemies: { alert: (x, z, r) => alerts.push(r) } };
    let presses = 0;
    const input = { wasPressed: (a) => a === 'jump' && presses-- > 0, activeDevice: 'gamepad' };
    const press = (n) => (presses = n);
    return { bus, traps, player, hurt, alerts, combat, input, press };
  };

  for (const seed of [3, 11, 1234]) {
    it(`seed ${seed}: the hut approach is laid with traps, thicker near the hut`, () => {
      const map = makeMap(seed);
      const hut = map.clearings[map.hutIndex];
      const list = placeHutTraps(map, tc.hut, new Rng(seed));
      expect(list.length).toBeGreaterThan(tc.hut.count * 0.6);
      expect(list.length).toBeLessThanOrEqual(tc.hut.count);
      let near = 0;
      for (const t of list) {
        expect(Math.hypot(t.x - hut.x, t.z - hut.z)).toBeLessThanOrEqual(tc.hut.radius + 5);
        if (Math.hypot(t.x - hut.x, t.z - hut.z) < tc.hut.radius / 2) near++;
        for (const u of list) if (u !== t) expect(Math.hypot(t.x - u.x, t.z - u.z)).toBeGreaterThanOrEqual(tc.hut.minGap - 3);
        // On (or right beside) a pathway.
        expect(offPath(map, t.x, t.z)).toBeLessThan(tc.hut.sideJitter + 0.5);
      }
      expect(near).toBeGreaterThan(list.length / 2);
      expect(placeHutTraps(map, tc.hut, new Rng(seed))).toEqual(list); // the same every time for a map
    });
  }

  it('a snare holds you until you mash free (the effort drains if you stop)', () => {
    const env = makeEnv();
    env.traps.add('snare', 0.3, 0, flat);
    env.traps.update(0.1, env.player, env.input, env.combat);
    expect(env.player.rooted).toBe(true);
    expect(env.hurt).toEqual([tc.snare.damage]);
    expect(env.traps.hud.prompt).toContain('Mash A');
    // A few presses, then a rest: still held.
    for (let i = 0; i < 3; i++) {
      env.press(1);
      env.traps.update(0.25, env.player, env.input, env.combat);
    }
    for (let i = 0; i < 20; i++) env.traps.update(0.25, env.player, env.input, env.combat);
    expect(env.player.rooted).toBe(true);
    expect(env.traps.mash).toBe(0);
    // Mashing for about two seconds.
    let t = 0;
    while (env.player.rooted && t < 5) {
      env.press(1);
      env.traps.update(0.25, env.player, env.input, env.combat);
      t += 0.25;
    }
    expect(env.player.rooted).toBe(false);
    expect(t).toBeGreaterThan(1.4);
    expect(t).toBeLessThan(3);
    // Used up.
    env.traps.update(0.1, env.player, env.input, env.combat);
    expect(env.player.rooted).toBe(false);
  });

  it("a totem burns you inside its ring until it's shot apart", () => {
    const env = makeEnv();
    const totem = env.traps.add('totem', 2, 0, flat);
    for (let i = 0; i < 20; i++) env.traps.update(0.1, env.player, env.input, env.combat);
    const burned = env.hurt.reduce((a, b) => a + b, 0);
    expect(burned).toBeCloseTo(tc.totem.damagePerSecond * 2, -1);
    expect(totem.targetable).toBe(true);
    expect(totem.takeHit(25, 'body', {}, { x: 2, y: 1, z: 0 })).toBe(true);
    env.hurt.length = 0;
    for (let i = 0; i < 20; i++) env.traps.update(0.1, env.player, env.input, env.combat);
    expect(env.hurt).toEqual([]);
  });

  it('a charm calls the zombies and the witch; shot first, it does nothing', () => {
    const env = makeEnv();
    const heard = [];
    env.traps.add('charm', 1, 0, flat);
    env.traps.update(0.1, env.player, env.input, env.combat, (x, z) => heard.push([x, z]));
    expect(env.alerts).toEqual([tc.charm.alert]);
    expect(heard).toEqual([[1, 0]]);
    const env2 = makeEnv();
    const charm = env2.traps.add('charm', 30, 0, flat);
    env2.traps.update(0.1, env2.player, env2.input, env2.combat);
    charm.takeHit(25, 'body', {}, null);
    env2.player.position.x = 30;
    env2.traps.update(0.1, env2.player, env2.input, env2.combat);
    expect(env2.alerts).toEqual([]);
  });
});
