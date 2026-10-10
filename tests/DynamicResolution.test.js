import { describe, it, expect } from 'vitest';
import { DynamicResolution } from '../src/render/DynamicResolution.js';

const cfg = { enabled: true, sampleSeconds: 1, slowTolerance: 0.1, raiseAfterSeconds: 3, step: 0.05 };

function make(scale = 0.65) {
  const dr = new DynamicResolution(cfg);
  dr.init({ scale, min: 0.4, max: 0.8, targetFps: 60 });
  return dr;
}

// Feed `seconds` of frames at `fps`; return how many times the scale changed.
function run(dr, fps, seconds) {
  let changes = 0;
  const frames = Math.round(fps * seconds);
  for (let i = 0; i < frames; i++) if (dr.update(1 / fps)) changes++;
  return changes;
}

describe('DynamicResolution', () => {
  it('drops one step after a slow window', () => {
    const dr = make();
    run(dr, 40, 1);
    expect(dr.scale).toBeCloseTo(0.6);
  });

  it('keeps dropping while slow but never below the minimum', () => {
    const dr = make();
    run(dr, 20, 20);
    expect(dr.scale).toBe(0.4);
  });

  it('only raises after a sustained stretch on target', () => {
    const dr = make();
    run(dr, 60, 2);
    expect(dr.scale).toBe(0.65);
    run(dr, 60, 1.05);
    expect(dr.scale).toBeCloseTo(0.7);
  });

  it('never rises above the maximum', () => {
    const dr = make();
    run(dr, 90, 60);
    expect(dr.scale).toBe(0.8);
  });

  it('a slow window resets the wait before raising', () => {
    const dr = make();
    run(dr, 60, 2);
    run(dr, 30, 1); // drop to 0.6
    run(dr, 60, 2);
    expect(dr.scale).toBeCloseTo(0.6);
  });

  it('does nothing while disabled', () => {
    const dr = make();
    dr.setEnabled(false);
    run(dr, 20, 5);
    expect(dr.scale).toBe(0.65);
  });

  it('clamps into new bounds', () => {
    const dr = make(0.75);
    dr.setBounds(0.4, 0.6);
    expect(dr.scale).toBe(0.6);
  });
});
