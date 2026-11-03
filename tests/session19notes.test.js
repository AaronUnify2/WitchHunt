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
