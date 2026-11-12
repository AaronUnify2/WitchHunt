// Session 27, batch 4: the railway cutting's beat (encounters/RailwayCutting.js, data/railwayCutting.json).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { waveDue, fightLook, roomLocal, FLAGS } from '../src/encounters/RailwayCutting.js';
import { buildRailwayCutting } from '../src/render/railwayCuttingModel.js';
import data from '../src/data/railwayCutting.json';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';
import papers from '../src/data/papers.json';
import dialogue from '../src/data/dialogue.json';
import cutscenes from '../src/data/cutscenes.json';
import encounters from '../src/data/encounters.json';

const rc = config.railwayCutting;
const ec = rc.encounter;
const model = buildRailwayCutting(rc, { cut: config.map.railway.cutting });

describe('the dead coming up', () => {
  it('the first wave comes at once; each next one after its wait, or sooner once the last is nearly down', () => {
    const w = ec.waves;
    expect(waveDue(w, 0, 0, 0)).toBe(true);
    expect(waveDue(w, 1, w[1].after - 0.1, 99)).toBe(false);
    expect(waveDue(w, 1, w[1].after, 99)).toBe(true);
    expect(waveDue(w, 1, 3, w[1].left)).toBe(true);
    expect(waveDue(w, 1, 1, w[1].left)).toBe(false); // not the instant the last one's down
    expect(waveDue(w, w.length, 100, 0)).toBe(false);
  });

  it('enough of them for a fight, from the floor, the mouths and round the store', () => {
    const total = ec.waves.reduce((n, w) => n + w.count, 0);
    expect(total).toBeGreaterThanOrEqual(12);
    expect(total).toBeLessThanOrEqual(24);
    expect(new Set(ec.waves.map((w) => w.from))).toEqual(new Set(['floor', 'mouths', 'store']));
  });

  it('a fight that was on starts again; a finished one stays finished', () => {
    expect(fightLook(new Set())).toBe('none');
    expect(fightLook(new Set(['cuttingRisen']))).toBe('pending');
    expect(fightLook(new Set(['cuttingRisen', 'cuttingCleared']))).toBe('cleared');
  });
});

describe('aboard', () => {
  it('works out where Tom stands in a coach (across, along)', () => {
    const room = { x: 10, z: 5, rx: 0, rz: -1, fx: 1, fz: 0 };
    expect(roomLocal(room, 13, 5)).toEqual({ x: 0, z: 3 });
    expect(roomLocal(room, 10, 4)).toEqual({ x: 1, z: 0 });
  });

  it('has a way on at each coach\'s open ends, and room to stand inside', () => {
    for (const [id, ends] of Object.entries(ec.boardEnds)) {
      expect(model.rooms[id], id).toBeTruthy();
      for (const e of ends) for (const s of ['L', 'R']) expect(model.spots[`${id}.board${e}${s}`], `${id} ${e}${s}`).toBeTruthy();
    }
    expect(ec.roofY).toBeGreaterThan(config.player.eyeHeight ?? 1.6);
  });
});

describe("the beat's data", () => {
  const flags = new Set(progress.flags.map((f) => f.id));
  const loreById = new Map(lore.items.map((i) => [i.id, i]));
  const paperIds = new Set(papers.papers.map((p) => p.id));
  const lines = new Map(dialogue.lines.map((l) => [l.id, l]));

  it('declares every flag it sets', () => {
    for (const f of FLAGS) expect(flags.has(f), f).toBe(true);
    for (const s of data.searches) if (s.flag) expect(FLAGS, s.id).toContain(s.flag);
  });

  it('every search is at a place in the set, with a hold time and something found', () => {
    for (const s of data.searches) {
      expect(model.spots[s.spot], s.id).toBeTruthy();
      expect(ec.holds[s.hold], s.id).toBeGreaterThan(0);
      expect(Boolean(s.text || s.lore), s.id).toBe(true);
      if (s.aboard) expect(Object.keys(ec.boardEnds)).toContain(s.aboard);
    }
  });

  it('gives lore with an inspect card, and the papers it opens are written', () => {
    for (const id of ['engineersNote', 'luggageLabels', 'hattieDoll', 'cowcatcher']) {
      const item = loreById.get(id);
      expect(item, id).toBeTruthy();
      expect(item.from).toBe('railwayCutting');
      expect(item.card?.line, id).toBeTruthy();
      if (item.paper) expect(paperIds.has(item.paper), id).toBe(true);
    }
    for (const s of data.searches) if (s.paper) expect(paperIds.has(s.paper), s.id).toBe(true);
    // The baggage checks carry every name on the church's stones.
    const stones = papers.papers.find((p) => p.id === 'graveyardStones').pages[0].text;
    const labels = papers.papers.find((p) => p.id === 'luggageLabels').pages[0].text.toUpperCase();
    for (const surname of ['TULLY', 'PRUITT', 'McCOY', 'TATE', 'GENTRY', 'ASHBY', 'DEAN', 'WAYCASTER']) {
      expect(stones.toUpperCase()).toContain(surname.toUpperCase());
      expect(labels).toContain(surname.toUpperCase());
    }
  });

  it("has the Caller's lines, in voices the game knows, marked as the Caller", () => {
    for (const id of ['caller.cutting.amos1', 'caller.cutting.amos2', 'caller.cutting.hattie', 'caller.cutting.rise']) {
      const l = lines.get(id);
      expect(l, id).toBeTruthy();
      expect(l.caller).toBe(true);
      expect(config.story.speakers[l.speaker], l.speaker).toBeTruthy();
    }
  });

  it('has its arrival sweep on its own anchor, and its clearing on the line', () => {
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.railwayCutting');
    expect(sweep).toBeTruthy();
    expect(sweep.camera.every((k) => k.anchor === 'railwayCutting')).toBe(true);
    expect(sweep.duration).toBeGreaterThan(sweep.camera.at(-1).at);
    expect(encounters.encounters.find((e) => e.id === 'railwayCutting').onRailway).toBe(true);
  });

  it('finds no more sticks than Tom can carry, and few (scarce)', () => {
    expect(ec.sticks).toBeLessThanOrEqual(config.dynamite.carryMax);
    expect(ec.sticks).toBeLessThanOrEqual(8);
    expect(ec.crate.blast.radius).toBeGreaterThan(config.dynamite.blast.radius); // the crates are a much bigger bang
  });
});
