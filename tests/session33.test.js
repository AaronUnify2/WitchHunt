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

// ---- Junie on the way home: her shine, and the back of the quad ------------------------------------
import * as THREE from 'three';
import { Stairs, stepOffSpot } from '../src/encounters/Stairs.js';
import { FamilyRenderer } from '../src/render/FamilyRenderer.js';

describe('Junie on the way home', () => {
  const F = config.stairs.encounter.follow;

  // A Stairs with Junie following, a real figure, a quad, and Tom far from home.
  const rig = () => {
    const flags = new Set(['junieTaken', 'stairsSeen', 'stairsMoths', 'junieFound']);
    const said = [];
    const scene = new THREE.Scene();
    const quad = { mesh: new THREE.Group(), x: 50, z: 50, heading: 0 };
    quad.mesh.name = 'quad';
    scene.add(quad.mesh);
    const player = { position: { x: 50, y: 0, z: 53 }, yaw: 0, camera: { position: new THREE.Vector3(50, 1.7, 53) }, riding: null };
    const s = new Stairs(config, { on() {}, emit() {} });
    s.init({ scene, quad, site: { place: { x: 0, z: 2, yaw: 0 }, spots: { foot: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 3, z: 4 } } }, beyond: {}, player, ground: { heightAt: () => 0 }, station: { layout: { centre: { x: 900, z: 900 }, radius: 30 } }, progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) }, notify: (t) => said.push(t), cutscenes: { active: false, namedAnchors: new Map(), play() { return false; } }, rng: () => 0.5 });
    const tick = (sec) => { for (let t = 0; t < sec; t += 0.05) s.update(0.05, null, true, false); };
    return { s, flags, said, scene, quad, player, tick };
  };

  it('her figure is duller out of doors than at home (the glare rule), and the torch counts her', () => {
    expect(F.albedo).toBeLessThan(config.family.albedo * 0.6);
    const r = rig();
    r.tick(0.2);
    expect(r.s.junie.material.color.r).toBeCloseTo(F.albedo);
    const c = r.s.glareCircle;
    expect(c.x).toBeCloseTo(r.s.jx);
    expect(c.top - c.base).toBeCloseTo(config.family.people.junie.height);
  });

  it('has a sitting pose: thighs forward, arms out in front', () => {
    const fr = new FamilyRenderer(config.family, ['junie']);
    fr.init(new THREE.Group(), [{ x: 0, z: 0 }], 0, 0);
    fr.setPose(0, 'sit');
    fr.update(5);
    const p = fr.people[0];
    const rot = (name) => p.list[p.names.indexOf(name)].rotation;
    expect(rot('hipL').x).toBeLessThan(-1);
    expect(rot('kneeL').x).toBeGreaterThan(1);
    expect(rot('shoulderL').x).toBeLessThan(-0.8);
  });

  it('on the quad she sits on the back of it, facing forward, and it is said once', () => {
    const r = rig();
    r.tick(0.2);
    expect(r.s.junie.mesh.parent).toBe(r.scene);
    r.player.riding = r.quad;
    r.tick(0.2);
    const m = r.s.junie.mesh;
    expect(m.parent).toBe(r.quad.mesh);
    expect(m.visible).toBe(true);
    expect(m.position.z).toBeGreaterThan(config.quad.seatBack + 0.45); // behind Tom's eye, clear of his view round
    expect(m.rotation.y).toBeCloseTo(Math.PI);
    expect(r.s.junie.pose).toBe('sit');
    expect(r.s.glareCircle).toBeNull();
    expect(r.said).toEqual(['Junie climbs on behind you and holds on']);
    // off, and on again: not said twice
    r.player.riding = null;
    r.player.position.x = 50 - config.quad.stepOff;
    r.player.position.z = 50;
    r.tick(0.2);
    expect(m.parent).toBe(r.scene);
    expect(r.s.junie.pose).not.toBe('sit');
    r.player.riding = r.quad;
    r.tick(0.2);
    expect(r.said.length).toBe(1);
  });

  it('she gets down on Tom’s side, behind it, without walking through it', () => {
    const quad = { x: 0, z: 0, heading: 0 }; // facing -z; its right is +x
    const left = stepOffSpot(quad, { x: -1.3, z: 0 }, F.seat);
    expect(left.x).toBeCloseTo(-F.seat.off);
    expect(left.z).toBeCloseTo(F.seat.back); // behind: +z
    const right = stepOffSpot(quad, { x: 1.3, z: 0 }, F.seat);
    expect(right.x).toBeCloseTo(F.seat.off);
    expect(Math.hypot(left.x, left.z)).toBeGreaterThan(config.quad.parkedRadius);
    expect(Math.hypot(left.x + 1.3, left.z)).toBeLessThan(F.gap); // within her following gap: she stays put
  });

  it('on any other vehicle she is hidden, as before', () => {
    const r = rig();
    r.tick(0.2);
    r.player.riding = { name: 'ute' };
    r.tick(0.2);
    expect(r.s.junie.mesh.visible).toBe(false);
    expect(r.s.seated).toBe(false);
  });

  it('a respawn or the walk ending while she is seated takes her off the quad', () => {
    const r = rig();
    r.player.riding = r.quad;
    r.tick(0.2);
    r.flags.add('junieHome');
    r.s.reset();
    expect(r.quad.mesh.children.length).toBe(0);
    expect(r.s.junie).toBeNull();
  });
});

