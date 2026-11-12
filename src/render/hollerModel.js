// The moonshiners' holler's set (Session 29; DESIGN.md "Moonshiners'
// holler"). The Rigsbys' still (a draft name), up a narrow hollow the
// family trapped against the law. When the lights came over the government
// land they took them for revenue men coming for the still, and strung the
// holler shut. All in code, baked into ONE vertex-coloured mesh
// (render/propKit.js, render/setBuilder.js), plus a few small meshes that
// change in play: no lights (the firebox's glow is an unlit part), dull
// colours (the glare rule).
//
//  - the hollow itself is in the ground (world/hollerGround.js): the set
//    dresses its faces in rock ledges and laurel, trunks going up into the
//    dark on both ridges, the branch (the creek) running down the floor
//    from the spring at the head;
//  - at the mouth, a POSTED sign nailed to a tree, and the first trap
//    already sprung: a shotgun bolted to a stump, its line slack, and a man
//    in a black suit face down in front of it (they did come, just not for
//    the still);
//  - the traps up the floor (their armed and sprung looks are runs of one
//    mesh: `traps`): shotguns on stumps with fishing line across the
//    path, tin cans hung on wire, bent saplings pegged over a noose, and
//    leaves piled too neatly over a bear trap;
//  - halfway up, the family's lookout: a lean-to of boards and tin against
//    the right-hand face, a bench, a coffee can of cigarette ends, the trap
//    map tacked to a board, the wire cutters in an open tackle box;
//  - the still's yard at the head: the still on its stone firebox (the
//    copper pot, its cap and the gauge), the thump keg, the flake stand
//    with the copper worm in it and the trough from the spring, mash
//    barrels, sacks, crates of jars, the woodpile; the family's shed against
//    the headwall, open down its front: the gun cabinet with the auto
//    shotgun, ammo cans; Pa's shutdown board on a post by the still.
//
// Model space: Tom walks in from -z; the origin is the clearing's middle;
// +x is his LEFT as he walks in (as the sawmill's and the crash site's:
// world/HollerSite.js converts). The floor winds: floorMid(z) is its middle.
//
// buildHoller(cfg, { weather, heightAt, keepAt }) returns { group, mesh,
// parts, spots, colliders, traps, setTrap(i, look), dispose }. parts: the
// small meshes (cutters, trapMap, autoShotgun, coil, needle, fireGlow).
// traps: config's layout with model points ({ id, kind, x, z, a, b, gun,
// mapped }); setTrap(i, 'armed' | 'sprung') shows that trap's look.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';
import { deadMan, limb, log, blood } from './sawmillModel.js';
import { floorMid, floorHalf } from '../world/hollerGround.js';

// The set's measurements (metres, model space; x left). The traps' layout is config's
// (config.holler.traps), so the beat and the set read the same list.
export const HOLLER = {
  sign: { z: -27.5 },
  lookout: { z: -5, depth: 2.2, width: 3.2 },
  still: { z: 15.5 },
  shed: { x0: -7.2, x1: -2.4, z0: 17.4, z1: 21.0, wall: 2.3, ridge: 2.9 },
  note: { dx: -3.4, z: 12.6 },
};

const mid = (g, z) => floorMid(g, z);

// ---- small pieces ------------------------------------------------------------------------------

// A boulder (its frame: on the ground). r: its size.
function rock(b, r, x, z, flat = 0.6) {
  const c = b.c;
  b.pushOnGround(x, -r * 0.25, z, b.rand() * 6, (b.rand() - 0.5) * 0.3, (b.rand() - 0.5) * 0.3);
  b.put(new THREE.DodecahedronGeometry(r, 0).scale(1 + b.rand() * 0.4, flat + b.rand() * 0.3, 1 + b.rand() * 0.3), b.rand() < 0.5 ? c.rock : c.rockDark, 0, r * 0.4, 0);
  b.pop();
}

// A clump of laurel (rhododendron): dark leathery lumps.
function laurel(b, r, x, z) {
  const c = b.c;
  b.pushOnGround(x, 0, z, b.rand() * 6);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.1 + b.rand();
    const s = r * (0.6 + b.rand() * 0.4);
    b.put(new THREE.IcosahedronGeometry(s, 1).scale(1, 0.55, 1), k % 2 ? c.laurel : c.laurelDark, Math.sin(a) * r * 0.5, s * 0.25, Math.cos(a) * r * 0.5);
  }
  b.pop();
}

// A trunk (the sign's tree; the ridges' trees are the forest's: GroundField closes its mask there).
function trunk(b, r, h, x, z) {
  const c = b.c;
  b.pushOnGround(x, -0.3, z, b.rand() * 6, (b.rand() - 0.5) * 0.08, (b.rand() - 0.5) * 0.08);
  b.put(new THREE.CylinderGeometry(r * 0.55, r, h, 6, 1, true), b.rand() < 0.5 ? c.bark : c.barkDark, 0, h / 2, 0);
  b.pop();
}

// A wooden barrel standing (its frame: on the ground).
function barrel(b, r = 0.3, h = 0.85, color = null) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(r * 0.94, r * 0.94, h, 9, 1, false), color ?? c.stave, 0, h / 2, 0);
  for (const y of [0.12, h - 0.12]) b.put(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.04, 9, 1, true), c.hoop, 0, y, 0);
}

// A stake driven into the ground (its frame: on the ground).
function stake(b, h = 0.42) {
  const c = b.c;
  b.box(0.05, h, 0.05, c.stake, 0, h / 2 - 0.05, 0, b.rand(), (b.rand() - 0.5) * 0.15, (b.rand() - 0.5) * 0.15);
}

