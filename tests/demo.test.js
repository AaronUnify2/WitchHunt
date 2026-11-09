import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { verdictFor, recommendPreset, stepIn, FpsMeter } from '../src/demo/verdict.js';
import { DemoPanel } from '../src/demo/DemoPanel.js';
import { StartScreen } from '../src/ui/StartScreen.js';

const t = config.demo.test;
const presets = Object.keys(config.quality.presets);

describe('Demo mode: the device test (Session 22)', () => {
  it('gives a verdict on the average frame rate', () => {
    expect(verdictFor(55, 0, t).id).toBe('great');
    expect(verdictFor(t.great, 0, t).id).toBe('great');
    expect(verdictFor(30, 0, t).id).toBe('playable');
    expect(verdictFor(12, 0, t).id).toBe('struggling');
  });

  it('counts near the cap as great on a 30 fps capped preset (Low)', () => {
    expect(verdictFor(29, 30, t).id).toBe('great');
    expect(verdictFor(29, 0, t).id).toBe('playable');
  });

  it('recommends one preset down when it struggles, else keeps the one tested', () => {
    expect(presets.slice(0, 2)).toEqual(['low', 'medium']);
    expect(recommendPreset('struggling', 'medium', presets)).toBe('low');
    expect(recommendPreset('struggling', 'low', presets)).toBe('low');
    expect(recommendPreset('playable', 'high', presets)).toBe('high');
    expect(recommendPreset('great', 'medium', presets)).toBe('medium');
  });

  it('steps a value along a list, held at the ends', () => {
    const counts = config.demo.zombieCounts;
    expect(stepIn(counts, 25, 1)).toBe(50);
    expect(stepIn(counts, 10, -1)).toBe(10);
    expect(stepIn(counts, 150, 1)).toBe(150);
    expect(Math.max(...counts)).toBe(150);
  });

  it('meters the average and the slowest frame', () => {
    const m = new FpsMeter();
    for (let i = 0; i < 9; i++) m.add(1 / 50);
    m.add(1 / 10);
    expect(m.average).toBeCloseTo(10 / (9 / 50 + 1 / 10));
    expect(m.low).toBeCloseTo(10);
    m.reset();
    expect(m.average).toBe(0);
  });
});

describe('Demo mode: the panel and the menu (Session 22)', () => {
  const input = (pressed) => ({ activeDevice: 'gamepad', wasPressed: (a) => a === pressed, swallowHeld: () => {} });
  function panel() {
    const log = [];
    let n = 25;
    const rows = [
      { id: 'resume', label: 'Back', pick: () => p.close() },
      { id: 'count', label: 'Count', value: () => String(n), adjust: (s) => (n = stepIn([10, 25, 50], n, s)) },
      { id: 'send', label: 'Send', pick: () => log.push('send') },
    ];
    const p = new DemoPanel(rows, () => log.push('closed'));
    p.open('gamepad');
    p.openedAt = -1e9; // past the grace
    return { p, log, count: () => n };
  }

  it('moves, changes a value with left and right, and picks with A', () => {
    const { p, log, count } = panel();
    p.update(input('menuDown'));
    p.update(input('menuRight'));
    expect(count()).toBe(50);
    p.update(input('menuLeft'));
    p.update(input('menuLeft'));
    expect(count()).toBe(10);
    p.update(input('menuDown'));
    p.update(input('menuConfirm'));
    expect(log).toEqual(['send']);
  });

  it('closes with B or Menu, and not on the press that opened it', () => {
    const { p, log } = panel();
    expect(p.update(input('pause'), true)).toBe(true);
    p.update(input('menuBack'));
    expect(p.isOpen).toBe(false);
    expect(log).toEqual(['closed']);
  });

  it('the main menu always offers Demo', () => {
    const s = new StartScreen(() => {});
    s.choicesEl = { innerHTML: '', classList: { remove() {}, add() {} }, querySelectorAll: () => [] };
    s.promptEl = { classList: { add() {}, remove() {} } };
    s.el = { classList: { add() {}, remove() {} } };
    s.showMenu({});
    expect(s.items.map((i) => i.choice)).toContain('demo');
  });

  it('keeps the demo to early weapons and a 150 cap', () => {
    for (const id of config.demo.weapons) expect(config.weapons[id]).toBeTruthy();
    expect(config.demo.weapons).not.toContain('thermal');
    expect(config.demo.test.count).toBeLessThanOrEqual(150);
    expect(config.zombies.population.max).toBeGreaterThanOrEqual(150);
  });
});
