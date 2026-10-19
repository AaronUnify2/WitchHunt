// The opening cluster's road, drawn (M9.1): a strip of old asphalt laid
// over the ground along the road's centre line, with a worn dashed centre
// line and faded edge lines; telephone poles along one side with sagging
// wires between them; and the closed-road sign before the checkpoint.
// The asphalt is drawn in code at load (Aaron: art stays in code), from a
// fixed seed, so the road looks the same every run. The strip is a few
// meshes (one per stretch, culled with distance), the poles one instanced
// mesh, the wires one set of lines. No lights.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { css, makeCanvas, toTexture } from './proceduralTextures.js';
import { makeSignTexture } from './mapTextures.js';
import { ChunkCuller } from './ChunkCuller.js';
import { roadProps } from '../world/road.js';
import { Rng } from '../core/Rng.js';

const STRETCH = 64; // metres of road per mesh, for culling

// The asphalt: across the canvas is across the road, down it is along it.
function makeAsphaltTexture(cfg, rng) {
  const [w, h] = cfg.textureSize;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = css(cfg.color);
  ctx.fillRect(0, 0, w, h);
  // Mottling and grit.
  for (let i = 0; i < 520; i++) {
    const r = rng.range(6, 40);
    ctx.fillStyle = css(rng.chance(0.5) ? 0x000000 : 0xffffff, rng.range(0.02, 0.05));
    ctx.beginPath();
    ctx.arc(rng.range(0, w), rng.range(0, h), r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 10000; i++) {
    ctx.fillStyle = css(rng.chance(0.5) ? 0x1a1a1a : 0x8a8680, rng.range(0.15, 0.45));
    ctx.fillRect(rng.range(0, w), rng.range(0, h), 1.5, 1.5);
  }
  // Old tar patches: a few soft, uneven blobs of overlapping strips.
  for (let i = 0; i < 3; i++) {
    const px = rng.range(w * 0.15, w * 0.85);
    const py = rng.range(h * 0.1, h * 0.9);
    const pw = rng.range(w * 0.12, w * 0.3);
    const ph = rng.range(h * 0.02, h * 0.06);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = css(cfg.patchColor, rng.range(0.25, 0.45));
      ctx.fillRect(px + rng.range(-pw, pw) * 0.3, py + rng.range(-ph, ph) * 0.5, pw * rng.range(0.6, 1), ph * rng.range(0.6, 1));
    }
  }
  // Paint: faded edge lines and the dashed centre line (one dash per tile).
  const paint = (color, x, y, pw, ph) => {
    ctx.fillStyle = css(color, 0.85);
    ctx.fillRect(x, y, pw, ph);
  };
  paint(cfg.edgeLineColor, w * 0.04, 0, w * 0.025, h);
  paint(cfg.edgeLineColor, w * 0.935, 0, w * 0.025, h);
  // Two dashes per tile (a tile is textureMeters long).
  paint(cfg.lineColor, w * 0.485, h * 0.05, w * 0.03, h * 0.19);
  paint(cfg.lineColor, w * 0.485, h * 0.55, w * 0.03, h * 0.19);
  // Wear: the paint chipped away in flecks and gaps.
  for (let i = 0; i < 2800 * cfg.lineWear; i++) {
    ctx.fillStyle = css(cfg.color, rng.range(0.6, 1));
    const x = rng.chance(0.5) ? w * rng.range(0.47, 0.53) : rng.chance(0.5) ? w * rng.range(0.03, 0.075) : w * rng.range(0.925, 0.97);
    ctx.fillRect(x, rng.range(0, h), rng.range(2, 6), rng.range(2, 14));
  }
  // Cracks: wandering dark lines, mostly along the road, a few across.
  ctx.strokeStyle = css(cfg.crackColor, 0.9);
  ctx.lineCap = 'round';
  for (let i = 0; i < 28; i++) {
    ctx.lineWidth = rng.range(1, 2.5);
    let x = rng.range(0, w);
    let y = rng.range(0, h);
    const across = rng.chance(0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 12; k++) {
      x += across ? rng.range(6, 18) : rng.range(-8, 8);
      y += across ? rng.range(-6, 6) : rng.range(8, 26);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // The edges crumble into the gravel.
  for (let i = 0; i < 1200; i++) {
    const left = rng.chance(0.5);
    const x = left ? rng.range(0, w * 0.035) : rng.range(w * 0.965, w);
    ctx.fillStyle = css(0x5a5044, rng.range(0.4, 0.9));
    ctx.fillRect(x, rng.range(0, h), rng.range(2, 5), rng.range(2, 5));
  }
  const texture = toTexture(canvas, { repeat: true });
  texture.anisotropy = 4;
  return texture;
}

export class Road {
  // cfg: config.map.road. landmarkCfg: config.landmarks (sign sizes).
  constructor(cfg, landmarkCfg, seed) {
    this.cfg = cfg;
    this.landmarkCfg = landmarkCfg;
    this.rng = new Rng(`${seed}:road`);
  }

  init(scene, colliders, road, ground) {
    const c = this.cfg;
    this.group = new THREE.Group();
    this.culler = new ChunkCuller(STRETCH * 2, 8);
    this.texture = makeAsphaltTexture(c, this.rng.fork('asphalt'));
    this.material = new THREE.MeshLambertMaterial({ map: this.texture, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.geometries = [];
    this.buildStrip(road, ground);
    const props = roadProps(road, c);
    this.buildPoles(props.poles, ground, colliders);
    this.buildSign(props.sign, ground, colliders);
    scene.add(this.group);
  }

  // The asphalt, draped over the ground: one mesh per stretch.
  buildStrip(road, ground) {
    const c = this.cfg;
    const { points, along } = road;
    const per = Math.max(2, Math.round(STRETCH / c.sample));
    for (let start = 0; start < points.length - 1; start += per) {
      const end = Math.min(points.length - 1, start + per);
      const cols = c.across + 1;
      const rows = end - start + 1;
      const positions = new Float32Array(cols * rows * 3);
      const uvs = new Float32Array(cols * rows * 2);
      let v = 0;
      for (let i = start; i <= end; i++) {
        const a = points[Math.max(0, i - 1)];
        const b = points[Math.min(points.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        const rx = (b.z - a.z) / len; // right of the heading
        const rz = -(b.x - a.x) / len;
        for (let k = 0; k < cols; k++) {
          const off = (k / c.across - 0.5) * c.width;
          const x = points[i].x + rx * off;
          const z = points[i].z + rz * off;
          positions[v * 3] = x;
          positions[v * 3 + 1] = ground.heightAt(x, z) + c.lift;
          positions[v * 3 + 2] = z;
          uvs[v * 2] = k / c.across;
          uvs[v * 2 + 1] = along[i] / c.textureMeters;
          v++;
        }
      }
      const indices = [];
      for (let j = 0; j < rows - 1; j++) {
        for (let k = 0; k < cols - 1; k++) {
          const p = j * cols + k;
          indices.push(p, p + cols, p + 1, p + 1, p + cols, p + cols + 1); // wound to face up
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
      this.geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      const s = geometry.boundingSphere;
      this.culler.add(mesh, s.center.x, s.center.z, s.radius);
    }
  }

  // Telephone poles (a pole and its crossbar, instanced) and the wires.
  buildPoles(poles, ground, colliders) {
    const pc = this.cfg.poles;
    const pole = new THREE.CylinderGeometry(pc.radius * 0.8, pc.radius, pc.height, 7).translate(0, pc.height / 2, 0);
    const bar = new THREE.BoxGeometry(pc.crossbar, 0.12, 0.12).translate(0, pc.height - 0.5, 0);
    const geometry = mergeGeometries([pole.toNonIndexed(), bar.toNonIndexed()]);
    pole.dispose();
    bar.dispose();
    this.geometries.push(geometry);
    this.poleMaterial = new THREE.MeshLambertMaterial({ color: pc.color });
    this.poles = new THREE.InstancedMesh(geometry, this.poleMaterial, poles.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const wire = [];
    let prev = null;
    poles.forEach((p, i) => {
      const y = ground.heightAt(p.x, p.z);
      // A pole leans a little, like old ones do; the crossbar runs across the road.
      q.setFromAxisAngle(up, p.yaw);
      const lean = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.rng.range(-0.03, 0.03));
      m.compose(new THREE.Vector3(p.x, y, p.z), q.multiply(lean), new THREE.Vector3(1, 1, 1));
      this.poles.setMatrixAt(i, m);
      colliders.insert({ x: p.x, z: p.z, r: pc.radius * 1.6, top: y + pc.height });
      // Two wires, at the crossbar's ends.
      const ends = [-0.4, 0.4].map((s) => ({
        x: p.x + Math.sin(p.yaw + Math.PI / 2) * pc.crossbar * s,
        y: y + pc.height - 0.42,
        z: p.z + Math.cos(p.yaw + Math.PI / 2) * pc.crossbar * s,
      }));
      if (prev) {
        for (let w = 0; w < 2; w++) {
          const a = prev[w];
          const b = ends[w];
          for (let k = 0; k < pc.wireSegments; k++) {
            for (const t of [k / pc.wireSegments, (k + 1) / pc.wireSegments]) {
              const sag = 4 * pc.wireSag * t * (1 - t);
              wire.push(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - sag, a.z + (b.z - a.z) * t);
            }
          }
        }
      }
      prev = ends;
    });
    this.poles.castShadow = true;
    this.poles.computeBoundingSphere();
    this.group.add(this.poles);
    const wireGeometry = new THREE.BufferGeometry();
    wireGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wire, 3));
    wireGeometry.computeBoundingSphere();
    this.geometries.push(wireGeometry);
    this.wireMaterial = new THREE.LineBasicMaterial({ color: pc.wireColor });
    this.wires = new THREE.LineSegments(wireGeometry, this.wireMaterial);
    this.group.add(this.wires);
  }

  // ROAD CLOSED: a painted board on two posts, facing the way in.
  buildSign(sign, ground, colliders) {
    const s = this.cfg.sign;
    const l = this.landmarkCfg;
    const y = ground.heightAt(sign.x, sign.z);
    this.signTexture = makeSignTexture({ ...l, ...s }, s.title, s.lines);
    this.signFace = new THREE.MeshLambertMaterial({ map: this.signTexture });
    this.signEdge = new THREE.MeshLambertMaterial({ color: l.postColor });
    const board = new THREE.BoxGeometry(l.boardWidth, l.boardHeight, l.boardDepth);
    const post = new THREE.BoxGeometry(l.postWidth, l.postHeight - l.boardDrop, l.postWidth).translate(0, (l.postHeight - l.boardDrop) / 2, 0);
    this.geometries.push(board, post);
    const holder = new THREE.Group();
    holder.position.set(sign.x, y, sign.z);
    holder.rotation.y = sign.yaw;
    const face = new THREE.Mesh(board, [this.signEdge, this.signEdge, this.signEdge, this.signEdge, this.signFace, this.signEdge]);
    face.position.set(0, l.postHeight - l.boardHeight / 2 - l.boardDrop, 0);
    face.castShadow = true;
    holder.add(face);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(post, this.signEdge);
      p.position.set(side * l.boardWidth * 0.38, 0, -l.boardDepth);
      p.castShadow = true;
      holder.add(p);
    }
    this.group.add(holder);
    colliders.insert({ x: sign.x, z: sign.z, r: l.postWidth * 2, vr: l.boardWidth / 2, top: y + l.postHeight });
  }

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance);
  }

  dispose() {
    for (const g of this.geometries) g.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.poleMaterial.dispose();
    this.wireMaterial.dispose();
    this.signTexture.dispose();
    this.signFace.dispose();
    this.signEdge.dispose();
    this.group.removeFromParent();
  }
}