// A single-barrel shotgun bolted to a stump (its frame: the stump on the ground, the muzzle along +z).
function stumpGun(b) {
  const c = b.c;
  b.put(new THREE.CylinderGeometry(0.24, 0.3, 0.52, 8), c.barkDark, 0, 0.26, 0);
  b.put(new THREE.CircleGeometry(0.24, 8).rotateX(-Math.PI / 2), c.endGrain, 0, 0.521, 0);
  b.box(0.06, 0.07, 0.44, c.gunStock, 0, 0.58, -0.22); // the stock
  b.put(new THREE.CylinderGeometry(0.016, 0.016, 0.72, 6).rotateX(Math.PI / 2), c.gunMetal, 0, 0.6, 0.32); // the barrel
  b.box(0.04, 0.05, 0.16, c.gunMetal, 0, 0.585, 0.02); // the action
  for (const z of [-0.12, 0.2]) b.box(0.22, 0.03, 0.03, c.wire, 0, 0.56, z); // the wire it's lashed down with
  b.put(new THREE.TorusGeometry(0.03, 0.006, 3, 6), c.wire, 0, 0.55, 0.0); // the trigger's eye screw
}

// The fishing line from a to b (model points, the line's height h), taut or slack on the ground.
function line(b, a, bb, h, taut) {
  const c = b.c;
  const dx = bb.x - a.x;
  const dz = bb.z - a.z;
  const len = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const ya = b.heightAt(a.x, a.z);
  const yb = b.heightAt(bb.x, bb.z);
  if (taut) {
    const pitch = -Math.atan2(yb - ya, len);
    b.push((a.x + bb.x) / 2, (ya + yb) / 2 + h, (a.z + bb.z) / 2, yaw, pitch);
    b.box(0.007, 0.007, len, c.line, 0, 0, 0);
    b.pop();
  } else {
    // Cut or snapped: the two halves lying in the leaves, kinked.
    for (const [p, s] of [[a, 1], [bb, -1]]) {
      const n = 4;
      let x = p.x;
      let z = p.z;
      for (let k = 0; k < n; k++) {
        const step = len / 2 / n;
        const t = yaw + (s < 0 ? Math.PI : 0) + (b.rand() - 0.5) * 0.7;
        const nx = x + Math.sin(t) * step;
        const nz = z + Math.cos(t) * step;
        b.push((x + nx) / 2, b.heightAt((x + nx) / 2, (z + nz) / 2) + 0.012, (z + nz) / 2, t);
        b.box(0.007, 0.007, step, c.line, 0, 0, 0);
        b.pop();
        x = nx;
        z = nz;
      }
    }
  }
}

// ---- the traps' two looks (their own builders: runs of one mesh) --------------------------------

