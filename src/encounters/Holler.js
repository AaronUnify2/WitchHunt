// The moonshiners' holler (an optional encounter; Session 29; DESIGN.md
// "Moonshiners' holler"; the ground: world/hollerGround.js; the set:
// world/HollerSite.js; the traps: combat/hollerTraps.js; the texts:
// data/holler.json). A quiet trap puzzle up a dark, narrow hollow, serious in
// tone: the Rigsbys' still, strung shut against the law when the lights came
// over the government land.
//
//  1. The arrival: an establishing sweep from over the mouth, down to the
//     first trap (already sprung, and the man in the suit it got), along the
//     floor past the cans to the lookout, up to the still and the family
//     standing about it, in close on the gauge in the red (sweep.holler).
//  2. The traps up the floor (combat/hollerTraps.js): read them, step over
//     the lines, disarm them with X (the lines need the wire cutters), or
//     lead the dead into them.
//  3. The lookout halfway up: the wire cutters in the tackle box (a tool from
//     then on), the family's trap map (lore and a paper; out of date: the
//     two traps laid since aren't on it), Clete's tally of the lights.
//  4. The turned family wait at the still (zombies lingering round it). They
//     come for Tom when he comes into the yard, when the cans ring, or when
//     a shot carries; two more come down off the ridge after a while.
//  5. The still, the last puzzle: still running, nobody tending it, its
//     gauge in the red. From when the family wakes it climbs. Shut it down
//     with the valves in the right order (Pa's board by the still says it:
//     damper, relief, line), or it blows, and the copper worm with it.
//  6. The shed: the auto shotgun in the gun cabinet (a paranoid family's
//     stockpile; Aaron's yes to the proposal, Session 29), ammo cans.
//  7. The copper worm, lifted out of the flake stand once the still's shut
//     down (lore, a card: the killdozer's flamethrower, for later).
//
// Saved through story flags (data/progress.json): FLAGS below and one per
// trap (combat/hollerTraps.js trapFlag). reset() works out the rest: a still
// left running starts back at its gauge's first reading, a family that
// wasn't finished is back round the still. Off in Demo mode.
//
// Events: 'holler:arrived', 'holler:familyUp', 'holler:familyDown',
// 'holler:stillShut', 'holler:stillBlown', and the traps'.

import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { HollerTraps, trapFlag } from '../combat/hollerTraps.js';
import data from '../data/holler.json';

