import { describe, it, expect } from 'vitest';
import { FogOfWar } from '../src/world/FogOfWar.js';

const cfg = { cellSize: 10, revealRadius: 25, revealStep: 2 };
const bounds = { xMin: -100, xMax: 100, zMin: -200, zMax: 200 };

describe('FogOfWar', () => {
  it('starts hidden', () => {
    const fog = new FogOfWar(cfg, bounds);
    expect(fog.nx).toBe(20);
    expect(fog.nz).toBe(40);
    expect(fog.revealedFraction).toBe(0);
    expect(fog.isRevealed(0, 0)).toBe(false);
  });

  it('reveals round the player, out to the reveal radius', () => {
    const fog = new FogOfWar(cfg, bounds);
    expect(fog.update(0, 0)).toBe(true);
    expect(fog.isRevealed(5, 5)).toBe(true);
    expect(fog.isRevealed(15, 0)).toBe(true);
    expect(fog.isRevealed(45, 0)).toBe(false);
    expect(fog.isRevealed(-100, -200)).toBe(false);
  });

  it('only checks again after the player moves revealStep', () => {
    const fog = new FogOfWar(cfg, bounds);
    fog.update(0, 0);
    const version = fog.version;
    expect(fog.update(1, 0)).toBe(false);
    expect(fog.update(40, 0)).toBe(true);
    expect(fog.version).toBe(version + 1);
  });

  it('ignores points off the map', () => {
    const fog = new FogOfWar(cfg, bounds);
    fog.reveal(0, 0, 500);
    expect(fog.revealedFraction).toBe(1);
    expect(fog.isRevealed(500, 0)).toBe(false);
  });

  it('round-trips through bytes for saving', () => {
    const fog = new FogOfWar(cfg, bounds);
    fog.reveal(50, 50, 30);
    const copy = new FogOfWar(cfg, bounds);
    expect(copy.fromBytes(fog.toBytes())).toBe(true);
    expect(copy.revealedCount).toBe(fog.revealedCount);
    expect(copy.isRevealed(50, 50)).toBe(true);
    expect(copy.fromBytes(new Uint8Array(3))).toBe(false);
  });

  it('reveals everything on demand', () => {
    const fog = new FogOfWar(cfg, bounds);
    fog.revealAll();
    expect(fog.isRevealed(95, 195)).toBe(true);
    expect(fog.revealedFraction).toBe(1);
  });
});
