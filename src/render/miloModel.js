// Milo (Session 24; DESIGN.md "Milo's barn"): the knife thrower from
// Aaron's story The Lone Clown, alive in his barn and permanently in
// character. Two looks:
//  - the clown. Session 25 (Aaron, after seeing him: "a little too creepy;
//    the smile's too wide; the green wig less clown-like and more its own
//    thing; the white suit with polka dots; not skin tight; a little too
//    tall, his clothing's too tight; make the feet really big and the arms
//    really long"; his reference: docs/reference/milo-lone-clown.jpg): a
//    loose, baggy off-white suit with sparse red and blue dots, a short
//    rounded green bob of a wig sitting on his head like a cap, a white face
//    with a small red mouth (normal width), a red collar, white gloves, very
//    big red shoes, very long thin arms (his wrists below his knees); no red
//    nose. His knives are a set of three: one in his hand, two tucked into a
//    fold of the suit;
//  - the man (the morning after): tall, broad-shouldered, dark-haired, in
//    a flannel shirt, jeans and boots, his face washed clean, a tin mug of
//    instant coffee in his hand.
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

// Where his wrists hang (the kit's scale), by look: the clown's below his
// knees (0.5); the man's near them.
const WRIST = { clown: 0.44, man: 0.74 };

// The human skeleton with his arms.
function joints(look = 'clown') {
  const w = WRIST[look];
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
    j.push([`elbow${n}`, `shoulder${n}`, s * 0.23, (1.42 + w) / 2 + 0.01, 0]);
    j.push([`wrist${n}`, `elbow${n}`, s * 0.24, w, 0.02]);
    j.push([`hip${n}`, 'hips', s * 0.1, 0.92, 0]);
    j.push([`knee${n}`, `hip${n}`, s * 0.1, 0.5, 0.01]);
    j.push([`ankle${n}`, `knee${n}`, s * 0.1, 0.08, -0.02]);
  }
  return j;
}

export const MILO_JOINTS = joints('clown');
export const MILO_LOOKS = ['clown', 'man'];

// The body both looks share. keys: what each part is painted as. k.top: the
// top's width (a baggy top hangs straight from the chest); k.sleeve: the
// sleeves' radius (wide straight tubes when baggy); k.w: the wrist's height.
function body(k) {
  const W = k.w;
  const top = k.top ?? 1;
  const masses = [
    ['hips', null, 0, 0.95, 0, 0.15 * k.baggy, 0.12, 0.11 * k.baggy, 'trousers'],
    ['spine', 'chest', 0, 1.14, 0.005, 0.15 * top * (k.hang ?? 1), 0.13, 0.1 * top, 'shirt'],
    ['chest', 'spine', 0, 1.31, 0.005, 0.175 * top, 0.13, 0.11 * top, 'shirt'],
    ['neck', 'chest', 0, 1.475, 0, 0.042, 0.05, 0.042, 'face'],
    ['chest', null, -0.08, 1.43, -0.012, 0.08 * top, 0.034, 0.055 * top, 'shirt', [0, 0, 0.42]],
    ['chest', null, 0.08, 1.43, -0.012, 0.08 * top, 0.034, 0.055 * top, 'shirt', [0, 0, -0.42]],
    // A long head: a lantern jaw.
    ['head', null, 0, 1.6, 0.012, 0.082, 0.128, 0.098, 'face'],
    ['head', null, 0, 1.59, 0.106, 0.014, 0.022, 0.018, k.nose],
  ];
  const limbs = [];
  const sl = k.sleeve ?? [0.05, 0.042, 0.042, 0.032];
  for (const [n, s] of SIDES) {
    masses.push(['chest', `shoulder${n}`, s * 0.165, 1.405, 0, 0.062 * top, 0.056 * top, 0.062 * top, 'shirt']);
    masses.push(['head', null, s * 0.086, 1.6, 0, 0.012, 0.028, 0.018, 'face']); // an ear
    masses.push(['head', null, s * 0.032, 1.62, 0.092, 0.012, 0.011, 0.006, 'eyes']);
    masses.push([`wrist${n}`, null, s * 0.24, W - 0.05, 0.03, 0.026, 0.05, 0.018, k.hand]);
    // The shoes: k.shoe makes them longer (forward), k.shoeWide wider and taller.
    const wide = k.shoeWide ?? 1;
    masses.push([`ankle${n}`, null, s * (0.1 + (wide - 1) * 0.03), 0.045 * wide, 0.05 + k.shoe * 0.5, 0.055 * wide, 0.045 * wide, 0.12 + k.shoe, 'shoes']);
    limbs.push([`shoulder${n}`, `elbow${n}`, sl[0], sl[1], 'shirt', 0.1]);
    limbs.push([`elbow${n}`, `wrist${n}`, sl[2], sl[3], k.forearm, 0.08]);
    limbs.push([`hip${n}`, `knee${n}`, 0.082 * k.baggy, 0.075 * k.baggy, 'trousers', 0.1]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.075 * k.baggy, 0.072 * k.baggy, 'trousers', 0.05]);
  }
  return { masses, limbs };
}

// The clown's dots: sparse (most cells have none), red and blue. Pure (the tests).
export function dotAt(q, cell = 0.14, r = 0.055) {
  const ix = Math.round(q.x / cell);
  const iy = Math.round(q.y / cell);
  const iz = Math.round(q.z / cell);
  const h = Math.abs(Math.sin(ix * 12.9898 + iy * 78.233 + iz * 37.719) * 43758.5453) % 1;
  if (h > 0.5) return 0;
  if (Math.hypot(q.x - ix * cell, q.y - iy * cell, q.z - iz * cell) >= r) return 0;
  return h < 0.25 ? 1 : 2;
}

