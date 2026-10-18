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
// (zombieLook.js), and its own blood: spots and splashes laid over its
// body in the shader, more or less of them per zombie (Aaron). Still one
// draw call.

import * as THREE from 'three';
import { makeZombieAtlas, ANGLES, ATLAS_ROWS as ROWS } from './zombieSprite.js';
import { paletteTable, zombieLook } from './zombieLook.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

// Per instance: aState (frame, facing, hit flash, floodlit), aStyle
// (atlas block, long sleeves, pattern: 0 plain, 1 plaid, 2 camo, debug tier tint), aLook (palette
// indices: shirt, trousers, hair, skin), aBlood (how bloody, its pattern's seed).
const COMMON = /* glsl */ `
  attribute vec4 aState;
  attribute vec4 aStyle;
  attribute vec4 aLook;
  attribute vec2 aBlood;
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
    float zbAngle = mod(floor(-zbRel / (6.2831853 / ${ANGLES}.0) + 0.5), ${ANGLES}.0);
    // Angles 5-7 are 3-1 mirrored (only 0-4 are stored).
    float zbMirror = step(4.5, zbAngle);
    float zbRow = mix(zbAngle, ${ANGLES}.0 - zbAngle, zbMirror);
    float zbBlockCol = mod(aStyle.x + 0.5, uBlockCols) - 0.5;
    float zbBlockRow = floor((aStyle.x + 0.5) / uBlockCols);
    vMapUv.x = (mix(vMapUv.x, 1.0 - vMapUv.x, zbMirror) + aState.x + zbBlockCol * uFrames) / (uFrames * uBlockCols);
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
  vBlood = aBlood;
  vShirt = uPalette[int(aLook.x + 0.5)];
  vTrousers = uPalette[int(aLook.y + 0.5)];
  vHair = uPalette[int(aLook.z + 0.5)];
  vSkin = uPalette[int(aLook.w + 0.5)];
`;

// The body's blood: in each cell of a grid over the frame (in atlas
// pixels, snapped to them so it's as crisp as the sprite), maybe a round
// spot, placed and sized by a hash of the cell and the zombie's seed. Two
// layers: small drops and big splashes, some of which run in a drip down
// the body (frame y runs up). Kept inside the cell, so one hash per layer.
const BLOOD_FUNCTIONS = /* glsl */ `
  vec4 zbHash( vec2 c, float s ) {
    vec4 p4 = fract( vec4( c.xyx, s ) * vec4( 0.1031, 0.1030, 0.0973, 0.1099 ) );
    p4 += dot( p4, p4.wzxy + 33.33 );
    return fract( ( p4.xxyz + p4.yzzw ) * p4.zywx );
  }
  // layer: cell size, chance of a spot, smallest and largest radius.
  // drip: the share of spots that drip.
  float zbSpots( vec2 p, vec4 layer, float amount, float seed, float drip ) {
    vec2 c = floor( p / layer.x );
    vec4 h = zbHash( c, seed );
    if ( h.x >= layer.y * amount ) return 0.0;
    float r = mix( layer.z, layer.w, h.w );
    vec2 centre = ( c + 0.5 ) * layer.x + ( h.yz - 0.5 ) * max( 0.0, layer.x - 2.0 * r );
    float spot = step( length( p - centre ), r );
    if ( fract( h.w * 5.0 ) < drip ) {
      float len = r * ( 1.5 + 3.0 * fract( h.y * 7.0 ) );
      float x = centre.x + ( fract( h.z * 13.0 ) - 0.5 ) * r;
      spot = max( spot, step( abs( p.x - x ), 0.6 ) * step( p.y, centre.y ) * step( centre.y - len, p.y ) );
    }
    return spot;
  }
`;

