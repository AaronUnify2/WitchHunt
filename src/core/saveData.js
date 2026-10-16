// The run's save (pure; DESIGN.md "Run length and saving"; M6): what each
// system keeps, as plain JSON, and putting it back. Game collects and
// applies it; SaveStore keeps it in the browser's localStorage.
//
// One slot per run. Autosaved at each dawn; deleted when the run ends
// (death or the station falling). Stored: the seed, the clock and night,
// the player (where they stand, health, armour, kit, weapons and ammo),
// the revealed map, the station (every defence, charge, the turret),
// the sigils, the vehicles' looted flags and which encounters have been
// visited (revisits). Zombies are not saved: dawn sinks most of them, and
// placement (the map, vehicles) rebuilds from the seed.
// M7+ adds the witch, M8+ dialogue heard, documents, prizes and the rest.

export const SAVE_VERSION = 1;

// ---- bytes <-> text (the fog of war is a byte per cell, 0 or 1) -------------

// Pack 0/1 bytes into bits, as base64.
export function packBits(bytes) {
  const out = new Uint8Array(Math.ceil(bytes.length / 8));
  for (let i = 0; i < bytes.length; i++) if (bytes[i]) out[i >> 3] |= 1 << (i & 7);
  let text = '';
  for (let i = 0; i < out.length; i++) text += String.fromCharCode(out[i]);
  return btoa(text);
}

export function unpackBits(text, length) {
  const raw = atob(text);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = (raw.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return bytes;
}

// ---- each system ---------------------------------------------------------------

export function saveClock(clock) {
  return { day: clock.day, phaseIndex: clock.phaseIndex, phaseElapsed: clock.phaseElapsed };
}

export function loadClock(clock, d) {
  clock.day = d.day;
  clock.phaseIndex = d.phaseIndex;
  clock.phaseElapsed = d.phaseElapsed;
}

// player: { position, yaw }; combat: { health, armour, inventory, weapons, kills }.
export function savePlayer(player, combat) {
  const w = combat.weapons;
  const weapons = {};
  for (const id of w.order) weapons[id] = { mag: w.states[id].mag, reserve: w.states[id].reserve };
  const inv = combat.inventory;
  return {
    x: player.position.x,
    z: player.position.z,
    yaw: player.yaw,
    health: combat.health.value,
    armour: { ...combat.armour.values },
    inventory: { firstAid: inv.firstAid, scrap: inv.scrap, batteries: inv.batteries, ammo: { ...inv.ammo } },
    weapon: w.index,
    weapons,
    kills: combat.kills,
  };
}

// Everything but the position (Game teleports the player).
export function loadPlayer(combat, d) {
  combat.health.value = d.health;
  combat.health.clearHealing?.();
  Object.assign(combat.armour.values, d.armour);
  const inv = combat.inventory;
  inv.firstAid = d.inventory.firstAid;
  inv.scrap = d.inventory.scrap;
  inv.batteries = d.inventory.batteries;
  inv.ammo = { ...d.inventory.ammo };
  const w = combat.weapons;
  // Session 10b: guns picked up along the way (the hunting rifle) come back
  // too. The detonator's slot belongs to the charges, which restore it.
  for (const id of Object.keys(d.weapons ?? {})) {
    if (!w.order.includes(id) && w.cfg[id]?.kind === 'hitscan') w.setSlot(id, true);
  }
  for (const id of w.order) {
    const s = d.weapons[id];
    if (s) w.states[id].init(s.mag, s.reserve);
  }
  if (d.weapon >= 0 && d.weapon < w.order.length && d.weapon !== w.index) {
    if (w.select) w.select(d.weapon);
    else w.index = d.weapon;
  }
  combat.kills = d.kills ?? 0;
}

export function saveStation(state) {
  return {
    segments: state.segments.map((s) => ({
      health: s.health,
      barricade: { built: s.barricade.built, health: s.barricade.health },
      spike: { built: s.spike.built, durability: s.spike.durability },
    })),
    gate: state.gate.health,
    doors: Object.fromEntries(Object.entries(state.doors).map(([id, d]) => [id, { health: d.health, max: d.max, reinforced: d.reinforced }])),
    charge: state.charge,
    floods: state.floods.map((f) => f.built),
    turret: { ...state.turret },
  };
}

export function loadStation(state, d) {
  d.segments.forEach((s, i) => {
    const seg = state.segments[i];
    if (!seg) return;
    seg.health = s.health;
    seg.barricade.built = s.barricade.built;
    seg.barricade.health = s.barricade.health;
    seg.spike.built = s.spike.built;
    seg.spike.durability = s.spike.durability;
  });
  state.gate.health = d.gate;
  for (const [id, door] of Object.entries(d.doors)) Object.assign(state.doors[id], door);
  state.charge = d.charge;
  d.floods.forEach((built, i) => {
    if (state.floods[i]) state.floods[i].built = built;
  });
  Object.assign(state.turret, d.turret);
}

// Vehicles by id (their placement rebuilds from the seed).
export function saveVehicles(list) {
  return list.map((v) => ({ id: v.id, door: v.searched.door, boot: v.searched.boot, bonnet: v.bonnetUp, battery: v.hasBattery, flat: v.flat, alarm: v.alarmArmed, seen: v.seen }));
}

export function loadVehicles(list, d) {
  const byId = new Map(list.map((v) => [v.id, v]));
  for (const s of d) {
    const v = byId.get(s.id);
    if (!v) continue;
    v.searched.door = s.door;
    v.searched.boot = s.boot;
    v.opened.door = s.door;
    v.opened.door2 = s.door;
    v.opened.boot = s.boot;
    v.bonnetUp = s.bonnet;
    v.hasBattery = s.battery;
    v.flat = s.flat;
    v.alarmArmed = s.alarm;
    v.seen = s.seen;
  }
}

export function saveSigils(list) {
  return list.map((s) => ({ x: s.x, z: s.z, y: s.y, groundId: s.groundId, clearingId: s.clearingId, raised: s.raised }));
}

export function saveRevisits(revisits) {
  return revisits.visited.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
}

export function loadRevisits(revisits, d) {
  for (const i of d) if (i < revisits.visited.length) revisits.visited[i] = true;
}

// A save is usable if it's this version and has what we need.
export function validSave(d) {
  return Boolean(d && d.version === SAVE_VERSION && d.seed !== undefined && d.clock && d.player && d.station);
}
