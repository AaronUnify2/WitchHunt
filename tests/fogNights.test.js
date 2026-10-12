import { describe, it, expect } from 'vitest';
import { isFogNight, fogNightAmount } from '../src/world/fogNights.js';
import { config } from '../src/config.js';

const cfg = config.fog.nights;

describe('isFogNight', () => {
  it('never fogs the tutorial night', () => {
    for (let seed = 0; seed < 200; seed++) expect(isFogNight(seed, 1, cfg)).toBe(false);
  });

  it('is the same for the same seed and night', () => {
    for (let night = 1; night < 12; night++) expect(isFogNight('abc', night, cfg)).toBe(isFogNight('abc', night, cfg));
  });

  it('fogs about the configured share of nights', () => {
    let foggy = 0;
    let total = 0;
    for (let seed = 0; seed < 300; seed++) {
      for (let night = cfg.firstNight; night < cfg.firstNight + 10; night++) {
        total++;
        if (isFogNight(seed, night, cfg)) foggy++;
      }
    }
    expect(foggy / total).toBeGreaterThan(cfg.chance - 0.05);
    expect(foggy / total).toBeLessThan(cfg.chance + 0.05);
  });
});

describe('fogNightAmount', () => {
  const night3 = (n) => n === 3;

  it('rolls in through dusk and holds through the night and dawn', () => {
    expect(fogNightAmount('dusk', 0, 3, night3, cfg)).toBe(0);
    expect(fogNightAmount('dusk', 0.5, 3, night3, cfg)).toBeCloseTo(0.5);
    expect(fogNightAmount('dusk', 1, 3, night3, cfg)).toBe(1);
    expect(fogNightAmount('night', 0.4, 3, night3, cfg)).toBe(1);
    expect(fogNightAmount('dawn', 0.9, 3, night3, cfg)).toBe(1);
  });

  it('lifts over the first part of the next day', () => {
    expect(fogNightAmount('day', 0, 4, night3, cfg)).toBe(1);
    const mid = fogNightAmount('day', cfg.liftDayFraction / 2, 4, night3, cfg);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(fogNightAmount('day', cfg.liftDayFraction, 4, night3, cfg)).toBe(0);
    expect(fogNightAmount('day', 0.9, 4, night3, cfg)).toBe(0);
  });

  it('stays clear on a clear night', () => {
    for (const phase of ['day', 'dusk', 'night', 'dawn']) expect(fogNightAmount(phase, 0.5, 5, night3, cfg)).toBe(0);
    // Day 3 comes before night 3, so it's clear too.
    expect(fogNightAmount('day', 0.05, 3, night3, cfg)).toBe(0);
  });
});
