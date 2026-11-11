// Session 26, batch 1: Junie is taken (encounters/JunieTaken.js), the radio's
// reach (story/Comms.js), and the dialogue's gating by them.
import { describe, it, expect, vi } from 'vitest';
import { config } from '../src/config.js';
import { accountWay, clipAnchor } from '../src/encounters/JunieTaken.js';
import { commsState, southOfLine, Comms } from '../src/story/Comms.js';
import { localToWorld } from '../src/story/cutsceneTimeline.js';
import { Dialogue } from '../src/story/Dialogue.js';
import { EventBus } from '../src/core/EventBus.js';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';
import storySpine from '../src/data/storySpine.json';

const flagIds = progress.flags.map((f) => f.id);
const lineById = new Map(dialogue.lines.map((l) => [l.id, l]));

describe('the radio\'s reach (story/Comms.js)', () => {
  it('a smashed radio carries nothing until it is mended; the south cuts the family off until the Blessing', () => {
    expect(commsState({})).toBe('ok');
    expect(commsState({ smashed: true })).toBe('dead');
    expect(commsState({ smashed: true, mended: true })).toBe('ok');
    expect(commsState({ south: true })).toBe('south');
    expect(commsState({ south: true, blessed: true })).toBe('ok');
    expect(commsState({ smashed: true, south: true })).toBe('dead'); // dead wins: not even the Caller gets through
  });

  it('the comms line has hysteresis', () => {
    const line = 500;
    const band = 10;
    expect(southOfLine(505, line, band, false)).toBe(false); // over the line, but not past the band yet
    expect(southOfLine(511, line, band, false)).toBe(true);
    expect(southOfLine(495, line, band, true)).toBe(true); // back over, but not out of the band
    expect(southOfLine(489, line, band, true)).toBe(false);
  });

  it('the line sits about halfway from the crashed plane to the old church', () => {
    const spine = Object.fromEntries(storySpine.places.map((p) => [p.key, p]));
    const mid = (spine.crashedPlane.dz + spine.timeCapsule.dz) / 2;
    expect(Math.abs(config.comms.line.dz - mid)).toBeLessThan(30);
    expect(config.comms.line.dz - config.comms.line.band).toBeGreaterThan(spine.crashedPlane.dz + spine.crashedPlane.radius); // the plane's well north of it
    expect(config.comms.line.dz + config.comms.line.band).toBeLessThan(spine.timeCapsule.dz - spine.timeCapsule.radius); // the church well south
  });

  it('Comms follows the flags and Tom, and says so', () => {
    const flags = new Set();
    const bus = new EventBus();
    bus.init();
    const changes = [];
    bus.on('comms:changed', (e) => changes.push(e.state));
    const player = { position: { x: 0, z: 0 } };
    const c = new Comms(config, bus);
    c.init({ progress: { has: (f) => flags.has(f) }, player, homeZ: 0 });
    expect(c.state).toBe('ok');
    flags.add('radioSmashed');
    c.update();
    expect(c.state).toBe('dead');
    expect(c.blocks({ speaker: 'ellen' })).toBe(true);
    expect(c.blocks({ speaker: 'scanner' })).toBe(false);
    flags.add('radioMended');
    player.position.z = config.comms.line.dz + config.comms.line.band + 1;
    c.update();
    expect(c.state).toBe('south');
    expect(c.blocks({ speaker: 'junie' })).toBe(true);
    expect(c.blocks({ speaker: 'junie', caller: true })).toBe(false); // the Caller's own lines come through
    player.position.z = 0;
    c.update();
    expect(c.state).toBe('ok');
    expect(changes).toEqual(['dead', 'south', 'ok']);
  });
});

