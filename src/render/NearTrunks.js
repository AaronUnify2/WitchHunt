// Real 3D trunks for the trees near the player (Session 10, style pass 1).
// Every tree is a camera-facing billboard (Aaron, M1); right next to one
// that reads as a flat card turning to face you. So the trees within
// `distance` of you also get a low-poly trunk: a tapered, flared cylinder
// drawn to the same sizes as the sprite's trunk (config.forest.kinds[].trunk),
// standing round it. You walk round a solid trunk; the sprite's canopy
// stays above. One instanced draw call plus its torch shadow. The tint
// matches the sprite's (the same hash of where the tree stands).

import * as THREE from 'three';
import { css, makeCanvas, toTexture } from './proceduralTextures.js';

// Taper toward the top (aTaper = top / base radius) and flare at the foot.
// The instance's y scale is the trunk's height in metres.
const TRUNK_COMMON = /* glsl */ `
  attribute float aTaper;
  uniform float uFlare;
  uniform float uFlareHeight;
  uniform vec2 uTintBrightness;
  uniform vec3 uTintWarm;
  uniform vec3 uTintCool;
  varying vec3 vTrunkTint;
  float trunkWidth(float y) {
    float metres = y * instanceMatrix[1][1];
    return mix(1.0, aTaper, y) * (1.0 + uFlare * max(0.0, 1.0 - metres / uFlareHeight));
  }
`;
const TRUNK_BEGIN_VERTEX = /* glsl */ `
  #include <begin_vertex>
  transformed.xz *= trunkWidth(position.y);
  vec2 trunkAt = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xz;
  float trunkA = fract(sin(dot(trunkAt, vec2(12.9898, 78.233))) * 43758.5453);
  float trunkB = fract(sin(dot(trunkAt, vec2(39.3468, 11.1352))) * 24634.6345);
  vTrunkTint = mix(uTintBrightness.x, uTintBrightness.y, trunkA) * mix(uTintCool, uTintWarm, trunkB);
`;
const TRUNK_FRAGMENT_COMMON = /* glsl */ `
  varying vec3 vTrunkTint;
`;
const TRUNK_FRAGMENT_MAP = /* glsl */ `
  #include <map_fragment>
  diffuseColor.rgb *= vTrunkTint;
`;

// Tiling bark: grey-brown with dark vertical fissures and lighter ridges.
function makeBarkTexture(cfg, rng) {
  const w = 64;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = '#ffffff'; // white: the instance colour carries the bark's colour
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = rng.range(0, w);
    const y = rng.range(0, h);
    const len = rng.range(h * 0.05, h * 0.3);
    const dark = rng.chance(0.65);
    ctx.fillStyle = css(dark ? 0x000000 : 0xffffff, dark ? rng.range(0.25, 0.55) : 0.25);
    for (const oy of [-h, 0, h]) ctx.fillRect(Math.floor(x), y + oy, rng.int(1, 3), len);
  }
  const texture = toTexture(canvas, { repeat: true });
  texture.repeat.set(cfg.barkRepeat[0], cfg.barkRepeat[1]);
  return texture;
}

export class NearTrunks {
  // cfg: config.forest. trees: the forest's trees ({ x, y, z, height, width, variant }).
  constructor(cfg, trees, rng) {
    this.cfg = cfg;
    this.trees = trees;
    this.rng = rng;
    this.distance = 0; // from the Quality preset (0 = off)
    this.lastX = Infinity;
    this.lastZ = Infinity;
    this.dirty = true;
  }

