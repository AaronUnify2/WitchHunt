import { describe, it, expect } from 'vitest';
import { Combat } from '../src/combat/Combat.js';
import { Health } from '../src/player/Health.js';
import { config } from './mapFixture.js';

// Combat's floor needs only its health, hud, player, sfx and bus.
function stub() {
  const events = [];
  const c = Object.create(Combat.prototype);
  c.health = new Health(config.health, null);
  c.health.init();
  c.alive = true;
  c.godMode = false;
  c.cfg = config;
  c.hud = { hurt() {} };
  c.player = { shake() {} };
  c.sfx = { play() {} };
  c.bus = { emit: (e, d) => events.push([e, d]) };
  c.die = () => (c.alive = false);
  return { c, events };
}

describe('the scripted health floor (Session 20)', () => {
  it("holds health at the floor and tells the set piece (the crash site's 10%)", () => {
    const { c, events } = stub();
    let blackouts = 0;
    c.setHealthFloor('crashSite', 0.1, () => blackouts++);
    c.hurtPlayer(95);
    expect(c.health.value).toBe(10);
    expect(c.alive).toBe(true);
    expect(blackouts).toBe(1);
    expect(events.some(([e, d]) => e === 'player:floorHit' && d.owner === 'crashSite')).toBe(true);
    c.hurtPlayer(50);
    expect(c.health.value).toBe(10);
    expect(blackouts).toBe(2);
  });

  it('the highest floor wins; letting go lets death back in', () => {
    const { c } = stub();
    c.setHealthFloor('day1', 0.2);
    c.setHealthFloor('crashSite', 0.1);
    expect(c.healthFloor.value).toBe(20);
    c.setHealthFloor('day1', 0);
    expect(c.healthFloor.owner).toBe('crashSite');
    c.clearHealthFloor('crashSite');
    c.hurtPlayer(200);
    expect(c.alive).toBe(false);
  });
});
