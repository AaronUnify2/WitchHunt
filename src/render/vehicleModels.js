// The vehicles' real models (Session 13, #145; Aaron: four types, the
// sheriff's paint for the police), replacing the placeholder boxes type by
// type. Built in code like the people: shapes extruded from side
// profiles with rounded edges, painted with vertex colours, in the
// vehicle's own frame (x to its right, y up, z forward; data/vehicles.json).
//
// A model is { body, lids: { bonnet, boot, door } } of geometries, each
// with a colour and an aPaint attribute: 1 where it takes the vehicle's
// paint (its instance colour), 0 where it keeps its own colour (glass,
// rubber, chrome, the wheel arches). Each lid is built where it sits shut;
// the renderer swings it on its hinge (the type's lids in vehicles.json)
// and makes the passenger door by mirroring the driver's. The wheels and
// lamps stay the data's parts (round wheels, unlit lamps).

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const colour = new THREE.Color();

// ---- the kit ---------------------------------------------------------------------------------

// A side profile [[z, y], ...] extruded across the vehicle, `width` wide
// (centred on x = cx), its edges rounded by `round` metres. holes: more
// profiles cut through it. Returns a geometry in the vehicle's frame.
function extrude(profile, width, round = 0.03, cx = 0, holes = []) {
  const shape = new THREE.Shape(profile.map(([z, y]) => new THREE.Vector2(z, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([z, y]) => new THREE.Vector2(z, y))));
  const depth = Math.max(0.001, width - 2 * round);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: round > 0,
    bevelThickness: round,
    bevelSize: round,
    bevelOffset: -round, // the profile is the outside: the rounding eats inward
    bevelSegments: 3,
    curveSegments: 10,
  });
  // (shape x, shape y, extrusion) -> (vehicle z, y, x): a mirror, so the winding flips back.
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getZ(i) - depth / 2 + cx, p.getY(i), p.getX(i));
  return weld(flip(g));
}

// A rounded box [w, h, l] centred at (x, y, z).
function box(w, h, l, x, y, z, round = 0.01) {
  const r = Math.min(round, h / 2 - 0.001, l / 2 - 0.001);
  const g = extrude(
    [
      [z - l / 2, y - h / 2],
      [z + l / 2, y - h / 2],
      [z + l / 2, y + h / 2],
      [z - l / 2, y + h / 2],
    ],
    w,
    Math.max(0, Math.min(r, w / 2 - 0.001)),
    x,
  );
  return g;
}

