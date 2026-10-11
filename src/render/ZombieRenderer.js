// Draws every active zombie (not mutants: see MutantRenderer) as one
// instanced billboard (Doom-style): the sprite turns about the vertical to
// face the camera, and the shader picks the atlas row from the angle
// between the zombie's facing and the camera (8 angles), the block of rows
// from its variant (citizen, police, army) and the column from its
// animation frame. Lit by the torch and casting its shadow, like the
// trees. One draw call, plus one in the torch shadow pass.

import * as THREE from 'three';
import { makeZombieAtlas, ATLAS_ROWS as ROWS } from './zombieSprite.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

const COMMON = /* glsl */ `
  attribute float aFrame;
  attribute float aFacing;
  attribute float aFlash;
  attribute float aLit;
  attribute float aVariant;
  uniform float uCols;
  uniform float uVariants;
  uniform float uNormalUpBias;
  vec3 zbInstancePosition() {
    return (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  }
  vec2 zbToCamera() {
    vec2 d = cameraPosition.xz - zbInstancePosition().xz;
    float len = length(d);
    return len > 0.0001 ? d / len : vec2(0.0, 1.0);
  }
`;

const BEGIN_VERTEX = /* glsl */ `
  vec2 zbDir = zbToCamera();
  vec3 transformed = vec3(position.x * zbDir.y, position.y, -position.x * zbDir.x);
`;

const NORMAL = /* glsl */ `
  vec2 zbN = zbToCamera();
  vec3 objectNormal = normalize(vec3(zbN.x, uNormalUpBias, zbN.y));
`;

// Row from the camera's direction relative to the zombie's facing.
// Facing a = direction (sin a, cos a). Row 0 = seen from the front; the
// rows step round so that row 2 shows it facing image-right.
const UV = /* glsl */ `
  #include <uv_vertex>
  #ifdef USE_MAP
    vec2 zbCam = zbToCamera();
    float zbRel = atan(zbCam.x, zbCam.y) - aFacing;
    float zbRow = mod(floor(-zbRel / (6.2831853 / ${ROWS}.0) + 0.5), ${ROWS}.0);
    vMapUv.x = (vMapUv.x + aFrame) / uCols;
    // Variant blocks run top to bottom; v = 1 is the top of the atlas.
    vMapUv.y = (vMapUv.y + (${ROWS - 1}.0 - zbRow) + (uVariants - 1.0 - aVariant) * ${ROWS}.0) / (${ROWS}.0 * uVariants);
  #endif
`;

export class ZombieRenderer {
  constructor(zombieConfig, rng) {
    this.cfg = zombieConfig;
    this.rng = rng;
  }

  init(scene, poolSize) {
    const c = this.cfg;
    const t = c.texture;
    this.atlas = makeZombieAtlas(c, this.rng);
    this.variantIndex = Object.fromEntries(t.variantOrder.map((v, i) => [v, i]));
    this.uniforms = {
      uCols: { value: ZOMBIE_FRAMES.count },
      uVariants: { value: t.variantOrder.length },
      uNormalUpBias: { value: c.normalUpBias },
      uFlashColor: { value: new THREE.Color(c.hitFlashColor) },
      uLitColor: { value: new THREE.Color(c.floodlit.color).multiplyScalar(c.floodlit.strength) },
    };
    const albedo = new THREE.Color().setScalar(c.albedoScale);
    this.material = this.patch(new THREE.MeshLambertMaterial({ map: this.atlas, color: albedo, alphaTest: c.alphaTest }), true);
    this.depthMaterial = this.patch(new THREE.MeshDepthMaterial({ map: this.atlas, alphaTest: c.alphaTest }), false);

    this.spriteHeight = c.height * c.spriteHeightRatio;
    this.spriteWidth = (this.spriteHeight * t.frameWidth) / t.frameHeight;
    const geometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.frames = new Float32Array(poolSize);
    this.facings = new Float32Array(poolSize);
    this.flashes = new Float32Array(poolSize);
    this.lits = new Float32Array(poolSize); // M5: standing in a station floodlight (0..1)
    this.litAttr = new THREE.InstancedBufferAttribute(this.lits, 1).setUsage(THREE.DynamicDrawUsage);
    this.variants = new Float32Array(poolSize);
    this.variantAttr = new THREE.InstancedBufferAttribute(this.variants, 1).setUsage(THREE.DynamicDrawUsage);
    this.frameAttr = new THREE.InstancedBufferAttribute(this.frames, 1).setUsage(THREE.DynamicDrawUsage);
    this.facingAttr = new THREE.InstancedBufferAttribute(this.facings, 1).setUsage(THREE.DynamicDrawUsage);
    this.flashAttr = new THREE.InstancedBufferAttribute(this.flashes, 1).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aFrame', this.frameAttr);
    geometry.setAttribute('aFacing', this.facingAttr);
    geometry.setAttribute('aFlash', this.flashAttr);
    geometry.setAttribute('aVariant', this.variantAttr);
    geometry.setAttribute('aLit', this.litAttr);

    this.mesh = new THREE.InstancedMesh(geometry, this.material, poolSize);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.customDepthMaterial = this.depthMaterial;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // instances move every frame
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.matrix = new THREE.Matrix4();
  }

  patch(material, colour) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      let vertex = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${COMMON}${colour ? 'varying float vFlash;\nvarying float vLit;' : ''}`)
        .replace('#include <uv_vertex>', UV)
        .replace('#include <beginnormal_vertex>', NORMAL)
        .replace('#include <begin_vertex>', BEGIN_VERTEX);
      if (colour) {
        vertex = vertex.replace('#include <fog_vertex>', '#include <fog_vertex>\nvFlash = aFlash;\nvLit = aLit;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vFlash;\nvarying float vLit;\nuniform vec3 uFlashColor;\nuniform vec3 uLitColor;')
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uLitColor * vLit;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uFlashColor, vFlash);\ntotalEmissiveRadiance += uFlashColor * vFlash;',
          );
      }
      shader.vertexShader = vertex;
    };
    material.customProgramCacheKey = () => (colour ? 'zombie-billboard' : 'zombie-billboard-depth');
    return material;
  }

  // zombies: the pool. Packs the active ones into the first instances.
  update(zombies) {
    const c = this.cfg;
    let n = 0;
    for (const z of zombies) {
      if (!z.active || z.kind === 'mutant') continue;
      const y = z.y - z.sink * this.spriteHeight;
      this.matrix.makeScale(this.spriteWidth, this.spriteHeight, this.spriteWidth).setPosition(z.x, y, z.z);
      this.mesh.setMatrixAt(n, this.matrix);
      this.frames[n] = z.frame;
      this.facings[n] = z.facing;
      this.flashes[n] = z.flash > 0 ? z.flash / c.hitFlashSeconds : 0;
      this.lits[n] = z.lit ?? 0;
      this.variants[n] = this.variantIndex[z.variant] ?? 0;
      n++;
    }
    this.mesh.count = n;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.frameAttr.needsUpdate = true;
      this.facingAttr.needsUpdate = true;
      this.flashAttr.needsUpdate = true;
      this.litAttr.needsUpdate = true;
      this.variantAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.removeFromParent();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.atlas.dispose();
  }
}
