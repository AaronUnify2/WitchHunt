// The chainsaw (Session 28; DESIGN.md "Weapons"; config.chainsaw; found at
// the sawmill). The third melee weapon, and nothing like the other two:
// hold RT and it spins up and cuts whatever's in front of it for as long
// as it's held. No fuel. What it costs (Aaron, Nov 8):
//
//  - it's loud: revving, it's heard a long way off, over and over
//    (EnemyManager.alert);
//  - it slows Tom while it revs, and more in a cut;
//  - it overheats: held too long it stalls, smoking, and won't start again
//    until it's cooled;
//  - the chain dulls: it cuts slower and holds them less. It's sharpened at
//    the station's workbench for a little scrap (base/Station.js).
//
// The state's stepped in combat/chainsawState.js (pure). The view model
// reads `view` (player/ViewModel.js updateSaw); the HUD reads `gauges`.
//
// Saved: the chain's edge (saveState / loadState). Heat isn't.
//
// Events: 'chainsaw:rev', 'chainsaw:stalled', 'chainsaw:restarted',
// 'chainsaw:dull', 'chainsaw:sharpened'; 'weapon:hit' { melee, id: 'chainsaw' } per bite.

import { meleeTargets, meleeFromBehind, partMultiplier } from './hitscan.js';
import { newSaw, stepSaw, biteOf, sawMove, edgeWord } from './chainsawState.js';

const DEG = Math.PI / 180;

