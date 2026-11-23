// Nov 23 (Aaron, play-test: "When you die it's a bit rough going back to the beginning"): checkpoints at each
// autosave and each dusk; death, or the station falling, tries again from the last one.
import { describe, it, expect } from 'vitest';
import { checkpointLabel, checkpointFor, retrySave } from '../src/core/checkpoints.js';
import { SaveStore } from '../src/core/SaveStore.js';
import { createStats, summaryRows } from '../src/core/runStats.js';
import { RunEndScreen } from '../src/ui/RunEndScreen.js';
import { config } from '../src/config.js';

const valid = (d) => Boolean(d && d.version === 3);
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
};

describe('checkpoints (Nov 23)', () => {
  it('are on, at dusk too, in their own slot, with a floor under health', () => {
    expect(config.save.checkpoints).toBe(true);
    expect(config.save.checkpointAtDusk).toBe(true);
    expect(config.save.checkpointKey).not.toBe(config.save.key);
    expect(config.save.retryMinHealth).toBeGreaterThan(0);
  });

  it('are named for the death screen by when they were made', () => {
    expect(checkpointLabel('dawn', 1)).toBe('the start of Day 2'); // Skip intro and the first dawn save
    expect(checkpointLabel('dawn', 3)).toBe('the start of Day 4');
    expect(checkpointLabel('dusk', 1)).toBe('the start of Night 1');
    expect(checkpointLabel('dusk', 2)).toBe('the start of Night 2');
    expect(checkpointLabel('day', 2)).toBe('Day 2');
    expect(checkpointLabel('day', 1, 'the campground')).toBe('the campground');
  });

  it('only count for this run', () => {
    const cp = { version: 3, seed: 1234, checkpoint: { label: 'x' } };
    expect(checkpointFor(cp, 1234, valid)).toBe(true);
    expect(checkpointFor(cp, '1234', valid)).toBe(true);
    expect(checkpointFor(cp, 99, valid)).toBe(false); // another map's
    expect(checkpointFor({ ...cp, checkpoint: undefined }, 1234, valid)).toBe(false); // a plain save
    expect(checkpointFor({ ...cp, version: 2 }, 1234, valid)).toBe(false);
    expect(checkpointFor(null, 1234, valid)).toBe(false);
  });

  it('retry from the checkpoint as it was, with the live stats, the retry counted and some health', () => {
    const cp = { version: 3, seed: 1, player: { health: 8, x: 5 }, stats: { kills: 3, seconds: 100, retries: 0 }, checkpoint: { label: 'the start of Night 2' } };
    const live = { ...createStats(), kills: 9, seconds: 400, retries: 2 };
    const d = retrySave(cp, live, 50);
    expect(d.player).toEqual({ health: 50, x: 5 });
    expect(d.stats.kills).toBe(9); // what he did since carries on
    expect(d.stats.seconds).toBe(400);
    expect(d.stats.retries).toBe(3);
    expect(d.checkpoint).toEqual({ label: 'the start of Night 2', retried: true });
    expect(cp.player.health).toBe(8); // the checkpoint itself is untouched: the next death goes back to it too
    expect(retrySave({ ...cp, player: { health: 90 } }, createStats(), 50).player.health).toBe(90);
  });

  it('keep their own slot beside the run\'s save', () => {
    const storage = memory();
    const saves = new SaveStore(config.save, storage);
    const checkpoints = new SaveStore({ key: config.save.checkpointKey }, storage);
    saves.save({ a: 1 });
    checkpoints.save({ b: 2 });
    saves.clear();
    expect(checkpoints.load()).toEqual({ b: 2 });
  });

  it('show on the summary once you have tried again', () => {
    expect(summaryRows(createStats(), 1).some(([l]) => /tried again/.test(l))).toBe(false);
    expect(summaryRows({ ...createStats(), retries: 2 }, 1)).toContainEqual(['Times you tried again', '2']);
  });
});

describe('the death screen with a retry (Nov 23)', () => {
  const screen = () => {
    const sent = [];
    const s = Object.create(RunEndScreen.prototype);
    Object.assign(s, { cfg: { summaryInputDelay: 0.5 }, bus: { emit: (e) => sent.push(e) }, summaryShown: true, summaryTime: 0, retry: { label: 'the start of Night 2' } });
    return { s, sent };
  };
  const pressing = (action) => ({ wasPressed: (a) => a === action });

  it('A tries again; B starts a new run instead', () => {
    let { s, sent } = screen();
    s.update(0.2, pressing('menuConfirm')); // the press that skipped the cutscene doesn't count
    expect(sent).toEqual([]);
    s.update(0.5, pressing('menuConfirm'));
    expect(sent).toEqual(['run:retryRequested']);
    ({ s, sent } = screen());
    s.update(1, pressing('menuBack'));
    expect(sent).toEqual(['run:newRequested']);
  });

  it('without a retry, B does nothing and A is a new run', () => {
    const { s, sent } = screen();
    s.retry = null;
    s.update(1, pressing('menuBack'));
    expect(sent).toEqual([]);
    s.update(0.1, pressing('menuConfirm'));
    expect(sent).toEqual(['run:newRequested']);
  });
});