  init(scene, uniforms) {
    const c = this.cfg;
    const t = c.nearTrunks;
    // Trees filed in a grid, so finding the near ones is quick.
    this.cell = t.gridCell;
    this.grid = new Map();
    this.trees.forEach((tree, i) => {
      const key = `${Math.floor(tree.x / this.cell)},${Math.floor(tree.z / this.cell)}`;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(i);
    });

    const geometry = new THREE.CylinderGeometry(1, 1, 1, t.sides, 1, true).translate(0, 0.5, 0); // base at y = 0
    this.taper = new THREE.InstancedBufferAttribute(new Float32Array(t.maxCount), 1);
    this.taper.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aTaper', this.taper);
    this.bark = makeBarkTexture(t, this.rng);
    this.uniforms = {
      uFlare: { value: t.flare },
      uFlareHeight: { value: t.flareHeight },
      uTintBrightness: uniforms.uTintBrightness,
      uTintWarm: uniforms.uTintWarm,
      uTintCool: uniforms.uTintCool,
    };
    this.material = this.patch(new THREE.MeshLambertMaterial({ map: this.bark }), true);
    this.depthMaterial = this.patch(new THREE.MeshDepthMaterial(), false);
    this.mesh = new THREE.InstancedMesh(geometry, this.material, t.maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.customDepthMaterial = this.depthMaterial;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // they surround the camera
    this.mesh.count = 0;
    // Each kind's bark colour.
    this.colours = c.kinds.map((k) => new THREE.Color(k.look === 'oak' ? c.oak.bark : k.look === 'snag' ? c.deadColor : c.trunkColor));
    this.mesh.setColorAt(0, this.colours[0]); // creates instanceColor
    scene.add(this.mesh);
    this.matrix = new THREE.Matrix4();
  }

  // colour: the colour pass (gets the bark tint), not the shadow pass.
  patch(material, colour) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${TRUNK_COMMON}`)
        .replace('#include <begin_vertex>', TRUNK_BEGIN_VERTEX);
      if (colour) {
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\n${TRUNK_FRAGMENT_COMMON}`)
          .replace('#include <map_fragment>', TRUNK_FRAGMENT_MAP);
      }
    };
    material.customProgramCacheKey = () => (colour ? 'near-trunk' : 'near-trunk-depth');
    return material;
  }

  // metres (0 = off), from the Quality preset.
  setDistance(metres) {
    this.distance = metres;
    this.dirty = true;
  }

  // Refill the near trunks when the camera has moved a few metres.
  update(cameraPosition) {
    const visible = this.distance > 0;
    this.mesh.visible = visible;
    if (!visible) return;
    const x = cameraPosition.x;
    const z = cameraPosition.z;
    if (!this.dirty && Math.hypot(x - this.lastX, z - this.lastZ) < this.cfg.nearTrunks.refreshDistance) return;
    this.dirty = false;
    this.lastX = x;
    this.lastZ = z;
    const c = this.cfg;
    const reach = this.distance + c.nearTrunks.refreshDistance;
    const c0 = Math.floor((x - reach) / this.cell);
    const c1 = Math.floor((x + reach) / this.cell);
    const r0 = Math.floor((z - reach) / this.cell);
    const r1 = Math.floor((z + reach) / this.cell);
    let n = 0;
    const max = c.nearTrunks.maxCount;
    for (let cz = r0; cz <= r1 && n < max; cz++) {
      for (let cx = c0; cx <= c1 && n < max; cx++) {
        const list = this.grid.get(`${cx},${cz}`);
        if (!list) continue;
        for (const i of list) {
          const tree = this.trees[i];
          if (Math.hypot(tree.x - x, tree.z - z) > reach) continue;
          const kind = c.kinds[tree.variant];
          const k = kind.trunk;
          // The sprite's trunk is k.base of its width across; a touch
          // wider here so the sprite's trunk stays hidden inside.
          const radius = (k.base * tree.width) / 2 * c.nearTrunks.cover;
          const height = tree.height * k.to * k.solid;
          this.matrix.makeScale(radius, height, radius).setPosition(tree.x, tree.y - c.nearTrunks.sink, tree.z);
          this.mesh.setMatrixAt(n, this.matrix);
          this.mesh.setColorAt(n, this.colours[tree.variant]);
          this.taper.setX(n, (k.base + (k.top - k.base) * k.solid) / k.base); // narrows as far as it reaches
          n++;
          if (n >= max) break;
        }
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.taper.needsUpdate = true;
  }

  get count() {
    return this.mesh.visible ? this.mesh.count : 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.bark.dispose();
  }
}
