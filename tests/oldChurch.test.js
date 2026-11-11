// Session 26, batch 3: the old church's set (render/oldChurchModel.js, world/OldChurchSite.js)
// and its beat (encounters/OldChurch.js): the plaque, the capsule, the 1903 account.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { buildOldChurch, CHURCH, TAKEN_ROW } from '../src/render/oldChurchModel.js';
import { churchPlacement } from '../src/world/OldChurchSite.js';
import { capsuleLook } from '../src/encounters/OldChurch.js';
import { weatherFor, lumaOf } from '../src/render/propKit.js';
import { drawingSvg, hasDrawing } from '../src/ui/paperDrawings.js';
import { toWorld } from '../src/world/CrashSite.js';
import papers from '../src/data/papers.json';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';
import lore from '../src/data/lore.json';
import encounters from '../src/data/encounters.json';

const oc = config.oldChurch;
const model = buildOldChurch(oc.look, { weather: weatherFor(config.props.weather, oc.look.weather) });

describe("the old church's set", () => {
  it('is one mesh, colours in the vertices, no lights, within budget', () => {
    let meshes = 0;
    let lights = 0;
    model.group.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(1);
    expect(lights).toBe(0);
    const geo = model.mesh.geometry;
    expect(geo.getAttribute('color').count).toBe(geo.getAttribute('position').count);
    expect(geo.getAttribute('position').count / 3).toBeLessThan(24000);
  });

  it('keeps to the glare rule (every colour dull)', () => {
    for (const [name, hex] of Object.entries(oc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });

  it('has its places: the door faces where Tom comes from, the plaque by the path, the capsule in front of it', () => {
    for (const s of ['arrive', 'lychgate', 'door', 'inside', 'plaque', 'capsule', 'taken', 'bell']) expect(model.spots[s], s).toBeTruthy();
    expect(model.spots.door.z).toBeLessThan(CHURCH.front); // the door's on the near side
    expect(model.spots.lychgate.z).toBeLessThan(model.spots.door.z);
    expect(model.spots.inside.z).toBeGreaterThan(CHURCH.front);
    expect(model.spots.inside.z).toBeLessThan(CHURCH.back);
    expect(model.spots.bell.y).toBeGreaterThan(CHURCH.tower.h); // up in the belfry
    const d = Math.hypot(model.spots.capsule.x - model.spots.plaque.x, model.spots.capsule.z - model.spots.plaque.z);
    expect(d).toBeGreaterThan(0.6); // apart, so each has its own prompt
    expect(d).toBeLessThan(2);
    expect(Math.abs(model.spots.taken.z - (TAKEN_ROW.z - 1.3))).toBeLessThan(0.01);
  });

  it('is solid: walls with the door the way in, and the eleven stones in their row', () => {
    const segs = model.colliders.filter((c) => c.seg);
    expect(segs.length).toBeGreaterThanOrEqual(9); // both sides, the back, the front either side of the tower, the tower's walls
    const row = model.colliders.filter((c) => !c.seg && Math.abs(c.z - TAKEN_ROW.z) < 0.01 && c.x <= TAKEN_ROW.x0 + 10 * TAKEN_ROW.step + 0.01);
    expect(row.length).toBe(TAKEN_ROW.count);
    expect(TAKEN_ROW.count).toBe(11);
  });

  it('stands in the graveyard clearing, its door toward the crashed plane', () => {
    const map = { clearings: [{ key: 'timeCapsule', x: 0, z: 100 }, { key: 'crashedPlane', x: 0, z: 0 }] };
    const place = churchPlacement(map, map.clearings[1]);
    const door = toWorld(place, 0, model.spots.door.z);
    expect(door.z).toBeLessThan(100); // the door's on the plane's side
    expect(churchPlacement({ clearings: [] }, null)).toBe(null);
    expect(config.landmarks.built).toContain('timeCapsule'); // its signpost's gone
  });
});

describe('the capsule and the account', () => {
  it('the capsule\'s spot: sunk turf, then the box in its hole, then its lid off', () => {
    expect(capsuleLook(new Set())).toBe('mound');
    expect(capsuleLook(new Set(['capsuleDug']))).toBe('closed');
    expect(capsuleLook(new Set(['capsuleDug', 'capsuleOpened']))).toBe('open');
  });

  it('the plaque, the stones and the 1903 account (with the drawing of the stairs) are written', () => {
    const by = new Map(papers.papers.map((p) => [p.id, p]));
    expect(by.get('churchPlaque').pages[0].text).toMatch(/VOICE IN THE TREES/);
    expect(by.get('churchPlaque').pages[0].text).toMatch(/2003/);
    expect(by.get('graveyardStones').pages[0].text).toMatch(/OCTOBER 13, 1903/);
    const acc = by.get('capsuleAccount');
    expect(acc.pages.length).toBeGreaterThanOrEqual(5);
    const drawn = acc.pages.filter((p) => p.drawing);
    expect(drawn.length).toBe(1);
    expect(hasDrawing(drawn[0].drawing)).toBe(true);
    expect(drawingSvg('stairs')).toMatch(/^<svg/);
    expect(drawingSvg('nothing')).toBe('');
    const all = acc.pages.map((p) => p.text).join(' ');
    for (const w of ['railroad', 'staircase', 'silent', 'Keeper']) expect(all).toContain(w);
    expect(lore.items.find((i) => i.id === 'timeCapsule').paper).toBe('capsuleAccount');
  });

  it('its flags, its sweep, the Caller in the church, and the stairs hidden until it\'s read', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of ['churchVisited', 'plaqueRead', 'capsuleDug', 'capsuleOpened', 'capsuleRead', 'stairsKnown']) expect(flags).toContain(f);
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.oldChurch');
    expect(sweep.style).toBe('sweep');
    expect(sweep.camera.every((k) => k.anchor === 'oldChurch')).toBe(true);
    const church = dialogue.lines.filter((l) => l.id.startsWith('caller.church.'));
    expect(church.length).toBe(2);
    for (const l of church) expect(l.caller).toBe(true);
    expect(dialogue.lines.some((l) => l.when?.all?.includes('lore.timeCapsule'))).toBe(true);
    const stairs = encounters.encounters.find((e) => e.id === 'stairs');
    expect(stairs.revealedBy).toBe('stairsKnown');
  });
});
