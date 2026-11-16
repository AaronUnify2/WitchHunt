// The Screamer (DESIGN.md "Zombies": a new kind for the nights at the station; Round 2, Aaron: "Let's
// send a screamer. I vote we make it really strong too"). A tall, wasted thing that keeps back at the
// treeline behind the others and screams, and the dead come up out of the ground round it at each
// scream and walk on the station. Until it's put down they keep coming.
//
//  - Strong: config.screamer.health (about 800: a mutant is 240-300), a head that takes the usual bonus.
//  - It stands where it's put ('linger'), deaf and unseeing, and screams `first` seconds in and every
//    `every` seconds after: `calls` of the dead rise within a few metres of it and march on the station
//    (not past `maxAlive` of the living near home).
//  - The skill answer: every hit it takes puts its next scream back `hitDelay` seconds (to `maxDelay`),
//    so steady fire on it keeps it quiet while it's worn down. A rifle from the tower reaches it.
//  - Come close (within `wakeAt`) and it comes for Tom like any of them. After `maxCalls` screams, or
//    `comeInAfter` seconds, it stops screaming and walks on the fence itself.
//
// One controller for every Screamer about (Night 2's, the mega night's). Its zombie is the pool's
// (variant 'screamer': config.zombies.variants.screamer; its look config.zombies.texture.looks.screamer).
//
//  - Nov 16 (Aaron: "When the screamer is screaming the player should be blasted backwards by a powerful
//    wind"): while it screams, Tom within config.screamer.wind.range (and in the open: not in a room, not
//    up the tower) is shoved away from it, hardest up close: walking into it is a crawl. Dust streams past.
//  - Nov 16 ("a snake like, open mouthed, jaw unhinged strike attack, it's okay to stretch the model"): come
//    in on him, within strike.reach it rears (strike.rear s, its neck drawing up, the jaw dropping: the tell),
//    then lunges up to strike.travel m in a blink, neck out long and jaw unhinged (its sprite stretched), and
//    hangs there strike.recover s after: the window for its head.
//
// Events: 'screamer:spawned' { zombie }, 'screamer:screamed' { zombie, called }, 'screamer:down' { zombie },
// 'screamer:strike' { zombie }.