// ---- the power cell's beat: the grey's drop made obvious, Ellen's ask, the goal --------------------
import { dropAt, CrashedPlane } from '../src/encounters/CrashedPlane.js';
import { cellAsk } from '../src/encounters/Stairs.js';
import { Objectives } from '../src/story/Objectives.js';
import { laterFlags, PLANE_DONE_FLAGS } from '../src/debug/storyStart.js';
import progress from '../src/data/progress.json';
import fs from 'node:fs';

describe('what the grey dropped', () => {
  const d = config.crashedPlane.encounter.drop;

  it('leaves its hand, arcs out, lands, and glints from then on', () => {
    const start = dropAt(0, d);
    expect(start.k).toBe(0);
    expect(start.lift).toBeCloseTo(d.hand);
    expect(start.glint).toBe(0);
    const mid = dropAt(d.fallSeconds / 2, d);
    expect(mid.lift).toBeGreaterThan(d.hand / 2); // up over the arc
    const landed = dropAt(d.fallSeconds, d);
    expect(landed.k).toBe(1);
    expect(landed.lift).toBeCloseTo(0);
    expect(landed.landed).toBe(true);
    expect(landed.glint).toBeCloseTo(1); // a flash as it lands
    expect(dropAt(d.fallSeconds + d.glintEvery / 2, d).glint).toBeLessThan(0.01);
    expect(dropAt(d.fallSeconds + d.glintEvery, d).glint).toBeCloseTo(1); // and again
  });

  it('is unlit and adds no light (the rule): basic materials only', () => {
    const src = fs.readFileSync(new URL('../src/encounters/CrashedPlane.js', import.meta.url), 'utf8');
    const build = src.slice(src.indexOf('  buildDrop() {'), src.indexOf('  dropRest() {'));
    expect(build).toContain('MeshBasicMaterial');
    expect(build).not.toMatch(/Light\(/);
  });

  // The encounter with fakes round it, the grey at its bench.
  const rig = (flags = ['outpostCleared', 'planeSeen', 'planeStandoff']) => {
    const set = new Set(flags);
    const said = [];
    const lines = [];
    const sounds = [];
    const scene = new THREE.Scene();
    const spots = { work: { x: 0, z: 0 }, bench: { x: 0, z: -1 }, cover: { x: 2, z: -2 }, cockpit: { x: -4, z: -1 }, kit: { x: 5, z: 0 }, log: { x: -4, z: 0 } };
    const player = { position: { x: 0, y: 0, z: 10 }, yaw: 0, camera: { position: { x: 0, y: 1.7, z: 10 } } };
    const combat = { sfx: { play: (n) => sounds.push(n) }, weapons: { extraTargets: [], addAmmo: () => true }, clearHealthFloor() {}, giveWeapon() {}, inventory: { addKits: () => 1 }, hud: { pickup: (t) => said.push(t) } };
    const pl = new CrashedPlane(config, { on() {}, emit() {} });
    pl.init({ scene, crashSite: { place: { x: 0, z: 0, yaw: 0 }, spots }, player, combat, ground: { heightAt: () => 0 }, progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) }, dialogue: { play: (id) => lines.push(id) }, notify: (t) => said.push(t), cutscenes: { active: false, namedAnchors: new Map(), liveTargets: new Map(), play() { return false; } } });
    const tick = (s) => { for (let t = 0; t < s; t += 0.05) pl.update(0.05, null, true, false); };
    return { pl, set, said, lines, sounds, player, tick };
  };

  it('shows the moment the grey goes down, on Tom’s side of the body, and it’s said', () => {
    const r = rig();
    r.pl.state = 'quickdraw';
    r.pl.timer = 0.1;
    r.tick(0.05);
    expect(r.pl.drop.visible).toBe(false);
    r.pl.hitGrey(40, 'body');
    expect(r.set.has('planeGreyDown')).toBe(true);
    expect(r.said.at(-1)).toMatch(/Something fell from its hand, glowing/);
    r.tick(0.1);
    expect(r.pl.drop.visible).toBe(true);
    expect(r.pl.dropSpot.y).toBeGreaterThan(0.5); // still in the air
    r.tick(d.fallSeconds + 0.2);
    expect(r.sounds).toContain('cellDrop');
    expect(r.pl.dropSpot.y).toBeCloseTo(d.restY);
    const g = r.pl.grey;
    expect(Math.hypot(r.pl.dropSpot.x - g.x, r.pl.dropSpot.z - g.z)).toBeCloseTo(d.out);
    // toward Tom: nearer him than the body is
    expect(Math.hypot(r.pl.dropSpot.x - r.player.position.x, r.pl.dropSpot.z - r.player.position.z)).toBeLessThan(Math.hypot(g.x - r.player.position.x, g.z - r.player.position.z));
  });

  it('can be searched from the thing itself, and is gone once it has been', () => {
    const r = rig(['outpostCleared', 'planeSeen', 'planeStandoff', 'planeGreyDown']);
    r.tick(0.2);
    expect(r.pl.drop.visible).toBe(true); // a load: lying there already
    expect(r.pl.dropSpot.y).toBeCloseTo(d.restY);
    r.player.position.x = r.pl.dropSpot.x;
    r.player.position.z = r.pl.dropSpot.z + 1.2;
    const pick = r.pl.pick('X');
    expect(pick.key).toBe('loot');
    expect(pick.prompt).toBe('Hold X: search the creature (it dropped something)');
    pick.act();
    expect(r.set.has('planeCellTaken')).toBe(true);
    r.tick(0.1);
    expect(r.pl.drop.visible).toBe(false);
  });

  it('Wyatt says so straight after either way it goes down, and again if it’s left', () => {
    for (const id of ['plane.quick.wyatt', 'plane.down.wyatt']) expect(lineById.get(id).next).toBe('plane.drop.wyatt');
    expect(lineById.get('plane.drop.wyatt').text).toMatch(/dropped something/);
    expect(lineById.has('hint.planeLoot')).toBe(true);
    expect(config.objectives.hintAfter.planeLoot).toBeLessThan(40);
  });
});

