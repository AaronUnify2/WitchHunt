// Placeholder marker for each sigil ground (agreed with Aaron: only what
// matters for play now; the scarecrow, cemetery, circus and the rest are
// an encounter session's job): a ring of dark, leaning stakes round the
// clearing, so you can tell a sigil ground from a plain clearing. One
// small instanced mesh per ground, drawn only when near.

import * as THREE from 'three';

export class SigilGroundMarkers {
  constructor(markerConfig, rng) {
    this.cfg = markerConfig;
    this.rng = rng;
  }

  init(scene, map, ground) {
    const c = this.cfg;
    this.group = new THREE.Group();
    this.geometry = new THREE.BoxGeometry(c.width, 1, c.width).translate(0, 0.5, 0);
    this.material = new THREE.MeshLambertMaterial({ color: c.color });
    this.meshes = [];
    this.drawDistance = Infinity;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const scale = new THREE.Vector3();
    const position = new THREE.Vector3();
    for (const cl of map.clearings) {
      if (cl.kind !== 'sigilGround') continue;
      const mesh = new THREE.InstancedMesh(this.geometry, this.material, c.stakes);
      for (let i = 0; i < c.stakes; i++) {
        const a = (i / c.stakes) * Math.PI * 2 + this.rng.range(-0.2, 0.2);
        const r = c.ringRadius + this.rng.range(-0.8, 0.8);
        const x = cl.x + Math.sin(a) * r;
        const z = cl.z + Math.cos(a) * r;
        position.set(x, ground.heightAt(x, z) - 0.05, z);
        euler.set(this.rng.range(-c.tilt, c.tilt), this.rng.range(0, Math.PI), this.rng.range(-c.tilt, c.tilt));
        rotation.setFromEuler(euler);
        scale.set(1, this.rng.range(c.heightMin, c.heightMax), 1);
        mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
      }
      mesh.castShadow = true;
      mesh.computeBoundingSphere();
      mesh.userData.centre = { x: cl.x, z: cl.z };
      this.group.add(mesh);
      this.meshes.push(mesh);
    }
    scene.add(this.group);
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
  }

  update(cameraPosition) {
    for (const m of this.meshes) {
      const c = m.userData.centre;
      m.visible = Math.hypot(c.x - cameraPosition.x, c.z - cameraPosition.z) <= this.drawDistance + this.cfg.ringRadius;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.group.removeFromParent();
  }
}
