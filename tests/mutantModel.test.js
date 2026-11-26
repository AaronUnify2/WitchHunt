// The mutant's model (render/mutantModel.js). Nov 26: rebuilt after Aaron's concept art (docs/concept-art/mutant-2.jpg).
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { buildMutantGeometry, JOINTS, BODY, woundAt } from '../src/render/mutantModel.js';

const mc = config.mutant;
const { geometry } = buildMutantGeometry(mc.look);
const k = mc.height / mc.look.modelHeight; // the renderer stretches it to its height
const pos = geometry.attributes.position;
const skin = geometry.attributes.skinIndex;
const glow = geometry.attributes.aGlow;

describe('the mutant model', () => {
  it('is one skinned mesh, light enough for four at once', () => {
    for (const a of ['position', 'normal', 'color', 'skinIndex', 'skinWeight', 'aGlow']) expect(geometry.getAttribute(a), a).toBeTruthy();
    expect(geometry.index.count / 3).toBeLessThan(25000);
  });

  it('keeps its head inside the head hit cylinder (the horns may stand above it)', () => {
    const head = JOINTS.findIndex(([n]) => n === 'head');
    const ys = [];
    for (let i = 0; i < pos.count; i++) if (skin.getX(i) === head) ys.push(pos.getY(i) * k);
    ys.sort((a, b) => a - b);
    expect(ys[0]).toBeGreaterThan(mc.headBottom - 0.04);
    expect(ys[Math.floor(ys.length * 0.95)]).toBeLessThan(mc.height);
  });

  it('keeps the weak spot where its hit sphere is, on its back', () => {
    let n = 0;
    let y = 0;
    let z = 0;
    for (let i = 0; i < pos.count; i++) {
      if (glow.getX(i) < 0.9) continue;
      n++;
      y += pos.getY(i) * k;
      z += pos.getZ(i);
    }
    expect(n).toBeGreaterThan(10);
    expect(Math.hypot(y / n - mc.weakSpot.height, z / n + mc.weakSpot.back)).toBeLessThan(mc.weakSpot.radius);
  });

  it('has glowing eyes', () => {
    let eyes = 0;
    for (let i = 0; i < pos.count; i++) if (glow.getY(i) > 0) eyes++;
    expect(eyes).toBeGreaterThan(0);
  });

  it('has its chest torn open over the left ribs, not the right', () => {
    const c = BODY.chest;
    const front = (x, y) => c.z + c.rz * Math.sqrt(Math.max(0, 1 - ((x - c.x) / c.rx) ** 2 - ((y - c.y) / c.ry) ** 2));
    expect(woundAt({ x: 0.14, y: 1.72, z: front(0.14, 1.72) })).toBeLessThan(1);
    expect(woundAt({ x: -0.2, y: 1.72, z: front(-0.2, 1.72) })).toBeGreaterThan(1);
    expect(woundAt({ x: 0.14, y: 1.72, z: -0.1 })).toBeGreaterThan(1); // the back is whole
  });

  it('is broader in the chest than the waist (a muscled V, not a pot belly)', () => {
    expect(BODY.chest.rx).toBeGreaterThan(BODY.belly.rx * 1.2);
  });

  it('keeps the glare rule in every colour but its eyes (they glow)', () => {
    for (const [name, hex] of Object.entries(mc.look)) if (name !== 'eyes' && typeof hex === 'number' && hex > 0xff) expect(lumaOf(hex), name).toBeLessThan(0.45);
  });
});
