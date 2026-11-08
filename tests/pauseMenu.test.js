import { describe, it, expect } from 'vitest';
import { PauseMenu, pauseRows } from '../src/ui/PauseMenu.js';
import { SAVE_VERSION, validSave } from '../src/core/saveData.js';
import { config } from './mapFixture.js';

const press = (action) => ({ activeDevice: 'gamepad', wasPressed: (a) => a === action, swallowHeld() {} });

describe('the pause menu (Session 20)', () => {
  it('Resume, Save and quit, Settings greyed; saving can be refused with a reason', () => {
    expect(pauseRows(null).map((r) => [r.id, r.enabled])).toEqual([['resume', true], ['saveQuit', true], ['settings', false]]);
    const refused = pauseRows('saving starts at dawn after night 1');
    expect(refused[1].enabled).toBe(false);
    expect(refused[1].note).toContain('dawn');
  });

  it('A picks; B or Menu resumes; the press that opened it does not close it', () => {
    const got = [];
    const m = new PauseMenu({ resume: () => got.push('resume'), saveAndQuit: () => got.push('save'), canSave: () => null });
    m.open();
    expect(m.update(press('pause'), true)).toBe(true);
    expect(m.update(press('pause'))).toBe(true); // within the grace: the same Esc
    m.openedAt -= 1000;
    m.update(press('pause'));
    expect(got).toEqual(['resume']);
    m.open();
    m.openedAt -= 1000;
    m.update(press('menuDown'));
    m.update(press('menuConfirm'));
    expect(got).toEqual(['resume', 'save']);
    m.open();
    m.openedAt -= 1000;
    m.update(press('menuDown'));
    m.update(press('menuDown')); // Settings is greyed: skipped, round to Resume
    expect(m.rows[m.focus].id).toBe('resume');
    m.update(press('menuBack'));
    expect(m.isOpen).toBe(false);
  });

  it('a refused save cannot be picked', () => {
    const got = [];
    const m = new PauseMenu({ saveAndQuit: () => got.push('save'), canSave: () => 'no saving after the hut is destroyed' });
    m.open();
    m.pick('saveQuit');
    expect(got).toEqual([]);
    expect(m.isOpen).toBe(true);
  });

  it('the save format moved on (old saves are discarded); saving starts at dawn 1', () => {
    expect(SAVE_VERSION).toBe(4); // Session 21: the map moved (the spine, the road north, the railway)
    expect(validSave({ version: 3, seed: 1, clock: {}, player: {}, station: {} })).toBe(false);
    expect(config.station.safePoint.at).toHaveLength(2);
  });
});
