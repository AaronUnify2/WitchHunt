// Nov 24 (Aaron): the debug menu's dozer comes with its keys and battery, so it drives at once.
import { describe, it, expect } from 'vitest';
import { Dozer } from '../src/world/Dozer.js';
import { CordonDozer } from '../src/encounters/CordonDozer.js';

describe('the debug dozer, ready to drive (Nov 24)', () => {
  it('unlocks and tells the story it has its keys and battery', () => {
    const sent = [];
    const d = { locked: true, bus: { emit: (e) => sent.push(e) } };
    Dozer.prototype.debugReady.call(d);
    expect(d.locked).toBe(false);
    expect(sent).toEqual(['dozer:debugReady']);
  });

  it('the camp sets the keys and the battery, takes the spare off the ground, and unlocks', () => {
    const flags = new Set();
    let battery = true;
    const dozer = { locked: true };
    const camp = Object.create(CordonDozer.prototype);
    Object.assign(camp, {
      progress: { setFlag: (f) => flags.add(f), has: (f) => flags.has(f) },
      site: { setBattery: (on) => (battery = on) },
      dozer,
    });
    camp.debugReady();
    expect([...flags].sort()).toEqual(['dozerBattery', 'dozerKey']);
    expect(battery).toBe(false);
    expect(dozer.locked).toBe(false);
  });
});
