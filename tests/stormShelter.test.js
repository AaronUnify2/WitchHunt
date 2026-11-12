// Session 16 (M9.3): the Pruitts' storm shelter: the hatch, the horde,
// the sigil beside it, the room below (under the ground, its things in it).
import { describe, it, expect } from 'vitest';
import { StormShelter } from '../src/encounters/StormShelter.js';
import { keepInRoom } from '../src/player/Player.js';
import { frameToWorld } from '../src/world/clearingFrame.js';
import shelter from '../src/data/stormShelter.json';
import progressData from '../src/data/progress.json';
import dialogueData from '../src/data/dialogue.json';
import cutsceneData from '../src/data/cutscenes.json';
import loreData from '../src/data/lore.json';
import { makeMap, makeGround, config } from './mapFixture.js';

describe('the storm shelter', () => {
  const map = makeMap(1234);
  const ground = makeGround(1234);
  const f = StormShelter.frame(map);
  const sc = config.stormShelter;

  it('has its frame, the hatch near the clearing centre', () => {
    expect(f).toBeTruthy();
    expect(Math.hypot(shelter.hatch.x, shelter.hatch.z)).toBeLessThan(4);
  });

  it('holds the hatch with 12 citizens (Aaron), all inside the clearing, and Earl', () => {
    expect(sc.horde.count).toBe(12);
    expect(shelter.horde.length).toBeGreaterThanOrEqual(12);
    for (const [x, z] of shelter.horde) expect(Math.hypot(x, z)).toBeLessThan(f.radius - 2);
    expect(Math.hypot(shelter.earl.x - shelter.hatch.x, shelter.earl.z - shelter.hatch.z)).toBeLessThan(2.5);
  });

  it("puts the sigil near the hatch (Session 16, Aaron: not too close), clear of the hatch's prompt and the dig's", () => {
    const d = Math.hypot(shelter.sigil.x - shelter.hatch.x, shelter.sigil.z - shelter.hatch.z);
    expect(d).toBeLessThan(7);
    expect(d).toBeGreaterThan(config.digging.range + config.stormShelter.interactRange);
    const w = StormShelter.sigilSpot(map);
    expect(Math.hypot(w.x - f.x, w.z - f.z)).toBeLessThan(6);
  });

  it('digs the room under the ground everywhere over it, with the ladder under the hatch', () => {
    const { hatchY, floorY } = StormShelter.floorY(f, ground);
    const r = shelter.room;
    expect(hatchY - floorY).toBeGreaterThanOrEqual(r.depth - 0.01);
    for (const [x, z] of [[-r.hx, -r.hz], [r.hx, -r.hz], [-r.hx, r.hz], [r.hx, r.hz]]) {
      const w = frameToWorld(f, r.x + x, r.z + z);
      expect(ground.heightAt(w.x, w.z)).toBeGreaterThan(floorY + r.height + 0.3);
    }
    // The ladder's foot is under the hatch.
    const lx = r.x + r.ladder.x;
    const lz = r.z + r.ladder.z;
    expect(Math.abs(lx - shelter.hatch.x)).toBeLessThan(shelter.hatch.w / 2);
    expect(Math.abs(lz - shelter.hatch.z)).toBeLessThan(shelter.hatch.d / 2);
  });

  it('has only the story below (Aaron): the diary and the tapes, inside the room, no loot', () => {
    const r = shelter.room;
    for (const s of shelter.searches.filter((x) => x.below)) {
      expect(Math.abs(s.x)).toBeLessThan(r.hx);
      expect(Math.abs(s.z)).toBeLessThan(r.hz);
    }
    const ids = shelter.searches.map((s) => s.id);
    for (const id of ['diary', 'tapes']) expect(ids).toContain(id);
    expect(ids.sort()).toEqual(['diary', 'maps', 'tapes']); // build queue item 1: Earl's maps on the corkboard (story, offered once the family ask)
    expect(shelter.searches.some((s) => s.gives || s.loot)).toBe(false);
    const lore = new Set(loreData.items.map((i) => i.id));
    expect(lore.has('pruittDiary') && lore.has('pruittTapes')).toBe(true);
  });

  it('keeps Tom in the room and out of the furniture', () => {
    const pl = { x: 0, z: 0, hx: 1.5, hz: 1.2, rx: 1, rz: 0, fx: 0, fz: 1, blocks: [[-1.5, -0.8, -0.5, 0.5]] };
    const p = { x: 5, z: -5 };
    keepInRoom(p, pl, 0.3);
    expect(p.x).toBeCloseTo(1.2);
    expect(p.z).toBeCloseTo(-0.9);
    const q = { x: -1.0, z: 0.1 };
    keepInRoom(q, pl, 0.3);
    expect(q.x).toBeGreaterThanOrEqual(-0.8 + 0.3 - 1e-6);
  });

  it('has its flags, lines and cutscenes; the rifle and the visit are real now (no stand-ins)', () => {
    const flags = Object.fromEntries(progressData.flags.map((x) => [x.id, x]));
    for (const id of ['earlDown', 'shelterSigilDug', 'shelterOpened', 'shelterEntered', 'earlCombination']) expect(flags[id]).toBeTruthy();
    expect(flags.rifleClaimed.standIn).toBe(false);
    expect(flags.rifleClaimed.trigger).toBeUndefined();
    expect(flags.shelterVisited.standIn).toBe(false);
    const lines = new Set(dialogueData.lines.map((l) => l.id));
    for (const id of ['shelter.arrive', 'shelter.rising', 'shelter.dug.wyatt', 'shelter.dug.ellen', 'shelter.earl', 'shelter.keys.wyatt', 'shelter.keys.ellen', 'shelter.below.junie', 'shelter.below.ellen', 'shelter.diary', 'shelter.tapes']) {
      expect(lines.has(id)).toBe(true);
    }
    const cs = new Set(cutsceneData.cutscenes.map((c) => c.id));
    for (const id of ['sweep.shelter', 'shelter.down', 'shelter.up']) expect(cs.has(id)).toBe(true);
    expect(config.landmarks.built).toContain('stormShelter');
  });

  it('says the sigils raise the dead once it is dug up, and nothing says the children died (Aaron)', () => {
    const by = Object.fromEntries(dialogueData.lines.map((l) => [l.id, l.text]));
    expect(by['shelter.dug.ellen']).toMatch(/raising the dead/);
    expect(by['shelter.below.ellen']).toMatch(/got away/);
    const all = dialogueData.lines.filter((l) => l.id.startsWith('shelter.')).map((l) => l.text).join(' ');
    expect(all).not.toMatch(/kids? (are|is) dead|children died|bodies/i);
  });
});
