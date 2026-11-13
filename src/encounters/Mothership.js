// The crashed UFO and the mothership (build queue item 5; story spine, beat
// 9; DESIGN.md "Crashed UFO and the mothership"). SCAFFOLDING: the beat plays
// from start to end in a first-pass ship with draft lines; the ship's rooms,
// the cowboy greys' real behaviour and the hangar's staging are for the
// encounter's own design session.
//
//  1. The crashed ship in its clearing (world/CrashedUfoSite.js), and beside
//     it the beam still standing. After the mega night, hold X in the beam:
//     up (an interior: world/Interiors.js). Flag shipEntered.
//  2. Aboard: the pad, a corridor, the core room, the hangar, in a line
//     (world/sectionShape.js). Greys at their posts, further along the
//     cowboy drift the deeper Tom goes (render/alienModel.js KIT_STAGES):
//     each aims and fires in turn, sidestepping between shots; each drops
//     alien shells.
//  3. The big core on its plinth in the core room: hold X to take it
//     (shipCoreTaken).
//  4. The hangar: the quad (Tom's own, since Round 2), rebuilt (the alien quad's own model on a
//     cradle). Hold X: ride it down the beam: Tom's back at the crash site
//     on the ground, the alien quad (world/AlienQuad.js) beside him
//     (quadReturned). The pad takes him down without it, too.
//  5. Home: the core into the fence box (base/Station.js fitShipCore,
//     shipCoreFitted): a far bigger store, full.
//
// Saved through story flags. Saved aboard, Tom's put back at the beam's foot;
// the greys aboard are back at their posts. Off in Demo mode.
//
// Events: 'ship:entered', 'ship:core', 'ship:quad', 'ship:left'.

import { HoldAction } from '../player/HoldAction.js';
import { AlienRenderer } from '../render/AlienRenderer.js';
import { buildMothership } from '../render/mothershipModel.js';
import { buildAlienQuad } from '../render/alienQuadModel.js';
import { sectionShape } from '../world/sectionShape.js';
import { DEBUG } from '../debug/DebugMenu.js';

export const ID = 'mothership';
export const SHIP_FLAGS = ['shipEntered', 'shipCoreTaken', 'quadReturned', 'shipCoreFitted'];

export const SHIP_SECTIONS = [
  { id: 'pad', z0: 0, z1: 9, half: 4, roof: 4 },
  { id: 'corridor', z0: 9, z1: 27, half: 2.2, roof: 3.2 },
  { id: 'core', z0: 27, z1: 43, half: 7, roof: 6 },
  { id: 'hangar', z0: 43, z1: 66, half: 10, roof: 8 },
];
export const SHIP = sectionShape(SHIP_SECTIONS);
export const SHIP_PLACES = { pad: { x: 0, z: 4 }, core: { x: 0, z: 36 }, quad: { x: 3.5, z: 56 } };

// ---- the pure parts (tested) ----------------------------------------------------------------

// A grey aboard, one step on. g: { x, z, post: { x, z }, state, t, side }; tom: { x, z }; a: config greys.
// It waits at its post until Tom's within a.see; then aims (a.aim seconds), fires (returns fired: true once),
// sidesteps (a.step seconds, a.strafe metres either side of its post), and aims again.
export function greyStep(g, tom, dt, a) {
  const d = Math.hypot(tom.x - g.x, tom.z - g.z);
  let fired = false;
  if (g.state === 'post') {
    if (d < a.see) {
      g.state = 'aim';
      g.t = a.aim;
    }
    return { fired, d };
  }
  g.t -= dt;
  if (g.state === 'aim' && g.t <= 0) {
    fired = true;
    g.state = 'fired';
    g.t = a.after;
  } else if (g.state === 'fired' && g.t <= 0) {
    g.state = 'step';
    g.t = a.step;
    g.side = -(g.side || 1);
  } else if (g.state === 'step') {
    const want = g.post.x + g.side * a.strafe;
    g.x += Math.max(-a.speed * dt, Math.min(a.speed * dt, want - g.x));
    if (g.t <= 0) {
      g.state = 'aim';
      g.t = a.aim;
    }
  }
  return { fired, d };
}

