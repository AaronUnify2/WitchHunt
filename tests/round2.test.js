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

// ---- step 4: the campsite without the shotgun, the shut gate, the Pruitt farm, the outpost by its east side ----
import { PruittFarm, porchMoths, afternoonAt, FARM_FLAGS } from '../src/encounters/PruittFarm.js';
import { buildPruittFarm, FARM } from '../src/render/pruittFarmModel.js';
import farmData from '../src/data/pruittFarm.json';
import papersData from '../src/data/papers.json';
import loreData from '../src/data/lore.json';
import outpostData from '../src/data/outpost.json';
import campsiteData from '../src/data/campsite.json';

describe('step 4: Day 3 and the Pruitt farm', () => {
  it('opens the back way from the shut main gate: the farm gate and the tear in the fence on farmCall, the main gate once the outpost is cleared', () => {
    const gates = Object.fromEntries(clusterData.gates.map((g) => [g.id, g]));
    expect(gates.outpostRoad.opensOn).toBe('outpostCleared');
    expect(gates.outpostSide.kind).toBe('fenceRip');
    expect(gates.outpostSide.opensOn).toBe('farmCall');
    expect(gates.farmGate.opensOn).toBe('farmCall');
    expect(config.map.gates.fenceRip).toBeTruthy();
    const flags = new Set(progressData.flags.map((f) => f.id));
    for (const f of FARM_FLAGS) expect(flags.has(f)).toBe(true);
  });

  it('moves the afternoon on at the gate, never back', () => {
    expect(afternoonAt(100, 480, 70)).toBe(410);
    expect(afternoonAt(450, 480, 70)).toBe(450);
  });

  it("knows what the porch's moths do: at the light they wait; near, they come; shot from far, they scatter; in the dark they leave, unless his torch is on", () => {
    expect(porchMoths({ light: true, torch: false, near: false, shot: false, far: true })).toBe(null);
    expect(porchMoths({ light: true, torch: true, near: true, shot: false, far: false })).toBe('attack');
    expect(porchMoths({ light: true, torch: false, near: false, shot: true, far: true })).toBe('scatter');
    expect(porchMoths({ light: true, torch: false, near: false, shot: true, far: false })).toBe('attack');
    expect(porchMoths({ light: false, torch: false, near: false, shot: false, far: true })).toBe('leave');
    expect(porchMoths({ light: false, torch: true, near: false, shot: false, far: true })).toBe('attack');
  });

  it('builds the farmhouse clear of the track on to the family plot, with every spot its beat needs', () => {
    const m = buildPruittFarm(config.pruittFarm);
    for (const name of ['porchLight', 'porch', 'steps', 'door', 'journal', 'shotgun', 'pantry', 'generator', 'oakTop', 'mailbox', ...farmData.looks.map((l) => l.spot), ...farmData.searches.map((s) => s.spot)]) expect(m.spots[name], name).toBeTruthy();
    // The track on leaves ahead and to the right (x > 0 in the frame): the house is all to the left of it.
    expect(FARM.house.x1).toBeLessThan(0);
    expect(m.colliders.length).toBeGreaterThan(10);
    expect(farmData.roost.length).toBeGreaterThanOrEqual(config.pruittFarm.moths.count);
    for (const [, h] of farmData.roost) expect(h).toBeLessThan(FARM.house.floor + FARM.house.wall);
    m.dispose();
  });

  it("has Marcy's journal (she believed him), Earl's shotgun, and the family's lines", () => {
    const paper = papersData.papers.find((p) => p.id === 'marcyJournal');
    expect(paper.pages.length).toBeGreaterThanOrEqual(3);
    expect(paper.pages.map((p) => p.text).join(' ')).toMatch(/I believe|I know who I married/);
    expect(loreData.items.find((i) => i.id === 'marcyJournal').paper).toBe('marcyJournal');
    for (const id of ['farm.gate.wyatt', 'farm.gate.ellen', 'farm.gate.back', 'farm.gate.car', 'farm.arrive.wyatt', 'farm.arrive.ellen', 'farm.moths.wake', 'farm.moths.leave', 'farm.mothman.wyatt', 'farm.mothman.ellen', 'farm.mothman.ellenFled', 'farm.journal.ellen', 'farm.journal.wyatt', 'farm.shotgun.wyatt', 'farm.plot.wyatt', 'outpost.arrive.east', 'outpost.helmet.east']) expect(ids.has(id), id).toBe(true);
    const cuts = new Set(cutsceneData.cutscenes.map((c) => c.id));
    for (const c of ['fade.afternoon', 'sweep.farm', 'farm.mothman', 'sweep.outpostEast']) expect(cuts.has(c)).toBe(true);
    expect(campsiteData.searches.some((s) => s.gives?.some((g) => g.item === 'shotgun'))).toBe(false);
    expect(outpostData.firstHelmetEast.x).toBeLessThan(0);
  });

  it('is found from the clearing east of home', () => {
    const map = makeMap(1234);
    const f = PruittFarm.frame(map);
    const home = map.clearings[map.homeIndex];
    expect(f.x).toBeGreaterThan(home.x + 100);
  });
});

