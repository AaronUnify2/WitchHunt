// The abandoned mineshaft's surface set (Session 30; DESIGN.md "Abandoned
// mineshaft"): the Black Laurel Coal Company's No. 2 shaft (a draft name),
// shut years ago, opened again a few weeks back by people who weren't
// miners. All in code, baked into ONE vertex-coloured mesh
// (render/propKit.js, render/setBuilder.js), plus three small meshes that
// change in play: no lights, dull colours (the glare rule).
//
//  - the company's sign on two posts where the track comes in, a strip of
//    the army's hazard tape tied across it and broken;
//  - the side office (walk in): the foreman's desk, the tag board on the
//    wall (a brass tag on a hook for every man below: eleven still hang
//    there), the lamp rack, his locker;
//  - the headframe over the shaft: four timber legs and two raking struts,
//    the sheave wheel on top, the cable down to the cage standing at the
//    collar with its gate folded back; a strand of something pale caught
//    high in the bracing;
//  - the lift's control box on a post by the gate, its battery tray empty
//    and the jump leads hanging (the battery Tom fits is its own mesh, and
//    the box's lamp);
//  - the hoist house: a tin lean-to over the winding drum;
//  - rails out of the back of the collar to the spoil heap, an ore tub on
//    them; pit props stacked by the track; a cable spool; a tub on its side;
//  - what the army left by the collar: olive crates, a tarp, a lamp stand.
//
// Model space: Tom arrives from -z along the track; the origin is the
// clearing's middle; +x is his left as he walks in (world/MineshaftSite.js
// converts).
//
// buildMineshaft(cfg, { weather, heightAt }) returns { group, mesh, parts,
// spots, colliders, dispose }. parts: battery, boxLamp (shown once the
// battery's fitted), cageLamp (the cage's lamp, lit with it).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';
import { limb, log } from './sawmillModel.js';

// The set's measurements (metres, model space).
export const MINESHAFT = {
  collar: { x: 0, z: 6, half: 1.45 }, // the shaft's concrete curb
  cage: { half: 1.0, roof: 2.25 },
  frame: { height: 9.2, spread: 1.9 },
  office: { x0: 6, x1: 11, z0: -7.5, z1: -2.5, wall: 2.4, door: -5, doorHalf: 0.6 },
  hoist: { x0: -12.5, x1: -8.5, z0: 3.8, z1: 8.2, wall: 2.6 },
  box: { x: -2.3, z: 4.0 },
  heap: { x: 0.5, z: 16.5, r: 4.4, h: 2.6 },
  sign: { x: 2.6, z: -17 },
};

// An ore tub (its frame: on the rails, long axis z).
export function oreTub(b, c, loaded = false) {
  b.box(0.9, 0.06, 1.3, c.ironDark, 0, 0.3, 0);
  for (const s of [-1, 1]) {
    b.box(0.05, 0.62, 1.3, c.iron, s * 0.5, 0.62, 0, 0, 0, s * -0.16);
    b.box(1.0, 0.62, 0.05, c.iron, 0, 0.62, s * 0.66, 0, s * 0.12, 0);
    b.box(0.06, 0.06, 1.42, c.ironDark, s * 0.56, 0.94, 0);
    for (const z of [-0.42, 0.42]) b.put(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 10).rotateZ(Math.PI / 2), c.ironDark, s * 0.36, 0.17, z);
  }
  b.box(0.12, 0.1, 0.2, c.ironDark, 0, 0.3, -0.75);
  b.box(0.12, 0.1, 0.2, c.ironDark, 0, 0.3, 0.75);
  if (loaded) b.put(new THREE.SphereGeometry(0.6, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.8, 0.45, 1.05), c.coal, 0, 0.84, 0);
}

// A length of narrow-gauge track along z from z0 to z1 (the frame's x 0).
export function rails(b, c, z0, z1, y = 0) {
  const len = z1 - z0;
  for (const s of [-1, 1]) b.box(0.05, 0.08, len, c.iron, s * 0.36, y + 0.1, (z0 + z1) / 2);
  for (let z = z0 + 0.3; z < z1; z += 0.7) b.box(1.1, 0.07, 0.16, c.postDark, 0, y + 0.035, z, (b.rand() - 0.5) * 0.06);
}

