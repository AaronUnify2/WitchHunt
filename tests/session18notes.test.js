// Session 18 (QA & Balance): Aaron's early-game notes.
import { describe, it, expect } from 'vitest';
import { promptText } from '../src/ui/PaperNote.js';
import { HomeStop } from '../src/story/HomeStop.js';
import { EventBus } from '../src/core/EventBus.js';
import { stationLayout } from '../src/base/stationLayout.js';
import { StationState } from '../src/base/StationState.js';
import { routeTo } from '../src/base/siegeRouting.js';
import { makeMap, makeGround, config } from './mapFixture.js';
import outpost from '../src/data/outpost.json';
import gasStation from '../src/data/gasStation.json';
import dialogueData from '../src/data/dialogue.json';
import progressData from '../src/data/progress.json';

describe('papers found in the world are taken with A (Aaron)', () => {
  it('says "A: take it" on the last page, and turns the pages before it', () => {
    expect(promptText({ take: true, pad: true, last: true })).toBe('A: take it');
    expect(promptText({ take: true, pad: true, last: false, turn: '◀ ▶ turn the page · ' })).toBe('◀ ▶ turn the page · A: next page');
    expect(promptText({ take: true, pad: false, last: true })).toBe('Enter: take it');
    // Read again from the ledger: put it down, as before.
    expect(promptText({ take: false, pad: true })).toBe('B: put it down');
  });
});

describe('the sigil dig (Aaron: 2 s less)', () => {
  it('takes 2 seconds', () => {
    expect(config.digging.seconds).toBe(2);
  });
});

describe('the gas station pumps (Aaron: shoot them and they go up)', () => {
  it('has the numbers and the islands', () => {
    const pc = config.gasStation.pumps;
    expect(gasStation.pumps.length).toBe(2);
    expect(pc.health).toBeGreaterThan(0);
    expect(pc.blast.radius).toBeGreaterThan(0);
    // The two islands are close enough that one sets the other off.
    const [a, b] = gasStation.pumps;
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(pc.blast.radius + config.gasStation.look.island.length / 2);
  });
});

describe('a stop at home on the way back from the shelter (Aaron)', () => {
  const rig = () => {
    const bus = new EventBus();
    const flags = new Set(['earlCombination']);
    const played = [];
    const hints = [];
    const L = { centre: { x: 0, z: 0 }, radius: 28 };
    const player = { position: { x: 200, z: 0 } };
    const h = new HomeStop(config, bus);
    h.init({
      player,
      station: { layout: L },
      gasStation: { frame: { x: -400, z: 0, radius: 30 } },
      progress: { has: (f) => flags.has(f), setFlag: (f) => flags.add(f) },
      dialogue: { play: (id) => played.push(id) },
      combat: { inventory: { batteries: 1 } },
      hint: (pad) => hints.push(pad),
    });
    return { h, flags, played, hints, player };
  };

  it('has its flag, its lines and its nudge', () => {
    expect(progressData.flags.some((f) => f.id === 'homeStop')).toBe(true);
    const ids = new Set(dialogueData.lines.map((l) => l.id));
    for (const id of ['home.stop.call', 'home.stop.ledger', 'home.stop.battery', 'hint.homeStop']) expect(ids.has(id)).toBe(true);
  });

  it("calls Tom in as he nears home, then points him at the fence box once he's inside", () => {
    const r = rig();
    r.h.update(0.1, true);
    expect(r.played).toEqual([]);
    r.player.position.x = config.homeStop.callDistance - 5;
    r.h.update(0.1, true);
    expect(r.played).toEqual(['home.stop.call']);
    r.player.position.x = 5;
    r.h.update(0.1, true);
    expect(r.flags.has('homeStop')).toBe(true);
    expect(r.played).toEqual(['home.stop.call', 'home.stop.battery']);
    expect(r.hints).toHaveLength(1);
    r.h.update(0.1, true);
    expect(r.played).toHaveLength(2); // once
  });

  it('counts riding straight on to the gas station as done (never points back)', () => {
    const r = rig();
    r.player.position.x = -400;
    r.h.update(0.1, true);
    expect(r.flags.has('homeStop')).toBe(true);
    expect(r.played).toEqual([]);
  });

  it('is only due with the combination and before the safe', () => {
    const r = rig();
    r.flags.add('rifleClaimed');
    r.player.position.x = 5;
    r.h.update(0.1, true);
    expect(r.flags.has('homeStop')).toBe(false);
  });
});

describe('barricades outside the fence (Aaron: the dead were pulling the fence down)', () => {
  const map = makeMap(1234);
  const ground = makeGround(1234);
  const home = map.clearings[map.homeIndex];
  const layout = stationLayout(home, ground, config.station.layout);

  it('stands each barricade outside its fence segment', () => {
    for (const s of layout.segments) {
      const r = Math.hypot(s.barricade.mid.x - layout.centre.x, s.barricade.mid.z - layout.centre.z);
      expect(r).toBeGreaterThan(layout.radius);
    }
  });

  it('has a zombie coming in claw the barricade first, then the fence', () => {
    const state = new StationState(config.station, layout);
    state.init();
    const i = 3;
    state.buildBarricade(i, 999);
    const seg = layout.segments[i];
    const outside = layout.at((seg.a0 + seg.a1) / 2, layout.radius + 8);
    const goal = layout.cabin.commsCentre;
    const out = {};
    routeTo(layout, state, config.station, outside.x, outside.z, goal.x, goal.z, out);
    expect(out.barrier).toBe(state.segments[i].barricade);
    state.damage(state.segments[i].barricade, 1e6);
    routeTo(layout, state, config.station, outside.x, outside.z, goal.x, goal.z, out);
    expect(out.barrier).toBe(state.segments[i]);
  });
});

describe("the outpost's gun pit (Session 18: a sure handful of rounds before the barricade)", () => {
  it('gives 6 rifle rounds for certain', () => {
    const pit = outpost.searches.find((s) => s.id === 'gunPit');
    expect(pit.gives).toEqual([{ item: 'rifleAmmo', amount: 6 }]);
  });
});
