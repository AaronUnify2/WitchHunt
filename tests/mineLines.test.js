// Session 31, batch 3: the family's lines for the mineshaft (encounters/Mineshaft.js; dialogue.json
// mine.*), and no radio down the mine (story/Comms.js 'deep').
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { buildMineshaft } from '../src/render/mineshaftModel.js';
import { Mineshaft } from '../src/encounters/Mineshaft.js';
import { Comms, commsState } from '../src/story/Comms.js';
import dialogue from '../src/data/dialogue.json';
import lore from '../src/data/lore.json';
import progress from '../src/data/progress.json';
import data from '../src/data/mineshaft.json';

const mc = config.mineshaft;
const lines = new Map(dialogue.lines.map((l) => [l.id, l]));
const RADIO = ['mine.ellen.arrive', 'mine.wyatt.tags', 'mine.wyatt.battery', 'mine.ellen.cage', 'mine.ellen.out', 'mine.wyatt.out'];
const FACE = ['mine.ellen.1', 'mine.wyatt.1', 'mine.ellen.2', 'mine.junie.1'];

// How long a line takes to read (HANDOVER, Session 26): letters at 45 a second, 1.4 s, 0.28 s a word, a 0.25 s gap.
const readingSeconds = (text) => text.length / 45 + 1.4 + text.split(/\s+/).length * 0.28 + 0.25;

describe("the mine's lines", () => {
  it('has a cued radio line for each moment on the surface, and the Caller’s for the south', () => {
    for (const id of RADIO) {
      const l = lines.get(id);
      expect(l, id).toBeTruthy();
      expect(l.cued).toBe(true);
      expect(l.channel).toBe('radio');
      expect(config.comms.family).toContain(l.speaker);
    }
    const c = lines.get('caller.mine.out');
    expect(c.caller).toBe(true);
    expect(c.repeatable).toBe(true); // never saved as heard
  });

  it('has the family’s say at home on what he brings back, each on something real', () => {
    const flags = new Set(progress.flags.map((f) => f.id));
    const items = new Set(lore.items.map((i) => i.id));
    for (const id of FACE) {
      const l = lines.get(id);
      expect(l, id).toBeTruthy();
      expect(l.channel).toBe('face');
      for (const fact of l.when.all) expect(fact.startsWith('lore.') ? items.has(fact.slice(5)) : flags.has(fact), `${id}: ${fact}`).toBe(true);
    }
  });

  it('cuts Ellen off mid-word as the cage drops, and gives her line at the collar time to be read', () => {
    expect(lines.get('mine.ellen.cage').text).toMatch(/[a-z]$/); // no full stop: she's gone
    expect(mc.encounter.outGap).toBeGreaterThanOrEqual(readingSeconds(lines.get('mine.ellen.out').text) - 0.05);
  });
});

describe('no radio down the mine', () => {
  it('is its own state: under a smashed radio, over the south', () => {
    expect(commsState({ deep: true })).toBe('deep');
    expect(commsState({ deep: true, south: true })).toBe('deep');
    expect(commsState({ deep: true, smashed: true })).toBe('dead');
    expect(commsState({ deep: false })).toBe('ok');
  });

  it('blocks the family below, says so, and doesn’t take the tunnels for the south', () => {
    const events = [];
    const comms = new Comms(config, { emit: (n, p) => events.push(p) });
    let below = false;
    const player = { position: { x: 0, y: 0, z: 0 } };
    comms.init({ progress: { has: () => false }, player, homeZ: 0, deep: () => below });
    expect(comms.state).toBe('ok');
    below = true;
    // His dot wanders under the line while he's below: it doesn't count.
    player.position.z = config.comms.line.dz + config.comms.line.band + 50;
    comms.update();
    expect(comms.state).toBe('deep');
    expect(comms.south).toBe(false);
    expect(comms.blocks({ speaker: 'ellen' })).toBe(true);
    expect(comms.reachesFamily).toBe(false);
    below = false;
    player.position.z = 0;
    comms.update();
    expect(comms.state).toBe('ok');
    expect(events.map((e) => e.state)).toEqual(['deep', 'ok']);
  });
});

// ---- the surface beat, with a radio to listen on ---------------------------------------------------

