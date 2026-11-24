// Nov 24 (Aaron: "make sure that I'm able to summon every enemy from the debug list"): the Enemies > Zombies
// tab has every kind of the dead, the Screamer, the mutant, and now the mega night's Hollow and Hanged.
import { describe, it, expect } from 'vitest';
import { Game } from '../src/core/Game.js';
import { config } from '../src/config.js';

function harness() {
  const items = [];
  const spawned = [];
  const toasts = [];
  const self = {
    cfg: config,
    player: { position: { x: 0, z: 0 }, yaw: 0 },
    combat: { enemies: { spawnZombie: (x, z, o) => (spawned.push({ x, z, o }), { health: 100 }) } },
    screamers: { spawn: () => ({ z: { health: 800 } }) },
    toast: { show: (t) => toasts.push(t) },
  };
  const menu = { tab: () => ({ addItem: (label, fn) => items.push({ label, fn }) }) };
  Game.prototype.addSpawnItems.call(self, menu);
  return { items, spawned, toasts };
}

describe('the debug menu spawns every enemy kind (Nov 24)', () => {
  it('lists the Screamer, the mutant, the Hollow, the Hanged and every kind of the dead', () => {
    const { items } = harness();
    const labels = items.map((i) => i.label).join('\n');
    for (const want of [/Screamer/, /a mutant/, /a Hollow/, /a Hanged/]) expect(labels).toMatch(want);
    for (const v of Object.keys(config.zombies.variants).filter((v) => v !== 'screamer')) expect(labels).toContain(`Spawn 3 ${v} dead`);
  });

  it('the Hollow comes as a mutant 16 m ahead; the Hanged lands beside Tom', () => {
    const { items, spawned } = harness();
    items.find((i) => /Hollow/.test(i.label)).fn();
    items.find((i) => /Hanged/.test(i.label)).fn();
    const [hollow, hanged] = spawned;
    expect(hollow.o).toMatchObject({ kind: 'mutant', authored: 'hollow', mode: 'chase' });
    expect(Math.hypot(hollow.x, hollow.z)).toBeCloseTo(16, 5);
    expect(hanged.o).toMatchObject({ authored: 'hanged', mode: 'chase' });
    expect(Math.hypot(hanged.x, hanged.z)).toBeLessThan(2);
  });
});
