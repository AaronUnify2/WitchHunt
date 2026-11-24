// Nov 24 (Aaron: "the creepiest scarecrow possible" in the Pruitts' kitchen garden).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildScarecrow, outOfView } from '../src/render/scarecrowModel.js';
import { PruittFarm, scarecrowTurn } from '../src/encounters/PruittFarm.js';
import { config } from '../src/config.js';

const sc = config.pruittFarm.scarecrow;

describe('the scarecrow (Nov 24)', () => {
  it('builds: a body and a head on a turning neck, lolled, its feet off the ground, taller than a man', () => {
    const s = buildScarecrow(sc);
    s.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s.group);
    expect(box.max.y).toBeGreaterThan(2.6); // antlers and post over a man's head
    expect(s.neck.children[0].rotation.z).toBeGreaterThan(0.3); // the loll
    expect(s.head.geometry.getAttribute('color')).toBeDefined();
    s.dispose();
  });

  it('sits at the garden\'s far end, facing back across it', () => {
    expect(sc.at[1]).toBeGreaterThan(16);
    expect(Math.abs(sc.yaw)).toBeCloseTo(Math.PI, 5);
  });

  it('turns its neck the short way, no further than maxYaw', () => {
    expect(scarecrowTurn(0.5, 0, 2.5)).toBeCloseTo(0.5);
    expect(scarecrowTurn(Math.PI - 0.1, 0, 2.5)).toBeCloseTo(2.5); // behind it: held to its limit
    expect(scarecrowTurn(-3, 3, 2.5)).toBeCloseTo(2 * Math.PI - 6); // across the wrap
  });

  it('knows when a point is out of the camera\'s view', () => {
    const cam = new THREE.PerspectiveCamera(70, 1.6, 0.1, 100);
    cam.position.set(0, 1.7, 0);
    cam.lookAt(0, 1.7, -10);
    cam.updateMatrixWorld();
    expect(outOfView(cam, 0, 1.7, -10)).toBe(false); // straight ahead
    expect(outOfView(cam, 0, 1.7, 10)).toBe(true); // behind
    expect(outOfView(cam, 30, 1.7, -2)).toBe(true); // far off to the side
  });

  it('only turns while Tom is not looking at it', () => {
    const farm = Object.create(PruittFarm.prototype);
    const s = buildScarecrow(sc);
    const scene = new THREE.Scene();
    scene.add(s.group);
    s.group.position.set(0, 0, 0);
    s.group.rotation.y = Math.PI; // facing -z
    scene.updateMatrixWorld(true);
    const cam = new THREE.PerspectiveCamera(70, 1.6, 0.1, 100);
    Object.assign(farm, { fc: config.pruittFarm, scarecrow: s, player: { position: new THREE.Vector3(6, 0, -6), camera: cam } });
    cam.position.set(6, 1.7, -6);
    cam.lookAt(0, 2.2, 0); // watching it
    farm.turnScarecrow();
    expect(s.neck.rotation.y).toBe(0);
    cam.lookAt(12, 1.7, -12); // looked away
    farm.turnScarecrow();
    const want = scarecrowTurn(Math.atan2(6, -6), Math.PI, sc.headTurn.maxYaw);
    expect(s.neck.rotation.y).toBeCloseTo(want, 1); // (measured from the neck, which leans with the post)
    farm.player.position.set(-60, 0, 0); // far off: left be
    cam.position.set(-60, 1.7, 0);
    s.neck.rotation.y = 0;
    farm.turnScarecrow();
    expect(s.neck.rotation.y).toBe(0);
    s.dispose();
  });
});
