// The mutant's moves (Nov 16, Aaron: "it's health pool, though large, feels small ... give the mutant a more
// varied attack pool ... the battle feels like a non-event"). Pure logic on a Zombie whose body has `moves`
// (config.mutant.moves); render/MutantRenderer.js poses them from z.move.
//  - slam (kept from before, used in the gas station's cutscene): the club overhead and down in front, a
//    ground shock round where it lands;
//  - backhand (the gas station's cutscene too): a wild, wide sweep that throws Tom aside;
//  - spin: wound up, it spins twice, travelling at him, and can hit twice; then it stands dizzy for a moment,
//    its back (the weak spot) open: the answer to it;
//  - leap: from range it crouches, then leaps to where Tom will be and lands with a blast.
// It aims where Tom is going (his velocity, x lead, over the time to the hit), keeps turning until just
// before each blow, chains one attack into another, and leaps at a man who stands still. Every blow has a
// wind-up it can be read from (at least config windups, 0.45 s and up). While a move plays it shrugs off
// stagger (Zombie.hit), except when dizzy.
//
// z.move: { kind, phase ('windup' | 'strike' | 'spin' | 'air' | 'recover' | 'dizzy'), t (in the phase),
// windup (s), ... }. On the frame a blow lands near something that could go up (a car, a pump), z.impact is
// set to { x, z, r }; EnemyManager reports it ('mutant:impact').

export const CLOSE_MOVES = ['slam', 'backhand', 'spin'];

export function initMoves(z) {
  z.move = null;
  z.chainCount = 0;
  z.leapCool = 0;
  z.stillT = 0;
  z.thinkT = 0;
  z.lastMove = null;
  z.air = 0;
  z.impact = null;
  z.rngState = (Math.imul((z.lookSeed ?? 1) | 0, 2654435761) >>> 0) || 1;
}

// A tiny generator of its own (cosmetic-level randomness, the same each time for a look seed).
export function moveRand(z) {
  z.rngState = (Math.imul(z.rngState, 1664525) + 1013904223) >>> 0;
  return z.rngState / 4294967296;
}

// Where Tom will be in `seconds`, by his velocity (player.vx, vz), x lead.
export function predict(player, seconds, lead) {
  return { x: player.x + (player.vx ?? 0) * seconds * lead, z: player.z + (player.vz ?? 0) * seconds * lead };
}

// Is (px, pz) within reach and inside the arc (degrees, centred on its facing)?
export function inArc(z, px, pz, reach, arcDegrees) {
  const dx = px - z.x;
  const dz = pz - z.z;
  const d = Math.hypot(dx, dz);
  if (d > reach) return false;
  if (arcDegrees >= 360 || d < 0.3) return true;
  const ahead = (dx * Math.sin(z.facing) + dz * Math.cos(z.facing)) / d;
  return ahead >= Math.cos(((arcDegrees / 2) * Math.PI) / 180);
}

// Its damage for a blow, scaled as its swipe is (the level: z.attackDamage against the config's).
function damageOf(z, m, base) {
  return base * (z.attackDamage / (m.baseDamage ?? 30));
}

// Called each frame it's chasing on foot (Zombie.walkToPlayer), before it steps. Starts a move and returns
// true, or returns false to walk on.
export function maybeStartMove(z, m, player, dt) {
  const dx = player.x - z.x;
  const dz = player.z - z.z;
  const d = Math.hypot(dx, dz);
  const speed = Math.hypot(player.vx ?? 0, player.vz ?? 0);
  z.leapCool = Math.max(0, z.leapCool - dt);
  z.thinkT -= dt;
  // Stand still within its leap and it comes for you through the air.
  if (speed < m.stillSpeed && d < m.leap.max) z.stillT += dt;
  else z.stillT = Math.max(0, z.stillT - dt * 2);
  if (d <= m.closeReach) {
    startMove(z, m, pickClose(z, m), player);
    return true;
  }
  // Walking at him and getting no closer (something in the way): over it.
  if (z.lastD !== undefined && z.lastD - d < 0.4 * dt) z.stuckT = (z.stuckT ?? 0) + dt;
  else z.stuckT = 0;
  z.lastD = d;
  const lp = m.leap;
  if (z.leapCool <= 0 && z.stuckT > (m.stuckSeconds ?? 0.8) && d <= lp.max) {
    z.stuckT = 0;
    startMove(z, m, 'leap', player);
    return true;
  }
  if (z.leapCool <= 0 && d >= lp.min && d <= lp.max) {
    const still = z.stillT >= m.stillSeconds;
    let go = still;
    if (!go && z.thinkT <= 0) {
      z.thinkT = m.think;
      go = moveRand(z) < lp.chance;
    }
    if (go) {
      startMove(z, m, 'leap', player);
      return true;
    }
  }
  return false;
}

