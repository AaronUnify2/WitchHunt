// Session 31: the bottom of the mine, past the bulkhead (encounters/MineBottom.js,
// render/mineCavernModel.js): the bulkhead levered open, the cavern, the seam, what's there to take.
import { describe, it, expect } from 'vitest';
import { config } from './mapFixture.js';
import { make } from './mineFixture.js';
import { buildTrack, halfAt, roofAt, rayDistance, pointAt } from '../src/world/mineTrack.js';
import { seamLine } from '../src/render/mineCavernModel.js';
import { BOTTOM_FLAGS, seamPulse, sideBlocks } from '../src/encounters/MineBottom.js';
import { keepInRoom } from '../src/player/Player.js';
import progress from '../src/data/progress.json';
import lore from '../src/data/lore.json';
import papers from '../src/data/papers.json';
import data from '../src/data/mineshaft.json';

const mc = config.mineshaft;
const track = buildTrack(mc.track);

function extras() {
  const got = { lore: [], cards: [], papers: [], sticks: 0 };
  return {
    got,
    extra: {
      lore: { give: (id) => got.lore.push(id) },
      card: { show: (id, h) => { got.cards.push(id); h.read?.(); return true; } },
      paper: { open: (id) => got.papers.push(id) },
      dynamite: { give: (n) => { const fit = Math.min(n, 8 - got.sticks); got.sticks += fit; return fit; } },
    },
  };
}

// Down at the bottom on foot, the cart at the buffers.
function atBottom(flags = []) {
  const x = extras();
  const m = make({ flags: ['mineBottom', ...flags], extra: x.extra });
  m.ride.jump('bottom');
  m.got = x.got;
  m.go = (s, lat = 0) => m.stand(m.ride.at(s, lat));
  return m;
}

