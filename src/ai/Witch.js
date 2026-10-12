// The witch (M7, DESIGN.md "The witch").
//
// Step 1: she roams and plants.
//  - Resting: by day she hides in her hut, unseen (Aaron, M7: you can
//    stake it out and catch her coming out in the early evening).
//  - At dusk she sets out. Night 1 is safe; from night 2 she plants one
//    sigil a night, from night 3 sometimes two. She picks tonight's spots
//    as she leaves (mostly empty sigil grounds: ZombieDirector.chooseSpot()),
//    so the dusk forecast can count them.
//  - Roaming: she glides along the pathways (ai/witchRoutes.js), keeping
//    clear of the ranger station. Near the player (within the zombies'
//    nearby radius) she moves for real, with collision; further out she's
//    a point on the graph moving abstractScale times faster.
//  - Planting: at the spot she crouches for plantSeconds with a glowing
//    ring and singing that carries; the sigil appears when she's done
//    (ZombieDirector.plant()). Then the next spot, or home.
//  - At dawn she heads home (a ritual already under way is finished).
//
// Step 2: fighting her on the pathways.
//  - She can be shot and struck (Weapons.extraTargets): her hit shape
//    follows her pose; headshots count x2.
//  - She notices the player with the shared detection model (her own
//    sharper eyes; hiding works). In the ritual's trance she only notices
//    you close up, or when she's hit or hears a shot nearby, and noticing
//    you breaks the ritual: that sigil is lost.
//  - Fight or flee: her health share plus a bonus near her hut. High: she
//    attacks. Low: she flees. She reconsiders every second and on every hit.
//  - Attacking: she circles you at range throwing hexes (slow bolts you
//    can sidestep or put a tree in front of: ai/witchHexes.js), rushes in
//    to swipe if you stand still or come close, and summons a few
//    zombies (once a minute at most).
//  - Fleeing: home along the pathways, faster than your sprint, weaving.
//    Once she's lost you she goes back to planting, or home if she's badly hurt.
//  - Wounds last: she heals a share each day in the hut. Wounded, she
//    plants at most one sigil a night; badly wounded, she stays in.
//  - Killed: she collapses and sinks into the ground; the run is won
//    ('witch:killed'; the real ending is step 6).
//
// Step 3: traps (ai/witchTraps.js): the hut approach is laid with them
// at the start of the run, and she drops them behind her as she flees
// (more slowly while she does). An alarm charm going off tells her where
// you are.
//
// Events: 'witch:setOut' { night, planned }, 'witch:ritualStarted'
// { spot }, 'witch:planted' { sigil }, 'witch:interrupted' { spot },
// 'witch:home', 'witch:noticed', 'witch:attacking', 'witch:fleeing',
// 'witch:hurt' { health, damage }, 'witch:killed', 'witch:summoned' { count }.

import { GraphRoutes, routeLength, advanceAlong } from './witchRoutes.js';
import { tierFor } from './simTiers.js';
import { playerSenses, notices } from './detection.js';
import { Hexes } from './witchHexes.js';
import { Traps, placeHutTraps, pickTrapType } from './witchTraps.js';
import { TrapRenderer } from '../render/TrapRenderer.js';
import { resolveCircles } from '../world/collision.js';
import { WitchRenderer } from '../render/WitchRenderer.js';
import { DEBUG } from '../debug/DebugMenu.js';

// How many sigils she sets out to plant on night `night` (pure). share:
// her health share (wounded, she plants less: step 2).
export function plantingsTonight(night, wc, rng, share = 1) {
  if (night < wc.firstNight) return 0;
  const w = wc.wounds;
  if (w && share < w.stayHomeBelow) return 0;
  const two = night >= wc.secondFromNight && rng.chance(wc.secondChance);
  if (w && share < w.oneSigilBelow) return 1;
  return two ? 2 : 1;
}

// Fight-or-flee score (pure; DESIGN.md): health share plus a bonus for
// being near her hut, fading to nothing hutRadius away.
export function fightScore(share, distanceToHut, wc) {
  return share + wc.hutBonus * Math.max(0, 1 - distanceToHut / wc.hutRadius);
}

