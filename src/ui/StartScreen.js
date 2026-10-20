// The main menu (M9.2; DESIGN.md "Main menu"): the pixel title over a live,
// slow CCTV feed of the forest at night (Game plays the menu.feed cutscene
// behind it). Tapping a choice is also the user gesture that fullscreen
// and the orientation lock need. Shown again as "Tap to resume" if the
// player leaves fullscreen, and as "Tap to begin" after the reload a new
// map needs. Also shows whether a controller has been detected.
//
// Choices: Continue (a saved run), New Run, Skip intro (once the opening
// has been seen on this device), and Modifiers and Settings, greyed out
// until their sessions (M12, Session 28). No Quit: it's a browser tab.
// Tap or click a choice; on the controller the d-pad moves and A picks;
// on the keyboard the arrows and Enter (or N for New Run).
//
// onActivate(choice): 'continue' | 'new' | 'skip' | 'resume' | 'begin'.

const TEXT = {
  resume: 'Tap to resume',
  begin: 'Tap to begin',
  noController: 'No controller yet: press any button on it to connect',
  later: 'coming later',
  hint: 'Keyboard and mouse: WASD and mouse to move, Shift sprint, C crouch, Space jump, L flashlight, left click fire, right click aim, R reload, 1-4 or wheel weapons, F flare, H first aid, M map, F3 overlay, ` debug menu',
};

const KEYS_UP = new Set(['ArrowUp', 'KeyW']);
const KEYS_DOWN = new Set(['ArrowDown', 'KeyS']);
const KEYS_GO = new Set(['Enter', 'Space']);

export class StartScreen {
  constructor(onActivate) {
    this.onActivate = onActivate;
  }

  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'start-screen hidden';
    this.el.innerHTML = `
      <h1 class="start-title">WITCH HUNT</h1>
      <p class="start-prompt"></p>
      <div class="start-choices"></div>
      <p class="start-controller"></p>
      <p class="start-hint"></p>
    `;
    this.promptEl = this.el.querySelector('.start-prompt');
    this.choicesEl = this.el.querySelector('.start-choices');
    this.controllerEl = this.el.querySelector('.start-controller');
    this.el.querySelector('.start-hint').textContent = TEXT.hint;
    this.setControllerStatus(null);
    root.appendChild(this.el);
    this.items = [];
    this.focus = 0;

    this.onPointerUp = (e) => {
      e.preventDefault();
      if (this.mode !== 'menu') {
        this.activate(this.mode);
        return;
      }
      const button = e.target.closest('.start-choice');
      if (button && !button.disabled) this.activate(button.dataset.choice);
    };
    this.onKeyDown = (e) => {
      if (!this.visible) return;
      if (this.mode !== 'menu') {
        if (KEYS_GO.has(e.code)) this.activate(this.mode);
        return;
      }
      if (KEYS_UP.has(e.code)) this.move(-1);
      else if (KEYS_DOWN.has(e.code)) this.move(1);
      else if (KEYS_GO.has(e.code)) this.activate(this.items[this.focus]?.choice);
      else if (e.code === 'KeyN') this.activate('new');
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('keydown', this.onKeyDown);
    this.visible = false;
  }

  // The controller: d-pad up and down, A to pick (Game calls this while it shows).
  update(input) {
    if (!this.visible || input.activeDevice !== 'gamepad') return;
    if (this.mode !== 'menu') {
      if (input.wasPressed('menuConfirm')) this.activate(this.mode);
      return;
    }
    if (input.wasPressed('menuUp')) this.move(-1);
    if (input.wasPressed('menuDown')) this.move(1);
    if (input.wasPressed('menuConfirm')) this.activate(this.items[this.focus]?.choice);
  }

  dispose() {
    this.el.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }

  activate(choice) {
    if (!this.visible || !choice) return;
    this.hide();
    this.onActivate(choice);
  }

  // The menu. opts: { save (the saved run's label, or ''), skipIntro (offer it) }.
  showMenu({ save = '', skipIntro = false } = {}) {
    this.mode = 'menu';
    this.promptEl.textContent = '';
    this.promptEl.classList.add('hidden');
    this.items = [];
    if (save) this.items.push({ choice: 'continue', label: `Continue`, note: save });
    this.items.push({ choice: 'new', label: 'New Run' });
    if (skipIntro) this.items.push({ choice: 'skip', label: 'Skip intro', note: 'start at dawn after night 1' });
    this.items.push({ choice: null, label: 'Modifiers', note: TEXT.later });
    this.items.push({ choice: null, label: 'Settings', note: TEXT.later });
    this.choicesEl.innerHTML = this.items
      .map((it) => `<button class="start-choice" data-choice="${it.choice ?? ''}"${it.choice ? '' : ' disabled'}>${it.label}${it.note ? `<span class="start-note">${it.note}</span>` : ''}</button>`)
      .join('');
    this.choicesEl.classList.remove('hidden');
    this.buttons = [...this.choicesEl.querySelectorAll('.start-choice')];
    this.focus = 0;
    this.paintFocus();
    this.el.classList.add('menu');
    this.el.classList.remove('hidden');
    this.visible = true;
  }

  // A single prompt: 'resume' (back to fullscreen) or 'begin' (after the reload).
  show(mode) {
    this.mode = mode;
    this.promptEl.textContent = TEXT[mode] ?? TEXT.begin;
    this.promptEl.classList.remove('hidden');
    this.choicesEl.classList.add('hidden');
    this.el.classList.remove('menu');
    this.el.classList.remove('hidden');
    this.visible = true;
  }

  // Up or down the enabled choices.
  move(step) {
    const n = this.items.length;
    for (let i = 1; i <= n; i++) {
      const k = (this.focus + step * i + n * 4) % n;
      if (this.items[k].choice) {
        this.focus = k;
        break;
      }
    }
    this.paintFocus();
  }

  paintFocus() {
    this.buttons?.forEach((b, i) => b.classList.toggle('focused', i === this.focus));
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
