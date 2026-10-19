// The cutscene system (M8; DESIGN.md "Cutscenes"): every cutscene is
// data (src/data/cutscenes.json) in one timeline format (camera, actors,
// timing, captions, triggers), rendered live from the game world. Styles:
//  - cctv: a fixed (or slowly moving) camera elsewhere, seen through a
//    camera look (CCTV, trail cam, camcorder, military, government), at a
//    low frame rate, with its name, the time and a blinking REC.
//  - firstPerson: the player's own view taken over briefly (turned toward
//    something, shaken), then handed back. The world can carry on.
//  - sweep: the establishing sweep: round the clearing, then in.
//  - black: no picture (the defeat: the radio over a black screen).
// While one plays the clock is paused (Aaron, Session 12), the HUD hides,
// and A / Enter skips it. It sets its own grade and look and hands both
// back afterwards; the heat scope stays off.
//
// Actors: rings, glows, discs, boxes and eyes are made here. Figures are
// the real models (Session 13): the witch (gliding, or planting with her
// rings), the family and the Men in Black (the figure kit), and zombies
// (the game's sprites, every one in one draw call). A figure with no model
// yet (a camper) is a box stand-in.
//
// Events: 'cutscene:started' { id }, 'cutscene:ended' { id, skipped }.

import * as THREE from 'three';
import cutsceneData from '../data/cutscenes.json';
import { cameraAt, localToWorld, eventsDue, cutsceneLength, validateCutscenes } from './cutsceneTimeline.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { WitchRenderer } from '../render/WitchRenderer.js';
import { FamilyRenderer } from '../render/FamilyRenderer.js';
import { ZombieRenderer } from '../render/ZombieRenderer.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

export class Cutscenes {
  constructor(cfg, bus, data = cutsceneData) {
    this.cfg = cfg;
    this.cc = cfg.cutscenes;
    this.bus = bus;
    this.list = data.cutscenes;
  }

  // ctx: { root, scene, renderer, postFX, player, clock, world, station,
  // witch, hut, trailCams, dialogue, subtitles, sfx, drawDistance(), rng,
  // zombieRenderer (the game's: its atlas is shared) }.
  init(ctx) {
    Object.assign(this, ctx);
    // Session 13: the cutscenes' zombies, all in one draw call.
    this.zombieSprites = new ZombieRenderer(this.cfg.zombies);
    this.zombieSprites.init(this.scene, this.cc.zombieCap, ctx.zombieRenderer);
    this.zombieList = [];
    // The people the figure kit builds: the family and the cutscenes' others.
    this.peopleCfg = { ...this.cfg.family, people: { ...this.cfg.family.people, ...this.cfg.people } };
    this.byId = new Map(this.list.map((c) => [c.id, c]));
    const problems = validateCutscenes(this.list, { looks: this.cfg.postFX.looks, lineIds: new Set(this.dialogue.lines.map((l) => l.id)) });
    if (problems.length) console.warn('cutscenes.json:', problems.join('; '));
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
    this.current = null;
    this.frameTimer = 0;
    this.initDom(this.root);
  }

  initDom(root) {
    this.el = document.createElement('div');
    this.el.className = 'cutscene hidden';
    this.el.innerHTML = `
      <div class="cs-fade"></div>
      <div class="cs-bar top"></div><div class="cs-bar bottom"></div>
      <div class="cs-osd">
        <div class="cs-osd-name"></div>
        <div class="cs-osd-time"></div>
        <div class="cs-osd-rec">&#9679; REC</div>
        <div class="cs-osd-mark"></div>
      </div>
      <p class="cs-skip">A / Enter: skip</p>
    `;
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.fadeEl = q('.cs-fade');
    this.osdEl = q('.cs-osd');
    this.osdName = q('.cs-osd-name');
    this.osdTime = q('.cs-osd-time');
    this.osdRec = q('.cs-osd-rec');
    this.osdMark = q('.cs-osd-mark');
    this.skipEl = q('.cs-skip');
  }

  // ---- state other systems read -------------------------------------------------------------------

  get active() {
    return this.current !== null;
  }

  // Draw from the cutscene's camera (not for first-person ones: the player's).
  get ownCamera() {
    return this.active && this.current.data.style !== 'firstPerson';
  }

