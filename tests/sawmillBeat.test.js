// Session 28, batch 4: the sawmill's beat (encounters/Sawmill.js, data/sawmill.json).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { EventBus } from '../src/core/EventBus.js';
import { Sawmill, waveDue, fightLook, waveRisers, variantOf, FLAGS } from '../src/encounters/Sawmill.js';
import { buildSawmill } from '../src/render/sawmillModel.js';
import { paletteTable, zombieLook, atlasBlocks } from '../src/render/zombieLook.js';
import data from '../src/data/sawmill.json';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';
import papers from '../src/data/papers.json';
import dialogue from '../src/data/dialogue.json';
import cutscenes from '../src/data/cutscenes.json';

const sc = config.sawmill;
const ec = sc.encounter;
const model = buildSawmill(sc, {});
const risers = model.risers.map((r, i) => ({ ...r, i }));

describe('the dead getting up', () => {
  it('the first wave comes at once; each next one after its wait, or sooner once the last is nearly down; never while one is still getting up', () => {
    const w = ec.waves;
    expect(waveDue(w, 0, 0, 0)).toBe(true);
    expect(waveDue(w, 1, w[1].after - 0.1, 99)).toBe(false);
    expect(waveDue(w, 1, w[1].after, 99)).toBe(true);
    expect(waveDue(w, 1, 3, w[1].left)).toBe(true);
    expect(waveDue(w, 1, 1, w[1].left)).toBe(false);
    expect(waveDue(w, 1, w[1].after + 5, 0, 2)).toBe(false);
    expect(waveDue(w, w.length, 100, 0)).toBe(false);
  });

  it('the five under the tarps first, then the night shift, then the ones in suits: every one of the laid-out dead, once', () => {
    const got = ec.waves.map((w) => waveRisers(risers, w));
    expect(got[0].length).toBe(5);
    expect(got[0].every((i) => risers[i].group === 'tarps')).toBe(true);
    expect(got[1].length).toBe(4);
    expect(got[2].every((i) => risers[i].kind === 'mib')).toBe(true);
    expect(got.flat().sort((a, b) => a - b)).toEqual(risers.map((r) => r.i));
    expect(ec.waves[2].trees.count).toBeGreaterThan(0);
    const total = got.flat().length + ec.waves[2].trees.count;
    expect(total).toBeGreaterThanOrEqual(12);
    expect(total).toBeLessThanOrEqual(24);
  });

  it('loggers get up as loggers and agents as Men in Black', () => {
    expect(variantOf('logger')).toBe('logger');
    expect(variantOf('mib')).toBe('mib');
    expect(config.zombies.variants.logger.health).toBeGreaterThan(1);
  });

  it("a logger wears a citizen's shape in flannel and work trousers", () => {
    const tex = config.zombies.texture;
    const blocks = atlasBlocks(tex);
    const table = paletteTable(tex);
    expect(blocks.some((b) => b.variant === 'logger')).toBe(false); // no new art: the atlas is the same size
    let plaid = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const look = zombieLook('logger', seed * 7919, tex, blocks, table);
      expect(blocks[look.block].variant).toBe('citizen');
      expect(tex.looks.logger.hairs).toContain(blocks[look.block].hair);
      expect(tex.looks.logger.shirt).toContain(table.colours[look.shirt]);
      expect(tex.looks.logger.trousers).toContain(table.colours[look.trousers]);
      expect(look.sleeves).toBe(1);
      plaid += look.pattern === 1 ? 1 : 0;
    }
    expect(plaid).toBeGreaterThan(140);
    // And nothing else's look moved.
    const c = zombieLook('citizen', 4242, tex, blocks, table);
    expect(blocks[c.block].variant).toBe('citizen');
    expect(blocks[zombieLook('mib', 4242, tex, blocks, table).block].variant).toBe('mib');
  });

  it('a fight that was on starts again; a finished one stays finished', () => {
    expect(fightLook(new Set())).toBe('none');
    expect(fightLook(new Set(['sawmillRisen']))).toBe('pending');
    expect(fightLook(new Set(['sawmillRisen', 'sawmillCleared']))).toBe('cleared');
  });
});

