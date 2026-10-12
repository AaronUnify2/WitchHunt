import { describe, it, expect } from 'vitest';
import { createStats, loadStats, formatDuration, summaryRows } from '../src/core/runStats.js';
import ending from '../src/data/ending.json';

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

  it('the ending has its cards, in DESIGN.md order, and the defeat its radio voices', () => {
    const v = ending.victory;
    expect(v[0].style).toBe('cctv'); // trail cams
    expect(v[1].caption).toContain('GROUND ZERO');
    expect(v[2].style).toBe('dawn');
    expect(v.slice(3).every((c) => c.speaker && c.text)).toBe(true);
    expect(ending.defeat[0].speaker).toBe('Radio');
    expect(ending.defeat.slice(1).every((c) => c.text.includes('Tom') || c.text.includes('Dad'))).toBe(true);
  });
});
