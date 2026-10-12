// The witch's placeholder 3D figure (M7; Aaron agreed, and she gets more
// detail in the art pass). Tall, thin and stooped: a ragged dark cloak
// with a torn hem, a hood, a pale gaunt face, a crown of sticks like
// antlers, long arms with long fingers, and two small unlit eyes that
// the torch and the bloom pick out in the dark.
//
// One group: the body (one merged mesh), two arms (they swing as she
// runs and rise while she plants) and the eyes: four draw calls plus the
// torch shadow, and only while she's out and near. The ritual ring (two
// glowing rings on the ground round her while she plants) is two more.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Model faces +z, feet at y = 0, about 2.3 m tall before scaling.
const MODEL_HEIGHT = 2.3;
const SHOULDER = { x: 0.24, y: 1.86, z: 0.1 };

export class WitchRenderer {
  constructor(lookConfig, rng) {
    this.cfg = lookConfig;
    this.rng = rng;
  }

  init(scene) {
    const c = this.cfg;
    const scale = c.height / MODEL_HEIGHT;
    this.group = new THREE.Group();
    this.group.rotation.order = 'YXZ';
    this.group.visible = false;
    this.group.scale.setScalar(scale);
    scene.add(this.group);

    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const body = this.bodyGeometry();
    this.body = new THREE.Mesh(body, this.material);
    this.body.castShadow = true;
    this.group.add(this.body);

    this.armGeometry = this.armGeometryMake();
    this.arms = [-1, 1].map((side) => {
      const arm = new THREE.Mesh(this.armGeometry, this.material);
      arm.position.set(SHOULDER.x * side, SHOULDER.y, SHOULDER.z);
      arm.rotation.order = 'YXZ';
      arm.castShadow = true;
      this.group.add(arm);
      return arm;
    });

    const eye = (x) => {
      const g = new THREE.BoxGeometry(0.06, 0.035, 0.02);
      g.translate(x, 2.03, 0.33);
      return g;
    };
    const eyes = [eye(-0.05), eye(0.05)];
    this.eyeGeometry = mergeGeometries(eyes);
    for (const g of eyes) g.dispose();
    this.eyeMaterial = new THREE.MeshBasicMaterial({ color: c.eyes });
    this.eyes = new THREE.Mesh(this.eyeGeometry, this.eyeMaterial);
    this.group.add(this.eyes);

    // The ritual: two rings flat on the ground, glowing (unlit, additive,
    // seen through the fog so it reads from further away through the trees).
    const r = c.ritual;
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: r.opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.ritual = new THREE.Group();
    this.ritual.visible = false;
    const outer = new THREE.RingGeometry(r.radius * 0.88, r.radius, 40);
    const inner = new THREE.RingGeometry(r.radius * 0.38, r.radius * 0.46, 5); // a pentagon
    outer.rotateX(-Math.PI / 2);
    inner.rotateX(-Math.PI / 2);
    this.ringGeometries = [outer, inner];
    this.outerRing = new THREE.Mesh(outer, this.ringMaterial);
    this.innerRing = new THREE.Mesh(inner, this.ringMaterial);
    this.ritual.add(this.outerRing, this.innerRing);
    scene.add(this.ritual);
    this.time = 0;
  }

