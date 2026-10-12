import { describe, it, expect } from 'vitest';
import { stationLayout, zoneOf, angleOf, compassName } from '../src/base/stationLayout.js';
import { StationState, passable } from '../src/base/StationState.js';
import { routeTo, fenceGaps } from '../src/base/siegeRouting.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const SEEDS = [1, 7, 1234, 99, 4242];
const NIGHT = 360;

function setup(seed = 1234) {
  const map = makeMap(seed);
  const ground = makeGround(seed);
  const home = map.clearings[map.homeIndex];
  const layout = stationLayout(home, ground, config.station.layout);
  const state = new StationState(config.station, layout);
  state.init();
  return { map, ground, home, layout, state };
}

describe('stationLayout', () => {
  it('runs the fence from cliff to cliff in 12 segments plus a gate due south', () => {
    for (const seed of SEEDS) {
      const { ground, layout } = setup(seed);
      expect(layout.segments).toHaveLength(12);
      const margin = ground.geo.cliff.walkMargin;
      // Both ends are tucked in past the walkable line, so nothing walks round them.
      for (const a of [layout.west, layout.east]) {
        const p = layout.at(a, layout.radius);
        expect(p.z).toBeLessThanOrEqual(ground.cliffZ(p.x) + margin);
      }
      expect(layout.gate.a0).toBeLessThan(0);
      expect(layout.gate.a1).toBeGreaterThan(0);
      // Segments tile the arc without gaps or overlaps.
      for (let i = 1; i < 6; i++) expect(layout.segments[i].a0).toBeCloseTo(layout.segments[i - 1].a1);
      expect(layout.segments[5].a1).toBeCloseTo(layout.gate.a0);
      expect(layout.segments[6].a0).toBeCloseTo(layout.gate.a1);
      // Every fence piece is short enough for the collision grid.
      for (const s of layout.segments) for (const p of s.pieces) expect(Math.hypot(p.bx - p.ax, p.bz - p.az)).toBeLessThanOrEqual(config.station.layout.panelLength + 1e-6);
    }
  });

  it('puts the cabin, tower, turret and fence box inside the fence and the home clearing', () => {
    for (const seed of SEEDS) {
      const { layout, home } = setup(seed);
      const inside = (p) => zoneOf(layout, p.x, p.z) >= 1;
      expect(zoneOf(layout, layout.cabin.x, layout.cabin.z)).toBeGreaterThanOrEqual(2);
      expect(inside(layout.tower)).toBe(true);
      expect(inside(layout.turretPad)).toBe(true);
      expect(inside(layout.fenceBox)).toBe(true);
      // The run starts at home's centre: in the yard, not inside a wall.
      expect(zoneOf(layout, home.x, home.z)).toBe(1);
      // The fence stays inside the cleared home clearing.
      for (const s of layout.segments) expect(Math.hypot(s.mid.x - home.x, s.mid.z - home.z)).toBeLessThan(home.radius);
    }
  });

  it('knows its zones and compass names', () => {
    const { layout } = setup();
    const c = layout.cabin;
    expect(zoneOf(layout, c.desk.x, c.desk.z)).toBe(3);
    expect(zoneOf(layout, c.frontDoor.inner.x, c.frontDoor.inner.z)).toBe(2);
    expect(zoneOf(layout, c.frontDoor.outer.x, c.frontDoor.outer.z)).toBe(1);
    const far = layout.at(0, layout.radius + 10);
    expect(zoneOf(layout, far.x, far.z)).toBe(0);
    expect(angleOf(layout, far.x, far.z)).toBeCloseTo(0);
    expect(compassName(0)).toBe('south');
    expect(compassName(Math.PI / 2)).toBe('east');
    expect(compassName(-Math.PI / 2)).toBe('west');
    expect(compassName((3 * Math.PI) / 4)).toBe('north-east');
  });
});