export function buildMineshaft(cfg, { weather = null, heightAt = null } = {}) {
  const look = cfg.look;
  const b = new SetBuilder(look, heightAt, 3001);
  const flat = new SetBuilder(look, heightAt, 3002); // what lies on the ground: baked without grime
  const batB = new SetBuilder(look, heightAt, 3003);
  const c = b.c;
  const M = MINESHAFT;

  b.spot('arrive', 0, 0, -20);
  b.spot('middle', 0, 0, 0);

  // ---- the track in: ruts, the sign, the tape ----
  for (const s of [-1, 1]) {
    for (let z = -21.5; z < -8; z += 1.6) {
      flat.pushOnGround(s * 0.9 + Math.sin(z) * 0.12, 0, z, Math.sin(z * 0.7) * 0.1);
      flat.box(0.32, 0.02, 1.7, c.dirt, 0, 0.012, 0);
      flat.pop();
    }
  }
  b.pushOnGround(M.sign.x, 0, M.sign.z, 0.12);
  for (const x of [-0.9, 0.9]) b.box(0.12, 2.3, 0.12, c.post, x, 1.15, 0);
  b.box(2.2, 0.8, 0.06, c.signBoard, 0, 1.85, -0.07);
  for (let r = 0; r < 3; r++) b.box(1.7 - r * 0.35, 0.09, 0.02, c.signPaint, 0, 2.06 - r * 0.2, -0.105); // lettering, as bars
  b.box(0.9, 0.06, 0.012, c.tape, -1.3, 1.25, -0.04, 0, 0, 0.5); // the tape's torn end, hanging
  b.spot('sign', 0, 1.6, -0.6);
  b.post(-0.9, 0, 0, 0.12, 2.3);
  b.post(0.9, 0, 0, 0.12, 2.3);
  b.pop();
  // The tape's other end, on a stake across the track.
  b.pushOnGround(-2.6, 0, -17.2, 0);
  b.box(0.05, 1.3, 0.05, c.postDark, 0, 0.65, 0);
  b.box(1.1, 0.06, 0.012, c.tape, 0.5, 0.82, 0, 0, 0, -0.75);
  b.pop();

  // ---- the office (walk in through the door in its wall on the track's side) ----
  {
    const O = M.office;
    const w = O.x1 - O.x0;
    const d = O.z1 - O.z0;
    const cx = (O.x0 + O.x1) / 2;
    const cz = (O.z0 + O.z1) / 2;
    b.pushOnGround(cx, 0, cz, 0);
    const hx = w / 2;
    const hz = d / 2;
    const door = O.door - cz;
    b.box(w, 0.08, d, c.floor, 0, 0.04, 0);
    // Walls: the back (+x), the two ends, the front (-x) either side of the door.
    b.box(0.12, O.wall, d, c.clap, hx, O.wall / 2, 0);
    b.box(w, O.wall, 0.12, c.clap, 0, O.wall / 2, -hz);
    b.box(w, O.wall, 0.12, c.clapDark, 0, O.wall / 2, hz);
    const f0 = door - O.doorHalf + hz; // front wall, from -hz to the door
    const f1 = hz - (door + O.doorHalf);
    b.box(0.12, O.wall, f0, c.clap, -hx, O.wall / 2, -hz + f0 / 2);
    b.box(0.12, O.wall, f1, c.clap, -hx, O.wall / 2, hz - f1 / 2);
    b.box(0.12, O.wall - 2.0, O.doorHalf * 2, c.clapDark, -hx, 2.0 + (O.wall - 2.0) / 2, door);
    b.box(0.05, 2.0, 1.1, c.trim, -hx - 0.5, 1.0, door - O.doorHalf - 0.02, 1.1); // the door, open outward
    // A window in the front wall and one in the far end: dark glass, a frame.
    b.box(0.14, 0.7, 0.9, c.glass, -hx, 1.5, hz - f1 / 2);
    b.box(0.16, 0.06, 1.0, c.trim, -hx, 1.12, hz - f1 / 2);
    b.box(0.9, 0.7, 0.14, c.glass, 0.6, 1.5, hz);
    // The roof: flat tin sheets lapped on the wall plates, their ribs running front to back.
    b.box(w + 0.7, 0.05, d + 0.6, c.tin, 0, O.wall + 0.03, 0);
    for (let z = -hz; z <= hz; z += 0.62) b.box(w + 0.7, 0.03, 0.05, c.tinDark, 0, O.wall + 0.07, z);
    // The foreman's desk against the back wall, his chair pushed over.
    b.box(0.75, 0.06, 1.5, c.desk, hx - 0.5, 0.78, 0.4);
    for (const z of [-0.25, 1.05]) b.box(0.7, 0.74, 0.06, c.desk, hx - 0.5, 0.41, z);
    b.box(0.3, 0.02, 0.42, c.paper, hx - 0.55, 0.82, 0.2, 0.2);
    b.box(0.24, 0.04, 0.3, c.ink, hx - 0.45, 0.83, 0.85, -0.3); // a ledger's black cover
    b.box(0.08, 0.14, 0.08, c.brass, hx - 0.25, 0.88, -0.1); // a carbide lamp
    b.box(0.42, 0.42, 0.42, c.desk, hx - 1.5, 0.21, 0.9, 0.5, 0, 1.4);
    b.spot('desk', hx - 1.25, 0.8, 0.4);
    // The tag board on the far end wall: black board, rows of hooks, the brass tags still on eleven.
    b.box(1.5, 0.9, 0.04, c.board, -0.6, 1.45, hz - 0.09);
    let tags = 0;
    for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 8; k++) {
        const on = (r * 8 + k) % 7 !== 3 && (r * 8 + k) % 5 !== 1 && tags < 11;
        if (!on) continue;
        tags++;
        b.box(0.07, 0.09, 0.012, c.brass, -1.22 + k * 0.178, 1.72 - r * 0.27, hz - 0.12);
      }
    }
    b.spot('tags', -0.6, 1.4, hz - 0.9);
    // The lamp rack on the near end wall: a shelf of cap lamps on their charger, dead.
    b.box(1.6, 0.05, 0.3, c.plankDark, 0.6, 1.1, -hz + 0.22);
    b.box(1.6, 0.5, 0.05, c.plankDark, 0.6, 1.36, -hz + 0.1);
    for (let k = 0; k < 6; k++) {
      if (k === 2) continue;
      b.box(0.12, 0.16, 0.09, c.lamp, -0.05 + k * 0.26, 1.21, -hz + 0.22);
      b.put(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 8).rotateX(Math.PI / 2), c.lens, -0.05 + k * 0.26, 1.24, -hz + 0.29);
    }
    b.box(0.3, 0.14, 0.24, c.helmet, -1.0, 0.09 + 0.08, -hz + 0.5, 0.6, 0.15); // a helmet on the floor
    b.spot('lamps', 0.6, 1.2, -hz + 0.95);
    // His locker in the corner by the door.
    b.box(0.5, 1.8, 0.45, c.locker, -hx + 0.42, 0.98, -hz + 0.38);
    b.box(0.02, 1.7, 0.4, c.trim, -hx + 0.68, 0.98, -hz + 0.38);
    b.spot('locker', -hx + 1.15, 1.0, -hz + 0.55);
    // Solid: the walls (the door's gap left open), the desk, the locker.
    b.wall(hx, -hz, hx, hz, 0, 0.1, O.wall);
    b.wall(-hx, -hz, hx, -hz, 0, 0.1, O.wall);
    b.wall(-hx, hz, hx, hz, 0, 0.1, O.wall);
    b.wall(-hx, -hz, -hx, door - O.doorHalf, 0, 0.1, O.wall);
    b.wall(-hx, door + O.doorHalf, -hx, hz, 0, 0.1, O.wall);
    b.wall(hx - 0.5, -0.3, hx - 0.5, 1.1, 0, 0.36, 0.8, false);
    b.post(-hx + 0.42, 0, -hz + 0.38, 0.32, 1.8);
    b.pop();
  }

  // ---- the headframe, the collar and the cage ----
  {
    const K = M.collar;
    const F = M.frame;
    const G = M.cage;
    b.pushOnGround(K.x, 0, K.z, 0);
    // The collar: a concrete curb round the shaft, open on the gate's side (-z).
    for (const s of [-1, 1]) b.box(0.3, 0.34, K.half * 2 + 0.3, c.concrete, s * K.half, 0.17, 0);
    b.box(K.half * 2 + 0.3, 0.34, 0.3, c.concreteDark, 0, 0.17, K.half);
    for (const s of [-1, 1]) b.box(0.32, 0.34, 0.3, c.concreteDark, s * (K.half - 0.16), 0.17, -K.half);
    flat.stack = [b.m.clone()];
    flat.box(K.half * 2, 0.02, K.half * 2, c.hollow, 0, 0.02, 0); // down the shaft, round the cage
    flat.box(1.6, 0.03, 0.9, c.plankDark, 0, 0.03, -K.half - 0.2); // the gangplank in
    // The cage at the collar: a steel floor, four corner posts, bars on three sides, a roof, a lamp.
    b.box(G.half * 2, 0.06, G.half * 2, c.ironDark, 0, 0.06, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.07, G.roof, 0.07, c.iron, sx * G.half, G.roof / 2 + 0.06, sz * G.half);
    b.box(G.half * 2 + 0.1, 0.07, G.half * 2 + 0.1, c.ironDark, 0, G.roof + 0.08, 0);
    for (const y of [0.55, 1.1, 1.65]) {
      for (const s of [-1, 1]) b.box(0.035, 0.035, G.half * 2, c.iron, s * G.half, y, 0);
      b.box(G.half * 2, 0.035, 0.035, c.iron, 0, y, G.half);
    }
    for (let k = -2; k <= 2; k++) {
      for (const s of [-1, 1]) b.box(0.022, G.roof, 0.022, c.ironDark, s * G.half, G.roof / 2 + 0.06, k * 0.33);
      b.box(0.022, G.roof, 0.022, c.ironDark, k * 0.33, G.roof / 2 + 0.06, G.half);
    }
    // The gate, folded back against the near-left post.
    for (let k = 0; k < 4; k++) b.box(0.03, 1.7, 0.03, c.iron, G.half + 0.06 + k * 0.05, 0.95, -G.half - 0.03 - k * 0.02);
    // The lever on the cage's right-hand post (Tom's right as he steps in: the model's -x).
    b.box(0.1, 0.22, 0.12, c.boxDark, -G.half + 0.08, 1.15, 0.45);
    limb(b, [-G.half + 0.14, 1.15, 0.45], [-G.half + 0.3, 1.42, 0.45], 0.016, c.iron, 5);
    b.put(new THREE.SphereGeometry(0.035, 6, 4), c.lead, -G.half + 0.3, 1.43, 0.45);
    b.spot('lever', -G.half + 0.55, 1.2, 0.2);
    b.spot('cage', 0, 0.06, 0);
    b.spot('gate', 0, 0, -K.half - 1.4);
    // The headframe: four legs leaning in, cross braces, a deck, the sheave; two struts raking back to the hoist.
    const top = F.height;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) limb(b, [sx * F.spread, 0, sz * F.spread], [sx * 0.9, top, sz * 0.9], 0.15, c.post, 4, 0.12);
      for (const y of [2.9, 5.6]) {
        const k = 1 - (y / top) * (1 - 0.9 / F.spread);
        b.box(0.12, 0.16, F.spread * 2 * k, c.postDark, sx * F.spread * k, y, 0);
        b.box(F.spread * 2 * k, 0.16, 0.12, c.postDark, 0, y, sx * F.spread * k);
      }
      limb(b, [sx * F.spread * 0.86, 2.9, -F.spread * 0.86], [sx * F.spread * 0.7, 5.6, F.spread * 0.7], 0.06, c.postDark, 4);
      limb(b, [-F.spread * 0.86 * sx, 2.9, sx * F.spread * 0.86], [F.spread * 0.7 * sx, 5.6, sx * F.spread * 0.7], 0.06, c.postDark, 4);
      limb(b, [sx * 0.8, top - 0.6, 0.9], [-7.2, 0, sx * 0.9], 0.13, c.postDark, 4); // the raking struts, toward the hoist house
    }
    b.box(2.3, 0.14, 2.3, c.plankDark, 0, top, 0);
    b.put(new THREE.TorusGeometry(0.85, 0.07, 5, 18).rotateY(Math.PI / 2), c.iron, 0, top + 1.0, 0);
    for (let k = 0; k < 3; k++) b.box(0.04, 1.6, 0.07, c.ironDark, 0, top + 1.0, 0, 0, (k * Math.PI) / 3);
    for (const s of [-1, 1]) b.box(0.14, 1.1, 0.14, c.post, s * 0.3, top + 0.55, 0);
    limb(b, [0, top + 0.15, 0], [0, G.roof + 0.1, 0], 0.022, c.cable, 4); // the cable down to the cage
    limb(b, [0, top + 1.85, 0], [-8.6, 1.3, 0], 0.022, c.cable, 4); // ...and over the sheave to the drum
    // A strand of something pale, caught in the bracing, stirring (it doesn't: it's baked).
    limb(b, [F.spread * 0.75, 5.6, -F.spread * 0.75], [0.5, 3.3, -1.2], 0.012, c.silk, 3);
    limb(b, [0.5, 3.3, -1.2], [0.9, 2.5, -1.6], 0.01, c.silk, 3);
    // Solid: the legs, the cage's sides and back, the curb either side.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.post(sx * F.spread, 0, sz * F.spread, 0.2, 3);
    for (const s of [-1, 1]) b.wall(s * (K.half - 0.1), -K.half, s * (K.half - 0.1), K.half, 0, 0.28, 2.3, false);
    b.wall(-K.half, K.half - 0.1, K.half, K.half - 0.1, 0, 0.28, 2.3, false);
    b.pop();
  }

  // ---- the lift's control box on its post by the gate ----
  {
    const X = M.box;
    b.pushOnGround(X.x, 0, X.z, -0.5);
    b.box(0.12, 1.5, 0.12, c.post, 0, 0.75, 0);
    b.box(0.5, 0.6, 0.22, c.box, 0, 1.25, -0.16);
    b.box(0.44, 0.03, 0.26, c.boxDark, 0, 0.93, -0.18); // the battery tray
    b.box(0.03, 0.2, 0.03, c.boxDark, 0.12, 1.3, -0.28); // the knife switch
    limb(b, [-0.18, 0.96, -0.2], [-0.3, 0.45, -0.34], 0.012, c.leadBlack, 4);
    limb(b, [0.18, 0.96, -0.2], [0.34, 0.5, -0.3], 0.012, c.leadBlack, 4);
    b.box(0.03, 0.07, 0.03, c.lead, 0.34, 0.47, -0.3);
    b.box(0.03, 0.07, 0.03, c.leadBlack, -0.3, 0.42, -0.34);
    limb(b, [0, 1.55, -0.1], [0.6, 2.3, 1.2], 0.018, c.cable, 4); // conduit up to the frame
    batB.stack = [b.m.clone()];
    batB.box(0.3, 0.2, 0.18, c.battery, 0, 1.045, -0.18);
    for (const s of [-1, 1]) batB.box(0.035, 0.04, 0.035, c.batteryCap, s * 0.1, 1.16, -0.18);
    b.spot('box', 0, 1.2, -0.75);
    b.spot('boxLamp', 0.17, 1.47, -0.275);
    b.post(0, 0, 0, 0.2, 1.6);
    b.pop();
  }

  // ---- the hoist house: a tin lean-to over the winding drum, open toward the headframe ----
  {
    const H = M.hoist;
    const cx = (H.x0 + H.x1) / 2;
    const cz = (H.z0 + H.z1) / 2;
    const hx = (H.x1 - H.x0) / 2;
    const hz = (H.z1 - H.z0) / 2;
    b.pushOnGround(cx, 0, cz, 0);
    b.box(0.08, H.wall, hz * 2, c.tin, -hx, H.wall / 2, 0);
    for (const s of [-1, 1]) {
      b.box(hx * 2, H.wall, 0.08, s < 0 ? c.tin : c.tinDark, 0, H.wall / 2, s * hz);
      b.box(0.14, H.wall + 0.3, 0.14, c.post, hx, (H.wall + 0.3) / 2, s * hz);
    }
    b.push(0, H.wall + 0.2, 0, 0, 0, 0.12);
    b.box(hx * 2 + 0.5, 0.05, hz * 2 + 0.5, c.tinDark, 0, 0, 0);
    b.pop();
    // The winding drum on its bed, the cable wound on it, a brake lever.
    b.box(1.6, 0.3, 2.6, c.concreteDark, 0.3, 0.15, 0);
    b.put(new THREE.CylinderGeometry(0.75, 0.75, 1.5, 14).rotateX(Math.PI / 2), c.cable, 0.3, 1.2, 0);
    for (const s of [-1, 1]) {
      b.put(new THREE.CylinderGeometry(1.0, 1.0, 0.07, 14).rotateX(Math.PI / 2), c.iron, 0.3, 1.2, s * 0.8);
      b.box(0.2, 1.2, 0.14, c.ironDark, 0.3, 0.75, s * 1.0);
    }
    limb(b, [1.5, 0.1, -1.2], [1.7, 1.3, -1.2], 0.025, c.iron, 5);
    b.box(0.7, 0.9, 0.6, c.locker, -1.2, 0.45, -1.4); // the motor's housing
    b.wall(-hx, -hz, -hx, hz, 0, 0.08, H.wall);
    b.wall(-hx, -hz, hx, -hz, 0, 0.08, H.wall);
    b.wall(-hx, hz, hx, hz, 0, 0.08, H.wall);
    b.post(0.3, 0, 0, 1.25, 2.2);
    b.pop();
  }

  // ---- the rails out of the back of the collar to the spoil heap, a loaded tub on them ----
  {
    const K = M.collar;
    b.pushOnGround(K.x, 0, K.z, 0);
    rails(b, c, K.half + 0.3, 7.6);
    b.push(0, 0.08, 4.4, 0.03);
    oreTub(b, c, true);
    b.pop();
    b.post(0, 0, 4.4, 0.75, 1.1);
    b.pop();
    const P = M.heap;
    b.pushOnGround(P.x, -0.1, P.z, 0);
    b.put(new THREE.ConeGeometry(P.r, P.h, 11, 3).scale(1, 1, 0.8), c.coal, 0, P.h / 2, 0, 0.4);
    b.put(new THREE.ConeGeometry(P.r * 0.6, P.h * 0.7, 9, 2), c.coalDark, P.r * 0.55, P.h * 0.32, -1.2, 1.1);
    b.post(0, 0, 0, P.r * 0.62, P.h);
    b.pop();
  }

  // ---- the yard: pit props, a cable spool, a tub on its side ----
  b.pushOnGround(-7, 0, -9.5, 0.12);
  for (let layer = 0; layer < 3; layer++) for (let k = 0; k < 4 - layer; k++) log(b, 2.6, 0.13, 0, 0.13 + layer * 0.23, (k - (3 - layer) / 2) * 0.28, (b.rand() - 0.5) * 0.04);
  b.spot('props', 0, 0.5, -1.0);
  b.wall(-1.3, 0, 1.3, 0, 0, 0.55, 0.8, false);
  b.pop();
  b.pushOnGround(6.5, 0.62, 11.5, 0.7);
  b.put(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 10).rotateZ(Math.PI / 2), c.cable, 0, 0, 0);
  for (const s of [-1, 1]) b.put(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 12).rotateZ(Math.PI / 2), c.plank, s * 0.43, 0, 0);
  b.post(0, 0, 0, 0.6, 1.3);
  b.pop();
  b.pushOnGround(-5.2, 0.42, -3.6, 0.9, 0, 1.45);
  oreTub(b, c);
  b.pop();
  b.pushOnGround(-5.2, 0, -3.6, 0);
  b.spot('cart', 1.2, 0.5, -0.5);
  b.post(0, 0, 0, 0.7, 1.0);
  b.pop();
  flat.pushOnGround(-4.4, 0, -3.2, 0.3);
  flat.put(new THREE.CircleGeometry(0.9, 9).rotateX(-Math.PI / 2).scale(1.3, 1, 0.8), c.coal, 0, 0.015, 0); // what spilled out of it
  flat.pop();

  // ---- what the army left by the collar: crates, a tarp over more, a lamp on a stand (dead) ----
  b.pushOnGround(4.2, 0, 2.6, -0.3);
  b.box(1.1, 0.5, 0.6, c.army, 0, 0.25, 0);
  b.box(1.0, 0.07, 0.03, c.stencil, 0, 0.3, -0.31);
  b.box(0.9, 0.42, 0.55, c.armyDark, 0.15, 0.71, 0.03, 0.25);
  b.box(0.95, 0.04, 0.6, c.armyDark, -1.3, 0.02 + 0.2, 0.5, 0.5, 0, 0.5); // a lid, leaning
  b.box(1.4, 0.55, 1.0, c.tarp, 1.6, 0.275, 0.2, 0.1);
  b.box(1.6, 0.03, 1.2, c.tarp, 1.6, 0.56, 0.2, 0.1);
  limb(b, [-1.9, 0, -0.9], [-1.9, 2.1, -0.9], 0.03, c.ironDark, 5);
  for (const a of [0, 2.1, 4.2]) limb(b, [-1.9, 0.5, -0.9], [-1.9 + Math.sin(a) * 0.5, 0, -0.9 + Math.cos(a) * 0.5], 0.018, c.ironDark, 4);
  b.box(0.36, 0.26, 0.14, c.boxDark, -1.9, 2.2, -0.9, 0.8);
  b.box(0.3, 0.2, 0.02, c.glass, -1.9 + Math.sin(0.8) * 0.08, 2.2, -0.9 + Math.cos(0.8) * 0.08, 0.8);
  b.spot('army', 0, 0.6, -1.0);
  b.wall(-0.5, 0, 2.3, 0.2, 0, 0.5, 0.8, false);
  b.post(-1.9, 0, -0.9, 0.18, 2.2);
  b.pop();

  // ---- bake: the standing set with grime; what lies flat without; one mesh ----
  const baseAt = (x, y, z) => b.heightAt(x, z);
  const g1 = bakeParts(b.parts, { weather, baseAt, seed: 30 });
  const g2 = bakeParts(flat.parts, { weather, seed: 31 });
  const geometry = mergeGeometries([g1, g2]);
  g1.dispose();
  g2.dispose();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'mineshaft';
  group.add(mesh);
  const battery = new THREE.Mesh(bakeParts(batB.parts, { weather, seed: 32 }), material);
  battery.name = 'liftBattery';
  group.add(battery);
  // The box's lamp and the cage's: unlit, dull (they glow without lighting anything).
  const glow = new THREE.MeshBasicMaterial({ color: look.colors.live });
  const lampGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const boxLamp = new THREE.Mesh(lampGeo, glow);
  boxLamp.position.copy(b.spots.boxLamp);
  group.add(boxLamp);
  const cageLamp = new THREE.Mesh(lampGeo, glow);
  cageLamp.position.set(b.spots.cage.x, b.spots.cage.y + M.cage.roof - 0.08, b.spots.cage.z);
  cageLamp.scale.setScalar(1.6);
  group.add(cageLamp);
  const parts = { battery, boxLamp, cageLamp };
  return {
    group,
    mesh,
    parts,
    spots: b.spots,
    colliders: b.colliders,
    dispose() {
      group.removeFromParent();
      mesh.geometry.dispose();
      battery.geometry.dispose();
      lampGeo.dispose();
      material.dispose();
      glow.dispose();
    },
  };
}
