// The alien quad (experimental, debug menu only): Earl's quad bike as the
// greys rebuilt it. Its frame is Earl's (the same stance and size: it rides
// the same), sheathed in a blue-black chitin; neon veins run along its
// fenders and frame (cyan-green, violet accents), its hubs are glowing
// rings, two plasma emitters sit on the front rack, a spine of fins rises
// behind the seat round a caged engine orb that throws flame when it boosts,
// and a holographic ring over the bars shows the plasma's cells.
//
// The game's vehicle frame (the quad's): front at -z, right +x, y up, the
// origin on the ground under its middle.
//
// buildAlienQuad(cfg) returns:
//  root (Group: position, heading, slope) > body (Group: lean) > the parts;
//  wheels: [{ group (steers), spin (rolls), front }];
//  emitters: [{ core (Mesh), muzzle (Object3D) }] (left, right);
//  setGlow(t, s): animates the neon (s: { boost 0..1, charge 0..1, cells, cellsMax, boostMeter 0..1, riding, firing (0..1 flash) });
//  dispose().
// The neon is unlit and pushed past white, so the bloom catches it.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Its numbers (metres), Earl's quad's stance.
export const ALIEN_QUAD = {
  track: 0.6,
  axle: 0.68,
  emitterX: 0.42,
  emitterY: 0.98,
  emitterZ: -0.98,
  holo: { y: 1.14, z: -0.56, r: 0.075 }, // low over the bars' middle: under the sight line
};

function strip(g) {
  let x = g.index ? g.toNonIndexed() : g;
  if (x !== g) g.dispose();
  if (x.attributes.uv) x.deleteAttribute('uv');
  if (x.attributes.uv1) x.deleteAttribute('uv1');
  return x;
}

// A colour-sorted pile of parts: add(geo, colour), then meshes(material maker).
function partsBin() {
  const bins = new Map();
  return {
    add(geo, color) {
      const g = strip(geo);
      if (!bins.has(color)) bins.set(color, []);
      bins.get(color).push(g);
      return g;
    },
    // One merged geometry per colour, coloured in (vertex colours), merged again.
    merged() {
      const all = [];
      const c = new THREE.Color();
      for (const [color, list] of bins) {
        const g = mergeGeometries(list);
        list.forEach((x) => x.dispose());
        if (!g.attributes.normal) g.computeVertexNormals();
        const n = g.attributes.normal;
        const col = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < g.attributes.position.count; i++) {
          c.set(color).multiplyScalar(0.72 + 0.28 * (n.getY(i) * 0.5 + 0.5));
          c.toArray(col, i * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        all.push(g);
      }
      const out = mergeGeometries(all);
      all.forEach((x) => x.dispose());
      return out;
    },
  };
}

const boxG = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  return g.translate(x, y, z);
};

// A tube along points [[x, y, z], ...] (smoothed), radius r.
function veinG(points, r, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return new THREE.TubeGeometry(curve, seg, r, 5, false);
}

// A sculpted fender: a swept, tapering shell over a wheel (front or back), its edge lipped.
function fenderG(z, dir) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.38, 0);
  shape.quadraticCurveTo(-0.3, 0.16, 0, 0.19);
  shape.quadraticCurveTo(0.3, 0.16, 0.42 * (dir > 0 ? 1.1 : 1), 0.02);
  shape.lineTo(0.38, -0.02);
  shape.quadraticCurveTo(0.26, 0.11, 0, 0.13);
  shape.quadraticCurveTo(-0.26, 0.11, -0.34, -0.02);
  shape.lineTo(-0.38, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2); // the profile runs along z
  g.translate(0, 0.66, z);
  return g;
}

