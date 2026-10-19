// The military cordon (M9.1): edge to edge along the cordon line, torn
// gaps that stop only the player, the checkpoint's gate on the road.
import { describe, it, expect } from 'vitest';
import { cordonLayout, cordonColliders, checkpointGateCollider } from '../src/world/cordon.js';
import { resolveCircles } from '../src/world/collision.js';
import { rayBlockers } from '../src/combat/hitscan.js';
import { roadDistance } from '../src/world/road.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const k = config.map.cordon;
const map = makeMap(1);
const ground = makeGround(1);
const layout = cordonLayout(map, k);
const heightAt = (x, z) => ground.heightAt(x, z);
const colliders = cordonColliders(layout, k, heightAt);
const gate = checkpointGateCollider(layout, k, heightAt);

// Walk a body from north of the fence to south of it at x; where does it end up?
function walk(x, isPlayer, list = colliders) {
  const pos = { x, z: layout.z - 3 };
  for (let i = 0; i < 60; i++) {
    pos.z += 0.1;
    resolveCircles(pos, 0.4, list, isPlayer);
  }
  return pos.z > layout.z;
}

describe('the cordon', () => {
  it('is the same on every seed', () => {
    expect(cordonLayout(makeMap(77), k)).toEqual(layout);
  });

  it('runs edge to edge along the cordon line, broken only at the checkpoint', () => {
    const xs = layout.posts.map((p) => p.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(map.geometry.xMin);
    expect(xs[xs.length - 1]).toBeCloseTo(map.geometry.xMax);
    let covered = 0;
    for (const p of layout.panels) {
      expect(p.az).toBe(map.cluster.cordonZ);
      covered += p.bx - p.ax;
      expect(p.bx - p.ax).toBeLessThan(k.panelLength * 1.1);
    }
    const width = map.geometry.xMax - map.geometry.xMin;
    expect(covered).toBeCloseTo(width - k.checkpointHalf * 2);
  });

  it('leaves the checkpoint where the road crosses, due south of the outpost', () => {
    const cp = layout.checkpoint;
    const outpost = map.clearings[map.cluster.outpostIndex];
    expect(cp.x).toBeCloseTo(outpost.x);
    expect(roadDistance(map.road, cp.x, cp.z).distance).toBeLessThan(0.5);
    expect(cp.half * 2).toBeGreaterThan(config.map.road.width + config.map.road.shoulder * 2);
    for (const p of layout.panels) expect(p.bx <= cp.x - cp.half + 1e-6 || p.ax >= cp.x + cp.half - 1e-6).toBe(true);
  });

  it('has one torn panel at each gap and whole panels everywhere else', () => {
    const torn = layout.panels.filter((p) => p.kind === 'torn');
    expect(torn).toHaveLength(k.gaps.length);
    const home = map.geometry.cluster.home;
    for (const dx of k.gaps) expect(torn.some((p) => p.ax <= home.x + dx && p.bx > home.x + dx)).toBe(true);
  });

  it('stops everyone at a whole panel, only the player at a torn one', () => {
    const torn = layout.panels.find((p) => p.kind === 'torn');
    const whole = layout.panels.find((p) => p.kind === 'whole' && p.ax > torn.bx + 10);
    const mid = (p) => (p.ax + p.bx) / 2;
    expect(walk(mid(whole), true)).toBe(false);
    expect(walk(mid(whole), false)).toBe(false);
    expect(walk(mid(torn), true)).toBe(false);
    expect(walk(mid(torn), false)).toBe(true);
  });

  it("shuts the checkpoint's gate on the player only, until it's opened", () => {
    const x = layout.checkpoint.x;
    expect(walk(x, true, [gate])).toBe(false);
    expect(walk(x, false, [gate])).toBe(true);
    gate.off = true;
    expect(walk(x, true, [gate])).toBe(true);
    gate.off = false;
  });

  it("never stops a shot (it's chain-link)", () => {
    const whole = layout.panels[10];
    const x = (whole.ax + whole.bx) / 2;
    const y = heightAt(x, layout.z) + 1.5;
    const d = rayBlockers({ x, y, z: layout.z - 5 }, { x: 0, y: 0, z: 1 }, [...colliders, gate], 20, ground);
    expect(d).toBe(20);
  });

  it('keeps its signs and floodlights away from the gaps and the checkpoint', () => {
    const home = map.geometry.cluster.home;
    for (const s of [...layout.signs, ...layout.lamps]) {
      expect(Math.abs(s.x - layout.checkpoint.x)).toBeGreaterThan(layout.checkpoint.half);
      for (const dx of k.gaps) expect(Math.abs(s.x - (home.x + dx))).toBeGreaterThan(k.panelLength);
    }
    expect(layout.signs.length).toBeGreaterThan(10);
  });

  it('stands in a strip cleared of trees', () => {
    for (let x = -400; x <= 400; x += 25) {
      for (const dz of [-k.cleared * 0.5, 0, k.cleared * 0.5]) expect(ground.openAt(x, layout.z + dz)).toBeGreaterThan(0.9);
    }
  });
});
