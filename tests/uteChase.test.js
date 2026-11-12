// Build queue item 7: the ute chase and the garage (encounters/UteChase.js), scaffolding.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { gunTarget, chaseWave, garagePlace, nextUpgrade, UTE_FLAGS } from '../src/encounters/UteChase.js';
import { laterFlags, STORY_POINTS } from '../src/debug/storyStart.js';
import dialogue from '../src/data/dialogue.json';
import progress from '../src/data/progress.json';

const U = config.uteChase;

describe('the chase', () => {
  it("Sheriff's gun takes the nearest of the dead within range", () => {
    const list = [{ x: 30, z: 0, alive: true }, { x: 8, z: 0, alive: false }, { x: 12, z: 5, alive: true }, { x: 90, z: 0, alive: true }];
    expect(gunTarget({ x: 0, z: 0 }, list, U.chase.gunRange)).toBe(list[2]);
    expect(gunTarget({ x: 0, z: 0 }, [list[3]], U.chase.gunRange)).toBeNull();
  });

  it('the base keeps sending them, up to a cap round the ute', () => {
    expect(chaseWave(0, U.chase.perWave, U.chase.cap)).toBe(U.chase.perWave);
    expect(chaseWave(U.chase.cap - 3, U.chase.perWave, U.chase.cap)).toBe(3);
    expect(chaseWave(U.chase.cap + 5, U.chase.perWave, U.chase.cap)).toBe(0);
  });

  it('his gun keeps pace with what the base sends (it can be driven through)', () => {
    const killsPerSecond = 1 / U.chase.gunEvery / Math.ceil((60 * 1.6) / U.chase.gunDamage); // a dead agent: 60 x 1.6 health
    const sentPerSecond = U.chase.perWave / U.chase.every;
    expect(killsPerSecond).toBeGreaterThan(sentPerSecond * 0.6);
    // at the ute's speed the chase is under a minute
    expect((U.chase.reach + U.chase.clear) / config.ute.maxSpeed).toBeLessThan(40);
  });
});

describe('the garage and his bench', () => {
  it('stands outside the fence on the gate side, clear of the gate itself', () => {
    const L = { centre: { x: 0, z: 0 }, radius: 28, gate: { mid: { x: 0, z: 28 } } };
    const g = garagePlace(L, U.garage.out, U.garage.side);
    expect(Math.hypot(g.x, g.z)).toBeGreaterThan(L.radius + U.garage.depth / 2);
    expect(Math.hypot(g.x - L.gate.mid.x, g.z - L.gate.mid.z)).toBeGreaterThan((U.garage.bays * U.garage.bayWidth) / 2 - 2);
    expect(g.z).toBeCloseTo(L.radius + U.garage.out);
    expect(Math.abs(g.x)).toBeCloseTo(U.garage.side);
  });

  it('three bays; three upgrades, sold in order, each once', () => {
    expect(U.garage.bays).toBe(3);
    expect(U.upgrades.length).toBe(3);
    const bought = new Set();
    const order = [];
    for (;;) {
      const up = nextUpgrade(U.upgrades, (i) => bought.has(i));
      if (!up) break;
      order.push(up.id);
      bought.add(up.index);
    }
    expect(order).toEqual(U.upgrades.map((u) => u.id));
    for (const u of U.upgrades) {
      expect(u.cost).toBeGreaterThan(0);
      expect(['capacity', 'armour', 'shells']).toContain(u.effect);
    }
  });
});

describe('its data', () => {
  it('flags, lines, and the last Continue story point', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of UTE_FLAGS) expect(flags).toContain(f);
    const byId = new Map(dialogue.lines.map((l) => [l.id, l]));
    for (const id of ['ute.go.sheriff', 'ute.clear.sheriff', 'ute.home.ellen', 'ute.home.sheriff', 'ute.home.wyatt']) expect(byId.get(id)?.draft).toBe(true);
    for (const l of dialogue.lines) if (l.next) expect(byId.has(l.next)).toBe(true);
    expect(STORY_POINTS.at(-1).id).toBe('sheriffHome');
    expect(laterFlags('sheriffHome')).toContain('sheriffHome');
    expect(laterFlags('ute')).not.toContain('uteTaken');
    for (const f of laterFlags('sheriffHome')) expect(flags).toContain(f);
    // every story point builds on the one before it, all the way down the list
    const ids = STORY_POINTS.map((s) => s.id);
    for (let i = 1; i < ids.length; i++) for (const f of laterFlags(ids[i - 1])) expect(laterFlags(ids[i])).toContain(f);
  });
});