export class Mothership {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.mothership;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, world, site (CrashedUfoSite), interiors, player, combat, station, megaNight, alienQuad,
  // flashlight, dialogue, subtitles, progress, demo, notify, sfx, rng() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    const h = this.cfg.crashedPlane.encounter.hit;
    this.greys = this.sc.greys.posts.map((p) => {
      const g = { post: { x: p[0], z: p[1] }, stage: p[2], x: p[0], z: p[1], state: 'post', t: 0, side: 1, health: this.sc.greys.health, alive: true };
      g.look = { active: true, x: 0, y: 0, z: 0, facing: Math.PI, state: 'idle', timer: 0, walked: 0, flash: 0, stage: p[2] };
      g.target = { x: 0, y: 0, z: 0, targetable: false, alive: true, hitRadius: h.hitRadius, height: h.height, headBottom: h.headBottom, headRadius: h.headRadius, headshotMultiplier: h.headshotMultiplier, takeHit: (amount) => this.hitGrey(g, amount) };
      this.combat?.weapons?.extraTargets?.push(g.target);
      return g;
    });
    if (this.ready) {
      this.interiors.define({
        id: ID,
        name: 'The mothership',
        entrance: () => this.beamAt,
        surfaceY: () => this.world.ground.heightAt(this.beamAt.x, this.beamAt.z),
        load: (scene, floorY) => this.load(scene, floorY),
        platform: (floorY) => this.platformAt(floorY),
        spawn: () => ({ ...this.toWorld(SHIP_PLACES.pad.x, SHIP_PLACES.pad.z), yaw: Math.PI }),
        exit: () => ({ x: this.beamAt.x + 2.4, z: this.beamAt.z, yaw: 0 }),
        light: this.sc.light,
        onEnter: () => this.onEnter(),
        onLeave: () => this.bus.emit('ship:left'),
      });
      this.combat?.weapons?.spaceRays?.set(ID, (origin, dir, max) => max); // (scaffolding: shots aren't stopped by the hull)
    }
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get beamAt() {
    return this.site?.spots?.beam ?? null;
  }

