// The experimental dozer: its tracks, its steering, and what it does to
// the woods (felling, trails, the dead, cars, the winch), on a flat stand-in world.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from './mapFixture.js';
import { Dozer, trackSpeeds } from '../src/world/Dozer.js';
import { LandClearing } from '../src/world/LandClearing.js';
import { buildDozer, trackPoint, trackLength, DOZER } from '../src/render/dozerModel.js';
import { SpatialGrid } from '../src/world/SpatialGrid.js';
import { EventBus } from '../src/core/EventBus.js';
import { Rng } from '../src/core/Rng.js';

// A flat world with a forest of stand-in trees (as Forest files them) and a ground that records what's carved.
function world(trees = []) {
  const scene = new THREE.Scene();
  const colliders = new SpatialGrid(config.world.colliderCellSize);
  const carved = [];
  const ground = {
    heightAt: () => 0,
    undergrowthAt: () => 0,
    clamp: () => {},
    rayDistance: (o, d, max) => max,
    carve: (x, z, r, dirt) => {
      carved.push({ x, z, r, dirt });
      return [0, 0, 1, 1];
    },
  };
  const forestTrees = trees.map((t, i) => {
    const tree = { x: t.x, z: t.z, y: 0, height: t.height ?? 9, width: t.width ?? 4, variant: t.variant ?? 0 };
    tree.collider = { x: tree.x, z: tree.z, r: config.forest.trunkRadius, tree: i };
    colliders.insert(tree.collider);
    return tree;
  });
  const forest = {
    trees: forestTrees,
    atlas: null,
    rects: [[0, 0, 1, 1]],
    fellTree(i) {
      forestTrees[i].felled = true;
      forestTrees[i].collider.off = true;
    },
    bushesNear: (x, z, r, out = []) => {
      out.length = 0;
      return out;
    },
    clearBush() {},
  };
  const bus = new EventBus();
  bus.init();
  const hits = [];
  const enemies = {
    living: [],
    alert() {},
    damage(z, amount) {
      hits.push({ z, amount });
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
    shake() {},
    kick() {},
    teleport(x, z) {
      this.riding?.eject?.();
      this.riding = null;
      this.position.set(x, 0, z);
    },
  };
  const combat = { enemies, rng: new Rng(3), hud: { pickup() {} }, fx: { dust() {}, sparks() {}, blood() {}, emit() {} }, hurtPlayer() {} };
  const clearing = new LandClearing(config.dozer.clearing, config.forest, bus);
  clearing.init(scene, { world: { forest, ground, terrain: { updateMasks() {} } }, colliders, player, fx: combat.fx });
  const moved = [];
  const vehicles = {
    list: [],
    moveVehicle(v, x, z, yaw) {
      moved.push({ v, x, z, yaw });
      v.x = x;
      v.z = z;
      v.yaw = yaw;
    },
  };
  const dozer = new Dozer(config, bus);
  dozer.init({ scene, ground, colliders, player, combat, clearing, vehicles, notify() {} });
  return { dozer, clearing, forest, player, enemies, hits, carved, vehicles, moved, scene };
}

const pad = (move = { x: 0, y: 0 }, held = []) => {
  const down = new Set(held);
  return { activeDevice: 'gamepad', getMove: () => move, getLook: () => ({ x: 0, y: 0 }), isDown: (a) => down.has(a), wasPressed: () => false };
};

const run = (w, seconds, input, extra) => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    w.dozer.updateBladeInput(1 / 60, input);
    w.dozer.drive(1 / 60, input, w.player);
    extra?.();
  }
};

