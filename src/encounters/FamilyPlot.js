// The Pruitts' family plot (Nov 24, Aaron: "just a few headstones, no fences ... a big dead tree in the center ...
// one of those hanged mutants ... 3 at once"). Down the track from the farm, before the tear in the army's fence:
// the sigil ground 'familyCemetery'. What's here:
//  - the plot itself (render/familyCemeteryModel.js): six old headstones, the dead oak, three ropes;
//  - the Hanged (ai/Hanged.js): three bodies on those ropes, who come down for Tom;
//  - the witch's sigil, buried on Night 2 (NightTwo.ensurePlot), dug up as any (the director's). (Its moths are gone,
//    Nov 25, Aaron: too busy with the Hanged.)
// Saved: which of the Hanged are dead. Off in Demo mode.

import { buildFamilyCemetery } from '../render/familyCemeteryModel.js';
import { FamilyRenderer } from '../render/FamilyRenderer.js';
import { weatherFor } from '../render/propKit.js';
import { Hanged } from '../ai/Hanged.js';
import { DEBUG } from '../debug/DebugMenu.js';
import { clearingFrame, frameAnchor } from '../world/clearingFrame.js';
import * as THREE from 'three';

const LOOKS = ['hangedA', 'hangedB', 'hangedC', 'hangedD']; // Nov 25: the four campers (Dan, Jess, Marcus, Kyle)

export class FamilyPlot {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.pc = cfg.familyPlot;
    this.bus = bus;
    this.dead = new Set();
    this.swept = false;
  }

  // ctx: { world, player, combat, colliders, rng, cutscenes, demo, notify, drawDistance }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.scene = scene;
    this.ground = ctx.world.ground;
    this.plot = ctx.world.map.clearings.find((c) => c.cluster && c.key === 'familyCemetery') ?? null;
    if (!this.plot) return;
    const p = this.plot;
    this.y = this.ground.heightAt(p.x, p.z);
    // Its frame for the sweep: walking in from the farm, x right, z ahead (the tree at its centre).
    this.frame = clearingFrame(ctx.world.map, 'familyCemetery', 'pruittFarm');
    this.model = buildFamilyCemetery(this.pc, { weather: scene ? weatherFor(this.cfg.props.weather, this.pc.look.weather) : null });
    this.model.group.position.set(p.x, this.y, p.z);
    if (scene) scene.add(this.model.group);
    this.colliderList = this.model.colliders.map((c) => ({ x: p.x + c.x, z: p.z + c.z, r: c.r }));
    for (const c of this.colliderList) this.colliders?.insert(c);
    this.ropes = this.model.ropes.map((r) => ({ x: p.x + r.x, y: this.y + r.y, z: p.z + r.z }));
    const peopleCfg = { ...this.cfg.family, people: { ...this.cfg.family.people, ...this.cfg.people } };
    const makeBody = scene
      ? (look) => {
          const mesh = new THREE.Group();
          const r = new FamilyRenderer(peopleCfg, [look]);
          r.init(mesh, [{ x: 0, z: 0 }], 0, 0);
          scene.add(mesh);
          return {
            mesh,
            height: this.cfg.people[look].height,
            pose: (name, rate = null) => r.setPose(0, name, rate),
            update: (dt) => r.update(dt, null),
            dispose: () => {
              r.dispose();
              mesh.removeFromParent();
            },
          };
        }
      : null;
    this.hanged = new Hanged(this.pc.hanged, {
      player: this.player,
      combat: this.combat,
      colliders: this.colliders,
      ground: this.ground,
      bus: this.bus,
      rng: this.rng,
      makeBody,
      sfx: (name, at) => this.combat?.sfx?.play(name, at),
    });
    // The ropes: from each knot down to its body's neck while it hangs; a short frayed end once it's come down.
    if (scene) {
      this.ropeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5, 1, true).translate(0, -0.5, 0);
      this.ropeMat = new THREE.MeshLambertMaterial({ color: this.pc.look.colors.rope });
      this.ropeMeshes = this.ropes.map((r) => {
        const m = new THREE.Mesh(this.ropeGeo, this.ropeMat);
        m.position.set(r.x, r.y, r.z);
        scene.add(m);
        return m;
      });
    }
    this.hangThem();
    this.bus?.on?.('hanged:killed', ({ body }) => this.dead.add(body.i));
    this.bus?.on?.('plot:twitch', () => this.hanged.twitch(0)); // sweep.plot's last shot
    this.ready = true;
  }

  hangThem() {
    this.hanged?.hang(this.ropes, { x: this.plot.x, z: this.plot.z }, LOOKS, [...this.dead]);
  }

  update(dt, playing) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const d = Math.hypot(p.x - this.plot.x, p.z - this.plot.z);
    const near = d < (this.drawDistance?.() ?? 400) + this.plot.radius;
    if (this.model) this.model.group.visible = near;
    for (const h of this.hanged.list) if (h.body && h.state !== 'lurk') h.body.mesh.visible = near;
    // Nov 24 (Aaron: sweep the ground, the sigil, the moths and the Hanged): once, as he first comes near.
    if (playing && !this.swept && d < this.pc.sweepAt && this.hanged.list.some((h) => h.state === 'hang') && this.frame && this.cutscenes && !this.cutscenes.active) {
      this.swept = true;
      this.cutscenes.play('sweep.plot', { anchors: { familyPlot: frameAnchor(this.frame) } });
    }
    if (playing && d < 90) this.hanged.update(dt);
    this.placeRopes(near);
  }

  placeRopes(near) {
    if (!this.ropeMeshes) return;
    this.ropeMeshes.forEach((m, i) => {
      m.visible = near;
      const h = this.hanged.list.find((x) => x.i === i);
      const r = this.ropes[i];
      if (h && (h.state === 'hang' || h.state === 'wake')) {
        // Down to the neck, swinging with the body (Hanged.place).
        const pos = h.body?.mesh.position ?? { x: r.x, y: h.y, z: r.z };
        const neck = { x: pos.x, y: h.y + h.fullHeight * 0.865, z: pos.z };
        const len = Math.hypot(neck.x - r.x, neck.y - r.y, neck.z - r.z);
        m.scale.set(1, len, 1);
        m.rotation.set(Math.atan2(neck.z - r.z, r.y - neck.y) * -1, 0, Math.atan2(neck.x - r.x, r.y - neck.y));
      } else {
        m.scale.set(1, 0.85, 1); // the end it broke from, hanging
        m.rotation.set(0, 0, 0);
      }
    });
  }

  saveState() {
    return { dead: [...this.dead], swept: this.swept };
  }

  loadState(d) {
    this.dead = new Set(d?.dead ?? []);
    this.swept = Boolean(d?.swept);
    if (this.ready) this.hangThem();
  }

  // A new run: all three back on their ropes.
  reset() {
    this.dead.clear();
    this.swept = false;
    if (this.ready) this.hangThem();
  }

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem('Family plot: take me there (the Hanged in the dead oak)', () => {
      if (!this.ready) return;
      const p = this.plot;
      this.player.teleport(p.x, p.z - 22, 0);
      this.notify?.('The Pruitts\' family plot, ahead');
    });
    cat.addItem('Family plot: hang them again', () => this.reset());
  }

  dispose() {
    this.hanged?.dispose();
    for (const m of this.ropeMeshes ?? []) m.removeFromParent();
    this.ropeGeo?.dispose();
    this.ropeMat?.dispose();
    this.model?.dispose();
    this.model?.group.removeFromParent();
  }
}
