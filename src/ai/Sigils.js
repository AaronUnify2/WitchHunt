// The buried sigils (pure logic): where they are, the five-sigil cap and
// each one's raising timer (DESIGN.md "Sigils"). Nothing here draws or
// spawns: ZombieDirector asks update() which sigils are due to raise
// zombies this frame and does the spawning.
//
// A sigil: { id, x, z, y, groundId (the sigil ground clearing's id, or
// -1), clearingId (the nearest clearing, for the variant mix), variants,
// timer, raised (zombies raised so far) }.

export class Sigils {
  constructor(sigilConfig, rng) {
    this.cfg = sigilConfig;
    this.rng = rng;
  }

  init() {
    this.list = [];
    this.nextId = 1;
  }

  update() {}

  dispose() {
    this.list.length = 0;
  }

  get count() {
    return this.list.length;
  }

  get full() {
    return this.list.length >= this.cfg.cap;
  }

  // Is a sigil ground (clearing id) free to plant on?
  groundFree(groundId) {
    return !this.list.some((s) => s.groundId === groundId);
  }

  // Plant one. spot: { x, z, y, groundId, clearingId, variants }. Returns
  // the sigil, or null at the cap.
  plant(spot) {
    if (this.full) return null;
    const sigil = {
      id: this.nextId++,
      x: spot.x,
      z: spot.z,
      y: spot.y ?? 0,
      groundId: spot.groundId ?? -1,
      clearingId: spot.clearingId ?? -1,
      variants: spot.variants ?? null,
      timer: this.firstDelay(),
      raised: 0,
    };
    this.list.push(sigil);
    return sigil;
  }

  remove(sigil) {
    const i = this.list.indexOf(sigil);
    if (i < 0) return false;
    this.list.splice(i, 1);
    return true;
  }

  clear() {
    this.list.length = 0;
  }

  // The nearest sigil to (x, z) within `range`, or null.
  nearest(x, z, range = Infinity) {
    let best = null;
    let bestD = range;
    for (const s of this.list) {
      const d = Math.hypot(s.x - x, s.z - z);
      if (d <= bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  firstDelay() {
    const [a, b] = this.cfg.firstSpawnDelay;
    return this.rng.range(a, b);
  }

  interval(sigil) {
    const [a, b] = this.cfg.spawnInterval;
    const scale = sigil.groundId >= 0 ? this.cfg.groundSpawnMultiplier : 1;
    return this.rng.range(a, b) * scale;
  }

  // Nightfall: every sigil starts raising after a short, staggered delay.
  startNight() {
    for (const s of this.list) s.timer = this.firstDelay();
  }

  // Tick the timers while sigils are raising. owned(sigil) -> how many of
  // its zombies are still alive. Fills `out` with the sigils due to raise
  // now (each then waits a fresh interval) and returns it. A sigil at its
  // own cap waits, and tries again as soon as it drops below.
  update(dt, raising, owned, out = []) {
    out.length = 0;
    if (!raising) return out;
    for (const s of this.list) {
      s.timer -= dt;
      if (s.timer > 0) continue;
      if (owned(s) >= this.cfg.perSigilCap) {
        s.timer = 0;
        continue;
      }
      s.timer = this.interval(s);
      out.push(s);
    }
    return out;
  }

  // Raise from every sigil on the next update (debug).
  raiseAllNow() {
    for (const s of this.list) s.timer = 0;
  }
}
