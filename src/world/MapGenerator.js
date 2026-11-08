// Seeded map generation (pure): which clearings exist this run, where
// they go, and the pathways between them (DESIGN.md "Map"). The same seed
// always gives the same map.
//
// 1. Roster: home, the hut, the encounters that appear this run (from
//    data/encounters.json), the sigil grounds, then plain clearings up to
//    config.map.clearingCount. Each gets a band and a clearing type.
// 2. Placement: the fixed opening cluster first (data/openingCluster.json:
//    home on the cliff, the campsite, storm shelter, gas station, outpost,
//    one sigil ground and the Bigfoot cave at the end of the road north,
//    identical every run; M9.1, Session 21), then the fixed story spine
//    (data/storySpine.json: the crashed plane, the old church, the stairs,
//    the crashed UFO, the Car Armory, Ground Zero, the hut and the clearing
//    crew's dozer; Session 21), then the rest at random in their bands,
//    south of the cordon, with a minimum gap between clearings and clear of
//    the 1903 railway line (the railway cutting sits on it).
// 3. Pathways: the cluster's own (fixed, from the cluster's seed); the
//    frontier's from a minimum spanning tree plus extra edges for loops,
//    each drawn as a gently wandering line; and one pathway joining them,
//    due south from the outpost through the checkpoint to the crashed
//    plane. The cluster's road (world/road.js) is on the map too; the gas
//    station's pathway to the outpost follows it, and its pathway to the
//    cave follows the road north. An off-path place (the stairs) hangs off
//    the frontier by one faint trail and no loops.
// If a rule can't be met (e.g. the hut too few pathways from home), the
// whole attempt is retried from a forked seed. The cluster never changes.

import { Rng } from '../core/Rng.js';
import { makeGeometry, cliffZ, southnessAt, zAtSouthness } from './mapGeometry.js';
import { minimumSpanningTree, addLoops, hopCounts, isConnected, graphDistance, edgeFits } from './mapGraph.js';
import { buildRoad, buildBranch, nearestRoadIndex } from './road.js';
import { buildRailway, railZAt, railDistance } from './railway.js';
import { roadNorthLayout } from './roadNorth.js';

const DEG_TO_RAD = Math.PI / 180;
const BANDS = ['north', 'middle', 'south'];

// data: { encounters, sigilGrounds, clearingTypes, cluster, spine } (the
// JSON files' contents; cluster is openingCluster.json, spine storySpine.json).
export function generateMap(mapCfg, data, rng, seed = rng.seed) {
  const geo = makeGeometry(mapCfg);
  const road = buildRoad(geo.cluster.home, data.cluster.road, mapCfg.road);
  // Session 21: the road north (a fork off the main road) and the railway.
  if (data.cluster.roadNorth) road.north = buildBranch(geo.cluster.home, road, data.cluster.roadNorth, mapCfg.road);
  const roadNorth = road.north && mapCfg.roadNorth ? roadNorthLayout(geo, road.north, mapCfg.roadNorth) : null;
  const railway = mapCfg.railway ? buildRailway(geo, mapCfg.railway) : null;
  geo.railway = railway;
  for (let attempt = 0; attempt < mapCfg.maxAttempts; attempt++) {
    const map = tryGenerate(mapCfg, data, rng.fork(`attempt${attempt}`), geo, road);
    if (map) {
      map.seed = seed;
      map.roadNorth = roadNorth; // Session 21: the end of the road north (the tunnel, the barrier, the cave)
      map.attempts = attempt + 1;
      return map;
    }
  }
  throw new Error(`Map generation failed after ${mapCfg.maxAttempts} attempts (seed ${seed})`);
}

