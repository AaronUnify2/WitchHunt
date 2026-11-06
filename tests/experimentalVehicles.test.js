// The experimental vehicles (debug menu only): the ute with a turret and
// the alien quad. Their numbers hang together, their maths behaves, and a
// simulated drive on flat ground does what a player would expect.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from './mapFixture.js';
import { Ute, pickGear, gearRpm, stepHeat, wrapAngle } from '../src/world/Ute.js';
import { AlienQuad, stepBoost } from '../src/world/AlienQuad.js';
import { splashFalloff, Plasma } from '../src/combat/Plasma.js';
import { buildUte, DIALS, dialAngle, UTE } from '../src/render/uteModel.js';
import { buildAlienQuad } from '../src/render/alienQuadModel.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';
import { DEBUG } from '../src/debug/DebugMenu.js';

const sprint = config.player.walkSpeed * config.player.sprintMultiplier;

// A flat, open world and the stand-ins the vehicles talk to.
function world() {
  const scene = new THREE.Scene();
  const colliders = new SpatialGrid(config.world.colliderCellSize);
  const ground = { heightAt: () => 0, undergrowthAt: () => 0, clamp: () => {}, rayDistance: (o, d, max) => max };
  const bus = new EventBus();
  bus.init();
  const hits = [];
  const enemies = {
    living: [],
    alert() {},
    damage(z, amount, part) {
      hits.push({ z, amount, part });
      z.health -= amount;
      return z.health <= 0;
    },
  };
  const camera = new THREE.PerspectiveCamera(70, 1.6, 0.1, 500);
  camera.rotation.order = 'YXZ';
  const player = {
    position: new THREE.Vector3(),
    velocity: { x: 0, z: 0 },
    yaw: 0,
    pitch: 0,
    eyeHeight: config.player.eyeHeight,
    camera,
    fovMultiplier: 1,
    recoilPitch: 0,
    shakeAmount: 0,
    shakeTime: 0,
    riding: null,
    rooted: false,
    platform: null,
    shake() {},
    kick() {},
    teleport(x, z) {
      this.riding?.eject?.();
      this.riding = null;
      this.position.set(x, 0, z);
    },
  };
  const hurt = [];
  const combat = {
    enemies,
    rng: new Rng(7),
    hud: { pickup() {} },
    fx: { tracer() {}, muzzleFlash() {}, dust() {}, emit() {} },
    hurtPlayer: (d) => hurt.push(d),
  };
  return { scene, colliders, ground, bus, enemies, player, combat, hits, hurt };
}

// Input as a player gives it: a stick, buttons held.
function pad(move = { x: 0, y: 0 }, held = []) {
  const down = new Set(held);
  return {
    activeDevice: 'gamepad',
    getMove: () => move,
    getLook: () => ({ x: 0, y: 0 }),
    isDown: (a) => down.has(a),
    wasPressed: () => false,
  };
}

function makeUte() {
  const w = world();
  const ute = new Ute(config, w.bus);
  ute.init({ scene: w.scene, ground: w.ground, colliders: w.colliders, player: w.player, combat: w.combat, notify() {} });
  return { ute, ...w };
}

function makeAlienQuad() {
  const w = world();
  const aq = new AlienQuad(config, w.bus);
  aq.init({ scene: w.scene, ground: w.ground, colliders: w.colliders, player: w.player, combat: w.combat, notify() {} });
  return { aq, ...w };
}

