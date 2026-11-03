// Session 16 (Aaron): papers read in close-up: Earl's note and his diary.
import { describe, it, expect } from 'vitest';
import papers from '../src/data/papers.json';
import dialogueData from '../src/data/dialogue.json';
import { PaperNote } from '../src/ui/PaperNote.js';

const byId = Object.fromEntries(papers.papers.map((p) => [p.id, p]));

describe('papers in close-up', () => {
  it("has Earl's note, with the same words as its subtitle stand-in", () => {
    const note = byId.earlNote;
    expect(note.pages.length).toBe(1);
    const strip = dialogueData.lines.find((l) => l.id === 'gas.note').text;
    const plain = (t) => t.replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    for (const bit of ["I've taken the kids to the shelter", 'military checkpoint', "Combination's on my keys"]) {
      expect(plain(note.pages[0].text)).toContain(bit);
      expect(strip).toContain(bit);
    }
  });

  it("has Earl's diary: five dated entries (Session 16: one in the 1990s, fond of Bigfoot); Session 19 (Aaron): no blank page after them", () => {
    const d = byId.earlDiary;
    expect(d.kind).toBe('diary');
    expect(d.pages.length).toBe(5);
    expect(d.pages.every((p) => p.date && p.text.length > 40)).toBe(true);
    expect(d.pages[0].date).toMatch(/1987/);
    expect(d.pages[2].date).toMatch(/199\d/);
    expect(d.pages[4].date).toMatch(/2003/);
  });

  it('never says the children died (Aaron)', () => {
    const all = papers.papers.flatMap((p) => p.pages.map((g) => g.text)).join(' ');
    expect(all).not.toMatch(/kids? (are|is) dead|children died|buried the kids/i);
  });

  it("won't open without a screen, and knows its papers", () => {
    const p = new PaperNote(null);
    p.init(null);
    expect(p.has('earlDiary')).toBe(true);
    expect(p.open('earlDiary')).toBe(false);
    expect(p.isOpen).toBe(false);
  });
});
