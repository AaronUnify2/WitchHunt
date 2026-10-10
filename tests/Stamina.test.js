import { describe, it, expect } from 'vitest';
import { Stamina } from '../src/player/Stamina.js';

const cfg = { max: 100, drainPerSecond: 20, regenPerSecond: 10, regenDelay: 1, minToStartSprint: 15 };

function make() {
  const s = new Stamina(cfg);
  s.init();
  return s;
}

describe('Stamina', () => {
  it('starts full', () => {
    expect(make().fraction).toBe(1);
  });

  it('drains while sprinting and empties', () => {
    const s = make();
    s.update(2, true);
    expect(s.value).toBe(60);
    s.update(10, true);
    expect(s.value).toBe(0);
    expect(s.empty).toBe(true);
  });

  it('waits for the regen delay, then refills up to max', () => {
    const s = make();
    s.update(2, true); // 60
    s.update(0.5, false);
    expect(s.value).toBe(60);
    s.update(0.5, false); // delay reached
    s.update(1, false);
    expect(s.value).toBeGreaterThan(60);
    s.update(100, false);
    expect(s.value).toBe(100);
  });

  it('needs a minimum to start a new sprint', () => {
    const s = make();
    s.update(4.5, true); // 10 left
    expect(s.canStart).toBe(false);
    s.update(1, false);
    s.update(1, false); // 20
    expect(s.canStart).toBe(true);
  });
});
