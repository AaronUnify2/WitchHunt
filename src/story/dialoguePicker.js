// The dialogue system's pure logic (M8; DESIGN.md "Dialogue system"):
// whether a line's conditions are met, which line someone says when you
// talk to them, and filling in a line's {names}. No DOM, no clock.
//
// facts: { night, phase, flags: Set<string>, milestones: string[] (the
// milestone flags in the order they happened), scripts: Set<string> (the
// live scripts) }.

// Does the line's "when" hold? when: { night: [min, max], phase: [...],
// all: [flags], none: [flags] }; any part may be missing.
export function conditionsMet(line, facts) {
  const w = line.when;
  if (!w) return true;
  if (w.night) {
    const [min, max] = w.night;
    if ((min !== undefined && min !== null && facts.night < min) || (max !== undefined && max !== null && facts.night > max)) return false;
  }
  if (w.phase && !w.phase.includes(facts.phase)) return false;
  if (w.all && !w.all.every((f) => facts.flags.has(f))) return false;
  if (w.none && w.none.some((f) => facts.flags.has(f))) return false;
  return true;
}

// A line tied to a script only plays while that script is live.
export function scriptLive(line, facts) {
  return !line.script || facts.scripts.has(line.script);
}

// How recent the newest milestone a line asks for is: its place in the
// milestone order (later is higher), or -1 if it asks for none.
export function recency(line, facts) {
  const all = line.when?.all;
  if (!all) return -1;
  let best = -1;
  for (const f of all) best = Math.max(best, facts.milestones.indexOf(f));
  return best;
}

// Can this line play now? Its script is live, its conditions hold, and
// it hasn't been heard (unless it's repeatable).
export function playable(line, facts, heard) {
  return scriptLive(line, facts) && conditionsMet(line, facts) && (line.repeatable || !heard.has(line.id));
}

// What `speaker` says when you talk to them face to face: the unheard
// line whose conditions are met, newest milestone first, then highest
// priority, then the order in the file. Lines that follow another
// (some line's "next"), play from an event ("on") or are cued by a
// system ("cued": M9.2, e.g. Day 1's nudges) aren't picked here.
// Then an idle line ("idle": true) if there's one. null if nothing.
export function pickLine(lines, speaker, facts, heard, followers = followerIds(lines)) {
  let best = null;
  let bestKey = null;
  lines.forEach((line, order) => {
    if (line.speaker !== speaker || line.channel !== 'face' || line.on || line.cued || line.idle || followers.has(line.id)) return;
    if (!playable(line, facts, heard)) return;
    const key = [recency(line, facts), line.priority ?? 0, -order];
    if (!best || compareKeys(key, bestKey) > 0) {
      best = line;
      bestKey = key;
    }
  });
  if (best) return best;
  return lines.find((l) => l.speaker === speaker && l.idle && scriptLive(l, facts) && conditionsMet(l, facts)) ?? null;
}

// Has `speaker` something new to say (the new-line marker)? Idle lines don't count.
export function hasNewLine(lines, speaker, facts, heard, followers = followerIds(lines)) {
  const line = pickLine(lines, speaker, facts, heard, followers);
  return Boolean(line && !line.idle);
}

// The lines an event plays: every line with on === event that can play
// now, highest priority first (ties in file order).
export function linesForEvent(lines, event, facts, heard) {
  return lines
    .map((line, order) => ({ line, order }))
    .filter(({ line }) => line.on === event && playable(line, facts, heard))
    .sort((a, b) => (b.line.priority ?? 0) - (a.line.priority ?? 0) || a.order - b.order)
    .map(({ line }) => line);
}

// The ids of lines that only play after another ("next").
export function followerIds(lines) {
  const ids = new Set();
  for (const l of lines) if (l.next) ids.add(l.next);
  return ids;
}

// "{who} at the {where}" with { who: 'A horde', where: 'gate' }. Unknown
// names are left as they are, so a missing one is easy to spot.
export function fillTemplate(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
}

// Checks a lines file: unique ids, known speakers and channels, and every
// "next" pointing at a line that exists. Returns a list of problems.
export function validateLines(lines, speakers) {
  const problems = [];
  const ids = new Set();
  for (const l of lines) {
    if (!l.id) problems.push('a line has no id');
    else if (ids.has(l.id)) problems.push(`duplicate id ${l.id}`);
    ids.add(l.id);
    if (!speakers[l.speaker]) problems.push(`${l.id}: unknown speaker ${l.speaker}`);
    if (!['radio', 'face', 'caption'].includes(l.channel)) problems.push(`${l.id}: unknown channel ${l.channel}`);
    if (typeof l.text !== 'string' || !l.text) problems.push(`${l.id}: no text`);
  }
  for (const l of lines) if (l.next && !ids.has(l.next)) problems.push(`${l.id}: next ${l.next} doesn't exist`);
  return problems;
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
