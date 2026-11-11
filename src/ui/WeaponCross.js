// The weapon cross (Session 25; Aaron's play-through notes, Nov 10). Tom
// carries every gun he finds, so D-pad down (when there's no tape or feed
// waiting to watch: that comes first) brings up a cross of weapon icons and
// pauses the world, like the pause menu:
//   up: shotgun, then the auto shotgun; left: pistol, then the SMG;
//   right: service rifle, hunting rifle, then the semi-auto rifle;
//   down: flare gun, then dynamite, then the military explosives.
// Weapons not found yet show as empty slots. The d-pad or the stick moves
// along an arm (outward the way it points, back toward the middle the other
// way, onto another arm sideways); A puts that weapon in Tom's hands; B (or
// D-pad down from the middle, Menu / Esc) closes it. Keyboard: G (or V with
// nothing to watch), arrows, Enter, Esc.
// The flare gun is always to hand on Y (it isn't held), so picking it says
// so; the military explosives are the detonator (while charges are out or in
// hand); dynamite isn't in the game yet (designed: the railway cutting).
//
// ctx: { weapons (player/Weapons.js), inventory, explosives, notify(text), sfx }.
// config.weapons.cross: { up, left, right, down: [ids] }.

export const ARMS = ['up', 'left', 'right', 'down'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const STICK = 0.6; // how far the stick goes to count as a press
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Where a press of `dir` takes the focus ({ arm, i } or null: the middle).
// Pure (the tests). lengths: { [arm]: slots on it }.
// Session 25 (Aaron): the melee bar under the cross: down past the end of
// the down arm onto it, left / right along it, up back to the arm.
export function moveFocus(focus, dir, lengths) {
  const bar = lengths.melee ?? 0;
  if (focus?.arm === 'melee') {
    if (dir === 'left') return { arm: 'melee', i: Math.max(0, focus.i - 1) };
    if (dir === 'right') return { arm: 'melee', i: Math.min(bar - 1, focus.i + 1) };
    if (dir === 'up') return lengths.down > 0 ? { arm: 'down', i: lengths.down - 1 } : null;
    return focus;
  }
  if (focus?.arm === 'down' && dir === 'down' && focus.i === lengths.down - 1 && bar > 0) return { arm: 'melee', i: 0 };
  if (!focus) return lengths[dir] > 0 ? { arm: dir, i: 0 } : null;
  if (focus.arm === dir) return { arm: dir, i: Math.min(focus.i + 1, lengths[dir] - 1) };
  if (OPPOSITE[focus.arm] === dir) return focus.i > 0 ? { arm: focus.arm, i: focus.i - 1 } : null;
  return lengths[dir] > 0 ? { arm: dir, i: 0 } : focus;
}

// Each slot's state: { id, name, owned, held, count }. Pure (the tests).
export function crossSlots(cross, wcfg, has, heldId, extra = {}) {
  const out = {};
  for (const arm of [...ARMS, 'melee']) {
    out[arm] = (cross[arm] ?? []).map((id) => {
      const special = extra[id];
      const owned = special ? special.owned : has(id);
      const weapon = special?.weapon ?? id;
      return { id, weapon, name: special?.name ?? wcfg[id]?.name ?? id, owned, held: owned && weapon === heldId, note: special?.note ?? '' };
    });
  }
  return out;
}

export class WeaponCross {
  constructor(weaponsCfg) {
    this.wcfg = weaponsCfg;
    this.cross = weaponsCfg.cross;
    this.isOpen = false;
    this.focus = null;
    this.stickHeld = false;
  }

  init(root, ctx) {
    Object.assign(this, ctx);
    if (typeof document === 'undefined' || !root) return;
    this.el = document.createElement('div');
    this.el.className = 'wcross hidden';
    this.el.innerHTML = `
      <div class="wcross-panel">
        <div class="wcross-grid"></div>
        <div class="wcross-name"></div>
        <p class="wcross-hint"></p>
      </div>
    `;
    root.appendChild(this.el);
    this.gridEl = this.el.querySelector('.wcross-grid');
    this.nameEl = this.el.querySelector('.wcross-name');
    this.hintEl = this.el.querySelector('.wcross-hint');
    this.icons = {};
    this.onPointerUp = (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      e.stopPropagation();
      const b = e.target.closest('[data-arm]');
      if (b) {
        this.focus = { arm: b.dataset.arm, i: Number(b.dataset.i) };
        this.pick();
      } else if (!e.target.closest('.wcross-grid')) this.close();
    };
    this.el.addEventListener('pointerup', this.onPointerUp);
  }

  // The specials: the flare gun (always to hand on Y), dynamite (not built), the charges (the detonator).
  extras() {
    const flares = this.inventory?.flares ?? 0;
    return {
      flareGun: { owned: true, name: 'Flare gun', weapon: null, note: `${flares} flare${flares === 1 ? '' : 's'} · always to hand on Y` },
      dynamite: { owned: false, name: 'Dynamite' },
      // The melee bar (Session 25): the shovel now; the railroad spike maul and the chainsaw are designed, not built.
      spikeMaul: { owned: Boolean(this.weapons?.has('spikeMaul')), name: 'Railroad spike maul', note: 'melee' },
      chainsaw: { owned: Boolean(this.weapons?.has('chainsaw')), name: 'Chainsaw', note: 'melee' },
      charges: { owned: Boolean(this.weapons?.order.includes('detonator')), name: 'Military explosives', weapon: 'detonator', note: 'the detonator' },
    };
  }

  slots() {
    const w = this.weapons;
    return crossSlots(this.cross, this.wcfg, (id) => Boolean(w?.has(id)), w?.id, this.extras());
  }

  lengths() {
    return Object.fromEntries([...ARMS, 'melee'].map((a) => [a, (this.cross[a] ?? []).length]));
  }

  open(device = 'gamepad') {
    if (this.isOpen) return;
    this.isOpen = true;
    this.device = device;
    this.openedAt = now();
    this.stickHeld = true; // the stick must come back to the middle before it moves the focus
    // Start on the weapon in hand, if it's on the cross.
    this.focus = null;
    const s = this.slots();
    for (const arm of [...ARMS, 'melee']) s[arm].forEach((slot, i) => slot.held && (this.focus = { arm, i }));
    this.render();
    this.el?.classList.remove('hidden');
    this.sfx?.play('reload');
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.el?.classList.add('hidden');
  }

  // A: the focused weapon into Tom's hands (if he has it).
  pick() {
    const f = this.focus;
    if (!f) return false;
    const slot = this.slots()[f.arm][f.i];
    if (!slot?.owned) {
      this.sfx?.play('empty');
      return false;
    }
    this.close();
    if (!slot.weapon) {
      this.notify?.("The flare gun's always to hand: Y fires a flare");
      return true;
    }
    if (slot.weapon !== this.weapons.id) this.weapons.selectId(slot.weapon);
    this.sfx?.play('switch');
    return true;
  }

  // openedThisFrame: the press that opened it mustn't also move it.
  update(input, openedThisFrame = false) {
    if (!this.isOpen) return false;
    if (input.activeDevice && input.activeDevice !== this.device) {
      this.device = input.activeDevice;
      this.render();
    }
    if (openedThisFrame) return true;
    let dir = null;
    if (input.wasPressed('menuUp')) dir = 'up';
    else if (input.wasPressed('menuDown')) dir = 'down';
    else if (input.wasPressed('menuLeft')) dir = 'left';
    else if (input.wasPressed('menuRight')) dir = 'right';
    // The stick: one step each time it's pushed out from the middle.
    const m = input.getMove?.() ?? { x: 0, y: 0 };
    const amount = Math.hypot(m.x, m.y);
    if (amount < STICK * 0.6) this.stickHeld = false;
    else if (!dir && !this.stickHeld && amount >= STICK && input.activeDevice === 'gamepad') {
      this.stickHeld = true;
      dir = Math.abs(m.x) > Math.abs(m.y) ? (m.x > 0 ? 'right' : 'left') : m.y > 0 ? 'up' : 'down';
    }
    if (dir) {
      const next = moveFocus(this.focus, dir, this.lengths());
      if (next?.arm !== this.focus?.arm || next?.i !== this.focus?.i) this.sfx?.play('reload');
      this.focus = next;
      this.render();
    } else if (input.wasPressed('menuConfirm')) {
      input.swallowHeld?.();
      this.pick();
    } else if (input.wasPressed('menuBack') || input.wasPressed('pause') || input.wasPressed('weaponCross')) {
      input.swallowHeld?.();
      this.close();
    }
    return this.isOpen;
  }

  // ---- drawing ------------------------------------------------------------------------------

  render() {
    if (!this.gridEl) return;
    const s = this.slots();
    // A 7 x 7 grid: the middle tile, then each arm's slots outward.
    const cells = [];
    const at = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const held = this.weapons?.weapon?.name || 'Empty hands';
    cells.push(`<div class="wcross-mid" style="grid-column:4;grid-row:4">${this.iconHtml(this.weapons?.id)}</div>`);
    for (const arm of ARMS) {
      s[arm].forEach((slot, i) => {
        const [dx, dy] = at[arm];
        const col = 4 + dx * (i + 1);
        const row = 4 + dy * (i + 1);
        const cls = ['wcross-slot', slot.owned ? 'owned' : 'empty', slot.held ? 'held' : '', this.focus?.arm === arm && this.focus.i === i ? 'focus' : ''].join(' ');
        cells.push(`<button class="${cls}" data-arm="${arm}" data-i="${i}" style="grid-column:${col};grid-row:${row}" aria-label="${slot.owned ? slot.name : 'not found yet'}">${slot.owned ? this.iconHtml(slot.id) : ''}</button>`);
      });
    }
    // The melee bar along the bottom (Session 25, Aaron): every melee weapon, side by side.
    const bar = s.melee ?? [];
    if (bar.length) {
      const c0 = 4 - Math.floor(bar.length / 2);
      cells.push(`<div class="wcross-bar" style="grid-column:${c0 - 1} / ${c0 + bar.length + 1};grid-row:9"><span>MELEE</span></div>`);
      bar.forEach((slot, i) => {
        const cls = ['wcross-slot', 'melee', slot.owned ? 'owned' : 'empty', slot.held ? 'held' : '', this.focus?.arm === 'melee' && this.focus.i === i ? 'focus' : ''].join(' ');
        cells.push(`<button class="${cls}" data-arm="melee" data-i="${i}" style="grid-column:${c0 + i};grid-row:9" aria-label="${slot.owned ? slot.name : 'not found yet'}">${slot.owned ? this.iconHtml(slot.id) : ''}</button>`);
      });
    }
    this.gridEl.innerHTML = cells.join('');
    const f = this.focus ? s[this.focus.arm][this.focus.i] : null;
    this.nameEl.innerHTML = f ? (f.owned ? `${escapeHtml(f.name)}${f.note ? ` <span>${escapeHtml(f.note)}</span>` : ''}` : '<span>not found yet</span>') : `<span>In hand:</span> ${escapeHtml(held)}`;
    const pad = this.device !== 'keyboardMouse';
    this.hintEl.textContent = pad ? 'D-pad / stick: move · A: take it · B: close' : 'Arrows: move · Enter: take it · Esc: close (or click one)';
  }

  iconHtml(id) {
    if (!id || id === 'hands') return '';
    this.icons[id] ??= drawIcon(id, this.wcfg);
    return this.icons[id] ? `<img src="${this.icons[id]}" alt="">` : '';
  }

  dispose() {
    this.el?.removeEventListener('pointerup', this.onPointerUp);
    this.el?.remove();
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// ---- the icons: simple silhouettes, side on, muzzle to the right ------------------------------
// Long guns from the rack's shapes (config.station.gunRack.show's looks are
// mirrored here: length, pump, scope, mag); handguns, the flare gun, the
// shovel, dynamite and the charge drawn their own way. Returns a data URL.

const LOOKS = {
  rifle: { length: 1.0, mag: true },
  shotgun: { length: 1.05, pump: true },
  sniper: { length: 1.15, scope: true },
  thermal: { length: 1.1, scope: true, mag: true },
  autoShotgun: { length: 1.0, mag: true, drum: true },
  smg: { length: 0.55, mag: true },
  pistol: { length: 0.26 },
};

function drawIcon(id, wcfg) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  if (!g) return null;
  g.fillStyle = '#d8cfb4';
  g.strokeStyle = '#d8cfb4';
  const rect = (x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  const look = LOOKS[id];
  if (id === 'pistol' || id === 'flareGun') {
    const fat = id === 'flareGun';
    rect(34, 46, 62, fat ? 20 : 14); // slide / barrel
    if (fat) {
      g.fillStyle = '#e07a2a';
      rect(88, 42, 14, 28); // the wide orange muzzle
      g.fillStyle = '#d8cfb4';
    }
    g.beginPath(); // the grip, raked back
    g.moveTo(38, 58);
    g.lineTo(56, 58);
    g.lineTo(50, 92);
    g.lineTo(32, 92);
    g.closePath();
    g.fill();
    rect(54, 64, 12, 4); // trigger guard
  } else if (look) {
    const L = look.length;
    const x0 = 64 - 52 * Math.min(1, L) - (L < 0.8 ? 0 : 6);
    const scale = 100 / Math.max(1.0, L + 0.05);
    const X = (u) => x0 + u * scale;
    const y = 58;
    if (L < 0.8) {
      // The SMG: a stubby box, a folding stock, the magazine down.
      rect(X(0.1), y, 0.55 * scale, 12);
      rect(X(0), y + 2, 0.12 * scale, 6);
      rect(X(0.3), y + 12, 7, 20);
      rect(X(0.18), y + 12, 7, 14);
    } else {
      g.beginPath(); // the stock
      g.moveTo(X(0), y + 4);
      g.lineTo(X(0.3 * L), y);
      g.lineTo(X(0.3 * L), y + 12);
      g.lineTo(X(0), y + 20);
      g.closePath();
      g.fill();
      rect(X(0.27 * L), y + 10, 7, 14); // the grip
      rect(X(0.3 * L), y - 2, 0.24 * L * scale, 14); // the receiver
      rect(X(0.52 * L), y, 0.46 * L * scale, 5); // the barrel
      if (look.pump) rect(X(0.6 * L), y + 5, 0.16 * L * scale, 7);
      if (look.mag && !look.drum) rect(X(0.38 * L), y + 12, 8, 16);
      if (look.drum) {
        g.beginPath();
        g.arc(X(0.42 * L), y + 22, 10, 0, Math.PI * 2);
        g.fill();
      }
      if (look.scope) {
        rect(X(0.34 * L), y - 12, 0.26 * L * scale, 7);
        rect(X(0.4 * L), y - 6, 4, 5);
      }
    }
  } else if (id === 'dynamite') {
    g.fillStyle = '#b8483a';
    for (let k = 0; k < 3; k++) rect(36 + k * 20, 40, 16, 56);
    g.fillStyle = '#d8cfb4';
    rect(32, 58, 64, 6);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(64, 40);
    g.quadraticCurveTo(70, 22, 86, 24);
    g.stroke();
  } else if (id === 'charges' || id === 'detonator') {
    rect(30, 52, 50, 30); // the charge
    g.fillStyle = '#7a8a5a';
    rect(34, 56, 42, 22);
    g.fillStyle = '#d8cfb4';
    rect(86, 44, 18, 28); // the detonator
    rect(92, 34, 4, 10); // its aerial
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(80, 66);
    g.quadraticCurveTo(84, 80, 88, 72);
    g.stroke();
  } else if (id === 'shovel') {
    rect(20, 60, 64, 6); // the shaft
    rect(14, 54, 10, 18); // the D-grip
    g.beginPath(); // the blade
    g.moveTo(84, 50);
    g.lineTo(110, 54);
    g.lineTo(114, 63);
    g.lineTo(110, 72);
    g.lineTo(84, 76);
    g.closePath();
    g.fill();
  } else {
    g.font = 'bold 22px sans-serif';
    g.textAlign = 'center';
    g.fillText((wcfg[id]?.name ?? id).slice(0, 8), 64, 70);
  }
  return c.toDataURL();
}
