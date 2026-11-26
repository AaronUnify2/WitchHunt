// Nov 26: the quad's escape down the mothership's runway (Aaron: 300 m more, jumps that need the boost, a track
// that takes some skill). A driver bot with the game's own ride (encounters/shipRide.js) proves the track works
// with the quad's real numbers: boosting where it should, it reaches the beam; without the boost it falls at jump 2;
// too slow, it falls at jump 1.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { towerShape } from '../src/world/towerShape.js';
import { buildShipTower, LEVELS } from '../src/world/mothershipTower.js';
import { stepRide, newRide, boostStep } from '../src/encounters/shipRide.js';

const SHIP = buildShipTower();
const tower = towerShape(SHIP.solids);
const RW = SHIP.runway;
const RC = config.mothership.ride;
const QC = config.alienQuad;
const DT = 1 / 30;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const gapNamed = (n) => RW.pieces.filter((p) => p.kind === 'gap')[n];

// Follow the centreline: steer at a point 6 m ahead, brake for the bends, boost on the marked run-ups.
function drive({ useBoost = true, from = RW.checkpoints[0], maxT = 150, topSpeed = Infinity, log = null } = {}) {
  const q = newRide(from, from.h + Math.PI);
  let idx = RW.line.findIndex((p) => p.s >= (from.s ?? 0));
  let launchS = null; // where it last left the ground (a fall's jump)
  const bendAhead = (s) => RW.pieces.some((p) => p.kind === 'turn' && p.s > s - 4 && p.s - s < 24);
  for (let t = 0; t < maxT; t += DT) {
    let best = idx;
    let bd = Infinity;
    for (let k = Math.max(0, idx - 2); k < Math.min(RW.line.length, idx + 16); k++) {
      const p = RW.line[k];
      const d = Math.hypot(p.x - q.x, p.z - q.z);
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    idx = Math.max(idx, best);
    const here = RW.line[idx];
    const tgt = RW.line[Math.min(RW.line.length - 1, idx + 3)];
    const hd = Math.atan2(-(tgt.x - q.x), -(tgt.z - q.z));
    const steer = Math.max(-1, Math.min(1, -wrap(hd - q.heading) * 2.5));
    let throttle = 1;
    if ((bendAhead(here.s) && q.speed > 13) || q.speed > topSpeed) throttle = -1;
    else if (q.speed > topSpeed - 0.5) throttle = 0;
    const ev = stepRide(q, { throttle, steer, boost: useBoost && Boolean(here.boost) }, DT, tower, RC, QC, RW.fallBelow);
    if (ev.launched) launchS = here.s;
    if (log && (ev.launched || ev.landed)) log.push({ t: +t.toFixed(2), s: here.s, ev: ev.launched ? 'up' : 'down', speed: +q.speed.toFixed(1), y: +q.y.toFixed(1) });
    if (ev.fell) return { fell: true, s: launchS ?? here.s, t, q };
    if (Math.hypot(q.x - RW.exit.x, q.z - RW.exit.z) < RC.beamWithin && Math.abs(q.y - RW.exit.y) < 1.5) return { done: true, t, q };
  }
  return { timeout: true, s: RW.line[idx].s, q };
}

describe('the runway', () => {
  it('is about 300 m more of track, in a hall of its own off the hangar', () => {
    expect(RW.length).toBeGreaterThan(300);
    expect(RW.length).toBeLessThan(520);
    expect(RW.hall.x0).toBeGreaterThanOrEqual(46); // nothing of it reaches back into the ship
    expect(RW.checkpoints.map((c) => c.name)).toEqual(['start', 'jump 1', 'jump 2', 'platforms', 'the climb', 'the finale']);
    for (const c of RW.checkpoints) expect(tower.floorAt(c.x, c.z, c.y + 0.2)).toBeCloseTo(c.y, 1);
    expect(tower.floorAt(RW.exit.x, RW.exit.z, RW.exit.y + 0.2)).toBeCloseTo(RW.exit.y, 1);
    // it starts level with the hangar's floor, where the hangar ends
    expect(RW.checkpoints[0].y).toBe(LEVELS[4]);
  });

  it('never crosses itself (no deck over another with less than 6 m between)', () => {
    for (const a of RW.line) for (const b of RW.line) if (Math.abs(a.s - b.s) > 30) expect(Math.hypot(a.x - b.x, a.z - b.z) > 12 || Math.abs(a.y - b.y) > 6).toBe(true);
  });

  it('a boost burns 3 s and charges back in 7', () => {
    let m = 1;
    let on = true;
    let t = 0;
    while (on) ({ meter: m, burning: on } = boostStep(m, on, DT, QC.boost)), (t += DT);
    expect(t).toBeCloseTo(QC.boost.seconds, 1);
    t = 0;
    while (m < 1) ({ meter: m } = boostStep(m, false, DT, QC.boost)), (t += DT);
    expect(t).toBeCloseTo(QC.boost.recharge, 1);
  });

  it('boosting where it should, the quad gets all the way to the beam', () => {
    const log = [];
    const r = drive({ log });
    if (!r.done) console.log(JSON.stringify(r), JSON.stringify(log));
    expect(r.done).toBe(true);
    expect(r.t).toBeGreaterThan(25); // a run of some length
    expect(r.t).toBeLessThan(110);
  });

  it('without the boost it falls at jump 2', () => {
    const r = drive({ useBoost: false });
    expect(r.fell).toBe(true);
    const g = gapNamed(1);
    expect(r.s).toBeGreaterThan(g.s - 12); // (it left the ground at jump 2's ramp)
    expect(r.s).toBeLessThan(g.s + 2);
  });

  it('too slow (under 10 m/s), it falls at jump 1', () => {
    const r = drive({ topSpeed: 9 });
    expect(r.fell).toBe(true);
    const g = gapNamed(0);
    expect(r.s).toBeLessThan(g.s + 2);
  });

  it('the finale needs the boost too (from its own checkpoint)', () => {
    const fin = RW.checkpoints.find((c) => c.name === 'the finale');
    expect(drive({ from: fin }).done).toBe(true);
    expect(drive({ from: fin, useBoost: false }).fell).toBe(true);
  });
});