export function buildAlienQuad(cfg) {
  const k = cfg.look;
  const A = ALIEN_QUAD;
  const W = cfg.wheel;
  const root = new THREE.Group();
  root.name = 'alien quad';
  const body = new THREE.Group();
  root.add(body);
  const hot = (hex, gain = k.glow) => new THREE.Color(hex).multiplyScalar(gain);
  const veinMat = new THREE.MeshBasicMaterial({ color: hot(k.vein) });
  const veinBMat = new THREE.MeshBasicMaterial({ color: hot(k.veinB) });
  const coreMat = new THREE.MeshBasicMaterial({ color: hot(k.plasma, 3) });
  const flameMat = new THREE.MeshBasicMaterial({ color: hot(k.vein, 3), transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const meshes = [];
  const add = (geo, mat, parent = body, name = '') => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.castShadow = !mat.isMeshBasicMaterial;
    m.receiveShadow = !mat.isMeshBasicMaterial;
    parent.add(m);
    meshes.push(m);
    return m;
  };

  // ---- the shell (one draw call) ----
  const bin = partsBin();
  bin.add(boxG(0.62, 0.26, 1.46, 0, 0.5, 0), k.frame); // the frame and engine
  bin.add(boxG(0.5, 0.08, 1.2, 0, 0.36, 0), k.metal); // the skid plate
  for (const [z, dir] of [
    [-0.64, -1],
    [0.64, 1],
  ]) {
    bin.add(fenderG(z, dir), k.chitin);
    for (const sx of [-1, 1]) bin.add(boxG(0.3, 0.05, 0.56, sx * 0.4, 0.73, z, 0, 0, sx * -0.18), k.chitin); // the fender's wings out over the tyres
  }
  // The tank: a ribbed carapace.
  const tank = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  tank.scale(0.85, 0.75, 1.15);
  tank.translate(0, 0.74, -0.12);
  bin.add(tank, k.chitin);
  for (let i = 0; i < 4; i++) bin.add(boxG(0.52 - i * 0.04, 0.03, 0.05, 0, 0.84 + i * 0.03 - i * i * 0.012, -0.36 + i * 0.16), k.body);
  bin.add(boxG(0.4, 0.13, 0.72, 0, 0.92, 0.32), k.seat); // the seat
  bin.add(boxG(0.36, 0.05, 0.6, 0, 1.0, 0.34), k.body);
  bin.add(boxG(0.86, 0.04, 0.4, 0, 0.86, -0.82), k.metal); // the front rack
  bin.add(boxG(0.86, 0.04, 0.4, 0, 0.86, 0.86), k.metal); // the rear rack
  bin.add(boxG(0.06, 0.42, 0.06, 0, 0.96, -0.5, -0.35), k.metal); // the steering column
  // The bars: swept back, claw grips.
  const bars = veinG(
    [
      [-0.42, 1.2, -0.52],
      [-0.2, 1.17, -0.6],
      [0, 1.16, -0.62],
      [0.2, 1.17, -0.6],
      [0.42, 1.2, -0.52],
    ],
    0.022,
    16,
  );
  bin.add(bars, k.metal);
  for (const sx of [-1, 1]) {
    bin.add(boxG(0.12, 0.06, 0.07, sx * 0.43, 1.2, -0.52, 0, sx * 0.4, 0), k.grip);
    bin.add(boxG(0.03, 0.03, 0.12, sx * 0.47, 1.22, -0.6, 0.3, 0, 0), k.chitin); // a claw over each grip
  }
  // The emitters' housings on the front rack: barrels with three claws round the core.
  for (const sx of [-1, 1]) {
    const x = sx * A.emitterX;
    const barrel = new THREE.CylinderGeometry(0.075, 0.095, 0.34, 12).rotateX(Math.PI / 2).translate(x, A.emitterY, A.emitterZ + 0.12);
    bin.add(barrel, k.chitin);
    bin.add(boxG(0.1, 0.08, 0.2, x, A.emitterY - 0.07, A.emitterZ + 0.24), k.metal);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const claw = boxG(0.02, 0.02, 0.2, 0, 0, 0, 0.0, 0, 0);
      claw.rotateX(0.28);
      claw.rotateZ(a);
      claw.translate(x + Math.cos(a) * 0.075, A.emitterY + Math.sin(a) * 0.075, A.emitterZ - 0.1);
      bin.add(claw, k.chitin);
    }
  }
  // The spine of fins behind the seat, round the caged engine orb.
  for (let i = 0; i < 3; i++) {
    const shape = new THREE.Shape();
    const h = 0.34 - i * 0.07;
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.05, h * 0.7, -0.12 - i * 0.02, h);
    shape.quadraticCurveTo(-0.08, h * 0.45, -0.2, 0);
    shape.lineTo(0, 0);
    const fin = new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, curveSegments: 8 });
    fin.translate(0, 0, -0.0125);
    fin.rotateY(-Math.PI / 2);
    fin.translate(0, 1.0, 0.62 + i * 0.13);
    bin.add(fin, k.chitin);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bar = new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4).rotateX(Math.PI / 2);
    bar.translate(Math.cos(a) * 0.13, 0.98 + Math.sin(a) * 0.13, 1.0);
    bin.add(bar, k.metal);
  }
  for (const z of [0.86, 1.14]) bin.add(new THREE.TorusGeometry(0.135, 0.012, 4, 14).translate(0, 0.98, z), k.metal);
  // The headlamp: a slit eye in the nose.
  bin.add(boxG(0.36, 0.06, 0.06, 0, 0.84, -1.02), k.chitin);
  const shell = add(bin.merged(), new THREE.MeshLambertMaterial({ vertexColors: true }), body, 'alien quad shell');

  // ---- the neon veins ----
  const veins = [];
  const veinsB = [];
  for (const sx of [-1, 1]) {
    const x = sx * 0.53;
    // Along each fender's edge, over the wheel and down.
    for (const z of [-0.64, 0.64]) {
      veins.push(veinG([
        [x, 0.66, z - 0.38],
        [x + sx * 0.02, 0.8, z - 0.24],
        [x + sx * 0.03, 0.86, z],
        [x + sx * 0.02, 0.8, z + 0.24],
        [x, 0.67, z + 0.4],
      ], 0.013));
    }
    // Down the frame's flank: a long vein, branching up into the tank.
    veins.push(veinG([
      [sx * 0.32, 0.47, -0.7],
      [sx * 0.33, 0.55, -0.3],
      [sx * 0.33, 0.5, 0.1],
      [sx * 0.32, 0.56, 0.5],
      [sx * 0.31, 0.5, 0.74],
    ], 0.012));
    veinsB.push(veinG([
      [sx * 0.33, 0.55, -0.3],
      [sx * 0.27, 0.7, -0.22],
      [sx * 0.2, 0.86, -0.12],
      [sx * 0.08, 0.98, -0.06],
    ], 0.009, 12));
    // The seat's piping.
    veinsB.push(veinG([
      [sx * 0.2, 0.99, 0.0],
      [sx * 0.21, 0.99, 0.32],
      [sx * 0.2, 0.99, 0.66],
    ], 0.007, 8));
    // The rack's rails.
    veins.push(veinG([
      [sx * 0.43, 0.89, -1.0],
      [sx * 0.43, 0.89, -0.64],
    ], 0.009, 4));
  }
  // The tank's ridge, and each fin's edge.
  veins.push(veinG([
    [0, 0.98, -0.42],
    [0, 1.0, -0.12],
    [0, 0.96, 0.1],
  ], 0.012, 10));
  for (let i = 0; i < 3; i++) {
    const h = 0.34 - i * 0.07;
    const z = 0.62 + i * 0.13;
    veinsB.push(veinG([
      [0, 1.0, z],
      [0, 1.0 + h * 0.7, z - 0.05],
      [0, 1.0 + h, z + 0.12 + i * 0.02],
    ], 0.008, 8));
  }
  add(mergeGeometries(veins.map(strip)), veinMat, body, 'veins');
  add(mergeGeometries(veinsB.map(strip)), veinBMat, body, 'veins (violet)');

  // ---- the emitters' cores, the engine orb, the headlamp's slit ----
  const emitters = [];
  for (const sx of [-1, 1]) {
    const core = add(new THREE.SphereGeometry(0.055, 12, 8), coreMat, body, 'emitter core');
    core.position.set(sx * A.emitterX, A.emitterY, A.emitterZ - 0.04);
    const muzzle = new THREE.Object3D();
    muzzle.position.set(sx * A.emitterX, A.emitterY, A.emitterZ - 0.2);
    body.add(muzzle);
    emitters.push({ core, muzzle });
  }
  const orb = add(new THREE.IcosahedronGeometry(0.075, 1), coreMat, body, 'engine orb');
  orb.position.set(0, 0.98, 1.0);
  const lens = add(new THREE.PlaneGeometry(0.3, 0.025), new THREE.MeshLambertMaterial({ color: 0x18201e, emissive: 0x000000 }), body, 'headlamp slit');
  lens.position.set(0, 0.84, -1.052);
  lens.rotation.y = Math.PI;

  // The boost's flame: twin cones out of the back, additive (dark until it burns).
  const flameGeo = mergeGeometries(
    [-0.14, 0.14].map((x) => strip(new THREE.ConeGeometry(0.07, 0.7, 10, 1, true).rotateX(Math.PI / 2).translate(x, 0.72, 1.32))),
  );
  const flame = add(flameGeo, flameMat, body, 'boost flame');
  flame.visible = false;
  for (const sx of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.24, 10).rotateX(Math.PI / 2).translate(sx * 0.14, 0.72, 1.02), shell.material);
    body.add(pipe);
    meshes.push(pipe);
  }

  // ---- the holo ring over the bars: one segment a cell, the boost's arc outside it ----
  const H = A.holo;
  const cellsMax = cfg.plasma.cells;
  const segs = [];
  const segOf = [];
  const arcSegs = 24;
  const ringPiece = (r0, r1, a0, a1) => {
    const g = new THREE.RingGeometry(r0, r1, 1, 1, a0, a1 - a0);
    return strip(g);
  };
  for (let i = 0; i < cellsMax; i++) {
    const a0 = Math.PI * 1.25 - (i / cellsMax) * Math.PI * 1.5;
    const a1 = a0 - (Math.PI * 1.5) / cellsMax + 0.05;
    segs.push(ringPiece(H.r * 0.72, H.r, a1, a0));
    segOf.push(i);
  }
  for (let i = 0; i < arcSegs; i++) {
    const a0 = Math.PI * 1.25 - (i / arcSegs) * Math.PI * 1.5;
    const a1 = a0 - (Math.PI * 1.5) / arcSegs + 0.01;
    segs.push(ringPiece(H.r * 1.07, H.r * 1.17, a1, a0));
    segOf.push(cellsMax + i);
  }
  const holoGeo = mergeGeometries(segs);
  const owner = new Float32Array(holoGeo.attributes.position.count);
  let at = 0;
  segs.forEach((g, i) => {
    owner.fill(segOf[i], at, at + g.attributes.position.count);
    at += g.attributes.position.count;
  });
  const holoCol = new Float32Array(holoGeo.attributes.position.count * 3);
  holoGeo.setAttribute('color', new THREE.BufferAttribute(holoCol, 3));
  const holoMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const holo = add(holoGeo, holoMat, body, 'holo ring');
  holo.position.set(0, H.y, H.z);
  holo.rotation.x = -0.75; // tipped back toward the rider's eye
  holo.renderOrder = 3;
  const cellOn = new THREE.Color(k.plasma).multiplyScalar(0.9);
  const cellOff = new THREE.Color(k.plasma).multiplyScalar(0.08);
  const boostOn = new THREE.Color(k.veinB).multiplyScalar(0.85);
  const boostOff = new THREE.Color(k.veinB).multiplyScalar(0.06);
  let lastHolo = '';
  const setHolo = (cells, boostMeter, visible) => {
    holo.visible = visible;
    if (!visible) return;
    const lit = Math.floor(cells + 1e-6);
    const arc = Math.round(boostMeter * arcSegs);
    const key = `${lit}:${arc}`;
    if (key === lastHolo) return;
    lastHolo = key;
    const c = holoGeo.attributes.color;
    for (let i = 0; i < owner.length; i++) {
      const o = owner[i];
      const col = o < cellsMax ? (o < lit ? cellOn : cellOff) : o - cellsMax < arc ? boostOn : boostOff;
      c.setXYZ(i, col.r, col.g, col.b);
    }
    c.needsUpdate = true;
  };
  setHolo(cellsMax, 1, false);

  // ---- the wheels: a slick dark tyre, blades for spokes, a glowing hub ring ----
  const wheels = [];
  const tyreGeo = (() => {
    const b = partsBin();
    b.add(new THREE.CylinderGeometry(W.radius, W.radius, W.width, 18).rotateZ(Math.PI / 2), k.tyre);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tread = boxG(W.width * 0.9, 0.035, 0.07, 0, 0, 0);
      tread.rotateX(a);
      tread.translate(0, Math.cos(a) * W.radius, Math.sin(a) * W.radius);
      b.add(tread, k.tyre);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const blade = boxG(0.04, W.radius * 0.75, 0.04, 0, 0, 0);
      blade.translate(0, W.radius * 0.36, 0);
      blade.rotateX(a);
      b.add(blade, k.chitin);
    }
    return b.merged();
  })();
  const hubGeo = strip(new THREE.TorusGeometry(W.radius * 0.55, 0.018, 6, 22).rotateY(Math.PI / 2));
  const tyreMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    const group = new THREE.Group();
    group.position.set(sx * A.track, W.radius, sz * A.axle);
    const spin = new THREE.Group();
    group.add(spin);
    add(tyreGeo, tyreMat, spin, 'wheel');
    const hub = add(hubGeo, veinMat, spin, 'hub ring');
    hub.position.x = sx * (W.width / 2 + 0.006);
    root.add(group);
    wheels.push({ group, spin, front: sz < 0 });
  }

  // ---- animating the glow ----
  const veinBase = hot(k.vein);
  const veinBBase = hot(k.veinB);
  const coreBase = hot(k.plasma, 3);
  const flameBase = hot(k.vein, 3);
  const setGlow = (t, s) => {
    const live = s.riding ? 1 : 0.55;
    // A slow pulse runs through the veins; boosting, they blaze and flicker.
    const pulse = 0.78 + 0.22 * Math.sin(t * (s.riding ? 3.2 : 1.4));
    const boost = s.boost ?? 0;
    const flick = boost > 0 ? 0.85 + 0.15 * Math.sin(t * 60) : 1;
    veinMat.color.copy(veinBase).multiplyScalar(live * pulse * (1 + boost * 0.6) * flick);
    veinBMat.color.copy(veinBBase).multiplyScalar(live * (0.85 + 0.15 * Math.sin(t * 2.1 + 1)) * (1 + boost * 0.5));
    // The cores swell with a charge and flash as they fire.
    const charge = s.charge ?? 0;
    coreMat.color.copy(coreBase).multiplyScalar(live * (0.7 + 0.3 * pulse + charge * 1.6 + (s.firing ?? 0) * 2));
    const cs = 1 + charge * 0.9 + (s.firing ?? 0) * 0.4;
    for (const e of emitters) e.core.scale.setScalar(cs * (1 + 0.06 * Math.sin(t * 9 + e.core.position.x * 10)));
    orb.rotation.y = t * (1.2 + boost * 8);
    orb.rotation.x = t * 0.7;
    orb.scale.setScalar(1 + boost * 0.4 + 0.05 * Math.sin(t * 5));
    flame.visible = boost > 0.01;
    if (flame.visible) {
      flameMat.color.copy(flameBase).multiplyScalar(0.6 + 0.4 * Math.random());
      flameMat.opacity = Math.min(1, boost * 1.5);
      flame.scale.set(1, 1, 0.6 + boost * (0.8 + Math.random() * 0.5));
    }
    setHolo(s.cells ?? cellsMax, s.boostMeter ?? 1, Boolean(s.riding));
  };
  setGlow(0, { riding: false });

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
        o.material.dispose();
      }
    });
  };

  return { root, body, wheels, emitters, lens, meshes, setGlow, dispose };
}