  // The world stops while it plays (a clip from elsewhere), or carries on
  // (first-person, in the moment: data "world": "run").
  get freezesWorld() {
    return this.active && this.current.data.world !== 'run';
  }

  get locksControls() {
    return this.active;
  }

  // The hour the grade and sky show while it plays, or null for the clock's.
  get hour() {
    return this.current?.hour ?? null;
  }

  // ---- playing ----------------------------------------------------------------------------------------

  // Play a cutscene by id. opts: { anchors: { name: { x, z, yaw } }, vars
  // (for lines), osd (overrides its on-screen display, e.g. the camera's
  // name), onDone(skipped), skippable (default true) }. Returns
  // false if there's no such cutscene.
  play(id, opts = {}) {
    const data = this.byId.get(id);
    if (!data) {
      console.warn(`No cutscene ${id}`);
      return false;
    }
    if (this.current) this.stop(true);
    const cur = {
      id,
      data,
      opts,
      t: -1e-6,
      length: cutsceneLength(data),
      anchors: new Map(),
      actors: new Map(),
      hour: data.hour ?? null,
      shake: 0,
      shakeLeft: 0,
      fade: 0,
      fadeTarget: 0,
      fadeRate: 0,
      lookAt: null,
      clockWasPaused: this.clock.paused,
    };
    this.current = cur;
    this.clock.setPaused(true);
    this.postFX.setThermal(false);
    this.setOsd(opts.osd ? { ...data.osd, ...opts.osd } : data.osd);
    this.el.className = `cutscene ${data.style}${data.letterbox ?? data.style !== 'cctv' ? ' letterbox' : ''}`;
    this.fadeEl.style.opacity = '0';
    this.skipEl.classList.add('hidden');
    document.body.classList.add('in-cutscene');
    for (const a of data.actors ?? []) cur.actors.set(a.id, this.makeActor(a));
    this.setLook(data.look ?? null, data.light);
    if (this.ownCamera) this.renderer.setCamera(this.camera);
    this.frameTimer = 0;
    this.bus.emit('cutscene:started', { id });
    this.advance(0);
    return true;
  }

  // End it now (skipped: by the player, or by another starting).
  stop(skipped = false) {
    const cur = this.current;
    if (!cur) return;
    this.current = null;
    for (const a of cur.actors.values()) {
      a.mesh.removeFromParent();
      a.dispose();
    }
    this.zombieList.length = 0;
    this.zombieSprites.update(this.zombieList, this.camera.position, Infinity);
    if (skipped) this.subtitles.clear();
    this.renderer.setCamera(this.player.camera);
    this.setLook(null);
    this.clock.setPaused(cur.clockWasPaused);
    this.el.className = 'cutscene hidden';
    document.body.classList.remove('in-cutscene');
    this.bus.emit('cutscene:ended', { id: cur.id, skipped });
    cur.opts.onDone?.(skipped);
  }

  // input: the raw controls. canSkip: false while the debug menu is open.
  update(dt, input, canSkip = true) {
    const cur = this.current;
    if (!cur) return;
    if (cur.t > this.cc.skipAfter) this.skipEl.classList.remove('hidden');
    if (canSkip && cur.opts.skippable !== false && cur.t > this.cc.skipAfter && input.wasPressed('menuConfirm')) {
      this.stop(true);
      return;
    }
    this.advance(dt);
  }

  advance(dt) {
    const cur = this.current;
    const from = cur.t;
    cur.t += dt;
    for (const e of eventsDue(cur.data.tracks, from, cur.t)) this.fire(e);
    if (!this.current) return; // an event ended it
    this.updateActors(dt);
    this.updateCamera(dt);
    this.updateFade(dt);
    this.updateOsd();
    // Ends when its time is up and its lines have been said.
    if (cur.t >= cur.length && (!this.subtitles.busy || cur.t >= cur.length + this.cc.lineGrace)) this.stop(false);
  }

  // A CCTV feed runs at a low frame rate: true on frames that keep the last picture.
  holdFrame(dt) {
    const fps = this.current?.data.fps;
    if (!fps) return false;
    this.frameTimer += dt;
    if (this.frameTimer < 1 / fps) return true;
    this.frameTimer %= 1 / fps;
    return false;
  }

  // ---- anchors --------------------------------------------------------------------------------------

