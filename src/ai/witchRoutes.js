// Routes between any two points along the pathway graph (pure; M7, the
// witch). She travels the pathways (DESIGN.md "The witch": "travels the
// pathway graph toward a planting spot"): from wherever she is she joins
// the nearest pathway, follows the shortest way through the clearings,
// leaves by the pathway nearest her goal and walks the last stretch
// straight to it (an off-path sigil is a few metres into the forest).
//
// A route is a list of waypoints [{ x, z }] ending at the goal. Walkers
// keep { route, routeIndex } and move toward route[routeIndex].

export class GraphRoutes {
  // map: { clearings, paths: [{ a, b, points }] }. avoid: clearing
  // indexes only passed through if there's no other way (each costs
  // avoidPenalty metres): she keeps clear of the ranger station.
  constructor(map, avoid = [], avoidPenalty = 5000) {
    this.clearings = map.clearings;
    this.paths = map.paths.map((p) => {
      const along = [0];
      for (let i = 1; i < p.points.length; i++) along.push(along[i - 1] + Math.hypot(p.points[i].x - p.points[i - 1].x, p.points[i].z - p.points[i - 1].z));
      return { a: p.a, b: p.b, points: p.points, along, length: along[along.length - 1] };
    });
    const n = this.clearings.length;
    // Shortest distances between every pair of clearings (Floyd-Warshall:
    // 22 clearings, so this is instant) and the next pathway to take.
    this.dist = [];
    this.next = []; // next[i][j]: the path to take from i toward j (or null)
    for (let i = 0; i < n; i++) {
      this.dist.push(new Array(n).fill(Infinity));
      this.next.push(new Array(n).fill(null));
      this.dist[i][i] = 0;
    }
    for (const p of this.paths) {
      if (p.length < this.dist[p.a][p.b]) {
        this.dist[p.a][p.b] = this.dist[p.b][p.a] = p.length;
        this.next[p.a][p.b] = p;
        this.next[p.b][p.a] = p;
      }
    }
    const avoided = new Set(avoid);
    this.avoided = avoided;
    this.avoidPenalty = avoidPenalty;
    for (let k = 0; k < n; k++) {
      const through = avoided.has(k) ? avoidPenalty : 0;
      for (let i = 0; i < n; i++) {
        if (this.dist[i][k] === Infinity) continue;
        for (let j = 0; j < n; j++) {
          const d = this.dist[i][k] + through + this.dist[k][j];
          if (d < this.dist[i][j]) {
            this.dist[i][j] = d;
            this.next[i][j] = this.next[i][k];
          }
        }
      }
    }
  }

  // The nearest pathway point to (x, z): { path, index, distance }, or null.
  nearestPoint(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const p of this.paths) {
      for (let i = 0; i < p.points.length; i++) {
        const d = Math.hypot(p.points[i].x - x, p.points[i].z - z);
        if (d < bestD) {
          bestD = d;
          best = { path: p, index: i, distance: d };
        }
      }
    }
    return best;
  }

  // Waypoints from (x, z) to (tx, tz) along the pathways. Ends at the goal.
  route(x, z, tx, tz) {
    const s = this.nearestPoint(x, z);
    const t = this.nearestPoint(tx, tz);
    const out = [];
    if (!s || !t) {
      out.push({ x: tx, z: tz });
      return out;
    }
    const direct = Math.hypot(tx - x, tz - z);
    let bestCost = s.distance + t.distance + (s.path === t.path ? Math.abs(s.path.along[s.index] - t.path.along[t.index]) : Infinity);
    let best = s.path === t.path ? { same: true } : null;
    for (const ea of ['a', 'b']) {
      for (const eb of ['a', 'b']) {
        const na = s.path[ea];
        const nb = t.path[eb];
        // Leaving or arriving by an avoided clearing costs its penalty too.
        const through = (this.avoided.has(na) ? this.avoidPenalty : 0) + (nb !== na && this.avoided.has(nb) ? this.avoidPenalty : 0);
        const cost = s.distance + toEnd(s.path, s.index, ea) + this.dist[na][nb] + toEnd(t.path, t.index, eb) + t.distance + through;
        if (cost < bestCost) {
          bestCost = cost;
          best = { ea, eb };
        }
      }
    }
    // Nearer than the pathways themselves: straight there.
    if (!best || direct <= s.distance + t.distance) {
      out.push({ x: tx, z: tz });
      return out;
    }
    if (best.same) {
      walkPath(out, s.path, s.index, t.index);
    } else {
      // Along the first pathway to its end...
      walkPath(out, s.path, s.index, best.ea === 'a' ? 0 : s.path.points.length - 1);
      // ...clearing to clearing...
      let node = s.path[best.ea];
      const goal = t.path[best.eb];
      for (let guard = 0; node !== goal && guard < this.clearings.length; guard++) {
        const p = this.next[node][goal];
        if (!p) break;
        const forward = p.a === node;
        walkPath(out, p, forward ? 1 : p.points.length - 2, forward ? p.points.length - 1 : 0);
        node = forward ? p.b : p.a;
      }
      // ...and along the last one to the point nearest the goal.
      const last = t.path.points.length - 1;
      if (best.eb === 'a' && t.index >= 1) walkPath(out, t.path, 1, t.index);
      else if (best.eb === 'b' && t.index <= last - 1) walkPath(out, t.path, last - 1, t.index);
    }
    out.push({ x: tx, z: tz });
    return dedupe(out);
  }
}

// Metres along `path` from point `index` to its end 'a' (point 0) or 'b'.
function toEnd(path, index, end) {
  return end === 'a' ? path.along[index] : path.length - path.along[index];
}

// Append path points from index i to j (either direction), inclusive.
function walkPath(out, path, i, j) {
  const step = j >= i ? 1 : -1;
  for (let k = i; step > 0 ? k <= j : k >= j; k += step) out.push(path.points[k]);
}

// Drop waypoints that repeat the one before (within 1 cm).
function dedupe(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.01) out.push({ x: p.x, z: p.z });
  }
  return out;
}

// Metres along a route from (x, z) through route[index..].
export function routeLength(x, z, route, index = 0) {
  let total = 0;
  let px = x;
  let pz = z;
  for (let i = index; i < route.length; i++) {
    total += Math.hypot(route[i].x - px, route[i].z - pz);
    px = route[i].x;
    pz = route[i].z;
  }
  return total;
}

// Move walker w ({ x, z, route, routeIndex }) `metres` along its route
// (no collision: the abstract tier). Returns true once at the end.
export function advanceAlong(w, metres) {
  let left = metres;
  while (w.routeIndex < w.route.length) {
    const p = w.route[w.routeIndex];
    const dx = p.x - w.x;
    const dz = p.z - w.z;
    const d = Math.hypot(dx, dz);
    if (d > 1e-6) w.facing = Math.atan2(dx, dz);
    if (d > left) {
      w.x += (dx / d) * left;
      w.z += (dz / d) * left;
      return false;
    }
    w.x = p.x;
    w.z = p.z;
    left -= d;
    w.routeIndex++;
  }
  return true;
}
