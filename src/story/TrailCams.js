// Trail cameras (M8; DESIGN.md "The radio"): the family's network of
// cameras at fixed spots in the north and middle (trailCamPlacement.js).
// Witch sightings are limited on purpose:
//  - A camera reports her only if she passes in front of it while she's
//    out (not resting in the hut).
//  - The report comes after a delay (the family have to notice it).
//  - The map marks the camera, not her, for a while: a lead, never a tracker.
// Each sighting keeps where she was and when, for the clip (M8's cutscene
// system plays it back through that camera).
//
// Events: 'witch:trailCam' { cam, sighting } when the family report one.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { placeTrailCams, camSees } from './trailCamPlacement.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class TrailCams {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.tc = cfg.trailCams;
    this.rng = rng;
    this.bus = bus;
  }

  // ctx: { world, witch, clock, mapUi, player, notify(text), sfx, teleport(x, z, yaw) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.list = placeTrailCams(this.world.map, this.rng, this.tc).map((c) => ({
      ...c,
      y: this.world.ground.heightAt(c.x, c.z),
      cooldown: 0,
      leadUntil: -1,
      sightings: [],
    }));
    this.reports = []; // { cam, sighting, at }
    this.time = 0;
    this.lastSighting = null;
    this.mapUi.setTrailCams(this.list, this.tc.map, () => this.time);
    this.build(scene);
  }

  // A post with a camera box and its red light, at each spot (placeholder).
  build(scene) {
    const p = this.tc.post;
    const parts = [];
    const paint = (g, color) => {
      const c = new THREE.Color(color);
      const n = g.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      return g;
    };
    for (const cam of this.list) {
      const post = new THREE.BoxGeometry(0.14, p.height, 0.14).translate(0, p.height / 2, 0);
      const box = new THREE.BoxGeometry(0.2, 0.26, 0.14).translate(0, p.height - 0.2, -0.13);
      const led = new THREE.BoxGeometry(0.03, 0.03, 0.02).translate(0.05, p.height - 0.12, -0.21);
      for (const [g, color] of [[post, p.color], [box, p.box], [led, p.led]]) {
        g.rotateY(cam.facing);
        g.translate(cam.x, cam.y, cam.z);
        parts.push(paint(g, color));
      }
    }
    this.geometry = mergeGeometries(parts);
    for (const g of parts) g.dispose();
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  // Is she out where a camera could catch her?
  witchOut() {
    const w = this.witch;
    return w.alive && w.state !== 'resting' && w.state !== 'dead';
  }

  update(dt, playing) {
    if (!playing) return;
    this.time += dt;
    const w = this.witch;
    const out = this.witchOut();
    for (const cam of this.list) {
      cam.cooldown -= dt;
      if (!out || cam.cooldown > 0 || !camSees(cam, w.x, w.z, this.tc.range)) continue;
      this.caught(cam);
    }
    for (let i = this.reports.length - 1; i >= 0; i--) {
      const r = this.reports[i];
      if (this.time < r.at) continue;
      this.reports.splice(i, 1);
      this.report(r.cam, r.sighting);
    }
  }

  // She's on camera: the report comes later.
  caught(cam) {
    const w = this.witch;
    const d = this.tc.reportDelay;
    cam.cooldown = this.tc.cooldown;
    const sighting = { x: w.x, z: w.z, state: w.state, night: this.clock.day, hour: this.clock.hourOfDay, time: this.time };
    cam.sightings.push(sighting);
    this.reports.push({ cam, sighting, at: this.time + this.rng.range(d.min, d.max) });
  }

  // The family noticed: the camera is marked on the map for a while.
  // (Placeholder notice: the family's sighting lines are written with
  // Aaron, and the clip plays from the comms room's monitors in 12b.)
  report(cam, sighting) {
    cam.leadUntil = this.time + this.tc.leadSeconds;
    this.lastSighting = { cam, sighting };
    this.sfx?.play('radioCrackle');
    this.notify(`${cam.name.toUpperCase()}: something moved past it. It's marked on your map`);
    this.bus.emit('witch:trailCam', { cam, sighting });
  }

  // ---- debug and overlay ------------------------------------------------------------------

  addDebugItems(menu) {
    const story = menu.category(DEBUG.story);
    story.addItem('Trail cams: report a sighting now (nearest camera to her)', () => {
      const w = this.witch;
      let best = this.list[0];
      for (const c of this.list) if (Math.hypot(c.x - w.x, c.z - w.z) < Math.hypot(best.x - w.x, best.z - w.z)) best = c;
      const sighting = { x: w.x, z: w.z, state: w.state, night: this.clock.day, hour: this.clock.hourOfDay, time: this.time };
      best.sightings.push(sighting);
      this.report(best, sighting);
    });
    this.teleportIndex = -1;
    story.addItem(
      () => `Teleport: next trail camera (${this.list.length} placed)`,
      () => {
        if (this.list.length === 0) return;
        this.teleportIndex = (this.teleportIndex + 1) % this.list.length;
        const c = this.list[this.teleportIndex];
        // Stand just behind the post, looking where it looks.
        this.teleport(c.x + Math.sin(c.facing) * 1.5, c.z + Math.cos(c.facing) * 1.5, c.facing);
        this.notify(`At ${c.name}`);
      },
    );
  }

  overlayLine() {
    const leads = this.list.filter((c) => c.leadUntil > this.time).map((c) => c.id);
    return `${this.list.length} cams  pending ${this.reports.length}  leads ${leads.join(',') || '-'}  her ${this.witchOut() ? 'out' : 'in'}`;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
