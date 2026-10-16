// The weapon in the player's hands, attached to the camera, with walk
// sway, recoil kick, a reload dip, a lower-and-raise on switching, the
// shovel's swing and a muzzle flash.
//
// Session 10b (Aaron: upgrade the guns): each gun is built in code from
// shaped parts: side profiles extruded with rounded edges for the
// woodwork (stock, grip, fore-end), round steel for receivers, barrels
// and bolts, and small details (sights, trigger guard, swivels, butt pad).
// Two meshes per gun: wood (with a walnut grain texture drawn in code) and
// steel. Unlit colours with baked shading: the torch sits right beside the
// gun, so real lighting would blow it out. Instead the colours are tinted
// each frame by the sky's ambient and sun/moon light (dark at night, full
// colour by day), a warm fill from the torch and the muzzle flash.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEG_TO_RAD = Math.PI / 180;

// Colours of the woodwork and steel.
const WALNUT = 0x6a4428;
const DARK_WALNUT = 0x553520;
const BLUED = 0x2c3036;
const STEEL = 0x464c54;
const DARK_STEEL = 0x202226;
const RUBBER = 0x1c1a18;

// Shading baked into vertex colours (top light, bottom dark, a little
// darker on the right, away from the moon).
function shade(geometry, hex, brightness = 1) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  const base = new THREE.Color(hex);
  const normals = g.attributes.normal;
  const colors = new Float32Array(normals.count * 3);
  for (let i = 0; i < normals.count; i++) {
    const ny = normals.getY(i);
    const nx = normals.getX(i);
    const light = brightness * (0.68 + 0.34 * ny - 0.12 * nx);
    colors[i * 3] = base.r * light;
    colors[i * 3 + 1] = base.g * light;
    colors[i * 3 + 2] = base.b * light;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(normals.count * 2), 2));
  return g;
}

function box(w, h, d, hex) {
  return shade(new THREE.BoxGeometry(w, h, d), hex);
}

// A round part along z (forward is -z), centred on its length.
function rod(r, length, hex, sides = 10, rEnd = r) {
  return shade(new THREE.CylinderGeometry(rEnd, r, length, sides).rotateX(-Math.PI / 2), hex);
}

function ball(r, hex) {
  return shade(new THREE.SphereGeometry(r, 8, 6), hex);
}

