// Junie is taken (Session 26; story spine, beat 3; DESIGN.md "Junie is
// taken"). The night Tom lost at the crashed plane (blacked out, or sat out
// in the wreck with his radio smashed), the Caller spoke on the family's
// radio in his voice: hurt, calling their names. They went out after him
// with torches, heard him on both sides, split up, and Junie didn't come
// back. Tom learns it at dawn:
//
//  1. As the plane's beat ends (planeDone), Junie's gone from home: her
//     figure in the comms room and her lines with it (Station.setPresent,
//     Dialogue.absent). Her rabbit's left on the bottom bunk: Wyatt found it
//     on the south path.
//  2. The family's account, once they can reach him: over the radio a few
//     seconds into the dawn, or (his radio smashed by the Mothman as it was
//     driven off) face to face as he comes into sight of home, and Wyatt
//     hands him the spare handset (radioMended). Ellen frantic, Wyatt
//     guilty, and Junie's slot on the channel silent.
//  3. The south path trail camera's clip (D-pad down, like Earl's tape;
//     clip.junieTaken, then on the monitors): night, torches, Tom's voice
//     from the dark, wrong; they split; Junie's torch goes on into the
//     trees and out.
//  4. The family's lines after it: it learns voices; her torch went south,
//     past the plane; they'll never leave the fence after dark again. The
//     goal: Find Junie. Head south (story/Objectives.js).
//
// Saved through story flags: junieTaken, familyAccount, junieClipSeen,
// radioSmashed / radioMended (data/progress.json). reset() works out the
// rest from them. Off in Demo mode.
//
// Events: 'junie:taken', 'junie:account', 'junie:clipSeen'.

import * as THREE from 'three';
import { HoldAction } from '../player/HoldAction.js';
import { bakeParts } from '../render/propKit.js';
import { DEBUG } from '../debug/DebugMenu.js';

// ---- the pure parts (tested) ----------------------------------------------------------------

// Where the family's account plays from, or null while it can't yet:
// 'face' (Tom's radio's smashed: when he's within homeRange of home),
// 'radio' (the radio reaches him, accountDelay seconds after the wake).
export function accountWay({ taken, told, dead, reaches, nearHome, waited, delay }) {
  if (!taken || told) return null;
  if (dead) return nearHome ? 'face' : null;
  return reaches && waited >= delay ? 'radio' : null;
}

// Where the south path camera stands: from home's centre toward the plane,
// `out` metres past the fence (radius). Its frame's ahead is away from home.
export function clipAnchor(home, toward, radius, out) {
  let dx = toward.x - home.x;
  let dz = toward.z - home.z;
  const l = Math.hypot(dx, dz) || 1;
  dx /= l;
  dz /= l;
  const r = radius + out;
  return { x: home.x + dx * r, z: home.z + dz * r, yaw: Math.atan2(-dx, -dz) };
}

const FLAGS = ['junieTaken', 'familyAccount', 'junieClipSeen', 'radioSmashed', 'radioMended'];
const JUNIE = 2; // her place in config.story.family

