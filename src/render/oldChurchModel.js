// The old church's set (Session 26; DESIGN.md "Time capsule and the old
// church"): Mount Zion Church, Hemlock Gap (draft names), built 1889, empty
// since the winter of 1903. All in code, baked into ONE vertex-coloured mesh
// (render/propKit.js, render/setBuilder.js): one draw call, no lights, dull
// colours (the glare rule).
//
//  - the church: weathered clapboard gone grey, boards missing all over
//    (the inside shows through the gaps), the east wall's back end fallen
//    in under a sagging roof with a hole in it, its rafters bare; tall
//    windows, some boarded over, some broken to black with shards left in;
//  - the steeple over the door, leaning, its belfry open to the weather, the
//    bell hanging askew from a cracked yoke, a piece of its lip lying in the
//    grass at the tower's foot; a bent iron cross on the spire;
//  - inside: the pews tipped and broken, a roof beam fallen across them,
//    the pulpit at the far end;
//  - the lychgate at the graveyard's mouth, its gate hanging open; a path
//    of sunken flagstones to the steps;
//  - the graveyard: old stones leaning every way; and, in a straight row
//    of their own, eleven small identical stones, all cut the same winter,
//    for the people taken on one night (October 13, 1903);
//  - a low iron fence round it all, posts leaning and spans gone; a dead oak;
//  - the plaque: a squat granite block by the path with a cast plaque on
//    its face. The capsule lies under the turf in front of it (the dig
//    mound and the capsule itself are the encounter's: encounters/OldChurch.js).
//
// Model space: Tom arrives from -z (from the crashed plane, the way the
// story brings him); the church's door faces him; the origin is the
// clearing's middle.
//
// buildOldChurch(look, { weather, heightAt }) returns { group, mesh, spots,
// colliders, dispose } (as crashedPlaneModel.js's): spots in model space
// (arrive, lychgate, door, inside, plaque, capsule, taken, bell); colliders:
// circles { x, z, r, top } and segments { seg, ax, az, bx, bz, t, top, blocksShots }.

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

// The church's measurements (metres).
export const CHURCH = {
  halfW: 3.2, // the nave's half width
  front: -4.5, // the nave's front wall (z)
  back: 8.5, // its back wall
  wallH: 4.2,
  ridge: 2.6, // the roof's rise above the walls
  windows: [-1.6, 2.0, 5.6], // window centres along each side (z)
  windowHalf: 0.55,
  sill: 1.2,
  head: 3.4,
  tower: { z: -6.0, half: 1.5, h: 7.0, belfry: 1.8, lean: 0.075, tip: -0.04 },
  lychgate: -16,
  fence: { x: 17, front: -16, back: 9.5 },
};

// The eleven taken, in their row (model space): x of each, and the row's z.
export const TAKEN_ROW = { z: -12.5, x0: -14.6, step: 0.9, count: 11 };

// ---- pieces ------------------------------------------------------------------------------------

// A run of clapboards along a wall (its frame: the run along local x from 0
// to len, facing -z, outside), rows from y0 to y1, each board tipped out at
// its foot so they lap. cut(t, y): no board at distance t along the run and
// height y (a window, a door, the fallen corner). missing: the chance a
// whole board (one 2.2 m length) is gone.
function clapboards(b, len, y0, y1, cut, color, colorDark, missing = 0.07) {
  const rows = Math.round((y1 - y0) / 0.19);
  const seg = 2.2;
  for (let r = 0; r < rows; r++) {
    const y = y0 + (r + 0.5) * ((y1 - y0) / rows);
    const off = (r % 2) * seg * 0.5; // the joints staggered row to row
    for (let t = -off; t < len - 0.01; t += seg) {
      const t0 = Math.max(0, t);
      const t1 = Math.min(len, t + seg);
      if (t1 - t0 < 0.15 || b.rand() < missing) continue;
      // Cut round anything that asks, in 0.25 m steps.
      let start = t0;
      for (let u = t0; u < t1 + 0.25; u += 0.25) {
        const end = Math.min(u, t1);
        if (u >= t1 || cut(Math.min(u + 0.12, t1 - 0.01), y)) {
          if (end - start > 0.2) b.box(end - start + 0.02, 0.2, 0.035, (r + Math.floor(start * 0.7)) % 5 === 0 ? colorDark : color, (start + end) / 2, y, 0, 0, -0.12, 0);
          start = u + 0.25;
        }
      }
    }
  }
}

