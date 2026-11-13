// Round 2 (docs/FIRST_THIRD_PLAN_2.md): Aaron's play-test notes of Nov 13.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { readSeconds } from '../src/ui/Toast.js';
import { deepInForest, DeepForest } from '../src/ai/DeepForest.js';
import { EventBus } from '../src/core/EventBus.js';
import clusterData from '../src/data/openingCluster.json';
import dialogueData from '../src/data/dialogue.json';

const ids = new Set(dialogueData.lines.map((l) => l.id));

describe('step 1: the quick wins', () => {
  it('keeps a toast up long enough to read it', () => {
    const r = config.ui.toastRead;
    expect(readSeconds('Game saved', r)).toBeLessThan(3);
    const long = 'The payroll case. Grey foam, cut to the shape of a pistol and the suppressor that screws onto it. No money. There was never any money in it.';
    expect(readSeconds(long, r)).toBeGreaterThan(10);
    expect(readSeconds(long.repeat(5), r)).toBe(r.max);
  });

  it("puts the pistol in the sheriff's car on the road", () => {
    const police = clusterData.road.wrecks.find((w) => w.type === 'police');
    expect(police.gives.door[0]).toMatchObject({ weapon: 'pistol' });
  });

  it("has Wyatt's turkey line for the rifle taken on Day 1", () => {
    for (const id of ['day1.rifle.turkey', 'day1.night.tower.have']) expect(ids.has(id)).toBe(true);
  });

  it('knows the deep forest from a path side', () => {
    const allTrees = { openAt: () => 0 };
    const pathNear = { openAt: (x) => (x > 10 ? 1 : 0) };
    expect(deepInForest(allTrees, 0, 0, 14)).toBe(true);
    expect(deepInForest(pathNear, 0, 0, 14)).toBe(false);
    expect(deepInForest({ openAt: () => 1 }, 0, 0, 14)).toBe(false);
  });

  it('sends a moth or two to Tom on foot deep in the trees, and never from a vehicle or over an encounter', () => {
    const sent = [];
    const moths = { active: false, leaving: false, habitat: null, moths: [], send: (n) => (sent.push(n), (moths.active = true), n), dismiss() {} };
    const player = { position: { x: 0, z: 0 }, riding: null };
    const d = new DeepForest(config, new EventBus());
    d.init({ moths, player, ground: { openAt: () => 0 }, clock: { day: 2 }, rng: { int: (a) => a } });
    for (let t = 0; t < config.deepForest.first + 1; t += 0.25) d.update(0.25, true);
    expect(sent).toHaveLength(1);
    const d2 = new DeepForest(config, new EventBus());
    const m2 = { ...moths, active: false, send: (n) => (sent.push(n), n) };
    d2.init({ moths: m2, player: { position: { x: 0, z: 0 }, riding: {} }, ground: { openAt: () => 0 }, clock: { day: 2 }, rng: { int: (a) => a } });
    for (let t = 0; t < 60; t += 0.25) d2.update(0.25, true);
    expect(sent).toHaveLength(1);
    const d3 = new DeepForest(config, new EventBus());
    d3.init({ moths: { ...m2, active: true }, player, ground: { openAt: () => 0 }, clock: { day: 2 }, rng: { int: (a) => a } });
    for (let t = 0; t < 60; t += 0.25) d3.update(0.25, true);
    expect(sent).toHaveLength(1);
  });

  it('lets the chainsaw fell trees', () => {
    expect(config.chainsaw.trees.seconds).toBeGreaterThan(0);
    expect(config.viewModel.saw.fell.roll).toBeGreaterThan(1);
  });
});

// ---- step 2: the garage and the quad ----
import { makeMap, makeGround } from './mapFixture.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { buildGarage } from '../src/render/garageModel.js';
import { Quad } from '../src/world/Quad.js';

