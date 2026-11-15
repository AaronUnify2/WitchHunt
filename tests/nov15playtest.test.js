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
