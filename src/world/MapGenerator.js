// Seeded map generation (pure): which clearings exist this run, where
// they go, and the pathways between them (DESIGN.md "Map"). The same seed
// always gives the same map.
//
// 1. Roster: home, the hut, the encounters that appear this run (from
//    data/encounters.json), 4-6 sigil grounds, then plain clearings up to
//    config.map.clearingCount. Each gets a band and a clearing type.
// 2. Placement: home against the cliff, the campsite next to it, the hut
//    deep in the south, the rest at random in their bands with a minimum
//    gap between clearings.
// 3. Pathways: a minimum spanning tree plus extra edges for loops, each
//    drawn as a gently wandering line.
// If a rule can't be met (e.g. the hut too few pathways from home), the
// whole attempt is retried from a forked seed.

import { makeGeometry, cliffZ, southnessAt, zAtSouthness } from './mapGeometry.js';
import { minimumSpanningTree, addLoops, hopCounts, isConnected, graphDistance } from './mapGraph.js';

const DEG_TO_RAD = Math.PI / 180;
const BANDS = ['north', 'middle', 'south'];

// data: { encounters, sigilGrounds, clearingTypes } (the JSON files' arrays).
export function generateMap(mapCfg, data, rng, seed = rng.seed) {
  const geo = makeGeometry(mapCfg, seed);
  for (let attempt = 0; attempt < mapCfg.maxAttempts; attempt++) {
    const map = tryGenerate(mapCfg, data, rng.fork(`attempt${attempt}`), geo);
    if (map) {
      map.seed = seed;
      map.attempts = attempt + 1;
      return map;
    }
  }
  throw new Error(`Map generation failed after ${mapCfg.maxAttempts} attempts (seed ${seed})`);
}

function tryGenerate(cfg, data, rng, geo) {
  const roster = buildRoster(cfg, data, rng.fork('roster'));
  const clearings = placeClearings(cfg, roster.entries, geo, rng.fork('place'));
  if (!clearings) return null;

  const edges = minimumSpanningTree(clearings);
  const e = cfg.edges;
  addLoops(clearings, edges, rng.fork('loops'), {
    count: Math.round(edges.length * e.extraFraction),
    maxLength: e.extraMaxLength,
    keepChance: e.extraKeepChance,
    detourRatio: e.detourRatio,
    minAngle: e.minAngleDegrees * DEG_TO_RAD,
    clearance: e.clearance,
  });
  if (!isConnected(clearings.length, edges)) return null;

  const home = clearings.findIndex((c) => c.kind === 'home');
  const hut = clearings.findIndex((c) => c.kind === 'hut');
  let hops = hopCounts(clearings.length, edges, home);
  if (hops[hut] < cfg.hut.minHops) return null;
  if (!northIsReachable(clearings, edges, home, cfg.edges.maxNorthDetour)) return null;
  const warnings = applyHopRules(clearings, hops, cfg);
  hops = hopCounts(clearings.length, edges, home);
  clearings.forEach((c, i) => (c.hopsFromHome = hops[i]));

  const pathRng = rng.fork('paths');
  const paths = edges.map(([a, b]) => ({ a, b, points: pathPoints(clearings[a], clearings[b], cfg.paths, pathRng) }));
  return {
    geometry: geo,
    clearings,
    edges: edges.map(([a, b]) => ({ a, b, length: Math.hypot(clearings[a].x - clearings[b].x, clearings[a].z - clearings[b].z) })),
    paths,
    homeIndex: home,
    hutIndex: hut,
    radioEvents: roster.radioEvents,
    warnings,
  };
}

