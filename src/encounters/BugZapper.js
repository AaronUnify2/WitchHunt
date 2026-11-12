// The bug-zapper night at the station (build queue item 2; story spine, beat
// 7, stage 1; DESIGN.md "Bigfoot cave and the Mothman fight"). SCAFFOLDING:
// the beat plays from start to end with draft lines and two short placeholder
// scenes; the fight's feel is for the encounter's own design session.
//
//  1. Ready: with the dozer home and the fence holding enough (config
//     needCharge), a prompt in the yard (spot): fire the lure flares. If
//     it isn't night yet the clock goes to night. The lure flares go up
//     (zapper.flares). Flag zapperStarted.
//  2. The Mothman comes (ai/Flyer.js, unbeatable, Tom's health floored at
//     10%): flyovers, then dives. Wyatt fires from the tower now and then
//     (a crack, a line; it does nothing to it yet), Junie calls its dives.
//  3. The hook: on the dozer, B at it while it's inside the winch's reach
//     (world/Dozer.js winchExtras). Hooked (mothmanHooked), it thrashes
//     round the dozer on the cable (Flyer.tether) and can be hurt: Tom's
//     guns (he has to get down to shoot), and Wyatt's rifle from the tower
//     every few seconds, so it always ends.
//  4. Down: it falls on the fence (zapper.fence): the fence's charge goes to
//     zero, it tears free and flies north. Ellen puts its path on Earl's
//     maps: the cave. Flag mothmanZapped.
//
// Saved through story flags (zapperStarted, mothmanHooked, mothmanZapped). A
// fight under way when the run's saved starts again from the flares. Off in
// Demo mode.
//
// Events: 'zapper:started', 'zapper:hooked', 'zapper:zapped'.

import { HoldAction } from '../player/HoldAction.js';
import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// Can the night be called: the dozer home, the fence holding `need` of its capacity, not done already.
// Returns null (yes) or the reason it can't, in words for the prompt.
export function zapperBlocked({ dozerHome, charge, capacity, need, started }) {
  if (started) return 'started';
  if (!dozerHome) return 'The dozer has to be home first';
  const want = Math.round(capacity * need);
  if (charge < want) return `The fence is at ${Math.round(charge)} of ${capacity}. It needs ${want} before you call that thing down`;
  return null;
}

// A spot in the yard: `out` metres from the cabin's door toward the fence box (or halfway, if they're close).
export function yardSpot(door, box, out) {
  const dx = box.x - door.x;
  const dz = box.z - door.z;
  const d = Math.hypot(dx, dz) || 1;
  const k = Math.min(out, d / 2) / d;
  return { x: door.x + dx * k, z: door.z + dz * k };
}

// Wyatt's rifle: is a shot due? t: seconds since the last. every: [a, b]; r: 0..1.
export function wyattShotDue(t, every, r) {
  return t >= every[0] + (every[1] - every[0]) * r;
}

export const ZAPPER_FLAGS = ['zapperStarted', 'mothmanHooked', 'mothmanZapped'];

export class BugZapper {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.bugZapper;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { player, combat, station, dozer, flyer, clock, cutscenes, dialogue, subtitles, progress, demo,
  // notify, sfx, skipToNight(), rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    // What the dozer's hook can take while the fight's on.
    this.hookable = { active: false, name: 'the Mothman', x: 0, y: 0, z: 0, slack: this.ec.hookSlack, onHook: () => this.hooked() };
    this.dozer?.winchExtras?.push(this.hookable);
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // As the flags say. A fight that was on starts over from the flares.
  reset() {
    this.state = this.has('mothmanZapped') ? 'done' : 'idle';
    this.timer = 0;
    this.shotTimer = 0;
    this.shotGap = 0.5;
    this.hookable.active = false;
    this.combat?.clearHealthFloor?.('bugZapper');
    if (!this.has('mothmanZapped')) {
      this.progress?.setFlag('zapperStarted', false);
      this.progress?.setFlag('mothmanHooked', false);
    }
  }

  // Where the flares are fired from: open yard between the cabin's door and the fence box, clear of both
  // (the station's own prompts live at each). A placeholder: nothing marks it but the goal's star.
  get spot() {
    const L = this.station.layout;
    return yardSpot(L.cabin.frontDoor, L.fenceBox, this.ec.spotFromDoor);
  }

