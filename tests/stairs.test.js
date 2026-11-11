// Session 26, batch 4: the stairs in the woods (render/stairsModel.js, world/StairsSite.js), the place
// beyond in the story (encounters/PlaceBeyond.js), and Junie home (encounters/Stairs.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { buildStairs, FLIGHT } from '../src/render/stairsModel.js';
import { stairsPlacement } from '../src/world/StairsSite.js';
import { followStep } from '../src/encounters/Stairs.js';
import { toWorld } from '../src/world/CrashSite.js';
import { lumaOf } from '../src/render/propKit.js';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';

const sc = config.stairs;

describe('the stairs in the woods: the set', () => {
  const model = buildStairs(sc.look);
  it('one mesh, unlit (lit by nothing), no lights added', () => {
    let meshes = 0;
    let lights = 0;
    model.group.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(1);
    expect(lights).toBe(0);
    expect(model.mesh.material.isMeshBasicMaterial).toBe(true);
    expect(model.mesh.geometry.getAttribute('position').count / 3).toBeLessThan(6000);
  });

  it('clean: its colours are exactly its own (no grime, no moss), and dull', () => {
    const col = model.mesh.geometry.getAttribute('color');
    const own = Object.values(sc.look.colors).map((h) => new THREE.Color(h));
    for (let i = 0; i < col.count; i += 37) {
      const r = col.getX(i);
      const g = col.getY(i);
      const b = col.getZ(i);
      expect(own.some((o) => Math.abs(o.r - r) < 1e-4 && Math.abs(o.g - g) < 1e-4 && Math.abs(o.b - b) < 1e-4)).toBe(true);
    }
    for (const [name, hex] of Object.entries(sc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.32); // unlit: darker than a lit set's
  });

  it('a flight rising to nothing: its foot, its top, solid sides', () => {
    expect(model.spots.top.y).toBeCloseTo(FLIGHT.steps * FLIGHT.rise, 5);
    expect(model.spots.foot.z).toBeLessThan(0);
    expect(model.colliders.filter((c) => c.seg).length).toBe(3);
  });

  it('climbs away from the church, so its foot is what Tom reaches first', () => {
    const map = { clearings: [{ key: 'stairs', x: 100, z: 0 }, { key: 'timeCapsule', x: 0, z: 0 }] };
    const p = stairsPlacement(map, map.clearings[1]);
    const foot = toWorld(p, 0, model.spots.foot.z);
    const top = toWorld(p, 0, model.spots.top.z);
    expect(foot.x).toBeLessThan(top.x);
    expect(config.landmarks.built).toContain('stairs');
  });
});

describe('Junie following Tom home', () => {
  const f = sc.encounter.follow;
  it('walks to a spot just behind him, faster when she has fallen back, and is put beside him past snap', () => {
    const near = followStep(0, 0, f.gap * 0.5, 0, 0.1, f);
    expect(near.moving).toBe(false); // already close enough
    const walk = followStep(0, 0, 5, 0, 0.1, f);
    expect(walk.moving).toBe(true);
    expect(walk.x).toBeCloseTo(f.speed * 0.1, 5);
    const run = followStep(0, 0, f.catchUp + 5, 0, 0.1, f);
    expect(run.x).toBeGreaterThan(walk.x);
    const snap = followStep(0, 0, f.snap + 10, 0, 0.1, f);
    expect(snap.snapped).toBe(true);
    expect(snap.x).toBeCloseTo(f.snap + 10 - f.gap, 5);
    // She never overshoots the gap.
    const s = followStep(0, 0, f.gap + 0.1, 0, 5, f);
    expect(s.x).toBeLessThanOrEqual(0.1 + 1e-9);
  });
});

describe('the place beyond in the story, and the homecoming', () => {
  it('its look: the fog closer and the forest off', () => {
    const pc = config.spikes.placeBeyond;
    expect(pc.storyLight.fogFar).toBeLessThan(pc.light.fogFar);
    expect(pc.story.lean).toBeGreaterThan(0);
  });

  it('Junie\'s voice down the calling paths has the tell; the real Junie\'s lines do not', () => {
    const calls = dialogue.lines.filter((l) => l.callerPool === 'beyond' || l.callerPool === 'beyondLoop');
    expect(calls.length).toBeGreaterThanOrEqual(6);
    for (const l of calls) expect(l.caller).toBe(true);
    const real = dialogue.lines.filter((l) => /^(find|walk|home)\.\d+$/.test(l.id));
    expect(real.length).toBeGreaterThanOrEqual(12);
    for (const l of real) expect(l.caller).toBeFalsy();
  });

  it('its flags and cutscenes', () => {
    const flags = progress.flags.map((x) => x.id);
    for (const id of ['stairsSeen', 'stairsClimbed', 'junieFound', 'junieHome']) expect(flags).toContain(id);
    const by = new Map(cutscenes.cutscenes.map((c) => [c.id, c]));
    for (const id of ['stairs.sight', 'stairs.climb', 'beyond.find', 'junie.homecoming']) expect(by.has(id), id).toBe(true);
    const find = by.get('beyond.find');
    expect(find.actors.find((a) => a.look === 'junie')).toBeTruthy();
    const home = by.get('junie.homecoming');
    expect(home.actors.map((a) => a.look).sort()).toEqual(['ellen', 'junie', 'wyatt']);
    for (const c of [find, home]) for (const e of c.tracks) expect(e.at).toBeLessThanOrEqual(c.duration);
  });
});
