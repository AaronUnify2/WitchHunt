// Session 17, Aaron's first playthrough notes: escaping the witch early on,
// the family's breadcrumbs, one idea at a time over the radio, tapes on D-pad down.
import { describe, it, expect } from 'vitest';
import { WitchEscape } from '../src/story/WitchEscape.js';
import { Objectives } from '../src/story/Objectives.js';
import { StormShelter } from '../src/encounters/StormShelter.js';
import { EventBus } from '../src/core/EventBus.js';
import { config } from './mapFixture.js';
import dialogueData from '../src/data/dialogue.json';

const ids = new Set(dialogueData.lines.map((l) => l.id));

function escapeRig({ crossed = false, outpost = null, quad = null } = {}) {
  const bus = new EventBus();
  const played = [];
  const alerts = [];
  const flags = new Set(crossed ? ['crossedCordon'] : []);
  if (outpost) flags.add('outpostCall');
  const witch = { state: 'roaming', x: 0, z: 0 };
  const player = { position: { x: 10, z: 0 }, riding: false };
  const e = new WitchEscape(config, bus);
  e.init({ witch, player, progress: { has: (f) => flags.has(f) }, dialogue: { play: (id) => played.push(id) }, alert: { show: (t) => alerts.push(t) }, quad, outpost });
  return { e, witch, player, played, alerts, flags };
}

describe('escaping the witch early in the run (Aaron)', () => {
  it('says so on screen and over the radio while she attacks, and that she has gone once she gives up', () => {
    const r = escapeRig({ quad: { x: 30, z: 0 } });
    r.e.update(0.1, true);
    expect(r.e.engaged).toBe(false);
    r.witch.state = 'attacking';
    r.e.update(0.1, true);
    expect(r.e.engaged).toBe(true);
    expect(r.alerts).toContain('ESCAPE THE WITCH');
    expect(r.played).toEqual(['witch.escape', 'witch.escape.quad']);
    r.witch.state = 'roaming';
    r.e.update(config.witchEscape.goneAfter + 0.5, true);
    expect(r.e.engaged).toBe(false);
    expect(r.played).toContain('witch.gone');
  });

  it("at the outpost: get away from the checkpoint and come back once she's gone", () => {
    const r = escapeRig({ outpost: { frame: { x: 20, z: 0 } } });
    r.witch.state = 'attacking';
    r.e.update(0.1, true);
    expect(r.played[0]).toBe('witch.escape.outpost');
    r.witch.state = 'roaming';
    r.e.update(10, true);
    expect(r.played).toContain('witch.gone.outpost');
  });

  it("doesn't call it far off, nor once the cordon's crossed, and doesn't repeat the call straight away", () => {
    const far = escapeRig();
    far.witch.state = 'attacking';
    far.player.position.x = 400;
    far.e.update(0.1, true);
    expect(far.e.engaged).toBe(false);
    const late = escapeRig({ crossed: true });
    late.witch.state = 'attacking';
    late.e.update(0.1, true);
    expect(late.e.engaged).toBe(false);
    const r = escapeRig();
    r.witch.state = 'attacking';
    r.e.update(0.1, true);
    r.witch.state = 'roaming';
    r.e.update(10, true);
    r.witch.state = 'attacking';
    r.e.update(0.1, true);
    expect(r.played.filter((x) => x === 'witch.escape')).toHaveLength(1);
    for (const id of ['witch.escape', 'witch.escape.outpost', 'witch.escape.quad', 'witch.gone', 'witch.gone.outpost']) expect(ids.has(id)).toBe(true);
  });
});

describe("the family's breadcrumbs (Aaron)", () => {
  it('nudge once after a while stuck on a step, not while the world is held', () => {
    const played = [];
    const heard = new Set();
    const o = new Objectives(config, null);
    const step = { id: 'note', text: 'Read it', at: null };
    o.init({ dialogue: { byId: new Map([['hint.note', {}]]), heard, play: (id) => (played.push(id), heard.add(id)) }, subtitles: { busy: false }, progress: {} });
    o.work = () => step;
    for (let t = 0; t < 30; t += 0.5) o.update(0.5, false);
    expect(played).toEqual([]);
    for (let t = 0; t < config.objectives.hintAfter.note + 1; t += 0.5) o.update(0.5, true);
    expect(played).toEqual(['hint.note']);
    for (let t = 0; t < 200; t += 0.5) o.update(0.5, true);
    expect(played).toEqual(['hint.note']);
  });

  it('has a hint for the steps that matter most (the note above all)', () => {
    for (const id of ['note', 'scanner', 'phone', 'keys', 'hatch', 'safe', 'tapes', 'outpost', 'outpostTower', 'outpostArmoury', 'outpostReport', 'cross']) expect(ids.has(`hint.${id}`)).toBe(true);
  });
});

