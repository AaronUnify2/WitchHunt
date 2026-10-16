// Mutant zombies (DESIGN.md "Mutants (3D)"): a placeholder giant made of
// boxes (Aaron agreed; the real model is the art pass). Hunched, with a
// hump, a small head sunk between the shoulders and long arms, one of
// them swollen. One instanced mesh for every mutant (at most four): one
// draw call plus the torch shadow. Rigid, posed per frame: it sways as it
// walks, rears back and lunges to swipe, reels when staggered, topples
// sideways when killed, and sinks like a corpse. Its weak spot, a throbbing
// red blob on its back (8x damage), is a second instanced mesh sharing
// each mutant's pose: unlit, so it reads in the dark (and catches the bloom).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Boxes: [width, height, depth, x, y (centre), z, colour key, tilt about x].
// Model faces +z, feet at y = 0, about 2.5 m tall.
const PARTS = [
  [0.34, 1.0, 0.38, -0.3, 0.5, 0, 'cloth', 0], // legs
  [0.38, 1.0, 0.42, 0.3, 0.5, 0, 'cloth', 0],
  [0.95, 0.42, 0.6, 0, 1.08, 0.02, 'cloth', 0], // hips, rags
  [1.15, 0.85, 0.78, 0, 1.62, 0.12, 'skin', 0.32], // chest, hunched forward
  [0.86, 0.5, 0.56, 0, 2.02, -0.16, 'skinDark', 0.2], // the hump
  [0.42, 0.44, 0.42, 0, 2.24, 0.12, 'skin', 0], // head
  [0.3, 1.32, 0.32, -0.74, 1.36, 0.2, 'skinDark', 0.18], // left arm
  [0.42, 1.5, 0.44, 0.8, 1.26, 0.22, 'skin', 0.22], // right arm, swollen
  [0.08, 0.05, 0.03, -0.1, 2.28, 0.34, 'eyes', 0], // eyes
  [0.08, 0.05, 0.03, 0.1, 2.28, 0.34, 'eyes', 0],
];
const EYES = 0xc8c090;

export class MutantRenderer {
  constructor(mutantConfig, zombieConfig) {
    this.cfg = mutantConfig;
    this.zombieCfg = zombieConfig;
  }

  init(scene) {
    const look = this.cfg.look;
    const colours = { skin: look.skin, skinDark: look.skinDark, cloth: look.cloth, eyes: EYES };
    const parts = PARTS.map(([w, h, d, x, y, z, key, tilt]) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.rotateX(tilt);
      g.translate(x, y, z);
      const colour = new THREE.Color(colours[key]);
      const count = g.attributes.position.count;
      const rgb = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) colour.toArray(rgb, i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
      return g;
    });
    const geometry = mergeGeometries(parts);
    for (const p of parts) p.dispose();
    // Scale the model to the configured height.
    geometry.scale(1, this.cfg.height / 2.5, 1);
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.mesh = new THREE.InstancedMesh(geometry, this.material, this.cfg.poolSize);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.white = new THREE.Color(1, 1, 1);
    this.flashColour = new THREE.Color(...look.hitFlash);
    this.colour = new THREE.Color();
    for (let i = 0; i < this.cfg.poolSize; i++) this.mesh.setColorAt(i, this.white);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false; // instances move every frame
    this.mesh.count = 0;
    scene.add(this.mesh);

