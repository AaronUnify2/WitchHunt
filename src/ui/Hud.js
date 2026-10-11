// Placeholder HUD (DESIGN.md "HUD" layout; the final pixel-font HUD is
// Session 19): crosshair and hit marker in the centre; health (10
// segments) and the three armour bars bottom left; weapon, ammo, reload
// and first aid kits bottom right; a red edge when hurt; the death screen.
// M4: the dig prompt and its progress bar under the crosshair, and a short
// feed of what you just picked up.

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
      <div class="hud-dig"><span></span></div>
      <div class="hud-pickups"></div>
      <div class="hud-station hidden"></div>
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
        <p class="hud-death-reason"></p>
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
    this.digEl = q('.hud-dig');
    this.digBarEl = q('.hud-dig span');
    this.pickupsEl = q('.hud-pickups');
    this.stationEl = q('.hud-station');
    this.pickupLines = []; // { text, timer }
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
    this.deathTitleEl = q('.hud-death h2');
    this.deathReasonEl = q('.hud-death-reason');
    this.hitTimer = 0;
    this.hurtTimer = 0;
    this.last = {}; // only touch the DOM when a value changes
  }

  show(visible) {
    this.el.classList.toggle('hidden', !visible);
  }

  hitMarker(killed, headshot) {
    this.hitTimer = this.cfg.hitMarkerSeconds * (killed ? 1.6 : 1);
    this.last.hit = 'on'; // so update() clears it when the timer runs out
    this.hitEl.className = `hud-hitmarker on${killed ? ' kill' : ''}${headshot ? ' head' : ''}`;
  }

  hurt() {
    this.hurtTimer = this.cfg.hurtVignetteSeconds;
  }

  // A line in the pickup feed, e.g. "+4 shotgun shells".
  pickup(text) {
    this.pickupLines.push({ text, timer: this.cfg.pickupSeconds });
    while (this.pickupLines.length > this.cfg.pickupLines) this.pickupLines.shift();
    this.renderPickups();
  }

  renderPickups() {
    this.pickupsEl.innerHTML = '';
    for (const line of this.pickupLines) {
      const div = document.createElement('div');
      div.textContent = line.text;
      this.pickupsEl.appendChild(div);
    }
  }

  updatePickups(dt) {
    if (this.pickupLines.length === 0) return;
    for (const line of this.pickupLines) line.timer -= dt;
    const before = this.pickupLines.length;
    this.pickupLines = this.pickupLines.filter((l) => l.timer > 0);
    if (this.pickupLines.length !== before) this.renderPickups();
  }

  // title / reason: e.g. the station falling (M5) instead of dying.
  // M5: the station strip under the minimap (html, or null to hide it).
  station(html) {
    this.set('station', html, (h) => {
      this.stationEl.classList.toggle('hidden', !h);
      if (h) this.stationEl.innerHTML = h;
    });
  }

  showDeath(kills, title = 'YOU DIED', reason = '') {
    this.deathTitleEl.textContent = title;
    this.deathReasonEl.textContent = reason;
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

  // s: { health, armour, weapons, inventory, device, dig: { prompt, progress } }
  update(dt, s) {
    this.updatePickups(dt);
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
    const inv = s.inventory;
    this.set('kits', `${inv.firstAid}|${pad}|${inv.scrap}|${inv.batteries}`, () => {
      const battery = inv.batteries > 0 ? `   Battery ×${inv.batteries}` : '';
      this.kitsEl.textContent = `First aid ×${inv.firstAid}  (${pad ? 'D-pad →' : 'H'})   Scrap ${inv.scrap}${battery}`;
    });

    let prompt = '';
    if (st.usesAmmo && st.mag === 0 && !st.reloading) prompt = st.reserve > 0 ? `${pad ? 'B' : 'R'}: reload` : 'Out of ammo';
    if (s.dig?.prompt) prompt = s.dig.prompt;
    this.set('prompt', prompt, (text) => (this.promptEl.textContent = text));
    const dig = s.dig?.prompt ? s.dig.progress : 0;
    this.set('digging', dig > 0, (on) => this.digEl.classList.toggle('on', on));
    if (dig > 0) this.digBarEl.style.width = `${Math.round(dig * 100)}%`;
    this.set('aiming', w.aiming, (a) => this.crosshairEl.classList.toggle('aiming', a));
  }

  dispose() {
    this.el.remove();
  }
}
