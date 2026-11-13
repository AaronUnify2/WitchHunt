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
// Events: 'screamer:spawned' { zombie }, 'screamer:screamed' { zombie, called }, 'screamer:down' { zombie }.

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
    const entry = { z: zb, t: this.sc.first, calls: 0, age: 0, comingIn: false };
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
      const near = Math.hypot(p.x - z.x, p.z - z.z);
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
