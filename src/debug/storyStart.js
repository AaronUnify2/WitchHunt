// Debug: start playing from a point in the story (Aaron, after Session 26:
// "an option to begin playing from outpost cleared, for thorough testing").
//
// Puts the run where it would be had the opening been played: Skip intro's
// Dawn 1 set-up (FirstDay.skipIntro), then every story flag up to the
// outpost's barricade, and each opening encounter's own saved state as it
// would be at the end (through their loadState, the same path a Continue
// takes, so nothing's half done): the campsite looted, the gas station's
// beats done and its safe open, the storm shelter's sigil dug, Earl down,
// the tapes watched, the outpost's approach and barricade peak done. Tom
// carries what he'd have found (the shovel, the service rifle, the shotgun,
// the hunting rifle with its gun-pit rounds) and the papers are handed in.
// The clock goes to the morning of day 3; Tom stands in the outpost's
// compound, facing the checkpoint.
//
// explored: the compound's beats are done too (the crates, the containers,
// C-7, the resin body, the armoury, the field report and the manifest, the
// dogfight from the watchtower), so the next step is the checkpoint itself.
// Without it they're still to find.
//
// Best on a fresh run (New Run or Skip intro): it builds on Dawn 1.

import { frameToWorld } from '../world/clearingFrame.js';

// Every flag the opening sets on the way to the outpost's barricade, in order (data/progress.json).
export const OUTPOST_CLEARED_FLAGS = [
  'aidBoxTaken', 'towerClimbed', 'campsiteVisited', 'shotgunFound', 'campsiteCleared', 'campsiteBattery', 'day1Home', 'day1Battery', 'night1Planted', 'night1', 'day2',
  'gasStationVisited', 'gasMutantKilled', 'earlNoteRead', 'scannerHeard', 'gasWitchSeen', 'shelterCall',
  'earlCombination', 'shelterVisited', 'earlDown', 'shelterSigilDug', 'shelterOpened', 'shelterEntered', 'homeStop',
  'rifleClaimed', 'outpostCall', 'outpostEntered', 'outpostCleared',
];

// The papers and tapes picked up and handed in by then (data/lore.json ids).
export const OUTPOST_LORE = ['camcorder', 'earlNote', 'pruittDiary', 'pruittTapes'];
export const COMPOUND_LORE = ['fieldReport', 'outpostManifest'];

// The opening encounters' saved states at the outpost's barricade (their loadState formats).
export function openingStates(cfg, { explored = false, waves = 1, crates = 0 } = {}) {
  return {
    gasStation: { searched: [], done: ['phone', 'scannerTried', 'scanner', 'note', 'safe'], arrived: true, pack: true, mutant: 'down', witch: true, junie: false, safe: true, shelterTalk: false, weaponTold: true, quadTold: true, pumps: [] },
    shelter: { arrived: true, earlDown: true, keysAt: null, keysTaken: true, sigilDug: true, risenTold: true, hatch: 'open', searched: ['diary', 'tapes'], beenDown: true, tapesWatched: true },
    outpost: {
      approach: true,
      helmet: true,
      waves,
      towerTold: true,
      rounds: true,
      dogfight: explored,
      sites: [],
      peak: 'done',
      entered: true,
      searched: explored ? ['armoury', 'report', 'manifest', 'manifestRead'] : [],
      crates: new Array(crates).fill(explored ? 1 : 0),
      auto: explored,
      told: explored ? ['beetleHint', 'beetleBurst', 'beetlesDone', 'crate', 'c7', 'c7Visited', 'resinOpen', 'generatorHint', 'turretHint'] : ['generatorHint', 'turretHint'],
      floods: explored,
      turret: 'dead',
    },
  };
}

