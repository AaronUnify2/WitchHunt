// Combat: owns everything M2 adds and wires it together through the event
// bus: the zombie pool and its renderers, the player's weapons and view
// model, health, armour, first aid kits, hit effects, placeholder sounds,
// the placeholder HUD and the death screen. M4 adds mutants (their own 3D
// renderer), loot drops and pickups, and feeds the zombies what they need
// to notice the player (light, torch, stance, noise). Game creates one,
// calls update() each frame and asks it whether the player is alive.
//
// Events: 'player:hurt' { damage, taken }, 'player:died', 'player:respawned',
// 'pickup:taken' { item, amount }.

import * as THREE from 'three';
import { Health } from '../player/Health.js';
import { Armour } from '../player/Armour.js';
import { Inventory } from '../player/Inventory.js';
import { Weapons } from '../player/Weapons.js';
import { ViewModel } from '../player/ViewModel.js';
import { ScopeOverlay } from '../ui/ScopeOverlay.js';
import { EnemyManager } from '../ai/EnemyManager.js';
import { ZombieRenderer } from '../render/ZombieRenderer.js';
import { MutantRenderer } from '../render/MutantRenderer.js';
import { CombatFx } from '../render/CombatFx.js';
import { PickupRenderer } from '../render/PickupRenderer.js';
import { Pickups } from '../world/Pickups.js';
import { rollLoot, lootTableFor, pickupLabel } from './loot.js';
import { Hud } from '../ui/Hud.js';
import { Sfx } from '../audio/Sfx.js';
import lootData from '../data/loot.json';
import { DEBUG } from '../debug/DebugMenu.js';

