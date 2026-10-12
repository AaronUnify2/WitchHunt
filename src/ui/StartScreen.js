// "Tap to start" screen. The tap is the user gesture that fullscreen and
// orientation lock need. Shown again as "Tap to resume" if the player
// leaves fullscreen. Also shows whether a controller has been detected.
// M6: with a saved run, "Continue" or "New run" (a placeholder until the
// main menu, M9). onActivate(choice): 'start' | 'resume' | 'continue' | 'new'.

const TEXT = {
  start: 'Tap to start',
  resume: 'Tap to resume',
  noController: 'No controller yet: press any button on it to connect',
  hint: 'Keyboard and mouse: click to start, WASD and mouse to move, Shift sprint, C crouch, Space jump, L flashlight, left click fire, right click aim, R reload, 1-3 or wheel weapons, H first aid, F3 overlay, ` debug menu',
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
      <div class="start-choices hidden">
        <button class="start-continue"></button>
        <button class="start-new">New run</button>
      </div>
      <p class="start-controller"></p>
      <p class="start-hint"></p>
    `;
    this.promptEl = this.el.querySelector('.start-prompt');
    this.choicesEl = this.el.querySelector('.start-choices');
    this.continueEl = this.el.querySelector('.start-continue');
    this.controllerEl = this.el.querySelector('.start-controller');
    this.el.querySelector('.start-hint').textContent = TEXT.hint;
    this.setControllerStatus(null);
    root.appendChild(this.el);

    this.onPointerUp = (e) => {
      e.preventDefault();
      if (this.mode !== 'continue') this.activate(this.mode);
      else if (e.target.closest('.start-new')) this.activate('new');
      else if (e.target.closest('.start-continue')) this.activate('continue');
    };
    this.onKeyDown = (e) => {
      if (START_KEYS.has(e.code)) this.activate(this.mode === 'continue' ? 'continue' : this.mode);
      else if (this.mode === 'continue' && e.code === 'KeyN') this.activate('new');
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

  activate(choice) {
    if (!this.visible) return;
    this.hide();
    this.onActivate(choice);
  }

  // mode: 'start', 'resume', or 'continue' (label: what the save is, e.g. "Day 3, dawn").
  show(mode, label = '') {
    this.mode = mode;
    const choosing = mode === 'continue';
    this.promptEl.textContent = choosing ? 'A run is saved' : TEXT[mode] ?? TEXT.start;
    this.choicesEl.classList.toggle('hidden', !choosing);
    if (choosing) this.continueEl.textContent = `Continue: ${label}`;
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
