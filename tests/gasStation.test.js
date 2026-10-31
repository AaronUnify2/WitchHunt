// Session 15b (M9.3 pass 1): the gas station's set: laid out facing the
// road, the store inside the clearing, its cars clear of it.
import { describe, it, expect } from 'vitest';
import { GasStation } from '../src/encounters/GasStation.js';
import { frameToWorld } from '../src/world/clearingFrame.js';
import gas from '../src/data/gasStation.json';
import vehicleData from '../src/data/vehicles.json';
import { makeMap, config } from './mapFixture.js';

describe('the gas station set', () => {
  const map = makeMap(1234);
  const f = GasStation.frame(map);

  it('faces the road, which runs past the forecourt', () => {
    expect(f).toBeTruthy();
    // The road's nearest point is ahead, past the forecourt's far edge.
    let best = Infinity;
    for (const p of map.road.points) best = Math.min(best, Math.hypot(p.x - f.x, p.z - f.z));
    expect(best).toBeGreaterThan(gas.forecourt.z1);
    const ahead = frameToWorld(f, 0, best);
    const near = map.road.points.reduce((a, p) => Math.min(a, Math.hypot(p.x - ahead.x, p.z - ahead.z)), Infinity);
    expect(near).toBeLessThan(2);
  });

  it('keeps the store inside the clearing and off the road', () => {
    const b = gas.building;
    for (const [x, z] of [[b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]]) expect(Math.hypot(x, z)).toBeLessThan(f.radius);
    expect(b.z1).toBeLessThan(gas.forecourt.z1);
  });

  it("parks its cars clear of the store and the pump islands", () => {
    const b = gas.building;
    const isl = config.gasStation.look.island;
    for (const c of gas.cars) {
      const inStore = c.x > b.x0 - 1.5 && c.x < b.x1 + 1.5 && c.z > b.z0 - 1.5 && c.z < b.z1 + 1;
      expect(inStore).toBe(false);
      for (const p of gas.pumps) expect(Math.abs(c.x - p.x) < isl.length / 2 + 1.5 && Math.abs(c.z - p.z) < isl.depth / 2 + 1.5).toBe(false);
    }
    expect(GasStation.carSpots(map).length).toBe(gas.cars.length);
    expect(vehicleData.placement.gasStation.count[1]).toBeLessThanOrEqual(gas.cars.length);
  });

  it('has the back office (safe, scanner, note) behind the partition, and doorways into it', () => {
    const b = gas.building;
    const o = gas.office;
    for (const k of ['safe', 'scanner', 'note', 'desk']) {
      expect(o[k].z).toBeLessThan(b.partitionZ);
      expect(o[k].x).toBeLessThan(b.splitX);
    }
    expect(b.officeDoor.x).toBeLessThan(b.splitX);
    expect(b.stockDoor.x).toBeGreaterThan(b.splitX);
  });
});
