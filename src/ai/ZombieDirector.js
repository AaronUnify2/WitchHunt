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
//  - M6, night marches: each raising rolls whether it's a marching group
//    (odds set so about two thirds of the night's zombies march). A
//    group (4 at level 1 up to 10 at level 5; a mutant can lead one; a
//    horde marches as it is) climbs out together and sets off along the
//    pathways for the station at once. A sigil raises at most its night
//    quota.
//  - M6, revisits (Aaron): at night, coming back to an encounter you've
//    visited before turns up a few zombies hanging about there.
//
// Events: 'sigil:planted' { sigil }, 'sigil:dug' { sigil },
// 'sigil:raised' { sigil, type, count }, 'zombies:levelChanged' { level },
// 'march:departed' { sigil, count }, 'revisit:spawned' { clearing, count }.

import { Sigils } from './Sigils.js';
import { chooseSigilSpot } from './sigilPlanter.js';
import { levelForSigils, clampLevel, MAX_LEVEL } from './zombieLevels.js';
import { Digging } from '../player/Digging.js';
import { Revisits } from './revisits.js';
import { SigilRenderer } from '../render/SigilRenderer.js';
import { SigilGroundMarkers } from '../render/SigilGroundMarkers.js';

// The chance a raising is a marching group of `size`, so that `share`
// of the zombies raised march (the rest are single wanderers):
// p * size / (p * size + (1 - p)) = share.
export function marchChance(share, size) {
  if (share >= 1) return 1;
  if (share <= 0) return 0;
  return share / (size * (1 - share) + share);
}

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
    this.marchRng = this.rng.fork('marches');
    this.spawned = []; // reused: the zombies one raising spawned
    this.marchesSent = 0; // groups sent tonight (overlay)
    this.revisits = new Revisits(cfg.revisits, world.map.clearings);
    this.revisits.init();
    this.revisitRng = this.rng.fork('revisits');
    this.revisitsTonight = 0;
    this.night = null; // the night number while it's night
    this.drawDistance = Infinity;
    this.wireEvents();
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('phase:dusk', ({ day }) => this.plantForNight(day)),
      bus.on('phase:night', ({ day }) => {
        this.night = day ?? 0;
        this.marchesSent = 0;
        this.revisitsTonight = 0;
        this.sigils.startNight();
        this.enemies.cancelThinning();
      }),
      bus.on('phase:dawn', () => {
        this.night = null;
        this.enemies.thinOut(this.dawnSeconds);
      }),
      bus.on('phase:day', () => (this.night = null)),
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
      const sc = this.cfg.sigils;
      const raising = sc.spawnPhases.includes(phase);
      const quota = sc.nightQuota[level - 1] ?? Infinity;
      for (const s of this.sigils.update(dt, raising, (sg) => this.enemies.ownedCount(sg), this.due, quota)) this.raise(s);
      const p = this.player.position;
      for (const c of this.revisits.update(p.x, p.z, phase === 'night' ? this.night ?? 0 : null)) this.spawnRevisit(c);
      this.updateDigging(dt, input);
    } else {
      this.hud.prompt = '';
    }
    this.renderer.update(dt, daylight, cameraPosition, this.drawDistance);
    this.markers.update(cameraPosition);
  }

  // ---- raising -------------------------------------------------------------

  // One raising: a wanderer (counted toward the sigil's own cap), or a
  // marching group (a horde, or a group of the level's size) that sets
  // off for the station at once.
  raise(sigil) {
    const sc = this.cfg.sigils;
    const level = this.enemies.level;
    const quota = sc.nightQuota[level - 1] ?? Infinity;
    const size = Math.max(1, Math.min(sc.marchGroupSize[level - 1] ?? 1, quota - sigil.nightRaised));
    let plan = this.enemies.rollPlan();
    const out = this.spawned;
    out.length = 0;
    const opts = { ringMin: sc.spawnRadius[0], ringMax: sc.spawnRadius[1], mix: sigil.variants, rise: true, out };
    let spawned = 0;
    if (!this.marchRng.chance(marchChance(sc.marchShare, size))) {
      if (plan.type === 'horde') plan = { type: 'single', count: 1 }; // a horde always marches
      spawned = this.enemies.spawnPlanned(plan, sigil.x, sigil.z, { ...opts, mode: 'wander', owner: sigil });
    } else {
      opts.mode = 'march';
      if (plan.type === 'horde') {
        spawned = this.enemies.spawnPlanned(plan, sigil.x, sigil.z, opts);
      } else {
        // A mutant can lead a group; the rest are singles round the same spot.
        if (plan.type === 'mutant') spawned += this.enemies.spawnPlanned(plan, sigil.x, sigil.z, opts);
        while (spawned < size) {
          const n = this.enemies.spawnPlanned({ type: 'single', count: 1 }, sigil.x, sigil.z, opts);
          if (n === 0) break;
          spawned += n;
        }
      }
      if (spawned > 0) {
        this.enemies.formMarch(out, out[0].horde ?? { leader: null, radius: this.cfg.zombies.horde.radius });
        this.marchesSent++;
        this.bus.emit('march:departed', { sigil, count: spawned });
      }
    }
    if (spawned === 0) return;
    sigil.raised += spawned;
    sigil.nightRaised += spawned;
    this.combat.sfx.play('rise', sigil);
    this.bus.emit('sigil:raised', { sigil, type: plan.type, count: spawned });
  }

  // ---- night marches -------------------------------------------------------

  // Debug: raise a marching group at a sigil now (whatever the odds).
  raiseMarch(sigil) {
    const share = this.cfg.sigils.marchShare;
    this.cfg.sigils.marchShare = 1;
    this.raise(sigil);
    this.cfg.sigils.marchShare = share;
  }

  // Revisited at night: a few zombies hanging about the clearing.
  spawnRevisit(clearing) {
    const rc = this.cfg.revisits;
    const r = clearing.radius * rc.spread;
    const count = this.revisitRng.int(rc.count[0], rc.count[1]);
    const mix = this.world.variantMix(clearing);
    const linger = { x: clearing.x, z: clearing.z, r };
    let n = 0;
    for (let i = 0; i < count; i++) {
      n += this.enemies.spawnPlanned({ type: 'single', count: 1 }, clearing.x, clearing.z, { ringMin: 0, ringMax: r, mix, mode: 'linger', rise: false, linger });
    }
    if (n > 0) {
      this.revisitsTonight++;
      this.bus.emit('revisit:spawned', { clearing, count: n });
    }
    return n;
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
    // M6: night marches.
    menu.addItem('Marches: raise a marching group at every sigil now', () => {
      const before = this.marchesSent;
      for (const s of this.sigils.list) this.raiseMarch(s);
      const n = this.marchesSent - before;
      this.notify(n > 0 ? `${n} group${n === 1 ? '' : 's'} set off for the station` : 'No sigils planted');
    });
    menu.addItem('Marches: teleport behind the nearest marcher', () => {
      const p = this.player.position;
      let best = null;
      for (const z of this.enemies.living) if (z.mode === 'march' && (!best || Math.hypot(z.x - p.x, z.z - p.z) < Math.hypot(best.x - p.x, best.z - p.z))) best = z;
      if (!best) {
        this.notify('Nobody is marching');
        return;
      }
      const back = d.marchTeleportBehind;
      this.player.teleport(best.x - Math.sin(best.facing) * back, best.z - Math.cos(best.facing) * back, best.facing + Math.PI);
      this.notify(`Behind a marcher, ${Math.round(this.enemies.marches.remaining(best.x, best.z))}m from home`);
    });
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
      sigils: `${s.count}/${this.cfg.sigils.cap} sigils (${grounds} on grounds)  level L${this.effectiveLevel}${override}${nextText}${nearText}  ${this.marchLine()}`,
    };
  }

  // Gathering, marching, groups sent and revisits tonight (overlay).
  marchLine() {
    let marching = 0;
    for (const z of this.enemies.living) if (z.mode === 'march') marching++;
    let raised = 0;
    for (const s of this.sigils.list) raised += s.nightRaised;
    return `tonight raised ${raised}  marching ${marching}  groups sent ${this.marchesSent}  revisits ${this.revisitsTonight}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.markers.dispose();
    this.renderer.dispose();
    this.sigils.dispose();
  }
}
