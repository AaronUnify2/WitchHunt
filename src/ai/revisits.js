// Revisits (pure; M6, Aaron's idea): an encounter is fresh the first
// time you find it, but come back to it later at night and a few zombies
// have turned up there, so the world doesn't empty out as you clear it.
//
// A clearing counts as visited once you've stood inside it. At night,
// when you walk back toward a visited clearing (from beyond
// `triggerDistance` + `rearm` metres to within `triggerDistance`), it's
// due: the caller spawns a few zombies there, out of sight. At most once
// per clearing per night, and never by day (Aaron: night only).

export class Revisits {
  // cfg: config.revisits. clearings: map.clearings.
  constructor(cfg, clearings) {
    this.cfg = cfg;
    this.clearings = clearings;
  }

  init() {
    const n = this.clearings.length;
    this.eligible = this.clearings.map((c) => this.cfg.kinds.includes(c.kind));
    this.visited = new Array(n).fill(false);
    this.armed = new Array(n).fill(false); // you've been far enough away since the last spawn
    this.lastNight = new Array(n).fill(-1); // the night it last spawned
    this.due = [];
  }

  // (x, z): the player. night: the night number while it's night, else
  // null. Returns the clearings due a revisit now (reused array).
  update(x, z, night) {
    const c = this.cfg;
    this.due.length = 0;
    for (let i = 0; i < this.clearings.length; i++) {
      if (!this.eligible[i]) continue;
      const cl = this.clearings[i];
      const d = Math.hypot(cl.x - x, cl.z - z);
      if (d <= cl.radius) {
        // You're there: it's visited, and it waits until you've been away.
        this.visited[i] = true;
        this.armed[i] = false;
        continue;
      }
      if (d > c.triggerDistance + c.rearm) {
        this.armed[i] = true;
        continue;
      }
      if (night === null || !this.visited[i] || !this.armed[i] || this.lastNight[i] === night) continue;
      if (d > c.triggerDistance) continue;
      this.armed[i] = false;
      this.lastNight[i] = night;
      this.due.push(cl);
    }
    return this.due;
  }
}
