// Nov 16 (Aaron): the campground's footage and its dialogue play out on their own. Nov 25 (Aaron: "the campsite is
// quiet until the player watches the found footage, and that's when zombies come"): the horde comes once the tape's
// lines are said, not off the battery.
import { describe, it, expect } from 'vitest';
import { Campsite } from '../src/encounters/Campsite.js';
import dialogueData from '../src/data/dialogue.json';
import cutsceneData from '../src/data/cutscenes.json';
import campsiteData from '../src/data/campsite.json';

const all = (o, out = []) => {
  if (Array.isArray(o)) o.forEach((v) => all(v, out));
  else if (o && typeof o === 'object') {
    if (typeof o.id === 'string') out.push(o);
    Object.values(o).forEach((v) => all(v, out));
  }
  return out;
};
const line = (id) => all(dialogueData).find((l) => l.id === id);
const cutscene = (id) => all(cutsceneData).find((c) => c.id === id);

const site = (day = 1) => {
  const s = Object.create(Campsite.prototype);
  const said = [];
  const emitted = [];
  let waves = 0;
  Object.assign(s, {
    car: { id: 'car' },
    arrived: true,
    batteryTaken: false,
    tapeWatched: false,
    clock: { day },
    bus: { emit: (name) => emitted.push(name) },
    dialogue: { play: (id) => said.push(id) },
    cutscenes: { play: (_id, o) => (o.onDone(), true), current: null, active: false },
    data: campsiteData,
    player: { position: { x: 0, z: 0 } },
    clearing: { x: 0, z: 0, radius: 30 },
    frameAnchor: () => ({}),
    startWave: () => waves++,
  });
  return { s, said, emitted, waves: () => waves };
};

describe('the campground footage and the horde (Nov 16)', () => {
  it('the footage ends on its own lines: that was no animal, then the battery; then the horde, once they stop', () => {
    const { s, said, waves } = site();
    s.playClip();
    expect(said).toEqual(['day1.07']);
    expect(line('day1.07').next).toBe('day1.10');
    expect(waves()).toBe(0);
    s.dialogue.quietFor = 0; // still talking
    s.updateTapeWave();
    expect(waves()).toBe(0);
    s.dialogue.quietFor = 5;
    s.updateTapeWave();
    s.updateTapeWave();
    expect(waves()).toBe(1);
  });

  it('not if the tape was played away from the campground', () => {
    const { s, waves } = site();
    s.player.position = { x: 500, z: 0 };
    s.playClip();
    s.dialogue.quietFor = 5;
    s.updateTapeWave();
    expect(waves()).toBe(0);
  });

  it('has nobody at the fire on Day 1 (Nov 25)', () => {
    expect(campsiteData.fireGroup.off).toBe(true);
    const { s } = site();
    s.enemies = { spawnZombie: () => { throw new Error('spawned'); } };
    s.updateFire({ x: 0, z: 0 }, 0.1);
    expect(s.fire ?? []).toEqual([]);
  });

  it("the horde's cutscene no longer asks for the battery", () => {
    const lines = cutscene('campsite.horde').tracks.filter((t) => t.do === 'line').map((t) => t.line);
    expect(lines).not.toContain('day1.10');
  });

  it("pulling the campers' battery sets nothing off now (Nov 25)", () => {
    const { s, emitted, waves } = site();
    s.onBattery({ id: 'another car' });
    s.onBattery(s.car);
    s.onBattery(s.car);
    expect(emitted).toEqual(['campsite:battery']);
    expect(waves()).toBe(0);
  });

  it('not on a later day', () => {
    const { s, waves } = site(2);
    s.onBattery(s.car);
    expect(s.batteryTaken).toBe(true);
    expect(waves()).toBe(0);
  });

  it('keeping the tape for later sets nothing off', () => {
    const { s, waves } = site();
    s.watch = { offer: () => true };
    s.offerTape();
    expect(waves()).toBe(0);
  });
});
