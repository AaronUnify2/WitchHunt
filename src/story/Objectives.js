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
// current: { id, text, at: { x, z } | null } (at null: nothing to point at).
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
  }

  init(game) {
    this.g = game;
  }

  update(dt) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.4;
    const next = this.work() ?? { id: 'none', text: '', at: null };
    const changed = next.id !== this.current.id;
    this.current = next;
    if (changed) this.bus?.emit('objective:changed', { id: next.id, text: next.text });
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
    const step = (id, text, at = null) => ({ id, text, at: at ? { x: at.x, z: at.z } : null });
    const day1 = clock.day === 1 && clock.phase === 'day';
    const watching = (id) => g.watch?.has(id);

    // ---- Day 1 ----
    if (day1 || (clock.day === 1 && !has('night1Planted') && clock.phase !== 'night')) {
      if (!has('towerClimbed')) return step('tower', 'Go outside and climb the lookout tower. Ellen needs eyes on the woods.', L.tower.ladder);
      if (!has('campsiteVisited')) return step('campsite', 'Check on the campers at the campground, west of home.', clearing('campsite'));
      if (watching('camcorder')) return step('camcorder', "Watch the campers' camcorder (D-pad down).");
      if (!cs.shotgunFound || !cs.camcorderFound) return step('search', "Search the campers' tents.", this.nearestTent());
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
      if (!gas.done.has('scanner')) return step('scanner', "Try Earl's radio in the back office.", at('scanner'));
      if (!gas.done.has('note')) return step('note', "Look round Earl's office. There's a note on the desk.", at('note'));
    }

    // ---- the shovel and the storm shelter ----
    const shovel = g.combat.weapons.order.includes('shovel');
    if (!shovel && has('shelterCall')) return step('shovel', 'Fetch the shovel from beside the cabin door.', st.shovelSpot());
    if (sh?.frame && has('shelterCall')) {
      if (!has('shelterVisited')) return step('shelter', "Go to the Pruitts' storm shelter, on their land east of home.", sh.frame);
      const sig = sh.sigil();
      if (sig) return step('shelterSigil', "Dig up the sigil beside the shelter's hatch.", sig);
      if (!sh.keysTaken) return step('keys', sh.earlDown ? "Take Earl's keys from where he fell." : 'Put Earl down. His keys have the combination.', sh.earlDown ? sh.keysAt : (sh.earl ?? sh.hatchAt));
      if (sh.hatch !== 'open') return step('hatch', "Dig the shelter's hatch clear and open it.", sh.hatchAt);
      if (!sh.searched.has('diary') || !sh.searched.has('tapes')) return step('room', "Go down into the shelter. Find Earl's diary and his tapes.", sh.hatchAt);
    }

    // ---- home with the tapes; the safe ----
    if (g.lore.carrying.includes('pruittTapes')) return step('tapes', "Take Earl's tapes home and hand them in at the ledger.", L.cabin.desk);
    if (has('earlCombination') && !has('rifleClaimed') && gas.frame) {
      const s = gas.spots.find((x) => x.id === 'safe');
      return step('safe', "Open the gas station's safe with Earl's combination.", s);
    }
    // ---- the military outpost (Session 17, M9.4) ----
    const op = g.outpost;
    if (op?.frame && has('outpostCall') && !has('outpostCleared')) {
      if (!op.approachStarted) return step('outpost', 'Take the road past the gas station to the military checkpoint. Tell them the witch is loose.', frameToWorld(op.frame, 44, -33));
      if (op.peakState === 'none') {
        if (!op.approachDone) return step('outpostRoad', 'Fight your way down the road to the checkpoint.', op.gapAt);
        if (!op.roundsTaken) return step('outpostTower', "Climb the outpost's watchtower. The snipers' rounds will be up there.", op.ladderAt);
        return step('outpostBarricade', 'Get to the barricade.', op.gapAt);
      }
      return step('outpostPeak', 'Hold the barricade.');
    }
    if (op?.frame && has('outpostCleared') && !has('crossedCordon')) {
      const pt = (id) => op.points.find((x) => x.id === id);
      if (!op.searched.has('armoury')) return step('outpostArmoury', "Search the outpost's armoury lockers.", pt('armoury'));
      if (!op.searched.has('report')) return step('outpostReport', "Find the field report in the outpost's comms hut.", pt('report'));
      return step('cross', 'The checkpoint is open. Go through, into the south.', g.world.map.cluster.checkpoint);
    }
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
