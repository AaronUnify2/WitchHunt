// Nov 26: the mothership as a low-gravity tower climb (world/mothershipTower.js on world/towerShape.js).
// A climber with the game's own low-gravity step (stepBody) goes up every route to the top.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { towerShape, stepBody } from '../src/world/towerShape.js';
import { buildShipTower, arcsMinus, spansLess, CLEAR, LEVELS, R, TAU } from '../src/world/mothershipTower.js';

const SHIP = buildShipTower();
const tower = towerShape(SHIP.solids);
const PH = { ...config.mothership.physics, accel: config.player.acceleration, decel: config.player.deceleration, radius: config.player.radius };
const DT = 1 / 30;
const polar = (r, a, y) => ({ x: r * Math.sin(a), z: r * Math.cos(a), y });

function climber(at) {
  const b = { x: at.x, y: at.y, z: at.z, vx: 0, vz: 0, vy: 0, onGround: false };
  for (let i = 0; i < 90; i++) stepBody(b, { x: 0, z: 0 }, false, DT, tower, PH);
  return b;
}

// Walk straight to (x, z) at a walk; returns the lowest the feet went.
function walkTo(b, to, { speed = 4.5, maxT = 40 } = {}) {
  let low = b.y;
  for (let t = 0; t < maxT; t += DT) {
    const dx = to.x - b.x;
    const dz = to.z - b.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3 && b.onGround) break;
    const s = Math.min(speed, d * 5);
    stepBody(b, { x: (dx / d) * s, z: (dz / d) * s }, false, DT, tower, PH);
    low = Math.min(low, b.y);
  }
  for (let i = 0; i < 20; i++) stepBody(b, { x: 0, z: 0 }, false, DT, tower, PH);
  return low;
}
const walk = (b, points, opts) => Math.min(...points.map((p) => walkTo(b, p, opts)));

// A running jump at (x, z): the stick held toward it until he lands.
function jumpTo(b, to, { maxT = 8 } = {}) {
  let first = true;
  let peak = b.y;
  for (let t = 0; t < maxT; t += DT) {
    const dx = to.x - b.x;
    const dz = to.z - b.z;
    const d = Math.hypot(dx, dz);
    const s = d < 0.15 ? 0 : 4.5;
    stepBody(b, { x: d > 1e-6 ? (dx / d) * s : 0, z: d > 1e-6 ? (dz / d) * s : 0 }, first, DT, tower, PH);
    peak = Math.max(peak, b.y);
    if (!first && b.onGround) break;
    first = false;
  }
  for (let i = 0; i < 20; i++) stepBody(b, { x: 0, z: 0 }, false, DT, tower, PH);
  return peak;
}

// Up a helix's flights in order (k from..to).
const flights = (id, from, to) =>
  SHIP.stairs
    .filter((s) => s.stair === id && s.flight >= from && s.flight <= to)
    .sort((a, b) => a.flight - b.flight)
    .map((s) => ({ x: s.x, z: s.z }));

describe('the tower', () => {
  it('has a deck every 9 m and solids that all make sense', () => {
    expect(LEVELS).toEqual([0, 9, 18, 27, 36]);
    for (const s of SHIP.solids) {
      expect(['box', 'ramp', 'cyl', 'ring']).toContain(s.kind);
      for (const k of ['x', 'z', 'y0', 'y1']) if (s[k] !== undefined) expect(Number.isFinite(s[k])).toBe(true);
      if (s.kind !== 'ramp') expect(s.y1).toBeGreaterThan(s.y0);
    }
    expect(SHIP.solids.length).toBeGreaterThan(150);
  });

  it('cuts a span round what blocks it', () => {
    expect(spansLess(0, 10, [])).toEqual([[0, 10]]);
    expect(spansLess(0, 10, [[2, 4], [3, 5], [8, 12]])).toEqual([[0, 2], [5, 8]]);
    expect(spansLess(0, 10, [[0.2, 9.9]])).toEqual([]); // the slivers left are too short to keep
  });

  it('cuts holes out of a circle (wrapping round 0)', () => {
    expect(arcsMinus([])).toEqual([[0, TAU]]);
    const a = arcsMinus([[-0.5, 0.5]]);
    expect(a.length).toBe(1);
    expect(a[0][0]).toBeCloseTo(0.5);
    expect(a[0][1]).toBeCloseTo(TAU - 0.5);
    expect(arcsMinus([[1, 2], [3, 4]]).length).toBe(2);
  });

  it("closes the shaft's wall but for its doors", () => {
    let open = 0;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU;
      for (const y of [1.5, 10.5, 19.5, 28.5, 37.5]) {
        const d = tower.ray({ x: 3.5 * Math.sin(a), y, z: 3.5 * Math.cos(a) }, { x: Math.sin(a), y: 0, z: Math.cos(a) }, 60);
        if (d > R - 3.5 + 1) open++;
      }
    }
    expect(open).toBeGreaterThan(0); // the doors
    expect(open).toBeLessThan(40); // and not much else
  });

  it('puts the places where Tom can stand on them', () => {
    const P = SHIP.places;
    for (const k of ['pad', 'core', 'beam', 'stairFoot', 'lounge', 'workshop', 'hangar']) {
      const p = P[k];
      expect(tower.floorAt(p.x, p.z, p.y + 0.1)).toBeCloseTo(p.y, 1);
    }
    for (const g of SHIP.posts) expect(Math.abs(tower.floorAt(g.x, g.z, g.y + 0.5) - g.y)).toBeLessThan(1.4); // (sitters on their sofas, workers by their consoles)
    for (const l of SHIP.loot) expect(tower.floorAt(l.at.x, l.at.z, l.at.y + 0.1)).toBeCloseTo(l.at.y, 1);
  });
});

