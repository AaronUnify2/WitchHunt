// Session 30, batch 2: the mine below (render/mineModel.js, world/MineCart.js, encounters/MineRide.js):
// the tunnel and the cart's model, the cage down, the ride with its two stops, the bottom, back up.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from './mapFixture.js';
import { buildTrack, pointAt, nearest, halfAt } from '../src/world/mineTrack.js';
import { buildMine, buildCart, ringProfile } from '../src/render/mineModel.js';
import { MineRide, RIDE_FLAGS, ID, zoneSpan } from '../src/encounters/MineRide.js';
import { keepInRoom } from '../src/player/Player.js';
import { make } from './mineFixture.js';
import data from '../src/data/mineshaft.json';
import progressData from '../src/data/progress.json';

const mc = config.mineshaft;
const rc = mc.ride;
const track = buildTrack(mc.track);

describe("the mine's model", () => {
  const mine = buildMine(mc, track, {});
  const cart = buildCart(mc, {});

  it('is one mesh for the tunnel and a handful that change in play, within the tablet budget', () => {
    const tris = mine.mesh.geometry.getAttribute('position').count / 3;
    expect(tris).toBeGreaterThan(8000);
    expect(tris).toBeLessThan(40000);
    expect(Object.keys(mine.parts).filter((k) => mine.parts[k]?.isMesh).sort()).toEqual(['bulbs', 'bulkhead', 'bulkheadOpen', 'doorGlow', 'drillHead', 'fall', 'handle', 'log', 'pointsLever', 'seamGlow', 'seamHalo', 'skirt', 'sleeve', 'spark', 'sticks']);
    expect(mine.parts.fire.length).toBe(6);
    expect(mine.parts.sleeve.visible).toBe(false);
  });

  it("keeps the tunnel's walls outside the track's own width (what the dead and a shot go by)", () => {
    for (const h of [mc.track.half, 3.6]) {
      for (let i = 0; i < 40; i++) {
        const prof = ringProfile(h, mc.track.roof, i);
        for (const [lat, up] of prof) if (up > 0.3 && up < 2.0) expect(Math.abs(lat)).toBeGreaterThanOrEqual(h - 0.07);
      }
    }
  });

  it('has a spot for everything the ride uses, on the track', () => {
    for (const name of ['cage', 'cageLever', 'landing', 'cart', 'pointsLever', 'pointsStand', 'fall', 'fallStand', 'door', 'bottom']) {
      const s = mine.spots[name];
      expect(s, name).toBeTruthy();
      const n = nearest(track, s.x, s.y, s.z);
      expect(Math.abs(n.lat), name).toBeLessThan(halfAt(track, n.s));
    }
  });

  it('lifts the sleeve clear of the cage as it lands, and throws the lever', () => {
    mine.setSleeve(1.2, true);
    expect(mine.parts.sleeve.visible).toBe(true);
    expect(mine.parts.skirt.visible).toBe(true);
    mine.setSleeve(13, true);
    expect(mine.parts.skirt.visible).toBe(false);
    mine.setSleeve(0, false);
    expect(mine.parts.sleeve.visible).toBe(false);
    mine.setLever(0);
    const a = mine.parts.pointsLever.quaternion.clone();
    mine.setLever(1);
    expect(a.angleTo(mine.parts.pointsLever.quaternion)).toBeCloseTo(1.0, 1);
  });

  it('builds the cart with its gun on a pivot, the barrel down +z', () => {
    expect(cart.root.children).toContain(cart.yaw);
    expect(cart.muzzle.position.z).toBeGreaterThan(0.5);
    expect(cart.pivot.y).toBeGreaterThan(cart.floor + 0.6);
    expect(cart.gunMaterial).not.toBe(cart.body.material);
  });
});

