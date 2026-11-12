// The railway cutting (an optional encounter; Session 27; DESIGN.md "The
// railway cutting: the 1903 line"; the set: world/RailwayCuttingSite.js; the
// texts: data/railwayCutting.json). The last train out of Hemlock Gap,
// stopped in the cut on the night of October 13, 1903 and left there.
//
//  1. The arrival: an establishing sweep along the train to the lantern set
//     down on the ties ahead of the engine, still burning (sweep.railwayCutting).
//     Quiet: no enemies. The train ticks and groans now and then as if it
//     were cooling.
//  2. The coaches: climb aboard at their end platforms (hold X: a room, as
//     the storm shelter's) and search a town's belongings, the names on the
//     church's stones on their labels. The engine's cab: the engineer's note
//     (lore and a paper). The baggage car: the baggage checks (lore and a
//     paper).
//  3. The Caller (it's south of the comms line: the Caller's ground): near
//     the second coach, a man's voice from inside it, Amos Pruitt calling for
//     his brother Levi. Aboard: nobody, only Levi's carpetbag, and a rag doll
//     sitting up on a seat facing the door. Aboard a moment, Amos again, from
//     up the bank. Take the doll (Hattie Bell's: lore) and a girl's voice asks
//     for her Polly back.
//  4. The lantern on the line: try to put it out, and it won't.
//  5. The railroad spike maul, driven into a tie by the engine: work it loose.
//  6. The powder store up the bank, its door barred: knock the bar off with
//     the maul. Six good sticks of dynamite inside (scarce); the rest have
//     sweated through, and the crates go up if they're knocked (a hazard:
//     combat/Dynamite.js).
//  7. The dead come up out of the cutting, out of the ballast, in waves: once
//     the store's opened, or the cowcatcher's knocked loose, or if dark falls
//     with Tom in the cut. The maul's and the dynamite's first use.
//  8. The cowcatcher and boiler plate: knock them loose with the maul (lore,
//     a card: the killdozer's armour, for later).
//
// Saved through story flags (data/progress.json): cuttingVisited,
// cuttingCallerHeard, maulTaken, engineersNoteFound, labelsFound, dollFound,
// cuttingTully, cuttingTate, cuttingLevi, lanternTried, storeOpened,
// dynamiteTaken, crateBlown, cuttingRisen, cuttingCleared, cowcatcherTaken.
// reset() works out the rest (a fight that was on starts again when Tom
// comes back). Off in Demo mode.
//
// Events: 'cutting:arrived', 'cutting:risen', 'cutting:cleared'.

import { HoldAction } from '../player/HoldAction.js';
import { toModel, lineAt } from '../world/railCutting.js';
import { DEBUG } from '../debug/DebugMenu.js';
import data from '../data/railwayCutting.json';

