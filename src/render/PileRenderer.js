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
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { ZombieRenderer } from './ZombieRenderer.js';
import { ZOMBIE_FRAMES } from '../ai/Zombie.js';

const LIMP = [ZOMBIE_FRAMES.stagger, ZOMBIE_FRAMES.dying[0], ZOMBIE_FRAMES.dying[1], ZOMBIE_FRAMES.dying[2], ZOMBIE_FRAMES.attackStrike, ZOMBIE_FRAMES.strikeLunge, ZOMBIE_FRAMES.strikeRear];
const GOLDEN = 2.399963; // radians: spreads the bodies evenly round the mound
const SEGMENTS = 9; // per tendril
const MAX_TENDRILS = 48; // (Nov 25: four legs of four strands each, and the rest)

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
    // Fleshy folds round its eyes (the artist's rendition: wet red lips of meat about them).
    const lobeGeo = new THREE.SphereGeometry(1, 12, 9);
    const lobeMat = new THREE.MeshLambertMaterial({ color: look.lobe ?? look.flesh[1], emissive: new THREE.Color(look.lobe ?? look.flesh[1]).multiplyScalar(0.15) });
    this.lobes = Array.from({ length: 7 }, () => {
      const m = new THREE.Mesh(lobeGeo, lobeMat);
      m.castShadow = true;
      this.group.add(m);
      return m;
    });
    this.buildTendrils(look);
    // Its tells: a ring on the ground growing out to the slam's reach; a ring where the lash will land.
    const ringMat = (hex) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    this.slamRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), ringMat(look.warn));
    this.lashRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 28).rotateX(-Math.PI / 2), ringMat(look.warn));
    // Nov 26: where its leap will come down (red: get out from under it).
    this.leapRing = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 40).rotateX(-Math.PI / 2), ringMat(look.chargeLight ?? 0xff3020));
    this.slamRing.visible = this.lashRing.visible = this.leapRing.visible = false;
    this.group.add(this.slamRing, this.lashRing, this.leapRing);
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
    // Welded (indexed), so its normals are shared and the meat shades smooth, not in flat facets.
    const raw = new THREE.IcosahedronGeometry(1, 4);
    raw.deleteAttribute('normal');
    raw.deleteAttribute('uv');
    const geo = mergeVertices(raw);
    raw.dispose();
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
      // Thin veins (the artist's rendition: dark wet meat, the green in threads, not patches).
      const vein = Math.abs(lump(x * 2.6, y * 2.6, z * 2.6, 2.9));
      glow[i] = Math.max(0, 1 - vein / 0.035);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    // Wet: a little shine on the meat.
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 40, specular: new THREE.Color(0x1c1414) });
    this.veinUniforms = { uVein: { value: new THREE.Color(look.vein) }, uVeinGlow: { value: look.veinGlow } };
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.veinUniforms);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGlow;\nuniform vec3 uVein;\nuniform float uVeinGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uVein * vGlow * uVeinGlow;\ndiffuseColor.rgb = mix(diffuseColor.rgb, uVein * 0.3, vGlow * 0.2);');
    };
    mat.customProgramCacheKey = () => 'pile-flesh-veins-wet';
    this.core = new THREE.Mesh(geo, mat);
    this.core.castShadow = true;
    this.group.add(this.core);
  }

  // An eye: a yellowed ball, a lidded opening, a yellow-green iris and a black slit, all turned to look at Tom.
  buildEyes(look) {
    const ball = new THREE.SphereGeometry(1, 14, 10);
    // Unlit: the core's light right beside them washed them out to white discs.
    const ballMat = new THREE.MeshBasicMaterial({ color: look.eye });
    this.irisBright = new THREE.Color(look.iris);
    this.irisDim = new THREE.Color(look.irisDim ?? look.iris);
    this.heartDim = new THREE.Color(look.heartDim ?? 0x4a0a0a);
    this.heartBright = new THREE.Color(look.heartBright ?? 0xff2a20);
    this.heartCore = new THREE.Color(look.heartCore ?? 0xffa080);
    // Nov 25 (the concept art: dozens of eyes over its face): small ones round the cluster, dim, blinking, never the
    // weak spots (they never glow). One instanced mesh of balls, one of slits.
    const n = look.dimEyes ?? 0;
    this.dimBalls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: look.dimEye ?? 0x56621a }), Math.max(1, n));
    this.dimSlits = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 1.1).translate(0, 0, 1.01), new THREE.MeshBasicMaterial({ color: look.pupil }), Math.max(1, n));
    for (const m of [this.dimBalls, this.dimSlits]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      this.group.add(m);
    }
    // Where they sit: [angle off facing Tom, height x radius, size], spread over its face round the cluster (golden).
    this.dimSpots = [];
    for (let i = 0; this.dimSpots.length < n && i < 400; i++) {
      const da = Math.sin(i * 2.399963) * 1.25 * Math.sqrt(((i % 37) + 1) / 37);
      const h = 0.3 + ((i * 0.618034) % 1) * 1.08;
      if (Math.abs(da) < 0.62 && h > 0.3 && h < 1.32) continue; // (the cluster's)
      this.dimSpots.push([da, h, 0.1 + ((i * 0.37) % 1) * 0.09]);
    }
    // Army packs among the bodies on top (the concept art: their kit still on them).
    this.packs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.42, 0.5, 0.26), new THREE.MeshLambertMaterial({ color: look.pack ?? 0x46462a }), 12);
    this.packs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.packs.frustumCulled = false;
    this.packs.castShadow = true;
    this.packs.count = 0;
    this.group.add(this.packs);
    const pupilMat = new THREE.MeshBasicMaterial({ color: look.pupil });
    const lidMat = new THREE.MeshBasicMaterial({ color: look.flesh[1] });
    const iris = new THREE.CircleGeometry(0.42, 18);
    const pupil = new THREE.PlaneGeometry(0.16, 0.86);
    const lid = new THREE.SphereGeometry(1.08, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.eyes = Array.from({ length: this.pile.cfg.seams.count ?? 3 }, () => { // (from config: the view's built before the Pile's eyes)
      const g = new THREE.Group();
      // The artist's rendition: the whole eye a glowing yellow-green orb, a dark slit down it.
      const orbMat = new THREE.MeshBasicMaterial({ color: look.iris }); // its own: dim or glowing
      g.add(new THREE.Mesh(ball, orbMat));
      const irisMat = new THREE.MeshBasicMaterial({ color: look.irisCore ?? 0xf4ffa0 });
      const i = new THREE.Mesh(iris, irisMat);
      i.position.z = 1.01; // just in front of the ball, facing out
      const p = new THREE.Mesh(pupil, pupilMat);
      p.position.z = 1.02;
      const top = new THREE.Mesh(lid, lidMat);
      const bottom = new THREE.Mesh(lid, lidMat);
      bottom.rotation.x = Math.PI;
      g.add(i, p, top, bottom);
      g.userData = { top, bottom, open: 0, orb: orbMat, iris: irisMat };
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
    const hook = new THREE.ConeGeometry(0.06, 0.62, 6).translate(0, 0.31, 0); // a long spear of bone
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
    const live = p.phase === 'intro' || p.phase === 'emerge' || p.phase === 'fight';
    this.nSprites = 0;
    this.segs.count = 0;
    this.hooks.count = 0;
    this.packs.count = 0;
    this.dimBalls.count = 0;
    this.dimSlits.count = 0;
    // Its death: the meat swells, bursts and sags away to nothing (dark and suggestive: Aaron).
    const dying = p.phase === 'dead' && p.deadT < p.cfg.fx.deathSeconds;
    this.group.visible = live || dying;
    if (dying) {
      const k = p.deadT / p.cfg.fx.deathSeconds;
      const g = this.heightAt(p.x, p.z);
      const r = p.deathRadius ?? 1.5;
      this.placeCore(p.x, g + r * 0.6 * (1 - k), p.z, r * 0.6 * (1 + 0.5 * Math.sin(Math.min(1, k * 2) * Math.PI)) * (1 - k * 0.9), p.t, 1 - k);
      this.light.intensity = p.cfg.look.coreIntensity * 2 * (1 - k);
      for (const m of [this.charge, this.slamRing, this.lashRing, this.leapRing, ...this.eyes]) m.visible = false;
    }
    if (live) this.drawLive(dt);
    // Bodies in the air (also after it's dead: the last group coming down).
    p.flying.forEach((f, i) => this.put(f.x, f.y, f.z, 300 + i, LIMP[(i + Math.floor(f.t * 8)) % LIMP.length], f.t * 9 + i));
    for (let i = this.nSprites; i < this.fakes.length; i++) this.fakes[i].active = false;
    this.segs.instanceMatrix.needsUpdate = true;
    this.hooks.instanceMatrix.needsUpdate = true;
    this.packs.instanceMatrix.needsUpdate = true;
    this.dimBalls.instanceMatrix.needsUpdate = true;
    this.dimSlits.instanceMatrix.needsUpdate = true;
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
    const rise = p.risen;
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
    // Nov 26: the leap: it crouches low on its legs, quivering, before it springs.
    else if (a?.kind === 'leap' && a.state === 'windup') lift = -wind * (p.raise * 1.3 + 0.4) + Math.sin(p.t * 40) * 0.04 * wind;
    // Its surges: a hard scuttling bob.
    if (p.surge > 0) lift += Math.abs(Math.sin(p.t * 16)) * 0.25 - 0.15;
    // Up in its leap.
    const air = p.air;
    const leaping = a?.kind === 'leap';
    this.leapRing.visible = leaping && p.phase === 'fight';
    if (this.leapRing.visible) {
      const L = p.cfg.attacks.leap;
      const s = a.state === 'strike' ? Math.min(1, a.t / L.strike) : a.state === 'windup' ? 0 : 1;
      const at = a.state === 'windup' ? a.at : a.to ?? a.at;
      this.leapRing.position.set(at.x, this.heightAt(at.x, at.z) + 0.22, at.z);
      this.leapRing.scale.setScalar((r + L.reach) * (a.state === 'windup' ? 1.6 - 0.6 * wind : 1.6 - 0.6 * s));
      this.leapRing.material.opacity = a.state === 'recover' ? Math.max(0, 0.6 - a.t * 2) : 0.25 + 0.5 * (a.state === 'strike' ? s : wind * 0.5) + Math.sin(p.t * 22) * 0.1;
    }
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
    // Nov 25 (the artist's rendition): they cling over the meat, crowding its top and sides and its foot, and leave
    // its face (the eyes, toward Tom) clear.
    const N = p.bodies;
    const coreR = p.coreRadius;
    const coreY = g - sunk + r * 0.85 + lift * 0.5 + p.raise + air;
    // Nov 25 (Aaron's concept art: carried up on its legs, bodies hanging from its belly): some hang underneath,
    // swinging as it walks.
    const foot = Math.round(N * 0.22);
    for (let i = 0; i < foot; i++) {
      const ang = toTom + ((i + 0.5) / foot - 0.5) * Math.PI * 1.9 + Math.sin(p.t * 0.6 + i) * 0.1;
      const ring = coreR * 0.55;
      const swing = Math.sin(p.t * 2.2 + i * 1.7) * 0.15;
      const frame = LIMP[(i * 3 + Math.floor(p.t * 0.8)) % LIMP.length];
      this.put(cx + Math.sin(ang) * ring + swing, coreY - coreR * 0.8 - 1.45, cz + Math.cos(ang) * ring, 500 + i, frame, ang + p.t * 0.3);
    }
    for (let i = foot; i < N; i++) {
      const u = Math.pow((i - foot + 0.5) / Math.max(1, N - foot), 0.65); // more of them high up
      const e = (u - 0.35) * Math.PI * 0.9; // how far up round the meat, -0.99 (its foot) .. 1.84 (over the top)
      const dir = i % 2 ? 1 : -1;
      let ang = i * GOLDEN + p.spin * dir * (0.8 - u * 0.4);
      if (e > -0.45 && e < 0.8) {
        let d = Math.atan2(Math.sin(ang - toTom), Math.cos(ang - toTom));
        if (Math.abs(d) < 0.85) ang = toTom + Math.sign(d || 1) * 0.85 + d * 0.3; // off its face
      }
      const ring = Math.max(0.25, Math.cos(e)) * coreR * 1.02 + 0.12;
      const bob = Math.sin(p.t * 2.3 + i) * 0.1;
      const y = coreY + Math.sin(e) * coreR * 0.95 - 0.5 + bob;
      const frame = LIMP[(i + Math.floor(p.t * 1.5 + i * 0.37)) % LIMP.length];
      const bx = cx + Math.sin(ang) * ring;
      const bz = cz + Math.cos(ang) * ring;
      this.put(bx, y, bz, i, frame, ang + Math.PI * 0.5 * dir + p.t * dir * 0.5);
      // A pack on some of the ones up top.
      if (e > 0.55 && i % 2 === 0 && this.packs.count < 12) {
        this.v.set(bx - Math.sin(ang) * 0.15, y + 1.05, bz - Math.cos(ang) * 0.15);
        this.q.setFromEuler(new THREE.Euler(0.3 * dir, ang + i, 0.2 * dir));
        this.s.set(1, 1, 1);
        this.m4.compose(this.v, this.q, this.s);
        this.packs.setMatrixAt(this.packs.count++, this.m4);
      }
    }
    // The fling: a body held up over the top on a tendril as it winds up.
    const top = { x: cx, y: g - sunk + r * 1.3 + lift + air, z: cz };
    if (a?.kind === 'fling' && a.state === 'windup') {
      const held = { x: cx, y: top.y + 0.8 + wind * 0.8, z: cz };
      this.put(held.x, held.y - 0.9, held.z, 400, ZOMBIE_FRAMES.dying[0], p.t * 6);
      this.tendril(top, held, 0.13, 0.3, p.t * 4, false);
    }
    // The core: beating (a quick double pulse, a rest), deeper in the heap; harder and brighter as it winds up or reels.
    const beatT = (p.t * (1.1 + (1 - N / p.cfg.bodies) * 0.9)) % 1;
    const beat = Math.exp(-((beatT - 0.1) ** 2) / 0.003) + 0.6 * Math.exp(-((beatT - 0.28) ** 2) / 0.003);
    const reel = p.phase === 'fight' && p.cycle === 'reel';
    const meatR = coreR * (1 + beat * 0.06 + wind * 0.08 + (reel ? 0.06 : 0));
    this.placeCore(cx, coreY, cz, meatR, p.t, 1);
    // The folds of meat round its eyes, swelling with the beat.
    // (Pile.eyeSpots is where they sit once it's up and still: sink them with the rest of it while it's still coming
    // up, and carry them with its meat as it heaves up for a slam or draws back for a lunge, so they stay on its face.
    // Its eyes are only hit while it reels, when it isn't attacking, so the shots still line up.)
    const spots = p.eyeSpots(this.eyeAt ??= []);
    const eyeDy = lift * 0.5 - sunk;
    if (eyeDy || ox || oz) for (const s of spots) { s.x += ox; s.y += eyeDy; s.z += oz; }
    let mx = 0;
    let my = 0;
    let mz = 0;
    for (const s of spots) {
      mx += s.x / spots.length;
      my += s.y / spots.length;
      mz += s.z / spots.length;
    }
    this.lobes.forEach((m, i) => {
      const a = (i / this.lobes.length) * Math.PI * 2;
      const side = toTom + Math.PI / 2;
      const rx = Math.cos(a) * coreR * 0.42;
      const ry = Math.sin(a) * coreR * 0.32;
      m.position.set(mx + Math.sin(side) * rx - Math.sin(toTom) * 0.08, my + ry, mz + Math.cos(side) * rx - Math.cos(toTom) * 0.08);
      m.scale.set(coreR * 0.2, coreR * 0.14 * (1 + beat * 0.1), coreR * 0.2).multiplyScalar(Math.max(0.001, (rise - 0.4) / 0.6));
      m.visible = rise > 0.45; // (not floating there before it's up)
      m.rotation.set(0, toTom + a, a);
    });
    this.veinUniforms.uVeinGlow.value = look.veinGlow * (0.7 + beat * 0.6 + wind * 0.8 + (reel ? 1 : 0));
    // Her green off its eyes, onto the ground in front of it.
    this.light.position.set(mx + Math.sin(toTom) * 1.6, g + 0.6, mz + Math.cos(toTom) * 1.6);
    this.light.intensity = look.coreIntensity * (0.6 + beat * 0.5 + (reel ? 0.4 : 0));
    // The charge.
    const ch = p.phase === 'fight' && p.cycle === 'charge';
    this.charge.visible = ch;
    if (ch) {
      this.charge.position.set(p.charge.x, p.charge.y, p.charge.z);
      this.charge.rotation.y = Math.atan2(p.charge.x - p.x, p.charge.z - p.z);
      this.chargeLamp.visible = Math.sin(p.cycleT * (6 + p.cycleT * 2)) > 0;
    }
    // Its eyes (Nov 25, the artist's rendition): a cluster on its face, always there. Half shut and dim while it's
    // whole; after a blast, wide open, glowing, bulging: the weak spots. The cutscene's teaser opens them all at once.
    const reelLeft = reel ? p.cfg.seams.seconds - p.cycleT : 0;
    const tease = p.phase === 'intro' && p.eyeTease > 0 ? p.eyeTease / look.eyeTease : 0;
    this.eyes.forEach((e, i) => {
      let want = look.eyeShut * rise;
      let bright = 0;
      if (reel) {
        const k = Math.min(1, p.cycleT / 0.3, reelLeft / 0.4);
        want = look.eyeShut + (1 - look.eyeShut) * k;
        bright = k;
      } else if (tease > 0) {
        const k = Math.min(1, tease / 0.2, (1 - tease) / 0.25);
        want = look.eyeShut + (1 - look.eyeShut) * k;
        bright = k;
      } else if (p.phase === 'intro' && rise < 0.6) want = 0;
      e.userData.open += (want - e.userData.open) * Math.min(1, dt * 12);
      const o = e.userData.open;
      e.visible = o > 0.02;
      if (!e.visible) return;
      const s = spots[i];
      const heart = p.seams[i]?.heart;
      const size = (heart ? p.cfg.seams.heart.hitRadius : p.cfg.seams.hitRadius) * (0.95 + 0.15 * bright); // (spaced so they don't overlap)
      e.position.set(s.x, s.y, s.z);
      e.scale.setScalar(size);
      e.lookAt(pp.x, (pp.y ?? g) + 1.6, pp.z);
      if (heart) e.userData.orb.color.copy(this.heartDim).lerp(this.heartBright, 0.25 + 0.75 * bright);
      else e.userData.orb.color.copy(this.irisDim).lerp(this.irisBright, 0.2 + 0.8 * bright);
      if (heart) e.userData.iris.color.copy(this.heartCore);
      e.userData.iris.visible = bright > 0.3; // its hot centre, when it's open wide
      // Lids part as it opens; a twitch every so often.
      const twitch = Math.sin(p.t * 7 + i * 2) > 0.97 ? 0.3 : 0;
      e.userData.top.rotation.x = -(o - twitch) * 1.25;
      e.userData.bottom.rotation.x = Math.PI + (o - twitch) * 1.05;
    });
    // The small eyes, dim, each blinking now and then.
    if (rise > 0.6) {
      const R0 = coreR * 1.0;
      const eye = new THREE.Vector3();
      const look3 = new THREE.Vector3(pp.x, (pp.y ?? g) + 1.6, pp.z);
      const mtx = new THREE.Matrix4();
      for (let i = 0; i < this.dimSpots.length; i++) {
        const [da, h, size] = this.dimSpots[i];
        const a2 = toTom + da;
        const up = Math.max(-0.95, Math.min(0.95, (h - 0.85) / 0.68));
        const k2 = Math.cos(da * 0.6) * Math.sqrt(1 - up * up); // on its round, as the cluster's are (Pile.eyeSpots)
        eye.set(cx + Math.sin(a2) * R0 * k2, g - sunk + lift * 0.5 + air + p.raise + r * h, cz + Math.cos(a2) * R0 * k2);
        const blink = Math.sin(p.t * 0.9 + i * 2.7) > 0.96 ? 0.1 : 1;
        mtx.lookAt(eye, look3, this.up);
        this.q.setFromRotationMatrix(mtx);
        this.q.multiply(new THREE.Quaternion().setFromAxisAngle(this.up, Math.PI)); // (lookAt points -z at him: turn its face round)
        this.s.set(size, size * blink, size);
        this.m4.compose(eye, this.q, this.s);
        this.dimBalls.setMatrixAt(this.dimBalls.count++, this.m4);
        this.dimSlits.setMatrixAt(this.dimSlits.count++, this.m4);
      }
    }
    // ---- the tendrils ----
    const base = (ang, h) => ({ x: cx + Math.sin(ang) * coreR * 0.9, y: coreY + (h - 0.85) * r, z: cz + Math.cos(ang) * coreR * 0.9 });
    this.drawLegs(cx, cz, g, coreY, coreR, toTom, rise, dt, air);
    // Idle: always out, waving, rising out of it all round.
    const idle = look.idle;
    const moving = p.phase === 'fight' && !p.grab && p.cycle !== 'reel' && !a;
    // Nov 26 (Aaron: "get those tendrils lashing aggressively"): in the fight they thrash, harder with him close.
    const dTom = Math.hypot(pp.x - p.x, pp.z - p.z) - r;
    const near = p.phase === 'fight' ? Math.max(0, Math.min(1, 1 - (dTom - 2) / 8)) : 0;
    const thr = p.phase === 'fight' ? (p.cfg.snap?.thrash ?? 1) * (1 + near * 0.5) : 1;
    const tt = p.t * thr;
    for (let i = 0; i < idle; i++) {
      // Out to its sides, clear of its face (the artist's rendition).
      const ang = toTom + (i % 2 ? 1 : -1) * (0.95 + Math.floor(i / 2) * 0.55 - near * 0.35) + Math.sin(tt * 0.4 + i) * (0.15 + near * 0.25);
      const from = base(ang, 0.55 + (i % 3) * 0.3);
      const len = r * (0.9 + (i % 4) * 0.2) * rise;
      // Two of them planted on the road in front like legs, stepping as it hauls itself along.
      if (i < 2 && rise > 0.5 && !p.cfg.legs) {
        const side = i === 0 ? -0.75 : 0.75;
        const step = moving ? (p.t * 1.6 + i * 0.5) % 1 : 0.5;
        const reach = r + 1.2 + step * 1.4;
        const to = { x: cx + Math.sin(toTom + side) * reach, z: cz + Math.cos(toTom + side) * reach };
        this.tendril(from, { x: to.x, y: this.heightAt(to.x, to.z) + 0.05, z: to.z }, 0.11, 0.6, p.t * 2 + i, true);
        continue;
      }
      // (The artist's rendition: long thin legs arching up and out, the spear tips held out level.)
      const reachOut = len * 1.7;
      const out = { x: from.x + Math.sin(ang) * reachOut, y: from.y + len * (0.15 + (0.3 + near * 0.3) * Math.sin(tt * 1.1 + i * 1.7)), z: from.z + Math.cos(ang) * reachOut };
      this.tendril(from, out, 0.065 + 0.01 * (i % 2), 1.5 - near * 0.6, tt * 1.6 + i * 1.3, true);
    }
    // The cutscene's first beat: tendrils bursting up out of the rubble before anything else of it shows.
    if (p.phase === 'intro' && p.burst && rise < 0.7) {
      const grow = Math.min(1, p.burstT / 0.5);
      for (let i = 0; i < 3; i++) {
        const ang = toTom + (i - 1) * 0.9;
        const from = { x: p.x + Math.sin(ang) * 0.4, y: g - 0.3, z: p.z + Math.cos(ang) * 0.4 };
        const h = (1.6 + i * 0.5) * grow;
        this.tendril(from, { x: from.x + Math.sin(ang) * 0.8 * grow, y: g + h, z: from.z + Math.cos(ang) * 0.8 * grow }, 0.14, 0.4, p.t * 4 + i, true);
      }
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
    // Nov 26: an idle tendril snapping out at him, in close.
    if (p.snap) {
      const k = Math.min(1, p.snap.t / 0.08) * (p.snap.t < 0.15 ? 1 : Math.max(0, 1 - (p.snap.t - 0.15) / 0.1));
      const from = base(toTom + p.snap.side * 0.9, 0.9);
      const to = { x: from.x + (p.snap.to.x - from.x) * k, y: from.y + (this.heightAt(p.snap.to.x, p.snap.to.z) + 1.1 - from.y) * k, z: from.z + (p.snap.to.z - from.z) * k };
      this.tendril(from, to, 0.09, 0.4, p.t * 12, true);
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

  // ---- the legs (Nov 25, Aaron's concept art) -----------------------------------------------------------------

  // Four great legs: from its sides up and out to a high knee, then down to a clawed foot on the ground. Each foot
  // stays planted till it's left `stride` behind, then steps (diagonal pairs in turn, never both of a pair at once).
  // A thick strand for thigh and shin, thinner ones wound about them (gnarled), a bone claw at the foot.
  drawLegs(cx, cz, g, coreY, coreR, toTom, rise, dt, air = 0) {
    const p = this.pile;
    const L = p.cfg.legs;
    if (!L || rise < 0.25) {
      this.feet = null;
      return;
    }
    const k = p.radius / p.cfg.radius; // smaller as it shrinks
    const angles = [1.1, -1.1, 2.3, -2.3]; // front left, front right, back left, back right (off facing Tom)
    const reach = coreR + L.reach * p.radius;
    const rest = (i) => {
      const a = toTom + angles[i];
      const x = cx + Math.sin(a) * reach;
      const z = cz + Math.cos(a) * reach;
      return { x, z };
    };
    if (!this.feet || this.feetFor !== p.home) {
      this.feetFor = p.home;
      this.feet = angles.map((_, i) => ({ ...rest(i), from: null, t: 0 }));
    }
    const stride = L.stride * (0.6 + 0.4 * k);
    const stepSeconds = L.stepSeconds / (p.surge > 0 ? 1.9 : 1); // (scuttling: quicker steps)
    for (let i = 0; i < 4; i++) {
      const f = this.feet[i];
      const target = rest(i);
      if (air > 0.05) {
        // Nov 26: up in its leap: its feet drawn in under it, hanging; they come down where they're over.
        f.x = cx + (target.x - cx) * 0.7;
        f.z = cz + (target.z - cz) * 0.7;
        f.from = null;
        f.lift = Math.max(0, air - p.raise * 0.4);
      } else if (f.from) {
        f.t += dt / stepSeconds;
        const s = Math.min(1, f.t);
        f.x = f.from.x + (f.to.x - f.from.x) * s;
        f.z = f.from.z + (f.to.z - f.from.z) * s;
        f.lift = Math.sin(s * Math.PI) * L.stepHeight * (0.6 + 0.4 * k);
        if (s >= 1) {
          f.from = null;
          f.lift = 0;
        }
      } else {
        const partner = this.feet[3 - i];
        const d = Math.hypot(target.x - f.x, target.z - f.z);
        if (d > stride && !partner.from) {
          const ux = (target.x - f.x) / d;
          const uz = (target.z - f.z) / d;
          f.from = { x: f.x, z: f.z };
          f.to = { x: target.x + ux * stride * 0.35, z: target.z + uz * stride * 0.35 };
          f.t = 0;
        }
      }
      const a = toTom + angles[i];
      const hip = { x: cx + Math.sin(a) * coreR * 0.8, y: coreY - coreR * 0.15, z: cz + Math.cos(a) * coreR * 0.8 };
      const foot = { x: f.x, y: this.heightAt(f.x, f.z) + (f.lift ?? 0), z: f.z };
      const out = 0.85 * p.radius; // (the art: knees bent up and out to the sides)
      const knee = {
        x: hip.x + (foot.x - hip.x) * 0.4 + Math.sin(a) * out,
        y: Math.max(hip.y, foot.y) + p.radius * 0.55 * rise,
        z: hip.z + (foot.z - hip.z) * 0.45 + Math.cos(a) * out,
      };
      const w = L.thick * (0.55 + 0.45 * k);
      const ph = i * 1.9 + p.t * 0.7;
      this.tendril(hip, knee, w, 0.15, ph, false, 0.15, 0.35); // the thigh
      this.tendril(knee, foot, w * 0.78, -0.05, ph + 1, true, 0.12, 0.65); // the shin, a claw at the foot
      this.tendril(hip, knee, w * 0.4, 0.55, ph + 2.2, false, 0.6, 0.5); // gnarled strands wound about them
      this.tendril(hip, knee, w * 0.3, -0.4, ph + 4.0, false, 0.7, 0.5);
      this.tendril(knee, foot, w * 0.34, 0.4, ph + 3.1, false, 0.6, 0.6);
      this.tendril(knee, foot, w * 0.24, -0.35, ph + 5.3, false, 0.7, 0.7);
    }
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
  // wig: how much it writhes (1 = a tendril; a leg's strands barely); taper: how much thinner at the tip.
  tendril(a, b, width, arch, w, hook, wig = 1, taper = 0.8) {
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
      const wg = Math.sin(f * Math.PI * 2.5 + w) * len * 0.08 * bend * wig;
      pts[k].set(a.x + dx * f + sx * wg, a.y + dy * f + bend * arch * len * 0.25 + Math.cos(f * 6 + w) * 0.05 * len * bend * wig, a.z + dz * f + sz * wg);
    }
    for (let k = 0; k < SEGMENTS; k++) {
      const p0 = pts[k];
      const p1 = pts[k + 1];
      this.v.subVectors(p1, p0);
      const l = this.v.length();
      if (l < 1e-4) continue;
      this.q.setFromUnitVectors(this.up, this.v.multiplyScalar(1 / l));
      const thick = width * (1 - (k / SEGMENTS) * taper);
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