describe("the beat's data", () => {
  const flags = new Set(progress.flags.map((f) => f.id));
  it('has a flag for every beat', () => {
    for (const f of FLAGS) expect(flags.has(f), f).toBe(true);
    for (const s of data.searches) expect(FLAGS, s.id).toContain(s.flag);
  });

  it('puts every search at a place in the set, with a hold time', () => {
    for (const s of data.searches) {
      expect(model.spots[s.spot], s.id).toBeTruthy();
      expect(ec.holds[s.hold], s.id).toBeGreaterThan(0);
      expect(s.prompt.length).toBeGreaterThan(3);
    }
    for (const s of ['agent', 'chainsaw', 'headSaw', 'tarps']) expect(model.spots[s], s).toBeTruthy();
  });

  it("has the foreman's day book as a paper and a lore item, ending on its last line", () => {
    const p = papers.papers.find((x) => x.id === 'loggersDiary');
    expect(p.kind).toBe('diary');
    expect(p.pages.length).toBeGreaterThanOrEqual(5);
    expect(p.pages.map((x) => x.text).join(' ')).toContain("Dead men don't get paid.");
    expect(p.pages[0].text).toMatch(/Triple rate/);
    const item = lore.items.find((i) => i.id === 'loggersDiary');
    expect(item.from).toBe('sawmill');
    expect(item.paper).toBe('loggersDiary');
    expect(lore.items.find((i) => i.id === 'headSaw')?.from).toBe('sawmill');
  });

  it('has its sweep, its radio lines and the family on what Tom brings home', () => {
    const cs = cutscenes.cutscenes.find((c) => c.id === 'sweep.sawmill');
    expect(cs.camera.every((k) => k.anchor === 'sawmill')).toBe(true);
    expect(cs.duration).toBeGreaterThan(cs.camera[cs.camera.length - 1].at);
    const ids = new Set(dialogue.lines.map((l) => l.id));
    for (const id of ['sawmill.dispatch.1', 'sawmill.dispatch.2', 'sawmill.ellen.1', 'sawmill.wyatt.1', 'sawmill.ellen.2']) expect(ids.has(id), id).toBe(true);
    expect(config.story?.speakers?.dispatch ?? config.dialogue?.speakers?.dispatch ?? Object.values(config).find((v) => v?.speakers?.dispatch)).toBeTruthy();
  });

  it('gives the SMG enough to matter and not a full pack', () => {
    expect(ec.smgRounds).toBeGreaterThanOrEqual(config.weapons.smg.magSize);
    expect(ec.smgRounds).toBeLessThanOrEqual(config.weapons.smg.magSize * 3);
  });
});