function tryGenerate(cfg, data, rng, geo, road) {
  const roster = buildRoster(cfg, data, rng.fork('roster'));
  const clearings = placeClearings(cfg, roster.entries, geo, rng.fork('place'));
  if (!clearings) return null;
  const byKey = (key) => clearings.find((c) => c.cluster && c.key === key).id;
  const outpost = byKey('outpost');

  // The cluster's pathways, as authored.
  const clusterEdges = data.cluster.paths.map((p) => [byKey(p.a), byKey(p.b)]);

  // The frontier's: a spanning tree and loops among its clearings only.
  // Off-path places (the stairs) are left out, then hung off it by one trail.
  const frontier = clearings.filter((c) => !c.cluster && !c.offPath);
  const local = minimumSpanningTree(frontier);
  const e = cfg.edges;
  const opts = {
    count: Math.round(local.length * e.extraFraction),
    maxLength: e.extraMaxLength,
    keepChance: e.extraKeepChance,
    detourRatio: e.detourRatio,
    minAngle: e.minAngleDegrees * DEG_TO_RAD,
    clearance: e.clearance,
  };
  addLoops(frontier, local, rng.fork('loops'), opts);
  const frontierEdges = local.map(([a, b]) => [frontier[a].id, frontier[b].id]);
  const faint = new Set();
  for (const c of clearings.filter((o) => o.offPath)) {
    const trail = offPathTrail(clearings, frontierEdges, c, opts);
    if (!trail) return null;
    faint.add(frontierEdges.length);
    frontierEdges.push(trail);
  }

  // The one way between them: out of the outpost's south side, through
  // the checkpoint, to the spine's entry (the crashed plane), or else the
  // nearest frontier clearing it can reach cleanly.
  const exit = checkpointExit(cfg, clearings, frontierEdges, outpost, opts);
  if (!exit) return null;
  const edges = [...clusterEdges, ...frontierEdges, [outpost, exit.target]];
  if (!isConnected(clearings.length, edges)) return null;

  const home = clearings.findIndex((c) => c.kind === 'home');
  const hut = clearings.findIndex((c) => c.kind === 'hut');
  let hops = hopCounts(clearings.length, edges, home);
  if (hops[hut] < cfg.hut.minHops) return null;
  if (!northIsReachable(clearings, edges, outpost, cfg.edges.maxNorthDetour)) return null;
  const warnings = applyHopRules(clearings, hops, cfg);
  hops = hopCounts(clearings.length, edges, home);
  clearings.forEach((c, i) => (c.hopsFromHome = hops[i]));

  const pathRng = rng.fork('paths');
  const clusterCount = clusterEdges.length;
  const paths = edges.map(([a, b], i) => {
    const ca = clearings[a];
    const cb = clearings[b];
    if (i < clusterCount) {
      const via = data.cluster.paths[i].road;
      if (via === 'north') return { a, b, cluster: true, road: true, roadNorth: true, points: branchPoints(ca, cb, road, road.north) };
      if (via) return { a, b, cluster: true, road: true, points: roadPoints(ca, cb, road) };
      // Fixed wander, from the cluster's seed and the pair's keys.
      const fixed = new Rng(`${geo.cluster.seed}:path:${ca.key}-${cb.key}`);
      return { a, b, cluster: true, points: pathPoints(ca, cb, cfg.paths, fixed) };
    }
    if (a === outpost && b === exit.target) {
      return { a, b, checkpoint: true, points: exitPoints(ca, exit.gate, cb, cfg.paths, pathRng) };
    }
    if (faint.has(i - clusterCount)) return { a, b, faint: true, points: pathPoints(ca, cb, cfg.paths, pathRng) };
    return { a, b, points: pathPoints(ca, cb, cfg.paths, pathRng) };
  });
  return {
    geometry: geo,
    clearings,
    edges: edges.map(([a, b]) => ({ a, b, length: Math.hypot(clearings[a].x - clearings[b].x, clearings[a].z - clearings[b].z) })),
    paths,
    road,
    railway: geo.railway,
    homeIndex: home,
    hutIndex: hut,
    // The opening cluster (M9.1): its cordon line, the checkpoint (where
    // the frontier's pathway crosses it) and the frontier clearing beyond.
    cluster: {
      cordonZ: geo.cluster.cordonZ,
      outpostIndex: outpost,
      checkpoint: { x: clearings[outpost].x, z: geo.cluster.cordonZ },
      exitGate: exit.gate,
      frontierEntryIndex: exit.target,
    },
    radioEvents: roster.radioEvents,
    // Session 21: the optional encounters the seed dealt this run (keys).
    dealt: roster.dealt,
    warnings,
  };
}

// An off-path place's one trail: its shortest line to a frontier clearing
// that crosses no pathway and clears every other clearing ([a, b] or null).
function offPathTrail(clearings, edges, c, opts) {
  const others = clearings
    .filter((o) => o !== c && !o.cluster && !o.offPath)
    .sort((p, q) => Math.hypot(p.x - c.x, p.z - c.z) - Math.hypot(q.x - c.x, q.z - c.z) || p.id - q.id);
  for (const o of others) if (edgeFits(clearings, edges, c.id, o.id, opts)) return [c.id, o.id];
  return null;
}

