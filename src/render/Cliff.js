// The northern cliff: a tall rock wall the width of the map, following the
// cliff line from the map geometry. Its face bulges out (never in, so
// the ramp of ground behind it stays hidden), slopes out at the foot and
// has a ragged top. Built in sections so only nearby ones are drawn.
// Collision circles along its foot stop the player, zombies and shots.

import * as THREE from 'three';
import { cliffZ, cliffHeight } from '../world/mapGeometry.js';
import { valueNoise, noiseSeed } from '../world/noise.js';
import { makeCliffTexture } from './mapTextures.js';
import { ChunkCuller } from './ChunkCuller.js';

export class Cliff {
  // cliffConfig: config.map.cliff. terrainConfig: config.terrain (texture colours).
  constructor(cliffConfig, terrainConfig, rng) {
    this.cfg = cliffConfig;
    this.terrainCfg = terrainConfig;
    this.rng = rng;
  }

  // ground: the GroundField.
  init(scene, colliders, ground) {
    const c = this.cfg;
    this.ground = ground;
    this.geo = ground.geo;
    this.seed = noiseSeed(ground.seed, 'cliff-face');
    this.texture = makeCliffTexture(this.terrainCfg, this.rng.fork('texture'));
    this.material = new THREE.MeshLambertMaterial({ map: this.texture });
    this.group = new THREE.Group();
    this.culler = new ChunkCuller(c.chunkWidth, this.terrainCfg.cullRefreshDistance);

    const { xMin, xMax } = this.geo;
    for (let x0 = xMin; x0 < xMax; x0 += c.chunkWidth) {
      const x1 = Math.min(xMax, x0 + c.chunkWidth);
      const mesh = new THREE.Mesh(this.sectionGeometry(x0, x1), this.material);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      const mid = (x0 + x1) / 2;
      this.culler.add(mesh, mid, cliffZ(this.geo, mid), c.chunkWidth / 2 + c.amplitude);
    }
    scene.add(this.group);

    for (let x = xMin; x <= xMax; x += c.colliderSpacing) {
      const r = c.colliderRadius;
      colliders.insert({ x, z: cliffZ(this.geo, x) - r * 0.25, r, vr: r });
    }
  }

  // A grid of columns along x and rows up the face, facing south (+z).
  sectionGeometry(x0, x1) {
    const c = this.cfg;
    const columns = Math.max(1, Math.round((x1 - x0) / c.segment));
    const rows = c.rows;
    const positions = [];
    const uvs = [];
    for (let i = 0; i <= columns; i++) {
      const x = x0 + ((x1 - x0) * i) / columns;
      const line = cliffZ(this.geo, x);
      const foot = this.ground.heightAt(x, line + 1) - c.sink;
      const jag = (valueNoise(x / 6, 3.5, this.seed) - 0.5) * c.topJag + (valueNoise(x / 1.7, 9.5, this.seed) - 0.5) * c.topJag * 0.4;
      const top = foot + c.sink + cliffHeight(this.geo, x) + jag;
      for (let k = 0; k <= rows; k++) {
        const f = k / rows;
        const y = foot + (top - foot) * f;
        // Bulge out (south) by noise in two sizes, jut out along ledges,
        // slope out at the foot, lean back at the top.
        const bulge = (valueNoise(x / c.bumpSize, y / c.bumpSize, this.seed) * 0.7 + valueNoise(x / (c.bumpSize * 0.35), y / (c.bumpSize * 0.35), this.seed + 1) * 0.3) * c.roughness;
        const ledge = Math.max(0, Math.sin(y * 0.9 + valueNoise(x / 20, 1.5, this.seed) * 6)) * c.ledges;
        const talus = c.talus * (1 - f) * (1 - f);
        const lean = k === rows ? -1.5 : 0;
        const z = line + bulge + ledge + talus + lean;
        positions.push(x, y, z);
        uvs.push(x / c.textureMeters, y / c.textureMeters);
      }
    }
    const indices = [];
    for (let i = 0; i < columns; i++) {
      for (let k = 0; k < rows; k++) {
        const a = i * (rows + 1) + k; // (column i, row k)
        const b = a + rows + 1; // next column
        indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
  }

  setDrawDistance(distance) {
    // The wall is tall: draw it from a little further than the draw distance.
    this.culler.setDrawDistance(distance + this.cfg.amplitude);
  }

  dispose() {
    for (const mesh of this.group.children) mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.group.removeFromParent();
  }
}
