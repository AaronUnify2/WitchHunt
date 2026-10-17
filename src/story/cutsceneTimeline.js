// The cutscene timeline (pure; M8; DESIGN.md "Cutscenes"): one data
// format for every cutscene (src/data/cutscenes.json), rendered live from
// the game world.
//
// Positions are relative to an anchor, because the map is seeded: an
// anchor is a point with a facing ({ x, y, z, yaw }; y the ground), and
// [x, y, z] in its frame is x to its right, y up from the ground, z ahead
// of it (ahead is (-sin yaw, -cos yaw), like the player's view).
//
// Camera keys: { at, anchor, pos: [x,y,z], look: [x,y,z], fov, shake,
// cut } or, for an establishing sweep, { at, anchor, orbit: { radius,
// height, angle (degrees round the anchor, 0 = ahead of it), lookY },
// fov, shake, cut }. The camera eases from one key to the next unless the
// next is a cut (or uses a different anchor, or the other kind).
//
// Tracks: { at, do, ... } events, fired once each as the time passes them.

const DEG = Math.PI / 180;

// [x, y, z] in the anchor's frame -> { x, y, z } in the world.
export function localToWorld(anchor, p) {
  const [x, y, z] = p;
  const s = Math.sin(anchor.yaw);
  const c = Math.cos(anchor.yaw);
  return { x: anchor.x + x * c - z * s, y: anchor.y + y, z: anchor.z - x * s - z * c };
}

// An orbit key's position and look, in its anchor's frame.
export function orbitLocal(o) {
  const a = (o.angle ?? 0) * DEG;
  const r = o.radius;
  return { pos: [-Math.sin(a) * r, o.height, Math.cos(a) * r], look: [0, o.lookY ?? 1, 0] };
}

// The keys either side of t, and how far between them (eased 0..1).
export function keysAt(keys, t) {
  if (!keys || keys.length === 0) return null;
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].at <= t) i++;
  const a = keys[i];
  const b = keys[i + 1];
  if (!b || t <= a.at || !blends(a, b)) return { a, b: a, k: 0 };
  const k = Math.min(1, (t - a.at) / Math.max(1e-6, b.at - a.at));
  return { a, b, k: a.linear ? k : k * k * (3 - 2 * k) };
}

function blends(a, b) {
  return !b.cut && (a.anchor ?? null) === (b.anchor ?? null) && Boolean(a.orbit) === Boolean(b.orbit);
}

const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// The camera at time t, in its anchor's frame: { anchor, pos, look, fov,
// shake }, or null if there are no keys.
export function cameraAt(keys, t, defaults = { fov: 60, shake: 0 }) {
  const f = keysAt(keys, t);
  if (!f) return null;
  const { a, b, k } = f;
  let pos;
  let look;
  if (a.orbit) {
    const o = {};
    for (const n of ['radius', 'height', 'angle', 'lookY']) o[n] = lerp(a.orbit[n] ?? (n === 'lookY' ? 1 : 0), b.orbit[n] ?? (n === 'lookY' ? 1 : 0), k);
    ({ pos, look } = orbitLocal(o));
  } else {
    pos = lerp3(a.pos ?? [0, 1.7, 0], b.pos ?? a.pos ?? [0, 1.7, 0], k);
    look = lerp3(a.look ?? [0, 1.5, -10], b.look ?? a.look ?? [0, 1.5, -10], k);
  }
  return {
    anchor: a.anchor ?? null,
    pos,
    look,
    fov: lerp(a.fov ?? defaults.fov, b.fov ?? a.fov ?? defaults.fov, k),
    shake: lerp(a.shake ?? defaults.shake, b.shake ?? a.shake ?? defaults.shake, k),
  };
}

// Track events with from < at <= to (from < 0 at the start, so at 0 fires).
export function eventsDue(tracks, from, to) {
  return (tracks ?? []).filter((e) => e.at > from && e.at <= to);
}

// How long a cutscene runs: its duration, or its last key or event.
export function cutsceneLength(cs) {
  if (cs.duration) return cs.duration;
  let end = 0;
  for (const k of cs.camera ?? []) end = Math.max(end, k.at);
  for (const e of cs.tracks ?? []) end = Math.max(end, e.at + (e.seconds ?? 0));
  return end;
}

const STYLES = ['cctv', 'firstPerson', 'sweep', 'black'];
const EVENTS = ['line', 'text', 'move', 'pose', 'show', 'hide', 'flare', 'glitch', 'fade', 'emit', 'lookAt', 'shake', 'osd', 'sfx'];

// Checks the cutscenes file: unique ids, known styles, looks and events,
// lines that exist, actors that exist. Returns a list of problems.
export function validateCutscenes(list, { looks, lineIds }) {
  const problems = [];
  const ids = new Set();
  for (const cs of list) {
    const id = cs.id ?? '?';
    if (!cs.id) problems.push('a cutscene has no id');
    else if (ids.has(cs.id)) problems.push(`duplicate cutscene ${cs.id}`);
    ids.add(cs.id);
    if (!cs.name) problems.push(`${id}: no name`);
    if (!STYLES.includes(cs.style)) problems.push(`${id}: unknown style ${cs.style}`);
    if (cs.look && !looks[cs.look]) problems.push(`${id}: unknown look ${cs.look}`);
    if (cs.style !== 'firstPerson' && cs.style !== 'black' && !(cs.camera ?? []).length) problems.push(`${id}: no camera keys`);
    const actors = new Set((cs.actors ?? []).map((a) => a.id));
    for (const e of cs.tracks ?? []) {
      if (!EVENTS.includes(e.do)) problems.push(`${id}: unknown event ${e.do}`);
      if (e.do === 'line' && !lineIds.has(e.line)) problems.push(`${id}: no dialogue line ${e.line}`);
      if (['move', 'pose', 'show', 'hide', 'flare'].includes(e.do) && !actors.has(e.actor)) problems.push(`${id}: no actor ${e.actor}`);
    }
    for (let i = 1; i < (cs.camera ?? []).length; i++) if (cs.camera[i].at < cs.camera[i - 1].at) problems.push(`${id}: camera keys out of order`);
  }
  return problems;
}
