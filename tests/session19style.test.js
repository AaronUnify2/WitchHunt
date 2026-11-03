// Session 19 (Graphics Engineer, style pass 2): the props' shared kit
// (render/propKit.js) and the glare rule over every place's palette.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { config } from '../src/config.js';
import { bakeParts, capLuma, lumaOf, noise3, weatherFor } from '../src/render/propKit.js';

const weather = weatherFor(config.props.weather);

function box(y = 0) {
  const g = new THREE.BoxGeometry(1, 2, 1).toNonIndexed();
  g.deleteAttribute('uv');
  g.translate(0, 1 + y, 0);
  return g;
}

describe('propKit', () => {
  it('measures and caps luma', () => {
    expect(lumaOf(0xffffff)).toBeCloseTo(1);
    expect(lumaOf(0x000000)).toBe(0);
    const capped = capLuma(0xc0c0c0, 0.45);
    expect(lumaOf(capped)).toBeLessThanOrEqual(0.452);
    expect(capLuma(0x202020, 0.45)).toBe(0x202020);
  });

  it('noise is smooth and in range', () => {
    for (let i = 0; i < 50; i++) {
      const v = noise3(i * 0.37, i * 0.11, i * 0.73);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(noise3(1.2, 2, 3) - noise3(1.201, 2, 3))).toBeLessThan(0.02);
  });

  it('bakes every colour into one geometry with vertex colours', () => {
    const parts = new Map([
      [0x334455, [box(), box(3)]],
      [0x553322, [box(6)]],
    ]);
    const geo = bakeParts(parts, { weather: null });
    expect(geo.getAttribute('color').count).toBe(geo.getAttribute('position').count);
    expect(geo.getAttribute('position').count).toBe(36 * 3);
  });

  it('grimes the bottom of a piece and leaves its top alone', () => {
    const parts = new Map([[0x5a5a5a, [box()]]]);
    const w = { ...weather, mottle: 0, pieceJitter: 0, underside: 1 };
    const geo = bakeParts(parts, { weather: w, baseAt: () => 0 });
    const pos = geo.getAttribute('position');
    const col = geo.getAttribute('color');
    let low = 0;
    let high = 0;
    for (let i = 0; i < pos.count; i++) {
      const b = col.getX(i) + col.getY(i) + col.getZ(i);
      if (pos.getY(i) < 0.01) low = b;
      if (pos.getY(i) > 1.99) high = b;
    }
    expect(low).toBeLessThan(high * 0.7);
  });

  it('caps a pale colour to the glare ceiling, unless kept bright', () => {
    const pale = 0xe0e0e0;
    const w = { ...weather, mottle: 0, pieceJitter: 0, underside: 1 };
    const one = (keep) => {
      const geo = bakeParts(new Map([[pale, [box()]]]), { weather: { ...w, keepBright: keep ? [pale] : [] } });
      return geo.getAttribute('color').getX(0);
    };
    expect(one(false)).toBeLessThan(one(true));
  });
});

describe('the glare rule over the places (Aaron: pale props glare under the torch)', () => {
  const places = ['campsite', 'gasStation', 'stormShelter', 'outpost'];
  for (const place of places) {
    it(`${place}: every prop colour is dull enough, or kept bright on purpose`, () => {
      const look = config[place].look;
      const w = weatherFor(config.props.weather, look.weather);
      const bright = new Set(w.keepBright);
      for (const [name, hex] of Object.entries(look.colors)) {
        if (typeof hex !== 'number' || bright.has(hex)) continue;
        // The bake caps anything over the line; this keeps the palette honest anyway.
        expect(lumaOf(hex), `${place}.${name}`).toBeLessThanOrEqual(w.maxLuma + 0.06);
      }
    });
  }
});
