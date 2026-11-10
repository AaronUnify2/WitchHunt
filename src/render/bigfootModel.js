// Bigfoot (Session 24; DESIGN.md "Bigfoot cave"): Earl's Bigfoot, the
// land's guardian. Friendly; he can't be harmed. About 2.6 m: a huge
// shaggy man-shape in dark red-brown hair, a domed head with a heavy brow
// and no neck, a broad dark face with calm deep-set eyes, arms to his
// knees, big hands and feet. He's a person with a culture (his cave is
// full of what he's made), so he wears some of it: a necklace of bone and
// stone beads with a carved pendant, a woven band on one wrist.
//
// And the cocoon the Mothman keeps him in: a tall pod of grey silk hung
// from the rock by ropes of it, with a seam down the front where it's
// thinnest (his face and fur show through the strands). Tom cuts it open.
//
// The figure kit's spec and his poses (for render/PosedFigure.js), and
// buildCocoon(). Model space: faces +z, feet at y = 0, right side on -x;
// built in the kit's 1.7 m scale and stretched to his height.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { arm, legsWalk, legsKneel } from './PosedFigure.js';
import { noise3 } from './propKit.js';

const SIDES = [
  ['R', -1],
  ['L', 1],
];

// His own skeleton: a long trunk, short legs, arms to the knees.
function joints() {
  const j = [
    ['root', null, 0, 0, 0],
    ['hips', 'root', 0, 0.86, 0],
    ['spine', 'hips', 0, 1.04, 0],
    ['chest', 'spine', 0, 1.26, 0.01],
    ['neck', 'chest', 0, 1.42, 0.03],
    ['head', 'neck', 0, 1.47, 0.05],
  ];
  for (const [n, s] of SIDES) {
    j.push([`shoulder${n}`, 'chest', s * 0.25, 1.37, 0]);
    j.push([`elbow${n}`, `shoulder${n}`, s * 0.3, 1.02, 0]);
    j.push([`wrist${n}`, `elbow${n}`, s * 0.31, 0.68, 0.03]);
    j.push([`hip${n}`, 'hips', s * 0.12, 0.84, 0]);
    j.push([`knee${n}`, `hip${n}`, s * 0.13, 0.46, 0.02]);
    j.push([`ankle${n}`, `knee${n}`, s * 0.13, 0.08, -0.02]);
  }
  return j;
}

export const BIGFOOT_JOINTS = joints();

const HAIRY = new Set(['hips', 'spine', 'chest', 'neck', 'shoulderR', 'shoulderL', 'elbowR', 'elbowL', 'hipR', 'hipL', 'kneeR', 'kneeL']);

