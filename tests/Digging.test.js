import { describe, it, expect } from 'vitest';
import { Digging } from '../src/player/Digging.js';

const sigil = { id: 1 };

function make() {
  const d = new Digging({ seconds: 4, releaseDrain: 2 });
  d.init();
  return d;
}

describe('Digging', () => {
  it('takes a few seconds of holding interact', () => {
    const d = make();
    for (let i = 0; i < 39; i++) expect(d.update(0.1, sigil, true)).toBeNull();
    expect(d.progress).toBeGreaterThan(0.9);
    let done = null;
    for (let i = 0; i < 3 && !done; i++) done = d.update(0.1, sigil, true);
    expect(done).toBe(sigil);
    expect(d.progress).toBe(0);
  });

  it('letting go drains the bar; stepping away starts over', () => {
    const d = make();
    for (let i = 0; i < 10; i++) d.update(0.1, sigil, true);
    expect(d.progress).toBeCloseTo(0.25);
    d.update(0.5, sigil, false); // drains at twice the fill speed: 0.25 of the bar a second
    expect(d.progress).toBeCloseTo(0);
    expect(d.active).toBe(false);
    for (let i = 0; i < 10; i++) d.update(0.1, sigil, true);
    d.update(0.1, null, true);
    expect(d.progress).toBe(0);
  });

  it('taking damage interrupts the dig', () => {
    const d = make();
    for (let i = 0; i < 20; i++) d.update(0.1, sigil, true);
    expect(d.interrupt()).toBe(true);
    expect(d.progress).toBe(0);
    for (let i = 0; i < 20; i++) expect(d.update(0.1, sigil, true)).toBeNull();
  });
});
