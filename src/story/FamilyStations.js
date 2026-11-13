// The family at their stations (Round 2, step 5; Aaron: "Wyatt should jump up onto the tower and snipe...
// Ellen can be at a desk with a string board... when we talk to her, she gives us hints about what's
// happening for our current objective and why... Junie can be the one that sits at the comms table and
// watches the cameras, and maybe she can give us some hints about the various enemies"). Wyatt's is
// base/TowerSniper.js; this is the other two.
//
//  - Ellen works at her string board in the cabin's main room by day, and waits in the comms room with the
//    others from dusk to dawn. She only changes places while Tom's outside the cabin (never in front of
//    him). At the board she faces it, and turns to Tom when he comes near.
//  - Junie stands at the comms desk's end, watching the monitors.
//  - The board (render/storyBoard.js; data/storyBoard.json): its things are pinned as the story's flags are
//    set. Tom can look at it (hold X at its foot): the newest thing he hasn't read, then round them again.
//  - Asked (FamilyTalk's "ask": when they've nothing new of their own to say), Ellen says what the current
//    objective is for and why (the line `board.<step id>`, or `board.none`), and Junie gives a tip about
//    what's out there (a `tip` line whose conditions hold: an unheard one first, newest milestone first;
//    then round them again).
//
// Saved: what's been read off the board, and Junie's last tip (which tips have been heard: the dialogue's own).

import { conditionsMet } from './dialoguePicker.js';
import { zoneOf } from '../base/stationLayout.js';
import { StoryBoard } from '../render/storyBoard.js';
import boardData from '../data/storyBoard.json';

const ELLEN = 0;
const JUNIE = 2;

// Is Ellen's place the board now? By day (and through the dawn), with the systems on; not while she's still
// at the radio waiting on Tom's first look from the tower (the opening: he wakes facing her there).
export function ellenAtBoard(phase, enabled = true, waiting = false) {
  return enabled && !waiting && (phase === 'day' || phase === 'dawn');
}

// The board's things that are pinned, in the story's order: ids. has(flag): is the flag set?
export function pinned(items, has) {
  return items.filter((it) => !it.flag || has(it.flag)).map((it) => it.id);
}

// What Tom reads next off the board: the newest pinned thing he hasn't read; with them all read, the one
// after the last he read (round and round). shown: ids, oldest first. Returns an id, or null.
export function nextToRead(shown, read, last) {
  if (!shown.length) return null;
  for (let i = shown.length - 1; i >= 0; i--) if (!read.has(shown[i])) return shown[i];
  const k = shown.indexOf(last);
  return shown[(k + 1) % shown.length];
}

// Junie's tip: of the `tip` lines whose conditions hold, an unheard one (the latest in the file first: they're
// written in the story's order, so that's the newest thing she's seen); with them all heard, the one after
// the last she gave. Returns a line, or null.
export function pickTip(lines, facts, heard, last) {
  const ok = lines.filter((l) => l.tip && conditionsMet(l, facts));
  if (!ok.length) return null;
  for (let i = ok.length - 1; i >= 0; i--) if (!heard.has(ok[i].id)) return ok[i];
  const k = ok.findIndex((l) => l.id === last);
  return ok[(k + 1) % ok.length];
}

export class FamilyStations {
  constructor(cfg, bus, data = boardData) {
    this.cfg = cfg;
    this.fc = cfg.familyStations;
    this.bus = bus;
    this.items = data.items;
  }

  // ctx: { station, player, clock, progress, dialogue, objective() (the current step: story/Objectives.js's
  // current), notify(text) }.
  init(scene, ctx) {
    Object.assign(this, ctx);
    this.layout = this.station.layout;
    this.boardAt = this.layout.cabin.board;
    this.junieAt = this.layout.cabin.junieSpot;
    this.on = Boolean(this.fc?.enabled && this.boardAt);
    this.reset();
    if (!this.on) return;
    this.board = new StoryBoard(this.fc, this.items);
    this.board.init(scene, this.boardAt, this.station.floorY);
    // Looking at the board: one of the station's own hold-X spots.
    this.station.extraSpots ??= [];
    this.station.extraSpots.push({
      at: this.boardAt.look,
      range: this.fc.lookRange,
      offer: (X) => (this.shown.length ? { key: 'story-board', prompt: `Hold ${X}: look at Ellen's board${this.unread() ? ' (something new)' : ''}`, seconds: this.fc.lookSeconds, act: () => this.look() } : null),
    });
  }

