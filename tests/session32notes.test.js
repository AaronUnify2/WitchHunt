// Session 32: Aaron's play-through notes, part 1 (HANDOVER's work list): the small fixes.
import { describe, it, expect } from 'vitest';
import { config, makeMap } from './mapFixture.js';
import { aidBoxOffered, aidBoxClear } from '../src/base/Station.js';
import { stairsPlacement } from '../src/world/StairsSite.js';
import { pathFrame } from '../src/world/clearingFrame.js';
import { HollerTraps } from '../src/combat/hollerTraps.js';
import holler from '../src/data/holler.json';

describe('the first aid box (note 1)', () => {
  it('is quiet only until Tom has stepped away from where he woke, or is hurt', () => {
    expect(aidBoxOffered(false, false)).toBe(false); // woken beside it, full health: no prompt
    expect(aidBoxOffered(false, true)).toBe(true); // been away and come back: it offers, full health or not
    expect(aidBoxOffered(true, false)).toBe(true); // hurt: at once
    expect(aidBoxClear(config.station)).toBeGreaterThan(config.station.interactRange);
  });
});

describe('the stairs face the way in (note 5)', () => {
  it('climb away from the pathway into their clearing, on every seed', () => {
    for (const seed of [1234, 7, 99]) {
      const map = makeMap(seed);
      const church = map.clearings.find((k) => k.key === 'timeCapsule');
      const p = stairsPlacement(map, church);
      const f = pathFrame(map, 'stairs');
      expect(p.yaw, `seed ${seed}`).toBeCloseTo(f.yaw, 6);
      // The foot (behind the middle, along -forward) is nearer the entrance than the top is.
      const fwd = { x: Math.sin(p.yaw), z: Math.cos(p.yaw) };
      const foot = { x: p.x - fwd.x * 2, z: p.z - fwd.z * 2 };
      const top = { x: p.x + fwd.x * 2, z: p.z + fwd.z * 2 };
      const d = (q) => Math.hypot(q.x - f.entrance.x, q.z - f.entrance.z);
      expect(d(foot)).toBeLessThan(d(top));
    }
  });

  it('still climb away from the church where no pathway reaches them', () => {
    const map = { clearings: [{ key: 'timeCapsule', x: 0, z: 0 }, { key: 'stairs', x: 10, z: 10, radius: 14 }], paths: [] };
    expect(stairsPlacement(map, map.clearings[0]).yaw).toBeCloseTo(Math.PI / 4, 6);
  });
});

describe('a bear trap and the quad (note 3)', () => {
  const rig = (riding) => {
    const said = [];
    const hurt = [];
    const player = { position: { x: 0, y: 0, z: -3 }, onGround: true, platform: null, rooted: false, riding: riding ? {} : null };
    const set = new Set();
    const site = { place: { x: 0, z: 0, radius: 30 }, traps: [{ i: 0, id: 'bear1', kind: 'bear', x: 0, z: 0 }], setTrap() {} };
    const t = new HollerTraps(config.holler, { emit() {}, on() {} });
    t.init({ site, player, combat: { alive: true, hurtPlayer: (d) => hurt.push(d), sfx: { play() {} } }, enemies: { living: [], alert() {} }, progress: { has: (f) => set.has(f), setFlag: (f) => set.add(f) }, texts: holler.traps, notify: (x) => said.push(x) });
    t.reset();
    t.update(0.05, true);
    player.position.z = 0; // onto it
    t.update(0.05, true);
    return { t, player, said, hurt };
  };

  it('catches Tom on foot, and holds him until he works free', () => {
    const r = rig(false);
    expect(r.t.held?.id).toBe('bear1');
    expect(r.player.rooted).toBe(true);
    expect(r.hurt.length).toBe(1);
    expect(r.t.options('X', false)[0].prompt).toContain('Hold X');
  });

  it('goes off under the quad and holds nothing', () => {
    const r = rig(true);
    expect(r.t.held).toBe(null);
    expect(r.player.rooted).toBe(false);
    expect(r.hurt.length).toBe(0);
    expect(r.t.list[0].state).toBe('sprung');
    expect(r.said).toContain(holler.traps.bear.wheel);
  });
});