    // The weak spot, in the same model space (it rides each mutant's matrix).
    const w = this.cfg.weakSpot;
    const spotGeometry = new THREE.SphereGeometry(w.radius * 0.72, 12, 8);
    spotGeometry.scale(1, 1, 0.55);
    spotGeometry.translate(0, w.height, -w.back);
    this.spotColour = new THREE.Color(w.color);
    this.spotMaterial = new THREE.MeshBasicMaterial({ color: w.color });
    this.spots = new THREE.InstancedMesh(spotGeometry, this.spotMaterial, this.cfg.poolSize);
    this.spots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.spots.frustumCulled = false;
    this.spots.count = 0;
    scene.add(this.spots);
    this.time = 0;
    this.matrix = new THREE.Matrix4();
    this.pose = new THREE.Matrix4();
    this.quat = new THREE.Quaternion();
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.pos = new THREE.Vector3();
    this.scale = new THREE.Vector3(1, 1, 1);
  }

  // zombies: the whole pool; only active mutants are drawn.
  update(zombies, dt = 0) {
    const zc = this.zombieCfg;
    const w = this.cfg.weakSpot;
    this.time += dt;
    const throb = w.pulseMin + (1 - w.pulseMin) * (0.5 + 0.5 * Math.sin(this.time * w.pulseSpeed * Math.PI * 2));
    this.spotMaterial.color.copy(this.spotColour).multiplyScalar(throb);
    let n = 0;
    let spots = 0;
    for (const z of zombies) {
      if (!z.active || z.kind !== 'mutant' || z.tier === 'abstract' || n >= this.cfg.poolSize) continue; // M6: abstract ones have no mesh
      let lean = 0; // radians forward
      let roll = 0; // radians sideways (falling over)
      let bob = 0;
      const stride = z.walked * zc.walkFrameRate * Math.PI;
      switch (z.state) {
        case 'walk':
          bob = Math.abs(Math.sin(stride)) * (z.charging ? 0.14 : 0.07);
          roll = Math.sin(stride) * 0.07;
          if (z.charging) lean = this.cfg.charge.lean; // head down, charging
          break;
        case 'attack':
          lean = z.struck ? 0.5 : -0.22 * Math.min(1, z.timer / z.attackWindup);
          break;
        case 'stagger':
          lean = -0.28;
          break;
        case 'dying':
          roll = Math.min(1, z.timer / zc.deathSeconds) * Math.PI * 0.5;
          break;
        case 'corpse':
          roll = Math.PI * 0.5;
          break;
        default:
          break;
      }
      this.euler.set(lean, z.facing, roll);
      this.quat.setFromEuler(this.euler);
      // Rising, burrowing and corpses sink by up to the body's height (lying down, its width).
      const depth = z.state === 'corpse' || z.state === 'dying' ? 1.2 : z.height;
      this.pos.set(z.x, z.y + bob - z.sink * depth, z.z);
      this.mesh.setMatrixAt(n, this.matrix.compose(this.pos, this.quat, this.scale));
      // The spot goes dark once it's dead.
      if (z.state !== 'dying' && z.state !== 'corpse') this.spots.setMatrixAt(spots++, this.matrix);
      const f = z.flash > 0 ? z.flash / zc.hitFlashSeconds : 0;
      this.mesh.setColorAt(n, this.colour.copy(this.white).lerp(this.flashColour, f));
      n++;
    }
    this.mesh.count = n;
    this.spots.count = spots;
    if (n > 0) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
    if (spots > 0) this.spots.instanceMatrix.needsUpdate = true;
  }

  // Session 10b: through the heat scope it glows white-hot.
  // t: config.viewModel.thermal (the glow fades up close: Aaron).
  setThermal(on, t) {
    this.material.emissive.setScalar(on ? t.glow : 0);
    if (!this.thermalNear) {
      this.thermalNear = { value: new THREE.Vector3() };
      this.material.onBeforeCompile = (shader) => {
        shader.uniforms.uThermalNear = this.thermalNear;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uThermalNear;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(uThermalNear.x, 1.0, smoothstep(uThermalNear.y, uThermalNear.z, length(vViewPosition)));');
      };
      this.material.customProgramCacheKey = () => 'mutant-thermal';
      this.material.needsUpdate = true;
    }
    this.thermalNear.value.set(t.nearGlow, t.nearMetres, t.farMetres);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.removeFromParent();
    this.material.dispose();
    this.spots.geometry.dispose();
    this.spots.removeFromParent();
    this.spotMaterial.dispose();
  }
}