// Pick the frontier clearing the checkpoint's pathway runs to: the
// nearest one to the gate point (due south of the outpost) whose line
// from the gate crosses no pathway and clears every other clearing.
function checkpointExit(cfg, clearings, frontierEdges, outpost, opts) {
  const o = clearings[outpost];
  const gate = { x: o.x, z: o.z + o.radius + cfg.cluster.checkpointExit, radius: 0 };
  const nodes = [...clearings, gate];
  const gateIndex = clearings.length;
  // Session 21: the spine's entry (the crashed plane) when there is one.
  const entry = clearings.find((c) => c.entry);
  const candidates = entry
    ? [entry]
    : clearings.filter((c) => !c.cluster && !c.offPath).sort((p, q) => Math.hypot(p.x - gate.x, p.z - gate.z) - Math.hypot(q.x - gate.x, q.z - gate.z) || p.id - q.id);
  for (const c of candidates) {
    if (edgeFits(nodes, frontierEdges, gateIndex, c.id, opts)) return { target: c.id, gate: { x: gate.x, z: gate.z } };
  }
  return null;
}

// Every north-band frontier clearing is a sensible walk from the outpost
// (the frontier's only way in): the pathways there are at most maxDetour
// times the straight-line distance.
function northIsReachable(clearings, edges, outpost, maxDetour) {
  const o = clearings[outpost];
  return clearings.every(
    (c) => c.band !== 'north' || c.cluster || graphDistance(clearings, edges, outpost, c.id) <= maxDetour * Math.hypot(c.x - o.x, c.z - o.z),
  );
}

// ---- 1. roster -----------------------------------------------------------

function copiesOf(appears, chances, rng) {
  if (typeof appears === 'object') return rng.int(appears.min, appears.max);
  return rng.chance(chances[appears] ?? 0) ? 1 : 0;
}

