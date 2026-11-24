// The gas station's chainsaw-carved Bigfoot (Nov 24, Aaron: "update the 3d model of the bigfoot mannequin in
// the gas station to match the updated 3d render of bigfoot"). Earl's statue by the shop door, cut from one
// log in the likeness of the real thing: Bigfoot's own figure (render/bigfootModel.js, Session 24) standing in
// its rest pose, in wood. One static mesh: no skin, no bones, nothing posed per frame.
//  - Every part of him mapped to a wood: his hair to the carving, the darker hair to the deep cuts, his face,
//    palms and soles sanded paler, the eyes and mouth burnt in; his beads painted.
//  - Chainsaw work in the paint: rough bands round him where the bar went across, cut grain running down, and
//    flat-shaded facets (each face its own normal) so it reads as cut, not furred.
// look: config.gasStation.look.statue { height, width, albedo, colours: { carving, deep, sanded, burnt, paint } }.

import * as THREE from 'three';
import { bigfootSpec } from './bigfootModel.js';
import { buildFigure } from './figureKit.js';
import { noise3 } from './propKit.js';

// His figure's colour keys, to the statue's woods.
export const WOOD_FOR = {
  hair: 'carving',
  hairDark: 'deep',
  skin: 'sanded',
  mouth: 'burnt',
  eyes: 'burnt',
  bone: 'paint',
  stone: 'deep',
  seed: 'paint',
  weave: 'deep',
};

// The spec: Bigfoot's own, at the statue's height, coloured and painted as carved wood.
export function statueSpec(look) {
  const colours = Object.fromEntries(Object.entries(WOOD_FOR).map(([key, wood]) => [key, look.colours[wood]]));
  const spec = bigfootSpec({ height: look.height, width: look.width, colours, eyeGlint: 0 });
  spec.glow = {}; // carved eyes don't shine
  spec.paint = (key, q, out) => {
    // The saw's passes round him (a band every ~7 cm, some cut deeper) and the grain down the log.
    const band = Math.sin(q.y * 90 + noise3(q.x * 9, q.y * 3, q.z * 9) * 4);
    const gouge = noise3(q.x * 26, q.y * 1.6, q.z * 26); // the bar's tip dragged down him: long vertical cuts
    const grain = noise3(q.x * 60, q.y * 4, q.z * 60);
    out.multiplyScalar((band > 0.3 ? 0.6 : 1) * (gouge > 0.62 ? 0.55 : 1) * (0.78 + 0.36 * grain));
  };
  return spec;
}

// The statue's geometry: flat-shaded, colours baked in, the skinning attributes dropped.
export function bigfootStatueGeometry(look) {
  const { geometry } = buildFigure(statueSpec(look));
  for (const name of ['skinIndex', 'skinWeight', 'aGlow']) if (geometry.getAttribute(name)) geometry.deleteAttribute(name);
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  flat.computeBoundingBox();
  flat.computeBoundingSphere();
  return flat;
}

export function bigfootStatueMaterial(look) {
  return new THREE.MeshLambertMaterial({ vertexColors: true, color: new THREE.Color().setScalar(look.albedo ?? 1) });
}