export const FLAGS = ['hollerVisited', 'hollerAgent', 'hollerLookout', 'wireCuttersTaken', 'trapMapFound', 'hollerJars', 'hollerMash', 'hollerBoard', 'autoShotgunTaken', 'hollerAmmo', 'hollerFamilyUp', 'hollerFamilyDown', 'hollerStillShut', 'hollerStillBlown', 'copperCoilTaken'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// A valve turned: 'ok' (it's the next in order), 'early' (one before it isn't done yet), or 'done'
// (already turned). order: config's; done: the valves turned so far (in order).
export function valveTurn(order, done, id) {
  if (done.includes(id)) return 'done';
  return order[done.length] === id ? 'ok' : 'early';
}

// The gauge after dt seconds. s: { value, phase } where phase is 'idle' (not climbing yet), 'climbing',
// 'damped' (holding), 'bleeding' (falling to bled), 'shut' or 'blown'. cfg: config's still.
// Returns the new value (1 or more: it blows).
export function gaugeStep(value, phase, dt, cfg) {
  if (phase === 'climbing') return value + ((1 - cfg.start) / cfg.blowSeconds) * dt;
  if (phase === 'bleeding') return Math.max(cfg.bled, value - ((cfg.start - cfg.bled) / cfg.bleedSeconds) * dt);
  return value;
}

// What's left of the still: 'running', 'shut', 'blown'.
export function stillLook(flags) {
  if (flags.has('hollerStillBlown')) return 'blown';
  return flags.has('hollerStillShut') ? 'shut' : 'running';
}

export class Holler {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.hc = cfg.holler;
    this.ec = cfg.holler.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.data = data;
    this.traps = new HollerTraps(this.hc, bus);
    this.family = [];
  }

  // ctx: { scene, site (HollerSite), player, combat, enemies, explosives, cutscenes, dialogue,
  // subtitles, progress, lore, paper, card, clock, demo, notify, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.token = {};
    if (this.ready) {
      const p = this.site.place;
      this.traps.init({ site: this.site, player: this.player, combat: this.combat, enemies: this.enemies, progress: this.progress, sfx: this.sfx, notify: this.notify, texts: data.traps });
      // Ahead: up the hollow from the mouth; x: the walker's right (the model's -x).
      this.cutscenes?.namedAnchors?.set('holler', () => ({ x: p.x, z: p.z, yaw: Math.atan2(-Math.sin(p.yaw), -Math.cos(p.yaw)) }));
    }
    this.bus.on('player:respawned', () => this.reset());
    // The cans ring: the family hears it.
    this.bus.on('holler:alarm', () => this.wake());
    // A shot near the still carries to them.
    this.bus.on('weapon:fired', () => {
      if (this.ready && this.family.length && !this.awake && this.stillDistance() < this.ec.wakeDistance * 2.2) this.wake();
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

  stillDistance() {
    const s = this.spot('still');
    const p = this.player.position;
    return Math.hypot(p.x - s.x, p.z - s.z);
  }

  get cutters() {
    return this.has('wireCuttersTaken');
  }

  reset() {
    this.later = [];
    this.boil = 1;
    this.valves = [];
    this.warned = false;
    this.treesDue = null;
    // The family that was out: gone back into the ground (they're round the still again next time).
    for (const z of this.family) if (z.holler === this.token && z.alive) z.burrow?.();
    this.family = [];
    this.token = {};
    if (!this.ready) return;
    this.traps.reset();
    const look = stillLook(new Set(FLAGS.filter((f) => this.has(f))));
    this.still = { value: look === 'running' ? this.ec.still.start : look === 'shut' ? 0 : 0, phase: look === 'running' ? 'idle' : look };
    this.site.setGauge(this.still.value);
    this.site.show('cutters', !this.has('wireCuttersTaken'));
    this.site.show('trapMap', !this.has('trapMapFound'));
    this.site.show('autoShotgun', !this.has('autoShotgunTaken'));
    this.site.show('coil', look !== 'blown' && !this.has('copperCoilTaken'));
    this.site.show('fireGlow', look === 'running');
    // A family that came and wasn't all put down is waiting round the still again (it wakes as before).
    this.awake = false;
    this.spawned = false;
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (playing) this.tickLater(dt);
    const d = this.distance();
    if (d < this.site.place.radius + 30) this.traps.update(dt, playing);
    if (playing) this.updateStory(dt, d);
    if (canInteract && input && playing && d < this.site.place.radius + 8) this.updateInteraction(dt, input);
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
    // The family, round the still, once he's close enough to matter (until they're down).
    if (!this.spawned && !this.has('hollerFamilyDown') && d < this.ec.spawnDistance) this.spawnFamily();
    // 1: the arrival sweep, once, as he comes to the mouth.
    if (!this.has('hollerVisited')) {
      const a = this.spot('arrive');
      const p = this.player.position;
      if (Math.hypot(p.x - a.x, p.z - a.z) < this.ec.sweepDistance && !this.cutscenes?.active) this.arrive();
      return;
    }
    // The still boiling, while it runs.
    const S = this.ec.still;
    if (this.still.phase !== 'shut' && this.still.phase !== 'blown' && this.stillDistance() < S.boilDistance) {
      this.boil -= dt;
      if (this.boil <= 0) {
        this.boil = S.boilEvery * (0.8 + this.rng() * 0.4);
        this.sfx?.play('stillBoil', this.spot('still'));
      }
    }
    // 4: into the yard: they come.
    if (this.family.length && !this.awake && this.stillDistance() < this.ec.wakeDistance) this.wake();
    this.updateFamily(dt);
    this.updateStill(dt);
  }

  arrive() {
    this.set('hollerVisited');
    this.bus.emit('holler:arrived');
    this.cutscenes?.play('sweep.holler');
  }

  // ---- the family -----------------------------------------------------------------------------

  spawnFamily() {
    this.spawned = true;
    const s = this.spot('still');
    for (let k = 0; k < 5; k++) {
      const at = this.spot(`kin${k}`);
      if (at) this.spawn(at.x, at.z, 'linger', Math.atan2(s.x - at.x, s.z - at.z));
    }
  }

  spawn(x, z, mode, facing) {
    const s = this.spot('still');
    const zb = this.enemies?.spawnZombie(x, z, { mode, variant: 'moonshiner', facing, authored: 'holler', linger: { x: s.x, z: s.z, r: this.ec.linger } });
    if (!zb) return null;
    zb.holler = this.token;
    this.family.push(zb);
    return zb;
  }

  // They come for him: the yard, the cans, a shot.
  wake() {
    if (!this.ready || this.awake || this.has('hollerFamilyDown') || !this.spawned) return;
    this.awake = true;
    this.set('hollerFamilyUp');
    const s = this.spot('still');
    this.enemies?.alert(s.x, s.z, this.ec.linger + 30);
    this.notify?.(data.family.up);
    this.bus.emit('holler:familyUp');
    this.treesDue = this.ec.familyTrees.after;
    // The still starts climbing as they come (nobody's left feeding it, and nobody's left watching it).
    if (this.still.phase === 'idle') {
      this.still.phase = 'climbing';
      this.after(3, () => this.notify?.(data.still.watch));
    }
  }

  updateFamily(dt) {
    if (!this.spawned) return;
    this.family = this.family.filter((z) => z.holler === this.token && z.alive);
    // Put down from out of earshot before they ever came: that counts (the ridge's two still come).
    if (!this.awake && !this.family.length) this.wake();
    if (this.treesDue !== null) {
      this.treesDue -= dt;
      if (this.treesDue <= 0) {
        this.treesDue = null;
        const c = this.spot('still');
        const [r0, r1] = this.ec.familyTrees.ring;
        const p = this.player.position;
        for (let k = 0; k < this.ec.familyTrees.count; k++) {
          const a = this.rng() * Math.PI * 2;
          const r = r0 + (r1 - r0) * this.rng();
          const x = c.x + Math.sin(a) * r;
          const z = c.z + Math.cos(a) * r;
          this.spawn(x, z, 'chase', Math.atan2(p.x - x, p.z - z));
        }
        this.notify?.(data.family.trees);
      }
    }
    if (this.awake && this.treesDue === null && !this.family.length) {
      this.set('hollerFamilyDown');
      this.bus.emit('holler:familyDown');
      this.notify?.(data.family.down);
    }
  }

  // ---- the still ------------------------------------------------------------------------------

  updateStill(dt) {
    const st = this.still;
    if (st.phase === 'shut' || st.phase === 'blown' || st.phase === 'idle') return;
    const S = this.ec.still;
    st.value = gaugeStep(st.value, st.phase, dt, S);
    if (st.phase === 'bleeding' && st.value <= S.bled) st.phase = 'bled';
    this.site.setGauge(st.value);
    if (!this.warned && st.value > 0.93) {
      this.warned = true;
      this.notify?.(data.still.warn);
    }
    if (st.value >= 1) this.blow();
  }

  // A valve turned (X held at it).
  turnValve(id) {
    const S = this.ec.still;
    const st = this.still;
    const r = valveTurn(S.order, this.valves, id);
    const at = this.spot(id);
    this.sfx?.play('valveTurn', at);
    if (r === 'done') return;
    if (r === 'ok') {
      this.valves.push(id);
      if (id === 'damper') {
        if (st.phase === 'climbing' || st.phase === 'idle') st.phase = 'damped';
        this.site.show('fireGlow', false);
      } else if (id === 'relief') {
        st.phase = 'bleeding';
        this.sfx?.play('steamHiss', this.spot('gauge'));
      } else if (id === 'line') {
        st.phase = 'shut';
        st.value = Math.min(st.value, S.bled);
        this.site.setGauge(0);
        this.set('hollerStillShut');
        this.bus.emit('holler:stillShut');
        this.after(2.5, () => this.notify?.(data.still.shut));
      }
      this.notify?.(data.valves[id].done);
      return;
    }
    // Out of turn: it bucks. A gout of steam, the needle jumps.
    st.value += id === 'line' ? S.wrongLine : S.wrong;
    if (st.phase === 'idle') st.phase = 'climbing';
    this.site.setGauge(st.value);
    this.sfx?.play('steamHiss', this.spot('gauge'));
    const g = this.spot('gauge');
    const p = this.player.position;
    if (Math.hypot(p.x - g.x, p.z - g.z) < S.steamRange) this.combat.hurtPlayer(S.steamDamage, 0.6);
    this.notify?.(data.valves[id].early);
    if (st.value >= 1) this.blow();
  }

  blow() {
    if (this.still.phase === 'blown') return;
    this.still.phase = 'blown';
    this.still.value = 0;
    this.site.setGauge(0);
    this.site.show('fireGlow', false);
    this.site.show('coil', false);
    this.set('hollerStillBlown');
    const s = this.spot('still');
    this.explosives?.blast(s.x, s.y + 1.2, s.z, this.ec.blast);
    this.bus.emit('holler:stillBlown');
    this.after(1.2, () => this.notify?.(data.still.blown));
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act } (act null: only to read).
  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const H = this.ec.holds;
    const dist = (q) => (q ? Math.hypot(p.x - q.x, p.z - q.z) : Infinity);
    const opt = (key, def, seconds, act) => ({ key, prompt: `Hold ${X}: ${def.prompt}`, busy: def.busy, seconds, act });
    // A trap holding him: nothing else.
    const traps = this.traps.options(X, this.cutters);
    if (this.traps.held) return traps[0];
    const cands = traps.map((o) => ({ dd: o.dd, o }));
    const add = (q, reach, o) => {
      const dd = dist(q);
      if (dd < reach) cands.push({ dd, o });
    };
    for (const s of data.searches ?? []) {
      if (s.flag && this.has(s.flag)) continue;
      add(this.spot(s.spot), r + 0.3, opt(s.id, s, H[s.hold] ?? H.search, () => this.search(s)));
    }
    if (!this.has('wireCuttersTaken')) add(this.spot('cutters'), r + 0.2, opt('cutters', data.cutters, H.cutters, () => this.takeCutters()));
    if (!this.has('trapMapFound')) add(this.spot('trapMap'), r + 0.2, opt('trapMap', data.map, H.map, () => this.takeMap()));
    add(this.spot('note'), r + 0.3, opt('board', data.board, H.board, () => this.readBoard()));
    if (!this.has('autoShotgunTaken')) add(this.spot('cabinet'), r + 0.3, opt('cabinet', data.cabinet, H.cabinet, () => this.takeShotgun()));
    if (!this.has('hollerAmmo')) add(this.spot('ammo'), r + 0.3, opt('ammo', data.ammo, H.ammo, () => this.takeAmmo()));
    // The still's valves while it runs; the gauge to read.
    const ph = this.still?.phase;
    if (ph && ph !== 'shut' && ph !== 'blown') {
      for (const id of this.ec.still.order) {
        if (this.valves.includes(id)) continue;
        add(this.spot(id), r, opt(`valve:${id}`, data.valves[id], H.valve, () => this.turnValve(id)));
      }
      add(this.spot('still'), r + 0.4, { key: 'gauge', prompt: data.still.gauge, act: null });
    }
    // The worm: once she's shut down (or a twist of copper, if she blew).
    if (!this.has('copperCoilTaken')) {
      if (ph === 'shut') add(this.spot('coil'), r + 0.3, opt('coil', data.coil, H.coil, () => this.takeCoil()));
      else if (ph === 'blown') add(this.spot('coil'), r + 0.3, { key: 'coilBlown', prompt: data.coilBlown, act: null });
    }
    add(this.spot('sign'), r + 0.6, { key: 'sign', prompt: data.sign, act: null });
    if (!cands.length) return null;
    cands.sort((a, b) => a.dd - b.dd);
    return cands[0].o;
  }

  // ---- what each does ------------------------------------------------------------------------

  search(s) {
    this.set(s.flag);
    this.sfx?.play('pickup');
    if (s.pistol) this.giveRounds('pistol', s.pistol);
    if (s.text) this.notify?.(s.text);
  }

  giveRounds(type, n) {
    if (this.combat.weapons?.addAmmo?.(type, n)) return;
    const inv = this.combat.inventory;
    if (inv?.ammo) inv.ammo[type] = (inv.ammo[type] ?? 0) + n;
  }

  takeCutters() {
    this.set('wireCuttersTaken');
    this.site.show('cutters', false);
    this.sfx?.play('pickup');
    this.notify?.(data.cutters.text);
  }

  takeMap() {
    this.set('trapMapFound');
    this.site.show('trapMap', false);
    this.sfx?.play('paper');
    this.lore?.give('trapMap');
    const read = () => this.paper?.open('hollerTrapMap', { device: this.device, take: true });
    if (!this.card?.show('trapMap', { read, keep: () => this.notify?.('Hand it in at home and read it from the ledger') }, this.device)) read();
  }

  readBoard() {
    this.set('hollerBoard');
    this.sfx?.play('paper');
    this.paper?.open('stillBoard', { device: this.device });
  }

  takeShotgun() {
    this.set('autoShotgunTaken');
    this.site.show('autoShotgun', false);
    this.sfx?.play('pickup');
    this.combat.giveWeapon('autoShotgun', this.ec.autoShotgunShells);
    this.notify?.(data.cabinet.text);
  }

  takeAmmo() {
    this.set('hollerAmmo');
    this.sfx?.play('pickup');
    this.giveRounds('shotgun', this.ec.ammoShells);
    this.combat.hud?.pickup?.(`${this.ec.ammoShells} shotgun shells`);
    this.notify?.(data.ammo.text);
  }

  takeCoil() {
    this.set('copperCoilTaken');
    this.site.show('coil', false);
    this.sfx?.play('pickup');
    this.lore?.give('copperCoil');
    this.card?.show('copperCoil', { keep: () => this.notify?.("The still's copper worm: the dozer's flamethrower, one day") }, this.device);
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

  allFlags() {
    return [...FLAGS, ...this.hc.traps.filter((t) => !t.sprung).map((t) => trapFlag(t.id))];
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Holler: take me there (${this.still?.phase ?? '-'}, ${this.allFlags().filter((f) => this.has(f)).length}/${this.allFlags().length})`, () => {
      if (!this.ready) return;
      const a = this.site.at(0, this.cfg.map.holler.mouth - 6);
      this.player.teleport(a.x, a.z, Math.atan2(-Math.sin(this.site.place.yaw), -Math.cos(this.site.place.yaw)));
    });
    cat.addItem('Holler: take me to the still', () => {
      if (!this.ready) return;
      const s = this.spot('still');
      this.player.teleport(s.x, s.z - 1.5, this.site.place.yaw + Math.PI);
    });
    cat.addItem('Holler: start it again (flags cleared, traps set)', () => {
      for (const f of this.allFlags()) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Holler: give me the wire cutters', () => {
      this.set('wireCuttersTaken');
      this.site.show('cutters', false);
    });
    cat.addItem('Holler: wake the family', () => this.wake());
  }

  overlayLine() {
    if (!this.ready) return 'holler -';
    const st = this.still;
    return `holler ${this.traps.overlayLine()}${this.cutters ? ' cutters' : ''} still ${st.phase} ${st.value.toFixed(2)} [${this.valves.join(',')}] kin ${this.family.length}`;
  }

  dispose() {}
}
