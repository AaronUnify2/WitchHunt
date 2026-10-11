import { describe, it, expect } from 'vitest';
import { Armour } from '../src/player/Armour.js';
import { Health } from '../src/player/Health.js';

const armourCfg = {
  types: { ballistic: { max: 100 }, energy: { max: 100 }, nature: { max: 100 } },
  damageOrder: ['ballistic', 'energy', 'nature'],
};
const healthCfg = { max: 100, start: 100, healPerSecond: 10 };

function make() {
  const armour = new Armour(armourCfg);
  armour.init();
  const health = new Health(healthCfg, armour);
  health.init();
  return { armour, health };
}

describe('Armour', () => {
  it('starts empty and stacks pickups up to the bar max', () => {
    const { armour } = make();
    expect(armour.total).toBe(0);
    armour.add('ballistic', 40);
    armour.add('ballistic', 40);
    expect(armour.get('ballistic')).toBe(80);
    expect(armour.add('ballistic', 40)).toBe(20);
    expect(armour.get('ballistic')).toBe(100);
  });

  it('soaks damage ballistic, then energy, then nature, then health', () => {
    const { armour, health } = make();
    armour.add('ballistic', 10);
    armour.add('energy', 10);
    armour.add('nature', 10);
    expect(health.takeDamage(25)).toEqual({ absorbed: 25, taken: 0 });
    expect(armour.get('ballistic')).toBe(0);
    expect(armour.get('energy')).toBe(0);
    expect(armour.get('nature')).toBe(5);
    expect(health.takeDamage(15)).toEqual({ absorbed: 5, taken: 10 });
    expect(health.value).toBe(90);
  });

  it('follows the configured order', () => {
    const armour = new Armour({ ...armourCfg, damageOrder: ['nature', 'ballistic', 'energy'] });
    armour.init();
    armour.add('ballistic', 10);
    armour.add('nature', 10);
    expect(armour.absorb(15)).toBe(0);
    expect(armour.get('nature')).toBe(0);
    expect(armour.get('ballistic')).toBe(5);
  });
});

describe('Health', () => {
  it('dies at zero and ignores damage after death', () => {
    const { health } = make();
    expect(health.takeDamage(150).taken).toBe(100);
    expect(health.dead).toBe(true);
    expect(health.takeDamage(10).taken).toBe(0);
    expect(health.queueHeal(30)).toBe(false);
  });

  it('heals one point at a time at 10 per second', () => {
    const { health } = make();
    health.takeDamage(50);
    health.queueHeal(30);
    health.update(1);
    expect(health.value).toBe(60);
    health.update(0.05);
    expect(health.value).toBe(60); // half a point isn't a point
    health.update(0.05);
    expect(health.value).toBe(61);
    health.update(5);
    expect(health.value).toBe(80); // a kit heals 30, no more
    expect(health.healing).toBe(false);
  });

  it('queues a second kit instead of stacking', () => {
    const { health } = make();
    health.takeDamage(90);
    health.queueHeal(30);
    health.queueHeal(30);
    expect(health.pendingHeal).toBe(60);
    health.update(3);
    expect(health.value).toBe(40);
    expect(health.healing).toBe(true);
    health.update(3);
    expect(health.value).toBe(70);
    expect(health.healing).toBe(false);
  });

  it('stops at max and loses the leftovers', () => {
    const { health } = make();
    health.takeDamage(20);
    health.queueHeal(30);
    health.queueHeal(30);
    health.update(10);
    expect(health.value).toBe(100);
    expect(health.healing).toBe(false);
    expect(health.queueHeal(30)).toBe(false); // nothing to heal at full health
  });

  it('keeps healing through damage', () => {
    const { health } = make();
    health.takeDamage(50);
    health.queueHeal(30);
    health.update(1);
    health.takeDamage(10);
    health.update(2);
    expect(health.value).toBe(70);
  });
});
