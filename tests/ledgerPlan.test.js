// Session 15b (Aaron): the ledger's fence tab is a plan of the compound to
// tap; the D-pad moves round it by where things sit.
import { describe, it, expect } from 'vitest';
import { stationLayout } from '../src/base/stationLayout.js';
import { StationState } from '../src/base/StationState.js';
import { buildFencePlan } from '../src/base/fencePlan.js';
import { planPositions, nearestToward, planMove } from '../src/ui/Ledger.js';
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

describe("the D-pad on the fence tab's plan (Session 15b, Aaron)", () => {
  const st = station();
  const plan = buildFencePlan(st);
  const page = { rows: [{ heading: 'ALL AT ONCE' }, { label: 'Repair all', action: () => {} }], plan };
  const rows = 1;
  const idx = (pred) => rows + plan.items.findIndex(pred);
  const at = (i) => plan.items[i - rows];

  it('walks the whole fence, gate included, with left and right', () => {
    let i = idx((it) => it.cls.startsWith('gate'));
    const seen = new Set([i]);
    for (let k = 0; k < 20; k++) {
      const n = planMove(page, i, -1, 0);
      if (n < 0) break;
      i = n;
      seen.add(i);
    }
    expect(at(i).label).toMatch(/west fence 1/i); // the far west end
    for (let k = 0; k < 30; k++) {
      const n = planMove(page, i, 1, 0);
      if (n < 0) break;
      i = n;
      seen.add(i);
    }
    expect(at(i).label).toMatch(/east fence 3/i); // the far east end
    expect(seen.size).toBe(st.layout.segments.length + 1); // every panel and the gate
    for (const j of seen) expect(at(j).ring).toBe('fence');
  });

  it('walks the barricades the same way; up from them goes to the fence (Session 18: they are outside it)', () => {
    let i = idx((it) => it.ring === 'barricade');
    const seen = new Set([i]);
    for (let k = 0; k < 30; k++) {
      const n = planMove(page, i, 1, 0);
      if (n < 0) break;
      i = n;
      seen.add(i);
    }
    expect(seen.size).toBe(st.layout.segments.length);
    expect(at(planMove(page, i, 0, -1)).ring).toBe('fence');
  });

  it('has a spine up and down: the gate, the fence box, the front door, the comms door, then the rows (Aaron)', () => {
    const gate = idx((it) => it.cls.startsWith('gate'));
    const box = planMove(page, gate, 0, -1);
    expect(at(box).label).toMatch(/fence box/i);
    const front = planMove(page, box, 0, -1);
    expect(at(front).label).toBe('Front door');
    const comms = planMove(page, front, 0, -1);
    expect(at(comms).label).toMatch(/comms/i);
    expect(planMove(page, comms, 0, -1)).toBe(0); // the "repair all" row
    expect(planMove(page, 0, 0, 1)).toBe(comms); // and back down
    expect(planMove(page, comms, 0, 1)).toBe(front);
    expect(planMove(page, box, 0, 1)).toBe(gate);
    expect(planMove(page, gate, 0, 1)).toBe(-1);
    // Off the spine sideways: the nearest fence panel that way (Session 18: the barricades are the outer ring now).
    expect(at(planMove(page, box, 1, 0)).ring).toBe('fence');
    // And the gate's left and right still walk the fence.
    expect(at(planMove(page, gate, 1, 0)).ring).toBe('fence');
  });

  it('steps down from a fence panel to its barricade, outside it (Session 18)', () => {
    const panel = idx((it) => it.ring === 'fence' && it.spine === undefined);
    const bar = planMove(page, panel, 0, 1);
    expect(at(bar).ring).toBe('barricade');
    expect(at(planMove(page, bar, 0, -1)).ring).toBe('fence');
  });
});

// Nov 14 (Aaron): the same plan as a poster on the cabin wall, live, between Ellen's board and the comms door.
import { posterSvg } from '../src/base/fencePoster.js';
import { readFileSync } from 'node:fs';

describe('the station plan poster', () => {
  it("hangs on the comms room's wall in the main room, clear of Ellen's board and the comms door", () => {
    const { layout } = station();
    const c = layout.cabin;
    const p = c.poster;
    expect(p).toBeTruthy();
    expect(p.z).toBeCloseTo(c.board.z);
    const boardRight = c.board.x + c.board.w / 2;
    const doorLeft = c.commsDoor.x - c.commsDoor.width / 2;
    expect(p.x - p.w / 2).toBeGreaterThan(boardRight + 0.2);
    expect(p.x + p.w / 2).toBeLessThan(doorLeft - 0.2);
    expect(p.spot.z).toBeGreaterThan(p.z); // Tom stands in the main room to use it
    expect(p.bottom + p.h).toBeLessThan(c.wallHeight);
  });

  it('draws the live plan: every part in its colour, and the numbers', () => {
    const st = station(42, 1);
    st.state.segments[0].health = 0;
    const svg = posterSvg(buildFencePlan(st), { scrap: 42, charge: 10, capacity: 100, batteries: 1 });
    expect(svg).toMatch(/^<svg xmlns/);
    expect(svg).toContain('STATION PLAN');
    expect(svg).toContain('SCRAP 42');
    expect(svg).toContain('BATTERIES 1');
    expect(svg).toMatch(/class="fence[^"]*down"/);
    expect(svg).toContain('.down .shape');
  });

  it('is held X at to open the fence plan on its own, and the hints point to it', () => {
    const src = readFileSync(new URL('../src/base/Station.js', import.meta.url), 'utf8');
    expect(src).toMatch(/key: 'poster'[^\n]*this\.ledger\.open\('fence'\)/);
    const obj = readFileSync(new URL('../src/story/Objectives.js', import.meta.url), 'utf8');
    expect(obj).toContain('station plan on the cabin wall');
  });
});
