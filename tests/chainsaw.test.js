// Session 28, batch 2: the chainsaw (combat/Chainsaw.js, combat/chainsawState.js, config.chainsaw).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { EventBus } from '../src/core/EventBus.js';
import { newSaw, stepSaw, sharpScale, biteOf, sawMove, edgeWord, sharpenOffer } from '../src/combat/chainsawState.js';
import { Chainsaw } from '../src/combat/Chainsaw.js';
import { slotOf } from '../src/player/loadout.js';

const sc = config.chainsaw;
const run = (s, seconds, opts, dt = 0.05) => {
  const seen = { stalled: 0, restarted: 0 };
  for (let t = 0; t < seconds; t += dt) {
    const o = stepSaw(s, sc, dt, opts);
    if (o.stalled) seen.stalled++;
    if (o.restarted) seen.restarted++;
  }
  return seen;
};

describe("the chainsaw's state", () => {
  it('spins up before it bites, and spins down when the trigger is let go', () => {
    const s = newSaw(sc, 1);
    expect(stepSaw(s, sc, sc.spinUp * 0.5, { trigger: true }).biting).toBe(false);
    expect(stepSaw(s, sc, sc.spinUp * 0.6, { trigger: true }).biting).toBe(true);
    run(s, sc.spinDown + 0.1, { trigger: false });
    expect(s.rev).toBe(0);
  });

  it('overheats if held, stalls, and will not start again until it has cooled', () => {
    const s = newSaw(sc, 1);
    const seen = run(s, 1 / sc.heat.rev + 0.5, { trigger: true });
    expect(seen.stalled).toBe(1);
    expect(s.stalled).toBe(true);
    expect(stepSaw(s, sc, 0.05, { trigger: true }).biting).toBe(false); // the trigger does nothing
    expect(s.heat).toBeGreaterThan(sc.heat.restartAt);
    const cooled = run(s, (1 - sc.heat.restartAt) / sc.heat.coolInHand + 0.5, { trigger: false });
    expect(cooled.restarted).toBe(1);
    expect(s.stalled).toBe(false);
  });

  it('heats faster in a cut than revving in the air, and gives several seconds of either', () => {
    expect(sc.heat.cut).toBeGreaterThan(sc.heat.rev);
    expect(1 / sc.heat.cut).toBeGreaterThan(3.5);
    expect(1 / sc.heat.rev).toBeLessThan(14);
  });

  it('only dulls while it is cutting, and a dull chain cuts slower and holds them less', () => {
    const s = newSaw(sc, 1);
    run(s, 3, { trigger: true });
    expect(s.sharp).toBe(1);
    s.heat = 0;
    run(s, 3, { trigger: true, cutting: true });
    expect(s.sharp).toBeLessThan(1);
    expect(sharpScale(sc, 0)).toBe(sc.dullDamage);
    expect(sharpScale(sc, 1)).toBe(1);
    expect(biteOf(sc, 0).damage).toBeLessThan(biteOf(sc, 1).damage * 0.5);
    expect(biteOf(sc, 0).stagger).toBeLessThan(biteOf(sc, 1).stagger);
  });

  it('is found worn (it has been in a man), and lasts a good while from sharp', () => {
    expect(newSaw(sc).sharp).toBe(sc.wear.foundAt);
    expect(sc.wear.foundAt).toBeLessThan(0.8);
    expect(1 / sc.wear.cut).toBeGreaterThan(30);
  });

  it('kills a level 1 citizen in well under a second when sharp, and takes over twice as long dull', () => {
    const hp = config.enemies?.health ?? config.zombies?.health ?? 60;
    const bites = (sharp) => Math.ceil(hp / biteOf(sc, sharp).damage);
    expect(bites(1) * sc.tick).toBeLessThan(0.6);
    expect(bites(0)).toBeGreaterThan(bites(1) * 2);
  });

  it('slows Tom while it revs, and more in a cut', () => {
    const s = newSaw(sc, 1);
    expect(sawMove(sc, s, false)).toBe(1);
    s.rev = 1;
    expect(sawMove(sc, s, false)).toBe(sc.move);
    expect(sawMove(sc, s, true)).toBe(sc.cutMove);
    expect(sc.cutMove).toBeLessThan(sc.move);
  });

  it('names its edge', () => {
    expect(edgeWord(1)).toBe('sharp');
    expect(edgeWord(sc.wear.foundAt)).toBe('good');
    expect(edgeWord(0.1)).toBe('dull');
  });

  it('is offered a sharpening when it needs one and there is the scrap', () => {
    const bench = { scrap: 3, fullAt: 0.95 };
    expect(sharpenOffer(bench, 1, 10)).toEqual({ needed: false, cost: 3, can: false });
    expect(sharpenOffer(bench, 0.4, 2).can).toBe(false);
    expect(sharpenOffer(bench, 0.4, 3).can).toBe(true);
  });
});

