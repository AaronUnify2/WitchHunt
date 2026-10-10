// M0 placeholder scene: a ground plane, box trees, a night sky colour and
// fog. Exists only so movement and look can be felt on the controller.
// M1 replaces it with the real sky, forest and clearing.

import * as THREE from 'three';

export class TestScene {
  constructor(sceneConfig, rng) {
    this.cfg = sceneConfig;
    this.rng = rng;
  }

  init() {
    const c = this.cfg;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(c.skyColor);
    this.scene.fog = new THREE.Fog(c.fogColor, c.fogNear, c.fogFar);

    this.scene.add(new THREE.AmbientLight(c.ambientColor, c.ambientIntensity));
    const moon = new THREE.DirectionalLight(c.moonColor, c.moonIntensity);
    moon.position.set(c.moonDirection.x, c.moonDirection.y, c.moonDirection.z);
    this.scene.add(moon);

    this.scene.add(this.buildGround());
    for (const mesh of this.buildTrees()) this.scene.add(mesh);
  }

  update() {}

  dispose() {
    this.scene.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.dispose();
    });
  }

  buildGround() {
    const size = this.cfg.groundSize;
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({ color: this.cfg.groundColor });
    return new THREE.Mesh(geometry, material);
  }

  // Trunks and canopies as two InstancedMeshes: two draw calls in total.
  buildTrees() {
    const c = this.cfg;
    const box = () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // base at y = 0
    const trunks = new THREE.InstancedMesh(box(), new THREE.MeshLambertMaterial({ color: c.trunkColor }), c.treeCount);
    const canopies = new THREE.InstancedMesh(box(), new THREE.MeshLambertMaterial({ color: c.canopyColor }), c.treeCount);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const half = c.groundSize / 2;

    for (let i = 0; i < c.treeCount; i++) {
      // Uniform over a ring between the clear radius and the ground edge.
      const angle = this.rng.range(0, Math.PI * 2);
      const radius = Math.sqrt(this.rng.range(c.treeClearRadius ** 2, half ** 2));
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const trunkHeight = this.rng.range(c.trunkHeightMin, c.trunkHeightMax);
      const canopyWidth = this.rng.range(c.canopyWidthMin, c.canopyWidthMax);
      const canopyHeight = this.rng.range(c.canopyHeightMin, c.canopyHeightMax);
      rotation.setFromAxisAngle(up, this.rng.range(0, Math.PI * 2));

      position.set(x, 0, z);
      scale.set(c.trunkWidth, trunkHeight, c.trunkWidth);
      trunks.setMatrixAt(i, matrix.compose(position, rotation, scale));

      position.set(x, trunkHeight, z);
      scale.set(canopyWidth, canopyHeight, canopyWidth);
      canopies.setMatrixAt(i, matrix.compose(position, rotation, scale));
    }
    return [trunks, canopies];
  }
}
