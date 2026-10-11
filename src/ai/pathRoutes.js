// Random walks along the pathway graph (pure; DESIGN.md "Enemy
// targeting": "else random walk along the pathway graph"). A wandering
// zombie heads for the nearest clearing, then follows a pathway's points
// to a neighbouring clearing, picks another pathway there (not straight
// back the way it came, if it has a choice), and so on.
//
// Route state lives on the walker: { routeNode, routeFrom, route,
// routeIndex, goalX, goalZ, hasGoal }.

export class PathRoutes {
  // map: { clearings, paths: [{ a, b, points }] }.
  constructor(map) {
    this.clearings = map.clearings;
    this.links = map.clearings.map(() => []);
    for (const p of map.paths) {
      this.links[p.a].push({ to: p.b, points: p.points, reverse: false });
      this.links[p.b].push({ to: p.a, points: p.points, reverse: true });
    }
  }

  nearestNode(x, z) {
    let best = 0;
    let bestD = Infinity;
    this.clearings.forEach((c, i) => {
      const d = Math.hypot(c.x - x, c.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  // Start wandering from wherever the walker is: walk to the nearest
  // clearing first (straight through the woods if need be).
  start(w) {
    const n = this.nearestNode(w.x, w.z);
    const c = this.clearings[n];
    w.routeNode = n;
    w.routeFrom = -1;
    w.route = null;
    w.routeIndex = 0;
    this.setGoal(w, c.x, c.z);
  }

  setGoal(w, x, z) {
    w.goalX = x;
    w.goalZ = z;
    w.hasGoal = true;
  }

  // Point i along a link's pathway, in the direction of travel.
  point(link, i) {
    const pts = link.points;
    return link.reverse ? pts[pts.length - 1 - i] : pts[i];
  }

  // At clearing routeNode: take a pathway to a neighbour.
  pickNext(w, rng) {
    const links = this.links[w.routeNode];
    if (links.length === 0) {
      w.hasGoal = false;
      return;
    }
    const choices = links.length > 1 ? links.filter((l) => l.to !== w.routeFrom) : links;
    const link = rng.pick(choices);
    w.routeFrom = w.routeNode;
    w.routeNode = link.to;
    w.route = link;
    w.routeIndex = 1; // point 0 is the clearing it's leaving
    const p = this.point(link, 1);
    this.setGoal(w, p.x, p.z);
  }

  // Call every frame while wandering. Moves the goal on when the walker
  // is within `reach` of it. Returns true if the goal changed.
  step(w, rng, reach) {
    if (!w.hasGoal || !(w.routeNode >= 0)) {
      this.start(w);
      return true;
    }
    if (Math.hypot(w.goalX - w.x, w.goalZ - w.z) > reach) return false;
    if (w.route) {
      const last = w.route.points.length - 1;
      if (w.routeIndex < last) {
        w.routeIndex++;
        const p = this.point(w.route, w.routeIndex);
        this.setGoal(w, p.x, p.z);
        return true;
      }
    }
    this.pickNext(w, rng); // arrived at a clearing
    return true;
  }
}
