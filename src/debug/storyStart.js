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

export const PLAN_FLAGS = ['junieHome', 'cellAsked', 'planeCellFitted'];
export const DOZER_CAMP_FLAGS = ['familyPlan', 'earlMaps'];
export const DOZER_HOME_FLAGS = ['dozerSeen', 'dozerKey', 'dozerBattery', 'dozerTaken', 'dozerHome'];
export const ZAPPED_FLAGS = ['zapperStarted', 'mothmanHooked', 'mothmanZapped'];
export const CAVE_DONE_FLAGS = ['caveFound', 'caveEntered', 'mothmanDead', 'bigfootFreed', 'blessingBuried'];
export const MEGA_DONE_FLAGS = ['quadMissing', 'megaNightCalled', 'megaNightStarted', 'megaNightDone'];
export const SHIP_DONE_FLAGS = ['shipEntered', 'shipCoreTaken', 'quadReturned', 'shipCoreFitted'];
export const ARMORY_DONE_FLAGS = ['armorySeen', 'armoryLooted', 'turretFound', 'armoryDocs', 'sheriffFreed'];
export const UTE_DONE_FLAGS = ['uteTaken', 'uteEscaped', 'sheriffHome'];

// "Continue story" (Aaron, Nov 12: "a continue story option for each main story encounter"): every main story
// beat past the outpost, in order. Each puts the run at the START of that beat with everything before it done.
// Add a beat's point here, its flags to laterFlags and its placing to startFromLater when the beat is built.
export const STORY_POINTS = [
  { id: 'plane', label: 'The crashed plane: through the checkpoint, the wreck ahead' },
  { id: 'greyDown', label: 'The plane: the grey down, what it dropped still to pick up' },
  { id: 'planeDone', label: 'Junie taken: waking at the wreck at dawn (the account and the clip follow)' },
  { id: 'church', label: 'The old church: told about Junie, the church ahead' },
  { id: 'stairs', label: 'The stairs: the 1903 account read, the stairs ahead (the moths keep them)' },
  { id: 'junieFound', label: 'Junie found: at the stairs, the quad beside you, the walk home ahead' },
  { id: 'junieHome', label: 'Junie home: inside the gate (Ellen asks for the power cell)' },
  { id: 'plan', label: "The family's plan: the cell fitted, the family waiting indoors" },
  { id: 'dozerCamp', label: "The army's dozer: Earl's maps read, the crew's camp ahead" },
  { id: 'dozerHome', label: 'The bug-zapper night: the dozer home, the fence box waiting' },
  { id: 'cave', label: 'The Bigfoot cave: the Mothman zapped and gone north, the fence dead' },
  { id: 'megaNight', label: 'The missing quad and the mega night: Bigfoot freed, the Blessing buried' },
  { id: 'ufo', label: 'The crashed UFO: the mega night survived, the ship ahead, its beam standing' },
  { id: 'armory', label: "The Car Armory: the ship's core fitted, the base's gate ahead" },
  { id: 'ute', label: 'The ute chase: Sheriff freed, the alarms going' },
  { id: 'sheriffHome', label: "Sheriff home: the garage, the turret, his bench (the end of what's built)" },
];

// Which flags a start point sets on top of the outpost's (explored).
export function laterFlags(point) {
  const down = PLANE_DOWN_FLAGS;
  const told = [...down, ...PLANE_DONE_FLAGS, ...JUNIE_TOLD_FLAGS];
  const found = [...told, ...CHURCH_FLAGS, ...JUNIE_FOUND_FLAGS];
  const plan = [...found, ...PLAN_FLAGS];
  switch (point) {
    case 'plane': return ['crossedCordon'];
    case 'greyDown': return [...down];
    case 'planeDone': return [...down, ...PLANE_DONE_FLAGS];
    case 'church': return told;
    case 'stairs': return [...told, ...CHURCH_FLAGS];
    case 'junieFound': return found;
    case 'junieHome': return [...found, 'junieHome'];
    case 'plan': return plan;
    case 'dozerCamp': return [...plan, ...DOZER_CAMP_FLAGS];
    case 'dozerHome': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS];
    case 'cave': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS];
    case 'megaNight': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS, ...CAVE_DONE_FLAGS];
    case 'ufo': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS, ...CAVE_DONE_FLAGS, ...MEGA_DONE_FLAGS];
    case 'armory': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS, ...CAVE_DONE_FLAGS, ...MEGA_DONE_FLAGS, ...SHIP_DONE_FLAGS];
    case 'ute': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS, ...CAVE_DONE_FLAGS, ...MEGA_DONE_FLAGS, ...SHIP_DONE_FLAGS, ...ARMORY_DONE_FLAGS];
    case 'sheriffHome': return [...plan, ...DOZER_CAMP_FLAGS, ...DOZER_HOME_FLAGS, ...ZAPPED_FLAGS, ...CAVE_DONE_FLAGS, ...MEGA_DONE_FLAGS, ...SHIP_DONE_FLAGS, ...ARMORY_DONE_FLAGS, ...UTE_DONE_FLAGS];
    default: return [];
  }
}

