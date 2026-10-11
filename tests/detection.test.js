import { describe, it, expect } from 'vitest';
import { daylightLevel, sightDistance, hearingDistance, playerSenses, notices, lineOfSight } from '../src/ai/detection.js';
import { config } from '../src/config.js';

const cfg = config.detection;

function player(over = {}) {
  return { x: 0, z: 0, eyeY: 1.7, daylight: 0, torchOn: false, crouched: false, sprinting: false, speed: 0, undergrowth: 0, ...over };
}

// A zombie standing at (x, z) facing the origin.
function zombieAt(x, z) {
  return { x, y: 0, z, facing: Math.atan2(-x, -z) };
}

describe('daylightLevel', () => {
  it('is 1 by day, 0 at night and ramps through dusk and dawn', () => {
    expect(daylightLevel('day', 0.3)).toBe(1);
    expect(daylightLevel('night', 0.3)).toBe(0);
    expect(daylightLevel('dusk', 0.25)).toBeCloseTo(0.75);
    expect(daylightLevel('dawn', 0.25)).toBeCloseTo(0.25);
  });
});

describe('sightDistance', () => {
  it('is much further by day than at night', () => {
    expect(sightDistance(player({ daylight: 1 }), cfg)).toBeCloseTo(cfg.sight.day);
    expect(sightDistance(player(), cfg)).toBeCloseTo(cfg.sight.night);
  });

  it('the torch makes you far easier to see at night, barely by day', () => {
    const night = sightDistance(player({ torchOn: true }), cfg) / sightDistance(player(), cfg);
    const day = sightDistance(player({ torchOn: true, daylight: 1 }), cfg) / sightDistance(player({ daylight: 1 }), cfg);
    expect(night).toBeGreaterThan(2);
    expect(day).toBeLessThan(1.2);
  });

  it('crouched with the light off is the hardest to see; sprinting the easiest', () => {
    const sneaking = sightDistance(player({ crouched: true }), cfg);
    const standing = sightDistance(player(), cfg);
    const sprinting = sightDistance(player({ sprinting: true }), cfg);
    expect(sneaking).toBeLessThan(standing * 0.6);
    expect(sprinting).toBeGreaterThan(standing);
  });

  it('the brush hides you, and the level widens the range', () => {
    expect(sightDistance(player({ undergrowth: 1 }), cfg)).toBeLessThan(sightDistance(player(), cfg));
    expect(sightDistance(player(), cfg, 1.4)).toBeCloseTo(sightDistance(player(), cfg) * 1.4);
  });
});

describe('hearingDistance', () => {
  it('sprinting is loud, walking quiet, crouching or standing still silent', () => {
    expect(hearingDistance(player({ speed: 7, sprinting: true }), cfg)).toBe(cfg.hearing.sprint);
    expect(hearingDistance(player({ speed: 4 }), cfg)).toBe(cfg.hearing.walk);
    expect(hearingDistance(player({ speed: 2, crouched: true }), cfg)).toBe(0);
    expect(hearingDistance(player({ speed: 0 }), cfg)).toBe(0);
  });
});

describe('notices', () => {
  it('sees a standing player at night inside the sight range, not beyond', () => {
    const s = playerSenses(player(), cfg, 1);
    expect(notices(zombieAt(0, cfg.sight.night - 1), s, cfg)).toBe(true);
    expect(notices(zombieAt(0, cfg.sight.night + 1), s, cfg)).toBe(false);
  });

  it('a crouched player in the dark can get much closer', () => {
    const s = playerSenses(player({ crouched: true }), cfg, 1);
    expect(notices(zombieAt(0, 8), s, cfg)).toBe(false);
    expect(notices(zombieAt(0, 4), s, cfg)).toBe(true);
  });

  it('sees less behind itself', () => {
    const s = playerSenses(player(), cfg, 1);
    const facingAway = { x: 0, y: 0, z: 10, facing: 0 }; // looking toward +z, player behind at the origin
    const facingUs = zombieAt(0, 10);
    expect(notices(facingUs, s, cfg)).toBe(true);
    expect(notices(facingAway, s, cfg)).toBe(false);
  });

  it('always notices at touching distance, and hears footsteps without looking', () => {
    const quiet = playerSenses(player({ crouched: true }), cfg, 1);
    expect(notices({ x: 0, y: 0, z: 2, facing: 0 }, quiet, cfg)).toBe(true);
    const running = playerSenses(player({ sprinting: true, speed: 7 }), cfg, 1);
    expect(notices({ x: 0, y: 0, z: 16, facing: 0 }, running, cfg)).toBe(true); // behind it, but heard
  });

  it('keeps a player it is chasing in sight further away', () => {
    const s = playerSenses(player(), cfg, 1);
    const z = zombieAt(0, cfg.sight.night * 1.4);
    expect(notices(z, s, cfg, false)).toBe(false);
    expect(notices(z, s, cfg, true)).toBe(true);
  });

  it('a hill between them blocks sight', () => {
    // Ground with a 6 m ridge at z = 5..7.
    const ridge = {
      heightAt: (x, z) => (z > 5 && z < 7 ? 6 : 0),
      rayDistance(origin, dir, max, step) {
        for (let t = step; t <= max; t += step / 4) {
          const x = origin.x + dir.x * t;
          const z = origin.z + dir.z * t;
          if (origin.y + dir.y * t <= this.heightAt(x, z)) return t;
        }
        return max;
      },
    };
    const s = playerSenses(player(), cfg, 1);
    expect(notices(zombieAt(0, 11), s, cfg, false, ridge)).toBe(false);
    expect(lineOfSight(0, 1.6, 11, 0, 1.7, 0)).toBe(true); // flat ground
  });
});