// A close blow, by weight, never the same twice running, the spin no more than once in a chain.
export function pickClose(z, m) {
  const options = CLOSE_MOVES.filter((k) => k !== z.lastMove && !(k === 'spin' && z.chainCount > 0));
  let total = 0;
  for (const k of options) total += m[k].weight;
  let r = moveRand(z) * total;
  for (const k of options) {
    r -= m[k].weight;
    if (r <= 0) return k;
  }
  return options[options.length - 1];
}

export function startMove(z, m, kind, player) {
  const mv = m[kind];
  z.state = 'move';
  z.chargeLeft = 0;
  z.timer = 0;
  z.struck = false;
  z.lastMove = kind;
  z.move = { kind, phase: 'windup', t: 0, windup: mv.windup, hits: 0, hitTimer: 0, aimX: player.x, aimZ: player.z };
  if (kind === 'leap') z.leapCool = m.leap.cooldown;
  z.moveStarted = kind; // EnemyManager reports it ('mutant:move')
  z.lastD = undefined;
}

// Each frame in state 'move'. onStrike(zombie, null, hit) when a blow lands on Tom.
export function updateMove(z, m, player, dt, onStrike) {
  const mv = z.move;
  if (!mv) {
    z.state = 'walk';
    return;
  }
  const spec = m[mv.kind];
  mv.t += dt;
  z.timer += dt;
  z.impact = null;
  if (mv.scripted) return; // a cutscene's puppet (the gas station's): posed, moved and ended by its encounter
  switch (mv.phase) {
    case 'windup': {
      // Turning on him (where he'll be at the blow) until just before it.
      const left = Math.max(0, mv.windup - mv.t);
      const ahead = left + (mv.kind === 'leap' ? spec.airSeconds : 0.1);
      const aim = predict(player, ahead, m.lead);
      if (left > m.lockBefore) {
        turnTo(z, aim.x - z.x, aim.z - z.z, m.turnRate, dt);
        mv.aimX = aim.x;
        mv.aimZ = aim.z;
      }
      // A close blow steps in on him through its wind-up if he's out of its reach (thrown, or backing off).
      if (spec.lunge && mv.kind !== 'leap') {
        const d = Math.hypot(aim.x - z.x, aim.z - z.z);
        const want = d - spec.reach * 0.75;
        if (want > 0) {
          const step = Math.min(want, spec.lunge * dt * z.moveScale);
          z.x += Math.sin(z.facing) * step;
          z.z += Math.cos(z.facing) * step;
          z.walked += step;
        }
      }
      if (mv.t >= mv.windup) begin(z, m, mv, spec, player, onStrike);
      break;
    }
    case 'spin': {
      // Two turns about itself, carried along at him; it can land twice.
      const k = Math.min(1, mv.t / spec.seconds);
      z.facing = mv.spinFrom + k * spec.turns * Math.PI * 2;
      const step = (spec.travel / spec.seconds) * dt * z.moveScale;
      z.x += mv.dirX * step;
      z.z += mv.dirZ * step;
      z.walked += step;
      z.impact = { x: z.x, z: z.z, r: spec.reach };
      mv.hitTimer -= dt;
      if (mv.hits < spec.hits && mv.hitTimer <= 0 && inArc(z, player.x, player.z, spec.reach, 360)) {
        mv.hits++;
        mv.hitTimer = spec.seconds / (spec.hits + 0.5);
        onStrike?.(z, null, blow(z, m, spec, player, 'away'));
      }
      if (k >= 1) setPhase(mv, 'dizzy');
      break;
    }
    case 'air': {
      const k = Math.min(1, mv.t / spec.airSeconds);
      z.x = mv.fromX + (mv.toX - mv.fromX) * k;
      z.z = mv.fromZ + (mv.toZ - mv.fromZ) * k;
      z.air = Math.sin(Math.PI * k) * spec.height;
      if (k >= 1) {
        z.air = 0;
        z.struck = true;
        z.impact = { x: z.x, z: z.z, r: spec.radius * 0.8 };
        z.landed = true; // EnemyManager: the ground shakes
        if (inArc(z, player.x, player.z, spec.radius, 360)) onStrike?.(z, null, blow(z, m, spec, player, 'away'));
        afterBlow(z, m, mv, spec, player);
      }
      break;
    }
    case 'strike':
      // The blow's follow-through (the renderer's slam / sweep), then on.
      if (mv.t >= (spec.follow ?? 0.15)) afterBlow(z, m, mv, spec, player);
      break;
    case 'chain':
      if (mv.t >= m.chainGap) {
        const d = Math.hypot(player.x - z.x, player.z - z.z);
        if (d <= m.closeReach + 1) startMove(z, m, pickClose(z, m), player);
        else if (d >= m.leap.min && d <= m.leap.max) startMove(z, m, 'leap', player);
        else finish(z);
      }
      break;
    case 'dizzy':
      // Swaying where it stopped, its back to whoever's behind it.
      if (mv.t >= spec.dizzy) setPhase(mv, 'recover');
      break;
    case 'recover':
      if (mv.t >= (spec.recover ?? m.recover)) finish(z);
      break;
    default:
      finish(z);
  }
}