describe('the experimental vehicles: their numbers', () => {
  const u = config.ute;
  const a = config.alienQuad;

  it('are in their own debug category', () => {
    expect(DEBUG.experimental).toBeTruthy();
  });

  it('the ute is faster than the quad, slowed in the brush, but less than the quad is', () => {
    expect(u.maxSpeed).toBeGreaterThan(config.quad.maxSpeed);
    expect(u.maxSpeed * u.undergrowthMultiplier).toBeLessThan(u.maxSpeed);
    expect(u.undergrowthMultiplier).toBeGreaterThan(config.quad.undergrowthMultiplier);
    expect(u.reverseSpeed).toBeLessThan(u.maxSpeed / 2);
  });

  it("the ute's gears climb to its top speed and change up before the redline", () => {
    for (let i = 1; i < u.gears.length; i++) expect(u.gears[i]).toBeGreaterThan(u.gears[i - 1]);
    expect(u.gears[u.gears.length - 1]).toBe(1);
    expect(u.shiftUp).toBeLessThan(1);
    expect(u.shiftDown).toBeLessThan(u.shiftUp);
    // After changing up, the next gear isn't straight back down.
    for (let i = 0; i < u.gears.length - 1; i++) expect(u.gears[i] * u.shiftUp).toBeGreaterThan(u.gears[i] * u.shiftDown);
  });

  it('a full-speed ram drops a citizen; the gun drops one in two rounds', () => {
    expect(u.ram.damage).toBeGreaterThanOrEqual(config.zombies.health);
    expect(u.gun.damage * 2).toBeGreaterThanOrEqual(config.zombies.health);
  });

  it('the gun fires for a few seconds before it overheats, and cools in a few', () => {
    const g = u.gun;
    const rounds = 1 / g.heatPerShot;
    expect(rounds / g.rate).toBeGreaterThan(3);
    expect(rounds / g.rate).toBeLessThan(9);
    expect((1 - g.jamUntil) / g.coolRate).toBeLessThan(3);
  });

  it("the cab's dials cover the ute's speed and revs", () => {
    expect(DIALS.speed.max).toBeGreaterThan(u.maxSpeed * 3.6);
    expect(DIALS.rpm.max).toBeGreaterThanOrEqual(u.redline);
    expect(dialAngle(DIALS.speed, 0)).toBe(DIALS.speed.from);
    expect(dialAngle(DIALS.speed, 9999)).toBe(DIALS.speed.to);
  });

  it("the alien quad outruns Earl's, and boosts for three seconds to well past that", () => {
    expect(a.maxSpeed).toBeGreaterThanOrEqual(config.quad.maxSpeed);
    expect(a.boost.seconds).toBe(3);
    expect(a.boost.speed).toBeGreaterThan(a.maxSpeed * 1.6);
    expect(a.boost.recharge).toBeGreaterThan(a.boost.seconds);
    expect(a.maxSpeed).toBeGreaterThan(sprint * 1.5);
  });

  it("the orb costs more than a bolt and hits harder and wider; the capacitor holds several bolts", () => {
    const p = a.plasma;
    expect(p.orb.cost).toBeGreaterThan(p.bolt.cost);
    expect(p.orb.damage).toBeGreaterThan(p.bolt.damage);
    expect(p.orb.splash).toBeGreaterThan(p.bolt.splash);
    expect(p.cells / p.bolt.cost).toBeGreaterThanOrEqual(6);
    expect(p.orb.cost).toBeLessThanOrEqual(p.cells);
  });

  it('pale paint is kept off them (the glare rule)', () => {
    const c = new THREE.Color(u.look.paint);
    const luma = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    expect(luma).toBeLessThan(config.props.weather.maxLuma);
  });
});

