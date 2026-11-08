import { describe, it, expect } from 'vitest';
import { poolPoints, kitsThatFit, chooseKit, emptyKits } from '../src/player/healingPool.js';
import { Inventory } from '../src/player/Inventory.js';
import { Health } from '../src/player/Health.js';
import { StationState } from '../src/base/StationState.js';
import { saveStation, loadStation } from '../src/core/saveData.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { makeMap, makeGround, config } from './mapFixture.js';

const kinds = config.inventory.healing.kits;

function fresh() {
  const inv = new Inventory(config.inventory);
  inv.init();
  const health = new Health(config.health, null);
  health.init();
  return { inv, health };
}

describe('the healing pool (Session 20)', () => {
  it('counts every kit as points: 30 a first aid kit, 60 an alien med kit', () => {
    expect(poolPoints({ firstAid: 2, alienMed: 1 }, kinds)).toBe(120);
    expect(emptyKits(kinds)).toEqual({ firstAid: 0, alienMed: 0 });
  });

  it('caps the pool at 270 (Aaron)', () => {
    expect(config.inventory.healing.poolCap).toBe(270);
    const { inv } = fresh();
    expect(inv.addKits('firstAid', 12)).toBe(9);
    expect(inv.healing).toBe(270);
    expect(inv.canTakeKit()).toBe(false);
    const k = { firstAid: 7, alienMed: 0 }; // 210: room for one alien kit, not two
    expect(kitsThatFit(k, kinds, 270, 'alienMed', 2)).toBe(1);
    expect(kitsThatFit({ firstAid: 8 }, kinds, 270, 'alienMed', 1)).toBe(0); // 240 + 60 > 270
  });

  it("never wastes an alien med kit on a small top-up", () => {
    const both = { firstAid: 1, alienMed: 1 };
    expect(chooseKit(both, kinds, 20)).toBe('firstAid');
    expect(chooseKit(both, kinds, 50)).toBe('firstAid');
    expect(chooseKit(both, kinds, 60)).toBe('alienMed');
    expect(chooseKit(both, kinds, 90)).toBe('alienMed');
    expect(chooseKit({ firstAid: 0, alienMed: 1 }, kinds, 10)).toBe('alienMed'); // all there is
    expect(chooseKit({ firstAid: 2, alienMed: 0 }, kinds, 100)).toBe('firstAid');
    expect(chooseKit(both, kinds, 0)).toBe(null);
    expect(chooseKit({ firstAid: 0, alienMed: 0 }, kinds, 50)).toBe(null);
  });

  it('heals from the pool at the 10-a-second cap, counting what is already healing', () => {
    const { inv, health } = fresh();
    inv.addKits('firstAid', 2);
    inv.addKits('alienMed', 1);
    health.value = 20; // 80 missing
    expect(inv.heal(health)).toBe('alienMed');
    expect(inv.heal(health)).toBe('firstAid'); // 20 still missing after the 60 queued: the smallest
    expect(inv.heal(health)).toBe(null); // nothing left to heal once both land
    expect(inv.healing).toBe(30);
    health.update(1);
    expect(health.value).toBe(30);
    for (let i = 0; i < 20; i++) health.update(0.5);
    expect(health.value).toBe(100);
  });

  it("keeps the comms room's first aid box, saved", () => {
    const map = makeMap(1234);
    const layout = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
    const a = new StationState(config.station, layout);
    a.init();
    expect(a.aidBox).toEqual({ firstAid: 2 });
    a.stashKits('alienMed', 1);
    expect(a.aidBoxCount).toBe(3);
    const b = new StationState(config.station, layout);
    b.init();
    loadStation(b, JSON.parse(JSON.stringify(saveStation(a))));
    expect(b.aidBox).toEqual({ firstAid: 2, alienMed: 1 });
  });
});
