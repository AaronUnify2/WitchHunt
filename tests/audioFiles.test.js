import { describe, it, expect } from 'vitest';
import { soundOf, groupFiles, audibleBounds, loopPeriod } from '../src/audio/audioFiles.js';
import audioFileList from 'virtual:audio-files';

describe('audio files (the Suno test)', () => {
  it('names a file by its folder and sound, takes folded together', () => {
    expect(soundOf('sfx/groan_2.mp3')).toEqual({ folder: 'sfx', name: 'groan' });
    expect(soundOf('music/title.mp3')).toEqual({ folder: 'music', name: 'title' });
    expect(soundOf('voice/gas.scanner.1b.mp3')).toEqual({ folder: 'voice', name: 'gas.scanner.1b' });
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
});
