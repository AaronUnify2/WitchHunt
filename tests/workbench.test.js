// Session 28, batch 3: the station's workbench (config.station.workbench; base/Station.js benchOffer).
import { describe, it, expect } from 'vitest';
import { makeMap, makeGround, config } from './mapFixture.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { Station } from '../src/base/Station.js';
import { newSaw } from '../src/combat/chainsawState.js';

const map = makeMap(1234);
const L = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
const bench = L.cabin.furniture.find((f) => f.id === 'workbench');
const wb = config.station.workbench;

// Station's bench methods on a bare object (no scene).
function rig({ owned = true, sharp = 0.3, scrap = 10 } = {}) {
  const events = [];
  const played = [];
  const picked = [];
  const saw = { owned, state: newSaw(config.chainsaw, sharp), sharpen() { this.state.sharp = 1; } };
  const inventory = { scrap, spendScrap(n) { if (n > this.scrap) return false; this.scrap -= n; return true; } };
  const st = Object.create(Station.prototype);
  Object.assign(st, { sc: config.station, layout: L, chainsaw: saw, bus: { emit: (e) => events.push(e) }, combat: { inventory, sfx: { play: (n) => played.push(n) }, hud: { pickup: (t) => picked.push(t) } } });
  return { st, saw, inventory, events, played, picked };
}

describe("the station's workbench", () => {
  it("stands in the garage's middle bay against its back wall (Round 2: it moved out of the cabin)", () => {
    const G = L.garage;
    expect(bench).toBeUndefined();
    expect(G.bench.w).toBeGreaterThan(1.5);
    // Inside the fence, clear of the cabin.
    const c = L.cabin;
    for (const w of G.walls) for (const [x, z] of [[w.ax, w.az], [w.bx, w.bz]]) {
      expect(Math.hypot(x - L.centre.x, z - L.centre.z)).toBeLessThan(L.radius - 1.5);
      expect(x).toBeLessThan(c.x - c.halfW - 2);
    }
    // Tom stands in front of it, inside the bay.
    const st = Object.create(Station.prototype);
    Object.assign(st, { sc: config.station, layout: L });
    const spot = st.benchSpot();
    expect(Math.hypot(spot.x - G.bench.x, spot.z - G.bench.z)).toBeGreaterThan(0.8);
    expect(Math.hypot(spot.x - G.bench.x, spot.z - G.bench.z)).toBeLessThan(1.6);
    // The quad's bay is the one nearest the cabin, and the shovel leans by the bench.
    expect(G.bays[0].x).toBeGreaterThan(G.bays[2].x);
    expect(Math.hypot(G.shovel.x - G.bench.x, G.shovel.z - G.bench.z)).toBeLessThan(2.2);
  });

  it('has nothing to offer until Tom has the chainsaw, or while its chain is sharp', () => {
    expect(rig({ owned: false }).st.benchOffer('X').act).toBe(null);
    const sharp = rig({ sharp: 1 }).st.benchOffer('X');
    expect(sharp.act).toBe(null);
    expect(sharp.prompt).toMatch(/sharp/);
  });

  it('says what it costs when there is not the scrap', () => {
    const o = rig({ scrap: wb.scrap - 1 }).st.benchOffer('X');
    expect(o.act).toBe(null);
    expect(o.prompt).toContain(`${wb.scrap} scrap`);
  });

  it('sharpens the chain for a little scrap, with a stroke of the file as it goes', () => {
    const r = rig({ sharp: 0.2, scrap: 5 });
    const o = r.st.benchOffer('X');
    expect(o.prompt).toMatch(/Hold X: sharpen/);
    expect(o.prompt).toMatch(/dull/);
    expect(o.seconds).toBe(wb.seconds);
    expect(o.stroke).toBeGreaterThan(0);
    o.act();
    expect(r.saw.state.sharp).toBe(1);
    expect(r.inventory.scrap).toBe(5 - wb.scrap);
    expect(r.played).toContain('sharpened');
    expect(r.events).toContain('station:sharpened');
    expect(r.st.benchOffer('X').act).toBe(null);
  });

  it('is cheap: a little scrap (Aaron, Nov 8)', () => {
    expect(wb.scrap).toBeGreaterThan(0);
    expect(wb.scrap).toBeLessThanOrEqual(5);
  });
});
