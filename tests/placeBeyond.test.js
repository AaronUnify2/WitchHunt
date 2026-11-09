import { describe, it, expect } from 'vitest';
import { Rng } from '../src/core/Rng.js';
import { DIRS, opposite, dealClearing, startWalk, choosePath, exitSide } from '../src/world/placeBeyond.js';

describe('The place beyond (Session 22 spike): the four-path rules', () => {
  it('every clearing has the way back, two calling paths and one silent', () => {
    const rng = new Rng(1);
    for (const came of DIRS) {
      for (let i = 0; i < 20; i++) {
        const c = dealClearing(rng, came);
        expect(c.cameFrom).toBe(came);
        expect(c.calling).toHaveLength(2);
        expect(new Set([c.cameFrom, c.silent, ...c.calling]).size).toBe(4);
      }
    }
  });

  it('three silent paths in a row find Junie', () => {
    const rng = new Rng(2);
    let walk = startWalk(rng, 3);
    const outcomes = [];
    for (let i = 0; i < 3; i++) {
      const r = choosePath(walk, walk.clearing.silent, rng);
      outcomes.push(r.outcome);
      walk = r.walk;
    }
    expect(outcomes).toEqual(['silent', 'silent', 'found']);
  });

  it('a calling path loops back to the start, three right choices away again', () => {
    const rng = new Rng(3);
    let walk = startWalk(rng, 3);
    walk = choosePath(walk, walk.clearing.silent, rng).walk;
    walk = choosePath(walk, walk.clearing.silent, rng).walk;
    expect(walk.step).toBe(2);
    const r = choosePath(walk, walk.clearing.calling[0], rng);
    expect(r.outcome).toBe('loop');
    expect(r.walk.step).toBe(0);
  });

  it('arriving through a path, the way back is the side he came in by', () => {
    const rng = new Rng(4);
    const walk = startWalk(rng, 3);
    const dir = walk.clearing.silent;
    const r = choosePath(walk, dir, rng);
    expect(r.walk.clearing.cameFrom).toBe(opposite(dir));
  });

  it('the way back leads out from the first clearing, and loops from a later one', () => {
    const rng = new Rng(5);
    const walk = startWalk(rng, 3);
    expect(choosePath(walk, 'south', rng).outcome).toBe('out');
    const later = choosePath(walk, walk.clearing.silent, rng).walk;
    expect(choosePath(later, later.clearing.cameFrom, rng).outcome).toBe('loop');
  });

  it('an exit counts only out along a path', () => {
    expect(exitSide(0, -31, 30, 2.5)).toBe('north');
    expect(exitSide(1, 31, 30, 2.5)).toBe('south');
    expect(exitSide(31, -2, 30, 2.5)).toBe('east');
    expect(exitSide(-31, 0, 30, 2.5)).toBe('west');
    expect(exitSide(10, -31, 30, 2.5)).toBe(null); // off the path, in the trees
    expect(exitSide(0, 20, 30, 2.5)).toBe(null);
  });
});
