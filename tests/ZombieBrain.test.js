import { describe, it, expect } from 'vitest';
import { ZombieBrain } from '../src/ai/ZombieBrain.js';
import { PathRoutes } from '../src/ai/pathRoutes.js';
import { playerSenses } from '../src/ai/detection.js';
import { Rng } from '../src/core/Rng.js';
import { FLAT_GROUND } from '../src/world/collision.js';
import { makeMap, config } from './mapFixture.js';

const det = config.detection;

function setup() {
  const map = makeMap(2);
  const brain = new ZombieBrain(det, config.zombies.wander, new PathRoutes(map), FLAT_GROUND, new Rng(1));
  return { map, brain };
}

function zombie(x, z, facing = 0) {
  return { x, y: 0, z, facing, alive: true };
}

function senses(over = {}) {
  return playerSenses({ x: 0, z: 0, eyeY: 1.7, daylight: 0, torchOn: false, crouched: false, sprinting: false, speed: 0, undergrowth: 0, ...over }, det, 1);
}

// Think for `seconds`.
function run(brain, z, s, seconds) {
  for (let t = 0; t < seconds; t += 0.1) {
    brain.tick(0.1);
    brain.update(z, 0.1, s);
  }
}

describe('ZombieBrain', () => {
  it('a wandering zombie that sees the player chases them', () => {
    const { brain } = setup();
    const z = zombie(0, 8, Math.PI); // facing the player at the origin
    brain.reset(z, 'wander');
    expect(z.mode).toBe('wander');
    run(brain, z, senses(), 1);
    expect(z.mode).toBe('chase');
    expect(z.pace).toBe(1);
  });

  it('wanders slower than it chases', () => {
    const { brain } = setup();
    const z = zombie(500, 500);
    brain.reset(z, 'wander');
    run(brain, z, senses(), 1);
    expect(z.mode).toBe('wander');
    expect(z.pace).toBeLessThan(1);
    expect(z.hasGoal).toBe(true);
  });

  it('loses the player, keeps after them a while, then searches, then wanders', () => {
    const { brain } = setup();
    const z = zombie(0, 8, Math.PI);
    brain.reset(z, 'wander');
    run(brain, z, senses(), 1);
    expect(z.mode).toBe('chase');
    const gone = senses({ crouched: true });
    gone.x = 200; // the player slipped away
    run(brain, z, gone, det.memorySeconds - 1);
    expect(z.mode).toBe('chase');
    run(brain, z, gone, 2);
    expect(z.mode).toBe('search');
    expect(z.goalX).toBe(0); // where it last saw them
    run(brain, z, gone, det.searchSeconds + 1);
    expect(z.mode).toBe('wander');
  });

  it('the whole pack comes when one of them sees the player', () => {
    const { brain } = setup();
    const pack = { leader: null, radius: 3 };
    const seer = zombie(0, 8, Math.PI);
    const blind = zombie(0, 60, 0); // far off and facing away
    seer.horde = pack;
    blind.horde = pack;
    pack.leader = blind;
    brain.reset(seer, 'wander');
    brain.reset(blind, 'wander');
    for (let t = 0; t < 1.5; t += 0.1) {
      brain.tick(0.1);
      brain.update(seer, 0.1, senses());
      brain.update(blind, 0.1, senses());
    }
    expect(seer.mode).toBe('chase');
    expect(blind.mode).toBe('chase');
  });

  it('pack members follow the leader while wandering', () => {
    const { brain } = setup();
    const pack = { leader: null, radius: 3 };
    const leader = zombie(300, 300, 0);
    const member = zombie(305, 300, 0);
    leader.horde = member.horde = pack;
    pack.leader = leader;
    brain.reset(leader, 'wander');
    brain.reset(member, 'wander');
    run(brain, member, senses(), 0.2);
    expect(Math.hypot(member.goalX - leader.x, member.goalZ - leader.z)).toBeLessThan(6);
    leader.alive = false;
    run(brain, member, senses(), 0.2);
    expect(pack.leader).toBe(member); // a new leader takes over
  });

  it('besieges the station when it is close and the player is not noticed (M5 hook)', () => {
    const { brain } = setup();
    const z = zombie(300, 300);
    brain.reset(z, 'wander');
    const station = { x: 320, z: 300, baseRadius: 40 };
    for (let t = 0; t < 1; t += 0.1) {
      brain.tick(0.1);
      brain.update(z, 0.1, senses(), station);
    }
    expect(z.mode).toBe('siege');
    expect(z.goalX).toBe(320);
  });
});
