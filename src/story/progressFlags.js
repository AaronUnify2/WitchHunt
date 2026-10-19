// Story progress flags (pure; M9.1). Once set, a flag stays set (the
// debug menu can clear one), and the set is saved. What sets each is in
// data/progress.json: a trigger, many of them stand-ins until the real
// story beat (Sessions 15-17) calls set() itself.

export class ProgressFlags {
  // defs: data/progress.json's "flags".
  constructor(defs) {
    this.defs = defs;
    this.ids = defs.map((d) => d.id);
    this.on = new Set();
  }

  has(id) {
    return this.on.has(id);
  }

  // True if this changed it. Unknown ids throw, so a typo can't silently gate nothing.
  set(id, value = true) {
    if (!this.ids.includes(id)) throw new Error(`Unknown progress flag: ${id}`);
    if (value === this.on.has(id)) return false;
    if (value) this.on.add(id);
    else this.on.delete(id);
    return true;
  }

  list() {
    return this.ids.filter((id) => this.on.has(id));
  }

  saveState() {
    return this.list();
  }

  // Older saves have none; unknown ids (a flag renamed since) are dropped.
  loadState(d) {
    this.on.clear();
    for (const id of d ?? []) if (this.ids.includes(id)) this.on.add(id);
  }
}

// Which flags' triggers fire now. ctx: { event: 'dusk' | 'dawn' | null,
// day, clearing (the key of the clearing Tom is in, or null),
// cleared(key, margin) -> bool, south (Tom is south of the cordon) }.
// Chains settle in one call (a flag set now can satisfy another's
// `after`). Returns the ids it set, in order.
export function runTriggers(flags, ctx) {
  const fired = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (const def of flags.defs) {
      if (flags.has(def.id) || !def.trigger) continue;
      const t = def.trigger;
      if ((t.after ?? []).some((id) => !flags.has(id))) continue;
      let fire = false;
      switch (t.on) {
        case 'dusk':
          fire = ctx.event === 'dusk' && ctx.day >= t.day;
          break;
        case 'dawn':
          fire = ctx.event === 'dawn';
          break;
        case 'visit':
          fire = ctx.clearing === t.clearing;
          break;
        case 'all':
          fire = true;
          break;
        case 'cleared':
          fire = ctx.clearing === t.clearing && ctx.cleared(t.clearing, t.margin ?? 0);
          break;
        case 'south':
          fire = !!ctx.south;
          break;
        default:
          throw new Error(`Unknown trigger "${t.on}" on progress flag ${def.id}`);
      }
      if (fire) {
        flags.set(def.id);
        fired.push(def.id);
        changed = true;
      }
    }
  }
  return fired;
}
