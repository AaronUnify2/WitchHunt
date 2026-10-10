// "Tap to start" screen. The tap is the user gesture that fullscreen and
// orientation lock need. Shown again as "Tap to resume" if the player
// leaves fullscreen. Also shows whether a controller has been detected.

const TEXT = {
  start: 'Tap to start',
  resume: 'Tap to resume',
  noController: 'No controller yet: press any button on it to connect',
  hint: 'Keyboard and mouse: click to start, WASD and mouse to move, F3 overlay, ` debug menu',
};

const START_KEYS = new Set(['Enter', 'Space']);

export class StartScreen {
  constructor(onActivate) {
    this.onActivate = onActivate;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'start-screen';
    this.el.innerHTML = `
      <h1 class="start-title">WITCH HUNT</h1>
      <p class="start-prompt"></p>
      <p class="start-controller"></p>
      <p class="start-hint"></p>
    `;
    this.promptEl = this.el.querySelector('.start-prompt');
    this.controllerEl = this.el.querySelector('.start-controller');
    this.el.querySelector('.start-hint').textContent = TEXT.hint;
    this.setControllerStatus(null);
    root.appendChild(this.el);

    this.onPointerUp = (e) => {
      e.preventDefault();
      this.activate();
    };
    this.onKeyDown = (e) => {
      if (START_KEYS.has(e.code)) this.activate();
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    this.visible = false;
  }

  update() {}

  dispose() {
    this.el.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }

  activate() {
    if (!this.visible) return;
    this.hide();
    this.onActivate();
  }

  show(mode) {
    this.promptEl.textContent = TEXT[mode] ?? TEXT.start;
    this.el.classList.remove('hidden');
    this.visible = true;
  }

  hide() {
    this.el.classList.add('hidden');
    this.visible = false;
  }

  // name = controller name, or null when none is connected.
  setControllerStatus(name) {
    this.controllerEl.textContent = name ? `Controller: ${name}` : TEXT.noController;
    this.controllerEl.classList.toggle('connected', Boolean(name));
  }
}