  get ready() {
    return Boolean(this.beamAt && this.interiors);
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

  toWorld(x, z) {
    return { x: this.beamAt.x + x, z: this.beamAt.z + z };
  }

  toShip(p) {
    return { x: p.x - this.beamAt.x, z: p.z - this.beamAt.z };
  }

  reset() {
    for (const g of this.greys) {
      Object.assign(g, { x: g.post.x, z: g.post.z, state: 'post', t: 0, health: this.sc.greys.health, alive: true });
      g.look.state = 'idle';
      g.target.targetable = false;
    }
    // The quad he came home on: there if it's been taken down, wherever it was last left (it isn't saved).
    if (this.has('quadReturned') && this.alienQuad?.stored && this.beamAt) this.alienQuad.place(this.beamAt.x + 4.5, this.beamAt.z + 1, 0);
  }

  // ---- the interior ---------------------------------------------------------------------------

  platformAt(floorY) {
    const mid = this.toWorld(0, SHIP.length / 2);
    return { room: ID, x: mid.x, z: mid.z, y: floorY, hx: SHIP.maxHalf, hz: SHIP.length / 2 - 0.4, rx: 1, rz: 0, fx: 0, fz: 1, roofY: floorY + 8, blocks: SHIP.blocks() };
  }

  load(scene, floorY) {
    this.floorY = floorY;
    this.model = buildMothership(this.sc.look, SHIP, SHIP_PLACES);
    this.model.group.position.set(this.beamAt.x, floorY, this.beamAt.z);
    this.model.core.visible = !this.has('shipCoreTaken');
    scene.add(this.model.group);
    this.renderer = new AlienRenderer(this.cfg.aliens.grey);
    this.renderer.init(scene, this.greys.length);
    // Earl's quad on its cradle: the alien quad's own model, standing still.
    if (!this.has('quadReturned')) {
      this.quadShow = buildAlienQuad(this.cfg.alienQuad);
      const at = this.toWorld(SHIP_PLACES.quad.x, SHIP_PLACES.quad.z);
      this.quadShow.root.position.set(at.x, floorY + 0.2, at.z);
      this.quadShow.root.rotation.y = 0.5;
      scene.add(this.quadShow.root);
    }
    for (const g of this.greys) g.target.targetable = g.alive;
    return {
      update: () => {},
      dispose: () => {
        this.model?.dispose();
        this.model = null;
        this.renderer?.pool?.forEach((o) => o.mesh.removeFromParent());
        this.renderer = null;
        this.quadShow?.root.removeFromParent();
        this.quadShow = null;
        for (const g of this.greys) g.target.targetable = false;
      },
    };
  }

  onEnter() {
    this.set('shipEntered');
    if (this.sfx) this.sfx.muffled = 1;
    this.bus.emit('ship:entered');
    this.notify?.('Light, then no weight, then a floor. Clean metal. A hum you feel in your teeth');
    if (!this.dialogue?.heard?.has('ship.up.wyatt')) this.dialogue?.play('ship.up.wyatt');
  }

  enter() {
    if (!this.ready || this.inside) return false;
    this.player.riding?.dismount?.();
    this.sfx?.play('zap');
    return this.interiors.enter(ID);
  }

  leave() {
    if (this.inside) this.interiors.leave();
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    if (this.inside && this.model) {
      if (playing) this.updateGreys(dt);
      if (!this.inside || !this.model) return;
      this.model.core.rotation.y += dt * 0.8;
      this.renderer.update(this.greys.map((g) => g.look), dt);
    }
    const best = canInteract && input && playing ? this.pick(input.activeDevice === 'gamepad' ? 'X' : 'E') : null;
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, Boolean(input?.isDown('interact')) && Boolean(best), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  updateGreys(dt) {
    const a = this.sc.greys;
    const tom = this.toShip(this.player.position);
    for (const g of this.greys) {
      const k = g.look;
      k.timer += dt;
      k.flash = Math.max(0, k.flash - dt);
      if (g.alive) {
        const { fired, d } = greyStep(g, tom, dt, a);
        if (g.state !== 'post') k.facing = Math.atan2(tom.x - g.x, tom.z - g.z);
        if (fired) {
          k.state = 'fire';
          k.timer = 0;
          this.sfx?.play('greyShot', this.toWorld(g.x, g.z));
          if (d < a.range && this.rng() < a.hitChance) this.combat.hurtPlayer(a.damage, 1);
          else this.sfx?.play('ricochet', this.player.position);
        } else if (g.state === 'aim') k.state = 'aim';
        else if (g.state === 'step') {
          k.state = 'walk';
          k.walked += dt * 1.5;
        } else if (g.state === 'post') k.state = 'idle';
      }
      const w = this.toWorld(g.x, g.z);
      k.x = w.x;
      k.y = this.floorY;
      k.z = w.z;
      g.target.x = w.x;
      g.target.y = this.floorY;
      g.target.z = w.z;
    }
  }

  hitGrey(g, amount) {
    if (!this.inside || !g.alive) return false;
    g.health -= amount;
    g.look.flash = this.cfg.aliens.grey.hitFlashSeconds;
    if (g.state === 'post') {
      g.state = 'aim';
      g.t = this.sc.greys.aim;
    }
    if (g.health > 0) return false;
    g.alive = false;
    g.look.state = 'dying';
    g.look.timer = 0;
    g.target.targetable = false;
    const n = this.sc.greys.shells;
    if (!this.combat.weapons.addAmmo('alienShells', n)) this.combat.inventory?.addAmmo?.('alienShells', n);
    this.combat?.hud?.pickup?.(`${n} alien shells`);
    this.sfx?.play('mothDie', this.toWorld(g.x, g.z));
    return true;
  }

  // ---- hold X ---------------------------------------------------------------------------------

  pick(X) {
    const p = this.player.position;
    const r = this.sc.interactRange;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    if (this.inside) {
      const at = (o) => this.toWorld(o.x, o.z);
      if (!this.has('shipCoreTaken') && dist(at(SHIP_PLACES.core)) < r + 0.9) return { key: 'core', prompt: `Hold ${X}: take the core off its plinth`, busy: 'Lifting it…', seconds: 1.6, act: () => this.takeCore() };
      if (!this.has('quadReturned') && dist(at(SHIP_PLACES.quad)) < r + 1.4) {
        if (!this.has('shipCoreTaken')) return { key: 'quad-info', prompt: "Your quad. They've rebuilt it. The core first: that's what you came for", act: null };
        return { key: 'quad', prompt: `Hold ${X}: get on your quad and take it down the beam`, seconds: 1.2, act: () => this.takeQuad() };
      }
      if (dist(at(SHIP_PLACES.pad)) < r) return { key: 'down', prompt: `Hold ${X}: step onto the pad (down)`, seconds: 0.8, act: () => this.leave() };
      return null;
    }
    if (this.player.riding) return null;
    if (this.has('megaNightDone') && dist(this.beamAt) < this.sc.beamRange) return { key: 'up', prompt: `Hold ${X}: step into the light`, seconds: 1.0, act: () => this.enter() };
    return null;
  }

  takeCore() {
    this.set('shipCoreTaken');
    if (this.model) this.model.core.visible = false;
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.("The ship's core: the size of a football, warm, heavier than it should be. Ellen's fence will never want for power again");
    this.dialogue?.play('ship.core.ellen');
    this.bus.emit('ship:core');
  }

  // Down the beam on it: back on the ground at the crash site, the alien quad beside him.
  takeQuad() {
    this.megaNight?.returnQuad?.();
    if (!this.megaNight) this.set('quadReturned');
    this.leave();
    const b = this.beamAt;
    this.alienQuad?.place?.(b.x + 4.5, b.z + 1, 0);
    this.sfx?.play('zap');
    this.notify?.("Down the light on your own quad, or what they've made of it. It hums. It has guns");
    this.dialogue?.play('ship.quad.wyatt');
    this.bus.emit('ship:quad');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The mothership: go up (${this.inside ? 'aboard' : this.has('shipCoreTaken') ? 'core taken' : 'not yet'})`, () => {
      this.set('megaNightDone');
      this.enter();
    });
    cat.addItem('The mothership: kill the greys aboard', () => this.greys.forEach((g) => this.hitGrey(g, 1e6)));
    cat.addItem('The mothership: start it again (flags cleared)', () => {
      this.leave();
      for (const f of SHIP_FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    return `ship ${this.inside ? `aboard greys ${this.greys.filter((g) => g.alive).length}` : '-'}${this.has('shipCoreTaken') ? ' core' : ''}`;
  }

  dispose() {
    this.leave();
  }
}