describe('the experimental vehicles: their maths', () => {
  const u = config.ute;

  it('wraps angles into -PI..PI', () => {
    expect(Math.abs(wrapAngle(Math.PI * 3))).toBeCloseTo(Math.PI, 5);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2, 5);
    expect(wrapAngle(0.3)).toBeCloseTo(0.3, 6);
  });

  it('changes up near the top of a gear and down near its bottom', () => {
    expect(pickGear(u.gears, 0, u.gears[0] * 0.99, u.shiftUp, u.shiftDown, 1)).toBe(1);
    expect(pickGear(u.gears, 0, u.gears[0] * 0.99, u.shiftUp, u.shiftDown, 0)).toBe(0); // off the gas it holds
    expect(pickGear(u.gears, 3, 0.05, u.shiftUp, u.shiftDown, 0)).toBe(2);
    expect(pickGear(u.gears, 4, 1, u.shiftUp, u.shiftDown, 1)).toBe(4);
    expect(gearRpm(u.gears, 2, 0, u.idleRpm, u.redline)).toBeCloseTo(u.idleRpm, 5);
    expect(gearRpm(u.gears, 2, u.gears[2], u.idleRpm, u.redline)).toBeCloseTo(u.redline, 5);
  });

  it('heats the gun as it fires, locks it at full heat, frees it once cooled', () => {
    const g = u.gun;
    let h = { heat: 0, locked: false };
    let n = 0;
    while (!h.locked && n < 500) {
      h = stepHeat(h.heat, h.locked, 1, true, 0, 1 / g.rate, g);
      n++;
    }
    expect(h.locked).toBe(true);
    expect(n).toBeGreaterThan(20);
    let t = 0;
    while (h.locked && t < 20) {
      h = stepHeat(h.heat, h.locked, 0, false, 10, 0.1, g);
      t += 0.1;
    }
    expect(h.locked).toBe(false);
    expect(h.heat).toBeLessThanOrEqual(g.jamUntil + 1e-9);
  });

  it('burns the boost meter in three seconds and refills it', () => {
    const b = config.alienQuad.boost;
    let s = { meter: 1, burning: true };
    let t = 0;
    while (s.burning) {
      s = stepBoost(s.meter, s.burning, 0.05, b);
      t += 0.05;
    }
    expect(t).toBeCloseTo(b.seconds, 1);
    for (let i = 0; i < b.recharge / 0.05 + 2; i++) s = stepBoost(s.meter, false, 0.05, b);
    expect(s.meter).toBe(1);
  });

  it("the plasma's burst falls off to its edge and stops there", () => {
    expect(splashFalloff(0, 3)).toBe(1);
    expect(splashFalloff(1.5, 3)).toBeCloseTo(0.65, 5);
    expect(splashFalloff(3, 3)).toBe(0);
    expect(splashFalloff(5, 3)).toBe(0);
  });
});

describe('the ute: the model', () => {
  it('has four wheels (two that steer), a gun that turns and tilts, a cab only drawn from inside', () => {
    const m = buildUte(config.ute);
    expect(m.wheels.length).toBe(4);
    expect(m.wheels.filter((w) => w.front).length).toBe(2);
    expect(m.turret.yaw.children.length).toBeGreaterThan(0);
    expect(m.turret.pitch.children.length).toBeGreaterThan(0);
    expect(m.interior.group.visible).toBe(false);
    expect(m.interior.wipers.length).toBe(2);
    expect(m.interior.splats.length).toBe(config.ute.splats.pool);
    // The gun's post stands in the tray, the driver sits on the right.
    expect(UTE.pedestal.z).toBeGreaterThan(UTE.tray.front);
    expect(UTE.pedestal.z).toBeLessThan(UTE.tray.back);
    expect(config.ute.eye.x).toBeGreaterThan(0);
    m.setGauges({ speed: 90, rpm: 2.5, fuel: 0.5, temp: 0.4, lamp: true, brake: true });
    expect(m.interior.needles.speed.rotation.z).toBeCloseTo((-dialAngle(DIALS.speed, 90) * Math.PI) / 180, 5);
    m.dispose();
  });
});

