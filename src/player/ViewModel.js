// The weapon in the player's hands: simple placeholder shapes (boxes and
// cylinders) attached to the camera, with walk sway, recoil kick, a
// reload dip, a lower-and-raise on switching, the shovel's swing and a
// muzzle flash. Unlit colours with baked shading: the torch sits right
// beside the gun, so real lighting would blow it out. The art pass
// replaces the shapes with models.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const DEG_TO_RAD = Math.PI / 180;

// Box with shading baked into vertex colours (top light, bottom dark).
function shadedBox(w, h, d, hex, brightness) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  return shade(geometry, hex, brightness);
}

function shadedCylinder(r, length, hex, brightness) {
  const geometry = new THREE.CylinderGeometry(r, r, length, 8).rotateX(Math.PI / 2).toNonIndexed();
  return shade(geometry, hex, brightness);
}

function shade(geometry, hex, brightness) {
  const base = new THREE.Color(hex);
  const normals = geometry.attributes.normal;
  const colors = new Float32Array(normals.count * 3);
  for (let i = 0; i < normals.count; i++) {
    const ny = normals.getY(i);
    const nx = normals.getX(i);
    const light = brightness * (0.7 + 0.3 * ny - 0.12 * nx);
    colors[i * 3] = base.r * light;
    colors[i * 3 + 1] = base.g * light;
    colors[i * 3 + 2] = base.b * light;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export class ViewModel {
  constructor(viewModelConfig, weaponsConfig) {
    this.cfg = viewModelConfig;
    this.weaponsCfg = weaponsConfig;
  }

  init(camera) {
    const b = this.cfg.brightness;
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    this.root = new THREE.Group();
    camera.add(this.root);
    this.models = {
      rifle: this.buildRifle(b),
      shotgun: this.buildShotgun(b),
      shovel: this.buildShovel(b),
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
    this.current = null;
  }

  // One mesh per weapon (one draw call): parts are merged into a single geometry.
  mesh(parts, group) {
    const geometry = mergeGeometries(parts.map(([geo, x, y, z]) => geo.translate(x, y, z)));
    parts.forEach(([geo]) => geo.dispose());
    const mesh = new THREE.Mesh(geometry, this.material);
    group.add(mesh);
    return mesh;
  }

  buildRifle(b) {
    const group = new THREE.Group();
    this.mesh([
      [shadedBox(0.045, 0.07, 0.24, 0x4a3020, b), 0, -0.02, 0.12], // stock
      [shadedBox(0.05, 0.06, 0.2, 0x2a2c30, b), 0, 0, -0.09], // receiver
      [shadedBox(0.04, 0.045, 0.3, 0x4a3020, b), 0, -0.015, -0.3], // fore-end
      [shadedCylinder(0.011, 0.5, 0x1e2024, b), 0, 0.02, -0.4], // barrel
      [shadedBox(0.008, 0.03, 0.01, 0x1e2024, b), 0, 0.045, -0.62], // front sight
      [shadedBox(0.01, 0.012, 0.03, 0x1e2024, b), 0.035, 0.015, -0.07], // bolt handle
    ], group);
    return { group, muzzle: new THREE.Vector3(0, 0.02, -0.67) };
  }

  buildShotgun(b) {
    const group = new THREE.Group();
    this.mesh([
      [shadedBox(0.05, 0.075, 0.24, 0x3a2418, b), 0, -0.025, 0.12], // stock
      [shadedBox(0.055, 0.065, 0.18, 0x2a2a2e, b), 0, 0, -0.08], // receiver
      [shadedCylinder(0.016, 0.48, 0x1a1a1e, b), 0, 0.022, -0.38], // barrel
      [shadedCylinder(0.013, 0.4, 0x1a1a1e, b), 0, -0.012, -0.34], // magazine tube
    ], group);
    const pump = this.mesh([[shadedBox(0.05, 0.045, 0.13, 0x4a3020, b), 0, -0.014, 0]], group); // slides on each shot
    pump.position.z = -0.3;
    return { group, muzzle: new THREE.Vector3(0, 0.022, -0.63), pump };
  }

  buildShovel(b) {
    const group = new THREE.Group();
    this.mesh([
      [shadedCylinder(0.016, 0.75, 0x5a4028, b), 0, 0, -0.2], // handle
      [shadedBox(0.1, 0.02, 0.02, 0x3a2a1a, b), 0, 0, 0.17], // D-grip
      [shadedBox(0.17, 0.012, 0.22, 0x50565a, b).rotateX(-0.1), 0, 0, -0.66], // blade
    ], group);
    return { group };
  }

  // weapons: the Weapons system; player: for walk sway.
  update(dt, weapons, player) {
    const c = this.cfg;
    const id = weapons.id;
    if (this.current !== id) {
      if (this.current) this.models[this.current].group.visible = false;
      this.models[id].group.visible = true;
      this.current = id;
    }
    const model = this.models[id];
    const g = model.group;
    const melee = weapons.weapon.kind === 'melee';
    const hip = melee ? c.shovelHip : c.hip;
    const z = weapons.zoom;
    const base = {
      x: hip.x + (c.aim.x - hip.x) * z,
      y: hip.y + (c.aim.y - hip.y) * z,
      z: hip.z + (c.aim.z - hip.z) * z,
    };

    // Walk sway, damped while aiming.
    const sway = (player.bobOffset / Math.max(player.cfg.headBob.amplitude, 1e-6)) * c.bobAmount * (1 - z * 0.8);
    const swayX = Math.cos(player.bobPhase * 0.5) * sway;

    // Recoil kick: jumps on a shot, settles back.
    if (weapons.shotTime === 0) this.kick = 1;
    this.kick -= this.kick * Math.min(1, c.kickRecover * dt);

    const drop = (1 - weapons.switchProgress) * c.switchDrop;
    const s = weapons.state;
    const dip = s.reloading ? Math.sin(Math.min(1, s.reloadProgress) * Math.PI) * c.reloadDip : 0;
    const dipHold = s.reloading && s.cfg.reloadStyle === 'magazine' ? c.reloadDip * 0.6 : dip;

    g.position.set(base.x + swayX, base.y + Math.abs(sway) - drop, base.z + this.kick * c.kickBack);
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
    this.flashMaterial.dispose();
  }
}