// ---- step 5: the family at their stations ----
import { ellenAtBoard, pinned, nextToRead, pickTip } from '../src/story/FamilyStations.js';
import { boardItemParts } from '../src/render/storyBoard.js';
import { stationLayout, zoneOf } from '../src/base/stationLayout.js';
import { FamilyTalk } from '../src/story/FamilyTalk.js';
import boardData from '../src/data/storyBoard.json';
import progressData from '../src/data/progress.json';
import { readFileSync } from 'node:fs';

describe('step 5: the family at their stations', () => {
  const map5 = makeMap(1234);
  const layout = stationLayout(map5.clearings[map5.homeIndex], makeGround(1234), config.station.layout);
  const cabin = layout.cabin;

  it("puts Ellen's board in the main room facing the front door, clear of the way to the comms door, and Junie at the comms desk", () => {
    const b = cabin.board;
    expect(zoneOf(layout, b.stand.x, b.stand.z)).toBe(2);
    expect(zoneOf(layout, b.look.x, b.look.z)).toBe(2);
    expect(zoneOf(layout, cabin.junieSpot.x, cabin.junieSpot.z)).toBe(3);
    // The dead's way in: the front door's inner spot to the comms door's outer one. Nothing of hers within 0.8 m of it.
    const a = cabin.frontDoor.inner;
    const c = cabin.commsDoor.outer;
    const off = (p) => {
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * (c.x - a.x) + (p.z - a.z) * (c.z - a.z)) / ((c.x - a.x) ** 2 + (c.z - a.z) ** 2)));
      return Math.hypot(p.x - (a.x + (c.x - a.x) * t), p.z - (a.z + (c.z - a.z) * t));
    };
    expect(off(b.stand)).toBeGreaterThan(0.8);
    expect(off({ x: b.desk.x + b.desk.w / 2, z: b.desk.z })).toBeGreaterThan(0.8);
    expect(cabin.furniture.some((f) => f.id === 'ellenDesk')).toBe(true);
    // The board fits on the wall west of the comms door.
    expect(b.x + b.w / 2).toBeLessThan(cabin.commsDoor.x - cabin.commsDoor.width / 2);
    expect(b.bottom + b.h).toBeLessThan(cabin.wallHeight - 0.3);
  });

  it('has Ellen at the board by day and in the comms room from dusk to dawn', () => {
    expect(ellenAtBoard('day')).toBe(true);
    expect(ellenAtBoard('dawn')).toBe(true);
    expect(ellenAtBoard('dusk')).toBe(false);
    expect(ellenAtBoard('night')).toBe(false);
    expect(ellenAtBoard('day', false)).toBe(false);
    expect(ellenAtBoard('day', true, true)).toBe(false); // the opening: still at the radio
  });

  it('pins things to the board as the story sets their flags, every one on the cork and on a real flag', () => {
    const flags = new Set(progressData.flags.map((f) => f.id));
    const b = config.station.layout.cabin.board;
    const seen = new Set();
    for (const it of boardData.items) {
      expect(seen.has(it.id), it.id).toBe(false);
      seen.add(it.id);
      if (it.flag) expect(flags.has(it.flag), it.id).toBe(true);
      expect(config.familyStations.kinds[it.kind], it.id).toBeDefined();
      expect(it.text.length, it.id).toBeGreaterThan(20);
      const r = Math.hypot(it.size[0], it.size[1]) / 2;
      expect(it.at[0] - r, it.id).toBeGreaterThan(-0.02);
      expect(it.at[0] + r, it.id).toBeLessThan(b.w + 0.02);
      expect(it.at[1] - r, it.id).toBeGreaterThan(-0.02);
      expect(it.at[1] + r, it.id).toBeLessThan(b.h + 0.02);
      for (const [x, y] of [...(it.to ?? []), ...(it.pins ?? [])]) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(b.w);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(b.h);
      }
      const parts = boardItemParts(it, config.familyStations);
      expect(parts.length, it.id).toBeGreaterThan(1);
      for (const g of parts) g.dispose();
    }
    expect(pinned(boardData.items, () => false)).toEqual(['county', 'family']);
    expect(pinned(boardData.items, (f) => f === 'marcyJournal')).toEqual(['county', 'family', 'marcy']);
    expect(pinned(boardData.items, () => true).length).toBe(boardData.items.length);
  });

  it('reads the newest unread thing off the board first, then goes round them', () => {
    const shown = ['county', 'family', 'campers'];
    const read = new Set();
    expect(nextToRead(shown, read, null)).toBe('campers');
    read.add('campers');
    expect(nextToRead(shown, read, 'campers')).toBe('family');
    read.add('family');
    read.add('county');
    expect(nextToRead(shown, read, 'county')).toBe('family');
    expect(nextToRead(shown, read, 'campers')).toBe('county');
    expect(nextToRead([], read, null)).toBe(null);
  });

  it("has a line for Ellen on every step of the first third she could be asked about, each saying why", () => {
    const src = readFileSync(new URL('../src/story/Objectives.js', import.meta.url), 'utf8');
    const steps = [...src.matchAll(/steps?\('([a-zA-Z0-9]+)'/g)].map((m) => m[1]);
    const upTo = steps.indexOf('planeFlare');
    expect(upTo).toBeGreaterThan(30);
    const away = new Set(['camcorder', 'wave', 'planeFlare']); // (mid-clip, mid-fight: never at home)
    for (const s of new Set(steps.slice(0, upTo))) if (!away.has(s)) expect(ids.has(`board.${s}`), s).toBe(true);
    expect(ids.has('board.none')).toBe(true);
    for (const l of dialogueData.lines.filter((x) => x.id.startsWith('board.'))) {
      expect(l).toMatchObject({ speaker: 'ellen', channel: 'face', cued: true, repeatable: true, draft: true });
      expect(steps.includes(l.id.slice(6)) || l.id === 'board.none', l.id).toBe(true);
    }
  });

  it("gives Junie's newest unheard tip first, only ones the story has earned, then round them again", () => {
    const tips = dialogueData.lines.filter((l) => l.tip);
    expect(tips.length).toBeGreaterThan(10);
    const flags = new Set(progressData.flags.map((f) => f.id));
    for (const l of tips) {
      expect(l).toMatchObject({ speaker: 'junie', channel: 'face', cued: true, draft: true });
      for (const f of l.when?.all ?? []) expect(flags.has(f), l.id).toBe(true);
    }
    const facts = (list) => ({ night: 1, phase: 'day', flags: new Set(list), milestones: [], scripts: new Set() });
    const heard = new Set();
    // Day 1, nothing seen yet: the general ones only.
    expect(pickTip(tips, facts([]), heard, null).id).toBe('tip.head');
    heard.add('tip.head');
    expect(pickTip(tips, facts([]), heard, 'tip.head').id).toBe('tip.dead');
    heard.add('tip.dead');
    expect(pickTip(tips, facts([]), heard, 'tip.dead').id).toBe('tip.head'); // round again
    // The Screamer seen: that's what she talks about first.
    expect(pickTip(tips, facts(['night2Done', 'day1Battery']), heard, 'tip.dead').id).toBe('tip.screamer');
    expect(pickTip([], facts([]), heard, null)).toBe(null);
  });

  it('lets Tom ask someone with nothing new, and only talks to someone in the room with him', () => {
    const cfg = config;
    const talk = new FamilyTalk(cfg, new EventBus());
    const fig = (x, z) => ({ position: { x, y: 0, z }, visible: true });
    const figures = [fig(0, -2), fig(50, 50), fig(1, -2)];
    const played = [];
    let reachable = true;
    const sub = { busy: false, talking: null, current: null, advance() {} };
    const scene = { add() {} };
    Object.assign(talk, {});
    // (No three scene: stand in for init's meshes.)
    talk.dialogue = { hasNew: () => false, talkTo: () => null };
    talk.subtitles = sub;
    talk.player = { camera: { position: { x: 0, y: 1.6, z: 0 } }, yaw: 0 };
    talk.figures = figures;
    talk.ids = cfg.story.family;
    talk.hold = { progress: 0, update: (dt, key, down) => Boolean(key && down) };
    talk.hud = { prompt: '', progress: 0 };
    talk.baseY = [0, 0, 0];
    talk.time = 0;
    talk.checkTimer = 99;
    talk.talkingTo = null;
    talk.markers = [];
    talk.reach = () => reachable;
    talk.ask = (id) => (id === 'ellen' ? { prompt: "ask Ellen what's next", play: () => played.push(id) } : null);
    void scene;
    const input = { activeDevice: 'gamepad', isDown: () => false, wasPressed: () => false };
    talk.update(0.1, input, true);
    expect(talk.hud.prompt).toBe("Hold X: ask Ellen what's next");
    talk.update(0.1, { ...input, isDown: () => true }, true);
    expect(played).toEqual(['ellen']);
    expect(talk.talkingTo).toBe('ellen');
    // Not through a wall.
    talk.talkingTo = null;
    reachable = false;
    talk.update(0.1, input, true);
    expect(talk.hud.prompt).toBe('');
  });
});