describe('Ellen asks for the power cell after the reunion (#659)', () => {
  it('picks her line by what Tom has done with it', () => {
    expect(cellAsk({ taken: true, fitted: false })).toBe('home.cell.ask');
    expect(cellAsk({ taken: false, fitted: false })).toBe('home.cell.back'); // sent back to the plane for it
    expect(cellAsk({ taken: true, fitted: true })).toBe('home.cell.fitted');
    for (const id of ['home.cell.ask', 'home.cell.wyatt', 'home.cell.back', 'home.cell.fitted', 'hint.planeCell', 'hint.planeCellBack']) {
      expect(lineById.get(id).draft).toBe(true);
      expect(lineById.get(id).cued).toBe(true);
    }
    expect(lineById.get('home.cell.ask').text).toMatch(/fence/);
    expect(lineById.get('home.cell.back').text).toMatch(/Go back for it/);
    expect(progress.flags.map((f) => f.id)).toContain('cellAsked');
  });

  const rig = (flags) => {
    const set = new Set(flags);
    const lines = [];
    const subtitles = { busy: false };
    const s = new Stairs(config, { on() {}, emit() {} });
    s.init({ site: { place: { x: 0, z: 2, yaw: 0 }, spots: { foot: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 3, z: 4 } } }, beyond: {}, player: { position: { x: 300, y: 0, z: 300 }, camera: { position: { x: 300, y: 1.7, z: 300 } }, riding: null }, ground: { heightAt: () => 0 }, progress: { has: (f) => set.has(f), setFlag: (f) => set.add(f) }, dialogue: { play: (id) => lines.push(id) }, subtitles, notify() {}, cutscenes: { active: false, namedAnchors: new Map(), play() { return false; } } });
    const tick = (sec) => { for (let t = 0; t < sec; t += 0.05) s.update(0.05, null, true, false); };
    return { s, set, lines, subtitles, tick };
  };

  it('a few seconds after the homecoming, once, and never over another line', () => {
    const r = rig(['junieTaken', 'junieFound', 'junieHome', 'planeCellTaken']);
    r.tick(config.stairs.encounter.cellAskAfter - 0.4);
    expect(r.lines).toEqual([]);
    r.subtitles.busy = true;
    r.tick(3);
    expect(r.lines).toEqual([]);
    r.subtitles.busy = false;
    r.tick(0.2);
    expect(r.lines).toEqual(['home.cell.ask']);
    expect(r.set.has('cellAsked')).toBe(true);
    r.tick(20);
    expect(r.lines.length).toBe(1);
  });

  it('not before she’s home, and not again after a load', () => {
    const before = rig(['junieTaken', 'planeCellTaken']);
    before.tick(10);
    expect(before.lines).toEqual([]);
    const loaded = rig(['junieTaken', 'junieFound', 'junieHome', 'planeCellTaken', 'cellAsked']);
    loaded.tick(10);
    expect(loaded.lines).toEqual([]);
    const none = rig(['junieTaken', 'junieFound', 'junieHome']);
    none.tick(5);
    expect(none.lines).toEqual(['home.cell.back']);
  });

  // The goal, from a game faked just far enough.
  const goal = (flags) => {
    const set = new Set(flags);
    const o = new Objectives(config, null);
    const grey = { x: 70, z: 80 };
    o.init({
      progress: { has: (f) => set.has(f) },
      clock: { day: 6, phase: 'day' },
      station: { layout: { fenceBox: { x: 1, z: 2 }, cabin: { frontDoor: { x: 3, z: 4 } }, tower: { ladder: { x: 0, z: 0 } } }, state: { segments: [] }, shovelSpot: () => ({ x: 0, z: 0 }) },
      campsite: {}, gasStation: {}, shelter: null, outpost: null,
      world: { map: { clearings: [], cluster: {} } },
      combat: { weapons: { has: () => true }, inventory: { batteries: 0 } },
      plane: { ready: true, grey, spot: () => grey },
      church: { ready: true, spot: () => ({ x: 0, z: 0 }) },
    });
    return o.work();
  };
  const base = ['gasStationVisited', 'crossedCordon', 'planeGreyDown', 'planeLooted', 'planeDone', 'junieTaken', 'familyAccount', 'junieClipSeen', 'churchVisited', 'plaqueRead', 'capsuleDug', 'capsuleOpened', 'capsuleRead', 'stairsKnown', 'junieFound'];

  it('the goal is the fence box once she’s home, not on the walk', () => {
    expect(goal([...base, 'planeCellTaken']).id).toBe('junieHome');
    const g = goal([...base, 'planeCellTaken', 'junieHome']);
    expect(g.id).toBe('planeCell');
    expect(g.at).toEqual({ x: 1, z: 2 });
    expect(goal([...base, 'planeCellTaken', 'junieHome', 'planeCellFitted']).id).toBe('afterJunie');
  });

  it('never searched the grey: back to the plane for it, then the fence box', () => {
    const g = goal([...base.filter((f) => f !== 'planeLooted'), 'junieHome']);
    expect(g.id).toBe('planeCellBack');
    expect(g.at).toEqual({ x: 70, z: 80 });
    expect(g.text).toMatch(/crashed plane/);
  });

  it('at the plane the goal is to search the creature until it’s done', () => {
    const g = goal(['gasStationVisited', 'crossedCordon', 'planeGreyDown']);
    expect(g.id).toBe('planeLoot');
    expect(g.text).toBe('Search the creature. It dropped something.');
  });
});

