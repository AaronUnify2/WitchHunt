// The animals in Milo's barn (Session 24; DESIGN.md "Milo's barn"): a
// donkey, a Shetland pony, an enormous turkey and a python. He loves them;
// they're harmless. The donkey stares at Tom the whole time and never
// looks away (and turns up later, staring from the treeline). The turkey
// judges him.
//
// The figure kit's specs and their poses (for render/PosedFigure.js), each
// at its real size (the kit's scale left at 1). Model space: faces +z,
// feet at y = 0.

const SIDES = [
  ['R', -1],
  ['L', 1],
];

export const BARN_ANIMALS = ['donkey', 'pony', 'turkey', 'python'];

// ---- the donkey and the pony: one horse-shape, two builds --------------------------------------

// s: { leg (leg length), back (body length), girth, neck, head, ear, mane, tail (hair length) }.
const BUILDS = {
  donkey: { leg: 0.56, back: 1.12, girth: 0.26, neck: 0.4, head: 0.34, ear: 0.26, mane: 0.05, tail: 0.5, forelock: 0 },
  pony: { leg: 0.44, back: 0.86, girth: 0.3, neck: 0.4, head: 0.3, ear: 0.09, mane: 0.2, tail: 0.75, forelock: 1 },
};

function equineJoints(s) {
  const top = s.leg + s.girth; // the body's centre line
  const half = s.back / 2;
  const j = [
    ['root', null, 0, 0, 0],
    ['body', 'root', 0, top, 0],
    ['neck', 'body', 0, top + s.girth * 0.5, half - 0.05],
    ['head', 'neck', 0, top + s.girth * 0.5 + s.neck * 0.8, half + s.neck * 0.55],
    ['tail', 'body', 0, top + s.girth * 0.6, -half - 0.02],
  ];
  for (const [n, k] of SIDES) {
    j.push([`ear${n}`, 'head', k * 0.06, top + s.girth * 0.5 + s.neck * 0.8 + 0.1, half + s.neck * 0.55 - 0.03]);
    for (const [e, z] of [
      ['F', half - 0.12],
      ['B', -half + 0.1],
    ]) {
      j.push([`leg${e}${n}`, 'body', k * 0.13, s.leg + 0.08, z]);
      j.push([`knee${e}${n}`, `leg${e}${n}`, k * 0.13, s.leg * 0.5, z + (e === 'B' ? -0.05 : 0.01)]);
      j.push([`hoof${e}${n}`, `knee${e}${n}`, k * 0.13, 0.03, z]);
    }
  }
  return j;
}

