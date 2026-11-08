// The ledger's plan of the compound (Session 15b, Aaron): the fence tab's
// map. Tap (or D-pad to) a part to work on it:
//  - the fence's 12 panels and the gate, round the outer ring: repair;
//  - the barricade slots, the outer ring (Session 18: they stand outside the fence): build one, or repair it;
//  - the cabin's two doors: repair, then reinforce;
//  - the fence box (the power): fit a battery.
// The D-pad walks a ring left and right, and steps between the rings with
// up (in) and down (out): see `layers`.
// The cabin, the tower, the turret pad and the cliff are drawn to find
// your way. Not to scale: the rings and the fence box sit where they're
// easy to tap, on the right side of the compound.
// Coordinates: metres from the fence's centre, x east, y south (north,
// the cliff, at the top, as on the map).
//
// buildFencePlan(station) -> { viewBox, back, title, hint, items } (Ledger.js).

const RING = 28; // the fence (drawn at its real radius)
const BARRICADE_RING = 32.5; // Session 18 (Aaron): the barricades, outside the fence, drawn well out so each is easy to tap
const BOX_AT = { angleDeg: 25, r: 18 }; // the fence box, drawn east of the gate path

export function buildFencePlan(station) {
  const L = station.layout;
  const s = station.state;
  const sc = station.sc;
  const k = sc.costs;
  const inv = station.combat.inventory;
  const c = L.centre;
  const rel = (p) => ({ x: p.x - c.x, y: p.z - c.z });
  const hp = (b) => `${Math.ceil(b.health)}/${b.max}`;
  const healthCls = (b) => (b.health <= 0 ? 'down' : b.health < b.max - 1e-6 ? 'hurt' : 'ok');
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const items = [];

  // ---- the fence and the gate ----
  const fencePart = (b, a0, a1, label) => {
    const gap = 0.012;
    const pts = arcPoints(a0 + gap, a1 - gap, RING);
    const mid = arcPoint((a0 + a1) / 2, RING);
    const cost = s.repairCost(b);
    items.push({
      svg: `<polyline class="shape fence" points="${pts}"/>`,
      hit: `<polyline class="hit" points="${pts}"/>`,
      x: mid.x,
      y: mid.y,
      ring: 'fence',
      order: (a0 + a1) / 2,
      cls: `${b.kind} ${healthCls(b)}`,
      label,
      value: cost > 0 ? `${hp(b)}  ·  A: repair (${cost} scrap)` : `${hp(b)}  ·  sound`,
      action: cost > 0 ? () => station.repair(b) : null,
    });
  };
  L.segments.forEach((seg, i) => fencePart(s.segments[i], seg.a0, seg.a1, cap(seg.name)));
  fencePart(s.gate, L.gate.a0, L.gate.a1, 'Gate');
  items[items.length - 1].spine = 0; // the foot of the spine (Session 15b: gate, fence box, front door, comms door)

  // ---- the barricades (the outer ring: Session 18, outside the fence) ----
  L.segments.forEach((seg, i) => {
    const bar = s.segments[i].barricade;
    const a0 = seg.a0 + 0.05;
    const a1 = seg.a1 - 0.05;
    const pts = arcPoints(a0, a1, BARRICADE_RING);
    const mid = arcPoint((a0 + a1) / 2, BARRICADE_RING);
    const label = `Barricade outside the ${seg.name}`;
    if (!bar.built) {
      items.push({
        svg: `<polyline class="shape barricade" points="${pts}"/>`,
        hit: `<polyline class="hit" points="${pts}"/>`,
        x: mid.x,
        y: mid.y,
        ring: 'barricade',
        order: (a0 + a1) / 2,
        cls: 'barricade empty',
        label,
        value: `not built  ·  A: build (${k.barricade} scrap)`,
        action: () => station.buildBarricade(i),
      });
      return;
    }
    const cost = s.repairCost(bar);
    items.push({
      svg: `<polyline class="shape barricade" points="${pts}"/>`,
      hit: `<polyline class="hit" points="${pts}"/>`,
      x: mid.x,
      y: mid.y,
      ring: 'barricade',
      order: (a0 + a1) / 2,
      cls: `barricade ${healthCls(bar)}`,
      label,
      value: cost > 0 ? `${hp(bar)}  ·  A: repair (${cost} scrap)` : `${hp(bar)}  ·  sound`,
      action: cost > 0 ? () => station.repair(bar) : null,
    });
  });

  // ---- the cabin and its doors ----
  const cab = L.cabin;
  const cc = rel(cab);
  const doorItem = (d, at, horizontal, spine) => {
    const p = rel(at);
    const w = Math.max(1.6, d.id === 'front' ? cab.frontDoor.width : cab.commsDoor.width) + 0.6;
    const h = 1.4;
    const [rw, rh] = horizontal ? [w, h] : [h, w];
    const cost = s.repairCost(d);
    let value;
    let action = null;
    if (cost > 0) {
      value = `${hp(d)}  ·  A: repair (${cost} scrap)`;
      action = () => station.repair(d);
    } else if (!d.reinforced) {
      value = `${hp(d)}  ·  A: reinforce (${k.reinforceDoor} scrap: ${sc.doors.health} -> ${sc.doors.reinforcedHealth}, security ${sc.security.door} -> ${sc.security.reinforcedDoor})`;
      action = () => station.reinforceDoor(d.id);
    } else {
      value = `${hp(d)}  ·  reinforced (security ${sc.security.reinforcedDoor})`;
    }
    items.push({
      svg: `<rect class="shape door" x="${f(p.x - rw / 2)}" y="${f(p.y - rh / 2)}" width="${f(rw)}" height="${f(rh)}"/>`,
      hit: `<rect class="hit" x="${f(p.x - rw / 2 - 1)}" y="${f(p.y - rh / 2 - 1)}" width="${f(rw + 2)}" height="${f(rh + 2)}"/>`,
      x: p.x,
      y: p.y,
      ring: 'inner',
      order: p.x,
      spine,
      cls: `door ${healthCls(d)}${d.reinforced ? ' reinforced' : ''}`,
      label: cap(d.name),
      value,
      action,
    });
  };
  doorItem(s.doors.front, cab.frontDoor, true, 2);
  doorItem(s.doors.comms, cab.commsDoor, true, 3);

  // ---- the fence box (the power) ----
  const ba = (BOX_AT.angleDeg * Math.PI) / 180;
  const box = arcPoint(ba, BOX_AT.r);
  const p = sc.power;
  const charge = Math.round(s.charge);
  const canFit = inv.batteries > 0 && !s.chargeFull;
  const tonight = Math.round(s.nightDrainPerSecond(station.nightSeconds) * station.nightSeconds);
  items.push({
    svg: `<rect class="shape box" x="${f(box.x - 2)}" y="${f(box.y - 1.6)}" width="4" height="3.2" rx="0.4"/><rect class="charge" x="${f(box.x - 1.6)}" y="${f(box.y + 1.1)}" width="${f(3.2 * Math.min(1, s.charge / s.capacity))}" height="0.35"/><text class="glyph" x="${f(box.x)}" y="${f(box.y + 0.5)}">&#9889;</text>`,
    hit: `<rect class="hit" x="${f(box.x - 3)}" y="${f(box.y - 2.6)}" width="6" height="5.2"/>`,
    x: box.x,
    y: box.y,
    ring: 'inner',
    order: box.x,
    spine: 1,
    cls: `box ${s.powered ? 'ok' : 'down'}`,
    label: 'Fence box (power)',
    value: `charge ${charge}/${s.capacity}  ·  you carry ${inv.batteries} batter${inv.batteries === 1 ? 'y' : 'ies'}${canFit ? `  ·  A: fit one (+${p.batteryCharge})` : inv.batteries > 0 ? '  ·  full' : '  ·  bring a battery'}  ·  tonight drains about ${tonight}`,
    action: canFit ? () => station.fitBattery() : null,
  });

  // ---- what's drawn but not tapped ----
  const tw = rel(L.tower);
  const tp = rel(L.turretPad);
  const gateLabel = arcPoint(0, RING + 3.4);
  const back = [
    `<rect class="cliff" x="-38" y="-20" width="76" height="${f(-14 - -20)}"/>`,
    `<text class="lbl" x="0" y="-16">CLIFF</text>`,
    `<rect class="cabin" x="${f(cc.x - cab.halfW)}" y="${f(cc.y - cab.halfD)}" width="${f(cab.halfW * 2)}" height="${f(cab.halfD * 2)}"/>`,
    `<line class="cabin-wall" x1="${f(cc.x - cab.halfW)}" y1="${f(cc.y + cab.partZ)}" x2="${f(cc.x + cab.halfW)}" y2="${f(cc.y + cab.partZ)}"/>`,
    `<text class="lbl small" x="${f(cc.x - 2.6)}" y="${f(cc.y + cab.partZ - 1.1)}">COMMS</text>`,
    `<text class="lbl small" x="${f(cc.x - 2.6)}" y="${f(cc.y + cab.halfD - 1.2)}">CABIN</text>`,
    `<rect class="tower" x="${f(tw.x - 1.7)}" y="${f(tw.y - 1.7)}" width="3.4" height="3.4"/>`,
    `<text class="lbl small" x="${f(tw.x)}" y="${f(tw.y + 3.6)}">TOWER</text>`,
    `<circle class="pad" cx="${f(tp.x)}" cy="${f(tp.y)}" r="1.1"/>`,
    `<text class="lbl small" x="${f(gateLabel.x)}" y="${f(gateLabel.y)}">GATE</text>`,
  ].join('');

  return {
    viewBox: '-38 -20 76 58', // Session 18: wider, for the barricades' ring outside the fence
    // The D-pad (Session 15b, Aaron): left / right along a ring (the fence
    // and gate west to east, the barricades); up / down along the spine
    // (the gate, the fence box, the front door, the comms door, then the
    // rows above). Session 18 (Aaron): the barricades are outside the fence
    // now: from a barricade up to its panel, from a panel up to the spine or
    // down to its barricade. Items' `spine`: their place on it.
    layers: ['barricade', 'fence', 'inner'],
    back,
    title: 'OR PICK A PART: barricades (outer ring), the fence, the doors, the fence box',
    hint: 'Tap a part, or D-pad to it and press A',
    items,
  };
}

// A point on the fence's arc: angle a round from due south (east positive).
function arcPoint(a, r) {
  return { x: r * Math.sin(a), y: r * Math.cos(a) };
}

function arcPoints(a0, a1, r, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = arcPoint(a0 + ((a1 - a0) * i) / n, r);
    out.push(`${f(p.x)},${f(p.y)}`);
  }
  return out.join(' ');
}

function f(v) {
  return Math.round(v * 100) / 100;
}
