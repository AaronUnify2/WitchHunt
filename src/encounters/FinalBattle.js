// The final battle (M7 step 5; DESIGN.md "Final battle"). Destroying the
// hut is the point of no return:
//  - A short cutscene (M8: "final.intro" in src/data/cutscenes.json):
//    letterbox bars, a red flash, the camera turns to the wreck and she
//    rises out of it. Your controls are locked while it plays.
//  - The blood night: if it's day the clock jumps to night (Aaron, M7),
//    then freezes for the whole fight. The sky and fog bleed red, embers
//    rise and ash falls round you.
//  - No escape: a ring of witchfire seals the hut clearing; you (and she)
//    are held inside it.
//  - She fights to the death (ai/Witch.js, startFinal()): no fleeing,
//    heavier swipes, more summoning, snares and totems spammed round you.
//  - The station is still attacked while you're away (NightWatch keeps
//    resolving on game time; only the clock is frozen, as Aaron agreed).
//  - She dies: the red drains away and the witchfire dies down (the
//    ending itself is step 6). You die, or the station falls: the run ends.
//
// Events: 'final:started', 'final:fight' (the cutscene's over).

import * as THREE from 'three';

export class FinalBattle {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.finalBattle;
    this.bus = bus;
  }

  // ctx: { root, witch, hut, player, clock, sky, world, skipToNight(), combat,
  // playCutscene(id) (M8) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.state = 'idle'; // 'intro' | 'fight' | 'over'
    this.timer = 0;
    this.blood = 0;
    this.fire = 0; // the witchfire ring's height, 0..1
    const c = this.world.hut;
    this.centre = { x: c.x, z: c.z };
    this.radius = Math.max(this.fc.ringMin, c.radius * this.fc.ringScale);
    this.initDom(this.root);
    this.initRing(scene);
    this.initParticles(scene);
    this.unsubscribers = [
      this.bus.on('hut:destroyed', () => this.start()),
      this.bus.on('witch:killed', () => {
        if (this.state !== 'idle') this.state = 'over';
      }),
      // Skipping the intro starts the fight at once.
      this.bus.on('cutscene:ended', ({ id }) => {
        if (id === 'final.intro' && this.state === 'intro') this.fight();
      }),
    ];
  }

  get active() {
    return this.state === 'intro' || this.state === 'fight';
  }

  // The cutscene is playing: the player's controls are locked.
  get cinematic() {
    return this.state === 'intro';
  }

  start() {
    if (this.state !== 'idle' || !this.witch.alive) return;
    this.state = 'intro';
    this.timer = 0;
    // Blood night: night now if it isn't (she's in final mode first, so
    // the skipped dusk doesn't send her out planting), then the clock stops.
    this.witch.startFinal(this.hut.x, this.hut.z);
    this.witch.arena = { x: this.centre.x, z: this.centre.z, radius: this.radius - this.fc.ringMargin };
    if (this.clock.phase !== 'night') this.skipToNight();
    this.clock.setPaused(true);
    this.flash(1);
    this.playCutscene?.('final.intro');
    this.bus.emit('final:started');
  }

  fight() {
    this.state = 'fight';
    this.bus.emit('final:fight');
  }

  // After the player's own step: hold them (and her) inside the ring, run
  // the cutscene, the sky, the fire and the particles.
  update(dt, cameraPosition) {
    if (this.state === 'idle') return;
    this.timer += dt;
    const fc = this.fc;
    // The intro cutscene turns the camera to the wreck as she rises.
    if (this.state === 'intro' && this.timer >= fc.introSeconds) this.fight();
    if (this.active) {
      this.blood = Math.min(1, this.blood + dt / fc.bloodRampSeconds);
      this.fire = Math.min(1, this.fire + dt / fc.bloodRampSeconds);
      this.contain(this.player.position, this.player);
      this.contain(this.witch, null);
    } else {
      // Over: the red drains away, the witchfire dies down.
      this.blood = Math.max(0, this.blood - dt / fc.drainSeconds);
      this.fire = Math.max(0, this.fire - dt / fc.drainSeconds);
    }
    this.sky.setBlood(this.blood, fc.sky);
    this.flashEl.style.opacity = String(Math.max(0, Number(this.flashEl.style.opacity) - dt * 1.5));
    this.updateRing(dt);
    this.updateParticles(dt, cameraPosition);
  }

  // Keep (x, z) inside the ring. player: stop their outward speed too.
  contain(pos, player) {
    const dx = pos.x - this.centre.x;
    const dz = pos.z - this.centre.z;
    const d = Math.hypot(dx, dz);
    const max = this.radius - this.fc.ringMargin;
    if (d <= max) return;
    pos.x = this.centre.x + (dx / d) * max;
    pos.z = this.centre.z + (dz / d) * max;
    if (player?.velocity) {
      player.velocity.x = 0;
      player.velocity.z = 0;
    }
  }

  // ---- the screen: a red flash (the letterbox is the cutscene's) ----------------------------------

  initDom(root) {
    this.el = document.createElement('div');
    this.el.className = 'final-battle';
    this.el.innerHTML = '<div class="final-flash"></div>';
    root.appendChild(this.el);
    this.flashEl = this.el.querySelector('.final-flash');
    this.flashEl.style.opacity = '0';
  }

  flash(amount) {
    this.flashEl.style.opacity = String(amount);
  }

  // ---- the witchfire ring ---------------------------------------------------------

  initRing(scene) {
    const fc = this.fc;
    const n = fc.flames;
    const flame = new THREE.ConeGeometry(0.5, 1, 5, 1, true);
    flame.translate(0, 0.5, 0);
    this.flameGeometry = flame;
    this.flameMaterial = new THREE.MeshBasicMaterial({ color: fc.fireColor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.flames = new THREE.InstancedMesh(flame, this.flameMaterial, n);
    this.flames.frustumCulled = false;
    this.flames.count = 0;
    scene.add(this.flames);
    this.flameSpots = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = this.centre.x + Math.sin(a) * this.radius;
      const z = this.centre.z + Math.cos(a) * this.radius;
      this.flameSpots.push({ x, z, y: this.world.ground.heightAt(x, z), phase: i * 1.7 });
    }
    this.matrix = new THREE.Matrix4();
    this.scaleVec = new THREE.Vector3();
    this.posVec = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
  }

  updateRing() {
    if (this.fire <= 0) {
      this.flames.count = 0;
      return;
    }
    const fc = this.fc;
    const t = this.timer;
    this.flameSpots.forEach((f, i) => {
      const flicker = 0.75 + 0.25 * Math.sin(t * 9 + f.phase) * Math.sin(t * 5.3 + f.phase * 0.7);
      const h = fc.fireHeight * this.fire * flicker;
      this.scaleVec.set(fc.fireWidth, Math.max(0.01, h), fc.fireWidth);
      this.posVec.set(f.x, f.y, f.z);
      this.flames.setMatrixAt(i, this.matrix.compose(this.posVec, this.quat, this.scaleVec));
    });
    this.flames.count = this.flameSpots.length;
    this.flames.instanceMatrix.needsUpdate = true;
    this.flameMaterial.opacity = fc.fireOpacity * (0.6 + 0.4 * this.fire);
  }

  // ---- embers rising, ash falling ------------------------------------------------

  initParticles(scene) {
    const fc = this.fc;
    const make = (count, color, size, opacity) => {
      const positions = new Float32Array(count * 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      points.visible = false;
      scene.add(points);
      return { points, positions, count, seeded: false };
    };
    this.embers = make(fc.embers, fc.emberColor, fc.emberSize, 0.9);
    this.ash = make(fc.ash, fc.ashColor, fc.ashSize, 0.5);
    this.ash.points.material.blending = THREE.NormalBlending;
  }

  updateParticles(dt, cameraPosition) {
    const fc = this.fc;
    const on = this.blood > 0.05 && cameraPosition;
    for (const [sys, rise] of [
      [this.embers, fc.emberRise],
      [this.ash, -fc.ashFall],
    ]) {
      sys.points.visible = Boolean(on);
      if (!on) continue;
      sys.points.material.opacity = (rise > 0 ? 0.9 : 0.5) * this.blood;
      const box = fc.particleBox;
      const p = sys.positions;
      for (let i = 0; i < sys.count; i++) {
        const k = i * 3;
        if (!sys.seeded) {
          p[k] = cameraPosition.x + (hash(i, 1) - 0.5) * box;
          p[k + 1] = cameraPosition.y + (hash(i, 2) - 0.3) * box * 0.5;
          p[k + 2] = cameraPosition.z + (hash(i, 3) - 0.5) * box;
          continue;
        }
        // Drift (a little sideways sway), and wrap round the camera.
        p[k] += Math.sin(this.timer * 0.7 + i) * dt * 0.4;
        p[k + 1] += rise * dt * (0.6 + hash(i, 4) * 0.8);
        p[k + 2] += Math.cos(this.timer * 0.5 + i) * dt * 0.4;
        p[k] = wrap(p[k], cameraPosition.x, box);
        p[k + 1] = wrap(p[k + 1], cameraPosition.y + box * 0.15, box * 0.5);
        p[k + 2] = wrap(p[k + 2], cameraPosition.z, box);
      }
      sys.seeded = true;
      sys.points.geometry.attributes.position.needsUpdate = true;
    }
  }

  // Debug.
  overlayLine() {
    return this.state === 'idle' ? 'final battle: not begun' : `final battle: ${this.state} ${this.timer.toFixed(0)}s  blood ${this.blood.toFixed(2)}  ring ${Math.round(this.radius)}m`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.el.remove();
    this.flames.removeFromParent();
    this.flameGeometry.dispose();
    this.flameMaterial.dispose();
    for (const sys of [this.embers, this.ash]) {
      sys.points.removeFromParent();
      sys.points.geometry.dispose();
      sys.points.material.dispose();
    }
  }
}

// v kept within `size` of `centre` (wrapping round).
function wrap(v, centre, size) {
  const half = size / 2;
  if (v < centre - half) return v + size;
  if (v > centre + half) return v - size;
  return v;
}

function hash(i, k) {
  const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
