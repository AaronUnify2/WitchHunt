// The fog funnel (Round 2, step 6; Aaron: "after Junie's taken, Tom goes straight to the church, then the
// stairs. Everything else is blocked by an impassable fog, as if the Caller is steering him. The world opens
// up once Junie is home").
//
// From junieTaken to junieHome, south of the cordon, Tom can only go where the route goes: the checkpoint's
// pathway to the crashed plane, the pathways on from it to the old church, and (once the 1903 account has
// told him of the stairs: stairsKnown) on to the stairs, with every clearing on the way. Off the route the
// fog thickens until he can't see his hands (the sky's fog closes in, the ground mist comes up), and at its
// edge it stops him: he's put back a step, on foot or riding, the Caller calls from further along the way,
// and a line says there's no way through. North of the cordon nothing's changed (home, the shovel, Earl's).
//
// Not saved: it's worked out from the story's flags. Not underground, not in the place beyond the stairs.

// ---- the pure parts (tested) ----------------------------------------------------------------

function lengthOf(points) {
  let n = 0;
  for (let i = 1; i < points.length; i++) n += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return n;
}

// The shortest way along the map's pathways from clearing `from` to `to` (indices), over the paths `usable`
// allows: the paths' indices in order, or null if there's none.
export function shortestWay(map, from, to, usable = () => true) {
  const n = map.clearings.length;
  const dist = new Array(n).fill(Infinity);
  const via = new Array(n).fill(-1);
  const done = new Array(n).fill(false);
  dist[from] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = true;
    map.paths.forEach((p, k) => {
      if ((p.a !== u && p.b !== u) || !usable(p)) return;
      const v = p.a === u ? p.b : p.a;
      const d = dist[u] + lengthOf(p.points);
      if (d < dist[v]) {
        dist[v] = d;
        via[v] = k;
      }
    });
  }
  if (dist[to] === Infinity) return null;
  const out = [];
  for (let at = to; at !== from; ) {
    const k = via[at];
    out.unshift(k);
    at = map.paths[k].a === at ? map.paths[k].b : map.paths[k].a;
  }
  return out;
}

// The funnel's route: { lines: [[{ x, z }]] (the pathways' points), discs: [{ x, z, r }] (the clearings on
// the way, padded), ends: [{ x, z }] (each leg's far end, for the Caller to call from) }. legs: [{ from, to,
// needs }] (clearing keys; needs: a flag that opens the leg). has(flag). South of the cordon only: the
// cluster's own pathways aren't walked, but for the checkpoint's (the way in).
export function funnelRoute(map, legs, has, pad) {
  const index = (key) => map.clearings.findIndex((c) => c.key === key);
  const south = (p) => !p.cluster || p.checkpoint;
  const paths = new Set();
  const stops = new Set();
  const ends = [];
  for (const leg of legs) {
    if (leg.needs && !has(leg.needs)) continue;
    const a = index(leg.from);
    const b = index(leg.to);
    if (a < 0 || b < 0) continue;
    const way = shortestWay(map, a, b, south);
    if (!way) continue;
    for (const k of way) {
      paths.add(k);
      stops.add(map.paths[k].a);
      stops.add(map.paths[k].b);
    }
    ends.push({ x: map.clearings[b].x, z: map.clearings[b].z });
  }
  return {
    lines: [...paths].map((k) => map.paths[k].points),
    discs: [...stops].map((i) => ({ x: map.clearings[i].x, z: map.clearings[i].z, r: map.clearings[i].radius + pad })),
    ends,
  };
}

// How far outside the route a point is (negative: that far inside), and the nearest point of the route's
// middle to it: { d, x, z }. half: the pathways' half-width.
export function outsideBy(route, x, z, half) {
  let best = { d: Infinity, x, z };
  for (const c of route.discs) {
    const d = Math.hypot(x - c.x, z - c.z) - c.r;
    if (d < best.d) best = { d, x: c.x, z: c.z, r: c.r };
  }
  for (const pts of route.lines) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((x - a.x) * vx + (z - a.z) * vz) / (vx * vx + vz * vz || 1)));
      const nx = a.x + vx * t;
      const nz = a.z + vz * t;
      const d = Math.hypot(x - nx, z - nz) - half;
      if (d < best.d) best = { d, x: nx, z: nz, r: half };
    }
  }
  return best;
}

