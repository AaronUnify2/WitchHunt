// Session 19, Aaron's playtest notes (round 29).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { playerSenses } from '../src/ai/detection.js';
import campsite from '../src/data/campsite.json';
import outpost from '../src/data/outpost.json';
import gasStation from '../src/data/gasStation.json';
import cutscenes from '../src/data/cutscenes.json';
import papers from '../src/data/papers.json';

const list = (x) => (Array.isArray(x) ? x : Object.values(x).filter((v) => v && typeof v === 'object'));

describe("Aaron's notes", () => {
  it('no axe at the campsite (it read as a weapon to pick up)', () => {
    expect(campsite.props.dressing.stump).toBeUndefined();
  });

  it("Earl's office has more in it than the desk", () => {
    const o = gasStation.office;
    for (const k of ['shelf', 'coatStand', 'bin', 'heater', 'antlers', 'photo', 'calendar']) expect(o[k], k).toBeTruthy();
  });

  it('the field report is not signed by a Hale', () => {
    const report = list(papers.papers ?? papers).find((p) => p.id === 'fieldReport');
    expect(JSON.stringify(report)).not.toMatch(/HALE/i);
  });

  it('the shelter and gas station sweeps let the world run, unseen', () => {
    for (const id of ['sweep.shelter', 'sweep.gasStation']) {
      const c = cutscenes.cutscenes.find((x) => x.id === id);
      expect(c.world).toBe('run');
      expect(c.unseen).toBe(true);
    }
  });

  it('nothing notices Tom while an unseen cutscene plays', () => {
    const p = { x: 0, z: 0, eyeY: 1.7, daylight: 1, torchOn: true, crouched: false, sprinting: true, speed: 6, undergrowth: 0 };
    const seen = playerSenses(p, config.detection, 1);
    expect(seen.sight).toBeGreaterThan(0);
    const unseen = playerSenses({ ...p, unseen: true }, config.detection, 1);
    expect(unseen.sight).toBe(0);
    expect(unseen.hearing).toBe(0);
    expect(unseen.touch).toBe(0);
  });

  it('the armoury lockers stand against the comms hut, facing away from the road', () => {
    const a = outpost.compound.armoury;
    const c = outpost.compound.comms;
    expect(a.face).toBe(1);
    expect(Math.abs(a.x - (c.x + c.w / 2 + 0.36))).toBeLessThan(0.05);
    const s = outpost.searches.find((x) => x.id === 'armoury');
    expect(s.x).toBeGreaterThan(a.x);
  });

  it('the outpost has a generator out in the open and floodlights on from the start at its gates and C-7', () => {
    expect(outpost.floods.generator).toBeTruthy();
    expect(outpost.floods.always.length).toBeGreaterThanOrEqual(3);
    const f = config.outpost.look.floods;
    expect(f.pool).toBeGreaterThan(0);
    expect(f.intensity).toBeGreaterThan(0);
  });
});

describe('round 3: the generator at the tower, the outpost on the map', async () => {
  const { Objectives } = await import('../src/story/Objectives.js');
  const dialogue = (await import('../src/data/dialogue.json')).default;
  it('the generator stands at the foot of the watchtower', () => {
    const g = outpost.floods.generator;
    const t = outpost.tower;
    expect(Math.hypot(g.x - t.x, g.z - t.z)).toBeLessThan(4);
  });
  it('the family point it out, and nudge the fight step', () => {
    const ids = new Set(dialogue.lines.map((l) => l.id));
    expect(ids.has('outpost.floods.hint')).toBe(true);
    expect(ids.has('hint.outpostFight')).toBe(true);
  });

  // A stand-in game with just enough for the outpost's steps.
  const fake = (over = {}) => {
    const flags = new Set(['gasStationVisited', 'rifleClaimed', 'homeStop', 'outpostCall', ...(over.flags ?? [])]);
    const p = (x, z) => ({ x, z });
    const op = {
      frame: { x: 0, z: 0, rx: 1, rz: 0, fx: 0, fz: 1 },
      approachStarted: true,
      peakState: 'none',
      floodsOn: false,
      turret: { state: 'dead' },
      roundsTaken: false,
      gapAt: p(0, 4),
      generatorAt: () => p(13, -8),
      turretAt: () => p(-8, -10),
      roundsAt: () => p(-7, -9),
      told: new Set(),
      searched: new Set(),
      crates: ['whole'],
      crateAt: [p(20, 20)],
      resinDoorAt: p(-18, 17),
      c7At: p(40, -26),
      points: [{ id: 'armoury', ...p(13, 9) }, { id: 'report', ...p(11, 10) }, { id: 'manifest', ...p(10, 20) }],
      ladderAt: p(11, -9),
      dogfightSeen: false,
      ...over.op,
    };
    return {
      progress: { has: (f) => flags.has(f) },
      clock: { day: 3, phase: 'day' },
      station: { layout: {} },
      campsite: {},
      gasStation: {},
      shelter: {},
      outpost: op,
      watch: { has: () => false },
      world: { map: { clearings: [], cluster: { checkpoint: p(0, 30) } } },
      combat: { inventory: { batteries: 0 }, weapons: { order: ['shovel'], has: (id) => id === 'shovel' } },
    };
  };
  const objectivesFor = (g) => {
    const o = new Objectives(config, null);
    o.init(g);
    return o.work();
  };
  it('before the barricade falls: the fight, the generator, the gun and the rounds, all on the map', () => {
    const s = objectivesFor(fake());
    expect(s.id).toBe('outpostFight');
    expect(s.ats.length).toBe(4);
    expect(s.text).toMatch(/floodlights/);
    expect(s.text).toMatch(/machine gun/);
  });
  it('done jobs drop off the list', () => {
    const s = objectivesFor(fake({ op: { floodsOn: true, turret: { state: 'live' }, roundsTaken: true } }));
    expect(s.ats.length).toBe(1);
  });
  it('after: explore the compound, every point of interest at once', () => {
    const s = objectivesFor(fake({ flags: ['outpostCleared'], op: { peakState: 'done' } }));
    expect(s.id).toBe('outpostCompound');
    expect(s.ats.length).toBe(7);
  });
  it('once everything is seen to: the checkpoint', () => {
    const op = { peakState: 'done', told: new Set(['beetlesDone', 'resinOpen', 'c7']), searched: new Set(['armoury', 'report', 'manifest']), dogfightSeen: true };
    expect(objectivesFor(fake({ flags: ['outpostCleared'], op })).id).toBe('cross');
  });
});
