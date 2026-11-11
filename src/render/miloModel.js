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
// Session 26 (Aaron: the suit read skin tight, the wig wasn't clowny; a
// green-haired creepy killer clown for inspiration, a little supernatural;
// the man's clothes skin tight and his belt far too loose): both looks
// redone (clownBody, manBody below).
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

// A ring of `n` pleats round a centre (the kit's masses): a ruff, a peplum, a
// cuff. Each pleat is a flattened ellipsoid standing out from the centre,
// tilted out by `flare` (radians), its colour alternating between keys.
// rx, rz: the ring's radii (an oval for a body); size: [width, height, depth].
function pleats(out, bone, other, cx, cy, cz, rx, rz, n, size, keys, flare = 0.5, offset = 0) {
  for (let i = 0; i < n; i++) {
    const a = ((i + offset) / n) * Math.PI * 2;
    const sx = Math.sin(a);
    const sz = Math.cos(a);
    // turn: about y to face out along (sx, sz), then tipped outward.
    out.push([bone, other, cx + sx * rx, cy, cz + sz * rz, size[0], size[1], size[2], keys[i % keys.length], [flare, a, 0], true]); // coarse: there are many
  }
}

// The man's body. Session 26 (Aaron: "his human form is in skin tight
// clothing and his belt is super loose"): a loose flannel shirt tucked in and
// bloused over the belt, its sleeves rolled to the elbow, roomy jeans,
// work boots, and a belt that sits snug on his waist (an oval band the shape
// of his hips there, not a hoop) with its buckle.
function manBody(W) {
  const masses = [
    // Jeans: a straight, roomy seat.
    ['hips', null, 0, 0.97, 0, 0.17, 0.15, 0.125, 'trousers'], // its top at the belt, near full width
    // The shirt: loose, hanging straight from his chest, its tail out over the hips.
    ['spine', 'chest', 0, 1.15, 0.005, 0.185, 0.2, 0.13, 'shirt'],
    ['chest', 'spine', 0, 1.32, 0.008, 0.195, 0.14, 0.13, 'shirt'],
    ['hips', 'spine', 0, 1.06, 0.004, 0.18, 0.05, 0.132, 'shirt'], // bloused out over the belt
    ['chest', null, -0.085, 1.43, -0.012, 0.085, 0.036, 0.06, 'shirt', [0, 0, 0.42]],
    ['chest', null, 0.085, 1.43, -0.012, 0.085, 0.036, 0.06, 'shirt', [0, 0, -0.42]],
    // A button placket and two chest pockets.
    ['chest', 'spine', 0, 1.25, 0.136, 0.012, 0.2, 0.006, 'check'],
    ['neck', null, 0, 1.475, 0, 0.044, 0.05, 0.044, 'face'],
    ['head', null, 0, 1.6, 0.012, 0.082, 0.128, 0.098, 'face'],
    ['head', null, 0, 1.59, 0.106, 0.014, 0.022, 0.018, 'face'],
    // The belt: just above the shirt's tail at the front, where it's tucked in at the buckle;
    // an oval band a hair proud of the jeans (it's inside them but for its rim), and the buckle.
    ['hips', null, 0, 1.03, 0, 0.166, 0.02, 0.124, 'leather'],
    ['hips', null, 0, 1.03, 0.13, 0.03, 0.024, 0.008, 'tin'],
    // Dark hair.
    ['head', null, 0, 1.665, -0.01, 0.088, 0.075, 0.1, 'hair'],
    ['head', null, 0, 1.62, -0.07, 0.082, 0.09, 0.05, 'hair'],
    ['head', null, 0, 1.675, 0.06, 0.07, 0.04, 0.04, 'hair'], // falling across his forehead
  ];
  const limbs = [];
  for (const [n, s] of SIDES) {
    masses.push(['chest', `shoulder${n}`, s * 0.17, 1.405, 0, 0.068, 0.06, 0.068, 'shirt']);
    masses.push(['head', null, s * 0.086, 1.6, 0, 0.012, 0.028, 0.018, 'face']);
    masses.push(['head', null, s * 0.032, 1.62, 0.092, 0.012, 0.011, 0.006, 'eyes']);
    masses.push([`wrist${n}`, null, s * 0.24, W - 0.05, 0.03, 0.028, 0.052, 0.02, 'face']);
    masses.push(['chest', null, s * 0.085, 1.36, 0.13, 0.045, 0.045, 0.012, 'shirt']); // a pocket
    // Work boots: chunky, with a heel.
    masses.push([`ankle${n}`, null, s * 0.1, 0.05, 0.05, 0.06, 0.055, 0.13, 'shoes']);
    // The sleeves: loose to the elbow, rolled there in a fat cuff; bare forearms.
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.066, 0.062, 'shirt', 0.18]);
    masses.push([`elbow${n}`, null, s * 0.235, (1.42 + W) / 2 - 0.02, 0, 0.064, 0.03, 0.064, 'shirt']);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.042, 0.032, 'face', 0.08]);
    // Jeans: a roomy straight leg, a little bagged at the knee, breaking over the boot.
    limbs.push([`hip${n}`, `knee${n}`, 0.1, 0.088, 'trousers', 0.12]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.088, 0.084, 'trousers', 0.06]);
    masses.push([`ankle${n}`, null, s * 0.1, 0.13, 0.0, 0.088, 0.04, 0.09, 'trousers']);
  }
  return { masses, limbs };
}

