// Session 21 (M10.2): the interior system (world/Interiors.js) and the storm
// shelter's room on it: loaded on the way in, in a pocket under the
// entrance; the world outside simulating on in the abstract tier; its own
// light; the clock on the HUD; leaving (and saving) puts Tom outside.
import { describe, it, expect } from 'vitest';
import { Interiors, timeUntilTurn } from '../src/world/Interiors.js';
import { interiorTimeText } from '../src/ui/InteriorHud.js';
import { StormShelter } from '../src/encounters/StormShelter.js';
import { EventBus } from '../src/core/EventBus.js';
import { tierFor } from '../src/ai/simTiers.js';
import { makeMap, makeGround, config } from './mapFixture.js';

function stubPlayer() {
  return {
    position: { x: 0, y: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    platform: null,
    space: null,
    setPlatform(pl, x, z) {
      this.platform = pl;
      this.position.x = x;
      this.position.z = z;
      this.position.y = pl ? pl.y : 0;
    },
  };
}

function makeInteriors() {
  const bus = new EventBus();
  bus.init();
  const events = [];
  bus.on('interior:entered', (e) => events.push(['in', e.id]));
  bus.on('interior:left', (e) => events.push(['out', e.id]));
  const player = stubPlayer();
  const combat = {};
  const sky = {};
  const atmosphere = {};
  const sfx = {};
  const shown = [];
  const hud = { show: (n) => shown.push(n), update: () => {} };
  const it = new Interiors(config, bus);
  it.init({ scene: null, player, combat, sky, atmosphere, sfx, hud });
  let loaded = 0;
  let unloaded = 0;
  const def = {
    id: 'cellar',
    name: 'Cellar',
    entrance: () => ({ x: 10, z: 20 }),
    surfaceY: () => 5,
    load: (scene, floorY) => {
      loaded++;
      return { floorY, dispose: () => unloaded++ };
    },
    platform: (floorY) => ({ room: 'cellar', x: 10, z: 20, y: it.current?.floorY ?? floorY, half: 2, hx: 2, hz: 2, rx: 1, rz: 0, fx: 0, fz: 1 }),
    spawn: () => ({ x: 10.5, z: 20.5, yaw: 1, pitch: -0.1 }),
    exit: () => ({ x: 12, z: 18, yaw: 2 }),
    light: config.stormShelter.interior.light,
  };
  it.define(def);
  return { it, player, combat, sky, atmosphere, sfx, shown, events, counts: () => ({ loaded, unloaded }) };
}

describe('the interior system', () => {
  it('loads the interior on the way in, in a pocket deep under its entrance, and puts Tom on its floor', () => {
    const t = makeInteriors();
    expect(t.it.enter('cellar')).toBe(true);
    expect(t.counts().loaded).toBe(1);
    expect(t.it.id).toBe('cellar');
    expect(t.player.platform.space).toBe('cellar');
    expect(t.player.space).toBe('cellar');
    expect(t.player.position.y).toBeCloseTo(5 - config.interiors.depth);
    // Still at the entrance on the map (the pocket is right under it).
    expect(Math.hypot(t.player.position.x - 10, t.player.position.z - 20)).toBeLessThan(1);
    expect(t.player.yaw).toBe(1);
    expect(t.events).toEqual([['in', 'cellar']]);
  });

  it('is deeper than anything outside is drawn from', () => {
    const presets = Object.values(config.quality.presets).map((p) => p.drawDistance ?? 0);
    expect(config.interiors.depth).toBeGreaterThan(Math.max(300, ...presets) * 2);
  });

  it('hides Tom from the world outside, lights it its own way, muffles the world and shows the clock', () => {
    const t = makeInteriors();
    t.it.enter('cellar');
    expect(t.combat.inside).toBe('cellar');
    expect(t.sky.interior).toBe(config.stormShelter.interior.light);
    expect(t.atmosphere.inside).toBe(true);
    expect(t.sfx.muffled).toBe(config.interiors.muffle);
    expect(t.shown).toEqual(['Cellar']);
    t.it.leave();
    expect(t.combat.inside).toBe(null);
    expect(t.sky.interior).toBe(null);
    expect(t.atmosphere.inside).toBe(false);
    expect(t.sfx.muffled).toBe(1);
    expect(t.shown).toEqual(['Cellar', null]);
  });

  it('unloads it on the way out and puts Tom outside the entrance', () => {
    const t = makeInteriors();
    t.it.enter('cellar');
    t.it.leave();
    expect(t.counts().unloaded).toBe(1);
    expect(t.it.inside).toBe(null);
    expect(t.player.platform).toBe(null);
    expect(t.player.space).toBe(null);
    expect(t.player.position).toMatchObject({ x: 12, z: 18, y: 0 });
    expect(t.player.yaw).toBe(2);
    expect(t.events).toEqual([['in', 'cellar'], ['out', 'cellar']]);
  });

  it('saves Tom outside it when a save is made inside', () => {
    const t = makeInteriors();
    expect(t.it.saveSpot()).toBe(null);
    t.it.enter('cellar');
    expect(t.it.saveSpot()).toEqual({ x: 12, z: 18, yaw: 2 });
  });

  it('tidies up if something moves Tom out without leaving (a debug teleport)', () => {
    const t = makeInteriors();
    t.it.enter('cellar');
    t.player.setPlatform(null, 100, 100);
    t.it.update(0.1, { day: 2, phase: 'day', hourOfDay: 12, formatTime: () => '12:00' });
    expect(t.it.inside).toBe(null);
    expect(t.player.space).toBe(null);
    expect(t.counts().unloaded).toBe(1);
    expect(t.combat.inside).toBe(null);
    // Not moved back to the entrance: he went where he was sent.
    expect(t.player.position).toMatchObject({ x: 100, z: 100 });
  });

  it('refuses an interior it doesn\'t know', () => {
    const t = makeInteriors();
    expect(t.it.enter('nowhere')).toBe(false);
    expect(t.it.inside).toBe(null);
  });
});

describe('the world outside, while Tom is in', () => {
  it('puts every zombie not in his space in the abstract tier (the senses carry his space)', async () => {
    const { EnemyManager } = await import('../src/ai/EnemyManager.js');
    const mgr = Object.create(EnemyManager.prototype);
    mgr.cfg = config.zombies;
    mgr.tiers = { active: 0, nearby: 0, abstract: 0 };
    mgr.candidates = [];
    mgr.station = null;
    mgr.pool = [
      { active: true, x: 1, z: 1, tier: 'active' },
      { active: true, x: 2, z: 0, tier: 'active' },
      { active: true, x: 1, z: 2, tier: 'active', space: 'cellar' },
    ];
    mgr.settle = () => {};
    mgr.assignTiers({ x: 0, z: 0, space: 'cellar' });
    expect(mgr.pool[0].tier).toBe('abstract');
    expect(mgr.pool[1].tier).toBe('abstract');
    expect(mgr.pool[2].tier).toBe('active');
    mgr.assignTiers({ x: 0, z: 0, space: null });
    expect(mgr.pool[0].tier).toBe(tierFor(undefined, Math.hypot(1, 1), config.zombies.lod));
    expect(mgr.pool[2].tier).toBe('abstract');
  });

  it('keeps him out of their senses', async () => {
    const { Combat } = await import('../src/combat/Combat.js');
    const c = Object.create(Combat.prototype);
    c.player = { position: { x: 1, z: 2 }, camera: { position: { y: 3 } }, crouched: false, sprinting: false, speed: 0, undergrowth: 0 };
    c.senses = {};
    c.inside = 'cellar';
    const s = c.updateSenses(1);
    expect(s.unseen).toBe(true);
    expect(s.space).toBe('cellar');
    c.inside = null;
    expect(c.updateSenses(1).unseen).toBe(false);
  });
});

describe('the clock on the HUD inside', () => {
  const cc = config.clock;
  it('counts down to dusk by day and to dawn by night', () => {
    expect(timeUntilTurn(cc, 'day', 12)).toEqual({ until: 'dusk', hours: 7 });
    expect(timeUntilTurn(cc, 'dusk', 19.5).until).toBe('dawn');
    expect(timeUntilTurn(cc, 'night', 23).hours).toBeCloseTo(7);
    expect(timeUntilTurn(cc, 'night', 2).hours).toBeCloseTo(4);
  });

  it('reads the day, the time and what\'s coming', () => {
    const clock = { day: 3, phase: 'day', hourOfDay: 16.2, formatTime: () => '16:12' };
    expect(interiorTimeText(cc, clock)).toBe('Day 3 · 16:12 · dusk in 2h 48m');
    const late = { day: 3, phase: 'day', hourOfDay: 18.75, formatTime: () => '18:45' };
    expect(interiorTimeText(cc, late)).toBe('Day 3 · 18:45 · dusk in 15m');
  });
});

describe('the storm shelter\'s room, on the interior system', () => {
  const map = makeMap(1234);
  const ground = makeGround(1234);

  function makeShelter() {
    const bus = new EventBus();
    bus.init();
    const player = { ...stubPlayer(), riding: null, camera: { position: { y: 0 } } };
    const interiors = new Interiors(config, bus);
    interiors.init({ scene: null, player, combat: {}, sky: {}, atmosphere: {}, sfx: {}, hud: null });
    const sh = new StormShelter(config, bus);
    sh.init(null, { world: { map, ground }, player, interiors, progress: { setFlag() {}, has: () => false }, dialogue: { play() {} }, notify() {} });
    return { sh, player, interiors, bus };
  }

  it('goes down into the interior and up out of it, beside the hatch', () => {
    const { sh, player, interiors, bus } = makeShelter();
    const ups = [];
    bus.on('stormShelter:up', () => ups.push(1));
    sh.goDown();
    expect(interiors.id).toBe('stormShelter');
    expect(sh.below).toBe(true);
    expect(player.position.y).toBeCloseTo(sh.hatchY - config.interiors.depth);
    expect(sh.floorY).toBeCloseTo(player.position.y);
    // The ladder and the finds are where they always were on the map, under the hatch.
    expect(Math.hypot(player.position.x - sh.ladderAt.x, player.position.z - sh.ladderAt.z)).toBeLessThan(1);
    sh.goUp();
    expect(interiors.inside).toBe(null);
    expect(sh.below).toBe(false);
    expect(ups).toHaveLength(1);
    expect(Math.hypot(player.position.x - sh.hatchAt.x, player.position.z - sh.hatchAt.z)).toBeLessThan(2);
    expect(player.position.y).toBe(0);
  });

  it('saves Tom beside the hatch if a save is made down there', () => {
    const { sh, interiors } = makeShelter();
    sh.goDown();
    const out = interiors.saveSpot();
    expect(Math.hypot(out.x - sh.hatchAt.x, out.z - sh.hatchAt.z)).toBeLessThan(2);
  });
});
