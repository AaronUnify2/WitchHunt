// Pickups on the ground: small placeholder boxes, coloured by item
// (data/loot.json, darkened so the torch doesn't burn them out), turning
// slowly and bobbing just above the ground with a faint glint so they
// show at night. One instanced mesh, one draw call.

import * as THREE from 'three';

export class PickupRenderer {
  constructor(pickupConfig) {
    this.cfg = pickupConfig;
  }

  // items: data/loot.json's items (for their colours).
  init(scene, poolSize, items) {
    const c = this.cfg;
    const geometry = new THREE.BoxGeometry(c.size, c.size * 0.6, c.size * 0.8);
    this.material = new THREE.MeshLambertMaterial({ emissive: c.emissive });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, poolSize);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Darkened: lit head-on by the torch, the data's colours burn out.
    this.colours = Object.fromEntries(Object.entries(items).map(([id, def]) => [id, new THREE.Color(def.color).multiplyScalar(c.albedoScale)]));
    this.fallback = new THREE.Color(0xffffff);
    for (let i = 0; i < poolSize; i++) this.mesh.setColorAt(i, this.fallback);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.matrix = new THREE.Matrix4();
    this.quat = new THREE.Quaternion();
    this.pos = new THREE.Vector3();
    this.scale = new THREE.Vector3(1, 1, 1);
    this.up = new THREE.Vector3(0, 1, 0);
    this.time = 0;
  }

  update(dt, pickups) {
    const c = this.cfg;
    this.time += dt;
    let n = 0;
    for (const p of pickups) {
      if (!p.active) continue;
      this.pos.set(p.x, p.y + c.lift + Math.sin(this.time * 2 + p.phase) * c.bob, p.z);
      this.quat.setFromAxisAngle(this.up, this.time * c.spin + p.phase);
      this.mesh.setMatrixAt(n, this.matrix.compose(this.pos, this.quat, this.scale));
      this.mesh.setColorAt(n, this.colours[p.item] ?? this.fallback);
      n++;
    }
    this.mesh.count = n;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.removeFromParent();
    this.material.dispose();
  }
}
