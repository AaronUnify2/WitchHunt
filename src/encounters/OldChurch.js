// The old church and the time capsule (Session 26; story spine, beat 4;
// DESIGN.md "Time capsule and the old church"; the set: world/OldChurchSite.js).
//
// Tom heads south looking for Junie and finds the old church: Mount Zion,
// Hemlock Gap (draft), empty since 1903.
//  1. The arrival: an establishing sweep from over the lychgate, down the
//     path to the leaning steeple (sweep.oldChurch). The radio's long gone
//     (the church is south of the comms line).
//  2. The Caller at its worst: Junie's voice from inside the church, then
//     the cracked bell sounds once in the steeple as if something brushed
//     it, then her voice again, asking him to come and sit with everyone.
//  3. The plaque on the granite block by the path (a paper): should the
//     voice in the trees ever call again, open this. The row of eleven
//     small stones (a paper): one night, October 13, 1903.
//  4. The capsule: dig in front of the stone with the shovel (hold X; the
//     dig's animation and scrapes), the clunk of tin, a copper box. Open it
//     (hold X): an inspect card, then the 1903 account (papers.json
//     capsuleAccount: six pages and Amos Pruitt's drawing of the stairs).
//     Read, it puts the stairs on the map (the fog round them lifted, the
//     clearing named) and the goal moves there. Handed in at the ledger, the
//     family have things to say about it (lore.timeCapsule).
//
// Saved through story flags: churchVisited, plaqueRead, capsuleDug,
// capsuleOpened, capsuleRead, stairsKnown. reset() works out the rest.
// Off in Demo mode.
//
// Events: 'church:arrived', 'church:capsuleDug', 'church:capsuleRead'.

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';
import { bakeParts } from '../render/propKit.js';
import { SetBuilder } from '../render/setBuilder.js';
import { DEBUG } from '../debug/DebugMenu.js';

const FLAGS = ['churchVisited', 'plaqueRead', 'capsuleDug', 'capsuleOpened', 'capsuleRead', 'stairsKnown'];

// What the capsule's spot shows (pure): 'mound' (not dug), 'closed' (dug,
// the box in its hole), 'open' (its lid off).
export function capsuleLook(flags) {
  if (!flags.has('capsuleDug')) return 'mound';
  return flags.has('capsuleOpened') ? 'open' : 'closed';
}