// A gable's boards: the triangle above the eaves (width 2*half at the
// eaves, nothing at the ridge), in the wall's frame (centred on x = 0).
function gable(b, half, eaves, rise, color, colorDark, missing = () => false) {
  const rows = Math.round(rise / 0.19);
  for (let r = 0; r < rows; r++) {
    const k = (r + 0.5) / rows;
    const w = 2 * half * (1 - k);
    if (w < 0.15 || missing(r)) continue;
    b.box(w, 0.2, 0.035, r % 4 === 0 ? colorDark : color, 0, eaves + k * rise, 0, 0, -0.12, 0);
  }
}

// A tall window in a wall (its frame: the wall's, the window centred at x):
// boarded over (planks across and one corner to corner), or broken (black,
// a few shards left in the frame). The frame round it either way.
function windowAt(b, x, sill, head, half, kind) {
  const c = b.c;
  const h = head - sill;
  const y = (sill + head) / 2;
  b.box(half * 2 + 0.16, 0.08, 0.08, c.trim, x, sill - 0.04, -0.02);
  b.box(half * 2 + 0.16, 0.08, 0.08, c.trim, x, head + 0.04, -0.02);
  for (const s of [-1, 1]) b.box(0.08, h + 0.16, 0.08, c.trim, x + s * (half + 0.04), y, -0.02);
  b.box(half * 2, h, 0.02, c.hollow, x, y, 0.06); // the dark behind it
  if (kind === 'boarded') {
    for (let i = 0; i < 4; i++) b.box(half * 2 + 0.25, 0.17, 0.03, c.boards, x + (b.rand() - 0.5) * 0.08, sill + 0.3 + i * (h - 0.5) / 3, -0.07, 0, 0, (b.rand() - 0.5) * 0.12);
    b.box(Math.hypot(half * 2, h) * 0.95, 0.16, 0.03, c.boardsDark, x, y, -0.1, 0, 0, Math.atan2(h, half * 2) * (b.rand() < 0.5 ? 1 : -1));
  } else {
    // Shards still in the frame's corners, and the glazing bar hanging.
    for (let i = 0; i < 5; i++) {
      const sx = x + (b.rand() < 0.5 ? -1 : 1) * (half - 0.08 - b.rand() * 0.12);
      const sy = b.rand() < 0.5 ? sill + 0.1 + b.rand() * 0.3 : head - 0.1 - b.rand() * 0.3;
      b.box(0.08 + b.rand() * 0.12, 0.12 + b.rand() * 0.25, 0.01, c.glass, sx, sy, -0.01, 0, 0, (b.rand() - 0.5) * 1.2);
    }
    b.box(0.04, h * 0.7, 0.04, c.trim, x + 0.1, y - 0.25, -0.03, 0, 0, 0.35);
  }
}

// A pew (its frame: on the floor, centred, its seat along x): whole, tipped
// onto its back, or broken in the middle with both halves down.
function pew(b, len, kind) {
  const c = b.c;
  if (kind === 'whole') {
    b.box(len, 0.06, 0.4, c.pew, 0, 0.45, 0);
    b.box(len, 0.5, 0.05, c.pewDark, 0, 0.75, 0.2);
    for (const s of [-1, 1]) b.box(0.06, 0.95, 0.45, c.pewDark, s * (len / 2 - 0.03), 0.47, 0.03);
  } else if (kind === 'tipped') {
    // Over on its back: the seat stands up, the back lies flat.
    b.push(0, 0, 0.25, 0, 1.35, 0);
    b.box(len, 0.06, 0.4, c.pew, 0, 0.45, 0);
    b.box(len, 0.5, 0.05, c.pewDark, 0, 0.75, 0.2);
    for (const s of [-1, 1]) b.box(0.06, 0.95, 0.45, c.pewDark, s * (len / 2 - 0.03), 0.47, 0.03);
    b.pop();
  } else {
    for (const s of [-1, 1]) {
      b.push(s * len * 0.26, 0, 0, 0, 0, s * 0.42);
      b.box(len * 0.48, 0.06, 0.4, c.pew, 0, 0.32, 0);
      b.box(len * 0.48, 0.5, 0.05, c.pewDark, 0, 0.6, 0.2);
      b.box(0.06, 0.8, 0.45, c.pewDark, s * (len * 0.24), 0.4, 0.03);
      b.pop();
    }
  }
}

