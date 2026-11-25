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
//  3. The Pile (ai/Pile.js; Aaron, Nov 25): the bodies of the people the army buried with the tunnel, one swirling
//     mass held together by her magic, heaves up out of the rubble. Its end: tunnelCleared. Left mid-fight (a
//     load, a death), it comes up again whole the next time he's there.
//  4. The day runs on as normal (no fade). Late in the afternoon PruittFarm.updateCall hears the Pruitts'
//     generator start up across the valley (farm.call.wyatt, then Ellen: farmCall). If the tunnel isn't done by
//     then, the day waits there for him (PruittFarm.updateClock).
//
// Saved through its story flags (data/progress.json): tunnelCall, tunnelSeen, tunnelCleared. Off in Demo mode.
//
// Events: 'tunnel:call', 'tunnel:seen'.

import { DEBUG } from '../debug/DebugMenu.js';

export const TUNNEL_FLAGS = ['tunnelCall', 'tunnelSeen', 'tunnelCleared'];

export class Tunnel {
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.tc = cfg.tunnel;
    this.bus = bus;
  }

  // ctx: { world, player, progress, dialogue, subtitles, cutscenes, clock, demo, pile (ai/Pile.js) }.
  init(ctx) {
    Object.assign(this, ctx);
    this.unsub = [
      this.bus?.on?.('pile:dead', () => this.set('tunnelCleared')),
      this.bus?.on?.('player:respawned', () => this.pile?.stop?.()), // a retry: it comes up whole again
    ].filter(Boolean);
    this.reset();
  }

  reset() {
    this.callT = 0;
    this.pile?.stop?.();
  }

  // Is the fight on (for the objective)?
  get fighting() {
    return Boolean(this.pile?.alive);
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
    else if (!this.has('tunnelCleared')) this.updatePile();
  }

  // The Pile: up out of the rubble in front of the barrier as he comes near (again, after a load or a death).
  updatePile() {
    const pile = this.pile;
    if (!pile || pile.alive) return;
    const b = this.barrier;
    const p = this.player?.position;
    if (!b || !p || Math.hypot(p.x - b.x, p.z - b.z) > this.tc.seeAt) return;
    this.wake(b);
  }

  wake(b) {
    // South of the barrier (the map's z runs south), facing down the road at him.
    this.pile?.start?.(b.x, b.z + this.tc.pileOut, 0);
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
    this.wake(b);
  }

  dispose() {
    for (const off of this.unsub ?? []) off?.();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    // Nov 25: straight to the Pile: Day 3's flags, Tom on the road 26 m short of the barrier, facing it.
    cat.addItem('Day 3: the Pile at the tunnel (fight it now)', () => {
      for (const f of ['shelterCall', 'earlCombination', 'rifleClaimed', 'wyattRifle', 'wyattArmed', 'night2Done', 'tunnelCall']) this.set(f);
      const b = this.barrier;
      if (!b) return;
      this.player.teleport(b.x, b.z + 26, 0);
    });
  }

  debugLine() {
    return `tunnel ${this.has('tunnelCleared') ? 'cleared' : this.has('tunnelSeen') ? 'seen' : this.has('tunnelCall') ? 'called' : 'idle'} ${this.pile?.debugLine?.() ?? ''}`;
  }
}