// Colour in the grey parts by the mask: r shirt, g trousers, b hair, a
// skin. The forearm is in both shirt and skin: long sleeves take the
// shirt there, short the skin. Plaid darkens the shirt in atlas-pixel
// lines (faded out once they'd be finer than a screen pixel). Then the
// blood, heaviest on the shirt (uBloodParts: shirt, trousers, hair, skin),
// fading to an even stain far off.
const MAP_FRAGMENT = /* glsl */ `
  #ifdef USE_MAP
    vec4 sampledDiffuseColor = texture2D( map, vMapUv );
    vec4 zbM = texture2D( uMask, vMapUv );
    float zbShirtW = zbM.r * mix( 1.0 - zbM.a, 1.0, vStyle.x );
    float zbSkinW = zbM.a * mix( 1.0, 1.0 - zbM.r, vStyle.x );
    vec3 zbShirt = vShirt;
    vec3 zbTrousers = vTrousers;
    vec2 zbTx = vMapUv * uAtlasSize;
    float zbFade = 1.0 - smoothstep( 0.6, 1.4, max( fwidth( zbTx.x ), fwidth( zbTx.y ) ) );
    if ( vStyle.y > 1.5 ) {
      // Camouflage (the army): soft blotches, dark brown and pale khaki, on shirt and trousers.
      vec2 zbC = zbTx / uCamo.x;
      vec2 zbI = floor( zbC );
      vec2 zbF = fract( zbC );
      zbF = zbF * zbF * ( 3.0 - 2.0 * zbF );
      float zbN = mix( mix( zbHash( zbI, 5.0 ).x, zbHash( zbI + vec2( 1.0, 0.0 ), 5.0 ).x, zbF.x ), mix( zbHash( zbI + vec2( 0.0, 1.0 ), 5.0 ).x, zbHash( zbI + vec2( 1.0 ), 5.0 ).x, zbF.x ), zbF.y );
      vec3 zbTone = zbN < 0.4 ? uCamo.y * vec3( 1.1, 0.92, 0.7 ) : zbN > 0.62 ? vec3( uCamo.z ) : vec3( 1.0 );
      zbTone = mix( vec3( 1.0 ), zbTone, zbFade );
      zbShirt *= zbTone;
      zbTrousers *= zbTone;
    } else if ( vStyle.y > 0.5 ) {
      vec2 zbLines = step( mod( zbTx, uPlaid.x ), vec2( uPlaid.y ) );
      zbShirt *= mix( 1.0, uPlaid.z, ( zbLines.x + zbLines.y ) * 0.5 * zbFade );
    }
    float zbW = zbShirtW + zbM.g + zbM.b + zbSkinW;
    vec3 zbTintColour = ( zbShirtW * zbShirt + zbM.g * zbTrousers + zbM.b * vHair + zbSkinW * vSkin ) / max( zbW, 0.0001 );
    float zbBody = smoothstep( 0.0, 0.08, zbW );
    sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, sampledDiffuseColor.rgb * zbTintColour, zbBody );
    vec2 zbFrameP = mod( vMapUv * uAtlasSize, uFrameSize );
    vec2 zbP = floor( zbFrameP ) + 0.5;
    // How many atlas pixels to a screen pixel (from the unsnapped position:
    // the snapped one jumps at every pixel's edge).
    float zbFar = smoothstep( 0.6, 1.4, max( fwidth( vMapUv.x * uAtlasSize.x ), fwidth( vMapUv.y * uAtlasSize.y ) ) );
    // The seed is a whole number, but interpolation can wobble it (40.9999),
    // and the hash would change from one screen row to the next: round it.
    float zbSeed = floor( vBlood.y + 0.5 );
    float zbSpot = max( zbSpots( zbP, uBloodDrops, vBlood.x, zbSeed, 0.0 ), zbSpots( zbP + 101.0, uBloodSplashes, vBlood.x, zbSeed + 17.0, uBloodDrip ) );
    zbSpot = mix( zbSpot, vBlood.x * uBloodFar, zbFar );
    float zbWhere = ( zbShirtW * uBloodParts.x + zbM.g * uBloodParts.y + zbM.b * uBloodParts.z + zbSkinW * uBloodParts.w ) / max( zbW, 0.0001 );
    sampledDiffuseColor.rgb = mix( sampledDiffuseColor.rgb, uBloodColor, zbSpot * zbWhere * zbBody );
    diffuseColor *= sampledDiffuseColor;
  #endif
`;

export class ZombieRenderer {
  constructor(zombieConfig) {
    this.cfg = zombieConfig;
  }

