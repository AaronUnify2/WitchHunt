// Session 32: Aaron's play-through notes, part 1 (HANDOVER's work list): the small fixes.
import { describe, it, expect } from 'vitest';
import { config, makeMap } from './mapFixture.js';
import { aidBoxOffered, aidBoxClear } from '../src/base/Station.js';
import { stairsPlacement } from '../src/world/StairsSite.js';
import { pathFrame } from '../src/world/clearingFrame.js';
import { HollerTraps } from '../src/combat/hollerTraps.js';
import holler from '../src/data/holler.json';

describe('the first aid box (note 1)', () => {
  it('is quiet only until Tom has stepped away from where he woke, or is hurt', () => {
    expect(aidBoxOffered(false, false)).toBe(false); // woken beside it, full health: no prompt
    expect(aidBoxOffered(false, true)).toBe(true); // been away and come back: it offers, full health or not
    expect(aidBoxOffered(true, false)).toBe(true); // hurt: at once
    expect(aidBoxClear(config.station)).toBeGreaterThan(config.station.interactRange);
  });
});

describe('the stairs face the way in (note 5)', () => {
  it('climb away from the pathway into their clearing, on every seed', () => {
    for (const seed of [1234, 7, 99]) {
      const map = makeMap(seed);
      const church = map.clearings.find((k) => k.key === 'timeCapsule');
      const p = stairsPlacement(map, church);
      const f = pathFrame(map, 'stairs');
      expect(p.yaw, `seed ${seed}`).toBeCloseTo(f.yaw, 6);
      // The foot (behind the middle, along -forward) is nearer the entrance than the top is.
      const fwd = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
      const foot = { x: p.x - fwd.x * 2, z: p.z - fwd.z * 2 };
      const top = { x: p.x + fwd.x * 2, z: p.z + fwd.z * 2 };
      const d = (q) => Math.hypot(q.x - f.entrance.x, q.z - f.entrance.z);
      expect(d(foot)).toBeLessThan(d(top));
    }
  });

  it('still climb away from the church where no pathway reaches them', () => {
    const map = { clearings: [{ key: 'timeCapsule', x: 0, z: 0 }, { key: 'stairs', x: 10, z: 10, radius: 14 }], paths: [] };
    expect(stairsPlacement(map, map.clearings[0]).yaw).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('a bear trap and the quad (note 3)', () => {
  const rig = (riding) => {
    const said = [];
    const hurt = [];
    const player = { position: { x: 0, y: 0, z: -3 }, onGround: true, platform: null, rooted: false, riding: riding ? {} : null };
    const set = new Set();
    const site = { place: { x: 0, z: 0, radius: 30 }, traps: [{ i: 0, id: 'bear1', kind: 'bear', x: 0, z: 0 }], setTrap() {} };
    const t = new HollerTraps(config.holler, { emit() {}, on() {} });
    t.init({ site, player, combat: { alive: true, hurtPlayer: (d) => hurt.push(d), sfx: { play() {} } }, enemies: { living: [], alert() {} }, progress: { has: (f) => set.has(f), setFlag: (f) => set.add(f) }, texts: holler.traps, notify: (x) => said.push(x) });
    t.reset();
    t.update(0.05, true);
    player.position.z = 0; // onto it
    t.update(0.05, true);
    return { t, player, said, hurt };
  };

  it('catches Tom on foot, and holds him until he works free', () => {
    const r = rig(false);
    expect(r.t.held?.id).toBe('bear1');
    expect(r.player.rooted).toBe(true);
    expect(r.hurt.length).toBe(1);
    expect(r.t.options('X', false)[0].prompt).toContain('Hold X');
  });

  it('goes off under the quad and holds nothing', () => {
    const r = rig(true);
    expect(r.t.held).toBe(null);
    expect(r.player.rooted).toBe(false);
    expect(r.hurt.length).toBe(0);
    expect(r.t.list[0].state).toBe('sprung');
    expect(r.said).toContain(holler.traps.bear.wheel);
  });
});

// ---- the crashed plane, reworked (notes 6-10) ---------------------------------------------------------
import { standoffAt } from '../src/encounters/CrashedPlane.js';
import { KIT_STAGES, alienSpec } from '../src/render/alienModel.js';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';
import fs from 'fs';

describe('the crashed plane, reworked (notes 6-10)', () => {
  const ec = config.crashedPlane.encounter;
  const S = ec.standoff;

  it('has an arrival sweep from the edge of the clearing, and the family on the radio after it', () => {
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.crashedPlane');
    expect(sweep.camera.every((k) => k.anchor === 'crashSite')).toBe(true);
    expect(sweep.camera[0].pos[1]).toBeGreaterThan(8); // a high vantage first
    expect(ec.sweepDistance).toBeGreaterThan(ec.triggerDistance + 20); // well before the standoff
    const ids = new Map(dialogue.lines.map((l) => [l.id, l]));
    for (const id of ['plane.sweep.wyatt', 'plane.sweep.ellen']) expect(ids.get(id).channel).toBe('radio');
    expect(progress.flags.map((f) => f.id)).toContain('planeSeen');
  });

  it('takes its time: it vaults out, stands a few seconds in the open, lifts the pistol, fires twice, then hands back', () => {
    expect(standoffAt(0.5, S).phase).toBe('work');
    expect(standoffAt(S.turnAt + 0.1, S).phase).toBe('turn');
    expect(standoffAt(S.hopAt + S.hopSeconds / 2, S).phase).toBe('hop');
    expect(standoffAt(S.hopAt + S.hopSeconds / 2, S).k).toBeCloseTo(0.5, 5);
    expect(standoffAt(S.aimAt - 0.1, S).phase).toBe('stare');
    expect(S.aimAt - (S.hopAt + S.hopSeconds)).toBeGreaterThanOrEqual(2); // seen for a few seconds
    expect(standoffAt(S.aimAt + 0.1, S)).toEqual({ phase: 'aim', shots: 0 });
    expect(standoffAt(S.shots[0] + 0.01, S).shots).toBe(1);
    expect(standoffAt(S.end, S).shots).toBe(2);
    for (const at of S.shots) {
      expect(at).toBeGreaterThan(S.aimAt + 0.5);
      expect(at).toBeLessThan(S.end);
    }
    const cs = cutscenes.cutscenes.find((c) => c.id === 'plane.standoff');
    expect(cs.duration).toBe(S.end);
    expect(cs.skippable).toBe(false);
    expect(ec.quickDraw).toBeGreaterThan(0.3); // the quick draw's window stays (Aaron)
  });

  it('puts the pilot’s pistol in its hand at the plane, not the shotgun', () => {
    expect(KIT_STAGES[0].pistol).toBe(true);
    expect(KIT_STAGES[0].shotgun).toBeFalsy();
    const wood = (kit) => alienSpec(config.aliens.grey, kit).masses.filter((m) => m[8] === 'gunWood').length;
    expect(wood(KIT_STAGES[0])).toBe(1); // a grip
    expect(wood(KIT_STAGES[1])).toBe(2); // the pump and the stock, still, further on
  });

  it('can’t drive the Mothman off, and makes no goal of the power cell at the plane', () => {
    const plane = fs.readFileSync(new URL('../src/encounters/CrashedPlane.js', import.meta.url), 'utf8');
    expect(plane).toContain('unbeatable: true');
    expect(plane).not.toContain("setFlag('radioSmashed')");
    expect(plane).not.toContain('fit it at the fence box');
    // Session 33 (Aaron: Ellen asks for it after the reunion): it's a goal again, but only once Junie's home.
    const goals = fs.readFileSync(new URL('../src/story/Objectives.js', import.meta.url), 'utf8');
    expect(goals).toContain("has('junieHome') && !has('planeCellFitted')");
  });
});

// ---- Junie taken, with no trip home (note 11) ---------------------------------------------------------
import { JunieTaken } from '../src/encounters/JunieTaken.js';

describe('Junie taken, told where he wakes (note 11)', () => {
  const rig = () => {
    const flags = new Set(['planeDone']);
    const played = [];
    const scenes = [];
    const offered = [];
    const handlers = {};
    const bus = { on: (n, f) => (handlers[n] ??= []).push(f), emit: (n, p) => { for (const f of handlers[n] ?? []) f(p ?? {}); } };
    const subtitles = { busy: false, clear() {} };
    const j = new JunieTaken(config, bus);
    j.init({
      scene: { add() {} },
      player: { position: { x: 400, y: 0, z: 400 } }, // at the wreck: nowhere near home
      station: { layout: { centre: { x: 0, z: 0 }, radius: 30, cabin: { furniture: [] } }, floorY: 0, setPresent() {} },
      dialogue: { play: (id, vars, radio) => { played.push([id, radio]); subtitles.busy = true; } },
      subtitles,
      cutscenes: { active: false, namedAnchors: new Map(), play: (id, opts) => { scenes.push(id); opts.onDone(false); return true; } },
      watch: { offer: (o) => offered.push(o.id), cancel() {} },
      progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) },
      comms: { state: 'ok', reachesFamily: true },
      notify() {},
    });
    const tick = (s) => { for (let t = 0; t < s; t += 0.05) j.update(0.05, null, true, false); };
    return { j, flags, played, scenes, offered, subtitles, tick };
  };

  it('the family reach him over the radio two seconds after he wakes, wherever he is', () => {
    const r = rig();
    r.tick(config.junieTaken.accountDelay - 0.3);
    expect(r.played).toEqual([]);
    r.tick(0.5);
    expect(r.played).toEqual([['junie.account.1', true]]);
    expect(r.flags.has('familyAccount')).toBe(true);
  });

  it('then the south path camera’s clip plays by itself, and the goal is Junie', () => {
    const r = rig();
    r.tick(config.junieTaken.accountDelay + 0.2);
    r.tick(3);
    expect(r.scenes).toEqual([]); // not over the account
    r.subtitles.busy = false; // the account's said
    r.tick(config.junieTaken.clipAfter + 0.3);
    expect(r.scenes).toEqual(['clip.junieTaken']);
    expect(r.offered).toEqual([]); // not left on D-pad down
    expect(r.flags.has('junieClipSeen')).toBe(true);
    expect(r.played.at(-1)[0]).toBe('junie.after.1');
  });

  it('never sends him home for it', () => {
    const goals = fs.readFileSync(new URL('../src/story/Objectives.js', import.meta.url), 'utf8');
    expect(goals).not.toContain("Your radio's quiet. Head home.");
  });
});

// ---- the moths that keep the stairs (note 13) -------------------------------------------------------
import { Stairs } from '../src/encounters/Stairs.js';

describe('the moths at the stairs (note 13)', () => {
  const rig = (flags = ['junieTaken', 'stairsSeen']) => {
    const set = new Set(flags);
    const said = [];
    const moths = { living: 0, sent: [], send(n) { this.sent.push(n); this.living = n; return n; } };
    const foot = { x: 0, y: 0, z: 0 };
    const player = { position: { x: 0, y: 0, z: -10 }, camera: { position: { x: 0, y: 1.7, z: -10 } }, riding: null };
    const s = new Stairs(config, { on() {}, emit() {} });
    let climbed = 0;
    s.init({ site: { place: { x: 0, z: 2, yaw: 0 }, spots: { foot, top: { x: 0, y: 3, z: 4 } } }, beyond: {}, player, ground: { heightAt: () => 0 }, progress: { has: (f) => set.has(f), setFlag: (f) => set.add(f) }, notify: (t) => said.push(t), moths, cutscenes: { active: false, namedAnchors: new Map(), play() { return false; } } });
    s.climb = () => { climbed++; };
    const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
    const tick = (sec) => { for (let t = 0; t < sec; t += 0.05) s.update(0.05, input, true, true); };
    return { s, set, said, moths, player, input, tick, climbed: () => climbed };
  };
  const M = config.stairs.encounter.moths;

  it('eight of them come down a moment after he walks in, while Junie’s up there', () => {
    expect(M.count).toBe(8);
    const r = rig();
    r.tick(M.after - 0.3);
    expect(r.moths.sent).toEqual([]);
    r.tick(0.6);
    expect(r.moths.sent).toEqual([8]);
    r.tick(5);
    expect(r.moths.sent.length).toBe(1); // once
  });

  it('keeps him off the stairs until the last one’s down', () => {
    const r = rig();
    r.tick(M.after + 0.2);
    r.player.position.z = -0.5; // at the foot
    r.input.down = true;
    r.tick(3);
    expect(r.climbed()).toBe(0);
    expect(r.s.hud.prompt).toContain('Not with those things');
    r.moths.living = 0;
    r.tick(0.2);
    expect(r.set.has('stairsMoths')).toBe(true);
    r.tick(config.stairs.encounter.climbSeconds + 0.3);
    expect(r.climbed()).toBeGreaterThan(0);
  });

  it('sends none before she’s taken, nor once they’re dealt with', () => {
    const a = rig(['stairsSeen']);
    a.tick(6);
    expect(a.moths.sent).toEqual([]);
    const b = rig(['junieTaken', 'stairsSeen', 'stairsMoths']);
    b.tick(6);
    expect(b.moths.sent).toEqual([]);
  });
});

// ---- old growth (note 14) -------------------------------------------------------------------------
import { buildBole, buildCrown, buildFern, paint, ringStand, ROLES, OLD_GROWTH } from '../src/render/oldGrowth.js';

describe('old growth (note 14)', () => {
  it('builds a giant: a bole with buttress roots and moss, a crown far overhead, a fern, each one geometry', () => {
    const bole = buildBole();
    const crown = buildCrown();
    const fern = buildFern();
    const tris = (g) => g.attributes.position.count / 3;
    expect(tris(bole)).toBeGreaterThan(150);
    expect(tris(bole)).toBeLessThan(600);
    expect(tris(crown)).toBeLessThan(400);
    expect(tris(fern)).toBeLessThan(30);
    bole.computeBoundingBox();
    crown.computeBoundingBox();
    expect(bole.boundingBox.max.y).toBeGreaterThan(OLD_GROWTH.height - 1); // tall
    expect(bole.boundingBox.max.x - bole.boundingBox.min.x).toBeGreaterThan(5); // its roots and limbs reach out
    expect(crown.boundingBox.min.y).toBeGreaterThan(8); // nothing of the crown down where Tom walks
    expect(bole.userData.radius).toBeGreaterThan(1); // too big to reach round
    // Every vertex has a role, and the bole wears bark and moss.
    const roles = new Set(Array.from(bole.attributes.role.array));
    expect(roles.has(ROLES.indexOf('moss'))).toBe(true);
    expect(roles.has(ROLES.indexOf('bark'))).toBe(true);
  });

  it('paints one geometry for two places, in dull colours (the glare rule)', () => {
    const g = buildBole();
    for (const palette of [config.stairs.oldGrowth.colors, config.spikes.placeBeyond.oldGrowth, config.spikes.placeBeyond.story.oldGrowth]) {
      for (const r of ROLES) expect(palette[r], r).toBeGreaterThan(0);
      paint(g, palette);
      const col = g.attributes.color;
      let max = 0;
      for (let i = 0; i < col.count; i++) max = Math.max(max, col.getX(i), col.getY(i), col.getZ(i));
      expect(max).toBeLessThan(0.3);
    }
  });

  it('rings the stairs’ clearing with them, the way in left open', () => {
    const og = config.stairs.oldGrowth;
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const R = config.stairs.radius;
    const toward = 1.1;
    const trees = ringStand(og.count, R + og.ring[0], R + og.ring[1], toward, og.gap, og.apart, rand);
    expect(trees.length).toBeGreaterThanOrEqual(12);
    for (const t of trees) {
      const r = Math.hypot(t.x, t.z);
      expect(r).toBeGreaterThanOrEqual(R + og.ring[0] - 1e-6); // outside the clearing: its floor stays clear
      let d = Math.atan2(t.x, t.z) - toward;
      d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      expect(Math.abs(d)).toBeGreaterThanOrEqual(og.gap);
    }
    for (let i = 0; i < trees.length; i++) for (let j = i + 1; j < trees.length; j++) expect(Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z)).toBeGreaterThanOrEqual(og.apart);
  });

  it('thins the place beyond to giants, with room on its paths', () => {
    const pc = config.spikes.placeBeyond;
    expect(pc.treeSpacing).toBeGreaterThan(5);
    expect(pc.ferns).toBeGreaterThan(50);
  });
});