// b: config.bigfoot.
export function bigfootSpec(b) {
  const masses = [
    // A barrel of a trunk, a belly, heavy shoulders rising straight into the head.
    ['hips', 'spine', 0, 0.9, 0, 0.21, 0.17, 0.17, 'hair'],
    ['spine', 'chest', 0, 1.1, 0.02, 0.23, 0.2, 0.19, 'hair'],
    ['chest', null, 0, 1.3, 0.01, 0.27, 0.19, 0.19, 'hair'],
    ['chest', 'neck', 0, 1.42, -0.02, 0.2, 0.1, 0.15, 'hairDark'], // the hump of the shoulders
    // The head: a tall dome (the crest), set forward on the shoulders.
    ['head', null, 0, 1.56, 0.04, 0.115, 0.15, 0.125, 'hair'],
    ['head', null, 0, 1.655, -0.005, 0.1, 0.075, 0.11, 'hair'], // the crest
    // The face: dark bare skin, a heavy brow, a broad flat nose, a wide mouth.
    ['head', null, 0, 1.53, 0.115, 0.085, 0.095, 0.05, 'skin'],
    ['head', null, 0, 1.585, 0.14, 0.1, 0.024, 0.035, 'hairDark'], // the brow ridge
    ['head', null, 0, 1.525, 0.165, 0.032, 0.03, 0.022, 'skin'], // the nose
    ['head', null, 0, 1.475, 0.15, 0.05, 0.012, 0.016, 'mouth'],
    ['head', null, 0, 1.445, 0.11, 0.075, 0.05, 0.05, 'hair'], // the beard, down onto his chest
  ];
  const limbs = [];
  const tubes = [];
  for (const [n, s] of SIDES) {
    masses.push(['chest', `shoulder${n}`, s * 0.24, 1.38, 0, 0.11, 0.1, 0.11, 'hair']);
    // The eyes: small, dark, deep under the brow, a glint of warm brown.
    masses.push(['head', null, s * 0.04, 1.557, 0.158, 0.017, 0.013, 0.008, 'eyes']);
    // Hands like shovels, bare-palmed; feet to match.
    masses.push([`wrist${n}`, null, s * 0.31, 0.61, 0.04, 0.045, 0.085, 0.035, 'skin']);
    masses.push([`ankle${n}`, null, s * 0.13, 0.04, 0.07, 0.075, 0.042, 0.17, 'skin']);
    limbs.push([`shoulder${n}`, `elbow${n}`, 0.095, 0.075, 'hair', 0.18]);
    limbs.push([`elbow${n}`, `wrist${n}`, 0.078, 0.055, 'hair', 0.15]);
    limbs.push([`hip${n}`, `knee${n}`, 0.13, 0.095, 'hair', 0.2]);
    limbs.push([`knee${n}`, `ankle${n}`, 0.095, 0.065, 'hair', 0.15]);
    // Fingers and toes.
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * 0.022;
      tubes.push([`wrist${n}`, s * 0.31 + dx, 0.55, 0.045, s * 0.31 + dx * 1.2, 0.47, 0.06, 0.013, 0.009, 'skin']);
      tubes.push([`ankle${n}`, s * 0.13 + dx * 1.6, 0.03, 0.2, s * 0.13 + dx * 1.9, 0.02, 0.27, 0.018, 0.012, 'skin']);
    }
    // Shaggy hair: long hanks off the forearms and the shoulders, and down the shins.
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      tubes.push([`elbow${n}`, s * (0.3 + 0.06), 1.0 - t * 0.28, -0.02 + (i % 2) * 0.04, s * (0.3 + 0.09), 0.86 - t * 0.28, -0.05, 0.035, 0.003, i % 2 ? 'hair' : 'hairDark']);
      tubes.push([`shoulder${n}`, s * (0.25 + 0.08), 1.34 - t * 0.22, -0.03 + (i % 2) * 0.05, s * (0.25 + 0.12), 1.2 - t * 0.22, -0.06, 0.04, 0.003, i % 2 ? 'hairDark' : 'hair']);
      tubes.push([`knee${n}`, s * (0.13 + 0.07), 0.42 - t * 0.24, -0.03 + (i % 2) * 0.04, s * (0.13 + 0.09), 0.3 - t * 0.24, -0.06, 0.035, 0.003, i % 2 ? 'hair' : 'hairDark']);
    }
  }
  // Hanks all over his trunk, no two alike, lying downward.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 80; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.84 + rand() * 0.58;
    const bone = y > 1.22 ? 'chest' : y > 1.02 ? 'spine' : 'hips';
    const girth = 0.86 + 0.14 * Math.sin(((y - 0.84) / 0.58) * Math.PI);
    const x = Math.sin(a) * 0.235 * girth;
    const z = Math.cos(a) * 0.175 * girth;
    const len = 0.1 + rand() * 0.16;
    tubes.push([bone, x * 0.9, y, z * 0.9, x * 1.16, y - len, z * 1.2, 0.028 + rand() * 0.022, 0.003, rand() < 0.5 ? 'hair' : 'hairDark']);
  }
  // What he's made and wears: a necklace of beads (bone, river stone, red
  // seed) lying on his chest with a carved pendant; a woven band on his left wrist.
  const rings = [['elbowL', 0.308, 0.74, 0.025, 0.062, 0.012, 'weave', [Math.PI / 2, 0, 0]]];
  const beads = ['bone', 'stone', 'seed', 'bone', 'stone', 'bone', 'seed', 'stone', 'bone', 'stone', 'seed', 'bone', 'stone'];
  beads.forEach((key, i) => {
    const a = ((i - 6) / 6) * 1.25; // round the front of his neck, hanging to a point
    const x = Math.sin(a) * 0.17;
    const y = 1.4 - Math.cos(a) * 0.13;
    masses.push(['chest', null, x, y, 0.185 + Math.cos(a) * 0.03, 0.014, 0.014, 0.012, key]);
  });
  masses.push(['chest', null, 0, 1.235, 0.215, 0.022, 0.032, 0.008, 'bone']); // the pendant: a carved tooth
  return {
    joints: BIGFOOT_JOINTS,
    masses,
    limbs,
    tubes,
    rings,
    height: b.height,
    width: b.width,
    head: 1,
    colours: b.colours,
    glow: { eyes: b.eyeGlint },
    paint(key, q, out) {
      if (key === 'hair' || key === 'hairDark') {
        // Long hair lying downward: streaks, lighter and darker.
        out.multiplyScalar(0.78 + 0.34 * noise3(q.x * 38, q.y * 6, q.z * 38));
      } else if (key === 'weave') {
        if (Math.sin(Math.atan2(q.z - 0.025, q.x - 0.308) * 8) > 0) out.multiplyScalar(0.6);
      }
    },
    // Hair, not skin: lumped and ragged everywhere it grows.
    deform(q, n, bone) {
      if (!HAIRY.has(bone)) return 0;
      return 0.032 * (noise3(q.x * 11, q.y * 7, q.z * 11) - 0.4);
    },
  };
}

