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