// The whole jump, on the live game.
export function startFromOutpostCleared(game, { explored = false } = {}) {
  const g = game;
  const cfg = g.cfg;
  // Whatever's showing goes.
  for (let i = 0; i < 20 && g.cutscenes.active; i++) g.cutscenes.stop(true);
  g.subtitles.clear();
  g.paper.isOpen && g.paper.close();
  g.watch.clear();
  // Dawn 1, as Skip intro leaves it (the fence, the shovel, the rifle, the shotgun, the campsite done).
  if (!g.progress.has('day1Battery')) g.firstDay.skipIntro();
  for (const f of OUTPOST_CLEARED_FLAGS) g.progress.setFlag(f);
  // The shelter's sigil (Night 1's) is dug.
  const sigil = g.shelter.sigil();
  if (sigil) g.director.remove(sigil);
  // Each encounter as it'd be by now, through its own load (as a Continue does).
  const op = g.outpost;
  const st = openingStates(cfg, { explored, waves: op.oc?.approach?.waves?.length ?? 1, crates: op.crates?.length ?? 0 });
  g.gasStation.loadState(st.gasStation);
  g.shelter.loadState(st.shelter);
  op.loadState(st.outpost);
  op.checkCall?.();
  // What he carries: the hunting rifle from the safe, with the gun pit's rounds.
  const w = g.combat.weapons;
  const rifle = cfg.gasStation.safe.weapon;
  if (!w.has(rifle)) g.combat.giveWeapon(rifle, 0);
  w.addAmmo(w.ammoType(rifle), op.oc?.tower?.rounds ?? 10); // the gun pit's box (Outpost: the rounds)
  // The papers and tapes, handed in.
  for (const id of explored ? [...OUTPOST_LORE, ...COMPOUND_LORE] : OUTPOST_LORE) {
    g.lore.give(id);
    g.lore.handIn(id);
  }
  // The opening's lines are heard (no Day 1 nudges); the dialogue's pending queue goes.
  for (const l of g.dialogue.lines) if (l.script === 'day1') g.dialogue.heard.add(l.id);
  g.dialogue.pending.length = 0;
  g.dialogue.later.length = 0;
  // The morning of day 3.
  const c = g.clock;
  c.day = 3;
  c.phaseIndex = cfg.clock.phases.findIndex((p) => p.name === 'day');
  c.phaseElapsed = c.currentPhase.seconds * 0.1;
  g.nightWatch.forecastDue = false;
  g.nightWatch.closeForecast?.();
  // In the compound, facing the checkpoint.
  if (op.frame) {
    const at = frameToWorld(op.frame, 2, 14);
    g.player.teleport(at.x, at.z, Math.atan2(-op.frame.fx, -op.frame.fz));
    g.mapUi.fog.reveal(at.x, at.z, 60);
  }
  // The later beats work themselves out from the flags.
  g.plane?.reset();
  g.comms?.reset();
  g.junieTaken?.reset();
  g.church?.reset();
  g.stairs?.reset();
  // Lines the flags just set off (the shelter call and the like) belong to the opening: gone.
  g.subtitles.clear();
  g.dialogue.pending.length = 0;
  g.dialogue.later.length = 0;
  g.toast.show(explored ? 'Debug: the outpost cleared and explored. The checkpoint is open' : 'Debug: the outpost cleared. The compound is still to explore');
}

// ---- Session 33: later start points (HANDOVER: "the plane done", "Junie home") ---------------------------

// The flags each later stretch sets, in order (data/progress.json).
export const PLANE_DOWN_FLAGS = ['crossedCordon', 'planeSeen', 'planeStandoff', 'planeGreyDown'];
export const PLANE_DONE_FLAGS = ['planeLooted', 'planeLogRead', 'planeCellTaken', 'mothmanMet', 'planeDone'];
export const JUNIE_TOLD_FLAGS = ['junieTaken', 'familyAccount', 'junieClipSeen'];
export const CHURCH_FLAGS = ['churchVisited', 'plaqueRead', 'capsuleDug', 'capsuleOpened', 'capsuleRead', 'stairsKnown'];
export const JUNIE_FOUND_FLAGS = ['stairsSeen', 'stairsMoths', 'stairsClimbed', 'junieFound'];

