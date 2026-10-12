// The witch's hut, a placeholder (M7 step 4; the art pass replaces it): a
// crooked shack of dark weathered planks on a low stone footing, leaning
// out of true, under a steep sagging roof of moss and bark, with a
// leaning stone chimney. A black doorway with an antlered skull over it,
// window slits glowing a sickly green, bundles of sticks hung from the
// eaves. Destroyed: a burning wreck of broken wall stumps, scattered
// planks and glowing embers.
//
// The intact hut is three draw calls (lit body, unlit glow, door);
// the wreck is two (lit, embers).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A box with a vertex colour, its base at y = 0 before `y`.
function box(w, h, d, x, y, z, colour, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(0, h / 2, 0);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  const c = new THREE.Color(colour);
  const n = g.attributes.position.count;
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.toArray(rgb, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
  return g;
}

// Lean the top of a geometry over by `amount` metres in x per metre of height.
function lean(g, amount) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) + p.getY(i) * amount);
  return g;
}

export class HutRenderer {
  constructor(hutConfig) {
    this.cfg = hutConfig;
  }

  // hut: { x, y, z, facing }.
  init(scene, hut) {
    const c = this.cfg;
    const look = c.look;
    this.group = new THREE.Group();
    this.group.position.set(hut.x, hut.y, hut.z);
    this.group.rotation.y = hut.facing;
    scene.add(this.group);
    this.geometries = [];
    this.lit = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.glowMaterial = new THREE.MeshBasicMaterial({ color: look.glow });
    this.blackMaterial = new THREE.MeshBasicMaterial({ color: 0x020202 });
    this.emberMaterial = new THREE.MeshBasicMaterial({ color: look.ember, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

    const W = c.width;
    const D = c.depth;
    const H = c.height;
    // ---- intact ----
    const body = [];
    body.push(box(W + 0.4, 0.35, D + 0.4, 0, 0, 0, look.stone)); // footing
    const walls = lean(box(W, H, D, 0, 0.3, 0, look.wood), 0.06);
    body.push(walls);
    // Planks: darker uprights across the front and sides.
    for (let i = 0; i < 9; i++) {
      const x = -W / 2 + 0.25 + i * ((W - 0.5) / 8);
      if (Math.abs(x) < 0.7) continue; // the doorway
      body.push(lean(box(0.12, H - 0.1, 0.06, x, 0.32, D / 2 + 0.02, look.plank), 0.06));
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) body.push(lean(box(0.06, H - 0.1, 0.12, side * (W / 2 + 0.02), 0.32, -D / 2 + 0.3 + i * ((D - 0.6) / 5), look.plank), 0.06));
    }
    // The roof: two steep slabs meeting at a crooked ridge, overhanging.
    const slope = 0.78;
    const slab = (side) => {
      const g = box(W + 1.0, 0.14, D / 2 / Math.cos(slope) + 0.6, 0, 0, 0, look.roof, side * slope, 0, side * 0.04);
      g.translate(0.18, H + 0.3 + Math.tan(slope) * (D / 4) - 0.1, side * (D / 4));
      return g;
    };
    body.push(slab(1), slab(-1));
    body.push(box(W + 1.1, 0.16, 0.2, 0.2, H + 0.3 + Math.tan(slope) * (D / 2) - 0.12, 0, look.plank, 0, 0, 0.05)); // ridge
    body.push(lean(box(0.7, 2.2, 0.7, -W / 2 + 0.6, H - 0.2, -D / 4, look.stone), 0.15)); // chimney
    // The antlered skull over the door.
    body.push(box(0.26, 0.24, 0.2, 0, H - 0.3, D / 2 + 0.1, look.bone));
    for (const side of [-1, 1]) {
      body.push(box(0.04, 0.5, 0.04, side * 0.12, H - 0.1, D / 2 + 0.1, look.bone, 0, 0, -side * 0.7));
      body.push(box(0.03, 0.25, 0.03, side * 0.32, H + 0.12, D / 2 + 0.1, look.bone, 0, 0, -side * 0.2));
    }
    // Bundles of sticks hung from the eaves.
    for (const x of [-2.1, -1.3, 1.4, 2.2]) body.push(box(0.12, 0.5, 0.12, x, H - 0.25, D / 2 + 0.35, look.plank, 0.1, 0, x * 0.05));
    const bodyGeometry = mergeGeometries(body);
    for (const g of body) g.dispose();
    this.geometries.push(bodyGeometry);
    this.intact = new THREE.Group();
    const bodyMesh = new THREE.Mesh(bodyGeometry, this.lit);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.intact.add(bodyMesh);
    // The doorway: unlit black, so nothing inside can be seen.
    const door = new THREE.PlaneGeometry(1.1, 2.0);
    door.translate(0.06, 1.3, D / 2 + 0.03);
    this.geometries.push(door);
    this.intact.add(new THREE.Mesh(door, this.blackMaterial));
    // Window slits glowing green.
    const slits = [];
    for (const x of [-1.6, 1.7]) {
      const g = new THREE.PlaneGeometry(0.5, 0.14);
      g.translate(x + 0.08, 1.75, D / 2 + 0.04);
      slits.push(g);
    }
    const sideSlit = new THREE.PlaneGeometry(0.5, 0.14);
    sideSlit.rotateY(Math.PI / 2);
    sideSlit.translate(W / 2 + 0.16, 1.7, 0.4);
    slits.push(sideSlit);
    const glow = mergeGeometries(slits);
    for (const g of slits) g.dispose();
    this.geometries.push(glow);
    this.intact.add(new THREE.Mesh(glow, this.glowMaterial));
    this.group.add(this.intact);

    // ---- the wreck (hidden until it's destroyed) ----
    const wreck = [];
    wreck.push(box(W + 0.4, 0.35, D + 0.4, 0, 0, 0, look.stone));
    // Broken wall stumps.
    wreck.push(box(W * 0.6, 0.9, 0.2, -W * 0.18, 0.3, -D / 2, look.charred, 0, 0, 0.1));
    wreck.push(box(0.2, 0.6, D * 0.7, -W / 2, 0.3, 0, look.charred, 0.08, 0, 0));
    wreck.push(box(0.2, 1.2, D * 0.4, W / 2, 0.3, -D * 0.2, look.charred));
    wreck.push(lean(box(0.7, 1.4, 0.7, -W / 2 + 0.6, 0.3, -D / 4, look.stone), 0.3)); // the chimney's stump
    // Planks and roof thrown about.
    const scatter = [
      [2.2, 0.4, 3.4, 0.4, 1.1],
      [-3.0, 1.8, 2.8, -0.3, 0.5],
      [0.4, -3.6, 2.2, 0.2, 2.2],
      [3.6, -1.4, 1.8, -0.5, 0.2],
      [-1.4, 3.4, 2.4, 0.3, 1.7],
      [1.0, 1.0, 3.0, 0.6, 2.9],
    ];
    for (const [x, z, len, tilt, ry] of scatter) wreck.push(box(0.18, 0.08, len, x, 0.05, z, look.charred, tilt, ry, 0));
    wreck.push(box(2.8, 0.14, 2.2, 3.2, 0.1, 2.6, look.roof, 0.3, 0.8, 0.2));
    const wreckGeometry = mergeGeometries(wreck);
    for (const g of wreck) g.dispose();
    this.geometries.push(wreckGeometry);
    this.wreckGroup = new THREE.Group();
    const wreckMesh = new THREE.Mesh(wreckGeometry, this.lit);
    wreckMesh.castShadow = true;
    this.wreckGroup.add(wreckMesh);
    // Embers: small glowing chunks that pulse.
    const embers = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.4;
      const r = 0.6 + ((i * 37) % 10) * 0.25;
      const g = new THREE.BoxGeometry(0.22, 0.12, 0.2);
      g.translate(Math.sin(a) * r, 0.42, Math.cos(a) * r);
      embers.push(g.toNonIndexed());
    }
    const emberGeometry = mergeGeometries(embers);
    for (const g of embers) g.dispose();
    this.geometries.push(emberGeometry);
    this.wreckGroup.add(new THREE.Mesh(emberGeometry, this.emberMaterial));
    this.wreckGroup.visible = false;
    this.group.add(this.wreckGroup);
    this.time = 0;
  }

  wreck() {
    this.intact.visible = false;
    this.wreckGroup.visible = true;
  }

  update(dt, cameraPosition, drawDistance) {
    this.time += dt;
    const p = this.group.position;
    this.group.visible = !cameraPosition || Math.hypot(p.x - cameraPosition.x, p.z - cameraPosition.z) <= drawDistance + this.cfg.width * 2;
    if (!this.group.visible) return;
    // The window glow breathes; the embers flicker.
    const g = this.cfg.look;
    this.glowMaterial.color.setHex(g.glow).multiplyScalar(0.7 + 0.3 * Math.sin(this.time * 1.3));
    this.emberMaterial.opacity = 0.65 + 0.35 * Math.sin(this.time * 9) * Math.sin(this.time * 3.7);
  }

  dispose() {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const m of [this.lit, this.glowMaterial, this.blackMaterial, this.emberMaterial]) m.dispose();
  }
}
