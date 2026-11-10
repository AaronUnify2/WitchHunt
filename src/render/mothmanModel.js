// The Mothman (Session 24; DESIGN.md "The Mothman"): a tall, gaunt, dark
// man-shape, about 2.3 m, furred like a moth: a thick ruff round the
// shoulders with the head sunk into it (no neck to speak of), feathery
// antennae swept back, long thin arms that end in claws, clawed feet. Two
// pairs of dusty moth wings, about 5 m across: the forewings long and
// scalloped, the hindwings rounder, each with a faint eye-spot (rust and
// ash: they show when he mantles). The only bright thing on him is his
// eyes: big, round and red, glowing through the fog (the renderer's shader).
//
// Built with the figure kit on his own skeleton, at his real size (the
// kit's scale left at 1). Model space: faces +z, feet at y = 0, his right
// side on -x. The wings are built spread flat to the sides (as a pinned
// moth's): a wing bone turned about y closes them behind his back (and, in
// flight, beats them); about z sweeps them down along his body.

import * as THREE from 'three';

const SIDES = [
  ['R', -1],
  ['L', 1],
];

// Where the wings hinge on his back, and where the forewing's outer bone starts.
const FORE_ROOT = [0.14, 1.78, -0.15];
const FORE_MID = [1.2, 2.2, -0.15];
const HIND_ROOT = [0.12, 1.52, -0.17];
const FORE_SPAN = 2.5; // metres out from its root to the tip

function joints() {
  const j = [
    ['root', null, 0, 0, 0],
    ['hips', 'root', 0, 1.12, 0],
    ['spine', 'hips', 0, 1.38, 0],
    ['chest', 'spine', 0, 1.64, 0.02],
    ['neck', 'chest', 0, 1.9, 0.05], // only a pivot: the head sits in the ruff
    ['head', 'neck', 0, 1.98, 0.08],
  ];
  for (const [n, s] of SIDES) {
    j.push([`ant${n}`, 'head', s * 0.07, 2.2, 0.12]);
    j.push([`shoulder${n}`, 'chest', s * 0.27, 1.86, 0]);
    j.push([`elbow${n}`, `shoulder${n}`, s * 0.32, 1.38, 0]);
    j.push([`wrist${n}`, `elbow${n}`, s * 0.33, 0.92, 0.04]);
    j.push([`hip${n}`, 'hips', s * 0.13, 1.1, 0]);
    j.push([`knee${n}`, `hip${n}`, s * 0.15, 0.6, 0.06]);
    j.push([`ankle${n}`, `knee${n}`, s * 0.14, 0.15, -0.06]);
    j.push([`toe${n}`, `ankle${n}`, s * 0.14, 0.03, 0.08]);
    j.push([`wing${n}`, 'chest', s * FORE_ROOT[0], FORE_ROOT[1], FORE_ROOT[2]]);
    j.push([`wing${n}2`, `wing${n}`, s * FORE_MID[0], FORE_MID[1], FORE_MID[2]]);
    j.push([`hind${n}`, 'chest', s * HIND_ROOT[0], HIND_ROOT[1], HIND_ROOT[2]]);
  }
  return j;
}

export const MOTHMAN_JOINTS = joints();

// ---- the wings' shapes (u: 0 at the root, 1 at the tip; v: 0 at the leading edge, 1 at the trailing) ----

// The forewing: a long leading edge rising to the tip, the chord widest a
// third of the way out, the trailing edge scalloped. Returns [x, y] from its root.
export function forewingPoint(u, v) {
  const lx = u * FORE_SPAN;
  const ly = 0.95 * u - 0.28 * u * u;
  const chord = (0.5 + 0.62 * Math.sin(Math.PI * Math.pow(u, 0.8))) * (1 - Math.pow(u, 6)) * (1 - 0.07 * Math.abs(Math.sin(u * Math.PI * 5)));
  return [lx - v * chord * 0.22, ly - v * chord * 0.97];
}

// The hindwing: a rounded fan, out and down from its root (u round the fan,
// from just under the forewing to straight down; v out along it).
export function hindwingPoint(u, v) {
  const angle = -0.12 - u * 1.5; // radians from straight out
  const reach = 1.4 * (0.72 + 0.28 * Math.sin(Math.PI * Math.pow(u, 0.85))) * (1 - 0.08 * Math.abs(Math.sin(u * Math.PI * 4)));
  return [Math.cos(angle) * reach * v, Math.sin(angle) * reach * v];
}

