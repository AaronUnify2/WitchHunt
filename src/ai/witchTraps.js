// The witch's traps (M7 step 3; DESIGN.md "Traps"). Three kinds:
//  - Snare: a loop of root and rope on the ground. Step in it and you're
//    held fast (Player.rooted): mash A (jump) to tear free (Aaron, M7:
//    about 2 seconds). Looking and shooting still work. Used up once sprung.
//  - Hex totem: a bundle of sticks with a glowing rune, in a faint ring.
//    Standing inside the ring hurts. It stays until it's shot or struck.
//  - Alarm charm: a stake hung with bones across the path. Walk into it
//    and it rattles: zombies nearby come for you, and the witch hears it.
//    It can be shot or struck before you reach it.
// Where they are:
//  - Around the hut approach, laid at the start of the run along the
//    pathways near the hut, denser closer to it, so they act as
//    breadcrumbs (placeHutTraps(), seeded by the map).
//  - Dropped behind her as she flees (Witch, drop()).
// Totems and charms join the weapons' targets (Weapons.extraTargets).
//
// Events: 'trap:sprung' { trap }, 'trap:freed', 'trap:destroyed' { trap }.

import { GraphRoutes } from './witchRoutes.js';

export const TRAP_TYPES = ['snare', 'totem', 'charm'];

// Pick a trap type from a mix ({ snare: 0.5, ... }) with rng.
export function pickTrapType(mix, rng) {
  let total = 0;
  for (const t of TRAP_TYPES) total += mix[t] ?? 0;
  let r = rng.next() * total;
  for (const t of TRAP_TYPES) {
    r -= mix[t] ?? 0;
    if (r < 0) return t;
  }
  return 'snare';
}

// Traps along the pathways near the hut (pure). Points are sampled every
// `sampleEvery` metres along each pathway within `radius` metres (by
// pathway) of the hut, weighted (1 - d / radius) ^ falloff, and picked
// at least `minGap` apart. Each sits a little to one side of the path's
// centre line. Returns [{ type, x, z }].
export function placeHutTraps(map, cfg, rng) {
  const hut = map.hutIndex;
  const routes = new GraphRoutes(map);
  const candidates = [];
  for (const p of routes.paths) {
    const da = routes.dist[hut][p.a];
    const db = routes.dist[hut][p.b];
    for (let along = 0; along <= p.length; along += cfg.sampleEvery) {
      const d = Math.min(da + along, db + (p.length - along));
      if (d > cfg.radius) continue;
      const pt = pointAlong(p, along);
      // Not in the middle of a clearing the trail passes through (only the hut's own).
      const inside = map.clearings.find((c) => Math.hypot(c.x - pt.x, c.z - pt.z) < c.radius * 0.8);
      if (inside && inside !== map.clearings[hut]) continue;
      candidates.push({ x: pt.x, z: pt.z, nx: pt.nx, nz: pt.nz, w: Math.pow(1 - d / cfg.radius, cfg.falloff) });
    }
  }
  const out = [];
  for (let n = 0; n < cfg.count && candidates.length > 0; n++) {
    let total = 0;
    for (const c of candidates) total += c.w;
    if (total <= 0) break;
    let r = rng.next() * total;
    let pick = candidates[candidates.length - 1];
    for (const c of candidates) {
      r -= c.w;
      if (r < 0) {
        pick = c;
        break;
      }
    }
    const side = rng.range(-cfg.sideJitter, cfg.sideJitter);
    out.push({ type: pickTrapType(cfg.mix, rng), x: pick.x + pick.nx * side, z: pick.z + pick.nz * side });
    // Keep the rest apart from it.
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (Math.hypot(candidates[i].x - pick.x, candidates[i].z - pick.z) < cfg.minGap) candidates.splice(i, 1);
    }
  }
  return out;
}

// The point `along` metres down a path, with the unit normal to it.
function pointAlong(p, along) {
  let i = 1;
  while (i < p.along.length - 1 && p.along[i] < along) i++;
  const a = p.points[i - 1];
  const b = p.points[i];
  const span = p.along[i] - p.along[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (along - p.along[i - 1]) / span));
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  return { x: a.x + dx * t, z: a.z + dz * t, nx: -dz / len, nz: dx / len };
}