// How thick the fog is `d` metres outside the route (0: clear; 1: the wall): it starts `fogStart` metres
// inside the edge.
export function fogAmount(d, fogStart) {
  return Math.max(0, Math.min(1, 1 + d / fogStart));
}

// Is the funnel on? From `from` to `until` (flags).
export function funnelOn(has, from, until) {
  return has(from) && !has(until);
}

export class FogFunnel {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.fc = cfg.fogFunnel;
    this.bus = bus;
  }

  // ctx: { map, player, progress, sky, atmosphere, caller, interiors, notify(text), demo }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
  }

  reset() {
    this.route = null;
    this.routeKey = '';
    this.amount = 0; // 0..1, eased: what the sky and the mist show
    this.outside = -Infinity;
    this.told = 0; // seconds until the line can show again
    this.called = 0; // and until the Caller calls again
    this.checkT = 0;
    this.active = false;
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  // The route for the flags now (rebuilt when a leg opens).
  refresh() {
    const f = this.fc;
    this.active = Boolean(f?.enabled) && !this.demo?.active && funnelOn((x) => this.has(x), f.from, f.until);
    if (!this.active) return;
    const key = f.legs.map((l) => (l.needs && !this.has(l.needs) ? '0' : '1')).join('');
    if (key === this.routeKey && this.route) return;
    this.routeKey = key;
    this.route = funnelRoute(this.map, f.legs, (x) => this.has(x), f.clearingPad);
  }

  update(dt) {
    const f = this.fc;
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 1;
      this.refresh();
    }
    this.told = Math.max(0, this.told - dt);
    this.called = Math.max(0, this.called - dt);
    let want = 0;
    const p = this.player.position;
    const south = p.z > this.map.cluster.cordonZ + f.northMargin;
    if (this.active && this.route?.lines.length && south && !this.interiors?.inside && !this.player.platform) {
      const o = outsideBy(this.route, p.x, p.z, f.half);
      this.outside = o.d;
      want = fogAmount(o.d, f.fogStart);
      // At the edge: put back a step (not someone set down far outside it: a debug teleport, an old save).
      if (o.d > 0 && o.d < f.deep) this.pushBack(o);
    } else this.outside = -Infinity;
    const k = Math.min(1, dt * f.ease);
    this.amount += (want - this.amount) * k;
    if (this.amount < 0.002 && want === 0) this.amount = 0;
    this.sky?.setWall?.(this.amount * this.amount, f.wall);
    if (this.atmosphere) this.atmosphere.wallMist = this.amount * f.mist;
  }

  // Back inside the edge, on foot or riding; a line, and the Caller from further along the way.
  pushBack(o) {
    const f = this.fc;
    const p = this.player.position;
    const dx = p.x - o.x;
    const dz = p.z - o.z;
    const l = Math.hypot(dx, dz) || 1;
    const back = o.d + f.push;
    const mx = (-dx / l) * back;
    const mz = (-dz / l) * back;
    const v = this.player.riding;
    if (v && typeof v.x === 'number' && typeof v.z === 'number') {
      v.x += mx;
      v.z += mz;
      if (typeof v.speed === 'number') v.speed = 0;
    }
    p.x += mx;
    p.z += mz;
    if (this.told <= 0) {
      this.told = f.tellEvery;
      this.notify?.(f.text);
      this.bus?.emit('funnel:wall', { x: p.x, z: p.z });
    }
    if (this.called <= 0 && this.caller?.callFrom) {
      // From the way on: the nearest of the route's far ends that's further off than the edge he hit.
      const end = [...this.route.ends].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).find((e) => Math.hypot(e.x - p.x, e.z - p.z) > f.callAhead) ?? this.route.ends[0];
      if (end) {
        const ex = end.x - p.x;
        const ez = end.z - p.z;
        const el = Math.hypot(ex, ez) || 1;
        if (this.caller.callFrom({ x: p.x + (ex / el) * f.callAhead, z: p.z + (ez / el) * f.callAhead })) this.called = f.callEvery;
      }
    }
  }

  overlayLine() {
    return `funnel ${this.active ? 'on' : 'off'} outside ${Number.isFinite(this.outside) ? this.outside.toFixed(1) : '-'} fog ${this.amount.toFixed(2)} lines ${this.route?.lines.length ?? 0}`;
  }
}