// t: the trap in model space. look: 'armed' | 'sprung'.
function trapLook(b, t, look, g) {
  const c = b.c;
  const armed = look === 'armed';
  if (t.kind === 'shotgun') {
    line(b, t.a, t.b, 0.22, armed);
    if (armed) {
      // The trigger line from the near end round to the gun's eye screw, low along the ground.
      const near = Math.hypot(t.a.x - t.gun.x, t.a.z - t.gun.z) < Math.hypot(t.b.x - t.gun.x, t.b.z - t.gun.z) ? t.a : t.b;
      line(b, near, { x: t.gun.x, z: t.gun.z }, 0.2, true);
    }
  } else if (t.kind === 'cans') {
    line(b, t.a, t.b, armed ? 0.32 : 0, armed);
    const n = 7;
    for (let k = 0; k < n; k++) {
      const f = 0.25 + (k / (n - 1)) * 0.5;
      const x = t.a.x + (t.b.x - t.a.x) * f;
      const z = t.a.z + (t.b.z - t.a.z) * f;
      if (armed) {
        b.pushOnGround(x, 0.2, z, b.rand() * 6, (b.rand() - 0.5) * 0.3);
        b.put(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 7, 1, true), k % 2 ? c.can : c.canRust, 0, 0, 0);
        b.box(0.004, 0.08, 0.004, c.wire, 0, 0.08, 0);
        b.pop();
      } else {
        b.pushOnGround(x + (b.rand() - 0.5) * 0.6, 0.035, z + (b.rand() - 0.5) * 0.6, b.rand() * 6);
        b.put(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 7, 1, true).rotateZ(Math.PI / 2), k % 2 ? c.can : c.canRust, 0, 0, 0);
        b.pop();
      }
    }
  } else if (t.kind === 'bear') {
    b.pushOnGround(t.x, 0, t.z, t.yaw ?? 0);
    if (armed) {
      // Leaves piled too neatly: a smooth low dome, all one colour, a little too round.
      b.put(new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.52, 0.09, 0.52), c.leavesNeat, 0, 0, 0);
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7;
        b.box(0.08, 0.008, 0.06, k % 2 ? c.leaves : c.leavesNeat, Math.sin(a) * 0.3, 0.07 - (k % 3) * 0.015, Math.cos(a) * 0.3, a);
      }
      // A link of chain out from under the pile to its stake.
      b.box(0.02, 0.02, 0.4, c.trapIron, 0.62, 0.02, 0.1, 0.3);
      b.push(0.8, 0, 0.2);
      stake(b, 0.3);
      b.pop();
    } else {
      // Sprung: the jaws shut, standing up out of the scattered leaves.
      b.box(0.5, 0.012, 0.08, c.trapIron, 0, 0.01, 0);
      b.put(new THREE.TorusGeometry(0.17, 0.014, 3, 10, Math.PI), c.trapIron, 0, 0.02, 0);
      b.put(new THREE.TorusGeometry(0.17, 0.014, 3, 10, Math.PI), c.trapIron, 0, 0.02, 0.012);
      for (let k = -3; k <= 3; k++) b.box(0.012, 0.03, 0.012, c.trapIron, k * 0.045, 0.17 - Math.abs(k) * 0.02, 0.006);
      b.box(0.02, 0.02, 0.5, c.trapIron, 0.5, 0.012, 0.1, 0.3);
      b.push(0.8, 0, 0.2);
      stake(b, 0.3);
      b.pop();
      for (let k = 0; k < 14; k++) {
        const a = b.rand() * 6.3;
        const r = 0.3 + b.rand() * 0.6;
        b.box(0.08, 0.006, 0.06, k % 2 ? c.leaves : c.leavesNeat, Math.sin(a) * r, 0.006, Math.cos(a) * r, a);
      }
    }
    b.pop();
  } else if (t.kind === 'snare') {
    // The sapling stands on the slope beside the floor (t.tree); the noose on the floor (t.x, t.z).
    const tree = t.tree;
    const ty = b.heightAt(tree.x, tree.z);
    const ny = b.heightAt(t.x, t.z);
    if (armed) {
      // Bent over in an arc to a peg by the noose.
      const n = 6;
      let prev = [tree.x, ty, tree.z];
      for (let k = 1; k <= n; k++) {
        const f = k / n;
        const x = tree.x + (t.x - tree.x) * f * 0.9;
        const z = tree.z + (t.z - tree.z) * f * 0.9;
        const y = ty + Math.sin(f * Math.PI * 0.9) * 2.4 * (1 - f * 0.4) + (ny - ty) * f + 0.15 * f;
        const p = [x, y, z];
        limb(b, prev, p, 0.05 * (1 - f * 0.6), c.sapling, 5, 0.05 * (1 - (f + 0.17) * 0.6));
        prev = p;
      }
      limb(b, prev, [t.x, ny + 0.12, t.z], 0.006, c.cord, 3);
      b.push(t.x, ny, t.z);
      b.box(0.04, 0.2, 0.04, c.stake, 0.06, 0.05, 0.0); // the trigger peg
      b.put(new THREE.TorusGeometry(0.24, 0.01, 3, 12).rotateX(Math.PI / 2), c.cord, 0, 0.02, 0); // the noose, laid open
      b.pop();
    } else {
      // Sprung: the sapling upright again, the noose hanging from it, the peg pulled.
      limb(b, [tree.x, ty, tree.z], [tree.x + 0.1, ty + 3.4, tree.z + 0.05], 0.05, c.sapling, 5, 0.018);
      limb(b, [tree.x + 0.08, ty + 3.0, tree.z + 0.04], [tree.x + 0.1, ty + 1.7, tree.z + 0.1], 0.006, c.cord, 3);
      b.push(tree.x + 0.1, ty + 1.55, tree.z + 0.1);
      b.put(new THREE.TorusGeometry(0.13, 0.01, 3, 10), c.cord, 0, 0, 0);
      b.pop();
      b.pushOnGround(t.x + 0.3, 0.02, t.z + 0.2, 1.2, 0, Math.PI / 2);
      b.box(0.04, 0.2, 0.04, c.stake, 0, 0, 0);
      b.pop();
    }
  }
}

// ---- the set -----------------------------------------------------------------------------------

