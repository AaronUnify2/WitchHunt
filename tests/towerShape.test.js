// Nov 26: a space with floors at many heights (world/towerShape.js), for the mothership's tower climb.
import { describe, it, expect } from 'vitest';
import { towerShape, inside2D, topAt, inSpan, contains } from '../src/world/towerShape.js';

const ground = { kind: 'box', x: 0, z: 0, hx: 20, hz: 20, y0: -1, y1: 0 };
const deck = { kind: 'box', x: 0, z: 0, hx: 3, hz: 3, y0: 4.7, y1: 5 };
const ramp = { kind: 'ramp', x: 10, z: 0, hx: 1, hz: 4, y0: 0, y1: 4, thick: 0.3 };
const post = { kind: 'cyl', x: -8, z: 0, r: 1, y0: 0, y1: 10 };
const wall = { kind: 'ring', x: 0, z: 0, r0: 15, r1: 16, a0: 0, a1: Math.PI * 2, y0: 0, y1: 20 };
const arc = { kind: 'ring', x: 0, z: 0, r0: 5, r1: 7, a0: 0, a1: Math.PI / 2, y0: 2.7, y1: 3 }; // +z round to +x

describe('a solid', () => {
  it('knows its footprint: a box turned, a ring sector, a cylinder', () => {
    const turned = { kind: 'box', x: 0, z: 0, hx: 4, hz: 0.5, a: Math.PI / 2, y0: 0, y1: 1 };
    expect(inside2D(turned, 0, 3.5)).toBe(true); // turned a quarter: long along z
    expect(inside2D(turned, 3.5, 0)).toBe(false);
    expect(inside2D(arc, 0.1, 6)).toBe(true); // just off +z, in the band
    expect(inside2D(arc, 6, 0.1)).toBe(true); // just off +x
    expect(inside2D(arc, -1, 6)).toBe(false); // the other side of +z
    expect(inside2D(arc, 0, 4)).toBe(false); // inside the band
    expect(inside2D(post, -8.5, 0.5)).toBe(true);
  });
  it('wraps angles round', () => {
    expect(inSpan(-0.1, Math.PI * 1.9, Math.PI * 2.1)).toBe(true);
    expect(inSpan(Math.PI, 0, 1)).toBe(false);
  });
  it('slopes a ramp from its -z end up to its +z end', () => {
    expect(topAt(ramp, 10, -4)).toBeCloseTo(0);
    expect(topAt(ramp, 10, 0)).toBeCloseTo(2);
    expect(topAt(ramp, 10, 4)).toBeCloseTo(4);
    expect(contains(ramp, 10, 1.9, 0)).toBe(true);
    expect(contains(ramp, 10, 1.5, 0)).toBe(false); // under it (it's 0.3 thick)
  });
});

describe('a space of many floors', () => {
  const t = towerShape([ground, deck, ramp, post, wall, arc]);

  it('stands you on what is under your feet', () => {
    expect(t.floorAt(0, 0, 0)).toBe(0); // under the deck
    expect(t.floorAt(0, 0, 5)).toBe(5); // on it
    expect(t.floorAt(0, 0, 9)).toBe(5); // falling onto it
    expect(t.floorAt(10, 0, 2)).toBeCloseTo(2); // halfway up the ramp
    expect(t.floorAt(6, 1, 3)).toBe(3); // on the arc
    expect(t.floorAt(30, 30, 3)).toBe(-Infinity); // nowhere
  });

  it('puts a ceiling over you where a deck is overhead', () => {
    expect(t.ceilingAt(0, 0, 0)).toBeCloseTo(4.7);
    expect(t.ceilingAt(5, 5, 0)).toBe(Infinity);
  });

  it('pushes you out of walls at body height, but lets you step up and walk under', () => {
    const p = { x: 3.1, z: 0 };
    t.confine(p, 0.35, 4.5); // the deck's edge at chest height: a wall
    expect(p.x).toBeGreaterThanOrEqual(3.35 - 1e-6);
    const q = { x: 3.1, z: 0 };
    t.confine(q, 0.35, 4.8); // nearly level with it: stepped onto
    expect(q.x).toBe(3.1);
    const u = { x: 2, z: 0 };
    t.confine(u, 0.35, 0); // under it (head 1.8, it starts 4.7): nothing
    expect(u.x).toBe(2);
    const w = { x: 14.9, z: 0 };
    t.confine(w, 0.35, 0); // the shell
    expect(Math.hypot(w.x, w.z)).toBeLessThanOrEqual(15 - 0.35 + 1e-6);
    const c = { x: -8, z: 1.1 };
    t.confine(c, 0.35, 0); // round the post
    expect(Math.hypot(c.x + 8, c.z)).toBeGreaterThanOrEqual(1.35 - 1e-6);
  });

  it('stops a ray at the first solid it meets, and says how square on', () => {
    const out = {};
    const d = t.ray({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, 50, out);
    expect(d).toBeCloseTo(3.7, 1); // the deck's underside
    expect(out.facing).toBeGreaterThan(0.9);
    expect(t.ray({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }, 50)).toBeCloseTo(15, 1); // the shell
    expect(t.ray({ x: 0, y: 1, z: 0 }, { x: -1, y: 0, z: 0 }, 50)).toBeCloseTo(7, 1); // the post first
    const glass = towerShape([{ ...post, see: false }]);
    expect(glass.clear({ x: -12, y: 1, z: 0 }, { x: -4, y: 1, z: 0 })).toBe(true); // seen through
    expect(glass.ray({ x: -12, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }, 20)).toBeCloseTo(3, 1); // but rounds stop
  });
});
