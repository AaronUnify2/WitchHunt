import { describe, it, expect } from 'vitest';
import { weaponBob } from '../src/player/ViewModel.js';
import { config } from '../src/config.js';

const cfg = config.viewModel.bob;
const walk = config.player.walkSpeed;
const sprint = walk * config.player.sprintMultiplier;

describe('weaponBob', () => {
  it('is still when standing', () => {
    expect(weaponBob(0, walk, sprint, cfg).amount).toBe(0);
  });

  it('paces like footsteps: about 2 steps a second walking, never vibrating at a sprint', () => {
    expect(weaponBob(walk, walk, sprint, cfg).stepsPerSecond).toBeCloseTo(cfg.walkStepsPerSecond);
    const s = weaponBob(sprint, walk, sprint, cfg);
    expect(s.stepsPerSecond).toBeCloseTo(cfg.sprintStepsPerSecond);
    expect(s.stepsPerSecond).toBeLessThan(3); // the old sway ran at ~13 Hz here
    expect(s.amount).toBeCloseTo(cfg.amount * cfg.sprintAmount);
  });

  it('creeping is slower and smaller but keeps a floor on its pace', () => {
    const c = weaponBob(walk * 0.3, walk, sprint, cfg);
    expect(c.stepsPerSecond).toBe(cfg.minStepsPerSecond);
    expect(c.amount).toBeCloseTo(cfg.amount * 0.3);
  });
});
