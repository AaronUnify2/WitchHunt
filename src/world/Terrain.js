// The map's ground: rolling terrain from the GroundField, built as one
// mesh per chunk (only nearby chunks are drawn). The forest floor texture
// tiles everywhere; a shader blends in bare dirt wherever the ground's
// dirt mask says (pathways and clearings), read from one small texture
// covering the whole map. Smooth, lumpy rocks are scattered round the
// clearings and through the forest; they cast flashlight shadows and
// block the player and shots.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeGroundTexture } from '../render/proceduralTextures.js';
import { makeDirtTexture } from '../render/mapTextures.js';
import { ChunkCuller } from '../render/ChunkCuller.js';

// World position for the dirt mask lookup.
const GROUND_VERTEX_COMMON = /* glsl */ `
  varying vec2 vWorldXZ;
`;
const GROUND_VERTEX_WORLD = /* glsl */ `
  #include <begin_vertex>
  vWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;
`;
const GROUND_FRAGMENT_COMMON = /* glsl */ `
  varying vec2 vWorldXZ;
  uniform sampler2D uDirtMap;
  uniform sampler2D uDirtMask;
  uniform vec4 uMaskRect; // xMin, zMin, 1 / width, 1 / depth
`;
const GROUND_FRAGMENT_MAP = /* glsl */ `
  #include <map_fragment>
  float dirtAmount = texture2D(uDirtMask, (vWorldXZ - uMaskRect.xy) * uMaskRect.zw).r;
  diffuseColor.rgb = mix(diffuseColor.rgb, texture2D(uDirtMap, vMapUv).rgb, dirtAmount);
`;

export class Terrain {
  constructor(terrainConfig, rng) {
    this.cfg = terrainConfig;
    this.rng = rng;
  }

  // ground: the GroundField. map: from generateMap().
  init(scene, colliders, ground, map) {
    this.ground = ground;
    this.map = map;
    this.group = new THREE.Group();
    this.culler = new ChunkCuller(this.cfg.chunkSize, this.cfg.cullRefreshDistance);
    this.textures = [];
    this.material = this.buildMaterial();
    this.buildChunks();
    this.buildRocks(colliders);
    scene.add(this.group);
  }

