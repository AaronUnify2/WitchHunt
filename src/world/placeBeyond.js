// Session 22 (M10.3 spike): the place beyond the stairs, its rules as pure
// logic (tested). DESIGN.md "Stairs in the woods: the place beyond":
// every clearing has four paths (north, east, south, west): the one Tom came
// in by, two with Junie's voice calling down them, and one silent. Take the
// silent path three times in a row to find her. A calling path loops him
// back to the start, three right choices away again.
//
// Spike calls (OPEN_QUESTIONS #377): the way back from the first clearing
// leads out, down the stairs; from any later clearing it loops to the start,
// like a calling path. Each clearing deals its silent path afresh.

export const DIRS = ['north', 'east', 'south', 'west'];

const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };

export function opposite(dir) {
  return OPPOSITE[dir];
}

// A clearing: arrived from `cameFrom` (a side, or null for the first, whose
// way back is south: the stairs). rng: { int(min, max) } (inclusive).
export function dealClearing(rng, cameFrom = 'south') {
  const ahead = DIRS.filter((d) => d !== cameFrom);
  const silent = ahead[rng.int(0, ahead.length - 1)];
  return { cameFrom, silent, calling: ahead.filter((d) => d !== silent) };
}

// A fresh walk: the first clearing, no right choices yet.
export function startWalk(rng, needed = 3) {
  return { needed, step: 0, clearing: dealClearing(rng, 'south') };
}

// Tom takes the path `dir`. Returns { walk, outcome }:
//  'out'     the way back from the first clearing: down the stairs, out;
//  'silent'  the right path: on to a new clearing, one step nearer;
//  'found'   the last silent path: Junie;
//  'loop'    a calling path (or back from a later clearing): to the start again.
export function choosePath(walk, dir, rng) {
  const c = walk.clearing;
  if (dir === c.cameFrom && walk.step === 0) return { walk, outcome: 'out' };
  if (dir === c.silent) {
    const step = walk.step + 1;
    if (step >= walk.needed) return { walk: { ...walk, step }, outcome: 'found' };
    return { walk: { ...walk, step, clearing: dealClearing(rng, opposite(dir)) }, outcome: 'silent' };
  }
  return { walk: { ...walk, step: 0, clearing: dealClearing(rng, 'south') }, outcome: 'loop' };
}

// Which side of a clearing Tom has walked out of, or null: past `reach`
// metres from the centre along one axis, within `pathHalf` of the path's
// line on the other. North is -z (the map's).
export function exitSide(lx, lz, reach, pathHalf) {
  if (lz <= -reach && Math.abs(lx) <= pathHalf) return 'north';
  if (lz >= reach && Math.abs(lx) <= pathHalf) return 'south';
  if (lx >= reach && Math.abs(lz) <= pathHalf) return 'east';
  if (lx <= -reach && Math.abs(lz) <= pathHalf) return 'west';
  return null;
}

// A unit vector for a side: { x, z } (north is -z).
export function sideVector(dir) {
  return { north: { x: 0, z: -1 }, south: { x: 0, z: 1 }, east: { x: 1, z: 0 }, west: { x: -1, z: 0 } }[dir];
}