  // An anchor by name: { x, y, z, yaw } (y the ground there). Resolved once
  // per cutscene, so it holds still even if what it names moves.
  anchor(name) {
    const cur = this.current;
    if (!name) name = 'player';
    if (cur.anchors.has(name)) return cur.anchors.get(name);
    const a = this.resolve(name, cur.opts.anchors ?? {});
    a.y = this.world.ground.heightAt(a.x, a.z) + (a.dy ?? 0);
    cur.anchors.set(name, a);
    return a;
  }

  resolve(name, given) {
    if (given[name]) return { yaw: 0, ...given[name] };
    const p = this.player;
    const home = this.station.layout.centre;
    switch (name) {
      case 'player':
        return { x: p.position.x, z: p.position.z, yaw: p.yaw };
      case 'home':
        return { x: home.x, z: home.z, yaw: 0 };
      case 'homeDoor': {
        const c = this.station.layout.cabin;
        return { x: c.x, z: c.z + c.halfD + 3, yaw: Math.PI };
      }
      case 'hut':
        return { x: this.hut.x, z: this.hut.z, yaw: this.hut.facing ?? 0 };
      case 'witch':
        return { x: this.witch.x, z: this.witch.z, yaw: Math.atan2(p.position.x - this.witch.x, p.position.z - this.witch.z) };
      case 'trailCam': {
        const cam = this.trailCams.list[0];
        return cam ? { x: cam.x, z: cam.z, yaw: cam.facing } : { x: home.x, z: home.z, yaw: 0 };
      }
      case 'nearestClearing': {
        const { clearing } = this.world.nearestClearing(p.position.x, p.position.z);
        return { x: clearing.x, z: clearing.z, yaw: Math.atan2(clearing.x - p.position.x, clearing.z - p.position.z) || 0 };
      }
      default:
        // M9.1: a camera by its number (trailCam:6, the storm shelter's).
        if (name.startsWith('trailCam:')) {
          const cam = this.trailCams.list.find((c) => c.id === Number(name.slice('trailCam:'.length)));
          if (cam) return { x: cam.x, z: cam.z, yaw: cam.facing };
        }
        if (name.startsWith('clearing:')) {
          const key = name.slice('clearing:'.length);
          const c = this.world.map.clearings.find((cl) => cl.key === key);
          if (c) return { x: c.x, z: c.z, yaw: Math.atan2(c.x - home.x, c.z - home.z) };
        }
        console.warn(`Cutscene anchor ${name} not found: using home`);
        return { x: home.x, z: home.z, yaw: 0 };
    }
  }

  // A position in an anchor's frame, in the world.
  at(anchorName, p) {
    return localToWorld(this.anchor(anchorName), p);
  }

  // ---- the camera ---------------------------------------------------------------------------------

  updateCamera(dt) {
    const cur = this.current;
    cur.shakeLeft = Math.max(0, cur.shakeLeft - dt);
    const extraShake = cur.shakeLeft > 0 ? cur.shake : 0;
    if (cur.data.style === 'firstPerson') {
      this.updateFirstPerson(dt, extraShake);
      return;
    }
    const c = cameraAt(cur.data.camera, cur.t, { fov: this.cc.fov, shake: 0 });
    if (!c) return;
    const pos = this.at(c.anchor, c.pos);
    const look = this.at(c.anchor, c.look);
    const cam = this.camera;
    cam.position.set(pos.x, pos.y, pos.z);
    // Handheld shake: a slow wander and a quick jitter.
    const s = c.shake + extraShake;
    if (s > 0) {
      const t = cur.t;
      look.x += (Math.sin(t * 1.7) * 0.6 + Math.sin(t * 11.3) * 0.15) * s;
      look.y += (Math.sin(t * 2.3 + 1) * 0.4 + Math.sin(t * 13.1) * 0.12) * s;
      look.z += Math.cos(t * 1.9) * 0.5 * s;
    }
    cam.lookAt(look.x, look.y, look.z);
    const far = this.drawDistance() + this.cfg.render.farMargin;
    if (cam.fov !== c.fov || cam.far !== far) {
      cam.fov = c.fov;
      cam.far = far;
      cam.updateProjectionMatrix();
    }
  }