describe('Junie is taken (encounters/JunieTaken.js)', () => {
  const base = { taken: true, told: false, dead: false, reaches: true, nearHome: false, waited: 10, delay: config.junieTaken.accountDelay };

  it('the account: over the radio a moment into the dawn, or face to face at home with the radio smashed', () => {
    expect(accountWay(base)).toBe('radio');
    expect(accountWay({ ...base, waited: 0 })).toBe(null);
    expect(accountWay({ ...base, reaches: false })).toBe(null); // south of the line: it waits until he's north
    expect(accountWay({ ...base, dead: true })).toBe(null);
    expect(accountWay({ ...base, dead: true, nearHome: true })).toBe('face');
    expect(accountWay({ ...base, told: true })).toBe(null);
    expect(accountWay({ ...base, taken: false })).toBe(null);
  });

  it('the south path camera stands past the fence toward the plane, its ahead away from home', () => {
    const home = { x: 10, z: 20 };
    const a = clipAnchor(home, { x: 10, z: 420 }, 30, 32);
    expect(a.x).toBeCloseTo(10, 5);
    expect(a.z).toBeCloseTo(82, 5);
    const ahead = localToWorld({ ...a, y: 0 }, [0, 0, 10]);
    expect(ahead.z).toBeGreaterThan(a.z + 9); // ahead (+z in its frame) is further south
  });

  it('its flags, lines and clip are all there', () => {
    for (const f of ['junieTaken', 'familyAccount', 'junieClipSeen', 'radioSmashed', 'radioMended', 'junieHome', 'blessingBuried']) expect(flagIds).toContain(f);
    for (const id of ['plane.smashed.ellen', 'junie.home.wyatt', 'junie.account.1', 'junie.spare.wyatt', 'junie.after.1', 'junie.rabbit.wyatt', 'hint.findJunie']) expect(lineById.has(id)).toBe(true);
    // The account's chain runs to Wyatt patching the clip through, and Junie's slot on it is silent.
    const chain = [];
    for (let l = lineById.get('junie.account.1'); l; l = lineById.get(l.next)) chain.push(l);
    expect(chain.length).toBeLessThanOrEqual(12); // Dialogue.show plays up to twelve
    const silent = chain.find((l) => l.speaker === 'junie');
    expect(silent.channel).toBe('caption');
    expect(/[A-Za-z0-9]/.test(silent.text)).toBe(false); // no letters: no blips
    // The family's lines after: never leaving the fence after dark again.
    const faces = dialogue.lines.filter((l) => l.channel === 'face' && l.when?.all?.includes('familyAccount') && !l.cued);
    expect(faces.length).toBeGreaterThanOrEqual(2);
    for (const l of faces) expect(l.when.none ?? ['junieHome']).toContain('junieHome');
    const ids = cutscenes.cutscenes.map((c) => c.id);
    expect(ids).toContain('plane.radioSmashed');
    const smash = cutscenes.cutscenes.find((c) => c.id === 'plane.radioSmashed');
    expect(smash.tracks.some((e) => e.do === 'emit' && e.event === 'radio:smashed')).toBe(true);
  });

  it('the clip: night, torches, Tom\'s voice wrong, and Junie\'s torch going out', () => {
    const clip = cutscenes.cutscenes.find((c) => c.id === 'clip.junieTaken');
    expect(clip.style).toBe('cctv');
    expect(clip.look).toBe('trailcam');
    expect(clip.rewatch).toBe(true);
    expect(clip.hour < 5 || clip.hour > 21).toBe(true);
    const people = clip.actors.filter((a) => a.kind === 'figure').map((a) => a.look);
    expect(people.sort()).toEqual(['ellen', 'junie', 'wyatt']);
    expect(clip.actors.filter((a) => a.kind === 'glow').length).toBe(3); // a torch each
    const hides = clip.tracks.filter((e) => e.do === 'hide').map((e) => e.actor);
    expect(hides.indexOf('tjunie')).toBe(0); // hers goes out first
    const lines = clip.tracks.filter((e) => e.do === 'line').map((e) => lineById.get(e.line));
    for (const l of lines) expect(l).toBeTruthy();
    const wrong = lines.filter((l) => l.speaker === 'tom');
    expect(wrong.length).toBeGreaterThanOrEqual(3);
    for (const l of wrong) expect(l.caller).toBe(true); // the tell, even on the clip
    for (const e of clip.tracks) expect(e.at).toBeLessThanOrEqual(clip.duration);
  });
});

// The Dialogue system with fake subtitles.
function makeDialogue(data, extra = {}) {
  const shown = [];
  const subtitles = {
    show: (e) => {
      shown.push(e);
      e.onStart?.(e);
      return e;
    },
    busy: false,
  };
  const bus = new EventBus();
  bus.init();
  const d = new Dialogue(config, bus, data);
  d.init({ subtitles, clock: { day: 1, phase: 'day' }, withFamily: () => false, stateFlags: () => [], notify: vi.fn() });
  Object.assign(d, extra);
  return { d, shown };
}

describe('the dialogue gated by the radio and by who is there (Session 26)', () => {
  const data = {
    lines: [
      { id: 'call', speaker: 'ellen', channel: 'radio', text: 'come in' },
      { id: 'kid', speaker: 'junie', channel: 'face', text: 'hi dad' },
      { id: 'kidClip', speaker: 'junie', channel: 'caption', text: 'on the tape' },
      { id: 'scan', speaker: 'scanner', channel: 'radio', text: 'quarantine' },
      { id: 'fake', speaker: 'junie', channel: 'radio', caller: true, text: 'daddy' },
    ],
  };

  it('a radio that cannot reach drops the family, never the Caller or the scanner', () => {
    const comms = { blocks: (l) => !l.caller && ['ellen', 'wyatt', 'junie'].includes(l.speaker) };
    const { d, shown } = makeDialogue(data, { comms });
    expect(d.play('call')).toBe(false);
    expect(d.play('scan')).toBe(true);
    expect(d.play('fake')).toBe(true);
    expect(shown.map((e) => e.line.id)).toEqual(['scan', 'fake']);
    expect(shown[1].caller).toBe(true);
  });

  it('Junie, taken, says nothing (but a clip still shows her)', () => {
    const { d, shown } = makeDialogue(data, { absent: (s) => s === 'junie' });
    expect(d.play('kid', {}, false)).toBe(false);
    expect(d.play('kidClip', {}, false)).toBe(true);
    expect(d.play('fake')).toBe(true); // the Caller in her voice
    expect(shown.map((e) => e.line.id)).toEqual(['kidClip', 'fake']);
  });
});