export class Traps {
  // tc: config.witch.traps.
  constructor(tc, bus) {
    this.cfg = tc;
    this.bus = bus;
    this.list = [];
    this.nextId = 1;
    this.snare = null; // the snare holding the player, or null
    this.mash = 0; // 0..1 toward tearing free
    this.burn = 0; // totem damage owed (applied in whole ticks)
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD
  }

  // Add one: { type, x, z }. y from ground. dropped: by the witch (they're
  // capped; the oldest dropped one goes first).
  add(type, x, z, ground, dropped = false) {
    const tc = this.cfg;
    if (dropped) {
      const mine = this.list.filter((t) => t.dropped && t.active);
      if (mine.length >= tc.maxDropped) mine[0].active = false;
    }
    const shape = tc.shapes[type];
    const trap = {
      id: this.nextId++,
      type,
      x,
      z,
      y: ground ? ground.heightAt(x, z) : 0,
      active: true,
      dropped,
      facing: 0,
      // Hit shape for the weapons (totems and charms only).
      hitRadius: shape?.radius ?? 0.2,
      height: shape?.height ?? 1,
      headBottom: (shape?.height ?? 1) * 0.85,
      headRadius: shape?.radius ?? 0.2,
      headshotMultiplier: 1,
      noAssist: true, // aim assist ignores traps
      targetable: false, // set each frame when near enough
    };
    if (type !== 'snare') {
      trap.takeHit = (amount, part, weapon, at) => this.destroy(trap, at);
    }
    this.list.push(trap);
    this.list = this.list.filter((t) => t.active || t === trap);
    return trap;
  }

  destroy(trap, at) {
    if (!trap.active) return false;
    trap.active = false;
    trap.targetable = false;
    this.bus.emit('trap:destroyed', { trap, at });
    return true;
  }

  // Each step. player: Player. input: for mashing free. combat: hurtPlayer,
  // enemies (alert), alive. onCharm(x, z): the witch hears an alarm charm.
  update(dt, player, input, combat, onCharm) {
    const tc = this.cfg;
    const p = player.position;
    // Held in a snare: mash A to tear free; the effort drains if you stop.
    if (this.snare) {
      if (!combat.alive) this.free(player);
      else {
        if (input.wasPressed('jump')) this.mash += 1 / tc.snare.presses;
        this.mash = Math.max(0, this.mash - tc.snare.decay * dt);
        if (this.mash >= 1) this.free(player);
      }
    }
    let burning = false;
    for (const t of this.list) {
      if (!t.active) continue;
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      t.targetable = t.type !== 'snare' && d <= tc.targetRange;
      if (!combat.alive || player.platform) continue;
      if (t.type === 'snare' && !this.snare && d <= tc.snare.radius && player.onGround) {
        t.active = false;
        this.snare = t;
        this.mash = 0;
        player.rooted = true;
        combat.hurtPlayer(tc.snare.damage, 0.5);
        this.bus.emit('trap:sprung', { trap: t });
      } else if (t.type === 'totem' && d <= tc.totem.zone) {
        burning = true;
      } else if (t.type === 'charm' && d <= tc.charm.trip) {
        t.active = false;
        t.targetable = false;
        combat.enemies.alert(t.x, t.z, tc.charm.alert);
        onCharm?.(t.x, t.z);
        this.bus.emit('trap:sprung', { trap: t });
      }
    }
    // Inside a totem's ring: hurt in ticks.
    if (burning) {
      this.burn += tc.totem.damagePerSecond * dt;
      if (this.burn >= tc.totem.tick) {
        combat.hurtPlayer(this.burn, 0.3);
        this.bus.emit('trap:burned');
        this.burn = 0;
      }
    } else {
      this.burn = 0;
    }
    this.list = this.list.filter((t) => t.active || t === this.snare);
    const pad = input.activeDevice === 'gamepad';
    this.hud.prompt = this.snare ? `Snared! Mash ${pad ? 'A' : 'Space'} to tear free` : '';
    this.hud.progress = this.snare ? this.mash : 0;
  }

  free(player) {
    player.rooted = false;
    this.snare = null;
    this.mash = 0;
    this.bus.emit('trap:freed');
  }

  // For Weapons.extraTargets: every trap (only totems and charms near
  // the player are targetable).
  get group() {
    return this.list;
  }

  get activeCount() {
    let n = 0;
    for (const t of this.list) if (t.active) n++;
    return n;
  }

  clear(player) {
    for (const t of this.list) t.active = false;
    this.list.length = 0;
    if (this.snare && player) this.free(player);
  }
}
