// Graph maths for the map (pure): spanning tree, loops, hop counts and
// the 2D geometry they need. Nodes are { x, z } (clearing centres);
// edges are [a, b] index pairs.

// Distance from point (px, pz) to the segment a-b.
export function pointSegmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq > 0 ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

// True if segments p1-p2 and p3-p4 properly cross (touching ends don't count).
export function segmentsCross(p1, p2, p3, p4) {
  const d1 = cross(p3, p4, p1);
  const d2 = cross(p3, p4, p2);
  const d3 = cross(p1, p2, p3);
  const d4 = cross(p1, p2, p4);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

function cross(a, b, c) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Every pair of nodes, shortest first: [{ a, b, length }].
export function allPairs(nodes) {
  const pairs = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) pairs.push({ a, b, length: distance(nodes[a], nodes[b]) });
  }
  // Ties broken by index so the order never depends on the sort's stability.
  return pairs.sort((p, q) => p.length - q.length || p.a - q.a || p.b - q.b);
}

// Minimum spanning tree (Kruskal over every pair). A Euclidean minimum
// spanning tree never crosses itself. Returns [[a, b], ...].
export function minimumSpanningTree(nodes) {
  const parent = nodes.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const edges = [];
  for (const { a, b } of allPairs(nodes)) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) continue;
    parent[ra] = rb;
    edges.push([a, b]);
    if (edges.length === nodes.length - 1) break;
  }
  return edges;
}

// The angle (radians) at node `at` between the directions to `p` and `q`.
function angleAt(nodes, at, p, q) {
  const ax = nodes[p].x - nodes[at].x;
  const az = nodes[p].z - nodes[at].z;
  const bx = nodes[q].x - nodes[at].x;
  const bz = nodes[q].z - nodes[at].z;
  const cos = (ax * bx + az * bz) / (Math.hypot(ax, az) * Math.hypot(bx, bz));
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

// Could edge [a, b] be added without crossing an existing edge, leaving a
// clearing at too sharp an angle beside another pathway, or passing
// through a clearing it doesn't join? nodes carry `radius`.
export function edgeFits(nodes, edges, a, b, opts) {
  const pa = nodes[a];
  const pb = nodes[b];
  for (const [c, d] of edges) {
    if ((c === a && d === b) || (c === b && d === a)) return false;
    const shared = c === a || c === b || d === a || d === b;
    if (!shared && segmentsCross(pa, pb, nodes[c], nodes[d])) return false;
    if (shared) {
      const at = c === a || c === b ? c : d;
      const other = at === c ? d : c;
      const mine = at === a ? b : a;
      if (angleAt(nodes, at, mine, other) < opts.minAngle) return false;
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    if (i === a || i === b) continue;
    const n = nodes[i];
    if (pointSegmentDistance(n.x, n.z, pa.x, pa.z, pb.x, pb.z) < n.radius + opts.clearance) return false;
  }
  return true;
}

// Add extra edges for loops, like trails worn as shortcuts: candidates
// shortest first, each taken (with keepChance, for variety) if it fits and
// walking the existing pathways between its ends is at least detourRatio
// times longer than the shortcut. Stops at `count`. Mutates and returns `edges`.
export function addLoops(nodes, edges, rng, opts) {
  let added = 0;
  for (const { a, b, length } of allPairs(nodes)) {
    if (added >= opts.count) break;
    if (length > opts.maxLength) break;
    if (!rng.chance(opts.keepChance)) continue;
    if (graphDistance(nodes, edges, a, b) < length * opts.detourRatio) continue;
    if (!edgeFits(nodes, edges, a, b, opts)) continue;
    edges.push([a, b]);
    added++;
  }
  return edges;
}

// Shortest walking distance from a to b along the edges (Dijkstra; the
// graph is small). Infinity if unreachable.
export function graphDistance(nodes, edges, a, b) {
  const adj = adjacency(nodes.length, edges);
  const dist = new Array(nodes.length).fill(Infinity);
  const done = new Array(nodes.length).fill(false);
  dist[a] = 0;
  for (;;) {
    let n = -1;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < Infinity && (n < 0 || dist[i] < dist[n])) n = i;
    if (n < 0 || n === b) return dist[b];
    done[n] = true;
    for (const m of adj[n]) {
      const d = dist[n] + Math.hypot(nodes[n].x - nodes[m].x, nodes[n].z - nodes[m].z);
      if (d < dist[m]) dist[m] = d;
    }
  }
}

// Neighbour lists from an edge list.
export function adjacency(count, edges) {
  const adj = Array.from({ length: count }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

// Fewest edges from `start` to every node (Infinity if unreachable).
export function hopCounts(count, edges, start) {
  const adj = adjacency(count, edges);
  const hops = new Array(count).fill(Infinity);
  hops[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const n = queue[head];
    for (const m of adj[n]) {
      if (hops[m] !== Infinity) continue;
      hops[m] = hops[n] + 1;
      queue.push(m);
    }
  }
  return hops;
}

export function isConnected(count, edges) {
  return hopCounts(count, edges, 0).every((h) => h !== Infinity);
}
