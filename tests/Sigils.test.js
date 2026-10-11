import { describe, it, expect } from 'vitest';
import { Sigils } from '../src/ai/Sigils.js';
import { Rng } from '../src/core/Rng.js';
import { config } from '../src/config.js';

function make() {
  const s = new Sigils(config.sigils, new Rng(1));
  s.init();
  return s;
}

describe('Sigils', () => {
  it('holds at most five', () => {
    const s = make();
    for (let i = 0; i < 5; i++) expect(s.plant({ x: i * 100, z: 0 })).not.toBeNull();
    expect(s.full).toBe(true);
    expect(s.plant({ x: 999, z: 0 })).toBeNull();
    expect(s.count).toBe(5);
    s.remove(s.list[0]);
    expect(s.count).toBe(4);
    expect(s.plant({ x: 999, z: 0 })).not.toBeNull();
  });

  it('raises only while raising (at night)', () => {
    const s = make();
    s.plant({ x: 0, z: 0 });
    const out = [];
    for (let t = 0; t < 120; t++) expect(s.update(1, false, () => 0, out)).toHaveLength(0);
    let raised = 0;
    for (let t = 0; t < 120; t++) raised += s.update(1, true, () => 0, out).length;
    expect(raised).toBeGreaterThan(2);
  });

  it('waits at its own cap and carries on as soon as it drops below', () => {
    const s = make();
    const sigil = s.plant({ x: 0, z: 0 });
    const out = [];
    let living = config.sigils.perSigilCap;
    for (let t = 0; t < 200; t++) expect(s.update(1, true, () => living, out)).toHaveLength(0);
    living -= 1;
    expect(s.update(0.01, true, () => living, out)).toEqual([sigil]);
  });

  it('sigil grounds raise faster', () => {
    const count = (groundId) => {
      const s = new Sigils(config.sigils, new Rng(7));
      s.init();
      s.plant({ x: 0, z: 0, groundId });
      let n = 0;
      const out = [];
      for (let t = 0; t < 3600; t++) n += s.update(1, true, () => 0, out).length;
      return n;
    };
    expect(count(3)).toBeGreaterThan(count(-1) * 1.3);
  });

  it('finds the nearest sigil in range, and knows which grounds are taken', () => {
    const s = make();
    s.plant({ x: 0, z: 0, groundId: 4 });
    const b = s.plant({ x: 10, z: 0 });
    expect(s.nearest(9, 0, 2)).toBe(b);
    expect(s.nearest(50, 0, 2)).toBeNull();
    expect(s.groundFree(4)).toBe(false);
    expect(s.groundFree(5)).toBe(true);
  });
});