// The clown. Session 26 (Aaron: "his clown outfit appears skin tight, and his
// wig is not quite clowny; use a green-haired creepy killer clown for your
// inspiration; he can be a little supernatural"): the archetype, made his own.
//  - The suit: a big baggy smock with puffed shoulders and sleeves gathered
//    into ruffled cuffs; balloon pantaloons gathered at the ankle into
//    ruffles; a ruffled peplum at the waist; three red pom-poms down the
//    front; a pleated ruff at the neck, red and off-white. The red and blue
//    dots stay (his own suit, from the story's picture).
//  - The hair: a bald white crown, and wild green hair bursting out at the
//    sides in two big puffs with tufts sticking out every way, and a little
//    tuft over the brow. Clown hair, not a cap.
//  - The face: white greasepaint, dark diamonds through the eyes,
//    a red mouth of a normal width with thin red lines painted up from its
//    corners into the cheeks (a painted grin over a small one), no red nose
//    (the story's Milo has none).
//  - A little supernatural: his eyes give off a faint, dull yellow light of
//    their own (they show in the dark: no light is added), and his gloved
//    fingers are too long.
function clownBody(W, c) {
  const masses = [];
  const limbs = [];
  const tubes = [];
  // The seat of the pantaloons, ballooning.
  masses.push(['hips', null, 0, 0.9, 0, 0.215, 0.17, 0.17, 'trousers']);
  // The smock: hangs from the chest to below the waist, wide and full.
  masses.push(['spine', 'chest', 0, 1.17, 0.012, 0.235 * (c.top ?? 1), 0.26, 0.165, 'shirt']);
  masses.push(['chest', 'spine', 0, 1.33, 0.01, 0.215 * (c.top ?? 1), 0.14, 0.145, 'shirt']);
  masses.push(['neck', null, 0, 1.475, 0, 0.042, 0.05, 0.042, 'face']);
  // The ruffled peplum where the smock ends, over the pantaloons.
  pleats(masses, 'hips', 'spine', 0, 0.99, 0.008, 0.225, 0.17, 18, [0.06, 0.07, 0.022], ['ruffle', 'ruffle2'], 0.55);
  // Three pom-poms down the front.
  for (const [y, z] of [[1.37, 0.152], [1.24, 0.172], [1.11, 0.175]]) masses.push(['chest', y < 1.3 ? 'spine' : null, 0, y, z, 0.034, 0.034, 0.03, 'pom']);
  // The ruff: two rows of pleats round his neck, wide and stiff.
  // (Above the smock's top, which comes up to about 1.47, under his jaw.)
  pleats(masses, 'neck', 'chest', 0, 1.48, 0.0, 0.13, 0.12, 18, [0.055, 0.035, 0.085], ['ruffle', 'ruffle2'], 0.22);
  pleats(masses, 'neck', 'chest', 0, 1.505, 0.0, 0.085, 0.08, 16, [0.042, 0.028, 0.055], ['ruffle2', 'ruffle'], 0.1, 0.5);
  // The head: long, white.
  masses.push(['head', null, 0, 1.6, 0.012, 0.082, 0.128, 0.098, 'face']);
  // The hair: the bald crown is the head's own white; the sides burst.
  for (const [, s] of SIDES) {
    // A small core (hidden by the tufts), then the tufts: thick at the root, bursting out every way, so it's hair, not a ball.
    masses.push(['head', null, s * 0.1, 1.635, -0.025, 0.055, 0.06, 0.075, 'wig']);
    masses.push(['head', null, s * 0.075, 1.6, -0.06, 0.055, 0.065, 0.055, 'wig']);
    const tufts = [
      [0.14, 0.13, 0.03], [0.19, 0.06, -0.01], [0.18, -0.03, 0.04], [0.13, 0.08, -0.12], [0.18, 0.0, -0.09], [0.08, 0.16, -0.05],
      [0.1, -0.09, -0.1], [0.15, 0.12, 0.08], [0.16, -0.08, -0.02], [0.06, 0.12, 0.06], [0.12, 0.02, 0.1], [0.09, -0.02, -0.15],
      [0.2, 0.1, -0.05], [0.11, 0.17, 0.0],
    ];
    for (const [dx, dy, dz] of tufts) {
      tubes.push(['head', s * 0.095, 1.635, -0.025, s * (0.095 + dx), 1.635 + dy, -0.025 + dz, 0.042, 0.005, 'wig']);
    }
  }
  masses.push(['head', null, 0, 1.6, -0.085, 0.1, 0.07, 0.04, 'wig']); // round the back, below the crown
  for (const [dx, dy, dz] of [[0, 0.07, 0.05], [0.03, 0.06, 0.06], [-0.03, 0.06, 0.06]]) tubes.push(['head', 0, 1.715, 0.03, dx, 1.715 + dy, 0.03 + dz, 0.016, 0.003, 'wig']); // a little tuft over the brow
  // The mouth: red, a normal width, a little turned up.
  for (let i = -2; i <= 2; i++) {
    masses.push(['head', null, i * 0.011, 1.54 + Math.abs(i) * 0.0035, 0.101 - Math.abs(i) * 0.002, 0.009, 0.0075 - Math.abs(i) * 0.0008, 0.005, 'grin']);
  }
  for (const [n, s] of SIDES) {
    masses.push(['head', null, s * 0.086, 1.6, 0, 0.012, 0.028, 0.018, 'face']); // an ear
    // The greasepaint, as thin shapes on the face (it's too coarse to paint fine lines on): a tall dark
    // diamond through each eye, brow to cheekbone, and a thin red line from each corner of the mouth up into the cheek.
    masses.push(['head', null, s * 0.032, 1.622, 0.093, 0.017, 0.058, 0.009, 'socket', [-0.12, 0, 0]]);
    masses.push(['head', null, s * 0.045, 1.57, 0.097, 0.0045, 0.03, 0.006, 'grin', [-0.1, 0, s * 0.62]]);
    masses.push(['head', null, s * 0.032, 1.62, 0.1, 0.011, 0.01, 0.006, 'eyes']); // they glow (glow.eyes)
    // Puffed shoulders and sleeves, gathered at the wrist into a ruffled cuff.
    masses.push(['chest', `shoulder${n}`, s * 0.2, 1.39, 0, 0.095, 0.085, 0.095, 'shirt']);
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.085, 0.078, 'shirt', 0.4]);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.078, 0.05, 'shirt', 0.35]);
    pleats(masses, `wrist${n}`, null, s * 0.24, W + 0.005, 0.02, 0.05, 0.05, 9, [0.032, 0.03, 0.016], ['ruffle', 'ruffle2'], 1.0);
    // The gloved hand, and fingers too long for it.
    masses.push([`wrist${n}`, null, s * 0.24, W - 0.05, 0.03, 0.03, 0.05, 0.02, 'gloves']);
    for (let f = 0; f < 4; f++) {
      const fx = s * (0.226 + f * 0.009);
      const fz = 0.012 + f * 0.012;
      tubes.push([`wrist${n}`, fx, W - 0.085, fz, fx + s * 0.004, W - 0.2 - (f === 1 || f === 2 ? 0.02 : 0), fz + 0.015, 0.008, 0.005, 'gloves']);
    }
    // Balloon pantaloons, gathered at the ankle into ruffles.
    limbs.push([`hip${n}`, `knee${n}`, 0.13, 0.125, 'trousers', 0.4]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.125, 0.06, 'trousers', 0.45]);
    pleats(masses, `ankle${n}`, null, s * 0.1, 0.13, -0.01, 0.065, 0.065, 10, [0.04, 0.035, 0.016], ['ruffle', 'ruffle2'], 1.1);
    // The shoes: very long, rounded, a pom-pom on each toe.
    const shoe = c.shoe ?? 0.2;
    masses.push([`ankle${n}`, null, s * 0.11, 0.06, 0.05 + shoe * 0.5, 0.075, 0.06, 0.12 + shoe, 'shoes']);
    masses.push([`ankle${n}`, null, s * 0.11, 0.12, 0.2 + shoe * 0.7, 0.03, 0.03, 0.03, 'pom']);
  }
  return { masses, limbs, tubes };
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
  const built = clown ? clownBody(W, c) : manBody(W);
  const { masses, limbs } = built;
  const tubes = built.tubes ?? [];
  const rings = [];
  if (clown) {
    // His knives, a set of three: one in his right hand, two tucked into a fold of the suit at his chest.
    for (const x of [-0.11, -0.065]) {
      tubes.push(['chest', x, 1.38, 0.15, x + 0.02, 1.31, 0.158, 0.009, 0.008, 'leather']); // the handle
      tubes.push(['chest', x + 0.02, 1.31, 0.158, x + 0.045, 1.21, 0.16, 0.011, 0.002, 'steel', 0.25]); // the blade
    }
    tubes.push(['wristR', -0.24, W - 0.08, 0.045, -0.24, W - 0.14, 0.06, 0.01, 0.009, 'leather']);
    tubes.push(['wristR', -0.24, W - 0.14, 0.06, -0.24, W - 0.29, 0.09, 0.014, 0.002, 'steel', 0.25]);
  } else {
    // The flannel's collar; the tin mug in his right hand: "Instant. Sorry."
    rings.push(['neck', 0, 1.45, 0.005, 0.062, 0.017, 'shirt', [Math.PI / 2, 0, 0]]);
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
    head: clown ? 1.12 : 1.04, // Session 26: the clown's a touch bigger, or the suit swallows it
    colours: m.looks[look],
    // Session 26: the clown's eyes give off a faint light of their own (no light is added: the
    // figure's shader shows their colour in the dark).
    glow: clown ? { eyes: m.eyeGlow ?? 1 } : undefined,
    paint(key, q, out, colours) {
      if (clown) {
        if (key === 'shirt' || key === 'trousers') {
          // The polka dots: sparse, red and blue, on the off-white suit.
          const d = dotAt(q);
          if (d) out.copy(d === 1 ? colours.dot : colours.dot2);
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