// One wing as a thin two-faced sheet with uv = (u, v). side: -1 his right, 1 his left.
function wingSheet(point, root, side, nu, nv) {
  const positions = [];
  const uvs = [];
  const index = [];
  const thick = 0.004;
  for (const face of [1, -1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= nu; i++) {
      for (let k = 0; k <= nv; k++) {
        const u = i / nu;
        const v = k / nv;
        const [x, y] = point(u, v);
        positions.push(side * (root[0] + x), root[1] + y, root[2] + face * thick);
        uvs.push(u, v);
      }
    }
    for (let i = 0; i < nu; i++) {
      for (let k = 0; k < nv; k++) {
        const a = base + i * (nv + 1) + k;
        const b = a + nv + 1;
        // Wound so each face's normal points out (front +z, back -z), whichever side it's on.
        if (face * side > 0) index.push(a, a + 1, b, b, a + 1, b + 1);
        else index.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

const FURRED = new Set(['hips', 'spine', 'chest', 'neck', 'head']);

// ---- the paint ---------------------------------------------------------------------------------

const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// A wing's pattern: veins fanning from the root, a darker trailing edge, a
// dusty band, and the eye-spot (a dark pupil, a rust iris, an ash ring).
function paintWing(out, colours, uv, spot) {
  const { x: u, y: v } = uv;
  const vein = Math.abs(Math.sin(u * Math.PI * spot.veins));
  if (vein < 0.16) out.multiplyScalar(0.72);
  out.lerp(colours.dust, 0.3 * smooth(0.07, 0, Math.abs(v - spot.band)) * smooth(0.05, 0.3, u));
  out.multiplyScalar(1 - 0.45 * smooth(0.78, 1, v));
  const d = Math.hypot((u - spot.u) * spot.stretch, v - spot.v) / spot.size;
  if (d < 1.25) {
    if (d < 0.38) out.copy(colours.claw);
    else if (d < 0.85) out.lerp(colours.spot, 0.9);
    else if (d < 1.05) out.lerp(colours.dust, 0.8);
    else out.multiplyScalar(0.6);
  }
}

const FORE_SPOT = { u: 0.6, v: 0.55, size: 0.15, stretch: 2.5, veins: 9, band: 0.74 };
const HIND_SPOT = { u: 0.42, v: 0.6, size: 0.2, stretch: 1.0, veins: 7, band: 0.86 };

// The figure-kit spec. m: config.mothman.
export function mothmanSpec(m) {
  const masses = [
    // The hips and a narrow waist, a deep chest: gaunt.
    ['hips', 'spine', 0, 1.18, 0, 0.19, 0.2, 0.15, 'fur'],
    ['spine', 'chest', 0, 1.42, 0.01, 0.17, 0.24, 0.14, 'belly'],
    ['chest', null, 0, 1.68, 0.03, 0.27, 0.25, 0.2, 'fur'],
    // The hump of his back between the wings.
    ['chest', null, 0, 1.74, -0.1, 0.2, 0.24, 0.12, 'furDark'],
    // The ruff: thick fur round the shoulders and up over where a neck would be.
    ['chest', 'neck', 0, 1.9, 0.03, 0.36, 0.17, 0.26, 'ruff'],
    ['chest', 'neck', 0, 1.97, 0.0, 0.25, 0.14, 0.22, 'ruff'],
    // The head, low in the ruff, and a short blunt muzzle.
    ['head', null, 0, 2.08, 0.1, 0.15, 0.165, 0.16, 'fur'],
    ['head', null, 0, 1.99, 0.2, 0.055, 0.05, 0.06, 'furDark'],
  ];
  // Shaggy tufts: a ring hanging from the ruff, a shorter one down his
  // chest, a crest down the back of his head.
  const tufts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2;
    const x = Math.sin(a);
    const z = Math.cos(a);
    const long = 0.2 + 0.08 * Math.abs(Math.sin(i * 2.3));
    tufts.push(['chest', x * 0.3, 1.9, 0.03 + z * 0.21, x * 0.37, 1.9 - long, 0.03 + z * 0.27, 0.07, 0.004, 'ruff']);
  }
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * 0.07;
    tufts.push(['chest', x, 1.72, 0.17, x * 1.15, 1.5 - 0.04 * Math.abs(Math.sin(i * 1.9)), 0.2, 0.05, 0.004, 'fur']);
    tufts.push(['chest', x, 1.8, -0.17, x * 1.2, 1.5, -0.24, 0.055, 0.004, 'furDark']);
  }
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.05;
    tufts.push(['head', x, 2.18, -0.02, x * 1.3, 2.12 - 0.02 * i, -0.2, 0.04, 0.004, 'ruff']);
  }
  for (const side of [-1, 1]) tufts.push(['head', side * 0.12, 2.04, 0.12, side * 0.21, 1.93, 0.1, 0.04, 0.004, 'ruff']); // cheeks
  const limbs = [];
  const tubes = [...tufts];
  const sheets = [];
  for (const [n, s] of SIDES) {
    masses.push(['chest', null, s * 0.27, 1.86, -0.01, 0.12, 0.11, 0.12, 'ruff']); // the shoulder
    // The eyes: big, round, set wide.
    masses.push(['head', null, s * 0.085, 2.1, 0.215, 0.058, 0.064, 0.04, 'eyes']);
    // The hands, long and narrow.
    masses.push([`wrist${n}`, null, s * 0.33, 0.87, 0.05, 0.04, 0.075, 0.03, 'furDark']);
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.065, 0.045, 'fur', 0.12]);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.045, 0.028, 'furDark', 0.08]);
    limbs.push([`hip${n}`, `knee${n}`, 0.1, 0.06, 'fur', 0.2]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.058, 0.034, 'furDark', 0.1]);
    limbs.push([`ankle${n}`, `toe${n}`, 0.04, 0.03, 'furDark', 0]);
    // The forewing's leading edge: an arm of bone under the membrane.
    limbs.push([`wing${n}`, `wing${n}2`, 0.035, 0.024, 'furDark', 0]);
    const tip = forewingPoint(1, 0);
    tubes.push([`wing${n}2`, s * FORE_MID[0], FORE_MID[1], FORE_MID[2], s * (FORE_ROOT[0] + tip[0]), FORE_ROOT[1] + tip[1], FORE_ROOT[2], 0.024, 0.004, 'furDark']);
    // Claws: three to a hand, three to a foot.
    for (const [dx, dz] of [[-0.03, 0.02], [0, 0.04], [0.03, 0.02]]) {
      tubes.push([`wrist${n}`, s * 0.33 + dx, 0.81, 0.05 + dz * 0.5, s * 0.33 + dx * 1.6, 0.66, 0.07 + dz, 0.012, 0.002, 'claw']);
      tubes.push([`toe${n}`, s * 0.14 + dx, 0.035, 0.08, s * 0.14 + dx * 2.2, 0.01, 0.2 + dz, 0.014, 0.003, 'claw']);
    }
    // The antennae: swept up and back, feathered with barbs.
    const stem = [
      [s * 0.07, 2.2, 0.12],
      [s * 0.17, 2.4, 0.06],
      [s * 0.24, 2.5, -0.1],
      [s * 0.27, 2.5, -0.3],
    ];
    for (let i = 0; i < stem.length - 1; i++) {
      const a = stem[i];
      const b = stem[i + 1];
      tubes.push([`ant${n}`, ...a, ...b, 0.014 - i * 0.003, 0.011 - i * 0.003, 'furDark']);
      for (const t of [0.15, 0.5, 0.85]) {
        const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
        const len = 0.1 - i * 0.02;
        tubes.push([`ant${n}`, ...p, p[0] + s * len, p[1] - len * 0.3, p[2] - len * 0.4, 0.006, 0.001, 'ruff']);
        tubes.push([`ant${n}`, ...p, p[0] - s * len * 0.8, p[1] + len * 0.2, p[2] - len * 0.4, 0.006, 0.001, 'ruff']);
      }
    }
    sheets.push({
      bone: `wing${n}`,
      other: `wing${n}2`,
      geometry: wingSheet(forewingPoint, FORE_ROOT, s, 30, 12),
      key: 'fore',
      from: [s * (FORE_ROOT[0] + 0.7), FORE_ROOT[1], FORE_ROOT[2]],
      to: [s * (FORE_ROOT[0] + 1.7), FORE_ROOT[1], FORE_ROOT[2]],
    });
    sheets.push({
      bone: `hind${n}`,
      geometry: wingSheet(hindwingPoint, HIND_ROOT, s, 20, 10),
      key: 'hind',
      from: HIND_ROOT,
      to: HIND_ROOT,
    });
  }
  return {
    joints: MOTHMAN_JOINTS,
    masses,
    limbs,
    tubes,
    sheets,
    rings: [],
    height: 1.7, // built at his real size
    width: 1,
    head: 1,
    colours: { ...m.colours, fore: m.colours.wing, hind: m.colours.wing },
    glow: { eyes: m.eyeGlow },
    // Fur, not skin: the body's surface lumped and ragged.
    deform(q, n, bone) {
      if (!FURRED.has(bone)) return 0;
      if (q.z > 0.16 && q.y > 2.02 && q.y < 2.18 && Math.abs(q.x) > 0.02) return 0; // not his eyes
      return 0.014 * Math.sin(q.x * 43 + q.y * 31) * Math.sin(q.z * 39 - q.y * 23) + 0.008 * Math.sin(q.y * 90 + q.x * 70);
    },
    paint(key, q, out, colours, uv) {
      if (key === 'fore') paintWing(out, colours, uv, FORE_SPOT);
      else if (key === 'hind') paintWing(out, colours, uv, HIND_SPOT);
      else if (key === 'belly') {
        if (Math.abs(Math.sin(q.y * 34)) < 0.25) out.multiplyScalar(0.72); // a moth's banded body
      } else if (key === 'fur' || key === 'ruff') {
        // Fur: clumps, lighter and darker.
        out.multiplyScalar(0.82 + 0.3 * Math.abs(Math.sin(q.x * 61 + q.y * 47) * Math.sin(q.z * 53 - q.y * 29)));
      }
    },
  };
}
