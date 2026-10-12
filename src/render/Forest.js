// Instanced billboard forest across the whole map. Every tree and bush is
// a camera-facing sprite (it turns around the vertical axis only), drawn
// from one texture atlas, with wind sway in the vertex shader. Trees and
// undergrowth are grouped together into chunks (one draw call each);
// chunks beyond the draw distance aren't drawn. Trunks are registered as
// colliders (bushes only slow you, through the ground's undergrowth mask).
// The flashlight's shadow pass uses a matching depth material, so sprites
// cast proper silhouette shadows.

import * as THREE from 'three';
import { layoutForest, layoutUndergrowth } from '../world/forestLayout.js';
import { makeForestAtlas } from './mapTextures.js';
import { ChunkCuller } from './ChunkCuller.js';
import { NearTrunks } from './NearTrunks.js';

const MAX_SPRITES = 16; // size of the atlas rectangle table in the shader

// Shared GLSL: which way a sprite faces (toward the camera on the ground
// plane). cameraPosition is the shadow camera during the shadow pass, so
// the sprite faces the flashlight there, which sits next to the eye.
const BILLBOARD_COMMON = /* glsl */ `
  attribute float aVariant;
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uWindSpatialScale;
  uniform vec4 uRects[${MAX_SPRITES}];
  uniform float uNormalUpBias;
  uniform vec2 uTintBrightness;
  uniform vec3 uTintWarm;
  uniform vec3 uTintCool;
  varying vec3 vTreeTint;
  vec3 bbInstancePosition() {
    return (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  }
  vec2 bbFacing() {
    vec2 d = cameraPosition.xz - bbInstancePosition().xz;
    float len = length(d);
    return len > 0.0001 ? d / len : vec2(0.0, 1.0);
  }
`;

// Rotate the unit quad (in local XY) about Y so its front faces the camera.
// instanceMatrix holds only translation and scale (x = z), so this
// commutes with it. Then sway the top in the wind.
const BILLBOARD_BEGIN_VERTEX = /* glsl */ `
  vec2 bbDir = bbFacing();
  vec3 transformed = vec3(position.x * bbDir.y, position.y, -position.x * bbDir.x);
  vec3 bbInst = bbInstancePosition();
  float bbSway = sin(uTime * uWindSpeed + (bbInst.x + bbInst.z) * uWindSpatialScale);
  transformed.x += bbSway * uWindStrength * position.y * position.y;
  // Session 10: a tint from where it stands, so no two neighbours match.
  float bbTintA = fract(sin(dot(bbInst.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float bbTintB = fract(sin(dot(bbInst.xz, vec2(39.3468, 11.1352))) * 24634.6345);
  vTreeTint = mix(uTintBrightness.x, uTintBrightness.y, bbTintA) * mix(uTintCool, uTintWarm, bbTintB);
`;

// The tint, in the colour pass only (the shadow pass has no colour).
const BILLBOARD_FRAGMENT_COMMON = /* glsl */ `
  varying vec3 vTreeTint;
`;
const BILLBOARD_FRAGMENT_TINT = /* glsl */ `
  #include <map_fragment>
  diffuseColor.rgb *= vTreeTint;
`;

const BILLBOARD_NORMAL = /* glsl */ `
  vec2 bbN = bbFacing();
  vec3 objectNormal = normalize(vec3(bbN.x, uNormalUpBias, bbN.y));
`;

// Pick this instance's sprite rectangle from the atlas.
const BILLBOARD_UV = /* glsl */ `
  #include <uv_vertex>
  #ifdef USE_MAP
    vec4 bbRect = uRects[int(aVariant + 0.5)];
    vMapUv = bbRect.xy + vMapUv * bbRect.zw;
  #endif
`;

export class Forest {
  constructor(forestConfig, rng) {
    this.cfg = forestConfig;
    this.rng = rng;
  }