describe('the cage down', () => {
  it('has a story flag for everything the ride saves, and a text for every prompt', () => {
    const ids = new Set(progressData.flags.map((f) => f.id));
    for (const f of RIDE_FLAGS) expect(ids.has(f), f).toBe(true);
    for (const k of ['board', 'brake', 'down', 'winch']) expect(data.cart[k].prompt).toBeTruthy();
    for (const st of rc.stops) expect(data.stops[st.id].halt && data.stops[st.id].done && data.stops[st.id].prompt, st.id).toBeTruthy();
    for (const k of ['points', 'fall', 'winch', 'lever']) expect(mc.encounter.holds[k]).toBeGreaterThan(0);
  });

  it('takes half a minute, calls off the depth, hangs once, and lands Tom on the landing', () => {
    const t = make();
    expect(t.ride.descend()).toBe(true);
    expect(t.ride.below).toBe(true);
    expect(t.interiors.id).toBe(ID);
    expect(t.player.platform.where).toBe('cage');
    expect(t.set.has('mineBelow')).toBe(true);
    t.tick(5);
    expect(t.hud.prompt).toMatch(/^\d+ ft$/);
    expect(t.ride.model.parts.sleeve.visible).toBe(true);
    t.tick(8);
    expect(t.said).toContain(data.cage.hang);
    expect(t.ride.phase).toBe('descending');
    t.tick(mc.lift.seconds + mc.lift.hang - 13 + 0.2);
    expect(t.ride.phase).toBe('foot');
    expect(t.player.platform.where).toBe('landing');
    expect(t.ride.model.parts.sleeve.visible).toBe(false);
    expect(t.said).toContain(data.cage.landed);
    expect(t.sounds).toContain('cageJolt');
    expect(t.events).toContain('mine:landed');
  });

  it('gives the dead and a shot the mine’s own floor and walls', () => {
    const t = make();
    t.ride.descend();
    const room = t.spaces.get(ID);
    const a = t.ride.at(200, 0, 0);
    expect(room.floorAt(a.x, a.z, a.y + 0.5)).toBeCloseTo(a.y, 1);
    const pos = { x: a.x + 6, z: a.z };
    room.confine(pos, a.y, 0.4);
    expect(Math.hypot(pos.x - a.x, pos.z - a.z)).toBeLessThan(mc.track.half);
    const eye = t.ride.at(30, 0, 1.6);
    expect(t.spaceRays.get(ID)(eye, { x: 1, y: 0, z: 0 }, 50)).toBeLessThan(mc.track.half + 0.7);
  });
});

