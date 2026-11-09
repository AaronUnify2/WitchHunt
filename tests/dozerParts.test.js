import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { partMods, toggledParts } from '../src/world/dozerParts.js';

const P = config.spikes.dozerParts;
const base = config.dozer.crush;

describe('Parts bolted onto the dozer (Session 22 spike)', () => {
  it('nothing fitted leaves the dozer as it is', () => {
    const m = partMods(base, P, []);
    expect(m.crush).toEqual(base);
    expect(m.strainScale).toBe(1);
    expect(m.noClimbers).toBe(false);
  });

  it('the ram hits harder before the blade', () => {
    const m = partMods(base, P, ['ram']);
    expect(m.crush.push).toBe(base.push * P.ram.crush.push);
    expect(m.crush.tracks).toBe(base.tracks);
  });

  it('plating keeps the dead off; the saw takes big trees fast', () => {
    expect(partMods(base, P, ['plating']).noClimbers).toBe(true);
    expect(partMods(base, P, ['saw']).strainScale).toBeLessThan(0.5);
  });

  it('parts stack, and the base numbers are never changed', () => {
    const m = partMods(base, P, ['ram', 'saw']);
    expect(m.crush.push).toBe(base.push * P.ram.crush.push * P.saw.crush.push);
    expect(config.dozer.crush.push).toBe(base.push);
  });

  it('fitting toggles a part on and off, in the config order, ignoring unknowns', () => {
    let fitted = toggledParts(P, [], 'saw');
    fitted = toggledParts(P, fitted, 'ram');
    expect(fitted).toEqual(['ram', 'saw']);
    fitted = toggledParts(P, fitted, 'saw');
    expect(fitted).toEqual(['ram']);
    expect(toggledParts(P, fitted, 'jetpack')).toEqual(['ram']);
  });
});
