// The sawmill (an optional encounter; Session 28; DESIGN.md "The sawmill";
// the set: world/SawmillSite.js; the texts: data/sawmill.json). Harlan
// Stover's mill, the crew the government hired to clear the ground for the
// portal programme, and what was done to them on their last payday.
//
//  1. The arrival: an establishing sweep up the mill road, over the agents'
//     two cars, along the drag marks to the row under the tarps, and into
//     the shed to the man with the chainsaw stood in him (sweep.sawmill).
//     Quiet: nothing here is moving yet. The loose tin on the roof bangs
//     in the wind; flies at the tarps and the pit.
//  2. The last agent's car: its radio is still on, a recall message
//     looping to nobody. The SMG beside him (DESIGN.md: wherever there are
//     dead Men in Black).
//  3. The crime scene, read by searching it: the boot (lime, shovels, tarp,
//     bought that morning), the payroll case (foam cut for a pistol, no
//     money), the bunks, the pit, the man under the logs (his vest, a
//     magazine), the power unit, the saw filer's bench.
//  4. The foreman's day book on his desk (lore and a paper): giddy at
//     triple rates, then no paperwork, then "Dead men don't get paid".
//  5. The chainsaw, worked out of the agent on the shed floor.
//  6. The dead get up: the first time the chainsaw revs at the mill (its
//     noise is what wakes them), or the head saw's hammered off its arbor,
//     or if dark falls with Tom in the yard. The five under the tarps
//     first, one after another; then the night shift where they fell; then
//     the ones in suits, and more of them out of the trees. Each gets up
//     from where it lay (the set folds its body away as the zombie rises).
//  7. The head saw: sixty inches of plate, hammered off its arbor (lore, a
//     card: the killdozer's saw, for later).
//
// Saved through story flags (data/progress.json): FLAGS below. reset()
// works out the rest (a fight that was on starts again when Tom comes
// back, the dead lying where they fell again). Off in Demo mode.
//
// Events: 'sawmill:arrived', 'sawmill:risen', 'sawmill:cleared'.

import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';
import data from '../data/sawmill.json';

