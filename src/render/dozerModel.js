// The dozer (experimental, debug menu only): Earl's old forestry crawler
// dozer. A long engine hood with its exhaust stack and precleaner, a ROPS
// cage over an open operator's station, steel tracks round an idler and a
// sprocket on bottom rollers, a big semi-U blade on push arms with its two
// lift rams, a winch at the back. Faded yellow paint under a lot of mud.
//
// The game's vehicle frame: the front at -z, the right at +x, y up, the
// origin on the ground under its middle.
//
// buildDozer(cfg) returns the parts the game moves (world/Dozer.js) and the
// model viewer poses:
//  root (Group: position, heading, slope) > body (Group: the engine's shake,
//  the lurch as it fells a tree) > ...;
//  setTracks(left, right): each track's travel (metres): the shoes run round,
//    the rollers, idlers and sprockets turn;
//  setBlade(lift): the blade on its arms, -1 (dug in) .. 0 (carrying) .. 1
//    (fully up); the rams follow;
//  setLevers(drive, steer, blade): the operator's levers (and his hands);
//  bladeEdge: Object3D at the blade's cutting edge's middle (where it digs);
//  fairlead: Object3D at the winch's fairlead (the cable comes out there);
//  cab: Group drawn only from the seat (the levers, the console, his hands);
//  lamps: { work } (the work lights' lens material);
//  setGauges({ temp, oil, fuel, hours }); dispose().

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DOZER = {
  track: { x: 0.98, width: 0.56, idler: [-1.5, 0.48], sprocket: [1.48, 0.52], r: 0.4, pitch: 0.2, shoeH: 0.07 },
  rollers: [-1.0, -0.5, 0, 0.5, 1.0],
  hood: { front: -2.0, back: -0.15, half: 0.6, top: 1.8 },
  deck: 1.06, // the fenders' walkway
  seat: { y: 1.72, z: 0.62 }, // up on its pedestal over the tank: the operator sees over the hood
  rops: { front: -0.05, back: 1.32, half: 0.8, top: 3.15 },
  blade: { half: 1.7, height: 1.35, z: -2.55, pivot: [-0.15, 0.55], armX: 1.36 }, // pivot: the push arms' trunnions (z, y)
  winch: { z: 1.78, y: 0.78 },
};

function strip(g) {
  let x = g.index ? g.toNonIndexed() : g;
  if (x !== g) g.dispose();
  for (const name of Object.keys(x.attributes)) if (name !== 'position' && name !== 'normal') x.deleteAttribute(name);
  if (!x.attributes.normal) x.computeVertexNormals();
  return x;
}

// A bin of parts by colour, baked into one vertex-coloured geometry, with
// mud thrown up from the ground (and caked on the tracks' frames) and a
// soft mottle so the yellow reads as old paint.
function bin(look) {
  const parts = [];
  const c = new THREE.Color();
  const mud = new THREE.Color(look.mud);
  return {
    add(geo, colour, opts = {}) {
      parts.push({ g: strip(geo), colour, mud: opts.mud ?? 1 });
    },
    bake(dirtHeight = look.mudHeight) {
      const out = [];
      for (const p of parts) {
        const g = p.g;
        const pos = g.attributes.position;
        const n = g.attributes.normal;
        const col = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          c.set(p.colour);
          const y = pos.getY(i);
          const low = Math.max(0, Math.min(1, (dirtHeight - y) / dirtHeight));
          const mottle = noise(pos.getX(i) * 3.1, y * 3.1, pos.getZ(i) * 3.1);
          c.lerp(mud, (low * low * 0.7 + mottle * 0.12) * p.mud);
          c.multiplyScalar((0.72 + 0.28 * (n.getY(i) * 0.5 + 0.5)) * (0.92 + mottle * 0.16));
          c.toArray(col, i * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        out.push(g);
      }
      const merged = mergeGeometries(out);
      out.forEach((g) => g.dispose());
      return merged;
    },
  };
}

function noise(x, y, z) {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  const t = Math.sin(Math.floor(x) * 3.1 + Math.floor(z) * 7.7 + Math.floor(y) * 1.3) * 1234.5;
  return 0.6 * (t - Math.floor(t)) + 0.4 * (s - Math.floor(s));
}

const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  return g.translate(x, y, z);
};
const cylX = (r, w, x, y, z, seg = 14) => new THREE.CylinderGeometry(r, r, w, seg).rotateZ(Math.PI / 2).translate(x, y, z);
const cylY = (r, h, x, y, z, seg = 12, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg).translate(x, y + h / 2, z);
function rod(a, b, r, seg = 8) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r, r, dir.length(), seg, 1);
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  return g.translate(...a);
}

