import { describe, it, expect } from 'vitest';
import { Clock } from '../src/core/Clock.js';
import { EventBus } from '../src/core/EventBus.js';

// A short test cycle so the maths is easy to follow.
const testConfig = {
  timeScale: 1,
  startDay: 1,
  startPhase: 'day',
  phases: [
    { name: 'day', seconds: 10, startHour: 7 },
    { name: 'dusk', seconds: 2, startHour: 19 },
    { name: 'night', seconds: 6, startHour: 20 },
    { name: 'dawn', seconds: 2, startHour: 6 },
  ],
  hoursPerDay: 24,
  minutesPerHour: 60,
};

function makeClock(overrides = {}) {
  const bus = new EventBus();
  const events = [];
  bus.on('clock:phaseChanged', (e) => events.push(e));
  const clock = new Clock({ ...testConfig, ...overrides }, bus);
  clock.init();
  return { clock, events };
}

describe('Clock', () => {
  it('starts on the configured day and phase', () => {
    const { clock } = makeClock();
    expect(clock.day).toBe(1);
    expect(clock.phase).toBe('day');
    expect(clock.formatTime()).toBe('07:00');
  });

  it('moves through the phases in order and counts days', () => {
    const { clock, events } = makeClock();
    clock.update(10);
    expect(clock.phase).toBe('dusk');
    clock.update(2);
    expect(clock.phase).toBe('night');
    clock.update(6);
    expect(clock.phase).toBe('dawn');
    clock.update(2);
    expect(clock.phase).toBe('day');
    expect(clock.day).toBe(2);
    expect(events.map((e) => e.to)).toEqual(['dusk', 'night', 'dawn', 'day']);
    expect(events.at(-1).day).toBe(2);
  });

  it('crosses several phases in one long update', () => {
    const { clock, events } = makeClock();
    clock.update(13);
    expect(clock.phase).toBe('night');
    expect(events).toHaveLength(2);
    expect(clock.phaseRemaining).toBeCloseTo(5);
  });

  it('maps progress onto the clock face, wrapping past midnight', () => {
    const { clock } = makeClock();
    clock.update(5); // halfway through day: 07:00 -> 19:00
    expect(clock.formatTime()).toBe('13:00');
    clock.update(5 + 2 + 3); // halfway through night: 20:00 -> 06:00
    expect(clock.formatTime()).toBe('01:00');
  });

  it('does not advance while paused', () => {
    const { clock } = makeClock();
    clock.setPaused(true);
    clock.update(100);
    expect(clock.phase).toBe('day');
    expect(clock.phaseElapsed).toBe(0);
  });

  it('applies the time scale', () => {
    const { clock } = makeClock({ timeScale: 2 });
    clock.update(5);
    expect(clock.phase).toBe('dusk');
  });
});