describe('the cavern past the bottom', () => {
  it('opens out past the bulkhead: wide, and its roof far over the drift’s', () => {
    expect(track.length).toBe(468);
    expect(track.door).toBeGreaterThan(mc.ride.end + 4);
    expect(halfAt(track, track.door)).toBeCloseTo(mc.track.half, 1);
    expect(halfAt(track, 455)).toBeGreaterThan(7);
    expect(roofAt(track, 455)).toBeGreaterThan(8);
    expect(roofAt(track, 420)).toBe(mc.track.roof);
    // Level from the buffers to the end wall (the bottom's room is one flat box).
    expect(Math.abs(pointAt(track, 424).y - pointAt(track, 468).y)).toBeLessThan(0.05);
  });

  it('stops a shot at the bulkhead until it’s open', () => {
    const p = pointAt(track, 426);
    const dir = { x: Math.sin(p.yaw), y: 0, z: Math.cos(p.yaw) };
    const from = { x: p.x, y: p.y + 1.4, z: p.z };
    const shut = { ...track, shutAt: track.door };
    expect(rayDistance(shut, from, dir, 90)).toBeLessThan(track.door - 426 + 0.7);
    expect(rayDistance(track, from, dir, 90)).toBeGreaterThan(40);
  });

  it('draws the seam as a crack: taller than a house, a hand wide', () => {
    const hash = (a, b) => (Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
    const line = seamLine(mc.bottom.seam.height, mc.bottom.seam.width, (a, b) => Math.abs(hash(a, b)));
    expect(line[line.length - 1][1] - line[0][1]).toBeCloseTo(mc.bottom.seam.height, 5);
    for (const [, , half] of line) expect(half * 2).toBeLessThanOrEqual(mc.bottom.seam.width);
    expect(Math.max(...line.map((l) => l[2] * 2))).toBeGreaterThan(0.1);
  });

  it('pulses the seam’s light between its two brightnesses', () => {
    const S = mc.bottom.seam;
    let lo = 9;
    let hi = 0;
    for (let t = 0; t < S.pulse * 2; t += 0.05) {
      const k = seamPulse(t, S.pulse, S.glow);
      lo = Math.min(lo, k);
      hi = Math.max(hi, k);
    }
    expect(lo).toBeCloseTo(S.glow[0], 1);
    expect(hi).toBeCloseTo(S.glow[1], 1);
  });

  it('narrows the room box to the tunnel’s own shape', () => {
    const blocks = sideBlocks(track, 419, 468, 443.5, 7.4);
    expect(blocks.length).toBeGreaterThan(4);
    // In the drift at 425 a step out to 5 m is pushed back inside its walls; in the cavern it isn't.
    const pl = { x: 0, z: 0, rx: 1, rz: 0, fx: 0, fz: 1, hx: 7.4, hz: 24.5, blocks };
    const a = { x: 5, z: 425 - 443.5 };
    keepInRoom(a, pl, 0.35);
    expect(Math.abs(a.x)).toBeLessThan(halfAt(track, 425));
    const b = { x: 5, z: 455 - 443.5 };
    keepInRoom(b, pl, 0.35);
    expect(b.x).toBe(5);
  });
});

describe('the bottom, on foot', () => {
  it('has a story flag, a text, a lore item and a paper for everything it uses', () => {
    const ids = new Set(progress.flags.map((f) => f.id));
    for (const f of BOTTOM_FLAGS) expect(ids.has(f), f).toBe(true);
    for (const k of ['door', 'seam', 'cocoon', 'foreman', 'log', 'sticks', 'drill', 'plunger']) expect(data.bottom[k].prompt, k).toBeTruthy();
    const items = new Map(lore.items.map((i) => [i.id, i]));
    expect(items.get('foremanLog').paper).toBe('foremanLog');
    expect(items.get('drillHead').card.line).toBeTruthy();
    expect(papers.papers.find((p) => p.id === 'foremanLog').pages.length).toBeGreaterThan(3);
  });

  it('keeps Tom out of the cavern until the bar’s levered out, then lets him through', () => {
    const m = atBottom();
    expect(m.ride.track.shutAt).toBe(track.door);
    expect(m.ride.model.parts.bulkhead.visible).toBe(true);
    // Walking at the door gets him nowhere.
    const beyond = m.ride.at(track.door + 3, 0);
    const into = m.ride.at(track.door - 0.1, 0); // a step into the leaf
    const p = { x: into.x, z: into.z };
    keepInRoom(p, m.player.platform, 0.35);
    expect(m.ride.sOf({ ...p, y: m.player.position.y })).toBeLessThan(track.door - 0.4);
    // The bar: a long hold at the door.
    m.go(track.door - 1.2);
    m.tick(0.1);
    expect(m.hud.prompt).toContain(data.bottom.door.prompt);
    m.hold(mc.encounter.holds.door + 0.3);
    expect(m.set.has('mineBulkhead')).toBe(true);
    expect(m.ride.track.shutAt).toBe(null);
    expect(m.ride.model.parts.bulkhead.visible).toBe(false);
    expect(m.ride.model.parts.bulkheadOpen.visible).toBe(true);
    expect(m.said).toContain(data.bottom.door.done);
    const q = { x: beyond.x, z: beyond.z };
    keepInRoom(q, m.player.platform, 0.35);
    expect(m.ride.sOf({ ...q, y: m.player.position.y })).toBeGreaterThan(track.door + 2);
  });

  it('says what the cavern is the first time he walks in, once', () => {
    const m = atBottom(['mineBulkhead']);
    m.go(track.door + 6);
    m.tick(0.2);
    expect(m.set.has('mineCavernSeen')).toBe(true);
    expect(m.said).toContain(data.bottom.inside);
    m.tick(20);
    expect(m.said).toContain(data.bottom.roost);
    expect(m.said.filter((t) => t === data.bottom.inside).length).toBe(1);
  });

  it('gives the logbook (a card, a paper, lore), the sticks and the drill’s head, each once', () => {
    const m = atBottom(['mineBulkhead', 'mineCavernSeen']);
    const spot = (n) => m.ride.toWorld(m.ride.model.spots[n]);
    m.stand(spot('log'));
    m.tick(0.1);
    expect(m.hud.prompt).toContain(data.bottom.log.prompt);
    m.hold(mc.encounter.holds.log + 0.3);
    expect(m.got.lore).toEqual(['foremanLog']);
    expect(m.got.papers).toEqual(['foremanLog']);
    expect(m.ride.model.parts.log.visible).toBe(false);
    m.stand(spot('sticks'));
    m.hold(mc.encounter.holds.sticks + 0.3);
    expect(m.got.sticks).toBe(mc.bottom.sticksGiven);
    expect(m.set.has('mineSticks')).toBe(true);
    m.stand(spot('drill'));
    m.hold(mc.encounter.holds.drill + 0.3);
    expect(m.got.lore).toEqual(['foremanLog', 'drillHead']);
    expect(m.got.cards).toEqual(['foremanLog', 'drillHead']);
    expect(m.ride.model.parts.drillHead.visible).toBe(false);
    // Nothing's offered twice.
    for (const n of ['sticks', 'drill']) {
      m.stand(spot(n));
      m.tick(0.1);
      expect(m.hud.prompt).not.toContain(data.bottom[n].prompt);
    }
  });

  it('leaves the sticks in the case when he can’t carry any more', () => {
    const m = atBottom(['mineBulkhead', 'mineCavernSeen']);
    m.got.sticks = 8;
    m.stand(m.ride.toWorld(m.ride.model.spots.sticks));
    m.hold(mc.encounter.holds.sticks + 0.3);
    expect(m.set.has('mineSticks')).toBe(false);
    expect(m.said).toContain(data.bottom.sticks.full);
  });

  it('dresses the set from the flags when the mine’s loaded again', () => {
    const m = atBottom(['mineBulkhead', 'foremanLogFound', 'drillHeadTaken']);
    const P = m.ride.model.parts;
    expect(P.bulkheadOpen.visible).toBe(true);
    expect(P.log.visible).toBe(false);
    expect(P.drillHead.visible).toBe(false);
    expect(P.sticks.visible).toBe(true);
  });
});
