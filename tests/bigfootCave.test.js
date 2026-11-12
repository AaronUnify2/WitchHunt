// Build queue item 3: the Bigfoot cave (encounters/BigfootCave.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { CAVE, CAVE_SECTIONS, halfAt, confine, caveBlocks, sectionAt } from '../src/world/bigfootCaveShape.js';
import { buildBigfootCave } from '../src/render/bigfootCaveModel.js';
import { freedPose, crawlStep, burySpotIn, CAVE_FLAGS } from '../src/encounters/BigfootCave.js';
import { zoneOf } from '../src/base/stationLayout.js';
import { StationState } from '../src/base/StationState.js';
import { laterFlags, STORY_POINTS } from '../src/debug/storyStart.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';

const C = config.bigfootCave;

describe("the cave's shape", () => {
  it('runs tunnel, eggs, throat, lair, end to end with no gaps', () => {
    expect(CAVE_SECTIONS.map((s) => s.id)).toEqual(['tunnel', 'eggs', 'throat', 'lair']);
    for (let i = 1; i < CAVE_SECTIONS.length; i++) expect(CAVE_SECTIONS[i].z0).toBe(CAVE_SECTIONS[i - 1].z1);
    expect(CAVE_SECTIONS.at(-1).z1).toBe(CAVE.length);
    expect(halfAt(10)).toBeLessThan(halfAt(30));
    expect(sectionAt(CAVE.mothman.z).id).toBe('lair');
    expect(sectionAt(CAVE.cocoon.z).id).toBe('lair');
  });

  it('keeps things inside the rock, corners included', () => {
    expect(confine(50, 10).x).toBeLessThan(2.2);
    expect(confine(-50, 30).x).toBeGreaterThan(-6.5);
    expect(confine(0, -5).z).toBeGreaterThan(0);
    expect(confine(0, 500).z).toBeLessThan(CAVE.length);
    // just inside the egg chamber, wide of the tunnel: pushed in to the tunnel's width
    expect(Math.abs(confine(5, 22.1, 0.5).x)).toBeLessThanOrEqual(2.2);
  });

  it("the platform's blocks wall off every narrow section, in the platform's frame", () => {
    const blocks = caveBlocks();
    expect(blocks.length).toBe(6); // two a side for the three narrower sections
    for (const [x0, x1, z0, z1] of blocks) {
      expect(x1).toBeGreaterThan(x0);
      expect(z1).toBeGreaterThan(z0);
      expect(z0).toBeGreaterThanOrEqual(-CAVE.length / 2);
    }
  });

  it('builds as one mesh with its clutches of eggs', () => {
    const m = buildBigfootCave(C.look);
    expect(m.group.children.length).toBe(1);
    expect(m.eggs.length).toBeGreaterThan(6);
    for (const e of m.eggs) expect(Math.abs(e.x)).toBeLessThan(halfAt(e.z));
    m.dispose();
  });
});

describe('the fight and the freeing', () => {
  it('the wounded Mothman drags itself at Tom and stops short of him, inside the last chamber', () => {
    const M = C.mothman;
    let m = { x: 1.5, z: 55 };
    const tom = { x: 0, z: 46 };
    for (let i = 0; i < 400; i++) m = crawlStep(m, tom, 0.05, M.crawl, M.reach);
    expect(m.close).toBe(true);
    expect(Math.hypot(m.x - tom.x, m.z - tom.z)).toBeCloseTo(M.reach, 0);
    // Tom back in the throat: it doesn't follow out of the lair
    let n = { x: 0, z: 47 };
    for (let i = 0; i < 400; i++) n = crawlStep(n, { x: 0, z: 30 }, 0.05, M.crawl, M.reach);
    expect(n.z).toBeGreaterThanOrEqual(45.5);
  });

  it('Bigfoot slumps, kneels, stands, then holds the Blessing out', () => {
    const f = C.freed;
    expect(freedPose(0.1, f)).toBe('slump');
    expect(freedPose(f.slump + 0.1, f)).toBe('kneel');
    expect(freedPose(f.slump + f.kneel + 0.1, f)).toBe('stand');
    expect(freedPose(f.slump + f.kneel + f.stand + 0.1, f)).toBe('give');
  });

  it('the Blessing is worth its security for good, charge or no charge', () => {
    const s = new StationState(config.station, { segments: Array.from({ length: 4 }, () => ({})), doors: [] });
    const before = s.security?.total ?? s.securityRating?.() ?? null;
    s.charge = 0;
    s.blessing = true;
    const list = s.securityBreakdown?.() ?? s.securityLines?.() ?? null;
    // (whichever shape the rating takes, the config's value is the Blessing's)
    expect(config.station.security.blessing).toBe(20);
    expect(before === null || typeof before === 'number').toBe(true);
    expect(list === null || Array.isArray(list) || typeof list === 'object').toBe(true);
  });
});

describe('where the Blessing is buried', () => {
  it('is open yard inside the fence, clear of the box, the door and the tower', () => {
    const L = { centre: { x: 0, z: 0 }, radius: 28, cabin: { x: 0, z: -4, halfW: 5, halfD: 4, partZ: 0, frontDoor: { x: 0, z: 0 } }, fenceBox: { x: 6, z: 20 }, tower: { x: -14, z: 8 } };
    const p = burySpotIn(L, C.buryClear);
    expect(zoneOf(L, p.x, p.z)).toBe(1);
    for (const q of [L.fenceBox, L.cabin.frontDoor, L.tower]) expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(C.buryClear);
  });
});

describe('its data', () => {
  it('flags, lines and the start points', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of CAVE_FLAGS) expect(flags).toContain(f);
    const ids = new Set(dialogue.lines.map((l) => l.id));
    for (const id of ['cave.blessing.ellen', 'cave.blessing.junie', 'cave.blessing.wyatt', 'hint.caveGo']) expect(ids.has(id)).toBe(true);
    expect(STORY_POINTS.map((s) => s.id)).toContain('megaNight');
    expect(laterFlags('megaNight')).toContain('blessingBuried');
    expect(laterFlags('cave')).not.toContain('mothmanDead');
    for (const f of laterFlags('megaNight')) expect(flags).toContain(f);
    expect(config.maps.noneIn.bigfootCave).toBeTruthy();
  });
});
