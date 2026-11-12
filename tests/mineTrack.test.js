// Session 30, batch 2: the mine's track (world/mineTrack.js, pure): its layout from config, where a
// point is along it, the tunnel's walls for the dead and for a shot, the cart's speed, the cage's depth.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { buildTrack, pointAt, halfAt, nearest, inside, rayDistance, confine, trackPoint, speedAt, nextStop, cageDepth } from '../src/world/mineTrack.js';

const mc = config.mineshaft;
const track = buildTrack(mc.track);
const rc = mc.ride;

describe("the mine's track", () => {
  it('runs the length of its legs, falling all the way, level where the cart stops', () => {
    expect(track.length).toBe(mc.track.legs.reduce((n, l) => n + l.len, 0));
    let last = Infinity;
    for (let s = 0; s <= track.length; s += 4) {
      const y = pointAt(track, s).y;
      expect(y).toBeLessThanOrEqual(last + 1e-9);
      last = y;
    }
    expect(pointAt(track, track.length).y).toBeLessThan(-20);
    for (const s of [0, rc.start, ...rc.stops.map((q) => q.s), rc.end]) expect(Math.abs(pointAt(track, s).pitch), `s ${s}`).toBeLessThan(0.02);
  });

  it('never crosses itself: where one level lies over another there is rock between', () => {
    const pts = track.points;
    for (let i = 0; i < pts.length; i += 3) {
      for (let j = i + 40; j < pts.length; j += 3) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
        if (d < mc.track.half * 2 + 2) expect(Math.abs(pts[i].y - pts[j].y), `${pts[i].s} over ${pts[j].s}`).toBeGreaterThan(mc.track.roof + 4);
      }
    }
  });

  it("keeps its loop under the clearing (Tom's dot on the map stays near the mine)", () => {
    for (const p of track.points) expect(Math.hypot(p.x + mc.origin[0], p.z + mc.origin[1])).toBeLessThan(80);
  });

  it('finds the nearest point of the right level', () => {
    for (const s of [5, 80, 150, 240, 300, 420]) {
      const p = trackPoint(track, s, 0.8, 1.2);
      const n = nearest(track, p.x, p.y, p.z);
      expect(n.s).toBeCloseTo(s, 0);
      expect(n.lat).toBeCloseTo(0.8, 1);
      expect(n.dy).toBeCloseTo(1.2, 1);
    }
    // The steep run lies right under the landing: a point on the landing isn't mistaken for it.
    const top = trackPoint(track, 22, 0, 1);
    expect(nearest(track, top.x, top.y, top.z).s).toBeLessThan(30);
    const under = trackPoint(track, 282, 0, 1);
    expect(nearest(track, under.x, under.y, under.z).s).toBeGreaterThan(270);
  });

  it('is wider through the landing, the stops and the bottom', () => {
    expect(halfAt(track, 60)).toBe(mc.track.half);
    for (const s of [5, ...rc.stops.map((q) => q.s), rc.end]) expect(halfAt(track, s), `s ${s}`).toBeGreaterThan(mc.track.half + 1);
  });

  it('knows inside from out: the walls, the floor, the roof, the ends', () => {
    const at = (s, lat, up) => { const p = trackPoint(track, s, lat, up); return inside(track, p.x, p.y, p.z); };
    expect(at(60, 0, 1.5)).toBe(true);
    expect(at(60, mc.track.half - 0.1, 1.5)).toBe(true);
    expect(at(60, mc.track.half + 0.2, 1.5)).toBe(false);
    expect(at(60, 0, mc.track.roof + 0.2)).toBe(false);
    expect(at(60, 0, -0.6)).toBe(false);
    expect(at(110, 3, 1)).toBe(true); // the points' gallery
    const end = pointAt(track, track.length);
    expect(inside(track, end.x + Math.sin(end.yaw) * 6, end.y + 1, end.z + Math.cos(end.yaw) * 6)).toBe(false);
    expect(inside(track, 0, 1, -8)).toBe(false); // behind the cage
  });

  it('stops a shot at the wall, and lets one run down a straight', () => {
    const o = trackPoint(track, 30, 0, 1.6);
    const along = { x: 0, y: -0.06, z: 1 };
    const len = Math.hypot(along.x, along.y, along.z);
    const dir = { x: along.x / len, y: along.y / len, z: along.z / len };
    expect(rayDistance(track, o, dir, 30, 30)).toBe(30);
    const side = rayDistance(track, o, { x: 1, y: 0, z: 0 }, 30, 30);
    expect(side).toBeGreaterThan(mc.track.half - 0.7);
    expect(side).toBeLessThan(mc.track.half + 0.7);
    expect(rayDistance(track, o, { x: 0, y: 1, z: 0 }, 30, 30)).toBeLessThan(mc.track.roof);
    // Round a bend the far wall stops it.
    const b = trackPoint(track, 60, 0, 1.6);
    expect(rayDistance(track, b, { x: 0, y: 0, z: 1 }, 90, 60)).toBeLessThan(40);
  });

  it('keeps the dead between the walls', () => {
    const p = trackPoint(track, 70, 6, 0);
    const pos = { x: p.x, z: p.z };
    const c = confine(track, pos, p.y, 0.4);
    const n = nearest(track, pos.x, p.y, pos.z);
    expect(Math.abs(n.lat)).toBeLessThanOrEqual(halfAt(track, n.s) - 0.4 + 1e-6);
    expect(c.floor).toBeCloseTo(pointAt(track, n.s).y, 1);
  });
});

describe("the cart's running", () => {
  it('cruises, runs away down the steep, and brakes to a stand at a stop', () => {
    expect(speedAt(rc, 50, 110)).toBe(rc.cruise);
    expect(speedAt(rc, 300, rc.end)).toBe(rc.runs[0].speed);
    expect(speedAt(rc, 110 - rc.brake / 2, 110)).toBeLessThan(rc.cruise);
    expect(speedAt(rc, 109.9, 110)).toBe(rc.crawl);
    expect(speedAt(rc, 110, 110)).toBe(0);
  });

  it('halts at each stop until it is cleared, then runs to the bottom', () => {
    expect(nextStop(rc.stops, new Set(), rc.start, rc.end).id).toBe('points');
    expect(nextStop(rc.stops, new Set(['points']), rc.start, rc.end).id).toBe('fall');
    expect(nextStop(rc.stops, new Set(['points']), 110.5, rc.end).id).toBe('fall');
    expect(nextStop(rc.stops, new Set(['points', 'fall']), rc.start, rc.end)).toEqual({ id: 'end', s: rc.end });
    expect(rc.end).toBeLessThan(track.length);
  });
});

describe("the cage's depth", () => {
  const L = mc.lift;
  it('goes down all the way, hangs once, and never comes back up', () => {
    expect(cageDepth(0, L)).toBe(0);
    let last = 0;
    for (let t = 0; t <= L.seconds + L.hang + 1; t += 0.25) {
      const d = cageDepth(t, L);
      expect(d).toBeGreaterThanOrEqual(last - 1e-9);
      last = d;
    }
    expect(last).toBe(L.depth);
    const t1 = L.seconds * L.hangAt;
    expect(cageDepth(t1 + 0.1, L)).toBe(cageDepth(t1 + L.hang - 0.1, L));
    expect(L.depth).toBeGreaterThan(2000); // ridiculously deep
  });
});