  // The player's own view, turned toward something (lookAt event) and shaken.
  updateFirstPerson(dt, shake) {
    const cur = this.current;
    const p = this.player;
    const l = cur.lookAt;
    if (l) {
      const target = this.targetOf(l.target);
      if (target) {
        const want = Math.atan2(p.position.x - target.x, p.position.z - target.z);
        p.yaw = turnToward(p.yaw, want, l.rate * dt);
        const pitch = l.pitch ?? Math.atan2(target.y - p.camera.position.y, Math.hypot(target.x - p.position.x, target.z - p.position.z));
        p.pitch += (pitch - p.pitch) * Math.min(1, dt * 3);
      }
    }
    p.applyCamera?.();
    if (shake > 0) {
      p.camera.rotation.z += (Math.random() - 0.5) * shake * 0.05; // cosmetic: not gameplay
      p.camera.position.y += (Math.random() - 0.5) * shake * 0.05;
    }
  }

  // Where a first-person cutscene looks: the witch, the hut, or an anchor.
  targetOf(name) {
    if (name === 'witch') return { x: this.witch.x, y: this.world.ground.heightAt(this.witch.x, this.witch.z) + 1.8, z: this.witch.z };
    if (name === 'hut') return { x: this.hut.x, y: this.world.ground.heightAt(this.hut.x, this.hut.z) + 2, z: this.hut.z };
    const a = this.anchor(name);
    return { x: a.x, y: a.y + 1.5, z: a.z };
  }

  // ---- events -------------------------------------------------------------------------------------------

  fire(e) {
    const cur = this.current;
    const actor = e.actor ? cur.actors.get(e.actor) : null;
    switch (e.do) {
      case 'line':
        // radio: true / false (face to face), else the line's own channel.
        this.dialogue.play(e.line, cur.opts.vars ?? {}, e.radio ?? null);
        break;
      case 'text':
        this.subtitles.show({ speaker: e.speaker ?? 'radio', text: e.text, radio: Boolean(e.radio) });
        break;
      case 'move':
        if (actor) actor.move = { from: { ...actor.pos }, to: this.at(actor.anchor, e.to), t: 0, seconds: e.seconds ?? 1 };
        break;
      case 'pose':
        if (actor) actor.pose = e.pose;
        break;
      case 'show':
      case 'hide':
        if (actor) actor.mesh.visible = e.do === 'show';
        break;
      case 'flare':
        if (actor) actor.flare = { amount: e.amount ?? 1, t: 0, seconds: e.seconds ?? 1, hold: Boolean(e.hold) };
        break;
      case 'glitch':
        this.postFX.glitch(e.amount ?? 1, e.seconds ?? 0.4);
        if (e.sound !== false) this.sfx?.play('radioStatic');
        break;
      case 'fade':
        cur.fadeTarget = e.to ?? 1;
        cur.fadeRate = Math.abs(cur.fadeTarget - cur.fade) / Math.max(0.01, e.seconds ?? 1);
        break;
      case 'emit':
        this.bus.emit(e.event, e.payload ?? {});
        break;
      case 'lookAt':
        cur.lookAt = { target: e.target, rate: e.rate ?? 2, pitch: e.pitch };
        break;
      case 'shake':
        cur.shake = e.amount ?? 1;
        cur.shakeLeft = e.seconds ?? 0.5;
        break;
      case 'osd':
        // A cut to another camera: its look, name and hour.
        if (e.look !== undefined) this.setLook(e.look, e.light);
        if (e.hour !== undefined) cur.hour = e.hour;
        this.setOsd(e.osd ?? null);
        break;
      default:
        break;
    }
    if (e.sfx) this.sfx?.play(e.sfx);
  }

  // A camera look (config.postFX.looks) and the camera's light on the
  // actors (config.cutscenes.actorLight; light overrides it).
  setLook(look, light) {
    this.postFX.setLook(look);
    const l = this.cc.actorLight;
    const cur = this.current;
    if (!cur) return;
    cur.actorLight = light ?? l[look] ?? l.default;
    for (const a of cur.actors.values()) a.light(cur.actorLight);
  }

  // ---- the overlay --------------------------------------------------------------------------------------

  // osd: { name, time ('clock' for the game's), rec, mark } or null for none.
  setOsd(osd) {
    const cur = this.current;
    if (cur) cur.osd = osd ?? null;
    this.osdEl.classList.toggle('hidden', !osd);
    if (!osd) return;
    this.osdName.textContent = osd.name ?? '';
    this.osdRec.classList.toggle('hidden', !osd.rec);
    this.osdMark.textContent = osd.mark ?? '';
    this.osdMark.classList.toggle('hidden', !osd.mark);
  }

