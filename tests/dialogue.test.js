import { describe, it, expect, vi } from 'vitest';
import { conditionsMet, pickLine, hasNewLine, linesForEvent, fillTemplate, validateLines, recency } from '../src/story/dialoguePicker.js';
import { RadioGate } from '../src/story/radioGate.js';
import { Dialogue } from '../src/story/Dialogue.js';
import { EventBus } from '../src/core/EventBus.js';
import { config } from '../src/config.js';
import dialogueData from '../src/data/dialogue.json';

function facts(over = {}) {
  return { night: 1, phase: 'day', flags: new Set(), milestones: [], scripts: new Set(), ...over };
}

describe('dialogue conditions', () => {
  it('a line with no conditions always holds', () => {
    expect(conditionsMet({ id: 'a' }, facts())).toBe(true);
  });

  it('checks the night range, phase and flags', () => {
    const line = { when: { night: [2, 3], phase: ['dawn'], all: ['sigilDug'], none: ['hutDestroyed'] } };
    const ok = facts({ night: 2, phase: 'dawn', flags: new Set(['sigilDug']) });
    expect(conditionsMet(line, ok)).toBe(true);
    expect(conditionsMet(line, { ...ok, night: 1 })).toBe(false);
    expect(conditionsMet(line, { ...ok, night: 4 })).toBe(false);
    expect(conditionsMet(line, { ...ok, phase: 'day' })).toBe(false);
    expect(conditionsMet(line, { ...ok, flags: new Set() })).toBe(false);
    expect(conditionsMet(line, { ...ok, flags: new Set(['sigilDug', 'hutDestroyed']) })).toBe(false);
  });

  it('an open-ended night range', () => {
    expect(conditionsMet({ when: { night: [3, null] } }, facts({ night: 9 }))).toBe(true);
    expect(conditionsMet({ when: { night: [3, null] } }, facts({ night: 2 }))).toBe(false);
  });
});

describe('the picker', () => {
  const lines = [
    { id: 'idle', speaker: 'wyatt', channel: 'face', idle: true, text: 'idle' },
    { id: 'old', speaker: 'wyatt', channel: 'face', when: { all: ['witchPlanted'] }, text: 'old' },
    { id: 'new', speaker: 'wyatt', channel: 'face', when: { all: ['sigilDug'] }, text: 'new' },
    { id: 'plain', speaker: 'wyatt', channel: 'face', text: 'plain' },
    { id: 'loud', speaker: 'wyatt', channel: 'face', priority: 5, text: 'loud' },
    { id: 'radio', speaker: 'wyatt', channel: 'radio', text: 'radio' },
    { id: 'event', speaker: 'wyatt', channel: 'face', on: 'phase:dawn', text: 'event' },
    { id: 'first', speaker: 'junie', channel: 'face', next: 'reply', text: 'q' },
    { id: 'reply', speaker: 'junie', channel: 'face', text: 'a' },
  ];

  it('newest milestone first, then priority, then file order', () => {
    const f = facts({ flags: new Set(['witchPlanted', 'sigilDug']), milestones: ['witchPlanted', 'sigilDug'] });
    const heard = new Set();
    const order = [];
    for (let i = 0; i < 5; i++) {
      const line = pickLine(lines, 'wyatt', f, heard);
      order.push(line.id);
      heard.add(line.id);
    }
    expect(order).toEqual(['new', 'old', 'loud', 'plain', 'idle']);
  });

  it('a milestone that happened first ranks below a later one', () => {
    const f = facts({ flags: new Set(['witchPlanted', 'sigilDug']), milestones: ['sigilDug', 'witchPlanted'] });
    expect(pickLine(lines, 'wyatt', f, new Set()).id).toBe('old');
    expect(recency(lines[1], f)).toBe(1);
    expect(recency(lines[3], f)).toBe(-1);
  });

  it('skips radio lines, event lines and lines that follow another', () => {
    const heard = new Set(['new', 'old', 'loud', 'plain']);
    expect(pickLine(lines, 'wyatt', facts(), heard).id).toBe('idle');
    expect(pickLine(lines, 'junie', facts(), new Set()).id).toBe('first');
    expect(pickLine(lines, 'junie', facts(), new Set(['first']))).toBe(null);
  });

  it('idle lines are not "something new"', () => {
    const heard = new Set(['new', 'old', 'loud', 'plain']);
    expect(hasNewLine(lines, 'wyatt', facts(), heard)).toBe(false);
    expect(hasNewLine(lines, 'wyatt', facts(), new Set())).toBe(true);
  });

  it("a script's lines only play while it's live", () => {
    const scripted = [{ id: 's', speaker: 'ellen', channel: 'face', script: 'day1', text: 's' }];
    expect(pickLine(scripted, 'ellen', facts(), new Set())).toBe(null);
    expect(pickLine(scripted, 'ellen', facts({ scripts: new Set(['day1']) }), new Set()).id).toBe('s');
  });

  it('lines for an event: playable ones, highest priority first', () => {
    const ev = [
      { id: 'a', on: 'x', speaker: 'ellen', channel: 'radio', text: 'a' },
      { id: 'b', on: 'x', priority: 2, speaker: 'ellen', channel: 'radio', text: 'b' },
      { id: 'c', on: 'x', when: { night: [5, 5] }, speaker: 'ellen', channel: 'radio', text: 'c' },
      { id: 'd', on: 'y', speaker: 'ellen', channel: 'radio', text: 'd' },
    ];
    expect(linesForEvent(ev, 'x', facts(), new Set()).map((l) => l.id)).toEqual(['b', 'a']);
    expect(linesForEvent(ev, 'x', facts(), new Set(['b'])).map((l) => l.id)).toEqual(['a']);
  });

  it('fills in {names}, leaving unknown ones', () => {
    expect(fillTemplate('{who} at the {where}', { who: 'A horde', where: 'gate' })).toBe('A horde at the gate');
    expect(fillTemplate('{who} at {nowhere}', { who: 'X' })).toBe('X at {nowhere}');
  });
});

