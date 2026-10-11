// The night's zombies (M4): owns the sigils and everything round them.
//  - Planting: a stand-in for the witch (until M7) plants at dusk from
//    night 2, perNight at a time up to the five-sigil cap, mostly on
//    empty sigil grounds (ai/sigilPlanter.js).
//  - Raising: at night each sigil raises zombies round itself (a single,
//    a horde or a mutant, by level) up to its own cap; sigil grounds
//    raise faster. Zombies climb out of the ground and wander the
//    pathways until they notice the player.
//  - The zombie level = active sigils (1-5), map-wide, unless the debug
//    menu overrides it.
//  - Dawn: most zombies sink back into the ground; a few stragglers stay.
//  - Digging: hold interact beside a sigil to dig it up (damage
//    interrupts); the level drops at once.
//
// Events: 'sigil:planted' { sigil }, 'sigil:dug' { sigil },
// 'sigil:raised' { sigil, type, count }, 'zombies:levelChanged' { level }.

import { Sigils } from './Sigils.js';
import { chooseSigilSpot } from './sigilPlanter.js';
import { levelForSigils, clampLevel, MAX_LEVEL } from './zombieLevels.js';
import { Digging } from '../player/Digging.js';
import { SigilRenderer } from '../render/SigilRenderer.js';
import { SigilGroundMarkers } from '../render/SigilGroundMarkers.js';

