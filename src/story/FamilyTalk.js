// Talking to the family face to face (M8; DESIGN.md "The family",
// "Dialogue presentation"). They shelter in the comms room; by day (or
// any time you're with them) you hold interact while looking at one of
// them and they say their newest line (Dialogue.talkTo).
//  - The talking bob: the speaker bobs while their line types on.
//  - The new-line marker: a small diamond floats over anyone with
//    something new to say.
//  - Pressing interact while they talk types the rest of the line, or
//    moves on to the next.
// The figures are the station's placeholders (StationRenderer.family);
// their real look is Session 13's (#148).

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';

const DEG = Math.PI / 180;

export class FamilyTalk {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.familyTalk;
    this.bus = bus;
  }

  // ctx: { dialogue, subtitles, player, figures: [Object3D] (in config.story.family's
  // order), inRoom() (Tom is in the comms room with them: no talking through walls) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.ids = this.cfg.story.family;
    this.hold = new HoldAction();
    this.hold.init();
    this.hud = { prompt: '', progress: 0 }; // read by Combat's HUD (a prompt source)
    this.baseY = this.figures.map((f) => f.position.y);
    this.time = 0;
    this.checkTimer = 0;
    this.talkingTo = null;
    const m = this.fc.marker;
    this.markerGeo = new THREE.OctahedronGeometry(m.size, 0).scale(0.7, 1.3, 0.7);
    this.markerMat = new THREE.MeshBasicMaterial({ color: m.color, fog: false });
    this.markers = this.figures.map((f) => {
      const mesh = new THREE.Mesh(this.markerGeo, this.markerMat);
      mesh.visible = false;
      scene.add(mesh);
      return mesh;
    });
    this.heads = this.figures.map((f) => new THREE.Box3().setFromObject(f).max.y - f.position.y);
  }

  // The family member you're looking at, close enough to talk to: an index, or -1.
  facing() {
    const cam = this.player.camera;
    const p = cam.position;
    const yaw = this.player.yaw;
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const cos = Math.cos(this.fc.lookAngle * DEG);
    let best = -1;
    let bestD = Infinity;
    this.figures.forEach((f, i) => {
      const dx = f.position.x - p.x;
      const dz = f.position.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > this.fc.range || d < 0.01) return;
      if ((dx * fx + dz * fz) / d < cos) return;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  // Before the station's step (its interactions wait while this one shows).
  // canTalk: playing, alive, nothing else open.
  update(dt, input, canTalk) {
    this.time += dt;
    const sub = this.subtitles;
    if (this.talkingTo !== null && !sub.busy) this.talkingTo = null;
    const i = canTalk && this.inRoom() ? this.facing() : -1;
    const id = i >= 0 ? this.ids[i] : null;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const name = id ? this.cfg.story.speakers[id].name : '';
    if (this.talkingTo !== null && id) {
      // Mid-conversation: interact moves it on.
      this.hud.prompt = `${X}: next`;
      this.hud.progress = 0;
      if (input.wasPressed('interact')) sub.advance();
      this.hold.update(dt, null, false, 1);
    } else if (id) {
      const done = this.hold.update(dt, id, input.isDown('interact'), this.fc.holdSeconds);
      this.hud.prompt = `Hold ${X}: talk to ${name}`;
      this.hud.progress = this.hold.progress;
      if (done && this.dialogue.talkTo(id)) this.talkingTo = id;
    } else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
    this.updateBob();
    this.updateMarkers(dt);
  }

  // The talking bob: whoever's line is typing on bobs (in the room or not).
  updateBob() {
    const talking = this.subtitles.talking;
    this.figures.forEach((f, i) => {
      const on = talking === this.ids[i] && !this.subtitles.current?.radio;
      f.position.y = this.baseY[i] + (on ? Math.abs(Math.sin(this.time * this.fc.bobRate)) * this.fc.bobHeight : 0);
    });
  }

  updateMarkers(dt) {
    const m = this.fc.marker;
    this.checkTimer -= dt;
    if (this.checkTimer <= 0) {
      this.checkTimer = m.checkEvery;
      this.markers.forEach((mk, i) => (mk.visible = this.dialogue.hasNew(this.ids[i]) && this.talkingTo !== this.ids[i]));
    }
    this.markers.forEach((mk, i) => {
      if (!mk.visible) return;
      const f = this.figures[i];
      mk.position.set(f.position.x, this.baseY[i] + this.heads[i] + m.above + Math.sin(this.time * 3 + i) * m.bob, f.position.z);
      mk.rotation.y = this.time * 1.5;
    });
  }

  dispose() {
    for (const mk of this.markers) mk.removeFromParent();
    this.markerGeo.dispose();
    this.markerMat.dispose();
  }
}