describe('the dialogue file', () => {
  it('is valid: unique ids, known speakers and channels, real "next" lines', () => {
    expect(validateLines(dialogueData.lines, config.story.speakers)).toEqual([]);
  });

  it('has the 23 Day 1 lines, in order', () => {
    // M9.2: the numbered lines (the nudges are drafts beside them).
    const day1 = dialogueData.lines.filter((l) => /^day1\.\d+$/.test(l.id));
    expect(day1.length).toBe(23);
    expect(day1[0].text).toMatch(/^Tom\. Wake up\./);
    expect(day1[22].text).toMatch(/She was singing/);
  });

  it('catches mistakes', () => {
    const bad = [
      { id: 'a', speaker: 'nobody', channel: 'face', text: 'x' },
      { id: 'a', speaker: 'ellen', channel: 'shout', text: '', next: 'zz' },
    ];
    const problems = validateLines(bad, config.story.speakers);
    expect(problems.some((p) => p.includes('duplicate'))).toBe(true);
    expect(problems.some((p) => p.includes('unknown speaker'))).toBe(true);
    expect(problems.some((p) => p.includes('unknown channel'))).toBe(true);
    expect(problems.some((p) => p.includes('no text'))).toBe(true);
    expect(problems.some((p) => p.includes("next zz doesn't exist"))).toBe(true);
  });
});

describe('the radio rate limit', () => {
  const gate = new RadioGate({ minGap: 4, kindGap: 10 });

  it('keeps calls minGap apart, and one kind kindGap apart', () => {
    gate.reset();
    expect(gate.canSend(0, 'calm')).toBe(true);
    gate.sent(0, 'calm');
    expect(gate.canSend(2, null)).toBe(false);
    expect(gate.canSend(5, null)).toBe(true);
    expect(gate.canSend(5, 'calm')).toBe(false);
    expect(gate.canSend(10, 'calm')).toBe(true);
  });

  it('an urgent call skips minGap, but not its own kind', () => {
    gate.reset();
    gate.sent(0, 'calm');
    expect(gate.canSend(1, 'urgent', true)).toBe(true);
    gate.sent(1, 'urgent');
    expect(gate.canSend(3, 'urgent', true)).toBe(false);
  });
});