// ---- his poses ---------------------------------------------------------------------------------

// m.state: 'bound' (in the cocoon), 'slump' (cut free: down on his hands
// and knees), 'kneel' (getting his breath), 'stand', 'walk', 'give' (the
// Blessing, held out in both hands), 'thanks' (a hand to his chest, his
// head bowed), 'sit' (at home, cross-legged, working at something small).
export function bigfootPose(h, m, t) {
  const breathe = Math.sin(t * 0.9);
  const look = Math.max(-0.9, Math.min(0.9, m.look ?? 0));
  switch (m.state) {
    case 'bound': {
      // Held upright by the silk: arms pinned to his sides, head hung, breathing slow.
      for (const [n] of SIDES) {
        arm(h, n, 0.05, -0.04, 0.12);
        h.set(`hip${n}`, 0.03);
        h.set(`knee${n}`, 0.1);
      }
      h.set('spine', 0.06 + breathe * 0.015);
      h.set('chest', 0.05 + breathe * 0.02);
      h.set('neck', 0.3);
      h.set('head', 0.32 + Math.sin(t * 0.33) * 0.03, 0.18, 0.1);
      break;
    }
    case 'slump': {
      // Out of it and onto his hands and knees, heaving for breath.
      const heave = Math.sin(t * 2.6);
      h.set('hips', 0.5);
      h.set('spine', 0.45 + heave * 0.04);
      h.set('chest', 0.3 + heave * 0.05);
      h.set('neck', -0.2);
      h.set('head', 0.25 + heave * 0.03);
      for (const [n, s] of SIDES) {
        arm(h, n, 1.25, 0.12, 0.12);
        h.set(`wrist${n}`, -1.0, 0, 0);
        h.set(`hip${n}`, -0.75, 0, s * 0.1);
        h.set(`knee${n}`, 1.9);
        h.set(`ankle${n}`, 0.7);
      }
      h.rise(-0.5 * h.k);
      break;
    }
    case 'kneel':
      legsKneel(h, 0.4);
      h.set('spine', 0.2 + breathe * 0.03);
      h.set('chest', 0.12 + breathe * 0.03);
      h.set('neck', -0.15, look * 0.6);
      h.set('head', -0.05, look * 0.4);
      arm(h, 'R', 0.2, 0.08, 0.2);
      arm(h, 'L', 0.95, -0.1, 0.9); // a hand on his raised knee
      break;
    case 'walk': {
      // A long, rolling stride, the arms swinging wide.
      const s = (m.walked ?? 0) * 3.2;
      legsWalk(h, s, 0.5, 0.75);
      h.set('spine', 0.12, Math.sin(s) * 0.06);
      h.set('chest', 0.06, -Math.sin(s) * 0.14);
      h.set('neck', 0, look);
      arm(h, 'R', -Math.sin(s) * 0.55, 0.1, 0.3 + Math.max(0, -Math.sin(s)) * 0.3);
      arm(h, 'L', Math.sin(s) * 0.55, 0.1, 0.3 + Math.max(0, Math.sin(s)) * 0.3);
      break;
    }
    case 'give': {
      // Both hands held out, cupped, low enough for Tom: the Blessing in them.
      h.set('spine', 0.22);
      h.set('chest', 0.12);
      h.set('neck', -0.05, look * 0.4);
      h.set('head', 0.22);
      for (const [n, s] of SIDES) {
        arm(h, n, 0.75, -0.22, 0.95, -0.2);
        h.set(`wrist${n}`, 0.5, 0, s * 0.5);
        h.set(`hip${n}`, -0.25);
        h.set(`knee${n}`, 0.5);
        h.set(`ankle${n}`, -0.25);
      }
      h.rise(-0.07 * h.k);
      break;
    }
    case 'thanks':
      // A hand flat on his chest, his head bowed to you.
      h.set('spine', 0.14);
      h.set('chest', 0.1 + breathe * 0.015);
      h.set('neck', 0.22);
      h.set('head', 0.3);
      arm(h, 'R', 0.55, -0.5, 2.1, -0.3);
      arm(h, 'L', 0.05, 0.06, 0.15);
      break;
    case 'sit': {
      // Cross-legged on the cave floor, turning something small over in his hands.
      const work = Math.sin(t * 2.2);
      for (const [n, s] of SIDES) {
        h.set(`hip${n}`, -1.45, s * 0.25, s * 0.75);
        h.set(`knee${n}`, 2.25);
        arm(h, n, 0.55, -0.3, 1.35 + (n === 'R' ? work : -work) * 0.06, -0.3);
        h.set(`wrist${n}`, 0.3 + (n === 'R' ? work : -work) * 0.15, 0, s * 0.4);
      }
      h.set('spine', 0.2);
      h.set('chest', 0.14 + breathe * 0.015);
      h.set('neck', 0.12, look * 0.5);
      h.set('head', 0.3 - Math.abs(look) * 0.3, look * 0.4);
      h.rise(-0.7 * h.k);
      break;
    }
    default:
      // Standing easy, looking at you: slow breath, a slight sway, his weight on one leg.
      h.set('hips', 0, 0, 0.03);
      h.set('spine', 0.1 + breathe * 0.012, 0, -0.03);
      h.set('chest', 0.05 + breathe * 0.018);
      h.set('neck', 0.02, look * 0.6);
      h.set('head', 0.1 + Math.sin(t * 0.37) * 0.03, look * 0.4, Math.sin(t * 0.21) * 0.05);
      arm(h, 'R', 0.08 + breathe * 0.01, 0.1, 0.22);
      arm(h, 'L', 0.06, 0.1, 0.18);
      h.set('kneeL', 0.12);
      h.set('hipL', -0.06);
      break;
  }
}

