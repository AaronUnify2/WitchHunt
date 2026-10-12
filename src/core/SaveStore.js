// The run's one save slot in the browser's localStorage (M6). Reading
// and writing can fail (private browsing, storage full or blocked): it
// then just reports no save, and the game carries on.

export class SaveStore {
  // cfg: config.save. storage: localStorage (or a stand-in for tests).
  constructor(cfg, storage = globalThis.localStorage) {
    this.cfg = cfg;
    this.storage = storage;
  }

  load() {
    try {
      const text = this.storage?.getItem(this.cfg.key);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  // Returns true if it was written.
  save(data) {
    try {
      this.storage.setItem(this.cfg.key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  clear() {
    try {
      this.storage?.removeItem(this.cfg.key);
    } catch {
      // nothing to do
    }
  }
}
