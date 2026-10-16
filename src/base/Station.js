// The ranger station (M5, DESIGN.md "The ranger station"): the compound
// against the cliff and everything that defends it.
//  - Layout (stationLayout.js): a chain-link fence of 12 segments and a
//    gate, the cabin with its front door and fortified comms room, the
//    lookout tower, the turret pad and the fence box.
//  - State (StationState.js): every defence's health, the fence's charge,
//    barricades, spike traps, floodlights, the turret; security rating.
//  - Siege: zombies near the station follow siegeRouting.js through the
//    fence and doors and claw whatever is in the way (EnemyManager calls
//    our route hook). A charged fence zaps them (damage and a stun) at a
//    cost in charge. If one gets into the comms room, the family are
//    lost: the run ends.
//  - Defences: the gate and doors open themselves for the player; spike
//    traps bite and slow; the turret (Turret.js) really fires.
//  - Hold interact (X / E): repair the fence, gate and doors, build
//    barricades, fit batteries at the fence box, install and load the
//    turret, climb the tower (reveals the map round it), open the ledger.
//  - The ledger (ui/Ledger.js): one place to manage it all.
//  - M6: while the player is away, NightWatch resolves each attack by the
//    margin table and plays it out on the real defences until dawn
//    (attackStart(), attackCosts(), attackDamage()); the turret doesn't
//    really fire then (its rounds turn into kills).
//
// Events: 'station:breached' { barrier }, 'station:repaired' { barrier },
// 'station:overrun', 'station:battery' { charge }.

import { stationLayout, zoneOf, angleOf } from './stationLayout.js';
import { StationState, passable, TURRET_MODES } from './StationState.js';
import { routeTo } from './siegeRouting.js';
import { ammoDamage, secondsOfFire } from './turretMath.js';
import { Turret } from './Turret.js';
import { HoldAction } from '../player/HoldAction.js';
import { segmentCollider } from '../world/collision.js';
import { StationRenderer } from '../render/StationRenderer.js';
import { Ledger } from '../ui/Ledger.js';
import { DEBUG } from '../debug/DebugMenu.js';

const AMMO_NAMES = { pistol: 'pistol rounds', rifle: 'rifle rounds', shotgun: 'shotgun shells' };