  // The cloak, hood, head, crown and the body under them, merged.
  bodyGeometry() {
    const c = this.cfg;
    const rng = this.rng;
    const parts = [];
    const add = (g, colour) => {
      const col = new THREE.Color(colour);
      const n = g.attributes.position.count;
      const rgb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.toArray(rgb, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
      parts.push(g);
    };

    // The cloak: a tall open cone, its hem torn into uneven tatters.
    const cloak = new THREE.ConeGeometry(0.5, 1.75, 9, 3, true);
    const pos = cloak.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < -0.8) {
        pos.setY(i, y - rng.range(0, 0.22)); // tatters
        pos.setX(i, pos.getX(i) * rng.range(0.85, 1.15));
        pos.setZ(i, pos.getZ(i) * rng.range(0.85, 1.15));
      }
    }
    cloak.computeVertexNormals();
    cloak.translate(0, 0.95, 0);
    add(cloak, c.cloak);
    // A ragged inner layer, so the open cone isn't hollow from below.
    const under = new THREE.CylinderGeometry(0.16, 0.3, 1.2, 6);
    under.translate(0, 0.65, 0);
    add(under, c.cloakHem);
    // A ragged shawl over the shoulders, so she isn't just a cone.
    const shawl = new THREE.ConeGeometry(0.42, 0.62, 8, 2, true);
    const sp = shawl.attributes.position;
    for (let i = 0; i < sp.count; i++) if (sp.getY(i) < -0.2) sp.setY(i, sp.getY(i) - rng.range(0, 0.16));
    shawl.computeVertexNormals();
    shawl.translate(0, 1.62, 0.04);
    add(shawl, c.cloakHem);
    // Shoulders and chest, hunched forward.
    const chest = new THREE.BoxGeometry(0.5, 0.42, 0.3);
    chest.rotateX(0.35);
    chest.translate(0, 1.75, 0.06);
    add(chest, c.cloak);
    // The head, thrust forward, and its hood.
    const head = new THREE.BoxGeometry(0.2, 0.28, 0.22);
    head.translate(0, 2.0, 0.24);
    add(head, c.skin);
    const jaw = new THREE.BoxGeometry(0.12, 0.1, 0.14);
    jaw.translate(0, 1.85, 0.27);
    add(jaw, c.skin);
    const hood = new THREE.ConeGeometry(0.2, 0.55, 6, 1, true);
    hood.rotateX(-0.45);
    hood.translate(0, 2.16, 0.15);
    add(hood, c.cloak);
    // The crown: sticks splayed up and out like antlers.
    const sticks = 7;
    for (let i = 0; i < sticks; i++) {
      const t = i / (sticks - 1) - 0.5; // -0.5..0.5, left to right
      const len = rng.range(0.35, 0.6) * (1 - Math.abs(t) * 0.5);
      const a = -t * 2.2 + rng.range(-0.15, 0.15); // splay, about z
      const tilt = rng.range(-0.3, 0.1);
      const g = new THREE.BoxGeometry(0.03, len, 0.03);
      g.translate(0, len / 2, 0);
      g.rotateZ(a);
      g.rotateX(tilt);
      g.translate(t * 0.14, 2.24, 0.16);
      add(g, c.sticks);
      // A forked tine from halfway up most of them, splayed further out.
      if (Math.abs(t) > 0.1) {
        const f = new THREE.BoxGeometry(0.02, len * 0.4, 0.02);
        f.translate(0, len * 0.2, 0);
        f.rotateZ(a * 1.6);
        f.rotateX(tilt);
        f.translate(t * 0.14 - Math.sin(a) * len * 0.5, 2.24 + Math.cos(a) * len * 0.5, 0.16);
        add(f, c.sticks);
      }
    }
    const merged = mergeGeometries(parts);
    for (const g of parts) g.dispose();
    return merged;
  }

  // One arm, hanging from the shoulder (origin) down -y: a long thin
  // sleeve, a bony forearm and long fingers.
  armGeometryMake() {
    const c = this.cfg;
    const parts = [];
    const add = (g, colour) => {
      const col = new THREE.Color(colour);
      const n = g.attributes.position.count;
      const rgb = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.toArray(rgb, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
      parts.push(g);
    };
    const sleeve = new THREE.BoxGeometry(0.13, 0.62, 0.13);
    sleeve.translate(0, -0.31, 0);
    add(sleeve, c.cloak);
    const forearm = new THREE.BoxGeometry(0.06, 0.42, 0.06);
    forearm.translate(0, -0.78, 0);
    add(forearm, c.skin);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.BoxGeometry(0.018, 0.22, 0.018);
      f.translate((i - 1.5) * 0.022, -1.09, 0.02);
      f.rotateX(0.15);
      add(f, c.skin);
    }
    const merged = mergeGeometries(parts);
    for (const g of parts) g.dispose();
    return merged;
  }

  // w: the Witch (x, y, z, facing, state, tier, moved, walked,
  // plantProgress, spot). Shown while she's out, near and within the draw distance.
  update(w, dt, cameraPosition, drawDistance) {
    const c = this.cfg;
    this.time += dt;
    const dist = cameraPosition ? Math.hypot(w.x - cameraPosition.x, w.z - cameraPosition.z) : 0;
    const out = w.state !== 'resting';
    const planting = w.state === 'planting';
    this.group.visible = out && w.tier !== 'abstract' && dist <= drawDistance;
    this.ritual.visible = planting && dist <= drawDistance;
    if (this.ritual.visible) this.poseRitual(w);
    if (!this.group.visible) return;

    const g = this.group;
    let lean = c.stoop;
    let bob = 0;
    let swing = 0;
    let armsUp = 0;
    let sway = 0;
    if (planting) {
      // Kneeling, rocking, arms raised over the spot.
      lean = c.stoop + 0.25 + Math.sin(this.time * 1.3) * 0.08;
      bob = -c.kneelDrop;
      armsUp = 1;
      sway = Math.sin(this.time * 0.9) * 0.06;
    } else if (w.moved > 0 || w.tier !== 'abstract') {
      const phase = (w.walked / c.stride) * Math.PI;
      bob = Math.abs(Math.sin(phase)) * c.runBob;
      swing = Math.sin(phase) * 0.7;
      sway = Math.sin(phase) * 0.05;
    }
    g.position.set(w.x, w.y + bob, w.z);
    g.rotation.set(lean, w.facing, sway);
    const [left, right] = this.arms;
    if (armsUp) {
      // Raised forward and a little out, trembling.
      const tremble = Math.sin(this.time * 9) * 0.04;
      left.rotation.set(-2.2 + tremble, 0, -0.25);
      right.rotation.set(-2.2 - tremble, 0, 0.25);
    } else {
      // Swinging as she runs, trailing a little behind.
      left.rotation.set(0.25 + swing, 0, -0.08);
      right.rotation.set(0.25 - swing, 0, 0.08);
    }
  }

  // The rings under her: they pulse, and the inner one turns and grows
  // as the ritual goes on.
  poseRitual(w) {
    const r = this.cfg.ritual;
    const at = w.spot ?? w;
    this.ritual.position.set(at.x, w.y + 0.06, at.z);
    const progress = w.plantProgress;
    const pulse = 0.65 + 0.35 * Math.sin(this.time * r.pulse * Math.PI * 2);
    this.ringMaterial.opacity = r.opacity * pulse;
    this.innerRing.rotation.y = this.time * 0.6;
    this.innerRing.scale.setScalar(0.6 + progress * 1.4);
  }

  dispose() {
    this.group.removeFromParent();
    this.ritual.removeFromParent();
    this.body.geometry.dispose();
    this.armGeometry.dispose();
    this.eyeGeometry.dispose();
    for (const g of this.ringGeometries) g.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
    this.ringMaterial.dispose();
  }
}