function equineSpec(kind, c) {
  const s = BUILDS[kind];
  const joints = equineJoints(s);
  const J = Object.fromEntries(joints.map(([name, , x, y, z]) => [name, [x, y, z]]));
  const top = s.leg + s.girth;
  const half = s.back / 2;
  const [, hy, hz] = J.head;
  const masses = [
    // The barrel, deep-bellied; the rump and the withers.
    ['body', null, 0, top - 0.02, 0, s.girth, s.girth * 1.02, half * 1.0, 'coat'],
    ['body', null, 0, top + 0.02, -half * 0.75, s.girth * 0.92, s.girth * 0.95, 0.24, 'coat'],
    ['body', null, 0, top + 0.04, half * 0.7, s.girth * 0.85, s.girth * 0.95, 0.22, 'coat'],
    ['body', null, 0, top - s.girth * 0.55, 0, s.girth * 0.8, s.girth * 0.5, half * 0.8, 'belly'],
    // The head: a long face, a pale muzzle, the jaw.
    ['head', null, 0, hy - 0.02, hz + 0.02, 0.085, 0.1, 0.12, 'coat'],
    ['head', null, 0, hy - 0.1, hz + s.head * 0.5, 0.065, 0.075, s.head * 0.45, 'coat'],
    ['head', null, 0, hy - 0.15, hz + s.head * 0.85, 0.058, 0.062, 0.075, 'muzzle'],
  ];
  const limbs = [['neck', 'head', s.girth * 0.62, 0.1, 'coat', 0.1, 0.7]];
  const tubes = [];
  for (const [n, k] of SIDES) {
    // Eyes set wide, dark, with a pale ring (the stare), and nostrils.
    masses.push(['head', null, k * 0.075, hy + 0.005, hz + 0.06, 0.02, 0.022, 0.024, 'eyeRing']);
    masses.push(['head', null, k * 0.084, hy + 0.005, hz + 0.065, 0.014, 0.016, 0.017, 'eyes']);
    masses.push(['head', null, k * 0.03, hy - 0.15, hz + s.head * 0.85 + 0.068, 0.012, 0.014, 0.008, 'eyes']);
    // The ears: a donkey's are most of the donkey.
    masses.push([`ear${n}`, null, k * 0.065, hy + 0.1 + s.ear * 0.5, hz - 0.03, 0.035, s.ear * 0.55, 0.018, 'coat']);
    masses.push([`ear${n}`, null, k * 0.065, hy + 0.1 + s.ear * 0.5, hz - 0.018, 0.02, s.ear * 0.42, 0.01, 'earIn']);
    for (const e of ['F', 'B']) {
      limbs.push([`leg${e}${n}`, `knee${e}${n}`, 0.085, 0.052, 'coat', 0.2]);
      limbs.push([`knee${e}${n}`, `hoof${e}${n}`, 0.046, 0.04, 'leg', 0]);
      const [x, , z] = J[`hoof${e}${n}`];
      masses.push([`hoof${e}${n}`, null, x, 0.035, z + 0.01, 0.045, 0.038, 0.055, 'hoof']);
    }
  }
  // The mane (a donkey's stands up short; a Shetland's falls everywhere), the forelock, the tail.
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const y = top + s.girth * 0.75 + (hy - top - s.girth * 0.75 + 0.08) * t;
    const z = half * 0.6 + (hz - 0.08 - half * 0.6) * t;
    if (s.mane > 0.1) {
      const side = i % 2 ? 1 : -1;
      tubes.push(['neck', 0, y, z, side * (0.12 + s.mane * 0.4), y - s.mane - 0.12, z - 0.02, 0.05, 0.004, 'mane']);
    } else {
      tubes.push(['neck', 0, y - 0.02, z, 0, y + s.mane + 0.03, z - 0.03, 0.03, 0.006, 'mane']);
    }
  }
  if (s.forelock) for (let i = -2; i <= 2; i++) tubes.push(['head', i * 0.03, hy + 0.09, hz + 0.02, i * 0.045, hy - 0.06, hz + 0.13, 0.035, 0.004, 'mane']);
  const [, ty, tz] = J.tail;
  tubes.push(['tail', 0, ty, tz, 0, ty - s.tail * 0.5, tz - 0.12, 0.03, 0.022, kind === 'donkey' ? 'coat' : 'mane']);
  for (let i = -1; i <= 1; i++) tubes.push(['tail', i * 0.015, ty - s.tail * 0.45, tz - 0.11, i * 0.04, ty - s.tail, tz - 0.14, 0.04, 0.004, 'mane']);
  return {
    joints,
    masses,
    limbs,
    tubes,
    rings: [],
    height: 1.7,
    width: 1,
    head: 1,
    colours: c.colours,
    paint(key, q, out, colours) {
      if (key !== 'coat') return;
      // A donkey's cross: a dark stripe down the spine and across the shoulders.
      if (kind === 'donkey') {
        if (q.y > top + s.girth * 0.55 && Math.abs(q.x) < 0.035 && q.z < half) out.copy(colours.mane);
        if (Math.abs(q.z - half * 0.62) < 0.03 && q.y > top) out.copy(colours.mane);
      }
      // Shaggy: clumps, lighter and darker.
      out.multiplyScalar(0.85 + 0.25 * Math.abs(Math.sin(q.x * 37 + q.y * 29) * Math.sin(q.z * 31)));
    },
    deform: kind === 'pony' ? (q, n, bone) => (bone === 'body' ? 0.02 * Math.sin(q.z * 23 + q.y * 17) * Math.sin(q.x * 19) : 0) : undefined,
  };
}

