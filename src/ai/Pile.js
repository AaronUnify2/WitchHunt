// The Pile (Nov 25; Aaron: "a big swirling mass of zombified people ... a single entity made up of however many
// zombies there are at that particular point in time ... at the beginning it's big, slow moving, and then as you do
// damage to it and the zombies split off, it starts to speed up ... it also tries to pick the zombies that have been
// split off back up ... shoots out tendrils ... dragging them back into the pile ... held together by the green
// witch's magic ... some explosive charges from the tunnel still wrapped up in it. So you shoot it, bang, zombies
// scattered everywhere ... after a cycle of attacks plus picking up zombies, it then presents an explosive charge
// again"). Day 3's fight at the Laurel Gap tunnel (encounters/Tunnel.js), the bodies of the people the army buried
// when it brought the tunnel down. Config: config.pile.
//
// Two numbers (agreed with Aaron):
//   bodies - its size: down as bodies are knocked off (gunfire, the charges, dynamite, the quad), up as its tendrils
//            drag the fallen back in. Sets its radius, speed and attacks (stages: large, medium, small).
//   magic  - its real health. Only ever down: a charge going off inside it, and shots to the glowing seams torn open
//            after each blast. At zero it falls apart, and the bodies still in it stand up as one last group.
//
// Phases: buried -> emerge (heaving up out of the rubble) -> fight -> dead.
// In the fight, the charge cycle: scramble (attacks; tendrils for the fallen) -> charge (one surfaces on the side
// facing Tom, blinking: shoot it) -> reel (staggered, seams open) -> scramble ... A charge not shot in time sinks back
// in and comes round again.
//
// The fallen are ordinary zombies (EnemyManager). A tendril reaches one, takes it (its slot freed) and drags its body
// back; shot through on the way, it drops the body, which gets up again where it fell. One killed before it's taken
// is gone for good. At most maxLoose of its fallen up at once: past that, a body knocked off lands dead.
//
// Pure of three.js: the drawing is the view's (render/PileRenderer.js, given by makeView), so it runs headless in
// tests with makeView null.
//
// Events: 'pile:emerge', 'pile:fight', 'pile:charge', 'pile:blast', 'pile:shed' { n }, 'pile:reclaimed',
// 'pile:cut', 'pile:attack' { kind }, 'pile:dead'.

export const STAGES = ['large', 'medium', 'small'];

export class Pile {
  // ctx: { ground, colliders?, player, combat (enemies, weapons.extraTargets, hurtPlayer, sfx), explosives?, quad?,
  // dialogue?, rng? () => 0..1, makeView? (pile) => view }.
  constructor(cfg, bus, ctx = {}) {
    this.cfg = cfg;
    this.bus = bus;
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.enemies = ctx.combat?.enemies ?? null;
    this.phase = 'buried';
    this.loose = []; // the fallen, up as zombies: EnemyManager slots
    this.flying = []; // bodies in the air: { x, y, z, vx, vy, vz, t, dead, atTom }
    this.tendrils = []; // { head: { x, z }, zombie, body, state: 'out' | 'drag', t, targets }
    this.targets = []; // what the weapons can hit now (rebuilt each frame)
    this.group = { group: this.targets };
    this.combat?.weapons?.extraTargets?.push(this.group);
    this.view = ctx.makeView?.(this) ?? null;
    this.mass = {
      alive: true,
      targetable: true,
      hitRadius: 1,
      height: 2,
      headBottom: 99,
      headRadius: 0,
      facing: 0,
      x: 0,
      y: 0,
      z: 0,
      takeHit: (amount, part, weapon, at, from) => this.hitMass(amount, from),
    };
    this.charge = { alive: true, targetable: true, hitRadius: cfg.charge.hitRadius, height: 0.7, headBottom: 99, headRadius: 0, facing: 0, x: 0, y: 0, z: 0, takeHit: () => this.blast() };
    this.seams = [0, 1, 2].map((i) => ({ i, alive: true, targetable: true, hitRadius: cfg.seams.hitRadius, height: 0.6, headBottom: 99, headRadius: 0, facing: 0, x: 0, y: 0, z: 0, weakSpot: null, takeHit: (amount) => this.hitSeam(amount) }));
    this.unsub = [this.bus?.on?.('explosion', (e) => this.onExplosion(e))].filter(Boolean);
  }

