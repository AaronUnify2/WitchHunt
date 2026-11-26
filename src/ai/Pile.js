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
    // Its eyes (the weak spots once a blast has torn it open): Nov 25, Aaron's artist's rendition: a cluster on its face.
    this.seams = Array.from({ length: cfg.seams.count ?? 3 }, (_, i) => {
      const heart = cfg.seams.heart?.index === i;
      const hr = heart ? cfg.seams.heart.hitRadius : cfg.seams.hitRadius;
      return { i, heart, alive: true, targetable: true, hitRadius: hr, height: hr * 2, headBottom: 99, headRadius: 0, facing: 0, x: 0, y: 0, z: 0, weakSpot: null, takeHit: (amount) => this.hitSeam(amount, heart) };
    });
    this.unsub = [
      this.bus?.on?.('explosion', (e) => this.onExplosion(e)),
      // Nov 25 (Aaron: "a cutscene to show the pile emerging from the ground"): pile.emerge's beats.
      this.bus?.on?.('pile:burst', () => this.introBurst()),
      this.bus?.on?.('pile:heave', () => this.introHeave()),
      this.bus?.on?.('pile:eye', () => this.phase === 'intro' && (this.eyeTease = 0.001)),
    ].filter(Boolean);
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
    return this.phase === 'intro' || this.phase === 'emerge' || this.phase === 'fight';
  }

  get looseAlive() {
    return this.loose.filter((z) => z.alive && z.pileOwner === this).length;
  }

  // ---- starting ---------------------------------------------------------------------------------------------

  // Up out of the rubble at (x, z), facing `facing`. intro (Nov 25): its cutscene drives it (pile.emerge): it waits
  // under the rubble ('intro') for the tendrils to burst out and the heave, and fights when beginFight() says.
  start(x, z, facing = 0, { intro = false } = {}) {
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
    this.release();
    this.attackCool = c.attacks.firstAfter;
    this.contactCool = 0;
    this.ramCool = 0;
    this.flash = 0;
    this.spin = 0;
    this.said = new Set();
    this.loose.length = 0;
    this.flying.length = 0;
    this.tendrils.length = 0;
    this.dustT = 0;
    this.deadT = 0;
    this.riseT = -1;
    this.burst = false;
    this.burstT = 0;
    this.eyeTease = 0;
    // Nov 26 (Aaron: more aggressive): its surges, the leap's cooldown, the tendrils snapping, Tom thrown back, and
    // how fast he's going (for leading the lash).
    this.surge = 0;
    this.surgeCool = this.cfg.surge?.every?.[0] ?? 0;
    this.leapCool = 0;
    this.snapCool = 0;
    this.snap = null;
    this.shove = null;
    this.tomVel = { x: 0, z: 0 };
    this.lastTom = null;
    if (intro) {
      this.phase = 'intro'; // (its cutscene says the lines and makes the noise)
      return;
    }
    this.bus?.emit('pile:emerge', { x, z });
    this.say('emerge');
    // Pass 2: the ground heaves.
    this.sound('mutantRoar');
    this.sound('breach');
    this.player.shake?.(this.cfg.fx.emergeShake);
  }

  // ---- the cutscene (pile.emerge) ----------------------------------------------------------------------------

  // Tendrils burst up out of the rubble.
  introBurst() {
    if (this.phase !== 'intro' || this.burst) return;
    this.burst = true;
    this.burstT = 0;
    this.sound('breach');
    this.puff(this.x, this.z, 24, 'rubble', 7, 0.2);
    this.puff(this.x, this.z, 20, 'dust', 5, 0.2);
  }

  // The heap heaves up through the rock.
  introHeave() {
    if (this.phase !== 'intro' || this.riseT >= 0) return;
    this.riseT = 0;
    this.sound('mutantRoar');
    this.player.shake?.(this.cfg.fx.emergeShake);
  }

  // The cutscene's over (or skipped): up, whole, and fighting.
  beginFight() {
    if (this.phase !== 'intro') return;
    this.phase = 'fight';
    this.t = this.cfg.emergeSeconds;
    this.riseT = this.cfg.emergeSeconds;
    this.eyeTease = 0;
    this.cycleT = 0;
    this.attackCool = this.cfg.attacks.firstAfter;
    this.bus?.emit('pile:fight', {});
  }

  // How far up out of the ground it is, 0..1 (the view's).
  get risen() {
    if (this.phase === 'intro') return this.riseT < 0 ? 0 : Math.min(1, this.riseT / this.cfg.emergeSeconds);
    if (this.phase === 'emerge') return Math.min(1, this.t / this.cfg.emergeSeconds);
    return 1;
  }

  // Gone without a fight (a load, a reset): nothing left of it.
  stop() {
    this.release();
    this.attack = null;
    this.shove = null;
    this.snap = null;
    this.phase = 'buried';
    this.loose.length = 0;
    this.flying.length = 0;
    this.tendrils.length = 0;
    this.targets.length = 0;
    this.view?.update?.(0);
  }

  // Nov 25, pass 2: particles (combat/CombatFx: dust, rubble, its green), a sound, a shake.
  puff(x, z, count, color, speed, up = 0) {
    const fx = this.combat?.fx;
    if (!fx?.emit) return;
    const y = (this.ground?.heightAt?.(x, z) ?? 0) + up;
    fx.emit(x, y, z, count, this.cfg.fx[color], speed);
  }

  sound(name, x = this.x, z = this.z) {
    this.combat?.sfx?.play?.(name, { x, z });
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
    if (this.phase === 'dead') this.deadT += dt;
    if (this.phase === 'intro') {
      if (this.burst) this.burstT += dt;
      if (this.riseT >= 0) {
        this.riseT += dt;
        this.dustT -= dt;
        if (this.dustT <= 0 && this.riseT < this.cfg.emergeSeconds) {
          this.dustT = 0.18;
          const a = this.rng() * Math.PI * 2;
          const d = this.radius * (0.6 + this.rng() * 0.8);
          this.puff(this.x + Math.sin(a) * d, this.z + Math.cos(a) * d, 16, 'dust', 6, 0.2);
          this.puff(this.x + Math.sin(a + 2) * d, this.z + Math.cos(a + 2) * d, 8, 'rubble', 8, 0.2);
        }
      }
      if (this.eyeTease > 0) {
        this.eyeTease += dt;
        if (this.eyeTease > this.cfg.look.eyeTease) this.eyeTease = 0;
      }
    }
    if (this.alive && playing) {
      // Pass 2: rubble and dust thrown up round it as it comes up.
      if (this.phase === 'emerge') {
        this.dustT -= dt;
        if (this.dustT <= 0) {
          this.dustT = 0.18;
          const a = this.rng() * Math.PI * 2;
          const d = this.radius * (0.6 + this.rng() * 0.8);
          this.puff(this.x + Math.sin(a) * d, this.z + Math.cos(a) * d, 16, 'dust', 6, 0.2);
          this.puff(this.x + Math.sin(a + 2) * d, this.z + Math.cos(a + 2) * d, 8, 'rubble', 8, 0.2);
          this.player.shake?.(this.cfg.fx.emergeShake * 0.35);
        }
      }
      if (this.phase === 'emerge' && this.t >= this.cfg.emergeSeconds) {
        this.phase = 'fight';
        this.bus?.emit('pile:fight', {});
      }
      if (this.phase === 'fight') {
        this.trackTom(dt);
        this.updateCycle(dt);
        this.updateAttack(dt);
        this.updateSurge(dt);
        this.updateMove(dt);
        this.updateSnap(dt);
        this.updateShove(dt);
        this.updateTendrils(dt);
        this.updateGrab(dt);
        this.updateRam(dt);
      }
    }
    this.updateFlying(dt);
    this.loose = this.loose.filter((z) => z.active && z.pileOwner === this);
    this.rebuildTargets();
    this.updateBar();
    this.view?.update?.(dt);
  }

  // Nov 25 (Aaron: "use a bar like the witches and alien"): its magic, top centre, and how many bodies are in it.
  updateBar() {
    const hud = this.combat?.hud;
    if (!hud?.boss) return;
    if (this.alive && this.phase !== 'intro') {
      hud.boss(this.magic / this.cfg.magic, { name: `THE PILE  ·  ${this.bodies}`, owner: 'pile' });
      this.barShown = true;
    } else if (this.barShown) {
      hud.boss(null, { owner: 'pile' });
      this.barShown = false;
    }
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
      // Its beeping, faster as the window runs out.
      this.beepT = (this.beepT ?? 0) - dt;
      if (this.beepT <= 0) {
        const k = Math.min(1, this.cycleT / c.charge.window);
        this.beepT = c.charge.beep[0] + (c.charge.beep[1] - c.charge.beep[0]) * k;
        const at = this.chargeSpot();
        this.combat?.sfx?.play?.('helmetPing', { x: at.x, z: at.z });
      }
      if (this.cycleT >= c.charge.window) {
        this.setCycle('scramble'); // it sinks back in: round again
        if (this.charges === 0) this.say('missed');
      }
      return;
    }
    // Scrambling: a charge comes up once it's dragged enough back in, or after a while.
    const due = this.reclaimedSince >= c.charge.afterReclaimed || this.cycleT >= c.charge.every || (this.charges === 0 && this.cycleT >= c.charge.first);
    if (due && !this.attack) {
      this.beepT = 0;
      this.setCycle('charge');
      this.bus?.emit('pile:charge', {});
      this.say('charge');
    }
  }

  setCycle(cycle) {
    this.cycle = cycle;
    this.cycleT = 0;
    if (cycle === 'reel') {
      this.reelAt = { x: this.x, z: this.z };
      this.skit = { t: 0, dart: false, dir: 0 };
    }
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
    if (this.grab) return; // rooted while it reels him in
    if (this.cycle === 'reel') {
      this.updateSkitter(dt, want);
      return;
    }
    if (this.attack?.kind === 'lunge' && this.attack.state === 'strike') speed = this.cfg.attacks.lunge.speed;
    else if (this.cycle !== 'reel' && !this.attack) {
      speed = this.stageCfg.speed;
      if (this.surge > 0) speed = Math.max(this.cfg.surge.speed, speed * this.cfg.surge.scale);
    }
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
    if (d <= this.radius + c.contact.reach && this.contactCool <= 0 && this.cycle !== 'reel' && this.air <= 0.5) {
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
      if (kind === 'lash') this.attack.left = 1 + Math.floor(this.rng() * (c.lash.flurry ?? 1)) % (c.lash.flurry ?? 1);
      if (kind === 'leap') this.sound('mutantRoar');
      this.bus?.emit('pile:attack', { kind });
      if (kind === 'shriek') this.combat?.sfx?.play?.('screamer', { x: this.x, z: this.z });
      return;
    }
    const a = this.attack;
    const k = c[a.kind];
    a.t += dt;
    // The leap: it watches him as it crouches (it comes down where he stood as it left), and flies while it strikes.
    if (a.kind === 'leap' && a.state === 'windup') {
      a.at.x = p.x;
      a.at.z = p.z;
    }
    if (a.kind === 'leap' && a.state === 'strike') this.flyLeap(a);
    if (a.state === 'windup' && a.t >= k.windup) {
      a.state = 'strike';
      a.t = 0;
      this.strike(a, d);
      // A flurry: the next lash coils up straight after (a shorter windup), aimed afresh.
      if (a.kind === 'lash' && --a.left > 0) {
        a.state = 'windup';
        a.t = Math.max(0, k.windup - (k.gap ?? k.windup));
        a.n = (a.n ?? 0) + 1;
        const lead = a.n % 2 ? (k.lead ?? 0) : 0;
        a.at = { x: p.x + this.tomVel.x * lead, z: p.z + this.tomVel.z * lead };
      }
    } else if (a.state === 'strike' && a.t >= (k.strike ?? 0)) {
      a.state = 'recover';
      a.t = 0;
      if (a.kind === 'leap') this.landLeap(a);
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
    const kinds = this.stageCfg.attacks.filter((k) => d <= this.radius + (c[k].range ?? Infinity) && d >= this.radius + (c[k].minRange ?? 0) && !(k === 'grab' && (this.grab || this.player.riding)) && !(k === 'leap' && this.leapCool > 0));
    if (!kinds.length) return null;
    // Nov 26: when he's keeping well off, it leaps at him.
    if (kinds.includes('leap') && d >= this.radius + c.leap.prefer) return 'leap';
    return kinds[Math.floor(this.rng() * kinds.length) % kinds.length];
  }

  strike(a, d) {
    const c = this.cfg.attacks;
    const p = this.player.position;
    if (a.kind === 'slam') {
      this.player.shake?.(c.slam.shake);
      if (d <= this.radius + c.slam.reach) this.hurt(c.slam.damage, 2);
      this.combat?.sfx?.play?.('fenceHit', { x: this.x, z: this.z });
    } else if (a.kind === 'leap') {
      // Up: from here to where he stood as it left (no further than its leash).
      const h = this.home;
      let tx = a.at.x;
      let tz = a.at.z;
      const hd = Math.hypot(tx - h.x, tz - h.z);
      if (hd > this.cfg.leash) {
        tx = h.x + ((tx - h.x) / hd) * this.cfg.leash;
        tz = h.z + ((tz - h.z) / hd) * this.cfg.leash;
      }
      a.from = { x: this.x, z: this.z };
      a.to = { x: tx, z: tz };
      a.at = a.to;
      a.h = 0;
      this.sound('breach');
      this.puff(this.x, this.z, 22, 'dust', 6, 0.2);
      this.puff(this.x, this.z, 12, 'rubble', 7, 0.2);
      this.player.shake?.(0.5);
      this.bus?.emit('pile:leap', { x: tx, z: tz });
    } else if (a.kind === 'lash') {
      // A tendril whips out at him: a hit if he's still where it struck.
      this.lash = { t: 0, to: { x: a.at.x, z: a.at.z } };
      this.sound('ropeSnap', a.at.x, a.at.z);
      if (Math.hypot(p.x - a.at.x, p.z - a.at.z) <= c.lash.dodge) this.hurt(c.lash.damage, 1);
    } else if (a.kind === 'fling') {
      // A body off itself, thrown at him: it lands where he was, and gets up.
      if (this.bodies > 1) {
        this.bodies -= 1;
        this.throwBody(p.x, p.z, c.fling.flight, true);
      }
    } else if (a.kind === 'shriek') {
      this.enemies?.alert?.(this.x, this.z, c.shriek.alert);
    } else if (a.kind === 'grab') {
      // A tendril shot out at him: it takes him if it reaches him (Nov 25, Aaron: "lean into the tendril element").
      this.grab = { state: 'out', head: { x: this.x, z: this.z }, t: 0, travelled: 0 };
    }
  }

  // ---- Nov 26 (Aaron: "a little bit more aggressive") ---------------------------------------------------------

  // How fast Tom's going (smoothed), for leading the lash.
  trackTom(dt) {
    const p = this.player.position;
    if (this.lastTom && dt > 0) {
      const k = Math.min(1, dt * 6);
      this.tomVel.x += ((p.x - this.lastTom.x) / dt - this.tomVel.x) * k;
      this.tomVel.z += ((p.z - this.lastTom.z) / dt - this.tomVel.z) * k;
    }
    this.lastTom = { x: p.x, z: p.z };
    this.leapCool = Math.max(0, this.leapCool - dt);
  }

  // Its surges: a scuttle at him every few seconds, faster than he walks (not mid-attack, reeling or holding him).
  updateSurge(dt) {
    const S = this.cfg.surge;
    if (!S) return;
    const busy = this.attack || this.cycle === 'reel' || this.grab;
    if (this.surge > 0) {
      this.surge = busy ? 0 : Math.max(0, this.surge - dt);
      return;
    }
    this.surgeCool -= dt;
    if (this.surgeCool > 0 || busy) return;
    const p = this.player.position;
    if (Math.hypot(p.x - this.x, p.z - this.z) < this.radius + S.minGap) return;
    this.surge = S.seconds;
    this.surgeCool = S.every[0] + this.rng() * (S.every[1] - S.every[0]);
    this.sound('mutantGroan');
    this.bus?.emit('pile:surge', {});
  }

  // Its idle tendrils snapping at him when he's in close (not while it's attacking, reeling or holding him).
  updateSnap(dt) {
    const S = this.cfg.snap;
    if (this.snap) {
      this.snap.t += dt;
      if (this.snap.t > 0.25) this.snap = null;
    }
    if (!S) return;
    this.snapCool = Math.max(0, this.snapCool - dt);
    if (this.snapCool > 0 || this.attack || this.cycle === 'reel' || this.grab) return;
    const p = this.player.position;
    if (Math.hypot(p.x - this.x, p.z - this.z) > this.radius + S.reach) return;
    this.snapCool = S.every;
    this.snap = { t: 0, to: { x: p.x, z: p.z }, side: this.rng() < 0.5 ? -1 : 1 };
    this.sound('ropeSnap', p.x, p.z);
    this.hurt(S.damage, 0.6);
  }

  // Nov 26 (Aaron: "skittery, like an injured spider on the explosion"): reeling, it jerks about in short darts,
  // mostly sideways to him (sometimes back), resting between, kept near where the blast caught it.
  updateSkitter(dt, toTom) {
    const S = this.cfg.skitter;
    const k = this.skit ??= { t: 0, dart: false, dir: 0 };
    if (!S) return;
    k.t -= dt;
    if (k.t <= 0) {
      k.dart = !k.dart;
      const span = k.dart ? S.dart : S.rest;
      k.t = span[0] + this.rng() * (span[1] - span[0]);
      if (k.dart) {
        const side = this.rng() < 0.5 ? -1 : 1;
        k.dir = this.rng() < 0.25 ? toTom + Math.PI + (this.rng() - 0.5) * 0.8 : toTom + side * (Math.PI / 2 + (this.rng() - 0.5) * 0.9);
        // Too far from where it was hit: back toward it.
        const at = this.reelAt ?? { x: this.x, z: this.z };
        if (Math.hypot(this.x - at.x, this.z - at.z) > S.range * 0.6) k.dir = Math.atan2(at.x - this.x, at.z - this.z) + (this.rng() - 0.5) * 0.8;
        this.sound('bodyThud');
      }
    }
    if (!k.dart) return;
    let nx = this.x + Math.sin(k.dir) * S.speed * dt;
    let nz = this.z + Math.cos(k.dir) * S.speed * dt;
    const at = this.reelAt ?? { x: this.x, z: this.z };
    const d = Math.hypot(nx - at.x, nz - at.z);
    if (d > S.range) {
      nx = at.x + ((nx - at.x) / d) * S.range;
      nz = at.z + ((nz - at.z) / d) * S.range;
    }
    const pos = { x: nx, z: nz };
    this.ground?.clamp?.(pos);
    this.x = pos.x;
    this.z = pos.z;
  }

  // How high off the ground it is in its leap (metres; 0 on its feet).
  get air() {
    const a = this.attack;
    return a?.kind === 'leap' && a.state === 'strike' ? a.h ?? 0 : 0;
  }

  // In the air: along from where it left to where it'll come down, up and over.
  flyLeap(a) {
    const k = this.cfg.attacks.leap;
    const s = Math.min(1, a.t / k.strike);
    this.x = a.from.x + (a.to.x - a.from.x) * s;
    this.z = a.from.z + (a.to.z - a.from.z) * s;
    a.h = 4 * k.height * s * (1 - s);
  }

  // Down: the ground shakes, under it he's hurt, near it he's thrown off it, and bodies are shaken loose.
  landLeap(a) {
    const k = this.cfg.attacks.leap;
    this.x = a.to.x;
    this.z = a.to.z;
    a.h = 0;
    this.leapCool = k.cool;
    const p = this.player.position;
    const dx = p.x - this.x;
    const dz = p.z - this.z;
    const d = Math.hypot(dx, dz);
    this.player.shake?.(k.shake);
    this.sound('breach');
    this.sound('fenceHit');
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const r = this.radius * 1.1;
      this.puff(this.x + Math.sin(ang) * r, this.z + Math.cos(ang) * r, 14, 'dust', 7, 0.2);
      this.puff(this.x + Math.sin(ang) * r, this.z + Math.cos(ang) * r, 8, 'rubble', 9, 0.2);
    }
    if (d <= this.radius + k.reach) this.hurt(k.damage, 2.2);
    if (d <= this.radius + k.knock && !this.player.riding) {
      const ux = d > 0.01 ? dx / d : Math.sin(this.facing);
      const uz = d > 0.01 ? dz / d : Math.cos(this.facing);
      this.shove = { vx: (ux * k.distance) / k.seconds, vz: (uz * k.distance) / k.seconds, t: k.seconds };
    }
    this.bus?.emit('pile:landed', { x: this.x, z: this.z });
    if (k.shed && this.bodies > k.shed + 1) this.shed(k.shed);
  }

  // Tom thrown back off it (the leap's landing), over a moment rather than all at once.
  updateShove(dt) {
    const s = this.shove;
    if (!s) return;
    const step = Math.min(dt, s.t);
    const p = this.player.position;
    p.x += s.vx * step;
    p.z += s.vz * step;
    this.ground?.clamp?.(p);
    s.t -= step;
    if (s.t <= 0) this.shove = null;
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
  hitSeam(amount, heart = false) {
    if (this.phase !== 'fight' || this.cycle !== 'reel') return false;
    this.flash = 0.12;
    this.hurtMagic(amount * this.cfg.seams.magicPerDamage * (heart ? this.cfg.seams.heart?.magicScale ?? 1 : 1));
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
    this.release();
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
    // Pass 2: they scream as they go, and its green bleeds out where they tore off.
    this.sound(n >= 3 ? 'camperScream' : 'groan');
    this.puff(this.x, this.z, Math.min(30, 6 + n * 3), 'magic', 5, this.radius);
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
    this.sound('bodyThud', f.tx, f.tz);
    this.puff(f.tx, f.tz, 8, 'dust', 3, 0.05);
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

  // ---- the grab (Nov 25) ---------------------------------------------------------------------------------------

  // out: the tendril flying at him; hold: wrapped round him, reeling him in (he can't walk; shoot it through to
  // get free); reached: in against the mass, a heavy hit, and he's thrown back out. Dodged: it whips back.
  updateGrab(dt) {
    const g = this.grab;
    if (!g) return;
    const c = this.cfg.attacks.grab;
    const p = this.player.position;
    g.t += dt;
    if (g.state === 'out') {
      const dx = p.x - g.head.x;
      const dz = p.z - g.head.z;
      const d = Math.hypot(dx, dz) || 1;
      const step = c.speed * dt;
      if (d <= c.catch + step && !this.player.riding) {
        g.state = 'hold';
        g.t = 0;
        this.player.rooted = true;
        this.say('grab');
        this.sound('ropeSnap', p.x, p.z);
        this.player.shake?.(0.6);
      } else {
        // It flies on along the line it was thrown (a sidestep dodges it).
        g.dir ??= { x: dx / d, z: dz / d };
        g.head.x += g.dir.x * step;
        g.head.z += g.dir.z * step;
        g.travelled += step;
        if (g.travelled > c.range + this.radius + 2) this.release();
      }
      return;
    }
    // Holding: he's dragged in.
    const dx = this.x - p.x;
    const dz = this.z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    g.head.x = p.x;
    g.head.z = p.z;
    if (d <= this.radius + 0.7 || g.t >= c.holdMax) {
      // Into it: torn at, and flung back out.
      this.hurt(c.damage, 2);
      p.x -= (dx / d) * c.throwBack;
      p.z -= (dz / d) * c.throwBack;
      this.ground?.clamp?.(p);
      this.release();
      return;
    }
    const step = c.drag * dt;
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
  }

  // Let go of him (shot through, a blast, its death).
  release() {
    if (this.grab?.state === 'hold' && this.player) this.player.rooted = false;
    this.grab = null;
  }

  // The grab's tendril shot through.
  cutGrab() {
    if (!this.grab) return false;
    this.bus?.emit('pile:cut', { grab: true });
    this.sound('ropeSnap');
    this.release();
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
    this.shove = null;
    this.snap = null;
    this.surge = 0;
    this.release();
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
    // Pass 2: the magic goes out of it all at once: a burst of green, a shake.
    this.deathRadius = this.cfg.minRadius + (this.cfg.radius - this.cfg.minRadius) * 0.5;
    this.deadT = 0;
    this.sound('cleanse');
    this.sound('mutantRoar');
    // (Nov 25, Aaron: "dark and suggestive"): it bursts: dark blood, and her green going up like a mist.
    this.puff(this.x, this.z, 45, 'blood', 7, 1.0);
    this.puff(this.x, this.z, 30, 'magic', 3, 1.6);
    this.player.shake?.(this.cfg.fx.deathShake);
  }

  // ---- what can be hit ---------------------------------------------------------------------------------------

  // The charge surfaces on the side facing Tom.
  // The charge surfaces off to one side of its face (Nov 25: clear of the eyes), facing Tom.
  chargeSpot() {
    const p = this.player.position;
    const a = Math.atan2(p.x - this.x, p.z - this.z) + 0.95 + Math.sin(this.t * 0.7) * 0.25;
    const r = this.coreRadius + 0.15;
    return { x: this.x + Math.sin(a) * r, z: this.z + Math.cos(a) * r, a };
  }

  // The meat at its middle (Nov 25): the hit shape is this, not the bodies' outer edge, so its face can be seen and
  // shot; the bodies cling round it.
  get coreRadius() {
    return this.radius * (this.cfg.look.coreScale ?? 0.8);
  }

  // How high its legs hold it off the ground (Nov 25, Aaron's concept art: four great legs carrying the mass), less
  // as it shrinks, none while it's still coming up.
  get raise() {
    const L = this.cfg.legs;
    if (!L) return 0;
    return L.raise * (0.45 + 0.55 * (this.radius / this.cfg.radius)) * this.risen;
  }

  // Where each eye sits on its face (Nov 25, the artist's rendition: a cluster, front and centre, toward Tom):
  // fills `out` with { x, y, z } (y above the ground there), from config.pile.seams.cluster [angle radians, height].
  eyeSpots(out = []) {
    const p = this.player.position;
    const face = Math.atan2(p.x - this.x, p.z - this.z);
    const R = this.coreRadius + 0.04;
    const g = this.ground?.heightAt?.(this.x, this.z) ?? 0;
    const cl = this.cfg.seams.cluster;
    for (let i = 0; i < this.seams.length; i++) {
      const [da, h] = cl[i % cl.length];
      const a = face + da;
      // On its round: further round is further back, and higher up is further in (its meat's squashed sphere).
      const up = Math.max(-0.95, Math.min(0.95, (h - 0.85) / 0.68));
      const k = Math.cos(da * 0.6) * Math.sqrt(1 - up * up);
      out[i] ??= { x: 0, y: 0, z: 0 };
      out[i].x = this.x + Math.sin(a) * R * k;
      out[i].z = this.z + Math.cos(a) * R * k;
      out[i].y = g + this.air + this.raise + this.radius * h;
    }
    return out;
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
    m.y = g + this.air + this.raise * 0.6; // (its legs hold it up: under it, shots go between them)
    m.hitRadius = this.coreRadius;
    m.height = r * 1.9;
    m.fullHeight = m.height;
    T.push(m);
    if (this.cycle === 'charge') {
      const s = this.chargeSpot();
      const ch = this.charge;
      ch.x = s.x;
      ch.z = s.z;
      ch.y = g + this.air + this.raise + r * 0.7;
      T.push(ch);
    }
    if (this.cycle === 'reel') {
      const p = this.player.position;
      const face = Math.atan2(p.x - this.x, p.z - this.z);
      const spots = this.eyeSpots(this.eyeAt ??= []);
      this.seams.forEach((s, i) => {
        s.x = spots[i].x;
        s.z = spots[i].z;
        s.y = spots[i].y - s.hitRadius; // (a target's y is its foot: the eye's middle is its radius up)
        T.push(s);
      });
    }
    // The grab's tendril: points along it (a little thicker: he has to hit it to get free).
    if (this.grab) {
      const gt = this.grab;
      gt.targets ??= Array.from({ length: 5 }, () => ({ alive: true, targetable: true, noAssist: true, hitRadius: this.cfg.attacks.grab.hitRadius, height: 0.6, headBottom: 99, headRadius: 0, facing: 0, x: 0, y: 0, z: 0, takeHit: () => this.cutGrab() }));
      gt.targets.forEach((pt, k) => {
        const f = (k + 1) / 6;
        pt.x = this.x + (gt.head.x - this.x) * f;
        pt.z = this.z + (gt.head.z - this.z) * f;
        pt.y = (this.ground?.heightAt?.(pt.x, pt.z) ?? g) + 0.4 + Math.sin(f * Math.PI) * r * 0.4;
        T.push(pt);
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
    this.release();
    this.view?.dispose?.();
  }

  debugLine() {
    if (this.phase === 'buried') return 'pile buried';
    return `pile ${this.phase} ${this.stage} bodies ${this.bodies} magic ${Math.round(this.magic)} ${this.cycle} loose ${this.looseAlive} tendrils ${this.tendrils.length} flying ${this.flying.length}`;
  }
}
