// The stairs in the woods, the place beyond, and Junie home (Session 26;
// story spine, beat 5; DESIGN.md "Stairs in the woods: the place beyond").
// The set: world/StairsSite.js. The place beyond: encounters/PlaceBeyond.js
// (the Session 22 spike, promoted).
//
//  1. The first sight: Tom comes out of the trees on the stairs, a house's
//     flight standing alone, clean, lit by nothing. A held look
//     (stairs.sight), once.
//  2. The climb: hold X at the foot (stairs.climb: the creaks, the fade),
//     and he's in the place beyond (PlaceBeyond.enter({ story: true })).
//     Back down the way he came from the first clearing, he's out again.
//  3. The find: three silent paths in a row, and in the last clearing,
//     Junie (beyond.find). Then down the stairs together.
//  4. Bringing her home: she follows him (a simple follow; she can't be
//     hurt; she keeps up, and if he rides she rides along), saying a thing
//     now and then. Through the gate: the homecoming (junie.homecoming),
//     and the family are three again.
//
// Saved through story flags: stairsSeen, stairsClimbed, junieFound,
// junieHome. Saved with Junie following, she's beside him again on load.
// Off in Demo mode.
//
// Events: 'stairs:climbed', 'junie:found', 'junie:home'.

import { HoldAction } from '../player/HoldAction.js';
import { FamilyRenderer } from '../render/FamilyRenderer.js';
import { zoneOf } from '../base/stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// One step of Junie following Tom: from (jx, jz) toward a spot `gap` metres
// short of him, at `speed` (faster when she's more than catchUp behind).
// Past `snap`, she's put beside him. Returns { x, z, moving, snapped }.
export function followStep(jx, jz, tx, tz, dt, f) {
  const dx = tx - jx;
  const dz = tz - jz;
  const d = Math.hypot(dx, dz);
  if (d > f.snap) return { x: tx - (dx / d) * f.gap, z: tz - (dz / d) * f.gap, moving: false, snapped: true };
  const want = d - f.gap;
  if (want <= 0.05) return { x: jx, z: jz, moving: false, snapped: false };
  const v = d > f.catchUp ? f.speed * 1.8 : f.speed;
  const step = Math.min(want, v * dt);
  return { x: jx + (dx / d) * step, z: jz + (dz / d) * step, moving: true, snapped: false };
}

// Session 33: where Junie gets down off the quad: on the side Tom stepped off to (his right if he hasn't
// moved: thrown off, or the walk's over), `off` metres out and `back` metres behind its middle, so she never
// has to walk through it to reach him. quad: { x, z, heading }; tom: { x, z }; seat: config follow.seat.
export function stepOffSpot(quad, tom, seat) {
  const rx = Math.cos(quad.heading);
  const rz = -Math.sin(quad.heading);
  const fx = -Math.sin(quad.heading);
  const fz = -Math.cos(quad.heading);
  const side = (tom.x - quad.x) * rx + (tom.z - quad.z) * rz < -0.2 ? -1 : 1;
  return { x: quad.x + rx * side * seat.off - fx * seat.back, z: quad.z + rz * side * seat.off - fz * seat.back };
}

const FLAGS = ['stairsSeen', 'stairsMoths', 'stairsClimbed', 'junieFound', 'junieHome'];
const JUNIE = 2;

