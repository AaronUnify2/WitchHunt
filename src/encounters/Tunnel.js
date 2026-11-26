// Day 3: the Laurel Gap tunnel (Nov 25; Aaron, after a play-through: "Cut the rest and the time skip. In the morning
// Tom goes to the mountain tunnel on the road out of town to see if they can still get out. The military has caved
// the tunnel in. That tells the player the outpost has been overrun and every way in and out of the region is
// sealed. A daytime fight at the tunnel, with a monster climbing out of the rubble, takes up the day. At dusk, back at
// the compound, Tom hears the Pruitt farmhouse generator running and goes to check on Marcy").
//
//  1. The call (tunnelCall): a few seconds into the dawn after Night 2, Ellen sends Tom up the road north to see if
//     the tunnel's open (it's the only road out).
//  2. The tunnel (tunnelSeen): talkAt metres out on the road (Nov 26), Wyatt says the rock's fresh, brought down on
//     purpose, and Ellen works out what it means; within seeAt metres of the army's barrier in front of it
//     (world/roadNorth.js), the Pile's cutscene (cutting them off if they're still talking).
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

export const TUNNEL_FLAGS = ['tunnelCall', 'tunnelSeen', 'pileSeen', 'tunnelCleared'];

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
    this.talkPlayed = false;
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
    if (!this.has('tunnelSeen')) {
      this.updateTalk();
      this.updateSee();
    }
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
    // South of the barrier, facing down the road at him (after its cutscene's been seen: a retry, a load).
    const at = this.pileSpot(b);
    this.pile?.start?.(at.x, at.z, 0);
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

  // Has Wyatt said his piece about the tunnel (this run, or heard in a save)?
  get talked() {
    return Boolean(this.talkPlayed || this.dialogue?.heard?.has?.('tunnel.seen.wyatt'));
  }

  // 2a: on the way up (Nov 26, Aaron: it ran over the Pile's cutscene): talkAt metres out, Wyatt on the fresh rock and
  // Ellen on what it means, done before he's there.
  updateTalk() {
    const b = this.barrier;
    const p = this.player?.position;
    if (!b || !p || this.talked) return;
    if (Math.hypot(p.x - b.x, p.z - b.z) > (this.tc.talkAt ?? this.tc.seeAt)) return;
    this.talkPlayed = true;
    this.dialogue?.play('tunnel.seen.wyatt');
  }

  // 2: the barrier in sight.
  updateSee() {
    const b = this.barrier;
    const p = this.player?.position;
    if (!b || !p) return;
    if (Math.hypot(p.x - b.x, p.z - b.z) > this.tc.seeAt) return;
    this.set('tunnelSeen');
    this.bus.emit('tunnel:seen', { x: b.x, z: b.z });
    // Nov 25 (Aaron): the first time, its cutscene (pile.emerge): the tunnel, the tendrils, the heave, an eye.
    const at = this.pileSpot(b);
    if (this.pile && !this.has('pileSeen') && this.cutscenes && !this.cutscenes.active) {
      // Nov 26 (Aaron: "if the cutscene has begun the dialogue is stopped"): Wyatt and Ellen cut off if they're
      // still talking (on the quad, say), so nothing runs over it.
      this.subtitles?.clear?.();
      this.pile.start(at.x, at.z, 0, { intro: true });
      if (this.cutscenes.play?.('pile.emerge', { anchors: { pile: { x: at.x, z: at.z, yaw: 0 } }, onDone: () => this.pile.beginFight() })) {
        this.set('pileSeen');
        return;
      }
      this.pile.stop();
    }
    if (!this.talked) {
      this.talkPlayed = true;
      this.dialogue?.play('tunnel.seen.wyatt');
    }
    this.wake(b);
  }

  // Where it comes up: south of the barrier (the map's z runs south), on the road.
  pileSpot(b) {
    return { x: b.x, z: b.z + this.tc.pileOut };
  }

  dispose() {
    for (const off of this.unsub ?? []) off?.();
  }

  // ---- debug ----------------------------------------------------------------------------------

  addDebugItems(menu) {
    const cat = menu.category(DEBUG.story);
    // Nov 25: straight to the Pile, on the run there is (Start from: 'Day 3: the Pile' starts a fresh one).
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
