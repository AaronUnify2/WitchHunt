// Combat: owns everything M2 adds and wires it together through the event
// bus: the zombie pool and its renderer, the player's weapons and view
// model, health, armour, first aid kits, hit effects, placeholder sounds,
// the placeholder HUD and the death screen. Game creates one, calls
// update() each frame and asks it whether the player is alive.
//
// Events: 'player:hurt' { damage, taken }, 'player:died', 'player:respawned'.

import * as THREE from 'three';
import { Health } from '../player/Health.js';
import { Armour } from '../player/Armour.js';
import { Inventory } from '../player/Inventory.js';
import { Weapons } from '../player/Weapons.js';
import { ViewModel } from '../player/ViewModel.js';
import { EnemyManager } from '../ai/EnemyManager.js';
import { ZombieRenderer } from '../render/ZombieRenderer.js';
import { CombatFx } from '../render/CombatFx.js';
import { Hud } from '../ui/Hud.js';
import { Sfx } from '../audio/Sfx.js';

export class Combat {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.rng = rng;
    this.bus = bus;
  }

  init(root, scene, player, colliders) {
    const c = this.cfg;
    this.player = player;
    this.armour = new Armour(c.armour);
    this.armour.init();
    this.health = new Health(c.health, this.armour);
    this.health.init();
    this.inventory = new Inventory(c.inventory);
    this.inventory.init();

    this.enemies = new EnemyManager(c.zombies, this.rng.fork('zombies'), this.bus, c.world.boundaryRadius);
    this.enemies.init(colliders);
    this.zombieRenderer = new ZombieRenderer(c.zombies, this.rng.fork('zombie-sprite'));
    this.zombieRenderer.init(scene, c.zombies.poolSize);

    this.weapons = new Weapons(c.weapons, c.aiming, c.aimAssist, c.player, this.rng.fork('weapons'), this.bus);
    this.weapons.init(player, this.enemies, colliders);
    scene.add(player.camera); // the view model hangs off the camera
    this.viewModel = new ViewModel(c.viewModel, c.weapons);
    this.viewModel.init(player.camera);

    this.fx = new CombatFx(c.feedback, this.rng.fork('fx'));
    this.fx.init(scene);
    this.hud = new Hud(c.hud);
    this.hud.init(root);
    this.sfx = new Sfx(c.sfx);
    this.sfx.init();

    this.groanRng = this.rng.fork('groans');
    this.groanTimers = new Map();
    this.glareCircles = [];
    this.godMode = false;
    this.kills = 0;
    this.alive = true;
    this.wireEvents();
  }

  wireEvents() {
    const { bus } = this;
    const muzzle = new THREE.Vector3();
    this.unsubscribers = [
      bus.on('enemy:strike', ({ zombie, damage }) => this.onStrike(zombie, damage)),
      bus.on('enemy:hit', ({ x, y, z, part, killed }) => {
        this.fx.blood(x, y, z, part === 'head');
        this.sfx.play(part === 'head' ? 'headshot' : 'flesh', { x, z });
        if (killed) this.sfx.play('kill', { x, z });
      }),
      bus.on('enemy:killed', () => this.kills++),
      bus.on('weapon:hit', ({ killed, part, melee }) => {
        this.hud.hitMarker(killed, part === 'head');
        if (melee) this.sfx.play('shovelHit');
      }),
      bus.on('weapon:fired', ({ id }) => {
        const cam = this.player.camera;
        cam.getWorldDirection(muzzle);
        this.fx.muzzleFlash(muzzle.multiplyScalar(0.7).add(cam.position));
        this.sfx.play(id);
        if (id === 'shotgun') this.sfx.play('pump');
      }),
      bus.on('weapon:impact', ({ x, y, z }) => {
        this.fx.dust(x, y, z);
        this.sfx.play('impact', { x, z });
      }),
      bus.on('weapon:swing', () => this.sfx.play('swing')),
      bus.on('weapon:reload', () => this.sfx.play('reload')),
      bus.on('weapon:loaded', () => this.sfx.play('loaded')),
      bus.on('weapon:empty', () => this.sfx.play('empty')),
      bus.on('weapon:switched', () => this.sfx.play('switch')),
    ];
  }

  // Called from the tap that starts the game (audio needs a user gesture).
  start() {
    this.sfx.unlock();
    this.hud.show(true);
    this.weapons.holdFire();
  }

  onStrike(zombie, damage) {
    this.sfx.play('swipe', zombie);
    if (!this.alive || this.godMode) return;
    const { taken } = this.health.takeDamage(damage);
    this.hud.hurt();
    this.player.shake(this.cfg.feedback.hurtShake);
    this.sfx.play('hurt');
    this.bus.emit('player:hurt', { damage, taken });
    if (this.health.dead) this.die();
  }

  die() {
    this.alive = false;
    this.player.moveMultiplier = 1;
    this.player.fovMultiplier = 1;
    this.hud.showDeath(this.kills);
    this.sfx.play('death');
    this.bus.emit('player:died');
  }

  // "Try again": fresh health, kit, ammo, no zombies, back to the start.
  respawn() {
    this.health.init();
    this.armour.init();
    this.inventory.init();
    this.weapons.reset();
    this.enemies.clear();
    this.fx.clear();
    this.groanTimers.clear();
    this.kills = 0;
    this.alive = true;
    this.player.reset();
    this.hud.hideDeath();
    this.bus.emit('player:respawned');
  }

  // playing: false while the debug menu is open or the game isn't running.
  update(dt, input, playing) {
    const player = this.player;
    if (playing) {
      if (this.alive) {
        this.weapons.update(dt, input, player.camera);
        if (input.wasPressed('firstAid') && this.inventory.useFirstAid(this.health)) this.sfx.play('heal');
        this.health.update(dt);
      } else if (input.wasPressed('menuConfirm')) {
        this.respawn();
      }
      this.enemies.update(dt, player.position);
      this.updateGroans(dt);
    }
    this.zombieRenderer.update(this.enemies.pool);
    this.viewModel.update(dt, this.weapons, player);
    this.fx.update(dt);
    this.sfx.setListener(player.position.x, player.position.z, player.yaw);
    this.hud.update(dt, { health: this.health, armour: this.armour, weapons: this.weapons, inventory: this.inventory, device: input.activeDevice });
  }

  // Each living zombie groans now and then (positional).
  updateGroans(dt) {
    const z = this.cfg.zombies;
    for (const zombie of this.enemies.living) {
      let t = this.groanTimers.get(zombie);
      if (t === undefined) t = this.groanRng.range(0, z.groanIntervalMax);
      t -= dt;
      if (t <= 0) {
        this.sfx.play('groan', zombie);
        t = this.groanRng.range(z.groanIntervalMin, z.groanIntervalMax);
      }
      this.groanTimers.set(zombie, t);
    }
  }

  // Close zombies, for the torch's glare check.
  glareExtras(origin) {
    return this.enemies.glareCircles(origin, this.cfg.zombies.glareRange, this.glareCircles);
  }

  // ---- debug tools ----------------------------------------------------------

  addDebugItems(menu) {
    const d = this.cfg.debug;
    menu.addItem(() => `Spawn ${this.cfg.zombies.spawnCount} zombies (active ${this.enemies.activeCount})`, () =>
      this.enemies.spawnAround(this.player.position),
    );
    menu.addItem(() => `Zombie speed: level ${this.enemies.level}`, () =>
      this.enemies.setLevel(this.enemies.level === 1 ? 5 : 1),
    );
    menu.addItem('Kill all zombies', () => this.enemies.clear());
    menu.addItem(() => `God mode: ${this.godMode ? 'on' : 'off'}`, () => (this.godMode = !this.godMode));
    menu.addItem(() => `Aim assist: ${this.cfg.aimAssist.enabled ? 'on' : 'off'}`, () =>
      (this.cfg.aimAssist.enabled = !this.cfg.aimAssist.enabled),
    );
    menu.addItem(`Give ammo (+${d.giveAmmoRounds} each gun)`, () => this.weapons.giveAmmo(d.giveAmmoRounds));
    menu.addItem(`Give armour (+${d.giveArmour} ballistic)`, () => this.armour.add('ballistic', d.giveArmour));
    menu.addItem(`Give first aid kits (+${d.giveFirstAid})`, () => this.inventory.addFirstAid(d.giveFirstAid));
    menu.addItem('Hurt me (-25)', () => {
      this.health.takeDamage(25);
      this.hud.hurt();
      if (this.health.dead) this.die();
    });
  }

  overlayLine() {
    const w = this.weapons;
    const s = w.state;
    const ammo = s.usesAmmo ? `${s.mag}/${s.reserve}${s.reloading ? ' reloading' : ''}` : '';
    const a = this.armour;
    return `enemies ${this.enemies.livingCount} alive / ${this.enemies.activeCount} active (L${this.enemies.level})  hp ${this.health.value} armour ${a.get('ballistic')}/${a.get('energy')}/${a.get('nature')}  ${w.id} ${ammo}  assist x${this.player.lookScale.toFixed(2)}  kills ${this.kills}${this.godMode ? '  GOD' : ''}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.hud.dispose();
    this.fx.dispose();
    this.viewModel.dispose();
    this.weapons.dispose();
    this.zombieRenderer.dispose();
    this.enemies.dispose();
    this.sfx.dispose();
  }
}