export class Chainsaw {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.chainsaw;
    this.bus = bus;
  }

  // ctx: { combat, player, enemies, fx, notify }.
  init(ctx) {
    Object.assign(this, ctx);
    this.hud = { prompt: '', progress: 0 };
    this.view = { rev: 0, heat: 0, cutting: false, stalled: false, sharp: 1, time: 0 };
    this.reset();
  }

  reset() {
    this.state = newSaw(this.sc);
    this.tick = 0;
    this.noise = 0;
    this.cutting = false;
    this.cutFor = 0;
    this.smoke = 0;
    this.running = false;
    this.warned = { dull: false, hot: false };
    this.treeAt = null; // Round 2: the tree the bar's in: { index, cut, need }
    this.treeHits = [];
    this.dust = 0;
    this.combat?.sfx?.saw?.(false);
  }

  get owned() {
    return Boolean(this.combat?.weapons.has('chainsaw'));
  }

  get inHand() {
    return this.combat.weapons.id === 'chainsaw';
  }

  // What the HUD shows with it in hand: { heat, sharp, stalled, edge } (null otherwise).
  get gauges() {
    if (!this.inHand) return null;
    const s = this.state;
    return { heat: s.heat, sharp: s.sharp, stalled: s.stalled, edge: edgeWord(s.sharp) };
  }

  // The workbench: the chain filed sharp again.
  sharpen() {
    this.state.sharp = 1;
    this.warned.dull = false;
    this.bus.emit('chainsaw:sharpened');
  }

  // playing: the world is running and the controls are Tom's.
  update(dt, input, playing) {
    const w = this.combat.weapons;
    const s = this.state;
    const sfx = this.combat.sfx;
    this.hud.prompt = '';
    this.hud.progress = 0;
    const inHand = this.owned && this.inHand;
    const ready = inHand && playing && this.combat.alive && !w.requireRelease && w.switchProgress >= 1;
    const trigger = ready && Boolean(input?.isDown('attack'));
    if (!playing) {
      // Paused, a cutscene: it idles down and says nothing.
      sfx.saw?.(false);
      this.running = false;
      this.updateView(dt, inHand);
      return;
    }
    const was = s.rev;
    const step = stepSaw(s, this.sc, dt, { trigger, inHand, cutting: this.cutting });
    if (trigger && was === 0 && !s.stalled) {
      sfx.play('chainsawRev');
      this.bus.emit('chainsaw:rev');
    }
    if (step.stalled) this.stall();
    if (step.restarted) {
      sfx.play('chainsawReady');
      this.bus.emit('chainsaw:restarted');
    }
    // A stalled saw and a held trigger: the cord pulled, nothing.
    if (s.stalled && ready && input?.wasPressed('attack')) sfx.play('chainsawDead');

    // The bites.
    if (step.biting) {
      this.tick -= dt;
      let guard = 0;
      while (this.tick <= 0 && guard++ < 4) {
        this.tick += this.sc.tick;
        this.bite();
      }
    } else {
      this.tick = 0;
      this.cutting = false;
      this.treeAt = null;
    }
    this.cutFor = this.cutting ? this.cutFor + dt : 0;

    // Heard a long way off while it revs; a putter in hand.
    if (inHand) {
      this.noise -= dt;
      if (this.noise <= 0) {
        this.noise = this.sc.noise.every;
        const r = s.rev > 0.3 ? this.sc.noise.rev : s.stalled ? 0 : this.sc.noise.idle;
        const p = this.player.position;
        if (r > 0) this.enemies?.alert(p.x, p.z, r);
      }
    } else this.noise = 0;

    // It slows him (after Weapons has set the aim slowdown).
    if (inHand) this.player.moveMultiplier = Math.min(this.player.moveMultiplier, sawMove(this.sc, s, this.cutting));

    // The engine's note: idling in hand, climbing with the revs, bogging down in a cut.
    const on = inHand && !s.stalled && this.combat.alive;
    sfx.saw?.(on, s.rev, this.cutting ? 1 : 0);
    this.running = on;

    // Stalled hot: it smokes, and the prompt bar shows it cooling.
    if (inHand && s.stalled) {
      const h = this.sc.heat;
      this.hud.prompt = 'Overheated: let it cool';
      this.hud.progress = Math.max(0, Math.min(1, (s.heat - h.restartAt) / (1 - h.restartAt)));
      this.smoke -= dt;
      if (this.smoke <= 0 && this.fx?.dust) {
        this.smoke = this.sc.smoke.every;
        const e = w.eye;
        const f = w.forward;
        this.fx.dust(e.x + f.x * 0.7 + w.right.x * 0.2, e.y - 0.3, e.z + f.z * 0.7 + w.right.z * 0.2);
      }
    }
    // Said once each: it's running hot, the chain's going.
    if (inHand && !this.warned.hot && s.heat >= this.sc.heat.warnAt && !s.stalled) {
      this.warned.hot = true;
      sfx.play('chainsawHot');
    }
    if (s.heat < this.sc.heat.restartAt) this.warned.hot = false;
    if (inHand && !this.warned.dull && s.sharp <= this.sc.wear.warnAt) {
      this.warned.dull = true;
      this.notify?.("The chain's going dull. The workbench at the station will put an edge back on it.");
      this.bus.emit('chainsaw:dull');
    }
    this.updateView(dt, inHand);
  }

  stall() {
    this.cutting = false;
    this.combat.sfx.play('chainsawStall');
    this.notify?.('The saw chokes and dies: too hot. Let it cool.');
    this.bus.emit('chainsaw:stalled');
  }

  // One bite: everything in front of the bar, the nearest first.
  bite() {
    const w = this.combat.weapons;
    const c = this.sc;
    const eye = w.eye;
    const flat = Math.hypot(w.forward.x, w.forward.z) || 1;
    const fx = w.forward.x / flat;
    const fz = w.forward.z / flat;
    const hits = meleeTargets(eye, fx, fz, w.targets(), c.reach, c.arcDegrees * DEG, c.cleave);
    this.cutting = hits.length > 0;
    if (!hits.length) {
      this.biteTree(eye, fx, fz);
      return;
    }
    this.treeAt = null;
    const b = biteOf(c, this.state.sharp);
    const weapon = { id: 'chainsaw', stagger: b.stagger, knockback: c.knockback };
    let first = true;
    for (const target of hits) {
      const at = { x: target.x, y: eye.y - 0.35, z: target.z };
      const part = meleeFromBehind(eye, target) ? 'weak' : 'body';
      const killed = w.applyHit(target, b.damage * partMultiplier(target, part, 1), part, weapon, at, eye);
      this.bus.emit('weapon:hit', { killed, part, melee: true, id: 'chainsaw', x: target.x, z: target.z, first });
      first = false;
    }
    this.player.shake(c.shake);
    this.player.kick(c.kickback);
  }

  // Round 2 (Aaron: "the chainsaw needs to be able to chop down trees... the blade should shift sideways
  // and the tree should fall just like it does with the bulldozer"). Nothing of the dead in front of the
  // bar but a trunk: the bar goes over on its side into it, and after a few seconds (longer for the big
  // ones: LandClearing.strainOf) the tree goes over, away from Tom. A thing he can do, not a way to cut
  // trails: it's slow, it heats the saw and it dulls the chain like any cut.
  biteTree(eye, fx, fz) {
    const t = this.sc.trees;
    const lc = this.clearing;
    if (!t || !lc) {
      this.treeAt = null;
      return;
    }
    const near = lc.treesNear(eye.x + fx * t.reach * 0.5, eye.z + fz * t.reach * 0.5, t.reach * 0.5, this.treeHits);
    let best = null;
    for (const h of near) {
      if (h.tree.felled) continue;
      const dx = h.tree.x - eye.x;
      const dz = h.tree.z - eye.z;
      const d = Math.hypot(dx, dz) || 1;
      if ((dx * fx + dz * fz) / d < t.facing) continue; // in front of the bar
      if (!best || d < best.d) best = { index: h.index, tree: h.tree, d };
    }
    if (!best) {
      this.treeAt = null;
      return;
    }
    this.cutting = true;
    if (this.treeAt?.index !== best.index) this.treeAt = { index: best.index, cut: 0, need: t.seconds + lc.strainOf(best.tree) * t.strainScale };
    const sharp = this.sc.dullDamage + (1 - this.sc.dullDamage) * this.state.sharp;
    this.treeAt.cut += this.sc.tick * sharp;
    this.dust -= 1;
    if (this.dust <= 0 && this.fx?.dust) {
      this.dust = t.dustEvery;
      this.fx.dust(best.tree.x - fx * 0.3, eye.y - 0.5, best.tree.z - fz * 0.3);
    }
    this.player.shake(this.sc.shake);
    if (this.treeAt.cut >= this.treeAt.need) {
      lc.fell(best.index, fx, fz);
      this.bus.emit('chainsaw:felled', { index: best.index });
      this.treeAt = null;
      this.cutting = false;
    }
  }

  updateView(dt, inHand) {
    const v = this.view;
    // The bar on its side while it's in a trunk.
    v.fell = (v.fell ?? 0) + ((this.treeAt && this.cutting ? 1 : 0) - (v.fell ?? 0)) * Math.min(1, dt * 9);
    const s = this.state;
    v.time += dt * (0.3 + s.rev);
    v.rev = s.rev;
    v.heat = s.heat;
    v.sharp = s.sharp;
    v.stalled = s.stalled;
    v.cutting = this.cutting;
    v.running = inHand && this.running;
  }

  saveState() {
    return { sharp: Math.round(this.state.sharp * 1000) / 1000 };
  }

  loadState(d) {
    this.reset();
    if (d && Number.isFinite(d.sharp)) this.state.sharp = Math.max(0, Math.min(1, d.sharp));
  }

  addDebugItems(menu, category) {
    const cat = menu.category(category);
    cat.addItem(() => `Give the chainsaw (Session 28; edge ${Math.round(this.state.sharp * 100)}%, heat ${Math.round(this.state.heat * 100)}%)`, () => this.combat.giveWeapon('chainsaw'));
    cat.addItem('Chainsaw: dull the chain', () => { this.state.sharp = 0.1; this.warned.dull = false; });
    cat.addItem('Chainsaw: a fresh edge', () => this.sharpen());
  }

  dispose() {
    this.combat?.sfx?.saw?.(false);
  }
}