// ---- step 6: the fog funnel ----
import { shortestWay, funnelRoute, outsideBy, fogAmount, funnelOn, nextStop, FogFunnel } from '../src/story/FogFunnel.js';

describe('step 6: the fog funnel', () => {
  const f = config.fogFunnel;
  const all = () => true;

  it('is on from the night Junie is taken until she is home', () => {
    const has = (list) => (x) => list.includes(x);
    expect(funnelOn(has([]), f.from, f.until)).toBe(false);
    expect(funnelOn(has(['junieTaken']), f.from, f.until)).toBe(true);
    expect(funnelOn(has(['junieTaken', 'junieHome']), f.from, f.until)).toBe(false);
  });

  it('finds the way from the checkpoint to the plane, the church and the stairs on every seed, south of the cordon', () => {
    for (const seed of [1, 7, 1234, 4242]) {
      const map = makeMap(seed);
      const idx = (k) => map.clearings.findIndex((c) => c.key === k);
      const route = funnelRoute(map, f.legs, all, f.clearingPad);
      expect(route.lines.length, `seed ${seed}`).toBeGreaterThanOrEqual(3);
      expect(route.ends.length).toBe(f.legs.length);
      for (const key of ['crashedPlane', 'timeCapsule', 'stairs']) {
        const c = map.clearings[idx(key)];
        expect(outsideBy(route, c.x, c.z, f.half).d, `${key} seed ${seed}`).toBeLessThan(-f.fogStart);
      }
      // The stairs' leg waits on the 1903 account.
      const early = funnelRoute(map, f.legs, (x) => x !== 'stairsKnown' && x !== 'junieFound', f.clearingPad);
      const st = map.clearings[idx('stairs')];
      expect(outsideBy(early, st.x, st.z, f.half).d).toBeGreaterThan(0);
      // No pathway north of the cordon but the checkpoint's own.
      const way = shortestWay(map, idx('crashedPlane'), idx('timeCapsule'), (p) => !p.cluster || p.checkpoint);
      for (const k of way) expect(map.paths[k].cluster && !map.paths[k].checkpoint).toBeFalsy();
    }
  });

  it("points the objective at the next clearing on the way, not through the fog, and at the gate when the goal's home", () => {
    for (const seed of [1, 1234]) {
      const map = makeMap(seed);
      const at = (k) => map.clearings.find((c) => c.key === k);
      const idx = (k) => map.clearings.findIndex((c) => c.key === k);
      const route = funnelRoute(map, f.legs, all, f.clearingPad, f.placePad);
      const opts = { cordonZ: map.cluster.cordonZ, gate: idx('outpost') };
      const plane = at('crashedPlane');
      const church = at('timeCapsule');
      const stairs = at('stairs');
      // From the plane, for the church: the next clearing on the pathways toward it (the church itself if it's next).
      const first = nextStop(map, route, plane.x, plane.z, church, opts);
      const way = shortestWay(map, idx('crashedPlane'), idx('timeCapsule'), (p) => !p.cluster || p.checkpoint);
      const p0 = map.paths[way[0]];
      const second = map.clearings[p0.a === idx('crashedPlane') ? p0.b : p0.a];
      expect(first).toMatchObject({ x: second.x, z: second.z });
      // In the church's own clearing: the goal as it is (a spot in it).
      const spot = { x: church.x + 5, z: church.z - 3 };
      expect(nextStop(map, route, church.x, church.z, spot, opts)).toBe(spot);
      // Walking the stops in turn from the plane reaches the stairs: every stop is a clearing on the route, never the same twice.
      let here = plane;
      const seen = new Set();
      for (let i = 0; i < 20 && here !== stairs; i++) {
        const n = nextStop(map, route, here.x, here.z, stairs, opts);
        const c = map.clearings.find((q) => q.x === n.x && q.z === n.z);
        expect(c, `seed ${seed} step ${i}`).toBeDefined();
        expect(seen.has(c)).toBe(false);
        seen.add(c);
        here = c;
      }
      expect(here).toBe(stairs);
      // Home, from the stairs: toward the outpost's gate, never a point north of the cordon until he's there.
      const home = map.clearings[map.homeIndex];
      const back = nextStop(map, route, stairs.x, stairs.z, home, opts);
      expect(back.z).toBeGreaterThan(map.cluster.cordonZ - 60);
      expect(back).not.toBe(home);
      // A goal that's nowhere on the way (a debug jaunt): left alone.
      const off = { x: stairs.x + 400, z: stairs.z + 400 };
      expect(nextStop(map, route, plane.x, plane.z, off, opts)).toBe(off);
    }
  });

  it('is clear on the path, thickens toward the edge, and is a wall at it', () => {
    const route = { lines: [[{ x: 0, z: 0 }, { x: 100, z: 0 }]], discs: [{ x: 100, z: 0, r: 30 }], ends: [{ x: 100, z: 0 }] };
    expect(outsideBy(route, 50, 0, 20).d).toBe(-20);
    expect(outsideBy(route, 50, 26, 20).d).toBeCloseTo(6);
    expect(outsideBy(route, 100, 25, 20).d).toBeCloseTo(-5); // in the clearing
    expect(fogAmount(-20, 12)).toBe(0);
    expect(fogAmount(-6, 12)).toBeCloseTo(0.5);
    expect(fogAmount(0, 12)).toBe(1);
    expect(fogAmount(5, 12)).toBe(1);
  });

  it('puts Tom back inside the edge, tells him once, and leaves the north alone', () => {
    const map = makeMap(1234);
    const flags = new Set(['junieTaken']);
    const told = [];
    const sky = { setWall: (a) => (sky.a = a) };
    const player = { position: { x: 0, z: 0 }, riding: null, platform: null };
    const fun = new FogFunnel(config, new EventBus());
    fun.init({ map, player, progress: { has: (x) => flags.has(x) }, sky, atmosphere: {}, caller: null, interiors: { inside: false }, notify: (t) => told.push(t) });
    const plane = map.clearings.find((c) => c.key === 'crashedPlane');
    // In the plane's clearing: clear.
    Object.assign(player.position, { x: plane.x, z: plane.z });
    for (let i = 0; i < 40; i++) fun.update(0.1);
    expect(fun.active).toBe(true);
    expect(fun.amount).toBeLessThan(0.01);
    // Walk off it, away from every pathway, until the wall: he never gets more than a step past the edge.
    let far = -Infinity;
    for (let i = 0; i < 600; i++) {
      const o = outsideBy(fun.route, player.position.x, player.position.z, f.half);
      const l = Math.hypot(player.position.x - o.x, player.position.z - o.z) || 1;
      player.position.x += ((player.position.x - o.x) / l || 1) * 0.3;
      player.position.z += ((player.position.z - o.z) / l || 0) * 0.3;
      fun.update(1 / 30);
      far = Math.max(far, outsideBy(fun.route, player.position.x, player.position.z, f.half).d);
    }
    expect(far).toBeLessThan(0.1);
    expect(fun.amount).toBeGreaterThan(0.8);
    expect(told).toEqual([f.text]);
    // North of the cordon: nothing.
    Object.assign(player.position, { x: 300, z: map.cluster.cordonZ - 40 });
    for (let i = 0; i < 60; i++) fun.update(0.1);
    expect(fun.amount).toBe(0);
    // Junie home: off, wherever he is.
    flags.add('junieHome');
    Object.assign(player.position, { x: 300, z: map.cluster.cordonZ + 200 });
    for (let i = 0; i < 60; i++) fun.update(0.1);
    expect(fun.active).toBe(false);
    expect(fun.amount).toBe(0);
  });
});
