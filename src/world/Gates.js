// The cluster's gates in play (M9.1; DESIGN.md "Fixed opening cluster":
// the soft-gated path order). Each gate (world/gates.js) blocks Tom on its
// path until its story progress flag is set, then opens for good (unless
// the debug menu clears the flag). Walking into a shut one tells you why.
// The checkpoint's gate is the cordon's; this opens and shuts it too.

import { gateCollider, distanceToSegment } from './gates.js';
import { GateProps } from '../render/GateProps.js';

export class Gates {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.gc = cfg.map.gates;
    this.bus = bus;
  }

  // ctx: { world, colliders, player, progress (StoryProgress), notify(text) }.
  init(scene, ctx) {
    this.world = ctx.world;
    this.player = ctx.player;
    this.progress = ctx.progress;
    this.notify = ctx.notify;
    const ground = this.world.ground;
    this.list = this.world.gates.map((g) => {
      const collider = g.kind === 'checkpoint' ? this.world.cordon.gateCollider : gateCollider(g, this.gc, (x, z) => ground.heightAt(x, z));
      if (g.kind !== 'checkpoint') ctx.colliders.insert(collider);
      // The torch's glare check sees a shut gate's frame and sign (Aaron:
      // they glared up close); off once it's open and swung aside.
      const glare = g.kind === 'pipeGate' || g.kind === 'chainGate' ? { x: g.x, z: g.z, r: 0.05, vr: this.gc[g.kind].width / 2, top: ground.heightAt(g.x, g.z) + this.gc[g.kind].height + 0.5, noBody: true, glareOnly: true } : null;
      if (glare) ctx.colliders.insert(glare);
      return { ...g, collider, glare, open: false, told: 0 };
    });
    this.props = new GateProps(this.gc, this.cfg.landmarks);
    this.props.init(scene, this.list, ground);
    this.sync();
    this.unsubscribers = [this.bus.on('story:flag', () => this.sync())];
  }

  // Every gate open or shut as its flag says.
  sync() {
    for (const g of this.list) {
      const open = this.progress.has(g.opensOn);
      if (open === g.open && g.synced) continue;
      g.open = open;
      g.synced = true;
      g.collider.off = open;
      if (g.glare) g.glare.off = open;
      if (g.kind === 'checkpoint') this.world.cordon.setCheckpointOpen(open);
      else this.props.setOpen(g.id, open);
    }
  }

  update(dt, playing) {
    if (!playing) return;
    const p = this.player.position;
    for (const g of this.list) {
      g.told = Math.max(0, g.told - dt);
      if (g.open || g.told > 0) continue;
      if (Math.hypot(p.x - g.x, p.z - g.z) > g.half + 10) continue;
      if (distanceToSegment(g.collider, p.x, p.z) > this.gc.bumpDistance) continue;
      g.told = this.gc.bumpCooldown;
      this.notify(g.locked);
    }
  }

  overlayLine() {
    return `gates ${this.list.map((g) => `${g.id}:${g.open ? 'open' : 'shut'}`).join(' ')}`;
  }

  dispose() {
    for (const off of this.unsubscribers) off();
    this.props.dispose();
  }
}
