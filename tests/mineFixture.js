// Session 30: the mine's ride with stand-ins for the game round it (tests/mineRide.test.js,
// tests/mineFight.test.js): a real MineRide, its track, model and cart; a player, an interior system, a
// bus, flags and an input that only record.
import * as THREE from 'three';
import { config } from './mapFixture.js';
import { MineRide } from '../src/encounters/MineRide.js';

export function make({ flags = [], fight = null, enemies = null } = {}) {
  const set = new Set(flags);
  const said = [];
  const sounds = [];
  const events = [];
  const handlers = {};
  const bus = { on: (n, f) => (handlers[n] ??= []).push(f), emit: (n, p) => { events.push(n); for (const f of handlers[n] ?? []) f(p ?? {}); } };
  const player = {
    position: new THREE.Vector3(0, 0, 0),
    velocity: { x: 0, z: 0 },
    camera: new THREE.PerspectiveCamera(),
    yaw: 0,
    pitch: 0,
    platform: null,
    riding: null,
    shake() {},
    setPlatform(pl, x, z) { this.platform = pl; this.position.set(x, pl ? pl.y : 0, z); },
  };
  const interiors = {
    defs: new Map(),
    id: null,
    define(d) { this.defs.set(d.id, d); },
    enter(id) {
      const d = this.defs.get(id);
      this.space = d.load({ add() {} }, -1200);
      const pl = d.platform(-1200);
      const s = d.spawn();
      player.setPlatform(pl, s.x, s.z);
      player.yaw = s.yaw;
      this.id = id;
      d.onEnter?.();
    },
    leave() {
      const d = this.defs.get(this.id);
      this.id = null;
      const out = d.exit();
      player.setPlatform(null, out.x, out.z);
      this.space.dispose();
      d.onLeave?.();
    },
  };
  const site = { ready: true, place: { x: 500, z: 300, yaw: 0, radius: 22 }, spots: { gate: { x: 500, y: 0, z: 304 } } };
  const spaces = new Map();
  const spaceRays = new Map();
  const ride = new MineRide(config, bus);
  const hud = { prompt: '', progress: 0 };
  ride.init({
    site,
    interiors,
    world: { ground: { heightAt: () => 0 } },
    player,
    combat: { sfx: { play: (n) => sounds.push(n), muffled: 0.3 }, hud: { pickup() {} }, weapons: { spaceRays, targets: () => [] }, enemies: { living: [] }, fx: {} },
    enemies: enemies ? Object.assign(enemies, { spaces }) : { spaces },
    fight,
    progress: { has: (f) => set.has(f), setFlag: (f, on = true) => (on ? set.add(f) : set.delete(f)) },
    flashlight: { setOn(on) { this.on = on; } },
    hud,
    notify: (t) => said.push(t),
    rng: () => 0.5,
  });
  const input = { activeDevice: 'gamepad', down: new Set(), isDown(a) { return this.down.has(a); }, getLook: () => ({ x: 0, y: 0 }) };
  const tick = (seconds, dt = 0.05) => {
    for (let t = 0; t < seconds; t += dt) {
      if (player.riding) player.riding.drive(dt, input, player);
      ride.update(dt, input, true, true);
    }
  };
  const hold = (seconds) => { input.down.add('interact'); tick(seconds); input.down.delete('interact'); tick(0.1); };
  const stand = (p) => player.position.set(p.x, player.position.y, p.z);
  return { ride, bus, set, said, sounds, events, player, interiors, spaces, spaceRays, hud, input, tick, hold, stand };
}