describe('StationState', () => {
  it('starts with the second panel east of the gate down, no charge and no turret', () => {
    const { state } = setup();
    expect(state.segments[7].health).toBe(0);
    expect(state.segments[8].health).toBeCloseTo(0.45 * config.station.fence.segmentHealth);
    expect(state.segments[6].health).toBe(config.station.fence.segmentHealth);
    expect(state.segments[11].health).toBe(config.station.fence.segmentHealth);
    expect(state.segments[0].health).toBe(config.station.fence.segmentHealth);
    expect(state.charge).toBe(0);
    expect(state.turret.installed).toBe(false);
  });

  it('breaks barriers, and repairs them for scrap in proportion', () => {
    const { state } = setup();
    const s = state.segments[0];
    expect(state.damage(s, 50)).toBe(false);
    expect(state.repairCost(s)).toBe(Math.ceil(0.25 * config.station.costs.fenceRepair));
    expect(state.damage(s, 500)).toBe(true);
    expect(passable(s)).toBe(true);
    // Half the scrap repairs half of it.
    const half = config.station.costs.fenceRepair / 2;
    expect(state.repair(s, half)).toBe(half);
    expect(s.health).toBeCloseTo(s.max / 2);
    expect(state.repair(s, 1000)).toBe(config.station.costs.fenceRepair - half);
    expect(s.health).toBe(s.max);
    expect(state.repair(s, 1000)).toBe(0);
  });

  it('builds barricades, reinforces doors, builds spikes and floodlights for scrap', () => {
    const { state } = setup();
    const k = config.station.costs;
    expect(state.buildBarricade(3, k.barricade - 1)).toBe(0);
    expect(state.buildBarricade(3, 100)).toBe(k.barricade);
    expect(state.segments[3].barricade.built).toBe(true);
    expect(state.buildBarricade(3, 100)).toBe(0);
    // A smashed barricade has to be built again.
    state.damage(state.segments[3].barricade, 1e6);
    expect(state.segments[3].barricade.built).toBe(false);

    const door = state.doors.front;
    expect(state.reinforceDoor('front', 100)).toBe(k.reinforceDoor);
    expect(door.max).toBe(config.station.doors.reinforcedHealth);
    expect(door.health).toBe(door.max);

    expect(state.buildSpike(2, 100)).toBe(k.spikeTrap);
    for (let i = 0; i < 3; i++) state.wearSpike(2);
    expect(state.spikeCost(2)).toBe(k.spikeRepair);
    expect(state.buildFloodlight(0, 100)).toBe(k.floodlight);
    expect(state.floodlightCount).toBe(1);
  });

  it('fits batteries up to the cap and drains over the night', () => {
    const { state } = setup();
    const p = config.station.power;
    expect(state.fitBattery()).toBe(p.batteryCharge);
    for (let i = 0; i < 10; i++) state.fitBattery();
    expect(state.charge).toBe(p.maxCharge);
    state.charge = 100;
    const perSecond = state.nightDrainPerSecond(NIGHT);
    expect(perSecond * NIGHT).toBeCloseTo(p.nightDrain);
    state.drain(1000);
    expect(state.charge).toBe(0);
  });

  it('rates security as the sum of every defence, scaled by health', () => {
    const { state } = setup();
    const v = config.station.security;
    // Start: 10 whole segments, one at 45%, one broken, the gate and two doors; no charge.
    const start = state.security(NIGHT);
    expect(start.total).toBeCloseTo(v.fenceSegment * (10 + 0.45) + v.gate + v.door * 2);
    // A full battery's worth of charge adds the fence's electric value.
    state.charge = config.station.power.fullSecurityCharge;
    expect(state.security(NIGHT).total).toBeCloseTo(start.total + v.fenceCharge);
    // A turret on fast with half a night's ammo scores half of 20.
    state.turret.installed = true;
    state.setTurretMode('fast');
    state.turret.rounds = NIGHT / config.station.turret.modes.fast.seconds / 2;
    const turret = state.security(NIGHT).parts.find((p) => p.id === 'turret');
    expect(turret.value).toBeCloseTo(10);
    // Unpowered, the turret is worth nothing.
    state.charge = 0;
    expect(state.security(NIGHT).parts.find((p) => p.id === 'turret').value).toBe(0);
  });

  it('loads the turret by damage and spends a round (and a little charge) per shot', () => {
    const { state } = setup();
    expect(state.loadTurret(10, 25)).toBeCloseTo(25); // 10 rifle rounds = 25 turret rounds
    expect(state.loadTurret(4, 48)).toBeCloseTo(19.2); // 4 shells
    state.charge = 10;
    state.turretFired();
    expect(state.turret.rounds).toBeCloseTo(43.2);
    expect(state.charge).toBeCloseTo(10 - config.station.power.turretShotCost);
    state.nextTurretMode();
    expect(state.turret.mode).toBe('fast');
    state.nextTurretMode();
    expect(state.turret.mode).toBe('slow');
  });
});

