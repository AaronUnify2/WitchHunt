import { describe, it, expect } from 'vitest';
import { aimSlowdown } from '../src/combat/aimAssist.js';
import { WeaponState } from '../src/combat/WeaponState.js';

const assist = { maxDistance: 40, marginDegrees: 2, fadeDegrees: 4, slowFactor: 0.4 };
const origin = { x: 0, y: 1.7, z: 0 };
const forward = { x: 0, y: 0, z: -1 };

describe('aimSlowdown', () => {
  it('is 1 with no targets', () => {
    expect(aimSlowdown(origin, forward, [], assist)).toBe(1);
  });

  it('slows fully with the crosshair on a target', () => {
    expect(aimSlowdown(origin, forward, [{ x: 0, y: 1.7, z: -10, r: 0.4 }], assist)).toBeCloseTo(0.4);
  });

  it('fades out away from the target and is off beyond the fade', () => {
    const at = (deg) => {
      const a = (deg * Math.PI) / 180;
      return [{ x: Math.sin(a) * 10, y: 1.7, z: -Math.cos(a) * 10, r: 0.4 }];
    };
    const inner = (Math.atan(0.04) * 180) / Math.PI + 2;
    const mid = aimSlowdown(origin, forward, at(inner + 2), assist);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(1);
    expect(aimSlowdown(origin, forward, at(inner + 4.5), assist)).toBe(1);
  });

  it('ignores targets behind or out of range', () => {
    expect(aimSlowdown(origin, forward, [{ x: 0, y: 1.7, z: 10, r: 0.4 }], assist)).toBe(1);
    expect(aimSlowdown(origin, forward, [{ x: 0, y: 1.7, z: -50, r: 0.4 }], assist)).toBe(1);
  });

  it('uses the strongest of several targets', () => {
    const targets = [
      { x: 5, y: 1.7, z: -5, r: 0.4 },
      { x: 0, y: 1.7, z: -8, r: 0.4 },
    ];
    expect(aimSlowdown(origin, forward, targets, assist)).toBeCloseTo(0.4);
  });
});

const rifle = { magSize: 5, startReserve: 7, fireInterval: 0.5, reloadSeconds: 2, reloadStyle: 'magazine' };
const shotgun = { magSize: 4, startReserve: 8, fireInterval: 0.9, reloadSeconds: 0.5, reloadStyle: 'single' };
const shovel = { magSize: 0, fireInterval: 0.7 };

function weapon(cfg) {
  const w = new WeaponState(cfg);
  w.init();
  return w;
}

describe('WeaponState', () => {
  it('fires, then waits for the fire interval', () => {
    const w = weapon(rifle);
    expect(w.fire()).toBe(true);
    expect(w.mag).toBe(4);
    expect(w.fire()).toBe(false);
    w.update(0.5);
    expect(w.fire()).toBe(true);
  });

  it('runs dry and reloads a magazine from reserve', () => {
    const w = weapon(rifle);
    for (let i = 0; i < 5; i++) {
      w.fire();
      w.update(0.5);
    }
    expect(w.mag).toBe(0);
    expect(w.fire()).toBe(false);
    expect(w.startReload()).toBe(true);
    expect(w.fire()).toBe(false); // can't fire mid magazine reload
    w.update(1.9);
    expect(w.mag).toBe(0);
    expect(w.update(0.2)).toBe(true);
    expect(w.mag).toBe(5);
    expect(w.reserve).toBe(2);
  });

  it('only loads what the reserve has', () => {
    const w = weapon(rifle);
    w.init(0, 3);
    w.startReload();
    w.update(2);
    expect(w.mag).toBe(3);
    expect(w.reserve).toBe(0);
    expect(w.canReload).toBe(false);
  });

  it('will not reload a full magazine or with no reserve', () => {
    expect(weapon(rifle).startReload()).toBe(false);
    const w = weapon(rifle);
    w.init(2, 0);
    expect(w.startReload()).toBe(false);
  });

  it('loads shells one at a time and firing interrupts', () => {
    const w = weapon(shotgun);
    w.init(1, 8);
    w.startReload();
    w.update(0.5);
    expect(w.mag).toBe(2);
    expect(w.reloading).toBe(true);
    w.update(0.5);
    expect(w.mag).toBe(3);
    expect(w.fire()).toBe(true);
    expect(w.reloading).toBe(false);
    expect(w.mag).toBe(2);
    expect(w.reserve).toBe(6);
  });

  it('shell reload stops when full', () => {
    const w = weapon(shotgun);
    w.init(2, 8);
    w.startReload();
    w.update(0.5);
    w.update(0.5);
    expect(w.mag).toBe(4);
    expect(w.reloading).toBe(false);
  });

  it('melee needs no ammo, only the swing cooldown', () => {
    const w = weapon(shovel);
    expect(w.fire()).toBe(true);
    expect(w.fire()).toBe(false);
    w.update(0.7);
    expect(w.fire()).toBe(true);
    expect(w.canReload).toBe(false);
  });
});