// A side profile, points [forward, up] in metres from the butt, extruded
// `width` across with rounded edges. After this, forward runs along -z
// from z = 0, centred across x.
function profile(points, width, hex, bevel = 0.006) {
  const shape = new THREE.Shape(points.map(([f, y]) => new THREE.Vector2(f, y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geometry.translate(0, 0, -(width - bevel * 2) / 2);
  geometry.rotateY(Math.PI / 2); // shape x (forward) -> -z, extrusion -> x
  // Grain runs along the gun: scale the generated UVs into the texture.
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 6);
  return shade(geometry, hex);
}

// Walnut grain, drawn in code: long, slightly wavy dark streaks on a near-
// white base (the vertex colours carry the wood's colour).
function makeGrainTexture() {
  const w = 256;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const y0 = rand() * h;
    const dark = rand() < 0.7;
    ctx.strokeStyle = dark ? `rgba(40,20,8,${0.12 + rand() * 0.25})` : `rgba(255,235,200,${0.15 + rand() * 0.2})`;
    ctx.lineWidth = 0.6 + rand() * 1.6;
    ctx.beginPath();
    const amp = rand() * 3;
    const freq = 1 + rand() * 3;
    const phase = rand() * 6.28;
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // A few knots.
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = 'rgba(40,20,8,0.35)';
    ctx.lineWidth = 1;
    const x = rand() * w;
    const y = rand() * h;
    for (let r = 2; r < 9; r += 2.5) {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 2.2, r, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Weapon sway for a ground speed: steps per second (walk pace up to sprint
// pace, never below a floor when creeping) and the dip size in metres.
// Fills and returns `out`.
export function weaponBob(speed, walkSpeed, sprintSpeed, cfg, out = {}) {
  if (speed <= 0.01) {
    out.stepsPerSecond = cfg.minStepsPerSecond;
    out.amount = 0;
    return out;
  }
  let stepsPerSecond;
  let amount;
  if (speed <= walkSpeed) {
    const t = speed / walkSpeed;
    stepsPerSecond = Math.max(cfg.minStepsPerSecond, cfg.walkStepsPerSecond * t);
    amount = cfg.amount * t;
  } else {
    const t = Math.min(1, (speed - walkSpeed) / (sprintSpeed - walkSpeed));
    stepsPerSecond = cfg.walkStepsPerSecond + (cfg.sprintStepsPerSecond - cfg.walkStepsPerSecond) * t;
    amount = cfg.amount * (1 + (cfg.sprintAmount - 1) * t);
  }
  out.stepsPerSecond = stepsPerSecond;
  out.amount = amount;
  return out;
}

export class ViewModel {
  constructor(viewModelConfig, weaponsConfig) {
    this.cfg = viewModelConfig;
    this.weaponsCfg = weaponsConfig;
  }

  // sky: the Sky (its ambient and directional lights); flashlight: the torch.
  init(camera, sky, flashlight) {
    this.sky = sky;
    this.flashlight = flashlight;
    this.tint = new THREE.Color();
    this.torchColor = new THREE.Color(this.cfg.lighting.torchColor);
    this.grain = makeGrainTexture();
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }); // steel
    this.woodMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, map: this.grain, fog: false });
    this.root = new THREE.Group();
    camera.add(this.root);
    this.models = {
      rifle: this.buildRifle(),
      shotgun: this.buildShotgun(),
      sniper: this.buildSniper(),
      pistol: this.buildPistol(),
      smg: this.buildSmg(),
      thermal: this.buildThermalRifle(),
      autoShotgun: this.buildAutoShotgun(),
      shovel: this.buildShovel(),
      detonator: this.buildDetonator(),
    };
    for (const m of Object.values(this.models)) {
      m.group.visible = false;
      this.root.add(m.group);
    }
    this.flashMaterial = new THREE.MeshBasicMaterial({
      color: this.cfg.muzzleFlashColor,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), this.flashMaterial);
    this.flash.visible = false;
    this.root.add(this.flash);
    this.kick = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.bob = { stepsPerSecond: 0, amount: 0 };
    this.current = null;
  }

  // One mesh per material: parts [geometry, x, y, z] merged into one geometry.
  mesh(parts, group, material = this.material) {
    const geometry = mergeGeometries(parts.map(([geo, x, y, z]) => geo.translate(x, y, z)));
    parts.forEach(([geo]) => geo.dispose());
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    return mesh;
  }

  // The bolt-action service rifle. Butt at z = 0.25, muzzle at z = -0.67.
  buildRifle() {
    const group = new THREE.Group();
    const butt = 0.25;
    const f = (forward) => butt - forward; // z of a point this far forward of the butt
    // Walnut stock in one piece: butt, comb, wrist, pistol grip, belly, long fore-end.
    this.mesh([
      [profile([[0, -0.1], [0, 0.022], [0.15, 0.012], [0.2, 0.004], [0.24, 0.006], [0.62, 0.004], [0.66, -0.006], [0.655, -0.03], [0.42, -0.036], [0.31, -0.042], [0.235, -0.042], [0.222, -0.088], [0.195, -0.09], [0.185, -0.05], [0.15, -0.055]], 0.04, WALNUT), 0, -0.02, butt],
    ], group, this.woodMaterial);
    this.mesh([
      [box(0.042, 0.122, 0.012, RUBBER), 0, -0.059, f(0.004)], // butt pad
      [rod(0.017, 0.2, BLUED, 12), 0, 0.006, f(0.33)], // receiver
      [rod(0.0095, 0.5, STEEL, 10, 0.0085), 0, 0.006, f(0.67)], // barrel, tapering to the muzzle
      [rod(0.012, 0.012, DARK_STEEL), 0, 0.004, f(0.58)], // barrel band
      [box(0.004, 0.022, 0.006, DARK_STEEL), 0, 0.024, f(0.9)], // front sight post
      [box(0.016, 0.006, 0.014, DARK_STEEL), 0, 0.016, f(0.9)], // its ramp
      [box(0.022, 0.012, 0.012, DARK_STEEL), 0, 0.028, f(0.42)], // rear sight
      [rod(0.006, 0.03, STEEL), 0.022, 0.012, f(0.27)], // bolt body (handle root)
      [shade(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6).rotateZ(-1.1), STEEL), 0.038, 0.002, f(0.27)], // bolt handle
      [ball(0.0075, STEEL), 0.055, -0.008, f(0.27)], // bolt knob
      [box(0.03, 0.006, 0.09, DARK_STEEL), 0, -0.062, f(0.33)], // floorplate
      [box(0.004, 0.026, 0.004, DARK_STEEL), 0, -0.05, f(0.255)], // trigger
      [box(0.012, 0.004, 0.06, DARK_STEEL), 0, -0.07, f(0.255)], // trigger guard (bottom)
      [box(0.012, 0.024, 0.004, DARK_STEEL), 0, -0.058, f(0.225)], // trigger guard (back)
      [box(0.012, 0.016, 0.004, DARK_STEEL), 0, -0.062, f(0.285)], // trigger guard (front)
      [box(0.006, 0.012, 0.012, DARK_STEEL), 0, -0.1, f(0.07)], // sling swivel (butt)
      [box(0.006, 0.012, 0.012, DARK_STEEL), 0, -0.064, f(0.55)], // sling swivel (fore-end)
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.006, f(0.93)) };
  }

  // The pump shotgun. Butt at z = 0.24, muzzle at z = -0.63.
  buildShotgun() {
    const group = new THREE.Group();
    const butt = 0.24;
    const f = (forward) => butt - forward;
    // Stock: a straight-ish butt into a rounded grip, ending at the receiver.
    this.mesh([
      [profile([[0, -0.11], [0, 0.026], [0.16, 0.012], [0.235, 0.006], [0.235, -0.04], [0.21, -0.05], [0.19, -0.088], [0.165, -0.09], [0.15, -0.055]], 0.044, DARK_WALNUT), 0, -0.022, butt],
    ], group, this.woodMaterial);
    this.mesh([
      [box(0.044, 0.135, 0.012, RUBBER), 0, -0.064, f(0.004)], // recoil pad
      // Receiver: a rounded block (an extruded profile in steel).
      [profile([[0, -0.035], [0, 0.02], [0.17, 0.02], [0.18, 0.012], [0.18, -0.035]], 0.05, BLUED, 0.008), 0, 0, f(0.235)],
      [rod(0.0155, 0.47, STEEL, 12), 0, 0.022, f(0.645)], // barrel
      [box(0.008, 0.005, 0.46, DARK_STEEL), 0, 0.04, f(0.645)], // vent rib
      [ball(0.004, 0xd0c8a0), 0, 0.045, f(0.87)], // bead sight
      [rod(0.0125, 0.39, BLUED, 10), 0, -0.012, f(0.6)], // magazine tube
      [rod(0.0135, 0.012, DARK_STEEL), 0, -0.012, f(0.795)], // tube cap
      [box(0.004, 0.026, 0.004, DARK_STEEL), 0, -0.05, f(0.27)], // trigger
      [box(0.012, 0.004, 0.06, DARK_STEEL), 0, -0.07, f(0.27)], // trigger guard
      [box(0.012, 0.02, 0.004, DARK_STEEL), 0, -0.06, f(0.24)],
      [box(0.012, 0.014, 0.004, DARK_STEEL), 0, -0.063, f(0.3)],
      [box(0.002, 0.024, 0.06, DARK_STEEL), 0.026, 0.004, f(0.33)], // ejection port
    ], group);
    // The pump: ribbed walnut round the tube; slides on each shot.
    const ribs = [];
    for (let k = 0; k < 7; k++) ribs.push([rod(0.022, 0.009, WALNUT, 12), 0, -0.012, -0.06 + k * 0.02]);
    const pump = this.mesh([[rod(0.02, 0.14, DARK_WALNUT, 12), 0, -0.012, 0], ...ribs], group, this.woodMaterial);
    pump.position.z = -0.3;
    return { group, muzzle: new THREE.Vector3(0, 0.022, f(0.88)), pump };
  }

  // Session 10b: the scoped hunting rifle: a Monte Carlo walnut stock with
  // a raised cheek piece, a heavy barrel and a scope on two rings. Butt at
  // z = 0.27, muzzle at z = -0.75.
  buildSniper() {
    const group = new THREE.Group();
    const butt = 0.27;
    const f = (forward) => butt - forward;
    this.mesh([
      [profile([[0, -0.105], [0, 0.03], [0.05, 0.036], [0.16, 0.034], [0.2, 0.008], [0.25, 0.006], [0.64, 0.004], [0.68, -0.008], [0.675, -0.034], [0.44, -0.04], [0.32, -0.046], [0.25, -0.046], [0.236, -0.092], [0.208, -0.094], [0.196, -0.052], [0.15, -0.058]], 0.042, DARK_WALNUT), 0, -0.02, butt],
    ], group, this.woodMaterial);
    const scopeY = 0.06;
    this.mesh([
      [box(0.044, 0.13, 0.014, RUBBER), 0, -0.058, f(0.005)], // recoil pad
      [rod(0.018, 0.22, BLUED, 12), 0, 0.006, f(0.36)], // receiver
      [rod(0.0125, 0.55, STEEL, 12, 0.0115), 0, 0.006, f(0.745)], // heavy barrel
      [rod(0.0135, 0.03, DARK_STEEL, 12), 0, 0.006, f(1.0)], // muzzle crown
      // The scope: tube, eyepiece and objective bells, turrets.
      [rod(0.0125, 0.2, DARK_STEEL, 14), 0, scopeY, f(0.36)],
      [rod(0.017, 0.06, DARK_STEEL, 14, 0.0125), 0, scopeY, f(0.235)], // eyepiece (wider toward you)
      [rod(0.0125, 0.07, DARK_STEEL, 14, 0.021), 0, scopeY, f(0.49)], // objective bell (wider at the front)
      [shade(new THREE.CylinderGeometry(0.008, 0.008, 0.016, 10), DARK_STEEL), 0, scopeY + 0.018, f(0.36)], // elevation turret
      [shade(new THREE.CylinderGeometry(0.008, 0.008, 0.016, 10).rotateZ(Math.PI / 2), DARK_STEEL), 0.018, scopeY, f(0.36)], // windage turret
      [box(0.03, 0.04, 0.014, BLUED), 0, 0.033, f(0.3)], // rear ring and base
      [box(0.03, 0.04, 0.014, BLUED), 0, 0.033, f(0.42)], // front ring and base
      [rod(0.006, 0.03, STEEL), 0.022, 0.012, f(0.28)], // bolt body
      [shade(new THREE.CylinderGeometry(0.004, 0.004, 0.045, 6).rotateZ(-1.2), STEEL), 0.04, 0.0, f(0.28)], // bolt handle (bent down under the scope)
      [ball(0.008, STEEL), 0.06, -0.011, f(0.28)], // bolt knob
      [box(0.03, 0.006, 0.08, DARK_STEEL), 0, -0.065, f(0.36)], // floorplate
      [box(0.004, 0.026, 0.004, DARK_STEEL), 0, -0.052, f(0.27)], // trigger
      [box(0.012, 0.004, 0.06, DARK_STEEL), 0, -0.072, f(0.27)], // trigger guard
      [box(0.012, 0.022, 0.004, DARK_STEEL), 0, -0.06, f(0.24)],
      [box(0.012, 0.016, 0.004, DARK_STEEL), 0, -0.064, f(0.3)],
      [box(0.006, 0.012, 0.012, DARK_STEEL), 0, -0.1, f(0.07)], // sling swivels
      [box(0.006, 0.012, 0.012, DARK_STEEL), 0, -0.066, f(0.58)],
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.006, f(1.02)) };
  }

  // ---- Session 10b: guns for Aaron to experiment with (simple models) ----

  // A service pistol: slide, frame, grip, trigger guard. Muzzle at z = -0.19.
  buildPistol() {
    const group = new THREE.Group();
    this.mesh([
      [box(0.03, 0.03, 0.19, BLUED), 0, 0.012, -0.095], // slide
      [box(0.006, 0.006, 0.012, DARK_STEEL), 0, 0.03, -0.18], // front sight
      [box(0.018, 0.008, 0.01, DARK_STEEL), 0, 0.03, -0.005], // rear sight
      [box(0.028, 0.018, 0.15, DARK_STEEL), 0, -0.01, -0.09], // frame
      [shade(new THREE.BoxGeometry(0.03, 0.1, 0.045).rotateX(0.25), RUBBER), 0, -0.06, 0.0], // grip
      [box(0.01, 0.004, 0.04, DARK_STEEL), 0, -0.032, -0.06], // trigger guard
      [box(0.004, 0.016, 0.004, DARK_STEEL), 0, -0.024, -0.05], // trigger
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.012, -0.2) };
  }

  // An MP5-style SMG: receiver, curved magazine, handguard, stock, drum sights.
  buildSmg() {
    const group = new THREE.Group();
    this.mesh([
      [rod(0.02, 0.3, DARK_STEEL, 10), 0, 0.01, -0.12], // receiver tube
      [box(0.034, 0.044, 0.12, 0x2a2c30), 0, -0.012, -0.32], // handguard
      [rod(0.008, 0.06, STEEL), 0, 0.01, -0.3], // barrel stub
      [shade(new THREE.BoxGeometry(0.02, 0.12, 0.03).rotateX(0.25), DARK_STEEL), 0, -0.07, -0.16], // curved magazine (leaning forward)
      [shade(new THREE.BoxGeometry(0.03, 0.09, 0.04).rotateX(0.3), RUBBER), 0, -0.06, 0.02], // pistol grip
      [box(0.01, 0.004, 0.05, DARK_STEEL), 0, -0.035, -0.04], // trigger guard
      [box(0.03, 0.03, 0.02, DARK_STEEL), 0, 0.04, 0.0], // rear drum sight
      [box(0.006, 0.03, 0.012, DARK_STEEL), 0, 0.035, -0.26], // front sight post
      [box(0.012, 0.012, 0.16, DARK_STEEL), 0, 0.0, 0.12], // stock arm
      [box(0.03, 0.07, 0.012, RUBBER), 0, -0.02, 0.2], // butt plate
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.01, -0.34) };
  }

  // The semi-auto hunting rifle: black synthetic stock, box magazine, a
  // squat heat scope. Butt at z = 0.25.
  buildThermalRifle() {
    const group = new THREE.Group();
    const butt = 0.25;
    const f = (forward) => butt - forward;
    const scopeY = 0.065;
    this.mesh([
      [profile([[0, -0.1], [0, 0.026], [0.16, 0.02], [0.2, 0.006], [0.6, 0.004], [0.64, -0.01], [0.62, -0.034], [0.42, -0.04], [0.235, -0.042], [0.222, -0.09], [0.195, -0.092], [0.185, -0.05], [0.15, -0.055]], 0.042, 0x26282a), 0, -0.02, butt], // synthetic stock
      [rod(0.018, 0.22, BLUED, 12), 0, 0.006, f(0.33)], // receiver
      [rod(0.011, 0.48, STEEL, 12, 0.01), 0, 0.006, f(0.68)], // barrel
      [box(0.026, 0.07, 0.06, DARK_STEEL), 0, -0.07, f(0.33)], // box magazine
      [box(0.05, 0.05, 0.17, 0x303436), 0, scopeY, f(0.36)], // heat scope body (boxy)
      [rod(0.022, 0.03, DARK_STEEL, 14), 0, scopeY, f(0.47)], // its lens housing
      [rod(0.016, 0.03, RUBBER, 12), 0, scopeY, f(0.26)], // eyecup
      [box(0.02, 0.02, 0.03, DARK_STEEL), 0.032, scopeY, f(0.36)], // battery cap
      [box(0.03, 0.03, 0.12, BLUED), 0, 0.035, f(0.36)], // mount
      [box(0.004, 0.026, 0.004, DARK_STEEL), 0, -0.052, f(0.255)], // trigger
      [box(0.012, 0.004, 0.06, DARK_STEEL), 0, -0.072, f(0.255)], // trigger guard
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.006, f(0.93)) };
  }

  // An AA-12-style auto shotgun: a long boxy receiver, a drum, a shrouded barrel.
  buildAutoShotgun() {
    const group = new THREE.Group();
    this.mesh([
      [box(0.06, 0.08, 0.5, 0x2a2c2e), 0, 0.0, -0.13], // receiver (boxy, full length)
      [box(0.04, 0.03, 0.4, DARK_STEEL), 0, 0.055, -0.12], // carry rail
      [rod(0.016, 0.2, STEEL, 10), 0, 0.01, -0.46], // barrel
      [rod(0.026, 0.16, DARK_STEEL, 10), 0, 0.01, -0.44], // perforated shroud (as a sleeve)
      [shade(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16).rotateZ(Math.PI / 2), 0x34383a), 0, -0.1, -0.18], // drum magazine
      [shade(new THREE.BoxGeometry(0.035, 0.1, 0.045).rotateX(0.3), RUBBER), 0, -0.08, 0.02], // pistol grip
      [box(0.012, 0.004, 0.06, DARK_STEEL), 0, -0.05, -0.03], // trigger guard
      [box(0.045, 0.1, 0.03, RUBBER), 0, -0.02, 0.15], // butt
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.01, -0.57) };
  }

  buildShovel() {
    const group = new THREE.Group();
    this.mesh([
      [rod(0.016, 0.72, 0x7a5a38, 8), 0, 0, -0.22], // handle (ash)
      [box(0.1, 0.022, 0.024, 0x4a3420), 0, 0, 0.16], // D-grip
      [box(0.022, 0.05, 0.02, 0x4a3420), -0.04, 0, 0.14],
      [box(0.022, 0.05, 0.02, 0x4a3420), 0.04, 0, 0.14],
    ], group, this.woodMaterial);
    this.mesh([
      [rod(0.02, 0.1, 0x5a6066, 8), 0, 0, -0.58], // the socket round the handle
      [shade(new THREE.BoxGeometry(0.17, 0.012, 0.22).rotateX(-0.1), 0x7a8288), 0, 0, -0.73], // blade (steel)
      [box(0.17, 0.02, 0.012, 0x6a7076), 0, 0.006, -0.625], // the step at the top of the blade
    ], group);
    return { group };
  }

  // M7: the remote detonator: a grey box, a stubby aerial and a red button.
  buildDetonator() {
    const group = new THREE.Group();
    this.mesh([
      [box(0.07, 0.04, 0.13, 0x50545a), 0.02, -0.02, -0.12], // body
      [box(0.012, 0.12, 0.012, 0x2a2c30), 0.045, 0.05, -0.17], // aerial
      [box(0.03, 0.015, 0.03, 0xc02018), 0.02, 0.006, -0.1], // the button
    ], group);
    return { group };
  }

  // Tint the colours by the light the gun would be in (see the header).
  updateLighting(dt, weapons) {
    const l = this.cfg.lighting;
    const tint = this.tint.setRGB(0, 0, 0);
    if (this.sky) {
      const { ambient, light } = this.sky;
      tint.r = ambient.color.r * ambient.intensity + light.color.r * light.intensity * l.sunFactor;
      tint.g = ambient.color.g * ambient.intensity + light.color.g * light.intensity * l.sunFactor;
      tint.b = ambient.color.b * ambient.intensity + light.color.b * light.intensity * l.sunFactor;
      tint.multiplyScalar(l.scale);
    }
    if (this.flashlight?.on) {
      tint.r += this.torchColor.r * l.torchFill;
      tint.g += this.torchColor.g * l.torchFill;
      tint.b += this.torchColor.b * l.torchFill;
    }
    if (weapons.weapon.kind !== 'melee' && weapons.shotTime < this.cfg.muzzleFlashSeconds * 2) tint.addScalar(l.flashBoost);
    this.material.color.lerp(tint, Math.min(1, l.response * dt));
    this.woodMaterial.color.copy(this.material.color);
  }

  // weapons: the Weapons system; player: for walk sway.
  update(dt, weapons, player) {
    const c = this.cfg;
    this.updateLighting(dt, weapons);
    const id = weapons.id;
    if (this.current !== id) {
      if (this.current) this.models[this.current].group.visible = false;
      this.models[id].group.visible = true;
      this.current = id;
    }
    const model = this.models[id];
    const g = model.group;
    // Session 10b: looking through a scope, the scope view replaces the gun.
    g.visible = weapons.scoped < c.scopeHideAt;
    const melee = weapons.weapon.kind === 'melee';
    const offset = c.offsets?.[id];
    const hip = melee ? c.shovelHip : offset?.hip ?? c.hip;
    const aim = offset?.aim ?? c.aim;
    const z = weapons.zoom;
    const base = {
      x: hip.x + (aim.x - hip.x) * z,
      y: hip.y + (aim.y - hip.y) * z,
      z: hip.z + (aim.z - hip.z) * z,
    };

    // Walk sway, paced like footsteps, damped while aiming.
    const pc = player.cfg;
    const bob = weaponBob(player.onGround ? player.speed : 0, pc.walkSpeed, pc.walkSpeed * pc.sprintMultiplier, c.bob, this.bob);
    this.bobAmount += (bob.amount - this.bobAmount) * Math.min(1, c.bob.response * dt);
    this.bobPhase = (this.bobPhase + bob.stepsPerSecond * dt * Math.PI * 2) % (Math.PI * 4);
    const sway = this.bobAmount * (1 - z * c.bob.aimDamping);
    const swayX = Math.sin(this.bobPhase * 0.5) * sway * c.bob.sideRatio;
    const swayY = (Math.cos(this.bobPhase) - 1) * 0.5 * sway; // one dip per step

    // Recoil kick: jumps on a shot, settles back.
    if (weapons.shotTime === 0) this.kick = 1;
    this.kick -= this.kick * Math.min(1, c.kickRecover * dt);

    const drop = (1 - weapons.switchProgress) * c.switchDrop;
    const s = weapons.state;
    const dip = s.reloading ? Math.sin(Math.min(1, s.reloadProgress) * Math.PI) * c.reloadDip : 0;
    const dipHold = s.reloading && s.cfg.reloadStyle === 'magazine' ? c.reloadDip * 0.6 : dip;

    g.position.set(base.x + swayX, base.y + swayY - drop, base.z + this.kick * c.kickBack);
    g.rotation.set(this.kick * c.kickRotate - dipHold, 0, 0);

    if (melee) this.updateSwing(g, weapons);
    if (model.pump) model.pump.position.z = -0.3 + Math.max(0, Math.sin(Math.min(1, weapons.shotTime / weapons.weapon.fireInterval) * Math.PI)) * 0.08;

    // Muzzle flash: a quick additive card at the barrel's end.
    const flashOn = !melee && weapons.shotTime < c.muzzleFlashSeconds;
    this.flash.visible = flashOn;
    if (flashOn) {
      this.flash.position.copy(model.muzzle).applyEuler(g.rotation).add(g.position);
      this.flash.rotation.z = weapons.shotTime * 40;
      const scale = 0.8 + Math.random() * 0.6; // cosmetic only
      this.flash.scale.setScalar(scale);
    }
  }

  // Swing from upper right to lower left over the first part of the swing.
  updateSwing(g, weapons) {
    const w = weapons.weapon;
    const t = Math.min(1, weapons.swingTime / (w.fireInterval * 0.6));
    if (t >= 1) {
      g.rotation.y = 0;
      g.rotation.z = 0;
      return;
    }
    const arc = this.cfg.swingDegrees * DEG_TO_RAD;
    const ease = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6; // fast out, slower return
    g.rotation.y = ease * arc * 0.5;
    g.rotation.z = ease * arc * 0.35;
    g.rotation.x += -ease * 0.6;
    g.position.x -= ease * 0.15;
  }

  dispose() {
    this.root.traverse((o) => o.geometry?.dispose());
    this.root.removeFromParent();
    this.material.dispose();
    this.woodMaterial.dispose();
    this.grain.dispose();
    this.flashMaterial.dispose();
  }
}
