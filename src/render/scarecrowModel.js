// The Pruitts' scarecrow (Nov 24, Aaron: "there's a veggie garden in the backyard. I will award you points for
// decorating with the creepiest scarecrow possible ... sink a fair bit of effort into to make it as scary as
// possible"). At the far end of the kitchen garden, looking back across the rows at the house.
//
// What makes it wrong, in order of how far off you notice it:
//  - Too tall (the post near three metres), leaning, its feet hanging clear of the ground like a hanged man's.
//  - Arms strung out along the crossbar, and from each cuff long twig fingers hanging down, splayed, reaching.
//  - The witch's antlers: twigs tied up either side of its head, her silhouette in the garden.
//  - Dead crows strung upside down from its arms; one live one (or not) on its shoulder, looking at you too.
//  - Earl's clothes: his red cap (the one in every photograph of him) and a red plaid shirt.
//  - The head: a burlap sack cinched at the neck with rope like a noose, lolled over to one side. One button eye
//    sewn on crooked and crossed with black thread; the other a torn hole with straw coming out. The mouth
//    sewn shut in long crude stitches, pulled up into a grin far too wide, and something dark run down from it
//    over the chin and the shirt.
//  - Her sigil scratched pale into a board nailed to the post; the rows round its feet dead and black.
//  - And (encounters/PruittFarm.js) its head turns to face Tom whenever he isn't looking at it.
//
// Built facing +z (its front), standing at the origin; one static mesh for the body and one for the head, which
// sits on `neck` (a group at the top of the post) inside `loll` (the tilt), so turning `neck` keeps the tilt.
// look: config.pruittFarm.scarecrow (colors, scale).

import * as THREE from 'three';
import { SetBuilder } from './setBuilder.js';
import { bakeParts } from './propKit.js';

const NECK_Y = 2.12;

export function buildScarecrow(look, { weather = null } = {}) {
  const k = look.colors;
  const body = new SetBuilder({ colors: k }, null, 71);
  const head = new SetBuilder({ colors: k }, null, 72);
  buildBody(body, k);
  buildHead(head, k);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, color: new THREE.Color().setScalar(look.albedo ?? 1) });
  const bodyGeo = bakeParts(body.parts, { weather, baseAt: () => 0, seed: 71 });
  const headGeo = bakeParts(head.parts, { weather, baseAt: () => 0, seed: 72 });
  const group = new THREE.Group();
  group.name = 'scarecrow';
  const bodyMesh = new THREE.Mesh(bodyGeo, material);
  bodyMesh.castShadow = true;
  const neck = new THREE.Group();
  neck.position.set(0, NECK_Y, 0.02);
  const loll = new THREE.Group();
  loll.rotation.set(0.34, 0, 0.6, 'YXZ'); // tipped forward to look down at you, and over to its left: lolled, like a hanged man's
  const headMesh = new THREE.Mesh(headGeo, material);
  headMesh.castShadow = true;
  loll.add(headMesh);
  neck.add(loll);
  // The whole of it leans on its post.
  const lean = new THREE.Group();
  lean.rotation.set(0.03, 0, -0.05);
  lean.add(bodyMesh, neck);
  group.add(lean);
  group.scale.setScalar(look.scale ?? 1);
  return {
    group,
    neck,
    head: headMesh,
    dispose() {
      bodyGeo.dispose();
      headGeo.dispose();
      material.dispose();
    },
  };
}

