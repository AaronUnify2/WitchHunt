// Milo's barn (encounters/MiloBarn.js, world/MiloBarnSite.js, render/miloBarnModel.js; DESIGN.md "Milo's barn").
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { flinched, throwTimes } from '../src/encounters/MiloBarn.js';
import { carYaw, modelToWorld } from '../src/world/MiloBarnSite.js';
import { buildMiloBarn, holeOutline } from '../src/render/miloBarnModel.js';
import { weatherFor, lumaOf } from '../src/render/propKit.js';
import progress from '../src/data/progress.json';
import dialogue from '../src/data/dialogue.json';
import cutscenes from '../src/data/cutscenes.json';
import lore from '../src/data/lore.json';

const bc = config.milosBarn;
const ec = bc.encounter;

describe("Milo's barn: the act", () => {
  it('three knives, in order, a beat apart; right shoulder, left shoulder, over the head', () => {
    const t = throwTimes(ec.act);
    expect(t).toHaveLength(3);
    expect(t[1] - t[0]).toBeCloseTo(ec.act.between, 5);
    const [r, l, head] = ec.act.landAt;
    expect(r[0]).toBeLessThan(0);
    expect(l[0]).toBeGreaterThan(0);
    expect(head[0]).toBe(0);
    expect(head[1]).toBeGreaterThan(r[1]); // just over his head
    expect(bc.mark.z - bc.throwFrom.z).toBeGreaterThan(8); // twelve paces
  });

  it('a flinch: moving off the mark, or firing', () => {
    const mark = { x: 0, z: 0 };
    expect(flinched(mark, { x: 0.1, z: 0.1 }, ec.act.flinchMove, false)).toBe(false);
    expect(flinched(mark, { x: ec.act.flinchMove + 0.05, z: 0 }, ec.act.flinchMove, false)).toBe(true);
    expect(flinched(mark, { x: 0, z: 0 }, ec.act.flinchMove, true)).toBe(true);
  });
});

describe("Milo's barn: the set", () => {
  const model = buildMiloBarn(bc, { weather: weatherFor(config.props.weather, bc.look.weather) });

  it('one baked mesh and one unlit glow mesh (the lamp, the lantern-lit board), no lights', () => {
    let lights = 0;
    model.group.traverse((o) => o.isLight && lights++);
    expect(lights).toBe(0);
    expect(model.mesh.geometry.getAttribute('position').count / 3).toBeLessThan(25000);
    expect(model.glow.material.isMeshBasicMaterial).toBe(true);
    for (const [name, hex] of Object.entries(bc.look.colors)) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });

  it('the knife holes trace a person: a head above, feet at the bottom', () => {
    const pts = holeOutline();
    expect(pts.length).toBeGreaterThan(80);
    const ys = pts.map((p) => p[1]);
    expect(Math.max(...ys)).toBeGreaterThan(1.85);
    expect(Math.min(...ys)).toBeLessThan(0.12);
    for (const [x] of pts) expect(Math.abs(x)).toBeLessThan(bc.board.width / 2);
  });

  it('fits the smallest clearing; the barn inside the fence; the cars the gate', () => {
    const F = bc.fence;
    expect(F.z + F.rz).toBeLessThan(config.map.clearing.radiusMin);
    expect(Math.abs(F.z - F.rz - bc.gate.z)).toBeLessThan(0.01); // the gate on the fence line
    const back = bc.barn.z + bc.barn.depth / 2;
    expect(((back - F.z) / F.rz) ** 2 + (bc.barn.halfW / F.rx) ** 2).toBeLessThan(1.05);
    expect(model.spots.mark && model.spots.throwFrom && model.spots.gate && model.spots.outside).toBeTruthy();
    expect(config.landmarks.built).toContain('milosBarn');
  });

  it('the cars meet nose to nose shut, and swing up the lane open', () => {
    const L = bc.gate.carLength;
    for (const s of [1, -1]) {
      const shut = carYaw(s, 0, bc.gate.openAngle);
      expect(Math.abs(Math.sin(shut))).toBeCloseTo(1, 5); // across the lane
      expect(Math.sign(Math.sin(shut))).toBe(-s); // toward the middle
      const open = carYaw(s, 1, bc.gate.openAngle);
      expect(Math.cos(open)).toBeGreaterThan(0.9); // pointing up the lane
      const hinge = s * (L + bc.gate.gap);
      expect(Math.abs(hinge + Math.sin(shut) * L)).toBeLessThan(0.2); // the noses meet
    }
    // The model's x is the frame's left.
    const f = { x: 0, z: 0, fx: 0, fz: 1, rx: -1, rz: 0 };
    expect(modelToWorld(f, 1, 0).x).toBeCloseTo(1, 5);
  });
});

describe("Milo's barn: data", () => {
  it('its flags (the morning after comes at the first dawn after the act)', () => {
    const by = new Map(progress.flags.map((x) => [x.id, x]));
    for (const id of ['miloSiege', 'miloGates', 'miloAct', 'miloRefused', 'miloMorning', 'miloCoffee']) expect(by.has(id), id).toBe(true);
    expect(by.get('miloMorning').trigger).toEqual({ on: 'dawn', after: ['miloAct'] });
  });

  it('his two voices, the story\'s lines, the scenes, the horn', () => {
    expect(config.story.speakers.clown.blipFreq).toBeGreaterThan(config.story.speakers.milo.blipFreq); // high and bouncing; warm
    const ids = new Set(dialogue.lines.map((l) => l.id));
    for (const id of ['milo.gates.1', 'milo.stage', 'milo.one', 'milo.two', 'milo.three', 'milo.flinch', 'milo.warm', 'milo.character.1', 'milo.morning.1', 'milo.siege.wyatt', 'milo.act.wyatt']) expect(ids.has(id), id).toBe(true);
    const line = (id) => dialogue.lines.find((l) => l.id === id);
    expect(line('milo.warm').speaker).toBe('milo');
    expect(line('milo.warm').text).toBe("Three for three. You didn't flinch.");
    expect(line('milo.character.1').text).toBe('I was in character!');
    expect(line('milo.morning.1').text).toBe('Instant. Sorry.');
    const cs = new Set(cutscenes.cutscenes.map((c) => c.id));
    for (const id of ['sweep.milosBarn', 'milo.gates', 'milo.thrownOut']) expect(cs.has(id), id).toBe(true);
    const gates = cutscenes.cutscenes.find((c) => c.id === 'milo.gates');
    expect(gates.tracks.map((e) => e.event).filter(Boolean)).toEqual(['milo:gatesOpen', 'milo:bow', 'milo:beckon']);
    expect(lore.items.find((i) => i.id === 'calliopeHorn')?.from).toBe('milosBarn');
  });
});
