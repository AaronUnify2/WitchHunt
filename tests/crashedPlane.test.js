// Session 25: the crashed plane's story beats (encounters/CrashedPlane.js), the pure parts and the data.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { inQuickDraw, peekPoint, hop } from '../src/encounters/CrashedPlane.js';
import progress from '../src/data/progress.json';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';
import papers from '../src/data/papers.json';
import lore from '../src/data/lore.json';

const ec = config.crashedPlane.encounter;

describe('the crashed plane (Session 25)', () => {
  it('the quick draw: about half a second after control comes back', () => {
    expect(ec.quickDraw).toBeGreaterThan(0.3);
    expect(ec.quickDraw).toBeLessThan(0.8);
    expect(inQuickDraw(0.2, ec.quickDraw)).toBe(true);
    expect(inQuickDraw(ec.quickDraw + 0.05, ec.quickDraw)).toBe(false);
    expect(inQuickDraw(-0.1, ec.quickDraw)).toBe(false);
  });

  it('the grey hops over the wing into cover and steps out past its tip to shoot', () => {
    const a = { x: 0, z: 0 };
    const b = { x: 0, z: -3.6 };
    expect(hop(a, b, 0, 1.5)).toEqual({ x: 0, z: 0, lift: 0 });
    expect(hop(a, b, 0.5, 1.5).lift).toBeCloseTo(1.5, 5);
    expect(hop(a, b, 1, 1.5).z).toBeCloseTo(-3.6, 5);
    expect(peekPoint({ x: 1, z: 2 }, { x: 1, z: 0 }, ec.shootout.peekOut)).toEqual({ x: 1 + ec.shootout.peekOut, z: 2 });
  });

  it('a 10% health floor for the Mothman: the scripted blackout', () => {
    expect(ec.floor).toBe(0.1);
    expect(ec.mothmanScript.slice(0, 3)).toEqual(['flyover', 'flyover', 'dive']); // a flyover, a second, then the full attack
  });

  it('its flags, lines, cutscenes and the pilot\'s log are all there', () => {
    const flags = progress.flags.map((f) => f.id);
    for (const f of ['planeStandoff', 'planeGreyDown', 'planeLooted', 'planeLogRead', 'planeCellTaken', 'planeCellFitted', 'mothmanMet', 'planeDone']) expect(flags).toContain(f);
    const ids = cutscenes.cutscenes.map((c) => c.id);
    for (const id of ['plane.standoff', 'plane.flare', 'plane.blackout']) expect(ids).toContain(id);
    const standoff = cutscenes.cutscenes.find((c) => c.id === 'plane.standoff');
    expect(standoff.world).toBe('run'); // the grey moves while it plays
    expect(standoff.duration).toBeGreaterThan(ec.standoff.aimAt); // it lifts its gun before control comes back
    const lines = dialogue.lines.map((l) => l.id);
    for (const id of ['plane.quick.wyatt', 'plane.down.wyatt', 'plane.shootout.ellen', 'plane.flare.wyatt', 'plane.mothman.ellen', 'plane.drivenOff.ellen']) expect(lines).toContain(id);
    expect(papers.papers.find((p) => p.id === 'pilotLog')?.pages.length).toBeGreaterThan(0);
    expect(lore.items.find((i) => i.id === 'pilotLog')?.paper).toBe('pilotLog');
    expect(config.station.power.cells.planeCell).toBeTruthy();
  });
});
