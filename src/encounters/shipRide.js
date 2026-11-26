// The quad's escape down the mothership's runway (Nov 26: Aaron, "the hangar in which you escape needs to be
// possibly 300 meters longer. It needs to have jumps where you can use the boost... a track that requires a bit of
// skill to escape"; the track: buildRunway in world/mothershipTower.js). Pure, tested: stepRide moves the quad
// one step on the tower's floors, with the alien quad's own numbers (config.alienQuad: its speed, steering and
// boost) and the runway's gravity (config.mothership.ride).
//
//  - On the ground it drives like the alien quad: the stick, the brakes, the boost (sprint or jump: 3 s of a far
//    higher top speed that drives itself; braking cuts it short and keeps what's left of the meter).
//  - Off a ramp it flies: it leaves with the ramp's climb as its upward speed, keeps its speed and line in the air
//    (steering only turns the quad, for the landing), and lands on whatever's under it. A landing off-line costs
//    speed (only the part along its new heading is kept).
//  - Off the edge, into a gap it didn't clear: it falls, and once it's below the runway's fall line, `fell`.
//
// q: { x, y, z, heading, speed, vy, vx, vz, onGround, meter, boosting, groundVy }. The quad's heading as world/Quad.js
// has it: forward is (-sin heading, -cos heading). inp: { throttle, steer (-1..1, + is left... as the quad's
// stick: + turns the heading down), boost (pressed this step) }.

// The boost meter after a step: burning or not (as world/AlienQuad.js stepBoost).
export function boostStep(meter, burning, dt, b) {
  if (burning) {
    const m = Math.max(0, meter - dt / b.seconds);
    return { meter: m, burning: m > 0 };
  }
  return { meter: Math.min(1, meter + dt / b.recharge), burning: false };
}

export function newRide(at, heading) {
  return { x: at.x, y: at.y, z: at.z, heading, speed: 0, vy: 0, vx: 0, vz: 0, onGround: true, meter: 1, boosting: false, groundVy: 0, air: 0 };
}

// One step. Returns what happened: { boosted, boostEnded, launched, landed (with its downward speed), bumped, fell }.
export function stepRide(q, inp, dt, tower, rc, qc, fallBelow = -Infinity) {
  const ev = {};
  const b = qc.boost;
  // The boost: pressed with enough in the meter, it burns; braking (or the meter running out) ends it.
  if (inp.boost && !q.boosting && q.meter >= b.minToStart) {
    q.boosting = true;
    ev.boosted = true;
  }
  if (q.boosting && inp.throttle < -0.1) {
    q.boosting = false;
    ev.boostEnded = true;
  }
  const bs = boostStep(q.meter, q.boosting, dt, b);
  if (q.boosting && !bs.burning) ev.boostEnded = true;
  q.meter = bs.meter;
  q.boosting = bs.burning;
  const fwd = { x: -Math.sin(q.heading), z: -Math.cos(q.heading) };
  // Steering: tighter slow, gentler fast and while boosting; backwards it turns the other way; in the air, only a little.
  const grip = Math.min(1, Math.abs(q.speed) / qc.steerFullAt);
  let turn = -inp.steer * qc.steerRate * grip * (1 - qc.steerFastLoss * Math.min(1, Math.abs(q.speed) / qc.maxSpeed)) * Math.sign(q.speed || 1) * dt;
  if (q.boosting) turn *= b.steer;
  if (!q.onGround) turn *= rc.airSteer;
  q.heading += turn;
  const yWas = q.y;
  if (q.onGround) {
    const top = q.boosting ? b.speed : qc.maxSpeed;
    let target;
    if (q.boosting) target = top;
    else if (inp.throttle > 0.1) target = inp.throttle * top;
    else if (inp.throttle < -0.1) target = q.speed > 0.4 ? 0 : inp.throttle * qc.reverseSpeed;
    else target = 0;
    const braking = !q.boosting && ((inp.throttle < -0.1 && q.speed > 0.4) || (target === 0 && q.speed !== 0));
    const rate = q.boosting ? b.acceleration : braking ? (inp.throttle < -0.1 ? qc.brake : qc.coast) : qc.acceleration;
    q.speed += Math.max(-rate * dt, Math.min(rate * dt, target - q.speed));
    const f = { x: -Math.sin(q.heading), z: -Math.cos(q.heading) };
    q.vx = f.x * q.speed;
    q.vz = f.z * q.speed;
  }
  // Move, then out of whatever it ran into (walls, kerbs, a deck's edge at its body's height).
  const want = { x: q.x + q.vx * dt, z: q.z + q.vz * dt };
  const pos = { ...want };
  tower.confine(pos, rc.radius, q.y, rc.height, rc.step);
  const pushed = Math.hypot(pos.x - want.x, pos.z - want.z);
  if (pushed > Math.hypot(q.vx, q.vz) * dt * 0.5 && Math.hypot(q.vx, q.vz) > rc.bumpSpeed) {
    ev.bumped = true;
    q.speed *= rc.bumpKeep;
    q.vx *= rc.bumpKeep;
    q.vz *= rc.bumpKeep;
    if (q.boosting) {
      q.boosting = false;
      ev.boostEnded = true;
    }
  }
  q.x = pos.x;
  q.z = pos.z;
  // Up and down.
  let floor = tower.floorAt(q.x, q.z, yWas, rc.step, 0.25);
  if (floor === -Infinity) floor = fallBelow - 50;
  if (q.onGround) {
    if (floor < yWas - rc.step) {
      // Off the end of a ramp (or the edge): it flies, rising as fast as the ramp was climbing.
      q.onGround = false;
      q.vy = Math.max(0, q.groundVy);
      q.air = 0;
      ev.launched = true;
    } else {
      q.groundVy = dt > 0 ? (floor - yWas) / dt : 0;
      q.y = floor;
    }
  }
  if (!q.onGround) {
    q.air += dt;
    q.vy -= rc.gravity * dt;
    q.y += q.vy * dt;
    if (q.vy > 0) {
      const ceil = tower.ceilingAt(q.x, q.z, yWas, rc.step);
      if (q.y + rc.height > ceil) {
        q.y = ceil - rc.height;
        q.vy = 0;
      }
    }
    if (q.y <= floor) {
      // Down: what it keeps is its speed along where it's now pointing.
      ev.landed = -q.vy;
      q.y = floor;
      q.vy = 0;
      q.onGround = true;
      q.groundVy = 0;
      const f = { x: -Math.sin(q.heading), z: -Math.cos(q.heading) };
      q.speed = Math.max(0, q.vx * f.x + q.vz * f.z) * (ev.landed > rc.hardLanding ? rc.hardKeep : 1);
      q.vx = f.x * q.speed;
      q.vz = f.z * q.speed;
    }
  }
  if (q.y < fallBelow) ev.fell = true;
  return ev;
}