// Which flags a start point sets on top of the outpost's: 'greyDown' | 'planeDone' | 'junieFound' | 'junieHome'.
export function laterFlags(point) {
  const down = PLANE_DOWN_FLAGS;
  if (point === 'greyDown') return [...down];
  if (point === 'planeDone') return [...down, ...PLANE_DONE_FLAGS];
  const found = [...down, ...PLANE_DONE_FLAGS, ...JUNIE_TOLD_FLAGS, ...CHURCH_FLAGS, ...JUNIE_FOUND_FLAGS];
  if (point === 'junieFound') return found;
  if (point === 'junieHome') return [...found, 'junieHome'];
  return [];
}

// The jump: the outpost cleared and explored, then on to `point`.
//  - greyDown: at the crashed plane, the grey just shot, what it dropped still lying by it.
//  - planeDone: waking at the wreck at dawn after the Mothman (the family's account and the clip follow).
//  - junieFound: at the foot of the stairs with Junie, the quad beside them, the walk home ahead.
//  - junieHome: just inside the gate, Junie home (Ellen asks for the power cell in a moment).
export function startFromLater(game, point) {
  const g = game;
  startFromOutpostCleared(g, { explored: true });
  const flags = laterFlags(point);
  // The grey's drops, as the search gives them (before the flags say it's been searched).
  if (flags.includes('planeLooted') && !g.progress.has('planeLooted')) {
    for (const f of PLANE_DOWN_FLAGS) g.progress.setFlag(f);
    g.plane?.reset();
    g.plane?.ready && g.plane.loot();
  }
  for (const f of flags) g.progress.setFlag(f);
  g.plane?.reset();
  g.junieTaken?.reset();
  g.church?.reset();
  const face = (x, z, tx, tz) => g.player.teleport(x, z, Math.atan2(-(tx - x), -(tz - z)));
  if (point === 'greyDown' && g.plane?.ready) {
    const gr = g.plane.grey;
    const w = g.plane.spot('work');
    const b = g.plane.spot('bench');
    const l = Math.hypot(w.x - b.x, w.z - b.z) || 1;
    face(gr.x + ((w.x - b.x) / l) * 7, gr.z + ((w.z - b.z) / l) * 7, gr.x, gr.z);
  } else if (point === 'planeDone' && g.plane?.ready) {
    g.progress.setFlag('planeDone', false); // wake() sets it: the night passes, he's at the survival kit at dawn
    g.progress.setFlag('mothmanMet', false);
    g.plane.state = 'mothman';
    g.plane.wake();
  } else if (point === 'junieFound' && g.stairs?.ready) {
    const f = g.stairsSite.spots.foot;
    const yaw = g.stairsSite.place.yaw;
    g.player.teleport(f.x - Math.sin(yaw) * 4, f.z - Math.cos(yaw) * 4, yaw);
    g.quad?.place?.(f.x - Math.sin(yaw) * 6 + Math.cos(yaw) * 3, f.z - Math.cos(yaw) * 6 - Math.sin(yaw) * 3, yaw);
  } else if (point === 'junieHome') {
    const L = g.station.layout;
    const d = L.cabin.frontDoor;
    g.player.teleport(d.x + (d.x - L.cabin.x) * 0.6, d.z + (d.z - L.cabin.z) * 0.6, g.player.yaw);
  }
  g.stairs?.reset();
  g.comms?.reset();
  g.caller?.reset();
  g.subtitles.clear();
  g.dialogue.pending.length = 0;
  g.dialogue.later.length = 0;
  g.mapUi.fog.reveal(g.player.position.x, g.player.position.z, 60);
  const said = { greyDown: 'the grey is down at the plane, still to search', planeDone: 'waking at the wreck at dawn', junieFound: 'Junie found: she follows you home', junieHome: 'Junie is home' };
  g.toast.show(`Debug: ${said[point] ?? point}`);
}
