// The moonshiners' holler's traps (Session 29; DESIGN.md "Moonshiners'
// holler": readable traps; disarm them, or use them on the dead). Four kinds,
// laid by the family up the hollow's floor (config.holler.traps; the set's
// looks: render/hollerModel.js):
//  - shotgun: fishing line shin high across the floor, tied to the trigger
//    of a shotgun bolted to a stump at the side. Whatever walks through the
//    line (Tom on his feet, or one of the dead) fires it down the line:
//    everything in its cone takes the charge. Jumped, the line's safe.
//  - cans: tin cans hung on a wire across the floor. Walked through, they
//    rattle, and every one of the dead for a long way hears it (the family
//    at the still among them: 'holler:alarm').
//  - bear: a bear trap under leaves piled too neatly. It shuts on whatever
//    steps on it: Tom is held (hold X to prise it open), one of the dead is
//    held where it stands (it chews at itself, going nowhere).
//  - snare: a sapling bent over and pegged above a noose. It whips up and
//    takes whoever steps in by the ankle: Tom, held until he works it off
//    (hold X); one of the dead, held there.
// Disarm them with X: the lines need the wire cutters (found at the
// lookout: config.holler.encounter); the bear trap is sprung with a stick
// and the snare's peg pulled by hand. A trap that's gone off or been
// disarmed is gone for good (a story flag each: trapFlag()).
//
// The beat (encounters/Holler.js) owns this, merges its X options into its
// own, and hears its events: 'holler:trap' { trap, by: 'tom' | 'dead' },
// 'holler:alarm' { x, z }, 'holler:disarmed' { trap }, 'holler:freed'.

// ---- the pure parts (tested) ------------------------------------------------------------------

// The story flag that remembers a trap's gone (sprung or disarmed).
export function trapFlag(id) {
  return `hollerTrap${id[0].toUpperCase()}${id.slice(1)}`;
}

// Do segments a-b and c-d cross (2D, x/z)? Touching at an end counts.
export function segmentsCross(ax, az, bx, bz, cx, cz, dx, dz) {
  const d1 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
  const d2 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  const d3 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const d4 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return d1 === 0 && d2 === 0 ? false : (d1 === 0 || d2 === 0) && (d3 === 0 || d4 === 0 || (d3 > 0) !== (d4 > 0));
}

// Is (x, z) in the gun's charge? gun: { x, z, dirX, dirZ }. Returns the distance, or -1.
export function inCone(gun, x, z, range, halfAngleDeg) {
  const dx = x - gun.x;
  const dz = z - gun.z;
  const d = Math.hypot(dx, dz);
  if (d > range || d < 0.01) return d < 0.01 ? 0 : -1;
  const cos = (dx * gun.dirX + dz * gun.dirZ) / d;
  return cos >= Math.cos((halfAngleDeg * Math.PI) / 180) ? d : -1;
}

// The nearest point of segment a-b to (x, z), and how far.
export function nearestOnSegment(a, b, x, z) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  const px = a.x + dx * t;
  const pz = a.z + dz * t;
  return { x: px, z: pz, d: Math.hypot(x - px, z - pz) };
}

// Does a step from (x0, z0) to (x1, z1) set the trap off? rules: config.holler.trapRules.
// airborne: the walker's off the ground (Tom jumping: lines don't catch him).
export function steppedIn(trap, rules, x0, z0, x1, z1, airborne = false) {
  if (trap.state !== 'armed') return false;
  if (trap.kind === 'shotgun' || trap.kind === 'cans') {
    if (airborne) return false;
    return segmentsCross(x0, z0, x1, z1, trap.a.x, trap.a.z, trap.b.x, trap.b.z);
  }
  const r = trap.kind === 'bear' ? rules.bear.radius : rules.snare.radius;
  return Math.hypot(x1 - trap.x, z1 - trap.z) <= r;
}