export class JunieTaken {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.jc = cfg.junieTaken;
    this.bus = bus;
    this.hud = { prompt: '', progress: 0 };
  }

  // ctx: { scene, player, station, dialogue, subtitles, cutscenes, watch, progress, comms, plane, demo, notify, sfx }.
  init(ctx) {
    Object.assign(this, ctx);
    this.hold = new HoldAction(this.cfg.station.hold.releaseDrain);
    this.hold.init();
    this.buildRabbit();
    this.cutscenes?.namedAnchors?.set('junieWoods', () => this.woods());
    this.bus.on('radio:smashed', () => this.subtitles?.clear()); // the line cut off mid-word
    this.bus.on('player:respawned', () => this.reset());
    this.reset();
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // The south path camera's frame: toward the crashed plane from home.
  woods() {
    const L = this.station.layout;
    const toward = this.plane?.crashSite?.place ?? { x: L.centre.x, z: L.centre.z + 100 };
    return clipAnchor(L.centre, toward, L.radius, this.jc.clipFrom);
  }

  // As the flags say (a new run, a load, a respawn).
  reset() {
    this.state = 'idle';
    this.waited = 0;
    this.quiet = null;
    this.watch?.cancel('junieClip');
    // Saved mid-way through the account at the gate: the spare handset was given.
    if (this.has('familyAccount') && this.has('radioSmashed')) this.progress?.setFlag('radioMended');
    this.refreshHome();
    if (this.has('familyAccount') && !this.has('junieClipSeen')) this.offerClip();
  }

  // Junie's at home unless she's been taken and isn't back (junieHome: a later beat).
  get away() {
    return this.has('junieTaken') && !this.has('junieHome');
  }

  refreshHome() {
    const away = this.away;
    this.station?.setPresent?.(JUNIE, !away);
    if (this.rabbit) this.rabbit.visible = away;
  }

  // ---- each frame ---------------------------------------------------------------------------

  update(dt, input, playing, canInteract) {
    if (this.demo?.active) return;
    if (playing) this.updateStory(dt);
    if (canInteract && input && playing && this.away) this.updateInteraction(dt, input);
    else {
      this.hud.prompt = '';
      this.hold.update(dt, null, false, 1);
    }
  }

  updateStory(dt) {
    if (this.quiet && !this.subtitles?.busy) {
      const fn = this.quiet;
      this.quiet = null;
      fn();
    }
    // 1: the night's over (the plane's beat ended at dawn): she's gone.
    if (!this.has('junieTaken') && this.has(this.jc.needs)) {
      this.set('junieTaken');
      this.waited = 0;
      this.refreshHome();
      this.bus.emit('junie:taken');
    }
    if (this.state !== 'idle' || this.cutscenes?.active) return;
    this.waited += dt;
    // 2: the account, once they can reach him (and nothing else is on the radio).
    const p = this.player.position;
    const c = this.station.layout.centre;
    const way = accountWay({
      taken: this.has('junieTaken'),
      told: this.has('familyAccount'),
      dead: this.comms?.state === 'dead',
      reaches: this.comms ? this.comms.reachesFamily : true,
      nearHome: Math.hypot(p.x - c.x, p.z - c.z) < this.jc.homeRange,
      waited: this.waited,
      delay: this.jc.accountDelay,
    });
    if (way && !this.subtitles?.busy) this.account(way);
  }

  account(way) {
    this.state = 'account';
    this.set('familyAccount');
    this.bus.emit('junie:account', { way });
    const face = way === 'face';
    if (face) {
      // At the gate: they see him from the porch. The account face to face, then the spare handset.
      this.dialogue?.play('junie.home.wyatt', {}, false);
      this.dialogue?.play('junie.account.1', {}, false);
      this.dialogue?.play('junie.spare.wyatt', {}, false);
    } else this.dialogue?.play('junie.account.1', {}, true);
    this.whenQuiet(() => {
      if (face) {
        this.set('radioMended');
        this.notify?.("Wyatt's spare handset: your radio works again");
      }
      this.offerClip();
      this.state = 'idle';
    });
  }

  // fn once the subtitles have nothing left to say (checked each frame of play).
  whenQuiet(fn) {
    this.quiet = fn;
  }

  // 3: the clip, on D-pad down.
  offerClip() {
    this.watch?.offer({
      id: 'junieClip',
      pad: 'D-pad down: the south path camera (Wyatt patched it through)',
      key: 'V: the south path camera (Wyatt patched it through)',
      play: () => this.playClip(),
    });
  }

  playClip() {
    const done = () => {
      if (this.has('junieClipSeen')) return;
      this.set('junieClipSeen');
      this.bus.emit('junie:clipSeen');
      this.dialogue?.play('junie.after.1');
    };
    if (!this.cutscenes?.play('clip.junieTaken', { onDone: done })) done();
  }

  // ---- Junie's rabbit -------------------------------------------------------------------------

  rabbitSpot() {
    const L = this.station.layout;
    const bk = L.cabin.furniture?.find((f) => f.id === 'bunks');
    if (!bk) return null;
    return { x: bk.x + this.jc.rabbit.offsetX, y: this.station.floorY + this.jc.rabbit.y, z: bk.z };
  }

  // A few baked boxes, one draw call: slumped on its side on the blanket, one ear folded.
  buildRabbit() {
    const at = this.rabbitSpot();
    if (!at || !this.scene) return;
    const r = this.jc.rabbit;
    const parts = new Map();
    const put = (w, h, d, x, y, z, color, rz = 0, ry = 0) => {
      const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
      g.deleteAttribute('uv');
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, rz)), new THREE.Vector3(1, 1, 1)));
      if (!parts.has(color)) parts.set(color, []);
      parts.get(color).push(g);
    };
    // Lying on its side (along x): body, head, ears (one bent), paws, the eyes.
    put(0.13, 0.085, 0.09, 0, 0.042, 0, r.color, 0.05);
    put(0.08, 0.075, 0.075, 0.1, 0.05, 0.005, r.color, -0.1);
    put(0.1, 0.022, 0.035, 0.18, 0.035, -0.015, r.color, -0.25, 0.3);
    put(0.07, 0.022, 0.035, 0.155, 0.02, 0.03, r.color, 0.6, -0.4);
    put(0.035, 0.03, 0.03, -0.04, 0.012, 0.05, r.color);
    put(0.035, 0.03, 0.03, 0.04, 0.012, 0.05, r.color);
    put(0.012, 0.012, 0.006, 0.125, 0.06, 0.042, r.eyes);
    const geometry = bakeParts(parts, { weather: { ...this.cfg.props.weather, grimeHeight: 0.02 }, seed: 9 });
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.position.set(at.x, at.y, at.z);
    mesh.rotation.y = 0.4;
    mesh.castShadow = true;
    mesh.visible = false;
    mesh.name = 'junieRabbit';
    this.scene.add(mesh);
    this.rabbit = mesh;
    this.rabbitAt = at;
  }

  updateInteraction(dt, input) {
    const at = this.rabbitAt;
    const p = this.player.position;
    const near = at && Math.hypot(p.x - at.x, p.z - at.z) < this.jc.holdRange;
    const X = input.activeDevice === 'gamepad' ? 'X' : 'E';
    const key = near ? 'rabbit' : null;
    const done = this.hold.update(dt, key, input.isDown('interact'), 0.6);
    if (done && near) this.touchRabbit();
    this.hud.prompt = near ? `Hold ${X}: Junie's rabbit` : '';
    this.hud.progress = this.hold.key !== null ? this.hold.progress : 0;
  }

  touchRabbit() {
    this.sfx?.play('pickup');
    if (!this.dialogue?.say('junie.rabbit.wyatt', {}, false)) this.notify?.('Junie never goes anywhere without him');
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    cat.addItem(() => `Junie taken: ${this.has('junieTaken') ? (this.has('junieClipSeen') ? 'clip seen' : this.has('familyAccount') ? 'told' : 'taken') : 'not yet'} (select: start it now)`, () => {
      this.progress?.setFlag('planeDone');
      this.progress?.setFlag('mothmanMet');
    });
    cat.addItem('Junie taken: start it again (flags cleared)', () => {
      for (const f of FLAGS) this.progress?.setFlag(f, false);
      this.reset();
    });
    cat.addItem('Junie taken: smash the radio (as the drive-off does)', () => this.progress?.setFlag('radioSmashed'));
  }

  overlayLine() {
    return `junie ${this.has('junieTaken') ? 'taken' : '-'} ${this.state}${this.comms ? ` ${this.comms.state}` : ''}`;
  }

  dispose() {
    if (this.rabbit) {
      this.rabbit.removeFromParent();
      this.rabbit.geometry.dispose();
      this.rabbit.material.dispose();
    }
  }
}