function weightedPick(items, rng, weightOf) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  let r = rng.next() * total;
  for (const item of items) {
    r -= weightOf(item);
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

export function buildRoster(cfg, data, rng) {
  // Each cluster spot keeps its place in the data's order (home first).
  const layout = Object.fromEntries(data.cluster.clearings.map((c, order) => [c.key, { ...c, order }]));
  // Session 21: the story spine's places, in the data's order.
  const spine = Object.fromEntries((data.spine?.places ?? []).map((c, order) => [c.key, { ...c, order }]));
  const encounters = [];
  const radioEvents = [];
  const entry = (e, spot, extra = {}) => ({
    key: e.id,
    kind: e.kind ?? 'encounter',
    name: e.name,
    band: e.band,
    placement: e.placement ?? null,
    cluster: e.placement === 'cluster' ? spot : null,
    spine: e.placement === 'spine' ? spot : null,
    radius: spot?.radius ?? e.radius ?? null,
    clearingType: spot && spot.clearingType !== undefined ? spot.clearingType : e.clearingType,
    hopsFromHome: e.hopsFromHome ?? null,
    builtIn: e.builtIn ?? null,
    required: e.appears === 'every',
    hiddenAs: e.hiddenAs ?? null,
    revealedBy: e.revealedBy ?? null,
    ...extra,
  });
  const pool = [];
  for (const e of data.encounters) {
    if (e.placement === 'optional') {
      pool.push(e);
      continue;
    }
    const copies = copiesOf(e.appears, cfg.appearChance, rng);
    if (e.clearing === false) {
      if (copies > 0) radioEvents.push({ key: e.id, name: e.name, count: copies });
      continue;
    }
    const spot = e.placement === 'cluster' ? layout[e.id] : e.placement === 'spine' ? spine[e.id] : null;
    if (e.placement === 'cluster' && !spot) throw new Error(`Encounter ${e.id} is placed in the cluster but openingCluster.json doesn't lay it out`);
    if (e.placement === 'spine' && !spot) throw new Error(`Encounter ${e.id} is on the story spine but storySpine.json doesn't place it`);
    for (let k = 0; k < copies; k++) encounters.push(entry(e, spot, spot?.offPath ? { offPath: true } : {}));
  }
  // Session 21: the optional encounters, dealt from the pool (each equally
  // likely, none guaranteed), in any band; the railway cutting on the line.
  const dealt = [];
  if (pool.length) {
    const o = cfg.optional ?? { min: pool.length, max: pool.length };
    const deck = [...pool];
    const count = Math.min(deck.length, rng.int(o.min, o.max));
    for (let k = 0; k < count; k++) {
      const e = deck.splice(rng.int(0, deck.length - 1), 1)[0];
      dealt.push(e.id);
      encounters.push(entry(e, null, { band: e.onRailway ? 'south' : weightedPick(BANDS, rng, (b) => cfg.wildBandWeights?.[b] ?? 1), onRailway: Boolean(e.onRailway), optional: true }));
    }
  }

  const g = cfg.sigilGrounds;
  // Each ground's band: perBand's counts (M6, Aaron), or weighted at random.
  const groundBands = g.perBand ? BANDS.flatMap((b) => Array(g.perBand[b] ?? 0).fill(b)) : null;
  // The cluster's own grounds come first and take a north place (Aaron, Oct 17).
  const groundPool = [...data.sigilGrounds];
  const grounds = [];
  for (const spot of Object.values(layout).filter((c) => c.kind === 'sigilGround')) {
    const at = groundPool.findIndex((p) => p.id === spot.key);
    if (at < 0) throw new Error(`openingCluster.json: no sigil ground ${spot.key}`);
    const ground = groundPool.splice(at, 1)[0];
    if (groundBands) groundBands.splice(groundBands.indexOf('north'), 1);
    grounds.push(groundEntry(ground, 'north', spot));
  }
  let groundCount = Math.min(groundBands ? groundBands.length : rng.int(g.min, g.max) - grounds.length, groundPool.length);
  // Drop optional encounters (last rolled first) if the roster is too big.
  while (encounters.length + grounds.length + groundCount > cfg.clearingCount) {
    const i = findLastIndex(encounters, (en) => !en.required);
    if (i >= 0) {
      const [gone] = encounters.splice(i, 1);
      const d = dealt.indexOf(gone.key);
      if (d >= 0) dealt.splice(d, 1);
    } else if (grounds.length + groundCount > g.min) groundCount--;
    else break;
  }
  for (let k = 0; k < groundCount; k++) {
    const ground = groundPool.splice(rng.int(0, groundPool.length - 1), 1)[0];
    grounds.push(groundEntry(ground, groundBands ? groundBands[k] : weightedPick(BANDS, rng, (b) => g.bandWeights[b]), null));
  }

  const entries = [...encounters, ...grounds];
  // Plain clearings fill the rest, each in the band furthest below its share
  // (config.map.wildBandWeights: the north frontier is small).
  const weights = cfg.wildBandWeights ?? { north: 1, middle: 1, south: 1 };
  const perBand = Object.fromEntries(BANDS.map((b) => [b, entries.filter((en) => en.band === b && !en.cluster).length]));
  while (entries.length < cfg.clearingCount) {
    const fill = (b) => perBand[b] / (weights[b] || 1e-6);
    const least = Math.min(...BANDS.map(fill));
    const options = BANDS.filter((b) => fill(b) === least);
    const band = options[rng.int(0, options.length - 1)];
    perBand[band]++;
    entries.push({ key: 'clearing', kind: 'wild', name: 'Clearing', band, placement: null, cluster: null, spine: null, radius: null, clearingType: undefined, hopsFromHome: null, builtIn: null, required: false, hiddenAs: null, revealedBy: null });
  }

  // Clearing type: fixed by the data, none (null) for home and the hut, else
  // random (types with weight 0, like the cluster's own, are never picked).
  for (const en of entries) {
    if (en.clearingType === undefined) en.clearingType = weightedPick(data.clearingTypes, rng, (t) => t.weight).id;
    if (en.radius === null) en.radius = en.kind === 'home' ? cfg.home.radius : rng.range(cfg.clearing.radiusMin, cfg.clearing.radiusMax);
  }
  return { entries, radioEvents, dealt };
}

function groundEntry(ground, band, spot) {
  return {
    key: ground.id,
    kind: 'sigilGround',
    name: ground.name,
    band,
    placement: spot ? 'cluster' : null,
    cluster: spot,
    spine: null,
    radius: spot?.radius ?? null,
    clearingType: spot?.clearingType,
    hopsFromHome: null,
    builtIn: 'M4',
    required: true,
    hiddenAs: null,
    revealedBy: null,
  };
}

function findLastIndex(list, test) {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
}

// ---- 2. placement --------------------------------------------------------

function placeClearings(cfg, entries, geo, rng) {
  // The cluster first (in its data order, home leading), then the spine (in
  // its order), then the biggest clearings (hardest to fit).
  const fixed = entries.filter((en) => en.cluster).sort((p, q) => p.cluster.order - q.cluster.order);
  const spine = entries.filter((en) => en.spine).sort((p, q) => p.spine.order - q.spine.order);
  const rest = entries
    .map((entry, i) => ({ entry, i }))
    .filter((p) => !p.entry.cluster && !p.entry.spine)
    .sort((p, q) => (p.entry.placement === 'hut' ? 0 : 1) - (q.entry.placement === 'hut' ? 0 : 1) || (q.entry.onRailway ? 1 : 0) - (p.entry.onRailway ? 1 : 0) || q.entry.radius - p.entry.radius || p.i - q.i)
    .map((p) => p.entry);

  const placed = [];
  for (const entry of [...fixed, ...spine, ...rest]) {
    const pos = placeOne(cfg, entry, placed, geo, rng);
    if (!pos) return null;
    const c = {
      id: placed.length,
      key: entry.key,
      kind: entry.kind,
      name: entry.name,
      band: entry.band,
      cluster: !!entry.cluster,
      clearingType: entry.clearingType,
      radius: entry.radius,
      hopRule: entry.hopsFromHome,
      builtIn: entry.builtIn,
      x: pos.x,
      z: pos.z,
      southness: southnessAt(geo, pos.z),
    };
    // Session 21: the fixed story spine, the optional encounters, the off-path stairs, names kept secret.
    if (entry.spine) {
      c.spine = true;
      c.beat = entry.spine.beat ?? null;
      if (entry.spine.entry) c.entry = true;
    }
    if (entry.offPath) c.offPath = true;
    if (entry.optional) c.optional = true;
    if (entry.onRailway) c.onRailway = true;
    if (entry.hiddenAs) {
      c.hiddenAs = entry.hiddenAs;
      c.revealedBy = entry.revealedBy;
    }
    placed.push(c);
  }
  return placed;
}

function placeOne(cfg, entry, placed, geo, rng) {
  const r = entry.radius;
  const c = cfg.clearing;
  if (entry.cluster || entry.spine) {
    const home = geo.cluster.home;
    const at = entry.cluster ?? entry.spine;
    return { x: home.x + at.dx, z: home.z + at.dz };
  }
  for (const gapFactor of [1, c.relaxedGapFactor]) {
    const gap = c.minGap * gapFactor;
    for (let t = 0; t < c.placementTries; t++) {
      const pos = entry.onRailway ? onRailwayCandidate(geo, rng, r) : candidate(cfg, entry, geo, rng);
      if (!fitsBounds(cfg, geo, pos, r)) continue;
      if (!entry.onRailway && !clearOfRailway(cfg, geo, pos, r)) continue;
      if (placed.every((p) => Math.hypot(p.x - pos.x, p.z - pos.z) >= p.radius + r + gap)) return pos;
    }
  }
  return null;
}

function candidate(cfg, entry, geo, rng) {
  const pad = cfg.bandPadding;
  const [lo, hi] = entry.placement === 'hut' ? [cfg.hut.southnessMin, 1] : cfg.bands[entry.band];
  // The frontier starts south of the cordon.
  const start = southnessAt(geo, geo.cluster.cordonZ + cfg.cluster.frontierGap + entry.radius);
  const s = rng.range(Math.max(lo + pad, start), Math.max(hi - pad, start));
  return { x: rng.range(geo.walk.xMin, geo.walk.xMax), z: zAtSouthness(geo, s) };
}

// Session 21: the railway cutting sits on the line, anywhere along it.
function onRailwayCandidate(geo, rng, r) {
  const x = rng.range(geo.walk.xMin + r, geo.walk.xMax - r);
  return { x, z: railZAt(geo.railway, x) };
}

// Session 21: clearings keep off the 1903 line (it isn't a place, it's a
// landmark between them).
function clearOfRailway(cfg, geo, pos, r) {
  if (!geo.railway) return true;
  return railDistance(geo.railway, pos.x, pos.z).distance >= r + cfg.railway.clearance;
}

function fitsBounds(cfg, geo, pos, r) {
  const w = geo.walk;
  if (pos.x - r < w.xMin || pos.x + r > w.xMax || pos.z + r > w.zMax) return false;
  if (pos.z - r < geo.cluster.cordonZ + cfg.cluster.frontierGap) return false;
  return pos.z - r >= cliffZ(geo, pos.x) + cfg.cliff.clearingPadding;
}

// Frontier encounters that want to be a certain number of pathways from
// home swap places with a frontier clearing of the same band that is.
// Soft rule: if none fits, keep it and note a warning.
function applyHopRules(clearings, hops, cfg) {
  const warnings = [];
  const movable = (c) => !c.cluster && !c.spine && !c.offPath && !c.onRailway && (c.kind === 'encounter' || c.kind === 'wild' || c.kind === 'sigilGround');
  for (const c of clearings) {
    const rule = c.hopRule;
    if (!rule || c.cluster || c.spine) continue;
    const ok = (i) => hops[i] >= rule[0] && hops[i] <= rule[1];
    if (ok(c.id)) continue;
    const swap = clearings.find(
      (o) => o !== c && movable(o) && !o.hopRule && o.band === c.band && ok(o.id) && swapFits(clearings, c, o, cfg.clearing.minGap * cfg.clearing.relaxedGapFactor),
    );
    if (!swap) {
      warnings.push(`${c.key}: no clearing ${rule[0]}-${rule[1]} pathways from home`);
      continue;
    }
    swapContents(c, swap);
  }
  return warnings;
}

const CONTENT = ['key', 'kind', 'name', 'clearingType', 'radius', 'hopRule', 'builtIn'];

function swapContents(a, b) {
  for (const k of CONTENT) [a[k], b[k]] = [b[k], a[k]];
}

// Would a and b still keep their gaps with their radii swapped?
function swapFits(clearings, a, b, gap) {
  const check = (pos, r, skip) =>
    clearings.every((o) => o === a || o === b || o === skip || Math.hypot(o.x - pos.x, o.z - pos.z) >= o.radius + r + gap);
  return check(a, b.radius) && check(b, a.radius);
}

// ---- 3. pathways ---------------------------------------------------------

// Points along a pathway from a's centre to b's, wandering sideways a
// little (more on longer pathways) but always meeting both ends.
function pathPoints(a, b, p, rng) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const nx = -dz / length; // sideways unit vector
  const nz = dx / length;
  const amp = Math.min(p.wiggleMax, p.wiggle * length);
  const c1 = rng.range(-1, 1);
  const c2 = rng.range(-0.4, 0.4);
  const phase1 = rng.range(0, Math.PI * 2);
  const phase2 = rng.range(0, Math.PI * 2);
  const count = Math.max(2, Math.ceil(length / p.sampleSpacing) + 1);
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const envelope = Math.sin(Math.PI * t);
    const off = amp * envelope * (c1 * Math.sin(Math.PI * t + phase1) + c2 * Math.sin(3 * Math.PI * t + phase2));
    points.push({ x: a.x + dx * t + nx * off, z: a.z + dz * t + nz * off });
  }
  return points;
}

