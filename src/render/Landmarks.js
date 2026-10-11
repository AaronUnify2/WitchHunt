// Signposts standing in for what each clearing will hold (M3 placeholders):
// a wooden post and a two-sided board naming the encounter, sigil ground
// or clearing type, and the milestone that builds it for real. One shared
// post mesh (instanced); each board has its own painted texture and is
// only drawn when near.

import * as THREE from 'three';
import { makeSignTexture } from './mapTextures.js';
import { ChunkCuller } from './ChunkCuller.js';

// The board's title and smaller lines for a clearing.
export function signText(clearing, typeName) {
  const type = typeName ? `${typeName} clearing` : null;
  switch (clearing.kind) {
    case 'home':
      return { title: 'RANGER STATION', lines: ['U.S. Forest Service', 'Fire lookout'] }; // built in M5
    case 'hut':
      return { title: "WITCH'S HUT", lines: [`Built in ${clearing.builtIn}`, 'Placeholder'] };
    case 'sigilGround':
      return { title: clearing.name.toUpperCase(), lines: ['Sigil ground (placeholder)', type] };
    case 'encounter':
      return { title: clearing.name.toUpperCase(), lines: [`Encounter: built in ${clearing.builtIn}`, type] };
    default:
      return { title: (typeName ?? 'Clearing').toUpperCase(), lines: ['Clearing', clearing.band] };
  }
}

export class Landmarks {
  constructor(landmarkConfig) {
    this.cfg = landmarkConfig;
  }

  // typeNames: clearing type id -> display name.
  init(scene, colliders, map, ground, typeNames) {
    const c = this.cfg;
    this.group = new THREE.Group();
    this.culler = new ChunkCuller(c.cullCell, c.cullRefreshDistance);
    this.textures = [];
    this.materials = [];
    const clearings = map.clearings;

    // The post stops just inside the board's bottom edge, so it never covers the lettering.
    const postTop = c.postHeight - c.boardDrop - c.boardHeight + c.postOverlap;
    const postGeometry = new THREE.BoxGeometry(c.postWidth, postTop, c.postWidth).translate(0, postTop / 2, 0);
    this.postMaterial = new THREE.MeshLambertMaterial({ color: c.postColor });
    this.posts = new THREE.InstancedMesh(postGeometry, this.postMaterial, clearings.length);
    this.boardGeometry = new THREE.BoxGeometry(c.boardWidth, c.boardHeight, c.boardDepth);
    this.edgeMaterial = new THREE.MeshLambertMaterial({ color: c.postColor });

    const matrix = new THREE.Matrix4();
    clearings.forEach((cl, i) => {
      // A little off-centre so it doesn't stand where paths cross the middle.
      const x = cl.x + c.offset;
      const z = cl.z - c.offset;
      const y = ground.heightAt(x, z);
      matrix.makeTranslation(x, y, z);
      this.posts.setMatrixAt(i, matrix);
      // r: the post blocks movement and shots. vr and top: the torch's glare
      // check sees the whole board, so the beam dims on it up close instead
      // of burning a hot spot (as the rocks did in M1).
      colliders.insert({ x, z, r: c.postWidth, vr: c.boardWidth / 2, top: y + c.postHeight });

      const text = signText(cl, typeNames[cl.clearingType]);
      const texture = makeSignTexture(c, text.title, text.lines.filter(Boolean));
      const face = new THREE.MeshLambertMaterial({ map: texture });
      this.textures.push(texture);
      this.materials.push(face);
      // Box faces: +x, -x, +y, -y, +z (front), -z (back).
      const board = new THREE.Mesh(this.boardGeometry, [this.edgeMaterial, this.edgeMaterial, this.edgeMaterial, this.edgeMaterial, face, face]);
      board.position.set(x, y + c.postHeight - c.boardHeight / 2 - c.boardDrop, z);
      board.castShadow = true;
      this.group.add(board);
      this.culler.add(board, x, z, c.boardWidth);
    });
    this.posts.castShadow = true;
    this.posts.computeBoundingSphere();
    this.group.add(this.posts);
    scene.add(this.group);
  }

  update(dt, cameraPosition) {
    this.culler.update(cameraPosition.x, cameraPosition.z);
  }

  setDrawDistance(distance) {
    this.culler.setDrawDistance(distance);
  }

  dispose() {
    this.posts.geometry.dispose();
    this.postMaterial.dispose();
    this.boardGeometry.dispose();
    this.edgeMaterial.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    this.group.removeFromParent();
  }
}