// Every north-band clearing is a sensible walk from home: the pathways
// there are at most maxDetour times the straight-line distance.
function northIsReachable(clearings, edges, home, maxDetour) {
  const h = clearings[home];
  return clearings.every(
    (c) => c.band !== 'north' || c.id === home || graphDistance(clearings, edges, home, c.id) <= maxDetour * Math.hypot(c.x - h.x, c.z - h.z),
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
  const encounters = [];
  const radioEvents = [];
  for (const e of data.encounters) {
    const copies = copiesOf(e.appears, cfg.appearChance, rng);
    if (e.clearing === false) {
      if (copies > 0) radioEvents.push({ key: e.id, name: e.name, count: copies });
      continue;
    }
    for (let k = 0; k < copies; k++) {
      encounters.push({
        key: e.id,
        kind: e.kind ?? 'encounter',
        name: e.name,
        band: e.band,
        placement: e.placement ?? null,
        radius: e.radius ?? null,
        clearingType: e.clearingType,
        hopsFromHome: e.hopsFromHome ?? null,
        builtIn: e.builtIn ?? null,
        required: e.appears === 'every',
      });
    }
  }

  const g = cfg.sigilGrounds;
  let groundCount = Math.min(rng.int(g.min, g.max), data.sigilGrounds.length);
  // Drop optional encounters (last rolled first) if the roster is too big.
  while (encounters.length + groundCount > cfg.clearingCount) {
    const i = findLastIndex(encounters, (en) => !en.required);
    if (i >= 0) encounters.splice(i, 1);
    else if (groundCount > g.min) groundCount--;
    else break;
  }
  const pool = [...data.sigilGrounds];
  const grounds = [];
  for (let k = 0; k < groundCount; k++) {
    const ground = pool.splice(rng.int(0, pool.length - 1), 1)[0];
    grounds.push({
      key: ground.id,
      kind: 'sigilGround',
      name: ground.name,
      band: weightedPick(BANDS, rng, (b) => g.bandWeights[b]),
      placement: null,
      radius: null,
      clearingType: undefined,
      hopsFromHome: null,
      builtIn: 'M4',
      required: true,
    });
  }

  const entries = [...encounters, ...grounds];
  // Plain clearings fill the rest, each in the band with the fewest so far.
  const perBand = Object.fromEntries(BANDS.map((b) => [b, entries.filter((en) => en.band === b).length]));
  while (entries.length < cfg.clearingCount) {
    const least = Math.min(...BANDS.map((b) => perBand[b]));
    const options = BANDS.filter((b) => perBand[b] === least);
    const band = options[rng.int(0, options.length - 1)];
    perBand[band]++;
    entries.push({ key: 'clearing', kind: 'wild', name: 'Clearing', band, placement: null, radius: null, clearingType: undefined, hopsFromHome: null, builtIn: null, required: false });
  }

  // Clearing type: fixed by the data, none (null) for home and the hut, else random.
  for (const en of entries) {
    if (en.clearingType === undefined) en.clearingType = weightedPick(data.clearingTypes, rng, (t) => t.weight).id;
    if (en.radius === null) en.radius = en.kind === 'home' ? cfg.home.radius : rng.range(cfg.clearing.radiusMin, cfg.clearing.radiusMax);
  }
  return { entries, radioEvents };
}

function findLastIndex(list, test) {
  for (let i = list.length - 1; i >= 0; i--) if (test(list[i])) return i;
  return -1;
}

// ---- 2. placement --------------------------------------------------------

const PLACEMENT_ORDER = { home: 0, nextToHome: 1, hut: 2 };

function placeClearings(cfg, entries, geo, rng) {
  // Fixed places first, then the biggest clearings (hardest to fit).
  const order = entries
    .map((entry, i) => ({ entry, i }))
    .sort((p, q) => (PLACEMENT_ORDER[p.entry.placement] ?? 3) - (PLACEMENT_ORDER[q.entry.placement] ?? 3) || q.entry.radius - p.entry.radius || p.i - q.i);

  const placed = [];
  for (const { entry } of order) {
    const pos = placeOne(cfg, entry, placed, geo, rng);
    if (!pos) return null;
    placed.push({
      id: placed.length,
      key: entry.key,
      kind: entry.kind,
      name: entry.name,
      band: entry.band,
      clearingType: entry.clearingType,
      radius: entry.radius,
      hopRule: entry.hopsFromHome,
      builtIn: entry.builtIn,
      x: pos.x,
      z: pos.z,
      southness: southnessAt(geo, pos.z),
    });
  }
  return placed;
}

function placeOne(cfg, entry, placed, geo, rng) {
  const r = entry.radius;
  const c = cfg.clearing;
  if (entry.placement === 'home') {
    const half = ((geo.walk.xMax - geo.walk.xMin) / 2) * cfg.home.xSpread;
    const x = rng.range(-half, half);
    return { x, z: cliffZ(geo, x) + cfg.home.offsetFromCliff };
  }
  for (const gapFactor of [1, c.relaxedGapFactor]) {
    const gap = c.minGap * gapFactor;
    for (let t = 0; t < c.placementTries; t++) {
      const pos = candidate(cfg, entry, placed, geo, rng);
      if (!fitsBounds(cfg, geo, pos, r)) continue;
      const ignoreHome = entry.placement === 'nextToHome';
      if (placed.every((p) => (ignoreHome && p.kind === 'home') || Math.hypot(p.x - pos.x, p.z - pos.z) >= p.radius + r + gap)) {
        return pos;
      }
    }
  }
  return null;
}

function candidate(cfg, entry, placed, geo, rng) {
  if (entry.placement === 'nextToHome') {
    const home = placed.find((p) => p.kind === 'home');
    const half = (cfg.campsite.arcDegrees / 2) * DEG_TO_RAD;
    const angle = rng.range(-half, half); // 0 = due south (+z)
    const dist = rng.range(cfg.campsite.distanceMin, cfg.campsite.distanceMax);
    return { x: home.x + Math.sin(angle) * dist, z: home.z + Math.cos(angle) * dist };
  }
  const pad = cfg.bandPadding;
  const [lo, hi] = entry.placement === 'hut' ? [cfg.hut.southnessMin, 1] : cfg.bands[entry.band];
  const s = rng.range(lo + pad, hi - pad);
  return { x: rng.range(geo.walk.xMin, geo.walk.xMax), z: zAtSouthness(geo, s) };
}

function fitsBounds(cfg, geo, pos, r) {
  const w = geo.walk;
  if (pos.x - r < w.xMin || pos.x + r > w.xMax || pos.z + r > w.zMax) return false;
  return pos.z - r >= cliffZ(geo, pos.x) + cfg.cliff.clearingPadding;
}

// Encounters that want to be a certain number of pathways from home
// (e.g. the outpost, 2-3) swap places with a clearing of the same band
// that is. Soft rule: if none fits, keep it and note a warning.
function applyHopRules(clearings, hops, cfg) {
  const warnings = [];
  const movable = (c) => c.kind === 'encounter' || c.kind === 'wild' || c.kind === 'sigilGround';
  for (const c of clearings) {
    const rule = c.hopRule;
    if (!rule) continue;
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
