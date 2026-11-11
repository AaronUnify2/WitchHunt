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