export class Stairs {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.sc = cfg.stairs;
    this.ec = cfg.stairs.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, site (StairsSite), beyond (PlaceBeyond), player, ground, station, cutscenes, dialogue,
  // subtitles, progress, interiors, demo, notify, sfx, rng(), moths (ai/Moths.js: Session 32),
  // quad (world/Quad.js: Session 33, she rides on the back of it) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.rng ??= Math.random;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    if (this.ready) {
      this.cutscenes?.namedAnchors?.set('stairsTop', () => ({ ...this.site.spots.top, yaw: 0, dy: this.site.spots.top.y - this.ground.heightAt(this.site.spots.top.x, this.site.spots.top.z) - 1.5 }));
      this.beyond.stairsSite = this.site;
      this.beyond.findDistance = this.ec.findDistance;
    }
    this.bus.on('beyond:found', (f) => this.onFound(f));
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.place && this.site.spots?.foot && this.beyond);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // Is she walking home with him now?
  get following() {
    return this.has('junieFound') && !this.has('junieHome');
  }

  reset() {
    this.state = 'idle';
    this.seatTold = false; // Session 33: the line the first time she climbs on the quad
    this.swarm = null; // Session 32: the moths at the stairs: null, a countdown (seconds), or 'up'
    this.lineTimer = this.nextLineGap();
    this.lines = 0;
    if (this.junie && this.seated) this.seat(false);
    if (this.following) this.spawnJunie();
    else this.removeJunie();
  }

  nextLineGap() {
    const [a, b] = this.ec.lineEvery;
    return a + (b - a) * this.rng();
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const foot = this.site.spots.foot;
    const d = Math.hypot(p.x - foot.x, p.z - foot.z);
    const outside = !this.interiors?.inside;
    if (playing && outside) {
      // 1: the first sight, once (he knows of them, or not: they're there either way).
      if (!this.has('stairsSeen') && d < this.ec.arriveDistance && !this.cutscenes?.active) {
        this.set('stairsSeen');
        this.cutscenes?.play('stairs.sight');
      }
      if (this.following) this.updateFollow(dt);
      this.updateMoths(dt, d);
    }
    if (this.junie) {
      // Session 33 (Aaron: "put a model of her on the back of the bike"): on the quad she's seated behind him.
      const seated = this.following && outside && Boolean(this.quad?.mesh) && this.player.riding === this.quad;
      this.seat(seated);
      this.junie.mesh.visible = this.following && outside && (!this.player.riding || seated) && !this.cutscenes?.active;
      this.renderer.update(dt, seated ? null : this.player.camera.position);
    }
    if (canInteract && input && playing && outside && d < this.ec.climbRange && this.state === 'idle') this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hold.update(dt, null, false, 1);
    }
  }

  // Only while Junie's up there: before she's taken they lead nowhere he'd go; once she's home, never again.
  updateInteraction(dt, input) {
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const open = this.has('junieTaken') && !this.has('junieFound');
    if (!open) {
      this.hold.update(dt, null, false, 1);
      this.hud.progress = 0;
      this.hud.prompt = this.has('junieHome') ? "You're not going up there again" : this.following ? '' : 'A staircase up to nothing. Clean, as if someone dusts it';
      return;
    }
    // Session 32: not with the moths on him.
    if (this.guarded) {
      this.hold.update(dt, null, false, 1);
      this.hud.progress = 0;
      this.hud.prompt = this.swarm === 'up' ? 'Not with those things on you' : '';
      return;
    }
    const done = this.hold.update(dt, 'climb', input.isDown('interact'), this.ec.climbSeconds);
    if (done) this.climb();
    this.hud.prompt = this.hold.active ? 'Climbing…' : `Hold ${X}: climb the stairs`;
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // Session 32: the stairs are kept. While Junie's up there, the first time Tom comes into the clearing a swarm
  // of giant moths drops out of the treetops; he can't climb until the last of them is down. Once (a flag):
  // left unfinished (a save, a respawn), they come again.
  get guarded() {
    return Boolean(this.moths) && this.has('junieTaken') && !this.has('junieFound') && !this.has('stairsMoths');
  }

  updateMoths(dt, d) {
    if (!this.guarded || this.cutscenes?.active) return;
    const M = this.ec.moths;
    if (this.swarm === null) {
      if (d < M.within && this.has('stairsSeen')) this.swarm = M.after;
      return;
    }
    if (this.swarm === 'up') {
      if ((this.moths.living ?? 0) > 0) return;
      this.set('stairsMoths');
      this.swarm = null;
      this.notify?.('The last of them drops in the leaves. Nothing else moves. The stairs are still there.');
      this.bus.emit('stairs:clear');
      return;
    }
    this.swarm -= dt;
    if (this.swarm > 0) return;
    const n = this.moths.send(M.count);
    this.swarm = 'up';
    if (n > 0) {
      this.sfx?.play('mothWake', this.site.spots.foot);
      this.notify?.('The treetops round the clearing let go of something. Moths, the size of dogs, and they\'ve seen you.');
      this.bus.emit('stairs:moths', { count: n });
    }
  }

  // 2: up the stairs, into the place beyond.
  climb() {
    if (this.following || !this.has('junieTaken') || this.guarded) return;
    this.state = 'climbing';
    this.set('stairsClimbed');
    this.bus.emit('stairs:climbed');
    const go = () => {
      this.state = 'idle';
      this.beyond.enter({ story: true });
    };
    if (!this.cutscenes?.play('stairs.climb', { onDone: go })) go();
  }

  // 3: the last clearing, and her.
  onFound(f) {
    if (!this.beyond.story) return;
    this.state = 'found';
    this.cutscenes?.namedAnchors?.set('beyondFind', () => ({ x: f.x, z: f.z, yaw: f.yaw, dy: f.dy }));
    const down = () => this.bringHer();
    if (!this.cutscenes?.play('beyond.find', { onDone: down })) down();
  }

  // Down the stairs together.
  bringHer() {
    this.beyond.leave();
    this.set('junieFound');
    this.state = 'idle';
    this.bus.emit('junie:found');
    this.spawnJunie();
    this.lineTimer = 6;
    this.notify?.("Junie's with you. Take her home");
  }

  // ---- 4: Junie, walking home with him ------------------------------------------------------

  spawnJunie() {
    const p = this.player.position;
    const yaw = this.player.yaw;
    const x = p.x + Math.sin(yaw) * this.ec.follow.gap;
    const z = p.z + Math.cos(yaw) * this.ec.follow.gap;
    if (!this.junie) {
      // Session 33 (Aaron: "she has that reflective quality"): the family's colours are tuned for the cabin's
      // lamps. Out of doors by torch she takes a darker material colour (the glare rule; follow.albedo).
      this.renderer = new FamilyRenderer({ ...this.cfg.family, albedo: this.ec.follow.albedo }, ['junie']);
      this.renderer.init(this.scene, [{ x, z }], this.ground.heightAt(x, z), yaw);
      this.junie = this.renderer.people[0];
    }
    this.jx = x;
    this.jz = z;
    this.place();
  }

  // Session 33: Junie as the torch's glare check sees her (as the dead are: Flashlight.updateGlare), so the
  // beam dims when she's close in it. Null while she isn't standing in the world.
  get glareCircle() {
    if (!this.junie || !this.junie.mesh.visible || this.seated) return null;
    const c = (this.circle ??= { x: 0, z: 0, r: 0.22, base: 0, top: 0 });
    c.x = this.jx;
    c.z = this.jz;
    c.base = this.junie.mesh.position.y;
    c.top = c.base + this.cfg.family.people.junie.height;
    return c;
  }

  // Session 33: on and off the back of the quad. Seated, her figure is the quad's child (it pitches and rolls
  // with it): on its seat behind Tom, facing forward, in the 'sit' pose. Off, she's put down on the side of
  // the same side Tom stepped off, behind him (stepOffSpot).
  seat(on) {
    if (on === this.seated) return;
    this.seated = on;
    const m = this.junie.mesh;
    const s = this.ec.follow.seat;
    if (on) {
      this.quad.mesh.add(m);
      m.position.set(0, s.y, s.z);
      m.rotation.set(0, Math.PI, 0); // the quad's front is its -z; she faces the way it does
      this.renderer.setPose(0, 'sit');
      if (!this.seatTold) {
        this.seatTold = true;
        this.notify?.('Junie climbs on behind you and holds on');
      }
      this.bus.emit('junie:seated', { on: true });
      return;
    }
    this.scene.add(m);
    m.rotation.set(0, 0, 0);
    const p = this.player.position;
    const q = this.quad;
    const at = stepOffSpot(q, p, s);
    this.jx = at.x;
    this.jz = at.z;
    this.place();
    this.bus.emit('junie:seated', { on: false });
  }

  removeJunie() {
    this.seated = false;
    if (!this.renderer) return;
    this.renderer.dispose();
    this.junie.mesh.removeFromParent();
    this.renderer = null;
    this.junie = null;
  }

  place(moving = false) {
    const m = this.junie.mesh;
    m.position.set(this.jx, this.ground.heightAt(this.jx, this.jz), this.jz);
    this.renderer.setPose(0, moving ? 'walk' : 'stand');
  }

  updateFollow(dt) {
    if (!this.junie) this.spawnJunie();
    const p = this.player.position;
    const s = followStep(this.jx, this.jz, p.x, p.z, dt, this.ec.follow);
    // Riding: she rides along (on the back of the quad: seat(); hidden on anything else), and gets off beside him.
    if (this.player.riding) {
      this.jx = p.x;
      this.jz = p.z;
      return;
    }
    this.junie.mesh.rotation.y = Math.atan2(p.x - s.x, p.z - s.z); // she keeps her eyes on him
    this.jx = s.x;
    this.jz = s.z;
    this.place(s.moving);
    // A thing said now and then on the way.
    this.lineTimer -= dt;
    if (this.lineTimer <= 0 && !this.subtitles?.busy && this.lines < 5) {
      this.lines++;
      this.dialogue?.play(`walk.${this.lines}`, {}, false);
      this.lineTimer = this.nextLineGap();
    }
    // Through the gate together: home.
    const L = this.station.layout;
    const r = L.radius + this.ec.homeRadius;
    if (Math.hypot(p.x - L.centre.x, p.z - L.centre.z) < r && Math.hypot(this.jx - L.centre.x, this.jz - L.centre.z) < r + 3 && !this.cutscenes?.active && zoneOf(L, p.x, p.z) >= 1) this.homecoming();
  }

  homecoming() {
    if (this.state === 'home') return;
    this.state = 'home';
    const home = () => {
      this.set('junieHome');
      this.removeJunie();
      this.station?.setPresent?.(JUNIE, true);
      this.state = 'idle';
      this.bus.emit('junie:home');
      this.notify?.("Junie's home. The family are three again");
    };
    if (!this.cutscenes?.play('junie.homecoming', { onDone: home })) home();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Stairs: take me there (${this.following ? 'Junie following' : this.state})`, () => {
      if (!this.ready) return;
      const f = this.site.spots.foot;
      const p = this.site.place;
      this.player.teleport(f.x - Math.sin(p.yaw) * 3, f.z - Math.cos(p.yaw) * 3, p.yaw + Math.PI);
    });
    cat.addItem('Stairs: Junie found (she follows me home now)', () => {
      this.set('junieTaken');
      this.set('junieFound');
      this.spawnJunie();
    });
    cat.addItem('Stairs: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'stairs -';
    return `stairs ${this.state}${this.following ? ` junie ${Math.round(Math.hypot(this.player.position.x - this.jx, this.player.position.z - this.jz))}m` : ''}`;
  }

  dispose() {
    this.removeJunie();
  }
}