function buildBody(b, k) {
  const r = () => b.rand();
  // The post, its top above the head, and the crossbar for the arms.
  b.box(0.11, 3.0, 0.11, k.post, 0, 1.5, -0.08);
  b.box(2.05, 0.09, 0.09, k.post, 0, 2.05, -0.06);
  for (let i = 0; i < 6; i++) b.box(0.006, 0.12 + r() * 0.2, 0.004, k.postScar, -0.03 + r() * 0.06, 0.3 + r() * 2.4, -0.024, 0, 0, (r() - 0.5) * 0.6); // knife scars
  // A board nailed to the post low down, her sigil scratched into it: a ring, a line through it, three strokes.
  b.box(0.38, 0.32, 0.03, k.post, 0, 0.42, -0.01);
  const sigil = (x0, y0, x1, y1) => b.box(Math.hypot(x1 - x0, y1 - y0), 0.012, 0.006, k.sigil, (x0 + x1) / 2, 0.42 + (y0 + y1) / 2, 0.009, 0, 0, Math.atan2(y1 - y0, x1 - x0));
  const R = 0.1;
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    sigil(Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R);
  }
  sigil(0, -0.13, 0, 0.13);
  for (const a of [-0.6, 0, 0.6]) sigil(Math.sin(a) * 0.05, 0.02, Math.sin(a) * 0.14, 0.12);

  // The shirt (Earl's red plaid), stuffed lumpy, over the post.
  b.box(0.52, 0.7, 0.27, k.shirt, 0, 1.72, 0.02);
  b.put(new THREE.SphereGeometry(0.15, 9, 7).scale(1, 0.85, 0.55), k.shirt, 0.08, 1.86, 0.1); // lumps of straw pushing at it
  b.put(new THREE.SphereGeometry(0.12, 9, 7).scale(1, 0.9, 0.5), k.shirtDark, -0.12, 1.56, 0.1);
  b.put(new THREE.SphereGeometry(0.1, 8, 6).scale(1.2, 0.7, 0.5), k.shirt, 0.12, 1.5, 0.1);
  for (let y = 1.47; y < 2.06; y += 0.19) b.box(0.53, 0.01, 0.28, k.shirtLine, 0, y, 0.02);
  for (let x = -0.19; x <= 0.2; x += 0.19) b.box(0.01, 0.7, 0.28, k.shirtLine, x, 1.72, 0.02);
  for (let i = 0; i < 4; i++) b.box(0.03, 0.02, 0.02, k.button, 0, 1.5 + i * 0.13, 0.16); // its own buttons
  // The dark run down its front from the mouth.
  b.box(0.07, 0.34, 0.01, k.stain, 0.05, 1.9, 0.157);
  b.box(0.04, 0.22, 0.01, k.stain, 0.1, 1.74, 0.157, 0, 0, 0.1);
  b.box(0.025, 0.4, 0.01, k.stain, 0.0, 1.66, 0.157, 0, 0, -0.05);
  // Straw bursting out at the waist.
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    b.box(0.012, 0.16 + r() * 0.18, 0.012, r() < 0.5 ? k.straw : k.strawDark, Math.cos(a) * 0.22, 1.32, 0.02 + Math.sin(a) * 0.11, 0, Math.sin(a) * 0.5, Math.cos(a) * 0.5);
  }

  // The sleeves out along the crossbar; from the cuffs, long twig fingers hanging down, splayed.
  for (const s of [-1, 1]) {
    b.box(0.72, 0.18, 0.18, k.shirt, s * 0.62, 2.03, -0.04, 0, 0, s * 0.03);
    for (let x = 0.4; x < 0.98; x += 0.19) b.box(0.01, 0.19, 0.19, k.shirtLine, s * x, 2.03, -0.04);
    b.box(0.08, 0.16, 0.16, k.rope, s * 0.95, 2.03, -0.04); // tied on at the cuff
    for (let i = 0; i < 10; i++) b.box(0.012, 0.1 + r() * 0.12, 0.012, k.straw, s * (1.0 + r() * 0.05), 2.0 + (r() - 0.5) * 0.12, -0.04 + (r() - 0.5) * 0.12, 0, (r() - 0.5) * 1.2, s * (0.8 + r() * 0.8));
    // The forearm: a sleeve hanging limp from the bar's end, so the arms are far too long.
    b.box(0.15, 0.48, 0.15, k.shirtDark, s * 1.0, 1.76, -0.03, 0, 0.05, s * -0.06);
    b.box(0.07, 0.07, 0.17, k.rope, s * 1.0, 1.98, -0.03); // bound to the bar at the elbow
    for (let i = 0; i < 8; i++) b.box(0.01, 0.08 + r() * 0.1, 0.01, k.straw, s * (1.01 + (r() - 0.5) * 0.1), 1.5, -0.03 + (r() - 0.5) * 0.1, 0, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2);
    // The hand: five long twigs down from the hanging cuff, each kinked once at a knuckle, reaching to its knees.
    for (let f = 0; f < 5; f++) {
      const spread = (f - 2) * 0.17;
      const len = 0.5 + r() * 0.24 + (f === 2 ? 0.14 : 0);
      const x0 = s * (1.02 + (f - 2) * 0.012);
      const z0 = -0.03 + (f - 2) * 0.03;
      b.push(x0, 1.52, z0, 0, spread * 0.6, s * (0.08 + spread * 0.5));
      b.box(0.018, len * 0.55, 0.018, k.twig, 0, -len * 0.27, 0);
      b.push(0, -len * 0.55, 0, 0, 0.25 + r() * 0.2, s * (-0.15 + r() * 0.1));
      b.box(0.013, len * 0.5, 0.013, k.twig, 0, -len * 0.25, 0);
      b.box(0.009, 0.08, 0.009, k.twig, 0, -len * 0.5 - 0.03, 0.01, 0, 0.5, 0); // the nail of it, hooked
      b.pop();
      b.pop();
    }
  }

  // Trousers stuffed thin, its feet hanging clear of the ground, boots toes-down.
  for (const s of [-1, 1]) {
    b.box(0.17, 0.78, 0.17, s < 0 ? k.trousers : k.trousersDark, s * 0.11, 0.98, 0.02, 0, s * 0.05, s * 0.04);
    for (let i = 0; i < 6; i++) b.box(0.01, 0.1 + r() * 0.1, 0.01, k.straw, s * 0.11 + (r() - 0.5) * 0.12, 0.56, 0.02 + (r() - 0.5) * 0.1, 0, (r() - 0.5), (r() - 0.5));
    b.push(s * 0.12, 0.52, 0.04, s * 0.15, 0.55, 0);
    b.box(0.13, 0.12, 0.27, k.boot, 0, -0.04, 0.05);
    b.pop();
  }

  // The crows: three dead, strung by a foot from its arms, wings fallen open; one on its shoulder, upright.
  const crowAt = (x, len, turn) => {
    b.box(0.006, len, 0.006, k.string, x, 2.0 - len / 2, -0.04);
    b.push(x, 2.0 - len - 0.12, -0.04, turn, 0, Math.PI); // upside down
    crowBody(b, k);
    for (const s of [-1, 1]) b.box(0.24, 0.012, 0.13, k.crow, s * 0.13, 0.02, 0.0, 0, 0.2, s * -0.9); // wings hanging open
    b.pop();
  };
  crowAt(-0.72, 0.34, 0.4);
  crowAt(-0.42, 0.52, -0.6);
  crowAt(0.8, 0.42, 1.2);
  b.push(0.42, 2.16, -0.02, -0.5, 0, 0);
  crowBody(b, k);
  for (const s of [-1, 1]) b.box(0.03, 0.08, 0.14, k.crow, s * 0.07, 0.06, -0.02); // wings folded
  b.box(0.015, 0.07, 0.015, k.crowBeak, -0.025, -0.06, 0.02); // legs
  b.box(0.015, 0.07, 0.015, k.crowBeak, 0.025, -0.06, 0.02);
  b.pop();

  // The garden round its feet: dead, black, bent over.
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const d = 0.5 + r() * 1.5;
    const h = 0.18 + r() * 0.3;
    b.push(Math.cos(a) * d, 0, Math.sin(a) * d, r() * 6, 0.4 + r() * 0.9, 0);
    b.box(0.022, h, 0.022, k.deadStalk, 0, h / 2, 0);
    b.box(0.09, 0.008, 0.05, k.deadLeaf, 0.03, h, 0, 0, 0.6, 0.3);
    b.pop();
  }
}