describe('the dozer: its tracks', () => {
  it('runs its shoes round a closed loop, along the ground underneath', () => {
    const L = trackLength();
    const a = trackPoint(0);
    const b = trackPoint(L);
    expect(b.z).toBeCloseTo(a.z, 5);
    expect(b.y).toBeCloseTo(a.y, 5);
    let low = Infinity;
    let prev = trackPoint(0);
    for (let s = 0.05; s < L; s += 0.05) {
      const p = trackPoint(s);
      expect(Math.hypot(p.z - prev.z, p.y - prev.y)).toBeLessThan(0.08); // no jumps
      low = Math.min(low, p.y);
      prev = p;
    }
    expect(low).toBeGreaterThan(-0.02);
    expect(low).toBeLessThan(0.08);
  });

  it('pivots on the spot with its tracks running opposite ways', () => {
    const t = trackSpeeds(0, 1, DOZER.track.x);
    expect(Math.sign(t.left)).toBe(-Math.sign(t.right));
    const f = trackSpeeds(3, 0, DOZER.track.x);
    expect(f.left).toBe(f.right);
  });

  it('builds, and moves its tracks, blade and levers', () => {
    const m = buildDozer(config.dozer);
    m.setTracks(1.3, -0.4);
    m.setBlade(1);
    const up = new THREE.Vector3();
    m.root.updateMatrixWorld(true);
    m.bladeEdge.getWorldPosition(up);
    m.setBlade(-1);
    m.root.updateMatrixWorld(true);
    const down = m.bladeEdge.getWorldPosition(new THREE.Vector3());
    expect(up.y - down.y).toBeGreaterThan(0.9); // about a metre of travel
    expect(down.y).toBeLessThan(0);
    m.setLevers(1, -1, 0.5);
    m.setGauges({ temp: 0.5, oil: 0.3, fuel: 0.6, hours: 100 });
    m.dispose();
  });
});

describe('the dozer: driving it', () => {
  it('is slow, about walking-and-a-bit pace, and ignores the brush', () => {
    expect(config.dozer.maxSpeed).toBeLessThan(config.quad.maxSpeed / 2);
    expect(config.dozer.maxSpeed).toBeGreaterThan(config.player.walkSpeed);
    expect(config.dozer.undergrowthMultiplier).toBeGreaterThan(0.8);
  });

  it('pulls away to its top speed and pivots on the spot', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 4, pad({ x: 0, y: 1 }));
    expect(w.dozer.speed).toBeGreaterThan(config.dozer.maxSpeed * 0.95);
    run(w, 3, pad({ x: 0, y: 0 }));
    const at = { x: w.dozer.x, z: w.dozer.z };
    const h = w.dozer.heading;
    run(w, 2, pad({ x: 1, y: 0 }));
    expect(Math.abs(w.dozer.heading - h)).toBeGreaterThan(1);
    expect(Math.hypot(w.dozer.x - at.x, w.dozer.z - at.z)).toBeLessThan(0.3);
  });
});

describe('the dozer: the woods', () => {
  it('pushes a small tree over with its blade', () => {
    const w = world([{ x: 0, z: -5, height: 9 }]);
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 3, pad({ x: 0, y: 1 }));
    expect(w.forest.trees[0].felled).toBe(true);
    expect(w.clearing.felledCount).toBe(1);
    expect(w.dozer.z).toBeLessThan(-6); // it went on through
  });

  it('is held a moment by a big tree, straining, then it goes', () => {
    const w = world([{ x: 0, z: -5, height: 20, width: 8 }]);
    const strain = w.clearing.strainOf(w.forest.trees[0]);
    expect(strain).toBeGreaterThan(0.3);
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    let held = 0;
    for (let i = 0; i < 60 * 6 && !w.forest.trees[0].felled; i++) {
      w.dozer.drive(1 / 60, pad({ x: 0, y: 1 }), w.player);
      if (w.dozer.straining > 0) held += 1 / 60;
    }
    expect(w.forest.trees[0].felled).toBe(true);
    expect(held).toBeGreaterThan(strain * 0.8);
  });

  it("stops at a big tree on its flank instead of felling it", () => {
    const w = world([{ x: 1.6, z: 0, height: 20, width: 8 }]);
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 2, pad({ x: 0, y: 1 }));
    expect(w.forest.trees[0].felled).toBeFalsy();
  });

  it('crushes the undergrowth under its tracks, and cuts bare earth with the blade down', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 2, pad({ x: 0, y: 1 }));
    expect(w.carved.some((c) => c.dirt < 1)).toBe(true);
    expect(w.carved.some((c) => c.dirt === 1)).toBe(false);
    run(w, 3, pad({ x: 0, y: 1 }, ['attack']));
    expect(w.dozer.blade).toBeLessThan(-0.9);
    expect(w.carved.some((c) => c.dirt === 1)).toBe(true);
    expect(w.clearing.carvedMetres).toBeGreaterThan(3);
  });

  it('keeps what it did in the save, and puts it back', () => {
    const w = world([{ x: 0, z: -5 }, { x: 0.5, z: -12 }]);
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 5, pad({ x: 0, y: 1 }, ['attack']));
    const saved = JSON.parse(JSON.stringify(w.clearing.saveState()));
    expect(saved.felled.length).toBe(2);
    expect(saved.stamps.length).toBeGreaterThan(3);
    const w2 = world([{ x: 0, z: -5 }, { x: 0.5, z: -12 }]);
    w2.clearing.loadState(saved);
    expect(w2.forest.trees.every((t) => t.felled)).toBe(true);
    expect(w2.carved.length).toBe(saved.stamps.length);
  });
});