export const FLAGS = ['cuttingVisited', 'cuttingCallerHeard', 'maulTaken', 'engineersNoteFound', 'labelsFound', 'dollFound', 'cuttingTully', 'cuttingTate', 'cuttingLevi', 'lanternTried', 'storeOpened', 'dynamiteTaken', 'crateBlown', 'cuttingRisen', 'cuttingCleared', 'cowcatcherTaken'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// Is it time for the next wave? waves: config's; i: the next one's index; t: seconds since the last
// one came; alive: how many of the dead that came up are still up.
export function waveDue(waves, i, t, alive) {
  const w = waves[i];
  if (!w) return false;
  if (i === 0) return true;
  if (t >= w.after) return true;
  return w.left !== undefined && alive <= w.left && t >= 2.5;
}

// What's left of the fight: 'none' (it never started), 'pending' (it started and wasn't finished:
// it starts again when Tom comes back), 'cleared'.
export function fightLook(flags) {
  if (flags.has('cuttingCleared')) return 'cleared';
  return flags.has('cuttingRisen') ? 'pending' : 'none';
}

// Where Tom stands in a coach's room (local x across, z along), from his world position.
export function roomLocal(room, x, z) {
  const dx = x - room.x;
  const dz = z - room.z;
  return { x: dx * room.rx + dz * room.rz, z: dx * room.fx + dz * room.fz };
}

export class RailwayCutting {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.rc = cfg.railwayCutting;
    this.ec = cfg.railwayCutting.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.data = data;
  }

  // ctx: { scene, site (RailwayCuttingSite), player, combat, enemies, ground, cutscenes, caller, subtitles,
  // progress, lore, paper, card, clock, dynamite, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.token = {};
    this.risen = [];
    if (this.ready) {
      const f = this.site.frame;
      this.cutscenes?.namedAnchors?.set('railwayCutting', () => ({ x: f.x, z: f.z, yaw: Math.atan2(-f.tx, -f.tz) }));
    }
    this.bus.on('paper:closed', ({ id }) => {
      if (id === 'luggageLabels') this.notify?.('Every name on the church\'s stones. Every one of them had a ticket out.');
    });
    this.bus.on('player:respawned', () => this.reset());
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

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.creak = 6;
    this.callStep = this.has('cuttingCallerHeard') ? 2 : 0;
    this.aboardTime = 0;
    this.hattie = this.has('dollFound') ? -1 : null;
    this.wave = 0;
    this.waveTimer = 0;
    this.riseTimer = null;
    this.clangTimer = 0;
    this.fightCalled = false;
    for (const z of this.risen) if (z.cutting === this.token) z.cutting = null;
    this.risen = [];
    this.token = {};
    this.pendingRise = fightLook(new Set(FLAGS.filter((f) => this.has(f)))) === 'pending';
    if (this.player?.platform?.aboard) this.player.setPlatform(null, this.player.position.x, this.player.position.z);
    if (!this.ready) return;
    this.site.show('maul', !this.has('maulTaken'));
    this.site.show('doll', !this.has('dollFound'));
    this.site.setDoor(this.has('storeOpened') ? 'open' : 'barred');
    this.site.setCowcatcher(!this.has('cowcatcherTaken'));
    this.site.show('crates', !this.has('crateBlown'));
    this.armCrate();
  }

  // The sweating crates are a hazard once the store's open (until they've gone up).
  armCrate() {
    if (this.crate) this.dynamite?.removeHazard(this.crate);
    this.crate = null;
    if (!this.dynamite || !this.has('storeOpened') || this.has('crateBlown')) return;
    const s = this.spot('storeShelf');
    if (!s) return;
    const c = this.ec.crate;
    this.crate = this.dynamite.addHazard({ x: s.x, y: s.y - 0.2, z: s.z, r: c.r, h: c.h, blast: c.blast, onBlow: () => this.crateBlown() });
  }

  crateBlown() {
    this.set('crateBlown');
    this.site.show('crates', false);
    this.crate = null;
    this.notify?.('The powder store went up');
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (playing) this.tickLater(dt);
    const p = this.player.position;
    const f = this.site.frame;
    const d = Math.hypot(p.x - f.x, p.z - f.z);
    if (playing) this.updateStory(dt, d);
    const near = d < f.radius + 12 || this.player.platform?.aboard;
    if (canInteract && input && playing && near) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  updateStory(dt, d) {
    this.timer += dt;
    const f = this.site.frame;
    // The train, ticking and groaning now and then, while he's near.
    if (d < this.ec.creakDistance) {
      this.creak -= dt;
      if (this.creak <= 0) {
        const cars = ['coach1.middle', 'coach2.middle', 'cab', 'baggageDoor'];
        this.sfx?.play('trainCreak', this.spot(cars[Math.floor(this.rng() * cars.length)]));
        const [a, b] = this.ec.creakEvery;
        this.creak = a + (b - a) * this.rng();
      }
    }
    // 1: the arrival sweep, once.
    if (!this.has('cuttingVisited')) {
      if (d < this.ec.sweepDistance && !this.cutscenes?.active) this.arrive();
      return;
    }
    this.updateCaller(dt);
    this.updateFight(dt, d);
    // Dark falling with Tom in the cut: the dead come up anyway.
    const dark = this.clock?.phase === 'dusk' || this.clock?.phase === 'night';
    if (dark && d < f.radius && !this.has('cuttingRisen') && this.riseTimer === null) this.startRise(0.5);
    // A fight that was on (a save, a death): it starts again when he comes back.
    if (this.pendingRise && d < f.radius + 6 && this.riseTimer === null && this.state !== 'fight') {
      this.pendingRise = false;
      this.startRise(1.5);
    }
  }

  arrive() {
    this.set('cuttingVisited');
    this.state = 'arrived';
    this.timer = 0;
    this.bus.emit('cutting:arrived');
    this.cutscenes?.play('sweep.railwayCutting');
  }

  get quiet() {
    return !this.caller?.call && !this.subtitles?.busy && !this.cutscenes?.active && !this.paper?.isOpen && !this.card?.isOpen;
  }

  // The Caller: Amos from inside the second coach, Amos from up the bank once Tom's aboard, the girl.
  updateCaller(dt) {
    const p = this.player.position;
    const pl = this.player.platform;
    const aboard2 = pl?.aboard && pl.room === 'coach2';
    const voice = this.spot('coach2.voice');
    if (this.callStep === 0 && voice && !pl?.aboard && Math.hypot(p.x - voice.x, p.z - voice.z) < this.ec.callDistance && this.quiet) {
      this.caller?.callFrom(voice, 'caller.cutting.amos1', 'From inside the carriage');
      this.set('cuttingCallerHeard');
      this.callStep = 1;
    }
    if (this.callStep === 1 && aboard2) {
      this.aboardTime += dt;
      if (this.aboardTime > this.ec.lureAfter && this.quiet) {
        this.caller?.callFrom(this.bankPoint(), 'caller.cutting.amos2', 'From up the bank');
        this.callStep = 2;
      }
    }
    if (this.hattie !== null && this.hattie >= 0) {
      this.hattie += dt;
      if (this.hattie > this.ec.hattieAfter && this.quiet) {
        this.caller?.callFrom(this.bankPoint(), 'caller.cutting.hattie', 'From up the bank');
        this.hattie = -1;
      }
    }
  }

  // A point up on the bank across from Tom (the side he isn't nearest).
  bankPoint() {
    const f = this.site.frame;
    const p = this.player.position;
    const m = toModel(f, p.x, p.z);
    const side = m.x > lineAt(f, m.z).x ? -1 : 1;
    return this.site.at(lineAt(f, m.z).x + side * 13, m.z + 4);
  }

  // ---- the dead come up -----------------------------------------------------------------------

  startRise(after = this.ec.riseAfter) {
    if (this.riseTimer !== null || this.state === 'fight') return;
    this.riseTimer = after;
    this.set('cuttingRisen');
    // The ballast shifting along the line before anything shows.
    const f = this.site.frame;
    for (const Z of [-14, 0, 14]) this.sfx?.play('ballastShift', this.site.at(lineAt(f, Z).x, Z));
    this.notify?.(data.risen);
  }

  updateFight(dt, d) {
    if (this.riseTimer !== null) {
      this.riseTimer -= dt;
      if (this.riseTimer > 0) return;
      this.riseTimer = null;
      this.state = 'fight';
      this.wave = 0;
      this.waveTimer = 0;
      this.bus.emit('cutting:risen');
    }
    if (this.state !== 'fight') return;
    this.waveTimer += dt;
    // Who's still up: anything down (or gone) is struck off.
    this.risen = this.risen.filter((z) => z.cutting === this.token && z.alive);
    const waves = this.ec.waves;
    if (waveDue(waves, this.wave, this.waveTimer, this.risen.length)) {
      this.spawnWave(waves[this.wave]);
      this.wave++;
      this.waveTimer = 0;
      if (this.wave === 1 && !this.fightCalled) {
        this.fightCalled = true;
        const f = this.site.frame;
        this.caller?.callFrom(this.site.at(lineAt(f, 22).x, 22), 'caller.cutting.rise', 'From down the line');
      }
    }
    if (this.wave >= waves.length && this.risen.length === 0) {
      this.state = 'cleared';
      this.set('cuttingCleared');
      this.bus.emit('cutting:cleared');
      this.notify?.(data.cleared);
    }
  }

  // One wave of the dead, climbing out of the ground (rise) and coming for Tom.
  spawnWave(w) {
    const f = this.site.frame;
    const p = this.player.position;
    const me = toModel(f, p.x, p.z);
    for (let i = 0; i < w.count; i++) {
      let at = null;
      for (let tries = 0; tries < 12 && !at; tries++) {
        let X;
        let Z;
        if (w.from === 'floor') {
          const [a, b] = this.ec.floorRing;
          Z = me.z + (this.rng() < 0.5 ? -1 : 1) * (a + (b - a) * this.rng());
          Z = Math.max(-f.radius + 2, Math.min(f.radius - 2, Z));
          X = (this.rng() < 0.5 ? -1 : 1) * (2.2 + this.rng() * 2.4);
        } else if (w.from === 'mouths') {
          Z = (i % 2 ? 1 : -1) * (24 + this.rng() * 6);
          X = (this.rng() - 0.5) * 5;
        } else {
          const s = this.site.store;
          Z = s.z + (this.rng() - 0.5) * 9;
          X = s.side * (2.4 + this.rng() * 2.6);
        }
        const c = this.site.at(lineAt(f, Z).x + X, Z);
        if (Math.hypot(c.x - p.x, c.z - p.z) >= 4.5) at = c;
      }
      if (!at) continue;
      const z = this.enemies?.spawnZombie(at.x, at.z, { mode: 'chase', rise: true, facing: Math.atan2(p.x - at.x, p.z - at.z) });
      if (!z) continue;
      z.cutting = this.token;
      this.risen.push(z);
      if (i % 2 === 0) this.sfx?.play('rise', at);
    }
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    // Knocking iron loose: the maul in hand, swinging, a clang on each blow.
    if (this.hold.active && best?.smash) {
      const w = this.combat.weapons;
      if (w.id !== 'spikeMaul') w.selectId('spikeMaul');
      this.clangTimer -= dt;
      if (this.clangTimer <= 0) {
        w.swingTime = 0;
        this.clangTimer = 0.62;
        setTimeoutGame(this, 0.5, () => this.sfx?.play('ironClang', best.at));
      }
    } else this.clangTimer = 0;
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act, smash, at } (act null: information only).
  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const H = this.ec.holds;
    const dist = (q) => (q ? Math.hypot(p.x - q.x, p.z - q.z) : Infinity);
    const pl = this.player.platform;
    const opt = (key, def, seconds, act, extra = {}) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act, ...extra });
    // Aboard a coach: its searches, and the way off at either end.
    if (pl?.aboard) {
      for (const s of data.searches) {
        if (s.aboard !== pl.room || (s.flag && this.has(s.flag)) || (s.id === 'punch' && this.punched)) continue;
        if (dist(this.spot(s.spot)) < r) return opt(s.id, s, H[s.hold], () => this.search(s));
      }
      const room = this.site.rooms[pl.room];
      const loc = roomLocal(room, p.x, p.z);
      for (const e of this.ec.boardEnds[pl.room] ?? []) {
        const sgn = e === 'F' ? 1 : -1;
        if (loc.z * sgn > room.hz - 1.0) return opt(`leave${e}`, data.leave, H.board, () => this.leave(pl.room, e));
      }
      return null;
    }
    // On the ground: the nearest thing in reach.
    const cands = [];
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    if (!this.has('maulTaken')) add(this.spot('maul'), r + 0.4, opt('maul', data.maul, H.maul, () => this.takeMaul()));
    add(this.spot('lantern'), r, opt('lantern', data.lantern, H.lantern, () => this.tryLantern()));
    for (const s of data.searches) {
      if (s.aboard || (s.flag && this.has(s.flag))) continue;
      add(this.spot(s.spot), r + 0.5, opt(s.id, s, H[s.hold], () => this.search(s)));
    }
    // The powder store.
    const door = this.spot('storeDoor');
    const maul = this.combat.weapons.has('spikeMaul');
    if (!this.has('storeOpened')) add(door, r + 0.3, maul ? opt('bar', data.bar, H.bar, () => this.openStore(), { smash: true, at: door }) : { key: 'barNeeds', prompt: data.bar.needs, act: null });
    if (this.has('storeOpened') && !this.has('dynamiteTaken') && !this.has('crateBlown')) {
      add(this.spot('storeInside'), r + 0.4, opt('sticks', data.sticks, H.sticks, () => this.takeSticks()));
      add(door, r - 0.3, opt('sticks', data.sticks, H.sticks, () => this.takeSticks()));
    }
    // The cowcatcher.
    const cc = this.spot('cowcatcher');
    if (!this.has('cowcatcherTaken')) add(cc, r + 0.6, maul ? opt('cowcatcher', data.cowcatcher, H.cowcatcher, () => this.takeCowcatcher(), { smash: true, at: cc }) : { key: 'ccNeeds', prompt: data.cowcatcher.needs, act: null });
    // The coaches' steps.
    for (const [id, ends] of Object.entries(this.ec.boardEnds)) {
      for (const e of ends) for (const side of ['L', 'R']) add(this.spot(`${id}.board${e}${side}`), this.ec.boardRange, opt(`board.${id}`, data.board, H.board, () => this.board(id, e)));
    }
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    return cands[0].o;
  }

  // ---- what each does ------------------------------------------------------------------------

  search(s) {
    if (s.id === 'punch') this.punched = true;
    this.set(s.flag);
    this.sfx?.play('pickup');
    if (s.id === 'doll') {
      this.site.show('doll', false);
      this.lore?.give('hattieDoll');
      this.card?.show('hattieDoll', { keep: () => this.notify?.("Hattie Bell's doll: hand it in at home") }, this.device);
      this.hattie = 0;
      return;
    }
    if (s.lore) {
      this.lore?.give(s.lore);
      const read = () => this.paper?.open(s.paper, { device: this.device, take: true });
      if (!this.card?.show(s.lore, { read, keep: () => this.notify?.('Hand it in at home and read it from the ledger') }, this.device)) read();
      return;
    }
    if (s.text) this.notify?.(s.text);
  }

  board(id, e) {
    const room = this.site.rooms[id];
    if (!room) return;
    const sgn = e === 'F' ? 1 : -1;
    const lz = sgn * (room.hz - 0.55);
    const x = room.x + room.fx * lz;
    const z = room.z + room.fz * lz;
    this.sfx?.play('climb');
    this.player.setPlatform({ room: id, aboard: true, x: room.x, z: room.z, y: room.y, half: room.hz, hx: room.hx, hz: room.hz, rx: room.rx, rz: room.rz, fx: room.fx, fz: room.fz, roofY: this.ec.roofY, blocks: room.blocks }, x, z);
    this.player.yaw = Math.atan2(room.fx * sgn, room.fz * sgn); // facing down the aisle
    this.aboardTime = 0;
  }

  leave(id, e) {
    const s = this.spot(`${id}.board${e}L`) ?? this.spot(`${id}.board${e}R`);
    this.sfx?.play('climb');
    this.player.setPlatform(null, s.x, s.z);
  }

  takeMaul() {
    this.set('maulTaken');
    this.site.show('maul', false);
    this.sfx?.play('maulPull', this.spot('maul'));
    this.combat.giveWeapon('spikeMaul');
    this.notify?.(data.maul.text);
  }

  tryLantern() {
    this.set('lanternTried');
    this.sfx?.play('denied');
    this.notify?.(data.lantern.text);
  }

  openStore() {
    this.set('storeOpened');
    this.site.setDoor('open');
    this.sfx?.play('ironClang', this.spot('storeDoor'));
    this.sfx?.play('door', this.spot('storeDoor'));
    this.armCrate();
    this.notify?.(data.bar.text);
    this.startRise();
  }

  takeSticks() {
    this.set('dynamiteTaken');
    const n = this.dynamite?.give(this.ec.sticks) ?? 0;
    this.sfx?.play('pickup');
    this.notify?.(n < this.ec.sticks ? `${data.sticks.text} (You could only carry ${n}.)` : data.sticks.text);
  }

  takeCowcatcher() {
    this.set('cowcatcherTaken');
    this.site.setCowcatcher(false);
    const at = this.spot('cowcatcher');
    this.sfx?.play('boltSnap', at);
    setTimeoutGame(this, 0.25, () => this.sfx?.play('ironClang', at));
    this.lore?.give('cowcatcher');
    this.card?.show('cowcatcher', { keep: () => this.notify?.('The cowcatcher and boiler plate: armour for the dozer, one day') }, this.device);
    if (!this.has('cuttingRisen')) this.startRise(); // that much noise wakes them
  }

  // ---- a little timer on game time (as MiloBarn's later()) -------------------------------------

  tickLater(dt) {
    if (!this.later) return;
    for (const l of this.later) l.t -= dt;
    const due = this.later.filter((l) => l.t <= 0);
    this.later = this.later.filter((l) => l.t > 0);
    for (const l of due) l.fn();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Railway cutting: take me there (${this.state}, ${FLAGS.filter((f) => this.has(f)).length}/${FLAGS.length})`, () => {
      if (!this.ready) return;
      const f = this.site.frame;
      const a = this.site.at(lineAt(f, -this.ec.sweepDistance - 4).x - 2.5, -this.ec.sweepDistance - 4);
      this.player.setPlatform(null, a.x, a.z);
      this.player.teleport(a.x, a.z, Math.atan2(-f.tx, -f.tz));
    });
    cat.addItem('Railway cutting: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Railway cutting: the dead come up now', () => {
      if (!this.has('cuttingVisited')) this.set('cuttingVisited');
      this.startRise(0.5);
    });
  }

  overlayLine() {
    if (!this.ready) return 'cutting -';
    return `cutting ${this.state} ${FLAGS.filter((f) => this.has(f)).length}/${FLAGS.length}${this.state === 'fight' ? ` w${this.wave} up ${this.risen.length}` : ''}`;
  }

  dispose() {
    if (this.crate) this.dynamite?.removeHazard(this.crate);
  }
}

// Run fn after `seconds` of game time (the encounter's interaction tick).
function setTimeoutGame(enc, seconds, fn) {
  (enc.later ??= []).push({ t: seconds, fn });
}