// A chainsaw in a fake world: one zombie in front of Tom.
function rig({ zombieAt = 1.2, hp = 60 } = {}) {
  const bus = new EventBus();
  const alerts = [];
  const played = [];
  const zombie = { x: 0, z: zombieAt, y: 0, hitRadius: 0.4, hp, alive: true, facing: Math.PI };
  const weapons = {
    id: 'chainsaw',
    requireRelease: false,
    switchProgress: 1,
    eye: { x: 0, y: 1.6, z: 0 },
    forward: { x: 0, y: 0, z: 1 },
    right: { x: 1, y: 0, z: 0 },
    has: (id) => id === 'chainsaw',
    targets: () => (zombie.alive ? [zombie] : []),
    applyHit: (t, amount) => {
      t.hp -= amount;
      if (t.hp <= 0) t.alive = false;
      return !t.alive;
    },
  };
  const player = { position: { x: 0, z: 0 }, moveMultiplier: 1, shake() {}, kick() {} };
  const combat = { weapons, alive: true, sfx: { play: (n) => played.push(n), saw: (on, rev, load) => (combat.sawNote = { on, rev, load }) }, giveWeapon() {} };
  const saw = new Chainsaw(config, bus);
  const notes = [];
  saw.init({ combat, player, enemies: { alert: (x, z, r) => alerts.push(r) }, fx: { dust() {} }, notify: (t) => notes.push(t) });
  const input = { down: false, pressed: false, isDown: () => input.down, wasPressed: () => input.pressed };
  const step = (seconds, dt = 1 / 30) => {
    for (let t = 0; t < seconds; t += dt) {
      player.moveMultiplier = 1;
      saw.update(dt, input, true);
    }
  };
  return { bus, saw, weapons, player, combat, zombie, alerts, played, notes, input, step };
}

describe('the chainsaw in hand', () => {
  it('is a melee weapon in the rotation and on the cross, held with its own kind', () => {
    expect(config.weapons.chainsaw.kind).toBe('saw');
    expect(slotOf(config.weapons.loadout, 'chainsaw')).toBe('melee');
    expect(config.weapons.rotation.find((k) => k.id === 'melee').weapons).toContain('chainsaw');
    expect(config.weapons.cross.melee).toContain('chainsaw');
  });

  it('cuts down what is in front of it while RT is held, and not before it has spun up', () => {
    const r = rig();
    r.saw.state.sharp = 1;
    r.input.down = true;
    r.step(sc.spinUp * 0.8);
    expect(r.zombie.hp).toBe(60);
    r.step(0.6);
    expect(r.zombie.alive).toBe(false);
    expect(r.played).toContain('chainsawRev');
    expect(r.played).not.toContain('swing');
  });

  it('does nothing to something out of reach', () => {
    const r = rig({ zombieAt: sc.reach + 1.5 });
    r.input.down = true;
    r.step(1.5);
    expect(r.zombie.hp).toBe(60);
    expect(r.saw.cutting).toBe(false);
  });

  it('is heard a long way off while it revs, and only close by while it idles', () => {
    const r = rig({ zombieAt: 50 });
    r.step(1.5);
    expect(Math.max(...r.alerts)).toBe(sc.noise.idle);
    r.input.down = true;
    r.step(1.5);
    expect(Math.max(...r.alerts)).toBe(sc.noise.rev);
    expect(sc.noise.rev).toBeGreaterThan(config.weapons.spikeMaul.noise * 4);
  });

  it('slows Tom while it revs', () => {
    const r = rig({ zombieAt: 50 });
    r.input.down = true;
    r.step(1);
    expect(r.player.moveMultiplier).toBe(sc.move);
  });

  it('stalls when it overheats, says so, and cuts nothing until it has cooled', () => {
    const r = rig({ hp: 1e9 });
    r.input.down = true;
    r.step(1 / sc.heat.cut + 1.5);
    expect(r.saw.state.stalled).toBe(true);
    expect(r.played).toContain('chainsawStall');
    expect(r.saw.hud.prompt).toMatch(/Overheated/);
    expect(r.combat.sawNote.on).toBe(false);
    const hp = r.zombie.hp;
    r.step(1);
    expect(r.zombie.hp).toBe(hp);
    r.input.down = false;
    r.step((1 - sc.heat.restartAt) / sc.heat.coolInHand + 1);
    expect(r.saw.state.stalled).toBe(false);
    expect(r.played).toContain('chainsawReady');
  });

  it('warns once when the chain goes dull, and the workbench puts the edge back', () => {
    const r = rig({ hp: 1e9 });
    r.saw.state.sharp = sc.wear.warnAt + 0.01;
    r.input.down = true;
    r.step(2);
    expect(r.notes.filter((n) => /dull/.test(n)).length).toBe(1);
    r.saw.sharpen();
    expect(r.saw.state.sharp).toBe(1);
  });

  it('shows its heat and edge on the HUD only while it is in hand, and saves the edge', () => {
    const r = rig();
    r.saw.state.sharp = 0.42;
    expect(r.saw.gauges.edge).toBe('worn');
    r.weapons.id = 'shovel';
    expect(r.saw.gauges).toBe(null);
    const saved = r.saw.saveState();
    r.saw.loadState({ sharp: 1 });
    r.saw.loadState(saved);
    expect(r.saw.state.sharp).toBeCloseTo(0.42);
    expect(r.saw.state.heat).toBe(0);
  });

  it('is quiet while the world is paused', () => {
    const r = rig();
    r.input.down = true;
    r.saw.update(1 / 30, r.input, false);
    expect(r.combat.sawNote.on).toBe(false);
    expect(r.zombie.hp).toBe(60);
  });
});
