// Session 27, batch 2: the railroad spike maul (config.weapons.spikeMaul, player/Weapons.js's
// cleave, combat/hitscan.js meleeTargets, player/ViewModel.js's smash).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { Weapons } from '../src/player/Weapons.js';
import { meleeTargets, meleeTarget } from '../src/combat/hitscan.js';
import { smashPose } from '../src/player/ViewModel.js';
import { slotOf } from '../src/player/loadout.js';

const maul = config.weapons.spikeMaul;
const shovel = config.weapons.shovel;
const sm = config.viewModel.smash;
const zombie = (x, z, r = 0.4) => ({ x, z, y: 0, hitRadius: r, alive: true });

describe('the spike maul as a weapon', () => {
  it('is slower than the shovel and hits much harder', () => {
    expect(maul.kind).toBe('melee');
    expect(maul.fireInterval).toBeGreaterThan(shovel.fireInterval * 1.4);
    expect(maul.damage).toBeGreaterThanOrEqual(shovel.damage * 3);
    expect(maul.damage).toBeGreaterThanOrEqual(config.zombies?.health ?? 60); // a level 1 citizen in one
    expect(maul.knockback).toBeGreaterThan(shovel.knockback);
    expect(maul.noise).toBeGreaterThan(shovel.noise);
  });

  it('connects at the bottom of its drop', () => {
    expect(Math.abs(maul.hitDelay - sm.strike * sm.seconds)).toBeLessThan(0.05);
    expect(maul.hitDelay).toBeLessThan(maul.fireInterval);
  });

  it('takes the melee slot and sits in the melee rotation and the cross\'s melee bar', () => {
    expect(slotOf(config.weapons.loadout, 'spikeMaul')).toBe('melee');
    expect(config.weapons.rotation.find((r) => r.id === 'melee').weapons).toContain('spikeMaul');
    expect(config.weapons.cross.melee).toContain('spikeMaul');
  });
});

describe('the cleave', () => {
  it('finds everything in the arc, nearest first, at most `max`', () => {
    const eye = { x: 0, y: 1.6, z: 0 };
    const near = zombie(0, 1.2);
    const mid = zombie(0.6, 1.8);
    const far = zombie(-0.5, 2.2);
    const behind = zombie(0, -1.5);
    const away = zombie(0, 4);
    const hits = meleeTargets(eye, 0, 1, [far, behind, mid, near, away], maul.reach, (maul.arcDegrees * Math.PI) / 180, 3);
    expect(hits).toEqual([near, mid, far]);
    expect(meleeTargets(eye, 0, 1, [far, mid, near], maul.reach, (maul.arcDegrees * Math.PI) / 180, 2)).toEqual([near, mid]);
    // The single-target test agrees on the best when there's one.
    expect(meleeTarget(eye, 0, 1, [behind, near], maul.reach, (maul.arcDegrees * Math.PI) / 180)).toBe(near);
  });

  it('a swing lands on each in turn, each further one taking less; a miss thuds', () => {
    const events = [];
    const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, { emit: (n, d) => events.push([n, d]) });
    w.reset();
    w.take('spikeMaul');
    w.selectId('spikeMaul');
    w.eye = new THREE.Vector3(0, 1.6, 0);
    w.forward = new THREE.Vector3(0, 0, 1);
    const shakes = [];
    w.player = { shake: (a) => shakes.push(a) };
    const crowd = [zombie(0, 1.2), zombie(0.5, 1.7), zombie(-0.4, 2.1), zombie(0.1, 2.3)];
    w.targets = () => crowd;
    const dealt = [];
    w.applyHit = (t, dmg) => {
      dealt.push(dmg);
      return false;
    };
    w.meleeTimer = 0.01;
    w.updateMelee(0.02);
    expect(dealt.length).toBe(maul.cleave);
    expect(dealt[0]).toBeCloseTo(maul.damage, 6);
    expect(dealt[1]).toBeCloseTo(maul.damage * maul.cleaveKeep, 6);
    expect(dealt[2]).toBeCloseTo(maul.damage * maul.cleaveKeep * maul.cleaveKeep, 6);
    expect(shakes).toEqual([maul.shake]);
    const hits = events.filter(([n]) => n === 'weapon:hit').map(([, d]) => d);
    expect(hits.map((h) => h.first)).toEqual([true, false, false]);
    expect(hits.every((h) => h.id === 'spikeMaul' && h.melee)).toBe(true);
    // Nothing in reach: the head into the ground.
    events.length = 0;
    w.targets = () => [];
    w.meleeTimer = 0.01;
    w.updateMelee(0.02);
    expect(events.map(([n]) => n)).toEqual(['weapon:thud']);
    expect(shakes.at(-1)).toBe(maul.thudShake);
  });

  it('slows Tom longer after a swing than the shovel does', () => {
    expect(maul.slowSeconds).toBeGreaterThan(config.weapons.fireSlowSeconds);
  });
});

describe("the maul's smash", () => {
  it('starts and ends at rest, lifts high, then lands low in the middle', () => {
    expect(smashPose(sm, 0)).toEqual(expect.objectContaining({ pitch: sm.rest.pitch, y: sm.rest.y }));
    expect(smashPose(sm, 1)).toEqual(sm.rest);
    const top = smashPose(sm, sm.windup);
    expect(top.pitch).toBeCloseTo(sm.raised.pitch, 6);
    const landed = smashPose(sm, sm.strike);
    expect(landed.pitch).toBeCloseTo(sm.down.pitch, 6);
    expect(sm.raised.pitch).toBeGreaterThan(sm.rest.pitch); // raised back past rest
    expect(sm.down.pitch).toBeLessThan(0); // head down in front
  });

  it('drops faster than it lifts (falling), and moves smoothly through the whole swing', () => {
    const dt = 0.005;
    let last = smashPose(sm, 0);
    let biggestLift = 0;
    let biggestDrop = 0;
    for (let t = dt; t <= 1; t += dt) {
      const p = smashPose(sm, t);
      const d = p.pitch - last.pitch;
      if (t <= sm.windup) biggestLift = Math.max(biggestLift, d);
      else if (t <= sm.strike) biggestDrop = Math.max(biggestDrop, -d);
      // No jumps anywhere but the impact's jolt (y only).
      expect(Math.abs(p.pitch - last.pitch), `t ${t.toFixed(3)}`).toBeLessThan(0.25); // the drop is fast, but no jumps
      expect(Math.abs(p.yaw - last.yaw)).toBeLessThan(0.05);
      last = p;
    }
    expect(biggestDrop).toBeGreaterThan(biggestLift * 2);
  });
});
