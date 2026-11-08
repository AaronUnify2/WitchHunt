import { describe, it, expect } from 'vitest';
import { WeaponState } from '../src/combat/WeaponState.js';
import { Weapons } from '../src/player/Weapons.js';
import { ammoDamage, turretRoundsFor } from '../src/base/turretMath.js';
import { savePlayer, loadPlayer } from '../src/core/saveData.js';
import { Health } from '../src/player/Health.js';
import { Armour } from '../src/player/Armour.js';
import { Inventory } from '../src/player/Inventory.js';
import { config } from './mapFixture.js';

const alien = config.weapons.ammoTypes.alienShells;

function weapons() {
  const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, null, { emit() {} });
  w.init({}, {}, {}, null);
  return w;
}

// A stand-in for Input: hold B for `seconds` (in steps of dt), then let go.
function holdB(w, seconds, dt = 0.05) {
  let pressed = true;
  let down = true;
  const input = { wasPressed: (a) => a === 'reload' && pressed, isDown: (a) => a === 'reload' && down };
  for (let t = 0; t < seconds; t += dt) {
    w.updateReload(dt, input);
    pressed = false;
  }
  down = false;
  w.updateReload(dt, input);
}

describe('ammo types (Session 20)', () => {
  it('alien shells do 150%, and the turret converts them at 7.2', () => {
    expect(alien.damageScale).toBe(1.5);
    const per = ammoDamage('alienShells', config.weapons, config.station.turret);
    expect(per).toBeCloseTo(72);
    expect(turretRoundsFor(1, per, config.station.turret.roundDamage)).toBeCloseTo(7.2);
  });

  it('reloads with the chosen type, putting the old rounds back first', () => {
    const normal = { rounds: 10 };
    const shells = { rounds: 6 };
    const s = new WeaponState(config.weapons.shotgun, normal, 'shotgun');
    s.addType('alienShells', shells, alien);
    s.init(4, null);
    expect(s.canReload).toBe(false); // full of normal shells
    expect(s.choose('alienShells')).toBe(true);
    expect(s.reserve).toBe(6);
    expect(s.canReload).toBe(true);
    expect(s.startReload()).toBe(true);
    expect(normal.rounds).toBe(14); // the four in the tube went back
    expect(s.mag).toBe(0);
    for (let i = 0; i < 40; i++) s.update(0.2);
    expect(s.mag).toBe(4);
    expect(shells.rounds).toBe(2);
    expect(s.damageScale).toBe(1.5);
    expect(s.choose('nonsense')).toBe(false);
  });

  it('tap B reloads; hold B chooses the next type with rounds, loading it on release', () => {
    const w = weapons();
    w.take('shotgun');
    w.select(w.order.indexOf('shotgun'));
    const st = w.states.shotgun;
    st.mag = 2;
    holdB(w, 0.1); // a tap: reload normal shells
    expect(st.reloading).toBe(true);
    expect(st.chosen).toBe('shotgun');
    st.cancelReload();
    holdB(w, 0.6); // a hold, no alien shells: stays on normal
    expect(st.chosen).toBe('shotgun');
    st.cancelReload();
    w.addAmmo('alienShells', 8);
    holdB(w, 0.6);
    expect(st.chosen).toBe('alienShells');
    expect(st.loaded).toBe('alienShells');
    expect(st.reloading).toBe(true);
    // The auto shotgun shares both pools.
    w.take('autoShotgun');
    expect(w.states.autoShotgun.typePools.alienShells).toBe(st.typePools.alienShells);
  });

  it('saves which type is loaded and chosen, and every pool', () => {
    const a = weapons();
    a.take('shotgun');
    a.addAmmo('alienShells', 5);
    const st = a.states.shotgun;
    st.choose('alienShells');
    st.startReload();
    const c = (w) => {
      const armour = new Armour(config.armour);
      armour.init();
      const health = new Health(config.health, armour);
      health.init();
      const inventory = new Inventory(config.inventory);
      inventory.init();
      return { health, armour, inventory, weapons: w, kills: 0 };
    };
    const d = JSON.parse(JSON.stringify(savePlayer({ position: { x: 0, z: 0 }, yaw: 0 }, c(a))));
    const b = weapons();
    loadPlayer(c(b), d);
    expect(b.states.shotgun.loaded).toBe('alienShells');
    expect(b.pools.alienShells.rounds).toBe(a.pools.alienShells.rounds);
    expect(b.pools.shotgun.rounds).toBe(a.pools.shotgun.rounds);
  });
});

// Regression (Aaron's round 31: no gun's rounds landed): a real shot through fireHitscan.
import * as THREE from 'three';
import { Rng } from '../src/core/Rng.js';
import { FLAT_GROUND } from '../src/world/collision.js';

describe('a shot lands (Session 20 regression)', () => {
  function range(id) {
    const w = new Weapons(config.weapons, config.aiming, config.aimAssist, config.player, new Rng(1), { emit() {} });
    w.init({}, { living: [] }, { query: (x, z, r, out) => ((out.length = 0), out) }, FLAT_GROUND);
    w.take(id);
    w.select(w.order.indexOf(id));
    w.eye = new THREE.Vector3(0, 1.6, 0);
    w.forward = new THREE.Vector3(0, 0, -1);
    w.right = new THREE.Vector3(1, 0, 0);
    w.up = new THREE.Vector3(0, 1, 0);
    const hits = [];
    const target = { x: 0, y: 0, z: -4, hitRadius: 0.5, height: 1.8, headBottom: 1.5, headRadius: 0.16, targetable: true, takeHit: (amount, part) => (hits.push({ amount, part }), false) };
    w.extraTargets.push(target);
    return { w, hits };
  }

  for (const id of ['rifle', 'shotgun', 'pistol', 'sniper']) {
    it(`the ${id} hits what it's aimed at`, () => {
      const { w, hits } = range(id);
      expect(() => w.fireHitscan(w.weapon)).not.toThrow();
      expect(hits.length).toBe(1);
      expect(hits[0].amount).toBeGreaterThan(0);
    });
  }

  it('alien shells hit 1.5x harder than normal shells', () => {
    const a = range('shotgun');
    a.w.fireHitscan(a.w.weapon);
    const b = range('shotgun');
    b.w.states.shotgun.loaded = 'alienShells';
    b.w.fireHitscan(b.w.weapon);
    expect(b.hits[0].amount).toBeCloseTo(a.hits[0].amount * 1.5);
  });
});
