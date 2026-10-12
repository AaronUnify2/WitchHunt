// The witch's traps (M7 step 3), placeholders made of simple shapes:
//  - Snare: a dark loop of root and rope flat on the ground, pegged at
//    four points. Hard to see without the torch (it's a trap).
//  - Hex totem: three sticks leaning into a bundle, a rune glowing at the
//    top, and a faint ring on the ground showing the zone that hurts.
//  - Alarm charm: a stake with a crossbar hung with pale bones that sway.
// One instanced mesh per part: six draw calls for every trap on the map.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const POOL = 64;

export class TrapRenderer {
  // look: config.witch.traps.look. zone: the totem's ring radius.
  constructor(look, zone) {
    this.cfg = look;
    this.zone = zone;
  }

  init(scene) {
    const c = this.cfg;
    this.geometries = [];
    this.materials = [];
    const instanced = (geometry, material) => {
      this.geometries.push(geometry);
      this.materials.push(material);
      const m = new THREE.InstancedMesh(geometry, material, POOL);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      scene.add(m);
      return m;
    };
    const lit = (color) => new THREE.MeshLambertMaterial({ color });

    // Snare: a flattened torus and four pegs.
    const loop = new THREE.TorusGeometry(0.45, 0.03, 4, 18);
    loop.rotateX(Math.PI / 2);
    loop.translate(0, 0.03, 0);
    const pegs = [0, 1, 2, 3].map((i) => {
      const g = new THREE.BoxGeometry(0.04, 0.16, 0.04);
      const a = (i / 4) * Math.PI * 2 + 0.4;
      g.translate(Math.sin(a) * 0.5, 0.06, Math.cos(a) * 0.5);
      return g.toNonIndexed();
    });
    const snare = mergeGeometries([loop.toNonIndexed(), ...pegs]);
    this.snares = instanced(snare, lit(c.rope));

    // Totem: three leaning sticks, a glowing rune, the zone ring. Built
    // 1.4 m tall, then scaled to look.totemHeight (Aaron: low to the ground).
    const th = c.totemHeight / 1.4;
    const sticks = [0, 1, 2].map((i) => {
      const g = new THREE.BoxGeometry(0.06, 1.4 * th, 0.06);
      g.translate(0, 0.7 * th, 0);
      g.rotateZ(0.16);
      g.rotateY((i / 3) * Math.PI * 2);
      return g.toNonIndexed();
    });
    const bind = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 6).toNonIndexed();
    bind.translate(0, 1.05 * th, 0);
    this.totems = instanced(mergeGeometries([...sticks, bind]), lit(c.wood));
    const rune = new THREE.OctahedronGeometry(0.13, 0);
    rune.scale(1, 1.6, 0.4);
    rune.translate(0, 1.3 * th, 0);
    this.runes = instanced(rune, new THREE.MeshBasicMaterial({ color: c.glow, fog: false }));
    const ring = new THREE.RingGeometry(this.zone * 0.94, this.zone, 36);
    ring.rotateX(-Math.PI / 2);
    ring.translate(0, 0.05, 0);
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: c.glow, transparent: true, opacity: c.ringOpacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.rings = instanced(ring, this.ringMaterial);

    // Charm: a stake and crossbar, and three bones hanging from it.
    const stake = new THREE.BoxGeometry(0.06, 1.5, 0.06).toNonIndexed();
    stake.translate(0, 0.75, 0);
    const bar = new THREE.BoxGeometry(0.7, 0.05, 0.05).toNonIndexed();
    bar.translate(0, 1.35, 0);
    this.charms = instanced(mergeGeometries([stake, bar]), lit(c.wood));
    const bones = [-0.28, 0, 0.28].map((x, i) => {
      const g = new THREE.BoxGeometry(0.05, 0.2 + i * 0.05, 0.05);
      g.translate(x, 1.18 - i * 0.03, 0);
      return g.toNonIndexed();
    });
    this.bones = instanced(mergeGeometries(bones), lit(c.bone));

    this.matrix = new THREE.Matrix4();
    this.quat = new THREE.Quaternion();
    this.euler = new THREE.Euler();
    this.pos = new THREE.Vector3();
    this.one = new THREE.Vector3(1, 1, 1);
    this.time = 0;
  }

  // traps: the Traps list. held: the snare holding the player (drawn
  // closed tight), or null. cameraPosition, drawDistance: only near ones.
  update(traps, held, dt, cameraPosition, drawDistance) {
    this.time += dt;
    const counts = { snares: 0, totems: 0, charms: 0 };
    const m = this.matrix;
    for (const t of traps) {
      if (!t.active && t !== held) continue;
      if (cameraPosition && Math.hypot(t.x - cameraPosition.x, t.z - cameraPosition.z) > drawDistance) continue;
      // Each faces its own way (from its id), so they don't all line up.
      this.euler.set(0, t.id * 2.39996, 0);
      this.quat.setFromEuler(this.euler);
      this.pos.set(t.x, t.y, t.z);
      if (t.type === 'snare') {
        if (counts.snares >= POOL) continue;
        const tight = t === held ? 0.6 : 1;
        m.compose(this.pos, this.quat, this.one.set(tight, 1, tight));
        this.one.set(1, 1, 1);
        this.snares.setMatrixAt(counts.snares++, m);
      } else if (t.type === 'totem') {
        if (counts.totems >= POOL) continue;
        m.compose(this.pos, this.quat, this.one);
        this.totems.setMatrixAt(counts.totems, m);
        this.rings.setMatrixAt(counts.totems, m);
        // The rune turns slowly.
        this.euler.set(0, this.time * 0.8 + t.id, 0);
        this.quat.setFromEuler(this.euler);
        this.runes.setMatrixAt(counts.totems, m.compose(this.pos, this.quat, this.one));
        counts.totems++;
      } else {
        if (counts.charms >= POOL) continue;
        m.compose(this.pos, this.quat, this.one);
        this.charms.setMatrixAt(counts.charms, m);
        // The bones sway in a wind you can't feel.
        this.euler.set(Math.sin(this.time * 1.7 + t.id) * 0.06, t.id * 2.39996, Math.sin(this.time * 1.3 + t.id) * 0.05);
        this.quat.setFromEuler(this.euler);
        this.bones.setMatrixAt(counts.charms++, m.compose(this.pos, this.quat, this.one));
      }
    }
    this.ringMaterial.opacity = this.cfg.ringOpacity * (0.7 + 0.3 * Math.sin(this.time * 2.4));
    this.finish(this.snares, counts.snares);
    for (const mesh of [this.totems, this.runes, this.rings]) this.finish(mesh, counts.totems);
    for (const mesh of [this.charms, this.bones]) this.finish(mesh, counts.charms);
  }

  finish(mesh, n) {
    mesh.count = n;
    if (n > 0) mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    for (const m of [this.snares, this.totems, this.runes, this.rings, this.charms, this.bones]) m.removeFromParent();
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
  }
}
