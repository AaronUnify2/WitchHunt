// The station's state (pure, no rendering): the fence segments and the
// gate, the barricades behind them, the two doors, the electric fence's
// charge, spike traps, floodlights and the turret; repairs, building and
// upgrades paid for in scrap; and the security rating (DESIGN.md
// "Security rating": the sum of every defence's value, each scaled by its
// remaining health).
//
// Every defence a zombie can claw at is a "barrier":
// { id, kind ('fence' | 'gate' | 'barricade' | 'door'), name, health, max,
//   open (a gate or door standing open), built (barricades) }.

import { turretRoundsFor, turretSecurity, ammoCoverage, roundsNeeded } from './turretMath.js';

export const TURRET_MODES = ['slow', 'medium', 'fast'];

// Can a zombie walk through? An unbuilt barricade, a broken barrier or an
// open gate or door.
export function passable(b) {
  if (!b) return true;
  if (b.kind === 'barricade' && !b.built) return true;
  return b.health <= 0 || b.open === true;
}

export class StationState {
  // cfg: config.station. layout: stationLayout().
  constructor(cfg, layout) {
    this.cfg = cfg;
    this.layout = layout;
  }

  init() {
    const c = this.cfg;
    const f = c.fence;
    this.segments = this.layout.segments.map((s, i) => {
      const max = f.segmentHealth;
      const start = f.startHealth?.[i] ?? 1;
      return {
        id: `fence${i}`,
        kind: 'fence',
        index: i,
        name: `${s.name} fence`,
        health: max * start,
        max,
        open: false,
        barricade: { id: `barricade${i}`, kind: 'barricade', index: i, name: `${s.name} barricade`, built: false, health: 0, max: f.barricadeHealth, open: false },
        spike: { index: i, built: false, durability: 0 },
      };
    });
    this.gate = { id: 'gate', kind: 'gate', name: 'gate', health: f.gateHealth, max: f.gateHealth, open: false, openAmount: 0 };
    const d = c.doors;
    const door = (id, name) => ({ id, kind: 'door', name, health: d.health, max: d.health, reinforced: false, open: false, openAmount: 0 });
    this.doors = { front: door('front', 'front door'), comms: door('comms', 'comms room door') };
    this.charge = c.power.startCharge;
    this.floods = this.layout.floods.map((fl, i) => ({ index: i, segment: fl.segment, built: false }));
    this.turret = { available: false, installed: false, mode: c.turret.startMode, rounds: 0 };
  }

  // Every barrier, for lookups by id.
  *barriers() {
    for (const s of this.segments) {
      yield s;
      yield s.barricade;
    }
    yield this.gate;
    yield this.doors.front;
    yield this.doors.comms;
  }

  // ---- damage ------------------------------------------------------------------

  // Returns true if this hit broke it.
  damage(b, amount) {
    if (b.health <= 0 || amount <= 0) return false;
    if (b.kind === 'barricade' && !b.built) return false;
    b.health = Math.max(0, b.health - amount);
    if (b.health > 0) return false;
    if (b.kind === 'barricade') b.built = false; // smashed: build a new one
    return true;
  }

  // ---- repairs and building ---------------------------------------------------

  // Scrap for a whole repair of this barrier from nothing.
  fullRepairCost(b) {
    const k = this.cfg.costs;
    switch (b.kind) {
      case 'fence':
        return k.fenceRepair;
      case 'gate':
        return k.gateRepair;
      case 'barricade':
        return k.barricadeRepair;
      default:
        return k.doorRepair * (b.reinforced ? 2 : 1);
    }
  }

  // Scrap to bring it back to full health (rounded up), 0 if it's whole.
  repairCost(b) {
    if (b.kind === 'barricade' && !b.built) return 0;
    const missing = 1 - b.health / b.max;
    return missing <= 1e-6 ? 0 : Math.ceil(missing * this.fullRepairCost(b) - 1e-9);
  }

  // Repair as far as `scrap` allows. Returns the scrap spent.
  repair(b, scrap) {
    const cost = this.repairCost(b);
    const spend = Math.min(cost, Math.max(0, Math.floor(scrap)));
    if (spend <= 0) return 0;
    b.health = spend >= cost ? b.max : Math.min(b.max, b.health + (b.max * spend) / this.fullRepairCost(b));
    return spend;
  }

  // Build a barricade behind segment i. Returns the scrap spent (0 if it
  // can't: already built, or not enough scrap).
  buildBarricade(i, scrap) {
    const b = this.segments[i]?.barricade;
    const cost = this.cfg.costs.barricade;
    if (!b || b.built || scrap < cost) return 0;
    b.built = true;
    b.health = b.max;
    return cost;
  }

  reinforceDoor(id, scrap) {
    const door = this.doors[id];
    const cost = this.cfg.costs.reinforceDoor;
    if (!door || door.reinforced || scrap < cost) return 0;
    const max = this.cfg.doors.reinforcedHealth;
    door.health += max - door.max;
    door.max = max;
    door.reinforced = true;
    return cost;
  }

  // Spike trap in front of segment i: build it, or rebuild a worn-out one.
  spikeCost(i) {
    const s = this.segments[i]?.spike;
    if (!s) return 0;
    if (!s.built) return this.cfg.costs.spikeTrap;
    return s.durability < this.cfg.spikes.durability ? this.cfg.costs.spikeRepair : 0;
  }

