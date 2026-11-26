// The crashed UFO and the mothership (encounters/Mothership.js). Nov 26: the mothership as a low-gravity tower
// climb (its layout and climbing: tests/mothershipTower.test.js).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { sectionShape } from '../src/world/sectionShape.js';
import { SHIP, SHIP_PLACES, SHIP_FLAGS, LOOT_FLAGS, TOWER, greyStep, noticeStep, runStep, zoneAt } from '../src/encounters/Mothership.js';
import { buildCrashedUfo, buildMothership, sectorGeo } from '../src/render/mothershipModel.js';
import { crashedUfoPlacement } from '../src/world/CrashedUfoSite.js';
import { laterFlags } from '../src/debug/storyStart.js';
import { KIT_STAGES } from '../src/render/alienModel.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';
import pickupCards from '../src/data/pickupCards.json';

const G = config.mothership.greys;

describe('a space of sections (the cave and the armory still use it)', () => {
  const s = sectionShape([{ id: 'a', z0: 0, z1: 10, half: 2, roof: 3 }, { id: 'b', z0: 10, z1: 30, half: 6, roof: 5 }]);
  it('knows its length, its widest, and what section a point is in', () => {
    expect(s.length).toBe(30);
    expect(s.maxHalf).toBe(6);
    expect(s.sectionAt(5).id).toBe('a');
    expect(s.sectionAt(10).id).toBe('b');
  });
});

describe('the ship', () => {
  it('has its greys where they belong: more cowboy the higher, the mechanics in the workshop', () => {
    const order = ['crew', 'plain', 'hat', 'belt', 'gunslinger'];
    const rank = (g) => order.indexOf(KIT_STAGES[g.stage].id);
    const byDeck = ['floor', 'deck1', 'deck2', 'well2', 'lounge', 'top', 'hangar'];
    let last = -1;
    for (const zone of byDeck) {
      const here = SHIP.posts.filter((p) => p.zone === zone);
      expect(here.length).toBeGreaterThan(0);
      const best = Math.max(...here.map(rank));
      expect(best).toBeGreaterThanOrEqual(last);
      last = Math.max(last, best);
    }
    const mech = SHIP.posts.filter((p) => p.role === 'mechanic');
    expect(mech.length).toBe(2);
    for (const m of mech) {
      expect(m.zone).toBe('workshop');
      expect(KIT_STAGES[m.stage].shotgun || KIT_STAGES[m.stage].pistol).toBeFalsy();
    }
    expect(SHIP.posts.filter((p) => p.role !== 'mechanic').length).toBe(16);
  });

  it('builds: the crash site with its beam, the inside with its core, strips and lift', () => {
    const u = buildCrashedUfo(config.crashedUfo.look, {});
    expect(u.spots.beam).toBeTruthy();
    expect(u.group.children.length).toBe(3); // the set, what glows, the beam
    u.dispose();
    const m = buildMothership(config.mothership.look, SHIP);
    expect(m.core.position.x).toBeGreaterThan(SHIP_PLACES.socket.x);
    m.setZoneAlert('floor', true);
    m.setLift(0.15);
    m.setReactor(0.25);
    m.setLooted('well1');
    m.update(0.1, null);
    expect(m.mesh.geometry.getAttribute('position').count).toBeGreaterThan(10000);
    m.dispose();
    expect(crashedUfoPlacement({ clearings: [], paths: [] })).toBeNull();
  });

  it('makes a sector of a ring with its faces facing out', () => {
    const g = sectorGeo(2, 3, 0, Math.PI / 2, 0, 1);
    const n = g.getAttribute('normal');
    const p = g.getAttribute('position');
    let up = 0;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - 1) < 1e-6 && n.getY(i) > 0.99) up++;
    expect(up).toBeGreaterThan(0);
  });
});

