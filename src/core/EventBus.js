// A tiny publish/subscribe bus. Systems talk through named events
// (e.g. 'phase:dusk', 'input:deviceChanged') instead of holding
// references to each other.

export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  init() {}

  update() {}

  dispose() {
    this.listeners.clear();
  }

  // Subscribe. Returns a function that unsubscribes.
  on(name, handler) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(handler);
    return () => this.off(name, handler);
  }

  // Subscribe for a single call.
  once(name, handler) {
    const off = this.on(name, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off(name, handler) {
    const set = this.listeners.get(name);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(name);
  }

  // Call every handler for this event. Handlers added or removed during
  // the emit don't affect this emit. A throwing handler is logged and
  // does not stop the others.
  emit(name, payload) {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`EventBus: handler for "${name}" threw`, err);
      }
    }
  }

  listenerCount(name) {
    return this.listeners.get(name)?.size ?? 0;
  }
}
