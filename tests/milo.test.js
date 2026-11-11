// Session 24 (Graphics Engineer): Milo and the animals in his barn
// (render/miloModel.js, render/barnAnimals.js, on render/PosedFigure.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { PosedFigure } from '../src/render/PosedFigure.js';
import { miloSpec, miloPose, MILO_LOOKS, MILO_JOINTS, dotAt } from '../src/render/miloModel.js';
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
      const h = look === 'man' ? mc.manHeight : mc.height; // the man stands a head taller than the clown (Aaron)
      expect(box.max.y).toBeGreaterThan(h * 0.95);
      expect(box.max.y).toBeLessThan(h * 1.12);
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

  // Session 25 (Aaron, with the reference picture): shorter, big feet, long arms.
  // Session 26 (Aaron): the suit read skin tight and the wig wasn't clowny; a green-haired
  // creepy killer clown for inspiration, a little supernatural; the man's clothes too tight, his belt too loose.
  it('the clown: shorter, very long arms, very big shoes, baggy and ruffled', () => {
    expect(mc.height).toBeLessThanOrEqual(1.8);
    const spec = miloSpec(mc, 'clown');
    const J = Object.fromEntries(spec.joints.map(([n, , x, y, z]) => [n, { x, y, z }]));
    expect(J.wristR.y).toBeLessThanOrEqual(J.kneeR.y); // wrists at or below the knees
    const shoe = spec.masses.find((q) => q[0] === 'ankleR' && q[8] === 'shoes');
    const manShoe = miloSpec(mc, 'man').masses.find((q) => q[0] === 'ankleR' && q[8] === 'shoes');
    expect(shoe[7]).toBeGreaterThan(manShoe[7] * 2); // the clown's shoes, far past a man's
    // Not skin tight: the sleeves and the pantaloons puff out (bulge), the legs balloon.
    const thigh = spec.limbs.find((l) => l[0] === 'hipR');
    const upper = spec.limbs.find((l) => l[0] === 'shoulderR');
    const shin = spec.limbs.find((l) => l[0] === 'kneeR');
    expect(thigh[2]).toBeGreaterThan(0.12);
    expect(upper[2]).toBeGreaterThan(0.08);
    for (const l of [thigh, upper, shin]) expect(l[5]).toBeGreaterThanOrEqual(0.3);
    expect(shin[3]).toBeLessThan(shin[2] * 0.6); // gathered at the ankle
    // Ruffles: the ruff (two rows), the peplum, the cuffs; pom-poms.
    expect(spec.masses.filter((q) => q[8] === 'ruffle' || q[8] === 'ruffle2').length).toBeGreaterThan(60);
    expect(spec.masses.filter((q) => q[8] === 'pom').length).toBeGreaterThanOrEqual(5);
    // Clown hair: wild tufts bursting from the sides (tapered locks), round a bald crown, not a cap.
    expect(spec.tubes.filter((t) => t[10 - 1] === 'wig').length).toBeGreaterThanOrEqual(20);
    const top = spec.masses.filter((q) => q[8] === 'wig' && Math.abs(q[2]) < 0.03 && q[3] > 1.64);
    expect(top.length).toBe(0); // nothing over the crown: it's bald
    // The mouth itself a normal width (Session 25), the painted lines reaching up from it.
    const lips = spec.masses.filter((q) => q[8] === 'grin' && Math.abs(q[3] - 1.545) < 0.01);
    const xs = lips.map((q) => q[2]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.06);
    expect(spec.masses.filter((q) => q[8] === 'socket').length).toBe(2);
    // A little supernatural: his eyes glow (no light added: the figure's own shader).
    expect(spec.glow.eyes).toBeGreaterThan(0);
    expect(miloSpec(mc, 'man').glow).toBeUndefined();
    // The dots: sparse, red and blue.
    let dots = 0;
    let n = 0;
    const seen = new Set();
    for (let x = -0.3; x <= 0.3; x += 0.01) for (let y = 0.5; y <= 1.5; y += 0.01) {
      n++;
      const d = dotAt({ x, y, z: 0.14 }); // on a plane of cells (a surface passes through them)
      if (d) {
        dots++;
        seen.add(d);
      }
    }
    expect(dots / n).toBeLessThan(0.25);
    expect(dots / n).toBeGreaterThan(0.01);
    expect([...seen].sort()).toEqual([1, 2]);
  });

  it('the man: loose clothes, and a belt that fits his waist', () => {
    const spec = miloSpec(mc, 'man');
    const hips = spec.masses.find((q) => q[0] === 'hips' && q[8] === 'trousers');
    const belt = spec.masses.find((q) => q[0] === 'hips' && q[8] === 'leather');
    expect(spec.rings.some((r) => r[6] === 'leather')).toBe(false); // the old hoop is gone
    // The jeans' half-widths at the belt's height (an ellipsoid), and the belt just proud of them.
    const k = Math.sqrt(1 - ((belt[3] - hips[3]) / hips[6]) ** 2);
    expect(belt[5] - hips[5] * k).toBeGreaterThan(0);
    expect(belt[5] - hips[5] * k).toBeLessThan(0.02);
    expect(belt[7] - hips[7] * k).toBeGreaterThan(0);
    expect(belt[7] - hips[7] * k).toBeLessThan(0.02);
    const thigh = spec.limbs.find((l) => l[0] === 'hipR');
    const upper = spec.limbs.find((l) => l[0] === 'shoulderR');
    expect(thigh[2]).toBeGreaterThanOrEqual(0.095); // roomy jeans
    expect(upper[2]).toBeGreaterThanOrEqual(0.062); // a loose sleeve
  });

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

  // Session 25 (Aaron): the donkey's ears floated over its head.
  for (const kind of ['donkey', 'pony']) {
    it(`the ${kind}'s ears are rooted in its skull`, () => {
      const spec = ANIMALS[kind].spec(ac[kind]);
      const skull = spec.masses.filter((m) => m[0] === 'head' && m[8] === 'coat')[0];
      const [, , , sy, sz, rx, ry, rz] = skull;
      const ears = spec.masses.filter((m) => String(m[0]).startsWith('ear') && m[8] === 'coat');
      expect(ears.length).toBe(2);
      for (const [, , x, y, z, , ery] of ears) {
        const root = y - ery * 0.85; // a little up the ear: still inside the skull
        const inside = (x / rx) ** 2 + ((root - sy) / ry) ** 2 + ((z - sz) / rz) ** 2;
        expect(inside, kind).toBeLessThan(1);
      }
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
