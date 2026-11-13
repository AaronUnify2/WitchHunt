// The first third's plan (docs/FIRST_THIRD_PLAN.md), batch 1: the parts outside the outpost
// (the outpost's are in outpost.test.js).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { Objectives } from '../src/story/Objectives.js';
import { NightWatch } from '../src/base/NightWatch.js';
import dialogueData from '../src/data/dialogue.json';
import campsiteData from '../src/data/campsite.json';

const ids = new Set(dialogueData.lines.map((l) => l.id));

// The goal at the gas station, from a game faked just far enough.
function gasGoal({ flags = [], done = [], witchSeen = false, batteries = 0 } = {}) {
  const set = new Set(['gasStationVisited', ...flags]);
  const o = new Objectives(config, null);
  const gas = {
    frame: { x: 0, z: 0, fx: 0, fz: 1, rx: 1, rz: 0, radius: 24 },
    data: { building: { door: { x: 0 }, z1: -3 }, forecourt: { z0: -3, z1: 9 } },
    spots: [{ id: 'phone', x: 1, z: 1 }, { id: 'scanner', x: 2, z: 2 }, { id: 'note', x: 3, z: 3 }],
    mutantState: 'down',
    witchSeen,
    done: new Set(done),
    sureCar: { x: 9, z: 9 },
  };
  o.init({
    progress: { has: (f) => set.has(f) },
    clock: { day: 2, phase: 'day' },
    station: { layout: { fenceBox: { x: 1, z: 2 }, cabin: { frontDoor: { x: 3, z: 4 } }, tower: { ladder: { x: 0, z: 0 } } }, state: { segments: [] }, shovelSpot: () => ({ x: 5, z: 5 }) },
    campsite: {}, gasStation: gas, shelter: null, outpost: null,
    world: { map: { clearings: [], cluster: {} } },
    combat: { weapons: { has: () => false }, inventory: { batteries } },
  });
  return o.work();
}

describe('the gas station: the goal follows the gate (plan #4)', () => {
  it('runs phone, scanner, note, and only then the forecourt if she has not been seen', () => {
    expect(gasGoal().id).toBe('phone');
    expect(gasGoal({ done: ['phone'] }).id).toBe('scanner');
    expect(gasGoal({ done: ['phone', 'scannerTried'] }).id).toBe('scannerBattery');
    expect(gasGoal({ done: ['phone', 'scanner'] }).id).toBe('note');
    const look = gasGoal({ done: ['phone', 'scanner', 'note'] });
    expect(look.id).toBe('gasLook');
    expect(look.text).toMatch(/forecourt/);
    expect(ids.has('hint.gasLook')).toBe(true);
  });

  it('moves straight on to the shovel once the gate is open, whatever is left undone', () => {
    expect(gasGoal({ flags: ['shelterCall'], witchSeen: true, done: ['note'] }).id).toBe('shovel');
  });
});

describe('the forecast tells the truth (plan #6)', () => {
  const nw = (day, sigils) => {
    const n = Object.create(NightWatch.prototype);
    n.cfg = config;
    n.nc = config.nights;
    n.clock = { day, phase: 'dusk', currentPhase: { seconds: 60 }, phaseElapsed: 0 };
    n.director = { sigils: { list: sigils }, describe: () => 'by the shelter' };
    n.enemies = { marches: { remaining: () => 200 } };
    n.witch = null;
    Object.defineProperty(n, 'level', { value: 1 });
    n.nightSeconds = config.clock.phases.find((p) => p.name === 'night')?.seconds ?? 360;
    return n;
  };

  it("shows Night 1's nine instead of 'a quiet night'", () => {
    const d = nw(1, []).dangerNow();
    expect(d.parts).toHaveLength(1);
    expect(d.parts[0].marchers).toBe(9);
    expect(d.total).toBeGreaterThan(0);
  });

  it("doesn't count a sigil whose dead stay round it (the shelter's) as marching", () => {
    const held = nw(2, [{ x: 0, z: 0, hold: 14 }]).dangerNow();
    expect(held.total).toBe(0);
    expect(held.parts[0].held).toBe(true);
    const free = nw(2, [{ x: 0, z: 0 }]).dangerNow();
    expect(free.total).toBeGreaterThan(0);
  });

  it('waits while a zombie is after Tom close by, or he is underground, but not past its cap', () => {
    const n = nw(2, []);
    n.player = { position: { x: 0, z: 0 } };
    n.enemies.living = [{ alive: true, mode: 'chase', x: 5, z: 0 }];
    n.interiors = { inside: false };
    expect(n.forecastHeld('dusk')).toBe(true);
    n.enemies.living = [];
    expect(n.forecastHeld('dusk')).toBe(false);
    n.interiors.inside = true;
    expect(n.forecastHeld('dusk')).toBe(true);
    n.clock.phaseElapsed = config.nights.forecastHold.maxSeconds + 1;
    expect(n.forecastHeld('night')).toBe(false);
  });
});

describe('Day 1: the tape before the gun (plan #7)', () => {
  it("points the star at the camcorder's shelter until it's found", () => {
    const o = new Objectives(config, null);
    const points = campsiteData.searches.map((s) => ({ ...s }));
    o.g = { campsite: { points, searched: new Set(), camcorderFound: false }, player: { position: { x: points.find((p) => p.id === 'tent1').x, z: points.find((p) => p.id === 'tent1').z } } };
    expect((o.nearestTent().gives ?? []).some((g) => g.item === 'camcorder')).toBe(true);
  });

  it('prompts fire, aim and reload, and healing, once each', () => {
    expect(config.firstDay.prompts.healBelow).toBeGreaterThan(0);
  });
});

