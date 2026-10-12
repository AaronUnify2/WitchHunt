import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Explosives } from '../src/combat/Explosives.js';
import { hutPlacement } from '../src/world/Hut.js';
import { Weapons } from '../src/player/Weapons.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { makeMap, config } from './mapFixture.js';

const flat = { heightAt: () => 0 };

function setup() {
  const bus = new EventBus();
  bus.init();
  const hurt = [];
  const zombies = [{ x: 3, z: 0, alive: true, hp: 100 }];
  const damaged = [];
  const hut = {
    destroyed: false,
    x: 50,
    z: 0,
    destroyCalls: 0,
    distanceTo(x, z) {
      return Math.max(0, Math.hypot(x - this.x, z - this.z) - 2.9);
    },
    wallPoint(x, z) {
      const d = Math.hypot(x - this.x, z - this.z) || 1;
      return { x: this.x + ((x - this.x) / d) * 3, z: this.z + ((z - this.z) / d) * 3 };
    },
    destroy() {
      this.destroyed = true;
      this.destroyCalls++;
    },
  };
  const slots = [];
  const combat = {
    alive: true,
    inventory: { charges: 0 },
    hurtPlayer: (d) => hurt.push(d),
    sfx: { play: () => {} },
    enemies: { living: zombies, damage: (z, amount) => damaged.push(amount), alert: () => 0 },
    weapons: { id: 'rifle', setSlot: (id, on) => slots.push(on), consumeTrigger: () => false },
  };
  const player = { position: { x: 0, z: 0 }, shake: () => {}, platform: null };
  const notes = [];
  const ex = new Explosives(config, bus);
  ex.init(new THREE.Scene(), { combat, player, hut, witch: null, ground: flat, notify: (t) => notes.push(t), busy: [] });
  return { bus, ex, combat, player, hut, hurt, damaged, slots, notes };
}

describe('explosives', () => {
  it('you carry at most two, in hand and planted together', () => {
    const { ex, combat } = setup();
    expect(ex.give(5)).toBe(2);
    expect(combat.inventory.charges).toBe(2);
    ex.plant(false);
    expect(ex.give(1)).toBe(0);
  });

  it('a blast hurts what is in it, you included, less toward the edge', () => {
    const { ex, hurt, damaged } = setup();
    ex.give(1);
    ex.plant(false); // at your feet
    expect(ex.detonate()).toBe(1);
    expect(hurt.length).toBe(1);
    expect(hurt[0]).toBeCloseTo(config.explosives.playerDamage, 0);
    expect(damaged.length).toBe(1);
    expect(damaged[0]).toBeLessThan(config.explosives.damage);
    expect(damaged[0]).toBeGreaterThan(config.explosives.damage * config.explosives.edge);
    expect(ex.placed.length).toBe(0);
  });

  it('the hut takes two charges set off together; one only shakes it', () => {
    const env = setup();
    env.player.position.x = 46; // by the hut
    env.ex.give(2);
    env.ex.plant(true);
    env.player.position.x = 0;
    env.ex.detonate();
    expect(env.hut.destroyed).toBe(false);
    expect(env.notes.some((n) => n.includes('takes two'))).toBe(true);
    env.player.position.x = 46;
    env.ex.give(2);
    env.ex.plant(true);
    env.ex.plant(true);
    env.player.position.x = 0;
    env.ex.detonate();
    expect(env.hut.destroyed).toBe(true);
  });

  it('the second charge on the hut arms it (the point of no return), the first does not', () => {
    const env = setup();
    let armed = 0;
    env.bus.on('hut:armed', () => armed++);
    env.player.position.x = 46;
    env.ex.give(2);
    env.ex.plant(true);
    expect(armed).toBe(0);
    env.ex.plant(true);
    expect(armed).toBe(1);
  });

  it('the detonator is a weapon slot only while charges are out or in hand', () => {
    const env = setup();
    env.ex.update(0.1, { isDown: () => false, activeDevice: 'gamepad' }, true);
    expect(env.slots.at(-1)).toBe(false);
    env.ex.give(1);
    env.ex.update(0.1, { isDown: () => false, activeDevice: 'gamepad' }, true);
    expect(env.slots.at(-1)).toBe(true);
    // Real weapons: the slot comes and goes; taking it from your hand switches back.
    const bus = new EventBus();
    bus.init();
    const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, new Rng(1), bus);
    w.reset();
    w.setSlot('detonator', true);
    expect(w.order).toContain('detonator');
    w.select(w.order.indexOf('detonator'));
    expect(w.id).toBe('detonator');
    w.setSlot('detonator', false);
    expect(w.order).not.toContain('detonator');
    expect(w.id).toBe(config.weapons.startingWeapon);
  });

  it('holding X by the hut plants a charge on its wall', () => {
    const env = setup();
    env.ex.give(1);
    env.player.position.x = 46;
    const input = { isDown: (a) => a === 'interact', activeDevice: 'gamepad' };
    for (let t = 0; t < config.explosives.plantSeconds + 0.2; t += 0.1) env.ex.update(0.1, input, true);
    expect(env.ex.placed.length).toBe(1);
    expect(env.ex.placed[0].onHut).toBe(true);
    expect(Math.hypot(env.ex.placed[0].x - 50, env.ex.placed[0].z)).toBeCloseTo(3, 1);
  });
});

describe('the hut', () => {
  for (const seed of [3, 11, 1234]) {
    it(`seed ${seed}: it stands in its clearing with the door toward the way in`, () => {
      const map = makeMap(seed);
      const c = map.clearings[map.hutIndex];
      const h = hutPlacement(map, config.hut);
      expect(Math.hypot(h.x - c.x, h.z - c.z)).toBeLessThan(1e-6);
      // The door is outside the walls and on the side the pathway leaves from.
      expect(Math.hypot(h.door.x - h.x, h.door.z - h.z)).toBeGreaterThan(config.hut.colliderRadius);
      const path = map.paths.find((p) => p.a === map.hutIndex || p.b === map.hutIndex);
      const far = path.a === map.hutIndex ? path.points[path.points.length - 1] : path.points[0];
      expect(Math.hypot(h.door.x - far.x, h.door.z - far.z)).toBeLessThan(Math.hypot(h.x - far.x, h.z - far.z));
    });
  }
});

describe('saving charges (step 6)', () => {
  it('charges carried and planted come back; junk and older saves are safe', () => {
    const a = setup();
    a.ex.give(2);
    a.player.position.x = 46;
    a.ex.plant(true);
    const saved = JSON.parse(JSON.stringify(a.ex.saveState()));
    const b = setup();
    b.ex.loadState(saved);
    expect(b.combat.inventory.charges).toBe(1);
    expect(b.ex.placed.length).toBe(1);
    expect(b.ex.placed[0].onHut).toBe(true);
    // Never more than the carry limit, whatever the save says.
    const c = setup();
    c.ex.loadState({ carried: 9, placed: [[1, 2, 0], [3, 4, 1], [5, 6, 0], ['x', 1, 0]] });
    expect(c.ex.placed.length + c.combat.inventory.charges).toBeLessThanOrEqual(config.explosives.carryMax);
    const d = setup();
    d.ex.loadState(undefined);
    expect(d.combat.inventory.charges).toBe(0);
  });
});