export class ZombieDirector {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.rng = rng;
    this.bus = bus;
  }

  // world: World. combat: Combat (enemies, sfx, hud, alive). notify(text): a toast.
  init(scene, world, combat, player, notify) {
    const cfg = this.cfg;
    this.world = world;
    this.combat = combat;
    this.enemies = combat.enemies;
    this.player = player;
    this.notify = notify;
    this.sigils = new Sigils(cfg.sigils, this.rng.fork('sigils'));
    this.sigils.init();
    this.plantRng = this.rng.fork('planter');
    this.digging = new Digging(cfg.digging);
    this.digging.init();
    this.renderer = new SigilRenderer(cfg.sigils.look, this.rng.fork('sigil-look'));
    this.renderer.init(scene, cfg.sigils.cap);
    this.markers = new SigilGroundMarkers(cfg.sigilGroundMarker, this.rng.fork('ground-markers'));
    this.markers.init(scene, world.map, world.ground);
    this.levelOverride = null; // debug: 1-5, or null for "count the sigils"
    this.level = 1;
    this.showOnMap = false;
    this.teleportIndex = -1;
    this.scrapeTimer = 0;
    this.due = [];
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD each frame
    this.dawnSeconds = cfg.clock.phases.find((p) => p.name === 'dawn')?.seconds ?? 60;
    this.drawDistance = Infinity;
    this.wireEvents();
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('phase:dusk', ({ day }) => this.plantForNight(day)),
      bus.on('phase:night', () => {
        this.sigils.startNight();
        this.enemies.cancelThinning();
      }),
      bus.on('phase:dawn', () => this.enemies.thinOut(this.dawnSeconds)),
      bus.on('player:hurt', () => this.digging.interrupt()),
      bus.on('player:respawned', () => this.digging.init()),
      bus.on('weapon:fired', ({ id }) => this.onNoise(this.cfg.weapons[id]?.noise ?? 0)),
      bus.on('weapon:swing', () => this.onNoise(this.cfg.weapons.shovel.noise ?? 0)),
    ];
  }

  onNoise(radius) {
    if (radius <= 0) return;
    const p = this.player.position;
    this.enemies.alert(p.x, p.z, radius);
  }

  get effectiveLevel() {
    return this.levelOverride ?? levelForSigils(this.sigils.count);
  }

  // phase: the clock's phase. playing: false while a menu or the map is open.
  update(dt, input, playing, phase, cameraPosition, daylight) {
    const level = this.effectiveLevel;
    if (level !== this.level) {
      this.level = level;
      this.bus.emit('zombies:levelChanged', { level });
    }
    this.enemies.setLevel(level);
    if (playing) {
      const raising = this.cfg.sigils.spawnPhases.includes(phase);
      for (const s of this.sigils.update(dt, raising, (sg) => this.enemies.ownedCount(sg), this.due)) this.raise(s);
      this.updateDigging(dt, input);
    } else {
      this.hud.prompt = '';
    }
    this.renderer.update(dt, daylight, cameraPosition, this.drawDistance);
    this.markers.update(cameraPosition);
  }

  // ---- raising -------------------------------------------------------------

  raise(sigil) {
    const r = this.cfg.sigils.spawnRadius;
    const { plan, spawned } = this.enemies.spawnRaising(sigil.x, sigil.z, {
      ringMin: r[0],
      ringMax: r[1],
      mix: sigil.variants,
      mode: 'wander',
      rise: true,
      owner: sigil,
    });
    if (spawned === 0) return;
    sigil.raised += spawned;
    this.combat.sfx.play('rise', sigil);
    this.bus.emit('sigil:raised', { sigil, type: plan.type, count: spawned });
  }

  // ---- planting ------------------------------------------------------------

  plantForNight(day) {
    const p = this.cfg.planter;
    if (day < p.firstNight) return;
    for (let i = 0; i < p.perNight; i++) this.plantOne();
  }

  // The stand-in witch plants one sigil by her rules. Returns it, or null.
  plantOne() {
    if (this.sigils.full) return null;
    const w = this.world;
    const spot = chooseSigilSpot(w.map, w.ground, this.sigils.list, this.player.position, this.cfg.planter, this.plantRng, (id) =>
      this.sigils.groundFree(id),
    );
    if (!spot) return null;
    return this.plant(spot);
  }

  // Debug: plant one right here, ignoring the rules (but not the cap).
  plantAt(x, z) {
    if (this.sigils.full) return null;
    const w = this.world;
    const pos = w.ground.clamp({ x, z });
    const inside = w.clearingAt(pos.x, pos.z);
    const ground = inside?.kind === 'sigilGround' && this.sigils.groundFree(inside.id) ? inside.id : -1;
    const near = w.nearestClearing(pos.x, pos.z).clearing;
    return this.plant({ x: pos.x, z: pos.z, y: w.ground.heightAt(pos.x, pos.z), groundId: ground, clearingId: near.id });
  }

  plant(spot) {
    const clearing = this.world.map.clearings[spot.clearingId];
    spot.variants = clearing ? this.world.variantMix(clearing) : null;
    const sigil = this.sigils.plant(spot);
    if (!sigil) return null;
    this.renderer.add(sigil, this.world.ground);
    this.bus.emit('sigil:planted', { sigil });
    return sigil;
  }

  // ---- digging -------------------------------------------------------------

  updateDigging(dt, input) {
    const p = this.player.position;
    const target = this.combat.alive ? this.sigils.nearest(p.x, p.z, this.cfg.digging.range) : null;
    const done = this.digging.update(dt, target, input.isDown('interact'));
    if (this.digging.active) {
      this.scrapeTimer -= dt;
      if (this.scrapeTimer <= 0) {
        this.combat.sfx.play('dig');
        this.scrapeTimer = this.cfg.digging.scrapeInterval;
      }
    } else {
      this.scrapeTimer = 0;
    }
    if (done) this.dig(done);
    const pad = input.activeDevice === 'gamepad';
    this.hud.prompt = target ? (this.digging.active ? 'Digging up the sigil…' : `Hold ${pad ? 'X' : 'E'}: dig up the sigil`) : '';
    this.hud.progress = this.digging.target ? this.digging.progress : 0;
  }

  // Dig a sigil up: it's gone, the level drops at once, and its zombies
  // carry on as strays.
  dig(sigil) {
    const before = this.effectiveLevel;
    this.remove(sigil);
    this.combat.sfx.play('cleanse');
    this.bus.emit('sigil:dug', { sigil });
    const after = this.effectiveLevel;
    const change = this.levelOverride !== null ? ' (level fixed by debug)' : before !== after ? `: zombie level ${before} → ${after}` : '';
    this.notify(`Sigil dug up. The land is cleansed${change}`);
  }

  remove(sigil) {
    if (!this.sigils.remove(sigil)) return;
    this.enemies.disown(sigil);
    this.renderer.remove(sigil);
  }

  removeAll() {
    for (const s of [...this.sigils.list]) this.remove(s);
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
    this.markers.setDrawDistance(distance);
  }

  // ---- debug tools ----------------------------------------------------------

  addDebugItems(menu) {
    const d = this.cfg.debug;
    menu.addItem(
      () => `Zombie level: ${this.levelOverride === null ? `auto (L${this.effectiveLevel} from ${this.sigils.count} sigils)` : `fixed L${this.levelOverride}`}`,
      () => {
        const next = this.levelOverride === null ? 1 : this.levelOverride + 1;
        this.levelOverride = next > MAX_LEVEL ? null : clampLevel(next);
      },
    );
    menu.addItem(() => `Plant sigil (stand-in witch, ${this.sigils.count}/${this.cfg.sigils.cap})`, () => {
      const s = this.plantOne();
      this.notify(s ? `Sigil planted ${this.describe(s)}` : this.sigils.full ? 'Five-sigil cap reached' : 'Nowhere left to plant');
    });
    menu.addItem('Plant sigil right here', () => {
      const p = this.player.position;
      const yaw = this.player.yaw;
      // In front of you (the camera looks down -z at yaw 0).
      const s = this.plantAt(p.x - Math.sin(yaw) * d.plantAhead, p.z - Math.cos(yaw) * d.plantAhead);
      this.notify(s ? 'Sigil planted in front of you' : 'Five-sigil cap reached');
    });
    menu.addItem('Raise zombies now (every sigil)', () => this.sigils.raiseAllNow());
    menu.addItem(() => `Teleport: next sigil (${this.sigils.count} planted)`, () => {
      const list = this.sigils.list;
      if (list.length === 0) {
        this.notify('No sigils planted');
        return;
      }
      this.teleportIndex = (this.teleportIndex + 1) % list.length;
      const s = list[this.teleportIndex];
      this.player.teleport(s.x, s.z + d.sigilTeleportOffset, 0);
      this.notify(`Teleported to sigil ${this.teleportIndex + 1}/${list.length} ${this.describe(s)}`);
    });
    menu.addItem('Remove all sigils', () => this.removeAll());
    menu.addItem(() => `Sigils on the map: ${this.showOnMap ? 'on' : 'off'}`, () => (this.showOnMap = !this.showOnMap));
    menu.addItem('Spawn a horde near me', () => this.enemies.spawnTypeNear(this.player.position, 'horde'));
    menu.addItem(() => `Spawn a mutant near me (${this.enemies.mutantCount}/${this.cfg.mutant.poolSize})`, () => {
      if (this.enemies.spawnTypeNear(this.player.position, 'mutant') === 0) this.notify('Mutant cap reached');
    });
  }

  // "at the Scarecrow field" or "in the woods near Bog clearing".
  describe(sigil) {
    const w = this.world;
    const c = w.map.clearings[sigil.groundId >= 0 ? sigil.groundId : sigil.clearingId];
    if (!c) return '';
    return sigil.groundId >= 0 ? `at the ${w.clearingName(c)}` : `in the woods near ${w.clearingName(c)}`;
  }

  overlayLines() {
    const s = this.sigils;
    const grounds = s.list.filter((g) => g.groundId >= 0).length;
    let next = Infinity;
    for (const g of s.list) next = Math.min(next, g.timer);
    const p = this.player.position;
    const near = s.nearest(p.x, p.z);
    const nearText = near ? `  nearest ${Math.round(Math.hypot(near.x - p.x, near.z - p.z))}m` : '';
    const override = this.levelOverride !== null ? ' (debug)' : '';
    const nextText = s.count > 0 && Number.isFinite(next) ? `  next raise ${Math.max(0, next).toFixed(0)}s` : '';
    return {
      sigils: `${s.count}/${this.cfg.sigils.cap} sigils (${grounds} on grounds)  level L${this.effectiveLevel}${override}${nextText}${nearText}`,
    };
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.markers.dispose();
    this.renderer.dispose();
    this.sigils.dispose();
  }
}
