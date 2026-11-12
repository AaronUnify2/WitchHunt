// Build queue item 1: the family's plan and the army's dozer (encounters/CordonDozer.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { CordonDozer, dozerNeeds, lockedPrompt, dozerIsHome, DOZER_FLAGS } from '../src/encounters/CordonDozer.js';
import { dozerCampPlacement, dozerHeading } from '../src/world/DozerCampSite.js';
import { buildDozerCamp, DOZER_CAMP } from '../src/render/dozerCampModel.js';
import { STORY_POINTS, laterFlags } from '../src/debug/storyStart.js';
import { drawingSvg } from '../src/ui/paperDrawings.js';
import dialogue from '../src/data/dialogue.json';
import papers from '../src/data/papers.json';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import shelter from '../src/data/stormShelter.json';

const lineById = new Map(dialogue.lines.map((l) => [l.id, l]));
const E = config.dozerCamp.encounter;

describe('the dozer: what it needs', () => {
  it('keys first, then a battery, then it is ready', () => {
    expect(dozerNeeds({ key: false, battery: false })).toBe('key');
    expect(dozerNeeds({ key: true, battery: false })).toBe('battery');
    expect(dozerNeeds({ key: true, battery: true })).toBeNull();
  });

  it('says what is missing, and offers the fit only with a battery in the pack', () => {
    expect(lockedPrompt('key', 3, 'X').act).toBe(false);
    expect(lockedPrompt('battery', 0, 'X').act).toBe(false);
    expect(lockedPrompt('battery', 0, 'X').prompt).toMatch(/generator/);
    expect(lockedPrompt('battery', 1, 'X')).toEqual({ prompt: 'Hold X: fit a battery to the dozer', act: true });
    expect(lockedPrompt(null, 0, 'X')).toBeNull();
  });

  it('is home inside the fence or pulled up just outside it', () => {
    const L = { centre: { x: 0, z: 0 }, radius: 30 };
    expect(dozerIsHome({ x: 10, z: 0 }, L, E.homeMargin)).toBe(true);
    expect(dozerIsHome({ x: 30 + E.homeMargin - 1, z: 0 }, L, E.homeMargin)).toBe(true);
    expect(dozerIsHome({ x: 30 + E.homeMargin + 5, z: 0 }, L, E.homeMargin)).toBe(false);
  });
});

describe('the camp', () => {
  it('stands in the cordonDozer clearing, the dozer facing up the cut', () => {
    expect(dozerCampPlacement({ clearings: [], paths: [] })).toBeNull();
    const map = { clearings: [{ key: 'cordonDozer', x: 100, z: 200, radius: 20 }], paths: [] };
    const p = dozerCampPlacement(map);
    expect(p.x).toBe(100);
    expect(dozerHeading({ yaw: 0 })).toBeCloseTo(Math.PI);
  });

  it('builds as one mesh and a battery, with its spots and solid pieces, in dull colours', () => {
    const m = buildDozerCamp(config.dozerCamp.look, {});
    expect(m.group.children.length).toBe(2);
    for (const s of ['dozer', 'box', 'battery', 'tent']) expect(m.spots[s]).toBeTruthy();
    expect(m.colliders.length).toBeGreaterThan(8);
    expect(m.stumps).toBeGreaterThan(8);
    expect(m.mesh.geometry.getAttribute('position').count / 3).toBeLessThan(12000);
    // nothing solid where the dozer stands or on the way in
    for (const c of m.colliders.filter((k) => !k.seg)) expect(Math.hypot(c.x - DOZER_CAMP.dozer.x, c.z - DOZER_CAMP.dozer.z)).toBeGreaterThan(c.r + 2.5);
    for (const hex of Object.values(config.dozerCamp.look.colors)) {
      const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
      expect((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255).toBeLessThan(0.5); // the glare rule
    }
    m.dispose();
  });
});

// The encounter with fakes round it.
function rig(flags = ['cellAsked']) {
  const set = new Set(flags);
  const lines = [];
  const said = [];
  const spawned = [];
  const handlers = {};
  const bus = { on: (e, fn) => { handlers[e] = fn; }, emit: (e, p) => handlers[e]?.(p) };
  const dozer = { stored: true, riding: false, locked: false, x: 0, z: 0, heading: 0, place(x, z, h) { this.x = x; this.z = z; this.heading = h; this.stored = false; }, boxDistance(x, z) { return Math.hypot(x - this.x, z - this.z); } };
  const site = { place: { x: 500, z: 500, yaw: 0 }, spots: { dozer: { x: 500, z: 506 }, box: { x: 494, z: 506 }, battery: { x: 507, z: 505 } }, toWorld: (x, z) => ({ x: 500 + x, z: 500 + z }), battery: true, setBattery(b) { this.battery = b; } };
  const player = { position: { x: 0, y: 0, z: 0 }, riding: null };
  const layout = { centre: { x: 0, z: 0 }, radius: 30, cabin: { x: 0, z: 0, halfW: 4, halfD: 4, partZ: 0 } };
  const inv = { batteries: 0, scrap: 0, addBattery(n) { this.batteries += n; }, useBattery() { if (this.batteries <= 0) return false; this.batteries--; return true; }, addScrap(n) { this.scrap += n; } };
  const subtitles = { busy: false };
  const e = new CordonDozer(config, bus);
  e.init({ site, dozer, player, combat: { inventory: inv, hud: { pickup: (t) => said.push(t) } }, station: { layout }, cutscenes: { active: false, namedAnchors: new Map(), play: (id, o) => { lines.push(id); o?.onDone?.(); return true; } }, dialogue: { play: (id) => lines.push(id) }, subtitles, progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) }, paper: { open: (id) => { lines.push(`paper:${id}`); return true; } }, enemies: { spawnZombie: (x, z, o) => spawned.push(o) }, notify: (t) => said.push(t) });
  const input = { activeDevice: 'gamepad', down: false, isDown() { return this.down; } };
  const tick = (s) => { for (let t = 0; t < s; t += 0.05) e.update(0.05, input, true, true); };
  const hold = (s) => { input.down = true; tick(s); input.down = false; };
  return { e, set, lines, said, spawned, bus, dozer, site, player, inv, subtitles, tick, hold, input };
}

