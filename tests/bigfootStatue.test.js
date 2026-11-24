// Nov 24 (Aaron): the gas station's carved Bigfoot is Bigfoot's own figure, in wood.
import { describe, it, expect } from 'vitest';
import { WOOD_FOR, statueSpec, bigfootStatueGeometry } from '../src/render/bigfootStatue.js';
import { bigfootSpec } from '../src/render/bigfootModel.js';
import { config } from '../src/config.js';

const look = config.gasStation.look.statue;

describe("Earl's carved Bigfoot (Nov 24)", () => {
  it('maps every one of his colours to a wood', () => {
    for (const key of Object.keys(config.bigfoot.colours)) {
      expect(WOOD_FOR[key], key).toBeDefined();
      expect(look.colours[WOOD_FOR[key]], key).toBeDefined();
    }
  });

  it("is his figure (the same parts), not the old boxes, and its eyes don't shine", () => {
    const real = bigfootSpec(config.bigfoot);
    const s = statueSpec(look);
    expect(s.masses.length).toBe(real.masses.length);
    expect(s.limbs.length).toBe(real.limbs.length);
    expect(s.glow).toEqual({});
  });

  it('stands its own height, static: no skinning, flat faces, colours baked', () => {
    const g = bigfootStatueGeometry(look);
    g.computeBoundingBox();
    const h = g.boundingBox.max.y - g.boundingBox.min.y;
    expect(h).toBeGreaterThan(look.height * 0.95);
    expect(h).toBeLessThan(look.height * 1.05);
    expect(g.getAttribute('skinIndex')).toBeUndefined();
    expect(g.getAttribute('color')).toBeDefined();
    expect(g.index).toBeNull();
    // Fits under the shop's ceiling on its plinth.
    expect(look.plinth + h).toBeLessThan(config.gasStation ? 3.3 : 99);
    g.dispose();
  });
});