// m.state: 'stare' (the donkey's: dead still, its head following you),
// 'stand', 'graze', 'walk'.
function equinePose(h, m, t) {
  const look = Math.max(-1.3, Math.min(1.3, m.look ?? 0));
  const flick = Math.max(0, Math.sin(t * 0.7 + 1) - 0.96) * 25; // an ear, now and then
  const swish = Math.sin(t * 1.1) * 0.25;
  h.set('tail', 0.15, 0, swish);
  switch (m.state) {
    case 'stare':
      // Nothing moves but the head, which never leaves you. An ear turns. That's all.
      h.set('neck', -0.12, look * 0.6);
      h.set('head', 0.1, look * 0.4);
      h.set('earR', 0, 0, 0.1 - flick * 0.5);
      h.set('earL', 0, 0, -0.1);
      h.set('tail', 0.1, 0, 0);
      break;
    case 'graze': {
      const chew = Math.sin(t * 5) * 0.03;
      h.set('neck', 1.25);
      h.set('head', 0.35 + chew, Math.sin(t * 0.5) * 0.1);
      h.set('earR', 0.3, 0, 0.5);
      h.set('earL', 0.3, 0, -0.5);
      h.set('legFR', -0.12);
      h.set('legFL', 0.08);
      break;
    }
    case 'walk': {
      const s = (m.walked ?? 0) * 6;
      // A four-beat walk: each leg a quarter of a stride after the last.
      for (const [name, o] of [
        ['FR', 0],
        ['BL', 0.5],
        ['FL', Math.PI],
        ['BR', Math.PI + 0.5],
      ]) {
        h.set(`leg${name}`, Math.sin(s + o) * 0.35);
        h.set(`knee${name}`, Math.max(0, Math.cos(s + o)) * (name[0] === 'F' ? 0.6 : -0.45));
      }
      h.set('neck', 0.25 + Math.sin(s * 2) * 0.05, look * 0.4);
      h.set('head', 0.1, look * 0.3);
      h.rise(Math.abs(Math.sin(s)) * 0.012);
      break;
    }
    default:
      h.set('neck', 0.1 + Math.sin(t * 0.4) * 0.04, look * 0.4 + Math.sin(t * 0.23) * 0.2);
      h.set('head', 0.15, look * 0.3);
      h.set('earR', 0, 0, 0.25 - flick * 0.4);
      h.set('earL', 0, 0, -0.25 + Math.sin(t * 0.9) * 0.1);
      h.set('legBR', 0.08);
      h.set('kneeBR', -0.2); // a hind leg rested
      break;
  }
}

// ---- the turkey ----------------------------------------------------------------------------------

const TURKEY_JOINTS = (() => {
  const j = [
    ['root', null, 0, 0, 0],
    ['body', 'root', 0, 0.62, 0],
    ['neck', 'body', 0, 0.8, 0.26],
    ['neck2', 'neck', 0, 1.05, 0.3],
    ['head', 'neck2', 0, 1.22, 0.36],
    ['tail', 'body', 0, 0.72, -0.3],
  ];
  for (const [n, k] of SIDES) {
    j.push([`wing${n}`, 'body', k * 0.22, 0.7, 0.05]);
    j.push([`leg${n}`, 'body', k * 0.11, 0.42, 0]);
    j.push([`knee${n}`, `leg${n}`, k * 0.11, 0.22, -0.03]);
    j.push([`foot${n}`, `knee${n}`, k * 0.11, 0.02, 0.02]);
  }
  return j;
})();