describe('the dozer: the dead', () => {
  const zombie = (x, z) => ({ x, z, y: 0, radius: 0.35, hitRadius: 0.4, headBottom: 1.45, headRadius: 0.2, height: 1.8, health: 1e6, kind: 'zombie', alive: true });

  it('shoves them along before the blade, hurting them', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    const z = zombie(0.3, -4);
    w.enemies.living.push(z);
    run(w, 3, pad({ x: 0, y: 1 }));
    expect(z.z).toBeLessThan(-6); // carried along
    expect(w.hits.filter((h) => h.z === z).length).toBeGreaterThan(5);
  });

  it('with the blade up, they go under it into the tracks', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    const z = zombie(DOZER.track.x, -4);
    w.enemies.living.push(z);
    run(w, 3, pad({ x: 0, y: 1 }, ['aim']));
    const dealt = w.hits.filter((h) => h.z === z).reduce((s, h) => s + h.amount, 0);
    expect(dealt).toBeGreaterThan(config.zombies.health * 2);
  });

  it('lets them climb on beside the seat while it is stopped, and throws them off when it pivots', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    const z = zombie(1.6, 0.5);
    w.enemies.living.push(z);
    for (let i = 0; i < 120; i++) w.dozer.updateClimbers(1 / 60);
    expect(w.dozer.climbers.has(z)).toBe(true);
    expect(Math.hypot(z.x - w.player.position.x, z.z - w.player.position.z)).toBeLessThan(config.zombies.attackReach + 0.2);
    w.dozer.turn = 1;
    w.dozer.updateClimbers(1 / 60);
    expect(w.dozer.climbers.has(z)).toBe(false);
  });
});

describe('the dozer: cars and the winch', () => {
  const car = (x, z) => ({ x, z, yaw: 0, def: { size: [4.6, 1.8, 1.4], name: 'sedan' } });

  it('shoves a car along before its blade', () => {
    const w = world();
    const v = car(0, -5.2);
    v.yaw = Math.PI / 2; // side on to the blade
    w.vehicles.list.push(v);
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    run(w, 4, pad({ x: 0, y: 1 }));
    expect(w.moved.length).toBeGreaterThan(10);
    expect(v.z).toBeLessThan(-7);
  });

  it('hooks one of the dead on the winch and drags it as it drives away', () => {
    const w = world();
    w.dozer.place(0, 0, 0);
    w.dozer.mount();
    const z = { x: 0, z: 12, y: 0, radius: 0.35, hitRadius: 0.4, headBottom: 1.45, headRadius: 0.2, height: 1.8, health: 1e6, kind: 'zombie', alive: true };
    w.enemies.living.push(z);
    w.dozer.winch = { phase: 'hooked', target: { kind: 'zombie', z }, length: 9, taut: false, reelTimer: 0 };
    const start = z.z;
    run(w, 3, pad({ x: 0, y: 1 }), () => w.dozer.updateWinch(1 / 60, pad()));
    expect(z.z).toBeLessThan(start - 5); // dragged after it
    expect(w.hits.some((h) => h.z === z)).toBe(true);
  });
});
