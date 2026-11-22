// Real audio files (Suno, Nov 2026; docs/AUDIO_CUES.md), alongside the
// synthesised placeholders. The build lists what's in public/audio
// (vite.config.js, `virtual:audio-files`); this sorts that list by folder and
// sound name. A file named after a sound plays in its place; takes of one
// sound are numbered (groan_1.mp3, groan_2.mp3) and one is picked at random.

//
// Nov 2026 (Aaron: Suno's downloads are limited): several takes in one file,
// named `<sound>_set` (groan_set.mp3: three groans with gaps between), are
// cut apart at the silences (splitBySilence), or at timestamps given in
// config.sfx.slices.

const EXT = /\.[a-z0-9]+$/i;
const TAKE = /_(\d+)$/;
const SET = /_set$/;

// 'sfx/groan_2.mp3' -> { folder: 'sfx', name: 'groan', set: false }. Null if it isn't in a folder.
export function soundOf(path) {
  const parts = path.split('/');
  if (parts.length < 2) return null;
  const folder = parts[0];
  const base = parts[parts.length - 1].replace(EXT, '');
  const set = SET.test(base);
  const name = base.replace(SET, '').replace(TAKE, '');
  return name ? { folder, name, set } : null;
}

// The takes in a set: [{ start, end }] in samples, split where it's quiet
// (floorDb under its loudest moment) for at least gapSeconds. Each take is at
// least minSeconds; a little is kept either side (padSeconds).
export function splitBySilence(channels, sampleRate, { gapSeconds = 0.3, floorDb = -36, minSeconds = 0.15, padSeconds = 0.04, windowSeconds = 0.02 } = {}) {
  const length = channels[0]?.length ?? 0;
  const win = Math.max(1, Math.round(windowSeconds * sampleRate));
  const levels = [];
  let peak = 0;
  for (let i = 0; i < length; i += win) {
    let sum = 0;
    let n = 0;
    for (const data of channels) {
      for (let j = i; j < Math.min(length, i + win); j++) {
        sum += data[j] * data[j];
        n++;
      }
    }
    const rms = Math.sqrt(sum / Math.max(1, n));
    levels.push(rms);
    if (rms > peak) peak = rms;
  }
  if (peak <= 0) return [];
  const floor = peak * 10 ** (floorDb / 20);
  const gapWins = Math.max(1, Math.round(gapSeconds / windowSeconds));
  const takes = [];
  let start = -1;
  let quiet = 0;
  for (let w = 0; w <= levels.length; w++) {
    const loud = w < levels.length && levels[w] > floor;
    if (loud) {
      if (start < 0) start = w;
      quiet = 0;
    } else if (start >= 0) {
      quiet++;
      if (quiet >= gapWins || w === levels.length) {
        takes.push([start, w - quiet + 1]);
        start = -1;
        quiet = 0;
      }
    }
  }
  const pad = Math.round(padSeconds * sampleRate);
  return takes
    .map(([a, b]) => ({ start: Math.max(0, a * win - pad), end: Math.min(length, b * win + pad) }))
    .filter((t) => t.end - t.start >= minSeconds * sampleRate);
}

// Timestamps (seconds, [[from, to], ...]) as takes in samples.
export function slicesToTakes(slices, sampleRate, length) {
  return slices
    .map(([a, b]) => ({ start: Math.max(0, Math.round(a * sampleRate)), end: Math.min(length, Math.round(b * sampleRate)) }))
    .filter((t) => t.end > t.start);
}

// The list -> { sfx: { groan: ['sfx/groan_1.mp3', ...] }, music: {...}, voice: {...}, sets: Set(paths) }.
export function groupFiles(paths) {
  const out = { sfx: {}, music: {}, voice: {}, sets: new Set() };
  for (const p of paths) {
    const s = soundOf(p);
    if (!s) continue;
    if (s.set) out.sets.add(p);
    const folder = (out[s.folder] ??= {});
    (folder[s.name] ??= []).push(p);
  }
  return out;
}

// The part of a clip that isn't silence (Suno pads its downloads): sample
// indices [start, end) across every channel, with a little left either side.
export function audibleBounds(channels, sampleRate, threshold = 0.003, padSeconds = 0.02) {
  const length = channels[0]?.length ?? 0;
  let start = length;
  let end = 0;
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) > threshold) {
        if (i < start) start = i;
        break;
      }
    }
    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) {
        if (i + 1 > end) end = i + 1;
        break;
      }
    }
  }
  if (end <= start) return { start: 0, end: length };
  const pad = Math.round(padSeconds * sampleRate);
  return { start: Math.max(0, start - pad), end: Math.min(length, end + pad) };
}

// When a looped track starts its next pass, crossfading for `fade` seconds
// over the end of the last: the delay from one pass's start to the next's.
export function loopPeriod(duration, fade) {
  const f = Math.min(Math.max(0, fade), duration / 3);
  return { period: duration - f, fade: f };
}

// Nov 2026: how night it is, 0 (day) to 1 (night): ramped through dusk and dawn.
export function nightness(phase, progress) {
  if (phase === 'night') return 1;
  if (phase === 'dusk') return Math.min(1, Math.max(0, progress));
  if (phase === 'dawn') return 1 - Math.min(1, Math.max(0, progress));
  return 0;
}
