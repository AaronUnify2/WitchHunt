// Session 23: the dawn autosave ran before the dawn's story triggers did, so
// day2 (the gas station trail) was missing from it, and Continue left the
// trail shut for another whole day. settle() runs a waiting dawn at once;
// replay() runs dawn's triggers again for a run continued at dawn.
import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';
import { StoryProgress } from '../src/story/StoryProgress.js';

function make() {
  const bus = new EventBus();
  const p = new StoryProgress({}, bus);
  const world = {
    map: { clearings: [], cluster: { cordonZ: 1000 } },
    clearingAt: () => null,
  };
  p.init({ world, player: { position: { x: 0, z: 0 } }, enemies: { living: [] } });
  return { bus, p };
}

describe('dawn flags and the dawn save (Session 23)', () => {
  it('a dawn waiting for its check is settled before anything reads the flags', () => {
    const { bus, p } = make();
    p.setFlag('campsiteVisited');
    let savedDay2 = null;
    // The game's autosave listens on the same event: it settles first, then saves.
    bus.on('phase:dawn', () => {
      p.settle();
      savedDay2 = p.has('day2');
    });
    bus.emit('phase:dawn', { day: 1 });
    expect(savedDay2).toBe(true);
  });

  it('without settle, the flag only comes on the next check (the old bug)', () => {
    const { bus, p } = make();
    p.setFlag('campsiteVisited');
    let seen = null;
    bus.on('phase:dawn', () => (seen = p.has('day2')));
    bus.emit('phase:dawn', { day: 1 });
    expect(seen).toBe(false);
    p.update(0.01, true);
    expect(p.has('day2')).toBe(true);
  });

  it('a run continued at dawn runs dawn\'s triggers again', () => {
    const { p } = make();
    p.loadState(['night1', 'campsiteVisited']);
    expect(p.has('day2')).toBe(false);
    p.replay('dawn', 1);
    p.update(0.01, true);
    expect(p.has('day2')).toBe(true);
  });

  it('settle does nothing with no dawn or dusk waiting', () => {
    const { p } = make();
    p.setFlag('campsiteVisited');
    p.settle();
    expect(p.has('day2')).toBe(false);
  });
});
