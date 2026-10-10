import { describe, it, expect } from 'vitest';
import { applyRadialDeadZone, applyResponseCurve, clampLength } from '../src/core/stickMath.js';

describe('stick maths', () => {
  it('zeroes input inside the dead zone', () => {
    expect(applyRadialDeadZone(0.1, 0.05, 0.15, 0.95)).toEqual({ x: 0, y: 0 });
  });

  it('rescales so the dead-zone edge starts at zero and the outer zone reads full', () => {
    const justOut = applyRadialDeadZone(0.16, 0, 0.15, 0.95);
    expect(justOut.x).toBeGreaterThan(0);
    expect(justOut.x).toBeLessThan(0.05);
    expect(applyRadialDeadZone(0.97, 0, 0.15, 0.95).x).toBeCloseTo(1);
  });

  it('keeps the stick direction', () => {
    const v = applyRadialDeadZone(0.5, 0.5, 0.15, 0.95);
    expect(v.x).toBeCloseTo(v.y);
  });

  it('response curve keeps full deflection full and softens the middle', () => {
    expect(applyResponseCurve(1, 0, 2).x).toBeCloseTo(1);
    expect(applyResponseCurve(0.5, 0, 2).x).toBeCloseTo(0.25);
    expect(applyResponseCurve(0, 0, 2)).toEqual({ x: 0, y: 0 });
  });

  it('clampLength limits diagonals to length 1', () => {
    const v = clampLength(1, 1);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(clampLength(0.3, 0.4)).toEqual({ x: 0.3, y: 0.4 });
  });
});