describe('the ride down', () => {
  const below = (flags) => {
    const t = make({ flags });
    t.ride.descend();
    t.tick(mc.lift.seconds + mc.lift.hang + 0.3);
    return t;
  };

  it('walks Tom about the landing between its walls, round the cart', () => {
    const t = below();
    const pl = t.player.platform;
    const far = t.ride.at(15, 9);
    const p = { x: far.x, z: far.z };
    keepInRoom(p, pl, 0.35);
    expect(Math.abs(nearest(track, p.x - t.ride.offset.x, far.y - t.ride.offset.y, p.z - t.ride.offset.z).lat)).toBeLessThan(halfAt(track, 15));
    const on = t.ride.at(rc.start, 0);
    const q = { x: on.x, z: on.z };
    keepInRoom(q, pl, 0.35);
    expect(Math.hypot(q.x - on.x, q.z - on.z)).toBeGreaterThan(0.5); // pushed out of the cart
    const [s0, s1] = zoneSpan(rc, track, 'landing');
    expect(s0).toBeLessThan(-1);
    expect(s1).toBeGreaterThan(rc.start + 3);
  });

  it('runs to the points, the fall and the bottom, each stop cleared on foot, once', () => {
    const t = below();
    // Aboard, the brake off.
    t.stand(t.ride.at(rc.start - 0.5, 1.2));
    t.tick(0.1);
    expect(t.hud.prompt).toContain(data.cart.board.prompt);
    t.hold(1.2);
    expect(t.ride.phase).toBe('aboard');
    expect(t.player.riding).toBe(t.ride.cart);
    expect(t.hud.prompt).toContain(data.cart.brake.prompt);
    t.hold(1.4);
    expect(t.ride.cart.moving).toBe(true);
    t.tick(40);
    // The points.
    expect(t.ride.cart.s).toBe(rc.stops[0].s);
    expect(t.ride.where).toBe('points');
    expect(t.said).toContain(data.stops.points.halt);
    expect(t.hud.prompt).toContain(data.cart.down.prompt);
    t.hold(1.2);
    expect(t.ride.phase).toBe('foot');
    expect(t.player.platform.where).toBe('points');
    t.stand(t.ride.toWorld(t.ride.model.spots.pointsLever));
    t.tick(0.1);
    expect(t.hud.prompt).toContain(data.stops.points.prompt);
    t.hold(mc.encounter.holds.points + 0.3);
    expect(t.set.has('minePoints')).toBe(true);
    expect(t.sounds).toContain('pointsThrow');
    t.tick(1);
    expect(t.ride.leverK).toBe(1);
    // Back aboard, on to the fall.
    t.stand(t.ride.at(rc.stops[0].s - 0.5, -1.2));
    t.hold(1.2);
    t.hold(1.4);
    t.tick(45);
    expect(t.ride.where).toBe('fall');
    t.hold(1.2);
    t.stand(t.ride.toWorld(t.ride.model.spots.fallStand));
    t.tick(0.1);
    expect(t.hud.prompt).toContain(data.stops.fall.prompt);
    t.hold(mc.encounter.holds.fall + 0.4);
    expect(t.set.has('mineFall')).toBe(true);
    expect(t.ride.model.parts.fall.visible).toBe(false);
    expect(t.sounds).toContain('barPry');
    // And the bottom.
    t.stand(t.ride.at(rc.stops[1].s - 0.5, 1.2));
    t.hold(1.2);
    t.hold(1.4);
    t.tick(60);
    expect(t.ride.cart.s).toBe(rc.end);
    expect(t.ride.where).toBe('bottom');
    expect(t.set.has('mineBottom')).toBe(true);
    t.tick(2);
    expect(t.said).toContain(data.bottom.arrive);
    // The winch back up, the cage up.
    t.hold(1.2);
    expect(t.player.platform.where).toBe('bottom');
    t.stand(t.ride.at(rc.end - 0.5, 1.2));
    t.tick(0.1);
    expect(t.hud.prompt).toContain(data.cart.winch.prompt);
    t.hold(mc.encounter.holds.winch + 0.2);
    t.tick(3);
    expect(t.ride.where).toBe('landing');
    expect(t.ride.cart.s).toBe(rc.start);
    expect(t.player.platform.where).toBe('landing');
    t.stand(t.ride.toWorld(t.ride.model.spots.cageLever));
    t.tick(0.1);
    expect(t.hud.prompt).toContain(data.cage.up.prompt);
    t.hold(1.2);
    t.tick(mc.lift.upSeconds + 0.5);
    expect(t.ride.below).toBe(false);
    expect(t.interiors.id).toBe(null);
    expect(t.player.platform).toBe(null);
    expect(t.events).toContain('mine:up');
  });

  it('runs straight through to the bottom once both stops are cleared', () => {
    const t = below(['minePoints', 'mineFall', 'mineBottom']);
    expect(t.ride.model.parts.fall.visible).toBe(false);
    expect(t.said).toContain(data.cage.landedAgain);
    t.stand(t.ride.at(rc.start - 0.5, 1.2));
    t.hold(1.2);
    t.hold(1.4);
    t.tick(110);
    expect(t.ride.cart.s).toBe(rc.end);
    expect(t.said).not.toContain(data.stops.points.halt);
  });

  it("turns Tom's aim with the cart round a bend, and carries him in the tub", () => {
    const t = below(['minePoints', 'mineFall']);
    t.stand(t.ride.at(rc.start - 0.5, 1.2));
    t.hold(1.2);
    const yaw0 = t.player.yaw;
    t.hold(1.4);
    t.tick(24);
    const s = t.ride.cart.s;
    expect(s).toBeGreaterThan(94);
    expect(t.player.yaw - yaw0).toBeCloseTo(pointAt(track, s).yaw, 1);
    const w = t.ride.cart.worldPoint();
    expect(t.player.position.x).toBeCloseTo(w.x, 3);
    expect(t.player.position.y).toBeCloseTo(w.y + t.ride.cart.model.floor, 3);
    expect(t.player.platform.where).toBe('cart');
  });

  it('fires the gun down the drift and overheats it', () => {
    const t = below();
    t.stand(t.ride.at(rc.start - 0.5, 1.2));
    t.hold(1.2);
    t.player.camera.position.copy(t.ride.cart.pivotWorld(new THREE.Vector3()));
    t.input.down.add('attack');
    t.tick(1);
    expect(t.ride.cart.rounds).toBeGreaterThan(5);
    expect(t.ride.cart.heat).toBeGreaterThan(0.1);
    for (let i = 0; i < 200 && !t.ride.cart.locked; i++) t.tick(0.05);
    expect(t.ride.cart.locked).toBe(true);
    expect(t.sounds).toContain('gunHot');
    t.input.down.delete('attack');
    t.tick(4);
    expect(t.ride.cart.locked).toBe(false);
  });

  it('puts everything back on a reset (a respawn at home)', () => {
    const t = below();
    t.stand(t.ride.at(rc.start - 0.5, 1.2));
    t.hold(1.2);
    t.ride.reset();
    expect(t.ride.below).toBe(false);
    expect(t.player.riding).toBe(null);
  });
});