// The Dialogue system with fake subtitles: plays from data alone.
function makeDialogue(data, { withFamily = true } = {}) {
  const shown = [];
  const subtitles = {
    show: (e) => {
      shown.push(e);
      e.onStart?.(e);
      return e;
    },
    busy: false,
  };
  const bus = new EventBus();
  bus.init();
  const d = new Dialogue(config, bus, data);
  const notify = vi.fn();
  d.init({ subtitles, clock: { day: 1, phase: 'day' }, withFamily: () => withFamily, stateFlags: () => [], notify });
  return { d, bus, shown, notify };
}

describe('the dialogue system', () => {
  const data = {
    words: { groupSize: ['One', 'Some', 'Many'] },
    lines: [
      { id: 'call', speaker: 'wyatt', channel: 'radio', repeatable: true, kind: 'calm', text: '{who} at the {where}' },
      { id: 'once', speaker: 'ellen', channel: 'radio', text: 'one-off call' },
      { id: 'talk', speaker: 'junie', channel: 'face', text: 'hello', next: 'reply' },
      { id: 'reply', speaker: 'ellen', channel: 'face', text: 'hi' },
      { id: 'onArm', on: 'hut:armed', speaker: 'junie', channel: 'radio', repeatable: true, urgent: true, text: 'sure?' },
      { id: 'dug', speaker: 'wyatt', channel: 'face', when: { all: ['sigilDug'] }, text: 'you dug it' },
    ],
  };

  it('a radio call from data, with its words filled in', () => {
    const { d, shown } = makeDialogue(data);
    expect(d.say('call', { who: d.word('groupSize', 2), where: 'gate' })).toBe(true);
    expect(shown[0]).toMatchObject({ speaker: 'wyatt', text: 'Many at the gate', radio: true });
  });

  it('a repeatable call is dropped by the rate limit; a one-off waits', () => {
    const { d, shown } = makeDialogue(data);
    d.say('call', { who: 'A', where: 'b' });
    expect(d.say('call', { who: 'A', where: 'b' })).toBe(false);
    expect(d.say('once')).toBe(true); // queued
    expect(shown.length).toBe(1);
    d.update(config.radio.minGap + 0.1, true);
    expect(shown.length).toBe(2);
    expect(shown[1].text).toBe('one-off call');
  });

  it('a face-to-face line and its reply; heard lines are remembered', () => {
    const { d, shown } = makeDialogue(data);
    expect(d.hasNew('junie')).toBe(true);
    expect(d.talkTo('junie').id).toBe('talk');
    expect(shown.map((e) => [e.speaker, e.text, e.radio])).toEqual([
      ['junie', 'hello', false],
      ['ellen', 'hi', false],
    ]);
    expect(d.hasNew('junie')).toBe(false);
    expect(d.heard.has('reply')).toBe(true);
  });

  it('nothing new to say: a notice, no line', () => {
    const { d, notify } = makeDialogue(data);
    expect(d.talkTo('wyatt')).toBe(null);
    expect(notify).toHaveBeenCalled();
  });

  it('milestones unlock lines, and an event plays its line', () => {
    const { d, bus, shown } = makeDialogue(data);
    bus.emit('sigil:dug', {});
    expect(d.milestones).toContain('sigilDug');
    expect(d.talkTo('wyatt').id).toBe('dug');
    bus.emit('hut:armed');
    expect(shown.at(-1)).toMatchObject({ text: 'sure?', radio: true, urgent: true });
  });

  it('a face line heard away from the family comes over the radio', () => {
    const { d, shown } = makeDialogue(data, { withFamily: false });
    d.say('reply', {}, true);
    expect(shown[0].radio).toBe(true);
  });

  it('saves and loads what was heard, and ignores ids that no longer exist', () => {
    const { d } = makeDialogue(data);
    d.talkTo('junie');
    d.milestone('witchPlanted');
    const saved = JSON.parse(JSON.stringify(d.saveState()));
    const { d: d2 } = makeDialogue(data);
    d2.loadState({ ...saved, heard: [...saved.heard, 'gone'] });
    expect([...d2.heard].sort()).toEqual(['reply', 'talk']);
    expect(d2.milestones).toEqual(['witchPlanted']);
    d2.loadState(undefined); // an older save
    expect(d2.heard.size).toBe(0);
  });
});
