// Nights at the station (M6; DESIGN.md "Danger rating, forecast and
// simulated nights"):
//  - The dusk forecast: security against tonight's danger (danger.js),
//    the margin and what it means if you're away, with a breakdown of
//    both, when the first groups should arrive, and warnings ("Turret runs
//    dry around 2am"). A panel at dusk that fades by itself (it takes no
//    buttons, so B still reloads), and a Forecast tab in the ledger.
//  - Away: beyond `awayRadius` of the station the fight isn't simulated.
//    Each group that reaches it is resolved by the margin table
//    (nightResolver.js) as things stand then and gathers outside the fence
//    where it arrived. A radio call says where, and whether the fence will
//    hold. Until dawn it claws at a steady rate (awayDps, scaled by the
//    band and level) on the real defences (Station.attackDamage()): along
//    the fence if it holds, or on through the gap, the front door and the
//    comms door if the margin says it breaks through. The turret fires at
//    its rate and its rounds become kills; the fence's zaps use charge.
//    Come home mid-attack and the group is still at the fence to fight
//    (Aaron, M6). Back home, a summary. Near home, sieges are real.
//  - The alarm: the first time in a night that security drops below half
//    of what it was at dusk, a radio call and a banner pointing home.
//
// Events: 'night:forecast' { forecast }, 'night:attack' { zombies, result,
// applied }, 'night:alarm'.

import { nightDanger } from './danger.js';
import { verdict, resolveAttack } from './nightResolver.js';
import { secondsOfFire } from './turretMath.js';
import { angleOf } from './stationLayout.js';
import { DEBUG } from '../debug/DebugMenu.js';

export class NightWatch {
  constructor(cfg, rng, bus) {
    this.cfg = cfg;
    this.nc = cfg.nights;
    this.rng = rng;
    this.bus = bus;
  }

  // ctx: { station, director, witch, combat, player, clock, dialogue, notify(text) }.
  init(root, ctx) {
    Object.assign(this, ctx);
    this.enemies = ctx.combat.enemies;
    this.el = document.createElement('div');
    this.el.className = 'forecast hidden';
    root.appendChild(this.el);
    const phases = this.cfg.clock.phases;
    const night = phases.findIndex((p) => p.name === 'night');
    this.nightSeconds = phases[night].seconds;
    this.nightStartHour = phases[night].startHour;
    const next = phases[(night + 1) % phases.length].startHour;
    this.nightHours = (next - this.nightStartHour + 24) % 24;
    this.groups = new Map();
    this.forceAway = false; // debug
    this.reset();
    this.station.extraPages = () => [this.ledgerPage()];
    this.wireEvents();
  }

  reset() {
    this.away = false;
    this.forecastDue = false;
    this.forecastTimer = 0;
    this.duskSecurity = null;
    this.alarmOn = false;
    this.alarmDone = false;
    this.alarmTimer = 0;
    this.newLog();
    this.attacks = []; // attacks under way while you're away
    this.attacksTonight = 0;
    this.time = 0;
    this.el?.classList.add('hidden');
  }

  // What's happened while you were away (shown when you're back).
  newLog() {
    this.log = { attacks: 0, zombies: 0, damage: 0, broke: [], rounds: 0, kills: 0 };
    this.brokenAtStart = new Set();
    if (this.station) for (const b of this.station.state.barriers()) if (b.health <= 0) this.brokenAtStart.add(b.id);
  }

  wireEvents() {
    const { bus } = this;
    this.unsubscribers = [
      // A frame later, so the witch's stand-in has planted tonight's sigil.
      bus.on('phase:dusk', () => (this.forecastDue = true)),
      // M7: the final battle jumps straight to night: no forecast for it.
      bus.on('final:started', () => {
        this.forecastDue = false;
        this.forecastTimer = 0;
        this.el.classList.add('hidden');
      }),
      bus.on('phase:night', () => {
        this.duskSecurity ??= this.securityNow();
        this.alarmDone = false;
        this.attacksTonight = 0;
      }),
      bus.on('phase:dawn', () => {
        this.endAttacks();
        this.alarmOn = false;
        this.duskSecurity = null;
      }),
      bus.on('player:respawned', () => this.reset()),
    ];
  }

