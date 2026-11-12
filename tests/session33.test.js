// Session 33: Aaron's play-through notes, part 2 (the place beyond to Junie home), and his four answers.
import { describe, it, expect, vi } from 'vitest';
import { config } from '../src/config.js';
import { EventBus } from '../src/core/EventBus.js';
import { noMapIn, MapUi } from '../src/ui/MapUi.js';
import { staticCallPlan, staticCallSeconds } from '../src/audio/staticCall.js';
import { Caller, callerQuiet } from '../src/story/Caller.js';
import dialogue from '../src/data/dialogue.json';
import cutscenes from '../src/data/cutscenes.json';

const lineById = new Map(dialogue.lines.map((l) => [l.id, l]));
const reading = (text) => text.length / config.subtitles.lettersPerSecond + config.subtitles.holdBase + config.subtitles.holdPerWord * text.split(/\s+/).length + config.subtitles.gapSeconds;

describe('the wake-up scene, trimmed (#660)', () => {
  it('the account is four lines and under half a minute', () => {
    let s = 0;
    let n = 0;
    for (let l = lineById.get('junie.account.1'); l; l = lineById.get(l.next)) {
      s += reading(l.text);
      n++;
    }
    expect(n).toBe(4);
    expect(s).toBeLessThan(30);
  });

  it('the clip is about half what it was, and every caption has its reading time', () => {
    const clip = cutscenes.cutscenes.find((c) => c.id === 'clip.junieTaken');
    expect(clip.duration).toBeLessThan(28);
    expect(clip.duration).toBeGreaterThan(20);
    const lines = clip.tracks.filter((e) => e.do === 'line');
    expect(lines.map((e) => e.line)).toEqual(['clip.junie.1', 'clip.junie.3', 'clip.junie.8', 'clip.junie.9', 'clip.junie.10', 'clip.junie.11']);
    for (let i = 0; i < lines.length; i++) {
      const next = lines[i + 1]?.at ?? clip.duration;
      expect(next - lines[i].at).toBeGreaterThanOrEqual(reading(lineById.get(lines[i].line).text) - 0.3);
    }
    // nothing left pointing at a cut line
    for (const l of dialogue.lines) if (l.next) expect(lineById.has(l.next)).toBe(true);
  });
});

describe('no map in the place beyond or the mine', () => {
  it('names the two places, and nowhere else', () => {
    const n = config.maps.noneIn;
    expect(noMapIn(n, 'placeBeyond')).toBeTruthy();
    expect(noMapIn(n, 'mineshaft')).toBeTruthy();
    expect(noMapIn(n, 'stormShelter')).toBeNull();
    expect(noMapIn(n, null)).toBeNull();
  });

  const rig = () => {
    const bus = new EventBus();
    bus.init();
    const ui = new MapUi(config, {}, bus);
    ui.fog = { update: vi.fn(), revealedFraction: 0 };
    ui.minimap = { update: vi.fn(), show: vi.fn(), dark: false };
    ui.screen = { isOpen: false, toggle: vi.fn(function () { this.isOpen = !this.isOpen; }), update: vi.fn() };
    const refused = [];
    bus.on('map:refused', (e) => refused.push(e.text));
    const input = { pressed: new Set(), wasPressed(a) { return this.pressed.has(a); } };
    const player = { position: { x: 5, z: 6 }, yaw: 0 };
    return { ui, refused, input, player };
  };

  it('dark: the minimap is blacked out, the full map refused with the words, and no fog lifts', () => {
    const r = rig();
    r.ui.dark = 'No map of this place';
    r.input.pressed.add('map');
    r.ui.update(0.03, r.input, r.player, [], true);
    expect(r.ui.minimap.dark).toBe(true);
    expect(r.ui.screen.toggle).not.toHaveBeenCalled();
    expect(r.refused).toEqual(['No map of this place']);
    expect(r.ui.fog.update).not.toHaveBeenCalled();
  });

  it('back outside, both work again', () => {
    const r = rig();
    r.ui.dark = null;
    r.input.pressed.add('map');
    r.ui.update(0.03, r.input, r.player, [], true);
    expect(r.ui.minimap.dark).toBe(false);
    expect(r.ui.screen.toggle).toHaveBeenCalledTimes(1);
    expect(r.ui.fog.update).toHaveBeenCalledWith(5, 6);
    expect(r.refused).toEqual([]);
  });
});