describe('a grey aboard', () => {
  const T = { x: 0, y: 0, z: 0 };
  it('notices Tom only in front of it, in sight, for long enough (crouched: nearer)', () => {
    const n = G.notice.worker;
    const g = { x: 0, y: 0, z: 5, facing: Math.PI, suspicion: 0 }; // facing -z: toward Tom
    expect(noticeStep(g, T, 0.1, n, G.touch, false)).toBe(false); // no clear line
    let seen = false;
    for (let t = 0; t < n.react + 0.2 && !seen; t += 0.1) seen = noticeStep(g, T, 0.1, n, G.touch, true);
    expect(seen).toBe(true);
    const back = { x: 0, y: 0, z: 5, facing: 0, suspicion: 0 }; // its back to him
    for (let t = 0; t < 3; t += 0.1) expect(noticeStep(back, T, 0.1, n, G.touch, true)).toBe(false);
    const far = { x: 0, y: 0, z: n.crouched + 1, facing: Math.PI, suspicion: 0 };
    for (let t = 0; t < 3; t += 0.1) expect(noticeStep(far, { ...T, crouched: true }, 0.1, n, G.touch, true)).toBe(false);
    const close = { x: 0, y: 0, z: G.touch - 0.5, facing: 0, suspicion: 0 }; // right behind it: it knows
    let felt = false;
    for (let t = 0; t < 2 && !felt; t += 0.1) felt = noticeStep(close, T, 0.1, n, G.touch, true);
    expect(felt).toBe(true);
    expect(G.notice.lounger.react).toBeGreaterThan(G.notice.worker.react); // the loungers are slow
  });

  it('aims, fires with a clear line, sidesteps across its line to him, aims again', () => {
    const g = { x: 0, y: 0, z: 10, post: { x: 0, y: 0, z: 10 }, state: 'post', t: 0, side: 1, off: 0 };
    greyStep(g, { x: 0, y: 0, z: 10 + G.see + 5 }, 0.1, G, true);
    expect(g.state).toBe('post'); // too far
    const tom = { x: 0, y: 0, z: 0 };
    let shots = 0;
    const seen = new Set();
    for (let t = 0; t < 12; t += 0.05) {
      if (greyStep(g, tom, 0.05, G, true).fired) shots++;
      seen.add(g.state);
    }
    expect(shots).toBeGreaterThanOrEqual(4);
    expect([...seen].sort()).toEqual(['aim', 'fired', 'step']);
    expect(Math.abs(g.ax)).toBeCloseTo(1); // across: Tom's along z
    expect(Math.abs(g.off)).toBeLessThanOrEqual(G.strafe + 0.01);
    // No line: it holds its fire.
    const h = { x: 0, y: 0, z: 10, post: { x: 0, y: 0, z: 10 }, state: 'aim', t: 0.01, side: 1, off: 0 };
    expect(greyStep(h, tom, 0.05, G, false).fired).toBe(false);
    expect(h.state).toBe('post');
  });

  it('a mechanic runs its way to the panel', () => {
    const g = { x: 0, z: 0, leg: 0, facing: 0 };
    const way = [{ x: 2, z: 0 }, { x: 2, z: 3 }];
    let there = false;
    for (let t = 0; t < 5 && !there; t += 0.1) there = runStep(g, way, 0.1, G.mechanic.runSpeed);
    expect(there).toBe(true);
    expect(g.x).toBe(2);
    expect(g.z).toBe(3);
  });

  it('its zones: the mechanics flee inside the workshop and the panel is reachable', () => {
    expect(zoneAt(SHIP_PLACES.panelStand)).toBe('workshop');
    expect(TOWER.floorAt(SHIP_PLACES.panelStand.x, SHIP_PLACES.panelStand.z, SHIP_PLACES.panelStand.y + 0.1)).toBeCloseTo(SHIP_PLACES.panelStand.y, 1);
    for (const way of SHIP_PLACES.fleeFrom) for (const w of way) expect(TOWER.floorAt(w.x, w.z, 36.1)).toBeCloseTo(36, 1);
  });
});

describe('its data', () => {
  it('flags, lines, cards, the core as a cell, start points', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of [...SHIP_FLAGS, ...Object.values(LOOT_FLAGS)]) expect(flags).toContain(f);
    const ids = new Set(dialogue.lines.map((l) => l.id));
    for (const id of ['ship.up.wyatt', 'ship.core.ellen', 'ship.quad.wyatt', 'ship.fitted.ellen', 'ship.fitted.ellen2', 'hint.ufoGo']) expect(ids.has(id)).toBe(true);
    const cards = new Set(pickupCards.items.map((i) => i.id));
    for (const c of SHIP.curios) expect(cards.has(c.id)).toBe(true);
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
