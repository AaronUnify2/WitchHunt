// The experimental vehicles' HUD (the ute and the alien quad): drawn over
// the game's own while Tom's in one; the game's crosshair hides
// (body.in-vehicle). One element, three looks:
//  - 'ute-cab': nearly nothing (the dash's gauges are the HUD): the gear
//    and the handbrake as a small plate, the controls' hint.
//  - 'ute-gun': the gun's ring sight, its heat as an arc round it (amber,
//    then red; flashing OVERHEATED while it's locked), the spread as the
//    ring's size.
//  - 'alien': a neon reticle (a charge ring fills round it while LT's
//    held; it dims when he looks out of the emitters' arc), the speed, the
//    plasma's cells and the boost's meter; speed lines while it burns.
// Each vehicle calls show(owner, mode, data) every frame it's ridden and
// hide(owner) when it isn't (only the owner showing can hide it).

export class VehicleHud {
  init(root) {
    this.el = document.createElement('div');
    this.el.className = 'vhud hidden';
    this.el.innerHTML = `
      <div class="vhud-lines"></div>
      <div class="vhud-sight">
        <svg viewBox="-50 -50 100 100" class="vhud-heat"><circle r="40" class="vhud-heat-bg"/><circle r="40" class="vhud-heat-arc"/></svg>
        <div class="vhud-ring"></div>
        <div class="vhud-dot"></div>
        <div class="vhud-locked">OVERHEATED</div>
      </div>
      <div class="vhud-reticle">
        <svg viewBox="-50 -50 100 100"><circle r="20" class="vhud-charge-bg"/><circle r="20" class="vhud-charge"/><path d="M -30 0 L -18 0 M 18 0 L 30 0 M 0 -30 L 0 -18 M 0 18 L 0 30" class="vhud-ticks"/><circle r="2" class="vhud-centre"/></svg>
      </div>
      <div class="vhud-panel">
        <div class="vhud-speed"><span class="vhud-speed-n">0</span><span class="vhud-speed-u">km/h</span></div>
        <div class="vhud-cells"></div>
        <div class="vhud-boost"><span></span><em>BOOST</em></div>
      </div>
      <div class="vhud-plate"></div>
      <div class="vhud-hint"></div>
    `;
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.heatArc = q('.vhud-heat-arc');
    this.ring = q('.vhud-ring');
    this.lockedEl = q('.vhud-locked');
    this.charge = q('.vhud-charge');
    this.speedEl = q('.vhud-speed-n');
    this.cellsEl = q('.vhud-cells');
    this.boostEl = q('.vhud-boost span');
    this.boostBox = q('.vhud-boost');
    this.plateEl = q('.vhud-plate');
    this.hintEl = q('.vhud-hint');
    this.linesEl = q('.vhud-lines');
    this.reticle = q('.vhud-reticle');
    this.owner = null;
    this.mode = '';
    this.cache = {};
    this.cellCount = 0;
  }

  // Set only what changed (a DOM write a frame per value is wasteful).
  set(key, value, apply) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    apply(value);
  }

  show(owner, mode, d) {
    this.owner = owner;
    if (this.mode !== mode) {
      this.mode = mode;
      this.el.className = `vhud vhud-${mode}`;
      document.body.classList.add('in-vehicle');
      this.cache = {};
    }
    this.set('hint', d.hint ?? '', (t) => (this.hintEl.textContent = t));
    if (mode === 'ute-gun') this.showGun(d);
    else if (mode === 'alien') this.showAlien(d);
    else this.showCab(d);
  }

  showCab(d) {
    const gear = d.gear < 0 ? 'R' : String(d.gear + 1);
    this.set('plate', `${gear}${d.handbrake ? ' · HANDBRAKE' : ''}`, (t) => (this.plateEl.textContent = t));
  }

  showGun(d) {
    const C = 2 * Math.PI * 40;
    const heat = Math.round(d.heat * 100) / 100;
    this.set('heat', heat, (h) => {
      this.heatArc.style.strokeDasharray = `${C * h} ${C}`;
      this.heatArc.classList.toggle('warm', h > 0.55);
      this.heatArc.classList.toggle('hot', h > 0.8);
    });
    this.set('locked', d.locked, (l) => this.el.classList.toggle('locked', l));
    const size = Math.round(14 + d.spread * 9 * (d.aiming ? 0.6 : 1));
    this.set('ring', size, (s) => {
      this.ring.style.width = `${s * 2}px`;
      this.ring.style.height = `${s * 2}px`;
      this.ring.style.margin = `${-s}px 0 0 ${-s}px`;
    });
  }

  showAlien(d) {
    this.set('speed', Math.round(d.speed), (s) => (this.speedEl.textContent = String(s)));
    const max = d.cellsMax;
    if (this.cellCount !== max) {
      this.cellCount = max;
      this.cellsEl.innerHTML = Array.from({ length: max }, () => '<i></i>').join('');
      this.cellEls = [...this.cellsEl.children];
    }
    const lit = Math.floor(d.cells + 1e-6);
    const part = Math.round((d.cells - lit) * 10) / 10;
    this.set('cells', `${lit}:${part}`, () => {
      this.cellEls.forEach((c, i) => {
        c.className = i < lit ? 'on' : i === lit ? 'part' : '';
        c.style.setProperty('--fill', i === lit ? String(part) : i < lit ? '1' : '0');
      });
    });
    const boost = Math.round(d.boost * 100) / 100;
    this.set('boost', boost, (b) => (this.boostEl.style.width = `${b * 100}%`));
    this.set('burn', d.boosting > 0.05, (on) => this.boostBox.classList.toggle('burning', on));
    this.set('ready', d.boost >= 1, (on) => this.boostBox.classList.toggle('ready', on));
    const lines = Math.round(d.boosting * 20) / 20;
    this.set('lines', lines, (l) => (this.linesEl.style.opacity = String(l)));
    const C = 2 * Math.PI * 20;
    const charge = Math.round(d.charge * 50) / 50;
    this.set('charge', charge, (c) => (this.charge.style.strokeDasharray = `${C * c} ${C}`));
    this.set('orb', d.canOrb, (on) => this.reticle.classList.toggle('no-orb', !on));
    this.set('arc', d.inArc, (on) => this.reticle.classList.toggle('out', !on));
  }

  hide(owner) {
    if (this.owner !== owner || !this.mode) return;
    this.owner = null;
    this.mode = '';
    this.el.className = 'vhud hidden';
    document.body.classList.remove('in-vehicle');
  }

  dispose() {
    this.el.remove();
    document.body.classList.remove('in-vehicle');
  }
}