describe('siege routing', () => {
  const out = { active: false, x: 0, z: 0, barrier: null };

  it('claws the fence segment straight ahead when there is no gap near', () => {
    const { layout, state } = setup();
    const target = layout.cabin.commsCentre;
    // West side: whole segments, the gaps are far east.
    const a = (layout.segments[1].a0 + layout.segments[1].a1) / 2;
    const p = layout.at(a, layout.radius + 6);
    routeTo(layout, state, config.station, p.x, p.z, target.x, target.z, out);
    expect(out.active).toBe(true);
    expect(out.barrier).toBe(state.segments[1]);
    // It stands just outside the fence line.
    expect(Math.hypot(out.x - layout.centre.x, out.z - layout.centre.z)).toBeCloseTo(layout.radius + config.station.siege.stand);
  });

  it('walks round the outside to a nearby gap, then steps through it', () => {
    const { layout, state } = setup();
    const target = layout.cabin.commsCentre;
    // The far east end torn down (not the run's start, which breaks segment 7).
    for (const seg of state.segments) seg.health = seg.max;
    state.segments[10].health = 0;
    state.segments[11].health = 0;
    expect(fenceGaps(layout, state).length).toBe(2);
    const s9 = layout.segments[9];
    const p = layout.at((s9.a0 + s9.a1) / 2, layout.radius + 3);
    routeTo(layout, state, config.station, p.x, p.z, target.x, target.z, out);
    expect(out.barrier).toBe(null);
    // The waypoint is further east round the arc, still outside the fence.
    expect(angleOf(layout, out.x, out.z)).toBeGreaterThan(angleOf(layout, p.x, p.z));
    expect(Math.hypot(out.x - layout.centre.x, out.z - layout.centre.z)).toBeGreaterThan(layout.radius);
    // Standing in the gap: straight through, inside.
    const s10 = layout.segments[10];
    const g = layout.at((s10.a0 + s10.a1) / 2, layout.radius + 1);
    routeTo(layout, state, config.station, g.x, g.z, target.x, target.z, out);
    expect(zoneOf(layout, out.x, out.z)).toBe(1);
  });

  it('claws a barricade once the fence in front of it is down', () => {
    const { layout, state } = setup();
    state.segments[7].health = state.segments[7].max; // mend the run's broken panel (a gap nearby)
    state.segments[10].health = 0; // the fence in front of it down
    state.segments[11].health = 0;
    state.buildBarricade(10, 100);
    state.buildBarricade(11, 100); // no other gap near
    const s10 = layout.segments[10];
    const g = layout.at((s10.a0 + s10.a1) / 2, layout.radius + 1);
    const target = layout.cabin.commsCentre;
    routeTo(layout, state, config.station, g.x, g.z, target.x, target.z, out);
    expect(out.barrier).toBe(state.segments[10].barricade);
  });

  it('goes round the cabin to the front door, claws it, then the comms door', () => {
    const { layout, state } = setup();
    const c = layout.cabin;
    const target = c.commsCentre;
    // Behind the cabin, in the yard.
    routeTo(layout, state, config.station, c.x, c.z - c.halfD - 2, target.x, target.z, out);
    expect(out.barrier).toBe(null);
    expect(Math.abs(out.x - c.x)).toBeGreaterThan(c.halfW);
    // In front of the door: claw it.
    routeTo(layout, state, config.station, c.frontDoor.outer.x, c.frontDoor.outer.z + 1, target.x, target.z, out);
    expect(out.barrier).toBe(state.doors.front);
    // Door broken: through it.
    state.damage(state.doors.front, 1e6);
    routeTo(layout, state, config.station, c.frontDoor.outer.x, c.frontDoor.outer.z + 1, target.x, target.z, out);
    expect(out.barrier).toBe(null);
    expect(zoneOf(layout, out.x, out.z)).toBe(2);
    // In the main room: the comms door.
    routeTo(layout, state, config.station, c.frontDoor.inner.x, c.frontDoor.inner.z, target.x, target.z, out);
    expect(out.barrier).toBe(state.doors.comms);
  });

  it('gives no route inside the zone it wants', () => {
    const { layout, state } = setup();
    const a = layout.at(0.3, layout.radius + 10);
    routeTo(layout, state, config.station, a.x, a.z, a.x + 3, a.z + 3, out);
    expect(out.active).toBe(false);
  });

  it('comes back out through the fence to a player outside', () => {
    const { layout, state } = setup();
    const inside = layout.at(-1, layout.radius - 4);
    const outside = layout.at(-1, layout.radius + 15);
    routeTo(layout, state, config.station, inside.x, inside.z, outside.x, outside.z, out);
    expect(out.barrier).toBe(state.segments.find((s, i) => {
      const g = layout.segments[i];
      return -1 >= g.a0 && -1 <= g.a1;
    }));
    expect(Math.hypot(out.x - layout.centre.x, out.z - layout.centre.z)).toBeLessThan(layout.radius);
  });
});