// A headstone (its frame on the ground): round-topped, square, a cross or
// an obelisk; it leans as the ground has heaved.
function headstone(b, kind, color, moss) {
  if (kind === 'round') {
    b.box(0.55, 0.6, 0.11, color, 0, 0.3, 0);
    b.put(new THREE.CylinderGeometry(0.275, 0.275, 0.11, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), color, 0, 0.6, 0);
    b.box(0.5, 0.08, 0.115, moss, 0, 0.05, 0);
  } else if (kind === 'square') {
    b.box(0.5, 0.75, 0.13, color, 0, 0.375, 0);
    b.box(0.56, 0.06, 0.16, color, 0, 0.78, 0);
  } else if (kind === 'cross') {
    b.box(0.12, 1.0, 0.1, color, 0, 0.5, 0);
    b.box(0.5, 0.11, 0.1, color, 0, 0.72, 0);
    b.box(0.3, 0.12, 0.2, moss, 0, 0.06, 0);
  } else {
    b.box(0.38, 0.3, 0.38, color, 0, 0.15, 0);
    b.put(new THREE.CylinderGeometry(0.06, 0.16, 1.3, 4).rotateY(Math.PI / 4), color, 0, 0.95, 0);
  }
}

// ---- the set -----------------------------------------------------------------------------------