function turkeySpec(c) {
  const masses = [
    // Enormous: a great round body, the breast pushed out in front.
    ['body', null, 0, 0.64, -0.02, 0.27, 0.26, 0.36, 'feather'],
    ['body', null, 0, 0.6, 0.22, 0.22, 0.24, 0.2, 'breast'],
    // The head: small, bald, blue-grey and red, and very sure of itself.
    ['head', null, 0, 1.23, 0.37, 0.05, 0.06, 0.065, 'bald'],
    ['head', null, 0, 1.17, 0.4, 0.025, 0.07, 0.03, 'wattle'],
    ['head', null, 0, 1.22, 0.455, 0.012, 0.05, 0.014, 'wattle', [0.5, 0, 0]], // the snood, over the beak
  ];
  const limbs = [
    ['neck', 'neck2', 0.07, 0.045, 'bald', 0.1],
    ['neck2', 'head', 0.045, 0.04, 'wattle', 0.2],
  ];
  const tubes = [
    ['head', 0, 1.225, 0.42, 0, 1.2, 0.5, 0.02, 0.004, 'beak'],
    // The beard: a tuft of bristles on his chest.
    ['body', 0, 0.62, 0.41, 0, 0.44, 0.45, 0.02, 0.003, 'dark'],
  ];
  // The tail's fan: a ring of broad feathers, dark, banded, pale-tipped.
  for (let i = 0; i < 13; i++) {
    const a = ((i - 6) / 6) * 1.35;
    masses.push(['tail', null, Math.sin(a) * 0.3, 0.72 + Math.cos(a) * 0.33, -0.34, 0.07, 0.3, 0.012, 'fan', [0, 0, -a]]);
  }
  for (const [n, k] of SIDES) {
    masses.push(['head', null, k * 0.042, 1.245, 0.39, 0.012, 0.012, 0.01, 'eyes']);
    // A wing, folded, its tips trailing.
    masses.push([`wing${n}`, null, k * 0.25, 0.62, -0.02, 0.06, 0.2, 0.3, 'wing']);
    tubes.push([`wing${n}`, k * 0.27, 0.52, -0.2, k * 0.25, 0.3, -0.34, 0.07, 0.01, 'dark', 0.3]);
    limbs.push([`leg${n}`, `knee${n}`, 0.055, 0.025, 'feather', 0.2]);
    limbs.push([`knee${n}`, `foot${n}`, 0.02, 0.018, 'shank', 0]);
    for (const [dx, dz] of [[-0.05, 0.09], [0, 0.11], [0.05, 0.09], [0, -0.05]]) tubes.push([`foot${n}`, k * 0.11, 0.02, 0.02, k * 0.11 + dx, 0.008, 0.02 + dz, 0.012, 0.004, 'shank']);
  }
  return {
    joints: TURKEY_JOINTS,
    masses,
    limbs,
    tubes,
    rings: [],
    height: 1.7,
    width: 1,
    head: 1,
    colours: c.colours,
    paint(key, q, out, colours) {
      if (key === 'fan') {
        const r = Math.hypot(q.x, q.y - 0.72);
        if (r > 0.52) out.copy(colours.fanTip);
        else if (Math.sin(r * 55) > 0.3) out.multiplyScalar(0.6);
      } else if (key === 'feather' || key === 'breast' || key === 'wing') {
        // Scalloped rows of feathers, a bronze sheen on their edges.
        if (Math.sin(q.y * 48 + Math.sin(q.z * 40 + q.x * 40) * 1.5) > 0.55) out.lerp(colours.sheen, 0.5);
      }
    },
  };
}

// m.state: 'judge' (drawn up tall, the head cocked at you), 'display'
// (fanned and puffed, strutting on the spot), 'peck'.
function turkeyPose(h, m, t) {
  const look = Math.max(-1.4, Math.min(1.4, m.look ?? 0));
  switch (m.state) {
    case 'display': {
      const strut = Math.sin(t * 2.4);
      h.set('tail', -0.15, 0, strut * 0.08); // the fan upright
      h.set('wingR', 0, 0, 0.45);
      h.set('wingL', 0, 0, -0.45); // wings dropped, dragging
      h.set('neck', -0.5);
      h.set('neck2', 0.7);
      h.set('head', 0.2, look * 0.5);
      h.set('body', -0.1, strut * 0.08);
      h.set('legR', Math.max(0, strut) * -0.5);
      h.set('kneeR', Math.max(0, strut) * 0.6);
      h.set('legL', Math.max(0, -strut) * -0.5);
      h.set('kneeL', Math.max(0, -strut) * 0.6);
      break;
    }
    case 'peck': {
      const k = Math.max(0, Math.sin(t * 3.5));
      h.set('tail', 1.25); // the fan down behind it
      h.set('body', 0.25 * k);
      h.set('neck', 0.3 + 0.9 * k);
      h.set('neck2', 0.4 * k);
      h.set('head', 0.3 * k);
      break;
    }
    default:
      // Drawn up to its full height, one eye turned on you, a slow blinkless tilt. Judging.
      h.set('tail', 0.95, 0, 0);
      h.set('neck', -0.2);
      h.set('neck2', 0.1, look * 0.5);
      h.set('head', 0.05, look * 0.5 + 0.45, 0.35 + Math.sin(t * 0.5) * 0.12);
      h.set('body', -0.06);
      break;
  }
}

// ---- the python ----------------------------------------------------------------------------------

// A coil: `turns` turns narrowing as they rise, then the neck lifted and the head held level.
function pythonPath() {
  const pts = [];
  const n = 46;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * Math.PI * 2 * 2.6;
    const r = 0.36 - t * 0.2;
    pts.push([Math.cos(a) * r, 0.06 + t * 0.2, Math.sin(a) * r, 0.03 + 0.045 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.1))]);
  }
  return pts;
}