describe('the turret pad', () => {
  // Aaron's M5 test: could the turret reach every panel? At its first spot
  // the cabin hid the east end. Every panel, inside and out, must be in
  // range and in sight of the muzzle past the cabin walls and tower legs.
  it('sees and reaches every fence panel, inside and out', async () => {
    const { segmentCollider } = await import('../src/world/collision.js');
    const { rayBlockers } = await import('../src/combat/hitscan.js');
    const L = config.station.layout;
    const tc = config.station.turret;
    for (const seed of SEEDS) {
      const { ground: g, layout } = setup(seed);
      const c = layout.cabin;
      const floor = Math.max(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => g.heightAt(c.x + a * c.halfW, c.z + b * c.halfD))) + 0.12;
      const blockers = [...c.walls, c.frontDoor.line, c.commsDoor.line].map((p) => segmentCollider(p.ax, p.az, p.bx, p.bz, L.colliderThickness, -100, floor + L.cabin.wallHeight, true));
      const tw = layout.tower;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) blockers.push({ x: tw.x + dx * tw.legSpread, z: tw.z + dz * tw.legSpread, r: 0.15, base: -100, top: g.heightAt(tw.x, tw.z) + tw.height });
      const pad = layout.turretPad;
      const m = { x: pad.x, y: g.heightAt(pad.x, pad.z) + tc.muzzleHeight, z: pad.z };
      for (const s of layout.segments) {
        for (let k = 0; k <= 8; k++) {
          const a = s.a0 + ((s.a1 - s.a0) * k) / 8;
          for (const r of [layout.radius + 0.9, layout.radius - 0.9]) {
            const q = layout.at(a, r);
            const ty = g.heightAt(q.x, q.z) + 1;
            expect(Math.hypot(q.x - m.x, q.z - m.z)).toBeLessThan(tc.range);
            const d = Math.hypot(q.x - m.x, ty - m.y, q.z - m.z);
            const dir = { x: (q.x - m.x) / d, y: (ty - m.y) / d, z: (q.z - m.z) / d };
            expect(rayBlockers(m, dir, blockers, d, g), `${s.name} on seed ${seed}`).toBeGreaterThanOrEqual(d - 0.3);
          }
        }
      }
    }
  });
});