describe('step 2: the garage inside the west fence', () => {
  const map = makeMap(1234);
  const L = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
  const G = L.garage;

  it('stands inside the fence, west of the cabin, its bays opening south onto the yard', () => {
    expect(G).toBeTruthy();
    expect(G.x).toBeLessThan(L.cabin.x - L.cabin.halfW - G.w / 2);
    for (const p of [...G.posts, ...G.walls.flatMap((w) => [{ x: w.ax, z: w.az }, { x: w.bx, z: w.bz }])]) {
      expect(Math.hypot(p.x - L.centre.x, p.z - L.centre.z)).toBeLessThan(L.radius - 1.5);
    }
    // The front posts are south of the back wall.
    expect(G.posts[0].z).toBeGreaterThan(G.walls[0].az);
    expect(G.bays).toHaveLength(3);
  });

  it("parks Tom's quad in bay 0 from the start, nose out", () => {
    const q = Object.create(Quad.prototype);
    Object.assign(q, { qc: config.quad, homeSpot: G.bays[0] });
    const s = q.parkedSpot();
    expect(s.x).toBe(G.bays[0].x);
    // Heading: ahead is (-sin, -cos): out of the open front, to the south (+z).
    expect(-Math.cos(s.heading)).toBeGreaterThan(0.9);
    expect(ids.has('day1.prompt.quad')).toBe(true);
  });

  it('builds as one mesh', () => {
    const { geometry } = buildGarage(G, config.station.look.garage);
    expect(geometry.getAttribute('position').count).toBeGreaterThan(2000);
    geometry.dispose();
  });
});

// ---- step 3: the shelter behind the store, Night 2, the Screamer, Wyatt on the tower ----
import { NightTwo, night2Count, act2Due, act3Due, night2Over } from '../src/encounters/NightTwo.js';
import { Screamers } from '../src/ai/Screamers.js';
import { TowerSniper, sniperTarget } from '../src/base/TowerSniper.js';
import { StormShelter } from '../src/encounters/StormShelter.js';
import { lootTableFor } from '../src/combat/loot.js';
import progressData from '../src/data/progress.json';
import cutsceneData from '../src/data/cutscenes.json';
import lootData from '../src/data/loot.json';

describe('step 3: the storm shelter behind the gas station', () => {
  const map = makeMap(1234);
  const key = (k) => map.clearings.find((c) => c.cluster && c.key === k);

  it('is a short spur from the store, with the Pruitt farm where it used to be', () => {
    const sh = key('stormShelter');
    const gs = key('gasStation');
    expect(Math.hypot(sh.x - gs.x, sh.z - gs.z)).toBeLessThan(110);
    expect(key('pruittFarm')).toBeTruthy();
    const linked = (a, b) => map.paths.some((p) => [map.clearings[p.a].key, map.clearings[p.b].key].sort().join() === [a, b].sort().join());
    expect(linked('gasStation', 'stormShelter')).toBe(true);
    expect(linked('home', 'stormShelter')).toBe(false);
    expect(linked('home', 'pruittFarm')).toBe(true);
    expect(linked('pruittFarm', 'familyCemetery')).toBe(true);
    // Its frame is entered from the gas station's side.
    const f = StormShelter.frame(map);
    expect(Math.hypot(f.entrance.x - gs.x, f.entrance.z - gs.z)).toBeLessThan(Math.hypot(sh.x - gs.x, sh.z - gs.z));
    const gates = Object.fromEntries(clusterData.gates.map((g) => [g.id, g]));
    expect(gates.shelterSpur.path).toEqual(['gasStation', 'stormShelter']);
    expect(gates.farmGate.opensOn).toBe('farmCall');
  });

  it("has Earl's spade for a Tom with no shovel", () => {
    expect(config.stormShelter.spade).toBeTruthy();
    expect(config.homeStop.enabled).toBe(false);
  });
});

describe('step 3: Night 2 at the station', () => {
  const n = config.night2;

  it('sends a horde, then mutants, then the Screamer; over when it is down and the yard is quiet', () => {
    expect(night2Count(n)).toBeGreaterThan(20);
    expect(act2Due(n.mutants.whenLeft, 0, n)).toBe(true);
    expect(act2Due(n.mutants.whenLeft + 5, 1, n)).toBe(false);
    expect(act2Due(99, n.mutants.after, n)).toBe(true);
    expect(act3Due(0, 0, n)).toBe(true);
    expect(act3Due(2, 1, n)).toBe(false);
    expect(night2Over({ screamerSent: true, screamerAlive: true, left: 0, endLeft: n.endLeft, t: 10, timeout: n.timeout })).toBe(false);
    expect(night2Over({ screamerSent: true, screamerAlive: false, left: 1, endLeft: n.endLeft, t: 10, timeout: n.timeout })).toBe(true);
    expect(night2Over({ screamerSent: false, screamerAlive: false, left: 0, endLeft: n.endLeft, t: 10, timeout: n.timeout })).toBe(false);
  });

  it('has its flags, fades, lines and a line on the forecast', () => {
    const flags = new Set(progressData.flags.map((f) => f.id));
    for (const f of ['wyattRifle', 'night2Prep', 'night2Started', 'night2Done', 'farmCall']) expect(flags.has(f)).toBe(true);
    const cuts = new Set(cutsceneData.cutscenes.map((c) => c.id));
    for (const c of ['fade.nightfall', 'fade.dawn']) expect(cuts.has(c)).toBe(true);
    for (const id of ['gas.safe.lever', 'night2.homeward', 'night2.prep.ellen', 'night2.prep.wyatt', 'night2.horde.wyatt', 'night2.mutant.ellen', 'night2.mutant.wyatt', 'night2.screamer.junie', 'night2.screamer.ellen', 'night2.screamer.down', 'night2.after.camera', 'night2.after.ellen', 'night2.after.wyatt', 'wyatt.tower.1']) expect(ids.has(id)).toBe(true);
    const nt = Object.create(NightTwo.prototype);
    Object.assign(nt, { cfg: config, nc: n, state: 'homeward', act: 0, progress: { has: () => true } });
    expect(nt.forecastPart().marchers).toBe(night2Count(n));
    nt.state = 'done';
    expect(nt.forecastPart()).toBe(null);
  });

  it("Ellen's call no longer has a trigger of its own (it follows Night 2's dawn)", () => {
    expect(progressData.flags.find((f) => f.id === 'outpostCall').trigger).toBeUndefined();
  });
});