describe('one idea at a time over the radio (Aaron)', () => {
  it("splits the gas station witch's line from the phone, and points the scanner to the stockroom", () => {
    const by = Object.fromEntries(dialogueData.lines.map((l) => [l.id, l.text]));
    expect(by['gas.witch.ellen']).not.toMatch(/phone/i);
    expect(by['gas.phone.hint']).toMatch(/phone/i);
    expect(by['gas.phone.radio']).toMatch(/stockroom/i);
    expect(by['gas.quad']).toMatch(/quad/i);
  });
});

describe('tapes on D-pad down (Aaron: the pattern for the whole game)', () => {
  it("offers Earl's tapes the moment they're taken, and doesn't play them on hand-in", () => {
    const bus = new EventBus();
    const offers = [];
    const s = new StormShelter(config, bus);
    s.watch = { offer: (o) => (offers.push(o), true), cancel() {} };
    s.lore = { give() {} };
    s.dialogue = { play() {} };
    s.props = null;
    s.searched = new Set();
    s.tapesWatched = false;
    s.bus = bus;
    s.search({ id: 'tapes' });
    expect(offers.map((o) => o.id)).toEqual(['pruittTapes']);
    let played = null;
    s.cutscenes = { play: (id) => (played = id) };
    offers[0].play();
    expect(played).toBe('clip.pruittTape');
    expect(s.tapesWatched).toBe(true);
    // Handing them in doesn't play them (they go on the monitors: Lore.handIn).
    played = null;
    bus.emit('lore:handedIn', { id: 'pruittTapes' });
    expect(played).toBe(null);
  });
});

// ---- Aaron's second round of notes ----
import { Lore } from '../src/story/Lore.js';
import { Cutscenes } from '../src/story/Cutscenes.js';
import loreData from '../src/data/lore.json';
import papersData from '../src/data/papers.json';
import cutsceneData from '../src/data/cutscenes.json';

describe('no dialogue in a cutscene (Aaron)', () => {
  it("speaks only in a black one or an ending: the rest say their lines after they're over", () => {
    const speaks = (c) => Cutscenes.prototype.speaksDuring.call(null, c);
    for (const c of cutsceneData.cutscenes) {
      const lines = (c.tracks ?? []).some((t) => t.do === 'line');
      if (lines && speaks(c)) expect(c.style === 'black' || c.id.startsWith('ending.')).toBe(true);
    }
    expect(speaks({ style: 'cctv' })).toBe(false);
    expect(speaks({ style: 'black' })).toBe(true);
  });
});

describe('everything picked up goes to the ledger (Aaron)', () => {
  it("has Earl's note, his diary, the field report and the manifest as papers to read again", () => {
    const papers = new Set(papersData.papers.map((p) => p.id));
    const by = Object.fromEntries(loreData.items.map((i) => [i.id, i]));
    for (const [id, paper] of [['earlNote', 'earlNote'], ['pruittDiary', 'earlDiary'], ['fieldReport', 'fieldReport'], ['outpostManifest', 'outpostManifest']]) {
      expect(by[id].paper).toBe(paper);
      expect(papers.has(paper)).toBe(true);
    }
  });

  it('lists a paper handed in on the ledger, to read again in close-up', () => {
    const bus = new EventBus();
    const opened = [];
    const lore = new Lore(config, bus);
    lore.init({ dialogue: { milestone() {} }, cutscenes: { byId: new Map() }, ledger: { close() {} }, notify() {} });
    lore.paper = { open: (id) => opened.push(id) };
    lore.give('earlNote');
    lore.handIn('earlNote');
    const row = lore.ledgerPage().rows.find((r) => r.label.includes("Read: Earl Pruitt's note"));
    expect(row).toBeTruthy();
    row.action();
    expect(opened).toEqual(['earlNote']);
  });
});
