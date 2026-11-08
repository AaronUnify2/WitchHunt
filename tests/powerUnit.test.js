import { describe, it, expect } from 'vitest';
import { addCharge, drawCharge, fitCell, isFull } from '../src/base/powerUnit.js';
import { StationState } from '../src/base/StationState.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { saveStation, loadStation } from '../src/core/saveData.js';
import { makeMap, makeGround, config } from './mapFixture.js';

function station() {
  const map = makeMap(1234);
  const layout = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
  const s = new StationState(config.station, layout);
  s.init();
  return s;
}

describe('one power unit (Session 20)', () => {
  it('a battery is 100; the fence starts at 300', () => {
    const s = station();
    expect(s.capacity).toBe(300);
    expect(s.fitBattery()).toBe(100);
    s.fitBattery();
    s.fitBattery();
    expect(s.fitBattery()).toBe(0);
    expect(s.chargeFull).toBe(true);
  });

  it("the plane's cell raises the capacity to 1000 and puts 500 in", () => {
    const s = station();
    s.fitBattery();
    expect(s.fitPowerCell('planeCell')).toBe(500);
    expect([s.capacity, s.charge]).toEqual([1000, 600]);
    expect(fitCell({ capacity: 2000, charge: 0 }, { capacity: 1000, charge: 10 })).toBe(10); // never shrinks it
    const t = station();
    loadStation(t, JSON.parse(JSON.stringify(saveStation(s))));
    expect([t.capacity, t.charge]).toEqual([1000, 600]);
  });

  it('draws only what it has', () => {
    const u = { capacity: 1000, charge: 30 };
    expect(drawCharge(u, 40)).toBe(false);
    expect(drawCharge(u, 30)).toBe(true);
    expect(addCharge(u, 2000)).toBe(1000);
    expect(isFull(u)).toBe(true);
    expect(config.alienQuad.power.capacity).toBe(1000); // 10 batteries
  });
});