  // ---- the pure parts --------------------------------------------------------------------------------------

  get stage() {
    const s = this.cfg.stages;
    if (this.bodies >= s.medium.below) return 'large';
    if (this.bodies >= s.small.below) return 'medium';
    return 'small';
  }

  get stageCfg() {
    return this.cfg.stages[this.stage];
  }

  // Its radius from its size: the full radius at the full count, down to minRadius.
  get radius() {
    const c = this.cfg;
    const k = Math.sqrt(Math.max(0, this.bodies) / c.bodies);
    return c.minRadius + (c.radius - c.minRadius) * k;
  }

  get alive() {
    return this.phase === 'emerge' || this.phase === 'fight';
  }

  get looseAlive() {
    return this.loose.filter((z) => z.alive && z.pileOwner === this).length;
  }

  // ---- starting ---------------------------------------------------------------------------------------------

  // Up out of the rubble at (x, z), facing `facing`.
  start(x, z, facing = 0) {
    const c = this.cfg;
    this.x = x;
    this.z = z;
    this.home = { x, z };
    this.facing = facing;
    this.bodies = c.bodies;
    this.magic = c.magic;
    this.phase = 'emerge';
    this.t = 0;
    this.cycle = 'scramble';
    this.cycleT = 0;
    this.reclaimedSince = 0;
    this.charges = 0;
    this.chipped = 0;
    this.attack = null;
    this.attackCool = c.attacks.firstAfter;
    this.contactCool = 0;
    this.ramCool = 0;
    this.flash = 0;
    this.spin = 0;
    this.said = new Set();
    this.loose.length = 0;
    this.flying.length = 0;
    this.tendrils.length = 0;
    this.bus?.emit('pile:emerge', { x, z });
    this.say('emerge');
  }

  // Gone without a fight (a load, a reset): nothing left of it.
  stop() {
    this.phase = 'buried';
    this.loose.length = 0;
    this.flying.length = 0;
    this.tendrils.length = 0;
    this.targets.length = 0;
    this.view?.update?.(0);
  }

  say(key) {
    const id = this.cfg.lines?.[key];
    if (!id || this.said?.has(key)) return;
    this.said.add(key);
    this.dialogue?.play(id);
  }

  // ---- each frame -------------------------------------------------------------------------------------------

  update(dt, playing = true) {
    if (this.phase === 'buried') return;
    this.t += dt;
    this.flash = Math.max(0, this.flash - dt);
    this.spin += dt * this.cfg.look.spin * (1 + (1 - this.bodies / this.cfg.bodies) * 1.5);
    if (this.alive && playing) {
      if (this.phase === 'emerge' && this.t >= this.cfg.emergeSeconds) {
        this.phase = 'fight';
        this.bus?.emit('pile:fight', {});
      }
      if (this.phase === 'fight') {
        this.updateCycle(dt);
        this.updateAttack(dt);
        this.updateMove(dt);
        this.updateTendrils(dt);
        this.updateRam(dt);
      }
    }
    this.updateFlying(dt);
    this.loose = this.loose.filter((z) => z.active && z.pileOwner === this);
    this.rebuildTargets();
    this.view?.update?.(dt);
  }

  // The charge cycle.
  updateCycle(dt) {
    const c = this.cfg;
    this.cycleT += dt;
    if (this.cycle === 'reel') {
      if (this.cycleT >= c.seams.seconds) this.setCycle('scramble');
      return;
    }
    if (this.cycle === 'charge') {
      if (this.cycleT >= c.charge.window) this.setCycle('scramble'); // it sinks back in: round again
      return;
    }
    // Scrambling: a charge comes up once it's dragged enough back in, or after a while.
    const due = this.reclaimedSince >= c.charge.afterReclaimed || this.cycleT >= c.charge.every || (this.charges === 0 && this.cycleT >= c.charge.first);
    if (due && !this.attack) {
      this.setCycle('charge');
      this.bus?.emit('pile:charge', {});
      this.say('charge');
    }
  }

  setCycle(cycle) {
    this.cycle = cycle;
    this.cycleT = 0;
    if (cycle === 'scramble') this.reclaimedSince = 0;
  }

