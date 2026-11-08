// Interiors (Session 21, M10.2; DESIGN.md "Interiors (shared system)").
// One system for every space Tom goes into: the storm shelter's room now;
// the Bigfoot cave, the mothership, the Car Armory's base, the place
// beyond the stairs and the realm of stories later.
//
//  - Entering loads the interior: its space is built (load()) and placed
//    in a pocket deep under its entrance (config.interiors.depth), out of
//    reach of the outdoor world's draw distance, so none of the forest is
//    drawn while Tom's inside. Leaving unloads it.
//  - Tom is still "at" the entrance for everything that asks where he is
//    on the map (the minimap, the fog of war, the map screen, the cordon,
//    which clearing he's in): the pocket is right under it.
//  - The main map keeps simulating, in the abstract tier: every zombie not
//    in the interior with him drops to the abstract tier (EnemyManager
//    compares spaces), nothing outside can see or hear him (the senses are
//    unseen), and what he hears from outside is muffled (Sfx).
//  - The light is the interior's own: the sun and moon don't reach it, the
//    ambient light and fog are its own (Sky), no ground mist (Atmosphere);
//    the torch glares off its floor, ceiling and walls (Flashlight).
//  - The clock runs, and shows on the HUD with how long until dusk or dawn
//    (ui/InteriorHud.js): there's no sky to read in there.
//  - Leaving puts Tom back at the entrance, outside. A save made inside
//    (the dawn autosave, Save and quit) saves him outside it too.
//
// An interior is a definition given to define():
//   { id, name, entrance(): { x, z } (the pocket's spot: where it sits on the map),
//     surfaceY(): the ground at the entrance,
//     load(scene, floorY): builds its space (returns { group, dispose() }),
//     platform(floorY): the walkable floor (a room platform: Player keepInRoom),
//     spawn(floorY): { x, z, yaw, pitch } where Tom stands on arriving,
//     exit(): { x, z, yaw } outside, where leaving puts him,
//     light: { ambientDay, ambientNight, ambientColor, fogColor, fogNear, fogFar },
//     onEnter?(), onLeave?() }
//
// Events: 'interior:entered' { id }, 'interior:left' { id }.

export class Interiors {
  // cfg: the whole config (config.interiors inside).
  constructor(cfg, bus) {
    this.cfg = cfg;
    this.ic = cfg.interiors;
    this.bus = bus;
    this.defs = new Map();
    this.current = null; // { def, floorY, space }
  }

  // ctx: { scene, player, combat (inside: hides Tom from the senses), sky,
  // atmosphere, flashlight, sfx, hud (InteriorHud) }.
  init(ctx) {
    Object.assign(this, ctx);
  }

  define(def) {
    this.defs.set(def.id, def);
  }

  get inside() {
    return this.current?.def ?? null;
  }

  get id() {
    return this.current?.def.id ?? null;
  }

  // The pocket's floor for an interior: deep under its entrance.
  floorFor(def) {
    return def.surfaceY() - this.ic.depth;
  }

  // Into the interior `id` (after the caller's fade). Loads its space.
  enter(id) {
    const def = this.defs.get(id);
    if (!def) return false;
    if (this.current) this.leave(true);
    const floorY = this.floorFor(def);
    const space = def.load ? def.load(this.scene, floorY) : null;
    this.current = { def, floorY, space };
    const pl = def.platform(floorY);
    pl.space = id;
    const s = def.spawn(floorY);
    this.player.setPlatform(pl, s.x, s.z);
    this.player.space = id;
    if (s.yaw !== undefined) this.player.yaw = s.yaw;
    if (s.pitch !== undefined) this.player.pitch = s.pitch;
    this.applyInside(def);
    def.onEnter?.();
    this.bus?.emit('interior:entered', { id });
    return true;
  }

  // Back outside at the entrance. quiet: no onLeave (a teleport out, or another interior).
  leave(quiet = false) {
    const cur = this.current;
    if (!cur) return false;
    this.current = null;
    const out = cur.def.exit();
    if (this.player.platform?.space === cur.def.id) this.player.setPlatform(null, out.x, out.z);
    if (out.yaw !== undefined && !quiet) this.player.yaw = out.yaw;
    this.player.space = null;
    cur.space?.dispose?.();
    this.applyInside(null);
    if (!quiet) cur.def.onLeave?.();
    this.bus?.emit('interior:left', { id: cur.def.id });
    return true;
  }

  // Inside or out: the light, the senses, the sounds, the HUD.
  applyInside(def) {
    if (this.combat) this.combat.inside = def ? def.id : null;
    if (this.sky) this.sky.interior = def ? def.light : null;
    if (this.atmosphere) this.atmosphere.inside = Boolean(def);
    if (this.sfx) this.sfx.muffled = def ? this.ic.muffle : 1;
    this.hud?.show(def ? def.name : null);
  }

  // Each frame: the HUD's clock; and if something moved Tom out without
  // leaving (a debug teleport), tidy up as if he'd left.
  update(dt, clock) {
    const cur = this.current;
    if (!cur) return;
    if (this.player.platform?.space !== cur.def.id) {
      this.current = null;
      this.player.space = null;
      cur.space?.dispose?.();
      this.applyInside(null);
      this.bus?.emit('interior:left', { id: cur.def.id });
      return;
    }
    cur.space?.update?.(dt);
    this.hud?.update(clock);
  }

  // Where a save puts Tom: outside the entrance when he's inside, else null.
  saveSpot() {
    return this.current ? this.current.def.exit() : null;
  }

  overlayLine() {
    const cur = this.current;
    return cur ? `inside ${cur.def.id} (floor ${cur.floorY.toFixed(0)})` : 'outside';
  }
}

// The time left until dusk (by day) or dawn (dusk and night), in hours:
// { until: 'dusk' | 'dawn', hours }. clockCfg: config.clock. hour: the clock's hourOfDay.
export function timeUntilTurn(clockCfg, phase, hour) {
  const phases = clockCfg.phases;
  const per = clockCfg.hoursPerDay;
  const start = (name) => phases.find((p) => p.name === name)?.startHour ?? 0;
  const target = phase === 'day' || phase === 'dawn' ? 'dusk' : 'dawn';
  let h = start(target) - hour;
  if (h < 0) h += per;
  return { until: target, hours: h };
}