export class Station {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.sc = cfg.station;
    this.rng = rng;
    this.bus = bus;
  }

  // ctx: { root, world, combat, player, colliders, mapUi, notify(text) }.
  init(scene, ctx) {
    const sc = this.sc;
    this.world = ctx.world;
    this.ground = ctx.world.ground;
    this.combat = ctx.combat;
    this.enemies = ctx.combat.enemies;
    this.player = ctx.player;
    this.mapUi = ctx.mapUi;
    this.notify = ctx.notify;
    this.layout = stationLayout(ctx.world.home, this.ground, sc.layout);
    this.state = new StationState(sc, this.layout);
    this.state.init();
    this.nightSeconds = this.cfg.clock.phases.find((p) => p.name === 'night')?.seconds ?? 360;
    this.time = 0;
    this.overrunEnabled = sc.siege.overrun;
    this.abstract = false; // M6: set by NightWatch while the player is away
    this.overrunDone = false;
    this.clawing = 0; // swipes at the defences in the last second (overlay)
    this.clawCount = 0;
    this.clawTimer = 0;
    this.stripTimer = 0;

    this.buildColliders(ctx.colliders);
    this.turret = new Turret({
      cfg: this.cfg,
      state: this.state,
      layout: this.layout,
      enemies: this.enemies,
      colliders: ctx.colliders,
      ground: this.ground,
      fx: this.combat.fx,
      sfx: this.combat.sfx,
      bus: this.bus,
      rng: this.rng.fork('turret'),
    });
    this.turret.init();
    this.renderer = new StationRenderer(sc, this.rng.fork('station-look'));
    this.renderer.init(scene, this.layout, this.ground, this.state, this.floorY);
    this.ledger = new Ledger(this.cfg.ledger, this.bus);
    this.ledger.init(ctx.root, () => this.ledgerPages(), () => this.ledgerSummary());
    this.hold = new HoldAction(sc.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD each frame

    const fam = this.layout.cabin.commsCentre;
    this.routeHook = {
      x: fam.x,
      z: fam.z,
      baseRadius: sc.siege.baseRadius,
      routeRadius: sc.siege.baseRadius + 10,
      reach: sc.siege.reach,
      route: (fx, fz, tx, tz, out) => routeTo(this.layout, this.state, sc, fx, fz, tx, tz, out),
    };
    this.enemies.station = this.routeHook;
    this.wireEvents();
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      bus.on('enemy:strikeDefence', (e) => this.onStrike(e)),
      bus.on('player:hurt', () => this.hold.interrupt()),
      bus.on('player:respawned', () => this.reset()),
    ];
  }

  // A fresh station for "try again".
  reset() {
    this.state.init();
    this.turret.reset();
    this.overrunDone = false;
    this.hold.init();
    this.ledger.close();
    this.syncColliders();
  }

  // ---- colliders ---------------------------------------------------------------

  buildColliders(grid) {
    const sc = this.sc;
    const L = sc.layout;
    const t = L.colliderThickness;
    const g = this.ground;
    const c = this.layout.cabin;
    // The cabin sits level on its highest corner.
    const corners = [
      [c.x - c.halfW, c.z - c.halfD],
      [c.x + c.halfW, c.z - c.halfD],
      [c.x - c.halfW, c.z + c.halfD],
      [c.x + c.halfW, c.z + c.halfD],
    ].map(([x, z]) => g.heightAt(x, z));
    this.floorY = Math.max(...corners) + 0.12;
    const low = Math.min(...corners) - 0.5;
    this.barrierColliders = new Map();
    const add = (barrier, pieces, base, top, blocksShots) => {
      const list = [];
      for (const p of pieces) {
        for (const q of split(p, L.panelLength)) {
          const col = segmentCollider(q.ax, q.az, q.bx, q.bz, t, base, top, blocksShots);
          grid.insert(col);
          list.push(col);
        }
      }
      // By id, not by object: "try again" rebuilds the barriers (state.init()),
      // and colliders keyed to the old objects never followed the new ones
      // (Aaron's M5 test: after a death the fence and doors stayed shut).
      if (barrier) this.barrierColliders.set(barrier.id, list);
      return list;
    };
    const s = this.state;
    const heightAround = (pieces) => Math.min(...pieces.map((p) => Math.min(g.heightAt(p.ax, p.az), g.heightAt(p.bx, p.bz))));
    this.layout.segments.forEach((seg, i) => {
      const base = heightAround(seg.pieces) - 0.5;
      // Chain-link glares like the gate: the torch dims on it up close (Aaron, M6).
      for (const col of add(s.segments[i], seg.pieces, base, base + 0.5 + L.fenceHeight, false)) col.glare = true;
      const bb = heightAround(seg.barricade.pieces) - 0.5;
      add(s.segments[i].barricade, seg.barricade.pieces, bb, bb + 1.8, true);
    });
    const gb = heightAround(this.layout.gate.pieces) - 0.5;
    // The gate's solid frame dims the torch up close (shots still pass through).
    for (const col of add(s.gate, this.layout.gate.pieces, gb, gb + 0.5 + L.fenceHeight, false)) col.glare = true;
    const top = this.floorY + c.wallHeight;
    add(null, c.walls, low, top, true);
    add(s.doors.front, [c.frontDoor.line], low, top, true);
    add(s.doors.comms, [c.commsDoor.line], low, top, true);
    // Small solid things: the desk, tower legs, turret pad, fence box, family.
    const d = c.desk;
    add(null, [{ ax: d.x - 0.8, az: d.z, bx: d.x + 0.8, bz: d.z }], low, this.floorY + 0.8, true);
    const tw = this.layout.tower;
    const legs = tw.legSpread;
    // Each has a top, so shots (the turret's own included) pass over it.
    const solid = (x, z, r, height) => grid.insert({ x, z, r, base: g.heightAt(x, z) - 0.5, top: g.heightAt(x, z) + height });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) solid(tw.x + dx * legs, tw.z + dz * legs, 0.15, tw.height);
    const pad = this.layout.turretPad;
    solid(pad.x, pad.z, 0.55, 0.3);
    // Glare-only shapes (bodies walk through, shots pass): the torch dims on
    // them up close, as it does on rocks and signs (Aaron's M5 test: the
    // turret and the tower's railing glared).
    const padY = g.heightAt(pad.x, pad.z);
    this.turretGlare = { x: pad.x, z: pad.z, r: 0.5, base: padY + 0.8, top: padY + 2, noBody: true, glareOnly: true, off: true };
    grid.insert(this.turretGlare);
    const towerTop = g.heightAt(tw.x, tw.z) + tw.height;
    const h = tw.half;
    const rail = [
      [-h, -h, h, -h],
      [h, -h, h, h],
      [h, h, -h, h],
      [-h, h, -h, -h],
    ];
    for (const [ax, az, bx, bz] of rail) {
      const col = segmentCollider(tw.x + ax, tw.z + az, tw.x + bx, tw.z + bz, 0.1, towerTop - 0.1, towerTop + 1.1, false);
      col.glare = true;
      col.glareOnly = true;
      col.noBody = true;
      grid.insert(col);
    }
    const box = this.layout.fenceBox;
    solid(box.x, box.z, 0.35, 1.3);
    for (const f of c.family) grid.insert({ x: f.x, z: f.z, r: 0.25, base: this.floorY - 0.5, top: this.floorY + 1.7 });
    this.syncColliders();
  }

  // Broken, unbuilt or open barriers let bodies through.
  syncColliders() {
    for (const b of this.state.barriers()) {
      const list = this.barrierColliders.get(b.id);
      if (!list) continue;
      const off = passable(b);
      for (const col of list) col.off = off;
    }
  }

  // ---- siege ------------------------------------------------------------------

  onStrike({ zombie, barrier, damage }) {
    const s = this.state;
    const at = { x: zombie.viaX, z: zombie.viaZ };
    this.clawCount++;
    barrier.lastHit = this.time;
    const metal = barrier.kind === 'fence' || barrier.kind === 'gate';
    this.combat.sfx.play(metal ? 'fenceHit' : 'doorHit', at);
    if (metal && s.powered) this.zap(zombie);
    if (s.damage(barrier, damage * this.sc.siege.strikeScale)) this.onBreak(barrier);
  }

  // The electric fence bites: damage, a stun (the slow), sparks, and charge.
  zap(z) {
    const p = this.sc.power;
    if ((z.zapReady ?? 0) > this.time) return;
    z.zapReady = this.time + p.zapCooldown;
    this.state.drain(p.zapCost);
    const at = { x: (z.x + z.viaX) / 2, y: z.y + 1.2, z: (z.z + z.viaZ) / 2 };
    // From the far side of the wire, so the jolt throws it back.
    const from = { x: z.viaX * 2 - z.x, z: z.viaZ * 2 - z.z };
    this.combat.fx.sparks(at.x, at.y, at.z);
    this.combat.sfx.play('zap', at);
    this.enemies.damage(z, p.zapDamage, 'body', { stagger: p.zapStagger, knockback: 0.6 }, at, from);
  }

  onBreak(b) {
    this.syncColliders();
    const where = this.barrierPosition(b);
    this.combat.sfx.play('breach', where);
    const text = {
      fence: `The ${b.name} is down!`,
      gate: 'The gate is down!',
      barricade: `The ${b.name} is smashed!`,
      door: b.id === 'comms' ? "They've broken the comms room door!" : 'The front door is broken!',
    }[b.kind];
    this.notify(text);
    this.bus.emit('station:breached', { barrier: b });
  }

  barrierPosition(b) {
    const L = this.layout;
    if (b.kind === 'fence') return L.segments[b.index].mid;
    if (b.kind === 'barricade') return L.segments[b.index].barricade.mid;
    if (b.kind === 'gate') return L.gate.mid;
    return b.id === 'comms' ? L.cabin.commsDoor : L.cabin.frontDoor;
  }

  // Spike traps bite zombies standing on them: damage, a slow, and wear.
  updateSpikes() {
    const sp = this.sc.spikes;
    const segs = this.state.segments;
    for (let i = 0; i < segs.length; i++) {
      const trap = segs[i].spike;
      if (!trap.built || trap.durability <= 0) continue;
      const at = this.layout.segments[i].spike;
      for (const z of this.enemies.living) {
        if (z.state === 'rise' || (z.spikeReady ?? 0) > this.time) continue;
        if (Math.hypot(z.x - at.x, z.z - at.z) > sp.radius) continue;
        z.spikeReady = this.time + sp.interval;
        z.slowTimer = sp.interval;
        z.slow = sp.slow;
        this.state.wearSpike(i);
        this.combat.sfx.play('spike', at);
        this.enemies.damage(z, sp.damage, 'body', { stagger: 0.15, knockback: 0 }, { x: z.x, y: z.y + 0.3, z: z.z }, at);
        if (trap.durability <= 0) {
          this.notify(`The spike trap outside the ${this.layout.segments[i].name} is worn out`);
          break;
        }
      }
    }
  }

  // Zombies in a lit floodlight's pool are lit up (ZombieRenderer reads z.lit).
  updateFloodlit(phase) {
    const f = this.sc.floodlight;
    const lit = phase !== 'day' && this.state.powered && this.state.floodlightCount > 0;
    const reach = this.sc.layout.floodInside + f.poolOutside;
    for (const z of this.enemies.living) {
      let best = 0;
      if (lit) {
        const floods = this.layout.floods;
        for (let i = 0; i < floods.length; i++) {
          const fl = floods[i];
          if (!this.state.floods[i].built) continue;
          const px = fl.x + Math.sin(fl.angle) * reach;
          const pz = fl.z + Math.cos(fl.angle) * reach;
          const d = Math.hypot(z.x - px, z.z - pz) / f.poolRadius;
          best = Math.max(best, Math.min(1, Math.max(0, (f.litEdge - d) / (f.litEdge - 0.6))));
        }
      }
      z.lit = best;
    }
  }

  // A zombie in the comms room: the family are lost.
  checkOverrun() {
    if (!this.overrunEnabled || this.overrunDone || !this.combat.alive) return;
    for (const z of this.enemies.living) {
      if (z.state === 'rise') continue;
      if (zoneOf(this.layout, z.x, z.z) === 3) {
        this.overrunDone = true;
        this.bus.emit('station:overrun');
        this.combat.overrun();
        return;
      }
    }
  }

  // ---- doors and the gate ---------------------------------------------------------

  // Each opens itself while the player is close, and closes behind them.
  updateDoors(dt) {
    const p = this.player.position;
    const L = this.layout;
    const s = this.state;
    const f = this.sc.fence;
    const d = this.sc.doors;
    const onTower = this.player.platform !== null;
    const doors = [
      [s.gate, L.gate.mid, f.gateOpenDistance, f.gateSlideSeconds, 'gate'],
      [s.doors.front, L.cabin.frontDoor, d.openDistance, d.swingSeconds, 'door'],
      [s.doors.comms, L.cabin.commsDoor, d.openDistance, d.swingSeconds, 'door'],
    ];
    for (const [b, at, dist, seconds, sound] of doors) {
      const near = !onTower && this.combat.alive && b.health > 0 && Math.hypot(p.x - at.x, p.z - at.z) < dist;
      const before = b.openAmount;
      b.openAmount = Math.max(0, Math.min(1, b.openAmount + (near ? 1 : -1) * (dt / seconds)));
      if ((before === 0 && b.openAmount > 0) || (before === 1 && b.openAmount < 1)) this.combat.sfx.play(sound, at);
      b.open = b.openAmount > 0.5;
    }
  }

  // ---- each frame ------------------------------------------------------------------

  // playing: false while a menu or the map is open. phase: the clock's.
  update(dt, input, playing, phase, cameraPosition, daylight) {
    if (playing) {
      this.time += dt;
      this.updateDoors(dt);
      if (phase === 'night' && this.state.charge > 0) this.state.drain(this.state.nightDrainPerSecond(this.nightSeconds) * dt);
      this.updateSpikes();
      this.updateFloodlit(phase);
      // Away (M6), the turret's part is the forecast's ammo maths, not real shots.
      if (!this.abstract) this.turret.update(dt);
      this.turretGlare.off = !this.state.turret.installed;
      this.syncColliders();
      this.checkOverrun();
      this.clawTimer += dt;
      if (this.clawTimer >= 1) {
        this.clawing = this.clawCount;
        this.clawCount = 0;
        this.clawTimer = 0;
      }
    }
    this.stripTimer -= dt;
    if (this.stripTimer <= 0) {
      this.stripTimer = this.sc.hudRefresh;
      this.combat.hud.station(this.stripHtml());
    }
    const canInteract = playing && !this.ledger.isOpen && this.combat.alive;
    if (canInteract) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
    this.ledger.update(dt, input, playing);
    this.renderer.update(dt, cameraPosition, daylight, this.turret);
  }

  // ---- interactions -----------------------------------------------------------------

  updateInteraction(dt, input) {
    const best = this.pickInteraction(input.activeDevice === 'gamepad' ? 'X' : 'E');
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) {
      const message = best.act();
      if (message) this.notify(message);
    }
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do here: { key, prompt, busy, seconds, act } (act
  // null for an information-only prompt), or null.
  pickInteraction(X) {
    const p = this.player.position;
    const L = this.layout;
    const s = this.state;
    const sc = this.sc;
    const h = sc.hold;
    const inv = this.combat.inventory;
    const range = sc.interactRange;
    if (this.player.platform) {
      return { key: 'tower-down', prompt: `Hold ${X}: climb down`, busy: 'Climbing down…', seconds: h.climb, act: () => this.climbDown() };
    }
    // Spots (the desk, ladder, fence box, turret, doors) come first; the
    // long fence line behind them only when no spot is in reach.
    let best = null;
    const offer = (d, entry, tier = 0) => {
      if (d > range) return;
      if (!best || tier < best.tier || (tier === best.tier && d < best.d)) best = { d, tier, ...entry };
    };
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);

    const c = L.cabin;
    offer(dist(c.desk), { key: 'ledger', prompt: `Hold ${X}: open the ledger`, seconds: h.ledger, act: () => this.ledger.open() });
    offer(dist(L.tower.ladder), { key: 'tower-up', prompt: `Hold ${X}: climb the lookout tower`, busy: 'Climbing…', seconds: h.climb, act: () => this.climbUp() });

    const box = L.fenceBox;
    const chargeText = `charge ${Math.round(s.charge)}/${sc.power.maxCharge}`;
    if (inv.batteries > 0 && !s.chargeFull) {
      offer(dist(box), { key: 'battery', prompt: `Hold ${X}: fit a battery in the fence box (${chargeText})`, busy: 'Fitting the battery…', seconds: h.battery, act: () => this.fitBattery() });
    } else {
      offer(dist(box), { key: 'box', prompt: `Fence box: ${chargeText}${inv.batteries > 0 ? ' (full)' : '. Bring a battery'}`, act: null });
    }

    const pad = L.turretPad;
    const t = s.turret;
    if (t.available && !t.installed) {
      offer(dist(pad), { key: 'install', prompt: `Hold ${X}: install the turret`, busy: 'Installing…', seconds: h.install, act: () => this.installTurret() });
    } else if (t.installed) {
      // Aaron (M5): load it from a menu, choosing what goes in.
      const status = `${Math.floor(t.rounds)} rounds, ${t.mode}${s.powered ? '' : ', no power'}`;
      offer(dist(pad), { key: 'turret-menu', prompt: `Hold ${X}: turret (load ammo, fire mode). ${status}`, seconds: h.load, act: () => this.ledger.open('turret') });
    } else {
      offer(dist(pad), { key: 'pad', prompt: 'Turret pad: empty (the turret is at the Car Armory)', act: null });
    }

    for (const door of [s.doors.front, s.doors.comms]) {
      const at = door.id === 'front' ? c.frontDoor : c.commsDoor;
      const cost = s.repairCost(door);
      if (cost > 0) offer(dist(at), this.repairOffer(door, cost, X));
    }

    // The fence, gate and barricades: where you stand round the arc.
    const R = L.radius;
    const a = angleOf(L, p.x, p.z);
    const r = dist(L.centre);
    const pad2 = 0.6 / R;
    const pieces = [[s.gate, L.gate, null]];
    L.segments.forEach((g, i) => pieces.push([s.segments[i], g, i]));
    for (const [b, g, i] of pieces) {
      if (a < g.a0 - pad2 || a > g.a1 + pad2) continue;
      const cost = s.repairCost(b);
      if (cost > 0) {
        offer(Math.abs(r - R), this.repairOffer(b, cost, X), 1);
        continue;
      }
      if (i === null || r >= R) continue;
      const bar = b.barricade;
      const dBar = Math.abs(r - (R - sc.layout.barricadeInside));
      if (!bar.built) {
        const price = sc.costs.barricade;
        if (inv.scrap >= price) {
          offer(dBar, { key: `barricade${i}`, prompt: `Hold ${X}: build a barricade behind the ${g.name} (${price} scrap)`, busy: 'Building…', seconds: h.build, act: () => this.buildBarricade(i) }, 1);
        }
      } else {
        const bc = s.repairCost(bar);
        if (bc > 0) offer(dBar, this.repairOffer(bar, bc, X), 1);
      }
    }
    return best;
  }

  repairOffer(b, cost, X) {
    const scrap = this.combat.inventory.scrap;
    const hp = `${Math.ceil(b.health)}/${b.max}`;
    if (scrap <= 0) return { key: `info-${b.id}`, prompt: `${capitalise(b.name)} ${hp}: you need scrap to repair it`, act: null };
    const partial = scrap < cost ? ` (${scrap} of ${cost} scrap: part of it)` : ` (${cost} scrap)`;
    return { key: `repair-${b.id}`, prompt: `Hold ${X}: repair the ${b.name} ${hp}${partial}`, busy: 'Repairing…', seconds: this.sc.hold.repair, act: () => this.repair(b) };
  }

  // ---- actions (from the world or the ledger); each returns a message ----------------

  repair(b) {
    const inv = this.combat.inventory;
    const cost = this.state.repairCost(b);
    if (cost <= 0) return `The ${b.name} doesn't need repairing`;
    const spent = this.state.repair(b, inv.scrap);
    if (spent <= 0) return this.denied('Not enough scrap');
    inv.spendScrap(spent);
    this.syncColliders();
    this.combat.sfx.play('hammer');
    this.bus.emit('station:repaired', { barrier: b });
    return spent < cost ? `${capitalise(b.name)} partly repaired (-${spent} scrap)` : `${capitalise(b.name)} repaired (-${spent} scrap)`;
  }

  repairAllFence() {
    const s = this.state;
    let spent = 0;
    for (const b of [...s.segments, s.gate]) {
      const inv = this.combat.inventory;
      if (inv.scrap <= 0) break;
      const n = s.repair(b, inv.scrap);
      inv.spendScrap(n);
      spent += n;
    }
    if (spent === 0) return this.denied('Nothing repaired');
    this.syncColliders();
    this.combat.sfx.play('hammer');
    return `Fence repaired (-${spent} scrap)`;
  }

  buildBarricade(i) {
    const inv = this.combat.inventory;
    const spent = this.state.buildBarricade(i, inv.scrap);
    if (spent <= 0) return this.denied(`A barricade costs ${this.sc.costs.barricade} scrap`);
    inv.spendScrap(spent);
    this.syncColliders();
    this.combat.sfx.play('hammer');
    return `Barricade built behind the ${this.layout.segments[i].name} (-${spent} scrap)`;
  }

  reinforceDoor(id) {
    const inv = this.combat.inventory;
    const spent = this.state.reinforceDoor(id, inv.scrap);
    if (spent <= 0) return this.denied(`Reinforcing costs ${this.sc.costs.reinforceDoor} scrap`);
    inv.spendScrap(spent);
    this.combat.sfx.play('hammer');
    return `${capitalise(this.state.doors[id].name)} reinforced (-${spent} scrap)`;
  }

  buildSpike(i) {
    const inv = this.combat.inventory;
    const spent = this.state.buildSpike(i, inv.scrap);
    if (spent <= 0) return this.denied('Not enough scrap');
    inv.spendScrap(spent);
    this.combat.sfx.play('hammer');
    return `Spike trap set outside the ${this.layout.segments[i].name} (-${spent} scrap)`;
  }

  buildFloodlight(i) {
    const inv = this.combat.inventory;
    const spent = this.state.buildFloodlight(i, inv.scrap);
    if (spent <= 0) return this.denied(`A floodlight costs ${this.sc.costs.floodlight} scrap`);
    inv.spendScrap(spent);
    this.combat.sfx.play('hammer');
    return `Floodlight put up on the ${this.layout.segments[this.state.floods[i].segment].name} (-${spent} scrap)`;
  }

  fitBattery() {
    const inv = this.combat.inventory;
    if (this.state.chargeFull) return this.denied('The fence is fully charged');
    if (!inv.useBattery()) return this.denied('You have no battery');
    const added = this.state.fitBattery();
    this.syncColliders();
    this.combat.sfx.play('battery');
    this.renderer.pulseWire();
    this.bus.emit('station:battery', { charge: this.state.charge });
    return `Battery fitted: +${Math.round(added)} charge (${Math.round(this.state.charge)}/${this.sc.power.maxCharge})`;
  }

  installTurret() {
    const t = this.state.turret;
    if (!t.available || t.installed) return null;
    t.installed = true;
    this.combat.sfx.play('hammer');
    return 'Turret installed. Hold X at it to load ammo and set its fire mode';
  }

  // id: an ammo type. Rounds in the guns' pool, or in the pack (no gun for them yet).
  ammoCount(id) {
    return this.combat.weapons.ammoRounds(id) ?? this.combat.inventory.ammo[id] ?? 0;
  }

  loadTurret(id, rounds) {
    if (!this.state.turret.installed) return this.denied('Install the turret first');
    const have = this.ammoCount(id);
    const n = Math.min(have, rounds);
    if (n <= 0) return this.denied(`No ${AMMO_NAMES[id]} to load`);
    if (!this.combat.weapons.addAmmo(id, -n)) this.combat.inventory.ammo[id] -= n;
    const gained = this.state.loadTurret(n, ammoDamage(id, this.cfg.weapons, this.sc.turret));
    this.combat.sfx.play('loaded');
    return `Loaded ${n} ${AMMO_NAMES[id]}: +${gained.toFixed(1)} turret rounds (${Math.floor(this.state.turret.rounds)})`;
  }

  setTurretMode(mode) {
    this.state.setTurretMode(mode);
    return `Turret fire mode: ${mode}`;
  }

  climbUp() {
    const t = this.layout.tower;
    const y = this.ground.heightAt(t.x, t.z) + t.height;
    this.player.setPlatform({ x: t.x, z: t.z, y, half: t.half }, t.x, t.z);
    this.mapUi.fog.reveal(t.x, t.z, t.revealRadius);
    this.combat.sfx.play('climb');
    return 'From the lookout you can see for miles: the map round the station is revealed';
  }

  climbDown() {
    const l = this.layout.tower.ladder;
    this.player.setPlatform(null, l.x, l.z + 0.4);
    this.combat.sfx.play('climb');
    return null;
  }

  denied(text) {
    this.combat.sfx.play('denied');
    return text;
  }

  // ---- the ledger --------------------------------------------------------------------

  ledgerSummary() {
    const s = this.state;
    const sec = s.security(this.nightSeconds);
    return `Scrap ${this.combat.inventory.scrap}   ·   Security ${sec.total.toFixed(0)}   ·   Fence charge ${Math.round(s.charge)}/${this.sc.power.maxCharge}   ·   Batteries carried ${this.combat.inventory.batteries}`;
  }

  // Tabs (Fence, Doors, Turret, Power, Upgrades), each a list of rows:
  // { label, value, action (returns a message) or null }.
  ledgerPages() {
    const s = this.state;
    const sc = this.sc;
    const L = this.layout;
    const k = sc.costs;
    const hp = (b) => `${Math.ceil(b.health)}/${b.max}`;
    const repairRow = (b, label) => {
      const cost = s.repairCost(b);
      return { label, value: cost > 0 ? `${hp(b)}  ·  repair ${cost} scrap` : `${hp(b)}  ·  sound`, action: cost > 0 ? () => this.repair(b) : null };
    };

    const fence = [];
    const fenceCost = [...s.segments, s.gate].reduce((sum, b) => sum + s.repairCost(b), 0);
    fence.push({ label: 'Repair the whole fence and gate', value: fenceCost > 0 ? `${fenceCost} scrap` : 'all sound', action: fenceCost > 0 ? () => this.repairAllFence() : null });
    fence.push(repairRow(s.gate, 'Gate (south)'));
    s.segments.forEach((seg, i) => {
      const name = capitalise(L.segments[i].name);
      fence.push(repairRow(seg, name));
      const bar = seg.barricade;
      if (!bar.built) fence.push({ label: `   Barricade behind it`, value: `build ${k.barricade} scrap`, action: () => this.buildBarricade(i) });
      else fence.push(repairRow(bar, `   Barricade behind it`));
    });

    const doors = [];
    for (const d of [s.doors.front, s.doors.comms]) {
      doors.push(repairRow(d, capitalise(d.name)));
      doors.push(d.reinforced ? { label: '   Reinforced', value: `security ${sc.security.reinforcedDoor}`, action: null } : { label: '   Reinforce it', value: `${k.reinforceDoor} scrap  ·  ${sc.doors.health} -> ${sc.doors.reinforcedHealth}, security ${sc.security.door} -> ${sc.security.reinforcedDoor}`, action: () => this.reinforceDoor(d.id) });
    }

    const turret = [];
    const t = s.turret;
    if (!t.available) {
      turret.push({ label: 'No turret', value: 'the game\'s one turret is at the Car Armory', action: null });
    } else if (!t.installed) {
      turret.push({ label: 'Install the turret on its pad', value: 'by the front door', action: () => this.installTurret() });
    } else {
      const cov = s.turretCoverage(this.nightSeconds);
      const mode = s.turretMode;
      turret.push({ label: 'Status', value: `${this.turret.status}${s.powered ? '' : ' (the fence has no charge)'}`, action: null });
      turret.push({ label: 'Fire mode (A: change)', value: `${t.mode}: a shot every ${mode.seconds} s, security ${mode.security} at full ammo`, action: () => this.setTurretMode(TURRET_MODES[(TURRET_MODES.indexOf(t.mode) + 1) % TURRET_MODES.length]) });
      const minutes = secondsOfFire(t.rounds, mode) / 60;
      turret.push({ label: 'Turret rounds', value: `${Math.floor(t.rounds)} / ${cov.needed} for a night (${Math.round(cov.coverage * 100)}%)  ·  about ${minutes.toFixed(1)} min of fire`, action: null });
      // Choose exactly what goes in (Aaron, M5): 1, a handful, or all of
      // each kind, with what it's worth in turret rounds.
      const tc = sc.turret;
      for (const id of tc.loadOrder) {
        const have = this.ammoCount(id);
        const per = ammoDamage(id, this.cfg.weapons, tc) / tc.roundDamage;
        const name = AMMO_NAMES[id];
        if (have <= 0) {
          turret.push({ label: `Load ${name}`, value: `you have none  ·  ${per} turret rounds each`, action: null });
          continue;
        }
        const amounts = [...new Set(tc.menuAmounts.map((n) => (n > 0 ? Math.min(n, have) : have)))];
        for (const n of amounts) {
          const label = n === have ? `Load all ${n} ${name}` : `Load ${n} ${n === 1 ? name.replace(/s$/, '') : name}`;
          turret.push({ label, value: `+${(n * per).toFixed(1)} turret rounds  ·  you have ${have}`, action: () => this.loadTurret(id, n) });
        }
      }
    }

    const p = sc.power;
    const inv = this.combat.inventory;
    const power = [
      { label: 'Fence charge', value: `${Math.round(s.charge)} / ${p.maxCharge}  ·  full security from ${p.fullSecurityCharge}`, action: null },
      { label: 'Fit a battery', value: `you carry ${inv.batteries}  ·  +${p.batteryCharge} charge each`, action: inv.batteries > 0 && !s.chargeFull ? () => this.fitBattery() : null },
      { label: 'Drain', value: `${p.nightDrain} a night, +${p.floodlightNightDrain} per floodlight; ${p.zapCost} per zap; ${p.turretShotCost} per turret shot`, action: null },
      { label: 'Tonight', value: `drains about ${(s.nightDrainPerSecond(this.nightSeconds) * this.nightSeconds).toFixed(0)} before zaps and turret`, action: null },
    ];

    const upgrades = [];
    s.floods.forEach((f, i) => {
      const name = capitalise(L.segments[f.segment].name);
      upgrades.push(f.built ? { label: `Floodlight, ${name.toLowerCase()}`, value: `up  ·  security ${sc.security.floodlight}`, action: null } : { label: `Floodlight, ${name.toLowerCase()}`, value: `${k.floodlight} scrap`, action: () => this.buildFloodlight(i) });
    });
    s.segments.forEach((seg, i) => {
      const trap = seg.spike;
      const name = L.segments[i].name;
      const cost = s.spikeCost(i);
      const state = !trap.built ? `${k.spikeTrap} scrap` : trap.durability > 0 ? `${trap.durability}/${sc.spikes.durability} bites left${cost > 0 ? `  ·  rebuild ${cost} scrap` : ''}` : `worn out  ·  rebuild ${cost} scrap`;
      upgrades.push({ label: `Spike trap outside the ${name}`, value: state, action: cost > 0 ? () => this.buildSpike(i) : null });
    });

    const sec = s.security(this.nightSeconds);
    const security = sec.parts.map((part) => ({ label: part.label, value: `${part.value.toFixed(1)} / ${part.max}`, action: null }));
    security.push({ label: 'Total', value: sec.total.toFixed(1), action: null });

    return [
      { id: 'fence', title: 'Fence', rows: fence },
      { id: 'doors', title: 'Doors', rows: doors },
      { id: 'turret', title: 'Turret', rows: turret },
      { id: 'power', title: 'Power', rows: power },
      { id: 'upgrades', title: 'Upgrades', rows: upgrades },
      { id: 'security', title: 'Security', rows: security },
      ...(this.extraPages?.() ?? []), // M6: NightWatch's forecast
    ];
  }

  // ---- attacks while you're away (M6) ------------------------------------------------

  // The fence line (segments and the gate) nearest first from angle `a`
  // round the fence: where an attack from that side lands.
  fenceLineFrom(a) {
    const s = this.state;
    const line = this.layout.segments.map((seg, i) => ({ b: s.segments[i], a: (seg.a0 + seg.a1) / 2 }));
    line.push({ b: s.gate, a: 0 });
    return line.sort((p, q) => Math.abs(p.a - a) - Math.abs(q.a - a)).map((p) => p.b);
  }

  // An attack while you're away (NightWatch) plays out on the real
  // defences from where it arrived (fenceLineFrom()), until dawn:
  //  - attackStart(): the spike trap there bites;
  //  - attackCosts(): the turret fires at its mode's rate and the fence
  //    zaps, using up rounds and charge (NightWatch turns rounds into kills);
  //  - attackDamage(): claw damage. Spread along the fence (a barricade
  //    before its segment), or, for an attack the margin says breaks
  //    through, the fence where it arrived, then the front door, then the
  //    comms door: the family are lost.
  // Breaks are announced as in a real siege ("The east fence 2 is down!").

  attackStart(line, zombies) {
    const first = line[0];
    if (first.kind !== 'fence') return;
    for (let i = 0; i < zombies && first.spike.built && first.spike.durability > 0; i++) this.state.wearSpike(first.index);
  }

  // Returns the turret rounds fired over dt seconds.
  attackCosts(dt, zombies) {
    const s = this.state;
    const r = this.cfg.nights.resolver;
    let rounds = 0;
    if (s.turretOnline && zombies > 0) {
      rounds = Math.min(s.turret.rounds, dt / s.turretMode.seconds);
      s.turret.rounds -= rounds;
      s.drain(rounds * this.sc.power.turretShotCost);
    }
    if (s.powered) s.drain(zombies * r.zapsPerZombieSecond * dt * this.sc.power.zapCost);
    return rounds;
  }

  // The barriers a breaking-through attack goes for, in order.
  breakThroughLine(line) {
    const s = this.state;
    const first = line[0];
    return [...(first.kind === 'fence' && first.barricade.built ? [first.barricade] : []), first, s.doors.front, s.doors.comms];
  }

  // `amount` of claw damage. through: the attack breaks through. Returns
  // the health taken off.
  attackDamage(line, amount, through) {
    const s = this.state;
    const r = this.cfg.nights.resolver;
    let left = amount;
    let done = 0;
    const order = through ? this.breakThroughLine(line) : line.flatMap((b) => (b.kind === 'fence' && b.barricade.built ? [b.barricade, b] : [b]));
    for (const target of order) {
      if (left <= 1e-9) break;
      if (target.health <= 0) continue;
      const take = through ? Math.min(left, target.health) : Math.min(left, target.health * r.spreadBreak);
      done += take;
      left -= take;
      if (s.damage(target, take)) {
        this.onBreak(target);
        if (target === s.doors.comms) this.fallAway();
      }
      if (through) break; // one barrier at a time: they have to get through it first
    }
    return done;
  }

  // The comms room door is down while you're away: the family are lost.
  fallAway() {
    if (!this.overrunEnabled || this.overrunDone || !this.combat.alive) return;
    this.overrunDone = true;
    this.bus.emit('station:overrun');
    this.combat.overrun('The dead broke into the comms room while you were away.');
  }

  // The HUD strip under the minimap, while you're near the station: its
  // security and charge, a pip per fence segment (west to east, the gate in
  // the middle) and door, flashing while it's being clawed, and the turret.
  stripHtml() {
    const p = this.player.position;
    const c = this.layout.centre;
    if (Math.hypot(p.x - c.x, p.z - c.z) > this.sc.siege.baseRadius) return null;
    const s = this.state;
    const pip = (b, extra = '') => {
      const f = b.health / b.max;
      const cls = b.health <= 0 ? 'down' : f < 0.3 ? 'low' : f < 0.7 ? 'mid' : '';
      const hit = this.time - (b.lastHit ?? -99) < 1.5 ? ' hit' : '';
      return `<span class="${cls}${hit}${extra}"></span>`;
    };
    const segs = s.segments;
    const half = segs.length / 2;
    const fence = segs.slice(0, half).map((b) => pip(b)).join('') + pip(s.gate, ' gate') + segs.slice(half).map((b) => pip(b)).join('');
    const sec = s.security(this.nightSeconds).total.toFixed(0);
    const charge = s.powered ? `<span class="charged">charge ${Math.round(s.charge)}</span>` : 'no charge';
    const t = s.turret;
    const turret = t.installed ? `<br>turret ${this.turret.status}, ${Math.floor(t.rounds)} rounds` : '';
    return `STATION ${sec} &middot; ${charge}<br><span class="pips">fence ${fence}</span><br><span class="pips">doors ${pip(s.doors.front)}${pip(s.doors.comms)}</span>${turret}`;
  }

  // ---- debug and overlay ----------------------------------------------------------------

  addDebugItems(menu) {
    const s = this.state;
    const d = this.cfg.debug;
    const inv = () => this.combat.inventory;
    const station = menu.category(DEBUG.station);
    station.addItem(`Give ${d.giveScrap} scrap`, () => inv().addScrap(d.giveScrap));
    station.addItem(() => `Give a battery (carrying ${this.combat.inventory.batteries})`, () => inv().addBattery(1));
    station.addItem(() => `Give the turret (${s.turret.available ? 'have it' : 'none'})`, () => {
      s.turret.available = true;
      this.notify('Turret given: install it on its pad by the front door');
    });
    station.addItem('Fill the fence charge', () => {
      s.charge = this.sc.power.maxCharge;
      this.renderer.pulseWire();
    });
    station.addItem('Drain the fence charge', () => (s.charge = 0));
    station.addItem('Repair everything', () => {
      for (const b of s.barriers()) if (b.kind !== 'barricade' || b.built) b.health = b.max;
      this.syncColliders();
    });
    station.addItem('Break a random fence segment', () => {
      const intact = s.segments.filter((seg) => seg.health > 0);
      if (intact.length === 0) return;
      const seg = intact[this.rng.int(0, intact.length - 1)];
      s.damage(seg, 1e9);
      this.onBreak(seg);
    });
    station.addItem(() => `Siege wave (${d.siegeWave} zombies outside the fence)`, () => this.siegeWave(d.siegeWave));
    station.addItem(() => `Overrun ends the run: ${this.overrunEnabled ? 'on' : 'off'}`, () => (this.overrunEnabled = !this.overrunEnabled));
    menu.category(DEBUG.teleport).addItem('Teleport: into the compound', () => {
      const pad = this.layout.turretPad;
      this.player.teleport(pad.x + 2, pad.z + 3, Math.PI);
    });
  }

  // Debug: `count` zombies 15-25 m outside the fence, laying siege.
  siegeWave(count) {
    const L = this.layout;
    const a = this.rng.range(L.west * 0.7, L.east * 0.7);
    let n = 0;
    for (let i = 0; i < count; i++) {
      const p = L.at(a + this.rng.range(-0.25, 0.25), L.radius + this.rng.range(15, 25));
      const mix = this.world.variantMixAt(p.x, p.z);
      if (this.enemies.spawnPlanned({ type: 'single', count: 1 }, p.x, p.z, { ringMin: 0, ringMax: 1, mix, mode: 'siege', rise: true }) > 0) n++;
    }
    this.notify(`${n} zombies rising outside the ${nameAt(L, a)}`);
  }

  overlayLine() {
    const s = this.state;
    const sec = s.security(this.nightSeconds);
    const whole = s.segments.filter((g) => g.health >= g.max).length;
    const down = s.segments.filter((g) => g.health <= 0).length;
    const bars = s.segments.filter((g) => g.barricade.built).length;
    const t = s.turret;
    const turret = t.installed ? `turret ${this.turret.status} ${Math.floor(t.rounds)}r ${t.mode}` : t.available ? 'turret not installed' : 'no turret';
    let siege = 0;
    for (const z of this.enemies.living) if (z.mode === 'siege' || z.mode === 'held' || z.via) siege++;
    return `security ${sec.total.toFixed(1)}  charge ${Math.round(s.charge)}  fence ${whole} whole ${down} down  barricades ${bars}  gate ${Math.ceil(s.gate.health)}  doors ${Math.ceil(s.doors.front.health)}/${Math.ceil(s.doors.comms.health)}  ${turret}  sieging ${siege} clawing ${this.clawing}/s`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.enemies.station = null;
    this.ledger.dispose();
    this.renderer.dispose();
  }
}

// Split a straight piece into parts at most `max` long (wall colliders stay
// small for the collision grid).
function split(p, max) {
  const len = Math.hypot(p.bx - p.ax, p.bz - p.az);
  const n = Math.max(1, Math.ceil(len / max));
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      ax: p.ax + ((p.bx - p.ax) * i) / n,
      az: p.az + ((p.bz - p.az) * i) / n,
      bx: p.ax + ((p.bx - p.ax) * (i + 1)) / n,
      bz: p.az + ((p.bz - p.az) * (i + 1)) / n,
    });
  }
  return out;
}

function nameAt(layout, a) {
  for (const g of layout.segments) if (a >= g.a0 && a <= g.a1) return g.name;
  return 'gate';
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
