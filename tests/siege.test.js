import { describe, it, expect } from 'vitest';
import { Zombie } from '../src/ai/Zombie.js';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { StationState } from '../src/base/StationState.js';
import { routeTo } from '../src/base/siegeRouting.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const cfg = {
  health: 60, hitRadius: 0.3, height: 1.8, headBottom: 1.42, headRadius: 0.16,
  turnRate: 100, attackReach: 1.25, attackWindup: 0.45, attackRecover: 0.75,
  maxKnockback: 1.6, knockbackSpeed: 8, deathSeconds: 0.8, corpseSeconds: 20,
  corpseSinkSeconds: 2, hitFlashSeconds: 0.15, walkFrameRate: 1.6,
};

describe('Zombie at the station', () => {
  it('walks its route to a barrier and claws it, a swipe per windup and recovery', () => {
    const z = new Zombie(cfg);
    z.spawn(0, 10, Math.PI, 3);
    z.mode = 'siege';
    const barrier = { id: 'fence3' };
    z.via = true;
    z.viaX = 0;
    z.viaZ = 0;
    z.barrier = barrier;
    const strikes = [];
    const far = { x: 0, z: 100 }; // the player, nowhere near
    for (let i = 0; i < 200; i++) z.update(0.05, far, (zb, b) => strikes.push(b));
    expect(Math.hypot(z.x, z.z)).toBeLessThan(0.6);
    // 10 s: about 3 s walking, then a swipe every 1.2 s.
    expect(strikes.length).toBeGreaterThanOrEqual(4);
    expect(strikes.every((b) => b === barrier)).toBe(true);
  });

  it('a chasing zombie still swipes the player in reach rather than its route', () => {
    const z = new Zombie(cfg);
    z.spawn(0, 1, Math.PI, 3);
    z.via = true;
    z.viaX = 10;
    z.viaZ = 10;
    z.barrier = { id: 'gate' };
    const hits = [];
    for (let i = 0; i < 30; i++) z.update(0.05, { x: 0, z: 0 }, (zb, b) => hits.push(b ?? 'player'));
    expect(hits).toContain('player');
  });

  it('a hit stuns it out of clawing', () => {
    const z = new Zombie(cfg);
    z.spawn(0, 0.2, Math.PI, 3);
    z.mode = 'siege';
    z.via = true;
    z.barrier = { id: 'door' };
    z.update(0.05, { x: 0, z: 100 }, () => {});
    expect(z.state).toBe('attack');
    z.hit(5, 0.5, 0, { x: 0, z: 5 });
    expect(z.state).toBe('stagger');
    expect(z.attackBarrier).toBe(null);
  });
});

describe('EnemyManager with the station', () => {
  it('routes besieging zombies through the fence and reports their swipes at it', () => {
    const SEED = 1234;
    const bus = new EventBus();
    const map = makeMap(SEED);
    const ground = makeGround(SEED);
    const home = map.clearings[map.homeIndex];
    const layout = stationLayout(home, ground, config.station.layout);
    const state = new StationState(config.station, layout);
    state.init();
    const world = { map, ground, variantMixAt: () => ({ citizen: 1 }) };
    const em = new EnemyManager(config, new Rng(5), bus, world);
    em.init(new SpatialGrid(config.world.colliderCellSize));
    const fam = layout.cabin.commsCentre;
    em.station = {
      x: fam.x,
      z: fam.z,
      baseRadius: 70,
      routeRadius: 80,
      reach: config.station.siege.reach,
      route: (fx, fz, tx, tz, out) => routeTo(layout, state, config.station, fx, fz, tx, tz, out),
    };
    const strikes = [];
    bus.on('enemy:strikeDefence', (e) => strikes.push(e));
    // West of the station, where the fence is whole.
    const s = layout.segments[1];
    const p = layout.at((s.a0 + s.a1) / 2, layout.radius + 8);
    const z = em.spawnZombie(p.x, p.z, { mode: 'siege' });
    // The player far away, crouched in the dark: never noticed.
    const player = { x: p.x + 500, z: p.z + 500, eyeY: 0, daylight: 0, torchOn: false, crouched: true, sprinting: false, speed: 0, undergrowth: 0 };
    for (let i = 0; i < 400; i++) em.update(0.05, player);
    expect(z.mode).toBe('siege');
    expect(strikes.length).toBeGreaterThan(0);
    expect(strikes[0].barrier).toBe(state.segments[1]);
    // Defence damage follows the level's defenceDamage.
    expect(strikes[0].damage).toBeCloseTo(config.zombies.attackDamage * config.zombies.levels[1].defenceDamage);
  });
});

describe('EnemyManager: you or the door, whichever is nearer (Aaron, M5)', () => {
  function setup() {
    const SEED = 1234;
    const bus = new EventBus();
    const map = makeMap(SEED);
    const ground = makeGround(SEED);
    const home = map.clearings[map.homeIndex];
    const layout = stationLayout(home, ground, config.station.layout);
    const state = new StationState(config.station, layout);
    state.init();
    const em = new EnemyManager(config, new Rng(5), bus, { map, ground, variantMixAt: () => ({ citizen: 1 }) });
    em.init(new SpatialGrid(config.world.colliderCellSize));
    const fam = layout.cabin.commsCentre;
    em.station = { x: fam.x, z: fam.z, baseRadius: 70, routeRadius: 80, reach: 0.55, route: (fx, fz, tx, tz, out) => routeTo(layout, state, config.station, fx, fz, tx, tz, out) };
    return { em, layout, state };
  }

  it('a chasing zombie by the front door claws it when you are further away', () => {
    const { em, layout, state } = setup();
    const door = layout.cabin.frontDoor.outer;
    const z = em.spawnZombie(door.x, door.z + 1.5, { mode: 'chase' });
    const player = { x: door.x + 12, z: door.z + 8 };
    em.routeAtStation(z, player);
    expect(z.barrier).toBe(state.doors.front);
  });

  it('but comes for you when you are the nearer', () => {
    const { em, layout } = setup();
    const door = layout.cabin.frontDoor.outer;
    const z = em.spawnZombie(door.x, door.z + 4, { mode: 'chase' });
    const player = { x: door.x + 1.5, z: door.z + 5 };
    em.routeAtStation(z, player);
    expect(z.via).toBe(false); // same zone: straight at you
  });
});