export class Witch {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.wc = cfg.witch;
    this.rng = rng;
    this.bus = bus;
  }

  // ctx: { world, director, player, colliders, combat, clock }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.map = ctx.world.map;
    this.routes = new GraphRoutes(this.map, [this.map.homeIndex]);
    this.planRng = this.rng.fork('witch-plan');
    this.fightRng = this.rng.fork('witch-fight');
    this.renderer = new WitchRenderer(this.wc.look, this.rng.fork('witch-look'));
    this.renderer.init(scene);
    this.hexes = new Hexes(this.wc.attack.hex);
    this.senses = {};
    this.nearbyColliders = [];
    this.drawDistance = Infinity;
    this.showOnMap = false; // debug
    this.radius = this.wc.radius;
    this.maxHealth = this.wc.health;
    this.health = this.maxHealth;
    this.headshotMultiplier = this.wc.headshotMultiplier;
    this.hexTarget = { x: 0, z: 0, y0: 0, y1: 0, radius: 0.35 };
    // Step 3: traps. The hut approach is laid with them (seeded by the map).
    const tc = this.wc.traps;
    this.traps = new Traps(tc, this.bus);
    for (const t of placeHutTraps(this.map, tc.hut, this.rng.fork('hut-traps'))) this.traps.add(t.type, t.x, t.z, this.ground);
    this.trapRng = this.rng.fork('witch-traps');
    this.trapRenderer = new TrapRenderer(tc.look, tc.totem.zone);
    this.trapRenderer.init(scene);
    this.combat.promptSources.unshift(this.traps.hud); // "Snared!" comes first
    this.reset();
    this.wireEvents();
    // The player's weapons can hit her and her totems and charms (Weapons.extraTargets).
    this.combat.weapons.extraTargets.push(this, this.traps);
  }

  // In the hut, resting (her health is kept: wounds last).
  reset() {
    const hut = this.world.hut;
    this.x = hut.x;
    this.z = hut.z;
    this.y = this.ground.heightAt(hut.x, hut.z);
    this.facing = 0;
    this.state = 'resting';
    this.goal = null; // 'plant' | 'home' while roaming
    this.spot = null; // the spot she's going to, or planting at
    this.plan = []; // tonight's spots still to come after this one
    this.route = [];
    this.routeIndex = 0;
    this.tier = 'abstract';
    this.plantTimer = 0;
    this.songTimer = 0;
    this.stuckTime = 0;
    this.detourSide = 1;
    this.moved = 0; // metres this step (the renderer's glide)
    this.walked = 0;
    this.plantedTonight = 0;
    this.night = 0;
    this.time = 0;
    this.endFight();
    this.summonCooldown = 0;
    this.flinch = 0;
    this.bossTimer = 0;
    this.deathTimer = 0;
    this.dropTimer = 0;
    this.dropSlow = 0;
    this.hexes?.clear();
  }

  // Forget the fight.
  endFight() {
    this.lastSeen = Infinity; // seconds since she last saw the player
    this.lastX = 0; // where she last knew them to be
    this.lastZ = 0;
    this.rethink = 0;
    this.action = null; // 'hex' | 'swipe' | 'summon' while she's doing one
    this.actionTimer = 0;
    this.actionLength = 0;
    this.struck = false; // the swipe has landed (or missed)
    this.hexTimer = 0;
    this.lunging = false;
    this.lungeTimer = 0;
    this.stillTime = 0;
    this.strafeDir = 1;
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('phase:dusk', ({ day }) => this.setOut(day ?? 0)),
      bus.on('phase:dawn', () => this.callHome()),
      // Wounds heal a share each day.
      bus.on('phase:day', () => this.heal(this.wc.wounds.recoverPerDay)),
      bus.on('weapon:fired', ({ id }) => this.heard(this.cfg.weapons[id]?.noise ?? 0)),
      bus.on('trap:sprung', ({ trap }) => this.combat.sfx.play(trap.type === 'snare' ? 'snare' : 'charmRattle', trap)),
      bus.on('trap:freed', () => this.combat.sfx.play('snareBreak')),
      bus.on('trap:burned', () => this.combat.sfx.play('totemBurn')),
      bus.on('trap:destroyed', ({ trap, at }) => {
        this.combat.sfx.play('trapBreak', trap);
        if (at) this.bus.emit('weapon:impact', { x: at.x, y: at.y, z: at.z });
      }),
      bus.on('player:respawned', () => this.traps.free(this.player)),
    ];
  }

  get hut() {
    return this.world.hut;
  }

  get alive() {
    return this.state !== 'dead';
  }

  get share() {
    return this.health / this.maxHealth;
  }

  // 0 to 1 through the ritual.
  get plantProgress() {
    return this.state === 'planting' ? 1 - Math.max(0, this.plantTimer) / this.wc.plantSeconds : 0;
  }

  // 0 to 1 through what she's doing now (a hex, a swipe, a summoning).
  get actionProgress() {
    return this.action && this.actionLength > 0 ? 1 - Math.max(0, this.actionTimer) / this.actionLength : 0;
  }

  // ---- her hit shape (read by combat/hitscan.js) -------------------------------------

  get shape() {
    return this.state === 'planting' ? this.wc.crouchedShape : this.wc.hitShape;
  }

  get hitRadius() {
    return this.shape.radius;
  }

  get height() {
    return this.shape.height;
  }

  get headBottom() {
    return this.shape.headBottom;
  }

  get headRadius() {
    return this.shape.headRadius;
  }

  // Can the player's weapons hit her now? Out and near (drawn).
  get targetable() {
    return this.state !== 'resting' && this.state !== 'dead' && this.tier !== 'abstract';
  }

  // ---- the night's plan -------------------------------------------------------

  // Dusk: choose tonight's spots and set out for the first.
  setOut(night, count = plantingsTonight(night, this.wc, this.planRng, this.share)) {
    this.night = night;
    this.plantedTonight = 0;
    if (count <= 0 || !this.alive) return false;
    const plan = [];
    for (let i = 0; i < count; i++) {
      const spot = this.director.chooseSpot(plan);
      if (spot) plan.push(spot);
    }
    if (plan.length === 0) return false;
    this.plan = plan;
    this.bus.emit('witch:setOut', { night, planned: plan.length });
    this.goPlant();
    return true;
  }

  // Head for the next spot in the plan.
  goPlant() {
    this.spot = this.plan.shift();
    this.state = 'roaming';
    this.goal = 'plant';
    this.setRoute(this.spot.x, this.spot.z);
  }

  goHome() {
    this.plan.length = 0;
    this.spot = null;
    this.state = 'roaming';
    this.goal = 'home';
    this.setRoute(this.hut.x, this.hut.z);
  }

  // Dawn: home, unless a ritual is under way (she finishes it first).
  callHome() {
    this.plan.length = 0;
    if (this.state === 'roaming' && this.goal === 'plant') this.goHome();
  }

  setRoute(tx, tz) {
    this.route = this.routes.route(this.x, this.z, tx, tz);
    this.routeIndex = 0;
    this.stuckTime = 0;
  }

  heal(share) {
    if (!this.alive) return;
    this.health = Math.min(this.maxHealth, this.health + this.maxHealth * share);
  }

  // Is it still her night out (dusk, or the night before its late part)?
  get outTonight() {
    const c = this.clock;
    return c.phase === 'dusk' || (c.phase === 'night' && c.phaseProgress < this.wc.lateCutoff);
  }

  // ---- each step -----------------------------------------------------------------

  // playing: false while a menu or the map is open. input: the player's
  // controls (mashing free of a snare).
  update(dt, playing, cameraPosition, input = null) {
    const p = this.player.position;
    const dist = Math.hypot(this.x - p.x, this.z - p.z);
    this.distance = dist;
    this.tier = this.state === 'attacking' ? 'active' : tierFor(this.tier, dist, this.cfg.zombies.lod);
    this.moved = 0;
    if (playing) {
      this.time += dt;
      this.flinch = Math.max(0, this.flinch - dt);
      this.bossTimer = Math.max(0, this.bossTimer - dt);
      this.summonCooldown = Math.max(0, this.summonCooldown - dt);
      if (this.state !== 'resting' && this.state !== 'dead') this.look(dt);
      switch (this.state) {
        case 'roaming':
          if (this.move(dt)) this.arrive();
          break;
        case 'planting':
          this.ritual(dt);
          break;
        case 'attacking':
          this.fight(dt);
          break;
        case 'fleeing':
          this.fleeStep(dt);
          break;
        case 'dead':
          this.deathTimer += dt;
          break;
        default:
          break;
      }
      this.updateHexes(dt);
      if (input) this.traps.update(dt, this.player, input, this.combat, (x, z) => this.heardCharm(x, z));
    }
    if (this.state === 'attacking') this.bossTimer = this.wc.bossBarSeconds;
    this.combat.hud.boss(this.bossTimer > 0 && this.alive ? this.share : null);
    this.renderer.update(this, dt, cameraPosition, this.drawDistance);
    this.trapRenderer.update(this.traps.list, this.traps.snare, dt, cameraPosition, this.drawDistance);
  }

  // ---- noticing the player -----------------------------------------------------

  // Watch for the player; react when she first notices them.
  look(dt) {
    this.lastSeen += dt;
    if (this.tier === 'abstract' || !this.combat.alive) return;
    const trance = this.state === 'planting';
    const s = playerSenses(this.combat.senses, this.cfg.detection, this.wc.notice, this.senses);
    if (trance) {
      s.sight *= this.wc.ritualNotice;
      s.hearing *= this.wc.ritualNotice;
    }
    const engaged = this.state === 'attacking' || this.state === 'fleeing';
    if (!notices({ x: this.x, y: this.y, z: this.z, facing: this.facing }, s, this.cfg.detection, engaged, this.ground)) return;
    const first = this.lastSeen > this.wc.loseSeconds;
    this.lastSeen = 0;
    this.lastX = s.x;
    this.lastZ = s.z;
    if (!engaged && first) this.react();
  }

  // A shot she hears (any shot within its noise x her hearing; in the
  // ritual only within ritualHearing): she knows where you are.
  heard(noise) {
    if (this.state === 'resting' || this.state === 'dead' || this.tier === 'abstract') return;
    const p = this.player.position;
    const range = this.state === 'planting' ? Math.min(noise * this.wc.notice, this.wc.ritualHearing) : noise * this.wc.notice;
    if (this.distance > range) return;
    this.lastSeen = 0;
    this.lastX = p.x;
    this.lastZ = p.z;
    if (this.state === 'roaming' || this.state === 'planting') this.react();
  }

  // An alarm charm rattled at (x, z): if she's out and near enough, she
  // knows you're there.
  heardCharm(x, z) {
    if (this.state === 'resting' || this.state === 'dead') return;
    if (Math.hypot(this.x - x, this.z - z) > this.wc.traps.charm.witchHears) return;
    this.lastSeen = 0;
    this.lastX = x;
    this.lastZ = z;
    if (this.state === 'roaming' || this.state === 'planting') this.react();
  }

  // She's noticed you: the ritual (if any) is broken, and she fights or flees.
  react() {
    if (this.state === 'planting') {
      this.bus.emit('witch:interrupted', { spot: this.spot });
      this.spot = null;
    }
    this.bus.emit('witch:noticed');
    this.combat.sfx.play('witchShriek', { x: this.x, z: this.z, range: this.wc.songRange });
    this.decide();
  }

  decide() {
    const toHut = Math.hypot(this.x - this.hut.x, this.z - this.hut.z);
    if (fightScore(this.share, toHut, this.wc) >= this.wc.fleeBelow) this.startAttack();
    else this.startFlee();
  }

  startAttack() {
    const was = this.state;
    this.state = 'attacking';
    this.goal = null;
    this.action = null;
    this.lunging = false;
    this.rethink = this.wc.rethinkSeconds;
    this.hexTimer = this.wc.attack.hex.castTime; // the first one comes quickly
    this.strafeDir = this.fightRng.chance(0.5) ? 1 : -1;
    if (was !== 'attacking') this.bus.emit('witch:attacking');
    if (this.summonCooldown <= 0) this.startAction('summon', this.wc.attack.summon.castTime);
  }

  startFlee() {
    const was = this.state;
    this.state = 'fleeing';
    this.goal = 'home';
    this.action = null;
    this.lunging = false;
    this.rethink = this.wc.rethinkSeconds;
    this.setRoute(this.hut.x, this.hut.z);
    if (was !== 'fleeing') {
      this.dropTimer = this.wc.traps.dropEvery * 0.5; // the first soon after she turns
      this.bus.emit('witch:fleeing');
    }
  }

  // The fight's over (she lost you, or you're dead): back to planting if
  // the night allows and she's well enough, else home.
  disengage() {
    this.endFight();
    if (this.share >= this.wc.wounds.homeAfterFleeBelow && this.outTonight && this.plan.length > 0) this.goPlant();
    else this.goHome();
  }

  // ---- fighting ------------------------------------------------------------------

  fight(dt) {
    const a = this.wc.attack;
    const p = this.player.position;
    const tx = this.lastSeen === 0 ? p.x : this.lastX;
    const tz = this.lastSeen === 0 ? p.z : this.lastZ;
    const dist = Math.hypot(tx - this.x, tz - this.z);
    // Lost you once she's where she last knew you to be (a charm can call
    // her from far off: she comes, then looks).
    if (!this.combat.alive || (this.lastSeen > this.wc.loseSeconds && dist <= a.hex.maxRange)) {
      this.disengage();
      return;
    }
    if (dist > a.hex.maxRange) {
      this.stepToward(tx, tz, this.wc.roamSpeed, dt, true);
      this.facing = turnToward(this.facing, Math.atan2(tx - this.x, tz - this.z), this.wc.turnRate * dt);
      return;
    }
    this.facing = turnToward(this.facing, Math.atan2(tx - this.x, tz - this.z), this.wc.turnRate * dt);
    // Standing still invites her in.
    this.stillTime = this.player.speed < a.lunge.stillSpeed ? this.stillTime + dt : 0;
    this.hexTimer -= dt;
    this.rethink -= dt;
    if (this.rethink <= 0 && !this.action) {
      this.rethink = this.wc.rethinkSeconds;
      this.decide();
      if (this.state !== 'attacking') return;
    }
    if (this.action) {
      this.doAction(dt, dist);
      return;
    }
    if (dist <= a.swipe.reach) {
      this.lunging = false;
      this.startAction('swipe', a.swipe.windup);
      return;
    }
    if (!this.lunging && ((this.stillTime >= a.lunge.whenStill && dist <= a.lunge.within) || dist <= a.lunge.closeIn)) {
      this.lunging = true;
      this.lungeTimer = a.lunge.maxSeconds;
    }
    if (this.lunging) {
      this.lungeTimer -= dt;
      if (this.lungeTimer <= 0) this.lunging = false;
      this.stepToward(tx, tz, a.lunge.speed, dt);
      return;
    }
    const hx = a.hex;
    if (this.hexTimer <= 0 && this.lastSeen === 0 && dist >= hx.minRange && dist <= hx.maxRange) {
      this.hexTimer = hx.every;
      this.startAction('hex', hx.castTime);
      return;
    }
    // Circle round you at her favourite range.
    const bearing = Math.atan2(this.x - tx, this.z - tz) + this.strafeDir * a.strafe * dt * 4;
    const gx = tx + Math.sin(bearing) * a.range;
    const gz = tz + Math.cos(bearing) * a.range;
    if (this.stepToward(gx, gz, a.speed, dt) < a.speed * dt * 0.2 && Math.hypot(gx - this.x, gz - this.z) > 1) this.strafeDir = -this.strafeDir;
  }

  startAction(name, seconds) {
    this.action = name;
    this.actionTimer = seconds;
    this.actionLength = seconds;
    this.struck = false;
    if (name === 'summon') this.combat.sfx.play('witchSummon', { x: this.x, z: this.z, range: this.wc.songRange });
  }

  // Wind-ups, then the hex flies, the claws land or the dead rise.
  doAction(dt, dist) {
    const a = this.wc.attack;
    this.actionTimer -= dt;
    if (this.action === 'swipe') {
      if (!this.struck && this.actionTimer <= 0) {
        this.struck = true;
        this.combat.sfx.play('witchSwipe', { x: this.x, z: this.z });
        if (dist <= a.swipe.reach + 0.4 && !this.player.platform) this.combat.hurtPlayer(a.swipe.damage, 2);
        this.actionTimer = a.swipe.recover;
        this.actionLength = a.swipe.recover;
      } else if (this.struck && this.actionTimer <= 0) {
        this.action = null;
      }
      return;
    }
    if (this.actionTimer > 0) return;
    if (this.action === 'hex') this.throwHex();
    else if (this.action === 'summon') this.summon();
    this.action = null;
  }

  throwHex() {
    const hx = this.wc.attack.hex;
    const p = this.player.position;
    const y = this.y + hx.height;
    // From her raised hand, a little in front of her, at the player's chest.
    const fx = this.x + Math.sin(this.facing) * 0.6;
    const fz = this.z + Math.cos(this.facing) * 0.6;
    if (this.hexes.throw(fx, y, fz, p.x, this.player.camera.position.y - 0.4, p.z)) {
      this.combat.sfx.play('witchHex', { x: this.x, z: this.z });
    }
  }

  // A few of the dead claw their way up round her and come for you.
  summon() {
    const s = this.wc.attack.summon;
    const count = this.fightRng.int(s.count[0], s.count[1]);
    const mix = this.world.variantMixAt(this.x, this.z);
    let n = 0;
    for (let i = 0; i < count; i++) {
      n += this.combat.enemies.spawnPlanned({ type: 'single', count: 1 }, this.x, this.z, { ringMin: s.ring[0], ringMax: s.ring[1], mix, rise: true, mode: 'chase' });
    }
    this.summonCooldown = s.cooldown;
    if (n > 0) {
      this.combat.sfx.play('rise', this);
      this.bus.emit('witch:summoned', { count: n });
    }
  }

  updateHexes(dt) {
    const t = this.hexTarget;
    const p = this.player.position;
    t.x = p.x;
    t.z = p.z;
    t.y0 = this.ground.heightAt(p.x, p.z);
    t.y1 = this.player.camera.position.y;
    const damage = this.hexes.update(dt, t, this.colliders, this.ground);
    if (damage > 0) {
      this.combat.sfx.play('witchHexHit');
      if (!this.player.platform) this.combat.hurtPlayer(damage, 1.5);
    }
  }

  // ---- fleeing ---------------------------------------------------------------------

  fleeStep(dt) {
    const f = this.wc.flee;
    this.rethink -= dt;
    // Lost you, and far enough off: calm down.
    if (this.lastSeen > this.wc.loseSeconds && (this.distance > this.cfg.zombies.lod.activeRadius || this.tier === 'abstract')) {
      this.disengage();
      return;
    }
    // Cornered near home, or healed enough to turn on you.
    if (this.rethink <= 0) {
      this.rethink = this.wc.rethinkSeconds;
      if (this.lastSeen === 0) {
        this.decide();
        if (this.state !== 'fleeing') return;
      }
    }
    // Traps dropped behind her as she goes (more slowly while she does).
    const tc = this.wc.traps;
    this.dropTimer -= dt;
    this.dropSlow = Math.max(0, this.dropSlow - dt);
    if (this.dropTimer <= 0) {
      this.dropTimer = tc.dropEvery;
      this.dropSlow = tc.dropSlowSeconds;
      this.traps.add(pickTrapType(tc.dropMix, this.trapRng), this.x, this.z, this.ground, true);
    }
    const speed = f.speed * (this.dropSlow > 0 ? tc.dropSlow : 1);
    if (this.move(dt, speed, f.weave)) {
      this.state = 'resting';
      this.endFight();
      this.bus.emit('witch:home');
    }
  }

  // ---- taking hits -------------------------------------------------------------------

  // Called by the player's weapons. Returns true if it killed her.
  takeHit(amount, part, weapon, at, from) {
    if (!this.targetable) return false;
    this.health = Math.max(0, this.health - amount);
    this.flinch = this.wc.flinchSeconds;
    this.bossTimer = this.wc.bossBarSeconds;
    const killed = this.health <= 0;
    this.bus.emit('enemy:hit', { x: at.x, y: at.y, z: at.z, part, killed, zombie: this });
    this.bus.emit('witch:hurt', { health: this.health, damage: amount });
    if (killed) {
      this.die();
      return true;
    }
    this.combat.sfx.play('witchShriek', { x: this.x, z: this.z, range: this.wc.songRange });
    this.lastSeen = 0;
    this.lastX = from?.x ?? this.player.position.x;
    this.lastZ = from?.z ?? this.player.position.z;
    if (this.state === 'roaming' || this.state === 'planting') this.react();
    else if (!this.action) this.decide();
    return false;
  }

  die() {
    this.state = 'dead';
    this.action = null;
    this.spot = null;
    this.plan.length = 0;
    this.deathTimer = 0;
    this.hexes.clear();
    this.combat.sfx.play('witchDeath', { x: this.x, z: this.z, range: this.wc.songRange });
    this.bus.emit('witch:killed');
  }

  // ---- moving --------------------------------------------------------------------

  // Along the route. speed: m/s near the player (default roaming); weave:
  // metres of side-to-side while fleeing. Returns true on arriving.
  move(dt, speed = this.wc.roamSpeed, weave = 0) {
    const wc = this.wc;
    if (this.tier === 'abstract') {
      const done = advanceAlong(this, speed * wc.abstractScale * dt);
      this.y = this.ground.heightAt(this.x, this.z);
      return done;
    }
    // Near the player: for real, with collision.
    let target = this.route[this.routeIndex];
    while (target && Math.hypot(target.x - this.x, target.z - this.z) <= (this.routeIndex === this.route.length - 1 ? wc.reach * 0.4 : wc.reach)) {
      this.routeIndex++;
      target = this.route[this.routeIndex];
    }
    if (!target) return true;
    let tx = target.x;
    let tz = target.z;
    if (weave > 0) {
      // Side to side across the direction of travel.
      const dx = tx - this.x;
      const dz = tz - this.z;
      const d = Math.hypot(dx, dz) || 1;
      const side = Math.sin((this.time * Math.PI * 2) / this.wc.flee.weavePeriod) * weave;
      tx += (-dz / d) * side;
      tz += (dx / d) * side;
    }
    this.stepToward(tx, tz, speed, dt, true);
    return false;
  }

  // One step toward (tx, tz) with collision. Returns metres moved.
  stepToward(tx, tz, speed, dt, unstick = false) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return 0;
    if (this.state !== 'attacking') this.facing = turnToward(this.facing, Math.atan2(dx, dz), this.wc.turnRate * dt);
    const step = Math.min(d, speed * dt);
    const fromX = this.x;
    const fromZ = this.z;
    this.x += (dx / d) * step;
    this.z += (dz / d) * step;
    resolveCircles(this, this.radius, this.colliders.query(this.x, this.z, this.radius, this.nearbyColliders));
    this.ground.clamp(this);
    this.y = this.ground.heightAt(this.x, this.z);
    this.moved = Math.hypot(this.x - fromX, this.z - fromZ);
    this.walked += this.moved;
    if (unstick) this.unstick(step, dx / d, dz / d, dt);
    return this.moved;
  }

  // Barely moving toward the waypoint: sidestep round whatever is in the
  // way (she's agile: a short detour, alternating sides if it keeps up).
  unstick(expected, dirX, dirZ, dt) {
    const wc = this.wc;
    if (this.moved >= expected * 0.3) {
      this.stuckTime = Math.max(0, this.stuckTime - dt);
      return;
    }
    this.stuckTime += dt;
    if (this.stuckTime < wc.unstickSeconds) return;
    this.stuckTime = 0;
    const side = this.detourSide;
    this.detourSide = -side;
    const out = wc.unstickDistance;
    // Left of the direction of travel is (-dirZ, dirX).
    this.route.splice(this.routeIndex, 0, { x: this.x - dirZ * side * out + dirX, z: this.z + dirX * side * out + dirZ });
  }

  arrive() {
    if (this.goal === 'plant') {
      this.state = 'planting';
      this.plantTimer = this.wc.plantSeconds;
      this.songTimer = 0;
      this.bus.emit('witch:ritualStarted', { spot: this.spot });
      return;
    }
    this.state = 'resting';
    this.goal = null;
    this.endFight();
    this.bus.emit('witch:home');
  }

  // Crouched at the spot, singing. The sigil appears when she's done.
  ritual(dt) {
    this.plantTimer -= dt;
    this.songTimer -= dt;
    if (this.songTimer <= 0) {
      this.songTimer = this.wc.soundEvery;
      this.combat.sfx.play('witchSong', { x: this.x, z: this.z, range: this.wc.songRange });
    }
    if (this.plantTimer > 0) return;
    this.finishPlanting();
  }

  finishPlanting() {
    const spot = this.spot;
    const d = this.director;
    const groundTaken = spot.groundId >= 0 && !d.sigils.groundFree(spot.groundId);
    const sigil = groundTaken ? null : d.plant({ ...spot, y: this.ground.heightAt(spot.x, spot.z) });
    if (sigil) {
      this.plantedTonight++;
      this.combat.sfx.play('witchPlanted', { x: spot.x, z: spot.z, range: this.wc.songRange });
      this.bus.emit('witch:planted', { sigil });
    }
    this.spot = null;
    if (this.plan.length > 0 && this.outTonight) this.goPlant();
    else this.goHome();
  }

  // ---- the forecast ----------------------------------------------------------------

  // The sigils she's still to plant tonight, with when (seconds from now,
  // travelling out of sight): [{ x, z, inSeconds }].
  pendingPlantings() {
    const wc = this.wc;
    const speed = wc.roamSpeed * wc.abstractScale;
    const out = [];
    if (!this.alive) return out;
    let t = 0;
    let x = this.x;
    let z = this.z;
    if (this.state === 'planting') {
      t = this.plantTimer;
      out.push({ x: this.spot.x, z: this.spot.z, inSeconds: t });
    } else if (this.state === 'roaming' && this.goal === 'plant') {
      t = routeLength(x, z, this.route, this.routeIndex) / speed + wc.plantSeconds;
      out.push({ x: this.spot.x, z: this.spot.z, inSeconds: t });
    }
    if (this.spot) {
      x = this.spot.x;
      z = this.spot.z;
    }
    for (const s of this.plan) {
      const r = this.routes.route(x, z, s.x, s.z);
      t += routeLength(x, z, r) / speed + wc.plantSeconds;
      out.push({ x: s.x, z: s.z, inSeconds: t });
      x = s.x;
      z = s.z;
    }
    return out;
  }

  // ---- saving (her wounds last; the rest of her state is step 6) ------------------

  saveState() {
    return { health: Math.round(this.health) };
  }

  loadState(d) {
    if (d && Number.isFinite(d.health)) this.health = Math.max(1, Math.min(this.maxHealth, d.health));
  }

  // ---- debug tools ------------------------------------------------------------------

  addDebugItems(menu, notify) {
    const witch = menu.category(DEBUG.witch);
    witch.addItem(() => `Now: ${this.stateText()}`, () => notify(this.stateText()));
    witch.addItem('Send her out to plant now', () => {
      if (!this.alive) return notify('She is dead');
      const plan = this.plan.slice();
      this.plan = [];
      const spot = this.director.chooseSpot(this.spot ? [this.spot, ...plan] : plan);
      if (!spot) {
        notify('Nowhere left for her to plant');
        return;
      }
      this.endFight();
      this.plan = [spot];
      this.goPlant();
      notify(`The witch is out, heading ${this.director.describe(spot)}`);
    });
    witch.addItem('Finish her ritual now', () => {
      if (this.state !== 'planting') notify('She is not planting');
      else this.plantTimer = 0;
    });
    witch.addItem('Send her home', () => {
      if (this.state === 'resting' || !this.alive) notify('She is already home');
      else {
        this.endFight();
        this.goHome();
      }
    });
    const teleportNear = () => {
      const back = this.cfg.debug.witchTeleportBack;
      const a = this.state === 'resting' ? 0 : this.facing;
      // In front of her, looking back at her (the camera looks down -z at yaw 0).
      const x = this.x + Math.sin(a) * back;
      const z = this.z + Math.cos(a) * back;
      this.player.teleport(x, z, Math.atan2(x - this.x, z - this.z));
      notify(this.state === 'resting' ? 'At the hut: she is hiding inside' : `Near the witch: ${this.stateText()}`);
    };
    witch.addItem('Teleport near her', teleportNear);
    // Step 2: fighting.
    witch.addItem('Fight: bring her out to attack me now', () => {
      if (!this.alive) return notify('She is dead');
      const p = this.player.position;
      const a = this.player.yaw;
      // 15 m ahead of you (the camera looks down -z at yaw 0).
      this.x = p.x - Math.sin(a) * 15;
      this.z = p.z - Math.cos(a) * 15;
      this.ground.clamp(this);
      this.y = this.ground.heightAt(this.x, this.z);
      this.tier = 'active';
      this.lastSeen = 0;
      this.lastX = p.x;
      this.lastZ = p.z;
      this.spot = null;
      this.startAttack();
    });
    witch.addItem('Fight: make her flee now', () => {
      if (this.state === 'resting' || !this.alive) return notify('She is not out');
      this.lastSeen = 0;
      this.startFlee();
    });
    witch.addItem(
      () => `Fight: set her health (now ${Math.round(this.share * 100)}%)`,
      () => {
        const steps = [1, 0.5, 0.25, 0.1];
        const i = steps.findIndex((s) => s < this.share - 1e-6);
        this.health = this.maxHealth * (i < 0 ? steps[0] : steps[i]);
        this.bossTimer = this.wc.bossBarSeconds;
      },
    );
    witch.addItem('Fight: kill her (wins the run)', () => {
      if (!this.alive) return notify('She is already dead');
      this.health = 0;
      this.die();
    });
    // Step 3: traps.
    witch.addItem('Traps: lay a snare, a totem and a charm ahead of me', () => {
      const p = this.player.position;
      const a = this.player.yaw;
      // 6, 12 and 18 m ahead (the camera looks down -z at yaw 0).
      ['snare', 'totem', 'charm'].forEach((type, i) => {
        const d = 6 + i * 6;
        this.traps.add(type, p.x - Math.sin(a) * d, p.z - Math.cos(a) * d, this.ground, true);
      });
      notify('Snare 6 m, totem 12 m, charm 18 m ahead');
    });
    witch.addItem(() => `Traps: free me / clear them all (${this.traps.activeCount} out)`, () => this.traps.clear(this.player));
    witch.addItem(() => `Show her on the map: ${this.showOnMap ? 'on' : 'off'}`, () => (this.showOnMap = !this.showOnMap));
    menu.category(DEBUG.teleport).addItem('Teleport: near the witch', teleportNear);
  }

  stateText() {
    const where = (s) => (s ? this.director.describe(s) : '');
    const togo = () => Math.round(routeLength(this.x, this.z, this.route, this.routeIndex));
    switch (this.state) {
      case 'resting':
        return 'resting in her hut';
      case 'planting':
        return `planting ${where(this.spot)}, ${Math.ceil(this.plantTimer)}s left`;
      case 'attacking':
        return `attacking you${this.action ? ` (${this.action})` : this.lunging ? ' (lunging)' : ''}`;
      case 'fleeing':
        return `fleeing home, ${togo()}m to go`;
      case 'dead':
        return 'dead';
      default:
        return this.goal === 'home' ? `going home, ${togo()}m to go` : `heading ${where(this.spot)}, ${togo()}m to go`;
    }
  }

  overlayLine() {
    const more = this.plan.length ? `  ${this.plan.length} more planned` : '';
    const seen = Number.isFinite(this.lastSeen) && this.lastSeen < 60 ? `  saw you ${this.lastSeen.toFixed(0)}s ago` : '';
    return `traps ${this.traps.activeCount}${this.traps.snare ? ' (SNARED)' : ''}  witch: ${this.stateText()}  health ${Math.round(this.share * 100)}%  (${this.tier}, ${Math.round(this.distance ?? 0)}m from you)${seen}  planted tonight ${this.plantedTonight}${more}  hexes ${this.hexes.count}`;
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    const extras = this.combat.weapons.extraTargets;
    for (const t of [this, this.traps]) {
      const i = extras.indexOf(t);
      if (i >= 0) extras.splice(i, 1);
    }
    this.renderer.dispose();
    this.trapRenderer.dispose();
  }
}

// Turn angle `from` toward `to` by at most `max` radians.
function turnToward(from, to, max) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-max, Math.min(max, d));
}
