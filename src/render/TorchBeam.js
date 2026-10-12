// The torch's beam made visible (Session 10, style pass 1): a faint cone
// of light in the air, from the torch out along its aim, strongest near
// the torch and in the mist (thickest on fog nights), the Alan Wake and
// Silent Hill look. Fake: an additive, open cone mesh following the
// SpotLight, drawn from both sides. One draw call, no light of its own.

import * as THREE from 'three';

const VERTEX = /* glsl */ `
  varying float vAlong; // 0 at the torch, 1 at the far end
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDist;
  void main() {
    vAlong = position.y;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = cameraPosition - world.xyz;
    vDist = length(vView);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAmount;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  varying float vDist;
  uniform vec2 uNear; // metres from the eye: nothing inside the first, full beyond the second
  void main() {
    // A volume of light: brightest looking through its middle, fading to
    // nothing at its outline (where the surface turns side-on), so the
    // cone's walls never show as hard edges.
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float along = smoothstep(0.0, 0.15, vAlong) * pow(1.0 - vAlong, 1.6);
    float near = smoothstep(uNear.x, uNear.y, vDist);
    float a = uAmount * along * near * pow(facing, 2.0);
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class TorchBeam {
  // cfg: config.fog.torchBeam.
  constructor(cfg) {
    this.cfg = cfg;
    this.enabled = true;
    this.quality = 0;
    this.up = new THREE.Vector3(0, 1, 0);
  }

  init(scene) {
    // Unit cone along +y: radius 0 at the torch end, 1 at the far end, length 1.
    const geometry = new THREE.CylinderGeometry(1, 0.02, 1, 20, 1, true).translate(0, 0.5, 0);
    this.uniforms = {
      uColor: { value: new THREE.Color() },
      uAmount: { value: 0 },
      uNear: { value: new THREE.Vector2(this.cfg.near[0], this.cfg.near[1]) },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
    scene.add(this.mesh);
  }

  setQuality(strength) {
    this.quality = strength;
  }

  // torch: { on, position, aim, color, cosOuter, strength }. amount: 0..1 (mist, night).
  update(torch, amount) {
    const strength = this.quality * amount * this.cfg.strength;
    const visible = this.enabled && torch.on && strength > 0.002;
    this.mesh.visible = visible;
    if (!visible) return;
    const c = this.cfg;
    const halfAngle = Math.acos(Math.max(-1, Math.min(1, torch.cosOuter))) * c.width;
    const radius = Math.tan(halfAngle) * c.length;
    this.mesh.position.copy(torch.position);
    this.mesh.quaternion.setFromUnitVectors(this.up, torch.aim);
    this.mesh.scale.set(radius, c.length, radius);
    this.uniforms.uColor.value.copy(torch.color);
    this.uniforms.uAmount.value = strength * torch.strength;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
