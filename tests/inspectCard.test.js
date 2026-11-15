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

// Nov 15 (Aaron: the pickup text is gone before you can read it; two cards at the safe, three at the comms hut).
import pickupCards from '../src/data/pickupCards.json';
import { readFileSync } from 'node:fs';

describe('pickup cards, one after another (Nov 15)', () => {
  const fakeCard = () => {
    const card = new InspectCard(null);
    // A screen without the DOM: just enough for show/choose.
    card.el = { classList: { add() {}, remove() {} } };
    card.itemEl = { style: { setProperty() {} } };
    card.nameEl = {};
    card.lineEl = {};
    card.render = () => {};
    return card;
  };

  it('has a card for the hunting rifle, the power cell, the rounds and the charge, with one button', () => {
    const card = new InspectCard(null);
    for (const id of ['huntingRifle', 'planeCell', 'outpostRounds', 'outpostCharge']) expect(card.has(id), id).toBe(true);
    expect(cardActions({ ok: () => {} }).map((a) => a.id)).toEqual(['ok']);
    expect(pickupCards.items.every((i) => i.card.line.length > 20)).toBe(true);
  });

  it('queues a card asked for while one is up, and shows it when that one closes (and not over a paper)', () => {
    const card = fakeCard();
    let paper = false;
    card.blocked = () => paper;
    const order = [];
    expect(card.show('huntingRifle', { ok: () => order.push('rifle') })).toBe(true);
    expect(card.show('leverRifle', { ok: () => order.push('lever') })).toBe(true);
    expect(card.item.id).toBe('huntingRifle');
    expect(card.nameEl.textContent).toMatch(/hunting rifle/i);
    const input = { wasPressed: (a) => a === 'menuConfirm', activeDevice: 'gamepad' };
    card.update(0, input);
    expect(order).toEqual(['rifle']);
    expect(card.isOpen).toBe(false);
    paper = true;
    card.update(0, input);
    expect(card.isOpen).toBe(false); // waits for the paper
    paper = false;
    card.update(0, { wasPressed: () => false, activeDevice: 'gamepad' });
    expect(card.item.id).toBe('leverRifle');
    expect(card.nameEl.textContent).toMatch(/present for Wyatt/i);
  });

  it('the safe, the plane and the comms hut ask for them', () => {
    const gas = readFileSync(new URL('../src/encounters/GasStation.js', import.meta.url), 'utf8');
    expect(gas).toMatch(/show\('huntingRifle'[\s\S]*show\('leverRifle'/);
    const plane = readFileSync(new URL('../src/encounters/CrashedPlane.js', import.meta.url), 'utf8');
    expect(plane).toContain("show('planeCell'");
  });
});
