// The debug model viewer (Session 13): any character model, in any pose,
// standing in the real world a few metres in front of you, lit as the
// game lights it. Opened from the debug menu's Models category.
//
// While it's open the world and the clock stand still, the HUD hides and
// the camera orbits the model. Controls (controller / keyboard and mouse):
//  - Right stick / mouse: orbit. Left stick / WASD: zoom (and orbit).
//  - LT / RT (right / left mouse button): aim lower / higher on the model.
//  - D-pad left / right, LB / RB (arrows left / right, Q): the model.
//  - D-pad up / down (arrows up / down): the pose.
//  - Y (F): the variant (police, army...). X (E): the lighting.
//  - Menu (R): new random looks (the zombies).
//  - A (Enter): playing / slow motion / paused.
//  - R3 (C): turntable. L3 (Shift): reset the camera.
//  - B (Esc): close.
// The lighting presets (config.modelViewer.lights) set the hour the sky
// and grade show, the torch (held from the viewer's camera), or the heat
// scope (Game.updateThermal reads `thermal`).
//
// The models are the catalogue in viewerModels.js.
// Events: 'viewer:opened', 'viewer:closed'.

import * as THREE from 'three';
import { VIEWER_MODELS, variantNames } from './viewerModels.js';
import { startOrbit, stepOrbit, orbitPoints, cycle } from './viewerOrbit.js';
import { DEBUG } from './DebugMenu.js';

export class ModelViewer {
  constructor(cfg, bus, models = VIEWER_MODELS) {
    this.cfg = cfg;
    this.vc = cfg.modelViewer;
    this.bus = bus;
    this.models = models;
  }

  // ctx: { root, scene, renderer, player, clock, flashlight, ground,
  // station, viewModel, rng, cutscenes, closeMenu(), drawDistance() }.
  init(ctx) {
    Object.assign(this, ctx);
    this.camera = new THREE.PerspectiveCamera(this.vc.fov, 16 / 9, 0.05, 1000);
    this.active = false;
    this.index = 0;
    this.variant = 0;
    this.poseIndex = 0;
    this.poseTime = 0;
    this.lightIndex = 0;
    this.speedIndex = 0;
    this.turntable = false;
    this.spin = 0;
    this.inst = null;
    this.thermalOn = false;
    this.thermalCfg = null;
    this.device = null;
    this.initDom(this.root);
  }

  initDom(root) {
    this.el = document.createElement('div');
    this.el.className = 'model-viewer hidden';
    this.el.innerHTML = `
      <h2>MODEL VIEWER</h2>
      <div class="mv-name"></div>
      <div class="mv-pose"></div>
      <div class="mv-light"></div>
      <div class="mv-stats"></div>
      <p class="mv-note"></p>
      <p class="mv-help"></p>
    `;
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.nameEl = q('.mv-name');
    this.poseEl = q('.mv-pose');
    this.lightEl = q('.mv-light');
    this.statsEl = q('.mv-stats');
    this.noteEl = q('.mv-note');
    this.helpEl = q('.mv-help');
  }

  // ---- what other systems read ------------------------------------------------------------

  get entry() {
    return this.models[this.index];
  }

  get light() {
    return this.vc.lights[this.lightIndex];
  }

  // The hour the sky and grade show, or null for the clock's.
  get hour() {
    return this.active ? (this.light.hour ?? null) : null;
  }

  // Looking through the heat scope (Game.updateThermal).
  get thermal() {
    return this.active && Boolean(this.light.thermal);
  }

  // ---- opening and closing ------------------------------------------------------------

  // From the debug menu: close it and show model `index`.
  openFromMenu(index) {
    this.closeMenu?.();
    this.open(index);
  }

  open(index = this.index) {
    if (this.active) {
      this.select(index);
      return;
    }
    if (this.cutscenes?.active) this.cutscenes.stop(true);
    this.active = true;
    this.placeModel();
    this.clockWasPaused = this.clock.paused;
    this.clock.setPaused(true);
    this.torchWas = this.flashlight.on;
    if (this.viewModel) this.viewModel.root.visible = false;
    this.renderer.setCamera(this.camera);
    document.body.classList.add('in-viewer');
    this.el.classList.remove('hidden');
    this.select(index);
    this.applyLight();
    this.bus.emit('viewer:opened');
  }

  close() {
    if (!this.active) return;
    this.inst?.dispose();
    this.inst = null;
    this.active = false;
    this.renderer.setCamera(this.player.camera);
    if (this.viewModel) this.viewModel.root.visible = true;
    this.flashlight.setOn(this.torchWas);
    this.clock.setPaused(this.clockWasPaused);
    document.body.classList.remove('in-viewer');
    this.el.classList.add('hidden');
    this.bus.emit('viewer:closed');
  }

