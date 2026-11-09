// Session 22 (M10.3 spike): the looks of the parts bolted onto the dozer.
// Rough placeholders, each one merged mesh (one draw call; the saw two, so
// its disc can spin), vertex-coloured, no lights. Blade parts sit in the
// blade arm's group (render/dozerModel.js: it rises and digs with the
// blade); body parts on the body.
//
// buildPart(id, partCfg) -> { mesh, mount: 'blade' | 'body', spinner (the saw's disc) | null, dispose() }

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DOZER } from './dozerModel.js';

// The blade's cutting edge in the blade arm's frame (as dozerModel builds it).
const B = DOZER.blade;
const BY = -B.pivot[1];
const BZ = B.z - B.pivot[0];

function paint(geo, colour) {
  const c = new THREE.Color(colour);
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function box(w, h, d, x, y, z, colour) {
  return paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), colour);
}

function merged(parts) {
  const geo = mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));
  geo.computeVertexNormals();
  return geo;
}

export function buildPart(id, p) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const owned = [mat];
  const mesh = (geo) => {
    owned.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    return m;
  };
  let root;
  let spinner = null;
  if (id === 'ram') {
    // A heavy plate across the blade's face, a row of spikes out front.
    const parts = [box(B.half * 2 - 0.2, 0.85, 0.14, 0, BY + 0.6, BZ - 0.45, p.color)];
    for (const y of [0.35, 0.85]) {
      for (let i = 0; i < 6; i++) {
        const x = -1.25 + i * 0.5 + (y > 0.5 ? 0.25 : 0);
        if (Math.abs(x) > B.half - 0.2) continue;
        const spike = new THREE.ConeGeometry(0.09, 0.5, 6).rotateX(-Math.PI / 2).translate(x, BY + y, BZ - 0.75);
        parts.push(paint(spike, p.spikeColor));
      }
    }
    root = mesh(merged(parts));
  } else if (id === 'plating') {
    // Steel round the open cab: the sides with a slit to see through, a plate in front of the seat.
    const R = DOZER.rops;
    const parts = [];
    const len = R.back - R.front;
    for (const sx of [-1, 1]) {
      parts.push(box(0.08, 0.85, len, sx * (R.half + 0.12), DOZER.deck + 0.45, R.front + len / 2, p.color));
      parts.push(box(0.08, 0.5, len, sx * (R.half + 0.12), DOZER.deck + 1.55, R.front + len / 2, p.color));
    }
    parts.push(box(R.half * 2, 0.55, 0.08, 0, DOZER.deck + 1.0, R.front - 0.08, p.color));
    root = mesh(merged(parts));
  } else if (id === 'saw') {
    // A boom off the blade's middle, a big flat disc at its end, low and out in front.
    root = new THREE.Group();
    const boom = mesh(merged([box(0.24, 0.24, 1.1, 0, BY + 0.35, BZ - 0.75, p.boomColor), box(0.5, 0.4, 0.3, 0, BY + 0.35, BZ - 0.2, p.boomColor)]));
    root.add(boom);
    const r = 0.85;
    const discParts = [paint(new THREE.CylinderGeometry(r, r, 0.05, 24), p.color)];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      discParts.push(paint(new THREE.BoxGeometry(0.16, 0.05, 0.08).rotateY(-a).translate(Math.cos(a) * (r + 0.05), 0, Math.sin(a) * (r + 0.05)), 0x6a6a62));
    }
    spinner = mesh(merged(discParts));
    spinner.position.set(0, BY + 0.3, BZ - 1.4);
    root.add(spinner);
  }
  return {
    mesh: root,
    mount: p.mount,
    spinner,
    dispose() {
      root?.removeFromParent();
      for (const x of owned) x.dispose();
    },
  };
}
