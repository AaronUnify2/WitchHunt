// The Pile's look (Nov 25; ai/Pile.js). Aaron, after his first fight: "a great novel boss ... The green sphere is
// not giving me the right vibe ... something more resident evil style"; then "keep the green veins, eyes as weak
// spots ... dark and suggestive ... lean into the tendril element a bit more".
//  - The bodies: the game's own zombie sprites (a second ZombieRenderer on the game's atlas), heaped in a swirling
//    mound and turning, in the frames that look worst. The ones in the air and being dragged back in, the same.
//  - The core: a lumpy mass of meat deep in the heap, beating, dark red to purple, her green glowing in its veins.
//  - Its eyes (the weak spots): after a blast they push out of the wounds, yellow-green irises, and look at Tom.
//  - Its tendrils: sinew, dark and wet with a faint green in it, curving and writhing, a hooked bone at each tip.
//    Some always out, waving; some planted in the ground ahead as it hauls itself along; and the working ones
//    (reaching for the fallen, the lash, the grab). One draw call for every segment, one for every tip.
//  - The army charge on its surface, blinking; the tells' rings on the ground.

import * as THREE from 'three';
import { ZombieRenderer } from './ZombieRenderer.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

const LIMP = [ZOMBIE_FRAMES.stagger, ZOMBIE_FRAMES.dying[0], ZOMBIE_FRAMES.dying[1], ZOMBIE_FRAMES.dying[2], ZOMBIE_FRAMES.attackStrike, ZOMBIE_FRAMES.strikeLunge, ZOMBIE_FRAMES.strikeRear];
const GOLDEN = 2.399963; // radians: spreads the bodies evenly round the mound
const SEGMENTS = 9; // per tendril
const MAX_TENDRILS = 16;

// A cheap smooth noise on the sphere (sums of sines), for the meat's lumps and its veins.
function lump(x, y, z, s) {
  return Math.sin(x * 3.1 + s) * Math.sin(y * 2.7 + s * 1.3) * Math.sin(z * 3.4 + s * 0.7) + 0.5 * Math.sin(x * 6.3 + y * 5.1 + s) * Math.sin(z * 5.7 - s);
}