describe('the ute: driving it', () => {
  it('waits unseen until it is brought, then stands solid in front of Tom', () => {
    const { ute, player, colliders } = makeUte();
    expect(ute.stored).toBe(true);
    expect(ute.mesh.visible).toBe(false);
    player.position.set(10, 0, 10);
    player.yaw = 0;
    ute.bring();
    expect(ute.stored).toBe(false);
    expect(ute.mesh.visible).toBe(true);
    expect(ute.z).toBeLessThan(10); // ahead of him (-z at yaw 0)
    expect(colliders.query(ute.x, ute.z, 1).filter((c) => c.ute && !c.off).length).toBe(3);
  });

  it('adds no lights to the scene until it is brought (a light recompiles every shader)', () => {
    const lights = (scene) => {
      let n = 0;
      scene.traverse((o) => (n += o.isLight ? 1 : 0));
      return n;
    };
    const { ute, scene } = makeUte();
    const w = world();
    const aq = new AlienQuad(config, w.bus);
    aq.init({ scene: w.scene, ground: w.ground, colliders: w.colliders, player: w.player, combat: w.combat, notify() {} });
    expect(lights(scene)).toBe(0);
    expect(lights(w.scene)).toBe(0);
    ute.bring();
    aq.bring();
    expect(lights(scene)).toBe(2); // the headlamps' spot and the gun's lamp
    expect(lights(w.scene)).toBe(2 + config.alienQuad.plasma.lights + 1); // the headlamp, the underglow, the plasma's
    const before = lights(scene);
    ute.reset();
    ute.bring();
    expect(lights(scene)).toBe(before); // made once
  });

  it('pulls away through the gears to near its top speed on the flat', () => {
    const { ute, player } = makeUte();
    ute.place(0, 0, 0);
    ute.mount('cab');
    expect(player.riding).toBe(ute);
    const gas = pad({ x: 0, y: 1 });
    let gears = new Set();
    for (let i = 0; i < 60 * 14; i++) {
      ute.drive(1 / 60, gas, player);
      gears.add(ute.gear);
    }
    expect(ute.speed).toBeGreaterThan(config.ute.maxSpeed * 0.9);
    expect(ute.gear).toBe(config.ute.gears.length - 1);
    expect(gears.size).toBe(config.ute.gears.length);
    expect(ute.z).toBeLessThan(-100); // it went forward
    // Tom rides along under the cab's eye.
    expect(Math.hypot(player.position.x - ute.x, player.position.z - ute.z)).toBeLessThan(1);
  });

  it('brakes to a stop, then reverses', () => {
    const { ute, player } = makeUte();
    ute.place(0, 0, 0);
    ute.mount('cab');
    for (let i = 0; i < 240; i++) ute.drive(1 / 60, pad({ x: 0, y: 1 }), player);
    const brake = pad({ x: 0, y: -1 });
    let t = 0;
    while (ute.speed > 0 && t < 6) {
      ute.drive(1 / 60, brake, player);
      t += 1 / 60;
    }
    expect(t).toBeLessThan(3);
    for (let i = 0; i < 180; i++) ute.drive(1 / 60, brake, player);
    expect(ute.speed).toBeLessThan(-1);
    expect(ute.speed).toBeGreaterThanOrEqual(-config.ute.reverseSpeed - 0.01);
    expect(ute.gear).toBe(-1);
  });

  it('turns tighter with the handbrake on, sliding sideways', () => {
    const turnWith = (held) => {
      const { ute, player } = makeUte();
      ute.place(0, 0, 0);
      ute.mount('cab');
      for (let i = 0; i < 180; i++) ute.drive(1 / 60, pad({ x: 0, y: 1 }), player);
      const start = ute.heading;
      let slide = 0;
      for (let i = 0; i < 40; i++) {
        ute.drive(1 / 60, pad({ x: 1, y: 0.6 }, held), player);
        const rx = Math.cos(ute.heading);
        const rz = -Math.sin(ute.heading);
        slide = Math.max(slide, Math.abs(ute.vel.x * rx + ute.vel.z * rz));
      }
      return { turned: Math.abs(wrapAngle(ute.heading - start)), slide };
    };
    const plain = turnWith([]);
    const handbrake = turnWith(['jump']);
    expect(handbrake.turned).toBeGreaterThan(plain.turned * 1.2);
    expect(handbrake.slide).toBeGreaterThan(plain.slide * 2);
  });

  it('throws the dead off its nose at speed, and blood lands on the windscreen', () => {
    const { ute, player, enemies, hits } = makeUte();
    ute.place(0, 0, 0);
    ute.mount('cab');
    for (let i = 0; i < 200; i++) ute.drive(1 / 60, pad({ x: 0, y: 1 }), player);
    const ahead = ute.toWorld(0, -3.2);
    const z = { x: ahead.x, z: ahead.z, y: 0, radius: 0.35, health: 60, kind: 'zombie', alive: true };
    enemies.living.push(z);
    for (let i = 0; i < 20; i++) ute.drive(1 / 60, pad({ x: 0, y: 1 }), player);
    expect(hits.length).toBe(1);
    expect(hits[0].amount).toBeGreaterThan(30);
    expect(ute.model.interior.splats.some((s) => s.mesh.visible)).toBe(true);
  });

  it('climbs over to the gun (it stops), fires it until it overheats, then back to the wheel', () => {
    const { ute, player, enemies, hits } = makeUte();
    ute.place(0, 0, 0);
    ute.mount('cab');
    for (let i = 0; i < 120; i++) ute.drive(1 / 60, pad({ x: 0, y: 1 }), player);
    expect(ute.speed).toBeGreaterThan(5);
    ute.swapSeat();
    expect(ute.seat).toBe('gun');
    for (let i = 0; i < 90; i++) ute.drive(1 / 60, pad(), player);
    expect(Math.abs(ute.speed)).toBeLessThan(0.01);
    expect(ute.climb).toBe(null);
    // A zombie ahead, in line with the gun.
    player.camera.position.copy(ute.cameraPose());
    const target = ute.toWorld(0, -25);
    enemies.living.push({ x: target.x, z: target.z, y: 0, hitRadius: 0.4, headBottom: 1.45, headRadius: 0.2, height: 1.8, radius: 0.35, health: 1e6, kind: 'zombie', alive: true });
    const fire = pad({ x: 0, y: 0 }, ['attack']);
    let rounds = 0;
    for (let i = 0; i < 60 * 10 && !ute.locked; i++) {
      ute.drive(1 / 60, fire, player);
      ute.placeCamera(player);
      ute.updateGun(1 / 60, fire);
      rounds = ute.rounds;
    }
    expect(ute.locked).toBe(true);
    expect(rounds).toBeGreaterThan(20);
    expect(hits.length).toBeGreaterThan(rounds * 0.4); // a long burst spreads
    ute.swapSeat();
    expect(ute.seat).toBe('cab');
    for (let i = 0; i < 60; i++) ute.drive(1 / 60, pad(), player);
    expect(ute.model.interior.group.visible).toBe(true);
  });

  it('lets Tom out by the driver’s door and stands solid again', () => {
    const { ute, player, colliders } = makeUte();
    ute.place(0, 0, 0);
    ute.mount('cab');
    ute.dismount();
    expect(player.riding).toBe(null);
    expect(ute.riding).toBe(false);
    expect(ute.toLocal(player.position.x, player.position.z).lx).toBeGreaterThan(1); // the right: right-hand drive
    expect(colliders.query(ute.x, ute.z, 1).filter((c) => c.ute && !c.off).length).toBe(3);
  });
});

