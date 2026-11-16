// Nov 16 (Aaron): the Screamer's wind while it screams, and its snake strike.
import { describe, it, expect } from 'vitest';
import { Screamers } from '../src/ai/Screamers.js';
import { config } from '../src/config.js';
import { ZOMBIE_FRAMES } from '../src/ai/Zombie.js';

function setup(px, pz) {
  const pushes = [];
  const strikes = [];
  const player = { position: { x: px, y: 0, z: pz }, push: (x, z) => pushes.push([x, z]), shake() {} };
  const z = { x: 0, z: 0, alive: true, state: 'walk', mode: 'linger', screamT: 0, health: 800, maxHealth: 800, facing: 0 };
  const enemies = {
    spawnZombie: () => z,
    living: [],
    spawnPlanned() {},
    formMarch() {},
    brain: { chase: (q) => (q.mode = 'chase'), reset() {} },
    onStrike: (q, b, hit) => strikes.push(hit),
  };
  const bus = { on: () => () => {}, emit() {} };
  const s = new Screamers(config, bus);
  s.init({ enemies, world: { variantMixAt: () => ({}) }, station: { layout: { centre: { x: 500, z: 500 } } }, player, sfx: null, shake() {} });
  const entry = s.spawn(0, 0);
  return { s, entry, z, player, pushes, strikes };
}

describe('the Screamer (Nov 16)', () => {
  it('blasts him back while it screams, hardest up close, and not beyond its range', () => {
    const near = setup(0, 11); // (outside wakeAt: closer, it comes in rather than screams)
    near.entry.t = 0.01;
    near.s.update(0.05, true); // it screams
    near.s.update(0.05, true);
    const n = near.pushes.reduce((a, [, z]) => a + z, 0);
    expect(n).toBeGreaterThan(0); // away from it (+z)
    const far = setup(0, 24);
    far.entry.t = 0.01;
    far.s.update(0.05, true);
    far.s.update(0.05, true);
    const f = far.pushes.reduce((a, [, z]) => a + z, 0);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(n);
    const out = setup(0, config.screamer.wind.range + 5);
    out.entry.t = 0.01;
    out.s.update(0.05, true);
    out.s.update(0.05, true);
    expect(out.pushes).toHaveLength(0);
  });

  it('rears (the tell), lunges a long way in a blink with its neck out, and hangs there after', () => {
    const st = config.screamer.strike;
    expect(st.rear).toBeGreaterThanOrEqual(0.45);
    const { s, entry, z, strikes } = setup(0, 4);
    entry.comingIn = true;
    z.mode = 'chase';
    s.update(0.016, true);
    expect(z.state).toBe('move');
    expect(z.move.kind).toBe('snake');
    expect(z.stretch).toBeGreaterThan(1);
    for (let t = 0; t < st.rear + 0.05; t += 0.016) s.update(0.016, true);
    expect(z.move.phase).toBe('lunge');
    for (let t = 0; t < st.lunge + 0.05; t += 0.016) s.update(0.016, true);
    expect(strikes).toHaveLength(1);
    expect(z.z).toBeGreaterThan(2.5); // it covered most of the 4 m to him
    expect(entry.strike.phase).toBe('recover');
    for (let t = 0; t < st.recover + 0.05; t += 0.016) s.update(0.016, true);
    expect(z.state).toBe('walk');
    expect(z.stretch).toBe(1);
  });

  it('has its own frames in the atlas for the strike', () => {
    expect(ZOMBIE_FRAMES.strikeRear).toBeLessThan(ZOMBIE_FRAMES.count);
    expect(ZOMBIE_FRAMES.strikeLunge).toBeLessThan(ZOMBIE_FRAMES.count);
  });
});
