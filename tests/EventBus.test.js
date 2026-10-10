import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../src/core/EventBus.js';

describe('EventBus', () => {
  it('delivers payloads to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('phase:dusk', handler);
    bus.emit('phase:dusk', { day: 2 });
    expect(handler).toHaveBeenCalledWith({ day: 2 });
  });

  it('only calls handlers for the emitted event', () => {
    const bus = new EventBus();
    const dusk = vi.fn();
    const night = vi.fn();
    bus.on('phase:dusk', dusk);
    bus.on('phase:night', night);
    bus.emit('phase:dusk');
    expect(dusk).toHaveBeenCalledTimes(1);
    expect(night).not.toHaveBeenCalled();
  });

  it('calls every subscriber', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('x', a);
    bus.on('x', b);
    bus.emit('x');
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes with the returned function and with off()', () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on('x', a);
    bus.on('x', b);
    offA();
    bus.off('x', b);
    bus.emit('x');
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
    expect(bus.listenerCount('x')).toBe(0);
  });

  it('once() fires a single time', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('x', handler);
    bus.emit('x', 1);
    bus.emit('x', 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('emitting an event with no subscribers does nothing', () => {
    const bus = new EventBus();
    expect(() => bus.emit('nobody:listening')).not.toThrow();
  });

  it('is safe when a handler unsubscribes another during emit', () => {
    const bus = new EventBus();
    const b = vi.fn();
    let offB;
    bus.on('x', () => offB());
    offB = bus.on('x', b);
    bus.emit('x');
    expect(b).toHaveBeenCalledTimes(1); // this emit still reaches it
    bus.emit('x');
    expect(b).toHaveBeenCalledTimes(1); // the next one doesn't
  });

  it('keeps calling other handlers when one throws', () => {
    const bus = new EventBus();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    bus.on('x', () => {
      throw new Error('boom');
    });
    bus.on('x', after);
    bus.emit('x');
    expect(after).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('dispose() removes every listener', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('x', handler);
    bus.dispose();
    bus.emit('x');
    expect(handler).not.toHaveBeenCalled();
  });
});
