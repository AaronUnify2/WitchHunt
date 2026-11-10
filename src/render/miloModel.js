// Milo (Session 24; DESIGN.md "Milo's barn"): the knife thrower from
// Aaron's story The Lone Clown, alive in his barn and permanently in
// character. Tall and lanky with arms too long for him. Two looks:
//  - the clown: greasepaint (gone grey with wear), a painted grin far wider
//    than his mouth, black diamonds over his eyes, a red nose, a frizz of
//    green wig, a ruff, a striped shirt under braces, baggy patched
//    trousers, long shoes, gloves; a bandolier of throwing knives across
//    his chest and one in his hand;
//  - the man (the morning after): the same long frame in a flannel shirt
//    and jeans, face scrubbed clean, short brown hair, a tin mug in his hand.
// He never attacks Tom and can't be hurt.
//
// The figure kit's specs and his poses (for render/PosedFigure.js). Model
// space: faces +z, feet at y = 0, right hand on -x; built in the kit's
// 1.7 m scale and stretched to his height.

import { arm, legsWalk } from './PosedFigure.js';

const SIDES = [
  ['R', -1],
  ['L', 1],
];

// The human skeleton with his arms: the wrists hang near his knees.
function joints() {
  const j = [
    ['root', null, 0, 0, 0],
    ['hips', 'root', 0, 0.95, 0],
    ['spine', 'hips', 0, 1.12, 0],
    ['chest', 'spine', 0, 1.32, 0],
    ['neck', 'chest', 0, 1.46, 0],
    ['head', 'neck', 0, 1.53, 0.01],
  ];
  for (const [n, s] of SIDES) {
    j.push([`shoulder${n}`, 'chest', s * 0.19, 1.42, 0]);
    j.push([`elbow${n}`, `shoulder${n}`, s * 0.23, 1.08, 0]);
    j.push([`wrist${n}`, `elbow${n}`, s * 0.24, 0.74, 0.02]);
    j.push([`hip${n}`, 'hips', s * 0.1, 0.92, 0]);
    j.push([`knee${n}`, `hip${n}`, s * 0.1, 0.5, 0.01]);
    j.push([`ankle${n}`, `knee${n}`, s * 0.1, 0.08, -0.02]);
  }
  return j;
}

export const MILO_JOINTS = joints();
export const MILO_LOOKS = ['clown', 'man'];

// The body both looks share. keys: what each part is painted as.
function body(k) {
  const masses = [
    ['hips', null, 0, 0.95, 0, 0.15 * k.baggy, 0.12, 0.11 * k.baggy, 'trousers'],
    ['spine', 'chest', 0, 1.14, 0.005, 0.15, 0.13, 0.1, 'shirt'],
    ['chest', 'spine', 0, 1.31, 0.005, 0.175, 0.13, 0.11, 'shirt'],
    ['neck', 'chest', 0, 1.475, 0, 0.042, 0.05, 0.042, 'face'],
    ['chest', null, -0.08, 1.43, -0.012, 0.08, 0.034, 0.055, 'shirt', [0, 0, 0.42]],
    ['chest', null, 0.08, 1.43, -0.012, 0.08, 0.034, 0.055, 'shirt', [0, 0, -0.42]],
    // A long head: a lantern jaw.
    ['head', null, 0, 1.6, 0.012, 0.082, 0.128, 0.098, 'face'],
    ['head', null, 0, 1.59, 0.106, 0.014, 0.022, 0.018, k.nose],
  ];
  const limbs = [];
  for (const [n, s] of SIDES) {
    masses.push(['chest', `shoulder${n}`, s * 0.165, 1.405, 0, 0.062, 0.056, 0.062, 'shirt']);
    masses.push(['head', null, s * 0.086, 1.6, 0, 0.012, 0.028, 0.018, 'face']); // an ear
    masses.push(['head', null, s * 0.032, 1.62, 0.092, 0.012, 0.011, 0.006, 'eyes']);
    masses.push([`wrist${n}`, null, s * 0.24, 0.69, 0.03, 0.026, 0.05, 0.018, k.hand]);
    masses.push([`ankle${n}`, null, s * 0.1, 0.045, 0.05 + k.shoe * 0.5, 0.055, 0.045, 0.12 + k.shoe, 'shoes']);
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.05, 0.042, 'shirt', 0.1]);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.042, 0.032, k.forearm, 0.08]);
    limbs.push([`hip${n}`, `knee${n}`, 0.082 * k.baggy, 0.066 * k.baggy, 'trousers', 0.1]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.066 * k.baggy, 0.056 * k.baggy, 'trousers', 0.05]);
  }
  return { masses, limbs };
}