export function buildHoller(cfg, { weather = null, heightAt = null, keepAt = null, ground } = {}) {
  const look = cfg.look;
  const g = ground; // config.map.holler (the floor's shape)
  const b = new SetBuilder(look, heightAt, 2901);
  const c = b.c;
  const H = HOLLER;
  const keep = keepAt ?? (() => 1);
  const cuttersB = new SetBuilder(look, heightAt, 2902);
  const mapB = new SetBuilder(look, heightAt, 2903);
  const gunB = new SetBuilder(look, heightAt, 2904);
  const coilB = new SetBuilder(look, heightAt, 2905);
  const needleB = new SetBuilder(look, heightAt, 2906);
  const glowB = new SetBuilder(look, heightAt, 2907);
  // What lies flat on the ground (the creek, the litter, the man at the mouth): baked without the
  // grime that runs up from the ground (it would black them out), then merged into the set's mesh.
  const fb = new SetBuilder(look, heightAt, 2908);

  b.spot('arrive', mid(g, -33), 0, -33);
  b.spot('middle', 0, 0, 0);

  // ---- the faces: rock ledges at their feet (solid, but for the gullies), laurel, trunks ----
  const edgeX = (z, s) => mid(g, z) + s * (floorHalf(g, z) + 0.7);
  for (const s of [1, -1]) {
    for (let z = g.mouth; z < g.head + 0.5; z += 2.6) {
      const z2 = Math.min(g.head + 0.5, z + 2.6);
      const x = edgeX(z, s);
      const x2 = edgeX(z2, s);
      const kept = keep(x, z) > 0.8 && keep(x2, z2) > 0.8;
      if (!kept) continue;
      b.wall(x, z, x2, z2, b.heightAt(x, z), 0.5, 2.5, true);
      if (b.rand() < 0.8) rock(b, 0.55 + b.rand() * 0.7, x + s * 0.4, z + b.rand() * 2);
      if (b.rand() < 0.5) rock(b, 0.4 + b.rand() * 0.4, x + s * 1.6, z + b.rand() * 2);
      if (b.rand() < 0.55) laurel(b, 0.7 + b.rand() * 0.4, x + s * (1.4 + b.rand() * 1.2), z + b.rand() * 2.4);
    }
  }
  // The headwall: ledges across the head, laurel above.
  for (let x = edgeX(g.head, -1); x < edgeX(g.head, 1); x += 2.4) {
    const z = g.head + 0.9;
    if (keep(x, z) > 0.8 && keep(x + 2.4, z) > 0.8) b.wall(x, z, Math.min(x + 2.4, edgeX(g.head, 1)), z, b.heightAt(x, z), 0.5, 2.5, true);
    rock(b, 0.7 + b.rand() * 0.6, x + 1.2, z + 0.4);
    if (b.rand() < 0.5) laurel(b, 0.8 + b.rand() * 0.4, x + b.rand() * 2, z + 1.6 + b.rand());
  }
  // ---- the branch: the creek down the floor from the spring at the head ----
  for (let z = g.head - 0.6; z > g.mouth - 2; z -= 1.4) {
    const x = mid(g, z) + floorHalf(g, z) * 0.55;
    const x2 = mid(g, z - 1.4) + floorHalf(g, z - 1.4) * 0.55;
    const y = b.heightAt(x, z);
    fb.push((x + x2) / 2, y + 0.015, z - 0.7, Math.atan2(x2 - x, -1.4));
    fb.box(0.38 + b.rand() * 0.2, 0.01, 1.48, c.water, 0, 0, 0);
    fb.pop();
    if (b.rand() < 0.7) {
      fb.pushOnGround(x + (b.rand() - 0.5) * 0.7, 0, z - b.rand(), b.rand() * 6);
      fb.put(new THREE.DodecahedronGeometry(0.12 + b.rand() * 0.12, 0).scale(1.3, 0.5, 1), fb.c.wetStone, 0, 0.04, 0);
      fb.pop();
    }
  }
  // The spring: a rock lip at the headwall's foot where the water comes out.
  const springX = mid(g, g.head) + floorHalf(g, g.head) * 0.55;
  rock(b, 0.6, springX + 0.6, g.head + 0.6, 0.5);
  rock(b, 0.5, springX - 0.6, g.head + 0.5, 0.5);
  b.spot('spring', springX, 0, g.head - 0.3);

  // Leaf litter the length of the floor, so the one neat pile reads as wrong.
  for (let k = 0; k < 120; k++) {
    const z = g.mouth + b.rand() * (g.head - g.mouth);
    const x = mid(g, z) + (b.rand() - 0.5) * floorHalf(g, z) * 1.7;
    fb.pushOnGround(x, 0.006, z, b.rand() * 6);
    fb.box(0.1 + b.rand() * 0.08, 0.006, 0.08 + b.rand() * 0.06, b.rand() < 0.5 ? c.leaves : c.leavesDark, 0, 0, 0);
    fb.box(0.1 + b.rand() * 0.08, 0.006, 0.08 + b.rand() * 0.06, b.rand() < 0.5 ? c.leaves : c.leavesDark, 0.25, 0.002, 0.15, 1.1);
    fb.box(0.1 + b.rand() * 0.08, 0.006, 0.08 + b.rand() * 0.06, b.rand() < 0.5 ? c.leaves : c.leavesDark, -0.2, 0.001, 0.22, 2.3);
    fb.pop();
  }
  // Fallen logs along the floor's edges.
  for (const [z, s] of [[-20, 1], [-8, -1], [3, 1], [-15, -1]]) {
    const x = mid(g, z) + s * (floorHalf(g, z) - 0.6);
    b.pushOnGround(x, 0.2, z, 0.1 * s);
    log(b, 3.2, 0.2, 0, 0, 0, Math.PI / 2 + 0.2 * s);
    b.pop();
  }

  // ---- the mouth: the POSTED sign on a tree ----
  {
    const z = H.sign.z;
    const x = mid(g, z) - floorHalf(g, z) - 0.2;
    trunk(b, 0.24, 12, x, z);
    b.pushOnGround(x + 0.28, 1.6, z, -Math.PI / 2 + 0.25);
    b.box(0.62, 0.36, 0.025, c.board, 0, 0, 0);
    // Painted letters: dark dabs in two lines.
    for (let k = 0; k < 6; k++) b.box(0.07, 0.09, 0.006, c.paint, -0.2 + k * 0.08, 0.07, 0.016);
    for (let k = 0; k < 8; k++) b.box(0.05, 0.06, 0.006, c.paint, -0.24 + k * 0.068, -0.08, 0.016);
    b.pop();
    b.spot('sign', x + 1.2, 0, z);
  }

  // ---- the traps (their looks are runs: below); the guns on their stumps are the set's ----
  const traps = cfg.traps.map((t, i) => {
    const m = { i, id: t.id, kind: t.kind, mapped: t.mapped !== false, sprung: Boolean(t.sprung) };
    const zm = mid(g, t.z);
    if (t.kind === 'shotgun' || t.kind === 'cans') {
      const w = t.span ?? floorHalf(g, t.z) - 0.2;
      m.a = { x: zm + w, z: t.z + (t.skew ?? 0) };
      m.b = { x: zm - w, z: t.z - (t.skew ?? 0) };
      m.x = zm;
      m.z = t.z;
      b.pushOnGround(m.a.x, 0, m.a.z);
      stake(b);
      b.pop();
      b.pushOnGround(m.b.x, 0, m.b.z);
      stake(b);
      b.pop();
    } else {
      m.x = zm + (t.dx ?? 0);
      m.z = t.z;
      m.yaw = t.yaw ?? 0;
    }
    if (t.kind === 'shotgun') {
      // The stump on one side, set back a little up the hollow, the gun aimed back at the line's middle.
      const s = t.side ?? 1;
      const gx = zm + s * (floorHalf(g, t.z) + 0.1);
      const gz = t.z + (t.back ?? 2.2);
      const yaw = Math.atan2(m.x - gx, m.z - gz);
      b.pushOnGround(gx, 0, gz, yaw);
      stumpGun(b);
      b.pop();
      m.gun = { x: gx, y: b.heightAt(gx, gz) + 0.6, z: gz, yaw };
    }
    if (t.kind === 'snare') {
      const s = t.side ?? 1;
      m.tree = { x: m.x + s * 2.4, z: m.z + 0.4 };
    }
    return m;
  });
  // The first trap's lesson: a man in a black suit face down in front of it, a week dead.
  const first = traps.find((t) => t.sprung && t.kind === 'shotgun');
  if (first) {
    fb.pushOnGround(first.x + 0.4, 0, first.z - 0.9, Math.PI + 0.3);
    deadMan(fb, 'mib', { prone: true, arms: [2.4, 1.2], legs: [0.1, 0.3], head: -0.6 });
    blood(fb, 0.6, 0, 0.35);
    fb.pop();
    b.spot('agent', first.x + 0.4, 0, first.z - 2.0);
  }

  // ---- the lookout, halfway up: a lean-to against the right-hand face ----
  {
    const L = H.lookout;
    const z = L.z;
    const xr = mid(g, z) - floorHalf(g, z) + 0.2; // its back to the right-hand ledge
    const y0 = b.heightAt(xr + 1, z);
    b.push(xr + L.depth / 2, y0, z, 0);
    // Posts, a sloped tin roof, a board back.
    for (const sz of [-L.width / 2, L.width / 2]) {
      b.box(0.1, 2.1, 0.1, c.post, L.depth / 2 - 0.1, 1.05, sz);
      b.box(0.1, 1.5, 0.1, c.post, -L.depth / 2 + 0.1, 0.75, sz);
    }
    b.box(L.depth + 0.4, 0.03, L.width + 0.4, c.tin, 0, 1.85, 0, 0, 0, 0.26);
    b.box(0.04, 1.5, L.width, c.board, -L.depth / 2 + 0.05, 0.75, 0);
    // The bench, a coffee can of ends, a thermos, a jar.
    b.box(1.2, 0.05, 0.4, c.board, -0.3, 0.45, 0.6);
    for (const sz of [0.45, 0.75]) b.box(0.05, 0.45, 0.05, c.postDark, -0.3, 0.22, sz);
    b.put(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), c.canRust, -0.6, 0.55, 0.65);
    b.put(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 8), c.thermos, -0.1, 0.6, 0.55);
    b.put(new THREE.CylinderGeometry(0.045, 0.04, 0.13, 8), c.jar, 0.15, 0.54, 0.7);
    // The board the map's tacked to (the map's its own mesh).
    b.box(0.03, 0.7, 0.9, c.boardDark, -L.depth / 2 + 0.09, 1.1, -0.5);
    mapB.stack = [b.m.clone()];
    mapB.box(0.008, 0.42, 0.56, c.paper, -L.depth / 2 + 0.11, 1.12, -0.5);
    for (let k = 0; k < 7; k++) mapB.box(0.004, 0.02 + (k % 3) * 0.02, 0.05 + (k % 2) * 0.06, c.ink, -L.depth / 2 + 0.117, 1.0 + k * 0.035, -0.62 + (k % 4) * 0.08);
    b.spot('trapMap', 0.1, 0, -0.5);
    // The tackle box on the bench, open, the cutters in its tray (the cutters are their own mesh).
    b.box(0.34, 0.12, 0.18, c.tackle, -0.35, 0.53, 0.3);
    b.box(0.34, 0.02, 0.18, c.tackle, -0.35, 0.66, 0.4, 0, 1.1, 0);
    cuttersB.stack = [b.m.clone()];
    cuttersB.box(0.03, 0.02, 0.2, c.gunMetal, -0.38, 0.6, 0.29, 0.2);
    cuttersB.box(0.025, 0.025, 0.12, c.cutterGrip, -0.42, 0.61, 0.21, 0.35);
    cuttersB.box(0.025, 0.025, 0.12, c.cutterGrip, -0.34, 0.61, 0.21, 0.05);
    b.spot('cutters', 0.4, 0, 0.3);
    // A cot of feed sacks, and the coffee can of shells by the post.
    b.box(0.7, 0.12, 1.4, c.sack, -0.4, 0.06, -0.6);
    b.spot('lookout', 0.9, 0, 0);
    b.wall(-L.depth / 2, -L.width / 2, -L.depth / 2, L.width / 2, 0, 0.12, 2.0, true);
    b.post(L.depth / 2 - 0.1, 0, -L.width / 2, 0.12, 2.1);
    b.post(L.depth / 2 - 0.1, 0, L.width / 2, 0.12, 2.1);
    b.pop();
  }

  // ---- the still's yard ----
  const S = H.still;
  const sx = mid(g, S.z);
  const sz = S.z;
  b.spot('still', sx, 0, sz - 1.6);
  {
    const y0 = b.heightAt(sx, sz);
    b.push(sx, y0, sz, 0);
    // The firebox: laid stone, its iron door and damper facing down the hollow.
    b.box(1.5, 0.75, 1.4, c.stone, 0, 0.375, 0);
    for (let k = 0; k < 10; k++) b.box(0.32, 0.16, 0.02, k % 2 ? c.stoneDark : c.rock, -0.55 + (k % 4) * 0.36, 0.12 + Math.floor(k / 4) * 0.2, -0.705);
    b.box(0.46, 0.3, 0.03, c.iron, 0, 0.3, -0.725);
    b.box(0.16, 0.06, 0.04, c.ironDark, 0.3, 0.6, -0.73); // the damper's handle
    b.spot('damper', 0.3, 0, -1.25);
    // The fire's glow through the door's gaps (its own unlit mesh: it dies when the damper's shut).
    glowB.stack = [b.m.clone()];
    glowB.box(0.52, 0.36, 0.01, c.glow, 0, 0.3, -0.712); // behind the door: shows round its edges
    // The copper pot on it, its cap, the gauge on the cap's front, the relief cock on top.
    b.put(new THREE.CylinderGeometry(0.62, 0.58, 0.9, 14), c.copper, 0, 1.2, 0);
    b.put(new THREE.SphereGeometry(0.62, 14, 5, 0, Math.PI * 2, 0, Math.PI / 2), c.copperDark, 0, 1.65, 0);
    b.put(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 10), c.copper, 0, 2.2, 0);
    for (let k = 0; k < 8; k++) b.box(0.05, 0.04, 0.05, c.dough, Math.sin(k * 0.8) * 0.6, 1.66, Math.cos(k * 0.8) * 0.6); // the cap sealed with rye paste
    // The gauge stands off the cap on a pipe, its face toward the hollow.
    limb(b, [0, 1.75, -0.45], [0, 1.95, -0.62], 0.025, c.copper, 6);
    b.put(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14).rotateX(Math.PI / 2), c.gauge, 0, 2.0, -0.64);
    b.put(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 14).rotateX(Math.PI / 2), c.gaugeFace, 0, 2.0, -0.668);
    for (let k = 0; k < 4; k++) {
      const a = (0.3 + k * 0.13) * Math.PI; // the red band: the last stretch of the sweep (the needle's angle there)
      b.box(0.045, 0.03, 0.008, c.gaugeRed, -Math.sin(a) * 0.115, 2.0 + Math.cos(a) * 0.115, -0.674, 0, 0, a);
    }
    needleB.stack = [b.m.clone()];
    needleB.push(0, 2.0, -0.68);
    needleB.box(0.012, 0.13, 0.006, c.ink, 0, 0.055, 0);
    needleB.pop();
    b.spot('gauge', 0, 2.0, -0.68);
    b.put(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), c.brassValve, -0.3, 2.1, -0.1);
    b.box(0.18, 0.025, 0.04, c.ironDark, -0.3, 2.22, -0.1); // the relief cock's handle
    b.spot('relief', -0.95, 0, -0.7);
    // The cap's arm over to the thump keg, its cock halfway along.
    b.put(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8).rotateZ(Math.PI / 2 - 0.15), c.copper, 0.95, 2.18, 0);
    b.put(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8).rotateZ(Math.PI / 2), c.brassValve, 1.0, 2.17, 0);
    b.box(0.04, 0.2, 0.03, c.ironDark, 1.0, 2.3, 0); // the line cock's handle
    b.spot('line', 1.2, 0, -0.95);
    // The thump keg, on blocks, the line on down to the flake stand.
    b.push(1.95, 0, 0.1);
    b.box(0.7, 0.2, 0.7, c.stoneDark, 0, 0.1, 0);
    b.push(0, 0.2, 0);
    barrel(b, 0.36, 1.0, c.staveDark);
    b.pop();
    b.pop();
    limb(b, [2.0, 1.25, 0.1], [3.2, 1.3, 0.3], 0.04, c.copper, 6);
    limb(b, [3.2, 1.3, 0.3], [3.4, 1.1, 0.35], 0.04, c.copper, 6);
    // The flake stand: a tall barrel of spring water, the worm's coil just showing over its rim
    // (the coil's its own mesh: Tom takes it), the spout where the run comes out into a jar.
    b.push(3.5, 0, 0.4);
    barrel(b, 0.42, 1.25, c.stave);
    b.put(new THREE.CircleGeometry(0.38, 10).rotateX(-Math.PI / 2), c.water, 0, 1.16, 0);
    b.box(0.03, 0.03, 0.2, c.copper, 0, 0.3, -0.48);
    b.put(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 8), c.jar, 0, 0.08, -0.62);
    coilB.stack = [b.m.clone()];
    for (let k = 0; k < 5; k++) coilB.put(new THREE.TorusGeometry(0.28, 0.022, 4, 12).rotateX(Math.PI / 2), k % 2 ? c.copper : c.copperDark, 0, 0.45 + k * 0.17, 0);
    coilB.put(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 5), c.copper, 0.28, 1.2, 0);
    b.spot('coil', 0.3, 0, -1.1);
    b.post(0, 0, 0, 0.5, 1.3);
    b.pop();
    b.pop();
    b.post(sx, y0, sz, 0.85, 2.3);
    b.post(sx + 1.95, y0, sz + 0.1, 0.45, 1.3);
  }
  // The trough: from the spring down to the flake stand.
  {
    const fx = sx + 3.5;
    const fz = sz + 0.4;
    const n = 5;
    for (let k = 0; k < n; k++) {
      const f0 = k / n;
      const f1 = (k + 1) / n;
      const ax = springX + (fx - springX) * f0;
      const az = g.head - 0.3 + (fz - g.head + 0.3) * f0;
      const bx = springX + (fx - springX) * f1;
      const bz = g.head - 0.3 + (fz - g.head + 0.3) * f1;
      const y = Math.max(b.heightAt(ax, az), b.heightAt(bx, bz)) + 1.35 - f0 * 0.15;
      limb(b, [ax, y, az], [bx, y - 0.04, bz], 0.07, c.bark, 6);
      b.pushOnGround(bx, 0, bz);
      b.box(0.05, y - b.heightAt(bx, bz), 0.05, c.stake, 0, (y - b.heightAt(bx, bz)) / 2, 0);
      b.pop();
    }
  }
  // Mash barrels in a row, their lids off, a paddle across one; sacks; crates of jars; the woodpile.
  for (let k = 0; k < 4; k++) {
    const x = sx + 1.4 + k * 0.75;
    const z = sz + 3.1 + (k % 2) * 0.2;
    b.pushOnGround(x, 0, z, b.rand());
    barrel(b, 0.34, 0.9, k % 2 ? c.stave : c.staveDark);
    b.put(new THREE.CircleGeometry(0.31, 9).rotateX(-Math.PI / 2), c.mash, 0, 0.82, 0);
    if (k === 1) limb(b, [-0.4, 0.95, 0], [0.4, 0.95, 0.05], 0.025, c.board, 4);
    b.pop();
    b.post(x, 0, z, 0.36, 0.9);
  }
  b.spot('mash', sx + 2.5, 0, sz + 2.0);
  for (let k = 0; k < 4; k++) {
    b.pushOnGround(sx - 2.6 + (k % 2) * 0.6, 0.15 + Math.floor(k / 2) * 0.24, sz + 1.0 + (k % 2) * 0.2, b.rand() * 0.4);
    b.put(new THREE.SphereGeometry(1, 7, 5).scale(0.3, 0.16, 0.42), c.sack, 0, 0, 0);
    b.pop();
  }
  b.post(sx - 2.3, 0, sz + 1.1, 0.6, 0.6);
  for (let k = 0; k < 3; k++) {
    const x = sx - 1.0 - k * 0.55;
    const z = sz - 3.2 + k * 0.1;
    b.pushOnGround(x, 0, z, 0.1 * k);
    b.box(0.5, 0.26, 0.36, c.board, 0, 0.13, 0);
    for (let j = 0; j < 6; j++) b.put(new THREE.CylinderGeometry(0.045, 0.04, 0.14, 7), c.jar, -0.16 + (j % 3) * 0.16, 0.3, -0.08 + Math.floor(j / 3) * 0.16);
    b.pop();
  }
  b.spot('jars', sx - 1.5, 0, sz - 4.2);
  for (let k = 0; k < 12; k++) {
    const x = sx - 6.0;
    const z = sz - 1.5 + (k % 4) * 0.42;
    b.pushOnGround(x, 0.15 + Math.floor(k / 4) * 0.26, z);
    log(b, 1.0, 0.12, 0, 0, 0, Math.PI / 2 + 0.05 * k, c.bark);
    b.pop();
  }
  b.post(sx - 6.0, 0, sz - 0.9, 0.7, 0.8);
  // Pa's shutdown board on a post by the still.
  {
    const nx = sx + H.note.dx;
    const nz = H.note.z;
    b.pushOnGround(nx, 0, nz, 0.15);
    b.box(0.08, 1.5, 0.08, c.post, 0, 0.75, 0);
    b.box(0.46, 0.34, 0.025, c.boardDark, 0, 1.25, -0.06);
    for (let k = 0; k < 4; k++) b.box(0.3 - k * 0.04, 0.025, 0.006, c.chalk, -0.02, 1.36 - k * 0.07, -0.075);
    b.pop();
    b.spot('note', nx, 0, nz - 0.9);
    b.post(nx, 0, nz, 0.08, 1.5);
  }
  // The family's dead (they lie where they sat about the still, until they're up): their places.
  for (const [k, [dx, dz]] of [[-2.2, -1.6], [3.0, -2.6], [-4.6, 0.2], [4.4, 1.6], [0.6, 3.0]].entries()) b.spot(`kin${k}`, sx + dx, 0, sz + dz);

  // ---- the shed against the headwall: open down its front; the gun cabinet ----
  {
    const D = H.shed;
    const cx = (D.x0 + D.x1) / 2;
    const cz = (D.z0 + D.z1) / 2;
    const w = D.x1 - D.x0;
    const d = D.z1 - D.z0;
    const y0 = b.heightAt(cx, D.z0);
    b.push(cx, y0, cz, 0);
    b.box(w, 0.06, d, c.floor, 0, 0.03, 0);
    // The walls: board and batten, the front open (two posts).
    b.box(w, D.wall, 0.06, c.board, 0, D.wall / 2, d / 2);
    for (const s of [-1, 1]) b.box(0.06, D.wall, d, c.board, (s * w) / 2, D.wall / 2, 0);
    for (let k = 0; k < 9; k++) b.box(0.05, D.wall, 0.02, c.boardDark, -w / 2 + 0.3 + k * 0.62, D.wall / 2, d / 2 - 0.04);
    for (const s of [-1, 1]) b.box(0.1, D.wall + 0.3, 0.1, c.post, (s * (w - 0.1)) / 2, (D.wall + 0.3) / 2, -d / 2 + 0.05);
    // The roof: one slope of rusted tin, high at the front.
    b.box(w + 0.5, 0.03, d + 0.6, c.tin, 0, (D.wall + D.ridge) / 2 + 0.05, 0, 0, Math.atan2(D.ridge - D.wall, d) * -1);
    // The gun cabinet on the back wall, its glass door broken open; the auto shotgun in its rack (its own mesh).
    b.box(0.9, 1.7, 0.35, c.cabinet, 0.4, 0.85, d / 2 - 0.22);
    b.box(0.8, 1.55, 0.02, c.hollow, 0.4, 0.88, d / 2 - 0.4);
    b.box(0.04, 1.5, 0.6, c.cabinet, 0.4 + 0.45, 0.88, d / 2 - 0.7, 0.9); // the door, swung
    gunB.stack = [b.m.clone()];
    gunB.push(0.4, 0.95, d / 2 - 0.3, 0, 0, 0.08);
    gunB.box(0.07, 0.95, 0.09, c.gunMetal, 0, 0, 0); // receiver and barrel, stood up
    gunB.box(0.08, 0.3, 0.11, c.gunStock, 0, -0.55, 0.01); // the stock
    gunB.put(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 10).rotateX(Math.PI / 2), c.gunMetal, 0, -0.08, -0.06); // the drum
    gunB.pop();
    b.spot('cabinet', 0.4, 0, d / 2 - 1.3);
    // Ammo cans stacked under a bench; a calendar; jugs.
    b.box(1.4, 0.06, 0.5, c.board, -1.6, 0.8, d / 2 - 0.3);
    for (let k = 0; k < 5; k++) b.box(0.3, 0.2, 0.16, c.ammoCan, -2.0 + (k % 3) * 0.34, 0.1 + Math.floor(k / 3) * 0.21, d / 2 - 0.3);
    b.spot('ammo', -1.6, 0, d / 2 - 1.3);
    for (let k = 0; k < 4; k++) b.put(new THREE.CylinderGeometry(0.11, 0.13, 0.32, 8), c.jug, -1.3 + k * 0.28, 0.99, d / 2 - 0.3);
    b.box(0.32, 0.42, 0.01, c.paper, 1.4, 1.5, d / 2 - 0.04);
    b.wall(-w / 2, d / 2, w / 2, d / 2, 0, 0.1, D.wall, true);
    b.wall(-w / 2, -d / 2, -w / 2, d / 2, 0, 0.1, D.wall, true);
    b.wall(w / 2, -d / 2, w / 2, d / 2, 0, 0.1, D.wall, true);
    b.post(0.4, 0, d / 2 - 0.22, 0.4, 1.7);
    b.pop();
  }

  // ---- bake ----
  const baseAt = (x, y, z) => b.heightAt(x, z);
  const grimed = bakeParts(b.parts, { weather, baseAt, seed: 29 });
  const flat = bakeParts(fb.parts, { weather, seed: 30 });
  const geometry = mergeGeometries([grimed, flat]);
  grimed.dispose();
  flat.dispose();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'holler';
  group.add(mesh);
  const small = (builder, name, mat = material) => {
    const m = new THREE.Mesh(bakeParts(builder.parts, { weather: mat === material ? weather : null, seed: 29 }), mat);
    m.name = name;
    m.castShadow = mat === material;
    group.add(m);
    return m;
  };
  // The fire's glow: unlit, dull orange (no light).
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
  const parts = {
    cutters: small(cuttersB, 'wireCutters'),
    trapMap: small(mapB, 'trapMap'),
    autoShotgun: small(gunB, 'autoShotgun'),
    coil: small(coilB, 'copperCoil'),
    needle: small(needleB, 'gaugeNeedle'),
    fireGlow: small(glowB, 'fireGlow', glowMat),
  };
  // The needle turns about the gauge's middle: its geometry recentred there.
  const gs = b.spots.gauge;
  parts.needle.geometry.translate(-gs.x, -gs.y, -gs.z);
  parts.needle.position.set(gs.x, gs.y, gs.z);

  // The traps: one mesh, each trap's two looks a run of its vertices.
  const runs = [];
  const geos = [];
  let start = 0;
  traps.forEach((t, i) => {
    for (const lk of ['armed', 'sprung']) {
      const tb = new SetBuilder(look, heightAt, 2950 + i * 2 + (lk === 'sprung' ? 1 : 0));
      trapLook(tb, t, lk, g);
      const geo = bakeParts(tb.parts, { weather, seed: 40 + i });
      const count = geo.getAttribute('position').count;
      runs.push({ trap: i, look: lk, start, count });
      start += count;
      geos.push(geo);
    }
  });
  const trapGeo = mergeGeometries(geos);
  for (const g2 of geos) g2.dispose();
  const laid = trapGeo.getAttribute('position').array.slice();
  const trapMesh = new THREE.Mesh(trapGeo, material);
  trapMesh.name = 'hollerTraps';
  trapMesh.frustumCulled = false; // its runs fold away
  group.add(trapMesh);
  parts.traps = trapMesh;
  const shown = new Map();
  const setTrap = (i, lk) => {
    if (shown.get(i) === lk) return;
    shown.set(i, lk);
    const pos = trapGeo.getAttribute('position');
    const a = pos.array;
    for (const r of runs) {
      if (r.trap !== i) continue;
      const on = r.look === lk;
      for (let k = r.start * 3; k < (r.start + r.count) * 3; k++) a[k] = on ? laid[k] : 0;
    }
    pos.needsUpdate = true;
  };
  traps.forEach((t, i) => setTrap(i, t.sprung ? 'sprung' : 'armed'));
  return {
    group,
    mesh,
    parts,
    spots: b.spots,
    colliders: b.colliders,
    traps,
    runs,
    setTrap,
    dispose() {
      group.removeFromParent();
      for (const m of [mesh, ...Object.values(parts)]) m.geometry.dispose();
      material.dispose();
      glowMat.dispose();
    },
  };
}