// The checkpoint's pathway: straight south from the outpost's centre
// through the cordon to the gate point, then wandering on to the frontier.
function exitPoints(outpost, gate, target, p, rng) {
  const straight = pathPoints(outpost, gate, { ...p, wiggle: 0 }, rng);
  return [...straight, ...pathPoints(gate, target, p, rng).slice(1)];
}

// A pathway that follows the road: from a's centre onto the road, along
// it, and off to b's centre.
function roadPoints(a, b, road) {
  const i = nearestRoadIndex(road, a.x, a.z);
  const j = nearestRoadIndex(road, b.x, b.z);
  const step = i <= j ? 1 : -1;
  const pts = [{ x: a.x, z: a.z }];
  for (let k = i; k !== j + step; k += step) pts.push({ ...road.points[k] });
  pts.push({ x: b.x, z: b.z });
  return pts;
}

// Session 21: a pathway that follows the main road to the fork, then the
// road north: from a's centre onto the main road, along it to the fork,
// up the road north, and off to b's centre.
function branchPoints(a, b, main, north) {
  const i = nearestRoadIndex(main, a.x, a.z);
  const fork = north.points[0];
  const j = nearestRoadIndex(main, fork.x, fork.z);
  const step = i <= j ? 1 : -1;
  const pts = [{ x: a.x, z: a.z }];
  for (let k = i; k !== j + step; k += step) pts.push({ ...main.points[k] });
  const end = nearestRoadIndex(north, b.x, b.z);
  for (let k = 1; k <= end; k++) pts.push({ ...north.points[k] });
  pts.push({ x: b.x, z: b.z });
  return pts;
}
