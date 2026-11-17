// Nov 16: the campground's arrival sweep plays before any of the dead round the fire could notice Tom.
import { describe, it, expect } from 'vitest';
import { noticeReach, sightDistance, hearingDistance } from '../src/ai/detection.js';
import { levelStats, MAX_LEVEL } from '../src/ai/zombieLevels.js';
import { Campsite } from '../src/encounters/Campsite.js';
import { clearingFrame, frameToWorld } from '../src/world/clearingFrame.js';
import campsite from '../src/data/campsite.json';
import { makeMap, config } from './mapFixture.js';

const det = config.detection;

describe('noticeReach', () => {
  it('is at least every sight and hearing range the model can give', () => {
    const reach = noticeReach(det, 1);
    for (let i = 0; i <= 10; i++) {
      for (const torchOn of [false, true]) {
        for (const sprinting of [false, true]) {
          expect(reach).toBeGreaterThanOrEqual(sightDistance({ daylight: i / 10, torchOn, crouched: false, sprinting, undergrowth: 0 }, det, 1));
        }
      }
    }
    expect(reach).toBeGreaterThanOrEqual(hearingDistance({ crouched: false, sprinting: true, speed: 9 }, det, 1));
    expect(reach).toBeGreaterThanOrEqual(det.touch);
  });

  it('grows with the level', () => {
    expect(noticeReach(det, 1.4)).toBeCloseTo(noticeReach(det, 1) * 1.4, 5);
  });
});

describe('the campground arrival sweep', () => {
  const frame = clearingFrame(makeMap(77), 'campsite', 'home');
  const site = (level) => {
    const s = Object.create(Campsite.prototype);
    s.data = campsite;
    s.frame = frame;
    s.enemies = { detCfg: det, stats: levelStats(config.zombies.levels, level) };
    return s;
  };

  for (const level of [1, MAX_LEVEL]) {
    it(`plays before any of them could notice him, with a margin (level ${level})`, () => {
      const s = site(level);
      const fire = s.fireSpot();
      const arrive = s.fireArriveDistance();
      const reach = noticeReach(det, s.enemies.stats.notice);
      for (const [x, z] of campsite.fireGroup.spots) {
        const w = frameToWorld(frame, x, z);
        // the closest he can be to this one when the sweep plays
        const closest = arrive - Math.hypot(w.x - fire.x, w.z - fire.z);
        expect(closest).toBeGreaterThanOrEqual(reach + campsite.fireGroup.arriveBuffer - 1e-9);
      }
      // and they're standing there before then
      expect(s.fireSpawnDistance()).toBeGreaterThan(arrive);
    });
  }
});

describe('the arrival check on a campground already done (Nov 17)', () => {
  // Skip intro, a debug story start and a loaded save mark the dead at the fire as sent and cleared, with none
  // placed: the check read fireAt.x of nothing every frame and the frame loop stopped drawing.
  it("doesn't throw, and says no, when none were ever placed", () => {
    const s = Object.create(Campsite.prototype);
    Object.assign(s, { fireSent: true, fireCleared: true, fireAwake: false, fireAt: undefined });
    expect(() => s.nearFire({ x: 0, z: 0 })).not.toThrow();
    expect(s.nearFire({ x: 0, z: 0 })).toBe(false);
  });
});
