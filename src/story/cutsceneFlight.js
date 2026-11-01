// Things in the sky for cutscenes (Session 17, M9.4: the dogfight seen
// through the hunting rifle's scope from the outpost's watchtower; DESIGN.md
// "Overrun military outpost", beat 6).
//  - flightAt(): where a flying actor is along its path at a time, and which
//    way it's heading (pure: a Catmull-Rom curve through timed keys, so a
//    path can end exactly on a place on the map: the crash sites).
//  - buildSkyActor(): the patrol plane and the craft (unlit, fog-free, so
//    they read as silhouettes by day and by their lights at night, hundreds
//    of metres out through the scope).
//  - SkyFx: tracers and rays between two actors, smoke trails behind them,
//    blasts. Made per cutscene, disposed with it.

import * as THREE from 'three';

// keys: [{ at, v: { x, y, z } }] in time order. Returns { pos, dir } at time t
// (clamped to the path's ends); dir is a unit vector (the way it's going).
export function flightAt(keys, t, out = { pos: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 1 } }) {
  const n = keys.length;
  if (n === 0) return out;
  if (n === 1 || t <= keys[0].at) {
    Object.assign(out.pos, keys[0].v);
    if (n > 1) setDir(out.dir, keys[0].v, keys[1].v);
    return out;
  }
  if (t >= keys[n - 1].at) {
    Object.assign(out.pos, keys[n - 1].v);
    setDir(out.dir, keys[n - 2].v, keys[n - 1].v);
    return out;
  }
  let i = 0;
  while (i + 1 < n - 1 && keys[i + 1].at <= t) i++;
  const k = (t - keys[i].at) / Math.max(1e-6, keys[i + 1].at - keys[i].at);
  const p0 = keys[Math.max(0, i - 1)].v;
  const p1 = keys[i].v;
  const p2 = keys[i + 1].v;
  const p3 = keys[Math.min(n - 1, i + 2)].v;
  for (const c of ['x', 'y', 'z']) out.pos[c] = catmull(p0[c], p1[c], p2[c], p3[c], k);
  const d = {};
  for (const c of ['x', 'y', 'z']) d[c] = catmullSlope(p0[c], p1[c], p2[c], p3[c], k);
  const len = Math.hypot(d.x, d.y, d.z);
  if (len > 1e-6) {
    out.dir.x = d.x / len;
    out.dir.y = d.y / len;
    out.dir.z = d.z / len;
  }
  return out;
}

function setDir(dir, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  dir.x = dx / len;
  dir.y = dy / len;
  dir.z = dz / len;
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function catmullSlope(p0, p1, p2, p3, t) {
  const t2 = t * t;
  return 0.5 * (-p0 + p2 + 2 * (2 * p0 - 5 * p1 + 4 * p2 - p3) * t + 3 * (-p0 + 3 * p1 - 3 * p2 + p3) * t2);
}

// ---- the models ----------------------------------------------------------------------------------------

function basic(color, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, fog: false, ...extra });
}

function glow(color, r) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), basic(color));
}

// A military patrol plane (about 14 m across): fuselage, wings with two
// engines, tailplane and fin; red, green and white navigation lights.
// Faces +z.
function buildPlane() {
  const g = new THREE.Group();
  const body = basic(0x2c3034);
  const dark = basic(0x1c1e20);
  const add = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  add(new THREE.CylinderGeometry(0.75, 0.55, 11, 10).rotateX(Math.PI / 2), body, 0, 0, 0);
  add(new THREE.SphereGeometry(0.75, 10, 8).scale(1, 0.9, 1.6), body, 0, 0, 5.4);
  add(new THREE.BoxGeometry(14, 0.22, 2.1), body, 0, 0.2, 0.8);
  add(new THREE.BoxGeometry(5, 0.18, 1.3), body, 0, 0.3, -5);
  add(new THREE.BoxGeometry(0.18, 2.2, 1.7), body, 0, 1.3, -5);
  for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 8).rotateX(Math.PI / 2), dark, s * 3.2, 0.05, 1.6);
  add(new THREE.BoxGeometry(1.0, 0.5, 1.2), basic(0x101820), 0, 0.45, 4.5); // the canopy
  for (const [c, r, x, y, z] of [[0xff2a1a, 0.35, -7, 0.2, 0.8], [0x2aff5a, 0.35, 7, 0.2, 0.8], [0xfff2d0, 0.3, 0, 2.5, -5.6]]) {
    const l = glow(c, r);
    l.position.set(x, y, z);
    g.add(l);
  }
  return g;
}