export function buildOldChurch(look, { weather = null, heightAt = null } = {}) {
  const b = new SetBuilder(look, heightAt, 1903);
  const c = b.c;
  const C = CHURCH;
  const hw = C.halfW;
  const len = C.back - C.front;
  const ridgeY = C.wallH + C.ridge;
  // The floor sits on the ground at the church's middle (it's level; the ground isn't).
  const fy = b.heightAt(0, (C.front + C.back) / 2) + 0.25;
  // The fallen-in corner: the east wall's back end above shoulder height.
  const fallen = (z, y) => z > C.back - 4.2 && y > 1.7;

  // ---- the nave ----
  b.push(0, fy, 0);
  // A stone footing all round, and the floor (dark boards, a hole where the roof came down).
  for (const s of [-1, 1]) b.box(0.4, 0.5, len + 0.4, c.stoneDark, s * hw, -0.2, (C.front + C.back) / 2);
  b.box(hw * 2 + 0.4, 0.5, 0.4, c.stoneDark, 0, -0.2, C.back);
  b.box(hw * 2 + 0.4, 0.5, 0.4, c.stoneDark, 0, -0.2, C.front);
  for (let i = 0; i < 9; i++) {
    const z0 = C.front + i * (len / 9);
    const holed = i >= 7;
    if (holed) b.box(hw - 0.2, 0.05, len / 9 - 0.02, c.floor, -hw / 2, 0.02, z0 + len / 18);
    else b.box(hw * 2 - 0.1, 0.05, len / 9 - 0.02, i % 2 ? c.floor : c.floorDark, 0, 0.02, z0 + len / 18);
  }
  b.box(hw, 0.04, 2.6, c.hollow, hw / 2, -0.12, C.back - 1.6); // the hole's dark

  // The side walls: clapboard (boards missing all over), windows cut in.
  const winKinds = { '-1': ['boarded', 'broken', 'boarded'], 1: ['broken', 'boarded', 'broken'] };
  for (const s of [-1, 1]) {
    // The wall's frame: its local x runs along the wall, its local -z faces out.
    // West (s -1): from the back toward the front; east (s +1): from the front toward the back.
    const west = s < 0;
    b.push(s * hw, 0, west ? C.back : C.front, west ? Math.PI / 2 : -Math.PI / 2);
    const zOf = (t) => (west ? C.back - t : C.front + t);
    const tAt = (z) => (west ? C.back - z : z - C.front);
    const skip = (t, y) => {
      const z = zOf(t);
      if (C.windows.some((wz) => Math.abs(z - wz) < C.windowHalf + 0.05) && y > C.sill - 0.05 && y < C.head + 0.05) return true;
      return !west && fallen(z, y);
    };
    clapboards(b, len, 0.3, C.wallH, skip, c.clap, c.clapDark);
    C.windows.forEach((wz, i) => windowAt(b, tAt(wz), C.sill, C.head, C.windowHalf, winKinds[s][i]));
    // Corner boards and the plate along the top (the east plate stops short of the fallen corner).
    const backH = west ? C.wallH : 1.7;
    b.box(0.12, C.wallH, 0.12, c.trim, tAt(C.front + 0.06), C.wallH / 2, -0.03);
    b.box(0.12, backH, 0.12, c.trim, tAt(C.back - 0.06), backH / 2, -0.03);
    const plate = west ? len : len - 4.2;
    b.box(plate, 0.14, 0.18, c.trim, tAt(C.front + plate / 2), C.wallH, 0);
    b.pop();
    b.wall(s * hw, C.front, s * hw, C.back, 0, 0.18, C.wallH);
  }
  // The fallen boards, lying where they dropped by the east wall.
  for (let i = 0; i < 9; i++) b.box(1.2 + b.rand() * 1.4, 0.035, 0.2, i % 3 ? c.clap : c.clapDark, hw + 0.6 + b.rand() * 1.6, 0.04 + i * 0.01, C.back - 1 - b.rand() * 3.2, b.rand() * 3, 0, (b.rand() - 0.5) * 0.3);

  // The back wall and its gable (a round window, broken).
  b.push(0, 0, C.back, Math.PI);
  b.push(-hw, 0, 0);
  clapboards(b, hw * 2, 0.3, C.wallH, (t, y) => t < 2.2 && y > 2.2, c.clap, c.clapDark);
  b.pop();
  gable(b, hw + 0.15, C.wallH, C.ridge, c.clap, c.clapDark, (r) => r > 3 && r < 7 && b.rand() < 0.5);
  b.put(new THREE.CircleGeometry(0.42, 10), c.hollow, 0, C.wallH + 1.0, -0.06);
  b.put(new THREE.TorusGeometry(0.44, 0.05, 4, 12), c.trim, 0, C.wallH + 1.0, -0.06);
  b.pop();
  b.wall(-hw, C.back, hw, C.back, 0, 0.18, C.wallH);

  // The front wall behind the tower (either side of it), and its gable.
  b.push(0, 0, C.front);
  for (const s of [-1, 1]) {
    b.push(s < 0 ? -hw : C.tower.half, 0, 0);
    clapboards(b, hw - C.tower.half, 0.3, C.wallH, () => false, c.clap, c.clapDark);
    b.pop();
  }
  gable(b, hw + 0.15, C.wallH, C.ridge, c.clap, c.clapDark);
  b.pop();
  b.wall(-hw, C.front, -C.tower.half, C.front, 0, 0.18, C.wallH);
  b.wall(C.tower.half, C.front, hw, C.front, 0, 0.18, C.wallH);

  // The roof: shingle courses down each slope from the ridge, in four bays;
  // over the fallen corner the east slope's back bay has caved in (its
  // courses gone, the rafters bare, two of them snapped and hanging).
  const run = hw + 0.4;
  const slope = Math.hypot(run, C.ridge);
  const a = Math.atan2(C.ridge, run);
  const courses = 9;
  const bays = 4;
  const bayLen = (len + 0.6) / bays;
  for (const s of [-1, 1]) {
    for (let k = 0; k < bays; k++) {
      const zc = C.front - 0.3 + (k + 0.5) * bayLen;
      for (let i = 0; i < courses; i++) {
        const caved = s > 0 && k === bays - 1 && i > 1;
        const sagging = s > 0 && k === bays - 2 && i > 3;
        if (caved || (b.rand() < 0.035 && i > 0)) continue;
        const d = (i + 0.5) * (slope / courses);
        b.box(slope / courses + 0.06, 0.05, bayLen + 0.02, i % 3 === 1 ? c.shingleDark : c.shingle, s * d * Math.cos(a), ridgeY - d * Math.sin(a) - (sagging ? (i - 3) * 0.06 : 0), zc, 0, 0, -s * (a + (sagging ? 0.05 : 0)));
      }
    }
    // Rafters under the caved bay, and along the eaves.
    for (let k = 0; k < 6; k++) {
      const z = C.back - 3.6 + k * 0.72;
      const snapped = s > 0 && (k === 2 || k === 4);
      const L = snapped ? slope * 0.45 : slope;
      b.box(L, 0.12, 0.08, c.rafter, s * (L / 2) * Math.cos(a), ridgeY - (L / 2) * Math.sin(a) - (snapped ? 0.25 : 0), z, 0, 0, -s * (a + (snapped ? 0.5 : 0)));
    }
  }
  b.box(0.16, 0.16, len + 0.6, c.rafter, 0, ridgeY + 0.02, (C.front + C.back) / 2); // the ridge board

  // Inside: the pews (tipped, broken, gone), a fallen beam across them, the pulpit.
  const kinds = ['whole', 'tipped', 'whole', 'broken', 'whole', 'tipped', 'broken', 'whole', 'whole', 'broken', 'tipped', 'whole'];
  let n = 0;
  for (let row = 0; row < 6; row++) {
    for (const side of [-1, 1]) {
      const kind = kinds[n++ % kinds.length];
      if (side > 0 && row === 5) continue; // under the fallen corner: gone through the floor
      b.push(side * 1.55 + (b.rand() - 0.5) * 0.15, 0.05, C.front + 1.6 + row * 1.15, (b.rand() - 0.5) * 0.18);
      pew(b, 2.2, kind);
      b.pop();
    }
  }
  b.box(0.22, 0.22, 7.2, c.rafter, 0.6, 1.2, 3.3, 0.28, -0.32, 0.12); // the beam, one end up on a pew back
  b.box(1.0, 1.1, 0.7, c.pewDark, -0.6, 0.6, C.back - 1.0, 0.15);
  b.box(1.1, 0.06, 0.8, c.pew, -0.6, 1.17, C.back - 1.0, 0.15);
  b.spot('inside', 0, 1.6, 2.4);
  b.pop();

  // ---- the steeple (it leans) ----
  const T = C.tower;
  b.push(0, fy, T.z, 0, T.tip, T.lean);
  const th = T.half;
  // Its walls: clapboard on three sides, the door in the front.
  for (const [yaw, x, z] of [[0, -th, -th], [Math.PI / 2, -th, th], [-Math.PI / 2, th, -th]]) {
    b.push(x, 0, z, yaw);
    const doorFace = yaw === 0;
    clapboards(b, th * 2, 0.3, T.h, (t, y) => doorFace && Math.abs(t - th) < 0.72 && y < 2.55, c.clap, c.clapDark, 0.05);
    b.pop();
  }
  // The door. Session 32 (Aaron: he could walk in and see she wasn't there): shut. Two heavy leaves of plank,
  // strap hinges, swollen into the frame, a beam spiked across them from outside long ago: nobody's going in.
  b.box(1.44, 2.5, 0.03, c.hollow, 0, 1.25, -th + 0.12);
  b.box(0.1, 2.6, 0.1, c.trim, -0.74, 1.3, -th - 0.03);
  b.box(0.1, 2.6, 0.1, c.trim, 0.74, 1.3, -th - 0.03);
  b.box(1.6, 0.12, 0.12, c.trim, 0, 2.6, -th - 0.03);
  for (const sx of [-1, 1]) {
    b.box(0.7, 2.46, 0.07, sx < 0 ? c.boardsDark : c.boards ?? c.boardsDark, sx * 0.355, 1.25, -th - 0.01, 0, 0, sx * 0.006);
    for (let i = 0; i < 3; i++) b.box(0.02, 2.4, 0.012, c.hollow, sx * (0.13 + i * 0.2), 1.25, -th - 0.05); // the planks' joints
    for (const y of [0.45, 1.3, 2.15]) b.box(0.56, 0.07, 0.02, c.iron, sx * 0.4, y, -th - 0.055); // strap hinges
  }
  b.box(1.7, 0.2, 0.09, c.rafter, 0, 1.2, -th - 0.1, 0, 0, 0.05); // the beam across both
  for (const sx of [-1, 1]) b.box(0.05, 0.05, 0.03, c.iron, sx * 0.78, 1.2 + sx * 0.04, -th - 0.15); // its spikes
  b.box(0.16, 0.2, 0.05, c.iron, 0.02, 1.02, -th - 0.07); // the lock plate under it
  // The belfry: four posts, the louvres half gone, open to the weather.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.18, T.belfry, 0.18, c.trim, sx * (th - 0.09), T.h + T.belfry / 2, sz * (th - 0.09));
  for (const [yaw, ox, oz] of [[0, 0, -th], [Math.PI, 0, th], [Math.PI / 2, -th, 0], [-Math.PI / 2, th, 0]]) {
    for (let i = 0; i < 5; i++) {
      if (b.rand() < 0.45) continue;
      b.box(th * 2 - 0.3, 0.05, 0.22, c.clapDark, ox, T.h + 0.3 + i * 0.3, oz, yaw, 0.55, (b.rand() - 0.5) * 0.15);
    }
  }
  b.box(th * 2 + 0.3, 0.14, th * 2 + 0.3, c.trim, 0, T.h, 0);
  b.box(th * 2 + 0.3, 0.14, th * 2 + 0.3, c.trim, 0, T.h + T.belfry, 0);
  // The spire: a four-sided cone of shingle, and the bent iron cross.
  b.put(new THREE.ConeGeometry(th * 1.45, 4.6, 4).rotateY(Math.PI / 4), c.shingle, 0, T.h + T.belfry + 2.3, 0);
  b.push(0, T.h + T.belfry + 4.5, 0, 0, 0, 0.5);
  b.box(0.06, 1.0, 0.06, c.iron, 0, 0.5, 0);
  b.box(0.5, 0.06, 0.06, c.iron, 0, 0.7, 0);
  b.pop();
  // The bell, askew in a cracked yoke: a lathe of bronze, its lip chipped.
  const yokeY = T.h + T.belfry - 0.25;
  b.box(th * 2 - 0.2, 0.2, 0.2, c.rafter, 0, yokeY, 0, 0, 0, 0.06);
  b.push(0.1, yokeY - 0.1, 0, 0.3, 0.32, 0.1);
  const pts = [[0.0, 0], [0.16, 0], [0.2, -0.08], [0.24, -0.35], [0.3, -0.62], [0.4, -0.78], [0.42, -0.82], [0.0, -0.82]].map(([x, y]) => new THREE.Vector2(x, y));
  b.put(new THREE.LatheGeometry(pts, 10, 0, Math.PI * 1.78), c.bell, 0, 0, 0);
  b.box(0.04, 0.5, 0.04, c.iron, 0, -0.45, 0); // the clapper
  b.spot('bell', 0, -0.4, 0);
  b.pop();
  // Its walls as colliders (with the door gap), in the leaning frame.
  b.wall(-th, -th, th, -th, 0, 0.15, T.h); // Session 32: no door gap: it's shut
  b.wall(-th, -th, -th, th, 0, 0.15, T.h);
  b.wall(th, -th, th, th, 0, 0.15, T.h);
  b.spot('door', 0, 0, -th - 0.6);
  b.pop();
  // The lip of the bell, broken off, in the grass at the tower's foot.
  b.pushOnGround(1.9, 0.05, T.z - 1.2, 0.8, 0.3, 1.1);
  b.put(new THREE.CylinderGeometry(0.36, 0.42, 0.18, 8, 1, true, 0, 1.4), c.bell, 0, 0, 0);
  b.pop();
  // The steps: three of stone, sunk and cracked.
  for (let i = 0; i < 3; i++) b.box(2.0 - i * 0.2, 0.18, 0.42, i === 1 ? c.stoneDark : c.stone, (b.rand() - 0.5) * 0.06, fy - 0.12 - i * 0.12 + 0.09, T.z - th - 0.25 - i * 0.4, (b.rand() - 0.5) * 0.06);

  // ---- the path and the lychgate ----
  for (let i = 0; i < 11; i++) {
    const z = C.lychgate + 0.4 + i * ((T.z - th - 1.6 - C.lychgate) / 10);
    const x = (b.rand() - 0.5) * 0.5;
    b.pushOnGround(x, 0.015, z, b.rand() * 0.5);
    b.box(0.6 + b.rand() * 0.25, 0.06, 0.45 + b.rand() * 0.2, i % 3 ? c.flag : c.stoneDark, 0, 0, 0);
    b.pop();
  }
  b.pushOnGround(0, 0, C.lychgate);
  for (const s of [-1, 1]) {
    b.box(0.22, 2.5, 0.22, c.trim, s * 1.35, 1.25, 0);
    b.post(s * 1.35, 0, 0, 0.2, 2.4);
  }
  b.box(3.1, 0.18, 0.2, c.trim, 0, 2.45, 0);
  b.box(3.5, 0.05, 1.05, c.shingle, 0, 2.86, -0.45, 0, 0.62, 0);
  b.box(3.5, 0.05, 1.05, c.shingleDark, 0, 2.86, 0.45, 0, -0.62, 0);
  b.push(1.25, 0, 0.1, 1.15);
  b.box(1.2, 0.08, 0.05, c.iron, -0.6, 0.35, 0);
  b.box(1.2, 0.08, 0.05, c.iron, -0.6, 1.05, 0);
  for (let i = 0; i < 6; i++) b.box(0.04, 0.95, 0.04, c.iron, -0.1 - i * 0.2, 0.7, 0);
  b.pop();
  b.spot('lychgate', 0, 0, 0);
  b.spot('arrive', 0, 0, -6);
  b.pop();

  // ---- the plaque stone (the capsule lies under the turf in front of it) ----
  // Session 32 (Aaron: "move the time capsule a little closer to the church", beside the door he's trying): by
  // the foot of the steps, on the right, turned a little toward the path.
  b.pushOnGround(2.7, 0, T.z - T.half - 1.7, -0.3);
  b.box(1.0, 0.72, 0.6, c.granite, 0, 0.32, 0);
  b.box(1.06, 0.1, 0.66, c.stoneDark, 0, 0.0, 0);
  b.push(0, 0.42, -0.31, 0, -0.18, 0);
  b.box(0.66, 0.42, 0.035, c.bronze, 0, 0, 0);
  b.box(0.58, 0.03, 0.02, c.bronzeDark, 0, 0.13, -0.02);
  for (let i = 0; i < 4; i++) b.box(0.5 - (i % 2) * 0.12, 0.018, 0.012, c.bronzeDark, 0, 0.03 - i * 0.055, -0.02);
  b.pop();
  b.post(0, 0, 0, 0.55, 0.75);
  b.spot('plaque', -0.9, 0.5, -0.75); // stand here to read it (to one side of the turf over the capsule)
  b.spot('capsule', 0.05, 0, -1.45);
  b.pop();

  // ---- the graveyard ----
  // The eleven, in a straight row of their own: small, alike, cut the same winter.
  for (let i = 0; i < TAKEN_ROW.count; i++) {
    const x = TAKEN_ROW.x0 + i * TAKEN_ROW.step;
    b.pushOnGround(x, 0, TAKEN_ROW.z, 0, (b.rand() - 0.5) * 0.06, (b.rand() - 0.5) * 0.05);
    b.box(0.42, 0.55, 0.09, c.stoneNew, 0, 0.27, 0);
    b.put(new THREE.CylinderGeometry(0.21, 0.21, 0.09, 8, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), c.stoneNew, 0, 0.55, 0);
    b.box(0.3, 0.02, 0.01, c.stoneDark, 0, 0.42, -0.05);
    b.pop();
    b.post(x, 0, TAKEN_ROW.z, 0.22, 0.75);
  }
  b.spot('taken', TAKEN_ROW.x0 + ((TAKEN_ROW.count - 1) * TAKEN_ROW.step) / 2, 0, TAKEN_ROW.z - 1.3);
  // The old stones, every way.
  const kindsOld = ['round', 'square', 'round', 'cross', 'square', 'obelisk', 'round', 'square'];
  let placed = 0;
  for (let tries = 0; placed < 18 && tries < 400; tries++) {
    const side = b.rand() < 0.5 ? -1 : 1;
    const x = side * (5 + b.rand() * 10.5);
    const z = -14.5 + b.rand() * 21;
    if (Math.abs(z - TAKEN_ROW.z) < 1.2 && x < -4.5) continue;
    if (x > 0.8 && x < 5.2 && z > -13 && z < -7) continue; // the plaque stone and the turf in front of it, by the door
    if (Math.abs(x) < hw + 1.3 && z > C.front - 4) continue; // the church
    if (x < -7 && x > -11 && z > 1.5 && z < 6.5) continue; // the oak
    const kind = kindsOld[placed % kindsOld.length];
    b.pushOnGround(x, -0.04, z, (b.rand() - 0.5) * 0.5, (b.rand() - 0.5) * 0.45, (b.rand() - 0.5) * 0.35);
    headstone(b, kind, placed % 3 ? c.stone : c.stoneDark, c.moss);
    b.pop();
    b.post(x, 0, z, 0.25, kind === 'obelisk' ? 1.5 : 0.8);
    placed++;
  }

  // ---- the iron fence (posts leaning, spans gone) ----
  const F = C.fence;
  const runs = [
    [[-F.x, F.front], [-1.6, F.front]],
    [[1.6, F.front], [F.x, F.front]],
    [[-F.x, F.front], [-F.x, F.back]],
    [[F.x, F.front], [F.x, F.back]],
  ];
  for (const [[ax, az], [bx, bz]] of runs) {
    const L = Math.hypot(bx - ax, bz - az);
    const n2 = Math.round(L / 2.2);
    const yaw = Math.atan2(bx - ax, bz - az);
    for (let i = 0; i <= n2; i++) {
      const t = i / n2;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      if (b.rand() < 0.12) continue; // a post gone
      const lean = (b.rand() - 0.5) * 0.4;
      b.pushOnGround(x, 0, z, yaw, lean, (b.rand() - 0.5) * 0.3);
      b.box(0.06, 1.2, 0.06, c.iron, 0, 0.6, 0);
      b.box(0.1, 0.12, 0.1, c.iron, 0, 1.22, 0, Math.PI / 4);
      if (i < n2 && b.rand() > 0.22) {
        const sp = L / n2;
        b.box(0.035, 0.035, sp, c.iron, 0, 1.0, sp / 2);
        b.box(0.035, 0.035, sp, c.iron, 0, 0.3, sp / 2);
        for (let k = 1; k < 5; k++) b.box(0.025, 0.85, 0.025, c.iron, 0, 0.65, (k * sp) / 5);
      }
      b.pop();
    }
  }

  // ---- the dead oak ----
  b.pushOnGround(-9, 0, 4, 0.4, 0.04, -0.06);
  b.put(new THREE.CylinderGeometry(0.42, 0.7, 5.2, 8), c.bark, 0, 2.6, 0);
  for (const [y, yaw, tilt, L, r] of [[3.6, 0.3, 0.9, 3.6, 0.22], [4.4, 2.4, 0.75, 3.0, 0.18], [4.9, 4.2, 0.6, 2.6, 0.15], [3.0, 5.2, 1.15, 2.4, 0.16], [5.1, 1.2, 0.35, 2.0, 0.12]]) {
    b.push(0, y, 0, yaw, 0, tilt);
    b.put(new THREE.CylinderGeometry(r * 0.4, r, L, 6), c.bark, 0, L / 2, 0);
    b.pop();
  }
  b.post(0, 0, 0, 0.75, 5);
  b.pop();

  const geometry = bakeParts(b.parts, { weather, baseAt: (x, y, z) => Math.min(b.heightAt(x, z), y < fy + 0.4 && Math.abs(x) < hw + 0.2 && z > C.front - 1 && z < C.back + 0.2 ? fy : b.heightAt(x, z)), seed: 26 });
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'oldChurch';
  group.add(mesh);
  return {
    group,
    mesh,
    spots: b.spots,
    colliders: b.colliders,
    floorY: fy,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