// The encounter in a fake world.
function rig(flagsSet = []) {
  const bus = new EventBus();
  const flags = new Set(flagsSet);
  const shown = {};
  const raised = new Set();
  const spawned = [];
  const notes = [];
  const played = [];
  const site = {
    ready: true,
    place: { x: 0, z: 0, yaw: 0, radius: 26 },
    spots: Object.fromEntries(Object.entries(model.spots).map(([k, s]) => [k, { x: s.x, y: s.y, z: s.z }])),
    risers: risers.map((r) => ({ i: r.i, kind: r.kind, group: r.group, x: r.x, y: r.y, z: r.z })),
    at: (x, z) => ({ x, z }),
    show: (n, on) => (shown[n] = on),
    raise: (i) => raised.add(i),
    layAll: () => raised.clear(),
  };
  const player = { position: { x: 0, z: -60 }, teleport() {}, shake() {} };
  const weapons = { addAmmo: () => false };
  const given = [];
  const combat = { sfx: { play: (n) => played.push(n) }, weapons, inventory: { ammo: {} }, armour: { add: (t, n) => given.push(`armour ${t} ${n}`) }, hud: { pickup() {} }, giveWeapon: (id, n) => given.push(`${id} ${n ?? ''}`.trim()) };
  const enemies = { spawnZombie: (x, z, o) => { const zb = { x, z, alive: true, ...o }; spawned.push(zb); return zb; } };
  const progress = { has: (f) => flags.has(f), setFlag: (f, on = true) => (on ? flags.add(f) : flags.delete(f)) };
  const cutscenesPlayed = [];
  const lines = [];
  const m = new Sawmill(config, bus);
  let k = 0;
  m.init({ site, player, combat, enemies, progress, cutscenes: { active: false, play: (id) => cutscenesPlayed.push(id), namedAnchors: new Map() }, dialogue: { play: (id) => lines.push(id) }, lore: { give: (id) => given.push(`lore ${id}`) }, paper: { open: (id) => given.push(`paper ${id}`) }, card: { show: () => false }, clock: { phase: 'day' }, notify: (t) => notes.push(t), rng: () => ((k = (k * 9301 + 49297) % 233280) / 233280) });
  const input = { activeDevice: 'gamepad', down: false, isDown: () => input.down };
  const step = (seconds, dt = 1 / 20) => { for (let t = 0; t < seconds; t += dt) m.update(dt, input, true, true); };
  const go = (name) => { const s = site.spots[name]; player.position.x = s.x; player.position.z = s.z; };
  const hold = (seconds) => { input.down = true; step(seconds); input.down = false; step(0.2); };
  return { bus, m, flags, shown, raised, spawned, notes, played, player, given, cutscenesPlayed, lines, step, go, hold, site };
}

