// The dialogue system (M8; DESIGN.md "Dialogue system", "The radio"):
// one data file of lines (src/data/dialogue.json) shared by family talk,
// radio calls and cutscene captions.
//  - Talking to the family picks an unheard line whose conditions hold,
//    newest milestone first (dialoguePicker.js). Heard lines are saved.
//  - Lines with "on" play when their event fires (e.g. 'hut:armed').
//  - Systems ask for a line by id: say('nights.alarm', { ... }).
//  - Radio calls go through the rate limit (radioGate.js). A one-off call
//    that has to wait queues for a while; a repeatable one is dropped.
//  - A "face" line heard while Tom is away from the family comes over
//    the radio instead.
//  - A line's "next" follows it straight away (a short exchange).
// Milestones (config.story.milestones) are events that set flags lines
// can ask for; they're remembered in order and saved.
//
// Events: 'dialogue:line' { id, speaker, radio }.

import dialogueData from '../data/dialogue.json';
import { pickLine, hasNewLine, linesForEvent, followerIds, fillTemplate, validateLines, playable } from './dialoguePicker.js';
import { RadioGate } from './radioGate.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class Dialogue {
  constructor(cfg, bus, data = dialogueData) {
    this.cfg = cfg;
    this.sc = cfg.story;
    this.bus = bus;
    this.lines = data.lines;
    this.words = data.words ?? {};
  }

  // ctx: { subtitles, clock, withFamily() (Tom is in the cabin with them),
  // stateFlags() (a list of flags from the world now), notify(text) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.byId = new Map(this.lines.map((l) => [l.id, l]));
    this.followers = followerIds(this.lines);
    const problems = validateLines(this.lines, this.sc.speakers);
    if (problems.length) console.warn('dialogue.json:', problems.join('; '));
    this.gate = new RadioGate(this.cfg.radio);
    this.scripts = new Set(this.sc.liveScripts);
    this.reset();
    this.wireEvents();
  }

  reset() {
    this.heard = new Set();
    this.milestones = []; // flags, oldest first
    this.pending = []; // radio calls waiting for the rate limit: { line, vars, expires }
    this.time = 0;
    this.gate.reset();
  }

  wireEvents() {
    const events = new Set(this.lines.filter((l) => l.on).map((l) => l.on));
    this.unsubscribers = [
      ...Object.entries(this.sc.milestones).map(([event, flag]) => this.bus.on(event, () => this.milestone(flag))),
      ...[...events].map((event) => this.bus.on(event, (payload) => this.onEvent(event, payload))),
    ];
  }

  // ---- what's true now --------------------------------------------------------------------

  facts() {
    const flags = new Set(this.milestones);
    for (const f of this.stateFlags?.() ?? []) flags.add(f);
    return { night: this.clock.day, phase: this.clock.phase, flags, milestones: this.milestones, scripts: this.scripts };
  }

  milestone(flag) {
    if (this.milestones.includes(flag)) return;
    this.milestones.push(flag);
  }

  // ---- playing lines ------------------------------------------------------------------------

  onEvent(event, payload) {
    const lines = linesForEvent(this.lines, event, this.facts(), this.heard);
    // One line per event: the best one (its "next" lines follow it).
    if (lines.length) this.deliver(lines[0], payload ?? {});
  }

  // Play a line by id (a system's call, e.g. NightWatch's). vars fill its
  // {names}. Checks its conditions unless force. Returns true if it played
  // (or is queued for the radio).
  say(id, vars = {}, force = false) {
    const line = this.byId.get(id);
    if (!line) {
      console.warn(`No dialogue line ${id}`);
      return false;
    }
    if (!force && !playable({ ...line, script: undefined }, this.facts(), this.heard)) return false;
    return this.deliver(line, vars, force);
  }

  // Play a line by id past its conditions and the rate limit (a cutscene's
  // caption). radio: true / false, or null to work it out.
  play(id, vars = {}, radio = null) {
    const line = this.byId.get(id);
    if (!line) {
      console.warn(`No dialogue line ${id}`);
      return false;
    }
    return this.deliver(line, vars, true, radio);
  }

  // Talk to a family member face to face: what they say, or a note that
  // they've nothing new. Returns the line played, or null.
  talkTo(speaker) {
    const line = pickLine(this.lines, speaker, this.facts(), this.heard, this.followers);
    if (!line) {
      this.notify?.(`${this.sc.speakers[speaker]?.name ?? speaker} has nothing new to say`);
      return null;
    }
    this.deliver(line, {}, true, false);
    return line;
  }

  // Has this family member something new to say (the marker over them)?
  hasNew(speaker) {
    return hasNewLine(this.lines, speaker, this.facts(), this.heard, this.followers);
  }

  // The words a system fills a line with (dialogue.json "words").
  word(group, index) {
    const list = this.words[group] ?? [];
    return list[Math.max(0, Math.min(list.length - 1, index))] ?? '';
  }

  // radio: over the radio (a "radio" line, or a "face" line while Tom's
  // away from the family); null works it out. force: past the rate limit.
  deliver(line, vars = {}, force = false, radio = null) {
    const overRadio = radio ?? (line.channel === 'radio' || (line.channel === 'face' && !this.withFamily()));
    if (overRadio && !force) {
      if (!this.gate.canSend(this.time, line.kind ?? null, line.urgent)) {
        if (line.repeatable) return false;
        this.pending.push({ line, vars, expires: this.time + this.cfg.radio.queueSeconds });
        return true;
      }
    }
    if (overRadio) this.gate.sent(this.time, line.kind ?? null);
    this.show(line, vars, overRadio);
    return true;
  }

  // On screen, with its "next" lines straight after (each if it can play).
  show(line, vars, radio) {
    const chain = [line];
    const facts = this.facts();
    for (let l = this.byId.get(line.next); l && chain.length < 8; l = this.byId.get(l.next)) {
      if (!playable({ ...l, script: undefined }, facts, this.heard)) break;
      chain.push(l);
    }
    chain.forEach((l, i) => {
      this.subtitles.show({
        speaker: l.speaker,
        text: fillTemplate(l.text, vars),
        radio,
        urgent: i === 0 && Boolean(line.urgent),
        line: l,
        onStart: () => {
          if (!l.repeatable) this.heard.add(l.id);
          this.bus.emit('dialogue:line', { id: l.id, speaker: l.speaker, radio });
        },
      });
    });
  }

  update(dt, playing) {
    if (!playing) return;
    this.time += dt;
    if (this.pending.length === 0) return;
    this.pending = this.pending.filter((p) => p.expires > this.time);
    const next = this.pending[0];
    if (next && this.gate.canSend(this.time, next.line.kind ?? null, next.line.urgent)) {
      this.pending.shift();
      this.gate.sent(this.time, next.line.kind ?? null);
      this.show(next.line, next.vars, true);
    }
  }

  // ---- saving (core/saveData.js saveStory / loadStory) ------------------------------------------

  saveState() {
    return { heard: [...this.heard], milestones: [...this.milestones] };
  }

  loadState(d) {
    this.heard = new Set((d?.heard ?? []).filter((id) => this.byId.has(id)));
    this.milestones = [...(d?.milestones ?? [])];
  }

  // ---- debug ------------------------------------------------------------------------------------

  addDebugItems(menu) {
    const story = menu.category(DEBUG.story);
    story.addItem(
      () => `Day 1 lines: ${this.scripts.has('day1') ? 'live (talk to the family on Day 1; Dusk 1, Dawn 1)' : 'debug only (M9.2 wires their triggers)'}`,
      () => (this.scripts.has('day1') ? this.scripts.delete('day1') : this.scripts.add('day1')),
    );
    story.addItem(() => `Heard lines: ${this.heard.size} (select to forget them all)`, () => this.heard.clear());
    story.addItem(() => `Milestones: ${this.milestones.join(', ') || 'none yet'}`, () => {});
    story.addItem('Test: a radio call from data (the calm night call)', () => this.say('nights.arrival.calm', { who: this.word('groupSize', 1), where: 'east fence' }, true));
    story.addItem('Test: an urgent radio call (the alarm, cuts the queue)', () => this.say('nights.alarm', {}, true));
    story.addItem('Test: the rate limit (three calm calls at once: one plays)', () => {
      for (let i = 0; i < 3; i++) this.say('nights.arrival.calm', { who: this.word('groupSize', i), where: 'gate' });
    });
    const day1 = menu.category(DEBUG.day1);
    for (const line of this.lines.filter((l) => l.script === 'day1')) {
      const n = line.id.replace('day1.', '#');
      const who = this.sc.speakers[line.speaker]?.name ?? line.speaker;
      day1.addItem(`${n} ${who} (${line.channel}): ${line.cue}`, () => this.deliver(line, {}, true, line.channel === 'radio'));
    }
  }

  overlayLine() {
    return `heard ${this.heard.size}/${this.lines.length}  milestones ${this.milestones.length}  radio queue ${this.pending.length}  subtitles ${this.subtitles.busy ? 'on' : '-'}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
  }
}