describe('the alien quad: riding it', () => {
  it('builds with spinning, steering wheels, two emitters and its neon', () => {
    const m = buildAlienQuad(config.alienQuad);
    expect(m.wheels.length).toBe(4);
    expect(m.emitters.length).toBe(2);
    m.setGlow(1, { riding: true, boost: 1, charge: 0.5, cells: 4, boostMeter: 0.3, firing: 1 });
    m.dispose();
  });

  it('boosts for three seconds to far past its top speed, then charges back up', () => {
    const { aq, player } = makeAlienQuad();
    aq.place(0, 0, 0);
    aq.mount();
    const gas = pad({ x: 0, y: 1 });
    for (let i = 0; i < 300; i++) aq.drive(1 / 60, gas, player);
    const cruising = aq.speed;
    expect(cruising).toBeGreaterThan(config.alienQuad.maxSpeed * 0.9);
    const boost = { ...gas, wasPressed: (a) => a === 'sprint' };
    aq.updateBoost(1 / 60, boost);
    expect(aq.boosting).toBe(true);
    let top = 0;
    let t = 0;
    while (aq.boosting && t < 5) {
      aq.updateBoost(1 / 60, gas);
      aq.drive(1 / 60, gas, player);
      top = Math.max(top, aq.speed);
      t += 1 / 60;
    }
    expect(t).toBeCloseTo(config.alienQuad.boost.seconds, 0);
    expect(top).toBeGreaterThan(cruising * 1.5);
    expect(player.fovMultiplier).toBeGreaterThan(1);
    for (let i = 0; i < 60 * (config.alienQuad.boost.recharge + 1); i++) aq.updateBoost(1 / 60, gas);
    expect(aq.boostMeter).toBe(1);
  });

  it('fires bolts from alternate emitters on RT and charges an orb on LT', () => {
    const { aq, player } = makeAlienQuad();
    aq.place(0, 0, 0);
    aq.mount();
    aq.fireTimer = 0;
    player.yaw = aq.heading;
    player.camera.position.set(0, 1.6, 0.4);
    player.camera.rotation.set(0, 0, 0);
    player.camera.updateMatrixWorld();
    const cells = aq.cells;
    aq.updateGuns(1 / 60, pad({ x: 0, y: 0 }, ['attack']));
    expect(aq.cells).toBe(cells - config.alienQuad.plasma.bolt.cost);
    expect(aq.plasma.balls.filter((b) => b.active).length).toBe(1);
    const first = aq.emitterIndex;
    for (let i = 0; i < 20; i++) aq.updateGuns(1 / 60, pad({ x: 0, y: 0 }, ['attack']));
    expect(aq.emitterIndex).not.toBe(undefined);
    expect(aq.plasma.balls.filter((b) => b.active).length).toBeGreaterThan(1);
    expect(first === 0 || first === 1).toBe(true);
    // An orb: hold LT, let go.
    aq.cells = config.alienQuad.plasma.cells;
    for (let i = 0; i < 70; i++) aq.updateGuns(1 / 60, pad({ x: 0, y: 0 }, ['aim']));
    expect(aq.charge).toBeGreaterThan(0.9);
    aq.updateGuns(1 / 60, pad());
    expect(aq.plasma.balls.some((b) => b.active && b.kind === 'orb')).toBe(true);
    expect(aq.cells).toBeLessThan(config.alienQuad.plasma.cells);
  });

  it("won't fire behind it (the emitters face forward)", () => {
    const { aq, player } = makeAlienQuad();
    aq.place(0, 0, 0);
    aq.mount();
    aq.fireTimer = 0;
    player.yaw = aq.heading + Math.PI;
    aq.updateGuns(1 / 60, pad({ x: 0, y: 0 }, ['attack']));
    expect(aq.plasma.balls.some((b) => b.active)).toBe(false);
  });
});

