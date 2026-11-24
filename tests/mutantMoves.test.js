// Nov 16 (Aaron): the mutant's moves: the slam, the backhand, the spin and the leap; it aims ahead, chains, and
// punishes standing still.
import { describe, it, expect } from 'vitest';
import { Zombie } from '../src/ai/Zombie.js';
import { config } from '../src/config.js';
import { inArc, predict, pickClose, startMove, maybeStartMove } from '../src/ai/mutantMoves.js';

const m = config.mutant.moves;

function mutant(x = 0, z = 0, facing = 0) {
  const zb = new Zombie(config.zombies);
  zb.spawn(x, z, facing, 3, { kind: 'mutant', body: config.mutant, health: config.mutant.health });
  return zb;
}

// Run it against a player (moving at vx, vz) until it's back walking or time's up; the blows it landed.
function run(zb, player, seconds = 4) {
  const hits = [];
  for (let t = 0; t < seconds; t += 1 / 60) {
    player.x += (player.vx ?? 0) / 60;
    player.z += (player.vz ?? 0) / 60;
    zb.update(1 / 60, player, (z, barrier, hit) => hits.push(hit));
    if (zb.state === 'walk' && t > 0.1) break;
  }
  return hits;
}

describe('the mutant (Nov 16)', () => {
  it('has its rebalanced health (20% under the doubled figure)', () => {
    expect(config.mutant.health).toBe(480);
    expect(config.gasStation.mutant.health).toBe(384);
    expect(config.night2.mutants.health).toBe(384);
  });

  it('every blow has a wind-up to read', () => {
    for (const k of ['slam', 'backhand', 'spin', 'leap']) expect(m[k].windup).toBeGreaterThanOrEqual(0.45);
  });

  it('picks its blows close in, and never the same twice running', () => {
    const zb = mutant();
    let last = null;
    for (let i = 0; i < 40; i++) {
      zb.lastMove = last;
      zb.chainCount = 0;
      const k = pickClose(zb, m);
      expect(['slam', 'backhand', 'spin']).toContain(k);
      expect(k).not.toBe(last);
      last = k;
    }
  });

  it('starts an attack from further off than its old swipe', () => {
    const zb = mutant(0, 0, 0);
    const player = { x: 0, z: 2.5, vx: 0, vz: 0 };
    zb.update(1 / 60, player, () => {});
    expect(zb.state).toBe('move');
    expect(config.mutant.moves.closeReach).toBeGreaterThan(config.mutant.attackReach);
  });

  it('aims where he is going, not where he is', () => {
    const at = predict({ x: 0, z: 0, vx: 4, vz: 0 }, 0.5, m.lead);
    expect(at.x).toBeCloseTo(4 * 0.5 * m.lead);
    // A sidestep across its front during the wind-up still gets caught by a wide backhand.
    const zb = mutant(0, 0, 0);
    const player = { x: 0, z: 1.8, vx: 3.5, vz: 0 };
    startMove(zb, m, 'backhand', player);
    const hits = run(zb, player, 1);
    expect(hits.length).toBe(1);
    expect(hits[0].push).toBeTruthy();
  });

  it("the slam's arc misses behind it, but its ground shock still reaches", () => {
    expect(inArc({ x: 0, z: 0, facing: 0 }, 0, -2, 2.7, 70)).toBe(false);
    expect(inArc({ x: 0, z: 0, facing: 0 }, 0, 2, 2.7, 70)).toBe(true);
    const zb = mutant(0, 0, 0);
    zb.moves = { ...m, lockBefore: 10 }; // it doesn't turn: he's square behind it
    const player = { x: 0, z: -1.2, vx: 0, vz: 0 };
    startMove(zb, zb.moves, 'slam', player);
    const hits = run(zb, player, 1.2);
    expect(hits.some((h) => h.kind === 'shock')).toBe(false); // too far from where the club comes down (in front)
    const player2 = { x: 0.5, z: 2.0, vx: 0, vz: 0 };
    const zb2 = mutant(0, 0, 0);
    startMove(zb2, m, 'slam', player2);
    expect(run(zb2, player2, 1.2).length).toBeGreaterThan(0);
  });

  it('the backhand throws him aside, the spin hits twice and leaves it dizzy and open', () => {
    const zb = mutant(0, 0, 0);
    const player = { x: 0, z: 2.0 };
    startMove(zb, m, 'spin', player);
    let dizzy = false;
    const hits = [];
    for (let t = 0; t < 3; t += 1 / 60) {
      zb.update(1 / 60, player, (z, b, hit) => hits.push(hit));
      // he keeps alongside it as it travels
      player.x = zb.x;
      player.z = zb.z + 1.5;
      if (zb.move?.phase === 'dizzy') {
        dizzy = true;
        break;
      }
    }
    expect(hits.length).toBe(m.spin.hits);
    expect(dizzy).toBe(true);
    // A hit while dizzy staggers it; mid-move it doesn't.
    zb.hit(10, 1, 0, { x: 0, z: 5 });
    expect(zb.state).toBe('stagger');
    const zb2 = mutant(0, 0, 0);
    startMove(zb2, m, 'slam', { x: 0, z: 2 });
    zb2.hit(10, 1, 0, { x: 0, z: 5 });
    expect(zb2.state).toBe('move');
  });

  it('leaps at a man who stands still, and lands short of him with a blast', () => {
    const zb = mutant(0, 0, 0);
    const player = { x: 0, z: 10, vx: 0, vz: 0 };
    zb.thinkT = 99; // no chance leaps: only the stand-still one
    let started = false;
    for (let t = 0; t < m.stillSeconds + 0.2 && !started; t += 1 / 60) started = maybeStartMove(zb, m, player, 1 / 60);
    expect(started).toBe(true);
    expect(zb.move.kind).toBe('leap');
    const hits = [];
    let landedAt = null;
    for (let t = 0; t < 3 && !landedAt; t += 1 / 60) {
      zb.update(1 / 60, player, (z, b, hit) => hits.push(hit));
      if (hits.length) landedAt = { x: zb.x, z: zb.z };
    }
    expect(hits[0].kind).toBe('leap');
    expect(Math.hypot(landedAt.x - player.x, landedAt.z - player.z)).toBeLessThan(m.leap.radius);
    expect(hits[0].hop).toBeGreaterThan(0);
  });

  it("doesn't leap at a man who keeps moving unless it rolls for it", () => {
    const zb = mutant(0, 0, 0);
    zb.thinkT = 99;
    const player = { x: 0, z: 10, vx: 3, vz: 0 };
    const mm = { ...m, stuckSeconds: 99 }; // (it isn't walking here: not 'blocked' either)
    let started = false;
    for (let t = 0; t < 4 && !started; t += 1 / 60) started = maybeStartMove(zb, mm, player, 1 / 60);
    expect(started).toBe(false);
  });

  it('leaps over whatever has it stuck short of him', () => {
    const zb = mutant(0, 0, 0);
    zb.thinkT = 99;
    const player = { x: 0, z: 4, vx: 0, vz: 0 }; // inside its leap's least, past its blows' reach
    zb.stillT = -99;
    let started = false;
    for (let t = 0; t < 1.2 && !started; t += 1 / 60) started = maybeStartMove(zb, { ...m, stillSeconds: 99 }, player, 1 / 60);
    expect(started).toBe(true);
    expect(zb.move.kind).toBe('leap');
  });

  it('a blow marks where it landed (for the cars and pumps)', () => {
    const zb = mutant(0, 0, 0);
    const player = { x: 0, z: 2 };
    startMove(zb, m, 'slam', player);
    let impact = null;
    for (let t = 0; t < 1 && !impact; t += 1 / 60) {
      zb.update(1 / 60, player, () => {});
      impact = zb.impact;
    }
    expect(impact).toBeTruthy();
    expect(impact.z).toBeGreaterThan(0.5); // in front of it
    expect(impact.kind).toBe('slam'); // Nov 24: the pumps tell a punch from a charge
  });

  it('names each impact by its move (Nov 24: punches no longer set the pumps off)', () => {
    const kinds = new Set();
    for (const kind of ['backhand', 'spin', 'leap']) {
      const zb = mutant(0, 0, 0);
      const player = { x: 0, z: kind === 'leap' ? 9 : 2 };
      startMove(zb, m, kind, player);
      for (let t = 0; t < 3; t += 1 / 60) {
        zb.update(1 / 60, player, () => {});
        if (zb.impact) kinds.add(zb.impact.kind);
        zb.impact = null;
      }
    }
    expect([...kinds]).toEqual(expect.arrayContaining(['backhand', 'leap', 'spin'])); // (it may chain a slam on)
    expect([...kinds].every((k) => ['slam', 'backhand', 'spin', 'leap'].includes(k))).toBe(true);
  });
});
