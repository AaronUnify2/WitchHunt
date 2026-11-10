// Session 24 (Graphics Engineer): the Mothman's model
// (render/mothmanModel.js, render/MothmanRenderer.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { buildFigure } from '../src/render/figureKit.js';
import { lumaOf } from '../src/render/propKit.js';
import { mothmanSpec, MOTHMAN_JOINTS, forewingPoint, hindwingPoint } from '../src/render/mothmanModel.js';
import { MothmanRenderer, FLYING } from '../src/render/MothmanRenderer.js';

const mc = config.mothman;

describe('the Mothman: his model', () => {
  const { geometry, joints } = buildFigure(mothmanSpec(mc));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;

  it('stands on the ground at about his height, his wings spread wide and even', () => {
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(box.min.y).toBeLessThan(0.05);
    expect(joints.head.p.y).toBeGreaterThan(mc.height * 0.8);
    expect(joints.head.p.y).toBeLessThan(mc.height);
    expect(box.max.x - box.min.x).toBeGreaterThan(4.5); // the wingspan
    expect(box.max.x).toBeCloseTo(-box.min.x, 2);
  });

  it('is one skinned geometry with a glow only on his eyes', () => {
    for (const name of ['position', 'color', 'skinIndex', 'skinWeight', 'aGlow']) expect(geometry.getAttribute(name)).toBeTruthy();
    expect(geometry.getAttribute('uv')).toBeUndefined();
    const glow = geometry.getAttribute('aGlow');
    const pos = geometry.getAttribute('position');
    let lit = 0;
    for (let i = 0; i < glow.count; i++) {
      if (glow.getX(i) === 0) continue;
      lit++;
      expect(pos.getY(i)).toBeGreaterThan(2);
      expect(pos.getZ(i)).toBeGreaterThan(0.15);
    }
    expect(lit).toBeGreaterThan(0);
    expect(lit).toBeLessThan(glow.count * 0.05);
  });

  it('stays light enough for the tablet', () => {
    expect(geometry.index.count / 3).toBeLessThan(20000);
  });

  it('has a mirrored skeleton', () => {
    const names = MOTHMAN_JOINTS.map(([n]) => n);
    for (const n of names.filter((x) => x.includes('R'))) expect(names).toContain(n.replace('R', 'L'));
  });

  it('the wings end at their tips and are widest between', () => {
    const tip = forewingPoint(1, 1);
    const lead = forewingPoint(1, 0);
    expect(Math.hypot(tip[0] - lead[0], tip[1] - lead[1])).toBeLessThan(0.01);
    const mid = forewingPoint(0.4, 1);
    expect(forewingPoint(0.4, 0)[1] - mid[1]).toBeGreaterThan(0.8);
    expect(Math.hypot(...hindwingPoint(0.5, 0))).toBe(0);
    expect(hindwingPoint(1, 1)[1]).toBeLessThan(-1); // down toward his legs
  });

  it('keeps the glare rule: every colour dull, but his eyes', () => {
    for (const [name, hex] of Object.entries(mc.colours)) {
      if (name === 'eyes') continue;
      expect(lumaOf(hex), name).toBeLessThan(0.45);
    }
  });
});

describe('the Mothman: his renderer', () => {
  const pose = (state, extra = {}) => {
    const scene = new THREE.Scene();
    const r = new MothmanRenderer(mc);
    r.init(scene, 1);
    const m = { active: true, x: 10, y: 5, z: -3, facing: 0.7, state, timer: 0.1, ...extra };
    r.update([m], 0.1);
    return { r, m, mesh: r.meshes[0], scene };
  };

  it('is one mesh and adds no lights', () => {
    const { scene, r } = pose('stand');
    let lights = 0;
    let meshes = 0;
    scene.traverse((o) => {
      if (o.isLight) lights++;
      if (o.isMesh) meshes++;
    });
    expect(lights).toBe(0);
    expect(meshes).toBe(1);
    r.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('standing, he is placed by his feet; flying, by his middle', () => {
    const stood = pose('stand');
    expect(stood.mesh.position.y).toBeCloseTo(5);
    expect(stood.mesh.position.x).toBeCloseTo(10);
    for (const state of FLYING) {
      const flown = pose(state);
      const mid = new THREE.Vector3(0, mc.height * mc.middle, 0).applyQuaternion(flown.mesh.quaternion).add(flown.mesh.position);
      expect(mid.x).toBeCloseTo(10);
      expect(mid.y).toBeCloseTo(5);
      expect(mid.z).toBeCloseTo(-3);
    }
  });

  it('his eyes go out when he dies', () => {
    const live = pose('stand');
    expect(live.r.pool[0].uniforms.uGlow.value).toBeGreaterThan(0.5);
    expect(pose('corpse').r.pool[0].uniforms.uGlow.value).toBe(0);
    expect(pose('dying', { timer: mc.deathSeconds }).r.pool[0].uniforms.uGlow.value).toBe(0);
  });

  it('hides when he is not about', () => {
    const { r, m, mesh } = pose('fly');
    expect(mesh.visible).toBe(true);
    m.active = false;
    r.update([m], 0.1);
    expect(mesh.visible).toBe(false);
  });
});
