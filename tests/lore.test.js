import { describe, it, expect, vi } from 'vitest';
import { Lore } from '../src/story/Lore.js';
import { EventBus } from '../src/core/EventBus.js';
import { config } from '../src/config.js';
import loreData from '../src/data/lore.json';
import cutsceneData from '../src/data/cutscenes.json';

function makeLore() {
  const bus = new EventBus();
  bus.init();
  const byId = new Map(cutsceneData.cutscenes.map((c) => [c.id, c]));
  const cutscenes = { byId, play: vi.fn() };
  const dialogue = { milestones: [], milestone: vi.fn((f) => dialogue.milestones.push(f)) };
  const ledger = { close: vi.fn() };
  const lore = new Lore(config, bus);
  lore.init({ dialogue, cutscenes, ledger, notify: () => {} });
  return { lore, bus, cutscenes, dialogue, ledger };
}

describe('lore items and the monitors', () => {
  it('every item is named, and its clip is a real cutscene', () => {
    const ids = new Set(cutsceneData.cutscenes.map((c) => c.id));
    const seen = new Set();
    for (const i of loreData.items) {
      expect(i.name).toBeTruthy();
      expect(seen.has(i.id)).toBe(false);
      seen.add(i.id);
      if (i.clip) expect(ids.has(i.clip)).toBe(true);
    }
    expect(loreData.items.filter((i) => i.id.startsWith('doc')).length).toBe(8);
  });

  it('pick up, hand in: the flag is set and the clip goes on the monitors', () => {
    const { lore, dialogue } = makeLore();
    expect(lore.give('camcorder')).toBe(true);
    expect(lore.give('camcorder')).toBe(false); // already carried
    const page = lore.ledgerPage();
    const row = page.rows.find((r) => r.label.includes("campers' camcorder"));
    expect(row.action).toBeTruthy();
    expect(row.action()).toContain('Handed in');
    expect(dialogue.milestone).toHaveBeenCalledWith('lore.camcorder');
    expect(lore.carrying).toEqual([]);
    expect(lore.clips.map((c) => c.cutscene)).toEqual(['clip.camcorder']);
    expect(lore.give('camcorder')).toBe(false); // already handed in
  });

  it('watching a clip closes the ledger and plays it', () => {
    const { lore, ledger, cutscenes } = makeLore();
    lore.addClip({ cutscene: 'clip.night1' });
    const watch = lore.ledgerPage().rows.find((r) => r.label.includes('Watch:'));
    watch.action();
    expect(ledger.close).toHaveBeenCalled();
    expect(cutscenes.play).toHaveBeenCalledWith('clip.night1', expect.anything());
  });

  it('a "rewatch" cutscene goes on the monitors once played; a sighting adds its own clip', () => {
    const { lore, bus } = makeLore();
    bus.emit('cutscene:ended', { id: 'clip.dogfight' });
    bus.emit('cutscene:ended', { id: 'clip.dogfight' });
    bus.emit('cutscene:ended', { id: 'final.intro' }); // not a clip
    expect(lore.clips.map((c) => c.cutscene)).toEqual(['clip.dogfight']);
    const cam = { name: 'Camera 3', x: 1, z: 2, facing: 0.5 };
    bus.emit('witch:trailCam', { cam, sighting: { night: 2, hour: 23.5 } });
    const clip = lore.clips.at(-1);
    expect(clip.cutscene).toBe('clip.sighting');
    expect(clip.title).toContain('night 2, 23:30');
    expect(clip.anchors.trailCam).toEqual({ x: 1, z: 2, yaw: 0.5 });
  });

  it('saves and loads, dropping what no longer exists', () => {
    const { lore } = makeLore();
    lore.give('pilotLog');
    lore.give('doc2');
    lore.handIn('doc2');
    const saved = JSON.parse(JSON.stringify(lore.saveState()));
    const { lore: other } = makeLore();
    other.loadState({ ...saved, carrying: [...saved.carrying, 'gone'], clips: [...saved.clips, { cutscene: 'gone' }] });
    expect(other.carrying).toEqual(['pilotLog']);
    expect(other.handedIn).toEqual(['doc2']);
    expect(other.clips.map((c) => c.cutscene)).toEqual(['clip.programme']);
    other.loadState(undefined); // an older save
    expect(other.carrying).toEqual([]);
  });
});