// The points that put Tom just outside the cabin door, and those with the dozer parked outside the gate.
const AT_HOME = new Set(['junieHome', 'plan', 'dozerHome', 'megaNight', 'sheriffHome']);
const DOZER_AT_HOME = new Set(['dozerHome', 'megaNight', 'ufo', 'armory', 'ute', 'sheriffHome']);
const AFTER_CAVE = new Set(['megaNight', 'ufo', 'armory', 'ute', 'sheriffHome']);
const AFTER_SHIP = new Set(['armory', 'ute', 'sheriffHome']);

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
  } else if (AT_HOME.has(point)) {
    const L = g.station.layout;
    const d = L.cabin.frontDoor;
    g.player.teleport(d.x + (d.x - L.cabin.x) * 0.6, d.z + (d.z - L.cabin.z) * 0.6, g.player.yaw);
  } else if (point === 'plane' && g.plane?.ready) {
    const cp = g.world.map.cluster.checkpoint;
    const w = g.plane.spot('work');
    face(cp.x, cp.z + 14, w.x, w.z);
  } else if (point === 'church' && g.church?.ready) {
    const c = g.churchSite.place;
    const at = g.churchSite.toWorld(0, -46);
    face(at.x, at.z, c.x, c.z);
  } else if (point === 'stairs' && g.stairs?.ready) {
    const f = g.stairsSite.spots.foot;
    const yaw = g.stairsSite.place.yaw;
    face(f.x - Math.sin(yaw) * 34, f.z - Math.cos(yaw) * 34, f.x, f.z);
  } else if (point === 'dozerCamp' && g.cordonDozer?.ready) {
    const s = g.dozerCampSite;
    const at = s.toWorld(0, -52);
    face(at.x, at.z, s.place.x, s.place.z);
    g.quad?.place?.(at.x + 3, at.z, g.player.yaw);
  }
  // The plane's cell is in the fence box from 'plan' on, wherever the point puts Tom.
  if (flags.includes('planeCellFitted') && g.station.state.capacity < 1000) g.station.state.fitPowerCell?.('planeCell');
  g.cordonDozer?.reset();
  if (point === 'cave' && g.bigfootCave?.ready) {
    // South of the brush at the road's north end (north is -z), the machine facing into it, the fence dead.
    const b = g.roadNorth.layout.brush;
    const z = b.z + b.hz + 6;
    g.dozer.loadState({ x: b.x, z, heading: 0 });
    g.dozer.locked = false;
    g.player.teleport(b.x + 3.5, z + 1, 0);
    g.station.state.charge = 0;
  }
  if (AFTER_CAVE.has(point)) {
    g.roadNorth?.clearBrush?.('load');
    // The quad was left at the clearing crew's camp when Tom took the dozer: that's where the ring is.
    const s = g.dozerCampSite;
    if (s?.place && g.megaNight && !g.megaNight.ring) {
      const at = s.toWorld(3, -40);
      g.megaNight.ring = { x: at.x, z: at.z };
    }
    g.megaNight?.reset();
  }
  g.bigfootCave?.reset();
  if (point === 'ufo' && g.mothership?.ready) {
    const s = g.ufoSite;
    const at = s.toWorld(0, -44);
    face(at.x, at.z, s.place.x, s.place.z);
  }
  if (AFTER_SHIP.has(point)) {
    const st = g.station.state;
    if (st.capacity < 3000) st.fitPowerCell?.('shipCore');
    // Outside the Car Armory's gate, the alien quad he rode there beside him; or, Sheriff freed, at the cage.
    const s = g.armorySite;
    if (s?.place) {
      const at = s.toWorld(0, -34);
      g.alienQuad?.place?.(at.x + 3, at.z - 2, s.place.yaw + Math.PI);
      if (point === 'armory') face(at.x, at.z, s.place.x, s.place.z);
      else if (point === 'ute') face(s.spots.out.x - 1.5, s.spots.out.z - 1.5, s.spots.ute.x, s.spots.ute.z);
    }
  }
  g.carArmory?.reset();
  if (point === 'sheriffHome' && g.uteChase?.garageAt) {
    // The ute pulled up in the garage's first bay.
    const bay = g.uteChase.bays[0];
    g.ute.loadState({ x: bay.x, z: bay.z, heading: g.uteChase.garageAt.yaw });
    g.combat.inventory.addScrap?.(80); // (something to spend at his bench)
  }
  g.uteChase?.reset();
  g.mothership?.reset();
  if (DOZER_AT_HOME.has(point) && g.cordonDozer?.ready) {
    // parked outside the gate, its blade toward home
    const L = g.station.layout;
    const p = L.cabin.frontDoor; // (out past the fence on the door's side, wherever Tom is)
    const dx = p.x - L.centre.x;
    const dz = p.z - L.centre.z;
    const l = Math.hypot(dx, dz) || 1;
    const r = L.radius + 8;
    g.dozer.loadState({ x: L.centre.x + (dx / l) * r, z: L.centre.z + (dz / l) * r, heading: Math.atan2(dx, dz) });
    g.dozer.locked = false;
    const st = g.station.state;
    if (point === 'dozerHome') st.charge = Math.max(st.charge, st.capacity * 0.6); // the night needs a fence;
    else if (!AFTER_SHIP.has(point)) st.charge = 100; // after it there's little, until the ship's core
  }
  g.bugZapper?.reset();
  g.stairs?.reset();
  g.comms?.reset();
  g.caller?.reset();
  g.subtitles.clear();
  g.dialogue.pending.length = 0;
  g.dialogue.later.length = 0;
  g.mapUi.fog.reveal(g.player.position.x, g.player.position.z, 60);
  g.toast.show(`Debug: ${STORY_POINTS.find((s) => s.id === point)?.label ?? point}`);
}
