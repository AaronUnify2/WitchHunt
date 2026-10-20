// What this device remembers outside any one run (M9.2; M12 grows it into
// achievements and modifiers): for now, whether the opening has been seen
// (the main menu's Skip intro shows once it has). Also a one-shot note
// that survives the reload a new map needs: what the player chose on the
// menu before it (New Run or Skip intro), so the fresh page carries on
// with it. Storage can fail (private browsing, blocked): then nothing is
// remembered and the game carries on.

export class MetaStore {
  // cfg: config.meta. storage / session: localStorage / sessionStorage (or stand-ins for tests).
  constructor(cfg, storage = globalThis.localStorage, session = globalThis.sessionStorage) {
    this.cfg = cfg;
    this.storage = storage;
    this.session = session;
  }

  load() {
    try {
      const text = this.storage?.getItem(this.cfg.key);
      const d = text ? JSON.parse(text) : null;
      return d && typeof d === 'object' ? d : {};
    } catch {
      return {};
    }
  }

  get(name) {
    return this.load()[name];
  }

  set(name, value) {
    try {
      const d = this.load();
      d[name] = value;
      this.storage.setItem(this.cfg.key, JSON.stringify(d));
      return true;
    } catch {
      return false;
    }
  }

  get introSeen() {
    return Boolean(this.get('introSeen'));
  }

  // The choice to carry across the reload ('new' | 'skip'), or null.
  setPendingChoice(choice) {
    try {
      if (choice) this.session.setItem(this.cfg.pendingKey, choice);
      else this.session.removeItem(this.cfg.pendingKey);
    } catch {
      // nothing to do
    }
  }

  // Read once: it's cleared as it's read.
  takePendingChoice() {
    try {
      const choice = this.session?.getItem(this.cfg.pendingKey) ?? null;
      this.session?.removeItem(this.cfg.pendingKey);
      return choice === 'new' || choice === 'skip' ? choice : null;
    } catch {
      return null;
    }
  }
}
