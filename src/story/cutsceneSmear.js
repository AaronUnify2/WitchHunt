// A speed smear for a cutscene actor (Nov 24, Aaron: the witch on the camcorder "moving incredibly fast"):
// afterimages of her left behind as she moves, each a frozen copy of her pose at that moment in a flat,
// see-through dark, fading in a fraction of a second. Without them a move of a few metres in 0.15 s just pops.
//
// Ghosts are clones of the actor's model taken once (they share its geometry); every `every` seconds while the
// actor is moving faster than `minSpeed`, the oldest ghost takes the live model's pose (every node's position,
// rotation, scale and visibility, copied across in step) and its opacity starts again from `opacity`.
// Instanced parts (her hexes' pool, her shards) are left hidden in the ghosts.
// opts: { count, every, life, opacity, minSpeed, color }.

import * as THREE from 'three';

export class Smear {
  constructor(scene, model, opts = {}) {
    this.opts = { count: 6, every: 0.03, life: 0.28, opacity: 0.55, minSpeed: 6, color: 0x060806, ...opts };
    this.model = model;
    this.live = [];
    model.traverse((n) => this.live.push(n));
    this.ghosts = [];
    for (let i = 0; i < this.opts.count; i++) {
      const root = model.clone(true);
      const nodes = [];
      root.traverse((n) => nodes.push(n));
      const material = new THREE.MeshBasicMaterial({ color: this.opts.color, transparent: true, opacity: 0, depthWrite: false, fog: true });
      for (const n of nodes) {
        if (n.isInstancedMesh) n.visible = false;
        else if (n.isMesh) n.material = material;
      }
      root.visible = false;
      scene.add(root);
      this.ghosts.push({ root, nodes, material, age: Infinity });
    }
    this.next = 0;
    this.timer = 0;
    this.last = null;
    this.on = true;
  }

  // Every frame: dt seconds; the actor's model has been placed and posed for this frame.
  update(dt) {
    const p = this.model.position;
    const speed = this.last && dt > 0 ? Math.hypot(p.x - this.last.x, p.z - this.last.z) / dt : 0;
    this.last = { x: p.x, z: p.z };
    this.timer -= dt;
    if (this.on && this.model.visible && speed >= this.opts.minSpeed && this.timer <= 0) {
      this.timer = this.opts.every;
      this.snap(this.ghosts[this.next]);
      this.next = (this.next + 1) % this.ghosts.length;
    }
    for (const g of this.ghosts) {
      g.age += dt;
      const k = 1 - g.age / this.opts.life;
      g.root.visible = k > 0;
      g.material.opacity = Math.max(0, k) * this.opts.opacity;
    }
  }

  // The ghost takes the live model's pose now.
  snap(g) {
    const n = Math.min(this.live.length, g.nodes.length);
    for (let i = 0; i < n; i++) {
      const from = this.live[i];
      const to = g.nodes[i];
      to.position.copy(from.position);
      to.quaternion.copy(from.quaternion);
      to.scale.copy(from.scale);
      if (!to.isInstancedMesh) to.visible = from.visible;
    }
    g.root.visible = true;
    g.age = 0;
  }

  dispose() {
    for (const g of this.ghosts) {
      g.root.removeFromParent();
      g.material.dispose();
    }
    this.ghosts = [];
  }
}
