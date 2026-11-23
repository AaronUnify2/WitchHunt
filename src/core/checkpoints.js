// Checkpoints (Nov 23; Aaron, play-test: "When you die it's a bit rough going back to the beginning").
// A second save slot (config.save.checkpointKey) written at each autosave (dawn, Skip intro, past the
// campground) and at each dusk. Death, or the station falling, offers to try again from it: Game copies it
// into the run's save slot (retrySave) and reloads, the way Day 1's campground retry always has.
// Pure: Game does the saving and the reload.

// What the death screen calls it: "try again from <label>". phase, day: the clock when it was made.
// Dawn on day d is the morning after night d, the start of Day d + 1 (Skip intro starts there: Day 2).
export function checkpointLabel(phase, day, place = null) {
  if (place) return place;
  if (phase === 'dawn') return `the start of Day ${day + 1}`;
  if (phase === 'dusk') return `the start of Night ${day}`;
  if (phase === 'night') return `Night ${day}`;
  return `Day ${day}`;
}

// Is it a checkpoint for this run? (A stale one from another map is ignored.)
export function checkpointFor(d, seed, valid) {
  return Boolean(d && valid(d) && d.checkpoint && String(d.seed) === String(seed));
}

// The save a retry loads: the checkpoint as it was, with the run's live stats (time played and kills carry on
// across a retry) counting this retry, and at least minHealth to start on. Never changes `checkpoint`.
export function retrySave(checkpoint, liveStats = {}, minHealth = 0) {
  const d = JSON.parse(JSON.stringify(checkpoint));
  const retries = Number.isFinite(liveStats?.retries) ? liveStats.retries : 0;
  d.stats = { ...(d.stats ?? {}), ...(liveStats ?? {}), retries: retries + 1 };
  if (Number.isFinite(d.player?.health)) d.player.health = Math.max(d.player.health, minHealth);
  d.checkpoint = { ...d.checkpoint, retried: true };
  return d;
}