describe('a voice of radio static', () => {
  it('is all noise: a click, a bed of hiss, two swells and the squelch tail', () => {
    const plan = staticCallPlan(1.6);
    expect(plan.length).toBe(5);
    for (const b of plan) {
      expect(['bandpass', 'highpass']).toContain(b.type);
      expect(b.wave).toBeUndefined(); // no notes
      expect(b.seconds).toBeGreaterThan(0);
    }
    const [, , first, second] = plan;
    expect(second.delay).toBeGreaterThan(first.delay + first.seconds * 1000 - 1); // two syllables, a gap between
    expect(second.endFreq).toBeLessThan(second.freq); // the second falls away
  });

  it("a child's is thinner than a man's, and a call from the trees is longer", () => {
    const junie = staticCallPlan(config.caller.voices.junie)[2].freq;
    const tom = staticCallPlan(config.caller.voices.tom)[2].freq;
    expect(junie).toBeGreaterThan(tom * 1.4);
    expect(staticCallSeconds(staticCallPlan(1, true))).toBeGreaterThan(staticCallSeconds(staticCallPlan(1, false)));
    expect(staticCallSeconds(staticCallPlan(1, true))).toBeLessThan(2);
  });

  it('both calls use it (no tones left in either recipe)', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync(new URL('../src/audio/Sfx.js', import.meta.url), 'utf8');
    for (const name of ['junieCall', 'callerVoice']) {
      const body = src.slice(src.indexOf(`  ${name}(s, pos) {`), src.indexOf('  },', src.indexOf(`  ${name}(s, pos) {`)));
      expect(body).toContain('staticCall');
      expect(body).not.toContain('s.tone');
    }
  });
});

// A Caller with fakes round it (as tests/caller.test.js).
function makeCaller(flags, at = { x: 0, z: 600 }, stairs = { x: 0, z: 900 }) {
  const bus = new EventBus();
  bus.init();
  const played = [];
  const byId = new Map(dialogue.lines.map((l) => [l.id, l]));
  const d = { lines: dialogue.lines, byId, heard: new Set(['comms.warn.ellen']), play: (id) => { played.push(id); return true; }, show: vi.fn() };
  let n = 0;
  const rng = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const c = new Caller(config, bus);
  const atmosphere = { wrongFog: null };
  c.init({ dialogue: d, subtitles: { busy: false, clear() {} }, comms: { state: 'south', lineZ: 500, northOfLine: () => -100 }, progress: { has: (f) => flags.has(f) }, player: { position: at, yaw: 0 }, clock: { phase: 'night' }, sfx: { play: vi.fn() }, atmosphere, rng, stairsAt: () => stairs });
  const run = (s) => { for (let i = 0; i < 30 * s; i++) c.update(1 / 30, true); };
  return { c, played, run, atmosphere };
}

describe('the Caller is quiet once Junie is found', () => {
  const q = config.caller.quiet;

  it('the rule: the whole walk home, and at the stairs for good', () => {
    const far = { stairs: { x: 0, z: 0 }, px: 500, pz: 0 };
    expect(callerQuiet({ found: false, home: false, ...far }, q)).toBe(false);
    expect(callerQuiet({ found: true, home: false, ...far }, q)).toBe(true); // following: anywhere
    expect(callerQuiet({ found: true, home: true, ...far }, q)).toBe(false); // it keeps its voice after (#475)
    expect(callerQuiet({ found: true, home: true, stairs: { x: 0, z: 0 }, px: q.stairsRadius - 5, pz: 0 }, q)).toBe(true);
    expect(callerQuiet({ found: false, home: false, stairs: { x: 0, z: 0 }, px: 1, pz: 0 }, q)).toBe(false); // before: it calls there
    expect(callerQuiet({ found: true, home: true, stairs: null, px: 0, pz: 0 }, q)).toBe(false);
  });

  it('says nothing for five minutes of the walk home, by night, south of the line', () => {
    const before = makeCaller(new Set(['junieTaken']));
    before.run(300);
    expect(before.played.length).toBeGreaterThan(3);
    const walking = makeCaller(new Set(['junieTaken', 'junieFound']));
    walking.run(300);
    expect(walking.played).toEqual([]);
    expect(walking.c.fromTrees()).toBe(false);
  });

  it('a call under way stops the moment she is found', () => {
    const flags = new Set(['junieTaken']);
    const r = makeCaller(flags);
    expect(r.c.fromTrees()).toBe(true);
    r.run(0.5);
    expect(r.atmosphere.wrongFog).not.toBeNull();
    flags.add('junieFound');
    r.run(0.1);
    expect(r.c.call).toBeNull();
    expect(r.atmosphere.wrongFog).toBeNull();
  });

  it('home again, it calls in the south as before, but never near the stairs', () => {
    const away = makeCaller(new Set(['junieTaken', 'junieFound', 'junieHome']));
    away.run(300);
    expect(away.played.length).toBeGreaterThan(3);
    const at = makeCaller(new Set(['junieTaken', 'junieFound', 'junieHome']), { x: 10, z: 880 });
    at.run(300);
    expect(at.played).toEqual([]);
  });
});