export class Screamers {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.screamer;
    this.bus = bus;
    this.list = [];
  }

  // ctx: { enemies, world, station, player, sfx, shake(amount) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.unsubscribers = [
      this.bus.on('enemy:hit', ({ zombie }) => {
        const s = this.list.find((x) => x.z === zombie);
        if (s && !s.comingIn) s.t = Math.min(this.sc.maxDelay, Math.max(s.t, 0) + this.sc.hitDelay);
      }),
      this.bus.on('enemy:killed', ({ zombie }) => {
        const i = this.list.findIndex((x) => x.z === zombie);
        if (i < 0) return;
        this.list.splice(i, 1);
        this.bus.emit('screamer:down', { zombie });
      }),
    ];
  }

  // One at (x, z), facing (faceX, faceZ). Returns its entry { z, t, calls, age, comingIn } or null.
  spawn(x, z, { faceX = x, faceZ = z + 1, authored = 'screamer' } = {}) {
    const zb = this.enemies.spawnZombie(x, z, { variant: 'screamer', mode: 'linger', linger: { x, z, r: this.sc.linger }, facing: Math.atan2(faceX - x, faceZ - z), authored, speedRange: this.sc.speedRange });
    if (!zb) return null;
    zb.sightScale = 0;
    zb.deaf = true;
    const entry = { z: zb, t: this.sc.first, calls: 0, age: 0, comingIn: false, wind: 0, strike: null, strikeCool: 0, dustT: 0 };
    this.list.push(entry);
    this.bus.emit('screamer:spawned', { zombie: zb });
    return entry;
  }

  get alive() {
    return this.list.length;
  }

  update(dt, playing) {
    if (!playing || !this.list.length) return;
    const c = this.sc;
    const p = this.player.position;
    for (const s of this.list) {
      const z = s.z;
      if (!z.alive) continue;
      s.age += dt;
      if (z.screamT > 0) z.screamT -= dt; // the scream's pose (Zombie.frame)
      const near = Math.hypot(p.x - z.x, p.z - z.z);
      if (z.screamT > 0) this.blow(s, dt, near);
      s.strikeCool = Math.max(0, (s.strikeCool ?? 0) - dt);
      if (s.strike) {
        this.updateStrike(s, dt);
        continue;
      }
      if (s.comingIn && c.strike && z.state === 'walk' && z.mode === 'chase' && near <= c.strike.reach && near > 0.6 && s.strikeCool <= 0) {
        this.startStrike(s);
        continue;
      }
      // Tom's on top of it, or it's screamed itself out: it comes in.
      if (!s.comingIn && (near < c.wakeAt || s.calls >= c.maxCalls || s.age > c.comeInAfter)) this.comeIn(s, near < c.wakeAt);
      if (s.comingIn) continue;
      s.t -= dt;
      if (s.t > 0) continue;
      s.t = c.every;
      this.scream(s);
    }
  }

  scream(s) {
    const c = this.sc;
    const z = s.z;
    s.calls++;
    z.screamT = c.poseSeconds ?? 2.4;
    this.sfx?.play('screamerCall', z);
    const p = this.player.position;
    const d = Math.hypot(p.x - z.x, p.z - z.z);
    if (d < c.shakeWithin) this.shake?.(c.shake * (1 - d / c.shakeWithin));
    // Who answers: up out of the ground round it, then on the station together.
    const L = this.station.layout;
    const nearHome = this.enemies.living.filter((q) => q.alive && Math.hypot(q.x - L.centre.x, q.z - L.centre.z) < c.countWithin).length;
    const n = Math.max(0, Math.min(c.calls, c.maxAlive - nearHome));
    const out = [];
    for (let i = 0; i < n; i++) {
      this.enemies.spawnPlanned({ type: 'single', count: 1 }, z.x, z.z, { ringMin: c.ring[0], ringMax: c.ring[1], mix: this.world.variantMixAt(z.x, z.z), mode: 'march', rise: true, out });
    }
    if (out.length) this.enemies.formMarch(out, { leader: null, radius: this.cfg.zombies.horde.radius });
    this.bus.emit('screamer:screamed', { zombie: z, called: out.length });
  }

  // The scream's wind: Tom shoved away from it (Player.push, a little each frame: it builds against his walk).
  blow(s, dt, near) {
    const w = this.sc.wind;
    const P = this.player;
    if (!w || near > w.range || near < 0.1 || P.space || P.platform || P.riding) return;
    const z = s.z;
    const k = Math.pow(1 - near / w.range, w.falloff ?? 0.7);
    const ux = (P.position.x - z.x) / near;
    const uz = (P.position.z - z.z) / near;
    P.push(ux * w.strength * k * dt, uz * w.strength * k * dt);
    P.shake(w.shake * k);
    s.dustT -= dt;
    if (s.dustT <= 0 && this.fx?.emitDir) {
      s.dustT = w.dustEvery;
      // Dust and leaves streaming past him, from it.
      const y = P.position.y + 1.2;
      this.fx.emitDir(P.position.x - ux * 4, y, P.position.z - uz * 4, w.dust, this.dustColour ?? (this.dustColour = { r: 0.42, g: 0.38, b: 0.3 }), w.dustSpeed, ux, uz, 0.35);
    }
  }

  startStrike(s) {
    const z = s.z;
    const st = this.sc.strike;
    const p = this.player.position;
    z.state = 'move';
    z.move = { kind: 'snake', phase: 'rear', t: 0, scripted: true };
    z.facing = Math.atan2(p.x - z.x, p.z - z.z);
    s.strike = { phase: 'rear', t: 0, aimX: p.x, aimZ: p.z, fromX: z.x, fromZ: z.z, hit: false };
    z.stretch = st.rearStretch;
    this.sfx?.play('screamerHiss', z);
    this.bus.emit('screamer:strike', { zombie: z });
  }

  updateStrike(s, dt) {
    const z = s.z;
    const st = this.sc.strike;
    const k = s.strike;
    const p = this.player.position;
    k.t += dt;
    if (k.phase === 'rear') {
      // Reared back, swaying, its head tracking him (the tell).
      k.aimX = p.x;
      k.aimZ = p.z;
      z.facing = Math.atan2(p.x - z.x, p.z - z.z);
      if (k.t >= st.rear) {
        const d = Math.hypot(k.aimX - z.x, k.aimZ - z.z) || 1;
        const go = Math.max(0, Math.min(st.travel, d - st.stopShort));
        k.fromX = z.x;
        k.fromZ = z.z;
        k.toX = z.x + ((k.aimX - z.x) / d) * go;
        k.toZ = z.z + ((k.aimZ - z.z) / d) * go;
        k.phase = 'lunge';
        k.t = 0;
        z.move.phase = 'lunge';
        z.stretch = st.stretch;
        z.stretchW = 0.92;
        this.sfx?.play('swipe', z);
      }
      return;
    }
    if (k.phase === 'lunge') {
      const u = Math.min(1, k.t / st.lunge);
      z.x = k.fromX + (k.toX - k.fromX) * u;
      z.z = k.fromZ + (k.toZ - k.fromZ) * u;
      if (!k.hit && Math.hypot(p.x - z.x, p.z - z.z) <= st.hitRange) {
        k.hit = true;
        const d = Math.hypot(p.x - z.x, p.z - z.z) || 1;
        this.enemies.onStrike?.(z, null, { damage: st.damage, push: { x: ((p.x - z.x) / d) * st.push, z: ((p.z - z.z) / d) * st.push }, hop: st.hop, shake: 2.2, kind: 'snake' });
      }
      if (u >= 1) {
        k.phase = 'recover';
        k.t = 0;
      }
      return;
    }
    // Hanging there, neck out, slowly drawing back: shoot it in the head.
    z.stretch = 1 + (st.stretch - 1) * Math.max(0, 1 - k.t / st.recover);
    z.stretchW = 1;
    if (k.t >= st.recover) this.endStrike(s);
  }

  endStrike(s) {
    const z = s.z;
    s.strike = null;
    s.strikeCool = this.sc.strike.cooldown;
    z.stretch = 1;
    z.stretchW = 1;
    if (z.alive) {
      z.move = null;
      z.state = 'walk';
    }
  }

  comeIn(s, atTom) {
    s.comingIn = true;
    const z = s.z;
    z.sightScale = 1;
    z.deaf = false;
    const p = this.player.position;
    if (atTom) this.enemies.brain.chase(z, p.x, p.z, 30);
    else {
      this.enemies.brain.reset(z, 'march');
      this.enemies.formMarch([z], { leader: null, radius: 1 });
    }
  }

  clear() {
    this.list.length = 0;
  }

  overlayLine() {
    return this.list.length ? `screamers ${this.list.map((s) => `${Math.round(s.z.health)}hp/${s.calls}`).join(' ')}` : '';
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
  }
}
