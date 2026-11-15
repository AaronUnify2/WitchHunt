// Round 2 (Aaron: "when the player walks deep into the trees and they're not on a vehicle, moths
// will attack them... just enough to be like, the deep forest is dangerous"). On foot, deep in the
// trees (no pathway, clearing or cut ground within `radius` metres), a moth or two finds Tom every
// `every` seconds, a few at most; back near a path they lose interest. Uses the giant moths
// (ai/Moths.js) in the open air, and stands aside whenever an encounter is using them (a habitat
// set, a roost, or a swarm it didn't send). config.deepForest.
// Nov 15 (Aaron: "if you go off the path for a little bit, it'll spawn a beetle if you're off the path too
// long"): a giant beetle too (ai/Beetles.js, its own set), out of the ground behind him, after `beetle.first`
// seconds deep, then every `beetle.every`, `beetle.max` alive at most. Ones left far behind are cleared.

// Is (x, z) deep in the trees? Nothing open within `radius`: the spot itself and two rings round it (pure).
export function deepInForest(ground, x, z, radius, open = 0.08) {
  if (ground.openAt(x, z) > open) return false;
  for (const r of [radius * 0.5, radius]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + (r === radius ? 0.39 : 0);
      if (ground.openAt(x + Math.sin(a) * r, z + Math.cos(a) * r) > open) return false;
    }
  }
  return true;
}

export class DeepForest {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.dc = cfg.deepForest;
    this.bus = bus;
  }

  // ctx: { moths, player, ground, clock, interiors, cutscenes, rng, blocked(), beetles (ai/Beetles.js, or none) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
  }

  reset() {
    this.deep = false;
    this.check = 0;
    this.timer = 0; // seconds deep since the last ones came
    this.out = 0; // seconds out of the deep with ours still about
    this.ours = false; // the moths about are the forest's own
    this.beetleTimer = 0; // Nov 15: seconds deep since the last beetle
    this.beetleSent = false;
    this.beetles?.clear();
  }

  // Nov 15: a beetle out of the ground behind Tom, now and then, while he's deep in the trees.
  updateBeetles(dt, deep) {
    const bc = this.dc.beetle;
    const bs = this.beetles;
    if (!bc || !bs) return;
    const p = this.player.position;
    // Clear the dead and the ones left far behind.
    for (let i = bs.list.length - 1; i >= 0; i--) {
      const b = bs.list[i];
      const far = Math.hypot(b.x - p.x, b.z - p.z) > bc.loseDistance;
      if (far || (!b.alive && (b.deadFor = (b.deadFor ?? 0) + dt) > bc.corpseSeconds)) bs.list.splice(i, 1);
    }
    if (!deep) {
      this.beetleTimer = Math.max(0, this.beetleTimer - dt * 2);
      return;
    }
    this.beetleTimer += dt;
    if (this.beetleTimer < (this.beetleSent ? bc.every : bc.first)) return;
    this.beetleTimer = 0; // (at the most already: the next one waits a full spell after one's gone)
    if (bs.living.length >= bc.max) return;
    // Behind him (where he isn't looking), a little to one side, on ground that's still deep forest.
    const yaw = this.player.yaw ?? 0;
    for (let k = 0; k < 6; k++) {
      const a = yaw + Math.PI + this.rng.range(-0.9, 0.9);
      const d = this.rng.range(bc.distance[0], bc.distance[1]);
      const x = p.x - Math.sin(a) * d;
      const z = p.z - Math.cos(a) * d;
      if (this.ground.openAt(x, z) > 0.08) continue;
      bs.spawn(x, z, Math.atan2(p.x - x, p.z - z));
      this.beetleSent = true;
      this.bus.emit('deepForest:beetle', { x, z });
      return;
    }
  }

  // Somebody else's moths, or somewhere they don't belong.
  standAside() {
    const m = this.moths;
    if (!m || m.habitat) return true;
    if (m.active && !this.ours) return true;
    if (this.player.riding || this.interiors?.inside || this.cutscenes?.active) return true;
    if ((this.clock?.day ?? 1) < this.dc.fromDay) return true;
    return Boolean(this.blocked?.());
  }

  update(dt, playing) {
    this.beetles?.update(dt, playing);
    if (!playing || !this.dc?.enabled) return;
    const m = this.moths;
    if (this.ours && !m.active) this.ours = false; // all shot, or gone
    if (this.standAside()) {
      // Mounted up, gone indoors: ours give up.
      if (this.ours && m.active && !m.leaving && !m.habitat) m.dismiss();
      this.timer = 0;
      this.beetleTimer = 0;
      return;
    }
    this.check -= dt;
    if (this.check <= 0) {
      this.check = this.dc.checkEvery;
      const p = this.player.position;
      this.deep = deepInForest(this.ground, p.x, p.z, this.dc.radius);
    }
    this.updateBeetles(dt, this.deep);
    if (!this.deep) {
      this.timer = Math.max(0, this.timer - dt * 2);
      if (this.ours && m.active && !m.leaving) {
        this.out += dt;
        if (this.out > this.dc.loseAfter) m.dismiss();
      }
      return;
    }
    this.out = 0;
    this.timer += dt;
    const due = this.ours ? this.dc.every : this.dc.first;
    if (this.timer < due) return;
    this.timer = 0;
    const flying = m.moths.filter((x) => x.active).length;
    if (this.ours && flying >= this.dc.max) return;
    const n = m.send(this.rng.int(this.dc.count[0], this.dc.count[1]));
    if (n > 0) {
      if (!this.ours) this.bus.emit('deepForest:moths', { count: n });
      this.ours = true;
    }
  }

  overlayLine() {
    return `deep forest: ${this.deep ? 'deep' : 'no'}${this.ours ? ' (moths out)' : ''}${this.beetles?.living.length ? ` (${this.beetles.living.length} beetle)` : ''}`;
  }
}