// The wind-up's over: the blow.
function begin(z, m, mv, spec, player, onStrike) {
  if (mv.kind === 'spin') {
    const dx = mv.aimX - z.x;
    const dz = mv.aimZ - z.z;
    const d = Math.hypot(dx, dz) || 1;
    mv.dirX = dx / d;
    mv.dirZ = dz / d;
    mv.spinFrom = z.facing;
    z.struck = true;
    setPhase(mv, 'spin');
    return;
  }
  if (mv.kind === 'leap') {
    // To where he'll be, no further than it can leap, stopping short of landing on him.
    const dx = mv.aimX - z.x;
    const dz = mv.aimZ - z.z;
    const d = Math.hypot(dx, dz) || 1;
    const go = Math.min(spec.max, Math.max(0, d - spec.short));
    mv.fromX = z.x;
    mv.fromZ = z.z;
    mv.toX = z.x + (dx / d) * go;
    mv.toZ = z.z + (dz / d) * go;
    z.facing = Math.atan2(dx, dz);
    setPhase(mv, 'air');
    return;
  }
  // Slam and backhand: land now if he's in it.
  z.struck = true;
  const reachX = z.x + Math.sin(z.facing) * spec.reach * 0.7;
  const reachZ = z.z + Math.cos(z.facing) * spec.reach * 0.7;
  z.impact = { x: reachX, z: reachZ, r: spec.reach * 0.55 };
  const hit = inArc(z, player.x, player.z, spec.reach, spec.arc);
  if (hit) onStrike?.(z, null, blow(z, m, spec, player, mv.kind === 'backhand' ? 'aside' : 'away'));
  else if (spec.shock && Math.hypot(player.x - reachX, player.z - reachZ) <= spec.shock.radius) {
    // The slam's ground shock: a smaller knock for being close to where it came down.
    onStrike?.(z, null, { damage: damageOf(z, m, spec.shock.damage), push: pushFrom(reachX, reachZ, player, spec.shock.push ?? 3), hop: 1.5, shake: 1.5, kind: 'shock' });
  }
  if (spec.shock) z.landed = true;
  setPhase(mv, 'strike');
}

// A blow on Tom: its damage and which way it throws him ('away' from it, or 'aside' across its swing).
function blow(z, m, spec, player, way) {
  let push;
  if (way === 'aside') {
    // A backhand from its right: he's thrown to its left (and a little away).
    const lx = -Math.cos(z.facing);
    const lz = Math.sin(z.facing);
    const ax = Math.sin(z.facing);
    const az = Math.cos(z.facing);
    push = { x: (lx * 0.85 + ax * 0.5) * spec.push, z: (lz * 0.85 + az * 0.5) * spec.push };
  } else push = pushFrom(z.x, z.z, player, spec.push ?? 4);
  return { damage: damageOf(z, m, spec.damage), push, hop: spec.hop ?? 0, shake: spec.shake ?? 2, kind: z.move?.kind };
}

function pushFrom(x, zz, player, speed) {
  const dx = player.x - x;
  const dz = player.z - zz;
  const d = Math.hypot(dx, dz) || 1;
  return { x: (dx / d) * speed, z: (dz / d) * speed };
}

// After a blow: chain another (a chance, up to chainMax), or recover.
function afterBlow(z, m, mv, spec, player) {
  if (mv.kind === 'spin') return;
  if (z.chainCount + 1 < m.chainMax && moveRand(z) < m.chain) {
    z.chainCount++;
    setPhase(mv, 'chain');
    return;
  }
  setPhase(mv, 'recover');
}

function finish(z) {
  z.move = null;
  z.chainCount = 0;
  z.state = 'walk';
  z.timer = 0;
  z.air = 0;
}

function setPhase(mv, phase) {
  mv.phase = phase;
  mv.t = 0;
}

function turnTo(z, dx, dz, rate, dt) {
  if (dx === 0 && dz === 0) return;
  const want = Math.atan2(dx, dz);
  let diff = want - z.facing;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  z.facing += diff * Math.min(1, rate * dt);
}