// ---- the track's loop: a stadium round the idler (front) and the sprocket (back) -----------------

// The point (z, y) and the shoe's angle at distance s round the loop (s from the front idler's bottom, going back along the ground).
export function trackPoint(s, out = { z: 0, y: 0, a: 0 }) {
  const T = DOZER.track;
  const r = T.r + T.shoeH / 2;
  const [iz, iy] = T.idler;
  const [sz, sy] = T.sprocket;
  const bottom = Math.hypot(sz - iz, sy - iy);
  const arc = Math.PI * r;
  const L = 2 * bottom + 2 * arc;
  let d = ((s % L) + L) % L;
  const tilt = Math.atan2(sy - iy, sz - iz);
  if (d < bottom) {
    const t = d / bottom;
    out.z = iz + (sz - iz) * t + Math.sin(tilt) * r;
    out.y = iy + (sy - iy) * t - Math.cos(tilt) * r;
    out.a = tilt;
    return out;
  }
  d -= bottom;
  if (d < arc) {
    const a = -Math.PI / 2 + tilt + d / r; // round the sprocket, under to over
    out.z = sz + Math.cos(a) * r;
    out.y = sy + Math.sin(a) * r;
    out.a = a + Math.PI / 2;
    return out;
  }
  d -= arc;
  if (d < bottom) {
    const t = d / bottom;
    out.z = sz + (iz - sz) * t - Math.sin(tilt) * r;
    out.y = sy + (iy - sy) * t + Math.cos(tilt) * r;
    out.a = tilt + Math.PI;
    return out;
  }
  d -= bottom;
  const a = Math.PI / 2 + tilt + d / r; // round the idler, over to under
  out.z = iz + Math.cos(a) * r;
  out.y = iy + Math.sin(a) * r;
  out.a = a + Math.PI / 2;
  return out;
}

export function trackLength() {
  const T = DOZER.track;
  const r = T.r + T.shoeH / 2;
  return 2 * Math.hypot(T.sprocket[0] - T.idler[0], T.sprocket[1] - T.idler[1]) + 2 * Math.PI * r;
}

// ---- the dials (canvas) ---------------------------------------------------------------------------

function makeCanvas(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c.getContext('2d') ? c : null;
}

const DIALS = [
  { id: 'temp', label: 'COOLANT', u: 0.17 },
  { id: 'oil', label: 'HYD OIL', u: 0.5 },
  { id: 'fuel', label: 'FUEL', u: 0.83 },
];

