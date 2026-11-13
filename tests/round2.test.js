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
