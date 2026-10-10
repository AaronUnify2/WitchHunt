import { describe, it, expect } from 'vitest';
import { findKeyframes, sunDirection } from '../src/render/skyPalette.js';

const keys = [{ hour: 0 }, { hour: 6 }, { hour: 12 }, { hour: 20 }];
const sky = { sunriseHour: 6, sunsetHour: 18, sunMaxElevation: 60 };

describe('findKeyframes', () => {
  it('finds the surrounding keys and the blend factor', () => {
    const { a, b, t } = findKeyframes(keys, 9, 24);
    expect(a.hour).toBe(6);
    expect(b.hour).toBe(12);
    expect(t).toBeCloseTo(0.5);
  });

  it('lands exactly on a key with t = 0', () => {
    const { a, t } = findKeyframes(keys, 12, 24);
    expect(a.hour).toBe(12);
    expect(t).toBe(0);
  });

  it('wraps past midnight from the last key to the first', () => {
    const { a, b, t } = findKeyframes(keys, 22, 24);
    expect(a.hour).toBe(20);
    expect(b.hour).toBe(0);
    expect(t).toBeCloseTo(0.5);
  });

  it('wraps for hours before the first key', () => {
    const late = [{ hour: 5 }, { hour: 20 }];
    const { a, b, t } = findKeyframes(late, 2, 24);
    expect(a.hour).toBe(20);
    expect(b.hour).toBe(5);
    expect(t).toBeCloseTo(6 / 9);
  });
});

describe('sunDirection', () => {
  it('is a unit vector', () => {
    for (const hour of [6, 9, 12, 15, 18]) {
      const d = sunDirection(hour, sky);
      expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
    }
  });

  it('rises in the east, peaks in the south at midday, sets in the west', () => {
    const rise = sunDirection(6, sky);
    const noon = sunDirection(12, sky);
    const set = sunDirection(18, sky);
    expect(rise.x).toBeCloseTo(1);
    expect(rise.y).toBeCloseTo(0);
    expect(noon.y).toBeCloseTo(Math.sin((60 * Math.PI) / 180));
    expect(noon.z).toBeGreaterThan(0);
    expect(set.x).toBeCloseTo(-1);
  });

  it('is below the horizon at night', () => {
    expect(sunDirection(2, sky).y).toBeLessThan(0);
  });
});
