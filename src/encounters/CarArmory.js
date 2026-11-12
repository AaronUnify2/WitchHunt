// The Car Armory and Sheriff (build queue item 6; story spine, beat 10, first
// half; DESIGN.md "The Car Armory, Sheriff and the ute"). SCAFFOLDING: the
// beat plays from start to end in a first-pass compound with draft lines; the
// base's real layout, the stealth's rules, the survivors as people and
// Sheriff's part are for the encounter's own design session.
//
//  1. The compound (world/CarArmorySite.js): overrun. Men in Black, dead, in
//     the yard (the 'mib' zombies), there by the time Tom's near. Flag
//     armorySeen as he comes to the gate.
//  2. The survivors: three agents behind a barricade across the middle of the
//     yard, who shoot anything that moves in the lane in front of it (MibRenderer).
//     Seen, walking upright in the lane, Tom's fired on by each in turn.
//     Crouched, he isn't seen (unless he's right under the sandbags). They
//     can be shot.
//  3. The supply hall, in any order: the crates (ammo of every kind, kits,
//     scrap, body armour: armoryLooted), the turret's crate (turretFound: the
//     game's one turret, set up at home in item 7), the explosives locker
//     (it restocks: every visit tops Tom's charges up), the files
//     (classified documents 1-5: armoryDocs).
//  4. Sheriff, in the last cage of the holding block: a grey in a hat and a
//     star. Hold X at the cage door: he's out (sheriffFreed), he says his
//     piece, and the alarms go. The escape is item 7's.
//
// Saved through story flags. The yard's dead and the survivors come back
// until Sheriff is freed. Off in Demo mode.
//
// Events: 'armory:seen', 'armory:spotted', 'armory:freed'.

import { HoldAction } from '../player/HoldAction.js';
import { AlienRenderer } from '../render/AlienRenderer.js';
import { MibRenderer } from '../render/MibRenderer.js';
import { KIT_STAGES } from '../render/alienModel.js';
import { ARMORY } from '../render/carArmoryModel.js';
import { greyStep } from './Mothership.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const ARMORY_FLAGS = ['armorySeen', 'armoryLooted', 'turretFound', 'armoryDocs', 'sheriffFreed'];
export const ARMORY_DOCS = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// Do the survivors see Tom? In the lane in front of their barricade (model coordinates), standing; or
// crouched but within `under` metres of the sandbags. lane: { x0, x1, z0, z1 }; barricadeZ: the sandbags' line.
export function seenInLane(tom, crouched, lane, barricadeZ, under) {
  if (tom.x < lane.x0 || tom.x > lane.x1 || tom.z < lane.z0 || tom.z > lane.z1) return false;
  if (!crouched) return true;
  return barricadeZ - tom.z < under;
}

