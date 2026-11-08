import { describe, it, expect } from 'vitest';
import { InspectCard, cardActions } from '../src/ui/InspectCard.js';
import loreData from '../src/data/lore.json';

describe('inspect cards (Session 20)', () => {
  it("the opening's tapes and papers each have a card", () => {
    const card = new InspectCard(null);
    for (const id of ['camcorder', 'earlNote', 'pruittDiary', 'pruittTapes', 'fieldReport', 'outpostManifest']) {
      expect(card.has(id)).toBe(true);
      const item = loreData.items.find((i) => i.id === id);
      expect(item.card.line.length).toBeGreaterThan(10);
      expect(item.card.look).toBeTruthy();
    }
  });

  it('offers watch for a tape, read for a paper, and always keep for later', () => {
    const f = () => {};
    expect(cardActions({ watch: f, keep: f }).map((a) => a.label)).toEqual(['D-pad ▼: watch it', 'B: keep it for later']);
    expect(cardActions({ read: f, keep: f }, false).map((a) => a.label)).toEqual(['Enter: read it', 'Esc: keep it for later']);
  });

  it('D-pad down watches, A reads, B keeps', () => {
    const card = new InspectCard(null);
    card.init(null);
    const got = [];
    const open = (handlers) => {
      card.isOpen = true;
      card.item = { id: 'x' };
      card.handlers = handlers;
      card.device = 'gamepad';
    };
    const press = (action) => ({ activeDevice: 'gamepad', wasPressed: (a) => a === action, swallowHeld() {} });
    open({ watch: () => got.push('watch'), keep: () => got.push('keep') });
    expect(card.update(0, press('menuConfirm'))).toBe(true); // A does nothing on a tape
    card.update(0, press('watch'));
    open({ read: () => got.push('read'), keep: () => got.push('keep') });
    card.update(0, press('watch')); // no watching a paper
    card.update(0, press('menuConfirm'));
    open({ read: () => got.push('read'), keep: () => got.push('keep') });
    expect(card.update(0, press('menuBack'))).toBe(false);
    expect(got).toEqual(['watch', 'read', 'keep']);
  });
});