describe('the sawmill, played', () => {
  it('sweeps once on arrival, and plays the car radio once as Tom comes up to the last agent', () => {
    const r = rig();
    r.step(0.5);
    expect(r.cutscenesPlayed).toEqual([]);
    r.player.position.z = -(ec.sweepDistance - 1);
    r.step(0.5);
    expect(r.cutscenesPlayed).toEqual(['sweep.sawmill']);
    expect(r.flags.has('sawmillVisited')).toBe(true);
    r.go('agent');
    r.step(1.5);
    expect(r.lines).toEqual(['sawmill.dispatch.1']);
    r.step(3);
    expect(r.lines.length).toBe(1);
  });

  it('gives the SMG off the last agent, and the day book off the desk', () => {
    const r = rig(['sawmillVisited', 'sawmillRadio']);
    r.go('agent');
    r.hold(ec.holds.agent + 0.3);
    expect(r.given).toContain(`smg ${ec.smgRounds}`);
    expect(r.shown.smg).toBe(false);
    r.go('desk');
    r.hold(ec.holds.desk + 0.3);
    expect(r.given).toContain('lore loggersDiary');
    expect(r.given).toContain('paper loggersDiary');
    expect(r.flags.has('diaryFound')).toBe(true);
  });

  it("gives the vest and the magazine off the man under the logs (the rounds wait in the pack if there's no gun for them)", () => {
    const r = rig(['sawmillVisited', 'sawmillRadio']);
    r.go('pinned');
    r.hold(ec.holds.pinned + 0.3);
    expect(r.given).toContain(`armour ballistic ${ec.pinned.armour}`);
    expect(r.m.combat.inventory.ammo.pistol).toBe(ec.pinned.pistol);
  });

  it('takes the chainsaw out of the agent, and nothing gets up until it is revved', () => {
    const r = rig(['sawmillVisited', 'sawmillRadio']);
    r.go('chainsaw');
    r.hold(ec.holds.chainsaw + 0.3);
    expect(r.given).toContain('chainsaw');
    expect(r.played).toContain('chainsawPull');
    r.step(4);
    expect(r.spawned.length).toBe(0);
    r.bus.emit('chainsaw:rev');
    expect(r.flags.has('sawmillRisen')).toBe(true);
    expect(r.played).toContain('tarpShift');
  });

  it('a rev a long way from the mill wakes nothing', () => {
    const r = rig(['sawmillVisited', 'chainsawTaken']);
    r.player.position.z = -(ec.revWithin + 20);
    r.bus.emit('chainsaw:rev');
    expect(r.flags.has('sawmillRisen')).toBe(false);
  });

  it('the dead get up where they lay, one after another, in three waves, and it ends when they are all down', () => {
    const r = rig(['sawmillVisited', 'sawmillRadio', 'chainsawTaken']);
    r.player.position.z = -10;
    r.bus.emit('chainsaw:rev');
    r.step(ec.riseAfter + 0.3);
    expect(r.spawned.length).toBe(1); // the first tarp
    expect(r.spawned[0].variant).toBe('logger');
    expect(r.spawned[0].rise).toBe(true);
    r.step(ec.riseGap[1] * 5 + 0.5);
    expect(r.spawned.length).toBe(5);
    expect(r.raised.size).toBe(5);
    const tarp = r.site.risers.find((x) => x.group === 'tarps');
    expect(r.spawned.some((z) => z.x === tarp.x && z.z === tarp.z)).toBe(true);
    // Kill them: the next wave comes early.
    for (const z of r.spawned) z.alive = false;
    r.step(8);
    expect(r.spawned.length).toBe(9);
    for (const z of r.spawned) z.alive = false;
    r.step(14);
    expect(r.spawned.filter((z) => z.variant === 'mib').length).toBe(3 + ec.waves[2].trees.count);
    expect(r.lines).toContain('sawmill.dispatch.2');
    expect(r.raised.size).toBe(r.site.risers.length);
    expect(r.flags.has('sawmillCleared')).toBe(false);
    for (const z of r.spawned) z.alive = false;
    r.step(1);
    expect(r.flags.has('sawmillCleared')).toBe(true);
    expect(r.m.state).toBe('cleared');
  });

  it('hammering the head saw off rings it, gives the part, and wakes them if they are not up yet', () => {
    const r = rig(['sawmillVisited', 'sawmillRadio']);
    r.go('headSaw');
    r.hold(ec.holds.headSaw + 0.3);
    expect(r.played.filter((n) => n === 'sawRing').length).toBeGreaterThanOrEqual(3);
    expect(r.played).toContain('sawOff');
    expect(r.given).toContain('lore headSaw');
    expect(r.shown.headSaw).toBe(false);
    expect(r.flags.has('sawmillRisen')).toBe(true);
  });

  it('dark falling with Tom in the yard wakes them too', () => {
    const r = rig(['sawmillVisited', 'sawmillRadio']);
    r.player.position.z = -5;
    r.m.clock.phase = 'dusk';
    r.step(0.3);
    expect(r.flags.has('sawmillRisen')).toBe(true);
  });

  it('comes back from a save as it was left: a fight unfinished starts again with the dead lying where they fell; a finished one leaves the yard empty', () => {
    const pending = rig(['sawmillVisited', 'sawmillRadio', 'chainsawTaken', 'smgTaken', 'sawmillRisen']);
    expect(pending.shown.chainsaw).toBe(false);
    expect(pending.shown.smg).toBe(false);
    expect(pending.shown.headSaw).toBe(true);
    expect(pending.raised.size).toBe(0);
    pending.player.position.z = -10;
    pending.step(3);
    expect(pending.spawned.length).toBeGreaterThan(0);
    const done = rig(['sawmillVisited', 'sawmillRisen', 'sawmillCleared', 'headSawTaken']);
    expect(done.raised.size).toBe(done.site.risers.length);
    expect(done.shown.headSaw).toBe(false);
    done.player.position.z = -10;
    done.step(5);
    expect(done.spawned.length).toBe(0);
  });
});