// m: config.milo. look: 'clown' or 'man'.
export function miloSpec(m, look = 'clown') {
  const clown = look === 'clown';
  const { masses, limbs } = body(clown ? { baggy: 1.3, nose: 'nose', hand: 'gloves', forearm: 'shirt', shoe: 0.07 } : { baggy: 1.05, nose: 'face', hand: 'face', forearm: 'face', shoe: 0 });
  const tubes = [];
  const rings = [];
  if (clown) {
    // The wig: a frizz of green, thin on top, wild at the sides.
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const side = Math.abs(Math.sin(a));
      masses.push(['head', null, Math.sin(a) * 0.1, 1.67 + side * 0.01 - Math.cos(a) * 0.01, -0.02 + Math.cos(a) * 0.075, 0.05 + side * 0.025, 0.05, 0.05, 'wig']);
    }
    for (const [, s] of SIDES) masses.push(['head', null, s * 0.115, 1.6, -0.02, 0.05, 0.065, 0.06, 'wig']);
    // The painted grin: far wider than a mouth, curling up to the cheekbones.
    for (let i = -4; i <= 4; i++) {
      const x = i * 0.017;
      masses.push(['head', null, x, 1.535 + Math.abs(i) ** 1.6 * 0.0042, 0.1 - Math.abs(i) * 0.0045, 0.012, 0.01 + (4 - Math.abs(i)) * 0.0015, 0.006, 'grin']);
    }
    // The ruff, and the braces.
    rings.push(['neck', 0, 1.455, 0, 0.085, 0.03, 'ruff', [Math.PI / 2, 0, 0]]);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      masses.push(['neck', 'chest', Math.sin(a) * 0.105, 1.45, Math.cos(a) * 0.1, 0.035, 0.022, 0.035, 'ruff']);
    }
    for (const [, s] of SIDES) {
      tubes.push(['chest', s * 0.09, 1.44, 0.095, s * 0.1, 1.05, 0.105, 0.012, 0.012, 'braces']);
      tubes.push(['chest', s * 0.09, 1.44, -0.095, s * 0.02, 1.05, -0.1, 0.012, 0.012, 'braces']);
    }
    // A bandolier of throwing knives, shoulder to hip, and one in his right hand.
    tubes.push(['chest', -0.15, 1.4, 0.1, 0.14, 1.04, 0.115, 0.022, 0.022, 'leather', 0.4]);
    for (let i = 0; i < 5; i++) {
      const t = 0.15 + i * 0.17;
      const x = -0.15 + 0.29 * t;
      const y = 1.4 - 0.36 * t;
      tubes.push(['chest', x, y + 0.035, 0.128, x - 0.012, y - 0.03, 0.13, 0.009, 0.008, 'leather']); // the handle
      tubes.push(['chest', x - 0.012, y - 0.03, 0.13, x - 0.03, y - 0.1, 0.128, 0.011, 0.002, 'steel', 0.25]); // the blade
    }
    tubes.push(['wristR', -0.24, 0.66, 0.045, -0.24, 0.6, 0.06, 0.01, 0.009, 'leather']);
    tubes.push(['wristR', -0.24, 0.6, 0.06, -0.24, 0.47, 0.085, 0.013, 0.002, 'steel', 0.25]);
  } else {
    // Short brown hair, a day's stubble, the flannel's collar, a belt.
    masses.push(['head', null, 0, 1.665, -0.01, 0.088, 0.075, 0.1, 'hair']);
    masses.push(['head', null, 0, 1.62, -0.07, 0.082, 0.09, 0.05, 'hair']);
    masses.push(['head', null, 0, 1.52, 0.06, 0.06, 0.05, 0.05, 'stubble']);
    rings.push(['neck', 0, 1.45, 0.005, 0.06, 0.016, 'shirt', [Math.PI / 2, 0, 0]]);
    rings.push(['hips', 0, 1.02, 0, 0.155, 0.014, 'leather', [Math.PI / 2, 0, 0]]);
    // The tin mug in his right hand: "Instant. Sorry."
    tubes.push(['wristR', -0.24, 0.6, 0.075, -0.24, 0.69, 0.075, 0.036, 0.038, 'tin']);
    masses.push(['wristR', null, -0.24, 0.683, 0.075, 0.032, 0.004, 0.032, 'coffee']);
    rings.push(['wristR', -0.24, 0.645, 0.118, 0.022, 0.006, 'tin', [0, Math.PI / 2, 0]]);
  }
  return {
    joints: MILO_JOINTS,
    masses,
    limbs,
    tubes,
    rings,
    height: m.height,
    width: m.width,
    head: 1.04,
    colours: m.looks[look],
    paint(key, q, out, colours) {
      if (clown) {
        if (key === 'shirt') {
          if (Math.sin(q.x * 48) > 0.1) out.copy(colours.stripe); // broad stripes
        } else if (key === 'trousers') {
          // Patches: squares of something else, sewn on.
          const px = Math.floor(q.x * 9 + 20);
          const py = Math.floor(q.y * 7);
          if ((px * 7 + py * 13) % 9 === 0) out.copy(colours.patch);
        } else if (key === 'face' && q.y > 1.5) {
          // Black diamonds over his eyes; the paint worn thin along the jaw.
          for (const s of [-1, 1]) if (q.z > 0.05 && Math.abs(q.x - s * 0.032) * 1.6 + Math.abs(q.y - 1.62) < 0.045) out.copy(colours.eyes);
          if (q.y < 1.53) out.lerp(colours.skin, 0.5);
        }
      } else if (key === 'shirt') {
        // Flannel: a check.
        const a = Math.sin(q.x * 70) > 0.2;
        const b = Math.sin(q.y * 70) > 0.2;
        if (a && b) out.copy(colours.check);
        else if (a || b) out.lerp(colours.check, 0.5);
      }
    },
  };
}