  // capacity: the most sprites drawn at once (config.zombies.lod.renderCap).
  // shareFrom: another ZombieRenderer whose atlas to draw from (Session 13:
  // the cutscenes' zombies use the game's, so none is built twice).
  init(scene, capacity, shareFrom = null) {
    const poolSize = capacity;
    this.capacity = capacity;
    const c = this.cfg;
    const t = c.texture;
    this.ownsAtlas = !shareFrom;
    const atlas = shareFrom ? { map: shareFrom.atlas, mask: shareFrom.mask, blocks: shareFrom.blocks, layout: shareFrom.layout } : makeZombieAtlas(c);
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
      uCamo: { value: new THREE.Vector3(t.camo.cell, t.camo.dark, t.camo.light) },
      uFrameSize: { value: new THREE.Vector2(t.frameWidth, t.frameHeight) },
      uBloodColor: { value: new THREE.Color(t.blood) },
      uBloodDrops: { value: bloodLayer(t.bodyBlood.drops) },
      uBloodSplashes: { value: bloodLayer(t.bodyBlood.splashes) },
      uBloodParts: { value: new THREE.Vector4(...['shirt', 'trousers', 'hair', 'skin'].map((k) => t.bodyBlood.parts[k])) },
      uBloodFar: { value: t.bodyBlood.far },
      uBloodDrip: { value: t.bodyBlood.splashes.drip },
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
    this.bloods = new Float32Array(poolSize * 2);
    this.bloodAttr = new THREE.InstancedBufferAttribute(this.bloods, 2).setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aState', this.stateAttr);
    geometry.setAttribute('aStyle', this.styleAttr);
    geometry.setAttribute('aLook', this.lookAttr);
    geometry.setAttribute('aBlood', this.bloodAttr);

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
      const varyings = 'varying float vFlash;\nvarying float vLit;\nvarying float vTint;\nvarying vec2 vStyle;\nvarying vec2 vBlood;\nvarying vec3 vShirt;\nvarying vec3 vTrousers;\nvarying vec3 vHair;\nvarying vec3 vSkin;';
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
            `#include <common>\n${varyings}\nuniform sampler2D uMask;\nuniform vec2 uAtlasSize;\nuniform vec2 uFrameSize;\nuniform vec3 uPlaid;\nuniform vec3 uCamo;\nuniform vec3 uBloodColor;\nuniform vec4 uBloodDrops;\nuniform vec4 uBloodSplashes;\nuniform vec4 uBloodParts;\nuniform float uBloodFar;\nuniform float uBloodDrip;\n${BLOOD_FUNCTIONS}\nuniform vec3 uFlashColor;\nuniform vec3 uLitColor;\nuniform vec3 uTintActive;\nuniform vec3 uTintNearby;\nuniform float uThermal;\nuniform vec3 uThermalNear;`,
          )
          .replace('#include <map_fragment>', MAP_FRAGMENT)
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uLitColor * vLit;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uFlashColor, vFlash);\ntotalEmissiveRadiance += uFlashColor * vFlash;\nif (vTint > 0.5) totalEmissiveRadiance += (vTint < 1.5 ? uTintActive : uTintNearby) * 0.5;\ntotalEmissiveRadiance += vec3(uThermal * mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition))));',
          );
      }
      shader.vertexShader = vertex;
    };
    material.customProgramCacheKey = () => (colour ? 'zombie-billboard-looks-blood-camo' : 'zombie-billboard-depth-mirror');
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
      this.bloodAttr.needsUpdate = true;
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
      // Session 13: an army zombie that's lost its helmet (z.helmetOff, M9.4) is drawn bare-headed.
      this.styles[i] = z.helmetOff && look.bare >= 0 ? look.bare : look.block;
      this.styles[i + 1] = look.sleeves;
      this.styles[i + 2] = look.pattern;
      this.styles[i + 3] = showTiers ? (tier === 'active' ? 1 : 2) : 0; // M6 debug: 0 none, 1 active, 2 nearby
      this.looks[i] = look.shirt;
      this.looks[i + 1] = look.trousers;
      this.looks[i + 2] = look.hair;
      this.looks[i + 3] = look.skin;
      this.bloods[n * 2] = look.blood;
      this.bloods[n * 2 + 1] = look.bloodSeed;
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
    if (!this.ownsAtlas) return;
    this.atlas.dispose();
    this.mask.dispose();
  }
}

// A blood layer for the shader: (cell size, chance, smallest radius, largest radius).
function bloodLayer(l) {
  return new THREE.Vector4(l.cell, l.chance, l.radius[0], l.radius[1]);
}
