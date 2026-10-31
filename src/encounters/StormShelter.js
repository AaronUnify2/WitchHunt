// The Pruitts' storm shelter (Session 16; DESIGN.md "Storm shelter"; the
// other half of M9.3). Earl dug it himself in a clearing on his land: a
// steel hatch on a low mound, a small, shabby room under it. Night 1's
// sigil went in beside the hatch, and its dead caught the family in the
// open.
//  1. The horde (Aaron: 12 citizens) holds the hatch through the day,
//     lingering round it; Earl stands among them (the zombie variant
//     'earl', Aaron, Session 13). They're put there as Tom comes near and
//     aren't thinned at dawn (authored).
//  2. Arrival: the establishing sweep; Wyatt's line (Earl hid it well).
//     Sets shelterVisited.
//  3. While the sigil's in the ground, more climb out of it, by day too,
//     to keep the horde topped up (Ellen, the first time: they're coming
//     up out of the ground). Dug up (the director's dig), they stop, and
//     the family work it out: the sigils are raising the dead.
//  4. Earl: once he's down his keys lie where he fell (a glint); hold X:
//     the brass tag has the gas station safe's combination
//     (earlCombination), and the family say so.
//  5. The hatch: buried under leaf litter and earth (dig it clear with the
//     shovel), then haul it open, then climb down.
//  6. The room below (Tom's platform while he's down there; the dead can't
//     reach him): the diary (read in close-up, then carried home), the
//     tapes (carried home: the cutscene at the comms room), the shelves
//     (a sure first aid kit and battery, rolled ammo and scrap), the radio
//     (static), the trail-cam photos. The first time down, Junie asks
//     where his kids are; Ellen: maybe they got away (Aaron: nothing says
//     the children died).
//  7. Climb back up the ladder.
//  8. At home: the tapes handed in at the comms room play there and then
//     (clip.pruittTape: camera four, Night 1; then on the monitors).
// The frame (StormShelter.frame): walking in from home, x right, z ahead.
// Each beat happens once; it's saved.
//
// Events: 'stormShelter:arrived', 'stormShelter:risen', 'stormShelter:sigilDug',
// 'stormShelter:earlDown', 'stormShelter:keys', 'stormShelter:hatch' { state },
// 'stormShelter:down', 'stormShelter:up', 'stormShelter:searched' { id }.

import shelterData from '../data/stormShelter.json';
import { clearingFrame, frameToWorld, frameYaw, frameAnchor } from '../world/clearingFrame.js';
import { rollLoot } from '../combat/loot.js';
import { HoldAction } from '../player/HoldAction.js';
import { StormShelterProps } from '../render/StormShelterProps.js';
import { Rng } from '../core/Rng.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const HATCH_STATES = ['buried', 'clear', 'open'];

export class StormShelter {
  constructor(cfg, bus, data = shelterData) {
    this.cfg = cfg;
    this.sc = cfg.stormShelter;
    this.bus = bus;
    this.data = data;
  }

  static frame(map) {
    return clearingFrame(map, 'stormShelter', 'home');
  }

  // Night 1's sigil spot, beside the hatch, in the world (FirstDay plants it there).
  static sigilSpot(map, data = shelterData) {
    const f = StormShelter.frame(map);
    if (!f) return null;
    return frameToWorld(f, data.sigil.x, data.sigil.z);
  }

  // The room's floor, under the hatch: `depth` down, and deep enough that
  // its ceiling is under the ground everywhere over it.
  static floorY(frame, ground, data = shelterData) {
    const r = data.room;
    const h = data.hatch;
    const hw = frameToWorld(frame, h.x, h.z);
    const hatchY = ground.heightAt(hw.x, hw.z);
    let low = hatchY;
    for (const [x, z] of [[-r.hx, -r.hz], [r.hx, -r.hz], [-r.hx, r.hz], [r.hx, r.hz], [0, 0]]) {
      const w = frameToWorld(frame, r.x + x, r.z + z);
      low = Math.min(low, ground.heightAt(w.x, w.z));
    }
    return { hatchY, floorY: Math.min(hatchY - r.depth, low - r.height - 0.45) };
  }

