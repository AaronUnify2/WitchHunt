// Debug overlay: fps, frame time (simulation vs render), draw calls,
// seed, clock and live input readout. Toggled with F3 or by holding
// View + Menu on the controller. Later milestones add lines with addStat().

import { GAMEPAD_BUTTON_NAMES, GAMEPAD_AXES, shortPadName } from '../core/GamepadInput.js';

const MS_PER_SECOND = 1000;

export class DebugOverlay {
  constructor(debugConfig, game) {
    this.cfg = debugConfig;
    this.game = game;
  }

  init(root) {
    this.el = document.createElement('pre');
    this.el.className = 'debug-overlay';
    root.appendChild(this.el);
    this.extraStats = new Map();
    this.sample = { time: 0, frames: 0, sim: 0, render: 0 };
    this.averages = { fps: 0, frameMs: 0, simMs: 0, renderMs: 0 };
    this.refreshTimer = 0;
    this.setVisible(this.cfg.overlayVisibleOnStart);
  }

  dispose() {
    this.el.remove();
  }

  // Add a line for later milestones (e.g. active enemy count).
  addStat(label, getter) {
    this.extraStats.set(label, getter);
    return () => this.extraStats.delete(label);
  }

  setVisible(visible) {
    this.visible = visible;
    this.el.classList.toggle('hidden', !visible);
  }

  toggle() {
    this.setVisible(!this.visible);
  }

  // Called once per frame by the Game loop.
  recordFrame(dt, simMs, renderMs) {
    const s = this.sample;
    s.time += dt;
    s.frames += 1;
    s.sim += simMs;
    s.render += renderMs;
    if (s.time < this.cfg.fpsSampleSeconds) return;
    this.averages = {
      fps: s.frames / s.time,
      frameMs: (s.time / s.frames) * MS_PER_SECOND,
      simMs: s.sim / s.frames,
      renderMs: s.render / s.frames,
    };
    this.sample = { time: 0, frames: 0, sim: 0, render: 0 };
  }

  update(dt) {
    if (!this.visible) return;
    this.refreshTimer -= dt;
    if (this.refreshTimer > 0) return;
    this.refreshTimer = this.cfg.overlayRefreshSeconds;
    this.el.textContent = this.buildText();
  }

  buildText() {
    const { game } = this;
    const ms = (v) => v.toFixed(this.cfg.msDecimals);
    const a = this.averages;
    const r = game.renderer.stats;
    const clock = game.clock;
    const lines = [
      `fps      ${a.fps.toFixed(1)}`,
      `frame    ${ms(a.frameMs)} ms  (sim ${ms(a.simMs)} / render ${ms(a.renderMs)} cpu)`,
      `draws    ${r.drawCalls}   tris ${r.triangles}`,
      `buffer   ${r.bufferWidth}x${r.bufferHeight}  (scale ${r.renderScale.toFixed(2)})`,
      `seed     ${game.seed}`,
      `clock    Day ${clock.day}  ${clock.phase}  ${clock.formatTime()}  (${Math.ceil(clock.phaseRemaining)}s left)`,
      `state    ${game.state}${game.display.isFullscreen ? '  fullscreen' : ''}`,
      ...this.inputLines(),
    ];
    for (const [label, getter] of this.extraStats) {
      lines.push(`${label.padEnd(8)} ${getter()}`);
    }
    return lines.join('\n');
  }

  inputLines() {
    const input = this.game.input;
    const fixed = (v) => (v >= 0 ? '+' : '') + v.toFixed(this.cfg.axisDecimals);
    const pad = input.gamepadInfo;
    const raw = input.rawPad;
    const move = input.getMove();
    const lines = [
      `device   ${input.activeDevice.toUpperCase()}`,
      `pad      ${pad ? `${shortPadName(pad.id)}  [${pad.mapping}]` : 'none (press a button on it)'}`,
      `actions  ${input.activeActions.join(' ') || '-'}`,
      `move     ${fixed(move.x)} ${fixed(move.y)}`,
    ];
    if (raw) {
      const ax = (i) => fixed(raw.axes[i] ?? 0);
      const buttons = raw.pressed
        .map((down, i) => (down ? `${GAMEPAD_BUTTON_NAMES[i] ?? `#${i}`}(${raw.values[i].toFixed(this.cfg.axisDecimals)})` : null))
        .filter(Boolean);
      lines.push(
        `sticks   L ${ax(GAMEPAD_AXES.LX)} ${ax(GAMEPAD_AXES.LY)}   R ${ax(GAMEPAD_AXES.RX)} ${ax(GAMEPAD_AXES.RY)}`,
        `buttons  ${buttons.join(' ') || '-'}`,
      );
    }
    return lines;
  }
}
