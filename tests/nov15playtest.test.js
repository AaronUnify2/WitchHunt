// Aaron's Nov 15 play-through: the board and the poster through the comms room's wall; the forecast panel
// on the scripted nights.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { config } from '../src/config.js';

describe("Aaron's Nov 15 play-through", () => {
  it("offers the poster and Ellen's board from the main room only, and the desk's ledger from the comms room only", () => {
    const st = readFileSync(new URL('../src/base/Station.js', import.meta.url), 'utf8');
    expect(st).toContain("if (c.poster && room === 2) offer(dist(c.poster.spot), { key: 'poster'");
    expect(st).toContain("if (room === 3) offer(dist(c.desk), { key: 'ledger'");
    expect(st).toContain('if (s.zone !== undefined && s.zone !== room) continue;');
    const fs = readFileSync(new URL('../src/story/FamilyStations.js', import.meta.url), 'utf8');
    expect(fs).toMatch(/zone: 2,[^\n]*\n\s*offer: \(X\) => \(this\.shown\.length \? \{ key: 'story-board'/);
  });

  it('shows no forecast panel on the first three nights, but still fires the event', () => {
    expect(config.nights.forecastFromNight).toBe(4);
    const nw = readFileSync(new URL('../src/base/NightWatch.js', import.meta.url), 'utf8');
    expect(nw).toMatch(/< \(this\.nc\.forecastFromNight \?\? 1\)\) \{\s*this\.bus\.emit\('night:forecast', \{ forecast: f, hidden: true \}\);\s*return f;/);
  });
});

import dialogueData from '../src/data/dialogue.json';
describe("Night 2's dialogue and its prep step (Nov 15, Aaron)", () => {
  it("asks only for the rifle up the tower, and ends the night on Wyatt's payoff then Ellen's hook", () => {
    const obj = readFileSync(new URL('../src/story/Objectives.js', import.meta.url), 'utf8');
    expect(obj).toContain("step('night2Prep', \"Take Earl's lever-action up the lookout tower to Wyatt. Night falls when you do.\", L.tower.ladder)");
    expect(obj).not.toMatch(/night2Prep', "Night's nearly here\. Fit the battery/);
    const by = Object.fromEntries(dialogueData.lines.map((l) => [l.id, l]));
    expect(by['night2.after.wyatt'].text).toBe("I didn't miss this time, Dad.");
    expect(by['night2.hand.wyatt'].text).toMatch(/won't miss this time/);
    const n2 = readFileSync(new URL('../src/encounters/NightTwo.js', import.meta.url), 'utf8');
    expect(n2.indexOf("play('night2.after.wyatt')")).toBeLessThan(n2.indexOf("play(camera ? 'night2.after.camera'"));
  });
});

import { Toast, readSeconds } from '../src/ui/Toast.js';
import { Hud } from '../src/ui/Hud.js';
describe('the toasts and cards pass (Nov 15, Aaron approved)', () => {
  const fakeEl = () => ({ textContent: '', classList: { add() {}, remove() {} } });

  it('keeps a pickup line up as long as it takes to read, and holds it while something covers it', () => {
    const hud = new Hud(config.hud);
    hud.pickupLines = [];
    hud.renderPickups = () => {};
    hud.cfg.pickupLines = 4;
    hud.pickup('+4 shells');
    hud.pickup("Earl's keys (a brass tag: the safe's combination)");
    const [short, long] = hud.pickupLines;
    expect(short.timer).toBe(config.hud.pickupSeconds);
    expect(long.timer).toBeCloseTo(readSeconds(long.text, config.hud.pickupRead));
    expect(long.timer).toBeGreaterThan(short.timer);
    let held = true;
    hud.hold = () => held;
    hud.updatePickups(10);
    expect(hud.pickupLines).toHaveLength(2); // a card's up: nothing runs out
    held = false;
    hud.updatePickups(10);
    expect(hud.pickupLines).toHaveLength(0);
  });

  it("queues a toast behind the one showing, and doesn't run one out under a card", () => {
    const t = new Toast(config.ui);
    t.el = fakeEl();
    t.remaining = 0;
    t.show('Picked up: the camcorder. Hand it in at the comms room');
    t.show('Dawn, after night 1');
    expect(t.el.textContent).toMatch(/camcorder/);
    t.update(100, true); // held
    expect(t.el.textContent).toMatch(/camcorder/);
    t.update(100, false);
    expect(t.el.textContent).toBe('Dawn, after night 1');
    t.show('Dawn, after night 1'); // the same again isn't queued
    expect(t.queue).toHaveLength(0);
  });

  it("gives Earl's keys a card, and cuts the doubled messages", () => {
    const sh = readFileSync(new URL('../src/encounters/StormShelter.js', import.meta.url), 'utf8');
    expect(sh).toContain("show('earlKeys'");
    const n2 = readFileSync(new URL('../src/encounters/NightTwo.js', import.meta.url), 'utf8');
    expect(n2).not.toContain("notify?.('Something at the treeline is screaming");
    expect(n2).not.toContain("notify?.('The yard goes quiet')");
  });
});
