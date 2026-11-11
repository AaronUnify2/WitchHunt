// A set built as one mesh with a matrix stack (Session 24's crashed plane;
// shared since Session 26, for the old church). Pieces go in by colour (the
// look's colours), in tilted sub-assemblies with their own frames (push /
// pushOnGround / pop), on the real ground (heightAt), and the set's
// colliders and named spots are collected through the same frames. Bake
// `parts` with propKit's bakeParts() into one vertex-coloured geometry.
//
// new SetBuilder(look, heightAt, seed): look.colors names the colours;
// heightAt(x, z) is the ground under a point of the model (flat if left out).

import * as THREE from 'three';

export class SetBuilder {
  constructor(look, heightAt, seed = 24) {
    this.c = look.colors;
    this.heightAt = heightAt ?? (() => 0);
    this.parts = new Map();
    this.stack = [new THREE.Matrix4()];
    this.spots = {};
    this.colliders = [];
    this.seed = seed;
  }

  rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  get m() {
    return this.stack[this.stack.length - 1];
  }

  // A frame inside the current one: at (x, y, z), turned yaw, then pitched (rotX), then rolled (rotZ).
  push(x, y, z, yaw = 0, rotX = 0, rotZ = 0) {
    const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, yaw, rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1));
    this.stack.push(this.m.clone().multiply(local));
  }

  // A frame standing on the ground at (x, z), h above it.
  pushOnGround(x, h, z, yaw = 0, rotX = 0, rotZ = 0) {
    this.push(x, this.heightAt(x, z) + h, z, yaw, rotX, rotZ);
  }

  pop() {
    this.stack.pop();
  }

  put(geo, color, x = 0, y = 0, z = 0, yaw = 0, rotX = 0, rotZ = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, yaw, rotZ, 'YXZ')), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(this.m.clone().multiply(local));
    if (!this.parts.has(color)) this.parts.set(color, []);
    this.parts.get(color).push(g);
  }

  // A box centred at (x, y, z).
  box(w, h, d, color, x, y, z, yaw = 0, rotX = 0, rotZ = 0) {
    this.put(new THREE.BoxGeometry(w, h, d), color, x, y, z, yaw, rotX, rotZ);
  }

  // A tube along z from z0 to z1 (radius r0 at z0, r1 at z1), open ended.
  tubeZ(r0, r1, z0, z1, color, x = 0, y = 0, radial = 12, open = true) {
    const g = new THREE.CylinderGeometry(r1, r0, z1 - z0, radial, 1, open).rotateX(Math.PI / 2);
    this.put(g, color, x, y, (z0 + z1) / 2);
  }

  // A point of the current frame, in model space.
  point(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.m);
  }

  spot(name, x, y, z) {
    const p = this.point(x, y, z);
    this.spots[name] = { x: p.x, y: p.y, z: p.z };
  }

  // A thick wall along the current frame's line (ax, az)-(bx, bz) at height y.
  wall(ax, az, bx, bz, y, t, top, blocksShots = true) {
    const a = this.point(ax, y, az);
    const b = this.point(bx, y, bz);
    this.colliders.push({ seg: true, ax: a.x, az: a.z, bx: b.x, bz: b.z, t, top, blocksShots });
  }

  post(x, y, z, r, top) {
    const p = this.point(x, y, z);
    this.colliders.push({ x: p.x, z: p.z, r, top });
  }
}
