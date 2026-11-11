// Session 26, batch 2: the Caller (story/Caller.js) and the fog that moves wrong (render/wrongFog.js).
import { describe, it, expect, vi } from 'vitest';
import { config } from '../src/config.js';
import { nextGap, pickFresh, voicePoint, bearingWords, fogAt, Caller } from '../src/story/Caller.js';
import { puffVelocity } from '../src/render/wrongFog.js';
import { EventBus } from '../src/core/EventBus.js';
import dialogue from '../src/data/dialogue.json';

const kc = config.caller;

describe('the Caller: its pure parts', () => {
  it('calls come more often at night', () => {
    expect(nextGap(kc.every, 'night', 1)).toBeLessThan(nextGap(kc.every, 'day', 0));
    expect(nextGap(kc.every, 'night', 0)).toBe(kc.every.night[0]);
    expect(nextGap(kc.every, 'nonsense', 0)).toBe(kc.every.day[0]);
    expect(kc.positionalShare.night).toBeGreaterThan(kc.positionalShare.day);
  });

  it('it never repeats a recent line while there are others', () => {
    expect(pickFresh(['a', 'b', 'c'], ['a', 'b'], 0.9)).toBe('c');
    expect(pickFresh(['a', 'b'], ['b', 'a'], 0.5)).toBe('b'); // all recent: the oldest
    expect(pickFresh([], [], 0.5)).toBe(null);
  });

  it('a voice from the trees: where it is, and which way in words', () => {
    // Facing north (yaw 0: forward is -z).
    const ahead = voicePoint(0, 0, 0, 0, 30);
    expect(ahead.x).toBeCloseTo(0, 5);
    expect(ahead.z).toBeCloseTo(-30, 5);
    const right = voicePoint(0, 0, 0, Math.PI / 2, 30);
    expect(right.x).toBeCloseTo(30, 5);
    expect(bearingWords(0, 0, 0, ahead.x, ahead.z)).toBe('ahead of you');
    expect(bearingWords(0, 0, 0, right.x, right.z)).toBe('to your right');
    expect(bearingWords(0, 0, 0, -30, 0)).toBe('to your left');
    expect(bearingWords(0, 0, 0, 0, 30)).toBe('behind you');
    expect(bearingWords(0, 0, 0, 20, 20)).toBe('behind you, to your right');
    // Turned round, the same spot is the other way.
    expect(bearingWords(0, 0, Math.PI, 0, 30)).toBe('ahead of you');
  });

  it('the fog: drawn in toward the voice, then rolling out of it, then gone', () => {
    const f = kc.fog;
    expect(fogAt(0, f).inhale).toBe(0);
    expect(fogAt(f.inhale + 0.1, f).inhale).toBe(1);
    expect(fogAt(f.inhale + f.hold + f.exhale * 0.5, f).exhale).toBe(1);
    expect(fogAt(f.inhale + f.hold + f.exhale + f.fade + 0.01, f)).toBe(null);
  });

  it('a puff near Tom drifts toward the voice against the wind; out of the voice toward Tom', () => {
    const wind = { x: 1, z: 0 };
    const base = { x: -30, z: 0, tx: 0, tz: 0, radius: 34, speed: 2.6 };
    const still = puffVelocity(0, 5, wind, 0.2, null);
    expect(still.x).toBeCloseTo(0.2, 5);
    const pulled = puffVelocity(0, 5, wind, 0.2, { ...base, inhale: 1, exhale: 0 });
    expect(pulled.x).toBeLessThan(0); // against the wind, west toward the voice
    const rolled = puffVelocity(-28, 0, wind, 0.2, { ...base, inhale: 0, exhale: 1 });
    expect(rolled.x).toBeGreaterThan(0.5); // east, out of the voice toward Tom
    const far = puffVelocity(100, 100, wind, 0.2, { ...base, inhale: 1, exhale: 0 });
    expect(far.x).toBeCloseTo(0, 5); // too far to be pulled, and the wind's share is gone for those seconds
  });
});

