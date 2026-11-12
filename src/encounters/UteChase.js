// The ute chase and the garage (build queue item 7; story spine, beat 10,
// second half; DESIGN.md "The Car Armory, Sheriff and the ute", "The
// garage"). SCAFFOLDING: the beat plays from start to end with draft lines;
// the chase's route and set pieces, Sheriff's wound, the garage as a place
// and his real list of upgrades are for the encounter's own design session.
//
//  1. The ute stands in the Car Armory's motor pool (world/Ute.js, in the
//     story now: locked until Sheriff's out of his cage, and saved).
//  2. Tom gets in (uteTaken): Sheriff's on the gun in the tray. The base
//     pours after them: Men in Black, dead, in waves round the ute for as
//     long as it's within the chase's reach of the base. Sheriff's gun takes
//     the nearest, shot after shot. Tom only drives.
//  3. Clear of the base (uteEscaped): the last of them falls behind. Sheriff
//     has been hit: he's down in the tray, and won't ride there again.
//  4. Home (sheriffHome): the ute inside or beside the fence. The garage
//     stands outside the gate (three bays; a first-pass shed), Sheriff in it.
//     The turret from the Armory is set up and loaded.
//  5. His upgrades: hold X at him in the garage: a first list, bought with
//     scrap, each once (config.uteChase.upgrades; flags sheriffUpgrade1-3).
//
// Saved through story flags; the ute's place by the Ute (Game: save.ute).
// A chase under way when the run's saved starts again from the motor pool.
// Off in Demo mode.
//
// Events: 'ute:taken', 'ute:escaped', 'sheriff:home', 'sheriff:upgrade' { id }.

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';
import { bakeParts } from '../render/propKit.js';
import { SetBuilder } from '../render/setBuilder.js';
import { UTE } from '../render/uteModel.js';
import { dozerIsHome } from './CordonDozer.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const UTE_FLAGS = ['uteTaken', 'uteEscaped', 'sheriffHome', 'sheriffUpgrade1', 'sheriffUpgrade2', 'sheriffUpgrade3'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// Which of the dead does the tray's gun take next: the nearest alive within range, or null.
export function gunTarget(from, list, range) {
  let best = null;
  let bestD = range;
  for (const z of list) {
    if (!z.alive) continue;
    const d = Math.hypot(z.x - from.x, z.z - from.z);
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}

// How many more to send this wave: `perWave`, but never past `cap` alive round the ute.
export function chaseWave(alive, perWave, cap) {
  return Math.max(0, Math.min(perWave, cap - alive));
}

// Where the garage stands (pure): outside the fence on the gate's side, `out` metres past the wire and `side`
// metres along it, its bays facing the gate's road. L: the station's layout ({ centre, radius, gate: { mid } }).
export function garagePlace(L, out, side) {
  const gx = L.gate.mid.x - L.centre.x;
  const gz = L.gate.mid.z - L.centre.z;
  const l = Math.hypot(gx, gz) || 1;
  const ox = gx / l;
  const oz = gz / l;
  const r = L.radius + out;
  return { x: L.centre.x + ox * r - oz * side, z: L.centre.z + oz * r + ox * side, yaw: Math.atan2(-oz, ox) };
}

// The next upgrade he can sell: the first not yet bought, or null. bought(i): is upgrade i bought?
export function nextUpgrade(list, bought) {
  const i = list.findIndex((_, k) => !bought(k));
  return i < 0 ? null : { index: i, ...list[i] };
}

export class UteChase {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.uc = cfg.uteChase;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, ground, colliders, armory (CarArmory), ute, player, combat, enemies, station, dialogue,
  // subtitles, progress, demo, notify, sfx, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.buildGarage();
    this.bus.on('ute:mounted', () => this.onMounted());
    this.bus.on('armory:freed', () => this.unlock());
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.armory?.ready && this.ute);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // As the flags say. The ute waits in the motor pool until it's been driven clear; a chase left unfinished
  // starts again from there.
  reset() {
    this.state = this.has('sheriffHome') ? 'home' : this.has('uteEscaped') ? 'escaped' : 'idle';
    this.t = 0;
    this.waveIn = 0;
    this.shotIn = 0;
    if (!this.has('uteEscaped')) this.progress?.setFlag('uteTaken', false);
    if (!this.ready) return;
    const u = this.ute;
    if (!this.has('uteEscaped')) {
      if (!u.riding) {
        const s = this.armory.site.spots.ute;
        const gate = this.armory.site.spots.gate;
        u.place(s.x, s.z, Math.atan2(-(gate.x - s.x), -(gate.z - s.z))); // its nose at the gate: straight out is the way out
      }
      u.locked = !this.has('sheriffFreed');
    } else {
      u.locked = false;
      if (u.stored && this.last) u.place(this.last.x, this.last.z, this.last.heading);
    }
    this.garage.visible = this.has('sheriffHome');
    this.setGarageSolid(this.has('sheriffHome'));
    if (this.has('sheriffHome')) this.settle();
  }

  unlock() {
    if (this.ute) this.ute.locked = false;
  }

  // ---- the garage (a first-pass shed: three bays under one roof, open-fronted) --------------

  buildGarage() {
    if (!this.scene || !this.station) return;
    const look = { colors: this.uc.garage.colors };
    const b = new SetBuilder(look, null, 51);
    const c = look.colors;
    const G = this.uc.garage;
    const w = G.bays * G.bayWidth;
    b.box(w + 0.6, 0.1, G.depth + 0.6, c.slab, 0, 0.05, 0);
    b.box(w + 0.4, G.height, 0.2, c.wall, 0, G.height / 2, G.depth / 2);
    for (let i = 0; i <= G.bays; i++) {
      const x = -w / 2 + i * G.bayWidth;
      b.box(0.2, G.height, i === 0 || i === G.bays ? G.depth : 0.2, c.wall, x, G.height / 2, i === 0 || i === G.bays ? 0 : -G.depth / 2 + 0.1);
    }
    b.box(w + 1.2, 0.16, G.depth + 1.4, c.roof, 0, G.height + 0.08, -0.3, 0, 0.06);
    // Sheriff's bench along the back of the end bay, and a few of his things.
    b.box(G.bayWidth - 0.8, 0.08, 0.7, c.bench, w / 2 - G.bayWidth / 2, 0.9, G.depth / 2 - 0.55);
    for (const x of [-1.2, 1.2]) b.box(0.08, 0.9, 0.08, c.wall, w / 2 - G.bayWidth / 2 + x, 0.45, G.depth / 2 - 0.55);
    b.box(0.5, 0.3, 0.35, c.tool, w / 2 - G.bayWidth / 2 - 0.6, 1.1, G.depth / 2 - 0.55);
    b.box(0.3, 0.5, 0.3, c.glowOff, w / 2 - G.bayWidth / 2 + 0.7, 1.2, G.depth / 2 - 0.5);
    const geometry = bakeParts(b.parts, { weather: null, seed: 51 });
    this.garage = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.garage.name = 'garage';
    this.garage.castShadow = true;
    this.garage.receiveShadow = true;
    const at = garagePlace(this.station.layout, G.out, G.side);
    this.garageAt = at;
    this.garage.position.set(at.x, this.ground.heightAt(at.x, at.z), at.z);
    this.garage.rotation.y = at.yaw;
    this.garage.visible = false;
    this.scene.add(this.garage);
    // Solid: its back and its two ends (off until it's there).
    const local = (x, z) => ({ x: at.x + x * Math.cos(at.yaw) + z * Math.sin(at.yaw), z: at.z - x * Math.sin(at.yaw) + z * Math.cos(at.yaw) });
    const seg = (ax, az, bx, bz) => {
      const a = local(ax, az);
      const q = local(bx, bz);
      const base = this.ground.heightAt(at.x, at.z);
      return { seg: true, ax: a.x, az: a.z, bx: q.x, bz: q.z, t: 0.2, x: (a.x + q.x) / 2, z: (a.z + q.z) / 2, r: Math.hypot(q.x - a.x, q.z - a.z) / 2 + 0.2, base: base - 1, top: base + G.height, blocksShots: true, off: true, what: 'garage' };
    };
    this.garageWalls = [seg(-w / 2, G.depth / 2, w / 2, G.depth / 2), seg(-w / 2, -G.depth / 2, -w / 2, G.depth / 2), seg(w / 2, -G.depth / 2, w / 2, G.depth / 2)];
    for (const c2 of this.garageWalls) this.colliders?.insert(c2);
    this.sheriffSpot = local(w / 2 - G.bayWidth / 2, G.depth / 2 - 1.6);
    this.bays = [local(-w / 2 + G.bayWidth / 2, 0), local(0, 0)];
  }

  setGarageSolid(on) {
    for (const c of this.garageWalls ?? []) c.off = !on;
  }

  // Home for good: Sheriff at his bench, the turret up.
  settle() {
    const s = this.armory?.sheriff;
    if (s && this.sheriffSpot) {
      s.x = this.sheriffSpot.x;
      s.z = this.sheriffSpot.z;
      s.y = this.ground.heightAt(s.x, s.z) + 0.1;
      s.facing = this.garageAt.yaw + Math.PI;
      s.state = 'examine';
      this.armory.sheriffAway = true; // (the Car Armory stops placing him; it still draws him only near the base)
    }
    const st = this.station?.state;
    if (st?.turret && this.has('turretFound') && !st.turret.installed) {
      st.turret.available = true;
      st.turret.installed = true;
      st.turret.rounds = Math.max(st.turret.rounds, this.uc.turretRounds);
    }
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const u = this.ute;
    if (!u.stored) this.last = { x: u.x, z: u.z, heading: u.heading };
    if (playing) this.updateChase(dt);
    // Sheriff, wherever the story has him: in the tray while the ute's his, at his bench once home.
    this.placeSheriff(dt);
    const best = canInteract && input && playing && !this.player.riding ? this.pick(input.activeDevice === 'gamepad' ? 'X' : 'E') : null;
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, Boolean(input?.isDown('interact')) && Boolean(best), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  onMounted() {
    if (!this.ready || this.has('uteTaken') || !this.has('sheriffFreed') || this.ute.locked) return;
    this.set('uteTaken');
    this.state = 'chase';
    this.t = 0;
    this.waveIn = this.uc.chase.firstWave;
    this.dialogue?.play('ute.go.sheriff');
    this.notify?.('Sheriff is on the gun. Drive. Out of the gate and do not stop');
    this.bus.emit('ute:taken');
  }

  updateChase(dt) {
    const u = this.ute;
    const C = this.uc.chase;
    if (this.state === 'chase') {
      this.t += dt;
      const base = this.armory.site.place;
      const away = Math.hypot(u.x - base.x, u.z - base.z);
      // The base pours after them, as long as they're within its reach.
      this.waveIn -= dt;
      if (this.waveIn <= 0 && away < C.reach) {
        this.waveIn = C.every;
        const near = this.enemies.living.filter((z) => Math.hypot(z.x - u.x, z.z - u.z) < C.ringMax + 10).length;
        const n = chaseWave(near, C.perWave, C.cap);
        const mix = { mib: 1 };
        for (let i = 0; i < n; i++) this.enemies.spawnPlanned({ type: 'single', count: 1 }, u.x, u.z, { ringMin: C.ringMin, ringMax: C.ringMax, mix, mode: 'chase', faceX: u.x, faceZ: u.z });
      }
      // Sheriff's gun.
      this.shotIn -= dt;
      if (this.shotIn <= 0) {
        const z = gunTarget(u, this.enemies.living, C.gunRange);
        if (z) {
          this.shotIn = C.gunEvery;
          this.sfx?.play('uteGun', u);
          this.enemies.damage(z, C.gunDamage, 'body', { id: 'uteGun', stagger: 1, knockback: 2 }, { x: z.x, y: (z.y ?? 0) + 1, z: z.z }, u);
          this.sheriffFacing = Math.atan2(z.x - u.x, z.z - u.z);
        }
      }
      if (away >= C.reach + C.clear) this.escaped();
    }
    // Home.
    if (this.state === 'escaped' && this.station?.layout && dozerIsHome(u, this.station.layout, this.uc.homeMargin)) this.arriveHome();
  }

  escaped() {
    this.state = 'escaped';
    this.set('uteEscaped');
    this.dialogue?.play('ute.clear.sheriff');
    this.notify?.('Clear. Sheriff is down in the tray, holding his side. He is not getting back on that gun');
    this.bus.emit('ute:escaped');
  }

  arriveHome() {
    this.state = 'home';
    this.set('sheriffHome');
    this.garage.visible = true;
    this.setGarageSolid(true);
    this.settle();
    this.notify?.(`Home. Wyatt and Ellen get Sheriff down off the truck. By morning there is a garage outside the gate${this.has('turretFound') ? ', and the sentry gun is up on its tripod' : ''}`);
    this.dialogue?.play('ute.home.ellen');
    this.bus.emit('sheriff:home');
  }

  placeSheriff(dt) {
    const s = this.armory?.sheriff;
    if (!s) return;
    const u = this.ute;
    if ((this.state === 'chase' || this.state === 'escaped') && !u.stored) {
      const w = u.toWorld(0, (UTE.tray.front + UTE.tray.back) / 2);
      s.x = w.x;
      s.z = w.z;
      s.y = u.y + UTE.tray.deck;
      s.facing = this.state === 'chase' ? (this.sheriffFacing ?? u.heading + Math.PI) : u.heading;
      s.state = this.state === 'chase' ? 'aim' : 'corpse'; // (down in the tray: the fallen pose stands in for "hurt")
      s.timer = this.state === 'chase' ? 0 : 99;
      this.armory.sheriffAway = true;
      // The Car Armory only draws him near the base: draw him here when it won't.
      const p = this.player.position;
      const base = this.armory.site.place;
      if (Math.hypot(p.x - base.x, p.z - base.z) >= this.armory.ac.radius + this.armory.ec.drawBeyond) this.armory.aliens?.update([s], dt);
    } else if (this.state === 'home') {
      s.timer += dt;
      const p = this.player.position;
      if (Math.hypot(p.x - s.x, p.z - s.z) < 60) this.armory.aliens?.update([s], dt);
    }
  }

  // ---- hold X: Sheriff's bench ----------------------------------------------------------------

  bought(i) {
    return this.has(`sheriffUpgrade${i + 1}`);
  }

  pick(X) {
    if (this.state !== 'home' || !this.sheriffSpot) return null;
    const p = this.player.position;
    if (Math.hypot(p.x - this.sheriffSpot.x, p.z - this.sheriffSpot.z) > this.uc.interactRange) return null;
    const up = nextUpgrade(this.uc.upgrades, (i) => this.bought(i));
    if (!up) return { key: 'sheriff-none', prompt: 'Sheriff tips his hat. Nothing more on the bench today', act: null };
    const scrap = this.combat.inventory.scrap;
    if (scrap < up.cost) return { key: 'sheriff-poor', prompt: `Sheriff: "${up.name}. ${up.cost} scrap." (you have ${scrap})`, act: null };
    return { key: `sheriff-${up.index}`, prompt: `Hold ${X}: ${up.name} (${up.cost} scrap)`, busy: 'Sheriff sets to work…', seconds: 1.5, act: () => this.buy(up) };
  }

  buy(up) {
    if (!this.combat.inventory.spendScrap?.(up.cost)) {
      if (this.combat.inventory.scrap < up.cost) return;
      this.combat.inventory.scrap -= up.cost;
    }
    this.set(`sheriffUpgrade${up.index + 1}`);
    if (up.effect === 'capacity') this.station.state.capacity += up.amount;
    else if (up.effect === 'armour') this.combat.armour?.add?.('ballistic', up.amount);
    else if (up.effect === 'shells' && !this.combat.weapons.addAmmo('alienShells', up.amount)) this.combat.inventory?.addAmmo?.('alienShells', up.amount);
    this.sfx?.play('pickup');
    this.combat.hud?.pickup?.(`Sheriff: ${up.done}`);
    this.bus.emit('sheriff:upgrade', { id: up.id });
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The ute chase: ${this.state} (select: Sheriff freed, take me to the ute)`, () => {
      if (!this.ready) return;
      this.set('sheriffFreed');
      this.armory.reset();
      this.reset();
      const s = this.armory.site.spots.ute;
      this.player.teleport(s.x + 3, s.z, 0);
    });
    cat.addItem('The ute chase: clear of the base now', () => this.state === 'chase' && this.escaped());
    cat.addItem('The ute chase: Sheriff home now (the garage, the turret)', () => {
      for (const f of ['sheriffFreed', 'uteTaken', 'uteEscaped']) this.set(f);
      this.state = 'escaped';
      this.arriveHome();
    });
    cat.addItem('The ute chase and the garage: start it again (flags cleared)', () => {
      for (const f of UTE_FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    return `ute ${this.state}${this.state === 'chase' ? ` t${Math.round(this.t)}` : ''}`;
  }

  dispose() {
    if (this.garage) {
      this.garage.removeFromParent();
      this.garage.geometry.dispose();
      this.garage.material.dispose();
    }
  }
}
