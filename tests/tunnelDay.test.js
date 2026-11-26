// Nov 25 (Aaron, play-through: "Cut the rest and the time skip"; Day 3: the caved-in tunnel on the road out, then
// at dusk the Pruitts' generator heard from the compound): encounters/Tunnel.js and PruittFarm.updateCall.
import { describe, it, expect } from 'vitest';
import { Tunnel } from '../src/encounters/Tunnel.js';
import { PruittFarm, lateInDay } from '../src/encounters/PruittFarm.js';
import dialogueData from '../src/data/dialogue.json';
import progressData from '../src/data/progress.json';
import { config } from '../src/config.js';

const by = new Map(dialogueData.lines.map((l) => [l.id, l]));
const flagIds = new Set(JSON.stringify(progressData).match(/"id": ?"[a-zA-Z0-9]+"/g).map((m) => m.split('"')[3]));

const rig = () => {
  const flags = new Set(['night2Done']);
  const said = [];
  const events = [];
  const clock = { phase: 'dawn', phaseElapsed: 0, currentPhase: { seconds: 480 } };
  const t = new Tunnel(config, { emit: (e) => events.push(e) });
  t.init({
    world: { map: { roadNorth: { barrier: { x: 100, z: 0 } } } },
    player: { position: { x: 0, z: 0 } },
    progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) },
    dialogue: { play: (id) => said.push(id), pending: [] },
    subtitles: { busy: false },
    cutscenes: { active: false },
    clock,
  });
  return { t, flags, said, events, clock };
};

describe('Day 3: the tunnel (Nov 25)', () => {
  it('Ellen sends Tom to the tunnel a few seconds into the dawn after Night 2', () => {
    const { t, flags, said } = rig();
    t.player.position = { x: -200, z: 0 }; // (home: well down the road from the tunnel)
    t.update(1, true);
    expect(said).toEqual([]);
    for (let i = 0; i < 10; i++) t.update(1, true);
    expect(flags.has('tunnelCall')).toBe(true);
    expect(said).toEqual(['tunnel.call.ellen']);
  });

  it("seeing it caved in says the outpost's overrun and the roads are sealed", () => {
    const { t, flags, said, events } = rig();
    flags.add('tunnelCall');
    t.update(0.1, true);
    expect(flags.has('tunnelSeen')).toBe(false);
    t.player.position = { x: 100 - config.tunnel.seeAt + 1, z: 0 };
    t.update(0.1, true);
    expect(flags.has('tunnelSeen')).toBe(true);
    expect(said).toEqual(['tunnel.seen.wyatt']);
    expect(events).toContain('tunnel:seen');
    expect(by.get('tunnel.seen.wyatt').next).toBe('tunnel.seen.ellen');
    expect(by.get('tunnel.seen.ellen').text).toMatch(/outpost/);
    expect(by.get('tunnel.seen.ellen').text).toMatch(/sealed/);
  });

  // Nov 26 (Aaron: Wyatt's line about the tunnel ran over the Pile's cutscene).
  it('Wyatt and Ellen talk about it far out on the road, once, before he is there', () => {
    const { t, flags, said } = rig();
    flags.add('tunnelCall');
    expect(config.tunnel.talkAt).toBeGreaterThan(config.tunnel.seeAt + 60);
    t.player.position = { x: 100 - config.tunnel.talkAt - 1, z: 0 };
    t.update(0.1, true);
    expect(said).toEqual([]);
    t.player.position = { x: 100 - config.tunnel.talkAt + 1, z: 0 };
    t.update(0.1, true);
    t.update(0.1, true);
    expect(said).toEqual(['tunnel.seen.wyatt']);
    expect(flags.has('tunnelSeen')).toBe(false); // not there yet
  });

  it("the Pile's cutscene waits for them to finish if he gets there first", () => {
    const played = [];
    const { t, flags, said } = rig();
    flags.add('tunnelCall');
    t.pile = { start() {}, stop() {}, beginFight() {}, alive: false };
    t.cutscenes = { active: false, play: (id) => (played.push(id), true) };
    t.player.position = { x: 100 - config.tunnel.seeAt + 1, z: 0 };
    t.subtitles.busy = true; // (still talking)
    t.update(0.1, true);
    expect(said).toEqual(['tunnel.seen.wyatt']);
    expect(played).toEqual([]);
    t.subtitles.busy = false;
    t.update(0.1, true);
    expect(played).toEqual(['pile.emerge']);
    expect(said).toEqual(['tunnel.seen.wyatt']); // not again
  });

  it('has its flags declared', () => {
    for (const f of ['tunnelCall', 'tunnelSeen', 'ramPart', 'quadRam']) expect(flagIds.has(f), f).toBe(true);
  });
});

describe('Day 3: the generator, no sleep and no fade (Nov 25)', () => {
  const farm = (flags, clock) => {
    const f = Object.create(PruittFarm.prototype);
    const said = [];
    Object.assign(f, {
      fc: config.pruittFarm, bus: { emit() {} }, clock,
      progress: { has: (k) => flags.has(k), setFlag: (k) => flags.add(k) },
      dialogue: { play: (id) => said.push(id), pending: [] }, subtitles: { busy: false }, cutscenes: { active: false },
    });
    return { f, said };
  };

  it("is heard late in the day, once the tunnel's been seen", () => {
    const flags = new Set(['night2Done', 'tunnelCall']);
    const clock = { phase: 'day', phaseElapsed: 480 - config.pruittFarm.clock.dayLeft, currentPhase: { seconds: 480 } };
    const { f, said } = farm(flags, clock);
    f.updateCall();
    expect(flags.has('farmCall')).toBe(false); // not before the tunnel
    flags.add('tunnelSeen');
    f.updateCall();
    expect(flags.has('farmCall')).toBe(false); // not with the Pile still up (Nov 25)
    flags.add('tunnelCleared');
    clock.phaseElapsed = 100;
    f.updateCall();
    expect(flags.has('farmCall')).toBe(false); // not in the morning
    clock.phaseElapsed = 480 - config.pruittFarm.clock.dayLeft;
    f.updateCall();
    expect(flags.has('farmCall')).toBe(true);
    expect(said).toEqual(['farm.call.wyatt']);
    expect(by.get('farm.call.wyatt').text).toMatch(/generator/);
    expect(by.get('farm.call.wyatt').next).toBe('farm.call.ellen');
    expect(by.get('farm.call.ellen').text).not.toMatch(/sleep/i);
  });

  it('holds the day short of dusk until Tom has been to the tunnel', () => {
    const flags = new Set(['night2Done', 'tunnelCall']);
    const clock = { phase: 'day', phaseElapsed: 479, currentPhase: { seconds: 480 } };
    const { f } = farm(flags, clock);
    f.heldDay = 0;
    f.updateClock(1);
    expect(clock.phaseElapsed).toBe(480 - config.pruittFarm.clock.holdBeforeDusk);
  });

  it('knows late in the day', () => {
    expect(lateInDay({ phase: 'dawn' }, 70)).toBe(false);
    expect(lateInDay({ phase: 'day', phaseElapsed: 100, currentPhase: { seconds: 480 } }, 70)).toBe(false);
    expect(lateInDay({ phase: 'day', phaseElapsed: 420, currentPhase: { seconds: 480 } }, 70)).toBe(true);
    expect(lateInDay({ phase: 'dusk' }, 70)).toBe(true);
  });
});