describe('step 3: the Screamer', () => {
  it('is far tougher than anything else that walks, and pays when it falls', () => {
    const hp = config.zombies.health * config.zombies.variants.screamer.health;
    expect(hp).toBeGreaterThan(700);
    expect(hp).toBeGreaterThan(config.mutant.health * 2);
    expect(lootTableFor({ variant: 'screamer' }, lootData.tables).length).toBeGreaterThan(0);
  });

  it('screams, calls the dead, is put off by hits, and comes in once it has screamed itself out', () => {
    const bus = new EventBus();
    const spawned = [];
    const z = { alive: true, x: 0, z: 60, health: 800 };
    const enemies = {
      living: [],
      spawnZombie: () => z,
      spawnPlanned: (plan, x, zz, o) => (o.out.push({ alive: true }), spawned.push(o.mode), 1),
      formMarch() {},
      brain: { chase() {}, reset() {} },
    };
    const s = new Screamers(config, bus);
    s.init({ enemies, world: { variantMixAt: () => ({ citizen: 1 }) }, station: { layout: { centre: { x: 0, z: 0 } } }, player: { position: { x: 0, z: 0 } }, sfx: null });
    const e = s.spawn(0, 60);
    expect(z.deaf).toBe(true);
    s.update(config.screamer.first + 0.1, true);
    expect(e.calls).toBe(1);
    expect(spawned).toHaveLength(config.screamer.calls);
    // A hit puts the next scream back.
    const before = e.t;
    bus.emit('enemy:hit', { zombie: z });
    expect(e.t).toBeGreaterThan(before);
    // Screamed out: it walks in.
    e.calls = config.screamer.maxCalls;
    s.update(0.1, true);
    expect(e.comingIn).toBe(true);
    expect(z.deaf).toBe(false);
    bus.emit('enemy:killed', { zombie: z });
    expect(s.alive).toBe(0);
  });
});

describe('step 3: Wyatt on the tower', () => {
  it('picks the one nearest the fence within his range, never one that is held or sinking', () => {
    const list = [
      { alive: true, x: 50, z: 0, mode: 'march' },
      { alive: true, x: 20, z: 0, mode: 'held' },
      { alive: true, x: 30, z: 0, mode: 'march' },
      { alive: false, x: 5, z: 0, mode: 'march' },
      { alive: true, x: 200, z: 0, mode: 'march' },
    ];
    expect(sniperTarget(list, 10, 0, 60, 0, 0)).toBe(list[2]);
    expect(sniperTarget([], 10, 0, 60, 0, 0)).toBe(null);
  });

  it("goes up at night once he has Earl's lever gun, and comes down by day", () => {
    const placed = [];
    const flags = new Set();
    const t = new TowerSniper(config, new EventBus());
    t.init({
      station: { layout: { tower: { x: 11, z: 0, height: 9 }, centre: { x: 0, z: 0 } }, placeFamily: (i, spot) => placed.push(spot), renderer: {} },
      enemies: { living: [] }, clock: { phase: 'night' }, progress: { has: (f) => flags.has(f) }, rng: { range: (a) => a, chance: () => true }, ground: { heightAt: () => 0 },
    });
    t.update(0.1, true);
    expect(placed).toHaveLength(0);
    flags.add('wyattRifle');
    t.update(0.1, true);
    expect(placed[0].y).toBe(9);
    t.clock.phase = 'day';
    t.update(0.1, true);
    expect(placed[1]).toBe(null);
  });
});