export class PileRenderer {
  // ctx: { scene, zombieCfg (config.zombies), share (the game's ZombieRenderer), ground, camera () => { x, z } }.
  constructor(pile, ctx) {
    this.pile = pile;
    this.ctx = ctx;
    const look = pile.cfg.look;
    const cap = pile.cfg.bodies + pile.cfg.lastGroup + 24;
    this.sprites = new ZombieRenderer(ctx.zombieCfg);
    this.sprites.init(ctx.scene, cap, ctx.share);
    this.fakes = Array.from({ length: cap }, (_, i) => ({ active: false, kind: 'zombie', tier: 'active', x: 0, y: 0, z: 0, sink: 0, frame: 0, facing: 0, flash: 0, lit: 0, variant: i % 4 === 0 ? 'army' : 'citizen', lookSeed: 1000 + i * 7 }));
    this.group = new THREE.Group();
    this.group.visible = false;
    ctx.scene.add(this.group);
    this.buildCore(look);
    this.light = new THREE.PointLight(look.coreLight, look.coreIntensity, look.coreReach, 1.6);
    this.group.add(this.light);
    // The charge: a boxy army pack, a red light on it.
    this.charge = new THREE.Group();
    this.charge.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.26), new THREE.MeshLambertMaterial({ color: look.charge })));
    this.chargeLamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: look.chargeLight }));
    this.chargeLamp.position.set(0, 0.2, 0.1);
    this.charge.add(this.chargeLamp);
    this.group.add(this.charge);
    this.buildEyes(look);
    this.buildTendrils(look);
    // Its tells: a ring on the ground growing out to the slam's reach; a ring where the lash will land.
    const ringMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.slamRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), ringMat(look.warn));
    this.lashRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 28).rotateX(-Math.PI / 2), ringMat(look.warn));
    this.slamRing.visible = this.lashRing.visible = false;
    this.group.add(this.slamRing, this.lashRing);
    this.m4 = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.s = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.pts = Array.from({ length: SEGMENTS + 1 }, () => new THREE.Vector3());
  }

  // ---- building ---------------------------------------------------------------------------------------------

  // The meat: an icosphere pushed into lumps, coloured dark red to purple, with a glow attribute along its veins
  // (where a second noise crosses zero) that the shader adds as her green.
  buildCore(look) {
    const geo = new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position;
    const n = pos.count;
    this.coreBase = new Float32Array(pos.array);
    this.coreLump = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const glow = new Float32Array(n);
    const flesh = look.flesh.map((h) => new THREE.Color(h));
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      this.coreLump[i] = lump(x, y, z, 1.7) * 0.22 + lump(x * 2, y * 2, z * 2, 4.1) * 0.08;
      const k = Math.min(0.999, Math.max(0, 0.5 + lump(x, y, z, 7.3) * 0.6));
      const f = k * (flesh.length - 1);
      c.copy(flesh[Math.floor(f)]).lerp(flesh[Math.min(flesh.length - 1, Math.floor(f) + 1)], f % 1);
      c.toArray(col, i * 3);
      const vein = Math.abs(lump(x * 1.6, y * 1.6, z * 1.6, 2.9));
      glow[i] = Math.max(0, 1 - vein / 0.09);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.veinUniforms = { uVein: { value: new THREE.Color(look.vein) }, uVeinGlow: { value: look.veinGlow } };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.veinUniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGlow;\nuniform vec3 uVein;\nuniform float uVeinGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uVein * vGlow * uVeinGlow;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uVein * 0.4, vGlow * 0.35);');
    };
    mat.customProgramCacheKey = () => 'pile-flesh-veins';
    this.core = new THREE.Mesh(geo, mat);
    this.core.castShadow = true;
    this.group.add(this.core);
  }

  // An eye: a yellowed ball, a lidded opening, a yellow-green iris and a black slit, all turned to look at Tom.
  buildEyes(look) {
    const ball = new THREE.SphereGeometry(1, 14, 10);
    // Unlit: the core's light right beside them washed them out to white discs.
    const ballMat = new THREE.MeshBasicMaterial({ color: look.eye });
    const irisMat = new THREE.MeshBasicMaterial({ color: look.iris });
    const pupilMat = new THREE.MeshBasicMaterial({ color: look.pupil });
    const lidMat = new THREE.MeshBasicMaterial({ color: look.flesh[1] });
    const iris = new THREE.CircleGeometry(0.55, 18);
    const pupil = new THREE.PlaneGeometry(0.14, 0.62);
    const lid = new THREE.SphereGeometry(1.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.eyes = [0, 1, 2].map(() => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(ball, ballMat));
      const i = new THREE.Mesh(iris, irisMat);
      i.position.z = 1.01; // just in front of the ball, facing out
      const p = new THREE.Mesh(pupil, pupilMat);
      p.position.z = 1.02;
      const top = new THREE.Mesh(lid, lidMat);
      const bottom = new THREE.Mesh(lid, lidMat);
      bottom.rotation.x = Math.PI;
      g.add(i, p, top, bottom);
      g.userData = { top, bottom, open: 0 };
      g.visible = false;
      this.group.add(g);
      return g;
    });
  }

  // The tendrils: one instanced mesh of tapered sinew segments, one of bone hooks.
  buildTendrils(look) {
    const seg = new THREE.CylinderGeometry(0.85, 1, 1, 7, 1).translate(0, 0.5, 0);
    const mat = new THREE.MeshLambertMaterial({ color: look.sinew, emissive: new THREE.Color(look.sinewGlow) });
    this.segs = new THREE.InstancedMesh(seg, mat, MAX_TENDRILS * SEGMENTS);
    this.segs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.segs.frustumCulled = false;
    this.segs.castShadow = true;
    this.segs.count = 0;
    const hook = new THREE.ConeGeometry(0.07, 0.34, 6).translate(0, 0.17, 0);
    this.hooks = new THREE.InstancedMesh(hook, new THREE.MeshLambertMaterial({ color: look.bone }), MAX_TENDRILS);
    this.hooks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.hooks.frustumCulled = false;
    this.hooks.count = 0;
    this.group.add(this.segs, this.hooks);
  }

  heightAt(x, z) {
    return this.ctx.ground?.heightAt?.(x, z) ?? 0;
  }

  // ---- each frame -------------------------------------------------------------------------------------------

  update(dt) {
    const p = this.pile;
    const live = p.phase === 'emerge' || p.phase === 'fight';
    this.nSprites = 0;
    this.segs.count = 0;
    this.hooks.count = 0;
    // Its death: the meat swells, bursts and sags away to nothing (dark and suggestive: Aaron).
    const dying = p.phase === 'dead' && p.deadT < p.cfg.fx.deathSeconds;
    this.group.visible = live || dying;
    if (dying) {
      const k = p.deadT / p.cfg.fx.deathSeconds;
      const g = this.heightAt(p.x, p.z);
      const r = p.deathRadius ?? 1.5;
      this.placeCore(p.x, g + r * 0.6 * (1 - k), p.z, r * 0.6 * (1 + 0.5 * Math.sin(Math.min(1, k * 2) * Math.PI)) * (1 - k * 0.9), p.t, 1 - k);
      this.light.intensity = p.cfg.look.coreIntensity * 2 * (1 - k);
      for (const m of [this.charge, this.slamRing, this.lashRing, ...this.eyes]) m.visible = false;
    }
    if (live) this.drawLive(dt);
    // Bodies in the air (also after it's dead: the last group coming down).
    p.flying.forEach((f, i) => this.put(f.x, f.y, f.z, 300 + i, LIMP[(i + Math.floor(f.t * 8)) % LIMP.length], f.t * 9 + i));
    for (let i = this.nSprites; i < this.fakes.length; i++) this.fakes[i].active = false;
    this.segs.instanceMatrix.needsUpdate = true;
    this.hooks.instanceMatrix.needsUpdate = true;
    const cam = this.ctx.camera?.() ?? { x: p.x ?? 0, z: p.z ?? 0 };
    this.sprites.update(this.fakes, cam, Infinity);
  }

  put(x, y, z, i, frame, facing) {
    if (this.nSprites >= this.fakes.length) return;
    const f = this.fakes[this.nSprites++];
    f.active = true;
    f.x = x;
    f.y = y;
    f.z = z;
    f.frame = frame;
    f.facing = facing;
    f.flash = this.pile.flash > 0 ? this.pile.flash : 0;
    f.lookSeed = 1000 + i * 7;
    f.variant = i % 4 === 0 ? 'army' : 'citizen';
  }

  drawLive(dt) {
    const p = this.pile;
    const look = p.cfg.look;
    const r = p.radius;
    const g = this.heightAt(p.x, p.z);
    // Coming up out of the ground.
    const rise = p.phase === 'emerge' ? Math.min(1, p.t / p.cfg.emergeSeconds) : 1;
    const sunk = (1 - rise) * r * 2.2;
    // Its tells. The attack winding up, 0..1.
    const a = p.attack;
    const wind = a && a.state === 'windup' ? Math.min(1, a.t / p.cfg.attacks[a.kind].windup) : 0;
    const pp = p.player.position;
    const toTom = Math.atan2(pp.x - p.x, pp.z - p.z);
    // The lunge: it draws back away from him, low; the slam: it heaves up.
    let ox = 0;
    let oz = 0;
    let lift = 0;
    if (a?.kind === 'lunge' && a.state === 'windup') {
      ox = -Math.sin(toTom) * wind * 0.9;
      oz = -Math.cos(toTom) * wind * 0.9;
      lift = -wind * 0.35;
    } else if (a?.kind === 'slam' && a.state === 'windup') lift = wind * wind * r * 0.45;
    const slam = a?.kind === 'slam' && a.state === 'windup';
    this.slamRing.visible = slam;
    if (slam) {
      const reach = (r + p.cfg.attacks.slam.reach) * (0.25 + 0.75 * wind);
      this.slamRing.position.set(p.x, g + 0.22, p.z); // (over the road's surface)
      this.slamRing.scale.setScalar(reach);
      this.slamRing.material.opacity = 0.25 + 0.4 * wind + Math.sin(p.t * 20) * 0.1;
    }
    const lashing = a?.kind === 'lash' && a.state === 'windup';
    this.lashRing.visible = lashing;
    if (lashing) {
      const d = p.cfg.attacks.lash.dodge;
      this.lashRing.position.set(a.at.x, this.heightAt(a.at.x, a.at.z) + 0.22, a.at.z);
      this.lashRing.scale.setScalar(d * (1.4 - 0.4 * wind));
      this.lashRing.material.opacity = 0.3 + 0.4 * wind;
    }
    // The mound: bodies spread over a dome, turning one way low and the other high, bobbing.
    const cx = p.x + ox;
    const cz = p.z + oz;
    const N = p.bodies;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / Math.max(1, N); // 0 at the bottom ring, 1 at the top
      const ring = Math.sqrt(1 - u * u * 0.85) * r * 0.85;
      const dir = i % 2 ? 1 : -1;
      const ang = i * GOLDEN + p.spin * dir * (1.2 - u * 0.5);
      const bob = Math.sin(p.t * 2.3 + i) * 0.12;
      const y = g - sunk + u * r * 1.35 - 0.2 + bob + lift * u;
      const frame = LIMP[(i + Math.floor(p.t * 1.5 + i * 0.37)) % LIMP.length];
      this.put(cx + Math.sin(ang) * ring, y, cz + Math.cos(ang) * ring, i, frame, ang + Math.PI * 0.5 * dir + p.t * dir);
    }
    // The fling: a body held up over the top on a tendril as it winds up.
    const top = { x: cx, y: g - sunk + r * 1.3 + lift, z: cz };
    if (a?.kind === 'fling' && a.state === 'windup') {
      const held = { x: cx, y: top.y + 0.8 + wind * 0.8, z: cz };
      this.put(held.x, held.y - 0.9, held.z, 400, ZOMBIE_FRAMES.dying[0], p.t * 6);
      this.tendril(top, held, 0.13, 0.3, p.t * 4, false);
    }
    // The core: beating (a quick double pulse, a rest), deeper in the heap; harder and brighter as it winds up or reels.
    const beatT = (p.t * (1.1 + (1 - N / p.cfg.bodies) * 0.9)) % 1;
    const beat = Math.exp(-((beatT - 0.1) ** 2) / 0.003) + 0.6 * Math.exp(-((beatT - 0.28) ** 2) / 0.003);
    const reel = p.phase === 'fight' && p.cycle === 'reel';
    const coreR = r * 0.62 * (1 + beat * 0.07 + wind * 0.1 + (reel ? 0.08 : 0));
    this.placeCore(cx, g - sunk + r * 0.7 + lift * 0.5, cz, coreR, p.t, 1);
    this.veinUniforms.uVeinGlow.value = look.veinGlow * (0.7 + beat * 0.6 + wind * 0.8 + (reel ? 1 : 0));
    this.light.position.set(cx, g - sunk + r * 0.9, cz);
    this.light.intensity = look.coreIntensity * (0.6 + beat * 0.5 + (reel ? 0.4 : 0));
    // The charge.
    const ch = p.phase === 'fight' && p.cycle === 'charge';
    this.charge.visible = ch;
    if (ch) {
      this.charge.position.set(p.charge.x, p.charge.y, p.charge.z);
      this.charge.rotation.y = Math.atan2(p.charge.x - p.x, p.charge.z - p.z);
      this.chargeLamp.visible = Math.sin(p.cycleT * (6 + p.cycleT * 2)) > 0;
    }
    // Its eyes, pushed out of the wounds after a blast, opening, looking at him; shut and sunk as the reel ends.
    const reelLeft = reel ? p.cfg.seams.seconds - p.cycleT : 0;
    this.eyes.forEach((e, i) => {
      const s = p.seams[i];
      const want = reel ? Math.min(1, p.cycleT / 0.35, reelLeft / 0.4) : 0;
      e.userData.open += (want - e.userData.open) * Math.min(1, dt * 12);
      e.visible = e.userData.open > 0.02;
      if (!e.visible) return;
      const o = e.userData.open;
      const size = p.cfg.seams.hitRadius * 1.25 * (0.6 + 0.4 * o); // drawn bigger than its hit circle: an eye you can see
      e.position.set(s.x, s.y + 0.3, s.z);
      e.scale.setScalar(size);
      e.lookAt(pp.x, (pp.y ?? g) + 1.6, pp.z);
      // Lids part as it opens; a twitch every so often.
      const twitch = Math.sin(p.t * 7 + i * 2) > 0.97 ? 0.4 : 0;
      e.userData.top.rotation.x = -(o - twitch) * 1.2;
      e.userData.bottom.rotation.x = Math.PI + (o - twitch) * 1.0;
    });
    // ---- the tendrils ----
    const base = (ang, h) => ({ x: cx + Math.sin(ang) * r * 0.75, y: g - sunk + r * h, z: cz + Math.cos(ang) * r * 0.75 });
    // Idle: always out, waving, rising out of it all round.
    const idle = look.idle;
    const moving = p.phase === 'fight' && !p.grab && p.cycle !== 'reel' && !a;
    for (let i = 0; i < idle; i++) {
      const ang = (i / idle) * Math.PI * 2 + Math.sin(p.t * 0.4 + i) * 0.4;
      const from = base(ang, 0.5 + (i % 3) * 0.25);
      const len = r * (0.9 + (i % 4) * 0.25) * rise;
      // Two of them plant in the ground ahead as it hauls itself along.
      if (moving && i < 2) {
        const side = i === 0 ? -0.55 : 0.55;
        const step = (p.t * 1.6 + i * 0.5) % 1;
        const reach = r + 1.2 + step * 1.4;
        const to = { x: cx + Math.sin(toTom + side) * reach, z: cz + Math.cos(toTom + side) * reach };
        this.tendril(from, { x: to.x, y: this.heightAt(to.x, to.z) + 0.05, z: to.z }, 0.11, 0.6, p.t * 2 + i, true);
        continue;
      }
      const out = { x: from.x + Math.sin(ang) * len, y: from.y + len * (0.4 + 0.5 * Math.sin(p.t * 1.3 + i * 1.7)), z: from.z + Math.cos(ang) * len };
      this.tendril(from, out, 0.08 + 0.02 * (i % 2), 0.9, p.t * 2.4 + i * 1.3, true);
    }
    // Working: reaching for and dragging the fallen.
    for (const t of p.tendrils) {
      const to = { x: t.head.x, y: this.heightAt(t.head.x, t.head.z) + 0.6, z: t.head.z };
      this.tendril(base(Math.atan2(to.x - cx, to.z - cz), 0.6), to, 0.14, 0.7, p.t * 6, true);
    }
    // The lash: coiling up off its top before it strikes; then out at where he was.
    if (lashing) this.tendril(top, { x: top.x + Math.sin(p.t * 9) * 0.8, y: top.y + 1.4 + wind, z: top.z + Math.cos(p.t * 9) * 0.8 }, 0.15, 1.2, p.t * 10, true);
    if (p.lash) {
      p.lash.t += dt;
      if (p.lash.t < 0.35) this.tendril(top, { x: p.lash.to.x, y: this.heightAt(p.lash.to.x, p.lash.to.z) + 1.0, z: p.lash.to.z }, 0.15, 0.3, p.t * 4, true);
      else p.lash = null;
    }
    // The grab: rearing back before it's thrown; then out, or wrapped round him and reeling him in.
    if (a?.kind === 'grab' && a.state === 'windup') this.tendril(top, { x: top.x - Math.sin(toTom) * 1.2, y: top.y + 1.2 + wind * 0.6, z: top.z - Math.cos(toTom) * 1.2 }, 0.17, 0.8, p.t * 8, true);
    if (p.grab) {
      const h = p.grab.head;
      const hy = p.grab.state === 'hold' ? (pp.y ?? this.heightAt(h.x, h.z)) + 0.9 : this.heightAt(h.x, h.z) + 1.0;
      this.tendril(base(toTom, 0.7), { x: h.x, y: hy, z: h.z }, 0.17, p.grab.state === 'hold' ? 0.15 : 0.5, p.t * 5, p.grab.state !== 'hold');
    }
    // Bodies on the end of a tendril.
    p.tendrils.forEach((t, i) => {
      if (t.body) this.put(t.body.x, this.heightAt(t.body.x, t.body.z) + 0.15, t.body.z, 200 + i, ZOMBIE_FRAMES.dying[1], p.t * 3);
    });
  }

  // The meat at (x, y, z), radius s: its lumps breathing (time t); fade 0..1 shrinks the glow as it dies.
  placeCore(x, y, z, s, t, fade) {
    const pos = this.core.geometry.attributes.position;
    const b = this.coreBase;
    const L = this.coreLump;
    for (let i = 0; i < pos.count; i++) {
      const k = 1 + L[i] + Math.sin(t * 3 + i * 0.37) * 0.025;
      pos.array[i * 3] = b[i * 3] * k;
      pos.array[i * 3 + 1] = b[i * 3 + 1] * k;
      pos.array[i * 3 + 2] = b[i * 3 + 2] * k;
    }
    pos.needsUpdate = true;
    this.core.geometry.computeVertexNormals();
    this.core.position.set(x, y, z);
    this.core.scale.set(s, s * 0.85, s);
    this.core.rotation.y = t * 0.15;
    if (fade < 1) this.veinUniforms.uVeinGlow.value = this.pile.cfg.look.veinGlow * fade;
  }

  // A tendril from a to b: a curve that arches (arch, times its length) and writhes (phase w), thick at the root
  // (width) to a point; a bone hook at the tip if `hook`.
  tendril(a, b, width, arch, w, hook) {
    if (this.segs.count + SEGMENTS > MAX_TENDRILS * SEGMENTS) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz);
    if (len < 0.05) return;
    // A sideways direction for the writhing.
    const sx = -dz / (Math.hypot(dx, dz) || 1);
    const sz = dx / (Math.hypot(dx, dz) || 1);
    const pts = this.pts;
    for (let k = 0; k <= SEGMENTS; k++) {
      const f = k / SEGMENTS;
      const bend = Math.sin(f * Math.PI);
      const wig = Math.sin(f * Math.PI * 2.5 + w) * len * 0.08 * bend;
      pts[k].set(a.x + dx * f + sx * wig, a.y + dy * f + bend * arch * len * 0.25 + Math.cos(f * 6 + w) * 0.05 * len * bend, a.z + dz * f + sz * wig);
    }
    for (let k = 0; k < SEGMENTS; k++) {
      const p0 = pts[k];
      const p1 = pts[k + 1];
      this.v.subVectors(p1, p0);
      const l = this.v.length();
      if (l < 1e-4) continue;
      this.q.setFromUnitVectors(this.up, this.v.multiplyScalar(1 / l));
      const thick = width * (1 - (k / SEGMENTS) * 0.8);
      this.s.set(thick, l * 1.05, thick);
      this.m4.compose(p0, this.q, this.s);
      this.segs.setMatrixAt(this.segs.count++, this.m4);
    }
    if (hook) {
      const tip = pts[SEGMENTS];
      this.v.subVectors(tip, pts[SEGMENTS - 1]).normalize();
      this.q.setFromUnitVectors(this.up, this.v);
      this.s.setScalar(1 + width * 2);
      this.m4.compose(tip, this.q, this.s);
      this.hooks.setMatrixAt(this.hooks.count++, this.m4);
    }
  }

  dispose() {
    this.sprites.mesh.removeFromParent();
    this.sprites.mesh.geometry.dispose();
    this.sprites.material.dispose();
    this.sprites.depthMaterial.dispose();
    this.group.removeFromParent();
    this.group.traverse((o) => {
      o.geometry?.dispose?.();
      o.material?.dispose?.();
    });
  }
}
