// The end of the road north, in play (Session 21, M10.2; the layout and
// the story: world/roadNorth.js; drawn by render/RoadNorthProps.js).
//  - The ROAD CLOSED barrier stops everyone (nobody in or out). Walking
//    into it says so; the tunnel behind has fallen in anyway.
//  - The brush packed in front of the cave stops Tom (not the dozer).
//    Walking into it says it's too thick to push through: it would take
//    a machine. The dozer's blade, driven into it, tears it away: the
//    mouth shows, a black hole into the rock, the story flag caveFound is
//    set (the map stops calling the place Road's end), and it's saved.
//  - Once it's clear, standing at the mouth: what's there (the cave
//    itself is built with its story beat, M12; Session 21's interior
//    system is how it will load).
// Events: 'roadNorth:brushCleared' { by }.

import { roadNorthColliders, inBrush } from './roadNorth.js';
import { distanceToSegment } from './gates.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class RoadNorth {
  // cfg: the whole config (config.map.roadNorth inside).
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.rc = cfg.map.roadNorth;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { world (map.roadNorth, roadNorthProps, ground), colliders, player, progress,
  // notify(text), sfx, fx, clearing (LandClearing: the bare earth left), dozer }.
  init(ctx) {
    Object.assign(this, ctx);
    this.layout = ctx.world.map.roadNorth;
    this.props = ctx.world.roadNorthProps ?? null;
    this.brushCleared = false;
    this.bumpTimers = { barrier: 0, brush: 0 };
    this.colliders = [];
    if (!this.layout) return;
    for (const c of roadNorthColliders(this.layout, this.rc)) {
      const y = ctx.world.ground.heightAt(c.x, c.z);
      if (c.what === 'rock') c.top = y + 12;
      else if (c.top !== undefined) c.top += y;
      ctx.colliders?.insert(c);
      this.colliders.push(c);
    }
  }

  get brushColliders() {
    return this.colliders.filter((c) => c.what === 'brush');
  }

  update(dt, playing) {
    this.hud.prompt = '';
    if (!this.layout) return;
    for (const k of Object.keys(this.bumpTimers)) this.bumpTimers[k] = Math.max(0, this.bumpTimers[k] - dt);
    if (!playing) return;
    // The dozer's blade, driven into the brush, tears it away.
    const d = this.dozer;
    if (!this.brushCleared && d?.riding && Math.abs(d.speed ?? 0) > 0.3) {
      const p = d.toWorld(0, d.qc.bladeFront);
      if (inBrush(this.layout, p.x, p.z, this.rc.bladeReach)) this.clearBrush('dozer');
    }
    if (this.player.riding) return;
    const pos = this.player.position;
    const near = this.rc.bumpDistance;
    // Walking into the barrier, or the brush.
    const bar = this.colliders.find((c) => c.what === 'barrier');
    if (bar && distanceToSegment(bar, pos.x, pos.z) < bar.t + near) this.bump('barrier', 'ROAD CLOSED. Behind the barrier the tunnel has fallen in: rock to the roof.');
    if (!this.brushCleared && inBrush(this.layout, pos.x, pos.z, near)) this.bump('brush', 'Briars and deadfall, packed solid against the rock. Too thick to push through. It would take a machine to shift this.');
    // At the cave's mouth, once it shows.
    if (this.brushCleared) {
      const m = this.layout.mouth;
      if (Math.hypot(pos.x - m.x, pos.z - m.z) < this.rc.mouthRange) this.hud.prompt = 'A cave, going deep into the rock. It smells of wet fur. (Built with its story: M12)';
    }
  }

  bump(key, text) {
    if (this.bumpTimers[key] > 0) return;
    this.bumpTimers[key] = this.rc.bumpCooldown;
    this.notify?.(text);
  }

  // The brush gone: the mouth shows, the flag's set, bare earth where it was.
  clearBrush(by = 'dozer') {
    if (this.brushCleared || !this.layout) return false;
    this.brushCleared = true;
    for (const c of this.brushColliders) c.off = true;
    this.props?.setBrush(false);
    const b = this.layout.brush;
    if (by !== 'load') {
      for (let x = b.x - b.hx; x <= b.x + b.hx; x += 2) for (let z = b.z - b.hz; z <= b.z + b.hz; z += 2) this.clearing?.carve?.(x, z, 1.6);
      this.sfx?.play('scrape', { x: b.x, z: b.z });
      this.fx?.dust?.(b.x, this.world.ground.heightAt(b.x, b.z) + 0.6, b.z);
      this.notify?.('The brush tears away. Behind it, a black opening in the rock: a cave.');
      this.player?.shake?.(0.5);
    }
    this.progress?.setFlag('caveFound');
    this.bus?.emit('roadNorth:brushCleared', { by });
    return true;
  }

  // ---- saving ----------------------------------------------------------------------------------------

  saveState() {
    return { brushCleared: this.brushCleared };
  }

  loadState(d) {
    if (!d?.brushCleared) return;
    this.clearBrush('load');
  }

  // ---- debug -----------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.layout) return;
    const cat = menu.category(DEBUG.teleport);
    const l = this.layout;
    const tp = (x, z, yaw, text) => () => {
      this.player.teleport(x, z, yaw);
      this.notify?.(text);
    };
    cat.addItem('Road north: teleport to the ROAD CLOSED barrier', tp(l.barrier.x - 1.5, l.barrier.z + 8, 0, 'At the end of the road north'));
    cat.addItem("Road north: teleport to the brush (the cave's mouth)", tp(l.brush.x - 2, l.brush.z + l.brush.hz + 5, 0.3, 'By the brush on the spur of rock'));
    cat.addItem('Road north: bring the dozer here (facing the brush)', () => {
      const d = this.dozer;
      if (!d?.place) return this.notify?.('No dozer');
      if (d.riding) return this.notify?.('Get off the dozer first');
      d.unpark?.();
      d.clearMotion?.();
      d.place(l.brush.x, l.brush.z + l.brush.hz + 6, 0); // heading 0: facing north, into the brush
      this.player.teleport(l.brush.x + 3, l.brush.z + l.brush.hz + 7, 0);
      this.notify?.('The dozer, facing the brush: hold X to climb on, blade into it');
    });
    cat.addItem('Road north: clear the brush (as the dozer would)', () => {
      if (!this.clearBrush('debug')) this.notify?.('Already cleared');
    });
  }

  overlayLine() {
    if (!this.layout) return '';
    return `road north: brush ${this.brushCleared ? 'cleared' : 'standing'}`;
  }
}