  // A few metres ahead of where you stand, facing you. On a floor or a
  // platform (the cabin, the lookout tower), at your feet's height.
  placeModel() {
    const p = this.player.position;
    const fx = -Math.sin(this.player.yaw);
    const fz = -Math.cos(this.player.yaw);
    const x = p.x + fx * this.vc.placeAhead;
    const z = p.z + fz * this.vc.placeAhead;
    const onFloor = p.y - this.ground.heightAt(p.x, p.z) > this.vc.floorTolerance;
    this.place = { x, z, y: onFloor ? p.y : this.ground.heightAt(x, z), facing: Math.atan2(-fx, -fz) };
  }

  // Show model `index` (its first variant and pose), framed from the front.
  select(index) {
    this.inst?.dispose();
    this.index = cycle(index, this.models.length, 0);
    this.variant = 0;
    this.poseIndex = 0;
    this.poseTime = 0;
    this.spin = 0;
    const e = this.entry;
    this.inst = e.create({ scene: this.scene, cfg: this.cfg, rng: this.rng, station: this.station });
    if (this.thermalOn) this.inst.setThermal(true, this.thermalCfg);
    this.resetOrbit();
    this.statsDirty = true;
    this.render();
  }

  resetOrbit() {
    const e = this.entry;
    this.orbit = startOrbit(e.height(this.cfg, this.variant), this.place.facing, this.vc.start);
    const distance = e.startDistance?.(this.cfg, this.variant);
    if (distance) this.orbit.distance = distance;
  }

  // ---- each frame ------------------------------------------------------------------------------