export class HollerTraps {
  // cfg: config.holler (trapRules inside). bus: the event bus.
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.rules = cfg.trapRules;
    this.bus = bus;
    this.list = [];
    this.held = null; // the trap holding Tom, if one is
    this.last = null; // Tom's position last frame
    this.seen = new Set(); // the kinds he's been told about (once each)
    this.deadLast = new Map(); // the dead's positions last frame
  }

  // ctx: { site (HollerSite), player, combat, enemies, progress, sfx, notify(text), texts (data/holler.json's traps) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  // Every trap as the flags say (armed, or gone), Tom let go.
  reset() {
    if (this.held) this.letGo();
    this.last = null;
    this.deadLast.clear();
    this.list = (this.site?.traps ?? []).map((t) => ({ ...t, state: t.sprung || this.has(trapFlag(t.id)) ? 'sprung' : 'armed' }));
    for (const t of this.list) this.site.setTrap(t.i, t.state === 'armed' ? 'armed' : 'sprung');
  }

  get armed() {
    return this.list.filter((t) => t.state === 'armed');
  }

  // ---- each frame -----------------------------------------------------------------------------

  // playing: the game's running (not in a cutscene or a menu): only then can Tom set one off.
  update(dt, playing) {
    if (!this.list.length) return;
    const p = this.player.position;
    if (this.held && !this.combat.alive) this.letGo();
    if (playing && this.combat.alive && !this.player.platform) {
      const airborne = !this.player.onGround;
      if (this.last && !this.held) {
        for (const t of this.list) {
          // Session 32 (Aaron: caught on the quad with no way out): riding, it's the machine that sets it off.
          if (steppedIn(t, this.rules, this.last.x, this.last.z, p.x, p.z, airborne)) this.spring(t, this.player.riding ? 'ride' : 'tom', null);
        }
      }
      this.hints(p);
    }
    this.last = { x: p.x, z: p.z };
    this.updateDead();
  }

  // The dead walking the floor: any that walk into an armed trap set it off.
  updateDead() {
    const c = this.site.place;
    const reach = c.radius + 6;
    const seen = new Set();
    for (const z of this.enemies?.living ?? []) {
      if (Math.abs(z.x - c.x) > reach || Math.abs(z.z - c.z) > reach) continue;
      seen.add(z);
      const was = this.deadLast.get(z);
      this.deadLast.set(z, { x: z.x, z: z.z });
      if (z.hollerHeld && !(z.slowTimer > 0)) z.hollerHeld = null; // let go (or a slot used again)
      if (!was || z.state === 'rise' || z.hollerHeld) continue;
      for (const t of this.list) {
        if (steppedIn(t, this.rules, was.x, was.z, z.x, z.z, false)) {
          this.spring(t, 'dead', z);
          break;
        }
      }
    }
    for (const z of this.deadLast.keys()) if (!seen.has(z)) this.deadLast.delete(z);
  }

  // The first time Tom comes near each kind, a line on what he's looking at.
  hints(p) {
    for (const t of this.list) {
      if (t.state !== 'armed' || this.seen.has(t.kind)) continue;
      const at = t.a ? nearestOnSegment(t.a, t.b, p.x, p.z) : { d: Math.hypot(p.x - t.x, p.z - t.z) };
      if (at.d < this.rules.hintDistance) {
        this.seen.add(t.kind);
        const txt = this.texts?.[t.kind]?.hint;
        if (txt) this.notify?.(txt);
      }
    }
  }

  // ---- going off ----------------------------------------------------------------------------

  // by: 'tom' or 'dead' (zombie: the one that did it).
  spring(t, by, zombie) {
    t.state = 'sprung';
    this.progress?.setFlag(trapFlag(t.id));
    this.site.setTrap(t.i, 'sprung');
    const R = this.rules;
    if (t.kind === 'shotgun') this.fire(t);
    else if (t.kind === 'cans') {
      this.sfx?.play('cansRattle', t);
      this.enemies?.alert(t.x, t.z, R.cans.alert);
      this.bus.emit('holler:alarm', { x: t.x, z: t.z });
    } else if (t.kind === 'bear' || t.kind === 'snare') {
      const r = R[t.kind];
      this.sfx?.play(t.kind === 'bear' ? 'bearSnap' : 'snareWhip', t);
      if (by === 'tom') {
        this.held = t;
        this.player.rooted = true;
        this.combat.hurtPlayer(r.damage, r.shake);
        const txt = this.texts?.[t.kind]?.caught;
        if (txt) this.notify?.(txt);
      } else if (by === 'ride') {
        // Under a wheel: it goes off and holds nothing.
        const txt = this.texts?.[t.kind]?.wheel;
        if (txt) this.notify?.(txt);
      } else if (zombie) {
        this.enemies.damage(zombie, r.deadDamage, 'body', { stagger: 0.8, knockback: 0 }, { x: zombie.x, y: zombie.y + 0.4, z: zombie.z }, t);
        if (zombie.alive) this.holdDead(zombie, r.holdSeconds, t);
      }
    }
    this.bus.emit('holler:trap', { trap: t, by });
  }

  // One of the dead held where the trap took it (it can still claw at what's in reach).
  holdDead(z, seconds, t) {
    z.slowTimer = seconds;
    z.slow = 0;
    z.hollerHeld = t.id;
    z.x = t.x;
    z.z = t.z;
  }

  // The stump gun goes off down its line: everything in the cone takes the charge.
  fire(t) {
    const g = t.gun;
    const R = this.rules.shotgun;
    this.sfx?.play('trapGun', g);
    this.enemies?.alert(g.x, g.z, R.alert);
    for (const z of [...(this.enemies?.living ?? [])]) {
      const d = inCone(g, z.x, z.z, R.range, R.halfAngle);
      if (d < 0) continue;
      const falloff = 1 - Math.min(1, d / R.range) * R.falloff;
      this.enemies.damage(z, R.damage * falloff, 'body', { stagger: 0.6, knockback: R.knockback }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, g);
    }
    const p = this.player.position;
    const d = inCone(g, p.x, p.z, R.range, R.halfAngle);
    if (d >= 0) {
      this.combat.hurtPlayer(R.tomDamage * (1 - Math.min(1, d / R.range) * R.falloff), 2);
      const txt = this.texts?.shotgun?.hit;
      if (txt) this.notify?.(txt);
    }
  }

  // ---- hold X ---------------------------------------------------------------------------------

  // The X options near Tom: [{ dd, key, prompt, busy, seconds, act }] (act null: only to read).
  // cutters: he has the wire cutters. While a trap holds him, freeing himself is the only one.
  options(X, cutters) {
    const p = this.player.position;
    const T = this.texts ?? {};
    const R = this.rules;
    const H = R.holds;
    if (this.held) {
      const t = this.held;
      const def = T[t.kind]?.free ?? { prompt: 'work free', busy: 'Working free...' };
      return [{ dd: 0, key: `free:${t.id}`, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds: H.free[t.kind], act: () => this.letGo(true) }];
    }
    const out = [];
    for (const t of this.list) {
      if (t.state !== 'armed') continue;
      const at = t.a ? nearestOnSegment(t.a, t.b, p.x, p.z) : { d: Math.hypot(p.x - t.x, p.z - t.z) };
      if (at.d > R.reach) continue;
      const def = T[t.kind] ?? {};
      if ((t.kind === 'shotgun' || t.kind === 'cans') && !cutters) {
        out.push({ dd: at.d, key: `read:${t.id}`, prompt: def.noCutters ?? '', act: null });
        continue;
      }
      out.push({ dd: at.d, key: `disarm:${t.id}`, prompt: `Hold ${X}: ${def.disarm?.prompt ?? 'disarm it'}`, busy: def.disarm?.busy, seconds: H.disarm[t.kind], act: () => this.disarm(t) });
    }
    return out;
  }

  disarm(t) {
    if (t.state !== 'armed') return;
    t.state = 'disarmed';
    this.progress?.setFlag(trapFlag(t.id));
    this.site.setTrap(t.i, 'sprung');
    this.sfx?.play(t.kind === 'shotgun' || t.kind === 'cans' ? 'wireSnip' : t.kind === 'bear' ? 'bearSnap' : 'trapPeg', t);
    const def = this.texts?.[t.kind]?.disarm;
    if (t.kind === 'shotgun') {
      const n = this.rules.shotgun.shells;
      if (!this.combat.weapons?.addAmmo?.('shotgun', n)) {
        const inv = this.combat.inventory;
        if (inv?.ammo) inv.ammo.shotgun = (inv.ammo.shotgun ?? 0) + n;
      }
    }
    if (def?.text) this.notify?.(def.text);
    this.bus.emit('holler:disarmed', { trap: t });
  }

  // Out of the trap that's holding him (worked free, or dead and gone).
  letGo(worked = false) {
    if (!this.held) return;
    const t = this.held;
    this.held = null;
    this.player.rooted = false;
    if (worked) this.sfx?.play(t.kind === 'bear' ? 'trapPeg' : 'snareBreak', t);
    this.bus.emit('holler:freed', { trap: t });
  }

  // ---- debug ----------------------------------------------------------------------------------

  overlayLine() {
    const armed = this.armed.length;
    return `traps ${armed}/${this.list.length} armed${this.held ? ` HELD (${this.held.id})` : ''}`;
  }
}