  // ---- numbers -------------------------------------------------------------------

  securityNow() {
    return this.station.state.security(this.nightSeconds).total;
  }

  get level() {
    return this.director.effectiveLevel;
  }

  // M7: the sigils the witch is still to plant tonight count too, from
  // when she's expected to plant them (not where: that's for the player
  // to find out).
  dangerNow() {
    const d = this.director;
    const marches = this.enemies.marches;
    const sigils = [...d.sigils.list, ...this.plannedSigils()];
    const describe = (s) => (s.planned ? 'The witch is out to plant a sigil' : capitalise(d.describe(s) || 'a sigil'));
    return nightDanger(sigils, (s) => marches.remaining(s.x, s.z), describe, this.level, this.cfg, this.nightSeconds);
  }

  // The witch's sigils still to come tonight: [{ x, z, delay, planned }],
  // delay in seconds into the night.
  plannedSigils() {
    if (!this.witch) return [];
    const c = this.clock;
    const phase = c.phase;
    if (phase !== 'dusk' && phase !== 'night') return [];
    // Seconds from now to the start of the night (negative once it's begun).
    const toNight = phase === 'dusk' ? c.currentPhase.seconds - c.phaseElapsed : -c.phaseElapsed;
    return this.witch.pendingPlantings().map((p) => ({ x: p.x, z: p.z, delay: p.inSeconds - toNight, planned: true }));
  }

