// Nov 24 (Aaron: the camcorder's tape, gone crazy; his picks: fragments of her and one freeze, four campers
// (three on tape and the holder), swiped then raised, about 24 s): clip.camcorder as planned
// (docs/CAMCORDER_PLAN.md).
import { describe, it, expect } from 'vitest';
import cutscenes from '../src/data/cutscenes.json';
import campsite from '../src/data/campsite.json';
import { cutsceneLength, validateCutscenes } from '../src/story/cutsceneTimeline.js';
import { hasPlaceholder } from '../src/audio/Sfx.js';
import { config } from '../src/config.js';

const list = Array.isArray(cutscenes) ? cutscenes : cutscenes.cutscenes;
const tape = list.find((c) => c.id === 'clip.camcorder');
const ev = (pred) => tape.tracks.filter(pred);
const first = (pred) => ev(pred)[0]?.at;
const campers = ['dan', 'jess', 'marcus'];

describe('the camcorder tape (Nov 24)', () => {
  it('is a camcorder clip of about 24 s, rewatchable, valid', () => {
    expect(tape.look).toBe('camcorder');
    expect(tape.rewatch).toBe(true);
    const freeze = ev((e) => e.do === 'freeze').reduce((n, e) => n + e.seconds, 0);
    expect(cutsceneLength(tape) + freeze).toBeGreaterThan(21);
    expect(cutsceneLength(tape) + freeze).toBeLessThan(27);
    const problems = validateCutscenes([tape], { looks: config.postFX?.looks ?? { camcorder: {} }, lineIds: new Set() });
    expect(problems.filter((p) => /unknown event|unknown actor/.test(String(p)))).toEqual([]);
  });

  it('three campers on tape as real people, and the witch', () => {
    for (const id of campers) expect(tape.actors.find((a) => a.id === id)?.look).toMatch(/^camper/);
    for (const a of tape.actors.filter((x) => /^camper/.test(x.look ?? ''))) expect(config.people[a.look], a.look).toBeDefined();
    expect(tape.actors.find((a) => a.id === 'her')?.look).toBe('witch');
  });

  it('she is fragments: hidden at first, fast (smeared), held clear once', () => {
    expect(tape.actors.find((a) => a.id === 'her').hidden).toBe(true);
    expect(first((e) => e.do === 'smear' && e.actor === 'her')).toBeLessThan(6);
    expect(ev((e) => e.do === 'freeze')).toHaveLength(1);
    const dashes = ev((e) => e.do === 'move' && e.actor === 'her' && e.seconds > 0.05);
    expect(dashes.length).toBeGreaterThanOrEqual(4);
    for (const d of dashes.slice(0, 4)) expect(d.seconds).toBeLessThanOrEqual(0.45);
  });

  it('each is put down (a swipe, a spray, a fall) before the freeze; then raised after her summoning', () => {
    const freeze = first((e) => e.do === 'freeze');
    for (const id of ['dan', 'jess']) {
      const down = first((e) => e.do === 'pose' && e.actor === id && e.pose === 'down');
      expect(down, id).toBeLessThan(freeze);
      expect(first((e) => e.do === 'spray' && e.actor === id), id).toBeLessThanOrEqual(down);
      expect(first((e) => e.do === 'pose' && e.actor === 'her' && e.pose === 'swipe' && e.toward === id), id).toBeLessThan(down);
    }
    const summon = first((e) => e.do === 'pose' && e.actor === 'her' && e.pose === 'summon');
    for (const id of campers) expect(first((e) => e.do === 'pose' && e.actor === id && e.pose === 'dead'), id).toBeGreaterThan(summon);
  });

  it("the risen dead are left standing on the fire group's spots (where Tom finds them on Day 1)", () => {
    const spots = campsite.fireGroup.spots;
    for (const id of campers) {
      const a = tape.actors.find((x) => x.id === id);
      const lastMove = ev((e) => e.do === 'move' && e.actor === id).pop();
      const p = lastMove ? [lastMove.to[0], lastMove.to[2]] : [a.pos[0], a.pos[2]];
      const near = Math.min(...spots.map(([x, z]) => Math.hypot(x - p[0], z - p[1])));
      expect(near, id).toBeLessThan(0.2);
    }
  });

  it('the camera is knocked down, lies tilted on its side, then she lifts it to her face; the tape dies', () => {
    const tilted = tape.camera.filter((k) => Math.abs(k.roll ?? 0) >= 20 && k.ground);
    expect(tilted.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...tape.camera.map((k) => k.pos[1]))).toBeGreaterThan(1.4);
    const last = tape.camera[tape.camera.length - 1];
    expect(last.pos[1]).toBeGreaterThan(1.4); // picked up
    expect(first((e) => e.do === 'fade' && e.to === 1)).toBeGreaterThan(20);
  });

  it('every sound plays something before its file (a recipe, a held loop or a stand-in)', () => {
    const names = [...new Set(ev((e) => e.do === 'sfx' && e.sfx).map((e) => e.sfx))];
    for (const n of names) expect(hasPlaceholder(n), n).toBe(true);
  });
});