  updateOsd() {
    const cur = this.current;
    const osd = cur.osd;
    if (!osd) return;
    const base = osd.time === 'clock' || !osd.time ? this.clockText(cur.hour ?? this.clock.hourOfDay, cur.t) : osd.time;
    this.osdTime.textContent = osd.time === 'none' ? '' : base;
    this.osdRec.style.visibility = Math.floor(cur.t * 1.4) % 2 === 0 ? 'visible' : 'hidden';
  }

  // "OCT 14 2003  02:14:07" style, from an hour and seconds into the clip.
  clockText(hour, seconds) {
    const total = Math.floor(hour * 3600 + Math.max(0, seconds));
    const hh = String(Math.floor(total / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(total / 60) % 60).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${this.cc.dateText}  ${hh}:${mm}:${ss}`;
  }

  updateFade(dt) {
    const cur = this.current;
    if (cur.fade === cur.fadeTarget) return;
    const step = cur.fadeRate * dt;
    cur.fade = cur.fade < cur.fadeTarget ? Math.min(cur.fadeTarget, cur.fade + step) : Math.max(cur.fadeTarget, cur.fade - step);
    this.fadeEl.style.opacity = String(cur.fade);
  }

  // ---- actors (placeholders) ----------------------------------------------------------------------------

  // spec: { id, kind: 'figure' | 'ring' | 'glow' | 'disc' | 'box' | 'eyes',
  // look (a figure's: config.cutscenes.figures), anchor, pos, yaw (degrees,
  // from the anchor's facing), size, color, hidden }.
  makeActor(spec) {
    const model = spec.kind === 'figure' ? this.makeModel(spec) : null; // Session 13
    const mesh = model ? model.mesh : buildActor(spec, this.cc);
    const pos = this.at(spec.anchor, spec.pos ?? [0, 0, 0]);
    const anchor = this.anchor(spec.anchor);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.rotation.y = anchor.yaw + ((spec.yaw ?? 0) * Math.PI) / 180;
    mesh.visible = !spec.hidden;
    this.scene.add(mesh);
    const materials = [];
    mesh.traverse((o) => o.material && materials.push(o.material));
    return {
      spec,
      model,
      mesh,
      anchor: spec.anchor,
      pos,
      baseY: pos.y,
      scale: 1,
      pose: 'stand',
      poseAmount: 0,
      move: null,
      flare: null,
      walk: 0,
      // The camera's light on it: lit materials glow k of their own colour,
      // plus a little grey, so a dark figure still shows as a silhouette.
      light: model
        ? model.light
        : (k) => {
            for (const m of materials) if (m.emissive) m.emissive.copy(m.color).multiplyScalar(k).addScalar(k * this.cc.actorLightGrey);
          },
      dispose: model
        ? model.dispose
        : () => {
            mesh.traverse((o) => o.geometry?.dispose());
            for (const m of materials) m.dispose();
          },
    };
  }

  // ---- the real models (Session 13) -----------------------------------------------------------

  // A figure's model by its look, or null for a box stand-in: { mesh (a
  // Group the timeline places), animate(dt, actor), light(k), dispose() }.
  makeModel(spec) {
    const look = spec.look;
    if (look === 'witch') return this.witchModel();
    if (look === 'zombie') return this.zombieModel(spec);
    if (this.peopleCfg.people[look]) return this.personModel(look);
    return null;
  }

  // The witch: gliding (her rags streaming as she moves), or planting
  // (kneel: her contortion and its rings). Unlit: a silhouette whatever the light.
  witchModel() {
    const mesh = new THREE.Group();
    const r = new WitchRenderer(this.cfg.witch.look, this.rng.fork('witch').fork('witch-look')); // as the game's
    r.init(mesh);
    const w = { x: 0, y: 0, z: 0, facing: 0, state: 'roaming', tier: 'near', moved: 0, action: null, actionProgress: 0, struck: false, flinch: 0, wc: this.cfg.witch, deathTimer: 0, spot: null, plantProgress: 0, riseProgress: 1 };
    let planting = 0;
    return {
      mesh,
      animate: (dt, a) => {
        const kneel = a.pose === 'kneel' || a.pose === 'down';
        w.state = kneel ? 'planting' : 'roaming';
        planting = kneel ? planting + dt : 0;
        w.plantProgress = Math.min(1, planting / this.cfg.witch.plantSeconds);
        w.moved = a.move ? this.cc.witchGlideSpeed * dt : 0;
        r.update(w, dt, null, Infinity);
      },
      light: () => {},
      dispose: () => r.dispose(),
    };
  }

  // A zombie: a sprite in the cutscenes' own zombie renderer, walking while
  // it moves, falling when it's put down; its look from its actor id.
  zombieModel(spec) {
    const mesh = new THREE.Group();
    const zc = this.cfg.zombies;
    const F = ZOMBIE_FRAMES;
    const z = { active: true, kind: 'zombie', tier: 'active', x: 0, y: 0, z: 0, sink: 0, frame: 0, facing: 0, flash: 0, lit: 0, variant: spec.variant ?? 'citizen', lookSeed: seedOf(spec.id) };
    let walked = 0;
    let down = 0;
    let lit = 0;
    return {
      mesh,
      animate: (dt, a) => {
        mesh.getWorldPosition(this.tmpV ?? (this.tmpV = new THREE.Vector3()));
        z.x = this.tmpV.x;
        z.y = this.tmpV.y;
        z.z = this.tmpV.z;
        z.facing = mesh.rotation.y;
        z.lit = lit;
        if (a.pose === 'down') {
          down += dt;
          const k = down / zc.deathSeconds;
          z.frame = k >= 1 ? F.corpse : F.dying[Math.min(F.dying.length - 1, Math.floor(k * F.dying.length))];
        } else if (a.move) {
          down = 0;
          walked += dt * this.cc.zombieWalkSpeed;
          z.frame = F.walk[Math.floor(walked * zc.walkFrameRate * F.walk.length) % F.walk.length];
        } else {
          down = 0;
          z.frame = F.walk[0];
        }
        if (mesh.visible) this.zombieList.push(z);
      },
      // The camera's lamp brightens the sprite as a station floodlight would.
      light: (k) => {
        lit = k * this.cc.zombieLampScale;
      },
      dispose: () => {},
    };
  }

  // One of the family, or a Man in Black: the figure kit's model, walking
  // while it moves, kneeling or down when put so.
  personModel(id) {
    const mesh = new THREE.Group();
    const r = new FamilyRenderer(this.peopleCfg, [id]);
    r.init(mesh, [{ x: 0, z: 0 }], 0, 0);
    const material = r.people[0].material;
    return {
      mesh,
      animate: (dt, a) => {
        r.setPose(0, a.move ? 'walk' : a.pose === 'kneel' ? 'kneel' : a.pose === 'down' ? 'down' : 'stand');
        r.update(dt, null);
      },
      // The camera's lamp on them: a grey glow (their colours are in the vertices).
      light: (k) => material.emissive.setScalar(k * (this.peopleCfg.albedo + this.cc.actorLightGrey)),
      dispose: () => r.dispose(),
    };
  }

  updateActors(dt) {
    this.zombieList.length = 0;
    for (const a of this.current.actors.values()) {
      const m = a.mesh;
      if (a.move) {
        a.move.t += dt;
        const k = Math.min(1, a.move.t / a.move.seconds);
        const { from, to } = a.move;
        a.pos = { x: from.x + (to.x - from.x) * k, y: 0, z: from.z + (to.z - from.z) * k };
        a.pos.y = this.world.ground.heightAt(a.pos.x, a.pos.z) + (to.y - this.world.ground.heightAt(to.x, to.z));
        // Face the way it's going (the models face +z, as in the game; Aaron, Session 14: the witch walked backwards).
        if (Math.hypot(to.x - from.x, to.z - from.z) > 0.01) m.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        a.walk += dt * 9;
        if (k >= 1) a.move = null;
      }
      // Poses: kneel (planting), down (fallen), stand.
      const want = a.pose === 'kneel' ? 1 : a.pose === 'down' ? 2 : 0;
      a.poseAmount += (want - a.poseAmount) * Math.min(1, dt * 4);
      const bob = a.move ? Math.abs(Math.sin(a.walk)) * 0.06 : 0;
      m.position.set(a.pos.x, a.pos.y + bob, a.pos.z);
      if (a.model) a.model.animate(dt, a);
      else if (a.spec.kind === 'figure') {
        const kneel = Math.min(1, a.poseAmount);
        const down = Math.max(0, a.poseAmount - 1);
        m.scale.y = 1 - kneel * 0.4;
        m.rotation.x = -down * (Math.PI / 2) * 0.95;
      }
      if (a.flare) {
        const f = a.flare;
        f.t += dt;
        const k = Math.min(1, f.t / f.seconds);
        const s = f.hold ? 1 + f.amount * k : 1 + f.amount * Math.sin(k * Math.PI);
        m.scale.setScalar(s);
        if (k >= 1 && !f.hold) {
          a.flare = null;
          m.scale.setScalar(1);
        }
      }
    }
    this.zombieSprites.update(this.zombieList, this.camera.position, Infinity);
  }

  // ---- debug ---------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.cutscenes);
    for (const cs of this.list) cat.addItem(`Play: ${cs.name}${cs.placeholder ? ' (placeholder)' : ''}`, () => this.play(cs.id, { anchors: this.debugAnchors(cs) }));
  }

  // From the debug menu, a trail-cam clip plays at the last camera that saw her (else camera 1).
  debugAnchors() {
    const last = this.trailCams.lastSighting;
    if (!last) return {};
    return { trailCam: { x: last.cam.x, z: last.cam.z, yaw: last.cam.facing } };
  }

  overlayLine() {
    const c = this.current;
    return c ? `${c.id} ${c.t.toFixed(1)}/${c.length.toFixed(1)}s` : 'none';
  }

  dispose() {
    this.stop(true);
    this.zombieSprites.dispose();
    this.el.remove();
  }
}

// A zombie's look seed from its actor id (the same look every time it plays).
function seedOf(id) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h;
}

// ---- building the placeholder actors --------------------------------------------------------------------------

function box(w, h, d, x, y, z, color, emissive = false) {
  const mat = emissive ? new THREE.MeshBasicMaterial({ color, fog: false }) : new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

export function buildActor(spec, cc) {
  const g = new THREE.Group();
  const size = spec.size ?? 1;
  switch (spec.kind) {
    case 'figure': {
      const f = cc.figures[spec.look] ?? cc.figures.camper;
      const h = f.height * size;
      const w = f.width * size;
      g.add(box(w * 0.75, h * 0.47, w * 0.5, 0, 0, 0, f.legs));
      g.add(box(w, h * 0.36, w * 0.6, 0, h * 0.47, 0, spec.color ?? f.body));
      g.add(box(w * 0.48, h * 0.17, w * 0.48, 0, h * 0.83, 0, f.head));
      // The witch: sticks and bone, a crown of branches, two pale eyes.
      if (f.antlers) {
        for (const s of [-1, 1]) {
          const stick = box(0.04, h * 0.28, 0.04, s * w * 0.18, h * 0.96, 0, f.legs);
          stick.rotation.z = -s * 0.5;
          g.add(stick);
        }
      }
      if (f.eyes) for (const s of [-1, 1]) g.add(box(0.05, 0.03, 0.02, s * w * 0.1, h * 0.9, -w * 0.25, f.eyes, true));
      break;
    }
    case 'ring': {
      const r = spec.size ?? 6;
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.08, 8, 40), new THREE.MeshBasicMaterial({ color: spec.color ?? 0x9fd8ff, fog: false }));
      mesh.position.y = r + 0.5;
      g.add(mesh);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(r * 0.92, 32), new THREE.MeshBasicMaterial({ color: spec.color ?? 0x9fd8ff, fog: false, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.position.y = r + 0.5;
      g.add(glow);
      break;
    }
    case 'glow': {
      const r = spec.size ?? 0.5;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: spec.color ?? 0xffffff, fog: false })));
      break;
    }
    case 'disc': {
      const r = spec.size ?? 1;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: spec.color ?? 0xb4ff8c, fog: false, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      mesh.position.y = 0.04;
      g.add(mesh);
      break;
    }
    case 'box': {
      const [w, h, d] = spec.dims ?? [2, 2, 2];
      g.add(box(w, h, d, 0, 0, 0, spec.color ?? 0x55606a));
      break;
    }
    case 'eyes': {
      for (const s of [-1, 1]) g.add(box(0.09, 0.06, 0.03, s * 0.14, 0, 0, spec.color ?? 0xff2010, true));
      break;
    }
    default:
      break;
  }
  return g;
}

function turnToward(from, to, maxStep) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + Math.max(-maxStep, Math.min(maxStep, d));
}
