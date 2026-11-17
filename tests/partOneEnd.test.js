// Nov 17 (Aaron): the game released a third at a time (config.release). While only Part One is out, the
// Mothman's knockdown at the crashed plane is the end; the menu's Part Two starts where Part Two begins.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { partOneEndsHere } from '../src/encounters/CrashedPlane.js';
import { MetaStore } from '../src/meta/MetaStore.js';
import { STORY_POINTS, laterFlags } from '../src/debug/storyStart.js';

function store() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

describe('the end of Part One', () => {
  it('only Part One is released, and its card has its words', () => {
    expect(config.release.part).toBe(1);
    const e = config.release.partOneEnd;
    for (const k of ['title', 'line', 'prompt']) expect(typeof e[k]).toBe('string');
  });

  it('the knockdown ends the game only while Part One is all there is', () => {
    expect(partOneEndsHere({ part: 1 })).toBe(true);
    expect(partOneEndsHere({ part: 2 })).toBe(false);
    expect(partOneEndsHere(undefined)).toBe(false); // no switch: the whole game, as before
  });

  it("the menu's Part Two survives the reload a fresh map needs", () => {
    const s = new MetaStore(config.meta, store(), store());
    s.setPendingChoice('partTwo');
    expect(s.takePendingChoice()).toBe('partTwo');
    expect(s.takePendingChoice()).toBeNull();
  });

  it('Part Two starts at the wreck at dawn: the plane done, nothing of Junie yet', () => {
    expect(STORY_POINTS.map((p) => p.id)).toContain('planeDone');
    const f = laterFlags('planeDone');
    for (const k of ['planeGreyDown', 'planeLooted', 'mothmanMet', 'planeDone']) expect(f).toContain(k);
    for (const k of ['junieTaken', 'familyAccount', 'churchVisited']) expect(f).not.toContain(k);
  });
});
