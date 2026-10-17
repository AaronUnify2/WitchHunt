// Draws every active zombie (not mutants: see MutantRenderer) as one
// instanced billboard (Doom-style): the sprite turns about the vertical to
// face the camera, and the shader picks the atlas row from the angle
// between the zombie's facing and the camera (8 angles), the block from its
// look (variant and hairstyle) and the column from its animation frame.
// Lit by the torch and casting its shadow, like the trees. One draw call,
// plus one in the torch shadow pass.
// M6: only the active and nearby tiers are drawn (abstract zombies have
// no mesh), active first, and none past the draw distance (the fog hides
// them anyway). Debug: a tint per tier.
// Session 13 (#144): every zombie is coloured in as it's drawn (a palette
// swap: zombieSprite.js paints the parts grey and masks them), with its
// own shirt, trousers, hair and skin, sleeves, plaid and build
// (zombieLook.js). Still one draw call.

import * as THREE from 'three';
import { makeZombieAtlas, ATLAS_ROWS as ROWS } from './zombieSprite.js';
import { paletteTable, zombieLook } from './zombieLook.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

// Per instance: aState (frame, facing, hit flash, floodlit), aStyle
// (atlas block, long sleeves, plaid, debug tier tint), aLook (palette
// indices: shirt, trousers, hair, skin).
const COMMON = /* glsl */ `
  attribute vec4 aState;
  attribute vec4 aStyle;
  attribute vec4 aLook;
  uniform float uFrames;
  uniform float uBlockCols;
  uniform float uBlockRows;
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
// rows step round so that row 2 shows it facing image-right. Blocks sit
// in a grid, left to right then top to bottom; v = 1 is the atlas's top.
const UV = /* glsl */ `
  #include <uv_vertex>
  #ifdef USE_MAP
    vec2 zbCam = zbToCamera();
    float zbRel = atan(zbCam.x, zbCam.y) - aState.y;
    float zbRow = mod(floor(-zbRel / (6.2831853 / ${ROWS}.0) + 0.5), ${ROWS}.0);
    float zbBlockCol = mod(aStyle.x + 0.5, uBlockCols) - 0.5;
    float zbBlockRow = floor((aStyle.x + 0.5) / uBlockCols);
    vMapUv.x = (vMapUv.x + aState.x + zbBlockCol * uFrames) / (uFrames * uBlockCols);
    float zbRows = ${ROWS}.0 * uBlockRows;
    vMapUv.y = (vMapUv.y + zbRows - 1.0 - (zbBlockRow * ${ROWS}.0 + zbRow)) / zbRows;
  #endif
`;

// The colour pass: the look's colours, looked up once per vertex.
const LOOK_VERTEX = /* glsl */ `
  vFlash = aState.z;
  vLit = aState.w;
  vTint = aStyle.w;
  vStyle = aStyle.yz;
  vShirt = uPalette[int(aLook.x + 0.5)];
  vTrousers = uPalette[int(aLook.y + 0.5)];
  vHair = uPalette[int(aLook.z + 0.5)];
  vSkin = uPalette[int(aLook.w + 0.5)];
`;

// Colour in the grey parts by the mask: r shirt, g trousers, b hair, a
// skin. The forearm is in both shirt and skin: long sleeves take the
// shirt there, short the skin. Plaid darkens the shirt in atlas-pixel
// lines (faded out once they'd be finer than a screen pixel).
const MAP_FRAGMENT = /* glsl */ `
  #ifdef USE_MAP
    vec4 sampledDiffuseColor = texture2D( map, vMapUv );
    vec4 zbM = texture2D( uMask, vMapUv );
    float zbShirtW = zbM.r * mix( 1.0 - zbM.a, 1.0, vStyle.x );
    float zbSkinW = zbM.a * mix( 1.0, 1.0 - zbM.r, vStyle.x );
    vec3 zbShirt = vShirt;
    if ( vStyle.y > 0.5 ) {
      vec2 zbTx = vMapUv * uAtlasSize;
      vec2 zbLines = step( mod( zbTx, uPlaid.x ), vec2( uPlaid.y ) );
      float zbFade = 1.0 - smoothstep( 0.6, 1.4, max( fwidth( zbTx.x ), fwidth( zbTx.y ) ) );
      zbShirt *= mix( 1.0, uPlaid.z, ( zbLines.x + zbLines.y ) * 0.5 * zbFade );
    }
    float zbW = zbShirtW + zbM.g + zbM.b + zbSkinW;
    vec3 zbTintColour = ( zbShirtW * zbShirt + zbM.g * vTrousers + zbM.b * vHair + zbSkinW * vSkin ) / max( zbW, 0.0001 );
    sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * zbTintColour, smoothstep( 0.0, 0.08, zbW ) );
    diffuseColor *= sampledDiffuseColor;
  #endif
