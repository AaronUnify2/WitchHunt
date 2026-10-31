// Session 15b (Aaron): the A press that skips a cutscene must not also jump.
import { describe, it, expect } from 'vitest';
import { Input } from '../src/core/Input.js';

// Input without the devices: just its action sets.
function bare() {
  const input = Object.create(Input.prototype);
  input.down = new Set();
  input.prevDown = new Set();
  input.swallowed = new Set();
  return input;
}

// One frame with these actions held (what update() does to the sets).
function frame(input, held) {
  input.prevDown = input.down;
  input.down = new Set(held);
  input.applySwallowed();
}

describe('swallowing a press (Input.swallowHeld)', () => {
  it('hides what is held now, this frame and until it is let go', () => {
    const input = bare();
    frame(input, ['menuConfirm', 'jump']);
    expect(input.wasPressed('jump')).toBe(true);
    input.swallowHeld();
    expect(input.wasPressed('jump')).toBe(false);
    expect(input.wasPressed('menuConfirm')).toBe(false);
    frame(input, ['menuConfirm', 'jump']); // still held
    expect(input.isDown('jump')).toBe(false);
    frame(input, []); // let go
    expect(input.wasReleased('jump')).toBe(false);
    frame(input, ['jump']); // pressed again: it counts
    expect(input.wasPressed('jump')).toBe(true);
  });

  it('leaves other actions alone', () => {
    const input = bare();
    frame(input, ['menuConfirm']);
    input.swallowHeld();
    frame(input, ['menuConfirm', 'attack']);
    expect(input.wasPressed('attack')).toBe(true);
    expect(input.isDown('menuConfirm')).toBe(false);
  });
});
