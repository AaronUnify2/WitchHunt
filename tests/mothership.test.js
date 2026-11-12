// Build queue item 5: the crashed UFO and the mothership (encounters/Mothership.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { sectionShape } from '../src/world/sectionShape.js';
import { SHIP, SHIP_SECTIONS, SHIP_PLACES, SHIP_FLAGS, greyStep } from '../src/encounters/Mothership.js';
import { buildCrashedUfo, buildMothership } from '../src/render/mothershipModel.js';
import { crashedUfoPlacement } from '../src/world/CrashedUfoSite.js';
import { laterFlags } from '../src/debug/storyStart.js';
import { KIT_STAGES } from '../src/render/alienModel.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';

const G = config.mothership.greys;

describe('a space of sections', () => {
  const s = sectionShape([{ id: 'a', z0: 0, z1: 10, half: 2, roof: 3 }, { id: 'b', z0: 10, z1: 30, half: 6, roof: 5 }]);
  it('knows its length, its widest, and what section a point is in', () => {
    expect(s.length).toBe(30);
    expect(s.maxHalf).toBe(6);
    expect(s.sectionAt(5).id).toBe('a');
    expect(s.sectionAt(10).id).toBe('b');
    expect(s.sectionAt(-3).id).toBe('a');
    expect(s.sectionAt(99).id).toBe('b');
  });
  it('confines to the narrower width at a join, and blocks the narrow section either side', () => {
    expect(Math.abs(s.confine(5, 10.1, 0.5).x)).toBeLessThanOrEqual(2);
    expect(s.confine(5, 20, 0.5).x).toBe(5);
    expect(s.blocks()).toEqual([[-7, -2, -15, -5], [2, 7, -15, -5]]);
  });
});

describe('the ship', () => {
  it('runs pad, corridor, core room, hangar, with its places inside them', () => {
    expect(SHIP_SECTIONS.map((x) => x.id)).toEqual(['pad', 'corridor', 'core', 'hangar']);
    expect(SHIP.sectionAt(SHIP_PLACES.pad.z).id).toBe('pad');
    expect(SHIP.sectionAt(SHIP_PLACES.core.z).id).toBe('core');
    expect(SHIP.sectionAt(SHIP_PLACES.quad.z).id).toBe('hangar');
    for (const [x, z, stage] of G.posts) {
      expect(Math.abs(x)).toBeLessThan(SHIP.halfAt(z));
      expect(stage).toBeLessThan(KIT_STAGES.length);
    }
    // more cowboy the deeper he goes
    const stages = G.posts.map((p) => p[2]);
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
  });

  it('builds: the crash site with its beam, the interior with its core', () => {
    const u = buildCrashedUfo(config.crashedUfo.look, {});
    expect(u.spots.beam).toBeTruthy();
    expect(u.group.children.length).toBe(3); // the set, what glows, the beam
    expect(u.beam.material.type).toBe('MeshBasicMaterial');
    u.dispose();
    const m = buildMothership(config.mothership.look, SHIP, SHIP_PLACES);
    expect(m.core.position.z).toBe(SHIP_PLACES.core.z);
    m.dispose();
    expect(crashedUfoPlacement({ clearings: [], paths: [] })).toBeNull();
  });
});

describe('a grey aboard', () => {
  const fresh = () => ({ x: 0, z: 30, post: { x: 0, z: 30 }, state: 'post', t: 0, side: 1 });
  it('waits at its post until Tom is near, then aims, fires, sidesteps and aims again', () => {
    const g = fresh();
    greyStep(g, { x: 0, z: 0 }, 0.1, G);
    expect(g.state).toBe('post');
    const tom = { x: 0, z: 30 - G.see + 1 };
    greyStep(g, tom, 0.1, G);
    expect(g.state).toBe('aim');
    let shots = 0;
    const seen = new Set();
    for (let t = 0; t < 12; t += 0.05) {
      if (greyStep(g, tom, 0.05, G).fired) shots++;
      seen.add(g.state);
    }
    expect(shots).toBeGreaterThanOrEqual(4);
    expect([...seen].sort()).toEqual(['aim', 'fired', 'step']);
    expect(Math.abs(g.x)).toBeLessThanOrEqual(G.strafe + 0.01);
    expect(Math.abs(g.x)).toBeGreaterThan(0.5); // it moved off its post
  });
});

describe('its data', () => {
  it('flags, lines, the core as a cell, start points', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of SHIP_FLAGS) expect(flags).toContain(f);
    const ids = new Set(dialogue.lines.map((l) => l.id));
    for (const id of ['ship.up.wyatt', 'ship.core.ellen', 'ship.quad.wyatt', 'ship.fitted.ellen', 'ship.fitted.ellen2', 'hint.ufoGo']) expect(ids.has(id)).toBe(true);
    const c = config.station.power.cells.shipCore;
    expect(c.capacity).toBeGreaterThan(config.station.power.cells.planeCell.capacity);
    expect(c.charge).toBe(c.capacity);
    expect(laterFlags('armory')).toContain('shipCoreFitted');
    expect(laterFlags('ufo')).not.toContain('shipEntered');
    for (const f of laterFlags('armory')) expect(flags).toContain(f);
    expect(config.maps.noneIn.mothership).toBeTruthy();
    expect(config.landmarks.built).toContain('crashedUfo');
  });
});
