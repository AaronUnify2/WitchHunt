// The family's plan and the military's dozer (build queue item 1; story
// spine, beat 6 and the start of 7; DESIGN.md "Bigfoot cave and the Mothman
// fight"). SCAFFOLDING: the beat plays from start to end with draft lines and
// a placeholder camp; its depth is for the encounter's own design session.
//
//  1. The plan: with Junie home and Ellen's ask made (cellAsked), the next
//     time Tom's in the cabin the family talk it through (plan.1 on): the
//     capsule's Keeper is Earl's Bigfoot, and Earl's maps of the north ridge
//     are on the corkboard in his storm shelter. Flag familyPlan.
//  2. Earl's maps: a search in the storm shelter (encounters/StormShelter.js,
//     its 'maps' point, offered once the family have asked). A paper with his
//     sightings drawn (earlMaps). Put down, the family read it over the radio:
//     he lives at the end of the old road; the Mothman has him pinned; a flare
//     calls it and the army's dozer has a winch to hold it. Flag earlMaps.
//  3. The camp at the end of the cordon strip (world/DozerCampSite.js): an
//     arrival sweep (dozerSeen), the crew's dead, the keys in the job box
//     (dozerKey), the spare battery by the generator fitted to the machine
//     (dozerBattery). Until both, the Dozer is locked (world/Dozer.js).
//  4. He climbs up (dozerTaken) and drives it home (dozerHome): the dozer
//     inside, or just outside, the fence.
//
// Saved through story flags; the dozer's own place is saved by the Dozer
// (Game: save.dozer). reset() works the rest out from the flags. Off in Demo mode.
//
// Events: 'dozer:plan', 'dozer:maps', 'dozer:taken', 'dozer:home'.

import { HoldAction } from '../player/HoldAction.js';
import { zoneOf } from '../base/stationLayout.js';
import { dozerHeading } from '../world/DozerCampSite.js';
import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// What stands between Tom and driving it: 'key' | 'battery' | null (ready).
export function dozerNeeds({ key, battery }) {
  if (!key) return 'key';
  return battery ? null : 'battery';
}

// What the dozer says when he walks up to it locked. X: the button's name. carrying: batteries in his pack.
export function lockedPrompt(needs, carrying, X) {
  if (needs === 'key') return { prompt: "The army's dozer. The ignition's empty: the crew kept the keys somewhere", act: false };
  if (needs === 'battery') {
    if (carrying > 0) return { prompt: `Hold ${X}: fit a battery to the dozer`, act: true };
    return { prompt: "The dozer's battery is dead. There's a spare on charge by the generator", act: false };
  }
  return null;
}

// Is the dozer home: within `margin` metres of the fence's ring (inside it, or pulled up outside the gate)?
export function dozerIsHome(dozer, layout, margin) {
  return Math.hypot(dozer.x - layout.centre.x, dozer.z - layout.centre.z) < layout.radius + margin;
}

export const DOZER_FLAGS = ['familyPlan', 'earlMaps', 'dozerSeen', 'dozerKey', 'dozerBattery', 'dozerTaken', 'dozerHome'];

export class CordonDozer {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.dozerCamp.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { site (DozerCampSite), dozer (world/Dozer.js), player, combat, station, cutscenes, dialogue,
  // subtitles, progress, paper, enemies, demo, notify, sfx }.
  init(ctx) {
    Object.assign(this, ctx);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    if (this.ready) this.cutscenes?.namedAnchors?.set('dozerCamp', () => ({ x: this.site.place.x, z: this.site.place.z, yaw: this.site.place.yaw + Math.PI }));
    this.bus.on('stormShelter:maps', (e) => this.takeMaps(e?.device));
    this.bus.on('paper:closed', ({ id }) => id === 'earlMaps' && this.mapsRead());
    this.bus.on('dozer:mounted', () => this.onMounted());
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.place && this.site.spots?.dozer && this.dozer);
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  get needs() {
    return dozerNeeds({ key: this.has('dozerKey'), battery: this.has('dozerBattery') });
  }

  // As the flags say (a new run, a load, a respawn). The dozer stands at the camp until it's been taken;
  // after that it's wherever it was left (the Dozer's own save, or where this last saw it).
  reset() {
    this.state = 'idle';
    this.inside = 0;
    this.crewSent = false;
    this.quiet = null;
    if (!this.ready) return;
    this.site.setBattery(!this.has('dozerBattery') && !this.batteryTaken);
    const d = this.dozer;
    if (!this.has('dozerTaken')) {
      if (!d.riding) {
        const s = this.site.spots.dozer;
        d.place(s.x, s.z, dozerHeading(this.site.place));
      }
      d.locked = true;
    } else {
      d.locked = false;
      if (d.stored && this.last) d.place(this.last.x, this.last.z, this.last.heading);
    }
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const d = this.dozer;
    if (!d.stored) this.last = { x: d.x, z: d.z, heading: d.heading };
    if (playing) this.updateStory(dt);
    const p = this.player.position;
    const near = Math.hypot(p.x - this.site.place.x, p.z - this.site.place.z) < this.cfg.dozerCamp.radius + 6 || (d.locked && Math.hypot(p.x - d.x, p.z - d.z) < 6);
    if (canInteract && input && playing && near && !this.player.riding) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hud.progress = 0;
      this.hold.update(dt, null, false, 1);
    }
  }

