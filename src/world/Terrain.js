// The M1 test clearing's ground: a large textured plane, a dirt patch in
// the clearing and a few rocks (which cast flashlight shadows and block
// the player). M3 replaces this with the generated map's terrain.

import * as THREE from 'three';
import { makeGroundTexture, makeClearingTexture } from '../render/proceduralTextures.js';

export class Terrain {
  constructor(terrainConfig, rng) {
    this.cfg = terrainConfig;
    this.rng = rng;
  }

  init(scene, colliders) {
    this.group = new THREE.Group();
    this.group.add(this.buildGround(), this.buildClearing(), this.buildRocks(colliders));
    scene.add(this.group);
  }

  update() {}

  buildGround() {
    const c = this.cfg;
    const texture = makeGroundTexture(c, this.rng.fork('ground'));
    texture.repeat.set(c.size / c.tileMeters, c.size / c.tileMeters);
    const geometry = new THREE.PlaneGeometry(c.size, c.size).rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ map: texture }));
    mesh.receiveShadow = true;
    return mesh;
  }

  buildClearing() {
    const c = this.cfg;
    const diameter = c.clearingRadius * 2;
    const geometry = new THREE.PlaneGeometry(diameter, diameter).rotateX(-Math.PI / 2);
    const material = new THREE.MeshLambertMaterial({
      map: makeClearingTexture(c, this.rng.fork('clearing')),
      transparent: true,
      depthWrite: false,
      polygonOffset: true, // draw on top of the ground without z-fighting
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  buildRocks(colliders) {
    const r = this.cfg.rocks;
    const rng = this.rng.fork('rocks');
    const mesh = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      new THREE.MeshLambertMaterial({ color: r.color, flatShading: true }),
      r.count,
    );
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    for (let i = 0; i < r.count; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(r.spreadMin, r.spreadMax);
      const size = rng.range(r.sizeMin, r.sizeMax);
      position.set(Math.cos(angle) * dist, size * r.squash * 0.5, Math.sin(angle) * dist);
      rotation.setFromEuler(euler.set(rng.range(0, Math.PI), rng.range(0, Math.PI), 0));
      scale.set(size, size * r.squash, size);
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
      colliders.insert({ x: position.x, z: position.z, r: size * r.colliderScale });
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  dispose() {
    this.group.traverse((obj) => {
      obj.geometry?.dispose();
      obj.material?.map?.dispose();
      obj.material?.dispose();
    });
    this.group.removeFromParent();
  }
}
