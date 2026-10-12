// The point of no return (Session 9, Aaron's answer to OPEN_QUESTIONS #130).
// When both charges are on the hut ('hut:armed'):
//  1. A radio call from the family: is Tom sure he's ready? Once the hut
//     goes she has nowhere to run.
//  2. A moment later, a pop-up that pauses the game: setting the charges
//     off starts the final battle and deletes the save, so there's no
//     reloading from dawn. A / Enter closes it.
// Game deletes the save when the hut is destroyed. The lines are
// placeholders in src/data/ending.json ("noReturn"); the look is Session 19's.

import endingData from '../data/ending.json';

export class NoReturnNotice {
  // endingConfig: config.ending. notify(text, seconds): the toast. sfx: Sfx.
  constructor(endingConfig, bus, sfx, notify) {
    this.cfg = endingConfig;
    this.bus = bus;
    this.sfx = sfx;
    this.notify = notify;
    this.data = endingData.noReturn;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'no-return hidden';
    this.el.innerHTML = `
      <div class="no-return-panel">
        <h2 class="no-return-title"></h2>
        <p class="no-return-text"></p>
        <p class="no-return-prompt">A / Enter: got it</p>
      </div>
    `;
    root.appendChild(this.el);
    this.el.querySelector('.no-return-title').textContent = this.data.title;
    this.el.querySelector('.no-return-text').textContent = this.data.text;
    this.isOpen = false;
    this.pending = -1; // seconds until the pop-up, or -1
    this.unsubscribers = [
      this.bus.on('hut:armed', () => this.armed()),
      // Set off before the pop-up came up: it's too late to warn.
      this.bus.on('hut:destroyed', () => {
        this.pending = -1;
        this.close();
      }),
    ];
  }

  armed() {
    const r = this.data.radio;
    this.sfx.play('radioAlarm');
    this.notify(`Radio (${r.speaker}): "${r.text}"`, this.cfg.noReturnRadioSeconds);
    this.pending = this.cfg.noReturnDelay;
  }

  open() {
    this.isOpen = true;
    this.el.classList.remove('hidden');
  }

  close() {
    this.isOpen = false;
    this.el.classList.add('hidden');
  }

  // Before the world's step. input: the raw controls. playing: the world
  // is running (the delay waits while the map or debug menu is open).
  // Returns true while the pop-up holds the game.
  update(dt, input, playing) {
    if (this.isOpen) {
      if (input.wasPressed('menuConfirm')) this.close();
      return true;
    }
    if (this.pending >= 0 && playing) {
      this.pending -= dt;
      if (this.pending < 0) this.open();
    }
    return this.isOpen;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.el.remove();
  }
}