  // ctx: { world, player, combat, director, cutscenes, dialogue, progress,
  // lore, paper, notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ground = ctx.world.ground;
    this.frame = StormShelter.frame(ctx.world.map);
    if (!this.frame) return;
    this.enemies = ctx.combat?.enemies;
    const { hatchY, floorY } = StormShelter.floorY(this.frame, this.ground, this.data);
    this.hatchY = hatchY;
    this.floorY = floorY;
    this.hatchAt = frameToWorld(this.frame, this.data.hatch.x, this.data.hatch.z);
    const r = this.data.room;
    this.roomAt = frameToWorld(this.frame, r.x, r.z);
    this.ladderAt = this.roomPoint(r.ladder.x, r.ladder.z);
    if (scene) {
      this.props = new StormShelterProps(this.sc.look, this.data);
      this.props.init(scene, this.frame, this.ground, hatchY, floorY);
    }
    this.points = this.data.searches.map((s) => ({ ...s, ...(s.below ? this.roomPoint(s.x, s.z) : frameToWorld(this.frame, s.x, s.z)) }));
    this.lootRng = new Rng(`${this.cfg.map.cluster.seed}:shelter-loot`);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.hud = { prompt: '', progress: 0 };
    this.cutscenes?.namedAnchors?.set('stormShelter', () => frameAnchor(this.frame));
    this.reset();
    this.unsubscribers = [
      this.bus.on('player:hurt', () => this.hold.interrupt()),
      this.bus.on('enemy:killed', ({ zombie }) => this.onKilled(zombie)),
      this.bus.on('sigil:dug', ({ sigil }) => {
        if (sigil?.firstSigil) this.sigilDugUp();
      }),
      this.bus.on('stormShelter:goDown', () => this.goDown()),
      this.bus.on('stormShelter:goUp', () => this.goUp()),
      // Earl's tapes handed in at the comms room: they play there and then (camera four, Night 1).
      this.bus.on('lore:handedIn', ({ id }) => {
        if (id === 'pruittTapes') this.playTapes();
      }),
    ];
  }

  reset() {
    this.arrived = false;
    this.hordeSent = false;
    this.horde = [];
    this.earl = null;
    this.earlDown = false;
    this.keysAt = null; // where Earl fell (his keys), until they're taken
    this.keysTaken = false;
    this.sigilDug = false;
    this.risenTold = false;
    this.riseTimer = 0;
    this.hatch = 'buried';
    this.hatchOpen = 0; // 0 shut .. 1 thrown back (animated)
    this.searched = new Set();
    this.beenDown = false;
    this.digging = false; // the hatch's dig (Game shows the shovel digging)
    this.scrape = 0;
    this.props?.setHatch('buried', 0);
    this.props?.setKeys(null);
    this.props?.setTaken('diary', false);
    this.props?.setTaken('tapes', false);
  }

  // Room-local (x across, z along from the room's centre) in the world.
  roomPoint(x, z) {
    const r = this.data.room;
    return frameToWorld(this.frame, r.x + x, r.z + z);
  }

  // Tom's position in the frame: { x, z }.
  local() {
    const p = this.player.position;
    const f = this.frame;
    const dx = p.x - f.x;
    const dz = p.z - f.z;
    return { x: dx * f.rx + dz * f.rz, z: dx * f.fx + dz * f.fz };
  }

  get below() {
    return this.player?.platform?.room === 'stormShelter';
  }

  // The room as a platform for the Player: he walks its floor, kept in by
  // its walls and round its furniture (room-local boxes).
  platform() {
    const r = this.data.room;
    const f = this.frame;
    const blocks = [];
    const b = r.bunk;
    blocks.push([b.x - b.width / 2, b.x + b.width / 2, b.z - b.length / 2, b.z + b.length / 2]);
    const s = r.shelves;
    blocks.push([s.x - s.depth / 2, s.x + s.depth / 2 + 0.2, s.z - s.length / 2, s.z + s.length / 2]);
    const t = r.table;
    blocks.push([t.x - t.w / 2, t.x + t.w / 2, t.z - t.d / 2, t.z + t.d / 2]);
    return { room: 'stormShelter', x: this.roomAt.x, z: this.roomAt.z, y: this.floorY, half: Math.max(r.hx, r.hz), hx: r.hx, hz: r.hz, rx: f.rx, rz: f.rz, fx: f.fx, fz: f.fz, roofY: r.height, blocks };
  }

  // ---- each frame -----------------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    this.props?.update(dt);
    if (!this.frame) return;
    this.animateHatch(dt);
    if (!playing) {
      this.hud.prompt = '';
      this.digging = false;
      return;
    }
    const l = this.local();
    const d = Math.hypot(l.x, l.z);
    if (!this.hordeSent && d < this.frame.radius + this.sc.hordeDistance) this.sendHorde();
    if (!this.arrived && d <= this.frame.radius - this.sc.arriveInset && !this.below) this.arrive();
    this.updateRising(dt);
    if (canInteract && input) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.digging = false;
      this.hold.update(dt, null, false, 1);
    }
  }

  // ---- the horde ------------------------------------------------------------------------------------

  sigil() {
    return this.director?.sigils?.list.find((s) => s.firstSigil) ?? null;
  }

  // The twelve round the hatch, and Earl on it: there before Tom can see them (no rising).
  sendHorde() {
    this.hordeSent = true;
    if (!this.enemies) return;
    const linger = { ...this.hatchAt, r: this.data.lingerRadius };
    if (!this.sigilDug) {
      for (const [x, z] of this.data.horde.slice(0, this.sc.horde.count)) {
        const w = frameToWorld(this.frame, x, z);
        const out = [];
        this.enemies.spawnPlanned({ type: 'single', count: 1 }, w.x, w.z, { ringMin: 0, ringMax: 0.8, mix: { citizen: 1 }, mode: 'linger', linger, rise: false, out });
        for (const z0 of out) z0.authored = 'stormShelter';
        this.horde.push(...out);
      }
    }
    if (!this.earlDown) this.placeEarl();
  }

  placeEarl() {
    const e = this.data.earl;
    const w = frameToWorld(this.frame, e.x, e.z);
    const z = this.enemies.spawnZombie(w.x, w.z, { variant: 'earl', mode: 'linger', linger: { ...this.hatchAt, r: 1.6 }, facing: frameYaw(this.frame, e.yaw), authored: 'stormShelter' });
    if (z) this.earl = z;
  }

  // While the sigil's in the ground the dead climb out of it, by day too, to keep the horde up.
  updateRising(dt) {
    if (this.sigilDug || !this.hordeSent || !this.enemies) return;
    const s = this.sigil();
    if (!s) return;
    const p = this.player.position;
    if (Math.hypot(p.x - s.x, p.z - s.z) > this.sc.horde.riseRange) return;
    this.horde = this.horde.filter((z) => z.alive);
    if (this.horde.length >= this.sc.horde.count) {
      this.riseTimer = 0;
      return;
    }
    this.riseTimer += dt;
    if (this.riseTimer < this.sc.horde.riseEvery) return;
    this.riseTimer = 0;
    const out = [];
    this.enemies.spawnPlanned({ type: 'single', count: 1 }, s.x, s.z, { ringMin: 0.6, ringMax: 2, mix: { citizen: 1 }, mode: 'linger', linger: { ...this.hatchAt, r: this.data.lingerRadius }, rise: true, out });
    for (const z of out) {
      z.authored = 'stormShelter';
      this.enemies.brain.chase(z, p.x, p.z, this.sc.horde.memory);
    }
    this.horde.push(...out);
    this.bus.emit('stormShelter:risen');
    if (!this.risenTold && out.length) {
      this.risenTold = true;
      this.dialogue?.play('shelter.rising');
    }
  }

  onKilled(zombie) {
    const i = this.horde.indexOf(zombie);
    if (i >= 0) this.horde.splice(i, 1);
    if (zombie === this.earl) this.earlFell(zombie);
  }

  earlFell(z) {
    this.earl = null;
    this.earlDown = true;
    this.keysAt = { x: z.x, z: z.z };
    this.props?.setKeys(this.keysAt);
    this.progress?.setFlag('earlDown');
    this.bus.emit('stormShelter:earlDown');
    this.dialogue?.play('shelter.earl');
  }

  sigilDugUp() {
    if (this.sigilDug) return;
    this.sigilDug = true;
    this.progress?.setFlag('shelterSigilDug');
    this.bus.emit('stormShelter:sigilDug');
    // Aaron: they stopped coming up the moment it was dug: the sigils are raising the dead.
    this.dialogue?.play(this.risenTold ? 'shelter.dug.wyatt' : 'shelter.dug.wyattQuiet');
    this.dialogue?.play('shelter.dug.ellen');
  }

  // ---- the arrival --------------------------------------------------------------------------------------

  arrive() {
    this.arrived = true;
    this.progress?.setFlag('shelterVisited');
    this.bus.emit('stormShelter:arrived');
    if (!this.hordeSent) this.sendHorde();
    if (!this.cutscenes?.active && this.cutscenes?.play('sweep.shelter', { anchors: { stormShelter: frameAnchor(this.frame) } })) return;
    this.dialogue?.play('shelter.arrive');
  }

  // ---- the hatch -------------------------------------------------------------------------------------

  animateHatch(dt) {
    const target = this.hatch === 'open' ? 1 : 0;
    if (this.hatchOpen === target) return;
    this.hatchOpen = Math.max(0, Math.min(1, this.hatchOpen + Math.sign(target - this.hatchOpen) * dt * 0.9));
    this.props?.setHatch(this.hatch, this.hatchOpen);
  }

  setHatch(state) {
    this.hatch = state;
    this.props?.setHatch(state, this.hatchOpen);
    this.bus.emit('stormShelter:hatch', { state });
  }

  digHatch() {
    this.combat?.sfx?.play('dig');
    this.setHatch('clear');
    this.notify?.('The hatch is clear. Rusted, but the padlock hangs open.');
  }

  openHatch() {
    this.combat?.sfx?.play('door', this.hatchAt);
    this.setHatch('open');
    if (!this.progress?.has('shelterOpened')) {
      this.progress?.setFlag('shelterOpened');
      if (!this.sigilDug) this.dialogue?.play('shelter.openFirst'); // allowed, but the family nudge Tom to finish the job
    }
  }

  // Down the ladder: a short fade, and Tom's in the room.
  climbDown() {
    // The fade's emit puts him down at its darkest; onDone too, if it's skipped.
    if (this.cutscenes?.play('shelter.down', { onDone: () => this.goDown() })) return;
    this.goDown();
  }

  goDown() {
    if (this.below) return;
    const l = this.ladderAt;
    const pl = this.platform();
    const r = this.data.room;
    // On the floor at the ladder's foot, facing into the room.
    const step = this.roomPoint(r.ladder.x, r.ladder.z + 0.45);
    this.player.setPlatform(pl, step.x, step.z);
    this.player.yaw = Math.atan2(-this.frame.fx, -this.frame.fz);
    this.player.pitch = -0.1;
    this.combat?.sfx?.play('door', l);
    this.arrived = true; // (down by the debug menu: no arrival sweep on the way back up)
    this.bus.emit('stormShelter:down');
    if (!this.beenDown) {
      this.beenDown = true;
      this.progress?.setFlag('shelterEntered');
      // Aaron: nothing says the children died; maybe they got away.
      this.dialogue?.play('shelter.below.junie');
      this.dialogue?.play('shelter.below.ellen');
    }
  }

  climbUp() {
    if (this.cutscenes?.play('shelter.up', { onDone: () => this.goUp() })) return;
    this.goUp();
  }

  goUp() {
    if (!this.below) return;
    // Out beside the hatch, on the near side, facing back out the way he came in.
    const h = this.data.hatch;
    const out = frameToWorld(this.frame, h.x, h.z - h.d / 2 - 0.9);
    this.player.setPlatform(null, out.x, out.z);
    this.player.yaw = Math.atan2(this.frame.fx, this.frame.fz);
    this.bus.emit('stormShelter:up');
  }

  // ---- interactions ----------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.digging = this.hold.active && this.hold.key === 'hatch-dig';
    if (this.digging) {
      this.scrape -= dt;
      if (this.scrape <= 0) {
        this.combat?.sfx?.play('dig');
        this.scrape = this.cfg.digging.scrapeInterval;
      }
    }
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act } (act null: information only).
  pick(X) {
    const p = this.player.position;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const h = this.sc.hold;
    if (this.below) {
      // At the ladder's foot, the ladder comes first (the radio's close by).
      if (dist(this.ladderAt) < 0.7) return { key: 'climb-up', prompt: `Hold ${X}: climb the ladder`, busy: 'Climbing…', seconds: h.climbUp, act: () => this.climbUp() };
      let best = null;
      let bestD = this.sc.roomRange;
      for (const pt of this.points) {
        if (!pt.below || this.searched.has(pt.id)) continue;
        const d = dist(pt);
        if (d < bestD) {
          best = pt;
          bestD = d;
        }
      }
      if (best) return { key: best.id, prompt: `Hold ${X}: ${best.label}`, busy: best.id.startsWith('shelf') ? 'Searching…' : null, seconds: best.seconds ?? 1, act: () => this.search(best) };
      if (dist(this.ladderAt) < 1.0) return { key: 'climb-up', prompt: `Hold ${X}: climb the ladder`, busy: 'Climbing…', seconds: h.climbUp, act: () => this.climbUp() };
      return null;
    }
    if (this.keysAt && !this.keysTaken && dist(this.keysAt) < this.sc.keysRange) {
      return { key: 'keys', prompt: `Hold ${X}: take Earl's keys`, seconds: h.keys, act: () => this.takeKeys() };
    }
    if (dist(this.hatchAt) < this.sc.interactRange) {
      if (this.hatch === 'buried') {
        if (!this.combat?.weapons?.order.includes('shovel')) return { key: 'hatch-info', prompt: 'A steel hatch, buried under leaf litter and earth. You need a shovel', act: null };
        return { key: 'hatch-dig', prompt: `Hold ${X}: dig the hatch clear`, busy: 'Digging…', seconds: h.digHatch, act: () => this.digHatch() };
      }
      if (this.hatch === 'clear') return { key: 'hatch-open', prompt: `Hold ${X}: haul the hatch open`, busy: 'Hauling…', seconds: h.openHatch, act: () => this.openHatch() };
      if (this.hatchOpen > 0.9) return { key: 'climb-down', prompt: `Hold ${X}: climb down`, busy: 'Climbing…', seconds: h.climbDown, act: () => this.climbDown() };
    }
    return null;
  }

  takeKeys() {
    this.keysTaken = true;
    this.props?.setKeys(null);
    this.combat?.sfx?.play('pickup');
    this.combat?.hud?.pickup?.("Earl's keys (a brass tag: the safe's combination)");
    this.progress?.setFlag('earlCombination');
    this.bus.emit('stormShelter:keys');
    this.dialogue?.play('shelter.keys.wyatt');
    this.dialogue?.play('shelter.keys.ellen');
  }

  search(pt) {
    const repeatable = pt.id === 'photos' || pt.id === 'radio';
    if (!repeatable) this.searched.add(pt.id);
    switch (pt.id) {
      case 'diary':
        this.props?.setTaken('diary', true);
        this.lore?.give('pruittDiary');
        if (!this.paper?.open('earlDiary', { device: this.device, onClose: () => this.dialogue?.play('shelter.diary') })) this.dialogue?.play('shelter.diary');
        break;
      case 'tapes':
        this.props?.setTaken('tapes', true);
        this.lore?.give('pruittTapes');
        this.dialogue?.play('shelter.tapes');
        break;
      case 'radio':
        this.combat?.sfx?.play('radioStatic');
        this.notify?.('A battery radio. Static on every channel.');
        break;
      case 'photos':
        this.notify?.('Trail-cam photos. Empty woods, night after night. In one, a pale smear low to the ground, too fast to make out.');
        if (!this.searched.has('photosSeen')) {
          this.searched.add('photosSeen');
          this.dialogue?.play('shelter.photos');
        }
        break;
      default:
        this.loot(pt);
    }
    this.bus.emit('stormShelter:searched', { id: pt.id });
  }

  loot(pt) {
    let any = false;
    for (const g of pt.gives ?? []) any = this.give(g.item, g.amount ?? 1, pt) || any;
    for (const { item, amount } of rollLoot(pt.loot ?? [], this.lootRng)) any = this.give(item, amount, pt) || any;
    if (!any) {
      this.combat?.hud.pickup('Nothing useful');
      this.combat?.sfx.play('denied');
    }
  }

  // Into Tom's pockets; a battery (not a pickup item) straight into the
  // inventory; what he can't carry (first aid, full) is left on the floor.
  give(item, amount, pt) {
    if (!this.combat) return false;
    if (item === 'battery') {
      this.combat.inventory.addBattery(amount);
      this.combat.hud.pickup(`+${amount} battery (${this.combat.inventory.batteries} carried)`);
      this.combat.sfx.play('pickup');
      return true;
    }
    if (this.combat.takePickup(item, amount)) return true;
    this.combat.pickups?.drop(item, amount, pt.x, this.floorY, pt.z, 0);
    return true;
  }

  // The tapes at home: the ledger closes and the family watch camera four (the clip has their lines).
  playTapes() {
    this.lore?.ledger?.close?.();
    this.cutscenes?.play('clip.pruittTape');
  }

  // ---- saving ------------------------------------------------------------------------------------------

  saveState() {
    return {
      arrived: this.arrived,
      earlDown: this.earlDown,
      keysAt: this.keysTaken ? null : this.keysAt,
      keysTaken: this.keysTaken,
      sigilDug: this.sigilDug,
      risenTold: this.risenTold,
      hatch: this.hatch,
      searched: [...this.searched],
      beenDown: this.beenDown,
    };
  }

  // The horde isn't saved: it's there again as Tom comes near while the sigil's still in the ground.
  loadState(d) {
    if (!d) return;
    this.reset();
    this.arrived = Boolean(d.arrived);
    this.earlDown = Boolean(d.earlDown);
    this.keysTaken = Boolean(d.keysTaken);
    this.keysAt = !this.keysTaken && d.keysAt && Number.isFinite(d.keysAt.x) ? d.keysAt : this.earlDown && !this.keysTaken ? { ...this.hatchAt } : null;
    this.props?.setKeys(this.keysAt);
    this.sigilDug = Boolean(d.sigilDug);
    this.risenTold = Boolean(d.risenTold);
    this.hatch = HATCH_STATES.includes(d.hatch) ? d.hatch : 'buried';
    this.hatchOpen = this.hatch === 'open' ? 1 : 0;
    this.props?.setHatch(this.hatch, this.hatchOpen);
    this.searched = new Set(d.searched ?? []);
    this.beenDown = Boolean(d.beenDown);
    this.props?.setTaken('diary', this.searched.has('diary'));
    this.props?.setTaken('tapes', this.searched.has('tapes'));
  }

  // ---- debug -------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    if (!this.frame) return;
    const cat = menu.category(DEBUG.firstDay);
    const f = this.frame;
    const tp = (x, z, facing, text) => () => {
      const w = frameToWorld(f, x, z);
      this.player.teleport(w.x, w.z, facing);
      this.notify(text);
    };
    const ahead = Math.atan2(-f.fx, -f.fz);
    cat.addItem('Storm shelter: teleport to the path in', tp(0, -f.radius - 6, ahead, 'On the path into the storm shelter'));
    cat.addItem('Storm shelter: teleport beside the hatch', tp(this.data.hatch.x, this.data.hatch.z - 1.6, ahead, 'Beside the storm shelter hatch'));
    cat.addItem('Storm shelter: down into the room', () => {
      if (this.hatch !== 'open') {
        this.hatch = 'open';
        this.hatchOpen = 1;
        this.props?.setHatch('open', 1);
      }
      this.goDown();
    });
    cat.addItem('Storm shelter: put Earl down (his keys at the hatch)', () => {
      if (!this.hordeSent) this.sendHorde();
      if (this.earl?.alive) this.enemies.damage(this.earl, 1e6, 'body', {}, this.earl, this.earl);
      else if (!this.earlDown) this.earlFell({ ...this.hatchAt });
    });
    cat.addItem('Storm shelter: reset it (as Tom first finds it)', () => {
      for (const z of this.horde) if (z.alive) this.enemies.damage(z, 1e6, 'body', {}, z, z);
      if (this.earl?.alive) this.enemies.damage(this.earl, 1e6, 'body', {}, this.earl, this.earl);
      if (this.below) this.goUp();
      this.reset();
      this.notify('The storm shelter is as Tom first finds it (the sigil as it is)');
    });
  }

  overlayLine() {
    if (!this.frame) return '';
    const up = this.horde.filter((z) => z.alive).length;
    return `shelter ${this.arrived ? 'visited' : 'unvisited'} horde ${up} earl ${this.earlDown ? (this.keysTaken ? 'keys' : 'down') : this.earl ? 'up' : '-'} sigil ${this.sigilDug ? 'dug' : this.sigil() ? 'in' : '-'} hatch ${this.hatch}${this.below ? ' BELOW' : ''} searched ${this.searched.size}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.props?.dispose();
  }
}
