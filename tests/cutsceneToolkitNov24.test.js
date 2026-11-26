// Nov 24 (the camcorder's tape): the cutscene pieces it needs: the camera's roll, the new events, the witch's
// afterimages, the campers' poses.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { cameraAt, validateCutscenes } from '../src/story/cutsceneTimeline.js';
import { Smear } from '../src/story/cutsceneSmear.js';
import { config } from '../src/config.js';
import { familySpec } from '../src/render/familyLooks.js';

describe('the camera rolls (a camcorder on its side)', () => {
  it('eases roll between keys, 0 without', () => {
    const keys = [{ at: 0, pos: [0, 1, 0], look: [0, 1, 5] }, { at: 1, pos: [0, 1, 0], look: [0, 1, 5], roll: 90 }];
    expect(cameraAt(keys, 0).roll).toBe(0);
    expect(cameraAt(keys, 1).roll).toBe(90);
    expect(cameraAt(keys, 0.5).roll).toBeGreaterThan(0);
  });
});

describe('the new events validate', () => {
  it('face, spray, freeze and smear are known events', () => {
    const cs = { id: 'x', name: 'x', style: 'cctv', camera: [{ at: 0, pos: [0, 1, 0], look: [0, 1, 1] }], actors: [{ id: 'a', kind: 'figure', look: 'witch' }], tracks: ['face', 'spray', 'freeze', 'smear'].map((d, i) => ({ at: i * 0.1, do: d, actor: 'a' })), duration: 1 };
    const problems = validateCutscenes([cs], { looks: Object.keys(config.cutscenes.looks ?? {}), lineIds: new Set() });
    expect(problems.filter((p) => /unknown|event/i.test(String(p)))).toEqual([]);
  });
});

describe('the speed smear', () => {
  function rig() {
    const scene = new THREE.Scene();
    const model = new THREE.Group();
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshBasicMaterial());
    model.add(arm);
    scene.add(model);
    return { scene, model, arm };
  }
  it('leaves fading ghosts of her pose only while she moves fast', () => {
    const { scene, model, arm } = rig();
    const s = new Smear(scene, model, { count: 4, every: 0.02, life: 0.2, minSpeed: 5 });
    s.update(1 / 60); // first frame: no speed yet
    model.position.x += 0.02; // slow: 1.2 m/s
    s.update(1 / 60);
    expect(s.ghosts.some((g) => g.root.visible)).toBe(false);
    arm.rotation.z = 1.1;
    model.position.x += 0.3; // fast: 18 m/s
    s.update(1 / 60);
    const g = s.ghosts.find((x) => x.root.visible);
    expect(g).toBeDefined();
    expect(g.root.position.x).toBeCloseTo(model.position.x, 5);
    expect(g.nodes[1].rotation.z).toBeCloseTo(1.1, 5); // the pose copied across
    expect(g.material.opacity).toBeGreaterThan(0);
    for (let i = 0; i < 20; i++) s.update(1 / 60); // standing still: they fade out
    expect(s.ghosts.every((x) => !x.root.visible)).toBe(true);
    s.dispose();
    expect(scene.children.length).toBe(1);
  });
});

describe('the campers', () => {
  it('four of them, each a figure-kit person with a look', () => {
    const ids = ['camperDan', 'camperJess', 'camperMarcus', 'camperKyle'];
    for (const id of ids) {
      const spec = familySpec(id, config.people.people?.[id] ?? config.people[id]);
      expect(spec.masses.length, id).toBeGreaterThan(10);
      expect(spec.height, id).toBeGreaterThan(1.5);
    }
  });
});

// Nov 26 (Aaron's concept art, close up): Ellen's own face, on her alone.
describe("Ellen's face and coat (Nov 26)", () => {
  const ellen = familySpec('ellen', config.family.people.ellen);
  const mib = familySpec('mib', {});
  it('has her own features (lips, eye whites, lids), and the shared face is unchanged on the others', () => {
    for (const key of ['lips', 'white', 'lid']) {
      expect(ellen.masses.some((m) => m[8] === key), key).toBe(true);
      expect(mib.masses.some((m) => m[8] === key), key).toBe(false); // (Wyatt and Junie have their own since Nov 26 too)
      expect(config.family.people.ellen.colours[key], key).toBeTruthy();
    }
    expect(ellen.head).toBe(1); // natural, as in the art
  });
  it('wears the coat to the lower thigh over a skirt to below the knee, with buttons', () => {
    const coat = ellen.tubes.find((t) => t[9] === 'top' && t[0] === 'hips');
    const skirt = ellen.tubes.find((t) => t[9] === 'skirt');
    expect(Math.min(coat[2], coat[5])).toBeLessThan(0.65);
    expect(Math.min(skirt[2], skirt[5])).toBeLessThan(Math.min(coat[2], coat[5]));
    expect(Math.min(skirt[2], skirt[5])).toBeLessThan(0.45);
    expect(ellen.masses.filter((m) => m[8] === 'button').length).toBe(5);
  });
});

// Nov 26 (Aaron's concept art, close up): Wyatt's own face, hair, hands and jeans.
describe("Wyatt's face, hair and jeans (Nov 26)", () => {
  const wyatt = familySpec('wyatt', config.family.people.wyatt);
  it('has his own features and fingers', () => {
    for (const key of ['lips', 'white', 'lid']) expect(wyatt.masses.some((m) => m[8] === key), key).toBe(true);
    expect(wyatt.tubes.filter((t) => t[0] === 'wristR' && t[9] === 'skin').length).toBe(5); // four fingers and a thumb
    expect(wyatt.masses.some((m) => m[0] === 'head' && Math.abs(m[2]) > 0.08 && m[8] === 'skin')).toBe(true); // his ears kept
  });
  it('wears his jumper over the trunk (the trunk is not jeans) and straight-leg jeans', () => {
    const trunk = wyatt.limbs.find((l) => l[0] === 'hips' && l[1] === 'spine');
    expect(trunk[4]).toBe('top');
    const thigh = wyatt.limbs.find((l) => l[0] === 'hipR');
    const shin = wyatt.limbs.find((l) => l[0] === 'kneeR');
    expect(thigh[2]).toBeLessThan(0.09);
    expect(Math.abs(shin[2] - shin[3])).toBeLessThan(0.01); // straight
  });
});

// Nov 26 (Aaron's concept art, close up): Junie's own face, hair and hands; she keeps her rabbit (Aaron).
describe("Junie's face, hair and rabbit (Nov 26)", () => {
  const junie = familySpec('junie', config.family.people.junie);
  it('has her own child\'s face, fingers, and still holds her rabbit', () => {
    for (const key of ['lips', 'white', 'lid']) {
      expect(junie.masses.some((m) => m[8] === key), key).toBe(true);
      expect(config.family.people.junie.colours[key], key).toBeTruthy();
    }
    expect(junie.tubes.filter((t) => t[0] === 'wristL' && t[9] === 'skin').length).toBe(5);
    const rabbit = junie.masses.filter((m) => m[8] === 'rabbit');
    expect(rabbit.length).toBeGreaterThanOrEqual(4);
    expect(Math.min(...rabbit.map((m) => m[4]))).toBeGreaterThan(0.18); // held out in front of her chest, where it shows
    expect(config.family.people.junie.idle).toBe('hug');
  });
});