describe('its lines', () => {
  const lines = dialogue.lines.filter((l) => l.caller && l.callerPool);
  it('about 25, Junie\'s most of all, every one with the tell and none ever saved as heard', () => {
    expect(lines.length).toBeGreaterThanOrEqual(24);
    const by = (s) => lines.filter((l) => l.speaker === s).length;
    expect(by('junie')).toBeGreaterThan(by('ellen') + by('wyatt'));
    for (const l of lines) {
      expect(l.caller).toBe(true);
      expect(l.repeatable).toBe(true);
    }
    expect(lines.some((l) => l.callerPool === 'trees')).toBe(true);
    expect(lines.some((l) => l.callerPool === 'radio')).toBe(true);
    for (const id of ['comms.warn.ellen', 'comms.cut.ellen', 'comms.back.ellen', 'comms.back.wyatt']) expect(dialogue.lines.some((l) => l.id === id)).toBe(true);
  });
});

// A Caller with fakes round it.
function makeCaller({ flags = ['junieTaken'], state = 'south', busy = false } = {}) {
  const bus = new EventBus();
  bus.init();
  const played = [];
  const subtitles = { busy, clear: vi.fn() };
  const byId = new Map(dialogue.lines.map((l) => [l.id, l]));
  const d = { lines: dialogue.lines, byId, heard: new Set(), play: (id, vars, radio) => { played.push({ id, vars, radio }); return true; }, show: vi.fn() };
  const comms = { state, lineZ: 500, northOfLine: () => 100 };
  const sfx = { play: vi.fn() };
  const atmosphere = { wrongFog: null };
  let n = 0;
  const rng = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const c = new Caller(config, bus);
  c.init({ dialogue: d, subtitles, comms, progress: { has: (f) => flags.includes(f) }, player: { position: { x: 0, z: 600 }, yaw: 0 }, clock: { phase: 'night' }, sfx, atmosphere, rng });
  return { c, played, subtitles, comms, sfx, atmosphere, d };
}

describe('the Caller at work', () => {
  it('speaks south of the line, at its rate, and never over another line', () => {
    const { c, played, subtitles } = makeCaller();
    for (let i = 0; i < 30 * 5; i++) c.update(1 / 30, true);
    expect(played.length).toBe(0); // not before firstAfter
    for (let i = 0; i < 30 * 30; i++) c.update(1 / 30, true);
    expect(played.length).toBeGreaterThan(0);
    const before = played.length;
    subtitles.busy = true;
    c.endCall();
    c.timer = 0;
    for (let i = 0; i < 30 * 60; i++) c.update(1 / 30, true);
    expect(played.length).toBe(before); // a line up: it waits
  });

  it('never two at once: a call from the trees plays out before the next', () => {
    const { c, played } = makeCaller();
    c.fromTrees();
    c.timer = 0;
    c.update(0.1, true);
    expect(c.call).toBeTruthy();
    expect(played.length).toBe(0); // the fog moves first; the voice a beat later
    for (let i = 0; i < 30 * 3; i++) c.update(1 / 30, true);
    expect(played.length).toBe(1);
    expect(played[0].vars.dir).toMatch(/^From the trees, /);
  });

  it('the fog is pulled while a call from the trees plays, and let go after', () => {
    const { c, atmosphere } = makeCaller();
    c.fromTrees();
    c.update(1, true);
    expect(atmosphere.wrongFog?.inhale).toBeGreaterThan(0);
    for (let i = 0; i < 30 * 20; i++) c.update(1 / 30, false);
    expect(atmosphere.wrongFog).toBe(null);
  });

  it('nothing north of the line, before Junie is taken, or while something is up', () => {
    for (const opts of [{ state: 'ok' }, { flags: [] }]) {
      const { c, played } = makeCaller(opts);
      for (let i = 0; i < 30 * 120; i++) c.update(1 / 30, true);
      expect(played.length).toBe(0);
    }
    const { c, played } = makeCaller();
    for (let i = 0; i < 30 * 120; i++) c.update(1 / 30, false);
    expect(played.length).toBe(0);
  });

  it('crossing the line: the family cut off once; back north, the family back', () => {
    const { c, d, played } = makeCaller({ state: 'ok' });
    c.onComms({ state: 'south', was: 'ok' });
    expect(d.show).toHaveBeenCalledTimes(1);
    expect(d.show.mock.calls[0][0].id).toBe('comms.cut.ellen');
    c.onComms({ state: 'ok', was: 'south' });
    expect(played.map((p) => p.id)).toEqual(['comms.back.ellen']);
  });
});