// ---- his poses ---------------------------------------------------------------------------------

// m.state, the clown's: 'idle' (bouncing on his toes), 'dance', 'bow',
// 'beckon', 'throw' (timer: the wind-up and the knife away), 'push' (the
// car gates: one hand), 'indignant' ("I was in character!"). The man's:
// 'stand', 'offer' (the mug held out). 'walk' for either.
export function miloPose(h, m, t) {
  const look = Math.max(-1, Math.min(1, m.look ?? 0));
  switch (m.state) {
    case 'dance': {
      // Chaos: nothing in time with anything else.
      const a = Math.sin(t * 7.1);
      const b = Math.sin(t * 5.3 + 1);
      const c = Math.sin(t * 9.7 + 2);
      h.set('hips', 0, b * 0.3, a * 0.18);
      h.set('spine', 0.1 * c, -b * 0.25, -a * 0.2);
      h.set('chest', 0.1, 0, a * 0.12);
      h.set('neck', 0, look * 0.5, -a * 0.25);
      h.set('head', -0.1, 0, c * 0.3);
      arm(h, 'R', 1.4 + a * 1.1, 0.6 + c * 0.5, 0.9 + b * 0.7);
      arm(h, 'L', 1.1 - c * 1.2, 0.8 + a * 0.5, 0.9 - a * 0.7);
      h.set('hipR', -0.5 - Math.max(0, a) * 0.9, 0, -0.15);
      h.set('kneeR', 0.5 + Math.max(0, a) * 1.3);
      h.set('hipL', -0.2 - Math.max(0, -a) * 0.9, 0, 0.15);
      h.set('kneeL', 0.3 + Math.max(0, -a) * 1.3);
      h.rise((Math.abs(b) * 0.1 - 0.06) * h.k);
      break;
    }
    case 'bow': {
      // A deep, slow bow from the hips, one arm swept out wide, a foot drawn back.
      const k = 0.5 - 0.5 * Math.cos(Math.min(1, (m.timer ?? 0) / 0.9) * Math.PI);
      h.set('hips', 0.5 * k);
      h.set('spine', 0.5 * k);
      h.set('chest', 0.3 * k);
      h.set('neck', -0.5 * k, look * 0.4);
      arm(h, 'R', 0.2, 1.3 * k, 0.15);
      arm(h, 'L', 0.9 * k, -0.4 * k, 1.9 * k); // across his middle
      h.set('hipL', 0.35 * k);
      h.set('kneeL', 0.3 * k);
      h.set('hipR', -0.5 * k);
      h.set('kneeR', 0.25 * k);
      break;
    }
    case 'beckon': {
      // Leaning in, one long arm out, the hand curling you closer.
      const curl = Math.sin(t * 5);
      h.set('spine', 0.18, 0.15);
      h.set('chest', 0.1, 0.15);
      h.set('neck', 0, look * 0.5, 0.25);
      h.set('head', -0.1, 0, 0.15 + Math.sin(t * 1.3) * 0.1);
      arm(h, 'L', 1.35, 0.25, 0.5 + Math.max(0, curl) * 0.9);
      h.set('wristL', -Math.max(0, curl) * 0.9, 0, 0);
      arm(h, 'R', -0.2, 0.25, 0.4);
      h.set('kneeR', 0.2);
      h.set('hipR', -0.1);
      h.rise(Math.abs(Math.sin(t * 2.5)) * 0.02 * h.k);
      break;
    }
    case 'throw': {
      // The wind-up (the knife back past his ear), the throw, the follow-through.
      const T = m.timer ?? 0;
      const wind = Math.min(1, T / 0.55);
      const snap = Math.max(0, Math.min(1, (T - 0.55) / 0.12));
      const back = wind * (1 - snap);
      h.set('hips', 0, 0.35 * back - 0.3 * snap);
      h.set('spine', -0.12 * back + 0.3 * snap, 0.25 * back - 0.3 * snap);
      h.set('chest', -0.1 * back + 0.2 * snap, 0.3 * back - 0.4 * snap);
      h.set('neck', 0, look * 0.3 - 0.4 * back + 0.5 * snap);
      arm(h, 'R', 2.6 * back + 1.5 * snap, 0.35 * back, 1.9 * back + 0.1 * snap);
      h.set('wristR', 0.6 * back - 0.8 * snap, 0, 0);
      arm(h, 'L', 1.2 * back + 0.2 * snap, 0.3, 0.3); // the other hand points at the target
      h.set('hipL', -0.45 * back - 0.7 * snap);
      h.set('kneeL', 0.2 + 0.6 * snap);
      h.set('hipR', 0.3 * back + 0.4 * snap);
      h.set('kneeR', 0.3 * back + 0.3 * snap);
      h.rise(-0.06 * snap * h.k);
      break;
    }
    case 'push': {
      // One hand flat against the car, shoving it aside without looking; the other on his hip. Grinning at you.
      const shove = 0.5 + 0.5 * Math.sin(t * 1.4);
      h.set('spine', 0.05, 0, 0.12);
      h.set('chest', 0, 0, 0.1);
      h.set('neck', 0, look * 0.6, -0.2);
      h.set('head', -0.05, 0, Math.sin(t * 2.2) * 0.12);
      arm(h, 'L', 0.1, 1.45, 0.9 - shove * 0.8);
      h.set('wristL', 0, 0, 1.2);
      arm(h, 'R', -0.3, 0.75, 1.9);
      h.set('hipR', -0.05, 0, -0.2);
      h.set('hipL', -0.05, 0, 0.12);
      break;
    }
    case 'indignant':
      // Fists on his hips, leaning right at you, the head wagging: "I was in character!"
      h.set('spine', 0.25);
      h.set('chest', 0.2);
      h.set('neck', -0.3, look * 0.4 + Math.sin(t * 9) * 0.22);
      h.set('head', -0.1, 0, Math.sin(t * 4.5) * 0.1);
      for (const [n] of SIDES) arm(h, n, -0.25, 0.8, 2.0);
      h.set('hipR', -0.12, 0, -0.12);
      h.set('hipL', -0.12, 0, 0.12);
      h.rise(Math.abs(Math.sin(t * 9)) * 0.015 * h.k);
      break;
    case 'offer':
      // The mug held out to you; the other hand in a pocket. Tired, kind.
      h.set('spine', 0.06);
      h.set('chest', 0.04 + Math.sin(t * 0.9) * 0.01);
      h.set('neck', 0.05, look * 0.6);
      h.set('head', 0.05, 0, 0.06);
      arm(h, 'R', 1.0, -0.05, 1.05);
      h.set('wristR', 1.45, 0, 0);
      arm(h, 'L', -0.1, 0.12, 0.5);
      h.set('kneeL', 0.1);
      break;
    case 'stand':
      // The man: easy, his weight on one leg, the mug at his chest.
      h.set('hips', 0, 0, 0.03);
      h.set('spine', 0.05, 0, -0.03);
      h.set('chest', 0.03 + Math.sin(t * 0.9) * 0.012);
      h.set('neck', 0.04, look * 0.6);
      arm(h, 'R', 0.35, 0.05, 1.7, -0.5);
      h.set('wristR', 0.2, 0, 0);
      arm(h, 'L', -0.1, 0.12, 0.5);
      h.set('kneeL', 0.12);
      h.set('hipL', -0.06);
      break;
    case 'walk': {
      const s = (m.walked ?? 0) * 5;
      legsWalk(h, s, 0.5, 0.8);
      h.set('spine', 0.05, Math.sin(s) * 0.08);
      h.set('chest', 0, -Math.sin(s) * 0.15);
      h.set('neck', 0, look * 0.5);
      arm(h, 'R', -Math.sin(s) * 0.6, 0.12, 0.3);
      arm(h, 'L', Math.sin(s) * 0.6, 0.12, 0.3);
      break;
    }
    default: {
      // The clown at rest, which isn't rest: up on his toes, bouncing, the head tipping side to side.
      const bounce = Math.abs(Math.sin(t * 3.2));
      h.set('spine', 0.04, Math.sin(t * 1.6) * 0.08, Math.sin(t * 1.6) * 0.05);
      h.set('chest', 0.02);
      h.set('neck', 0, look * 0.6, Math.sin(t * 1.6) * 0.3);
      h.set('head', -0.05, 0, Math.sin(t * 1.6) * 0.12);
      arm(h, 'R', 0.15 + Math.sin(t * 3.2) * 0.15, 0.2, 0.5);
      h.set('wristR', -0.6 + Math.sin(t * 6.4) * 0.5, 0, 0); // the knife turning in his fingers
      arm(h, 'L', 0.1 - Math.sin(t * 3.2) * 0.15, 0.3, 0.4 + bounce * 0.3);
      for (const [n] of SIDES) {
        h.set(`hip${n}`, -0.1 - bounce * 0.08);
        h.set(`knee${n}`, 0.2 + bounce * 0.16);
        h.set(`ankle${n}`, 0.25);
      }
      h.rise((bounce * 0.04 + 0.01) * h.k);
      break;
    }
  }
}