  get blocked() {
    const s = this.station.state;
    return zapperBlocked({ dozerHome: this.has('dozerHome'), charge: s.charge, capacity: s.capacity, need: this.ec.needCharge, started: this.state !== 'idle' });
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (this.demo?.active || !this.station) return;
    if (playing) this.updateFight(dt);
    const at = this.spot;
    const p = this.player.position;
    const near = Math.hypot(p.x - at.x, p.z - at.z) < this.ec.promptRange;
    if (canInteract && input && playing && near && this.state === 'idle' && this.has('dozerHome') && !this.player.riding) {
      const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
      const why = this.blocked;
      const done = this.hold.update(dt, why ? null : 'zapper', input.isDown('interact'), 1.2);
      if (done && !why) this.start();
      this.hud.prompt = why ?? `Hold ${X}: fire the lure flares (tell the family it's time)`;
      this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
    } else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  // 1: the flares.
  start() {
    if (this.state !== 'idle') return;
    this.state = 'flares';
    this.set('zapperStarted');
    if (this.clock?.phase !== 'night') this.skipToNight?.();
    this.bus.emit('zapper:started');
    const p = { x: this.player.position.x, z: this.player.position.z };
    this.cutscenes?.namedAnchors?.set('zapperYard', () => ({ x: p.x, z: p.z, yaw: 0 }));
    const go = () => this.arrive();
    if (!this.cutscenes?.play('zapper.flares', { onDone: go })) go();
  }

  // 2: it comes.
  arrive() {
    this.state = 'fight';
    this.timer = 0;
    this.combat.setHealthFloor('bugZapper', this.ec.floor, null);
    this.flyer.send({ script: this.ec.script, story: true, unbeatable: true });
    this.hookable.active = true;
    this.dialogue?.play('zapper.come.junie');
    this.notify?.('Get on the dozer. When it comes in close, hook it (B at it)');
  }

  updateFight(dt) {
    if (this.state !== 'fight' && this.state !== 'hooked') return;
    if (this.cutscenes?.active) return;
    this.timer += dt;
    const f = this.flyer;
    this.hookable.x = f.p.x;
    this.hookable.y = f.p.y;
    this.hookable.z = f.p.z;
    // It left by itself (it shouldn't: it's unbeatable): bring it back.
    if (!f.active && this.state === 'fight') {
      f.send({ script: this.ec.script, story: true, unbeatable: true });
      return;
    }
    // Wyatt, from the tower.
    this.shotTimer += dt;
    if (wyattShotDue(this.shotTimer, this.ec.wyattEvery, this.shotGap)) {
      this.shotTimer = 0;
      this.shotGap = this.rng();
      const t = this.station.layout.tower;
      this.sfx?.play('greyShot', { x: t.x, z: t.z });
      if (this.state === 'hooked') f.hit(this.ec.wyattDamage);
      else if (!this.wyattSaid) {
        this.wyattSaid = true;
        this.dialogue?.play('zapper.miss.wyatt');
      }
    }
  }

  // 3: on the cable.
  hooked() {
    if (this.state !== 'fight') return;
    this.state = 'hooked';
    this.timer = 0;
    this.set('mothmanHooked');
    this.hookable.slack = 3; // the cable stays on it wherever it thrashes
    const d = this.dozer;
    const T = this.ec.tether;
    this.flyer.tether({ x: d.x, y: d.y, z: d.z }, { radius: T.radius, height: T.height, speed: T.speed, health: this.ec.hookedHealth, onDown: () => this.down() });
    this.dialogue?.play('zapper.hooked.wyatt');
    this.notify?.("It's on the cable. Shoot it (get down off the dozer to use your guns)");
    this.bus.emit('zapper:hooked');
  }

  // 4: onto the fence.
  down() {
    if (this.state !== 'hooked') return;
    this.state = 'zap';
    this.hookable.active = false;
    this.combat.clearHealthFloor('bugZapper');
    const f = this.flyer;
    const at = { x: f.p.x, z: f.p.z };
    f.stop();
    if (this.dozer) this.dozer.winch = null;
    const L = this.station.layout;
    // The fence nearest where it was: the scene looks there.
    const a = Math.atan2(at.x - L.centre.x, at.z - L.centre.z);
    const fence = { x: L.centre.x + Math.sin(a) * L.radius, z: L.centre.z + Math.cos(a) * L.radius };
    this.cutscenes?.namedAnchors?.set('zapperFence', () => ({ x: fence.x, z: fence.z, yaw: 0, dy: 2.2 }));
    const after = () => this.zapped();
    if (!this.cutscenes?.play('zapper.fence', { onDone: after })) after();
  }

  zapped() {
    if (this.has('mothmanZapped')) return;
    const s = this.station.state;
    s.charge = 0; // every volt of it, through the Mothman
    this.station.renderer?.pulseWire?.();
    this.set('mothmanZapped');
    this.state = 'done';
    this.notify?.('The fence is dead: 0 charge. It tore itself free and flew north');
    this.dialogue?.play('zapper.after.ellen');
    this.bus.emit('zapper:zapped');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The bug-zapper night: ${this.state} (select: fill the fence and start it now)`, () => {
      this.progress?.setFlag('dozerHome');
      const s = this.station.state;
      s.charge = s.capacity;
      this.start();
    });
    cat.addItem('The bug-zapper night: hook it now', () => this.hooked());
    cat.addItem('The bug-zapper night: bring it down now', () => {
      if (this.state === 'fight') this.hooked();
      this.down();
    });
    cat.addItem('The bug-zapper night: start it again (flags cleared)', () => {
      for (const f of ZAPPER_FLAGS) this.progress?.setFlag(f, false);
      this.flyer?.active && this.flyer.stop();
      this.reset();
    });
  }

  overlayLine() {
    return `zapper ${this.state}${this.state === 'hooked' ? ` ${Math.max(0, Math.round(this.flyer.health))}` : ''}`;
  }
}