`;

export class ZombieRenderer {
  constructor(zombieConfig, rng) {
    this.cfg = zombieConfig;
    this.rng = rng;
  }

  // capacity: the most sprites drawn at once (config.zombies.lod.renderCap).
  init(scene, capacity) {
    const poolSize = capacity;
    this.capacity = capacity;
    const c = this.cfg;
    const t = c.texture;
    const atlas = makeZombieAtlas(c, this.rng);
    this.atlas = atlas.map;
    this.mask = atlas.mask;
    this.blocks = atlas.blocks;
    this.layout = atlas.layout;
    this.table = paletteTable(t);
    const palette = new Float32Array(this.table.colours.length * 3);
    const colour = new THREE.Color();
    this.table.colours.forEach((hex, i) => colour.setHex(hex).toArray(palette, i * 3));
    this.uniforms = {
      uFrames: { value: ZOMBIE_FRAMES.count },
      uBlockCols: { value: this.layout.cols },
      uBlockRows: { value: this.layout.rows },
      uNormalUpBias: { value: c.normalUpBias },
      uMask: { value: this.mask },
      uPalette: { value: palette },
      uAtlasSize: { value: new THREE.Vector2(this.layout.width, this.layout.height) },
      uPlaid: { value: new THREE.Vector3(t.plaid.every, t.plaid.line, t.plaid.dark) },
      uFlashColor: { value: new THREE.Color(c.hitFlashColor) },
      uLitColor: { value: new THREE.Color(c.floodlit.color).multiplyScalar(c.floodlit.strength) },
      uTintActive: { value: new THREE.Color(c.lod.tierColors.active) },
      uTintNearby: { value: new THREE.Color(c.lod.tierColors.nearby) },
      uThermal: { value: 0 }, // Session 10b: glowing white through the heat scope
      uThermalNear: { value: new THREE.Vector3(1, 0, 1) }, // near share, near m, far m
    };
    const albedo = new THREE.Color().setScalar(c.albedoScale);
    this.material = this.patch(new THREE.MeshLambertMaterial({ map: this.atlas, color: albedo, alphaTest: c.alphaTest }), true);
    this.depthMaterial = this.patch(new THREE.MeshDepthMaterial({ map: this.atlas, alphaTest: c.alphaTest }), false);

    this.spriteHeight = c.height * c.spriteHeightRatio;
    this.spriteWidth = (this.spriteHeight * t.frameWidth) / t.frameHeight;
    const geometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    this.states = new Float32Array(poolSize * 4);
    this.styles = new Float32Array(poolSize * 4);
    this.looks = new Float32Array(poolSize * 4);
    this.stateAttr = new THREE.InstancedBufferAttribute(this.states, 4).setUsage(THREE.DynamicDrawUsage);
    this.styleAttr = new THREE.InstancedBufferAttribute(this.styles, 4).setUsage(THREE.DynamicDrawUsage);
    this.lookAttr = new THREE.InstancedBufferAttribute(this.looks, 4).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aState', this.stateAttr);
    geometry.setAttribute('aStyle', this.styleAttr);
    geometry.setAttribute('aLook', this.lookAttr);

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

  // Session 10b: through the heat scope they glow white-hot.
  // t: config.viewModel.thermal (the glow fades up close: Aaron).
  setThermal(on, t) {
    this.uniforms.uThermal.value = on ? t.glow : 0;
    this.uniforms.uThermalNear.value.set(t.nearGlow, t.nearMetres, t.farMetres);
  }

  patch(material, colour) {
    const paletteSize = this.table.colours.length;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      const varyings = 'varying float vFlash;\nvarying float vLit;\nvarying float vTint;\nvarying vec2 vStyle;\nvarying vec3 vShirt;\nvarying vec3 vTrousers;\nvarying vec3 vHair;\nvarying vec3 vSkin;';
      let vertex = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${COMMON}${colour ? `uniform vec3 uPalette[${paletteSize}];\n${varyings}` : ''}`)
        .replace('#include <uv_vertex>', UV)
        .replace('#include <beginnormal_vertex>', NORMAL)
        .replace('#include <begin_vertex>', BEGIN_VERTEX);
      if (colour) {
        vertex = vertex.replace('#include <fog_vertex>', `#include <fog_vertex>\n${LOOK_VERTEX}`);
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>\n${varyings}\nuniform sampler2D uMask;\nuniform vec2 uAtlasSize;\nuniform vec3 uPlaid;\nuniform vec3 uFlashColor;\nuniform vec3 uLitColor;\nuniform vec3 uTintActive;\nuniform vec3 uTintNearby;\nuniform float uThermal;\nuniform vec3 uThermalNear;`,
          )
          .replace('#include <map_fragment>', MAP_FRAGMENT)
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uLitColor * vLit;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uFlashColor, vFlash);\ntotalEmissiveRadiance += uFlashColor * vFlash;\nif (vTint > 0.5) totalEmissiveRadiance += (vTint < 1.5 ? uTintActive : uTintNearby) * 0.5;\ntotalEmissiveRadiance += vec3(uThermal * mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition))));',
          );
      }
      shader.vertexShader = vertex;
    };
    material.customProgramCacheKey = () => (colour ? 'zombie-billboard-looks' : 'zombie-billboard-depth');
    return material;
  }

  // zombies: the pool. Packs the drawn ones into the first instances:
  // the active tier first, then nearby ones within `cullDistance` of
  // `camera` (x, z). showTiers: tint each by its tier (debug).
  update(zombies, camera, cullDistance, showTiers = false) {
    let n = this.pack(zombies, 'active', camera, Infinity, showTiers, 0);
    n = this.pack(zombies, 'nearby', camera, cullDistance, showTiers, n);
    this.mesh.count = n;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.stateAttr.needsUpdate = true;
      this.styleAttr.needsUpdate = true;
      this.lookAttr.needsUpdate = true;
    }
  }

  // Zombies of `tier` (a fresh one with no tier yet counts as active)
  // into instances from `n`. Returns the next free instance.
  pack(zombies, tier, camera, cullDistance, showTiers, n) {
    const c = this.cfg;
    for (const z of zombies) {
      if (n >= this.capacity) break;
      if (!z.active || z.kind === 'mutant' || (z.tier ?? 'active') !== tier) continue;
      if (cullDistance < Infinity && Math.hypot(z.x - camera.x, z.z - camera.z) > cullDistance) continue;
      const look = this.lookOf(z);
      const height = this.spriteHeight * look.height;
      const width = this.spriteWidth * look.width;
      const y = z.y - z.sink * height;
      this.matrix.makeScale(width, height, width).setPosition(z.x, y, z.z);
      this.mesh.setMatrixAt(n, this.matrix);
      const i = n * 4;
      this.states[i] = z.frame;
      this.states[i + 1] = z.facing;
      this.states[i + 2] = z.flash > 0 ? z.flash / c.hitFlashSeconds : 0;
      this.states[i + 3] = z.lit ?? 0; // M5: standing in a station floodlight (0..1)
      this.styles[i] = look.block;
      this.styles[i + 1] = look.sleeves;
      this.styles[i + 2] = look.plaid;
      this.styles[i + 3] = showTiers ? (tier === 'active' ? 1 : 2) : 0; // M6 debug: 0 none, 1 active, 2 nearby
      this.looks[i] = look.shirt;
      this.looks[i + 1] = look.trousers;
      this.looks[i + 2] = look.hair;
      this.looks[i + 3] = look.skin;
      n++;
    }
    return n;
  }

  // A zombie's look, worked out once per spawn (its look seed) and kept on it.
  lookOf(z) {
    const seed = z.lookSeed ?? 0;
    if (z.look && z.lookFor === seed && z.lookVariant === z.variant) return z.look;
    z.look = zombieLook(z.variant, seed, this.cfg.texture, this.blocks, this.table, z.look ?? {});
    z.lookFor = seed;
    z.lookVariant = z.variant;
    return z.look;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.removeFromParent();
    this.material.dispose();
    this.depthMaterial.dispose();
    this.atlas.dispose();
    this.mask.dispose();
  }
}
