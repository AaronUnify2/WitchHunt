// Story progress (M9.1): the run's progress flags (story/progressFlags.js)
// and their triggers from data/progress.json, checked as you play: dusk and
// dawn, the clearing Tom is in, whether the outpost is cleared, whether
// he's south of the cordon. Emits 'story:flag' { id, on } when a flag
// changes (the gates open on them; lines can name them as conditions).
// Later sessions set flags from their own story beats with setFlag().

import progressData from '../data/progress.json';
import { ProgressFlags, runTriggers } from './progressFlags.js';

const CHECK_EVERY = 0.25; // seconds between position checks

export class StoryProgress {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.bus = bus;
    this.flags = new ProgressFlags(progressData.flags);
  }

  // ctx: { world, player, enemies (living list owner: { living }), notify(text) }.
  init(ctx) {
    this.world = ctx.world;
    this.player = ctx.player;
    this.enemies = ctx.enemies;
    this.timer = 0;
    this.pending = null; // a dusk or dawn waiting for the next check
    this.unsubscribers = [
      this.bus.on('phase:dusk', ({ day }) => (this.pending = { event: 'dusk', day })),
      this.bus.on('phase:dawn', ({ day }) => (this.pending = { event: 'dawn', day })),
    ];
  }

  has(id) {
    return this.flags.has(id);
  }

  // Set (or clear) a flag; tells everyone if it changed.
  setFlag(id, on = true) {
    if (this.flags.set(id, on)) this.bus.emit('story:flag', { id, on });
  }

  update(dt, playing) {
    if (!playing) return;
    this.timer -= dt;
    if (this.timer > 0 && !this.pending) return;
    this.timer = CHECK_EVERY;
    const p = this.player.position;
    const here = this.world.clearingAt(p.x, p.z);
    const ctx = {
      event: this.pending?.event ?? null,
      day: this.pending?.day ?? 0,
      clearing: here?.cluster ? here.key : null,
      cleared: (key, margin) => this.cleared(key, margin),
      south: p.z > this.world.map.cluster.cordonZ + 1,
    };
    this.pending = null;
    for (const id of runTriggers(this.flags, ctx)) this.bus.emit('story:flag', { id, on: true });
  }

  // No living zombie within `margin` metres of the cluster clearing's edge.
  cleared(key, margin) {
    const c = this.world.map.clearings.find((x) => x.cluster && x.key === key);
    const reach = c.radius + margin;
    for (const z of this.enemies.living) if (Math.hypot(z.x - c.x, z.z - c.z) <= reach) return false;
    return true;
  }

  saveState() {
    return this.flags.saveState();
  }

  loadState(d) {
    const before = new Set(this.flags.list());
    this.flags.loadState(d);
    for (const id of this.flags.ids) {
      const on = this.flags.has(id);
      if (on !== before.has(id)) this.bus.emit('story:flag', { id, on });
    }
  }

  // The debug menu's Story flags: one toggle per flag.
  addDebugItems(category) {
    for (const def of this.flags.defs) {
      category.addItem(
        () => `Flag ${def.id}: ${this.flags.has(def.id) ? 'ON' : 'off'}${def.standIn ? ' (stand-in trigger)' : ''}`,
        () => this.setFlag(def.id, !this.flags.has(def.id)),
      );
    }
  }

  overlayLine() {
    return `progress ${this.flags.list().join(' ') || '-'}`;
  }

  dispose() {
    for (const off of this.unsubscribers) off();
  }
}