  // The clock reading `seconds` into the night, to the nearest 10 minutes ("9:40pm").
  hourText(seconds) {
    const h = (this.nightStartHour + (Math.max(0, seconds) / this.nightSeconds) * this.nightHours) % 24;
    const minutes = Math.round((h * 60) / 10) * 10;
    const hh = Math.floor(minutes / 60) % 24;
    const mm = minutes % 60;
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''}${hh < 12 ? 'am' : 'pm'}`;
  }

  forecast() {
    const st = this.station.state;
    const sec = st.security(this.nightSeconds);
    const danger = this.dangerNow();
    const margin = sec.total - danger.total;
    const v = verdict(margin, this.nc.resolver);
    const warnings = [];
    const t = st.turret;
    if (t.installed) {
      if (!st.powered) warnings.push('Turret offline: the fence has no charge');
      else if (t.rounds < 1) warnings.push('Turret has no ammo');
      else {
        const fire = secondsOfFire(t.rounds, st.turretMode);
        if (fire < this.nightSeconds) warnings.push(`Turret runs dry around ${this.hourText(fire)} (if it fires all night)`);
      }
    }
    if (!st.powered) warnings.push('The fence has no charge: fit a battery at the fence box');
    else {
      const drain = st.nightDrainPerSecond(this.nightSeconds);
      if (drain > 0 && st.charge / drain < this.nightSeconds) warnings.push(`Fence charge runs out around ${this.hourText(st.charge / drain)}`);
    }
    return { sec, danger, margin, verdict: v, warnings, level: this.level };
  }

  // ---- the forecast panel and ledger page ------------------------------------------------

  showForecast() {
    const f = this.forecast();
    this.duskSecurity = f.sec.total;
    const sign = f.margin >= 0 ? '+' : '';
    const sec = f.sec.parts
      .filter((p) => p.value >= 0.05)
      .map((p) => `<li>${escapeHtml(p.label)}: ${p.value.toFixed(0)}</li>`)
      .join('');
    const danger = f.danger.parts.length
      ? f.danger.parts.map((p) => `<li>${escapeHtml(this.sigilLine(p))}</li>`).join('')
      : '<li>No sigils planted: a quiet night</li>';
    const warnings = f.warnings.map((w) => `<div class="warn">${escapeHtml(w)}</div>`).join('');
    this.el.innerHTML = `
      <h2>NIGHT ${this.clock.day} FORECAST</h2>
      <div class="verdict ${f.verdict.band}">Security ${f.sec.total.toFixed(0)} vs danger ${f.danger.total.toFixed(0)} &rarr; ${sign}${f.margin.toFixed(0)} &middot; ${escapeHtml(f.verdict.label)} if you're away</div>
      <div class="cols">
        <div><h3>SECURITY</h3><ul>${sec}</ul></div>
        <div><h3>DANGER (zombie level ${f.level})</h3><ul>${danger}</ul></div>
      </div>
      ${warnings}
    `;
    this.el.classList.remove('hidden');
    this.forecastTimer = this.nc.forecastSeconds;
    this.bus.emit('night:forecast', { forecast: f });
    return f;
  }

  // "Scarecrow field: about 8 zombies, the first around 9:40pm (16)".
  sigilLine(p, label = true) {
    const n = Math.round(p.marchers * p.arriving);
    const text = n <= 0 ? 'too far to reach the station tonight' : `about ${n} zombies, the first around ${this.hourText(p.firstArrival)} (${p.value.toFixed(0)})`;
    return label ? `${p.label}: ${text}` : text;
  }

  ledgerPage() {
    const f = this.forecast();
    const sign = f.margin >= 0 ? '+' : '';
    const rows = [
      { label: 'Security', value: f.sec.total.toFixed(1), action: null },
      { label: `Danger tonight (zombie level ${f.level})`, value: f.danger.total.toFixed(1), action: null },
      { label: 'Margin', value: `${sign}${f.margin.toFixed(1)}  ·  ${f.verdict.label} if you're away`, action: null },
    ];
    for (const p of f.danger.parts) rows.push({ label: `   ${p.label}`, value: this.sigilLine(p, false), action: null });
    if (f.danger.parts.length === 0) rows.push({ label: '   No sigils planted', value: 'a quiet night', action: null });
    for (const w of f.warnings) rows.push({ label: w, value: '', action: null });
    return { id: 'forecast', title: 'Forecast', rows };
  }

  // ---- each frame ----------------------------------------------------------------------

  update(dt, phase, playing) {
    const p = this.player.position;
    const c = this.station.layout.centre;
    const d = Math.hypot(p.x - c.x, p.z - c.z);
    const nc = this.nc;
    const was = this.away;
    this.away = this.forceAway || (this.away ? d > nc.awayRadius : d > nc.awayRadius + nc.awayHysteresis);
    this.enemies.stationSimulated = !this.away;
    this.station.abstract = this.away;
    if (!was && this.away) this.newLog();
    if (was && !this.away) {
      this.releaseAttacks();
      this.reportReturn();
    }

    if (this.forecastDue) {
      this.forecastDue = false;
      this.showForecast();
    }
    if (this.forecastTimer > 0) {
      this.forecastTimer -= dt;
      // Gone when its time is up, or at once if the run ends.
      if (this.forecastTimer <= 0 || !this.combat.alive) {
        this.forecastTimer = 0;
        this.el.classList.add('hidden');
      }
    }

    if (playing && this.combat.alive) {
      this.time += dt;
      if (this.away) {
        this.resolveArrivals();
        this.updateAttacks(dt);
      }
      this.alarmTimer -= dt;
      if (this.alarmTimer <= 0) {
        this.alarmTimer = 0.5;
        this.checkAlarm(phase);
      }
    }
    const home = d <= this.cfg.station.siege.baseRadius;
    if (this.alarmOn && !home && this.combat.alive) this.combat.hud.alarm('STATION UNDER ATTACK', this.angleHome(c));
    else this.combat.hud.alarm(null);
  }

  // The way home relative to where the player faces (radians, + to the right).
  angleHome(c) {
    const p = this.player.position;
    const yaw = this.player.yaw;
    const dx = c.x - p.x;
    const dz = c.z - p.z;
    const ahead = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
    const right = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
    return Math.atan2(right, ahead);
  }

  // While away: every group (a pack, or a stray) that reaches the station
  // is resolved by the margin table as things stand then, gathers just
  // outside the fence where it arrived, and plays its attack out over
  // the night (Aaron: time to react). Come home mid-attack and the
  // group is still there to fight.
  resolveArrivals() {
    const groups = this.groups;
    groups.clear();
    for (const z of this.enemies.living) {
      if (z.mode !== 'siege' || z.state === 'rise') continue;
      const key = z.horde ?? z;
      let list = groups.get(key);
      if (!list) groups.set(key, (list = []));
      list.push(z);
    }
    if (groups.size === 0) return;
    const r = this.nc.resolver;
    const danger = this.dangerNow();
    const defenceDamage = this.cfg.zombies.levels[this.level]?.defenceDamage ?? 1;
    const L = this.station.layout;
    for (const [key, list] of groups) {
      // The rest of a group that's already at the fence joins its attack.
      const joining = this.attacks.find((at) => at.pack && at.pack === key);
      if (joining) {
        const lead = joining.zombies[0];
        for (const zb of list) {
          this.enemies.brain.setMode(zb, 'held');
          zb.lingerX = lead.lingerX;
          zb.lingerZ = lead.lingerZ;
          zb.lingerRadius = r.gatherRadius;
          joining.zombies.push(zb);
        }
        this.log.zombies += list.length;
        continue;
      }
      let weight = 0;
      let x = 0;
      let z = 0;
      for (const zb of list) {
        weight += zb.kind === 'mutant' ? r.mutantWeight : 1;
        x += zb.x;
        z += zb.z;
      }
      x /= list.length;
      z /= list.length;
      // A group's size: everyone in its pack, not just the first to arrive
      // (the rest join this attack as they get here).
      let size = list.length;
      if (list[0].horde) {
        size = 0;
        for (const zb of this.enemies.living) if (zb.horde === list[0].horde) size++;
      }
      const margin = this.securityNow() - danger.total;
      const groupWeight = weight * (size / list.length);
      const result = resolveAttack({ margin, zombies: groupWeight, threat: danger.threat, nightDanger: danger.total, defenceDamage, roll: this.rng.next() }, r);
      const angle = angleOf(L, x, z);
      const line = this.station.fenceLineFrom(angle);
      const spot = L.at(Math.max(L.west, Math.min(L.east, angle)), L.radius + r.standOff);
      for (const zb of list) {
        this.enemies.brain.setMode(zb, 'held');
        zb.lingerX = spot.x;
        zb.lingerZ = spot.z;
        zb.lingerRadius = r.gatherRadius;
      }
      this.station.attackStart(line, list.length);
      const attack = { zombies: list, line, result, weight, defenceDamage, killCredit: 0, pack: list[0].horde ?? null, size };
      this.attacks.push(attack);
      const log = this.log;
      log.attacks++;
      log.zombies += list.length;
      this.attacksTonight++;
      this.radioArrival(attack);
      this.bus.emit('night:attack', { zombies: list.length, result });
    }
  }

  // Claw damage an attack does per second (each zombie: awayDps x the
  // band's damage x the level's defenceDamage).
  attackDps(a, weight = a.weight) {
    return weight * this.nc.resolver.awayDps * a.result.verdict.damage * a.defenceDamage;
  }

  // Aaron (M6): the radio says how bad it is. Will this group get through
  // the fence where it is before dawn (or is it breaking through)?
  radioArrival(a) {
    const n = a.size;
    const where = a.line[0].name;
    const first = this.station.breakThroughLine(a.line);
    const fence = first.filter((b) => b.kind !== 'door').reduce((sum, b) => sum + b.health, 0);
    const left = this.clock.phase === 'night' ? this.clock.phaseRemaining : 0;
    const through = a.result.falls || this.attackDps(a, a.weight * (a.size / a.zombies.length)) * left >= fence;
    // M8: the calls are lines in src/data/dialogue.json (rate limited by the radio).
    const who = this.dialogue.word('groupSize', n <= 2 ? 0 : n <= 5 ? 1 : 2);
    this.dialogue.say(through ? 'nights.arrival.urgent' : 'nights.arrival.calm', { who, where });
  }

  // Each attack under way, every frame until dawn: the turret fires and
  // its rounds become kills, the fence zaps, and the rest claw at the
  // defences. An attack with nobody left is over.
  updateAttacks(dt) {
    const r = this.nc.resolver;
    const log = this.log;
    for (let i = this.attacks.length - 1; i >= 0; i--) {
      const a = this.attacks[i];
      let weight = 0;
      let count = 0;
      for (const z of a.zombies) {
        if (!z.alive || z.mode !== 'held') continue;
        weight += z.kind === 'mutant' ? r.mutantWeight : 1;
        count++;
      }
      if (count === 0) {
        this.attacks.splice(i, 1);
        continue;
      }
      const rounds = this.station.attackCosts(dt, count);
      log.rounds += rounds;
      a.killCredit += rounds;
      while (a.killCredit >= r.turretKillRounds) {
        a.killCredit -= r.turretKillRounds;
        const victim = a.zombies.find((z) => z.alive && z.mode === 'held');
        if (!victim) break;
        victim.state = 'free'; // shot down at the fence (out of sight; no loot)
        log.kills++;
      }
      log.damage += this.station.attackDamage(a.line, this.attackDps(a, weight) * dt, a.result.falls);
      this.noteBroken();
      if (!this.combat.alive) return;
    }
  }

  // Home mid-attack: the groups at the fence lay siege for real.
  releaseAttacks() {
    for (const a of this.attacks) for (const z of a.zombies) if (z.alive && z.mode === 'held') this.enemies.brain.setMode(z, 'siege');
    this.attacks.length = 0;
  }

  // Dawn: the attackers give up and wander off (most sink at dawn anyway).
  endAttacks() {
    for (const a of this.attacks) for (const z of a.zombies) if (z.alive && z.mode === 'held') this.enemies.brain.setMode(z, 'wander');
    this.attacks.length = 0;
  }

  // Remember what's broken for the summary (attacks break things as they go).
  noteBroken() {
    const log = this.log;
    for (const b of this.station.state.barriers()) {
      if (b.health > 0 || b.kind === 'barricade') continue;
      if (!this.brokenAtStart.has(b.id) && !log.broke.includes(b.name)) log.broke.push(b.name);
    }
  }

  // Back within range of home after attacks while you were away (the
  // ones still under way carry on for real).
  reportReturn() {
    const log = this.log;
    if (log.attacks === 0) return;
    const broke = log.broke.length ? `Broken: ${log.broke.join(', ')}.` : 'Nothing broke.';
    const turret = log.rounds >= 1 ? ` The turret fired ${Math.round(log.rounds)} rounds and took down ${log.kills}.` : '';
    this.notify(`While you were away: ${log.attacks} attack${log.attacks === 1 ? '' : 's'} by ${log.zombies} zombies. ${broke}${turret}`);
    this.newLog();
  }

  checkAlarm(phase) {
    if (phase !== 'night' || this.alarmDone || !(this.duskSecurity > 0)) return;
    if (this.securityNow() >= this.nc.alarmFraction * this.duskSecurity) return;
    this.alarmDone = true;
    this.alarmOn = true;
    this.dialogue.say('nights.alarm');
    this.notify('Station security below half');
    this.bus.emit('night:alarm');
  }

  // ---- debug and overlay -------------------------------------------------------------------

  addDebugItems(menu) {
    const time = menu.category(DEBUG.time);
    time.addItem('Show the forecast now', () => this.showForecast());
    time.addItem(() => `Count me as away from home: ${this.forceAway ? 'always (debug)' : 'by distance'}`, () => (this.forceAway = !this.forceAway));
    time.addItem('Sound the alarm now', () => {
      this.alarmDone = false;
      this.duskSecurity = Infinity;
      this.checkAlarm('night');
    });
  }

  overlayLine() {
    const f = this.forecast();
    const sign = f.margin >= 0 ? '+' : '';
    return `${this.away ? 'AWAY' : 'home'}  security ${f.sec.total.toFixed(0)} danger ${f.danger.total.toFixed(1)} margin ${sign}${f.margin.toFixed(0)} (${f.verdict.band})  dusk ${this.duskSecurity === null ? '-' : this.duskSecurity.toFixed(0)}  alarm ${this.alarmOn ? 'ON' : 'off'}  attacks tonight ${this.attacksTonight}`;
  }

  dispose() {
    for (const off of this.unsubscribers ?? []) off();
    this.el.remove();
  }
}

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
