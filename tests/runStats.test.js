import { describe, it, expect } from 'vitest';
import { createStats, loadStats, formatDuration, summaryRows } from '../src/core/runStats.js';
import cutscenes from '../src/data/cutscenes.json';
import dialogue from '../src/data/dialogue.json';

describe('run stats and the ending (step 6)', () => {
  it('stats round-trip through a save, ignoring junk', () => {
    const s = createStats();
    s.kills = 42;
    s.witchDamage = 310.5;
    s.seconds = 5400;
    expect(loadStats(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(loadStats(undefined)).toEqual(createStats());
    expect(loadStats({ kills: -3, sigilsDug: 'lots', ritualsBroken: 2 })).toEqual({ ...createStats(), ritualsBroken: 2 });
  });

  it('formats the time played', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(12 * 60 + 10)).toBe('12m');
    expect(formatDuration(5400 + 7 * 60)).toBe('1h 37m');
  });

  it('the summary lists every stat', () => {
    const rows = summaryRows({ ...createStats(), kills: 7 }, 3);
    expect(rows[0]).toEqual(['Nights survived', '3']);
    expect(rows.find(([l]) => l === 'Zombies killed')[1]).toBe('7');
    expect(rows.length).toBe(8);
  });

  it('the ending plays as cutscenes (M8): trail cams, Ground Zero, dawn and the family; the defeat its radio voices', () => {
    const byId = new Map(cutscenes.cutscenes.map((c) => [c.id, c]));
    const lines = new Map(dialogue.lines.map((l) => [l.id, l]));
    const v = byId.get('ending.victory');
    expect(v.look).toBe('trailcam'); // trail cams first
    const cuts = v.tracks.filter((e) => e.do === 'osd');
    expect(cuts[0].osd.name).toContain('GROUND ZERO');
    expect(cuts[1].hour).toBeGreaterThan(5); // then dawn
    const said = v.tracks.find((e) => e.do === 'line').line;
    const chain = [];
    for (let l = lines.get(said); l; l = lines.get(l.next)) chain.push(l);
    expect(chain.map((l) => l.speaker)).toEqual(['junie', 'ellen', 'wyatt']);
    const d = byId.get('ending.defeat');
    expect(d.style).toBe('black');
    const voices = [];
    for (let l = lines.get(d.tracks.find((e) => e.do === 'line').line); l; l = lines.get(l.next)) voices.push(l);
    expect(voices.length).toBe(3);
    expect(voices.every((l) => l.channel === 'radio' && (l.text.includes('Tom') || l.text.includes('Dad')))).toBe(true);
  });
});
