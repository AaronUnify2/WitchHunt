// Height mist in every fogged material (Session 10). Replaces three.js's
// fog shader chunks so every material that takes fog also gets a low mist
// layer: thickest at the ground, thinning a metre or so up, thicker in
// hollows below your feet, building with distance (so the ground right
// round you stays clear) and broken up by slowly drifting noise. The
// distance fog runs after it, as before.
//
// The mist's values are a handful of uniforms shared by every material
// (atmosphereUniforms). three.js only uploads uniforms a material carries,
// so install() hooks Material.prototype.onBeforeCompile: every material
// gets the shared uniforms before it compiles, including ones that set
// their own onBeforeCompile (the hook wraps theirs). Call install() once,
// before any material is created: a material that set its own hook
// earlier would skip the shared uniforms.

import * as THREE from 'three';

export const atmosphereUniforms = {
  // strength (0 = off), layer height (m), ground height under the camera (m), hollow cap
  uMistShape: { value: new THREE.Vector4(0, 1, 0, 1) },
  // noise scale (per m), reach (per m), noise drift offset x, z (m)
  uMistFlow: { value: new THREE.Vector4(0.05, 0.03, 0, 0) },
  // noise amount (0..1), max opacity (0..1), unused, unused
  uMistLook: { value: new THREE.Vector4(0.4, 0.8, 0, 0) },
  uMistColor: { value: new THREE.Color() },
};

const FOG_PARS_VERTEX = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorld;
#endif
`;

// World position from the view-space position: the view matrix is a
// rotation plus a translation, so its inverse is the transpose.
const FOG_VERTEX = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorld = transpose( mat3( viewMatrix ) ) * ( mvPosition.xyz - viewMatrix[ 3 ].xyz );
#endif
`;

const FOG_PARS_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  uniform vec4 uMistShape;
  uniform vec4 uMistFlow;
  uniform vec4 uMistLook;
  uniform vec3 uMistColor;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
  float atmoHash( vec2 p ) {
    return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
  }
  float atmoNoise( vec2 p ) {
    vec2 i = floor( p );
    vec2 f = fract( p );
    f = f * f * ( 3.0 - 2.0 * f );
    return mix(
      mix( atmoHash( i ), atmoHash( i + vec2( 1.0, 0.0 ) ), f.x ),
      mix( atmoHash( i + vec2( 0.0, 1.0 ) ), atmoHash( i + vec2( 1.0, 1.0 ) ), f.x ),
      f.y );
  }
#endif
`;

const FOG_FRAGMENT = /* glsl */ `
#ifdef USE_FOG
  if ( uMistShape.x > 0.0 ) {
    float mistLayer = min( exp( - ( vFogWorld.y - uMistShape.z ) / uMistShape.y ), uMistShape.w );
    vec2 mistAt = vFogWorld.xz * uMistFlow.x + uMistFlow.zw;
    float mistNoise = atmoNoise( mistAt ) * 0.65 + atmoNoise( mistAt * 2.7 + 13.1 ) * 0.35;
    float mistReach = 1.0 - exp( - vFogDepth * uMistFlow.y );
    float mist = uMistShape.x * mistLayer * mistReach * ( 1.0 - uMistLook.x * mistNoise );
    gl_FragColor.rgb = mix( gl_FragColor.rgb, uMistColor, min( mist, uMistLook.y ) );
  }
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;

function addUniforms(shader) {
  Object.assign(shader.uniforms, atmosphereUniforms);
}

let installed = false;

export function installAtmosphereShader() {
  if (installed) return;
  installed = true;
  THREE.ShaderChunk.fog_pars_vertex = FOG_PARS_VERTEX;
  THREE.ShaderChunk.fog_vertex = FOG_VERTEX;
  THREE.ShaderChunk.fog_pars_fragment = FOG_PARS_FRAGMENT;
  THREE.ShaderChunk.fog_fragment = FOG_FRAGMENT;

  // The default hook, and a wrapper for any material that sets its own.
  // The wrapper reports its inner function's text, so three.js's default
  // program cache key (onBeforeCompile.toString()) still tells them apart.
  function defaultHook(shader) {
    addUniforms(shader);
  }
  Object.defineProperty(THREE.Material.prototype, 'onBeforeCompile', {
    configurable: true,
    get() {
      return this._atmosphereHook ?? defaultHook;
    },
    set(fn) {
      const hook = function (shader, renderer) {
        addUniforms(shader);
        fn.call(this, shader, renderer);
      };
      hook.toString = () => fn.toString();
      this._atmosphereHook = hook;
    },
  });
}
