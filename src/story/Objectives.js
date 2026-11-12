// What to do next (Session 16, Aaron): "from here on, every quest item is
// marked on the map". Worked out from the story's state every so often:
// the first step not yet done, as one sentence (on the map screen, D-pad
// up) and, where it has one, a spot in the world (a marker on the map, and
// on the minimap's rim when it's off the edge, so Tom knows which way to
// head). The steps follow the opening cluster's order: Day 1 (the tower,
// the campsite, the battery, the fence, Junie), Night 1, the gas station,
// the shovel, the storm shelter, the tapes home, the safe; Session 17: the
// outpost (the road, the watchtower, the barricade, the armoury, the report, the checkpoint).
//
// current: { id, text, at: { x, z } | null, ats: [{ x, z }] } (at null: nothing
// to point at). Session 19 round 3 (Aaron: the outpost's beats come in any
// order): a step can point at several places at once (ats; at is the first).
//
// Session 17 (Aaron: more breadcrumbs from the family): stuck on the same
// step a while (config.objectives.hintAfter, while playing), the family give
// a nudge: the line `hint.<step id>` if there is one, once.
//
// Events: 'objective:changed' { id, text }.

import { frameToWorld } from '../world/clearingFrame.js';

export class Objectives {
  // g: the Game (its story systems are read, never changed).
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.bus = bus;
    this.current = { id: 'none', text: '', at: null };
    this.timer = 0;
    this.stuck = 0; // seconds on this step, while playing
  }

  init(game) {
    this.g = game;
  }

  // playing: the world's running and Tom can act (the breadcrumbs' clock only runs then).
  update(dt, playing = true) {
    if (playing) this.stuck += dt;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.4;
    const next = this.work() ?? { id: 'none', text: '', at: null };
    const changed = next.id !== this.current.id;
    this.current = next;
    if (changed) {
      this.stuck = 0;
      this.bus?.emit('objective:changed', { id: next.id, text: next.text });
    }
    this.breadcrumb(playing);
  }

  // A nudge from the family, once per step, after a while stuck on it.
  breadcrumb(playing) {
    const d = this.g?.dialogue;
    const id = `hint.${this.current.id}`;
    if (!playing || !d?.byId?.has(id) || d.heard?.has(id)) return;
    const h = this.cfg.objectives?.hintAfter ?? {};
    if (this.stuck < (h[this.current.id] ?? h.default ?? 100)) return;
    if (this.g.witchEscape?.engaged || this.g.subtitles?.busy) return;
    d.play(id);
  }

  // The first step not done yet: { id, text, at }.
  work() {
    const g = this.g;
    if (!g?.progress) return null;
    const has = (f) => g.progress.has(f);
    const clock = g.clock;
    const st = g.station;
    const L = st.layout;
    const cs = g.campsite;
    const gas = g.gasStation;
    const sh = g.shelter;
    const clearing = (key) => g.world.map.clearings.find((c) => c.cluster && c.key === key);
    const step = (id, text, at = null) => ({ id, text, at: at ? { x: at.x, z: at.z } : null, ats: at ? [{ x: at.x, z: at.z }] : [] });
    // Several places at once (Session 19 round 3): any order.
    const steps = (id, text, list) => {
      const ats = list.filter(Boolean).map((p) => ({ x: p.x, z: p.z }));
      return { id, text, at: ats[0] ?? null, ats };
    };
    const day1 = clock.day === 1 && clock.phase === 'day';
    const watching = (id) => g.watch?.has(id);

    // ---- Day 1 ----
    if (day1 || (clock.day === 1 && !has('night1Planted') && clock.phase !== 'night')) {
      if (!has('towerClimbed')) return step('tower', 'Go outside and climb the lookout tower. Ellen needs eyes on the woods.', L.tower.ladder);
      if (!has('campsiteVisited')) return step('campsite', 'Check on the campers at the campground, west of home.', clearing('campsite'));
      if (watching('camcorder')) return step('camcorder', "Watch the campers' camcorder (D-pad down).");
      if (!cs.shotgunFound || !cs.camcorderFound) return step('search', "Search the campers' shelters.", this.nearestTent());
      if (cs.waveStarted && !cs.waveCleared) return step('wave', 'Fight off the dead at the campground.');
      if (!has('campsiteBattery') && g.combat.inventory.batteries <= 0 && !has('day1Battery')) return step('battery', "Take the battery from the campers' car for the fence.", cs.car);
      if (!has('day1Battery')) return step('fit', 'Take the battery home and fit it in the fence box, inside the gate.', L.fenceBox);
      const broken = st.state.segments.findIndex((s) => s.health <= 0);
      if (broken >= 0) {
        const s = L.segments[broken];
        return step('repair', 'Patch the torn fence (hold X at it, or use the ledger).', L.at((s.a0 + s.a1) / 2, L.radius));
      }
      return step('junie', 'Go inside. Junie wants to talk to you.', L.cabin.frontDoor);
    }

    // ---- Night 1 ----
    if (clock.day === 1 && clock.phase === 'night' && !has('night1Planted')) {
      if (watching('camera6')) return step('camera6', "Watch Ellen's trail cam feed (D-pad down).");
      return step('night1', 'Hold the fence. The dead are coming from the woods.');
    }

    // ---- the gas station ----
    if (!has('gasStationVisited')) return step('gasStation', 'Check on the Pruitts at the gas station, south of the campground.', clearing('gasStation'));
    if (gas.frame) {
      const at = (id) => {
        const s = gas.spots.find((x) => x.id === id);
        return s ? { x: s.x, z: s.z } : null;
      };
      const door = frameToWorld(gas.frame, gas.data.building.door.x, gas.data.building.z1);
      if (gas.mutantState !== 'down') return step('gasInside', 'Search the gas station for the Pruitts.', door);
      if (!gas.witchSeen) return step('gasLook', 'Look round the gas station.', door);
      if (!gas.done.has('phone')) return step('phone', "Try the phone on the gas station's counter.", at('phone'));
      if (!gas.done.has('scanner')) {
        // Session 18 (Aaron): it runs off a car battery.
        if (gas.done.has('scannerTried') && g.combat.inventory.batteries <= 0) return step('scannerBattery', "Earl's scanner needs a car battery. Take one from a car on the forecourt.", gas.sureCar ?? at('scanner'));
        return step('scanner', gas.done.has('scannerTried') ? "Wire the battery into Earl's scanner in the stockroom." : "Try Earl's scanner in the stockroom, out back.", at('scanner'));
      }
      if (!gas.done.has('note')) return step('note', "Look round Earl's office. There's a note on the desk.", at('note'));
    }

    // ---- the shovel and the storm shelter ----
    const shovel = g.combat.weapons.has('shovel');
    if (!shovel && has('shelterCall')) return step('shovel', 'Fetch the shovel from beside the cabin door.', st.shovelSpot());
    if (sh?.frame && has('shelterCall')) {
      if (!has('shelterVisited')) return step('shelter', "Go to the Pruitts' storm shelter, on their land east of home.", sh.frame);
      const sig = sh.sigil();
      if (sig) return step('shelterSigil', "Dig up the sigil beside the shelter's hatch.", sig);
      if (!sh.keysTaken) return step('keys', sh.earlDown ? "Take Earl's keys from where he fell." : 'Put Earl down. His keys have the combination.', sh.earlDown ? sh.keysAt : (sh.earl ?? sh.hatchAt));
      if (sh.hatch !== 'open') return step('hatch', "Dig the shelter's hatch clear and open it.", sh.hatchAt);
      if (!sh.searched.has('diary') || !sh.searched.has('tapes')) return step('room', "Go down into the shelter. Find Earl's diary and the tape in his VCR.", sh.hatchAt);
    }

    // ---- home with the tapes; the safe ----
    // Session 17 (Aaron): tapes are watched on D-pad down; handing them in (for the monitors) isn't a step.
    if (watching('pruittTapes')) return step('tapes', "Watch Earl's tape (D-pad down).");
    // Session 18 (Aaron): home's on the way back from the shelter: stop in and see to the fence.
    if (has('earlCombination') && !has('rifleClaimed') && !has('homeStop')) {
      return step('homeStop', "Stop at home on the way back: spend your scrap on the fence at the ledger, and top up the fence box with a battery.", g.combat.inventory.batteries > 0 ? L.fenceBox : L.cabin.frontDoor);
    }
    if (has('earlCombination') && !has('rifleClaimed') && gas.frame) {
      const s = gas.spots.find((x) => x.id === 'safe');
      return step('safe', "Open the gas station's safe with Earl's combination.", s);
    }
    // ---- the military outpost (Session 17, M9.4) ----
    const op = g.outpost;
    if (op?.frame && has('outpostCall') && !has('outpostCleared')) {
      if (!op.approachStarted) return step('outpost', 'Take the road past the gas station to the military checkpoint. Tell them the witch is loose.', frameToWorld(op.frame, 44, -33));
      // Session 19 round 3 (Aaron): the fight, the floodlights and the machine gun together, in any order.
      const extras = [];
      const jobs = [];
      if (!op.floodsOn && op.generatorAt?.()) {
        extras.push(op.generatorAt());
        jobs.push('turn the floodlights on at the generator');
      }
      if (op.turret?.state === 'dead') {
        extras.push(op.turretAt());
        jobs.push('put a battery in the machine gun');
      }
      if (!op.roundsTaken) {
        extras.push(op.roundsAt());
        jobs.push("find rounds for Earl's rifle in the gun pit");
      }
      const also = jobs.length ? ` ${jobs.join(', ').replace(/^./, (c) => c.toUpperCase())}.` : '';
      if (op.peakState === 'none') return steps('outpostFight', `Defeat the dead at the outpost.${also}`, [op.gapAt, ...extras]);
      return steps('outpostPeak', `Hold the barricade.${also}`, extras);
    }
    if (op?.frame && has('outpostCleared') && !has('crossedCordon')) {
      const pt = (id) => op.points.find((x) => x.id === id);
      // Session 19 round 3 (Aaron): explore the compound, every point of interest on the map at once, any order.
      const list = [];
      // Session 21 (Aaron: points should come off the map as they're cleared): every crate still
      // whole (an opened one goes), C-7 once Tom's been to it (its sweep may have to wait for quiet).
      if (!op.told.has('beetlesDone')) (op.crateAt ?? []).forEach((at, i) => op.crates[i] === 'whole' && list.push(at));
      if (!op.told.has('resinOpen')) list.push(op.resinDoorAt);
      if (!op.told.has('c7') && !op.told.has('c7Visited')) list.push(op.c7At);
      if (!op.searched.has('armoury')) list.push(pt('armoury'));
      if (!op.searched.has('report')) list.push(pt('report'));
      if (!op.searched.has('manifest') && pt('manifest')) list.push(pt('manifest'));
      if (!op.dogfightSeen) list.push(op.ladderAt);
      if (list.filter(Boolean).length) return steps('outpostCompound', "Explore the outpost's compound: the crates, the containers, the lockers, the comms hut, and the view from the watchtower.", list);
      return step('cross', 'The checkpoint is open. Go through, into the south.', g.world.map.cluster.checkpoint);
    }
    // ---- the crashed plane (Session 25) ----
    const pl = g.plane;
    if (pl?.ready && has('crossedCordon') && !has('planeDone')) {
      if (!has('planeGreyDown')) return step('plane', 'Find where the plane came down, just past the checkpoint.', pl.spot('work'));
      if (!has('planeLooted')) return step('planeLoot', 'Search the creature. It dropped something.', pl.grey); // Session 33 (Aaron): until it's searched
      return step('planeFlare', "Fire the pilot's signal flare from his survival kit.", pl.spot('kit'));
    }
    // ---- Junie taken (Session 26) ----
    if (has('junieTaken') && !has('familyAccount')) {
      if (g.comms?.state === 'dead') return step('radioHome', "Your radio's smashed. Nobody could reach you all night. Get home.", L.cabin.frontDoor);
      // Session 32 (Aaron: no drive home for a chat): he's told where he wakes, over the radio, in a moment.
      return step('radioWait', "Dawn. Your radio's quiet. Raise them.");
    }
    if (watching('junieClip')) return step('junieClip', 'Watch the south path camera (D-pad down).');
    // Session 32 (Aaron: "we won't call attention to it"): the plane's power cell is no goal here. The fence box still
    // takes it. (Session 33: it's a goal once Junie's home: below.)
    if (has('junieClipSeen') && !has('junieHome')) {
      const spine = (key) => g.world.map.clearings.find((c) => c.key === key);
      const ch = g.church;
      // ---- the old church and the time capsule (Session 26) ----
      if (!has('churchVisited') || !ch?.ready) return step('findJunie', 'Find Junie. Head south.', spine('timeCapsule'));
      if (!has('plaqueRead')) return step('churchLook', 'Look round the old church. There\'s a plaque on a stone by the door.', ch.spot('plaque'));
      if (!has('capsuleDug')) {
        if (!g.combat.weapons.has('shovel')) return step('capsuleShovel', 'Something is buried in front of the plaque stone. Fetch the shovel.', st.shovelSpot());
        return step('capsuleDig', 'Dig in front of the plaque stone.', ch.spot('capsule'));
      }
      if (!has('capsuleOpened')) return step('capsuleOpen', 'Open the copper box.', ch.spot('capsule'));
      if (!has('capsuleRead')) return step('capsuleRead', 'Read the 1903 account. Hand it in at the ledger at home to read it there.', L.cabin.frontDoor);
      // ---- the stairs, the place beyond, Junie home (Session 26) ----
      if (has('junieFound')) return step('junieHome', 'Take Junie home.', L.cabin.frontDoor);
      if (g.placeBeyond?.inside) return step('beyond', 'Never follow the voice. Take the silent path.');
      if (has('stairsKnown') && !has('stairsClimbed')) return step('stairs', "Find Amos Pruitt's staircase, a half day east of the church.", spine('stairs'));
      if (has('stairsKnown')) return step('climb', 'Climb the stairs. Take the silent way, every time.', spine('stairs'));
      return step('findJunie', 'Find Junie.', spine('stairs'));
    }
    // Session 33 (Aaron: "Ellen could say she wants to upgrade the fence naturally after the reunion... we can use
    // the alien shard"): the plane's power cell has its goal again, once Junie's home. Never searched the grey
    // (an old save): back to the plane for it first.
    if (has('junieHome') && !has('planeCellFitted') && pl?.ready) {
      if (has('planeCellTaken')) return step('planeCell', "Fit the plane's alien power cell to the fence box. Ellen wants the fence stronger.", L.fenceBox);
      return step('planeCellBack', 'Go back to the crashed plane and search the creature. Ellen wants what it dropped, for the fence.', pl.grey);
    }
    if (has('junieHome') && !has('blessingBuried')) return step('afterJunie', "Junie's home. Keep the station running, and dig up her sigils.");
    return step('free', 'Keep the station running, and dig up her sigils.');
  }

  // The campsite's nearest unsearched tent (or the clearing).
  nearestTent() {
    const cs = this.g.campsite;
    const p = this.g.player.position;
    let best = null;
    let bestD = Infinity;
    for (const pt of cs.points ?? []) {
      if (!pt.id.startsWith('tent') || cs.searched.has(pt.id)) continue;
      const d = Math.hypot(pt.x - p.x, pt.z - p.z);
      if (d < bestD) {
        best = pt;
        bestD = d;
      }
    }
    return best ?? cs.clearing;
  }
}
