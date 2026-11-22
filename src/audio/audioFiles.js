// Real audio files (Suno, Nov 2026; docs/AUDIO_CUES.md), alongside the
// synthesised placeholders. The build lists what's in public/audio
// (vite.config.js, `virtual:audio-files`); this sorts that list by folder and
// sound name. A file named after a sound plays in its place; takes of one
// sound are numbered (groan_1.mp3, groan_2.mp3) and one is picked at random.

const EXT = /\.[a-z0-9]+$/i;
const TAKE = /_(\d+)$/;

// 'sfx/groan_2.mp3' -> { folder: 'sfx', name: 'groan' }. Null if it isn't in a folder.
export function soundOf(path) {
  const parts = path.split('/');
  if (parts.length < 2) return null;
  const folder = parts[0];
  const name = parts[parts.length - 1].replace(EXT, '').replace(TAKE, '');
  return name ? { folder, name } : null;
}

// The list -> { sfx: { groan: ['sfx/groan_1.mp3', ...] }, music: {...}, voice: {...} }.
export function groupFiles(paths) {
  const out = { sfx: {}, music: {}, voice: {} };
  for (const p of paths) {
    const s = soundOf(p);
    if (!s) continue;
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