// ---- batch 2: Night 2 is when the loop arrives ----
import { StormShelter } from '../src/encounters/StormShelter.js';
import { TrailCams } from '../src/story/TrailCams.js';
import { placeTrailCams, camSees } from '../src/story/trailCamPlacement.js';
import { Rng } from '../src/core/Rng.js';
import { EventBus } from '../src/core/EventBus.js';
import clusterData from '../src/data/openingCluster.json';
import progressData from '../src/data/progress.json';
import { makeMap } from './mapFixture.js';

describe("Day 2's dusk waits for the hatch (plan #9)", () => {
  const h = config.stormShelter.duskHold;
  const shelter = (flags = ['shelterCall']) => {
    const s = Object.create(StormShelter.prototype);
    s.sc = config.stormShelter;
    s.clock = { phase: 'day', currentPhase: { seconds: 480 }, phaseElapsed: 470 };
    s.progress = { has: (f) => flags.includes(f) };
    s.player = { position: { x: 0, z: 0 } };
    s.hatchAt = { x: 0, z: 0 };
    s.beenDown = false;
    s.keysTaken = false;
    s.duskHeld = 0;
    return s;
  };

  it('holds the day short of dusk once the shelter is called, until Tom goes down', () => {
    const s = shelter();
    s.holdDusk(1 / 30);
    expect(s.clock.phaseElapsed).toBe(480 - h.holdBeforeDusk);
    s.beenDown = true;
    s.clock.phaseElapsed = 470;
    s.holdDusk(1 / 30);
    expect(s.clock.phaseElapsed).toBe(470);
  });

  it('not before the call, not for ever, and not once he has left with the keys', () => {
    const before = shelter([]);
    before.holdDusk(1 / 30);
    expect(before.clock.phaseElapsed).toBe(470);
    const long = shelter();
    long.duskHeld = h.holdMax;
    long.holdDusk(1 / 30);
    expect(long.clock.phaseElapsed).toBe(470);
    const gone = shelter();
    gone.keysTaken = true;
    gone.player.position.x = h.releaseDistance + 5;
    gone.holdDusk(1 / 30);
    expect(gone.clock.phaseElapsed).toBe(470);
  });

  it('has dusk versions of the home stop lines', () => {
    for (const id of ['home.stop.call.dusk', 'home.stop.night']) expect(ids.has(id)).toBe(true);
  });
});

describe('camera seven at the family plot (plan #10)', () => {
  const map = makeMap(1234);
  const cams = placeTrailCams(map, new Rng('1234:trailcams'), config.trailCams, clusterData.trailCams);

  it('is fixed at the plot, sees its centre, and the frontier keeps its five', () => {
    const seven = cams.find((c) => c.id === 7);
    expect(seven?.fixed).toBe(true);
    expect(seven?.story).toBe(true);
    const plot = map.clearings.find((c) => c.cluster && c.key === 'familyCemetery');
    expect(camSees(seven, plot.x, plot.z, config.trailCams.range)).toBe(true);
    expect(cams.filter((c) => !c.fixed)).toHaveLength(config.trailCams.count - clusterData.trailCams.length);
    expect(progressData.flags.some((f) => f.id === 'plotCamSeen')).toBe(true);
    for (const id of ['trailcam.plot', 'nights.forecast.2']) expect(ids.has(id)).toBe(true);
  });

  it('the first report from it is quick, spoken, and offers the feed on D-pad down; later ones are toasts', () => {
    const bus = new EventBus();
    const flags = new Set();
    const t = Object.create(TrailCams.prototype);
    Object.assign(t, { cfg: config, tc: config.trailCams, bus, rng: new Rng('x'), time: 0, reports: [], lastSighting: null });
    const played = [];
    const offers = [];
    const toasts = [];
    Object.assign(t, {
      witch: { x: 0, z: 0, state: 'planting' },
      clock: { day: 2, hourOfDay: 21 },
      progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) },
      dialogue: { play: (id) => played.push(id) },
      watch: { offer: (o) => offers.push(o) },
      notify: (x) => toasts.push(x),
    });
    const cam = { id: 7, name: 'Camera 7', x: 0, z: 0, facing: 0, story: true, sightings: [], cooldown: 0 };
    t.caught(cam);
    expect(t.reports[0].at).toBe(config.trailCams.firstPlotReport.delay);
    t.report(cam, cam.sightings[0]);
    expect(played).toEqual(['trailcam.plot']);
    expect(offers).toHaveLength(1);
    expect(toasts).toHaveLength(0);
    expect(flags.has('plotCamSeen')).toBe(true);
    t.report(cam, cam.sightings[0]);
    expect(toasts).toHaveLength(1);
  });
});

describe('the dawn report (plan #11)', () => {
  it("says the fence box's charge, damaged panels and what's still in the ground", () => {
    const n = Object.create(NightWatch.prototype);
    n.station = { state: { charge: 0, capacity: 300, segments: [{ health: 500, max: 500 }, { health: 200, max: 500 }] } };
    n.director = { sigils: { list: [{ known: true }] }, describe: () => 'at the family cemetery' };
    const r = n.dawnReport();
    expect(r).toMatch(/Fence charge 0 of 300/);
    expect(r).toMatch(/1 fence panel damaged/);
    expect(r).toMatch(/1 sigil still in the ground \(at the family cemetery\)/);
    expect(ids.has('nights.boxFlat')).toBe(true);
  });
});
