// The Bigfoot cave (build queue item 3; story spine, beat 7, stage 2;
// DESIGN.md "Bigfoot cave and the Mothman fight"). SCAFFOLDING: the beat plays
// from start to end in a fixed, roughly dressed cave with draft lines; the
// seeded tunnels, the moths, the nest closing in and the last chamber's
// staging are for the encounter's own design session.
//
//  1. The way in: the dozer clears the brush at the road's north end
//     (world/RoadNorth.js, as built); with the Mothman zapped, hold X at the
//     mouth to go in (an interior: world/Interiors.js). The torch comes on.
//  2. The eggs: as Tom passes each clutch (world/bigfootCaveShape.js), beetles
//     hatch round him (the mine's Beetles, inside the cave's space).
//  3. The last chamber: the Mothman, wounded, on the ground: it drags itself
//     at him and rakes when he's close. It can die here. Flag mothmanDead.
//  4. Bigfoot, bound in the cocoon at the back: hold X to cut him free. He
//     slumps out, gets his breath, stands, and holds out the Blessing (hold X
//     to take it): flag bigfootFreed, and his nature armour.
//  5. Home: bury the Blessing inside the fence (a spot in the yard; hold X):
//     flag blessingBuried: +security for good (StationState.blessing), the
//     family's radio reaches the south again and the Caller is gone
//     (story/Comms.js already ends its hold on that flag).
//
// Saved through story flags (caveEntered, mothmanDead, bigfootFreed,
// blessingBuried). Saved inside, Tom's put back at the mouth; a fight under
// way starts over. Off in Demo mode.
//
// Events: 'cave:entered', 'cave:mothmanDead', 'cave:freed', 'cave:blessing'.

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';
import { MothmanRenderer } from '../render/MothmanRenderer.js';
import { PosedFigure } from '../render/PosedFigure.js';
import { bigfootSpec, bigfootPose, buildCocoon } from '../render/bigfootModel.js';
import { buildBigfootCave } from '../render/bigfootCaveModel.js';
import { CAVE, confine, caveBlocks, sectionAt } from '../world/bigfootCaveShape.js';
import { zoneOf } from '../base/stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const ID = 'bigfootCave';
export const CAVE_FLAGS = ['caveEntered', 'mothmanDead', 'bigfootFreed', 'blessingBuried'];

// ---- the pure parts (tested) ----------------------------------------------------------------

// Bigfoot, t seconds after the cocoon's cut (config freed): 'slump' | 'kneel' | 'stand' | 'give'.
export function freedPose(t, f) {
  if (t < f.slump) return 'slump';
  if (t < f.slump + f.kneel) return 'kneel';
  if (t < f.slump + f.kneel + f.stand) return 'stand';
  return 'give';
}

// The wounded Mothman's next step toward Tom (cave frame): it drags itself at `speed`, stays in the last
// chamber, and stops `reach` short of him. Returns { x, z, close }.
export function crawlStep(m, tom, dt, speed, reach) {
  const dx = tom.x - m.x;
  const dz = tom.z - m.z;
  const d = Math.hypot(dx, dz) || 1;
  if (d <= reach) return { x: m.x, z: m.z, close: true };
  const step = Math.min(d - reach, speed * dt);
  const at = confine(m.x + (dx / d) * step, Math.max(45.5, m.z + (dz / d) * step), 1.2);
  return { x: at.x, z: at.z, close: false };
}

