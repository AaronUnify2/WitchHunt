// Instanced billboard forest. Every tree is a camera-facing sprite (it
// turns around the vertical axis only), drawn from one texture atlas, with
// wind sway in the vertex shader. Trees are grouped into chunks; chunks
// beyond the draw distance aren't drawn. Trunks are registered as
// colliders. The flashlight's shadow pass uses a matching depth material,
// so sprites cast proper silhouette shadows.

import * as THREE from 'three';
import { layoutForest } from '../world/forestLayout.js';
import { makeTreeAtlas } from './proceduralTextures.js';

// Shared GLSL: which way a sprite faces (toward the camera on the ground
// plane). cameraPosition is the shadow camera during the shadow pass, so
// the sprite faces the flashlight there, which sits next to the eye.
const BILLBOARD_COMMON = /* glsl */ `
  attribute float aVariant;
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uWindSpeed;
  uniform float uWindSpatialScale;
  uniform float uVariants;
  uniform float uNormalUpBias;
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
`;

const BILLBOARD_NORMAL = /* glsl */ `
  vec2 bbN = bbFacing();
  vec3 objectNormal = normalize(vec3(bbN.x, uNormalUpBias, bbN.y));
`;

// Pick this instance's sprite from the atlas row.
const BILLBOARD_UV = /* glsl */ `
  #include <uv_vertex>
  #ifdef USE_MAP
    vMapUv.x = (vMapUv.x + aVariant) / uVariants;
  #endif
`;

export class Forest {
  constructor(forestConfig, rng) {
    this.cfg = forestConfig;
    this.rng = rng;
  }

  init(scene, colliders) {
    const c = this.cfg;
    this.scene = scene;
    this.trees = layoutForest(c, this.rng.fork('layout'));
    this.atlas = makeTreeAtlas(c, this.rng.fork('atlas'));
    this.uniforms = {
      uTime: { value: 0 },
      uWindStrength: { value: c.windStrength },
      uWindSpeed: { value: c.windSpeed },
      uWindSpatialScale: { value: c.windSpatialScale },
      uVariants: { value: c.textureVariants },
      uNormalUpBias: { value: c.normalUpBias },
    };
    this.material = this.patch(
      new THREE.MeshLambertMaterial({ map: this.atlas, alphaTest: c.alphaTest }),
      'forest-billboard',
    );
    this.depthMaterial = this.patch(
      new THREE.MeshDepthMaterial({ map: this.atlas, alphaTest: c.alphaTest }),
      'forest-billboard-depth',
    );
    this.baseGeometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0); // base at y = 0

    this.chunks = this.buildChunks();
    for (const tree of this.trees) {
      // r blocks the player; vr (the canopy) is what the torch's glare check sees.
      colliders.insert({ x: tree.x, z: tree.z, r: c.trunkRadius, vr: tree.width * c.glareRadiusRatio });
    }
    this.drawDistance = Infinity;
  }

  patch(material, cacheKey) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${BILLBOARD_COMMON}`)
        .replace('#include <uv_vertex>', BILLBOARD_UV)
        .replace('#include <beginnormal_vertex>', BILLBOARD_NORMAL)
        .replace('#include <begin_vertex>', BILLBOARD_BEGIN_VERTEX);
    };
    material.customProgramCacheKey = () => cacheKey;
    return material;
  }

  buildChunks() {
    const size = this.cfg.chunkSize;
    const groups = new Map();
    for (const tree of this.trees) {
      const key = `${Math.floor(tree.x / size)},${Math.floor(tree.z / size)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(tree);
    }

    const matrix = new THREE.Matrix4();
    const chunks = [];
    for (const trees of groups.values()) {
      const geometry = this.baseGeometry.clone();
      const variants = new Float32Array(trees.length);
      const mesh = new THREE.InstancedMesh(geometry, this.material, trees.length);
      let cx = 0;
      let cz = 0;
      trees.forEach((t, i) => {
        matrix.makeScale(t.width, t.height, t.width).setPosition(t.x, 0, t.z);
        mesh.setMatrixAt(i, matrix);
        variants[i] = t.variant;
        cx += t.x / trees.length;
        cz += t.z / trees.length;
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
      for (const t of trees) radius = Math.max(radius, Math.hypot(t.x - cx, t.z - cz) + t.width);
      chunks.push({ mesh, x: cx, z: cz, radius });
    }
    return chunks;
  }

  update(dt, cameraPosition) {
    this.uniforms.uTime.value += dt;
    for (const chunk of this.chunks) {
      const dist = Math.hypot(chunk.x - cameraPosition.x, chunk.z - cameraPosition.z) - chunk.radius;
      chunk.mesh.visible = dist < this.drawDistance;
    }
  }

  setDrawDistance(distance) {
    this.drawDistance = distance;
  }

  get treeCount() {
    return this.trees.length;
  }

  dispose() {
    for (const chunk of this.chunks) {
      chunk.mesh.geometry.dispose();
      chunk.mesh.removeFromParent();
    }
    this.baseGeometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.atlas.dispose();
  }
}
