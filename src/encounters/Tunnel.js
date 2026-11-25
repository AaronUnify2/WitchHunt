// Day 3: the Laurel Gap tunnel (Nov 25; Aaron, after a play-through: "Cut the rest and the time skip. In the morning
// Tom goes to the mountain tunnel on the road out of town to see if they can still get out. The military has caved
// the tunnel in. That tells the player the outpost has been overrun and every way in and out of the region is
// sealed. A daytime fight at the tunnel, with a monster climbing out of the rubble, takes up the day. At dusk, back at
// the compound, Tom hears the Pruitt farmhouse generator running and goes to check on Marcy").
//
//  1. The call (tunnelCall): a few seconds into the dawn after Night 2, Ellen sends Tom up the road north to see if
//     the tunnel's open (it's the only road out).
//  2. The tunnel (tunnelSeen): coming within seeAt metres of the army's barrier in front of it (world/roadNorth.js):
//     the rock's fresh, brought down on purpose; Wyatt says so, Ellen works out what it means.
//     The monster out of the rubble is still to be designed with Aaron: 'tunnel:seen' is where its fight starts.
//  3. The day runs on as normal (no fade). Late in the afternoon PruittFarm.updateCall hears the Pruitts'
//     generator start up across the valley (farm.call.wyatt, then Ellen: farmCall). If Tom hasn't been to the
//     tunnel by then, the day waits there for him (PruittFarm.updateClock).
//
// Saved through its story flags (data/progress.json): tunnelCall, tunnelSeen. Off in Demo mode.
//
// Events: 'tunnel:call', 'tunnel:seen'.

export const TUNNEL_FLAGS = ['tunnelCall', 'tunnelSeen'];

export class Tunnel {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.tc = cfg.tunnel;
    this.bus = bus;
  }

  // ctx: { world, player, progress, dialogue, subtitles, cutscenes, clock, demo }.
  init(ctx) {
    Object.assign(this, ctx);
    this.reset();
  }

  reset() {
    this.callT = 0;
  }

  has(flag) {
    return Boolean(this.progress?.has(flag));
  }

  set(flag) {
    this.progress?.setFlag(flag);
  }

  // The army's barrier across the road in front of the tunnel (world/roadNorth.js), or null without the road north.
  get barrier() {
    return this.world?.map?.roadNorth?.barrier ?? null;
  }

  // Is the call waiting to be made, or Tom on his way (for the objective)?
  get pending() {
    return this.has('tunnelCall') && !this.has('tunnelSeen');
  }

  update(dt, playing) {
    if (!playing || this.demo?.active) return;
    if (!this.has('night2Done')) return;
    if (!this.has('tunnelCall')) {
      this.updateCall(dt);
      return;
    }
    if (!this.has('tunnelSeen')) this.updateSee();
  }

  // 1: a few seconds into the dawn after Night 2, once nothing else is being said.
  updateCall(dt) {
    const c = this.clock;
    if (c && c.phase !== 'dawn' && c.phase !== 'day') return;
    this.callT += dt;
    if (this.callT < this.tc.call.after || this.cutscenes?.active || this.subtitles?.busy || this.dialogue?.pending?.length) return;
    this.set('tunnelCall');
    this.dialogue?.play('tunnel.call.ellen');
    this.bus.emit('tunnel:call');
  }

  // 2: the barrier in sight.
  updateSee() {
    const b = this.barrier;
    const p = this.player?.position;
    if (!b || !p) return;
    if (Math.hypot(p.x - b.x, p.z - b.z) > this.tc.seeAt) return;
    this.set('tunnelSeen');
    this.dialogue?.play('tunnel.seen.wyatt');
    this.bus.emit('tunnel:seen', { x: b.x, z: b.z });
  }

  debugLine() {
    return `tunnel ${this.has('tunnelSeen') ? 'seen' : this.has('tunnelCall') ? 'called' : 'idle'}`;
  }
}
