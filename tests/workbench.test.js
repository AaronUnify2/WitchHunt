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
  it("stands in the main room against the comms room's wall, clear of the doors", () => {
    const c = L.cabin;
    expect(bench).toBeTruthy();
    expect(bench.z - bench.d / 2).toBeGreaterThan(c.z + c.partZ);
    expect(bench.z + bench.d / 2).toBeLessThan(c.z + c.halfD);
    // Clear of the comms door and of the way to it from the front door.
    expect(bench.x + bench.w / 2).toBeLessThan(c.commsDoor.x - c.commsDoor.width / 2 - 1);
    const t = (bench.z - c.frontDoor.z) / (c.commsDoor.z - c.frontDoor.z);
    const wayX = c.frontDoor.x + (c.commsDoor.x - c.frontDoor.x) * t;
    expect(wayX - (bench.x + bench.w / 2)).toBeGreaterThan(1.5);
    // And of the other furniture.
    for (const f of c.furniture) {
      if (f === bench) continue;
      const apart = Math.abs(f.x - bench.x) > (f.w + bench.w) / 2 + 0.3 || Math.abs(f.z - bench.z) > (f.d + bench.d) / 2 + 0.3;
      expect(apart, f.id).toBe(true);
    }
  });

  it('has a place to stand at it, inside the room', () => {
    const { st } = rig();
    const s = st.benchSpot();
    expect(s.z).toBeGreaterThan(bench.z + bench.d / 2);
    expect(s.z).toBeLessThan(L.cabin.z + L.cabin.halfD - 0.5);
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