describe('climbing it, in low gravity', () => {
  it('jumps about 3.2 m and hangs about 2.5 s', () => {
    const b = climber({ x: 9, y: 0.5, z: 3 });
    expect(b.y).toBe(0);
    let t = 0;
    let peak = 0;
    stepBody(b, { x: 0, z: 0 }, true, DT, tower, PH);
    while (!b.onGround && t < 5) {
      stepBody(b, { x: 0, z: 0 }, false, DT, tower, PH);
      peak = Math.max(peak, b.y);
      t += DT;
    }
    expect(peak).toBeGreaterThan(2.9);
    expect(peak).toBeLessThan(3.5);
    expect(t).toBeGreaterThan(2.2);
    expect(t).toBeLessThan(2.8);
  });

  it("can't jump a whole deck: the net overhead stops his head", () => {
    const b = climber(polar(8.25, Math.PI, 0.5));
    const peak = jumpTo(b, polar(8.25, Math.PI, 0));
    expect(peak + PH.height).toBeLessThanOrEqual(LEVELS[1] - 0.3 + 0.01);
    expect(b.y).toBe(0);
  });

  it('goes up by the stairs (deck 0 to 1 whole; 1 to 2 with its gap jumped), the discs to 3 and the top, to the core', () => {
    const b = climber(SHIP.places.pad);
    expect(b.y).toBe(0);
    walk(b, [{ x: 8.5, z: -4 }, { x: 8.5, z: 2.5 }, { x: 4.5, z: 1.4 }]);
    walk(b, [...flights('s1', 0, 7), polar(4.5, 1.56 * Math.PI)]);
    expect(b.y).toBeGreaterThan(LEVELS[1] - 0.05); // (on deck 1, at the foot of the next stair)
    expect(b.y).toBeLessThan(LEVELS[1] + 0.8);
    walk(b, flights('s2', 0, 2));
    expect(b.y).toBeGreaterThan(11.5);
    const far = flights('s2', 5, 5)[0];
    jumpTo(b, far);
    expect(b.y).toBeGreaterThan(14);
    walk(b, [...flights('s2', 5, 7), polar(4.5, 2.56 * Math.PI)]);
    expect(b.y).toBeCloseTo(LEVELS[2], 1);
    // Deck 2 to 3: the discs in the net's hole.
    const d3 = SHIP.discs.slice(6, 9);
    walk(b, [polar(7.5, 0.58 * Math.PI), polar(8.25, 0.615 * Math.PI)]);
    for (const d of d3) {
      jumpTo(b, d);
      expect(b.y).toBeCloseTo(d.y1, 1);
    }
    jumpTo(b, polar(8.25, 1.16 * Math.PI));
    expect(b.y).toBeCloseTo(LEVELS[3], 1);
    // Deck 3 to the top: the last discs, then onto the balcony.
    walk(b, [polar(8.25, 1.3 * Math.PI), polar(8.25, 1.5 * Math.PI), polar(8.25, 1.615 * Math.PI)]);
    expect(b.y).toBeCloseTo(LEVELS[3], 1);
    for (const d of SHIP.discs.slice(9, 12)) {
      jumpTo(b, d);
      expect(b.y).toBeCloseTo(d.y1, 1);
    }
    jumpTo(b, polar(12, -0.06 * Math.PI));
    expect(b.y).toBeCloseTo(LEVELS[4], 1);
    // Round the balcony, in over the bridge, to the core's socket.
    const low = walk(b, [polar(12.6, 0.1 * Math.PI), polar(12.6, 0.3 * Math.PI), polar(12.6, 0.5 * Math.PI), SHIP.places.core]);
    expect(low).toBeGreaterThan(LEVELS[4] - 0.5);
    expect(Math.hypot(b.x - SHIP.places.core.x, b.z - SHIP.places.core.z)).toBeLessThan(0.5);
    // Out to the workshop, past the lift, through the bay door to the beam.
    const low2 = walk(b, [polar(12.6, 0.5 * Math.PI), { x: 16, z: 0 }, { x: 18.5, z: 3 }, { x: 24, z: 3 }, { x: 27, z: 0 }, SHIP.places.beam]);
    expect(low2).toBeGreaterThan(LEVELS[4] - 0.5);
    expect(Math.hypot(b.x - SHIP.places.beam.x, b.z - SHIP.places.beam.z)).toBeLessThan(0.5);
  });

  it('goes up the discs from deck 0 to 1 and 1 to 2', () => {
    const b = climber(SHIP.places.pad);
    walk(b, [{ x: 0, z: -12 }, polar(11, 1.15 * Math.PI), polar(10.5, 1.45 * Math.PI), polar(9.5, -0.2 * Math.PI), polar(8.25, -0.035 * Math.PI)]); // (round the reactor's base)
    expect(b.y).toBe(0);
    for (const d of SHIP.discs.slice(0, 3)) {
      jumpTo(b, d);
      expect(b.y).toBeCloseTo(d.y1, 1);
    }
    jumpTo(b, polar(8.25, 0.5 * Math.PI));
    expect(b.y).toBeCloseTo(LEVELS[1], 1);
    walk(b, [polar(8.25, 0.8 * Math.PI), polar(8.25, 1.0 * Math.PI), polar(8.25, 1.115 * Math.PI)]);
    expect(b.y).toBeCloseTo(LEVELS[1], 1);
    for (const d of SHIP.discs.slice(3, 6)) {
      jumpTo(b, d);
      expect(b.y).toBeCloseTo(d.y1, 1);
    }
    jumpTo(b, polar(8.25, -0.34 * Math.PI));
    expect(b.y).toBeCloseTo(LEVELS[2], 1);
  });

  it('goes up the service wells (deck 0 to 1, 2 to 3), by way of their side rooms', () => {
    for (const w of SHIP.wells) {
      const f = w.frame;
      const b = climber({ ...f.at(-1.7, R - 2.5), y: w.yL + 0.5 });
      expect(b.y).toBeCloseTo(w.yL, 1);
      const pts = [f.at(-1.7, 16), f.at(-1.7, 21), f.at(-1.7, 26.4)];
      walk(b, pts);
      expect(b.y).toBeCloseTo(w.yL + 4.5, 1);
      walk(b, [f.at(0, 27), f.at(0, 30.5), w.room]); // into the side room
      expect(b.y).toBeCloseTo(w.yL + 4.5, 1);
      walk(b, [f.at(0, 27), f.at(1.7, 26.4), f.at(1.7, 21), f.at(1.7, 16), f.at(1.7, R - 2.5)]);
      expect(b.y).toBeCloseTo(w.yL + 9, 1);
    }
  });

  it("goes up the lounge's ramps from deck 3 to the top", () => {
    const b = climber(polar(12, 0, LEVELS[3] + 0.5));
    expect(b.y).toBeCloseTo(LEVELS[3], 1);
    walk(b, [{ x: 0, z: 19 }, { x: -7.5, z: 26.6 }, { x: -7.5, z: 22 }, { x: -7.5, z: 17.6 }, { x: -6.5, z: 16.6 }]);
    expect(b.y).toBeCloseTo(LEVELS[3] + 4.5, 1);
    walk(b, [{ x: -4.2, z: 16.6 }, { x: 0, z: 16.6 }, { x: 3.8, z: 16.6 }, { x: 5.5, z: 15.6 }, polar(12.5, Math.asin(5.5 / R))]);
    expect(b.y).toBeCloseTo(LEVELS[4], 1);
  });

  it('drops one deck through a hole, not to the bottom', () => {
    // Off deck 2's net into its hole: deck 1's net catches him.
    const b = climber(polar(6.6, -0.33 * Math.PI, LEVELS[2] + 0.5));
    expect(b.y).toBeCloseTo(LEVELS[2], 1);
    walk(b, [polar(6.6, -0.5 * Math.PI)], { maxT: 6 }); // (inside the discs: they stand further out)
    expect(b.y).toBeCloseTo(LEVELS[1], 1);
    // Off the top's bridge into the void: deck 3's net.
    const c = climber(polar(9, Math.PI / 2, LEVELS[4] + 0.5));
    expect(c.y).toBeCloseTo(LEVELS[4], 1);
    jumpTo(c, polar(8.5, Math.PI / 2 + 0.6));
    expect(c.y).toBeCloseTo(LEVELS[3], 1);
  });

  // Aaron, Nov 26: "the spaces of the pillars on the outer wall of the ship sometimes overlap with the doors".
  it('never stands a pillar or a rib in front of a door, hatch, vent, light or opening', () => {
    const overlapY = (a0, a1, b0, b1) => a0 < b1 - 0.01 && b0 < a1 - 0.01;
    const ang = (x, z) => Math.atan2(x, z);
    const dAng = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
    // the doors themselves, as drawn: a 2 m frame, 2.7 m tall
    const doors = SHIP.details.filter((d) => d.kind === 'sealed');
    expect(doors.length).toBeGreaterThan(8);
    for (const p of SHIP.pillars) {
      for (const d of doors) {
        if (Math.abs(Math.hypot(d.x, d.z) - R) > 1) continue;
        if (dAng(p.a, ang(d.x, d.z)) * R < 1.01 + p.w / 2) expect(overlapY(p.y0, p.y1, d.y, d.y + 2.7)).toBe(false);
      }
      for (const o of SHIP.openings) if (dAng(p.a, o.a) * R < o.half * R + p.w / 2) expect(overlapY(p.y0, p.y1, o.y0, o.y1)).toBe(false);
      for (const l of SHIP.lights.filter((x) => x.wall)) if (dAng(p.a, ang(l.x, l.z)) * R < l.len / 2 + 0.15 + p.w / 2) expect(overlapY(p.y0, p.y1, l.y - 0.1, l.y + 0.1)).toBe(false);
    }
    // the lights and doors sit between two pillars: no pillar within a door's half-width of its middle
    for (const d of doors) {
      if (Math.abs(Math.hypot(d.x, d.z) - R) > 1) continue;
      const near = SHIP.pillars.filter((p) => dAng(p.a, ang(d.x, d.z)) * R < 1.2 && overlapY(p.y0, p.y1, d.y, d.y + 2.7));
      expect(near).toEqual([]);
    }
    // the walls' ribs: none on top of a detail on its face
    for (const r of SHIP.ribs) {
      for (const d of SHIP.details) {
        const c = CLEAR[d.kind];
        if (!c) continue;
        const lat = Math.hypot(r.x - d.x, r.z - d.z);
        if (lat < c.half + 0.05 && lat > 0) expect(overlapY(r.y0, r.y1, d.y + c.y0, d.y + c.y1)).toBe(false);
      }
    }
    // and there are still pillars all round, most of them the full height
    expect(SHIP.pillars.filter((p) => p.y0 < 0.5 && p.y1 > 45).length).toBeGreaterThan(15);
    expect(new Set(SHIP.pillars.map((p) => p.a.toFixed(3))).size).toBe(32);
  });

  it("leaves the bay door open its full width (the quad's ride goes through it)", () => {
    for (const z of [-1.6, 0, 1.6]) {
      const p = { x: 28.2, z };
      const before = { ...p };
      tower.confine(p, config.mothership.ride.radius, LEVELS[4], 1.4);
      expect(Math.hypot(p.x - before.x, p.z - before.z)).toBeLessThan(0.01);
    }
    const q = { x: 28.2, z: 3.2 };
    expect(tower.confine(q, 0.35, LEVELS[4], 1.8)).toBe(true); // its frame is solid
  });

  it('every zone is somewhere, and the places are in the right ones', () => {
    const zoneAt = (p) => SHIP.zones.find((z) => tower.contains(z.solid, p.x, p.y + 0.5, p.z))?.id;
    expect(zoneAt(SHIP.places.pad)).toBe('floor');
    expect(zoneAt(SHIP.places.core)).toBe('top');
    expect(zoneAt(SHIP.places.lounge)).toBe('lounge');
    expect(zoneAt(SHIP.places.workshop)).toBe('workshop');
    expect(zoneAt(SHIP.places.beam)).toBe('hangar');
    for (const w of SHIP.wells) expect(zoneAt(w.room)).toBe(w.id);
    for (const g of SHIP.posts) expect(zoneAt(g)).toBe(g.zone);
  });
});
