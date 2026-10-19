// The map's ground: rolling terrain from the GroundField, built as one
// mesh per chunk (only nearby chunks are drawn). Session 10: the ground
// shader blends three textures drawn in code (render/groundTextures.js):
// leaf litter under the trees, moss and grass in patches and toward open
// ground, packed dirt wherever the dirt mask says (pathways and clearings),
// with dark wet mud patches here and there. Each texture is read at two
// sizes, mixed by noise, so its repeats don't show. The dirt and open
// masks are one small texture covering the whole map; the patches come
// from one shared noise texture. Smooth, lumpy rocks are scattered round
// the clearings and through the forest; they cast flashlight shadows and
// block the player and shots.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLitterTexture, makeMossTexture, makePathTexture } from '../render/groundTextures.js';
import { makeNoiseTexture } from '../render/noiseTexture.js';
import { ChunkCuller } from '../render/ChunkCuller.js';
import { Rng } from '../core/Rng.js';

// World position for the mask and noise lookups.
const GROUND_VERTEX_COMMON = /* glsl */ `
  varying vec2 vWorldXZ;
`;
const GROUND_VERTEX_WORLD = /* glsl */ `
  #include <begin_vertex>
  vWorldXZ = (modelMatrix * vec4(position, 1.0)).xz;
`;
const GROUND_FRAGMENT_COMMON = /* glsl */ `
  varying vec2 vWorldXZ;
  uniform sampler2D uMossMap;
  uniform sampler2D uDirtMap;
  uniform sampler2D uMasks; // r: dirt, g: open
  uniform sampler2D uGroundNoise; // r: moss patches, g: mud, b: which texture size
  uniform vec4 uMaskRect; // xMin, zMin, 1 / width, 1 / depth
  uniform vec4 uFloor; // 1 / tile metres, 1 / (tile * second scale), 1 / noise metres, moss on open ground
  uniform vec4 uFloorMix; // moss threshold low, high, mud share, mud darken
  vec3 groundTwoSizes(sampler2D t, vec2 a, vec2 b, float w) {
    #ifdef GROUND_TWO_SIZES
      return mix(texture2D(t, a).rgb, texture2D(t, b).rgb, w);
    #else
      return texture2D(t, a).rgb;
    #endif
  }
`;
// Replaces three.js's map read (the map is the leaf litter).
const GROUND_FRAGMENT_MAP = /* glsl */ `
  vec2 groundA = vWorldXZ * uFloor.x;
  vec2 groundB = mat2(0.8, -0.6, 0.6, 0.8) * vWorldXZ * uFloor.y + 0.31;
  vec3 groundNoise = texture2D(uGroundNoise, vWorldXZ * uFloor.z).rgb;
  vec2 groundMasks = texture2D(uMasks, (vWorldXZ - uMaskRect.xy) * uMaskRect.zw).rg;
  #ifdef GROUND_TWO_SIZES
    float groundSizes = smoothstep(0.3, 0.7, groundNoise.b);
  #else
    float groundSizes = 0.0;
  #endif
  float mossAmount = smoothstep(uFloorMix.x, uFloorMix.y, groundNoise.r + groundMasks.g * uFloor.w);
  vec3 groundColor = mix(groundTwoSizes(map, groundA, groundB, groundSizes), groundTwoSizes(uMossMap, groundA, groundB, groundSizes), mossAmount);
  groundColor = mix(groundColor, groundTwoSizes(uDirtMap, groundA, groundB, groundSizes), groundMasks.r);
  float mud = smoothstep(1.0 - uFloorMix.z, 1.0 - uFloorMix.z + 0.08, groundNoise.g);
  groundColor *= 1.0 - mud * uFloorMix.w;
  diffuseColor.rgb *= groundColor;
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
    const f = c.floor;
    const g = this.ground;
    const geo = g.geo;
    const litter = makeLitterTexture(f, this.rng.fork('litter'));
    const moss = makeMossTexture(f, this.rng.fork('moss'));
    const dirt = makePathTexture(f, this.rng.fork('dirt'));
    const noise = makeNoiseTexture(
      f.noiseSize,
      [
        [{ cells: 6, weight: 0.7 }, { cells: 20, weight: 0.3 }], // moss patches (about 25 m)
        [{ cells: 10, weight: 0.6 }, { cells: 32, weight: 0.4 }], // mud
        [{ cells: 24, weight: 1 }], // which texture size shows (about 7 m)
      ],
      this.rng.fork('ground-noise'),
    );
    const masks = new THREE.DataTexture(g.maskBytes(), g.maskNx, g.maskNz, THREE.RGFormat, THREE.UnsignedByteType);
    masks.unpackAlignment = 1; // rows are an odd number of bytes wide
    masks.magFilter = THREE.LinearFilter;
    masks.minFilter = THREE.LinearFilter;
    masks.needsUpdate = true;
    this.textures.push(litter, moss, dirt, noise, masks);

    // Mask texel centres sit on the mask grid points.
    const width = (g.maskNx - 1) * g.maskCell;
    const depth = (g.maskNz - 1) * g.maskCell;
    const texelX = g.maskCell / 2;
    const texelZ = g.maskCell / 2;
    const uniforms = {
      uMossMap: { value: moss },
      uDirtMap: { value: dirt },
      uMasks: { value: masks },
      uGroundNoise: { value: noise },
      uMaskRect: { value: new THREE.Vector4(geo.xMin - texelX, geo.zMin - texelZ, 1 / (width + g.maskCell), 1 / (depth + g.maskCell)) },
      uFloor: { value: new THREE.Vector4(1 / c.tileMeters, 1 / (c.tileMeters * f.secondScale), 1 / f.noiseMeters, f.mossOnOpen) },
      uFloorMix: { value: new THREE.Vector4(f.mossThreshold[0], f.mossThreshold[1], f.mud.share, f.mud.darken) },
    };
    const material = new THREE.MeshLambertMaterial({ map: litter });
    material.defines = { GROUND_TWO_SIZES: '' }; // setTwoSizes() (Quality)
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

  // Quality: read each texture at two sizes (hides its repeats) or one.
  setTwoSizes(on) {
    const had = 'GROUND_TWO_SIZES' in this.material.defines;
    if (had === on) return;
    if (on) this.material.defines.GROUND_TWO_SIZES = '';
    else delete this.material.defines.GROUND_TWO_SIZES;
    this.material.needsUpdate = true;
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
  // through the forest, never on a pathway. The opening cluster's clearings
  // and the forest north of the cordon draw from fixed streams, so their
  // rocks are the same every run (M9.1).
  rockSpots(rng) {
    const r = this.cfg.rocks;
    const g = this.ground;
    const spots = [];
    for (const c of this.map.clearings) {
      const own = c.cluster ? new Rng(`${g.fixedSeed}:rocks:${c.key}`) : rng;
      const n = own.int(r.perClearingMin, r.perClearingMax);
      for (let k = 0; k < n; k++) {
        const angle = own.range(0, Math.PI * 2);
        const dist = c.radius * own.range(0.55, 1.05);
        const x = c.x + Math.cos(angle) * dist;
        const z = c.z + Math.sin(angle) * dist;
        const size = own.range(r.sizeMin, r.sizeMax);
        if (!nearPath(this.map, x, z, size + this.cfg.rocks.pathClearance)) spots.push({ x, z, size });
      }
    }
    const geo = g.geo;
    const fixed = new Rng(`${g.fixedSeed}:rocks:forest`);
    for (let z = geo.zMin; z < geo.zMax; z += r.forestCell) {
      const fixedRow = g.isFixed(z + r.forestCell);
      for (let x = geo.xMin; x < geo.xMax; x += r.forestCell) {
        let keep = rng.chance(r.forestChance);
        let px = x + rng.range(0, r.forestCell);
        let pz = z + rng.range(0, r.forestCell);
        let size = rng.range(r.sizeMin, r.sizeMax);
        if (fixedRow) {
          keep = fixed.chance(r.forestChance);
          px = x + fixed.range(0, r.forestCell);
          pz = z + fixed.range(0, r.forestCell);
          size = fixed.range(r.sizeMin, r.sizeMax);
        }
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
