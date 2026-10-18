// The giant beetle (Session 13; DESIGN.md "Giant beetles"): the Mothman's
// brood. About 1.3 m long, built low and wide: a heavy glossy black-green
// carapace, a rhinoceros horn, two hooked mandibles, six spiny jointed legs,
// wing cases that crack open in a threat display. Its weak spot is the soft
// membrane between its mandibles: pale, wet, faintly glowing so it can be
// found in the dark (the only place a shot does full damage). A cluster of
// small red eyes, the Mothman's red.
//
// Built with the figure kit on its own skeleton, at its real size (height
// 1.7 / 1.7: the kit's scale is left at 1). Model space: faces +z, feet at
// y = 0, its right side on -x.

const SIDES = [
  ['R', -1],
  ['L', 1],
];
// Each leg pair: where it meets the thorax (z), and how its knee and foot
// reach forward (+) or back (-): the front pair reaching ahead, the back
// pair swept well back (a beetle's, low and braced: not a spider's stilts).
const LEGS = [
  [0.3, 0.12, 0.26],
  [0.12, -0.02, -0.06],
  [-0.06, -0.2, -0.4],
];

function joints() {
  const j = [
    ['root', null, 0, 0, 0],
    ['thorax', 'root', 0, 0.42, 0.14],
    ['abdomen', 'thorax', 0, 0.44, -0.04],
    ['head', 'thorax', 0, 0.4, 0.42],
    ['mandR', 'head', -0.07, 0.33, 0.6],
    ['mandL', 'head', 0.07, 0.33, 0.6],
    ['elytraR', 'thorax', -0.04, 0.58, 0.14],
    ['elytraL', 'thorax', 0.04, 0.58, 0.14],
  ];
  for (const [n, s] of SIDES) {
    LEGS.forEach(([z, kz, fz], i) => {
      j.push([`hip${n}${i}`, 'thorax', s * 0.16, 0.36, z]);
      j.push([`knee${n}${i}`, `hip${n}${i}`, s * 0.34, 0.38, z + kz]);
      j.push([`foot${n}${i}`, `knee${n}${i}`, s * 0.46, 0, z + fz]);
    });
  }
  return j;
}

export const BEETLE_JOINTS = joints();
export const LEG_NAMES = SIDES.flatMap(([n, s]) => LEGS.map((_, i) => ({ hip: `hip${n}${i}`, knee: `knee${n}${i}`, side: s, pair: i })));

// The figure-kit spec. beetle: config.beetles.giant.
export function beetleSpec(beetle) {
  const masses = [
    // The pronotum (the thorax's shield) and the head behind its horn.
    ['thorax', null, 0, 0.45, 0.24, 0.22, 0.12, 0.18, 'shell'],
    ['head', null, 0, 0.38, 0.48, 0.13, 0.1, 0.11, 'shell'],
    // The abdomen, under the wing cases, and its pale ridged underside.
    ['abdomen', null, 0, 0.4, -0.22, 0.27, 0.15, 0.42, 'belly'],
    // The wing cases: two domed halves meeting down its back (they open to threaten).
    ['elytraR', null, -0.1, 0.5, -0.2, 0.17, 0.14, 0.45, 'shell'],
    ['elytraL', null, 0.1, 0.5, -0.2, 0.17, 0.14, 0.45, 'shell'],
    // The weak spot: a soft membrane between the mandibles.
    ['head', null, 0, 0.33, 0.57, 0.06, 0.05, 0.03, 'spot'],
    // Eyes: a cluster of red glints each side.
    ['head', null, -0.095, 0.42, 0.52, 0.02, 0.02, 0.02, 'eyes'],
    ['head', null, -0.08, 0.44, 0.55, 0.014, 0.014, 0.014, 'eyes'],
    ['head', null, 0.095, 0.42, 0.52, 0.02, 0.02, 0.02, 'eyes'],
    ['head', null, 0.08, 0.44, 0.55, 0.014, 0.014, 0.014, 'eyes'],
  ];
  const tubes = [
    // The horn, big and curving up and forward (a rhinoceros beetle's).
    ['head', 0, 0.42, 0.5, 0, 0.56, 0.62, 0.05, 0.035, 'shell'],
    ['head', 0, 0.56, 0.62, 0, 0.7, 0.68, 0.035, 0.018, 'shell'],
    ['head', 0, 0.7, 0.68, 0, 0.78, 0.66, 0.018, 0.003, 'shell'],
    // The mandibles, hooked in toward each other.
    ['mandR', -0.07, 0.33, 0.6, -0.05, 0.32, 0.7, 0.026, 0.016, 'shellDark'],
    ['mandR', -0.05, 0.32, 0.7, -0.01, 0.31, 0.76, 0.016, 0.004, 'shellDark'],
    ['mandL', 0.07, 0.33, 0.6, 0.05, 0.32, 0.7, 0.026, 0.016, 'shellDark'],
    ['mandL', 0.05, 0.32, 0.7, 0.01, 0.31, 0.76, 0.016, 0.004, 'shellDark'],
  ];
  const limbs = [];
  for (const [n] of SIDES) {
    for (let i = 0; i < LEGS.length; i++) {
      limbs.push([`hip${n}${i}`, `knee${n}${i}`, 0.05, 0.04, 'shellDark', 0.25]);
      limbs.push([`knee${n}${i}`, `foot${n}${i}`, 0.038, 0.016, 'shellDark', 0.15]);
    }
  }
  // Spines on the lower legs.
  const j = Object.fromEntries(BEETLE_JOINTS.map(([name, , x, y, z]) => [name, [x, y, z]]));
  for (const [n] of SIDES) {
    for (let i = 0; i < LEGS.length; i++) {
      const k = j[`knee${n}${i}`];
      const f = j[`foot${n}${i}`];
      for (const t of [0.35, 0.65]) {
        const p = [k[0] + (f[0] - k[0]) * t, k[1] + (f[1] - k[1]) * t, k[2] + (f[2] - k[2]) * t];
        tubes.push([`knee${n}${i}`, p[0], p[1], p[2], p[0], p[1] + 0.05, p[2] - 0.02, 0.008, 0.001, 'shellDark']);
      }
    }
  }
  return {
    joints: BEETLE_JOINTS,
    masses,
    limbs,
    tubes,
    rings: [],
    height: 1.7, // built at its real size
    width: 1,
    head: 1,
    colours: beetle.colours,
    glow: { spot: beetle.spotGlow, eyes: beetle.eyeGlow },
    // The shell's ridges: faint lines down the wing cases and across the pronotum.
    paint(key, q, out) {
      if (key !== 'shell' && key !== 'belly') return;
      if (key === 'belly') {
        if (Math.abs(Math.sin(q.z * 46)) < 0.2) out.multiplyScalar(0.7); // the underside's segments
        return;
      }
      if (q.y > 0.5 && Math.abs(Math.abs(q.x) - 0.12) < 0.012) out.multiplyScalar(0.6);
      if (Math.abs(q.x) < 0.01 && q.z < 0.1) out.multiplyScalar(0.5); // the seam between the wing cases
    },
  };
}
