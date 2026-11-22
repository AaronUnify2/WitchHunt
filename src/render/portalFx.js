// The portal at Ground Zero (Nov 2026, Aaron: the opening's cold open,
// upgraded): the government's machined ring holding an interdimensional
// vortex, its Roswell blue overrun by the witches' green. Unexplained:
// nothing comes through, it's just energy. A cutscene actor (kind 'portal',
// story/Cutscenes.js), driven by its state: green 0..1 (how much of the blue
// has been overrun), power 0..1+ (how hard it's going; past 1 it blows out)
// and spin (the swirl's speed), each eased toward a target ('portal' events).
//
// No lights (a new light recompiles every lit material: a hitch); it all
// glows by itself, additive. Roughly 10 draw calls, for a 6 s cutscene.

import * as THREE from 'three';

export const PORTAL_COLORS = {
  blue: 0x4f9dff, // Roswell government blue
  green: 0x8cff3a, // the witches' sickly green
  core: 0xe8fff0,
  steel: 0x3a4048,
  steelDark: 0x23272c,
};

const VORTEX_VERT = /* glsl */ `
varying vec2 vP;
uniform float uRadius;
void main() {
  vP = position.xy / uRadius;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const VORTEX_FRAG = /* glsl */ `
uniform float uTime, uGreen, uPower, uTwist;
uniform vec3 uBlue, uGreenCol, uCore;
varying vec2 vP;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  float r = length(vP);
  if (r > 1.0) discard;
  float a = atan(vP.y, vP.x);
  // The swirl: angle wound tighter toward the middle, turning with time (uTwist accumulates spin).
  float tw = a + 2.6 * log(r + 0.04) * (1.0 + uGreen * 0.8) - uTwist;
  vec2 sw = vec2(cos(tw), sin(tw)) * r;
  float n = fbm(sw * 3.2 + vec2(uTime * 0.35, -uTime * 0.2));
  float arms = 0.5 + 0.5 * sin(tw * 3.0 + n * 5.0);
  // The green, eating in from the middle in tendrils.
  float g = fbm(vec2(a * 1.6 + uTime * 0.2, r * 3.5 - uTime * 1.1) + 7.0);
  float inv = smoothstep(0.0, 0.18, uGreen * 1.5 - r * 0.75 - g * 0.55 + 0.12);
  vec3 col = mix(uBlue, uGreenCol, inv);
  // Where the green meets the blue, it crackles white-green.
  float front = clamp(1.0 - abs(inv - 0.5) * 2.0, 0.0, 1.0) * step(0.02, uGreen);
  float spark = step(0.72, noise(sw * 22.0 + uTime * 9.0)) * front;
  col += mix(uGreenCol, uCore, 0.5) * (front * 0.7 + spark * 1.6);
  float bright = (0.22 + 0.5 * arms) * (0.4 + 0.6 * n);
  bright += smoothstep(0.32, 0.0, r) * (0.3 + uGreen * 0.35); // the eye
  bright *= min(uPower, 1.4) * 0.7;
  // Past 1.4 it whites out (the blowout at the end).
  float white = clamp((uPower - 1.4) / 0.8, 0.0, 1.0);
  col = mix(col, uCore, white * 0.85);
  bright += white * 1.5;
  float edge = smoothstep(1.0, 0.82, r);
  gl_FragColor = vec4(col * bright * edge, 1.0);
}`;

const ARCS = 7;
const ARC_STEPS = 7;
const MOTES = 160;

// The portal's group: the machined ring on its stand, the vortex, the arcs, the motes, the light on the ground.
// spec: { size (the vortex's radius, m), green, power, spin (where it starts) }.
export function buildPortal(spec = {}) {
  const r = spec.size ?? 4;
  const g = new THREE.Group();
  const centreY = r + 0.6;
  const blue = new THREE.Color(PORTAL_COLORS.blue);
  const green = new THREE.Color(PORTAL_COLORS.green);
  const glowMat = (color, opacity = 1) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });

  // The government's hardware: a heavy steel ring, eight clamps, two legs and a plinth (lit by the camera's light).
  const steel = new THREE.MeshLambertMaterial({ color: PORTAL_COLORS.steel });
  const steelDark = new THREE.MeshLambertMaterial({ color: PORTAL_COLORS.steelDark });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(r * 1.1, r * 0.11, 8, 48), steel);
  frame.position.y = centreY;
  g.add(frame);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(r * 0.22, r * 0.34, r * 0.34), steelDark);
    clamp.position.set(Math.cos(a) * r * 1.1, centreY + Math.sin(a) * r * 1.1, 0);
    clamp.rotation.z = a;
    g.add(clamp);
  }
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(r * 0.16, centreY * 0.7, r * 0.3), steelDark);
    leg.position.set(s * r * 0.75, centreY * 0.35 - 0.1, 0);
    leg.rotation.z = s * 0.35;
    g.add(leg);
  }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, 0.4, r * 0.9), steelDark);
  plinth.position.y = 0.2;
  g.add(plinth);

  // The energy: a rim of light inside the steel, and the vortex.
  const rimMat = glowMat(blue.clone());
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.0, r * 0.045, 6, 64), rimMat);
  rim.position.y = centreY;
  g.add(rim);
  const vortexMat = new THREE.ShaderMaterial({
    vertexShader: VORTEX_VERT,
    fragmentShader: VORTEX_FRAG,
    uniforms: {
      uRadius: { value: r },
      uTime: { value: 0 },
      uTwist: { value: 0 },
      uGreen: { value: 0 },
      uPower: { value: 0 },
      uBlue: { value: blue.clone() },
      uGreenCol: { value: green.clone() },
      uCore: { value: new THREE.Color(PORTAL_COLORS.core) },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const vortex = new THREE.Mesh(new THREE.CircleGeometry(r * 0.99, 64), vortexMat);
  vortex.position.y = centreY;
  g.add(vortex);

  // Arcs: jagged bolts off the rim, redrawn every few hundredths of a second.
  const arcPos = new Float32Array(ARCS * ARC_STEPS * 2 * 3);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));
  const arcMat = new THREE.LineBasicMaterial({ color: blue.clone(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const arcs = new THREE.LineSegments(arcGeo, arcMat);
  arcs.position.y = centreY;
  arcs.frustumCulled = false;
  g.add(arcs);

  // Motes: dust and leaves drawn in, spiralling to the eye.
  const motes = [];
  const motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) motes.push(newMote(r, true));
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ color: blue.clone(), size: r * 0.045, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const points = new THREE.Points(moteGeo, moteMat);
  points.position.y = centreY;
  points.frustumCulled = false;
  g.add(points);

  // Its light on the ground, in front and behind, soft at the edge.
  const poolMat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vP; void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float opacity; uniform float uR; varying vec2 vP; void main() { float k = 1.0 - clamp(length(vP) / uR, 0.0, 1.0); gl_FragColor = vec4(color * k * k * k * opacity, 1.0); }',
    uniforms: { color: { value: blue.clone() }, opacity: { value: 0 }, uR: { value: r * 1.5 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(r * 1.5, 40).rotateX(-Math.PI / 2), poolMat);
  pool.position.y = 0.06;
  g.add(pool);

  const state = { green: spec.green ?? 0, power: spec.power ?? 0.4, spin: spec.spin ?? 0.6, tween: null, time: 0, twist: 0, arcTimer: 0 };
  const colour = new THREE.Color();

  // To targets over seconds: { green, power, spin, seconds } (any left out stay as they are).
  function to(target) {
    const seconds = Math.max(0.001, target.seconds ?? 1);
    state.tween = { from: { green: state.green, power: state.power, spin: state.spin }, to: { green: target.green ?? state.green, power: target.power ?? state.power, spin: target.spin ?? state.spin }, t: 0, seconds };
  }

  function update(dt) {
    if (state.tween) {
      const tw = state.tween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.seconds);
      const e = k * k * (3 - 2 * k);
      for (const key of ['green', 'power', 'spin']) state[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      if (k >= 1) state.tween = null;
    }
    state.time += dt;
    state.twist += dt * state.spin * 2.2;
    const u = vortexMat.uniforms;
    u.uTime.value = state.time;
    u.uTwist.value = state.twist;
    u.uGreen.value = state.green;
    u.uPower.value = state.power;
    colour.copy(blue).lerp(green, Math.min(1, state.green * 1.15));
    // The rim flickers, harder as the green takes it.
    const flicker = 1 - Math.random() * (0.15 + state.green * 0.45); // cosmetic: not gameplay
    rimMat.color.copy(colour).multiplyScalar(Math.min(1.2, state.power * 0.9) * flicker);
    poolMat.uniforms.color.value.copy(colour);
    poolMat.uniforms.opacity.value = Math.min(0.5, state.power * 0.28) * flicker;
    moteMat.color.copy(colour);
    arcMat.color.copy(colour).lerp(new THREE.Color(PORTAL_COLORS.core), 0.3);
    arcMat.opacity = Math.min(1, Math.max(0, state.power - 0.45) * 1.6);
    state.arcTimer -= dt;
    if (state.arcTimer <= 0) {
      state.arcTimer = 0.05 + Math.random() * 0.05; // cosmetic: not gameplay
      drawArcs(arcPos, r, state.power);
      arcGeo.attributes.position.needsUpdate = true;
    }
    for (let i = 0; i < MOTES; i++) {
      const m = motes[i];
      m.a += dt * (0.6 + state.spin * 1.4) * (r / Math.max(0.3, m.r));
      m.r -= dt * (0.4 + state.power * 2.4) * m.speed;
      if (m.r < r * 0.06) motes[i] = newMote(r, false);
      const n = motes[i];
      motePos[i * 3] = Math.cos(n.a) * n.r;
      motePos[i * 3 + 1] = Math.sin(n.a) * n.r;
      motePos[i * 3 + 2] = n.z * (n.r / r);
    }
    moteGeo.attributes.position.needsUpdate = true;
  }

  g.userData.portal = { state, to, update };
  return g;
}

function newMote(r, anywhere) {
  return {
    a: Math.random() * Math.PI * 2, // cosmetic: not gameplay
    r: anywhere ? r * (0.2 + Math.random() * 1.8) : r * (1.2 + Math.random() * 1.2), // cosmetic
    z: (Math.random() - 0.5) * r * 0.8, // cosmetic
    speed: 0.5 + Math.random(), // cosmetic
  };
}

// Each bolt: from a point on the rim, jagged, out into the air or across the vortex. Fewer (folded to nothing) at low power.
function drawArcs(pos, r, power) {
  let o = 0;
  const live = Math.round(Math.min(1, Math.max(0, power - 0.4)) * ARCS);
  for (let b = 0; b < ARCS; b++) {
    const a = Math.random() * Math.PI * 2; // cosmetic: not gameplay
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    const inward = Math.random() < 0.4; // cosmetic
    const reach = r * (0.5 + Math.random() * 0.7); // cosmetic
    const ea = a + (Math.random() - 0.5) * 1.2; // cosmetic
    const ex = inward ? Math.cos(ea) * r * 0.25 : Math.cos(ea) * (r + reach);
    const ey = inward ? Math.sin(ea) * r * 0.25 : Math.sin(ea) * (r + reach);
    let px = sx;
    let py = sy;
    let pz = 0;
    for (let s = 1; s <= ARC_STEPS; s++) {
      const k = s / ARC_STEPS;
      const jag = s === ARC_STEPS ? 0 : r * 0.14;
      const nx = sx + (ex - sx) * k + (Math.random() - 0.5) * jag; // cosmetic
      const ny = sy + (ey - sy) * k + (Math.random() - 0.5) * jag; // cosmetic
      const nz = (Math.random() - 0.5) * jag; // cosmetic
      if (b < live) {
        pos.set([px, py, pz, nx, ny, nz], o);
      } else {
        pos.set([0, 0, 0, 0, 0, 0], o);
      }
      o += 6;
      px = nx;
      py = ny;
      pz = nz;
    }
  }
}
