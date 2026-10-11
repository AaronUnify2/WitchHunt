// Simulation tiers (pure; DESIGN.md "Performance and simulation LOD").
// Every zombie on the map is in one of three tiers by its distance from
// the player:
//  - 'active'  (within ~60 m): full simulation every frame: brain,
//    movement, collision with trees and rocks, pushing apart, combat.
//    At most `activeCap` at once; the nearest win, the rest are nearby.
//  - 'nearby'  (~60-150 m): the same simulation, but only every few
//    frames (with the time saved up), and no pushing apart.
//  - 'abstract' (beyond ~150 m): no mesh. It walks the pathway graph in
//    coarse steps about once a second, with no collision.
// A zombie only changes tier once it is `hysteresis` metres past a
// boundary, so one walking along a boundary doesn't flicker between tiers.

export const TIERS = ['active', 'nearby', 'abstract'];

// The tier for a zombie `distance` metres from the player that is in tier
// `current` now (undefined for a fresh one). lod: config.zombies.lod.
export function tierFor(current, distance, lod) {
  const h = lod.hysteresis;
  if (distance <= lod.activeRadius + (current === 'active' ? h : 0)) return 'active';
  if (distance <= lod.nearbyRadius + (current === 'abstract' || current === undefined ? 0 : h)) return 'nearby';
  return 'abstract';
}

// Keep at most `cap` of `candidates` (zombies that want to be active,
// each with a `lodDistance`) active: the nearest. The rest drop to
// nearby. Sorts `candidates` in place. Returns how many stay active.
export function capActive(candidates, cap) {
  if (candidates.length <= cap) return candidates.length;
  candidates.sort((a, b) => a.lodDistance - b.lodDistance);
  for (let i = cap; i < candidates.length; i++) candidates[i].tier = 'nearby';
  return cap;
}

// Whether a nearby zombie in update slot `slot` takes its step on frame
// `frame` (nearby zombies are spread over the frames so the work is even).
export function nearbyStepDue(frame, slot, everyFrames) {
  return (frame + slot) % everyFrames === 0;
}