// A crow, standing in its own frame (y up, beak to +z).
function crowBody(b, k) {
  b.put(new THREE.SphereGeometry(0.08, 8, 6).scale(0.85, 0.9, 1.5), k.crow, 0, 0.06, 0);
  b.put(new THREE.SphereGeometry(0.05, 8, 6), k.crow, 0, 0.13, 0.1);
  b.put(new THREE.ConeGeometry(0.018, 0.07, 6).rotateX(Math.PI / 2), k.crowBeak, 0, 0.125, 0.17);
  b.box(0.012, 0.012, 0.004, k.crowEye, 0.035, 0.145, 0.13);
  b.box(0.012, 0.012, 0.004, k.crowEye, -0.035, 0.145, 0.13);
  b.box(0.07, 0.01, 0.14, k.crow, 0, 0.05, -0.16, 0, 0.3, 0); // tail
}

// The head, in the neck's frame (its base at y 0, its face to +z).
function buildHead(b, k) {
  const r = () => b.rand();
  const RAD = 0.205;
  const cy = 0.23;
  // The sack, a little long and lumpy, gathered in at the neck.
  b.put(new THREE.SphereGeometry(RAD, 14, 10).scale(0.95, 1.22, 0.92), k.burlap, 0, cy, 0);
  b.put(new THREE.SphereGeometry(0.11, 9, 7).scale(1.1, 0.8, 0.9), k.burlap, -0.1, cy - 0.15, 0.03); // the slack of the sack, sagging
  b.put(new THREE.SphereGeometry(0.1, 8, 6), k.burlapDark, 0.09, cy + 0.12, -0.08); // a lump of straw inside it
  b.put(new THREE.ConeGeometry(0.12, 0.12, 10, 1, true), k.burlapDark, 0, 0.04, 0); // gathered
  // The rope cinched at the neck like a noose; its tail hanging.
  b.put(new THREE.TorusGeometry(0.075, 0.018, 6, 12).rotateX(Math.PI / 2), k.rope, 0, 0.03, 0);
  b.box(0.022, 0.3, 0.022, k.rope, 0.05, -0.12, 0.06, 0, 0.1, 0.15);
  b.put(new THREE.SphereGeometry(0.03, 6, 5), k.rope, 0.07, 0.03, 0.07); // the knot
  for (let i = 0; i < 12; i++) {
    const a = r() * Math.PI * 2;
    b.box(0.01, 0.1 + r() * 0.08, 0.01, k.straw, Math.cos(a) * 0.07, -0.03, Math.sin(a) * 0.07, 0, Math.sin(a) * 0.7, Math.cos(a) * 0.7);
  }
  const face = (x, y, inset = 0) => {
    // A point on the sack's front at (x, y), and its normal's yaw/pitch: for laying things on the face.
    const ny = (y - cy) / (RAD * 1.18);
    const nx = x / RAD;
    const z = RAD * 0.95 * Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)) - inset;
    return { x, y, z, yaw: Math.atan2(nx, Math.sqrt(Math.max(0.01, 1 - nx * nx))), pitch: -Math.asin(Math.max(-0.9, Math.min(0.9, ny))) };
  };
  // Grime round where eyes would be, so they sit back in hollows.
  for (const [x, y, rr] of [[-0.075, cy + 0.07, 0.07], [0.08, cy + 0.03, 0.075]]) {
    const g = face(x, y, -0.001);
    b.push(g.x, g.y, g.z, g.yaw, g.pitch, 0);
    b.put(new THREE.CircleGeometry(rr, 12), k.grime, 0, 0, 0.001);
    b.pop();
  }
  // Its right eye: a big black button, sewn on crooked, crossed with thread.
  const e1 = face(-0.075, cy + 0.07);
  b.push(e1.x, e1.y, e1.z + 0.004, e1.yaw, e1.pitch, 0.3);
  b.put(new THREE.CylinderGeometry(0.046, 0.046, 0.018, 12).rotateX(Math.PI / 2), k.button, 0, 0, 0.006);
  b.box(0.012, 0.012, 0.004, k.buttonShine, 0.012, 0.014, 0.016);
  b.box(0.07, 0.006, 0.004, k.stitch, 0, 0, 0.016, 0, 0, 0.8);
  b.box(0.07, 0.006, 0.004, k.stitch, 0, 0, 0.016, 0, 0, -0.8);
  b.pop();
  // Its left: a torn hole, straw coming out of the dark.
  const e2 = face(0.08, cy + 0.03, 0.012);
  b.push(e2.x, e2.y, e2.z, e2.yaw, e2.pitch, 0);
  b.put(new THREE.CircleGeometry(0.058, 10), k.hole, 0, 0, 0.004);
  b.box(0.02, 0.07, 0.004, k.hole, 0.01, -0.07, 0.003, 0, 0, 0.2); // torn on down the cheek
  for (let i = 0; i < 6; i++) b.box(0.007, 0.007, 0.07 + r() * 0.05, k.straw, (r() - 0.5) * 0.05, (r() - 0.5) * 0.05, 0.03, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    b.box(0.03, 0.01, 0.006, k.burlapDark, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.006, 0, 0, a + 0.4); // frayed edge
  }
  b.pop();
  // The mouth: sewn shut along a grin far too wide, the seam curling up at both ends past where cheeks would be.
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = -1 + (i / 16) * 2;
    const x = t * 0.185;
    const y = cy - 0.11 + 0.11 * t * t * t * t + 0.02 * t * t;
    pts.push(face(x, y, -0.003));
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const c = pts[i + 1];
    const len = Math.hypot(c.x - a.x, c.y - a.y, c.z - a.z);
    b.push((a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2, (a.yaw + c.yaw) / 2, (a.pitch + c.pitch) / 2, Math.atan2(c.y - a.y, c.x - a.x));
    b.box(len + 0.004, 0.009, 0.006, k.stitch, 0, 0, 0);
    b.pop();
    // A crude stitch across the seam at every other point, long.
    if (i % 1 === 0) {
      b.push(a.x, a.y, a.z, a.yaw, a.pitch, (r() - 0.5) * 0.4);
      b.box(0.007, 0.07 + r() * 0.04, 0.006, k.stitch, 0, 0, 0.002);
      b.pop();
    }
  }
  // One corner of it torn open: the seam split, dark inside, straw at the lip.
  const tc = pts[13];
  b.push(tc.x, tc.y - 0.012, tc.z + 0.002, tc.yaw, tc.pitch, 0.5);
  b.box(0.06, 0.024, 0.004, k.hole, 0, 0, 0);
  for (let i = 0; i < 3; i++) b.box(0.006, 0.006, 0.05, k.straw, -0.02 + i * 0.02, -0.006, 0.02, (r() - 0.5) * 0.8, (r() - 0.5) * 0.8, 0);
  b.pop();
  // What ran out of it: down the chin, dark.
  for (const [x, len] of [[0.02, 0.16], [0.06, 0.1], [-0.04, 0.08], [0.12, 0.12], [0.15, 0.06]]) {
    const p = face(x, cy - 0.12 - len / 2, -0.002);
    b.push(p.x, p.y, p.z, p.yaw, p.pitch, 0);
    b.box(0.022, len, 0.004, k.stain, 0, 0, 0);
    b.pop();
  }

  // Earl's red cap, pushed down crooked on the sack.
  b.push(0.0, cy + 0.17, 0.01, 0.25, -0.12, -0.08);
  b.put(new THREE.SphereGeometry(0.2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.62, 1.05), k.cap, 0, 0, 0);
  b.box(0.21, 0.016, 0.17, k.capDark, 0, -0.02, 0.24, 0, 0.32, 0); // the bill, pulled down over its eyes
  b.box(0.05, 0.03, 0.05, k.capDark, 0, 0.125, 0); // the button on top
  b.pop();
  // Her antlers: twigs bound up either side of the head, branching.
  for (const s of [-1, 1]) {
    b.push(s * 0.16, cy + 0.12, -0.02, 0, 0, -s * 0.5);
    b.box(0.022, 0.4, 0.022, k.antler, 0, 0.2, 0);
    b.push(0, 0.2, 0, 0, 0.2, s * 0.7);
    b.box(0.016, 0.2, 0.016, k.antler, 0, 0.1, 0);
    b.pop();
    b.push(0, 0.32, 0, 0, -0.3, -s * 0.5);
    b.box(0.014, 0.18, 0.014, k.antler, 0, 0.09, 0);
    b.pop();
    b.push(0, 0.4, 0, 0, 0, s * 0.3);
    b.box(0.012, 0.16, 0.012, k.antler, 0, 0.08, 0);
    b.pop();
    b.box(0.05, 0.05, 0.05, k.rope, 0, 0.02, 0); // bound on
    b.pop();
  }
}

// Whether a point is outside the camera's view (with margin x the half-angles): for the head's turn. Pure.
export function outOfView(cam, x, y, z, margin = 1.15) {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse);
  if (v.z > 0) return true; // behind
  const half = THREE.MathUtils.degToRad(cam.fov / 2) * margin;
  const halfH = Math.atan(Math.tan(half) * (cam.aspect || 1));
  return Math.abs(Math.atan2(v.y, -v.z)) > half || Math.abs(Math.atan2(v.x, -v.z)) > halfH;
}