// Where the Blessing goes in the ground at home: open yard inside the fence (not in the cabin), two thirds of
// the way out to the wire, at the first bearing round from the fence box that's `clear` metres from the box,
// the cabin's door and the tower. A placeholder for "the base of a tree inside the compound".
export function burySpotIn(L, clear) {
  const r = L.radius * 0.66;
  const a0 = Math.atan2(L.fenceBox.x - L.centre.x, L.fenceBox.z - L.centre.z);
  const far = (p, q) => !q || Math.hypot(p.x - q.x, p.z - q.z) >= clear;
  for (let i = 1; i < 24; i++) {
    const a = a0 + (i * Math.PI) / 12;
    const p = { x: L.centre.x + Math.sin(a) * r, z: L.centre.z + Math.cos(a) * r };
    if (zoneOf(L, p.x, p.z) === 1 && far(p, L.fenceBox) && far(p, L.cabin.frontDoor) && far(p, L.tower)) return p;
  }
  return { x: L.centre.x + Math.sin(a0 + Math.PI) * r, z: L.centre.z + Math.cos(a0 + Math.PI) * r };
}

export class BigfootCave {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.cc = cfg.bigfootCave;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, world, roadNorth, interiors, player, combat, station, beetles, flashlight, cutscenes,
  // dialogue, subtitles, progress, demo, notify, sfx, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.mouth = this.roadNorth?.layout?.mouth ?? null;
    const f = this.cfg.spikes.flyer;
    this.target = { x: 0, y: 0, z: 0, targetable: false, alive: true, hitRadius: f.hitRadius * 1.2, height: 2.0, headBottom: 1.5, headRadius: f.headRadius, headshotMultiplier: f.headshotMultiplier, takeHit: (amount) => this.hitMothman(amount) };
    this.combat?.weapons?.extraTargets?.push(this.target);
    if (this.ready) {
      this.interiors.define({
        id: ID,
        name: 'The cave',
        entrance: () => this.mouth,
        surfaceY: () => this.world.ground.heightAt(this.mouth.x, this.mouth.z),
        load: (scene, floorY) => this.load(scene, floorY),
        platform: (floorY) => this.platformAt(floorY),
        spawn: () => ({ ...this.toWorld(0, 1.5), yaw: Math.PI }), // facing in (+z)
        exit: () => ({ x: this.mouth.x, z: this.mouth.z + this.cc.exitBack, yaw: 0 }),
        light: this.cc.light,
        onEnter: () => this.onEnter(),
        onLeave: () => this.onLeave(),
      });
      this.combat?.weapons?.spaceRays?.set(ID, (origin, dir, max) => max); // (scaffolding: shots aren't stopped by the rock)
    }
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.mouth && this.interiors);
  }

  get inside() {
    return this.interiors?.id === ID;
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // The cave's frame to the world: its mouth at the road's, running +z.
  toWorld(x, z) {
    return { x: this.mouth.x + x, z: this.mouth.z + z };
  }

  toCave(p) {
    return { x: p.x - this.mouth.x, z: p.z - this.mouth.z };
  }

  reset() {
    this.hatched = new Set();
    this.freedAt = null;
    this.given = false;
    if (this.station?.state) this.station.state.blessing = this.has('blessingBuried');
    if (this.roadNorth) this.roadNorth.caveBuilt = true; // its own "built with its story" note goes
    if (this.inside) this.resetFight();
  }

  // ---- the interior ---------------------------------------------------------------------------

  platformAt(floorY) {
    const mid = this.toWorld(0, CAVE.length / 2);
    return { room: ID, x: mid.x, z: mid.z, y: floorY, hx: CAVE.maxHalf, hz: CAVE.length / 2 - 0.4, rx: 1, rz: 0, fx: 0, fz: 1, roofY: floorY + 7, blocks: caveBlocks() };
  }

  load(scene, floorY) {
    this.floorY = floorY;
    this.model = buildBigfootCave(this.cc.look);
    this.model.group.position.set(this.mouth.x, floorY, this.mouth.z);
    scene.add(this.model.group);
    // The Mothman, on the ground.
    this.mothRenderer = new MothmanRenderer(this.cfg.mothman);
    this.mothRenderer.init(scene, 1);
    this.moth = { active: true, x: 0, y: floorY, z: 0, facing: Math.PI, state: 'wounded', timer: 0, flap: 0, pitch: 0, roll: 0, flash: 0 };
    // Bigfoot and his cocoon.
    const bc = this.cfg.bigfoot;
    this.figure = new PosedFigure({ spec: bigfootSpec(bc), pose: bigfootPose, albedo: bc.albedo, poseRate: bc.poseRate, thermalGlow: bc.thermalGlow });
    this.figure.init(scene);
    this.cocoons = [buildCocoon(bc.cocoon, 0), buildCocoon(bc.cocoon, 1)];
    const at = this.toWorld(CAVE.cocoon.x, CAVE.cocoon.z);
    for (const c of this.cocoons) {
      c.group.position.set(at.x, floorY, at.z);
      c.group.rotation.y = Math.PI; // facing back down the cave, at whoever comes in
      scene.add(c.group);
    }
    this.big = { active: true, x: at.x, y: floorY, z: at.z, facing: Math.PI, state: 'bound', timer: 0, walked: 0, look: 0 };
    this.resetFight();
    return {
      update: () => {},
      dispose: () => {
        this.model?.dispose();
        this.model = null;
        this.mothRenderer?.dispose?.();
        this.mothRenderer = null;
        this.figure?.dispose();
        this.figure = null;
        for (const c of this.cocoons ?? []) {
          c.group.removeFromParent();
          c.dispose();
        }
        this.cocoons = null;
        this.target.targetable = false;
      },
    };
  }

  // The fight as the flags say: the Mothman there and whole, or dead where it fell.
  resetFight() {
    if (!this.moth) return;
    const at = this.toWorld(CAVE.mothman.x, CAVE.mothman.z);
    const dead = this.has('mothmanDead');
    Object.assign(this.moth, { x: at.x, z: at.z, y: this.floorY, state: dead ? 'corpse' : 'wounded', timer: dead ? 99 : 0, facing: Math.PI });
    this.mothHealth = this.cc.mothman.health;
    this.attack = { phase: 'rest', t: this.cc.mothman.attackEvery };
    this.target.targetable = !dead;
    this.big.state = this.has('bigfootFreed') ? 'stand' : 'bound';
    this.freedAt = null;
  }

  onEnter() {
    this.set('caveEntered');
    this.hatched = new Set();
    this.flashlight?.setOn?.(true);
    if (this.sfx) this.sfx.muffled = 1; // things happen in here
    this.bus.emit('cave:entered');
    this.notify?.(this.has('mothmanDead') ? 'The cave. It is quiet now' : 'The cave. Wet fur, and something sweet and rotten. Eggs, everywhere');
  }

  onLeave() {
    this.beetles?.clear?.();
  }

  enter() {
    if (!this.ready || this.inside) return false;
    this.player.riding?.dismount?.();
    return this.interiors.enter(ID);
  }

  leave() {
    if (this.inside) this.interiors.leave();
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (this.inside && this.model) {
      if (playing) this.updateInside(dt);
      if (!this.inside || !this.model) return; // (left partway through the frame)
      this.draw(dt);
    }
    const best = canInteract && input && playing ? this.pick(input.activeDevice === 'gamepad' ? 'X' : 'E') : null;
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, Boolean(input?.isDown('interact')) && Boolean(best), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  updateInside(dt) {
    const tom = this.toCave(this.player.position);
    // 2: the eggs hatch as he comes level with each clutch.
    if (!this.has('mothmanDead')) {
      this.model.eggs.forEach((e, i) => {
        if (this.hatched.has(i) || Math.hypot(tom.x - e.x, tom.z - e.z) > this.cc.hatchWithin) return;
        this.hatched.add(i);
        this.hatch(e);
      });
    }
    this.beetles?.update(dt, true); // (the interiors' pool is stepped by whoever's using it)
    // 3: the Mothman.
    const m = this.moth;
    const M = this.cc.mothman;
    m.timer += dt;
    m.flash = Math.max(0, m.flash - dt);
    if (!this.has('mothmanDead') && sectionAt(tom.z).id === 'lair') {
      const c = this.toCave(m);
      const a = this.attack;
      if (a.phase === 'rest') {
        const s = crawlStep(c, tom, dt, M.crawl, M.reach);
        const w = this.toWorld(s.x, s.z);
        m.x = w.x;
        m.z = w.z;
        m.facing = Math.atan2(this.player.position.x - m.x, this.player.position.z - m.z);
        if (m.state !== 'flinch' || m.timer > 0.35) m.state = 'wounded';
        a.t -= dt;
        if (s.close && a.t <= 0) {
          a.phase = 'windup';
          a.t = M.windup;
          m.state = 'mantle';
          m.timer = 0;
          this.sfx?.play('screech', m);
        }
      } else if (a.phase === 'windup') {
        a.t -= dt;
        if (a.t <= 0) {
          m.state = 'strike';
          m.timer = 0;
          if (Math.hypot(tom.x - c.x, tom.z - c.z) < M.reach + 1.2) this.combat.hurtPlayer(M.damage, 1.4);
          a.phase = 'rest';
          a.t = M.attackEvery;
        }
      }
    }
    this.target.x = m.x;
    this.target.y = m.y;
    this.target.z = m.z;
    // Tom's kept off the cocoon, and back from Bigfoot once he's out of it (he comes out where Tom stood).
    const limit = CAVE.cocoon.z - (this.big.state === 'bound' ? this.cc.cocoonClear : this.cc.freed.ahead + this.cc.bigfootClear);
    if (tom.z > limit && Math.abs(tom.x - CAVE.cocoon.x) < 2.2) this.player.position.z = this.mouth.z + limit;
    // 4: Bigfoot, once he's cut free.
    if (this.freedAt !== null) {
      this.freedAt += dt;
      this.big.state = this.given ? 'thanks' : freedPose(this.freedAt, this.cc.freed);
    }
  }

  draw(dt) {
    this.mothRenderer.update([this.moth], dt);
    const b = this.big;
    b.timer += dt;
    b.look = 0;
    this.cocoons[0].group.visible = b.state === 'bound';
    this.cocoons[1].group.visible = b.state !== 'bound';
    // Out of the cocoon he's a pace and a half in front of it.
    const at = this.toWorld(CAVE.cocoon.x, CAVE.cocoon.z);
    const out = b.state === 'bound' ? 0 : this.cc.freed.ahead;
    b.x = at.x;
    b.z = at.z - out;
    this.figure.update(b, dt, false);
  }

  hatch(egg) {
    const n = this.cc.hatch;
    for (let i = 0; i < n; i++) {
      const a = this.rng() * Math.PI * 2;
      const at = confine(egg.x + Math.sin(a) * 1.2, egg.z + Math.cos(a) * 1.2, 0.5);
      const w = this.toWorld(at.x, at.z);
      this.beetles?.spawn(w.x, w.z, a, {
        space: ID,
        y: this.floorY,
        floorAt: () => this.floorY,
        confine: (pos, y, r) => {
          const c = confine(pos.x - this.mouth.x, pos.z - this.mouth.z, r);
          pos.x = this.mouth.x + c.x;
          pos.z = this.mouth.z + c.z;
        },
        speedScale: 1,
      });
    }
    this.sfx?.play('crateBreak', this.toWorld(egg.x, egg.z));
  }

  hitMothman(amount) {
    if (!this.inside || this.has('mothmanDead')) return false;
    const m = this.moth;
    this.mothHealth -= amount;
    m.flash = this.cfg.mothman.hitFlashSeconds ?? 0.12;
    if (this.mothHealth > 0) {
      if (this.attack.phase === 'rest') {
        m.state = 'flinch';
        m.timer = 0;
      }
      return false;
    }
    m.state = 'dying';
    m.timer = 0;
    this.target.targetable = false;
    this.set('mothmanDead');
    this.sfx?.play('screech', m);
    this.notify?.('It folds up on itself and is still. The red goes out of its eyes');
    this.bus.emit('cave:mothmanDead');
    return true;
  }

  // ---- hold X ---------------------------------------------------------------------------------

  // Where the Blessing's buried at home: open yard, the other side of the door from the flares' spot.
  get burySpot() {
    return (this.buryAt ??= burySpotIn(this.station.layout, this.cc.buryClear));
  }

  pick(X) {
    const p = this.player.position;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    if (this.inside) {
      const tom = this.toCave(p);
      if (tom.z < 2.6) return { key: 'out', prompt: `Hold ${X}: back out to the road`, seconds: 0.8, act: () => this.leave() };
      const cocoon = this.toWorld(CAVE.cocoon.x, CAVE.cocoon.z - 2.4);
      if (dist(cocoon) < this.cc.interactRange + 1.2) {
        if (!this.has('mothmanDead')) return { key: 'cocoon-info', prompt: 'Something huge, bound in silk, breathing. Not while that thing is alive', act: null };
        if (this.freedAt === null && !this.has('bigfootFreed')) return { key: 'cut', prompt: `Hold ${X}: cut him out of the silk`, busy: 'Cutting…', seconds: this.cc.cutSeconds, act: () => this.cutFree() };
        if (this.freedAt !== null && !this.given && this.big.state === 'give') return { key: 'take', prompt: `Hold ${X}: take what he's holding out`, seconds: 0.8, act: () => this.takeBlessing() };
      }
      return null;
    }
    if (this.player.riding) return null;
    // Out in the world: the mouth, and the spot at home.
    if (this.roadNorth?.brushCleared && this.has('mothmanZapped') && dist(this.mouth) < this.cc.mouthRange) return { key: 'in', prompt: `Hold ${X}: go into the cave`, seconds: 1.0, act: () => this.enter() };
    if (this.has('bigfootFreed') && !this.has('blessingBuried') && this.station && dist(this.burySpot) < this.cc.interactRange) return { key: 'bury', prompt: `Hold ${X}: bury the Blessing here`, busy: 'Digging…', seconds: this.cc.burySeconds, act: () => this.bury() };
    return null;
  }

  cutFree() {
    this.freedAt = 0;
    this.sfx?.play('pickup');
    this.notify?.('The silk parts like wet paper. He comes out of it all at once, onto his hands');
  }

  takeBlessing() {
    this.given = true;
    this.set('bigfootFreed');
    this.combat?.armour?.add?.('nature', this.cc.natureArmour);
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.(`The Blessing: his sign, cut in a river stone. Bury it at home. And a coat of moss and bark: nature armour +${this.cc.natureArmour}`);
    this.bus.emit('cave:freed');
  }

  bury() {
    this.set('blessingBuried');
    this.station.state.blessing = true;
    this.sfx?.play('pickup');
    this.notify?.(`The Blessing is in the ground. Security +${this.cfg.station.security.blessing}, for good`);
    this.dialogue?.play('cave.blessing.ellen');
    this.bus.emit('cave:blessing');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The Bigfoot cave: go in (${this.inside ? 'inside' : this.has('mothmanDead') ? 'Mothman dead' : 'not yet'})`, () => {
      this.set('mothmanZapped');
      this.enter();
    });
    cat.addItem('The Bigfoot cave: kill the Mothman', () => this.inside && this.hitMothman(1e6));
    cat.addItem('The Bigfoot cave: start it again (flags cleared)', () => {
      this.leave();
      for (const f of CAVE_FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    return `cave ${this.inside ? `in moth ${Math.max(0, Math.round(this.mothHealth ?? 0))} ${this.attack?.phase ?? ''}` : '-'}${this.has('bigfootFreed') ? ' freed' : ''}`;
  }

  dispose() {
    this.leave();
  }
}
