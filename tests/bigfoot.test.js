// Session 24 (Graphics Engineer): Bigfoot and his cocoon
// (render/bigfootModel.js on render/PosedFigure.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { PosedFigure } from '../src/render/PosedFigure.js';
import { bigfootSpec, bigfootPose, buildCocoon, BIGFOOT_JOINTS } from '../src/render/bigfootModel.js';

const bc = config.bigfoot;
const STATES = ['stand', 'bound', 'slump', 'kneel', 'walk', 'give', 'thanks', 'sit'];

describe('Bigfoot', () => {
  const scene = new THREE.Scene();
  const figure = new PosedFigure({ spec: bigfootSpec(bc), pose: bigfootPose, albedo: bc.albedo, poseRate: bc.poseRate });
  figure.init(scene);
  figure.geometry.computeBoundingBox();
  const box = figure.geometry.boundingBox;

  it('stands about his height, feet on the ground, arms to his knees', () => {
    expect(box.max.y).toBeGreaterThan(bc.height * 0.95);
    expect(box.max.y).toBeLessThan(bc.height * 1.08);
    expect(Math.abs(box.min.y)).toBeLessThan(0.06);
    expect(figure.joints.wristR.p.y).toBeLessThan(figure.joints.kneeR.p.y * 1.6);
  });

  it('is one mesh, no lights, light enough for the tablet', () => {
    let meshes = 0;
    let lights = 0;
    scene.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(1);
    expect(lights).toBe(0);
    expect(figure.geometry.index.count / 3).toBeLessThan(40000);
  });

  it('has a mirrored skeleton', () => {
    const names = BIGFOOT_JOINTS.map(([n]) => n);
    for (const n of names.filter((x) => x.endsWith('R'))) expect(names).toContain(`${n.slice(0, -1)}L`);
  });

  it('takes every pose without a bad number, and turns his head to look', () => {
    for (const state of STATES) {
      for (let i = 0; i < 20; i++) figure.update({ active: true, x: 1, y: 2, z: 3, facing: 0.4, state, timer: i * 0.1, walked: i * 0.2, look: 0.5 }, 0.1);
      for (const v of figure.current) expect(Number.isFinite(v), state).toBe(true);
      expect(figure.mesh.visible).toBe(true);
    }
    figure.update({ active: true, x: 0, y: 0, z: 0, state: 'stand', look: 0.8 }, 0, true);
    const left = figure.bones.neck.rotation.y;
    figure.update({ active: true, x: 0, y: 0, z: 0, state: 'stand', look: -0.8 }, 0, true);
    expect(left).toBeGreaterThan(figure.bones.neck.rotation.y);
    figure.update({ active: false }, 0.1);
    expect(figure.mesh.visible).toBe(false);
  });

  it('keeps the glare rule in every colour', () => {
    for (const [name, hex] of Object.entries(bc.colours)) expect(lumaOf(hex), name).toBeLessThan(0.45);
    for (const [name, hex] of Object.entries(bc.cocoon.colours)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });
});

describe("Bigfoot's cocoon", () => {
  it('is big enough to hold him, sealed or cut, each one mesh', () => {
    for (const open of [0, 1]) {
      const c = buildCocoon(bc.cocoon, open);
      const g = c.mesh.geometry;
      g.computeBoundingBox();
      expect(g.boundingBox.max.y).toBeGreaterThan(bc.height);
      expect(c.group.children.length).toBe(1);
      expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count);
      c.dispose();
    }
  });

  it('cut, it is open across the front', () => {
    const frontMost = (open) => {
      const c = buildCocoon(bc.cocoon, open);
      const pos = c.mesh.geometry.getAttribute('position');
      let n = 0;
      // Shell or strand points right at the front, at chest height.
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i)) < 0.4 && pos.getZ(i) > 0.4 && pos.getY(i) > 1 && pos.getY(i) < 2) n++;
      c.dispose();
      return n;
    };
    expect(frontMost(0)).toBeGreaterThan(0); // the lacing
    expect(frontMost(1)).toBe(0);
  });
});
