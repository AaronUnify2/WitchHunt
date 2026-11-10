// Session 24 (Graphics Engineer): Milo and the animals in his barn
// (render/miloModel.js, render/barnAnimals.js, on render/PosedFigure.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { PosedFigure } from '../src/render/PosedFigure.js';
import { miloSpec, miloPose, MILO_LOOKS, MILO_JOINTS } from '../src/render/miloModel.js';
import { ANIMALS, BARN_ANIMALS } from '../src/render/barnAnimals.js';

const mc = config.milo;
const ac = config.barnAnimals;
const MILO_STATES = ['idle', 'dance', 'bow', 'beckon', 'throw', 'push', 'indignant', 'stand', 'offer', 'walk'];

function build(spec, pose) {
  const scene = new THREE.Scene();
  const f = new PosedFigure({ spec, pose });
  f.init(scene);
  f.geometry.computeBoundingBox();
  return { f, scene, box: f.geometry.boundingBox };
}

describe('Milo', () => {
  it('has both looks: the clown and the man', () => {
    expect(MILO_LOOKS).toEqual(['clown', 'man']);
    for (const look of MILO_LOOKS) expect(mc.looks[look]).toBeTruthy();
  });

  for (const look of MILO_LOOKS) {
    it(`the ${look}: tall, long armed, one mesh, every pose`, () => {
      const { f, scene, box } = build(miloSpec(mc, look), miloPose);
      expect(box.max.y).toBeGreaterThan(mc.height * 0.95);
      expect(box.max.y).toBeLessThan(mc.height * 1.12);
      expect(f.joints.wristR.p.y).toBeLessThan(f.joints.hipR.p.y * 0.85); // well below his hips
      expect(scene.children.length).toBe(1);
      expect(f.geometry.index.count / 3).toBeLessThan(30000); // the clown's the heaviest (the wig, the ruff, the knives)
      for (const state of MILO_STATES) {
        for (let i = 0; i < 15; i++) f.update({ active: true, x: 0, y: 0, z: 0, state, timer: i * 0.1, walked: i * 0.2, look: 0.4 }, 0.1);
        for (const v of f.current) expect(Number.isFinite(v), state).toBe(true);
      }
      f.dispose();
      expect(scene.children.length).toBe(0);
    });
  }

  it('throws: the knife hand goes back, then forward', () => {
    const { f } = build(miloSpec(mc, 'clown'), miloPose);
    const at = (timer) => {
      f.update({ active: true, x: 0, y: 0, z: 0, state: 'throw', timer }, 0, true);
      return f.bones.shoulderR.rotation.x;
    };
    const wound = at(0.5);
    expect(wound).toBeLessThan(-2); // up and back past his ear
    expect(at(0.9)).toBeGreaterThan(wound + 0.5);
  });

  it('has a mirrored skeleton, and keeps the glare rule in every colour', () => {
    const names = MILO_JOINTS.map(([n]) => n);
    for (const n of names.filter((x) => x.endsWith('R'))) expect(names).toContain(`${n.slice(0, -1)}L`);
    for (const look of MILO_LOOKS) for (const [name, hex] of Object.entries(mc.looks[look])) expect(lumaOf(hex), `${look} ${name}`).toBeLessThan(0.45);
  });
});

describe("the animals in Milo's barn", () => {
  it('are the story\'s four', () => {
    expect(BARN_ANIMALS).toEqual(['donkey', 'pony', 'turkey', 'python']);
  });

  for (const kind of BARN_ANIMALS) {
    it(`the ${kind}: stands on the ground at its size, one mesh, every pose`, () => {
      const a = ANIMALS[kind];
      const { f, scene, box } = build(a.spec(ac[kind]), a.pose);
      expect(Math.abs(box.min.y)).toBeLessThan(0.08);
      expect(box.max.y).toBeGreaterThan(a.height * 0.7);
      expect(box.max.y).toBeLessThan(a.height * 1.35);
      expect(scene.children.length).toBe(1);
      expect(f.geometry.index.count / 3).toBeLessThan(25000);
      for (const { id } of a.states) {
        for (let i = 0; i < 15; i++) f.update({ active: true, x: 0, y: 0, z: 0, state: id, timer: i * 0.1, walked: i * 0.2, look: -0.6 }, 0.1);
        for (const v of f.current) expect(Number.isFinite(v), id).toBe(true);
      }
      for (const [name, hex] of Object.entries(ac[kind].colours)) expect(lumaOf(hex), name).toBeLessThan(0.45);
      f.dispose();
    });
  }

  it('the donkey stares: its head follows you and nothing else moves', () => {
    const a = ANIMALS.donkey;
    const { f } = build(a.spec(ac.donkey), a.pose);
    const pose = (look, t) => {
      f.time = t;
      f.update({ active: true, x: 0, y: 0, z: 0, state: 'stare', look }, 0, true);
      return Float32Array.from(f.current);
    };
    const left = pose(0.9, 0);
    const right = pose(-0.9, 0);
    const neck = f.B.neck * 3 + 1;
    expect(left[neck]).toBeGreaterThan(0.3);
    expect(right[neck]).toBeLessThan(-0.3);
    // A minute later, looking the same way: the legs, the body and the head haven't moved.
    const later = pose(0.9, 60);
    for (const bone of ['body', 'neck', 'head', 'legFR', 'legFL', 'legBR', 'legBL', 'tail']) {
      for (let k = 0; k < 3; k++) expect(later[f.B[bone] * 3 + k]).toBeCloseTo(left[f.B[bone] * 3 + k], 5);
    }
  });
});