export class Combat {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.rng = rng;
    this.bus = bus;
  }

  // lights: { sky, flashlight }, so the in-hand weapon can follow the light
  // and zombies can tell whether the torch is on. world: { map, ground,
  // variantMixAt(x, z) } (heights, undergrowth, bounds, pathways).
  init(root, scene, player, colliders, lights, world) {
    const c = this.cfg;
    const ground = world.ground;
    this.player = player;
    this.flashlight = lights?.flashlight ?? null;
    this.drawDistance = Infinity; // M6: set by Game from the quality preset
    this.armour = new Armour(c.armour);
    this.armour.init();
    this.health = new Health(c.health, this.armour);
    this.health.init();
    this.inventory = new Inventory(c.inventory);
    this.inventory.init();

    this.enemies = new EnemyManager(c, this.rng.fork('zombies'), this.bus, world);
    this.enemies.init(colliders);
    this.zombieRenderer = new ZombieRenderer(c.zombies, this.rng.fork('zombie-sprite'));
    this.zombieRenderer.init(scene, c.zombies.lod.renderCap);
    this.mutantRenderer = new MutantRenderer(c.mutant, c.zombies);
    this.mutantRenderer.init(scene);

    this.weapons = new Weapons(c.weapons, c.aiming, c.aimAssist, c.player, this.rng.fork('weapons'), this.bus);
    this.weapons.init(player, this.enemies, colliders, ground);
    scene.add(player.camera); // the view model hangs off the camera
    this.viewModel = new ViewModel(c.viewModel, c.weapons);
    this.viewModel.init(player.camera, lights?.sky, lights?.flashlight);

    this.ground = ground;
    this.items = lootData.items;
    this.lootTables = lootData.tables;
    this.lootRng = this.rng.fork('loot');
    this.drops = [];
    this.pickups = new Pickups(c.pickups);
    this.pickups.init();
    this.pickupRenderer = new PickupRenderer(c.pickups);
    this.pickupRenderer.init(scene, c.pickups.poolSize, this.items);
    this.take = (item, amount) => this.takePickup(item, amount);

    this.fx = new CombatFx(c.feedback, this.rng.fork('fx'));
    this.fx.init(scene, ground);
    this.hud = new Hud(c.hud);
    this.hud.init(root);
    this.scope = new ScopeOverlay(); // Session 10b: the hunting rifle's scope view
    this.scope.init(root);
    this.sfx = new Sfx(c.sfx);
    this.sfx.init();

    this.groanRng = this.rng.fork('groans');
    this.groanTimers = new Map();
    this.glareCircles = [];
    this.senses = { x: 0, z: 0, eyeY: 0, daylight: 0, torchOn: false, crouched: false, sprinting: false, speed: 0, undergrowth: 0 };
    this.promptSources = []; // { prompt, progress } objects (sigil digging, the station); the first with a prompt shows
    this.noPrompt = { prompt: '', progress: 0 };
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
        const critical = part === 'head' || part === 'weak';
        this.fx.blood(x, y, z, critical);
        this.sfx.play(critical ? 'headshot' : 'flesh', { x, z });
        if (killed) this.sfx.play('kill', { x, z });
      }),
      bus.on('enemy:killed', ({ zombie }) => {
        this.kills++;
        this.dropLoot(zombie);
      }),
      bus.on('enemy:charge', ({ zombie }) => this.sfx.play('charge', zombie)),
      bus.on('weapon:hit', ({ killed, part, melee }) => {
        this.hud.hitMarker(killed, part === 'head' || part === 'weak');
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
    if (this.player.platform) return; // up the lookout tower, out of reach (M5)
    this.hurtPlayer(damage, zombie.kind === 'mutant' ? 2 : 1);
  }

  // Damage the player (armour first). shake: x the usual hurt shake.
  // Also used by the witch's swipes and hexes (M7).
  hurtPlayer(damage, shake = 1) {
    if (!this.alive || this.godMode) return;
    const { taken } = this.health.takeDamage(damage);
    this.hud.hurt();
    this.player.shake(this.cfg.feedback.hurtShake * shake);
    this.sfx.play('hurt');
    this.bus.emit('player:hurt', { damage, taken });
    if (this.health.dead) this.die();
  }

  // The run ends: M7's run-end screen (ui/RunEndScreen.js) takes over
  // from here ('player:died', 'player:overrun', and Game's victory).
  die() {
    this.alive = false;
    this.player.moveMultiplier = 1;
    this.player.fovMultiplier = 1;
    this.sfx.play('death');
    this.bus.emit('player:died');
  }

  // M5: a zombie got into the comms room. The run ends like a death.
  overrun(reason = 'The dead broke into the comms room.') {
    if (!this.alive) return;
    this.alive = false;
    this.player.moveMultiplier = 1;
    this.player.fovMultiplier = 1;
    this.sfx.play('overrun');
    this.bus.emit('player:overrun', { reason });
  }

  // M7: the witch is dead and the run is won (the ending plays next).
  victory() {
    if (!this.alive) return;
    this.alive = false;
    this.player.moveMultiplier = 1;
    this.player.fovMultiplier = 1;
  }

  // Session 10b: a gun found in the world (the hunting rifle). Any of its
  // rounds picked up before it (kept in the inventory) load into it.
  giveWeapon(id, rounds = 0) {
    const w = this.weapons;
    w.setSlot(id, true);
    const type = w.ammoType(id);
    const stored = this.inventory.ammo[type] ?? 0;
    if (stored > 0) delete this.inventory.ammo[type];
    w.addAmmo(type, rounds + stored);
    w.select(w.order.indexOf(id));
  }

  // "Try again": fresh health, kit, ammo, no zombies, back to the start.
  respawn() {
    this.health.init();
    this.armour.init();
    this.inventory.init();
    this.weapons.reset();
    this.enemies.clear();
    this.pickups.clear();
    this.fx.clear();
    this.groanTimers.clear();
    this.kills = 0;
    this.alive = true;
    this.player.reset();
    this.hud.hideDeath();
    this.bus.emit('player:respawned');
  }

  // ---- loot ------------------------------------------------------------------

  dropLoot(zombie) {
    const c = this.cfg.pickups;
    for (const { item, amount } of rollLoot(lootTableFor(zombie, this.lootTables), this.lootRng, this.drops)) {
      const a = this.lootRng.range(0, Math.PI * 2);
      const r = this.lootRng.range(0, c.scatter);
      const pos = this.ground.clamp({ x: zombie.x + Math.sin(a) * r, z: zombie.z + Math.cos(a) * r });
      this.pickups.drop(item, amount, pos.x, this.ground.heightAt(pos.x, pos.z), pos.z, a);
    }
  }

  // Walking over a pickup. False leaves it lying (nothing to gain).
  takePickup(item, amount) {
    const def = this.items[item];
    if (!def) return false;
    if (def.armour) {
      if (this.armour.add(def.armour, def.amount) <= 0) return false;
    } else if (def.firstAid) {
      if (this.inventory.firstAidFull) return false;
      this.inventory.addFirstAid(amount);
    } else if (def.ammo) {
      // Into the pool of the guns that fire it, or the pack until you have one.
      if (!this.weapons.addAmmo(def.ammo, amount)) this.inventory.addAmmo(def.ammo, amount);
    } else if (def.inventory === 'scrap') {
      this.inventory.addScrap(amount);
    } else {
      return false;
    }
    this.hud.pickup(pickupLabel(def, amount));
    this.sfx.play('pickup');
    this.bus.emit('pickup:taken', { item, amount });
    return true;
  }

  // ---- each frame --------------------------------------------------------------

  // What the zombies need to notice the player this frame.
  updateSenses(daylight) {
    const p = this.player;
    const s = this.senses;
    s.x = p.position.x;
    s.z = p.position.z;
    s.eyeY = p.camera.position.y;
    s.daylight = daylight;
    s.torchOn = this.flashlight?.on ?? false;
    s.crouched = p.crouched;
    s.sprinting = p.sprinting;
    s.speed = p.speed;
    s.undergrowth = p.undergrowth;
    return s;
  }

  // playing: false while the debug menu or map is open or the game isn't
  // running. daylight: 0 at night, 1 by day (for the zombies' eyes).
  // locked: the player's controls are busy elsewhere (the ledger is open;
  // the world carries on).
  update(dt, input, playing, daylight = 0, locked = false) {
    const player = this.player;
    if (playing) {
      if (this.alive && !locked) {
        this.weapons.update(dt, input, player.camera);
        if (input.wasPressed('firstAid') && this.inventory.useFirstAid(this.health)) this.sfx.play('heal');
        this.health.update(dt);
      }
      if (this.alive) this.pickups.update(dt, player.position.x, player.position.z, this.take);
      // Permadeath (Aaron, M6): the run-end screen (M7) starts a new run.
      // The debug menu's "try again" keeps the old in-place reset.
      this.enemies.update(dt, this.updateSenses(daylight));
      this.updateGroans(dt);
    }
    this.zombieRenderer.update(this.enemies.pool, player.position, this.drawDistance + this.cfg.zombies.lod.drawMargin, this.enemies.showTiers);
    this.mutantRenderer.update(this.enemies.pool, dt);
    this.pickupRenderer.update(dt, this.pickups.pool);
    this.viewModel.update(dt, this.weapons, player);
    this.scope.update(this.alive ? this.weapons.scoped : 0, !!this.weapons.weapon.thermal);
    this.fx.update(dt);
    this.sfx.setListener(player.position.x, player.position.z, player.yaw);
    this.hud.update(dt, {
      health: this.health,
      armour: this.armour,
      weapons: this.weapons,
      inventory: this.inventory,
      device: input.activeDevice,
      dig: this.alive && !locked ? this.activePrompt() : null,
      hidden: this.alive && this.enemies.senses.hidden,
      chargesPlaced: this.chargesPlaced ?? 0, // M7: set by Explosives
    });
  }

  activePrompt() {
    for (const p of this.promptSources) if (p.prompt) return p;
    return this.noPrompt;
  }

  // Each living zombie within earshot groans now and then (positional).
  updateGroans(dt) {
    const z = this.cfg.zombies;
    const p = this.player.position;
    const hearing = this.cfg.sfx.hearingDistance;
    for (const zombie of this.enemies.living) {
      let t = this.groanTimers.get(zombie);
      if (t === undefined) t = this.groanRng.range(0, z.groanIntervalMax);
      t -= dt;
      if (t <= 0) {
        if (zombie.state !== 'rise' && Math.hypot(zombie.x - p.x, zombie.z - p.z) < hearing) {
          this.sfx.play(zombie.kind === 'mutant' ? 'mutantGroan' : 'groan', zombie);
        }
        t = this.groanRng.range(z.groanIntervalMin, z.groanIntervalMax);
      }
      this.groanTimers.set(zombie, t);
    }
  }

  // M6: zombie sprites past the draw distance aren't drawn (Game passes
  // the quality preset's).
  setDrawDistance(metres) {
    this.drawDistance = metres;
  }

  // Close zombies and pickups, for the torch's glare check.
  glareExtras(origin) {
    this.enemies.glareCircles(origin, this.cfg.zombies.glareRange, this.glareCircles);
    return this.pickups.glareCircles(origin, this.cfg.pickups.glareRange, this.glareCircles);
  }

  // ---- debug tools ----------------------------------------------------------

  addDebugItems(menu) {
    const d = this.cfg.debug;
    const zombies = menu.category(DEBUG.zombies);
    const player = menu.category(DEBUG.player);
    zombies.addItem(() => `Spawn ${this.cfg.zombies.spawnCount} zombies near me (${this.enemies.activeCount} on the map)`, () =>
      this.enemies.spawnAround(this.player.position),
    );
    zombies.addItem('Kill all zombies', () => this.enemies.clear());
    menu.category(DEBUG.run).addItem('Try again here (after a death: same map, same night)', () => {
      if (!this.alive) this.respawn();
    });
    // M6: the simulation tiers.
    zombies.addItem(`Populate the map (+${d.populateCount} on the pathways)`, () =>
      this.enemies.populate(this.player.position, d.populateCount, this.cfg.zombies.lod.activeRadius),
    );
    zombies.addItem(() => `Tier colours ${this.enemies.showTiers ? 'on' : 'off'}`, () => (this.enemies.showTiers = !this.enemies.showTiers));
    player.addItem(() => `God mode: ${this.godMode ? 'on' : 'off'}`, () => (this.godMode = !this.godMode));
    player.addItem(() => `Aim assist: ${this.cfg.aimAssist.enabled ? 'on' : 'off'}`, () =>
      (this.cfg.aimAssist.enabled = !this.cfg.aimAssist.enabled),
    );
    player.addItem(`Give ammo (+${d.giveAmmoRounds} each gun)`, () => this.weapons.giveAmmo(d.giveAmmoRounds));
    // Session 10b: the hunting rifle comes from an encounter later (Aaron).
    player.addItem(`Give the hunting rifle (+${this.cfg.weapons.sniper.debugRounds} rounds)`, () => this.giveWeapon('sniper', this.cfg.weapons.sniper.debugRounds));
    // Session 10b: guns for Aaron to experiment with.
    for (const id of ['pistol', 'smg', 'thermal', 'autoShotgun']) {
      const w = this.cfg.weapons[id];
      player.addItem(`Give the ${w.name.toLowerCase()} (+${w.debugRounds} rounds)`, () => this.giveWeapon(id, w.debugRounds));
    }
    player.addItem(`Give armour (+${d.giveArmour} ballistic)`, () => this.armour.add('ballistic', d.giveArmour));
    player.addItem(`Give first aid kits (+${d.giveFirstAid})`, () => this.inventory.addFirstAid(d.giveFirstAid));
    player.addItem('Hurt me (-25)', () => {
      this.health.takeDamage(25);
      this.hud.hurt();
      this.bus.emit('player:hurt', { damage: 25, taken: 25 });
      if (this.health.dead) this.die();
    });
  }

  overlayLine() {
    const w = this.weapons;
    const s = w.state;
    const ammo = s.usesAmmo ? `${s.mag}/${s.reserve}${s.reloading ? ' reloading' : ''}` : '';
    const a = this.armour;
    const inv = this.inventory;
    return `hp ${this.health.value} armour ${a.get('ballistic')}/${a.get('energy')}/${a.get('nature')}  ${w.id} ${ammo}  scrap ${inv.scrap} pistol ${inv.ammo.pistol ?? 0}  pickups ${this.pickups.activeCount}  assist x${this.player.lookScale.toFixed(2)}  kills ${this.kills}${this.godMode ? '  GOD' : ''}`;
  }

  // Zombies by variant and by what they're doing, and how far the player
  // can be seen and heard from right now.
  zombieOverlayLine() {
    const e = this.enemies;
    const t = e.tally();
    const s = e.senses;
    const sight = Number.isFinite(s.sight) ? s.sight.toFixed(0) : '-';
    const hear = Number.isFinite(s.hearing) ? s.hearing.toFixed(0) : '-';
    return `L${e.level}  ${e.livingCount} alive / ${e.activeCount} active  citizen ${t.citizen} police ${t.police} army ${t.army} mutant ${t.mutant}  horde ${t.horde}  chase ${t.chase} search ${t.search} wander ${t.wander} rising ${t.rise}  stragglers ${t.stragglers}  seen from ${sight}m heard ${hear}m`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.hud.dispose();
    this.fx.dispose();
    this.viewModel.dispose();
    this.scope.dispose();
    this.weapons.dispose();
    this.pickupRenderer.dispose();
    this.pickups.dispose();
    this.mutantRenderer.dispose();
    this.zombieRenderer.dispose();
    this.enemies.dispose();
    this.sfx.dispose();
  }
}
