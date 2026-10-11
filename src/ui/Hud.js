// Placeholder HUD (DESIGN.md "HUD" layout; the final pixel-font HUD is
// Session 19): crosshair and hit marker in the centre; health (10
// segments) and the three armour bars bottom left; weapon, ammo, reload
// and first aid kits bottom right; a red edge when hurt; the death screen.

const ARMOUR_TYPES = ['ballistic', 'energy', 'nature'];

export class Hud {
  constructor(hudConfig) {
    this.cfg = hudConfig;
  }

  init(root) {
    const segments = Array.from({ length: this.cfg.healthSegments }, () => '<span class="hud-seg"></span>').join('');
    const armour = ARMOUR_TYPES.map((t) => `<div class="hud-armour hud-armour-${t}"><span></span></div>`).join('');
    this.el = document.createElement('div');
    this.el.className = 'hud hidden';
    this.el.innerHTML = `
      <div class="hud-hurt"></div>
      <div class="hud-crosshair"></div>
      <div class="hud-hitmarker"></div>
      <div class="hud-prompt"></div>
      <div class="hud-vitals">
        <div class="hud-heal">+</div>
        <div class="hud-health">${segments}</div>
        ${armour}
      </div>
      <div class="hud-weapon">
        <div class="hud-weapon-name"></div>
        <div class="hud-ammo"></div>
        <div class="hud-reload"><span></span></div>
        <div class="hud-kits"></div>
      </div>
      <div class="hud-death hidden">
        <h2>YOU DIED</h2>
        <p class="hud-death-stats"></p>
        <p class="hud-death-prompt">A / Enter: try again</p>
      </div>
    `;
    root.appendChild(this.el);
    const q = (sel) => this.el.querySelector(sel);
    this.hurtEl = q('.hud-hurt');
    this.crosshairEl = q('.hud-crosshair');
    this.hitEl = q('.hud-hitmarker');
    this.promptEl = q('.hud-prompt');
    this.healEl = q('.hud-heal');
    this.healthEl = q('.hud-health');
    this.segEls = [...this.el.querySelectorAll('.hud-seg')];
    this.armourEls = Object.fromEntries(ARMOUR_TYPES.map((t) => [t, q(`.hud-armour-${t} span`)]));
    this.weaponNameEl = q('.hud-weapon-name');
    this.ammoEl = q('.hud-ammo');
    this.reloadEl = q('.hud-reload');
    this.reloadBarEl = q('.hud-reload span');
    this.kitsEl = q('.hud-kits');
    this.deathEl = q('.hud-death');
    this.deathStatsEl = q('.hud-death-stats');
    this.hitTimer = 0;
    this.hurtTimer = 0;
    this.last = {}; // only touch the DOM when a value changes
  }

  show(visible) {
    this.el.classList.toggle('hidden', !visible);
  }

  hitMarker(killed, headshot) {
    this.hitTimer = this.cfg.hitMarkerSeconds * (killed ? 1.6 : 1);
    this.hitEl.className = `hud-hitmarker on${killed ? ' kill' : ''}${headshot ? ' head' : ''}`;
  }

  hurt() {
    this.hurtTimer = this.cfg.hurtVignetteSeconds;
  }

  showDeath(kills) {
    this.deathStatsEl.textContent = `Zombies killed: ${kills}`;
    this.deathEl.classList.remove('hidden');
  }

  hideDeath() {
    this.deathEl.classList.add('hidden');
  }

  set(key, value, apply) {
    if (this.last[key] === value) return;
    this.last[key] = value;
    apply(value);
  }

  // s: { health, armour, weapons, inventory, device }
  update(dt, s) {
    this.hitTimer = Math.max(0, this.hitTimer - dt);
    if (this.hitTimer === 0) this.set('hit', 'off', () => (this.hitEl.className = 'hud-hitmarker'));
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    const lowPulse = s.health.value <= this.cfg.lowHealth ? 0.25 + 0.15 * Math.sin(performance.now() / 180) : 0;
    this.hurtEl.style.opacity = Math.max(this.hurtTimer / this.cfg.hurtVignetteSeconds, lowPulse).toFixed(2);

    const lit = Math.ceil((s.health.value / s.health.cfg.max) * this.segEls.length);
    this.set('health', lit, (n) => this.segEls.forEach((el, i) => el.classList.toggle('on', i < n)));
    this.set('low', s.health.value <= this.cfg.lowHealth, (low) => this.healthEl.classList.toggle('low', low));
    this.set('healing', s.health.healing, (h) => this.healEl.classList.toggle('on', h));
    for (const t of ARMOUR_TYPES) {
      this.set(`armour-${t}`, Math.round(s.armour.fraction(t) * 100), (pct) => (this.armourEls[t].style.width = `${pct}%`));
    }

    const w = s.weapons;
    const st = w.state;
    this.set('weapon', w.weapon.name, (name) => (this.weaponNameEl.textContent = name));
    this.set('ammo', st.usesAmmo ? `${st.mag} / ${st.reserve}` : '', (text) => (this.ammoEl.textContent = text));
    this.set('reloading', st.reloading, (r) => this.reloadEl.classList.toggle('on', r));
    if (st.reloading) this.reloadBarEl.style.width = `${Math.round(st.reloadProgress * 100)}%`;
    const pad = s.device === 'gamepad';
    this.set('kits', `${s.inventory.firstAid}|${pad}`, () => {
      this.kitsEl.textContent = `First aid ×${s.inventory.firstAid}  (${pad ? 'D-pad →' : 'H'})`;
    });

    let prompt = '';
    if (st.usesAmmo && st.mag === 0 && !st.reloading) prompt = st.reserve > 0 ? `${pad ? 'B' : 'R'}: reload` : 'Out of ammo';
    this.set('prompt', prompt, (text) => (this.promptEl.textContent = text));
    this.set('aiming', w.aiming, (a) => this.crosshairEl.classList.toggle('aiming', a));
  }

  dispose() {
    this.el.remove();
  }
}
