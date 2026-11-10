// Session 24 (Graphics Engineer): giant moths (render/mothModel.js,
// render/MothRenderer.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { buildMothGeometry } from '../src/render/mothModel.js';
import { MothRenderer } from '../src/render/MothRenderer.js';

const mc = config.moths.giant;

describe('giant moths: the model', () => {
  const g = buildMothGeometry(mc);
  g.computeBoundingBox();
  const b = g.boundingBox;

  it('is dog sized, and even side to side', () => {
    expect(b.max.z - b.min.z).toBeGreaterThan(0.6);
    expect(b.max.z - b.min.z).toBeLessThan(1.3);
    expect(b.max.x - b.min.x).toBeGreaterThan(1.3);
    expect(b.max.x - b.min.x).toBeLessThan(2.2);
    expect(b.max.x).toBeCloseTo(-b.min.x, 2);
  });

  it('is cheap enough for a swarm', () => {
    expect(g.getAttribute('position').count / 3).toBeLessThan(2000);
  });

  it('marks its wings for the shader, a side each, and only its eyes glow', () => {
    const wing = g.getAttribute('aWing');
    const glow = g.getAttribute('aGlow');
    const pos = g.getAttribute('position');
    const sides = { '-1': 0, 0: 0, 1: 0 };
    for (let i = 0; i < wing.count; i++) {
      sides[wing.getX(i)]++;
      if (wing.getX(i) !== 0) expect(Math.sign(pos.getX(i))).toBe(wing.getX(i));
      if (glow.getX(i) > 0) expect(pos.getZ(i)).toBeGreaterThan(0.25);
    }
    expect(sides[-1]).toBe(sides[1]);
    expect(sides[0]).toBeGreaterThan(0);
  });

  it('every wing face has its normal on the side it shows', () => {
    const pos = g.getAttribute('position');
    const nor = g.getAttribute('normal');
    const wing = g.getAttribute('aWing');
    const a = new THREE.Vector3();
    const e1 = new THREE.Vector3();
    const e2 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      if (wing.getX(i) === 0) continue;
      a.fromBufferAttribute(pos, i);
      e1.fromBufferAttribute(pos, i + 1).sub(a);
      e2.fromBufferAttribute(pos, i + 2).sub(a);
      const faceY = e1.cross(e2).y;
      if (Math.abs(faceY) < 1e-9) continue;
      expect(Math.sign(faceY)).toBe(Math.sign(nor.getY(i)));
    }
  });

  it('keeps the glare rule: every colour dull, but its eyes', () => {
    for (const [name, hex] of Object.entries(mc.colours)) if (name !== 'eyes') expect(lumaOf(hex), name).toBeLessThan(0.45);
  });
});

describe('giant moths: the renderer', () => {
  it('draws the whole swarm as one mesh, only the live ones', () => {
    const scene = new THREE.Scene();
    const r = new MothRenderer(mc);
    r.init(scene, 8);
    const moths = Array.from({ length: 12 }, (_, i) => ({ active: i % 3 !== 0, x: i, y: 2, z: 0, facing: 0, state: 'fly', seed: i }));
    r.update(moths, 0.1);
    let meshes = 0;
    let lights = 0;
    scene.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(1);
    expect(lights).toBe(0);
    expect(r.mesh.count).toBe(8); // the pool's the limit
    r.update(moths.slice(0, 4), 0.1);
    expect(r.mesh.count).toBe(2);
    r.update([], 0.1);
    expect(r.mesh.visible).toBe(false);
    r.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('folds its wings to rest, and its eyes go out when it dies', () => {
    const r = new MothRenderer(mc);
    r.init(new THREE.Scene(), 2);
    const m = { active: true, x: 0, y: 0, z: 0, state: 'rest' };
    r.update([m], 0.1);
    expect(r.beat.array[1]).toBe(1);
    expect(r.beat.array[2]).toBe(1);
    m.state = 'fly';
    for (let i = 0; i < 60; i++) r.update([m], 0.1);
    expect(r.beat.array[1]).toBeLessThan(0.05);
    m.state = 'corpse';
    r.update([m], 0.1);
    expect(r.beat.array[2]).toBe(0);
  });
});
