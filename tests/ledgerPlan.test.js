// Session 15b (Aaron): the ledger's fence tab is a plan of the compound to
// tap; the D-pad moves round it by where things sit.
import { describe, it, expect } from 'vitest';
import { stationLayout } from '../src/base/stationLayout.js';
import { StationState } from '../src/base/StationState.js';
import { buildFencePlan } from '../src/base/fencePlan.js';
import { planPositions, nearestToward } from '../src/ui/Ledger.js';
import { makeMap, makeGround, config } from './mapFixture.js';

function station(scrap = 100, batteries = 0) {
  const map = makeMap(1234);
  const layout = stationLayout(map.clearings[map.homeIndex], makeGround(1234), config.station.layout);
  const state = new StationState(config.station, layout);
  state.init();
  const calls = [];
  const rec = (name) => (...a) => calls.push([name, ...a]);
  return {
    layout,
    state,
    sc: config.station,
    nightSeconds: 360,
    combat: { inventory: { scrap, batteries } },
    repair: rec('repair'),
    buildBarricade: rec('buildBarricade'),
    reinforceDoor: rec('reinforceDoor'),
    fitBattery: rec('fitBattery'),
    calls,
  };
}

describe("the ledger's plan of the compound", () => {
  it('has every fence panel, the gate, every barricade slot, both doors and the fence box', () => {
    const st = station();
    const plan = buildFencePlan(st);
    const n = st.layout.segments.length;
    expect(plan.items.length).toBe(n + 1 + n + 2 + 1);
    expect(plan.items.filter((i) => i.cls.startsWith('fence')).length).toBe(n);
    expect(plan.items.filter((i) => i.cls.startsWith('gate')).length).toBe(1);
    expect(plan.items.filter((i) => i.cls.startsWith('barricade')).length).toBe(n);
  });

  it('does what each part needs: repair a broken panel, build a barricade, reinforce a sound door', () => {
    const st = station(100, 1);
    const plan = buildFencePlan(st);
    const torn = Number(Object.keys(config.station.fence.startHealth).find((k) => config.station.fence.startHealth[k] === 0));
    const panel = plan.items[torn];
    expect(panel.cls).toContain('down');
    panel.action();
    const bar = plan.items.find((i) => i.cls === 'barricade empty');
    bar.action();
    const door = plan.items.find((i) => i.label === 'Front door');
    door.action();
    const box = plan.items.find((i) => i.cls.startsWith('box'));
    box.action();
    expect(st.calls.map((c) => c[0])).toEqual(['repair', 'buildBarricade', 'reinforceDoor', 'fitBattery']);
  });

  it("offers nothing to do on a sound panel or a fence box you've no battery for", () => {
    const st = station(100, 0);
    const plan = buildFencePlan(st);
    expect(plan.items[0].action).toBeNull();
    expect(plan.items.find((i) => i.cls.startsWith('box')).action).toBeNull();
  });
});

describe('moving round a plan with the D-pad', () => {
  const page = {
    rows: [{ heading: 'ALL' }, { label: 'Repair all' }],
    plan: { viewBox: '-10 -10 20 20', items: [{ x: -5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }] },
  };
  it('puts the rows above the plan', () => {
    const pos = planPositions(page);
    expect(pos.length).toBe(4);
    expect(pos[0].y).toBeLessThan(-10);
  });
  it('goes to the nearest thing that way, and nowhere if there is nothing', () => {
    const pos = planPositions(page);
    expect(nearestToward(pos, 0, 0, 1)).toBe(3); // from the row down: the middle
    expect(nearestToward(pos, 1, 1, 0)).toBe(2); // left part, right: the right part
    expect(nearestToward(pos, 3, 0, -1)).toBe(0); // middle, up: back to the row
    expect(nearestToward(pos, 2, 1, 0)).toBe(-1); // nothing further right
  });
});
