// Session 24 (Graphics Engineer): Milo and the animals in his barn
// (render/miloModel.js, render/barnAnimals.js, on render/PosedFigure.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { PosedFigure } from '../src/render/PosedFigure.js';
import { miloSpec, miloPose, MILO_LOOKS, MILO_JOINTS, STRIPES, stripeAt, bloodAt } from '../src/render/miloModel.js';
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

  // Nov 26 (Aaron's concept art: "match this image as closely as possible"). Kept on his word: very big
  // shoes, very long arms, glowing eyes, the knife in his hand.
  it('the clown: the concept art, with his long arms, big shoes, glowing eyes and knife kept', () => {
    expect(mc.height).toBeLessThanOrEqual(1.8);
    const spec = miloSpec(mc, 'clown');
    const J = Object.fromEntries(spec.joints.map(([n, , x, y, z]) => [n, { x, y, z }]));
    expect(J.wristR.y).toBeLessThanOrEqual(J.kneeR.y); // wrists at or below the knees
    const shoe = spec.masses.find((q) => q[0] === 'ankleR' && q[8] === 'shoes');
    const manShoe = miloSpec(mc, 'man').masses.find((q) => q[0] === 'ankleR' && q[8] === 'shoes');
    expect(shoe[7]).toBeGreaterThan(manShoe[7] * 2); // the clown's shoes, far past a man's
    expect(spec.glow.eyes).toBeGreaterThan(0);
    expect(miloSpec(mc, 'man').glow).toBeUndefined();
    expect(spec.tubes.filter((t) => t[0] === 'wristR' && t[9] === 'steel').length).toBe(1); // the knife in his hand, no others on him
    // A one-piece suit, loose but not ballooning, gathered into rust cuffs at the wrists and ankles.
    const thigh = spec.limbs.find((l) => l[0] === 'hipR');
    const upper = spec.limbs.find((l) => l[0] === 'shoulderR');
    expect(thigh[2]).toBeGreaterThan(0.09);
    expect(thigh[2]).toBeLessThan(0.12);
    expect(upper[5]).toBeGreaterThan(0); // not skin tight
    expect(spec.tubes.filter((t) => t[9] === 'cuff').length).toBe(4);
    // Three big red buttons; a two-tier scalloped collar.
    expect(spec.masses.filter((q) => q[8] === 'button').length).toBe(3);
    expect(spec.masses.filter((q) => q[8] === 'collar').length).toBeGreaterThanOrEqual(30);
    // A red ball nose.
    expect(spec.masses.filter((q) => q[8] === 'nose').length).toBe(1);
    // The hair: puffs round the sides and the back of a bald crown.
    const puffs = spec.sheets.filter((sh) => sh.key === 'wig');
    expect(puffs.length).toBe(3);
    const head = spec.masses.find((q) => q[0] === 'head' && q[8] === 'face');
    const crown = head[3] + head[6];
    for (const sh of puffs) {
      const p = sh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        if (Math.abs(p.getX(i)) < 0.05) expect(p.getY(i)).toBeLessThan(crown - 0.02); // nothing over the top: he's bald
        expect(p.getZ(i)).toBeLessThan(head[4] + head[7] * 0.9); // behind his face
      }
    }
    // Every striped part is built with a column of vertices for each edge of each stripe (or they'd blur away).
    for (const [key, n] of [['suit', STRIPES.suit], ['armR', STRIPES.arm], ['legR', STRIPES.leg]]) {
      for (const l of spec.limbs.filter((x) => x[4] === key)) expect(l[8][0] % (n * 4), key).toBe(0);
    }
  });

  it('the clown\'s stripes and blood: narrow stripes, and blotches of blood on part of the suit', () => {
    let on = 0;
    const N = 400;
    for (let i = 0; i < N; i++) on += stripeAt((i / N) * Math.PI * 2, STRIPES.suit);
    expect(on / N).toBeGreaterThan(0.15);
    expect(on / N).toBeLessThan(0.35);
    let blood = 0;
    let n = 0;
    for (let x = -0.2; x <= 0.2; x += 0.01) for (let y = 0.2; y <= 1.4; y += 0.01) {
      n++;
      if (bloodAt({ x, y, z: 0.13 }, mc.clown) > 0.5) blood++;
    }
    expect(blood / n).toBeGreaterThan(0.05);
    expect(blood / n).toBeLessThan(0.5);
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
