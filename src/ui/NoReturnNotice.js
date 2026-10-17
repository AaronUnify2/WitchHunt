// The point of no return (Session 9, Aaron's answer to OPEN_QUESTIONS #130).
// When both charges are on the hut ('hut:armed'):
//  1. A radio call from the family: is Tom sure he's ready? Once the hut
//     goes she has nowhere to run.
//  2. A moment later, a pop-up that pauses the game: setting the charges
//     off starts the final battle and deletes the save, so there's no
//     reloading from dawn. A / Enter closes it.
// Game deletes the save when the hut is destroyed. The radio call is a
// line in src/data/dialogue.json ("noReturn.radio", played on 'hut:armed'
// by the dialogue system, M8); the pop-up's text is in
// src/data/ending.json ("noReturn"). The look is Session 28's.

import endingData from '../data/ending.json';

export class NoReturnNotice {
  // endingConfig: config.ending.
  constructor(endingConfig, bus) {
    this.cfg = endingConfig;
    this.bus = bus;
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