describe('plasma: the burst', () => {
  it('hurts the one it hits most, throws those round it, and spares those outside it', () => {
    const w = world();
    const plasma = new Plasma(config.alienQuad.plasma, config.alienQuad.look, w.bus);
    plasma.init(w.scene, { combat: w.combat, colliders: w.colliders, ground: w.ground, player: w.player, headshot: 3 });
    w.player.position.set(0, 0, 50);
    const mk = (x, z) => ({ x, z, y: 0, hitRadius: 0.4, headBottom: 1.45, headRadius: 0.2, height: 1.8, radius: 0.35, health: 1e6, kind: 'zombie', alive: true });
    const target = mk(0, -10);
    const near = mk(1.2, -10.5);
    const far = mk(12, -10);
    w.enemies.living.push(target, near, far);
    plasma.fire({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -1 }, 'bolt', 1);
    for (let i = 0; i < 60; i++) plasma.update(1 / 60, null);
    const dmg = (z) => w.hits.filter((h) => h.z === z).reduce((s, h) => s + h.amount, 0);
    expect(dmg(target)).toBeGreaterThanOrEqual(config.alienQuad.plasma.bolt.damage * 0.99);
    expect(dmg(near)).toBeGreaterThan(0);
    expect(dmg(near)).toBeLessThan(dmg(target));
    expect(dmg(far)).toBe(0);
    expect(plasma.balls.every((b) => !b.active)).toBe(true);
    plasma.dispose();
  });
});