  // Toward Tom at its stage's pace (not while it's reeling, slamming or winding up), stopping at his side; a lunge
  // is its own movement. Kept within leash metres of where it came up.
  updateMove(dt) {
    const p = this.player.position;
    const dx = p.x - this.x;
    const dz = p.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);
    this.facing = want;
    let speed = 0;
    if (this.attack?.kind === 'lunge' && this.attack.state === 'strike') speed = this.cfg.attacks.lunge.speed;
    else if (this.cycle !== 'reel' && !this.attack) speed = this.stageCfg.speed;
    if (speed <= 0) return;
    const stopAt = this.radius + 0.6;
    const step = Math.min(speed * dt, Math.max(0, d - stopAt));
    if (step <= 0 && this.attack?.kind !== 'lunge') return;
    let nx = this.x + (dx / d) * (this.attack?.kind === 'lunge' ? speed * dt : step);
    let nz = this.z + (dz / d) * (this.attack?.kind === 'lunge' ? speed * dt : step);
    const h = this.home;
    const hd = Math.hypot(nx - h.x, nz - h.z);
    if (hd > this.cfg.leash) {
      nx = h.x + ((nx - h.x) / hd) * this.cfg.leash;
      nz = h.z + ((nz - h.z) / hd) * this.cfg.leash;
    }
    const pos = { x: nx, z: nz };
    this.ground?.clamp?.(pos);
    this.x = pos.x;
    this.z = pos.z;
  }

  // Its attacks: one at a time (windup, strike, recover), the stage's own; and its touch.
  updateAttack(dt) {
    const c = this.cfg.attacks;
    const p = this.player.position;
    const d = Math.hypot(p.x - this.x, p.z - this.z);
    this.contactCool = Math.max(0, this.contactCool - dt);
    // Rolling into him (any stage): its touch.
    if (d <= this.radius + c.contact.reach && this.contactCool <= 0 && this.cycle !== 'reel') {
      this.contactCool = c.contact.every;
      this.hurt(c.contact.damage, 1);
    }
    if (this.cycle === 'reel') {
      this.attack = null;
      return;
    }
    if (!this.attack) {
      this.attackCool -= dt;
      if (this.attackCool > 0) return;
      const kind = this.pickAttack(d);
      if (!kind) return;
      this.attack = { kind, state: 'windup', t: 0, at: { x: p.x, z: p.z } };
      this.bus?.emit('pile:attack', { kind });
      if (kind === 'shriek') this.combat?.sfx?.play?.('screamer', { x: this.x, z: this.z });
      return;
    }
    const a = this.attack;
    const k = c[a.kind];
    a.t += dt;
    if (a.state === 'windup' && a.t >= k.windup) {
      a.state = 'strike';
      a.t = 0;
      this.strike(a, d);
    } else if (a.state === 'strike' && a.t >= (k.strike ?? 0)) {
      a.state = 'recover';
      a.t = 0;
    } else if (a.state === 'recover' && a.t >= k.recover) {
      this.attack = null;
      this.attackCool = this.stageCfg.attackEvery;
    }
    // The lunge: its touch hits as it goes.
    if (a.kind === 'lunge' && a.state === 'strike' && d <= this.radius + c.lunge.reach && !a.hit) {
      a.hit = true;
      this.hurt(c.lunge.damage, 1.4);
    }
  }

  // Which of its stage's attacks (null: none in range).
  pickAttack(d) {
    const c = this.cfg.attacks;
    const kinds = this.stageCfg.attacks.filter((k) => d <= this.radius + (c[k].range ?? Infinity));
    if (!kinds.length) return null;
    return kinds[Math.floor(this.rng() * kinds.length) % kinds.length];
  }

  strike(a, d) {
    const c = this.cfg.attacks;
    const p = this.player.position;
    if (a.kind === 'slam') {
      this.player.shake?.(c.slam.shake);
      if (d <= this.radius + c.slam.reach) this.hurt(c.slam.damage, 2);
      this.combat?.sfx?.play?.('fenceHit', { x: this.x, z: this.z });
    } else if (a.kind === 'lash') {
      // A tendril whips out at him: a hit if he's still where it struck.
      this.lash = { t: 0, to: { x: a.at.x, z: a.at.z } };
      if (Math.hypot(p.x - a.at.x, p.z - a.at.z) <= c.lash.dodge) this.hurt(c.lash.damage, 1);
    } else if (a.kind === 'fling') {
      // A body off itself, thrown at him: it lands where he was, and gets up.
      if (this.bodies > 1) {
        this.bodies -= 1;
        this.throwBody(p.x, p.z, c.fling.flight, true);
      }
    } else if (a.kind === 'shriek') {
      this.enemies?.alert?.(this.x, this.z, c.shriek.alert);
    }
  }

  hurt(damage, shake) {
    this.combat?.hurtPlayer?.(damage, shake);
  }

  // ---- hits ---------------------------------------------------------------------------------------------------

  // A shot into the mass: every perBody of damage knocks one off (none while it's coming up).
  hitMass(amount, from) {
    if (this.phase !== 'fight') return false;
    this.flash = 0.12;
    this.chipped += amount;
    const per = this.cfg.shots.perBody;
    let n = 0;
    while (this.chipped >= per && this.bodies > 0) {
      this.chipped -= per;
      n++;
    }
    if (n) this.shed(n, from);
    return false;
  }

  // A seam (after a blast): the magic itself.
  hitSeam(amount) {
    if (this.phase !== 'fight' || this.cycle !== 'reel') return false;
    this.flash = 0.12;
    this.hurtMagic(amount * this.cfg.seams.magicPerDamage);
    return false;
  }

  // The charge, shot: it goes off inside it.
  blast() {
    if (this.phase !== 'fight' || this.cycle !== 'charge') return false;
    const c = this.cfg.charge;
    const at = this.chargeSpot();
    this.charges++;
    this.explosives?.blast?.(at.x, this.ground?.heightAt?.(at.x, at.z) ?? 0, at.z, { ...this.explosives.ec, ...c.blast }, 'pile');
    this.bus?.emit('pile:blast', { x: at.x, z: at.z });
    this.setCycle('reel');
    this.shed(Math.max(1, Math.round(this.bodies * c.shedShare)), at);
    this.hurtMagic(c.magic);
    if (this.alive) this.say('blast');
    return true;
  }

  // Dynamite (or anything else that goes off) near it, not its own charge: bodies off, and a little magic.
  onExplosion(e) {
    if (this.phase !== 'fight' || e?.source === 'pile') return;
    if (Math.hypot(e.x - this.x, e.z - this.z) > this.radius + (e.radius ?? 0)) return;
    const c = this.cfg.dynamite;
    this.shed(c.shed, e);
    this.hurtMagic(c.magic);
  }

  hurtMagic(amount) {
    if (!this.alive) return;
    this.magic = Math.max(0, this.magic - amount);
    if (this.magic <= 0) this.die();
  }

  // n bodies thrown off it, outward (away from `from` if given, else all round).
  shed(n, from = null) {
    n = Math.min(n, this.bodies);
    if (n <= 0) return;
    this.bodies -= n;
    const c = this.cfg.shed;
    const away = from ? Math.atan2(this.x - from.x, this.z - from.z) : null;
    for (let i = 0; i < n; i++) {
      const a = away !== null ? away + (this.rng() - 0.5) * c.spread : this.rng() * Math.PI * 2;
      const dist = c.distance[0] + this.rng() * (c.distance[1] - c.distance[0]);
      this.throwBody(this.x + Math.sin(a) * dist, this.z + Math.cos(a) * dist, c.flight, false);
    }
    this.bus?.emit('pile:shed', { n });
    if (this.bodies <= 0 && this.alive) this.die();
  }

  // A body in the air from its top to (tx, tz), landing in `flight` seconds.
  throwBody(tx, tz, flight, atTom) {
    const r = this.radius;
    const y0 = (this.ground?.heightAt?.(this.x, this.z) ?? 0) + r * 1.2;
    const y1 = this.ground?.heightAt?.(tx, tz) ?? 0;
    const g = this.cfg.shed.gravity;
    this.flying.push({ x: this.x, y: y0, z: this.z, vx: (tx - this.x) / flight, vz: (tz - this.z) / flight, vy: (y1 - y0 + 0.5 * g * flight * flight) / flight, t: 0, flight, tx, tz, atTom, seed: this.rng() });
  }

  updateFlying(dt) {
    const g = this.cfg.shed.gravity;
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i];
      f.t += dt;
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      f.y += f.vy * dt;
      f.vy -= g * dt;
      if (f.t < f.flight) continue;
      this.flying.splice(i, 1);
      this.land(f);
    }
  }

  // A body down: it gets up as one of the dead, unless there are already maxLoose of them up (it lands dead).
  land(f) {
    const p = this.player.position;
    if (f.atTom && Math.hypot(p.x - f.tx, p.z - f.tz) <= this.cfg.attacks.fling.reach) this.hurt(this.cfg.attacks.fling.damage, 1.2);
    if (this.looseAlive >= this.cfg.maxLoose) return;
    const z = this.enemies?.spawnZombie?.(f.tx, f.tz, { variant: f.seed < 0.25 ? 'army' : 'citizen', rise: true, authored: 'pile' });
    if (!z) return;
    z.pileOwner = this;
    this.enemies.brain?.chase?.(z, p.x, p.z, 30);
    this.loose.push(z);
  }

  // ---- the tendrils ------------------------------------------------------------------------------------------

  updateTendrils(dt) {
    const c = this.cfg.tendrils;
    // Reaching for the nearest of the fallen it isn't already after (not while reeling).
    if (this.cycle !== 'reel' && this.tendrils.length < c.max) {
      const taken = new Set(this.tendrils.map((t) => t.zombie));
      let best = null;
      let bestD = c.range;
      for (const z of this.loose) {
        if (!z.alive || taken.has(z) || z.state === 'rise') continue;
        const d = Math.hypot(z.x - this.x, z.z - this.z);
        if (d < bestD) {
          bestD = d;
          best = z;
        }
      }
      if (best) {
        this.tendrils.push({ head: { x: this.x, z: this.z }, zombie: best, body: null, state: 'out', t: 0 });
        this.say('tendril');
      }
    }
    for (let i = this.tendrils.length - 1; i >= 0; i--) {
      const t = this.tendrils[i];
      t.t += dt;
      if (t.state === 'out') {
        const z = t.zombie;
        if (!z.alive || z.pileOwner !== this) {
          this.tendrils.splice(i, 1); // killed first: gone for good
          continue;
        }
        const dx = z.x - t.head.x;
        const dz = z.z - t.head.z;
        const d = Math.hypot(dx, dz);
        const step = c.reach * dt;
        if (d <= step + 0.3) {
          // Got it: off the ground and into the drag (its slot's freed; the body's the view's now).
          t.state = 'drag';
          t.body = { x: z.x, z: z.z, seed: z.lookSeed ?? 0, variant: z.variant };
          z.state = 'free';
          z.pileOwner = null;
          t.head.x = z.x;
          t.head.z = z.z;
        } else {
          t.head.x += (dx / d) * step;
          t.head.z += (dz / d) * step;
        }
      } else {
        const dx = this.x - t.head.x;
        const dz = this.z - t.head.z;
        const d = Math.hypot(dx, dz);
        const step = c.drag * dt;
        if (d <= this.radius + step) {
          this.tendrils.splice(i, 1);
          this.bodies = Math.min(this.cfg.bodies, this.bodies + 1);
          this.reclaimedSince++;
          this.bus?.emit('pile:reclaimed', {});
        } else {
          t.head.x += (dx / d) * step;
          t.head.z += (dz / d) * step;
          t.body.x = t.head.x;
          t.body.z = t.head.z;
        }
      }
    }
  }

  // A tendril shot through: dragging, it drops the body, which gets up where it fell.
  cut(t) {
    const i = this.tendrils.indexOf(t);
    if (i < 0) return false;
    this.tendrils.splice(i, 1);
    this.bus?.emit('pile:cut', {});
    if (t.state === 'drag' && t.body) {
      const z = this.enemies?.spawnZombie?.(t.body.x, t.body.z, { variant: t.body.variant ?? 'citizen', rise: true, authored: 'pile' });
      if (z) {
        z.pileOwner = this;
        this.loose.push(z);
      }
    }
    return false;
  }

  // ---- the quad ----------------------------------------------------------------------------------------------

  // Ridden into it fast: bodies off, and it throws the quad (and Tom) back hard.
  updateRam(dt) {
    this.ramCool = Math.max(0, this.ramCool - dt);
    const q = this.quad;
    if (!q?.riding || this.ramCool > 0) return;
    const r = this.cfg.ram;
    if (Math.abs(q.speed ?? 0) < r.minSpeed) return;
    if (Math.hypot(q.x - this.x, q.z - this.z) > this.radius + r.reach) return;
    this.ramCool = r.every;
    this.shed(q.spiked ? r.shedSpiked : r.shed, { x: q.x, z: q.z });
    q.speed *= r.keep;
    this.hurt(r.damage, 1.6);
  }

  // ---- the end -----------------------------------------------------------------------------------------------

  die() {
    if (!this.alive) return;
    this.phase = 'dead';
    this.attack = null;
    // The bodies still in it come down and stand up: one last group.
    const n = Math.min(this.bodies, this.cfg.lastGroup);
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + this.rng();
      const dist = 1 + this.rng() * this.radius * 1.5;
      this.throwBody(this.x + Math.sin(a) * dist, this.z + Math.cos(a) * dist, 0.5, false);
    }
    this.bodies = 0;
    // Its tendrils let go: what they were dragging drops.
    for (const t of [...this.tendrils]) this.cut(t);
    this.tendrils.length = 0;
    this.bus?.emit('pile:dead', { x: this.x, z: this.z });
    this.say('dead');
  }

  // ---- what can be hit ---------------------------------------------------------------------------------------

  // The charge surfaces on the side facing Tom.
  chargeSpot() {
    const p = this.player.position;
    const a = Math.atan2(p.x - this.x, p.z - this.z) + Math.sin(this.t * 0.7) * 0.5;
    const r = this.radius + 0.1;
    return { x: this.x + Math.sin(a) * r, z: this.z + Math.cos(a) * r, a };
  }

  rebuildTargets() {
    const T = this.targets;
    T.length = 0;
    if (this.phase !== 'fight') return;
    const r = this.radius;
    const g = this.ground?.heightAt?.(this.x, this.z) ?? 0;
    const m = this.mass;
    m.x = this.x;
    m.z = this.z;
    m.y = g;
    m.hitRadius = r;
    m.height = r * 1.9;
    m.fullHeight = m.height;
    T.push(m);
    if (this.cycle === 'charge') {
      const s = this.chargeSpot();
      const ch = this.charge;
      ch.x = s.x;
      ch.z = s.z;
      ch.y = g + r * 0.7;
      T.push(ch);
    }
    if (this.cycle === 'reel') {
      const p = this.player.position;
      const face = Math.atan2(p.x - this.x, p.z - this.z);
      this.seams.forEach((s, i) => {
        const a = face + (i - 1) * 0.6;
        s.x = this.x + Math.sin(a) * (r + 0.05);
        s.z = this.z + Math.cos(a) * (r + 0.05);
        s.y = g + r * (0.5 + 0.35 * (i % 2));
        T.push(s);
      });
    }
    // Each tendril: a few points along it (thin, no aim assist).
    const pts = this.cfg.tendrils.points;
    for (const t of this.tendrils) {
      t.targets ??= Array.from({ length: pts }, () => ({ alive: true, targetable: true, noAssist: true, hitRadius: this.cfg.tendrils.hitRadius, height: 0.5, headBottom: 99, headRadius: 0, facing: 0, x: 0, y: 0, z: 0, takeHit: () => this.cut(t) }));
      for (let k = 0; k < pts; k++) {
        const f = (k + 1) / (pts + 1);
        const pt = t.targets[k];
        pt.x = this.x + (t.head.x - this.x) * f;
        pt.z = this.z + (t.head.z - this.z) * f;
        pt.y = (this.ground?.heightAt?.(pt.x, pt.z) ?? g) + 0.25 + Math.sin(f * Math.PI) * r * 0.5;
        T.push(pt);
      }
    }
  }

  dispose() {
    for (const off of this.unsub) off?.();
    const xs = this.combat?.weapons?.extraTargets;
    const i = xs ? xs.indexOf(this.group) : -1;
    if (i >= 0) xs.splice(i, 1);
    this.view?.dispose?.();
  }

  debugLine() {
    if (this.phase === 'buried') return 'pile buried';
    return `pile ${this.phase} ${this.stage} bodies ${this.bodies} magic ${Math.round(this.magic)} ${this.cycle} loose ${this.looseAlive} tendrils ${this.tendrils.length} flying ${this.flying.length}`;
  }
}
