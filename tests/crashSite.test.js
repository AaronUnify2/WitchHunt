// Session 24 (Graphics Engineer): the crashed plane's set
// (render/crashedPlaneModel.js, world/CrashSite.js).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { buildCrashedPlane } from '../src/render/crashedPlaneModel.js';
import { CrashSite, crashSitePlacement, toWorld } from '../src/world/CrashSite.js';
import { resolveCircles } from '../src/world/collision.js';
import { weatherFor } from '../src/render/propKit.js';
import spine from '../src/data/storySpine.json';

const pc = config.crashedPlane;
const build = (heightAt = null) => buildCrashedPlane(pc.look, { weather: weatherFor(config.props.weather, pc.look.weather), heightAt });

describe("the crashed plane's set: the model", () => {
  const model = build();
  const geo = model.mesh.geometry;
  geo.computeBoundingBox();

  it('is one mesh with its colours in the vertices, and no lights', () => {
    let meshes = 0;
    let lights = 0;
    model.group.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isLight) lights++;
    });
    expect(meshes).toBe(1);
    expect(lights).toBe(0);
    expect(geo.getAttribute('color').count).toBe(geo.getAttribute('position').count);
  });

  it('stays light enough for the tablet', () => {
    expect(geo.getAttribute('position').count / 3).toBeLessThan(25000);
  });

  it('fits its clearing, the gouge behind and the wreck ahead', () => {
    const b = geo.boundingBox;
    const place = spine.places.find((p) => p.key === 'crashedPlane');
    const reach = Math.max(Math.hypot(b.min.x, b.min.z), Math.hypot(b.max.x, b.max.z), Math.hypot(b.min.x, b.max.z), Math.hypot(b.max.x, b.min.z));
    expect(reach).toBeLessThan(pc.radius);
    expect(Math.max(-b.min.z, b.max.z)).toBeLessThanOrEqual(place.radius + 1);
    expect(b.min.z).toBeLessThan(-18); // the gouge
    expect(b.max.z).toBeGreaterThan(10); // the nose
    expect(b.min.y).toBeGreaterThan(-1);
  });

  it('gives the encounter its places', () => {
    for (const name of ['work', 'cover', 'bench', 'cockpit', 'kit', 'log']) expect(model.spots[name], name).toBeTruthy();
    // The bench is waist high; the grey works in front of the wing and hides behind it.
    expect(model.spots.bench.y).toBeGreaterThan(0.7);
    expect(model.spots.bench.y).toBeLessThan(1.4);
    expect(model.spots.work.z).toBeGreaterThan(model.spots.bench.z);
    expect(model.spots.cover.z).toBeLessThan(model.spots.bench.z);
  });

  it('is solid, but leaves the middle of the clearing and the grey\'s places clear', () => {
    expect(model.colliders.length).toBeGreaterThan(8);
    expect(model.colliders.some((c) => c.seg && c.blocksShots)).toBe(true);
    for (const p of [{ x: 0, z: 0 }, model.spots.work, model.spots.cover]) {
      const pos = { x: p.x, z: p.z };
      const circles = model.colliders.map((c) => (c.seg ? { ...c, x: (c.ax + c.bx) / 2, z: (c.az + c.bz) / 2 } : c));
      resolveCircles(pos, 0.3, circles, true);
      expect(Math.hypot(pos.x - p.x, pos.z - p.z)).toBeLessThan(0.35);
    }
  });

  it('follows the ground it is given', () => {
    const sloped = build((x, z) => z * 0.1);
    sloped.mesh.geometry.computeBoundingBox();
    expect(sloped.mesh.geometry.boundingBox.min.y).toBeLessThan(-1.5); // the far end of the gouge, downhill
    expect(sloped.spots.kit.y).toBeGreaterThan(model.spots.kit.y + 0.5);
    sloped.dispose();
  });
});

describe("the crashed plane's set: in the world", () => {
  const map = { clearings: [{ key: 'outpost', x: 0, z: 0 }, { key: 'crashedPlane', x: -80, z: 300, spine: true }] };

  it('lies heading away from the checkpoint', () => {
    const p = crashSitePlacement(map, { x: -80, z: 100 });
    expect(p.yaw).toBeCloseTo(0);
    const east = crashSitePlacement(map, { x: -280, z: 300 });
    expect(east.yaw).toBeCloseTo(Math.PI / 2);
    // The nose (model +z) is on the far side from the checkpoint.
    const nose = toWorld(east, 0, 10);
    expect(nose.x).toBeCloseTo(-70);
    expect(crashSitePlacement({ clearings: [] }, null)).toBeNull();
    expect(crashSitePlacement(map, null, 1.2).yaw).toBe(1.2);
  });

  it('stands on the ground, with colliders and spots in world space', () => {
    const scene = new THREE.Scene();
    const inserted = [];
    const world = { map, cordon: { layout: { checkpoint: { x: -80, z: 100 } } }, ground: { heightAt: () => 7 } };
    const site = new CrashSite(config);
    site.init(scene, world, { insert: (c) => inserted.push(c) });
    expect(scene.children.length).toBe(1);
    expect(site.model.group.position.y).toBe(7);
    expect(inserted.length).toBe(site.model.colliders.length);
    for (const c of inserted) {
      expect(Math.hypot(c.x - -80, c.z - 300)).toBeLessThan(pc.radius);
      expect(c.top).toBeGreaterThan(7);
      expect(c.r).toBeGreaterThan(0);
    }
    expect(site.spots.bench.y).toBeGreaterThan(7.7);
    site.update({ x: -80, z: 300 }, 100);
    expect(site.model.group.visible).toBe(true);
    site.update({ x: 900, z: 300 }, 100);
    expect(site.model.group.visible).toBe(false);
    site.dispose();
    expect(scene.children.length).toBe(0);
  });

  it('has no placeholder signpost any more', () => {
    expect(config.landmarks.built).toContain('crashedPlane');
  });
});