export class CarArmory {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ac = cfg.carArmory;
    this.ec = cfg.carArmory.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, site (CarArmorySite), player, combat, explosives, enemies, ground, lore, dialogue, subtitles, progress,
  // demo, notify, sfx, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    const h = this.cfg.crashedPlane.encounter.hit;
    const guns = ['smg', 'pistol', 'sniper'];
    this.agents = ARMORY.posts.map((p, i) => {
      const a = { post: { x: p[0], z: p[1] }, x: p[0], z: p[1], state: 'post', t: 0, side: 1, health: this.ec.survivors.health, alive: true };
      a.look = { active: true, x: 0, y: 0, z: 0, facing: 0, state: 'cover', timer: 0, walked: 0, flash: 0, weapon: guns[i % guns.length], aimPitch: 0 };
      a.target = { x: 0, y: 0, z: 0, targetable: false, alive: true, hitRadius: 0.35, height: 1.3, headBottom: 1.0, headRadius: h.headRadius, headshotMultiplier: 3, takeHit: (amount) => this.hitAgent(a, amount) };
      this.combat?.weapons?.extraTargets?.push(a.target);
      return a;
    });
    if (this.ready && this.scene) {
      this.mibs = new MibRenderer(this.cfg.mibAgents, this.cfg.people.mib);
      this.mibs.init(this.scene, this.agents.length);
      this.aliens = new AlienRenderer(this.cfg.aliens.grey);
      this.aliens.init(this.scene, 1);
    }
    this.sheriff = { active: true, x: 0, y: 0, z: 0, facing: 0, state: 'idle', timer: 0, walked: 0, flash: 0, stage: KIT_STAGES.length - 1 };
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.place && this.site.spots?.cage);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  reset() {
    this.deadSent = false;
    this.spotted = 0;
    this.said = new Set();
    for (const a of this.agents) {
      Object.assign(a, { x: a.post.x, z: a.post.z, state: 'post', t: 0, health: this.ec.survivors.health, alive: !this.has('sheriffFreed') });
      a.look.state = a.alive ? 'cover' : 'corpse';
    }
    this.placeSheriff();
  }

  // In his cage, or stood outside it once he's freed (item 7 moves him on).
  placeSheriff() {
    if (!this.ready || this.sheriffAway) return; // (item 7 has him: in the ute's tray, or home in the garage)
    const at = this.has('sheriffFreed') ? this.site.spots.out : this.site.spots.sheriff;
    const s = this.sheriff;
    s.x = at.x;
    s.z = at.z;
    s.y = this.ground.heightAt(at.x, at.z) + (this.has('sheriffFreed') ? 0 : 0.08);
    s.facing = this.site.place.yaw + Math.PI; // looking back down the yard, at whoever comes
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const pl = this.site.place;
    const dist = Math.hypot(p.x - pl.x, p.z - pl.z);
    const near = dist < this.ac.radius + this.ec.drawBeyond;
    if (playing && near) this.updateStory(dt, dist);
    if (near) this.draw(dt);
    else if (this.mibs) {
      this.mibs.update([], 0);
      this.aliens.update([], 0);
    }
    const best = canInteract && input && playing && dist < this.ac.radius + 4 && !this.player.riding ? this.pick(input.activeDevice === 'gamepad' ? 'X' : 'E') : null;
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, Boolean(input?.isDown('interact')) && Boolean(best), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // Tom in the set's own frame (model x, z).
  toModel(p) {
    const pl = this.site.place;
    const dx = p.x - pl.x;
    const dz = p.z - pl.z;
    const s = Math.sin(pl.yaw);
    const c = Math.cos(pl.yaw);
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  }

  updateStory(dt, dist) {
    const E = this.ec;
    if (!this.has('armorySeen') && this.has(E.needs) && dist < this.ac.radius + E.seenBeyond) {
      this.set('armorySeen');
      this.dialogue?.play('armory.seen.ellen');
      this.bus.emit('armory:seen');
    }
    // 1: the yard's dead, once per visit, until Sheriff's out.
    if (!this.deadSent && !this.has('sheriffFreed') && dist < this.ac.radius + E.deadBeyond) {
      this.deadSent = true;
      for (let i = 0; i < E.dead; i++) {
        const at = this.site.toWorld((this.rng() * 2 - 1) * 14, -16 + this.rng() * 12);
        this.enemies?.spawnZombie(at.x, at.z, { mode: 'linger', variant: 'mib', facing: this.rng() * 6.3, authored: 'carArmory', linger: { x: at.x, z: at.z, r: E.linger } });
      }
    }
    // 2: the survivors.
    const tom = this.toModel(this.player.position);
    const seen = !this.has('sheriffFreed') && seenInLane(tom, Boolean(this.player.crouched), ARMORY.lane, ARMORY.barricade.z, E.survivors.under);
    if (seen && !this.said.has('spotted')) {
      this.said.add('spotted');
      this.notify?.('Someone behind the sandbags shouts, and a gun comes up. They are alive in there, and they are shooting at you. Stay low');
      this.dialogue?.play('armory.spotted.agent');
      this.bus.emit('armory:spotted');
    }
    const S = E.survivors;
    for (const a of this.agents) {
      const k = a.look;
      k.timer += dt;
      k.flash = Math.max(0, k.flash - dt);
      if (!a.alive) continue;
      if (!seen) {
        a.state = 'post';
        k.state = 'cover';
        continue;
      }
      // Seen: each aims and fires in turn from where it kneels (no sidestep: strafe 0).
      const { fired, d } = greyStep(a, tom, dt, { ...S, see: 999, strafe: 0, speed: 0 });
      k.state = a.state === 'fired' ? 'fire' : 'coverAim';
      if (fired) {
        k.timer = 0;
        const w = this.site.toWorld(a.x, a.z);
        this.sfx?.play('greyShot', w);
        if (d < S.range && this.rng() < S.hitChance) this.combat.hurtPlayer(S.damage, 1);
        else this.sfx?.play('ricochet', this.player.position);
      }
    }
  }

  draw(dt) {
    if (!this.mibs) return;
    const yaw = this.site.place.yaw;
    for (const a of this.agents) {
      const w = this.site.toWorld(a.x, a.z);
      const k = a.look;
      k.x = w.x;
      k.z = w.z;
      k.y = this.ground.heightAt(w.x, w.z);
      // They face down the yard (model -z), or at Tom while they shoot.
      const p = this.player.position;
      k.facing = k.state === 'cover' || !a.alive ? yaw + Math.PI : Math.atan2(p.x - w.x, p.z - w.z);
      a.target.x = w.x;
      a.target.y = k.y;
      a.target.z = w.z;
      a.target.targetable = a.alive;
    }
    this.mibs.update(this.agents.map((a) => a.look), dt);
    this.sheriff.timer += dt;
    this.aliens.update([this.sheriff], dt);
  }

  hitAgent(a, amount) {
    if (!a.alive) return false;
    a.health -= amount;
    a.look.flash = 0.12;
    if (a.health > 0) return false;
    a.alive = false;
    a.look.state = 'dying';
    a.look.timer = 0;
    a.target.targetable = false;
    if (!this.said.has('killed')) {
      this.said.add('killed');
      this.notify?.('He was a living man. He would have killed you');
    }
    return true;
  }

  // ---- hold X ---------------------------------------------------------------------------------

  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const s = this.site.spots;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    if (!this.has('armoryLooted') && dist(s.crates) < r) return { key: 'crates', prompt: `Hold ${X}: go through the supply crates`, busy: 'Searching…', seconds: 2.2, act: () => this.loot() };
    if (!this.has('turretFound') && dist(s.turret) < r) return { key: 'turret', prompt: `Hold ${X}: open the long crate`, busy: 'Prising it open…', seconds: 1.8, act: () => this.takeTurret() };
    if (dist(s.charges) < r) {
      const ex = this.explosives;
      const room = ex ? ex.ec.carryMax - ex.inventory.charges - ex.placed.length : 0;
      if (room > 0) return { key: 'charges', prompt: `Hold ${X}: take demolition charges from the locker`, seconds: 1.2, act: () => this.takeCharges() };
      return { key: 'charges-full', prompt: 'The explosives locker. You are carrying all you can. It will still be here', act: null };
    }
    if (!this.has('armoryDocs') && dist(s.docs) < r) return { key: 'docs', prompt: `Hold ${X}: take the files off the desk`, seconds: 1.2, act: () => this.takeDocs() };
    if (!this.has('sheriffFreed') && dist(s.cage) < r + 0.4) return { key: 'cage', prompt: `Hold ${X}: break the cage's lock`, busy: 'Forcing it…', seconds: this.ec.cageSeconds, act: () => this.free() };
    return null;
  }

  loot() {
    const L = this.ec.loot;
    this.set('armoryLooted');
    const w = this.combat.weapons;
    for (const type of Object.keys(w.pools ?? {})) w.addAmmo(type, L.perPool); // every kind he has a gun for
    const inv = this.combat.inventory;
    const kept = inv.addKits?.('firstAid', L.kits) ?? 0;
    inv.addScrap?.(L.scrap);
    this.combat.armour?.add?.('ballistic', L.armour);
    this.sfx?.play('pickup');
    this.combat.hud?.pickup?.(`The Armory's stores: ammunition for everything you carry, ${L.kits} first aid kits${kept ? '' : ' (your healing is full)'}, ${L.scrap} scrap, body armour +${L.armour}`);
  }

  takeTurret() {
    this.set('turretFound');
    this.sfx?.play('pickup');
    this.combat.hud?.pickup?.('An automated sentry gun, in its crate, with its tripod. It goes home on the truck');
    this.dialogue?.play('armory.turret.wyatt');
  }

  takeCharges() {
    const ex = this.explosives;
    const n = ex.give(ex.ec.carryMax);
    this.sfx?.play('pickup');
    this.combat.hud?.pickup?.(n > 0 ? `${n} demolition charge${n === 1 ? '' : 's'} (the locker is far from empty)` : 'You are carrying all you can');
  }

  takeDocs() {
    this.set('armoryDocs');
    for (const id of ARMORY_DOCS) this.lore?.give?.(id);
    this.sfx?.play('pickup');
    this.combat.hud?.pickup?.('Five classified files: funding, site selection, the specimens, the shutdown order, the cover story. Hand them in at the ledger');
    this.dialogue?.play('armory.docs.ellen');
  }

  // 4: Sheriff.
  free() {
    this.set('sheriffFreed');
    for (const a of this.agents) a.state = 'post';
    this.placeSheriff();
    this.sfx?.play('carCrash', this.site.spots.cage);
    this.notify?.('The lock gives. Somewhere a bell starts, and does not stop');
    this.dialogue?.play('armory.sheriff.1');
    this.bus.emit('armory:freed');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The Car Armory: take me to its gate (${this.has('sheriffFreed') ? 'Sheriff freed' : 'not yet'})`, () => {
      if (!this.ready) return;
      const at = this.site.toWorld(0, -ARMORY.fence.half - 10);
      this.player.teleport(at.x, at.z, this.site.place.yaw + Math.PI);
    });
    cat.addItem('The Car Armory: free Sheriff now', () => this.free());
    cat.addItem('The Car Armory: start it again (flags cleared)', () => {
      for (const f of ARMORY_FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'armory -';
    return `armory agents ${this.agents.filter((a) => a.alive).length}${this.has('sheriffFreed') ? ' sheriff out' : ''}`;
  }

  dispose() {
    this.mibs?.dispose?.();
    this.aliens?.pool?.forEach((o) => o.mesh.removeFromParent());
  }
}
