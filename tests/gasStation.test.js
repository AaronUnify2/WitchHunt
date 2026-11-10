// Session 15b (M9.3 pass 1): the gas station's set: laid out facing the
// road, the store inside the clearing, its cars clear of it.
import { describe, it, expect } from 'vitest';
import { GasStation } from '../src/encounters/GasStation.js';
import { frameToWorld } from '../src/world/clearingFrame.js';
import gas from '../src/data/gasStation.json';
import vehicleData from '../src/data/vehicles.json';
import { createRequire } from 'node:module';
import { makeMap, config } from './mapFixture.js';
import { roadProps } from '../src/world/road.js';
const require = createRequire(import.meta.url);

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

  // Session 25 (Aaron): the road's power line ran through the HOME OF BIGFOOT board.
  it('keeps the pole sign clear of the road\'s poles and wires', () => {
    const poles = roadProps(map.road, config.map.road).poles;
    const s = frameToWorld(f, gas.sign.x, gas.sign.z);
    const half = config.gasStation.look.sign.width / 2;
    for (let i = 0; i + 1 < poles.length; i++) {
      const a = poles[i];
      const b = poles[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.z - a.z) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(s.x - (a.x + dx * t), s.z - (a.z + dz * t));
      expect(d).toBeGreaterThan(half + 1); // the board turns along the road, so its half-width reaches toward the wire
    }
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

  it('has the back office (the note alone, Session 17) and the stockroom (the safe and the scanner) behind the partition, and doorways into them', () => {
    const b = gas.building;
    const o = gas.office;
    for (const k of ['note', 'desk']) {
      expect(o[k].z).toBeLessThan(b.partitionZ);
      expect(o[k].x).toBeLessThan(b.splitX);
    }
    expect(o.safe).toBeUndefined();
    expect(o.scanner).toBeUndefined();
    for (const k of ['safe', 'scanner']) {
      const s = gas.stockroom[k];
      expect(s.z).toBeLessThan(b.partitionZ);
      expect(s.x).toBeGreaterThan(b.splitX);
      expect(s.x).toBeLessThan(b.x1);
      const spot = gas.interactions.find((i) => i.id === k);
      expect(Math.hypot(spot.x - s.x, spot.z - s.z)).toBeLessThan(1.2);
      expect(spot.x).toBeGreaterThan(b.splitX);
    }
    // Aaron: Earl's bulk ammunition behind the counter (Session 18: 14 of each; he had heaps by the outpost).
    const counter = gas.searches.find((x) => x.id === 'counter');
    expect(counter.gives).toEqual(expect.arrayContaining([{ item: 'shotgunAmmo', amount: 14 }, { item: 'rifleAmmo', amount: 14 }]));
    expect(b.officeDoor.x).toBeLessThan(b.splitX);
    expect(b.stockDoor.x).toBeGreaterThan(b.splitX);
  });
});

describe('the gas station beats (Session 15b pass 2)', () => {
  const dialogue = require('../src/data/dialogue.json');
  const progress = require('../src/data/progress.json');
  const ids = new Set(dialogue.lines.map((l) => l.id));

  it('has every line it plays', () => {
    for (const id of ['gas.arrive', 'gas.mutant.after', 'gas.phone', 'gas.note', 'gas.witch.ellen', 'gas.witch.junie', 'gas.safe.open', ...config.gasStation.scannerLines]) expect(ids.has(id)).toBe(true);
  });

  it('has its story flags', () => {
    const flags = new Set(progress.flags.map((f) => f.id));
    for (const f of ['gasStationVisited', 'gasMutantKilled', 'earlNoteRead', 'scannerHeard', 'gasWitchSeen', 'earlCombination', 'rifleClaimed']) expect(flags.has(f)).toBe(true);
  });

  it('can see the witch from the door: no car, pump or post in the way', () => {
    const from = { x: gas.building.door.x, z: gas.building.z1 + 2 };
    const to = gas.witch;
    const distToLine = (p) => {
      const vx = to.x - from.x;
      const vz = to.z - from.z;
      const t = Math.max(0, Math.min(1, ((p.x - from.x) * vx + (p.z - from.z) * vz) / (vx * vx + vz * vz)));
      return Math.hypot(from.x + vx * t - p.x, from.z + vz * t - p.z);
    };
    for (const c of gas.cars) expect(distToLine(c)).toBeGreaterThan(2.6);
    const isl = config.gasStation.look.island;
    for (const p of gas.pumps) {
      expect(distToLine(p)).toBeGreaterThan(isl.length / 2 + 0.5);
      for (const side of [-1, 1]) expect(distToLine({ x: p.x + side * (isl.length / 2 + 0.25), z: p.z })).toBeGreaterThan(1); // the canopy's posts
    }
  });

  it('crouches the mutant at the back of the shop, in sight of the door', () => {
    const b = gas.building;
    expect(gas.mutant.z).toBeGreaterThan(b.partitionZ);
    // Down the west aisle (Aaron): between the two west shelf runs, and woken from the centre aisle's mouth.
    const west = gas.store.shelves.filter((sh) => sh.x > b.splitX && !sh.fallen).map((sh) => sh.z).sort((p, q) => q - p);
    expect(gas.mutant.z).toBeLessThan(west[0]);
    expect(gas.mutant.z).toBeGreaterThan(west[1]);
    expect(gas.mutant.x).toBeGreaterThan(b.door.x);
    expect(gas.wake.z).toBeGreaterThan(gas.mutant.z - 1);
    expect(config.gasStation.mutant.health).toBeLessThan(config.mutant.health);
  });

  it('puts every search point and thing to use inside the store', () => {
    const b = gas.building;
    for (const s of [...gas.searches, ...gas.interactions]) {
      expect(s.x).toBeGreaterThan(b.x0);
      expect(s.x).toBeLessThan(b.x1);
      expect(s.z).toBeGreaterThan(b.z0);
      expect(s.z).toBeLessThan(b.z1);
    }
  });
});