  // ground: the GroundField (where trees can grow, and their heights).
  init(scene, colliders, ground) {
    const c = this.cfg;
    this.scene = scene;
    this.trees = layoutForest(c, ground, this.rng.fork('layout'));
    this.bushes = layoutUndergrowth(c.undergrowth, ground, this.rng.fork('undergrowth'), c.densityScale);
    const atlas = makeForestAtlas(c, this.rng.fork('atlas'));
    this.atlas = atlas.texture;
    const rects = Array.from({ length: MAX_SPRITES }, (_, i) => new THREE.Vector4(...(atlas.rects[i] ?? [0, 0, 1, 1])));
    this.uniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: c.windStrength },
      uWindSpeed: { value: c.windSpeed },
      uWindSpatialScale: { value: c.windSpatialScale },
      uRects: { value: rects },
      uNormalUpBias: { value: c.normalUpBias },
      uTintBrightness: { value: new THREE.Vector2(c.tint.brightness[0], c.tint.brightness[1]) },
      uTintWarm: { value: new THREE.Vector3(...c.tint.warm) },
      uTintCool: { value: new THREE.Vector3(...c.tint.cool) },
    };
    this.material = this.patch(
      new THREE.MeshLambertMaterial({ map: this.atlas, alphaTest: c.alphaTest }),
      'forest-billboard',
      true,
    );
    this.depthMaterial = this.patch(
      new THREE.MeshDepthMaterial({ map: this.atlas, alphaTest: c.alphaTest }),
      'forest-billboard-depth',
    );
    this.baseGeometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // base at y = 0

    this.culler = new ChunkCuller(c.chunkSize, c.cullRefreshDistance);
    this.chunks = this.buildChunks();
    // Session 10: solid 3D trunks for the trees near you.
    this.nearTrunks = new NearTrunks(c, this.trees, this.rng.fork('trunks'));
    this.nearTrunks.init(this.scene, this.uniforms);
    for (const tree of this.trees) {
      // r blocks the player; vr (the canopy) is what the torch's glare check sees.
      colliders.insert({ x: tree.x, z: tree.z, r: c.trunkRadius, vr: tree.width * c.glareRadiusRatio });
    }
  }

  // colour: the colour pass (gets the tint), not the shadow pass.
  patch(material, cacheKey, colour = false) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${BILLBOARD_COMMON}`)
        .replace('#include <uv_vertex>', BILLBOARD_UV)
        .replace('#include <beginnormal_vertex>', BILLBOARD_NORMAL)
        .replace('#include <begin_vertex>', BILLBOARD_BEGIN_VERTEX);
      if (colour) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${BILLBOARD_FRAGMENT_COMMON}`)
          .replace('#include <map_fragment>', BILLBOARD_FRAGMENT_TINT);
      }
    };
    material.customProgramCacheKey = () => cacheKey;
    return material;
  }

  // One instanced mesh per chunk, trees and bushes together.
  buildChunks() {
    const size = this.cfg.chunkSize;
    const firstBush = this.cfg.kinds.length;
    const groups = new Map();
    const file = (item, sprite) => {
      const key = `${Math.floor(item.x / size)},${Math.floor(item.z / size)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ item, sprite });
    };
    for (const t of this.trees) file(t, t.variant);
    for (const b of this.bushes) file(b, firstBush + b.variant);

    const matrix = new THREE.Matrix4();
    const chunks = [];
    for (const entries of groups.values()) {
      const geometry = this.baseGeometry.clone();
      const variants = new Float32Array(entries.length);
      const mesh = new THREE.InstancedMesh(geometry, this.material, entries.length);
      let cx = 0;
      let cz = 0;
      entries.forEach(({ item, sprite }, i) => {
        matrix.makeScale(item.width, item.height, item.width).setPosition(item.x, item.y, item.z);
        mesh.setMatrixAt(i, matrix);
        variants[i] = sprite;
        cx += item.x / entries.length;
        cz += item.z / entries.length;
      });
      geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));
      mesh.customDepthMaterial = this.depthMaterial;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Each instance's sphere is scaled by its largest axis (the height),
      // which comfortably covers the sprite turning and swaying.
      mesh.computeBoundingSphere();
      this.scene.add(mesh);

      let radius = 0;
      for (const { item } of entries) radius = Math.max(radius, Math.hypot(item.x - cx, item.z - cz) + item.width);
      this.culler.add(mesh, cx, cz, radius);
      chunks.push(mesh);
    }
    return chunks;
  }

  update(dt, cameraPosition) {
    this.uniforms.uTime.value += dt;
    this.culler.update(cameraPosition.x, cameraPosition.z);
    this.nearTrunks.update(cameraPosition);
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance);
  }

  get treeCount() {
    return this.trees.length;
  }

  get bushCount() {
    return this.bushes.length;
  }

  get visibleChunks() {
    return this.culler.visibleCount;
  }

  dispose() {
    for (const mesh of this.chunks) {
      mesh.geometry.dispose();
      mesh.removeFromParent();
    }
    this.nearTrunks.dispose();
    this.baseGeometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.atlas.dispose();
  }
}
