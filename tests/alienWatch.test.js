// Nov 17 (Aaron: the crashed plane's alien cutscenes were too dark): the grey's dull glowing watch, which lights
// it softly, goes dark as it dies (its power cell drops), and never changes the scene's light count.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AlienRenderer } from '../src/render/AlienRenderer.js';
import { config } from '../src/config.js';

const watch = config.crashedPlane.encounter.watch;
const lights = (scene) => {
  let n = 0;
  scene.traverse((o) => (n += o.isLight ? 1 : 0));
  return n;
};
const alien = (extra = {}) => ({ active: true, x: 0, y: 0, z: 0, facing: 0, state: 'examine', timer: 0, walked: 0, flash: 0, stage: 0, ...extra });

describe("the grey's watch", () => {
  it("is the power cell's colour", () => {
    expect(watch.color).toBe(config.crashedPlane.encounter.drop.color);
  });

  it('lights the grey while it lives, and goes dark with its glow', () => {
    const scene = new THREE.Scene();
    const r = new AlienRenderer(config.aliens.grey);
    r.init(scene, 1, { watch });
    const light = r.pool[0].watchLight;
    r.update([alien({ state: 'idle' })], 1 / 30);
    expect(light.intensity).toBeGreaterThan(watch.light.intensity * 0.8);
    // its light sits by the grey's left forearm, not at its feet or far off
    expect(light.position.y).toBeGreaterThan(0.3);
    expect(Math.hypot(light.position.x, light.position.z)).toBeLessThan(0.6);
    r.update([alien({ watchGlow: 0 })], 1 / 30);
    expect(light.intensity).toBe(0);
  });

  it('keeps the light in the scene, dark, while the grey is not drawn (no light-count change)', () => {
    const scene = new THREE.Scene();
    const r = new AlienRenderer(config.aliens.grey);
    r.init(scene, 1, { watch });
    const n = lights(scene);
    r.update([alien()], 1 / 30);
    r.update([], 1 / 30);
    expect(lights(scene)).toBe(n);
    expect(r.pool[0].watchLight.intensity).toBe(0);
  });

  it('is only on the greys given one (the mothership and the armory have none)', () => {
    const scene = new THREE.Scene();
    const r = new AlienRenderer(config.aliens.grey);
    r.init(scene, 2);
    expect(lights(scene)).toBe(0);
    expect(r.pool[0].watchLight).toBeUndefined();
  });

  it('tells where it is, for the power cell to fall from', () => {
    const scene = new THREE.Scene();
    const r = new AlienRenderer(config.aliens.grey);
    r.init(scene, 1, { watch });
    const out = new THREE.Vector3();
    expect(r.watchPosition(out)).toBe(false); // not drawn yet
    r.update([alien({ state: 'idle', x: 5, z: -3 })], 1 / 30);
    expect(r.watchPosition(out)).toBe(true);
    expect(Math.hypot(out.x - 5, out.z + 3)).toBeLessThan(0.3); // at its side, arms hanging
    expect(out.y).toBeGreaterThan(0.4);
    expect(out.y).toBeLessThan(0.8);
  });
});