// ---- the cocoon --------------------------------------------------------------------------------

// A pod of silk big enough to hold him standing. open: 0 sealed (a seam
// down the front, laced with strands: he shows through), 1 cut (the front
// laid open, the cut edges hanging). Returns { group, mesh, dispose }: one
// mesh, both sides drawn (you see into it). c: config.bigfoot.cocoon.
export function buildCocoon(c, open = 0) {
  const colours = { silk: new THREE.Color(c.colours.silk), dark: new THREE.Color(c.colours.silkDark), rope: new THREE.Color(c.colours.rope) };
  const parts = [];
  const H = c.height;
  const R = c.radius;
  const paint = (g, shade) => {
    const pos = g.getAttribute('position');
    const cols = new Float32Array(pos.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      shade(col, x, y, z);
      col.toArray(cols, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const flat = g.index ? g.toNonIndexed() : g;
    flat.computeVertexNormals();
    parts.push(flat);
  };
  // The shell: a tall teardrop, lumpy, wound round and round (darker bands), the seam at the front (+z).
  const gap = 0.22 + open * 1.25; // radians either side of the front left open
  const profile = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const r = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.6) * (1 - 0.25 * t);
    profile.push(new THREE.Vector2(Math.max(0.02, r), t * H));
  }
  const shell = new THREE.LatheGeometry(profile, 30, gap, Math.PI * 2 - gap * 2); // the gap about +z (the lathe starts there)
  const sp = shell.getAttribute('position');
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i);
    const y = sp.getY(i);
    const z = sp.getZ(i);
    const k = 1 + 0.26 * (noise3(x * 2.2 + 5, y * 1.6, z * 2.2) - 0.5) + 0.05 * Math.sin(y * 9 + Math.atan2(x, z) * 2);
    // Cut open, the edges by the seam sag outward.
    const a = Math.atan2(x, z);
    const edge = Math.max(0, 1 - (Math.abs(a) - gap) / 0.5);
    const sag = open * edge * 0.25 * Math.sin(Math.PI * (y / H));
    sp.setXYZ(i, x * k + Math.sin(a) * sag, y - open * edge * 0.12, z * k + Math.cos(a) * sag);
  }
  paint(shell, (col, x, y, z) => {
    const wound = Math.sin(y * 9 + Math.atan2(x, z) * 2 + noise3(x * 3, y * 3, z * 3) * 3);
    col.copy(colours.silk).lerp(colours.dark, 0.25 + 0.3 * Math.max(0, wound) + 0.35 * noise3(x * 1.3, y * 0.9, z * 1.3));
    col.multiplyScalar(0.75 + 0.25 * Math.min(1, y / 0.6)); // dirtier at the foot
  });
  const strand = (a, b, r0, r1, key) => {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 5, 1).translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())).translate(a.x, a.y, a.z);
    paint(g, (col) => col.copy(colours[key]));
  };
  const onShell = (angle, t, out = 1) => {
    const r = R * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.6) * (1 - 0.25 * t) * out;
    return new THREE.Vector3(Math.sin(angle) * r, t * H, Math.cos(angle) * r);
  };
  // Sealed: the seam's laced shut with strands, criss-cross. Cut: what's left of them hangs from the edges.
  for (let i = 0; i < 16; i++) {
    const t = 0.12 + (i / 15) * 0.76;
    const dir = i % 2 ? 1 : -1;
    const a = onShell(-dir * (gap + 0.05), t, 1.02);
    if (open < 0.5) strand(a, onShell(dir * (gap + 0.05), t + 0.045, 1.02), 0.012, 0.01, 'rope');
    else strand(a, new THREE.Vector3(a.x * 1.05, a.y - 0.2 - (i % 3) * 0.12, a.z * 1.05 + 0.05), 0.012, 0.003, 'rope');
  }
  // Ropes of silk from its crown and shoulders up and out to the rock, and its foot stuck to the floor.
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + 0.4;
    const from = onShell(ang, 0.82 + (i % 2) * 0.1);
    strand(from, new THREE.Vector3(Math.sin(ang) * (R + 1.2 + (i % 3) * 0.4), H + 0.9 + (i % 2) * 0.5, Math.cos(ang) * (R + 0.9) - 0.6), 0.035, 0.012, 'rope');
  }
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.2;
    if (Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) < 0.5) continue; // not across the front
    strand(onShell(ang, 0.14), new THREE.Vector3(Math.sin(ang) * (R + 0.7), 0, Math.cos(ang) * (R + 0.7)), 0.03, 0.01, 'rope');
  }
  const geometry = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  material.color.setScalar(c.albedo);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'cocoon';
  group.add(mesh);
  return {
    group,
    mesh,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
