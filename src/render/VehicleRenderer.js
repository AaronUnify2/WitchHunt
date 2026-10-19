// The abandoned vehicles (placeholder shapes; M5 part 2). Every shape of
// every vehicle is an instance of one of three unit meshes, so the whole
// fleet is a handful of draw calls:
//  - a cube for bodies, cabs, glass bands, trim, lids and the battery;
//  - a wedge for the sloped windscreens and rear windows (Aaron: a car
//    needs its windscreen's slope to read as a car), with painted pillars
//    (thin cubes laid along the slope) down both edges;
//  - a low-poly cylinder for round wheels and their hubs (Aaron: square
//    wheels didn't read as a car);
// plus unlit cubes for the lamps, so an alarm's flashing shows at night.
// Shapes and colours come from data/vehicles.json; each vehicle sits on
// the ground, tilted to its slope (and a flat tyre now and then).
//
// The moving parts swing on their hinges as their open amount goes 0..1:
// the bonnet (wide, to reach the battery), the boot and both front doors
// (only a crack once searched; Aaron), each door with its window as one
// piece. Behind an open boot or door a dark hollow shows. The battery
// shows under a lifted bonnet until it's pulled. Vehicles.js owns the
// state and calls refresh(v) when a vehicle's look changes.
//
// Session 13 (#145): the real models (render/vehicleModels.js) replace the
// shapes type by type: a type with a `model` in vehicles.json is drawn as
// that model, its body and each lid one instanced mesh for the type (the
// paint per instance, the glass, rubber and chrome their own colours), its
// lids swung on the same hinges. Its wheels and lamps are still the data's.
//
// The wear pass (Session 13): each modelled vehicle wears differently, in
// the same draw calls: per-instance numbers (aWear: its seed, rust, dirt,
// blood; aWear2: a cracked or smashed window's centre and which) drive the
// shader: rust patches on the paint (worst low down), grime splashed up
// from the ground and dust on the top surfaces, dried blood smeared down
// one side now and then, a window cracked from a point or smashed through
// to the dark inside. config.vehicles.looks.wear sets the chances.

import * as THREE from 'three';
import { VEHICLE_MODELS, mirrorGeometry } from './vehicleModels.js';

const UP_SINK = 0.04; // metres the body sits into the ground
export const LIDS = ['bonnet', 'boot', 'door', 'door2']; // door2: the passenger door, the driver's mirrored

// The passenger door: the driver's door mirrored across the vehicle.
function mirrorLid(lid) {
  const flip = (b) => [b[0], b[1], b[2], -b[3], b[4], b[5], ...b.slice(6)];
  return {
    ...lid,
    hinge: 'frontSideR',
    box: flip(lid.box),
    extra: (lid.extra ?? []).map(flip),
    hollow: lid.hollow ? flip(lid.hollow) : undefined,
  };
}