  buildMaterial() {
    const c = this.cfg;
    const g = this.ground;
    const geo = g.geo;
    const floor = makeGroundTexture(c, this.rng.fork('ground'));
    const dirt = makeDirtTexture(c, this.rng.fork('dirt'));
    const mask = new THREE.DataTexture(g.dirtBytes(), g.maskNx, g.maskNz, THREE.RedFormat, THREE.UnsignedByteType);
    mask.unpackAlignment = 1; // rows are an odd number of bytes wide
    mask.magFilter = THREE.LinearFilter;
    mask.minFilter = THREE.LinearFilter;
    mask.needsUpdate = true;
    this.textures.push(floor, dirt, mask);

    // Mask texel centres sit on the mask grid points.
    const width = (g.maskNx - 1) * g.maskCell;
    const depth = (g.maskNz - 1) * g.maskCell;
    const texelX = g.maskCell / 2;
    const texelZ = g.maskCell / 2;
    const uniforms = {
      uDirtMap: { value: dirt },
      uDirtMask: { value: mask },
      uMaskRect: { value: new THREE.Vector4(geo.xMin - texelX, geo.zMin - texelZ, 1 / (width + g.maskCell), 1 / (depth + g.maskCell)) },
    };
    const material = new THREE.MeshLambertMaterial({ map: floor });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${GROUND_VERTEX_COMMON}`)
        .replace('#include <begin_vertex>', GROUND_VERTEX_WORLD);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${GROUND_FRAGMENT_COMMON}`)
        .replace('#include <map_fragment>', GROUND_FRAGMENT_MAP);
    };
    material.customProgramCacheKey = () => 'map-ground';
    return material;
  }

  // Ground meshes: vertices on the height grid, two triangles per square
  // split the same way GroundField.heightAt() interpolates. Normals come
  // from the whole grid, so chunk edges join without seams.
  buildChunks() {
    const g = this.ground;
    const c = this.cfg;
    const cellsPerChunk = Math.round(c.chunkSize / g.heightCell);
    for (let j0 = 0; j0 < g.nz - 1; j0 += cellsPerChunk) {
      for (let i0 = 0; i0 < g.nx - 1; i0 += cellsPerChunk) {
        const i1 = Math.min(g.nx - 1, i0 + cellsPerChunk);
        const j1 = Math.min(g.nz - 1, j0 + cellsPerChunk);
        const mesh = new THREE.Mesh(this.chunkGeometry(i0, j0, i1, j1), this.material);
        mesh.receiveShadow = true;
        this.group.add(mesh);
        const x0 = g.geo.xMin + i0 * g.heightCell;
        const x1 = g.geo.xMin + i1 * g.heightCell;
        const z0 = g.geo.zMin + j0 * g.heightCell;
        const z1 = g.geo.zMin + j1 * g.heightCell;
        this.culler.add(mesh, (x0 + x1) / 2, (z0 + z1) / 2, Math.hypot(x1 - x0, z1 - z0) / 2);
      }
    }
  }

  chunkGeometry(i0, j0, i1, j1) {
    const g = this.ground;
    const cell = g.heightCell;
    const tile = this.cfg.tileMeters;
    const cols = i1 - i0 + 1;
    const rows = j1 - j0 + 1;
    const positions = new Float32Array(cols * rows * 3);
    const normals = new Float32Array(cols * rows * 3);
    const uvs = new Float32Array(cols * rows * 2);
    let v = 0;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = g.geo.xMin + i * cell;
        const z = g.geo.zMin + j * cell;
        positions[v * 3] = x;
        positions[v * 3 + 1] = g.gridHeight(i, j);
        positions[v * 3 + 2] = z;
        const nx = g.gridHeight(i - 1, j) - g.gridHeight(i + 1, j);
        const nz = g.gridHeight(i, j - 1) - g.gridHeight(i, j + 1);
        const len = Math.hypot(nx, 2 * cell, nz);
        normals[v * 3] = nx / len;
        normals[v * 3 + 1] = (2 * cell) / len;
        normals[v * 3 + 2] = nz / len;
        uvs[v * 2] = x / tile;
        uvs[v * 2 + 1] = z / tile;
        v++;
      }
    }
    const indices = [];
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = j * cols + i;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  // ---- rocks ---------------------------------------------------------------

  // Where rocks go: a few round each clearing's edge, and a sparse scatter
  // through the forest, never on a pathway.
  rockSpots(rng) {
    const r = this.cfg.rocks;
    const g = this.ground;
    const spots = [];
    for (const c of this.map.clearings) {
      const n = rng.int(r.perClearingMin, r.perClearingMax);
      for (let k = 0; k < n; k++) {
        const angle = rng.range(0, Math.PI * 2);
        const dist = c.radius * rng.range(0.55, 1.05);
        const x = c.x + Math.cos(angle) * dist;
        const z = c.z + Math.sin(angle) * dist;
        const size = rng.range(r.sizeMin, r.sizeMax);
        if (!nearPath(this.map, x, z, size + this.cfg.rocks.pathClearance)) spots.push({ x, z, size });
      }
    }
    const geo = g.geo;
    for (let z = geo.zMin; z < geo.zMax; z += r.forestCell) {
      for (let x = geo.xMin; x < geo.xMax; x += r.forestCell) {
        const keep = rng.chance(r.forestChance);
        const px = x + rng.range(0, r.forestCell);
        const pz = z + rng.range(0, r.forestCell);
        const size = rng.range(r.sizeMin, r.sizeMax);
        if (keep && g.openAt(px, pz) <= r.maxOpen) spots.push({ x: px, z: pz, size });
      }
    }
    return spots;
  }

  // One instanced mesh of rocks per ground chunk, so they're culled with it.
  buildRocks(colliders) {
    const r = this.cfg.rocks;
    const rng = this.rng.fork('rocks');
    const g = this.ground;
    this.rockGeometry = this.buildRockGeometry(rng.fork('shape'));
    this.rockMaterial = new THREE.MeshLambertMaterial({ color: r.color });
    const spots = this.rockSpots(rng.fork('spots'));
    const size = this.cfg.chunkSize;
    const groups = new Map();
    for (const s of spots) {
      const key = `${Math.floor(s.x / size)},${Math.floor(s.z / size)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }

    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    this.rockCount = 0;
    for (const list of groups.values()) {
      const mesh = new THREE.InstancedMesh(this.rockGeometry, this.rockMaterial, list.length);
      let cx = 0;
      let cz = 0;
      list.forEach((s, i) => {
        const ground = g.heightAt(s.x, s.z);
        const height = s.size * r.squash;
        position.set(s.x, ground + height * (0.5 - r.sink), s.z);
        rotation.setFromEuler(euler.set(rng.range(0, Math.PI), rng.range(0, Math.PI), 0));
        scale.set(s.size * rng.range(1, 1 + r.stretch), height, s.size * rng.range(1, 1 + r.stretch));
        mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
        colliders.insert({
          x: s.x,
          z: s.z,
          r: s.size * r.colliderScale,
          vr: s.size, // visual radius, for the torch's close-range glare check
          base: ground - height * r.sink,
          top: position.y + height * 0.5, // height of the rock's top
        });
        cx += s.x / list.length;
        cz += s.z / list.length;
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
      let radius = 0;
      for (const s of list) radius = Math.max(radius, Math.hypot(s.x - cx, s.z - cz) + s.size * 2);
      this.culler.add(mesh, cx, cz, radius);
      this.rockCount += list.length;
    }
  }

  // A smooth sphere pushed in and out by a few overlapping waves, so the
  // rock is lumpy but has no hard facets. Vertices are merged first so
  // neighbouring faces share normals and shade smoothly.
  buildRockGeometry(rng) {
    const r = this.cfg.rocks;
    const base = new THREE.IcosahedronGeometry(1, r.detail);
    base.deleteAttribute('normal');
    base.deleteAttribute('uv');
    const geometry = mergeVertices(base);
    base.dispose();

    const waves = Array.from({ length: r.lumps }, () => ({
      dir: new THREE.Vector3(rng.range(-1, 1), rng.range(-1, 1), rng.range(-1, 1)).normalize(),
      phase: rng.range(0, Math.PI * 2),
    }));
    const pos = geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let bulge = 0;
      for (const w of waves) bulge += Math.sin(v.dot(w.dir) * r.lumpFrequency + w.phase);
      v.multiplyScalar(1 + (r.lumpiness * bulge) / r.lumps);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance);
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.isMesh && obj.geometry !== this.rockGeometry) obj.geometry.dispose();
    });
    this.rockGeometry.dispose();
    this.rockMaterial.dispose();
    this.material.dispose();
    for (const t of this.textures) t.dispose();
    this.group.removeFromParent();
  }
}

// Is (x, z) within `reach` of the line between a clearing and a pathway's
// next point? Keeps edge rocks out of pathway mouths.
function nearPath(map, x, z, reach) {
  for (const p of map.paths) {
    for (const end of [p.points[0], p.points[p.points.length - 1]]) {
      if (Math.hypot(end.x - x, end.z - z) > 60) continue;
      for (const q of p.points) if (Math.hypot(q.x - x, q.z - z) < reach) return true;
    }
  }
  return false;
}