export const FLAGS = ['sawmillVisited', 'sawmillRadio', 'sawmillBoot', 'smgTaken', 'sawmillCase', 'sawmillBunks', 'sawmillPit', 'sawmillPinned', 'sawmillBench', 'sawmillEngine', 'diaryFound', 'chainsawTaken', 'sawmillRisen', 'sawmillCleared', 'headSawTaken'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// Is it time for the next wave? waves: config's; i: the next one's index; t: seconds since the last
// one started; alive: how many that got up are still up; rising: how many of the last wave are
// still to get up.
export function waveDue(waves, i, t, alive, rising = 0) {
  const w = waves[i];
  if (!w || rising > 0) return false;
  if (i === 0) return true;
  if (t >= w.after) return true;
  return w.left !== undefined && alive <= w.left && t >= 2.5;
}

// What's left of the fight: 'none' (it never started), 'pending' (it started and wasn't finished:
// it starts again when Tom comes back), 'cleared'.
export function fightLook(flags) {
  if (flags.has('sawmillCleared')) return 'cleared';
  return flags.has('sawmillRisen') ? 'pending' : 'none';
}

// Which of the laid-out dead a wave gets up: the indexes of the risers of its kind in its groups.
export function waveRisers(risers, wave) {
  return risers.filter((r) => r.kind === wave.kind && wave.groups.includes(r.group)).map((r) => r.i);
}

// A zombie variant for one of the dead.
export function variantOf(kind) {
  return kind === 'mib' ? 'mib' : 'logger';
}

export class Sawmill {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.sawmill;
    this.ec = cfg.sawmill.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.data = data;
  }

  // ctx: { scene, site (SawmillSite), player, combat, enemies, ground, cutscenes, dialogue, subtitles,
  // progress, lore, paper, card, clock, chainsaw, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.token = {};
    this.risen = [];
    this.queue = [];
    if (this.ready) {
      const p = this.site.place;
      // Ahead: up the mill road into the yard; x: the walker's right (the model's -x).
      this.cutscenes?.namedAnchors?.set('sawmill', () => ({ x: p.x, z: p.z, yaw: Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)) }));
    }
    this.bus.on('player:respawned', () => this.reset());
    // The chainsaw revved at the mill: that's what wakes them.
    this.bus.on('chainsaw:rev', () => {
      if (!this.ready || this.demo?.active || this.has('sawmillRisen')) return;
      if (this.distance() < this.ec.revWithin) this.startRise();
    });
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.ready);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    if (flag) this.progress?.setFlag(flag);
  }

  spot(name) {
    return this.site.spots[name];
  }

  distance() {
    const p = this.player.position;
    return Math.hypot(p.x - this.site.place.x, p.z - this.site.place.z);
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.tin = 5;
    this.flies = 1;
    this.wave = 0;
    this.waveTimer = 0;
    this.riseTimer = null;
    this.clangTimer = 0;
    this.later = [];
    this.queue = [];
    for (const z of this.risen) if (z.sawmill === this.token) z.sawmill = null;
    this.risen = [];
    this.token = {};
    const look = fightLook(new Set(FLAGS.filter((f) => this.has(f))));
    this.pendingRise = look === 'pending';
    if (!this.ready) return;
    this.site.show('headSaw', !this.has('headSawTaken'));
    this.site.show('chainsaw', !this.has('chainsawTaken'));
    this.site.show('smg', !this.has('smgTaken'));
    this.site.show('diary', !this.has('diaryFound'));
    // The dead: lying where they fell, unless it's over (then they're gone from where they lay).
    this.site.layAll();
    if (look === 'cleared') for (const r of this.site.risers) this.site.raise(r.i);
    if (look === 'cleared') this.state = 'cleared';
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (playing) this.tickLater(dt);
    const d = this.distance();
    if (playing) this.updateStory(dt, d);
    if (canInteract && input && playing && d < this.site.place.radius + 12) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  get quiet() {
    return !this.subtitles?.busy && !this.cutscenes?.active && !this.paper?.isOpen && !this.card?.isOpen;
  }

  updateStory(dt, d) {
    this.timer += dt;
    const p = this.player.position;
    // The loose tin on the shed's roof, while he's near.
    if (d < this.ec.tinDistance) {
      this.tin -= dt;
      if (this.tin <= 0) {
        this.sfx?.play('tinBang', this.spot('headSaw'));
        const [a, b] = this.ec.tinEvery;
        this.tin = a + (b - a) * this.rng();
      }
    }
    // Flies, at the row under the tarps and at the pit, until they've got up.
    if (!this.has('sawmillRisen')) {
      this.flies -= dt;
      if (this.flies <= 0) {
        this.flies = this.ec.fliesEvery;
        for (const name of ['tarps', 'pit', 'chainsaw']) {
          const s = this.spot(name);
          if (s && Math.hypot(p.x - s.x, p.z - s.z) < this.ec.fliesDistance) {
            this.sfx?.play('flies', s);
            break;
          }
        }
      }
    }
    // 1: the arrival sweep, once.
    if (!this.has('sawmillVisited')) {
      if (d < this.ec.sweepDistance && !this.cutscenes?.active) this.arrive();
      return;
    }
    // 2: the car's radio, once, as he comes up to it.
    const car = this.spot('agent');
    if (!this.has('sawmillRadio') && car && Math.hypot(p.x - car.x, p.z - car.z) < this.ec.radioDistance && this.quiet) {
      this.set('sawmillRadio');
      this.sfx?.play('carRadio', car);
      this.after(0.5, () => this.dialogue?.play('sawmill.dispatch.1'));
    }
    this.updateFight(dt);
    // Dark falling with Tom in the yard: they get up anyway.
    const dark = this.clock?.phase === 'dusk' || this.clock?.phase === 'night';
    if (dark && d < this.site.place.radius && !this.has('sawmillRisen') && this.riseTimer === null) this.startRise(0.5);
    // A fight that was on (a save, a death): it starts again when he comes back.
    if (this.pendingRise && d < this.site.place.radius + 4 && this.riseTimer === null && this.state !== 'fight') {
      this.pendingRise = false;
      this.startRise(1.2);
    }
  }

  arrive() {
    this.set('sawmillVisited');
    this.state = 'arrived';
    this.timer = 0;
    this.bus.emit('sawmill:arrived');
    this.cutscenes?.play('sweep.sawmill');
  }

  // ---- the dead get up ------------------------------------------------------------------------

  startRise(after = this.ec.riseAfter) {
    if (this.riseTimer !== null || this.state === 'fight' || this.has('sawmillCleared')) return;
    this.riseTimer = after;
    this.set('sawmillRisen');
    this.pendingRise = false;
    this.sfx?.play('tarpShift', this.spot('tarps'));
  }

  updateFight(dt) {
    if (this.riseTimer !== null) {
      this.riseTimer -= dt;
      if (this.riseTimer > 0) return;
      this.riseTimer = null;
      this.state = 'fight';
      this.wave = 0;
      this.waveTimer = 0;
      this.bus.emit('sawmill:risen');
    }
    if (this.state !== 'fight') return;
    this.waveTimer += dt;
    // One of the wave gets up, then the next a moment later.
    if (this.queue.length) {
      this.queue[0].t -= dt;
      if (this.queue[0].t <= 0) this.raise(this.queue.shift());
    }
    // Who's still up: anything down (or gone) is struck off.
    this.risen = this.risen.filter((z) => z.sawmill === this.token && z.alive);
    const waves = this.ec.waves;
    if (waveDue(waves, this.wave, this.waveTimer, this.risen.length, this.queue.length)) {
      this.startWave(waves[this.wave], this.wave);
      this.wave++;
      this.waveTimer = 0;
    }
    if (this.wave >= waves.length && !this.queue.length && this.risen.length === 0) {
      this.state = 'cleared';
      this.set('sawmillCleared');
      this.bus.emit('sawmill:cleared');
      this.notify?.(data.cleared);
      this.sfx?.play('tinBang', this.spot('headSaw'));
    }
  }

  // A wave: its laid-out dead queued to get up one after another (the nearest to Tom last, so he
  // sees the far ones move first), and any more who walk in out of the trees.
  startWave(w, index) {
    const p = this.player.position;
    const [g0, g1] = this.ec.riseGap;
    const ids = waveRisers(this.site.risers, w);
    const order = ids.map((i) => this.site.risers[i]).sort((a, b) => Math.hypot(b.x - p.x, b.z - p.z) - Math.hypot(a.x - p.x, a.z - p.z));
    order.forEach((r, k) => this.queue.push({ i: r.i, t: k === 0 ? 0.05 : g0 + (g1 - g0) * this.rng() }));
    this.notify?.([data.risen, data.second, data.third][index] ?? data.third);
    if (w.kind === 'mib') {
      const car = this.spot('agent');
      this.sfx?.play('carRadio', car);
      this.after(0.6, () => this.dialogue?.play('sawmill.dispatch.2'));
    }
    if (w.trees) {
      const c = this.site.place;
      const [r0, r1] = w.trees.ring;
      for (let k = 0; k < w.trees.count; k++) {
        const a = this.rng() * Math.PI * 2;
        const r = r0 + (r1 - r0) * this.rng();
        this.after(1.5 + k * 1.3, () => this.spawn(c.x + Math.sin(a) * r, c.z + Math.cos(a) * r, w.trees.variant, false));
      }
    }
  }

  // One of the laid-out dead gets up where it lay.
  raise(q) {
    const r = this.site.risers[q.i];
    if (!r) return;
    this.site.raise(r.i);
    if (r.group === 'tarps') this.sfx?.play('tarpShift', r);
    this.sfx?.play('rise', r);
    this.spawn(r.x, r.z, variantOf(r.kind), true);
  }

  spawn(x, z, variant, rise) {
    const p = this.player.position;
    const zb = this.enemies?.spawnZombie(x, z, { mode: 'chase', rise, variant, facing: Math.atan2(p.x - x, p.z - z), authored: 'sawmill' });
    if (!zb) return;
    zb.sawmill = this.token;
    this.risen.push(zb);
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    // Hammering the collar nut: the whole plate rings on each blow.
    if (this.hold.active && best?.ring) {
      this.clangTimer -= dt;
      if (this.clangTimer <= 0) {
        this.clangTimer = this.ec.clangEvery;
        this.sfx?.play('ironClang', best.at);
        this.sfx?.play('sawRing', best.at);
        this.player.shake?.(0.08);
      }
    } else this.clangTimer = 0;
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act, ring, at } (act null: only to read).
  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const H = this.ec.holds;
    const dist = (q) => (q ? Math.hypot(p.x - q.x, p.z - q.z) : Infinity);
    const opt = (key, def, seconds, act, extra = {}) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act, ...extra });
    const cands = [];
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    for (const s of data.searches) {
      if (s.flag && this.has(s.flag)) continue;
      add(this.spot(s.spot), r + (s.reach ?? 0.3), opt(s.id, s, H[s.hold] ?? H.search, () => this.search(s)));
    }
    if (!this.has('smgTaken')) add(this.spot('agent'), r + 0.3, opt('agent', data.agent, H.agent, () => this.takeSmg()));
    if (!this.has('chainsawTaken')) add(this.spot('chainsaw'), r + 0.4, opt('chainsaw', data.chainsaw, H.chainsaw, () => this.takeChainsaw()));
    const saw = this.spot('headSaw');
    if (!this.has('headSawTaken')) add(saw, r + 0.5, opt('headSaw', data.headSaw, H.headSaw, () => this.takeHeadSaw(), { ring: true, at: saw }));
    // The row under the tarps: only to read.
    add(this.spot('tarps'), r + 0.8, { key: 'tarps', prompt: this.has('sawmillRisen') ? data.tarps.gone : data.tarps.prompt, act: null });
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    return cands[0].o;
  }

  // ---- what each does ------------------------------------------------------------------------

  search(s) {
    this.set(s.flag);
    this.sfx?.play('pickup');
    if (s.id === 'pinned') {
      const g = this.ec.pinned;
      this.giveRounds('pistol', g.pistol);
      this.combat.armour?.add('ballistic', g.armour);
      this.combat.hud?.pickup?.(`Body armour (+${g.armour}), ${g.pistol} pistol rounds`);
    }
    if (s.lore) {
      this.site.show('diary', false);
      this.lore?.give(s.lore);
      const read = () => this.paper?.open(s.paper, { device: this.device, take: true });
      if (!this.card?.show(s.lore, { read, keep: () => this.notify?.('Hand it in at home and read it from the ledger') }, this.device)) read();
      return;
    }
    if (s.text) this.notify?.(s.text);
  }

  // Rounds for a gun Tom may not have yet (kept in the pack until he does).
  giveRounds(type, n) {
    if (this.combat.weapons.addAmmo(type, n)) return;
    const inv = this.combat.inventory;
    if (inv.ammo) inv.ammo[type] = (inv.ammo[type] ?? 0) + n;
  }

  takeSmg() {
    this.set('smgTaken');
    this.site.show('smg', false);
    this.sfx?.play('pickup');
    this.combat.giveWeapon('smg', this.ec.smgRounds);
    this.notify?.(data.agent.text);
  }

  takeChainsaw() {
    this.set('chainsawTaken');
    this.site.show('chainsaw', false);
    this.sfx?.play('chainsawPull', this.spot('chainsaw'));
    this.combat.giveWeapon('chainsaw');
    this.notify?.(data.chainsaw.text);
    this.after(5, () => !this.has('sawmillRisen') && this.notify?.(data.chainsaw.hint));
  }

  takeHeadSaw() {
    this.set('headSawTaken');
    this.site.show('headSaw', false);
    this.sfx?.play('sawOff', this.spot('headSaw'));
    this.lore?.give('headSaw');
    this.card?.show('headSaw', { keep: () => this.notify?.("The mill's head saw: for the front of the dozer's blade, one day") }, this.device);
    if (!this.has('sawmillRisen')) this.startRise(); // that much noise wakes them
  }

  // ---- a little timer on game time ---------------------------------------------------------------

  after(seconds, fn) {
    this.later.push({ t: seconds, fn });
  }

  tickLater(dt) {
    if (!this.later.length) return;
    for (const l of this.later) l.t -= dt;
    const due = this.later.filter((l) => l.t <= 0);
    this.later = this.later.filter((l) => l.t > 0);
    for (const l of due) l.fn();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Sawmill: take me there (${this.state}, ${FLAGS.filter((f) => this.has(f)).length}/${FLAGS.length})`, () => {
      if (!this.ready) return;
      const a = this.site.at(0, -this.ec.sweepDistance - 4);
      this.player.teleport(a.x, a.z, Math.atan2(-Math.sin(this.site.place.yaw), -Math.cos(this.site.place.yaw)));
    });
    cat.addItem('Sawmill: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Sawmill: the dead get up now', () => {
      if (!this.has('sawmillVisited')) this.set('sawmillVisited');
      this.startRise(0.5);
    });
  }

  overlayLine() {
    if (!this.ready) return 'sawmill -';
    return `sawmill ${this.state} ${FLAGS.filter((f) => this.has(f)).length}/${FLAGS.length}${this.state === 'fight' ? ` w${this.wave} up ${this.risen.length} q${this.queue.length}` : ''}`;
  }

  dispose() {}
}