// A flat panel (glass, a plate): the polygon [[x, y, z], ...] (convex, in order), one-sided.
function panel(points) {
  const pos = [];
  for (let i = 1; i < points.length - 1; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A tube from a to b, radius r.
function rod(a, b, r) {
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const dir = new THREE.Vector3().subVectors(B, A);
  const g = new THREE.CylinderGeometry(r, r, dir.length(), 6, 1);
  g.translate(0, dir.length() / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(...a);
  return weld(g);
}

// Each triangle's winding reversed (non-indexed: every attribute swapped).
function flip(g) {
  for (const a of Object.values(g.attributes)) {
    const s = a.itemSize;
    const arr = a.array;
    for (let i = 0; i < a.count; i += 3) {
      for (let k = 0; k < s; k++) {
        const t = arr[(i + 1) * s + k];
        arr[(i + 1) * s + k] = arr[(i + 2) * s + k];
        arr[(i + 2) * s + k] = t;
      }
    }
  }
  return g;
}

// Seams welded, so it shades smooth (its rounded edges round).
function weld(g) {
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
  const w = mergeVertices(g.index ? g.toNonIndexed() : g, 1e-4);
  w.computeVertexNormals();
  return w;
}

// Move each vertex: f(p) changes p (a Vector3) in place. Normals redone.
function reshape(g, f) {
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    f(v.fromBufferAttribute(p, i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// Colour a part: key ('body': the paint, else a key of `colours`), or
// f(p, n) -> key per vertex. Baked shading: darker underneath.
function paint(g, key, colours) {
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const col = new Float32Array(p.count * 3);
  const paintAttr = new Float32Array(p.count);
  const pv = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    pv.fromBufferAttribute(p, i);
    nv.fromBufferAttribute(n, i);
    const k = typeof key === 'function' ? key(pv, nv) : key;
    if (k === 'body') {
      colour.setRGB(1, 1, 1);
      paintAttr[i] = 1;
    } else {
      colour.set(colours[k] ?? '#ff00ff');
    }
    colour.multiplyScalar(0.72 + 0.28 * (nv.y * 0.5 + 0.5));
    colour.toArray(col, i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aPaint', new THREE.BufferAttribute(paintAttr, 1));
  return g;
}

function merge(parts) {
  const g = mergeGeometries(parts.map((x) => (x.index ? x.toNonIndexed() : x)));
  for (const x of parts) x.dispose();
  g.computeBoundingSphere();
  return g;
}

// ---- the sedan: a boxy late-80s American four-door ---------------------------------------------

// Its body's half-width, and the cabin's half-width up its tumblehome.
const SEDAN = {
  half: 0.885,
  belt: 0.93, // the tub's top under the cabin
  roof: 1.42,
  cabinHalf: (y) => 0.82 - ((y - 0.9) / 0.52) * 0.1,
  arches: [
    [1.35, 0.34],
    [-1.35, 0.34],
  ],
  archRadius: 0.44,
};

function arch([cz, cy], r, from, to, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = from + ((to - from) * i) / steps;
    pts.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

// The side windows' outlines [[z, y], ...]: the front door's (under the
// windscreen's slope) and the rear door's (its back edge raked).
const FRONT_WINDOW = [
  [0.56, 0.97],
  [-0.07, 1.355],
  [-0.4, 1.355],
  [-0.4, 0.97],
];
const REAR_WINDOW = [
  [-0.47, 0.97],
  [-1.0, 0.97],
  [-0.86, 1.355],
  [-0.47, 1.355],
];

// A chrome surround round a side window: a thin rod along each edge
// (x(y): where the cabin's side is at that height).
function surround(outline, x, colours) {
  return outline.map(([z, y], i) => {
    const [z2, y2] = outline[(i + 1) % outline.length];
    return paint(rod([x(y), y, z], [x(y2), y2, z2], 0.009), 'chrome', colours);
  });
}

function sedan(colours) {
  const S = SEDAN;
  const [front, rear] = S.arches;
  const r = S.archRadius;
  // The tub: bumper to bumper, bonnet and boot deck flat (the lids sit on
  // them), the wheel arches cut up into its lower edge.
  const tubProfile = [
    [2.18, 0.42],
    [2.21, 0.6],
    [2.2, 0.82],
    [2.14, 0.865],
    [0.78, 0.865], // under the bonnet
    [0.7, 0.9], // the cowl
    [-1.46, S.belt],
    [-1.5, 0.935], // the boot deck
    [-2.13, 0.935],
    [-2.2, 0.88],
    [-2.22, 0.66],
    [-2.19, 0.46],
    [-2.08, 0.38],
    ...arch(rear, r, Math.PI + 0.25, -0.25),
    ...arch(front, r, Math.PI + 0.25, -0.25),
    [2.08, 0.38],
  ];
  const tub = extrude(tubProfile, S.half * 2, 0.06);
  // Pinched in at the ends in plan, tucked under at the sills.
  reshape(tub, (p) => {
    const end = Math.max(0, (Math.abs(p.z) - 1.75) / 0.47);
    const tuck = Math.max(0, (0.48 - p.y) / 0.14);
    p.x *= 1 - 0.07 * end * end - 0.035 * Math.min(1, tuck);
  });
  paint(tub, (p, n) => {
    if (n.y < -0.55) return 'under';
    for (const [cz, cy] of S.arches) if (Math.hypot(p.z - cz, p.y - cy) < r + 0.025 && Math.abs(n.x) < 0.6) return 'under';
    return 'body';
  }, colours);

  // The cabin: the windscreen, roof and rear window's frame (painted: the
  // pillars), with tumblehome; the glass laid over it.
  const cabin = extrude(
    [
      [0.7, 0.9],
      [-0.12, 1.39],
      [-0.2, S.roof],
      [-0.94, S.roof],
      [-1.02, 1.39],
      [-1.47, S.belt],
    ],
    1.64,
    0.05,
  );
  reshape(cabin, (p) => {
    p.x *= S.cabinHalf(Math.max(0.9, p.y)) / 0.82;
  });
  paint(cabin, 'body', colours);

  const glass = [];
  const side = (y) => S.cabinHalf(y) + 0.007;
  // The windscreen and rear window, inset from their pillars.
  const slope = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const pane = (a, b, out, t0, t1, inset) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = [((b[1] - a[1]) / len) * out, (-(b[0] - a[0]) / len) * out]; // (z, y) outward
    const pts = [];
    for (const [t, sgn] of [
      [t0, -1],
      [t0, 1],
      [t1, 1],
      [t1, -1],
    ]) {
      const [z, y] = slope(a, b, t);
      pts.push([sgn * (S.cabinHalf(y) - inset), y + n[1] * 0.008, z + n[0] * 0.008]);
    }
    return pts;
  };
  glass.push(panel(pane([0.7, 0.9], [-0.12, 1.39], 1, 0.07, 0.95, 0.09)));
  glass.push(panel(pane([-1.02, 1.39], [-1.47, S.belt], 1, 0.07, 0.92, 0.1)));
  // The rear door windows (the front ones are on the doors), both sides,
  // and behind each front door's window a dark pane (seen through it, and
  // in its place once the door swings open: the cabin's inside).
  const frames = [];
  for (const sx of [-1, 1]) {
    const pts = REAR_WINDOW.map(([z, y]) => [sx * side(y), y, z]);
    glass.push(panel(sx > 0 ? pts : pts.reverse()));
    frames.push(...surround(REAR_WINDOW, (y) => sx * (side(y) + 0.004), colours));
    const inner = FRONT_WINDOW.map(([z, y]) => [sx * (side(y) - 0.004), y, z]);
    glass.push(panel(sx > 0 ? inner.reverse() : inner));
  }
  const glassParts = glass.map((g) => paint(g, (p) => (p.y > 1.25 ? 'glassTop' : 'glass'), colours));

  // Bumpers: black rubber with a chrome strip, wrapping the corners.
  const bumper = (z, dir) => {
    const g = extrude(
      [
        [z - 0.08, 0.4],
        [z + 0.08, 0.4],
        [z + 0.08, 0.58],
        [z - 0.08, 0.58],
      ],
      1.84,
      0.03,
    );
    reshape(g, (p) => {
      const wrap = Math.max(0, (Math.abs(p.x) - 0.72) / 0.2);
      p.z -= dir * wrap * wrap * 0.12;
    });
    return paint(g, (p) => (p.y > 0.52 && p.z * dir > 0 ? 'chrome' : 'rubber'), colours);
  };
  const trim = [bumper(2.24, 1), bumper(-2.25, -1)];
  // The grille between the headlamps, and its bars.
  trim.push(paint(box(0.62, 0.17, 0.03, 0, 0.71, 2.205), 'grille', colours));
  for (const y of [0.66, 0.71, 0.76]) trim.push(paint(box(0.6, 0.012, 0.02, 0, y, 2.222, 0.004), 'chrome', colours));
  trim.push(paint(box(0.66, 0.02, 0.03, 0, 0.805, 2.215, 0.005), 'chrome', colours));
  // Number plates.
  trim.push(paint(box(0.3, 0.15, 0.015, 0, 0.47, 2.33, 0.003), 'plate', colours));
  trim.push(paint(box(0.3, 0.15, 0.015, 0, 0.72, -2.226, 0.003), 'plate', colours));
  // Side rubbing strips and door seams on the fixed body (the doors carry their own).
  for (const sx of [-1, 1]) {
    trim.push(paint(box(0.012, 0.035, 0.8, sx * 0.885, 0.64, -0.82, 0.004), 'rubber', colours));
    trim.push(paint(box(0.012, 0.035, 0.7, sx * 0.875, 0.64, 1.15, 0.004), 'rubber', colours));
    for (const z of [-0.44, -1.02]) trim.push(paint(box(0.008, 0.52, 0.012, sx * 0.889, 0.66, z, 0.002), 'seam', colours));
    trim.push(paint(box(0.012, 0.03, 0.06, sx * 0.892, 0.82, -0.9, 0.004), 'chrome', colours)); // the rear door's handle
  }
  // A whip aerial on the front wing.
  trim.push(paint(rod([0.72, 0.88, 1.9], [0.72, 1.6, 1.98], 0.004), 'rubber', colours));

  const body = merge([tub, cabin, ...glassParts, ...frames, ...trim]);

  // ---- the lids, where they sit shut ----
  const bonnet = extrude(
    [
      [2.16, 0.866],
      [2.16, 0.885],
      [2.1, 0.905],
      [0.77, 0.906],
      [0.77, 0.866],
    ],
    1.66,
    0.03,
  );
  reshape(bonnet, (p) => {
    if (p.y > 0.88) p.y += 0.012 * (1 - (p.x / 0.83) ** 2); // a gentle crown
    const end = Math.max(0, (p.z - 1.75) / 0.41);
    p.x *= 1 - 0.07 * end * end;
  });
  paint(bonnet, (p, n) => (n.y < -0.5 ? 'under' : 'body'), colours);

  const boot = extrude(
    [
      [-1.52, 0.936],
      [-1.52, 0.968],
      [-2.12, 0.968],
      [-2.17, 0.95],
      [-2.17, 0.936],
    ],
    1.62,
    0.025,
  );
  reshape(boot, (p) => {
    const end = Math.max(0, (-p.z - 1.75) / 0.42);
    p.x *= 1 - 0.07 * end * end;
  });
  paint(boot, (p, n) => (n.y < -0.5 ? 'under' : 'body'), colours);

  // The driver's door (left: -x): its skin, its window (moves with it), handle, mirror, strip.
  const skin = extrude(
    [
      [0.64, 0.4],
      [0.64, 0.92],
      [-0.42, 0.92],
      [-0.42, 0.4],
    ],
    0.035,
    0.012,
    -0.873,
  );
  paint(skin, (p, n) => (n.x > 0.5 ? 'under' : 'body'), colours);
  const winPts = FRONT_WINDOW.map(([z, y]) => [-side(y), y, z]);
  const doorGlass = paint(panel(winPts), (p) => (p.y > 1.25 ? 'glassTop' : 'glass'), colours);
  const doorFrame = surround(FRONT_WINDOW, (y) => -(side(y) + 0.004), colours);
  const doorTrim = [
    paint(box(0.012, 0.035, 1.0, -0.893, 0.64, 0.11, 0.004), 'rubber', colours),
    paint(box(0.014, 0.03, 0.07, -0.894, 0.82, -0.3, 0.004), 'chrome', colours),
    paint(box(0.06, 0.08, 0.12, -0.93, 0.99, 0.5, 0.02), 'rubber', colours), // the mirror
    paint(box(0.008, 0.52, 0.012, -0.892, 0.66, 0.635, 0.002), 'seam', colours),
  ];
  const door = merge([skin, doorGlass, ...doorFrame, ...doorTrim]);

  return { body, lids: { bonnet: merge([bonnet]), boot: merge([boot]), door } };
}

export const VEHICLE_MODELS = { sedan };

// A lid mirrored across the vehicle (the passenger door from the driver's).
export function mirrorGeometry(g) {
  const m = g.clone();
  m.scale(-1, 1, 1);
  return flip(m.index ? m.toNonIndexed() : m); // (scale mirrors the normals too)
}