  // canControl: false while the debug menu is open over it.
  update(dt, input, canControl = true) {
    if (!this.active) return;
    if (canControl) this.handleInput(dt, input);
    if (!this.active) return; // closed just now
    const adt = dt * this.vc.speeds[this.speedIndex];
    this.poseTime += adt;
    if (this.turntable) this.spin += dt * this.vc.turntableSpeed;
    const e = this.entry;
    const pl = this.place;
    this.inst.update(adt, {
      x: pl.x,
      y: pl.y,
      z: pl.z,
      facing: pl.facing + this.spin,
      pose: e.poses[this.poseIndex].id,
      poseTime: this.poseTime,
      variant: this.variant,
      camera: this.camera,
    });
    this.updateCamera();
    if (this.statsDirty) {
      this.statsDirty = false;
      this.stats = countStats(this.inst.objects);
      this.render();
    }
    if (input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
  }

  handleInput(dt, input) {
    if (input.wasPressed('menuBack')) {
      this.close();
      return;
    }
    const e = this.entry;
    if (input.wasPressed('menuRight')) this.select(this.index + 1);
    else if (input.wasPressed('menuLeft')) this.select(this.index - 1);
    if (input.wasPressed('menuDown')) this.setPose(cycle(this.poseIndex, this.entry.poses.length, 1));
    else if (input.wasPressed('menuUp')) this.setPose(cycle(this.poseIndex, this.entry.poses.length, -1));
    if (input.wasPressed('flare')) {
      const n = variantNames(e, this.cfg).length;
      if (n > 1) {
        const before = e.startDistance?.(this.cfg, this.variant) ?? null;
        this.variant = cycle(this.variant, n, 1);
        // Reframe when the variant wants another distance (the zombie crowd).
        if ((e.startDistance?.(this.cfg, this.variant) ?? null) !== before) this.resetOrbit();
        this.statsDirty = true;
        this.render();
      }
    }
    // New random looks (Menu / R), for models that have them.
    if ((input.wasPressed('pause') || input.wasPressed('reload')) && this.inst.reroll) {
      this.inst.reroll();
      this.statsDirty = true;
    }
    if (input.wasPressed('interact')) {
      this.lightIndex = cycle(this.lightIndex, this.vc.lights.length, 1);
      this.applyLight();
    }
    if (input.wasPressed('menuConfirm')) {
      this.speedIndex = cycle(this.speedIndex, this.vc.speeds.length, 1);
      this.render();
    }
    if (input.wasPressed('crouch')) {
      this.turntable = !this.turntable;
      this.render();
    }
    if (input.wasPressed('sprint')) {
      this.resetOrbit();
      this.spin = 0;
    }
    const look = input.getLook();
    const move = input.getMove();
    stepOrbit(
      this.orbit,
      {
        turn: look.x + move.x * this.vc.stickTurnSpeed * dt,
        tilt: look.y,
        zoom: move.y,
        raise: (input.isDown('attack') ? 1 : 0) - (input.isDown('aim') ? 1 : 0),
      },
      dt,
      this.vc.limits,
      { zoom: this.vc.zoomSpeed, raise: this.vc.raiseSpeed },
    );
  }

  setPose(i) {
    this.poseIndex = i;
    this.poseTime = 0;
    this.render();
  }

  updateCamera() {
    const pl = this.place;
    const { target, camera } = orbitPoints(this.orbit, pl.x, pl.y, pl.z);
    // Never under the ground.
    camera.y = Math.max(camera.y, this.ground.heightAt(camera.x, camera.z) + this.vc.cameraAboveGround);
    const cam = this.camera;
    cam.position.set(camera.x, camera.y, camera.z);
    cam.lookAt(target.x, target.y, target.z);
    const far = this.drawDistance() + this.cfg.render.farMargin;
    if (cam.far !== far) {
      cam.far = far;
      cam.updateProjectionMatrix();
    }
  }

  // The lighting preset: the torch on or off (or as you had it).
  applyLight() {
    const l = this.light;
    this.flashlight.setOn(l.torch === 'player' ? this.torchWas : Boolean(l.torch));
    this.render();
  }

  // Game.updateThermal: the heat scope came on or went off.
  setThermal(on, t) {
    this.thermalOn = on;
    this.thermalCfg = t;
    this.inst?.setThermal(on, t);
  }

  // ---- the panel ---------------------------------------------------------------------------------

  render() {
    if (!this.active) return;
    const e = this.entry;
    const variants = variantNames(e, this.cfg);
    const variant = variants.length ? ` &middot; ${escapeHtml(variants[this.variant])} <span class="mv-dim">(Y: ${this.variant + 1}/${variants.length})</span>` : '';
    this.nameEl.innerHTML = `${escapeHtml(e.name)}${variant} <span class="mv-dim">${this.index + 1}/${this.models.length}</span>`;
    this.poseEl.innerHTML = `Pose ${this.poseIndex + 1}/${e.poses.length}: ${escapeHtml(e.poses[this.poseIndex].name)}`;
    const speed = this.vc.speeds[this.speedIndex];
    const playing = speed === 0 ? 'paused' : speed === 1 ? 'playing' : `slow x${speed}`;
    this.lightEl.innerHTML = `Light: ${escapeHtml(this.light.name)} &middot; ${playing}${this.turntable ? ' &middot; turntable' : ''}`;
    const s = this.stats;
    this.statsEl.textContent = s ? `${s.calls} draw call${s.calls === 1 ? '' : 's'} · ${s.triangles.toLocaleString()} triangles` : '';
    this.noteEl.textContent = e.note ?? '';
    this.helpEl.innerHTML =
      this.device === 'gamepad'
        ? `D-pad &larr;&rarr;: model &middot; &uarr;&darr;: pose &middot; Y: variant &middot; X: light &middot; A: play / slow / pause${this.inst?.reroll ? ' &middot; Menu: new looks' : ''}<br>` +
          'Right stick: orbit &middot; left stick: zoom &middot; LT / RT: lower / higher &middot; R3: turntable &middot; L3: reset &middot; B: close'
        : `&larr;&rarr;: model &middot; &uarr;&darr;: pose &middot; F: variant &middot; E: light &middot; Enter: play / slow / pause${this.inst?.reroll ? ' &middot; R: new looks' : ''}<br>` +
          'Mouse: orbit &middot; W / S: zoom &middot; mouse buttons: higher / lower &middot; C: turntable &middot; Shift: reset &middot; Esc: close';
  }

  // ---- debug ---------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.models);
    cat.addItem(() => `Open the model viewer (${this.entry.name})`, () => this.openFromMenu(this.index));
    this.models.forEach((m, i) => cat.addItem(`View: ${m.name}`, () => this.openFromMenu(i)));
  }

  overlayLine() {
    if (!this.active) return 'closed';
    return `${this.entry.id} ${this.entry.poses[this.poseIndex].id} (${this.light.id})`;
  }

  dispose() {
    this.close();
    this.el.remove();
  }
}

// Draw calls and triangles in the visible meshes under `objects`.
export function countStats(objects) {
  let calls = 0;
  let triangles = 0;
  for (const root of objects) {
    root.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry) return;
      const copies = o.isInstancedMesh ? o.count : 1;
      if (copies === 0) return;
      const g = o.geometry;
      const vertices = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
      calls++;
      triangles += Math.round(vertices / 3) * copies;
    });
  }
  return { calls, triangles };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