  reset() {
    this.read = new Set();
    this.lastRead = null;
    this.lastTip = null;
    this.shown = [];
    this.timer = 0;
    this.ellenThere = null; // true: at the board; false: in the comms room; null: not placed yet
    this.junieThere = null;
  }

  zone() {
    const p = this.player.position;
    return zoneOf(this.layout, p.x, p.z);
  }

  update(dt) {
    if (!this.on) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.fc.checkEvery;
      this.shown = pinned(this.items, (f) => this.progress.has(f));
      this.board.show(new Set(this.shown));
      this.place();
    }
    this.turnEllen(dt);
  }

  // Put them where they belong. Ellen only changes places while Tom's outside the cabin (or the first time).
  place() {
    const want = ellenAtBoard(this.clock.phase, this.on, this.clock.day === 1 && !this.progress.has('towerClimbed'));
    if (want !== this.ellenThere && (this.ellenThere === null || this.zone() < 2)) {
      this.ellenThere = want;
      const s = this.boardAt.stand;
      this.station.placeFamily(ELLEN, want ? { x: s.x, y: this.station.floorY, z: s.z, facing: s.facing, solid: true } : null);
    }
    if (this.junieAt && this.junieThere !== true) {
      this.junieThere = true;
      const j = this.junieAt;
      this.station.placeFamily(JUNIE, { x: j.x, y: this.station.floorY, z: j.z, facing: j.facing, solid: true });
    }
  }

  // At her board she faces it, and turns to Tom when he's near (in the main room with her).
  turnEllen(dt) {
    if (!this.ellenThere) return;
    const person = this.station.renderer.familyRenderer?.people?.[ELLEN];
    if (!person) return;
    const s = this.boardAt.stand;
    const p = this.player.position;
    const d = Math.hypot(p.x - s.x, p.z - s.z);
    const near = d < this.fc.turnRange && d > 0.3 && this.zone() === 2;
    const want = near ? Math.atan2(p.x - s.x, p.z - s.z) : s.facing;
    let a = want - person.facing;
    a = Math.atan2(Math.sin(a), Math.cos(a));
    const step = this.fc.turnRate * dt;
    person.facing += Math.max(-step, Math.min(step, a));
    person.mesh.rotation.y = person.facing;
  }

  // ---- the board -------------------------------------------------------------------------------------

  unread() {
    return this.shown.some((id) => !this.read.has(id));
  }

  // Tom looks at the board: the text of the next thing on it.
  look() {
    const id = nextToRead(this.shown, this.read, this.lastRead);
    const item = this.items.find((it) => it.id === id);
    if (!item) return '';
    this.read.add(id);
    this.lastRead = id;
    this.bus?.emit('board:read', { id });
    return item.text;
  }

  // ---- asking them (FamilyTalk) ----------------------------------------------------------------------

  // What `speaker` can be asked when they've nothing new of their own: { prompt, play() }, or null.
  ask(speaker) {
    if (!this.on) return null;
    const d = this.dialogue;
    if (speaker === 'ellen') {
      const step = this.objective?.()?.id;
      const id = d.byId.has(`board.${step}`) ? `board.${step}` : 'board.none';
      if (!d.byId.has(id)) return null;
      return { prompt: "ask Ellen what's next", play: () => d.play(id, {}, false) };
    }
    if (speaker === 'junie') {
      this.tips ??= d.lines.filter((l) => l.tip);
      const line = pickTip(this.tips, d.facts(), d.heard, this.lastTip);
      if (!line) return null;
      return {
        prompt: "ask Junie what she's seen",
        play: () => {
          this.lastTip = line.id;
          d.heard.add(line.id);
          return d.play(line.id, {}, false);
        },
      };
    }
    return null;
  }

  // ---- save / load / debug -----------------------------------------------------------------------------

  saveState() {
    return { read: [...this.read], lastRead: this.lastRead, lastTip: this.lastTip };
  }

  loadState(d) {
    this.reset(); // (placed afresh on the next check, wherever Tom is)
    this.read = new Set((d?.read ?? []).filter((id) => this.items.some((it) => it.id === id)));
    this.lastRead = d?.lastRead ?? null;
    this.lastTip = d?.lastTip ?? null;
  }

  overlayLine() {
    return `stations ellen ${this.ellenThere ? 'board' : 'comms'} junie ${this.junieThere ? 'desk' : 'home'} board ${this.shown.length}/${this.items.length} read ${this.read.size}`;
  }

  dispose() {
    this.board?.dispose();
  }
}
