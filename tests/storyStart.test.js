// Debug: start from the outpost cleared (debug/storyStart.js; Aaron, after Session 26).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { OUTPOST_CLEARED_FLAGS, OUTPOST_LORE, COMPOUND_LORE, openingStates } from '../src/debug/storyStart.js';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';

describe('starting from the outpost cleared', () => {
  const ids = progress.flags.map((f) => f.id);
  it('sets real flags, every one before the outpost is cleared, and nothing past the cordon', () => {
    for (const f of OUTPOST_CLEARED_FLAGS) expect(ids, f).toContain(f);
    const last = ids.indexOf('outpostCleared');
    for (const f of OUTPOST_CLEARED_FLAGS) expect(ids.indexOf(f)).toBeLessThanOrEqual(last);
    for (const f of ['crossedCordon', 'planeStandoff', 'junieTaken']) expect(OUTPOST_CLEARED_FLAGS).not.toContain(f);
    // Every flag a gate or trigger needs on the way: each "after" is in the list.
    for (const def of progress.flags.filter((d) => OUTPOST_CLEARED_FLAGS.includes(d.id))) for (const a of def.trigger?.after ?? []) expect(OUTPOST_CLEARED_FLAGS).toContain(a);
  });

  it('hands in real lore', () => {
    const l = lore.items.map((i) => i.id);
    for (const id of [...OUTPOST_LORE, ...COMPOUND_LORE]) expect(l).toContain(id);
  });

  it('the encounters end where the opening leaves them; explored does the compound too', () => {
    const plain = openingStates(config, { waves: 3, crates: 4 });
    expect(plain.gasStation.safe).toBe(true);
    expect(plain.gasStation.mutant).toBe('down');
    expect(plain.shelter.sigilDug).toBe(true);
    expect(plain.shelter.hatch).toBe('open');
    expect(plain.outpost.peak).toBe('done');
    expect(plain.outpost.waves).toBe(3);
    expect(plain.outpost.dogfight).toBe(false);
    expect(plain.outpost.crates).toEqual([0, 0, 0, 0]);
    const done = openingStates(config, { explored: true, waves: 3, crates: 4 });
    expect(done.outpost.dogfight).toBe(true);
    expect(done.outpost.crates).toEqual([1, 1, 1, 1]);
    for (const k of ['beetlesDone', 'resinOpen', 'c7']) expect(done.outpost.told).toContain(k);
    for (const k of ['armoury', 'report', 'manifest']) expect(done.outpost.searched).toContain(k);
  });
});
