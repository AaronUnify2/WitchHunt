// Lore items and the comms room's monitors (M8; DESIGN.md "Lore sources",
// "Cutscenes": clips seen in the comms room can be rewatched on its
// monitors).
//  - Items (src/data/lore.json) are picked up out in the world (give())
//    and handed in at the comms room: the ledger's Monitors page. Each
//    sets a flag lines can ask for ('lore.<id>'), and one with a clip
//    puts it on the monitors.
//  - The monitors keep every clip seen: trail cam sightings, and
//    cutscenes marked "rewatch" once they've played. Selecting one in the
//    ledger closes it and plays the clip.
// Carried, handed-in and the clips are saved.
//
// Events: 'lore:picked' { id }, 'lore:handedIn' { id }.

import loreData from '../data/lore.json';
import { DEBUG } from '../debug/DebugMenu.js';

export class Lore {
  constructor(cfg, bus, data = loreData) {
    this.cfg = cfg;
    this.bus = bus;
    this.items = data.items;
  }

  // ctx: { dialogue, cutscenes, ledger, notify(text) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.byId = new Map(this.items.map((i) => [i.id, i]));
    this.reset();
    this.unsubscribers = [
      // A cutscene marked "rewatch" goes on the monitors once it's played.
      this.bus.on('cutscene:ended', ({ id }) => {
        if (this.cutscenes.byId.get(id)?.rewatch) this.addClip({ cutscene: id });
      }),
      // A trail cam sighting: its clip, at that camera.
      this.bus.on('witch:trailCam', ({ cam, sighting }) => {
        const h = Math.floor(sighting.hour);
        const m = String(Math.floor((sighting.hour - h) * 60)).padStart(2, '0');
        this.addClip({
          cutscene: 'clip.sighting',
          title: `${cam.name}: something moved past it (night ${sighting.night}, ${h}:${m})`,
          anchors: { trailCam: { x: cam.x, z: cam.z, yaw: cam.facing } },
          osd: { name: cam.name.toUpperCase() },
        });
      }),
    ];
  }

  reset() {
    this.carrying = [];
    this.handedIn = [];
    this.clips = []; // { cutscene, title, anchors, osd }
  }

  // Picked up out in the world.
  give(id) {
    const item = this.byId.get(id);
    if (!item || this.carrying.includes(id) || this.handedIn.includes(id)) return false;
    this.carrying.push(id);
    this.notify?.(`Picked up: ${item.name}. Hand it in at the comms room`);
    this.bus.emit('lore:picked', { id });
    return true;
  }

  // At the comms room: its flag is set (lines can follow up), its clip goes on the monitors.
  handIn(id) {
    const item = this.byId.get(id);
    if (!item || !this.carrying.includes(id)) return '';
    this.carrying = this.carrying.filter((c) => c !== id);
    this.handedIn.push(id);
    this.dialogue.milestone(`lore.${id}`);
    if (item.clip) this.addClip({ cutscene: item.clip });
    this.bus.emit('lore:handedIn', { id });
    return `Handed in: ${item.name}${item.clip ? '. It\'s on the monitors' : ''}`;
  }

  // On the monitors (once each: a sighting is its own clip).
  addClip(clip) {
    const title = clip.title ?? this.cutscenes.byId.get(clip.cutscene)?.name ?? clip.cutscene;
    if (!clip.anchors && this.clips.some((c) => c.cutscene === clip.cutscene && !c.anchors)) return;
    this.clips.push({ ...clip, title });
  }

  watch(clip) {
    this.ledger.close();
    this.cutscenes.play(clip.cutscene, { anchors: clip.anchors, osd: clip.osd });
    return '';
  }

  // The ledger's Monitors page: hand in what you carry, rewatch the clips.
  ledgerPage() {
    const rows = [];
    if (this.carrying.length === 0) rows.push({ label: 'Nothing to hand in', value: 'lore items you find come here', action: null });
    for (const id of this.carrying) {
      const item = this.byId.get(id);
      rows.push({ label: `Hand in: ${item.name}`, value: item.kind, action: () => this.handIn(id) });
    }
    rows.push({ label: 'THE MONITORS', value: this.clips.length ? `${this.clips.length} clip${this.clips.length === 1 ? '' : 's'}` : 'nothing recorded yet', action: null });
    // Newest first.
    for (let i = this.clips.length - 1; i >= 0; i--) {
      const clip = this.clips[i];
      rows.push({ label: `   Watch: ${clip.title}`, value: '', action: () => this.watch(clip) });
    }
    return { id: 'monitors', title: 'Monitors', rows };
  }

  // ---- saving ------------------------------------------------------------------------------------

  saveState() {
    return { carrying: [...this.carrying], handedIn: [...this.handedIn], clips: this.clips.map((c) => ({ ...c })) };
  }

  loadState(d) {
    this.reset();
    if (!d) return;
    const known = (id) => this.byId.has(id);
    this.carrying = (d.carrying ?? []).filter(known);
    this.handedIn = (d.handedIn ?? []).filter(known);
    this.clips = (d.clips ?? []).filter((c) => this.cutscenes.byId.has(c.cutscene));
  }

  // ---- debug -------------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const story = menu.category(DEBUG.story);
    story.addItem(
      () => `Lore: give the next item (${this.carrying.length} carried, ${this.handedIn.length}/${this.items.length} handed in)`,
      () => {
        const next = this.items.find((i) => !this.carrying.includes(i.id) && !this.handedIn.includes(i.id));
        if (next) this.give(next.id);
        else this.notify?.('Every lore item is carried or handed in');
      },
    );
    story.addItem('Lore: give every item', () => {
      for (const i of this.items) this.give(i.id);
    });
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
  }
}