// m: config.milo. look: 'clown' or 'man'.
export function miloSpec(m, look = 'clown') {
  const clown = look === 'clown';
  const W = WRIST[look];
  const c = m.clown ?? {};
  const { masses, limbs } = body(
    clown
      ? { baggy: c.baggy ?? 1.4, top: c.top ?? 1.12, hang: 1.18, nose: 'face', hand: 'gloves', forearm: 'shirt', shoe: c.shoe ?? 0.2, shoeWide: 1.3, w: W, sleeve: [0.066, 0.064, 0.062, 0.06] }
      : { baggy: 1.05, nose: 'face', hand: 'face', forearm: 'face', shoe: 0, w: W },
  );
  const tubes = [];
  const rings = [];
  if (clown) {
    // The suit's top hangs straight from his chest to his hips (one smooth smock, no waist: not skin tight).
    masses.push(['spine', 'chest', 0, 1.15, 0.005, 0.2, 0.25, 0.128, 'shirt']);
    // The wig: a short rounded bob sitting on his head like a cap: one smooth dome, a fringe, its sides and back.
    masses.push(['head', null, 0, 1.685, -0.01, 0.112, 0.08, 0.118, 'wig']);
    masses.push(['head', null, 0, 1.672, 0.07, 0.098, 0.04, 0.05, 'wig']); // the fringe
    for (const [, s] of SIDES) masses.push(['head', null, s * 0.088, 1.615, -0.012, 0.042, 0.078, 0.092, 'wig']);
    masses.push(['head', null, 0, 1.612, -0.072, 0.098, 0.08, 0.05, 'wig']);
    // A small red mouth, a normal width, turned up a little at the corners.
    for (let i = -2; i <= 2; i++) {
      masses.push(['head', null, i * 0.011, 1.54 + Math.abs(i) * 0.0035, 0.101 - Math.abs(i) * 0.002, 0.009, 0.0075 - Math.abs(i) * 0.0008, 0.005, 'grin']);
    }
    // The red collar: a band round his neck and the scarf's ends hanging at his chest.
    rings.push(['neck', 0, 1.455, 0.004, 0.064, 0.022, 'collar', [Math.PI / 2, 0, 0]]);
    masses.push(['chest', null, -0.03, 1.4, 0.1, 0.03, 0.05, 0.016, 'collar', [0, 0, 0.2]]);
    masses.push(['chest', null, 0.02, 1.38, 0.105, 0.028, 0.06, 0.016, 'collar', [0, 0, -0.15]]);
    // His knives, a set of three: one in his right hand, two tucked into a fold of the suit at his chest.
    for (const x of [-0.07, -0.02]) {
      tubes.push(['chest', x, 1.37, 0.13, x + 0.02, 1.3, 0.137, 0.009, 0.008, 'leather']); // the handle
      tubes.push(['chest', x + 0.02, 1.3, 0.137, x + 0.045, 1.2, 0.133, 0.011, 0.002, 'steel', 0.25]); // the blade
    }
    tubes.push(['wristR', -0.24, W - 0.08, 0.045, -0.24, W - 0.14, 0.06, 0.01, 0.009, 'leather']);
    tubes.push(['wristR', -0.24, W - 0.14, 0.06, -0.24, W - 0.29, 0.09, 0.014, 0.002, 'steel', 0.25]);
  } else {
    // Dark hair, the flannel's collar, a belt.
    masses.push(['head', null, 0, 1.665, -0.01, 0.088, 0.075, 0.1, 'hair']);
    masses.push(['head', null, 0, 1.62, -0.07, 0.082, 0.09, 0.05, 'hair']);
    masses.push(['head', null, 0, 1.675, 0.06, 0.07, 0.04, 0.04, 'hair']); // falling across his forehead
    rings.push(['neck', 0, 1.45, 0.005, 0.06, 0.016, 'shirt', [Math.PI / 2, 0, 0]]);
    rings.push(['hips', 0, 1.02, 0, 0.155, 0.014, 'leather', [Math.PI / 2, 0, 0]]);
    // The tin mug in his right hand: "Instant. Sorry."
    tubes.push(['wristR', -0.24, W - 0.14, 0.075, -0.24, W - 0.05, 0.075, 0.036, 0.038, 'tin']);
    masses.push(['wristR', null, -0.24, W - 0.057, 0.075, 0.032, 0.004, 0.032, 'coffee']);
    rings.push(['wristR', -0.24, W - 0.095, 0.118, 0.022, 0.006, 'tin', [0, Math.PI / 2, 0]]);
  }
  return {
    joints: joints(look),
    masses,
    limbs,
    tubes,
    rings,
    height: clown ? m.height : (m.manHeight ?? m.height),
    width: m.widths[look],
    head: 1.04,
    colours: m.looks[look],
    paint(key, q, out, colours) {
      if (clown) {
        if (key === 'shirt' || key === 'trousers') {
          // The polka dots: sparse, red and blue, on the off-white suit.
          const d = dotAt(q);
          if (d) out.copy(d === 1 ? colours.dot : colours.dot2);
        } else if (key === 'face' && q.y > 1.5) {
          // Painted eyes: small black marks; the white worn thin along the jaw.
          for (const s of [-1, 1]) if (q.z > 0.05 && Math.abs(q.x - s * 0.032) * 1.6 + Math.abs(q.y - 1.62) < 0.03) out.copy(colours.eyes);
          if (q.y < 1.52) out.lerp(colours.skin, 0.4);
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
