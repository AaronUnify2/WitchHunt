import { describe, it, expect } from 'vitest';
import { ammoDamage, turretRoundsFor, roundsNeeded, ammoCoverage, turretSecurity, turnToward, angleBetween, pickTarget, secondsOfFire } from '../src/base/turretMath.js';
import { resolveCircles, segmentCollider, raySegment, nearestHit } from '../src/world/collision.js';
import { rayBlockers } from '../src/combat/hitscan.js';
import { HoldAction } from '../src/player/HoldAction.js';
import { config } from '../src/config.js';

const NIGHT = 360;
const T = config.station.turret;

describe('turret maths (DESIGN.md table)', () => {
  it('converts ammo by damage', () => {
    expect(ammoDamage('rifle', config.weapons, T)).toBe(25);
    expect(ammoDamage('shotgun', config.weapons, T)).toBe(48);
    expect(ammoDamage('pistol', config.weapons, T)).toBe(10);
    expect(turretRoundsFor(1, 10, 10)).toBe(1);
    expect(turretRoundsFor(1, 25, 10)).toBe(2.5);
    expect(turretRoundsFor(1, 48, 10)).toBe(4.8);
    expect(turretRoundsFor(1, 72, 10)).toBeCloseTo(7.2);
  });

  it('needs 120 / 240 / 720 rounds for a six-minute night', () => {
    expect(roundsNeeded(T.modes.slow, NIGHT)).toBe(120);
    expect(roundsNeeded(T.modes.medium, NIGHT)).toBe(240);
    expect(roundsNeeded(T.modes.fast, NIGHT)).toBe(720);
  });

  it('scores mode x coverage, capped, and nothing unpowered', () => {
    expect(ammoCoverage(360, T.modes.fast, NIGHT)).toBe(0.5);
    expect(turretSecurity(360, T.modes.fast, NIGHT, true)).toBe(10);
    expect(turretSecurity(10000, T.modes.slow, NIGHT, true)).toBe(5);
    expect(turretSecurity(10000, T.modes.fast, NIGHT, false)).toBe(0);
    expect(secondsOfFire(240, T.modes.medium)).toBe(360);
  });

  it('turns at a limited rate and picks the urgent target first', () => {
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25);
    expect(turnToward(0, 0.1, 0.25)).toBeCloseTo(0.1);
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1); // the short way round
    expect(angleBetween(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    const z = (x, extra = {}) => ({ x, z: 0, alive: true, state: 'walk', ...extra });
    const near = z(5);
    const inside = z(20, { inside: true });
    const hidden = z(2, { hidden: true });
    const list = [near, inside, hidden, z(100), z(3, { state: 'rise' })];
    const pick = pickTarget({ x: 0, z: 0 }, list, 42, (q) => !q.hidden, (q) => q.inside === true, () => false);
    expect(pick).toBe(inside);
    expect(pickTarget({ x: 0, z: 0 }, [near, hidden], 42, (q) => !q.hidden, () => false, () => false)).toBe(near);
  });
});

describe('wall pieces', () => {
  const wall = segmentCollider(-2, 0, 2, 0, 0.1, 0, 3, true);

  it('pushes a body out of a wall, but not through an open door', () => {
    const pos = { x: 0.5, z: 0.3 };
    resolveCircles(pos, 0.35, [wall]);
    expect(pos.z).toBeCloseTo(0.45);
    expect(pos.x).toBeCloseTo(0.5);
    const door = { ...wall, off: true };
    const p2 = { x: 0, z: 0.1 };
    resolveCircles(p2, 0.35, [door]);
    expect(p2.z).toBe(0.1);
  });

  it('blocks shots and the torch; chain-link does not', () => {
    const origin = { x: 0, y: 1.5, z: 5 };
    const dir = { x: 0, y: 0, z: -1 };
    expect(raySegment(origin, dir, wall)).toBeCloseTo(4.9);
    expect(rayBlockers(origin, dir, [wall], 50)).toBeCloseTo(4.9);
    const fence = segmentCollider(-2, 0, 2, 0, 0.1, 0, 2.4, false);
    expect(rayBlockers(origin, dir, [fence], 50)).toBe(50);
    const hit = nearestHit(origin, dir, [wall], 20);
    expect(hit.distance).toBeCloseTo(4.9);
    expect(hit.facing).toBeCloseTo(1);
    // Over the top of it, or past its end: no hit.
    expect(raySegment({ x: 0, y: 4, z: 5 }, dir, wall)).toBe(Infinity);
    expect(raySegment({ x: 3, y: 1.5, z: 5 }, dir, wall)).toBe(Infinity);
  });
});

describe('HoldAction', () => {
  it('completes after holding, drains on release, restarts on a new target and needs a release before the next', () => {
    const h = new HoldAction();
    h.init();
    expect(h.update(0.5, 'a', true, 1)).toBe(false);
    expect(h.update(0.1, 'a', false, 1)).toBe(false);
    expect(h.progress).toBeCloseTo(0.3); // let go: drains at twice the fill speed
    expect(h.update(0.7, 'a', true, 1)).toBe(true);
    // Still holding: nothing chains on.
    expect(h.update(2, 'b', true, 1)).toBe(false);
    expect(h.update(0.1, 'b', false, 1)).toBe(false);
    expect(h.update(0.4, 'b', true, 1)).toBe(false);
    expect(h.update(0.1, 'c', true, 1)).toBe(false);
    expect(h.progress).toBeCloseTo(0.1);
    expect(h.interrupt()).toBe(true);
    expect(h.progress).toBe(0);
  });
});
