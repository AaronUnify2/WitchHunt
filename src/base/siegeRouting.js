// How a zombie gets through the station's layers (pure). The compound is
// four zones (stationLayout.zoneOf): 0 outside the fence, 1 the yard,
// 2 the cabin's main room, 3 the comms room. Three layers lie between
// them: the fence (12 segments, each maybe with a barricade behind it,
// plus the gate), the front door and the comms room door.
//
// Given where a zombie wants to go (the player, or the family in the comms
// room), route() says where to walk next and, if a defence is in the way,
// which barrier to claw at:
//  - fence: walk round the outside of the arc to a gap within breachSeek
//    metres (a broken segment with no barricade left, a broken or open
//    gate), then step through; with no gap near, claw the segment (or the
//    barricade behind it) straight ahead;
//  - doors: walk to the door (round the cabin's corners if it's behind
//    the zombie); through if it's broken or open, else claw it.
// Leaving works the same way in reverse. Zombies already in the same zone
// as their goal get no route and walk straight at it.

import { zoneOf, angleOf } from './stationLayout.js';
import { passable } from './StationState.js';

const DEG = Math.PI / 180;

// out: { active, x, z, barrier } (reused). Returns out.
export function routeTo(layout, state, cfg, fromX, fromZ, toX, toZ, out) {
  out.active = false;
  out.barrier = null;
  const zFrom = zoneOf(layout, fromX, fromZ);
  const zTo = zoneOf(layout, toX, toZ);
  if (zFrom === zTo) return out;
  const inward = zTo > zFrom;
  const layer = inward ? zFrom : zFrom - 1; // 0 fence, 1 front door, 2 comms door
  out.active = true;
  if (layer === 0) fenceRoute(layout, state, cfg, fromX, fromZ, inward, out);
  else if (layer === 1) doorRoute(layout, layout.cabin.frontDoor, state.doors.front, fromX, fromZ, inward, true, out);
  else doorRoute(layout, layout.cabin.commsDoor, state.doors.comms, fromX, fromZ, inward, false, out);
  return out;
}

// The barrier at angle `a` on the fence line (a segment or the gate).
export function fenceAt(layout, state, a) {
  if (a >= layout.gate.a0 && a <= layout.gate.a1) return { geo: layout.gate, fence: state.gate, barricade: null };
  const segs = layout.segments;
  for (let i = 0; i < segs.length; i++) {
    if (a >= segs[i].a0 && a <= segs[i].a1) return { geo: segs[i], fence: state.segments[i], barricade: state.segments[i].barricade };
  }
  // Beyond an end (by the cliff): the end segment.
  const i = a < 0 ? 0 : segs.length - 1;
  return { geo: segs[i], fence: state.segments[i], barricade: state.segments[i].barricade };
}

// The fence's gaps: [{ a (middle angle), half (half-width, radians) }].
export function fenceGaps(layout, state, out = []) {
  out.length = 0;
  const segs = layout.segments;
  for (let i = 0; i < segs.length; i++) {
    const s = state.segments[i];
    if (passable(s) && passable(s.barricade)) out.push({ a: (segs[i].a0 + segs[i].a1) / 2, half: (segs[i].a1 - segs[i].a0) / 2 });
  }
  if (passable(state.gate)) out.push({ a: 0, half: layout.gateHalf });
  return out;
}

const gaps = [];

function fenceRoute(layout, state, cfg, x, z, inward, out) {
  const R = layout.radius;
  const sc = cfg.siege;
  const a = Math.max(layout.west, Math.min(layout.east, angleOf(layout, x, z)));
  // The nearest gap round the arc.
  let best = null;
  let bestDist = Infinity;
  for (const g of fenceGaps(layout, state, gaps)) {
    const d = Math.abs(g.a - a);
    if (d < bestDist) {
      bestDist = d;
      best = g;
    }
  }
  const side = inward ? 1 : -1; // outside the fence when coming in, inside when going out
  if (best && bestDist * R <= sc.breachSeek) {
    const margin = Math.max(0, best.half - 0.6 / R); // close enough to the gap's middle to fit through
    if (bestDist <= margin) {
      // Through the gap, straight across the fence line.
      const p = layout.at(a, R - side * sc.gapThrough);
      setGoal(out, p.x, p.z, null);
      return;
    }
    // Round the arc toward it, a step at a time (straight lines would cut
    // across the fence).
    const step = Math.min(bestDist - margin * 0.5, sc.arcStepDegrees * DEG) * Math.sign(best.a - a);
    const p = layout.at(a + step, R + side * sc.walkOutside);
    setGoal(out, p.x, p.z, null);
    return;
  }
  // No gap near: claw whatever is in the way, the outer layer first.
  const hit = fenceAt(layout, state, a);
  const inset = cfg.layout.barricadeInside;
  const order = inward ? [hit.fence, hit.barricade] : [hit.barricade, hit.fence];
  for (const b of order) {
    if (passable(b)) continue;
    // Stand just off the barrier's line on the zombie's side.
    const line = b.kind === 'barricade' ? R - inset : R;
    const p = layout.at(clampInto(a, hit.geo), line + side * sc.stand);
    setGoal(out, p.x, p.z, b);
    return;
  }
  const p = layout.at(a, R - side * sc.gapThrough);
  setGoal(out, p.x, p.z, null);
}

// Keep an angle a little inside a fence piece, so the zombie claws the
// piece it's standing at, not its neighbour.
function clampInto(a, geo) {
  const pad = (geo.a1 - geo.a0) * 0.1;
  return Math.max(geo.a0 + pad, Math.min(geo.a1 - pad, a));
}

function doorRoute(layout, door, doorState, x, z, inward, front, out) {
  const c = layout.cabin;
  if (inward && front) {
    // From the yard: round the cabin's corners to its south side first.
    const lx = x - c.x;
    const lz = z - c.z;
    const m = c.cornerMargin;
    if (lz < c.halfD + 0.3) {
      const sideX = (lx >= 0 ? 1 : -1) * (c.halfW + m);
      if (Math.abs(lx) < c.halfW + m * 0.6 && lz < -c.halfD) {
        setGoal(out, c.x + sideX, c.z - c.halfD - m, null); // behind it: to a back corner
      } else {
        setGoal(out, c.x + sideX, c.z + c.halfD + m, null); // beside it: to a front corner
      }
      return;
    }
  }
  const open = passable(doorState);
  const near = inward ? door.outer : door.inner;
  const far = inward ? door.inner : door.outer;
  if (open) setGoal(out, far.x, far.z, null);
  else setGoal(out, near.x, near.z, doorState);
}

function setGoal(out, x, z, barrier) {
  out.x = x;
  out.z = z;
  out.barrier = barrier;
}
