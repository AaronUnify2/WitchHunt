// The stairs in the woods (Session 26; DESIGN.md "Stairs in the woods":
// the ranger legend of a staircase standing alone deep in the forest).
// A flight of a house's stairs in an off-path clearing, attached to
// nothing: painted risers and stringers, varnished treads, a carpet runner
// held by brass rods, a turned newel and a banister on one side. It rises
// to a top step and stops in the air.
//
// Wrong, clean, lit by nothing (HANDOVER default 5, the legend): baked with
// no weathering at all (not a speck of moss or grime, in a wood where
// everything else has both), and drawn with an unlit material: it shows
// the same in daylight, at dusk and in the dark, as if lit by something
// that isn't there. No light is added. Dull colours all the same (the
// glare rule); one draw call.
//
// Model space: the flight climbs toward +z; the foot of the stairs is at
// the origin. buildStairs(look, { heightAt }) returns { group, mesh, spots
// (foot, top, side), colliders, dispose }.

import * as THREE from 'three';
import { bakeParts } from './propKit.js';
import { SetBuilder } from './setBuilder.js';

export const FLIGHT = { steps: 14, rise: 0.19, run: 0.26, width: 1.05 };

export function buildStairs(look, { heightAt = null } = {}) {
  const b = new SetBuilder(look, heightAt, 685);
  const c = b.c;
  const F = FLIGHT;
  const hw = F.width / 2;
  const top = F.steps * F.rise;
  const len = F.steps * F.run;
  // It stands level, on the highest ground under it (a house's stairs don't follow the slope).
  let base = -Infinity;
  for (const z of [0, len / 2, len]) for (const x of [-hw, hw]) base = Math.max(base, b.heightAt(x, z));
  b.push(0, base, 0);
  for (let i = 0; i < F.steps; i++) {
    const y = i * F.rise;
    const z = i * F.run;
    b.box(F.width, F.rise, 0.03, c.paint, 0, y + F.rise / 2, z); // the riser
    b.box(F.width + 0.06, 0.035, F.run + 0.03, c.tread, 0, y + F.rise + 0.0175, z + F.run / 2 - 0.015); // the tread, its nosing over the riser
    // The runner: down the riser, over the tread; the brass rod in the crook.
    b.box(0.62, F.rise, 0.008, c.carpet, 0, y + F.rise / 2, z - 0.02);
    b.box(0.62, 0.008, F.run, c.carpet, 0, y + F.rise + 0.04, z + F.run / 2);
    b.box(0.64, 0.012, 0.012, c.brass, 0, y + 0.012, z - 0.03);
    for (const s of [-1, 1]) b.box(0.012, 0.03, 0.03, c.brass, s * 0.33, y + 0.012, z - 0.03);
    // A baluster on the open side, two to a step.
    for (const k of [0.25, 0.75]) b.box(0.035, 0.85, 0.035, c.paint, -hw + 0.05, y + F.rise + 0.45, z + F.run * k);
  }
  // The stringers, both sides: boards along the slope (the underside shows: painted, like the wall side of a house's).
  const slope = Math.hypot(len, top);
  const a = Math.atan2(top, len);
  for (const s of [-1, 1]) b.box(0.05, 0.3, slope + 0.25, c.paint, s * (hw + 0.025), top / 2 - 0.05, len / 2 - 0.05, 0, -a, 0);
  // The soffit under the flight (a house's: plastered and painted), and the triangle of panelling at the side.
  b.box(F.width, 0.02, slope, c.paintDark, 0, top / 2 - 0.22, len / 2 + 0.04, 0, -a, 0);
  // The newel at the foot (turned: a square post with a ball cap) and the banister up to the top.
  b.box(0.11, 1.05, 0.11, c.tread, -hw + 0.05, 0.52, -0.05);
  b.put(new THREE.SphereGeometry(0.075, 8, 6), c.tread, -hw + 0.05, 1.1, -0.05);
  b.box(0.06, 0.06, slope + 0.1, c.tread, -hw + 0.05, top / 2 + 0.98, len / 2 - 0.05, 0, -a, 0);
  b.box(0.1, 0.4, 0.1, c.tread, -hw + 0.05, top + 0.82, len - 0.04); // a short post where the banister ends, at the top
  b.spot('foot', 0, 0, -0.9);
  b.spot('top', 0, top, len - F.run / 2);
  b.spot('side', hw + 2.2, 0, len * 0.4);
  // Solid: its sides and its back (you can't walk under it into it); you walk up it (the encounter's prompt climbs it).
  b.wall(-hw - 0.05, 0, -hw - 0.05, len, 0, 0.08, top + 1);
  b.wall(hw + 0.05, 0, hw + 0.05, len, 0, 0.08, top);
  b.wall(-hw, len, hw, len, 0, 0.08, top);
  b.post(0, 0, len * 0.5, 0.45, top * 0.5);
  b.pop();

  // No weather: clean, as nothing else out here is.
  const geometry = bakeParts(b.parts, { weather: null });
  // Unlit: it shows the same by day and by night (fog still takes it in the distance).
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  const group = new THREE.Group();
  group.name = 'stairs';
  group.add(mesh);
  return {
    group,
    mesh,
    spots: b.spots,
    colliders: b.colliders,
    base,
    dispose() {
      group.removeFromParent();
      geometry.dispose();
      material.dispose();
    },
  };
}
