// Session 22 (M10.3 spike): what the parts bolted onto the dozer change,
// as pure logic (tested). Each part (config.spikes.dozerParts) can multiply
// the dozer's crush numbers (config.dozer.crush), scale how long a big tree
// holds the blade, and stop the dead climbing on. Fitted parts stack.

// The dozer's numbers with these parts fitted: { crush, strainScale, noClimbers }.
export function partMods(baseCrush, partsCfg, fitted) {
  const crush = { ...baseCrush };
  let strainScale = 1;
  let noClimbers = false;
  for (const id of fitted) {
    const p = partsCfg[id];
    if (!p) continue;
    for (const [k, m] of Object.entries(p.crush ?? {})) if (typeof crush[k] === 'number') crush[k] *= m;
    strainScale *= p.strainScale ?? 1;
    noClimbers ||= Boolean(p.noClimbers);
  }
  return { crush, strainScale, noClimbers };
}

// Fit or take off a part: the new list (no duplicates, the config's order).
export function toggledParts(partsCfg, fitted, id) {
  if (!partsCfg[id]) return fitted;
  const on = new Set(fitted);
  if (on.has(id)) on.delete(id);
  else on.add(id);
  return Object.keys(partsCfg).filter((k) => on.has(k));
}