describe('the later start points (debug)', () => {
  it('each sets every flag of the one before it', () => {
    const order = ['greyDown', 'planeDone', 'junieFound', 'junieHome'];
    for (let i = 1; i < order.length; i++) for (const f of laterFlags(order[i - 1])) expect(laterFlags(order[i])).toContain(f);
    expect(laterFlags('greyDown')).not.toContain('planeLooted');
    for (const f of PLANE_DONE_FLAGS) expect(laterFlags('planeDone')).toContain(f);
    expect(laterFlags('junieFound')).not.toContain('junieHome');
    expect(laterFlags('junieHome')).not.toContain('cellAsked'); // Ellen asks once he's playing
    const known = new Set(progress.flags.map((f) => f.id));
    for (const f of laterFlags('junieHome')) expect(known.has(f)).toBe(true);
  });
});

describe('ridden home on the quad', () => {
  it('through the gate with her on the back: he pulls up, they get down, the homecoming plays', () => {
    const flags = new Set(['junieTaken', 'stairsSeen', 'stairsMoths', 'junieFound']);
    const scene = new THREE.Scene();
    const player = { position: { x: 0, y: 0, z: 5 }, yaw: 0, camera: { position: new THREE.Vector3(0, 1.7, 5) }, riding: null };
    const quad = { mesh: new THREE.Group(), x: 0, z: 5, heading: 0, dismounted: 0, dismount() { this.dismounted++; player.riding = null; player.position.x = -1.3; } };
    scene.add(quad.mesh);
    const played = [];
    const s = new Stairs(config, { on() {}, emit() {} });
    const layout = { centre: { x: 0, z: 0 }, radius: 30, gate: { angle: 0, halfWidth: 0.2 }, cabin: { x: 0, z: 0 } };
    s.init({ scene, quad, site: { place: { x: 500, z: 500, yaw: 0 }, spots: { foot: { x: 500, y: 0, z: 500 }, top: { x: 500, y: 3, z: 504 } } }, beyond: {}, player, ground: { heightAt: () => 0 }, station: { layout, setPresent() {} }, progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) }, notify() {}, cutscenes: { active: false, namedAnchors: new Map(), play: (id, o) => { played.push(id); o.onDone(); return true; } }, rng: () => 0.5 });
    s.insideHome = () => true; // (the fence's zones are the station's own business)
    player.riding = quad;
    s.update(0.05, null, true, false);
    expect(quad.dismounted).toBe(1);
    expect(played).toEqual(['junie.homecoming']);
    expect(flags.has('junieHome')).toBe(true);
    expect(quad.mesh.children.length).toBe(0); // she's off it, and gone indoors
    expect(s.junie).toBeNull();
  });
});