describe('the beat, start to end', () => {
  it('the dozer waits at the camp, locked, from the start', () => {
    const r = rig([]);
    expect(r.dozer.stored).toBe(false);
    expect(r.dozer.x).toBe(500);
    expect(r.dozer.locked).toBe(true);
  });

  it('the plan is told indoors, once, after Ellen has asked for the cell', () => {
    const before = rig([]);
    before.tick(5);
    expect(before.lines).toEqual([]);
    const r = rig();
    r.player.position.x = 100; // outside
    r.tick(5);
    expect(r.lines).toEqual([]);
    r.player.position.x = 0;
    r.player.position.z = 1; // the main room
    r.tick(E.planAfter + 0.2);
    expect(r.lines).toEqual(['plan.1']);
    expect(r.set.has('familyPlan')).toBe(true);
    r.tick(5);
    expect(r.lines.length).toBe(1);
  });

  it("Earl's maps: the paper opens, and put down, the family read them out", () => {
    const r = rig(['cellAsked', 'familyPlan']);
    r.bus.emit('stormShelter:maps', { device: 'gamepad' });
    expect(r.set.has('earlMaps')).toBe(true);
    expect(r.lines).toEqual(['paper:earlMaps']);
    r.bus.emit('paper:closed', { id: 'earlMaps' });
    r.bus.emit('paper:closed', { id: 'earlMaps' });
    expect(r.lines).toEqual(['paper:earlMaps', 'plan.maps.1']);
  });

  it('the camp: the sweep, the crew, the keys, the battery, and it is his', () => {
    const r = rig(['cellAsked', 'familyPlan', 'earlMaps']);
    r.player.position.x = 500;
    r.player.position.z = 500 - E.sweepDistance + 2;
    r.tick(0.2);
    expect(r.set.has('dozerSeen')).toBe(true);
    expect(r.lines).toEqual(['sweep.cordonDozer', 'dozer.camp.wyatt']);
    expect(r.spawned.length).toBe(E.crew);
    expect(r.spawned.every((o) => o.variant === 'army' && o.mode === 'linger')).toBe(true);
    r.tick(3);
    expect(r.spawned.length).toBe(E.crew); // once
    // at the dozer with nothing
    r.player.position.x = 500;
    r.player.position.z = 506.2;
    r.tick(0.1);
    expect(r.e.hud.prompt).toMatch(/ignition's empty/);
    // the job box
    r.player.position.x = 494.5;
    r.player.position.z = 506;
    r.tick(0.1);
    expect(r.e.hud.prompt).toBe("Hold X: search the crew's job box");
    r.hold(1.6);
    expect(r.set.has('dozerKey')).toBe(true);
    expect(r.inv.scrap).toBe(E.boxScrap);
    expect(r.dozer.locked).toBe(true);
    // the battery
    r.player.position.x = 507;
    r.player.position.z = 505;
    r.tick(0.2); // (let go of X between holds)
    r.hold(1.2);
    expect(r.inv.batteries).toBe(1);
    expect(r.site.battery).toBe(false);
    r.player.position.x = 500;
    r.player.position.z = 506.2;
    r.tick(0.1);
    expect(r.e.hud.prompt).toBe('Hold X: fit a battery to the dozer');
    r.tick(0.2);
    r.hold(2.4);
    expect(r.set.has('dozerBattery')).toBe(true);
    expect(r.inv.batteries).toBe(0);
    expect(r.dozer.locked).toBe(false);
    r.tick(0.1);
    expect(r.e.hud.prompt).toBe(''); // the dozer's own prompt takes over
    r.bus.emit('dozer:mounted');
    expect(r.set.has('dozerTaken')).toBe(true);
    expect(r.lines.at(-1)).toBe('dozer.taken.wyatt');
  });

  it('climbing on before it is ready takes nothing', () => {
    const r = rig(['cellAsked', 'familyPlan', 'earlMaps']);
    r.bus.emit('dozer:mounted');
    expect(r.set.has('dozerTaken')).toBe(false);
  });

  it('driven home: the flag, and Ellen', () => {
    const r = rig(['cellAsked', 'familyPlan', 'earlMaps', 'dozerSeen', 'dozerKey', 'dozerBattery', 'dozerTaken']);
    r.dozer.place(300, 300, 0);
    r.tick(0.5);
    expect(r.set.has('dozerHome')).toBe(false);
    r.dozer.place(0, 40, 0);
    r.tick(0.2);
    expect(r.set.has('dozerHome')).toBe(true);
    expect(r.lines.at(-1)).toBe('dozer.home.ellen');
  });

  it('a respawn puts a taken dozer back where it was last seen', () => {
    const r = rig(['cellAsked', 'familyPlan', 'earlMaps', 'dozerTaken']);
    r.dozer.place(120, 80, 1);
    r.tick(0.1);
    r.dozer.stored = true; // (the Dozer's own reset hides it)
    r.e.reset();
    expect(r.dozer.stored).toBe(false);
    expect(r.dozer.x).toBe(120);
    expect(r.dozer.locked).toBe(false);
  });
});

describe('its data', () => {
  it('every line, flag, paper and scene is there, and the lines are drafts', () => {
    for (const id of ['plan.1', 'plan.5', 'plan.maps.1', 'plan.maps.4', 'dozer.camp.wyatt', 'dozer.taken.wyatt', 'dozer.home.ellen', 'hint.earlMaps', 'hint.dozerFind']) expect(lineById.get(id)?.draft).toBe(true);
    for (const l of dialogue.lines) if (l.next) expect(lineById.has(l.next)).toBe(true);
    const flags = progress.flags.map((f) => f.id);
    for (const f of DOZER_FLAGS) expect(flags).toContain(f);
    const paper = papers.papers.find((p) => p.id === 'earlMaps');
    expect(paper.pages[0].drawing).toBe('earlMaps');
    expect(drawingSvg('earlMaps')).toContain('<svg');
    expect(cutscenes.cutscenes.find((c) => c.id === 'sweep.cordonDozer').duration).toBeLessThan(10);
    const maps = shelter.searches.find((s) => s.id === 'maps');
    expect(maps.needs).toBe('familyPlan');
    expect(config.landmarks.built).toContain('cordonDozer');
  });

  it('Continue story has a point for every main story beat, each building on the one before', () => {
    const ids = STORY_POINTS.map((s) => s.id);
    expect(ids.slice(0, 10)).toEqual(['plane', 'greyDown', 'planeDone', 'church', 'stairs', 'junieFound', 'junieHome', 'plan', 'dozerCamp', 'dozerHome']);
    const known = new Set(progress.flags.map((f) => f.id));
    for (let i = 0; i < ids.length; i++) {
      const f = laterFlags(ids[i]);
      expect(f.length).toBeGreaterThan(0);
      for (const x of f) expect(known.has(x)).toBe(true);
      if (i > 0) for (const x of laterFlags(ids[i - 1])) expect(f).toContain(x);
    }
    expect(laterFlags('plan')).not.toContain('familyPlan'); // the start of the beat, not its end
    expect(laterFlags('dozerCamp')).not.toContain('dozerSeen');
  });
});
