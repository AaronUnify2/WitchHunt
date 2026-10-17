// The radio's rate limiting (pure; M8; DESIGN.md "The radio": calls are
// rate-limited). Calls of one kind are at least kindGap apart, and any
// two calls at least minGap apart. An urgent call ignores minGap (it
// still keeps its own kind's gap, so the same alarm can't repeat).
//
// cfg: config.radio. Times are in seconds of game time.

export class RadioGate {
  constructor(cfg) {
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.last = -Infinity; // the last call of any kind
    this.lastKind = {};
  }

  // Can a call of `kind` go out at `now`? kind: a string, or null for a
  // one-off line (no kind gap).
  canSend(now, kind = null, urgent = false) {
    if (kind && now - (this.lastKind[kind] ?? -Infinity) < this.cfg.kindGap) return false;
    if (!urgent && now - this.last < this.cfg.minGap) return false;
    return true;
  }

  // Record a call going out.
  sent(now, kind = null) {
    this.last = now;
    if (kind) this.lastKind[kind] = now;
  }
}
