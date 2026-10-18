import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { startOrbit, stepOrbit, orbitPoints, loopTime, cycle, wrapAngle } from '../src/debug/viewerOrbit.js';
import { VIEWER_MODELS, variantNames } from '../src/debug/viewerModels.js';
import { countStats } from '../src/debug/ModelViewer.js';
import { Rng } from '../src/core/Rng.js';

const vc = config.modelViewer;

describe('model viewer orbit', () => {
  it('starts in front of the model, framed by its height', () => {
    const o = startOrbit(2, 0.5, vc.start);
    expect(o.yaw).toBe(0.5);
    expect(o.distance).toBeCloseTo(2 * vc.start.distanceScale + vc.start.distanceAdd);
    expect(o.height).toBeCloseTo(2 * vc.start.heightScale);
  });

  it('puts the camera on +z at yaw 0, looking at the target', () => {
    const o = { yaw: 0, pitch: 0, distance: 4, height: 1 };
    const { target, camera } = orbitPoints(o, 10, 2, -5);
    expect(target).toEqual({ x: 10, y: 3, z: -5 });
    expect(camera.x).toBeCloseTo(10);
    expect(camera.y).toBeCloseTo(3);
    expect(camera.z).toBeCloseTo(-1);
  });

  it('keeps the distance from the target whatever the pitch', () => {
    const o = { yaw: 1.2, pitch: 0.7, distance: 5, height: 1 };
    const { target, camera } = orbitPoints(o, 0, 0, 0);
    expect(Math.hypot(camera.x - target.x, camera.y - target.y, camera.z - target.z)).toBeCloseTo(5);
  });

  it('clamps pitch, distance and height to the limits', () => {
    const o = startOrbit(1.8, 0, vc.start);
    const speeds = { zoom: vc.zoomSpeed, raise: vc.raiseSpeed };
    for (let i = 0; i < 200; i++) stepOrbit(o, { turn: 0, tilt: 1, zoom: 1, raise: 1 }, 0.1, vc.limits, speeds);
    expect(o.pitch).toBe(vc.limits.pitchMax);
    expect(o.distance).toBe(vc.limits.distanceMin);
    expect(o.height).toBe(vc.limits.heightMax);
    for (let i = 0; i < 400; i++) stepOrbit(o, { turn: 0, tilt: -1, zoom: -1, raise: -1 }, 0.1, vc.limits, speeds);
    expect(o.pitch).toBe(vc.limits.pitchMin);
    expect(o.distance).toBe(vc.limits.distanceMax);
    expect(o.height).toBe(vc.limits.heightMin);
  });

  it('wraps the yaw as it turns', () => {
    const o = { yaw: 3, pitch: 0, distance: 3, height: 1 };
    stepOrbit(o, { turn: -1, tilt: 0, zoom: 0, raise: 0 }, 0.016, vc.limits, { zoom: 1, raise: 1 });
    expect(o.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(o.yaw).toBeLessThan(Math.PI);
    expect(wrapAngle(4 * Math.PI + 0.25)).toBeCloseTo(0.25);
  });

  it('loops pose time and cycles lists both ways', () => {
    expect(loopTime(5.5, 2)).toBeCloseTo(1.5);
    expect(loopTime(-0.5, 2)).toBeCloseTo(1.5);
    expect(loopTime(3, 0)).toBe(0);
    expect(cycle(2, 3, 1)).toBe(0);
    expect(cycle(0, 3, -1)).toBe(2);
    expect(cycle(5, 3, 0)).toBe(2);
    expect(cycle(0, 0, 1)).toBe(0);
  });
});

describe('model viewer catalogue', () => {
  it('has unique ids and well-formed entries', () => {
    const ids = new Set();
    for (const e of VIEWER_MODELS) {
      expect(ids.has(e.id)).toBe(false);
      ids.add(e.id);
      expect(e.name).toBeTruthy();
      expect(e.poses.length).toBeGreaterThan(0);
      expect(new Set(e.poses.map((p) => p.id)).size).toBe(e.poses.length);
      const variants = variantNames(e, config);
      for (let v = 0; v < Math.max(1, variants.length); v++) expect(e.height(config, v)).toBeGreaterThan(0);
      expect(typeof e.create).toBe('function');
    }
  });

  it('has the opening encounters’ characters', () => {
    const ids = VIEWER_MODELS.map((e) => e.id);
    for (const id of ['zombie', 'mutant', 'witch', 'family']) expect(ids).toContain(id);
  });

  // The zombie needs a canvas (its atlas), so it's checked in the
  // browser; the rest build and pose here.
  for (const id of ['mutant', 'witch', 'family', 'grey', 'beetle', 'mib', 'agent', 'standIns']) {
    it(`builds the ${id} and plays every pose and variant`, () => {
      const entry = VIEWER_MODELS.find((e) => e.id === id);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      camera.position.set(0, 1.5, 4);
      const inst = entry.create({ scene, cfg: config, rng: new Rng(1) });
      const variants = Math.max(1, variantNames(entry, config).length);
      for (let variant = 0; variant < variants; variant++) {
        for (const pose of entry.poses) {
          for (let t = 0; t < 8; t += 0.25) inst.update(0.25, { x: 1, y: 2, z: 3, facing: 0.3, pose: pose.id, poseTime: t, variant, camera });
        }
      }
      inst.setThermal(true, config.viewModel.thermal);
      inst.update(0.1, { x: 1, y: 2, z: 3, facing: 0, pose: entry.poses[0].id, poseTime: 0, variant: 0, camera });
      inst.setThermal(false, config.viewModel.thermal);
      const stats = countStats(inst.objects);
      expect(stats.calls).toBeGreaterThan(0);
      expect(stats.triangles).toBeGreaterThan(0);
      inst.dispose();
    });
  }
});
