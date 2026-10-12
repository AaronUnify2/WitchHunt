// Fog nights (Session 10, Aaron): about one night in three the fog rolls
// in thick, Silent Hill style. Which nights are foggy comes from the seed
// and the night number alone, so a map always has the same fog nights and
// nothing needs saving. Night 1 (the tutorial night) is always clear.
// Pure: no three.js, so it's testable.

import { Rng } from '../core/Rng.js';

// cfg: config.fog.nights.
export function isFogNight(seed, night, cfg) {
  if (night < cfg.firstNight) return false;
  return new Rng(`${seed}:fog-night:${night}`).next() < cfg.chance;
}

function smooth(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

// How thick the fog-night fog is now, 0..1. Night N follows day N (its
// dusk and the dawn after it count as night N). It rolls in through dusk,
// holds all night and through dawn, and lifts over the first part of the
// next morning. foggy(night) -> boolean.
export function fogNightAmount(phase, progress, day, foggy, cfg) {
  switch (phase) {
    case 'dusk':
      return foggy(day) ? smooth(progress) : 0;
    case 'night':
    case 'dawn':
      return foggy(day) ? 1 : 0;
    case 'day':
      return foggy(day - 1) ? 1 - smooth(progress / cfg.liftDayFraction) : 0;
    default:
      return 0;
  }
}