function pythonSpec(c) {
  const path = pythonPath();
  const last = path[path.length - 1];
  const neckTop = [last[0] * 0.5, 0.52, last[2] * 0.5 + 0.12];
  const headAt = [neckTop[0], 0.55, neckTop[2] + 0.16];
  const joints = [
    ['root', null, 0, 0, 0],
    ['coil', 'root', 0, 0.1, 0],
    ['neck', 'coil', last[0], last[1], last[2]],
    ['head', 'neck', neckTop[0], neckTop[1], neckTop[2]],
  ];
  const tubes = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    tubes.push(['coil', a[0], a[1], a[2], b[0], b[1], b[2], a[3], b[3], 'scales']);
  }
  const masses = path.filter((_, i) => i % 2 === 0).map((p) => ['coil', null, p[0], p[1], p[2], p[3], p[3], p[3], 'scales']);
  // The head: a blunt wedge, dark eyes, the pale lips' line.
  masses.push(['head', null, headAt[0], headAt[1], headAt[2] - 0.02, 0.05, 0.032, 0.085, 'scales']);
  masses.push(['head', null, headAt[0], headAt[1] - 0.018, headAt[2] + 0.01, 0.045, 0.014, 0.075, 'belly']);
  for (const [, k] of SIDES) masses.push(['head', null, headAt[0] + k * 0.036, headAt[1] + 0.012, headAt[2] + 0.02, 0.009, 0.009, 0.011, 'eyes']);
  return {
    joints,
    masses,
    limbs: [['neck', 'head', 0.05, 0.04, 'scales', 0.1]],
    // The tongue.
    tubes: [...tubes, ['head', headAt[0], headAt[1] - 0.01, headAt[2] + 0.07, headAt[0], headAt[1] - 0.015, headAt[2] + 0.15, 0.004, 0.001, 'tongue']],
    rings: [],
    height: 1.7,
    width: 1,
    head: 1,
    colours: c.colours,
    paint(key, q, out, colours) {
      if (key !== 'scales') return;
      // Saddles: dark blotches along its back, the sides paler.
      const blotch = Math.sin(Math.atan2(q.z, q.x) * 7 + q.y * 30);
      if (blotch > 0.2) out.copy(colours.saddle);
      else if (blotch < -0.75) out.copy(colours.belly);
    },
  };
}

// m.state: 'coiled' (the head up, swaying a little, the tongue out and in), 'watch' (the head follows you).
function pythonPose(h, m, t) {
  const look = Math.max(-1.2, Math.min(1.2, m.look ?? 0));
  const sway = Math.sin(t * 0.7) * 0.15;
  h.set('coil', 0, 0, 0);
  if (m.state === 'watch') {
    h.set('neck', -0.15, look * 0.6);
    h.set('head', 0.1, look * 0.5);
  } else {
    h.set('neck', Math.sin(t * 0.45) * 0.1, sway);
    h.set('head', 0.05, sway * 0.6, Math.sin(t * 0.9) * 0.05);
  }
}

// ---- the lot -------------------------------------------------------------------------------------

// What each animal is, for a PosedFigure: { spec(cfg), pose, height
// (metres, for framing), states: [{ id, name }] }. cfg: config.barnAnimals[kind].
export const ANIMALS = {
  donkey: {
    spec: (c) => equineSpec('donkey', c),
    pose: equinePose,
    height: 1.35,
    states: [
      { id: 'stare', name: 'Staring at you (it never looks away)' },
      { id: 'stand', name: 'Standing' },
      { id: 'graze', name: 'Head down, eating' },
      { id: 'walk', name: 'Walking' },
    ],
  },
  pony: {
    spec: (c) => equineSpec('pony', c),
    pose: equinePose,
    height: 1.05,
    states: [
      { id: 'stand', name: 'Standing' },
      { id: 'graze', name: 'Head down, eating' },
      { id: 'walk', name: 'Walking' },
      { id: 'stare', name: 'Watching you' },
    ],
  },
  turkey: {
    spec: turkeySpec,
    pose: turkeyPose,
    height: 1.3,
    states: [
      { id: 'judge', name: 'Judging you (the Aunt June look)' },
      { id: 'display', name: 'Fanned and strutting' },
      { id: 'peck', name: 'Pecking' },
    ],
  },
  python: {
    spec: pythonSpec,
    pose: pythonPose,
    height: 0.6,
    states: [
      { id: 'coiled', name: 'Coiled (in its tank)' },
      { id: 'watch', name: 'Watching you' },
    ],
  },
};