export class OldChurch {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ec = cfg.oldChurch.encounter;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
    this.digging = false; // Game shows the shovel digging
  }

  // ctx: { scene, site (OldChurchSite), player, combat, ground, cutscenes, dialogue, subtitles, caller,
  // progress, lore, paper, card, mapUi, world, demo, notify }.
  init(ctx) {
    Object.assign(this, ctx);
    this.sfx = this.combat.sfx;
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.scrape = 0;
    if (this.ready) {
      this.cutscenes?.namedAnchors?.set('oldChurch', () => this.anchor());
      this.buildCapsule();
    }
    this.bus.on('paper:closed', ({ id }) => id === 'capsuleAccount' && this.accountRead());
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  get ready() {
    return Boolean(this.site?.place && this.site.spots?.plaque);
  }

  spot(name) {
    return this.site.spots[name];
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // The cutscenes' frame: ahead is the church's ahead (away from where Tom comes
  // from), so its x runs the other way to the model's (x right as you walk in).
  anchor() {
    const p = this.site.place;
    return { x: p.x, z: p.z, yaw: p.yaw + Math.PI };
  }

  reset() {
    this.state = 'idle';
    this.timer = 0;
    this.insideCalls = 0;
    this.digging = false;
    this.refreshCapsule();
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (!this.ready || this.demo?.active) return;
    const p = this.player.position;
    const pl = this.site.place;
    const d = Math.hypot(p.x - pl.x, p.z - pl.z);
    if (playing) this.updateStory(dt, d);
    if (canInteract && input && playing && d < this.cfg.oldChurch.radius) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.digging = false;
      this.hold.update(dt, null, false, 1);
    }
  }

  updateStory(dt, d) {
    this.timer += dt;
    // 1: the arrival sweep, once, as he comes up to it on the story's way.
    if (!this.has('churchVisited') && d < this.ec.sweepDistance && !this.cutscenes?.active) {
      this.arrive();
      return;
    }
    if (!this.has('churchVisited')) return;
    // 2: the Caller from inside the church: twice on the first visit (her voice, the bell, her voice again).
    const quiet = !this.caller?.call && !this.subtitles?.busy && !this.cutscenes?.active && !this.paper?.isOpen && !this.card?.isOpen;
    if (this.state === 'arrived' && d < this.ec.insideCall.distance && this.timer > this.ec.insideCall.after && quiet) {
      this.callFromInside('caller.church.1');
      this.state = 'bell';
      this.timer = 0;
    } else if (this.state === 'bell' && this.timer > this.ec.bellAfter + 3) {
      this.sfx?.play('crackedBell', this.spot('bell'));
      this.state = 'second';
      this.timer = 0;
    } else if (this.state === 'second' && this.timer > 5 && quiet) {
      this.callFromInside('caller.church.2');
      this.state = 'quiet';
    }
  }

  arrive() {
    this.set('churchVisited');
    this.state = 'arrived';
    this.timer = 0;
    this.bus.emit('church:arrived');
    this.cutscenes?.play('sweep.oldChurch');
  }

  callFromInside(id) {
    this.insideCalls++;
    this.caller?.callFrom(this.spot('inside'), id, 'From inside the church');
  }

  // ---- hold X ---------------------------------------------------------------------------------

  updateInteraction(dt, input) {
    this.device = input.activeDevice;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const best = this.pick(X);
    const key = best?.act ? best.key : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), best?.seconds ?? 1);
    if (done && best?.act) best.act();
    this.digging = this.hold.active && this.hold.key === 'dig';
    if (this.digging) {
      this.scrape -= dt;
      if (this.scrape <= 0) {
        this.sfx?.play('dig');
        this.scrape = this.cfg.digging.scrapeInterval;
      }
    }
    this.hud.prompt = best ? (this.hold.active && best.busy ? best.busy : best.prompt) : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  // The nearest thing to do: { key, prompt, busy, seconds, act } (act null: information only).
  pick(X) {
    const p = this.player.position;
    const r = this.ec.interactRange;
    const dist = (q) => Math.hypot(p.x - q.x, p.z - q.z);
    const cap = this.spot('capsule');
    // The plaque first: it says what's under the turf.
    if (!this.has('plaqueRead') && (dist(this.spot('plaque')) < r + 0.3 || dist(cap) < r)) return { key: 'plaque', prompt: `Hold ${X}: read the plaque`, busy: 'Rubbing the verdigris off…', seconds: 0.8, act: () => this.readPlaque() };
    if (dist(cap) < r) {
      if (!this.has('capsuleDug')) {
        if (!this.combat.weapons.has('shovel')) return { key: 'noShovel', prompt: 'The turf in front of the stone has sunk, as if something under it gave way. You need the shovel', act: null };
        return { key: 'dig', prompt: `Hold ${X}: dig in front of the stone`, busy: 'Digging…', seconds: this.ec.digSeconds, act: () => this.dig() };
      }
      if (!this.has('capsuleOpened')) return { key: 'open', prompt: `Hold ${X}: open the copper box`, busy: 'Prising the lid…', seconds: 1.6, act: () => this.openCapsule() };
    }
    if (dist(this.spot('plaque')) < r + 0.3) return { key: 'plaque', prompt: `Hold ${X}: read the plaque`, busy: 'Rubbing the verdigris off…', seconds: 0.8, act: () => this.readPlaque() };
    if (dist(this.spot('taken')) < r + 1.2) return { key: 'stones', prompt: `Hold ${X}: read the row of small stones`, busy: 'Reading…', seconds: 0.6, act: () => this.readStones() };
    return null;
  }

  readPlaque() {
    this.set('plaqueRead');
    this.paper?.open('churchPlaque', { device: this.device });
  }

  readStones() {
    this.paper?.open('graveyardStones', { device: this.device });
  }

  dig() {
    this.set('capsuleDug');
    this.digging = false;
    this.sfx?.play('capsuleClunk', this.spot('capsule'));
    this.refreshCapsule();
    this.bus.emit('church:capsuleDug');
    this.notify?.('Under the turf: a copper box, green with age, soldered shut');
  }

  openCapsule() {
    this.set('capsuleOpened');
    this.sfx?.play('capsuleOpen', this.spot('capsule'));
    this.refreshCapsule();
    this.lore?.give('timeCapsule');
    const read = () => this.paper?.open('capsuleAccount', { device: this.device, take: true });
    if (!this.card?.show('timeCapsule', { read, keep: () => this.notify?.('The 1903 account: hand it in at home and read it from the ledger') }, this.device)) read();
  }

  // The account's been read (here, or later from the ledger): the stairs go on the map.
  accountRead() {
    if (this.has('capsuleRead')) return;
    this.set('capsuleRead');
    this.set('stairsKnown');
    this.revealStairs();
    this.bus.emit('church:capsuleRead');
    this.notify?.('Amos Pruitt\'s staircase: a half day east of the church. It\'s on your map');
  }

  // The fog lifted round the stairs' clearing (its name shows: encounters.json's revealedBy).
  revealStairs() {
    const s = this.world?.map.clearings.find((c) => c.key === 'stairs');
    if (s) this.mapUi?.fog?.reveal(s.x, s.z, this.ec.stairsReveal);
  }

  // ---- the capsule's spot: the sunken turf, the hole and the box ----------------------------

  buildCapsule() {
    const at = this.spot('capsule');
    const yaw = this.site.place.yaw;
    const k = this.cfg.oldChurch.look.colors;
    const make = (fill) => {
      const b = new SetBuilder({ colors: k }, null, 77);
      fill(b, b.c);
      const geometry = bakeParts(b.parts, { weather: { ...this.cfg.props.weather, grimeHeight: 0.15 }, seed: 31 });
      const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
      mesh.position.set(at.x, this.ground.heightAt(at.x, at.z), at.z);
      mesh.rotation.y = yaw;
      mesh.receiveShadow = true;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    };
    const box = (b, c, lid) => {
      b.box(0.5, 0.26, 0.34, c.capsule, 0, 0.13, 0);
      b.box(0.52, 0.03, 0.36, c.capsuleDark, 0, 0.02, 0);
      for (const s of [-1, 1]) b.box(0.02, 0.2, 0.36, c.capsuleDark, s * 0.18, 0.13, 0);
      if (lid) b.box(0.52, 0.04, 0.36, c.capsule, 0, 0.28, 0);
    };
    // Not dug: the turf sunk a hand's depth in a rough oblong, dead leaves in it.
    this.mound = make((b, c) => {
      b.box(0.9, 0.04, 0.6, c.earth, 0, -0.01, 0, 0.1);
      for (let i = 0; i < 6; i++) b.box(0.12, 0.012, 0.08, c.moss, (b.rand() - 0.5) * 0.7, 0.02, (b.rand() - 0.5) * 0.45, b.rand() * 3);
    });
    // Dug: the hole (dark), the spoil heaped beside it, the box at its lip.
    const hole = (b, c) => {
      b.box(0.95, 0.02, 0.7, c.hollow, 0, 0.005, 0);
      for (let i = 0; i < 5; i++) b.box(0.4 + b.rand() * 0.3, 0.12 + b.rand() * 0.1, 0.3, c.earth, -0.75 - b.rand() * 0.2, 0.05, (b.rand() - 0.5) * 0.8, b.rand() * 3, 0, (b.rand() - 0.5) * 0.3);
    };
    this.closed = make((b, c) => {
      hole(b, c);
      b.push(0.62, 0.02, -0.15, 0.4);
      box(b, c, true);
      b.pop();
    });
    this.opened = make((b, c) => {
      hole(b, c);
      b.push(0.62, 0.02, -0.15, 0.4);
      box(b, c, false);
      b.box(0.44, 0.02, 0.28, c.hollow, 0, 0.2, 0);
      b.pop();
      b.push(0.85, 0.02, 0.45, 1.3, 0.1, 0.12);
      b.box(0.52, 0.04, 0.36, c.capsule, 0, 0.02, 0);
      b.pop();
    });
  }

  refreshCapsule() {
    if (!this.mound) return;
    const look = capsuleLook(new Set(FLAGS.filter((f) => this.has(f))));
    this.mound.visible = look === 'mound';
    this.closed.visible = look === 'closed';
    this.opened.visible = look === 'open';
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Old church: take me there (${this.state}${this.has('capsuleRead') ? ', read' : ''})`, () => {
      if (!this.ready) return;
      const a = this.site.toWorld(0, -this.ec.sweepDistance - 6);
      const c = this.site.place;
      this.player.teleport(a.x, a.z, Math.atan2(-(c.x - a.x), -(c.z - a.z)));
    });
    cat.addItem('Old church: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
  }

  overlayLine() {
    if (!this.ready) return 'church -';
    return `church ${this.state} ${FLAGS.filter((f) => this.has(f)).length}/${FLAGS.length}`;
  }

  dispose() {
    for (const m of [this.mound, this.closed, this.opened]) {
      if (!m) continue;
      m.removeFromParent();
      m.geometry.dispose();
      m.material.dispose();
    }
  }
}