function drawConsole(ctx, w, h, s, look) {
  ctx.fillStyle = '#0a0a08';
  ctx.fillRect(0, 0, w, h);
  for (const d of DIALS) {
    const cx = d.u * w;
    const cy = h * 0.42;
    const r = h * 0.3;
    ctx.fillStyle = '#16150f';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fill();
    // green, then red at the top end (fuel: red at the bottom end)
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const a = Math.PI * (0.8 + 1.4 * t);
      const red = d.id === 'fuel' ? t < 0.15 : t > 0.8;
      ctx.strokeStyle = red ? '#c83a1e' : look.dialInk;
      ctx.lineWidth = k % 5 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    const v = Math.max(0, Math.min(1, s[d.id] ?? 0));
    const a = Math.PI * (0.8 + 1.4 * v);
    ctx.strokeStyle = '#ff6a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
    ctx.stroke();
    ctx.fillStyle = look.dialInk;
    ctx.font = `${Math.round(h * 0.11)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(d.label, cx, h * 0.9);
  }
  // The hour meter.
  const hours = String(Math.floor(s.hours ?? 0)).padStart(5, '0') + '.' + String(Math.floor(((s.hours ?? 0) % 1) * 10));
  ctx.font = `bold ${Math.round(h * 0.12)}px monospace`;
  ctx.fillStyle = '#d8d2c0';
  ctx.fillText(hours, w * 0.5, h * 0.12);
}

// ---- the whole dozer ----------------------------------------------------------------------------

export function buildDozer(cfg) {
  const look = cfg.look;
  const C = look.colours;
  const D = DOZER;
  const T = D.track;
  const root = new THREE.Group();
  root.name = 'dozer';
  const body = new THREE.Group();
  root.add(body);
  const lambert = (opts = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, ...opts });
  const meshes = [];
  const add = (geo, mat, parent, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    meshes.push(m);
    return m;
  };

  // ---- the body: frame, hood, fenders, the operator's station, the ROPS, the winch ----
  const b = bin(look);
  const H = D.hood;
  // The main frame and belly pan between the tracks.
  b.add(box(1.24, 0.42, 3.6, 0, 0.62, 0.0), C.frame);
  b.add(box(1.1, 0.1, 3.0, 0, 0.36, -0.3), C.dark);
  // The hood: tapered toward the front, a grille, side doors with louvres.
  const hoodLen = H.back - H.front;
  const hood = new THREE.BoxGeometry(H.half * 2, H.top - 0.82, hoodLen, 1, 1, 4);
  const hp = hood.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const front = hp.getZ(i) < 0 ? 1 : 0;
    if (hp.getY(i) > 0) hp.setY(i, hp.getY(i) - front * 0.08); // the top falls a little toward the nose
    hp.setX(i, hp.getX(i) * (1 - front * 0.06));
  }
  hood.computeVertexNormals();
  b.add(hood.translate(0, (H.top + 0.82) / 2, (H.front + H.back) / 2), C.paint);
  b.add(box(H.half * 2 + 0.02, 0.05, hoodLen, 0, H.top - 0.02, (H.front + H.back) / 2), C.paint);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 7; i++) b.add(box(0.012, 0.05, 0.36, sx * (H.half + 0.005), 1.3 + i * 0.075, -1.25), C.dark); // louvres
    b.add(box(0.02, 0.62, 0.012, sx * (H.half + 0.008), 1.5, -0.6), C.seam);
    b.add(box(0.02, 0.62, 0.012, sx * (H.half + 0.008), 1.5, -1.6), C.seam);
    b.add(box(0.03, 0.05, 0.1, sx * (H.half + 0.02), 1.45, -1.1), C.steel); // latches
  }
  // The radiator guard at the front: a heavy perforated plate, bars.
  b.add(box(1.16, 0.95, 0.08, 0, 1.32, H.front - 0.02), C.dark);
  for (let i = 0; i < 6; i++) b.add(box(1.1, 0.04, 0.04, 0, 0.95 + i * 0.15, H.front - 0.07), C.frame);
  for (const x of [-0.4, 0, 0.4]) b.add(box(0.05, 0.95, 0.05, x, 1.32, H.front - 0.08), C.frame);
  // The exhaust stack (right) with its rain cap, the air precleaner (left).
  b.add(cylY(0.075, 1.0, 0.32, H.top - 0.05, -1.05, 12, 0.07), C.exhaust);
  b.add(cylY(0.09, 0.14, 0.32, H.top - 0.08, -1.05, 12), C.exhaust);
  b.add(box(0.18, 0.02, 0.2, 0.32, H.top + 0.98, -1.03, -0.35), C.exhaust); // the flapper
  b.add(cylY(0.06, 0.3, -0.32, H.top - 0.05, -1.2, 10), C.dark);
  b.add(cylY(0.13, 0.22, -0.32, H.top + 0.24, -1.2, 14, 0.11), C.dark);
  b.add(cylY(0.14, 0.03, -0.32, H.top + 0.46, -1.2, 14), C.dark);
  // The fenders over the tracks: a walkway of treadplate, a lip at the edge.
  for (const sx of [-1, 1]) {
    b.add(box(T.width + 0.1, 0.05, 3.4, sx * T.x, D.deck, 0.02), C.paint);
    b.add(box(0.04, 0.12, 3.4, sx * (T.x + T.width / 2 + 0.05), D.deck - 0.04, 0.02), C.paint);
    for (let z = -1.5; z <= 1.5; z += 0.25) b.add(box(T.width, 0.012, 0.05, sx * T.x, D.deck + 0.028, z, 0, 0.6 * sx), C.steel, { mud: 0.6 });
    // Steps up to the station, and a grab rail.
    b.add(box(0.3, 0.04, 0.2, sx * (T.x + 0.42), 0.6, 0.75), C.dark);
    b.add(rod([sx * 0.8, D.deck + 0.05, 0.1], [sx * 0.8, D.deck + 0.85, 0.15], 0.018), C.paint);
  }
  // The operator's station: the floor, the dash's back, the seat, the fuel tank behind.
  b.add(box(1.3, 0.06, 1.4, 0, D.deck + 0.02, 0.6), C.dark, { mud: 0.5 });
  b.add(box(1.3, 0.48, 0.12, 0, D.deck + 0.26, -0.08), C.paint);
  b.add(box(1.2, 0.08, 0.36, 0, D.deck + 0.52, -0.06), C.dark);
  b.add(box(0.55, 0.14, 0.5, 0, D.seat.y - 0.08, D.seat.z), C.seat, { mud: 0.3 });
  const back = box(0.55, 0.62, 0.12, 0, 0, 0);
  back.rotateX(-0.15);
  b.add(back.translate(0, D.seat.y + 0.3, D.seat.z + 0.3), C.seat, { mud: 0.3 });
  b.add(box(0.5, D.seat.y - D.deck - 0.14, 0.5, 0, (D.seat.y + D.deck) / 2 - 0.08, D.seat.z), C.dark); // the seat's pedestal
  b.add(box(0.9, 0.06, 0.34, 0, D.seat.y - 0.5, D.seat.z - 0.45), C.dark, { mud: 0.4 }); // the footrest
  // The instrument binnacle on its post, before the seat.
  b.add(box(0.1, 0.9, 0.1, 0, D.deck + 0.45, -0.02), C.dark);
  b.add(box(0.52, 0.22, 0.14, 0, D.deck + 0.98, -0.02, -0.6), C.dark);
  for (const sx of [-1, 1]) b.add(box(0.07, 0.06, 0.4, sx * 0.31, D.seat.y + 0.12, D.seat.z - 0.02), C.dark); // armrests
  b.add(box(1.5, 0.62, 0.32, 0, D.deck + 0.3, 1.45), C.paint);
  b.add(cylY(0.06, 0.05, 0.45, D.deck + 0.6, 1.45, 10), C.steel); // the filler cap
  // The ROPS: four heavy posts, a roof plate with a lip, a guard mesh at the back.
  const R = D.rops;
  for (const sx of [-1, 1]) {
    for (const z of [R.front, R.back]) b.add(box(0.12, R.top - D.deck, 0.12, sx * R.half, (R.top + D.deck) / 2, z), C.paint);
  }
  b.add(box(R.half * 2 + 0.24, 0.07, R.back - R.front + 0.3, 0, R.top + 0.02, (R.front + R.back) / 2), C.paint);
  b.add(box(R.half * 2 + 0.3, 0.12, 0.06, 0, R.top - 0.02, R.front - 0.15), C.paint);
  for (let i = 0; i < 9; i++) b.add(box(0.015, 1.1, 0.015, -0.64 + i * 0.16, D.deck + 1.05, R.back + 0.02), C.steel);
  for (let i = 0; i < 6; i++) b.add(box(1.4, 0.015, 0.015, 0, D.deck + 0.55 + i * 0.2, R.back + 0.02), C.steel);
  // The work lights' housings on the radiator guard's top corners (lighting the ground before the blade), one at the back.
  for (const sx of [-1, 1]) b.add(box(0.2, 0.16, 0.14, sx * 0.42, H.top - 0.02, H.front - 0.1), C.dark);
  b.add(box(0.18, 0.14, 0.12, 0.5, R.top - 0.13, R.back + 0.12), C.dark);
  // The winch at the back: its case, the drum's cable, the fairlead's rollers.
  const W = D.winch;
  b.add(box(1.0, 0.7, 0.42, 0, W.y + 0.05, W.z), C.paint);
  b.add(cylX(0.22, 0.6, 0, W.y + 0.05, W.z + 0.02, 18), C.cable, { mud: 0.4 });
  for (let i = 0; i < 9; i++) b.add(new THREE.TorusGeometry(0.225, 0.012, 4, 18).rotateY(Math.PI / 2).translate(-0.27 + i * 0.067, W.y + 0.05, W.z + 0.02), C.cableDark, { mud: 0.3 });
  b.add(box(0.36, 0.3, 0.12, 0, W.y - 0.05, W.z + 0.26), C.dark);
  for (const y of [-0.12, 0.02]) b.add(cylX(0.035, 0.3, 0, W.y - 0.05 + y, W.z + 0.33, 10), C.steel);
  for (const x of [-0.12, 0.12]) b.add(cylY(0.035, 0.3, x, W.y - 0.2, W.z + 0.33, 10), C.steel);
  // The track frames' trunnions (the push arms' pivots).
  for (const sx of [-1, 1]) b.add(cylX(0.13, 0.22, sx * (D.blade.armX - 0.1), D.blade.pivot[1], D.blade.pivot[0], 14), C.dark);
  // The lift rams' mounts on the hood's sides.
  for (const sx of [-1, 1]) b.add(box(0.12, 0.2, 0.2, sx * (H.half + 0.06), 1.68, -1.75), C.dark);
  const bodyMesh = add(b.bake(), lambert(), body, 'dozer body');

  // ---- the undercarriage: track frames, rollers, idlers, sprockets (they turn) ----
  const u = bin(look);
  for (const sx of [-1, 1]) {
    u.add(box(0.3, 0.32, 2.7, sx * T.x, 0.42, 0), C.frame, { mud: 1.5 });
    u.add(box(0.36, 0.06, 2.5, sx * T.x, 0.66, 0), C.dark, { mud: 1.5 });
  }
  const under = add(u.bake(1.0), lambert(), body, 'track frames');
  under.castShadow = true;
  const wheels = [];
  const wheelBin = (r, w, teeth, rim) => {
    const wb = bin(look);
    wb.add(cylX(r, w, 0, 0, 0, 18), rim);
    wb.add(cylX(r * 0.45, w + 0.04, 0, 0, 0, 12), C.dark);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      wb.add(cylX(0.025, w + 0.06, 0, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, 6), C.steel);
    }
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      wb.add(box(w * 0.6, 0.08, 0.08, 0, Math.cos(a) * (r + 0.02), Math.sin(a) * (r + 0.02), a), C.steel);
    }
    return wb.bake(-1);
  };
  const idlerGeo = wheelBin(T.r - 0.04, 0.3, 0, C.dark);
  const sprocketGeo = wheelBin(T.r - 0.02, 0.24, 12, C.dark);
  const rollerGeo = wheelBin(0.12, 0.28, 0, C.dark);
  const wheelMat = lambert();
  for (const sx of [-1, 1]) {
    for (const [geo, z, y, r] of [
      [idlerGeo, T.idler[0], T.idler[1], T.r],
      [sprocketGeo, T.sprocket[0], T.sprocket[1], T.r],
      ...D.rollers.map((z) => [rollerGeo, z, 0.24, 0.12]),
    ]) {
      const g = new THREE.Group();
      g.position.set(sx * T.x, y, z);
      body.add(g);
      add(geo, wheelMat, g, 'track wheel');
      wheels.push({ group: g, side: sx, r });
    }
  }
  // The shoes: one instanced mesh for both tracks (a plate with its grouser).
  const shoeGeo = (() => {
    const sb = bin(look);
    sb.add(box(T.width, 0.035, T.pitch * 0.92, 0, 0, 0), C.shoe, { mud: 1.2 });
    sb.add(box(T.width, 0.05, 0.03, 0, -0.04, -T.pitch * 0.25), C.shoe, { mud: 1.2 });
    sb.add(box(0.12, 0.04, T.pitch * 0.8, 0, 0.035, 0), C.dark, { mud: 1 }); // the link
    return sb.bake(0.3);
  })();
  const L = trackLength();
  const shoesPer = Math.floor(L / T.pitch);
  const shoes = new THREE.InstancedMesh(shoeGeo, lambert(), shoesPer * 2);
  shoes.name = 'track shoes';
  shoes.castShadow = true;
  shoes.receiveShadow = true;
  shoes.frustumCulled = false;
  body.add(shoes);
  meshes.push(shoes);

  // ---- the blade on its push arms (a group about the trunnions) ----
  const B = D.blade;
  const bladeArm = new THREE.Group();
  bladeArm.position.set(0, B.pivot[1], B.pivot[0]);
  body.add(bladeArm);
  const bb = bin(look);
  const bz = B.z - B.pivot[0]; // in the arm group's frame
  const by = -B.pivot[1];
  // The moldboard: curved (a semi-U, its wings swept forward), from a profile.
  const curve = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const a = -0.35 + t * 1.25; // the curl
    curve.push([Math.sin(a) * -0.55 + 0.1, t * B.height]);
  }
  const mold = new THREE.Shape();
  mold.moveTo(curve[0][0], curve[0][1]);
  for (const [z, y] of curve) mold.lineTo(z, y);
  for (let i = curve.length - 1; i >= 0; i--) mold.lineTo(curve[i][0] + 0.06, curve[i][1]);
  const moldGeo = new THREE.ExtrudeGeometry(mold, { depth: B.half * 2, bevelEnabled: false, steps: 6 });
  moldGeo.rotateY(-Math.PI / 2);
  moldGeo.translate(B.half, 0, 0);
  // Sweep the wings forward (a semi-U).
  const mp = moldGeo.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const out = Math.max(0, (Math.abs(mp.getX(i)) - 1.0) / (B.half - 1.0));
    mp.setZ(i, mp.getZ(i) - out * out * 0.32);
  }
  moldGeo.computeVertexNormals();
  bb.add(moldGeo.translate(0, by, bz), C.paint, { mud: 1.4 });
  // Its back: ribs, the cutting edge and end bits, the push arms, the tilt brace.
  for (const x of [-1.2, -0.6, 0, 0.6, 1.2]) bb.add(box(0.06, B.height * 0.9, 0.22, x, by + B.height * 0.47, bz + 0.3), C.paint, { mud: 1.2 });
  bb.add(box(B.half * 2, 0.12, 0.2, 0, by + 0.08, bz + 0.18), C.paint, { mud: 1.5 });
  bb.add(box(B.half * 2 - 0.4, 0.1, 0.06, 0, by + 0.05, bz - 0.05), C.edge, { mud: 0.8 }); // the cutting edge
  for (let i = 0; i < 9; i++) bb.add(cylX(0.016, 0.03, -1.2 + i * 0.3, by + 0.06, bz - 0.09, 6).rotateY(Math.PI / 2), C.steel, { mud: 0.5 });
  for (const sx of [-1, 1]) {
    bb.add(box(0.24, 0.18, 0.12, sx * (B.half - 0.12), by + 0.07, bz - 0.15, 0, sx * 0.3, 0), C.edge, { mud: 0.8 }); // the end bits
    // The push arm (C-frame): from the blade's back to the trunnion, outside the track.
    bb.add(rod([sx * B.armX, 0.0, 0.0], [sx * B.armX, by + 0.32, bz + 0.38], 0.09, 8), C.paint, { mud: 1.3 });
    bb.add(rod([sx * B.armX, by + 0.32, bz + 0.38], [sx * (B.half - 0.35), by + 0.4, bz + 0.3], 0.08, 8), C.paint, { mud: 1.3 });
  }
  bb.add(rod([-B.armX, by + 0.55, bz + 0.4], [B.armX, by + 0.55, bz + 0.4], 0.05, 8), C.paint, { mud: 1.2 });
  for (const sx of [-1, 1]) bb.add(box(0.12, 0.2, 0.14, sx * (H.half + 0.06), by + 1.05, bz + 0.34), C.dark); // the rams' blade mounts
  add(bb.bake(0.9), lambert(), bladeArm, 'blade');
  const bladeEdge = new THREE.Object3D();
  bladeEdge.position.set(0, by + 0.05, bz - 0.1);
  bladeArm.add(bladeEdge);
  // The lift rams: a barrel from the hood's mount, a rod out to the blade (placed each frame).
  const barrels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, 1, 12).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: C.paint }), 2);
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: C.chrome }), 2);
  for (const m of [barrels, rods]) {
    m.castShadow = true;
    m.frustumCulled = false;
    body.add(m);
    meshes.push(m);
  }
  const ramTop = [-1, 1].map((sx) => new THREE.Vector3(sx * (H.half + 0.06), 1.68, -1.75));
  const ramBottom = [-1, 1].map((sx) => {
    const o = new THREE.Object3D();
    o.position.set(sx * (H.half + 0.06), by + 1.05, bz + 0.34);
    bladeArm.add(o);
    return o;
  });

  // ---- the lights' lenses ----
  const workLens = new THREE.MeshLambertMaterial({ color: 0x2a2a24, emissive: 0x000000 });
  const lensGeo = mergeGeometries(
    [-1, 1].map((sx) => strip(new THREE.CircleGeometry(0.06, 12).rotateY(Math.PI).translate(sx * 0.42, H.top - 0.02, H.front - 0.172))).concat([strip(new THREE.CircleGeometry(0.05, 12).translate(0.5, D.rops.top - 0.13, D.rops.back + 0.185))]),
  );
  const lens = add(lensGeo, workLens, body, 'work light lenses');
  lens.castShadow = false;
  const fairlead = new THREE.Object3D();
  fairlead.position.set(0, W.y - 0.05, W.z + 0.38);
  body.add(fairlead);

  // ---- from the seat: the console, the levers, his hands ----
  const cab = new THREE.Group();
  cab.name = 'dozer station';
  cab.visible = false;
  body.add(cab);
  const consoleCanvas = makeCanvas(256, 96);
  const consoleTex = consoleCanvas ? new THREE.CanvasTexture(consoleCanvas) : null;
  if (consoleTex) consoleTex.colorSpace = THREE.SRGBColorSpace;
  const consoleFace = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ color: consoleTex ? new THREE.Color(1, 1, 1).multiplyScalar(look.dialBrightness) : 0x0a0a08, map: consoleTex, fog: false }));
  consoleFace.position.set(0, D.deck + 1.03, 0.05);
  consoleFace.rotation.x = -0.6;
  cab.add(consoleFace);
  meshes.push(consoleFace);
  const lever = (side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.36, D.seat.y + 0.04, D.seat.z - 0.26);
    cab.add(g);
    const lb = bin(look);
    lb.add(rod([0, 0, 0], [0, 0.32, -0.05], 0.014, 6), C.steel, { mud: 0 });
    lb.add(new THREE.SphereGeometry(0.045, 10, 8).scale(1, 1.4, 1).translate(0, 0.36, -0.05), C.dark, { mud: 0 });
    lb.add(box(0.1, 0.03, 0.1, 0, 0, 0), C.dark, { mud: 0 });
    // His gloved hand round the grip, his sleeve back toward him.
    lb.add(box(0.1, 0.11, 0.09, 0, 0.36, -0.04), C.glove, { mud: 0 });
    lb.add(rod([0, 0.33, 0.0], [side * 0.06, 0.12, 0.38], 0.042, 8), C.sleeve, { mud: 0 });
    add(lb.bake(-1), lambert(), g, side < 0 ? 'drive lever' : 'blade lever').castShadow = false;
    return g;
  };
  const leftLever = lever(-1);
  const rightLever = lever(1);
  cab.traverse((o) => {
    if (o.isMesh) o.receiveShadow = false;
  });
  let lastConsole = '';
  const setGauges = (s) => {
    if (!consoleCanvas) return;
    const key = `${Math.round((s.temp ?? 0) * 50)}:${Math.round((s.oil ?? 0) * 50)}:${Math.round((s.fuel ?? 0) * 50)}:${Math.floor((s.hours ?? 0) * 10)}`;
    if (key === lastConsole) return;
    lastConsole = key;
    drawConsole(consoleCanvas.getContext('2d'), 256, 96, s, look);
    consoleTex.needsUpdate = true;
  };
  setGauges({ temp: 0.3, oil: 0.25, fuel: 0.55, hours: look.hoursStart });

  // ---- moving it ----
  const tp = { z: 0, y: 0, a: 0 };
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const setTracks = (left, right) => {
    let n = 0;
    for (const [sx, travel] of [
      [-1, left],
      [1, right],
    ]) {
      for (let i = 0; i < shoesPer; i++) {
        trackPoint(i * (L / shoesPer) + travel, tp);
        p.set(sx * T.x, tp.y, tp.z);
        e.set(-tp.a, 0, 0);
        q.setFromEuler(e);
        shoes.setMatrixAt(n++, m4.compose(p, q, one));
      }
    }
    shoes.instanceMatrix.needsUpdate = true;
    for (const w of wheels) w.group.rotation.x = -(w.side < 0 ? left : right) / w.r;
  };
  setTracks(0, 0);
  const A = new THREE.Vector3();
  const Bv = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const yUp = new THREE.Vector3(0, 1, 0);
  const setBlade = (lift) => {
    // -1 dug in (about 0.3 m down), 0 carried (a hand's width up), 1 right up (about 1.1 m).
    const angle = lift >= 0 ? lift * 0.46 + 0.035 : lift * 0.11 + 0.035;
    bladeArm.rotation.x = angle; // the arms tip up about the trunnions
    bladeArm.updateMatrix();
    bladeArm.updateMatrixWorld(true);
    body.updateMatrixWorld(true);
    const inv = m4.copy(body.matrixWorld).invert();
    for (let k = 0; k < 2; k++) {
      A.copy(ramTop[k]);
      ramBottom[k].getWorldPosition(Bv).applyMatrix4(inv);
      dir.subVectors(Bv, A);
      const len = dir.length();
      dir.normalize();
      q.setFromUnitVectors(yUp, dir);
      const barrelLen = Math.min(0.75, len * 0.62);
      barrels.setMatrixAt(k, new THREE.Matrix4().compose(A, q, new THREE.Vector3(1, barrelLen, 1)));
      rods.setMatrixAt(k, new THREE.Matrix4().compose(A.clone().addScaledVector(dir, barrelLen - 0.05), q, new THREE.Vector3(1, len - barrelLen + 0.05, 1)));
    }
    barrels.instanceMatrix.needsUpdate = true;
    rods.instanceMatrix.needsUpdate = true;
  };
  setBlade(0);
  const setLevers = (drive, steer, blade) => {
    leftLever.rotation.set(-drive * 0.35, 0, -steer * 0.3);
    rightLever.rotation.set(blade * 0.35, 0, 0);
  };

  const dispose = () => {
    root.removeFromParent();
    const seen = new Set();
    root.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) {
        seen.add(o.geometry);
        o.geometry.dispose();
      }
      if (o.material && !seen.has(o.material)) {
        seen.add(o.material);
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
  };

  return { root, body, bodyMesh, cab, bladeArm, bladeEdge, fairlead, lamps: { work: workLens }, meshes, setTracks, setBlade, setLevers, setGauges, dispose };
}