function make({ flags = [], comms = 'ok', batteries = 0 } = {}) {
  const model = buildMineshaft(mc, {});
  const spots = {};
  for (const [k, s] of Object.entries(model.spots)) spots[k] = { x: s.x, y: s.y, z: s.z };
  const shown = {};
  const site = { ready: true, place: { x: 0, z: 0, yaw: 0, radius: 22 }, spots, show: (n, on) => (shown[n] = on) };
  const set = new Set(flags);
  const handlers = {};
  const bus = { on: (n, f) => (handlers[n] ??= []).push(f), emit: (n, p) => { for (const f of handlers[n] ?? []) f(p ?? {}); } };
  const heard = new Set();
  const played = [];
  const state = { comms };
  const dlg = { heard, byId: lines, play(id) { played.push(id); if (!lines.get(id).repeatable) heard.add(id); return true; }, show(line) { played.push(line.id); } };
  const cleared = [];
  const ride = { ready: true, below: false, flags: [], went: 0, descend() { this.went += 1; return true; }, reset() {} };
  const inv = { batteries, useBattery() { if (this.batteries <= 0) return false; this.batteries -= 1; return true; } };
  const player = { position: { x: 0, y: 0, z: -40 } };
  const m = new Mineshaft(config, bus);
  m.init({
    site,
    ride,
    player,
    combat: { sfx: { play() {} }, inventory: inv, hud: { pickup() {} } },
    cutscenes: { active: false, namedAnchors: new Map(), play() {} },
    dialogue: dlg,
    subtitles: { clear: () => cleared.push(played.length) },
    comms: { get state() { return state.comms; } },
    progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) },
    notify() {},
  });
  const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
  const tick = (seconds) => { for (let t = 0; t < seconds; t += 0.05) m.update(0.05, input, true, true); };
  const at = (name) => Object.assign(player.position, { x: spots[name].x, z: spots[name].z });
  const hold = (seconds) => { input.down = true; tick(seconds); input.down = false; tick(0.1); };
  return { m, bus, set, played, heard, cleared, ride, shown, state, input, tick, at, hold };
}

describe('the family on the radio at the mine', () => {
  it('Ellen at the sight of it, once the sweep’s over', () => {
    const t = make({ flags: ['mineVisited'] });
    t.bus.emit('cutscene:ended', { id: 'sweep.mineshaft' });
    t.tick(1);
    expect(t.played).toEqual([]);
    t.tick(0.5);
    expect(t.played).toEqual(['mine.ellen.arrive']);
    t.bus.emit('cutscene:ended', { id: 'sweep.mineshaft' });
    t.tick(2);
    expect(t.played.length).toBe(1); // once
  });

  it('Wyatt at the tag board and at the battery, after the text’s been read', () => {
    const t = make({ flags: ['mineVisited'], batteries: 1 });
    t.at('tags');
    t.hold(mc.encounter.holds.tags + 0.2);
    expect(t.set.has('mineTags')).toBe(true);
    expect(t.played).toEqual([]);
    t.tick(mc.encounter.tagsGap + 0.2);
    expect(t.played).toEqual(['mine.wyatt.tags']);
    t.at('box');
    t.hold(mc.encounter.holds.battery + 0.2);
    t.tick(1 + mc.encounter.tagsGap + 0.2);
    expect(t.played).toEqual(['mine.wyatt.tags', 'mine.wyatt.battery']);
  });

  it('Ellen as the cage drops, the first time only', () => {
    const t = make({ flags: ['mineVisited', 'mineBatteryFitted'] });
    t.at('lever');
    t.hold(mc.encounter.holds.lever + 0.2);
    expect(t.ride.went).toBe(1);
    expect(t.played).toEqual(['mine.ellen.cage']);
    expect(t.cleared).toEqual([0]); // over whatever was being said
    t.hold(mc.encounter.holds.lever + 0.2);
    expect(t.ride.went).toBe(2);
    expect(t.played.length).toBe(1);
  });

  it('Ellen then Wyatt at the collar once it’s sealed; the lamps out; the lever and the box say so', () => {
    const t = make({ flags: ['mineVisited', 'mineBatteryFitted', 'mineSealed'] });
    t.bus.emit('mine:sealed');
    expect(t.shown.cageLamp).toBe(false);
    expect(t.shown.boxLamp).toBe(false);
    expect(t.shown.battery).toBe(true);
    t.tick(2.6);
    expect(t.played).toEqual(['mine.ellen.out']);
    t.tick(mc.encounter.outGap);
    expect(t.played).toEqual(['mine.ellen.out', 'mine.wyatt.out']);
    t.at('lever');
    t.tick(0.1);
    expect(t.m.hud.prompt).toBe(data.out.lever);
    t.hold(2);
    expect(t.ride.went).toBe(0);
    t.at('box');
    t.tick(0.1);
    expect(t.m.hud.prompt).toBe(data.out.box);
  });

  it('says nothing as the cage drops where the radio can’t reach', () => {
    const t = make({ flags: ['mineVisited', 'mineBatteryFitted'], comms: 'south' });
    t.at('lever');
    t.hold(mc.encounter.holds.lever + 0.2);
    expect(t.ride.went).toBe(1);
    expect(t.played).toEqual([]);
  });

  it('south of the comms line it’s the Caller at the collar, not the family', () => {
    const t = make({ flags: ['mineVisited', 'mineBatteryFitted', 'mineSealed'], comms: 'south' });
    t.bus.emit('mine:sealed');
    t.tick(12);
    expect(t.played).toEqual(['caller.mine.out']);
  });
});
