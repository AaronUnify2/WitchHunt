import { describe, it, expect } from 'vitest';
import { soundOf, groupFiles, audibleBounds, loopPeriod, splitBySilence, slicesToTakes, nightness, steadyBounds, bakeLoop } from '../src/audio/audioFiles.js';
import { ambienceState } from '../src/audio/Ambience.js';
import audioFileList from 'virtual:audio-files';

describe('audio files (the Suno test)', () => {
  it('names a file by its folder and sound, takes folded together', () => {
    expect(soundOf('sfx/groan_2.mp3')).toEqual({ folder: 'sfx', name: 'groan', set: false });
    expect(soundOf('music/title.mp3')).toEqual({ folder: 'music', name: 'title', set: false });
    expect(soundOf('voice/gas.scanner.1b.mp3')).toEqual({ folder: 'voice', name: 'gas.scanner.1b', set: false });
    expect(soundOf('sfx/groan_set.mp3')).toEqual({ folder: 'sfx', name: 'groan', set: true });
    expect(soundOf('loose.mp3')).toBe(null);
  });

  it('groups the list by folder and sound', () => {
    const g = groupFiles(['sfx/groan_1.mp3', 'sfx/groan_2.mp3', 'sfx/rifle.mp3', 'music/title.mp3']);
    expect(g.sfx.groan).toEqual(['sfx/groan_1.mp3', 'sfx/groan_2.mp3']);
    expect(g.sfx.rifle).toEqual(['sfx/rifle.mp3']);
    expect(g.music.title).toEqual(['music/title.mp3']);
    expect(g.voice).toEqual({});
  });

  it('trims silence off either end, keeping a little', () => {
    const d = new Float32Array(1000);
    d.fill(0.5, 300, 600);
    expect(audibleBounds([d], 1000, 0.003, 0.01)).toEqual({ start: 290, end: 610 });
    expect(audibleBounds([new Float32Array(50)], 1000)).toEqual({ start: 0, end: 50 });
  });

  it('loops with a crossfade no longer than a third of the track', () => {
    expect(loopPeriod(120, 4)).toEqual({ period: 116, fade: 4 });
    expect(loopPeriod(6, 4)).toEqual({ period: 4, fade: 2 });
  });

  it('the build lists only audio files in public/audio', () => {
    expect(Array.isArray(audioFileList)).toBe(true);
    for (const p of audioFileList) expect(p).toMatch(/\.(mp3|ogg|wav|m4a|aac|flac)$/i);
  });

  it('a set goes in with its sound, marked as a set', () => {
    const g = groupFiles(['sfx/groan_set.mp3', 'sfx/groan_4.mp3']);
    expect(g.sfx.groan).toEqual(['sfx/groan_set.mp3', 'sfx/groan_4.mp3']);
    expect(g.sets.has('sfx/groan_set.mp3')).toBe(true);
    expect(g.sets.has('sfx/groan_4.mp3')).toBe(false);
  });

  it('cuts a set into takes where it goes quiet', () => {
    const rate = 1000;
    const d = new Float32Array(5000);
    // three sounds: 0.2-0.9 s, 1.8-2.4 s (with a short dip inside), 3.5-4.6 s
    for (const [a, b] of [[200, 900], [1800, 2400], [3500, 4600]]) for (let i = a; i < b; i++) d[i] = Math.sin(i) * 0.5;
    for (let i = 2050; i < 2150; i++) d[i] = 0; // 0.1 s dip: not a gap
    d.fill(0.001, 4600, 5000); // room tone, well under the floor
    const takes = splitBySilence([d], rate, { gapSeconds: 0.3, padSeconds: 0 });
    expect(takes.length).toBe(3);
    expect(Math.abs(takes[0].start - 200)).toBeLessThanOrEqual(20);
    expect(Math.abs(takes[1].end - 2400)).toBeLessThanOrEqual(20);
    expect(Math.abs(takes[2].end - 4600)).toBeLessThanOrEqual(20);
  });

  it('or at the timestamps given', () => {
    expect(slicesToTakes([[0.5, 1.25], [2, 9]], 1000, 4000)).toEqual([{ start: 500, end: 1250 }, { start: 2000, end: 4000 }]);
  });

  it('night comes in through dusk and goes through dawn', () => {
    expect(nightness('day', 0.5)).toBe(0);
    expect(nightness('dusk', 0.25)).toBe(0.25);
    expect(nightness('night', 0)).toBe(1);
    expect(nightness('dawn', 0.75)).toBe(0.25);
  });

  it('the ambience is quiet in the footage cutscenes, not the first-person ones', () => {
    const clock = { phase: 'night', phaseProgress: 0 };
    const base = { running: true, clock, inShop: false, quietStyles: ['cctv', 'black'] };
    expect(ambienceState({ ...base, cutscene: { data: { style: 'cctv' } } }).quiet).toBe(true);
    expect(ambienceState({ ...base, cutscene: { data: { style: 'firstPerson' } } }).quiet).toBe(false);
    expect(ambienceState({ ...base, cutscene: null }).night).toBe(1);
  });

  it('finds the steady part of a loop Suno faded in and out', () => {
    const d = new Float32Array(10000);
    for (let i = 0; i < 10000; i++) d[i] = Math.sin(i) * Math.min(1, i / 2000, (10000 - i) / 1000);
    const { start, end } = steadyBounds([d], 1000, { ratio: 0.5, windowSeconds: 0.1 });
    expect(start).toBeGreaterThanOrEqual(900);
    expect(start).toBeLessThanOrEqual(1100);
    expect(end).toBeGreaterThanOrEqual(9400);
    expect(end).toBeLessThanOrEqual(9600);
  });

  it('bakes a seamless loop: its end flows into its start', () => {
    const d = Float32Array.from({ length: 1000 }, (_, i) => i / 1000); // a ramp: a jump at the join if looped raw
    const out = bakeLoop(d, 100);
    expect(out.length).toBe(900);
    expect(Math.abs(out[0] - d[900])).toBeLessThan(0.01); // the join: the last sample (899) runs on into 900's
    expect(out[899]).toBeCloseTo(d[899]);
    expect(out[150]).toBeCloseTo(d[150]);
  });
});
