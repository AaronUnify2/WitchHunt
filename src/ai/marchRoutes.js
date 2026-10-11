// Marching on the station (pure; M6). A marching zombie takes the
// shortest way home along the pathway graph: it walks to the nearest
// point on any pathway, follows that pathway the way that's shorter to
// home, and at each clearing takes the pathway that leads home soonest.
// Once it reaches the home clearing it heads for its centre (the
// station's siege takes over well before that).
//
// Route state lives on the walker: { marchLink, marchIndex, marchDone,
// goalX, goalZ, hasGoal }. A link is { to, points, reverse, length }.

export class MarchRoutes {
  // map: { clearings, paths: [{ a, b, points }] }. home: the home clearing's index.
  constructor(map, home) {
    this.clearings = map.clearings;
    this.home = home;
    this.paths = map.paths.map((p) => {
      // Metres along the pathway to each point, from point 0 (clearing a).
      const along = [0];
      for (let i = 1; i < p.points.length; i++) along.push(along[i - 1] + Math.hypot(p.points[i].x - p.points[i - 1].x, p.points[i].z - p.points[i - 1].z));
      return { a: p.a, b: p.b, points: p.points, along, length: along[along.length - 1] };
    });
    this.links = map.clearings.map(() => []);
    for (const p of this.paths) {
      this.links[p.a].push({ to: p.b, points: p.points, reverse: false, length: p.length });
      this.links[p.b].push({ to: p.a, points: p.points, reverse: true, length: p.length });
    }
    this.distance = this.homeDistances();
    // The pathway each clearing takes toward home (null at home, or cut off).
    this.toward = this.links.map((links, i) => {
      if (i === home) return null;
      let best = null;
      let bestCost = Infinity;
      for (const l of links) {
        const cost = l.length + this.distance[l.to];
        if (cost < bestCost) {
          bestCost = cost;
          best = l;
        }
      }
      return best;
    });
  }

  // Shortest pathway distance from every clearing to home (Dijkstra).
  homeDistances() {
    const n = this.clearings.length;
    const dist = new Array(n).fill(Infinity);
    const done = new Array(n).fill(false);
    dist[this.home] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true;
      for (const l of this.links[u]) if (dist[u] + l.length < dist[l.to]) dist[l.to] = dist[u] + l.length;
    }
    return dist;
  }

  // Point i along a link, in the direction of travel.
  point(link, i) {
    const pts = link.points;
    return link.reverse ? pts[pts.length - 1 - i] : pts[i];
  }

  // The nearest pathway point to (x, z): { path, index, distance }.
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

  // Start marching from wherever the walker is.
  start(w) {
    w.marchDone = false;
    const near = this.nearestPoint(w.x, w.z);
    if (!near) {
      this.finish(w);
      return;
    }
    const { path, index } = near;
    const viaA = path.along[index] + this.distance[path.a];
    const viaB = path.length - path.along[index] + this.distance[path.b];
    if (viaB <= viaA) {
      w.marchLink = { to: path.b, points: path.points, reverse: false, length: path.length };
      w.marchIndex = index;
    } else {
      w.marchLink = { to: path.a, points: path.points, reverse: true, length: path.length };
      w.marchIndex = path.points.length - 1 - index;
    }
    this.setGoal(w, this.point(w.marchLink, w.marchIndex));
  }

  // Head for the home clearing's centre.
  finish(w) {
    w.marchDone = true;
    w.marchLink = null;
    this.setGoal(w, this.clearings[this.home]);
  }

  setGoal(w, p) {
    w.goalX = p.x;
    w.goalZ = p.z;
    w.hasGoal = true;
  }

  // Call every step while marching. Moves the goal on when the walker is
  // within `reach` of it. Returns true if the goal changed.
  step(w, reach) {
    if (w.marchDone) return false;
    if (!w.marchLink) {
      this.start(w);
      return true;
    }
    if (Math.hypot(w.goalX - w.x, w.goalZ - w.z) > reach) return false;
    const link = w.marchLink;
    if (w.marchIndex < link.points.length - 1) {
      w.marchIndex++;
      this.setGoal(w, this.point(link, w.marchIndex));
      return true;
    }
    // At a clearing: home, or the next pathway toward it.
    const next = link.to === this.home ? null : this.toward[link.to];
    if (!next) {
      this.finish(w);
      return true;
    }
    w.marchLink = next;
    w.marchIndex = 1; // point 0 is the clearing it's leaving
    this.setGoal(w, this.point(next, 1));
    return true;
  }

  // Metres left to walk home from (x, z) along the pathways (via the
  // nearest pathway point). For the forecast and tests.
  remaining(x, z) {
    const near = this.nearestPoint(x, z);
    if (!near) return Math.hypot(this.clearings[this.home].x - x, this.clearings[this.home].z - z);
    const { path, index, distance } = near;
    return distance + Math.min(path.along[index] + this.distance[path.a], path.length - path.along[index] + this.distance[path.b]);
  }
}