// The craft (about 16 m across): a dark disc, a dome, a rim of lights
// (purple and green), a soft glow under it. Faces +z (it doesn't care).
function buildUfo() {
  const g = new THREE.Group();
  const hull = basic(0x2a2a32);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(8, 6.5, 1.4, 28), hull);
  g.add(disc);
  const top = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1), basic(0x34343e));
  top.position.y = 0.6;
  g.add(top);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const l = glow(i % 2 ? 0xa080ff : 0x80ffb8, 0.45);
    l.position.set(Math.sin(a) * 7.7, 0, Math.cos(a) * 7.7);
    g.add(l);
  }
  const under = new THREE.Mesh(new THREE.CircleGeometry(5, 24).rotateX(Math.PI / 2), basic(0x90ffc0, { transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  under.position.y = -0.75;
  g.add(under);
  return g;
}

// A sky actor's mesh by kind ('plane' | 'ufo'), or null.
export function buildSkyActor(spec) {
  const m = spec.kind === 'plane' ? buildPlane() : spec.kind === 'ufo' ? buildUfo() : null;
  if (m && spec.size) m.scale.setScalar(spec.size);
  return m;
}

// ---- the effects -----------------------------------------------------------------------------------

let puffTex = null;
function puffTexture() {
  if (puffTex) return puffTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  puffTex = new THREE.CanvasTexture(c);
  puffTex.colorSpace = THREE.SRGBColorSpace;
  return puffTex;
}

const TRACER_SPEED = 420; // metres a second
const PUFF_EVERY = 0.09;
const PUFF_LIFE = 2.6;

export class SkyFx {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'skyFx';
    scene.add(this.group);
    this.beams = [];
    this.tracers = [];
    this.puffs = [];
    this.blasts = [];
    this.tracerGeo = new THREE.BoxGeometry(0.35, 0.35, 9);
    this.rayGeo = new THREE.CylinderGeometry(0.6, 0.6, 1, 8, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2);
    this.blastGeo = new THREE.SphereGeometry(1, 14, 10);
  }

  // A burst of fire from one actor at another: kind 'tracer' (the plane's
  // guns: streaks flying) or 'ray' (the craft's: a beam, flickering). miss:
  // [x, y, z] metres off the target (a miss).
  beam(from, to, { kind = 'tracer', seconds = 1, color = 0xffd27a, miss = null } = {}) {
    const b = { from, to, kind, seconds, t: 0, color, miss, spawn: 0, mesh: null };
    if (kind === 'ray') {
      b.mesh = new THREE.Mesh(this.rayGeo, basic(color, { transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      this.group.add(b.mesh);
    }
    this.beams.push(b);
  }

  // A flash at a point: a sphere swelling and fading, smoke puffs after it.
  // over: it lights the sky over whatever's in front (a crash beyond the treeline).
  blast(at, { size = 8, color = 0xffb050, over = false } = {}) {
    const m = new THREE.Mesh(this.blastGeo, basic(color, { transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: !over }));
    if (over) m.renderOrder = 10;
    m.position.set(at.x, at.y, at.z);
    m.scale.setScalar(0.1);
    this.group.add(m);
    this.blasts.push({ mesh: m, t: 0, size });
    for (let i = 0; i < 6; i++) this.puff({ x: at.x + (Math.random() - 0.5) * size * 0.5, y: at.y + (Math.random() - 0.5) * size * 0.3, z: at.z + (Math.random() - 0.5) * size * 0.5 }, 0x1e1c1a, size * 0.9, 4);
  }

  puff(at, color, size, life = PUFF_LIFE) {
    const mat = new THREE.SpriteMaterial({ map: puffTexture(), color, transparent: true, opacity: 0.8, depthWrite: false, fog: false });
    const s = new THREE.Sprite(mat);
    s.position.set(at.x, at.y, at.z);
    s.scale.setScalar(size * 0.4);
    this.group.add(s);
    this.puffs.push({ sprite: s, t: 0, life, size });
  }

  // actors: the cutscene's (id -> { mesh, trail }); dt seconds.
  update(dt, actors) {
    // Smoke trails behind actors that have one.
    for (const a of actors.values()) {
      if (!a.trail || !a.mesh.visible) continue;
      a.trail.timer = (a.trail.timer ?? 0) - dt;
      if (a.trail.timer > 0) continue;
      a.trail.timer = PUFF_EVERY;
      this.puff(a.mesh.position, a.trail.color ?? 0x2a2826, a.trail.size ?? 5);
    }
    for (const p of this.puffs) {
      p.t += dt;
      const k = p.t / p.life;
      p.sprite.position.y += dt * 1.5;
      p.sprite.scale.setScalar(p.size * (0.4 + k * 1.3));
      p.sprite.material.opacity = 0.75 * (1 - k);
    }
    this.puffs = this.puffs.filter((p) => {
      if (p.t < p.life) return true;
      p.sprite.removeFromParent();
      p.sprite.material.dispose();
      return false;
    });
    for (const b of this.blasts) {
      b.t += dt;
      const k = Math.min(1, b.t / 0.7);
      b.mesh.scale.setScalar(b.size * (0.2 + k));
      b.mesh.material.opacity = 0.85 * (1 - k) * (1 - k);
    }
    this.blasts = this.blasts.filter((b) => {
      if (b.t < 0.7) return true;
      b.mesh.removeFromParent();
      b.mesh.material.dispose();
      return false;
    });
    for (const b of this.beams) this.updateBeam(b, dt, actors);
    this.beams = this.beams.filter((b) => {
      if (b.t < b.seconds) return true;
      if (b.mesh) {
        b.mesh.removeFromParent();
        b.mesh.material.dispose();
      }
      return false;
    });
    for (const tr of this.tracers) {
      tr.t += dt;
      tr.mesh.position.addScaledVector(tr.v, dt);
    }
    this.tracers = this.tracers.filter((tr) => {
      if (tr.t < tr.life) return true;
      tr.mesh.removeFromParent();
      tr.mesh.material.dispose();
      return false;
    });
  }

  target(b, actors) {
    const from = actors.get(b.from)?.mesh.position;
    const to = actors.get(b.to)?.mesh.position;
    if (!from || !to) return null;
    const end = to.clone();
    if (b.miss) end.add(new THREE.Vector3(...b.miss));
    return { from, end };
  }

  updateBeam(b, dt, actors) {
    b.t += dt;
    const ends = this.target(b, actors);
    if (!ends) return;
    if (b.kind === 'ray') {
      const { from, end } = ends;
      const len = from.distanceTo(end);
      b.mesh.position.copy(from);
      b.mesh.lookAt(end);
      b.mesh.scale.set(1, 1, len);
      b.mesh.material.opacity = 0.55 + 0.4 * Math.random();
      return;
    }
    // Tracers: a round every so often, flying from the gun toward the target.
    b.spawn -= dt;
    while (b.spawn <= 0) {
      b.spawn += 0.06;
      const { from, end } = ends;
      const v = end.clone().sub(from);
      const dist = v.length();
      v.normalize();
      // A little scatter.
      v.x += (Math.random() - 0.5) * 0.02;
      v.y += (Math.random() - 0.5) * 0.02;
      v.normalize().multiplyScalar(TRACER_SPEED);
      const m = new THREE.Mesh(this.tracerGeo, basic(b.color, { transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(from);
      m.lookAt(end);
      this.group.add(m);
      this.tracers.push({ mesh: m, v, t: 0, life: Math.min(2, (dist + 40) / TRACER_SPEED) });
    }
  }

  dispose() {
    for (const o of [...this.tracers.map((t) => t.mesh), ...this.blasts.map((b) => b.mesh), ...this.beams.map((b) => b.mesh).filter(Boolean)]) o.material.dispose();
    for (const p of this.puffs) p.sprite.material.dispose();
    this.tracerGeo.dispose();
    this.rayGeo.dispose();
    this.blastGeo.dispose();
    this.group.removeFromParent();
  }
}