  buildSpike(i, scrap) {
    const s = this.segments[i]?.spike;
    const cost = this.spikeCost(i);
    if (!s || cost === 0 || scrap < cost) return 0;
    s.built = true;
    s.durability = this.cfg.spikes.durability;
    return cost;
  }

  // A spike trap bit a zombie: it wears down. Worn out = no longer works.
  wearSpike(i) {
    const s = this.segments[i]?.spike;
    if (!s || !s.built || s.durability <= 0) return;
    s.durability -= 1;
  }

  buildFloodlight(i, scrap) {
    const f = this.floods[i];
    const cost = this.cfg.costs.floodlight;
    if (!f || f.built || scrap < cost) return 0;
    f.built = true;
    return cost;
  }

  get floodlightCount() {
    return this.floods.filter((f) => f.built).length;
  }

  // ---- power --------------------------------------------------------------------

  // A battery at the fence box. Returns the charge actually added.
  fitBattery() {
    const p = this.cfg.power;
    const before = this.charge;
    this.charge = Math.min(p.maxCharge, this.charge + p.batteryCharge);
    return this.charge - before;
  }

  get chargeFull() {
    return this.charge >= this.cfg.power.maxCharge;
  }

  drain(amount) {
    this.charge = Math.max(0, this.charge - amount);
  }

  get powered() {
    return this.charge > 0;
  }

  // Charge drained per second of night: the fixed drain plus floodlights.
  nightDrainPerSecond(nightSeconds) {
    const p = this.cfg.power;
    return (p.nightDrain + p.floodlightNightDrain * this.floodlightCount) / nightSeconds;
  }

  // ---- turret ---------------------------------------------------------------------

  get turretMode() {
    return this.cfg.turret.modes[this.turret.mode];
  }

  setTurretMode(mode) {
    if (this.cfg.turret.modes[mode]) this.turret.mode = mode;
  }

  nextTurretMode() {
    const i = TURRET_MODES.indexOf(this.turret.mode);
    this.setTurretMode(TURRET_MODES[(i + 1) % TURRET_MODES.length]);
  }

  // Load `rounds` of ammo that does `damagePerRound`; returns turret rounds gained.
  loadTurret(rounds, damagePerRound) {
    const gained = turretRoundsFor(rounds, damagePerRound, this.cfg.turret.roundDamage);
    this.turret.rounds += gained;
    return gained;
  }

  get turretOnline() {
    return this.turret.installed && this.powered;
  }

  // One shot: uses a round (fractions kept) and a little charge.
  turretFired() {
    this.turret.rounds = Math.max(0, this.turret.rounds - 1);
    this.drain(this.cfg.power.turretShotCost);
  }

  // ---- security -------------------------------------------------------------------

  // { total, parts: [{ id, label, value, max }] } (DESIGN.md "Security rating").
  security(nightSeconds) {
    const v = this.cfg.security;
    const parts = [];
    const add = (id, label, value, max) => parts.push({ id, label, value, max });
    let fence = 0;
    for (const s of this.segments) fence += v.fenceSegment * (s.health / s.max);
    fence += v.gate * (this.gate.health / this.gate.max);
    add('fence', 'Fence and gate', fence, v.fenceSegment * this.segments.length + v.gate);
    let barricades = 0;
    let built = 0;
    for (const s of this.segments) {
      if (!s.barricade.built) continue;
      built++;
      barricades += v.barricade * (s.barricade.health / s.barricade.max);
    }
    if (built > 0) add('barricades', `Barricades (${built})`, barricades, v.barricade * built);
    for (const door of [this.doors.front, this.doors.comms]) {
      const value = door.reinforced ? v.reinforcedDoor : v.door;
      add(door.id, `${capitalise(door.name)}${door.reinforced ? ' (reinforced)' : ''}`, value * (door.health / door.max), value);
    }
    const p = this.cfg.power;
    add('charge', 'Electric fence charge', v.fenceCharge * Math.min(1, this.charge / p.fullSecurityCharge), v.fenceCharge);
    let spikes = 0;
    let spikeCount = 0;
    for (const s of this.segments) {
      if (!s.spike.built) continue;
      spikeCount++;
      spikes += v.spikeTrap * (s.spike.durability / this.cfg.spikes.durability);
    }
    if (spikeCount > 0) add('spikes', `Spike traps (${spikeCount})`, spikes, v.spikeTrap * spikeCount);
    const floods = this.floodlightCount;
    if (floods > 0) add('floodlights', `Floodlights (${floods})`, v.floodlight * floods, v.floodlight * floods);
    if (this.turret.installed) {
      const mode = this.turretMode;
      add('turret', `Turret (${this.turret.mode}${this.powered ? '' : ', no power'})`, turretSecurity(this.turret.rounds, mode, nightSeconds, this.powered), mode.security);
    }
    const total = parts.reduce((sum, part) => sum + part.value, 0);
    return { total, parts };
  }

  // How the turret's ammo stands for a night in its current mode.
  turretCoverage(nightSeconds) {
    const mode = this.turretMode;
    return { coverage: ammoCoverage(this.turret.rounds, mode, nightSeconds), needed: roundsNeeded(mode, nightSeconds) };
  }
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