  updateStory(dt) {
    if (this.quiet && !this.subtitles?.busy) {
      const fn = this.quiet;
      this.quiet = null;
      fn();
    }
    const cut = this.cutscenes?.active;
    const p = this.player.position;
    // 1: the plan, the next time he's indoors with them.
    if (this.has(this.ec.needs) && !this.has('familyPlan') && !cut) {
      const L = this.station?.layout;
      this.inside = L && zoneOf(L, p.x, p.z) >= 2 ? this.inside + dt : 0;
      if (this.inside >= this.ec.planAfter && !this.subtitles?.busy) {
        this.set('familyPlan');
        this.dialogue?.play('plan.1', {}, false);
        this.bus.emit('dozer:plan');
      }
    }
    if (!this.has('earlMaps')) return;
    // 3: the camp, the first time he comes up the cut; its dead get up as he does.
    const pl = this.site.place;
    const dist = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (!this.has('dozerSeen') && dist < this.ec.sweepDistance && !cut && !this.player.riding) {
      this.set('dozerSeen');
      const after = () => this.dialogue?.play('dozer.camp.wyatt');
      if (!this.cutscenes?.play('sweep.cordonDozer', { onDone: after })) after();
    }
    if (!this.crewSent && !this.has('dozerTaken') && dist < this.ec.crewWithin) this.sendCrew();
    // 4: home.
    if (this.has('dozerTaken') && !this.has('dozerHome') && !cut && this.station?.layout && dozerIsHome(this.dozer, this.station.layout, this.ec.homeMargin)) {
      this.set('dozerHome');
      this.dialogue?.play('dozer.home.ellen');
      this.notify?.('The dozer is home');
      this.bus.emit('dozer:home');
    }
  }

  // The clearing crew: engineers in fatigues, standing about the camp where they were left. Once per reset.
  sendCrew() {
    this.crewSent = true;
    const n = this.ec.crew;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const r = 4 + (i % 3) * 3;
      const at = this.site.toWorld(Math.sin(a) * r, Math.cos(a) * r - 2);
      this.enemies?.spawnZombie(at.x, at.z, { mode: 'linger', variant: 'army', facing: a, authored: 'dozerCamp', linger: { x: at.x, z: at.z, r: this.ec.linger } });
    }
  }

  // ---- 2: Earl's maps (the storm shelter hands them over) ------------------------------------

  takeMaps(device = 'gamepad') {
    if (this.has('earlMaps')) return;
    this.set('earlMaps');
    this.sfx?.play('pickup');
    this.bus.emit('dozer:maps');
    if (!this.paper?.open('earlMaps', { device, take: true })) this.mapsRead();
  }

  // Put down: the family, over the radio, work out what the maps say.
  mapsRead() {
    if (this.mapsTold) return;
    this.mapsTold = true;
    this.dialogue?.play('plan.maps.1');
  }

  // ---- hold X at the camp ---------------------------------------------------------------------

  updateInteraction(dt, input) {
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const s = this.site.spots;
    if (!this.has('dozerKey') && dist(s.box) < r) return { key: 'box', prompt: `Hold ${X}: search the crew's job box`, busy: 'Searching…', seconds: 1.4, act: () => this.searchBox() };
    if (!this.has('dozerBattery') && !this.batteryTaken && dist(s.battery) < r) return { key: 'battery', prompt: `Hold ${X}: take the battery off the charger`, seconds: 0.8, act: () => this.takeBattery() };
    const d = this.dozer;
    if (d.locked && !d.stored && d.boxDistance(p.x, p.z) < this.cfg.dozer.mountRange - 1.2) {
      const l = lockedPrompt(this.needs, this.combat?.inventory?.batteries ?? 0, X);
      if (l) return { key: 'dozer-lock', prompt: l.prompt, busy: 'Wiring it in…', seconds: 2, act: l.act ? () => this.fitBattery() : null };
    }
    return null;
  }

  searchBox() {
    this.set('dozerKey');
    this.combat?.inventory?.addScrap?.(this.ec.boxScrap);
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.(`The dozer's keys on a brass tag, and ${this.ec.boxScrap} scrap`);
    this.unlockIfReady();
  }

  takeBattery() {
    this.batteryTaken = true;
    this.combat?.inventory?.addBattery?.(1);
    this.site.setBattery(false);
    this.sfx?.play('pickup');
    this.combat?.hud?.pickup?.('A battery, charged');
  }

  fitBattery() {
    if (!this.combat?.inventory?.useBattery?.()) return;
    this.set('dozerBattery');
    this.sfx?.play('pickup');
    this.notify?.("The dozer's panel lights come up");
    this.unlockIfReady();
  }

  unlockIfReady() {
    if (this.needs === null) this.dozer.locked = false;
  }

  onMounted() {
    if (this.has('dozerTaken') || !this.ready || this.dozer.locked) return;
    this.set('dozerTaken');
    this.dialogue?.play('dozer.taken.wyatt');
    this.bus.emit('dozer:taken');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `The dozer's camp: take me there (${this.has('dozerHome') ? 'home' : this.has('dozerTaken') ? 'taken' : (this.needs ?? 'ready')})`, () => {
      if (!this.ready) return;
      const at = this.site.toWorld(0, -this.ec.sweepDistance - 6);
      this.player.teleport(at.x, at.z, this.site.place.yaw + Math.PI);
    });
    cat.addItem('The dozer: keys found and battery fitted', () => {
      this.set('dozerKey');
      this.set('dozerBattery');
      this.unlockIfReady();
    });
    cat.addItem('The plan and the dozer: start it again (flags cleared)', () => {
      for (const f of DOZER_FLAGS) this.progress?.setFlag(f, false);
      this.batteryTaken = false;
      this.mapsTold = false;
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'dozerCamp -';
    return `dozerCamp ${this.has('dozerHome') ? 'home' : this.has('dozerTaken') ? 'taken' : (this.needs ?? 'ready')}`;
  }
}
