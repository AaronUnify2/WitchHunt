// What a run did, for the run summary (pure; M7 step 6). Counted from
// events by Game, saved with the run so a continued run keeps them.

export function createStats() {
  return { kills: 0, sigilsDug: 0, sigilsPlanted: 0, ritualsBroken: 0, witchDamage: 0, witchEncounters: 0, seconds: 0 };
}

// A saved stats object back (missing fields start at 0; junk ignored).
export function loadStats(d) {
  const s = createStats();
  if (!d || typeof d !== 'object') return s;
  for (const k of Object.keys(s)) if (Number.isFinite(d[k]) && d[k] >= 0) s[k] = d[k];
  return s;
}

// "1h 23m", "12m", "45s".
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

// The summary's rows: [[label, value]]. nights: the nights survived.
export function summaryRows(stats, nights) {
  return [
    ['Nights survived', String(nights)],
    ['Zombies killed', String(stats.kills)],
    ['Sigils dug up', String(stats.sigilsDug)],
    ['Sigils she planted', String(stats.sigilsPlanted)],
    ['Rituals you broke', String(stats.ritualsBroken)],
    ['Times you fought her', String(stats.witchEncounters)],
    ['Damage dealt to her', String(Math.round(stats.witchDamage))],
    ['Time played', formatDuration(stats.seconds)],
  ];
}