// A unit wedge (1 x 1 x 1, centred): full height at the back (-z),
// sloping down to nothing at the front (+z).
function makeWedge() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.5);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(-0.5, 0.5);
  shape.closePath();
  // Extruded along z, then turned so the extrusion runs across (x) and the slope faces forward.
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5).rotateY(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// The wear, in the model material's shader (vLocal: the vehicle's own frame).
const WEAR_VERTEX = `attribute float aPaint;
attribute vec4 aWear;
attribute vec4 aWear2;
varying vec3 vLocal;
varying vec3 vLocalNormal;
varying float vPaint;
varying vec4 vWear;
varying vec4 vWear2;`;

const WEAR_FRAGMENT = `varying vec3 vLocal;
varying vec3 vLocalNormal;
varying float vPaint;
varying vec4 vWear;
varying vec4 vWear2;
uniform vec3 uRust;
uniform vec3 uDirt;
uniform vec3 uDust;
uniform vec3 uBlood;
uniform vec3 uCrack;
float wHash( vec3 p ) {
  p = fract( p * 0.3183099 + 0.1 );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float wNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( wHash( i ), wHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( wHash( i + vec3( 0, 1, 0 ) ), wHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( wHash( i + vec3( 0, 0, 1 ) ), wHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( wHash( i + vec3( 0, 1, 1 ) ), wHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
vec3 vehicleWear( vec3 col ) {
  vec3 p = vLocal + vec3( vWear.x * 1.7, vWear.x * 0.3, vWear.x * 2.3 );
  float painted = step( 0.5, vPaint ) * step( vPaint, 1.5 );
  float glass = step( 1.5, vPaint );
  float low = smoothstep( 1.0, 0.3, vLocal.y );
  // Rust: patches on the paint, worst low down, flecked.
  float rn = wNoise( p * 5.5 ) * 0.55 + wNoise( p * 17.0 ) * 0.45;
  float rustW = vWear.y * ( 0.35 + 0.65 * low );
  float rust = smoothstep( 0.0, 0.06, rn - ( 1.0 - rustW ) ) * painted;
  col = mix( col, uRust * ( 0.55 + 0.6 * wNoise( p * 45.0 ) ), rust * 0.9 );
  // Grime splashed up from the ground; dust settled on what faces up.
  float grime = smoothstep( 0.9, 0.3, vLocal.y ) * vWear.z * ( 0.35 + 0.65 * wNoise( p * vec3( 6.0, 2.0, 6.0 ) ) );
  col = mix( col, uDirt, grime * 0.8 * ( 1.0 - glass * 0.5 ) );
  col = mix( col, uDust, smoothstep( 0.6, 0.95, vLocalNormal.y ) * vWear.z * 0.35 * ( 0.5 + wNoise( p * 8.0 ) ) );
  // Dried blood: smeared on one side and run down it.
  if ( vWear.w > 0.5 ) {
    float sideSign = fract( vWear.x * 0.37 ) > 0.5 ? 1.0 : -1.0;
    vec2 c = vec2( ( fract( vWear.x * 0.71 ) - 0.5 ) * 1.6, 1.0 );
    float facing = smoothstep( 0.4, 0.7, vLocalNormal.x * sideSign );
    float d = length( ( vec2( vLocal.z, vLocal.y ) - c ) * vec2( 1.0, 1.3 ) );
    float smear = smoothstep( 0.34, 0.2, d + ( wNoise( p * 9.0 ) - 0.5 ) * 0.3 );
    float run = smoothstep( 0.72, 0.86, wNoise( vec3( vLocal.z * 22.0, 0.0, vWear.x ) ) ) * step( vLocal.y, c.y ) * smoothstep( c.y - 0.7, c.y - 0.15, vLocal.y ) * smoothstep( 0.4, 0.1, abs( vLocal.z - c.x ) );
    col = mix( col, uBlood * ( 0.7 + 0.5 * wNoise( p * 25.0 ) ), clamp( smear + run, 0.0, 1.0 ) * facing );
  }
  // A window cracked from a point, or smashed through to the dark inside.
  if ( vWear2.w > 0.5 && glass > 0.5 ) {
    vec3 q = vLocal - vWear2.xyz;
    float r = length( q );
    float a = atan( q.y, q.z + q.x * 0.7 );
    float rays = smoothstep( 0.955, 0.99, wNoise( vec3( a * 6.0, r * 1.5, vWear.x ) ) ) * smoothstep( 0.55, 0.08, r );
    float rings = smoothstep( 0.49, 0.5, abs( fract( r * 7.0 + wNoise( vec3( a * 2.0, 0.0, vWear.x ) ) * 0.5 ) - 0.5 ) ) * smoothstep( 0.3, 0.06, r );
    col = mix( col, uCrack, clamp( rays + rings * 0.5, 0.0, 1.0 ) );
    if ( vWear2.w > 1.5 ) {
      float hole = 0.22 + 0.12 * wNoise( vec3( a * 3.0, 0.0, vWear.x ) );
      col = mix( col, vec3( 0.004 ), smoothstep( hole + 0.01, hole - 0.01, r ) );
    }
  }
  // Session 14: burnt out (vWear2.w 3): charred black and rust, the glass gone.
  if ( vWear2.w > 2.5 ) {
    float char = wNoise( p * 3.0 ) * 0.6 + wNoise( p * 11.0 ) * 0.4;
    col = mix( col * 0.12, uRust * 0.35, smoothstep( 0.45, 0.8, char ) * painted );
    col = mix( col, vec3( 0.004 ), glass );
  }
  return col;
}`;

export class VehicleRenderer {
  constructor(cfg, data, rng) {
    this.cfg = cfg;
    this.data = data;
    this.rng = rng;
  }

  // vehicles: Vehicles.js's list (placement plus state).
  init(scene, vehicles, ground) {
    const data = this.data;
    const looks = this.cfg.looks;
    this.colours = Object.fromEntries(Object.entries(data.colours).map(([k, v]) => [k, new THREE.Color(v)]));
    // Each type's lids, with the passenger door made from the driver's.
    this.lids = {};
    for (const [id, t] of Object.entries(data.types)) this.lids[id] = { ...t.lids, door2: mirrorLid(t.lids.door) };

    // The real models, built once per type, with a mesh each for the body and every lid.
    this.models = {};
    const modelCount = {};
    for (const v of vehicles) if (data.types[v.type].model) modelCount[v.type] = (modelCount[v.type] ?? 0) + 1;
    this.modelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
    const wear = looks.wear;
    this.modelMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uRust = { value: new THREE.Color(wear.rustColour) };
      shader.uniforms.uDirt = { value: new THREE.Color(wear.dirtColour) };
      shader.uniforms.uDust = { value: new THREE.Color(wear.dustColour) };
      shader.uniforms.uBlood = { value: new THREE.Color(wear.bloodColour) };
      shader.uniforms.uCrack = { value: new THREE.Color(wear.crackColour) };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${WEAR_VERTEX}`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;\nvLocalNormal = normal;\nvPaint = aPaint;\nvWear = aWear;\nvWear2 = aWear2;')
        .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n  vColor.xyz = color.xyz * mix( vec3( 1.0 ), instanceColor.xyz, step( 0.5, aPaint ) * step( aPaint, 1.5 ) );\n#endif');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\n${WEAR_FRAGMENT}`).replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = vehicleWear( diffuseColor.rgb );');
    };
    this.modelMaterial.customProgramCacheKey = () => 'vehicle-model-wear';
    for (const [id, count] of Object.entries(modelCount)) {
      const built = VEHICLE_MODELS[data.types[id].model](data.colours);
      const geometries = { body: built.body, ...built.lids, door2: mirrorGeometry(built.lids.door), ...built.extras };
      const meshes = {};
      for (const [name, g] of Object.entries(geometries)) {
        g.setAttribute('aWear', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
        g.setAttribute('aWear2', new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4));
        const mesh = new THREE.InstancedMesh(g, this.modelMaterial, count);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        meshes[name] = mesh;
      }
      this.models[id] = { meshes, geometries, extras: Object.keys(built.extras ?? {}), windows: built.windows ?? [], next: 0 };
    }

    let solids = 0;
    let wedges = 0;
    let wheels = 0;
    let lamps = 0;
    for (const v of vehicles) {
      const t = data.types[v.type];
      const model = !!t.model;
      for (const p of t.parts) {
        if (p[6] === 'tyre') wheels += 2; // a tyre and its hub
        else if (p[7] === 'wedgeF' || p[7] === 'wedgeB') wedges++;
        else solids++; // boxes and pillars
      }
      for (const name of LIDS) {
        const lid = this.lids[v.type][name];
        solids += (model ? 0 : 1 + (lid.extra?.length ?? 0)) + (lid.hollow ? 1 : 0);
      }
      solids += 2 + 1; // the battery (body and top), the engine bay
      lamps += t.lamps.length;
    }
    this.box = new THREE.BoxGeometry(1, 1, 1);
    this.wedgeGeometry = makeWedge();
    // A cylinder with its axle along x, so a part's [w, h, l] is [tread width, diameter, diameter].
    this.cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, looks.wheelSegments).rotateZ(Math.PI / 2);
    this.solidMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.solid = new THREE.InstancedMesh(this.box, this.solidMaterial, Math.max(1, solids));
    this.wedge = new THREE.InstancedMesh(this.wedgeGeometry, this.solidMaterial, Math.max(1, wedges));
    this.wheel = new THREE.InstancedMesh(this.cylinder, this.solidMaterial, Math.max(1, wheels));
    this.lamp = new THREE.InstancedMesh(this.box, this.lampMaterial, Math.max(1, lamps));
    for (const mesh of [this.solid, this.wedge, this.wheel]) mesh.castShadow = true;
    this.solid.receiveShadow = true;

    this.local = new THREE.Matrix4();
    this.tmp = new THREE.Matrix4();
    this.turn = new THREE.Matrix4().makeRotationY(Math.PI);
    this.out = new THREE.Matrix4();
    this.hidden = new THREE.Matrix4().makeScale(0, 0, 0);

    let si = 0;
    let di = 0;
    let wi = 0;
    let li = 0;
    for (const v of vehicles) {
      const t = data.types[v.type];
      const [length, width] = t.size;
      // Paint: one of the type's, a little dirtier or darker each.
      const dirt = looks.paintBrightness * (1 - this.rng.range(0, looks.dirtiness));
      const paint = new THREE.Color(this.rng.pick(t.paints)).multiplyScalar(dirt);
      const paint2 = t.paints2 ? new THREE.Color(this.rng.pick(t.paints2)).multiplyScalar(dirt) : paint;
      const flat = this.rng.chance(looks.flatTyreChance) ? looks.flatTyreTilt * (this.rng.chance(0.5) ? 1 : -1) : 0;
      // Sit on the slope: pitch from the ground under its nose and tail, roll from its sides.
      const s = Math.sin(v.yaw);
      const c = Math.cos(v.yaw);
      const h = (lx, lz) => ground.heightAt(v.x + s * lz + c * lx, v.z + c * lz - s * lx);
      const front = h(0, length / 2);
      const back = h(0, -length / 2);
      const left = h(-width / 2, 0);
      const right = h(width / 2, 0);
      const y = Math.min((front + back) / 2, (left + right) / 2, ground.heightAt(v.x, v.z)) - UP_SINK;
      const pitch = Math.atan2(back - front, length);
      const roll = Math.atan2(right - left, width) + flat;
      const base = new THREE.Matrix4().compose(
        new THREE.Vector3(v.x, y, v.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, v.yaw, roll, 'YXZ')),
        new THREE.Vector3(1, 1, 1),
      );
      const look = { base, paint, paint2, lampAt: li };
      v.look = look;
      v.groundY = y;
      const model = this.models[v.type];
      if (model) {
        look.model = model.next++;
        for (const mesh of Object.values(model.meshes)) mesh.setColorAt(look.model, paint);
        model.meshes.body.setMatrixAt(look.model, base);
        // Its extras (a toolbox, a rack), each by its chance.
        for (const name of model.extras) model.meshes[name].setMatrixAt(look.model, this.rng.chance(t.extras?.[name] ?? 0) ? base : this.hidden);
        // Its wear.
        const w = this.rollWear(t, model.windows);
        for (const g of Object.values(model.geometries)) {
          g.attributes.aWear.setXYZW(look.model, ...w.wear);
          g.attributes.aWear2.setXYZW(look.model, ...w.wear2);
        }
      }

      for (const part of t.parts) {
        if (part[6] === 'tyre') {
          const [w, d, , x, py, z] = part;
          this.setBox(this.wheel, wi, base, part);
          this.wheel.setColorAt(wi++, this.colours.tyre);
          this.setBox(this.wheel, wi, base, [w + 0.03, d * looks.hubSize, d * looks.hubSize, x, py, z]);
          this.wheel.setColorAt(wi++, this.colours.hub);
        } else if (part[7] === 'wedgeF' || part[7] === 'wedgeB') {
          this.setBox(this.wedge, di, base, part, part[7] === 'wedgeB');
          this.wedge.setColorAt(di++, this.resolve(part[6], look));
        } else if (part[7] === 'pillarF' || part[7] === 'pillarB') {
          this.setPillar(si, base, part, part[7] === 'pillarB');
          this.solid.setColorAt(si++, this.resolve(part[6], look));
        } else {
          this.setBox(this.solid, si, base, part);
          this.solid.setColorAt(si++, this.resolve(part[6], look));
        }
      }
      // The engine bay under the bonnet (hidden by it while it's shut).
      const b = t.lids.bonnet.box;
      this.setBox(this.solid, si, base, [b[0] - 0.12, 0.02, b[2] - 0.12, b[3], b[4] - b[1] / 2 - 0.005, b[5]]);
      this.solid.setColorAt(si++, this.colours.bay);
      // Lids: the lid, what swings with it, then the hollow behind it.
      look.lids = {};
      for (const name of LIDS) {
        const lid = this.lids[v.type][name];
        const at = { lid: -1, extra: [], hollow: -1 };
        if (!model) {
          at.lid = si;
          this.solid.setColorAt(si++, this.resolve(lid.colour, look));
          for (const e of lid.extra ?? []) {
            at.extra.push(si);
            this.solid.setColorAt(si++, this.resolve(e[6], look));
          }
        }
        if (lid.hollow) {
          at.hollow = si;
          this.solid.setColorAt(si++, this.colours.hollow);
        }
        look.lids[name] = at;
      }
      look.battery = si;
      this.solid.setColorAt(si++, this.colours.battery);
      this.solid.setColorAt(si++, this.colours.batteryTop);
      look.lampKeys = [];
      for (const lamp of t.lamps) {
        this.setBox(this.lamp, li, base, lamp);
        this.lamp.setColorAt(li++, this.colours[lamp[6]]);
        look.lampKeys.push(lamp[6]);
      }
      look.lampsOn = false;
      this.refresh(v);
    }
    const modelMeshes = Object.values(this.models).flatMap((m) => Object.values(m.meshes));
    for (const m of Object.values(this.models)) {
      for (const g of Object.values(m.geometries)) {
        g.attributes.aWear.needsUpdate = true;
        g.attributes.aWear2.needsUpdate = true;
      }
    }
    for (const mesh of [this.solid, this.wedge, this.wheel, this.lamp, ...modelMeshes]) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.group = new THREE.Group();
    this.group.add(this.solid, this.wedge, this.wheel, this.lamp, ...modelMeshes);
    scene.add(this.group);
  }

  // One vehicle's wear, from the looks' rng: { wear: [seed, rust, dirt,
  // blood], wear2: [x, y, z, 0 none | 1 cracked | 2 smashed] }.
  rollWear(type, windows) {
    const c = this.cfg.looks.wear;
    const rng = this.rng;
    const rust = Math.pow(rng.range(0, 1), c.rustSkew) * c.rust * (type.rust ?? 1);
    const dirt = rng.range(c.dirt[0], c.dirt[1]);
    const blood = rng.chance(c.bloodChance) ? 1 : 0;
    const seed = rng.range(0, 97);
    let wear2 = [0, 0, 0, 0];
    if (windows.length && rng.chance(c.crackChance)) wear2 = [...rng.pick(windows), rng.chance(c.smashedShare) ? 2 : 1];
    return { wear: [seed, rust, dirt, blood], wear2 };
  }

  resolve(key, look) {
    if (key === 'body') return look.paint;
    if (key === 'body2') return look.paint2;
    return this.colours[key] ?? this.colours.trim;
  }

  // A shape [w, h, l, x, y, z] in the vehicle's frame, placed by `base`
  // (turned to face backward when `turned`: a rear window's wedge).
  setBox(mesh, index, base, [w, h, l, x, y, z], turned = false) {
    this.local.makeTranslation(x, y, z);
    if (turned) this.local.multiply(this.turn);
    this.local.multiply(this.tmp.makeScale(w, h, l));
    mesh.setMatrixAt(index, this.out.multiplyMatrices(base, this.local));
  }

  // A windscreen pillar: a thin bar down the slope of the wedge whose
  // bounds are [w, h, l, x, y, z] (w: the pillar's width), sitting just
  // proud of the glass. rear: along a rear window's slope instead.
  setPillar(index, base, [w, h, l, x, y, z], rear) {
    const t = this.cfg.looks.pillarThickness;
    const angle = Math.atan2(h, l); // the slope, from horizontal
    const length = Math.hypot(h, l);
    // Out from the glass: up and forward on a windscreen, up and back on a rear window.
    const ny = Math.cos(angle) * (t / 2);
    const nz = Math.sin(angle) * (t / 2) * (rear ? -1 : 1);
    this.local.makeTranslation(x, y + ny, z + nz);
    this.local.multiply(this.tmp.makeRotationX(rear ? -angle : angle));
    this.local.multiply(this.tmp.makeScale(w, t, length));
    this.solid.setMatrixAt(index, this.out.multiplyMatrices(base, this.local));
  }

  // Session 14: the car's burnt out: charred paint, the glass gone, its
  // wheels and boxes (the stand-ins) blackened.
  setBurnt(v, colour) {
    const model = this.models[v.type];
    if (!model) return;
    const c = new THREE.Color(colour);
    for (const mesh of Object.values(model.meshes)) {
      mesh.setColorAt(v.look.model, c);
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (const g of Object.values(model.geometries)) {
      const w = g.attributes.aWear;
      w.setXYZW(v.look.model, w.getX(v.look.model), 1, 1, 0);
      g.attributes.aWear2.setXYZW(v.look.model, 0, 0, 0, 3);
      w.needsUpdate = true;
      g.attributes.aWear2.needsUpdate = true;
    }
  }

  // Redraw a vehicle's moving parts: lids at their open amounts (with
  // the hollow behind any that's open), the battery while the bonnet's
  // up and it's still there.
  refresh(v) {
    const look = v.look;
    const lids = this.lids[v.type];
    const model = this.models[v.type];
    for (const name of LIDS) {
      const lid = lids[name];
      const at = look.lids[name];
      const amount = v.open[name] ?? 0;
      if (model) {
        const mesh = model.meshes[name];
        mesh.setMatrixAt(look.model, this.lidMatrix(look.base, lid, amount, null, this.out));
        mesh.instanceMatrix.needsUpdate = true;
      } else {
        this.solid.setMatrixAt(at.lid, this.lidMatrix(look.base, lid, amount, lid.box, this.out));
        (lid.extra ?? []).forEach((e, k) => this.solid.setMatrixAt(at.extra[k], this.lidMatrix(look.base, lid, amount, e, this.out)));
      }
      if (at.hollow >= 0) {
        if (amount > 0.02) this.setBox(this.solid, at.hollow, look.base, lid.hollow);
        else this.solid.setMatrixAt(at.hollow, this.hidden);
      }
    }
    const t = this.data.types[v.type];
    if (v.open.bonnet > 0.6 && v.hasBattery) {
      const [bx, by, bz] = t.batteryAt;
      this.setBox(this.solid, look.battery, look.base, [0.26, 0.2, 0.34, bx, by + 0.1, bz]);
      this.setBox(this.solid, look.battery + 1, look.base, [0.2, 0.03, 0.28, bx, by + 0.215, bz]);
    } else {
      this.solid.setMatrixAt(look.battery, this.hidden);
      this.solid.setMatrixAt(look.battery + 1, this.hidden);
    }
    this.solid.instanceMatrix.needsUpdate = true;
  }

  // The matrix of `shape` ([w, h, l, x, y, z], the lid itself or something
  // that swings with it), turned about the lid's hinge by angle x amount.
  // shape null: a model's lid (built in place), turned about the hinge.
  lidMatrix(base, lid, amount, shape, out) {
    const [, h, l, x, y, z] = lid.box;
    const a = lid.angle * amount;
    let hx = 0;
    let hy = y;
    let hz = z;
    const rot = this.tmp;
    switch (lid.hinge) {
      case 'back': // a bonnet: hinged at its back edge, the front lifts
        hy = y + h / 2;
        hz = z - l / 2;
        rot.makeRotationX(-a);
        break;
      case 'front': // a boot lid: hinged at its front edge, the back lifts
        hy = y + h / 2;
        hz = z + l / 2;
        rot.makeRotationX(a);
        break;
      case 'bottom': // a tailgate drops outward
        hy = y - h / 2;
        rot.makeRotationX(-a);
        break;
      case 'top': // a canvas flap swings out and up
        hy = y + h / 2;
        rot.makeRotationX(a);
        break;
      case 'frontSide': // the driver's door: hinged at its front edge, swings out to the left
        hx = x;
        hz = z + l / 2;
        rot.makeRotationY(a);
        break;
      case 'frontSideR': // the passenger door: swings out to the right
        hx = x;
        hz = z + l / 2;
        rot.makeRotationY(-a);
        break;
      default:
        rot.identity();
    }
    if (!shape) return out.copy(base).multiply(this.local.makeTranslation(hx, hy, hz)).multiply(rot).multiply(this.local.makeTranslation(-hx, -hy, -hz));
    const [sw, sh, sl, sx, sy, sz] = shape;
    out.copy(base).multiply(this.local.makeTranslation(hx, hy, hz)).multiply(rot);
    out.multiply(this.local.makeTranslation(sx - hx, sy - hy, sz - hz)).multiply(this.local.makeScale(sw, sh, sl));
    return out;
  }

  // An alarm flashes its lamps.
  setLamps(v, on) {
    const look = v.look;
    if (look.lampsOn === on) return;
    look.lampsOn = on;
    look.lampKeys.forEach((key, k) => this.lamp.setColorAt(look.lampAt + k, this.colours[on ? `${key}On` : key] ?? this.colours[key]));
    this.lamp.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.group?.removeFromParent();
    this.box?.dispose();
    this.wedgeGeometry?.dispose();
    this.cylinder?.dispose();
    this.solidMaterial?.dispose();
    this.lampMaterial?.dispose();
    this.solid?.dispose();
    this.wedge?.dispose();
    this.wheel?.dispose();
    this.lamp?.dispose();
    for (const m of Object.values(this.models ?? {})) {
      for (const mesh of Object.values(m.meshes)) mesh.dispose();
      for (const g of Object.values(m.geometries)) g.dispose();
    }
    this.modelMaterial?.dispose();
  }
}
