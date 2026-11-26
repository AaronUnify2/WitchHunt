// The Hales (Session 13, #148; DESIGN.md "The family"), built with the
// figure kit: Appalachia, 2003. Their colours, heights and builds are
// config.family.people; the shapes and patterns are here.
//  - Ellen, about 40, the scientist: dark auburn hair in a loose low
//    ponytail, thin wire glasses, an olive fleece zipped over a grey top,
//    dark jeans, hiking boots. Stands with her arms folded.
//  - Wyatt, 14, lanky: messy brown hair, a red flannel shirt open over a
//    dark band T-shirt, jeans, worn sneakers. Hands in his pockets.
//  - Junie, 9: long light-brown hair in two braids, an oversized faded
//    purple hoodie (his, handed down) with the sleeves over her hands,
//    leggings, sneakers; she holds a stuffed rabbit.

// The body every one of them shares (an adult's, 1.7 m; the kit scales it).
// sh: shoulder width; hip: hip width; bulk: the torso's girth; waist: the
// waist's width; female (Aaron: Ellen read too masculine): a narrower
// ribcage and waist, softer shoulders, wider hips and a bust. legs:
// 'loose' (straight-cut trousers over the shoes) or 'fitted' (leggings).
//
// Clothes sit loose (Aaron, Session 13: everyone read skin-tight): the
// sleeves and trouser legs are straight tubes with room in them, not
// following the arm and leg; the top hangs from the chest rather than
// pinching in at the waist (EASE), and creases gather at the elbows,
// knees, ankles and waist (crease()).
const EASE = { waist: 0.45, girth: 0.008 }; // the waist's pinch kept; metres added round the chest

// loose (Session 18, Aaron: Wyatt and Ellen still read skin-tight): room in the sleeves, the trouser
// legs and round the chest (1: as before).
function body({ sh = 1, hip = 1, bulk = 1, waist = 1, female = false, hand = 'skin', top = 'top', legs = 'loose', loose = 1 }) {
  const cap = female ? 0.056 : 0.068; // the shoulders' caps
  const w = 1 - (1 - waist) * EASE.waist * (loose > 1 ? 0.4 : 1); // the waist under a loose top (barely pinched when loose)
  const g = EASE.girth * (1 + (loose - 1) * 3);
  const L = loose;
  const LL = 1 + (loose - 1) * 0.55; // the legs: straight, roomy, not wide at the hip
  const masses = [
    ['hips', null, 0, 0.95, 0, 0.155 * hip, 0.11, 0.11 * (female ? 1.08 : 1), 'trousers'],
    ['chest', 'spine', 0, 1.31, 0.005, 0.18 * sh * bulk + g, 0.13, (female ? 0.1 : 0.115) * bulk + g, top],
    ['chest', 'shoulderR', -0.163 * sh, female ? 1.398 : 1.405, 0, cap * bulk, cap * 0.9, cap * bulk, top],
    ['chest', 'shoulderL', 0.163 * sh, female ? 1.398 : 1.405, 0, cap * bulk, cap * 0.9, cap * bulk, top],
    ['neck', 'chest', 0, 1.475, 0, 0.046, 0.05, 0.046, 'skin'],
    // The trapezius: a slope from the neck down to each shoulder (Aaron: without it, a deep V).
    ['chest', null, -0.085 * sh, 1.43, -0.012, 0.085 * sh, 0.035, 0.058, top, [0, 0, 0.42]],
    ['chest', null, 0.085 * sh, 1.43, -0.012, 0.085 * sh, 0.035, 0.058, top, [0, 0, -0.42]],
    // The head (one smooth shape: a separate jaw shaded like a moustache), a
    // nose, ears; dark eyes and light brows.
    ['head', null, 0, 1.59, 0.012, 0.086, 0.118, 0.1, 'skin'],
    ['head', null, 0, 1.585, 0.104, 0.012, 0.02, 0.016, 'skin'],
    ['head', null, -0.09, 1.588, 0, 0.013, 0.027, 0.019, 'skin'],
    ['head', null, 0.09, 1.588, 0, 0.013, 0.027, 0.019, 'skin'],
    ['head', null, -0.033, 1.608, 0.093, 0.012, 0.011, 0.006, 'eyes'],
    ['head', null, 0.033, 1.608, 0.093, 0.012, 0.011, 0.006, 'eyes'],
    ['head', null, -0.035, 1.638, 0.093, 0.019, 0.0035, 0.007, 'brows'],
    ['head', null, 0.035, 1.638, 0.093, 0.019, 0.0035, 0.007, 'brows'],
    // Hands and feet.
    ['wristR', null, -0.233, 0.835, 0.025, 0.024, 0.045, 0.016, hand],
    ['wristL', null, 0.233, 0.835, 0.025, 0.024, 0.045, 0.016, hand],
    ['ankleR', null, -0.1, 0.045, 0.05, 0.055, 0.045, 0.12, 'shoes'],
    ['ankleL', null, 0.1, 0.045, 0.05, 0.055, 0.045, 0.12, 'shoes'],
  ];
  const limbs = [
    // The trunk: an oval from the hips to the shoulders, so the shapes on it
    // blend, pinched at the waist (the spine joint).
    ['hips', 'spine', 0.15 * hip + 0.012, 0.145 * bulk * w + g, top, 0, 0.72], // the shirt hangs over the waistband
    // It narrows into the neck (the chest and the shoulders' caps make the shoulders: no ledge).
    ['spine', 'neck', 0.145 * bulk * w + g, 0.085 * bulk, top, female ? 0.25 : 0.4, 0.75],
    // Sleeves: straight, with room in them, open round the wrist; they
    // start no wider than the shoulder (wider, and the shoulders puff).
    ['shoulderR', 'elbowR', 0.047 * bulk * L, 0.051 * bulk * L, 'sleeve', 0.07, 1, 0.9],
    ['elbowR', 'wristR', 0.049 * bulk * L, 0.043 * bulk * L, 'forearm', 0.02],
    ['shoulderL', 'elbowL', 0.047 * bulk * L, 0.051 * bulk * L, 'sleeve', 0.07, 1, 0.9],
    ['elbowL', 'wristL', 0.049 * bulk * L, 0.043 * bulk * L, 'forearm', 0.02],
  ];
  if (legs === 'fitted') {
    for (const s of ['R', 'L']) limbs.push([`hip${s}`, `knee${s}`, 0.085 * hip, 0.058, 'trousers', 0.1], [`knee${s}`, `ankle${s}`, 0.056, 0.04, 'trousers', 0.14]);
  } else {
    // Straight-cut legs, the hems sitting over the shoes.
    for (const s of ['R', 'L']) limbs.push([`hip${s}`, `knee${s}`, 0.092 * hip * LL, 0.07 * LL, 'trousers', 0.03], [`knee${s}`, `ankle${s}`, 0.068 * LL, 0.062 * LL * LL, 'trousers', 0]);
  }
  return { masses, limbs, tubes: [], rings: [], deform: female ? bust : null };
}

// A modest bust, made by pushing the front of the chest out (Aaron: two
// spheres read as fabric over two balls): rising gently from the collarbone,
// fullest low, then tucking back under, a rounded triangle in profile; one
// soft swell across, with no cleavage, as under a fleece.
function bust(p, n, bone) {
  if ((bone !== 'chest' && bone !== 'spine') || n.z <= 0) return 0;
  const across = Math.exp(-Math.pow(p.x / 0.105, 4)); // flat-topped across her chest
  const y = p.y - 1.275; // the fullest point
  const profile = y > 0 ? Math.max(0, 1 - y / 0.1) ** 1.5 : Math.exp(-Math.pow(y / 0.035, 2));
  return 0.045 * across * profile * n.z;
}

// Hair: a cap over the skull, set back so the face shows, and the style.
// The Hanged (Nov 24): thin as rails, their clothes in rags hanging in strips, the noose's rope round the neck and its
// tail down the back, long stringy hair on two of them, pale dead eyes.
function hangedBody(v) {
  const b = body({ sh: 0.94, hip: 0.92, bulk: 0.78, waist: 0.8, loose: 1.25, female: v === 1, hand: 'skin' });
  b.masses.push(['neck', null, 0, 1.47, 0, 0.062, 0.022, 0.062, 'rope']); // the noose
  b.masses.push(['head', null, 0, 1.553, 0.088, 0.03, 0.024, 0.014, 'mouth']); // the mouth, hanging open
  b.masses.push(['head', null, -0.033, 1.606, 0.088, 0.02, 0.018, 0.012, 'eyes']); // the sockets, sunk and black
  b.masses.push(['head', null, 0.033, 1.606, 0.088, 0.02, 0.018, 0.012, 'eyes']);
  b.masses.push(['neck', null, 0.05, 1.49, -0.04, 0.03, 0.03, 0.03, 'rope']); // its knot
  b.masses.push(['chest', null, 0.02, 1.25, -0.13, 0.02, 0.2, 0.02, 'rope']); // its tail down the back
  if (v !== 2) {
    b.masses.push(hairCap(1.632, -0.02, [0.095, 0.1, 0.104]));
    for (let i = 0; i < 5; i++) b.masses.push(['head', null, -0.08 + i * 0.04, 1.5, -0.06 + (i % 2) * 0.02, 0.018, 0.14, 0.018, 'hair']);
  }
  // Rags: strips hanging off the hem and the sleeves.
  for (let i = 0; i < 7; i++) b.masses.push(['hips', null, -0.15 + i * 0.05, 0.82 + (i % 3) * 0.02, (i % 2 ? 0.08 : -0.08), 0.02, 0.1 + (i % 3) * 0.03, 0.012, 'top']);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.masses.push(['elbow' + (s < 0 ? 'R' : 'L'), null, s * (0.24 + i * 0.012), 1.08 - i * 0.03, 0.02 * i, 0.016, 0.07, 0.01, 'top']);
  return b;
}

function hairCap(y = 1.632, z = -0.016, r = [0.097, 0.1, 0.104]) {
  return ['head', null, 0, y, z, r[0], r[1], r[2], 'hair'];
}

// Ellen's face (Nov 26, Aaron's concept art): her own, not the shared one's dots and ball nose. The head is
// the shared shape (centre 0, 1.59, 0.012; radii 0.086, 0.118, 0.1); everything sits on its surface.
const HEAD = { y: 1.59, z: 0.012, rx: 0.081, ry: 0.118, rz: 0.1 }; // (hers a little narrower than the shared head)
function onHead(x, y, lift = 0) {
  const k = 1 - (x / HEAD.rx) ** 2 - ((y - HEAD.y) / HEAD.ry) ** 2;
  return HEAD.z + HEAD.rz * Math.sqrt(Math.max(0, k)) + lift;
}
function ELLEN_FACE() {
  const m = [];
  // (Small pieces: the kit's coarse spheres.)
  const f = (bone, x, y, z, rx, ry, rz, key, turn = null) => m.push([bone, null, x, y, z, rx, ry, rz, key, turn, true]);
  // A firmer chin.
  f('head', 0, 1.49, onHead(0, 1.49, -0.018), 0.028, 0.02, 0.022, 'skin');
  // The nose: a bridge down from the brow, its tip and wings.
  f('head', 0, 1.603, onHead(0, 1.603, -0.002), 0.008, 0.024, 0.01, 'skin');
  f('head', 0, 1.581, onHead(0, 1.581, 0.007), 0.0095, 0.0095, 0.0095, 'skin');
  for (const s of [-1, 1]) f('head', s * 0.0105, 1.577, onHead(s * 0.0105, 1.577, 0.001), 0.0072, 0.006, 0.0065, 'skin');
  for (const s of [-1, 1]) {
    const x = s * 0.032;
    // Almond eyes: the white, the dark iris, a heavy upper lid's line; set a little into the face.
    f('head', x, 1.607, onHead(x, 1.607, -0.0045), 0.0145, 0.0068, 0.005, 'white', [0, s * 0.3, 0]);
    f('head', x, 1.6068, onHead(x, 1.6068, -0.0032), 0.0064, 0.0064, 0.004, 'eyes');
    f('head', x, 1.6122, onHead(x, 1.6122, -0.0018), 0.0155, 0.0024, 0.005, 'lid', [0, s * 0.3, s * -0.05]);
    // Straight brows, lower toward the middle: stern.
    f('head', s * 0.034, 1.629, onHead(s * 0.034, 1.629, -0.001), 0.019, 0.0034, 0.006, 'brows', [0, s * 0.3, s * 0.12]);
  }
  // The mouth: set, a little down at the corners; a fuller lower lip.
  f('head', 0, 1.5535, onHead(0, 1.5535, -0.0025), 0.017, 0.0028, 0.004, 'lips');
  f('head', 0, 1.5468, onHead(0, 1.5468, -0.0025), 0.015, 0.0042, 0.0045, 'lips');
  f('head', 0, 1.5502, onHead(0, 1.5502, -0.0012), 0.0175, 0.001, 0.004, 'lid');
  for (const s of [-1, 1]) f('head', s * 0.0185, 1.5485, onHead(s * 0.0185, 1.5485, -0.0016), 0.0035, 0.0011, 0.004, 'lid');
  return m;
}
// Shading painted on her face: the sockets darker round the eyes, a little colour in the cheeks.
function faceShade(q, out, c) {
  for (const s of [-1, 1]) {
    const d = Math.hypot((q.x - s * 0.032) / 0.026, (q.y - 1.607) / 0.018);
    if (d < 1) out.multiplyScalar(0.82 + 0.18 * d);
    const ch = Math.hypot((q.x - s * 0.05) / 0.03, (q.y - 1.565) / 0.025);
    if (ch < 1) out.lerp(c.lips, 0.06 * (1 - ch));
  }
}
// The coat's front (her chest and waist, under the coat's ease) at a height: where its buttons sit.
function coatFront(y) {
  return y > 1.2 ? 0.118 + 0.035 * Math.max(0, 1 - Math.abs(y - 1.28) / 0.1) : 0.112;
}

// Wyatt's face (Nov 26, Aaron's concept art): a teenage boy's, on the shared head (his ears kept): straight
// brows under the fringe, eyes with whites and lids, a long nose with a bridge, lips a little parted, a chin
// and a squarer jaw (mostly sunk into the head: only a hint shows).
const SHARED_HEAD = { y: 1.59, z: 0.012, rx: 0.086, ry: 0.118, rz: 0.1 };
function onShared(x, y, lift = 0) {
  const h = SHARED_HEAD;
  return h.z + h.rz * Math.sqrt(Math.max(0, 1 - (x / h.rx) ** 2 - ((y - h.y) / h.ry) ** 2)) + lift;
}
function tubeOnHead(tubes, x0, y0, x1, y1, r0, r1, key) {
  tubes.push(['head', x0, y0, onShared(x0, y0, 0.006), x1, y1, onShared(x1, y1, 0.004), r0, r1, key]);
}
function WYATT_FACE() {
  const m = [];
  const f = (x, y, lift, rx, ry, rz, key, turn = null) => m.push(['head', null, x, y, onShared(x, y, lift), rx, ry, rz, key, turn, true]);
  f(0, 1.488, -0.017, 0.031, 0.02, 0.022, 'skin'); // the chin
  f(0, 1.6, -0.002, 0.0085, 0.026, 0.011, 'skin'); // the nose's bridge
  f(0, 1.576, 0.008, 0.0105, 0.0105, 0.0105, 'skin'); // its tip
  for (const s of [-1, 1]) f(s * 0.0115, 1.573, 0.001, 0.0075, 0.0065, 0.0068, 'skin');
  for (const s of [-1, 1]) {
    const x = s * 0.033;
    f(x, 1.607, -0.0045, 0.015, 0.0086, 0.005, 'white', [0, s * 0.3, 0]);
    f(x, 1.6068, -0.0032, 0.0074, 0.0074, 0.004, 'eyes');
    f(x, 1.6142, -0.0018, 0.0152, 0.0017, 0.005, 'lid', [0, s * 0.3, 0]);
    f(s * 0.035, 1.628, -0.001, 0.02, 0.0042, 0.006, 'brows', [0, s * 0.3, s * 0.04]);
  }
  // Lips, a little parted.
  f(0, 1.5545, -0.0025, 0.017, 0.003, 0.004, 'lips');
  f(0, 1.5455, -0.0025, 0.0158, 0.0045, 0.0045, 'lips');
  f(0, 1.5498, -0.002, 0.0145, 0.0017, 0.004, 'lid');
  return m;
}
// The eye sockets a shade darker.
function socketShade(q, out) {
  for (const s of [-1, 1]) {
    const d = Math.hypot((q.x - s * 0.033) / 0.026, (q.y - 1.607) / 0.018);
    if (d < 1) out.multiplyScalar(0.84 + 0.16 * d);
  }
}
// Hands with fingers (the shared ones are paddles), hanging at the sides: a palm turned in to the thigh, four
// fingers, a thumb in front.
function hands() {
  const m = [];
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'wristR' : 'wristL';
    m.push([bone, null, s * 0.236, 0.84, 0.02, 0.013, 0.036, 0.029, 'skin']);
    m.push([bone, null, s * 0.236, 0.868, 0.02, 0.016, 0.016, 0.022, 'skin', null, true]); // the wrist
  }
  return m;
}
function fingerTubes(tubes) {
  for (const s of [-1, 1]) {
    const bone = s < 0 ? 'wristR' : 'wristL';
    for (let i = 0; i < 4; i++) {
      const z = -0.002 + i * 0.0135;
      const len = i === 1 || i === 2 ? 0.056 : 0.048;
      tubes.push([bone, s * 0.237, 0.812, z, s * 0.233, 0.812 - len, z + 0.009, 0.0086, 0.0062, 'skin']);
    }
    tubes.push([bone, s * 0.232, 0.84, 0.045, s * 0.226, 0.8, 0.055, 0.0085, 0.006, 'skin']); // the thumb
  }
}

// Junie's face (Nov 26, Aaron's concept art): a 9-year-old's, on the shared head (her ears kept): wide dark eyes
// set low, brows lifted at their inner ends (worried), a small soft nose, a small mouth, the lower lip full.
function JUNIE_FACE() {
  const m = [];
  const f = (x, y, lift, rx, ry, rz, key, turn = null) => m.push(['head', null, x, y, onShared(x, y, lift), rx, ry, rz, key, turn, true]);
  f(0, 1.588, -0.004, 0.0068, 0.014, 0.008, 'skin'); // the nose's bridge, short
  f(0, 1.574, 0.004, 0.0088, 0.0085, 0.0088, 'skin'); // its tip
  for (const s of [-1, 1]) f(s * 0.0095, 1.571, -0.001, 0.0062, 0.0052, 0.0058, 'skin');
  for (const s of [-1, 1]) {
    const x = s * 0.034;
    f(x, 1.602, -0.005, 0.0168, 0.0108, 0.005, 'white', [0, s * 0.3, 0]);
    f(x, 1.6015, -0.0034, 0.0092, 0.0092, 0.004, 'eyes');
    f(x, 1.6118, -0.0018, 0.016, 0.0016, 0.005, 'lid', [0, s * 0.3, 0]);
    f(s * 0.036, 1.626, -0.001, 0.016, 0.0024, 0.006, 'brows', [0, s * 0.3, -s * 0.2]); // lifted at the inner end (rotateZ: -s lifts the inner end)
  }
  f(0, 1.548, -0.0025, 0.0118, 0.0026, 0.004, 'lips');
  f(0, 1.5412, -0.0025, 0.011, 0.0046, 0.0046, 'lips');
  f(0, 1.5448, -0.0013, 0.0122, 0.0009, 0.004, 'lid');
  return m;
}
// Dirt: a smudge field (0..1), patchy.
function smudge(q) {
  const v = Math.sin(q.x * 61 + q.y * 37) * Math.sin(q.y * 53 - q.z * 29) * Math.sin(q.z * 47 + q.x * 23);
  return v * 0.5 + 0.5;
}

// Woollen jumpers (Nov 26, Aaron: "a bit more baggy ... the climate cold and the sweaters woollen"): Wyatt's and
// Junie's. Roomier through the body, which hangs loose past the waist to a thick ribbed hem over the hips;
// sleeves wider, bloused into thick ribbed cuffs; a thick ribbed collar. The knit is a chunky rib painted in
// vertex colours, each part built with a column of vertices for every rib's ridge and every groove (KNIT).
const KNIT = { trunk: 24, sleeve: 10 }; // ribs round the trunk and round a sleeve
const TRUNK_FLAT = 0.73;
// body: hem: { y (the hem's height), r (its half-width at the bottom), top (the body's half-width at the waist) }.
function woolJumper(b, { hemY, hemR, waistR, neckY = 1.462, cuffR = 0.05 }) {
  const trunk = [KNIT.trunk * 2, 10];
  const sleeve = [KNIT.sleeve * 2, 8];
  b.limbs = b.limbs.map((l) => {
    // The trunk a barrel from the chest down (so the chest's own shape sits inside it, no bust or pecs).
    // (Its top broad, so the shoulder line runs out to the sleeves instead of their heads standing up from it.)
    if (l[4] === 'top') return [l[0], l[1], l[2], l[0] === 'spine' ? l[3] * 1.4 : l[3], 'top', l[0] === 'spine' ? 0.22 : (l[5] ?? 0), l[6] ?? 1, l[7] ?? 0, trunk];
    // Dropped shoulders: the sleeve's head no wider than before, the room in it below.
    if (l[4] === 'sleeve') return [l[0], l[1], l[2], l[3] * 1.18, 'sleeve', 0.16, 1, 0.6, sleeve];
    if (l[4] === 'forearm') return [l[0], l[1], l[2] * 1.16, cuffR * 0.94, 'forearm', 0.22, 1, 1.01, sleeve];
    return l;
  });
  for (const m of b.masses) {
    if (m[0] === 'chest' && m[1] === 'spine' && m[8] === 'top') Object.assign(m, { 5: m[5] * 0.94, 7: m[7] * 0.85, 9: m[9] ?? null, 10: false, 11: [KNIT.trunk * 2, 12] });
    if (m[1] === 'shoulderR' || m[1] === 'shoulderL') Object.assign(m, { 3: m[3] - 0.012, 5: m[5] * 0.85, 6: m[6] * 0.8, 7: m[7] * 0.85 }); // dropped, soft shoulders
  }
  // The body hanging loose past the waist, over the hips; its thick ribbed hem.
  // (It starts inside the trunk, narrower than it, and grows out of it: no ledge at the waist.)
  b.tubes.push(['hips', 0, 1.2, 0.004, 0, hemY, 0.004, waistR * 0.84, hemR, 'top', TRUNK_FLAT, 0, [KNIT.trunk * 2, 6]]);
  b.masses.push(['hips', null, 0, hemY + 0.012, 0.004, hemR + 0.006, 0.03, (hemR + 0.006) * TRUNK_FLAT, 'top', null, false, [KNIT.trunk * 2, 6]]);
  // The thick ribbed collar.
  b.masses.push(['neck', 'chest', 0, neckY, 0, 0.072, 0.026, 0.07, 'top', null, false, [KNIT.trunk * 2, 6]]);
  // Thick ribbed cuffs.
  for (const s of [-1, 1]) {
    const n = s < 0 ? 'R' : 'L';
    b.tubes.push([`elbow${n}`, s * 0.2292, 0.928, 0.0177, s * 0.2302, 0.874, 0.0197, cuffR, cuffR * 0.97, 'forearm', 1, 0, [KNIT.sleeve * 2, 2]]);
  }
}
// Where a sleeve's axis runs at height y (the rest pose, the kit's skeleton): its x (unsigned) and z.
function sleeveAxis(y) {
  if (y >= 1.14) return { x: 0.19 + (0.03 * (1.42 - y)) / 0.28, z: 0 };
  const t = Math.min(1, (1.14 - y) / 0.26);
  return { x: 0.22 + 0.01 * t, z: 0.02 * t };
}
// The knit's paint: chunky ribs (a ridge at every other column of vertices), deeper at the collar, hem and cuffs,
// a woolly fleck. Returns true if it painted (a jumper's key).
function woolKnit(key, q, out, hemY) {
  let a;
  let n;
  if (key === 'top') {
    a = Math.atan2(q.x, q.z / TRUNK_FLAT);
    n = KNIT.trunk;
  } else if (key === 'sleeve' || key === 'forearm') {
    const ax = sleeveAxis(q.y);
    a = Math.atan2(Math.abs(q.x) - ax.x, q.z - ax.z);
    n = KNIT.sleeve;
  } else return false;
  const ridge = 0.5 + 0.5 * Math.cos(a * n);
  const band = (key === 'top' && (q.y < hemY + 0.045 || q.y > 1.44)) || (key === 'forearm' && q.y < 0.93);
  out.multiplyScalar(band ? 0.66 + 0.3 * ridge : 0.78 + 0.22 * ridge);
  out.multiplyScalar(0.95 + 0.05 * Math.sin(q.x * 410 + q.y * 290 + q.z * 350)); // flecks of the wool
  return true;
}

const LOOKS = {
  ellen(p) {
    const b = body({ sh: 0.84, hip: 1.12, waist: 0.8, female: true, loose: 1.22, legs: 'fitted' }); // (fitted: under a skirt)
    // Nov 25 (Aaron's concept art): a long olive work coat over a navy skirt, ankle boots, her hair up; no glasses.
    // Nov 26 (the art again, close up): rebuilt to it. Her own face (the shared one's dots and ball nose are
    // replaced: ELLEN_FACE); her hair swept back over her ears from a middle part into a low bun; the coat a
    // deeper forest green, buttoned, with a pointed collar and patch pockets, to the lower thigh; the skirt an
    // A-line to just below the knee; calves; low boots.
    b.masses = b.masses.filter((m) => !(m[0] === 'head' && m[8] !== 'skin') && !(m[0] === 'head' && m[5] < 0.05)); // the shared face's features
    b.masses.push(...ELLEN_FACE());
    for (const m of b.masses) if (m[1] === 'shoulderR' || m[1] === 'shoulderL') Object.assign(m, { 3: m[3] - 0.012, 6: m[6] * 0.8 }); // softer shoulders (they puffed)
    for (const m of b.masses) if (m[0] === 'head' && m[5] > 0.08) Object.assign(m, { 5: HEAD.rx }); // her face a little narrower
    b.limbs = b.limbs.map((l) => (l[0].startsWith('shoulder') ? [l[0], l[1], l[2] * 0.88, l[3] * 0.94, ...l.slice(4)] : l)); // the sleeves' tops slimmer
    // The coat's collar: a band round her neck and its two points turned down on her chest.
    b.masses.push(['neck', 'chest', 0, 1.458, -0.005, 0.07, 0.028, 0.066, 'top']);
    for (const s of [-1, 1]) b.masses.push(['chest', null, s * 0.042, 1.418, 0.088, 0.038, 0.026, 0.005, 'top', [0.3, 0, s * 0.55]]);
    // Five buttons down its front.
    for (const y of [1.36, 1.25, 1.14, 1.03, 0.92]) b.masses.push([y > 1.1 ? 'chest' : 'spine', null, 0.012, y, coatFront(y), 0.009, 0.009, 0.005, 'button']);
    // (Flared tubes: the coat's skirts from the waist to the lower thigh, the skirt under them to below the knee.)
    b.tubes.push(['hips', 0, 0.97, 0.004, 0, 0.41, 0.006, 0.15, 0.2, 'skirt', 0.8, 0, [20, 6]]);
    b.tubes.push(['hips', 0, 1.02, 0.004, 0, 0.6, 0.008, 0.19, 0.218, 'top', 0.8, 0, [28, 8]]);
    // Calves (the shared fitted leg is a plain taper), and low boots, their shafts round the ankle.
    b.limbs = b.limbs.map((l) => (l[0].startsWith('knee') ? [l[0], l[1], 0.05, 0.033, 'trousers', 0.32] : l));
    for (const s of [-1, 1]) b.masses.push([s < 0 ? 'ankleR' : 'ankleL', null, s * 0.1, 0.1, -0.012, 0.04, 0.05, 0.043, 'shoes']);
    // Her hair: over the crown from a middle part, swept back over her ears, gathered low at the back in a bun.
    b.masses.push(hairCap(1.644, -0.02, [0.094, 0.096, 0.102]));
    for (const s of [-1, 1]) {
      b.masses.push(['head', null, s * 0.052, 1.646, 0.05, 0.04, 0.022, 0.03, 'hair', [0.35, 0, s * 0.6]]); // swept from the parting down to the temple, smooth
      b.masses.push(['head', null, s * 0.077, 1.6, -0.025, 0.022, 0.05, 0.068, 'hair', [0.2, 0, -s * 0.12]]); // smooth over the ear, back to the bun
    }
    b.masses.push(['head', null, 0, 1.575, -0.098, 0.044, 0.04, 0.036, 'hair'], ['head', null, 0, 1.578, -0.07, 0.03, 0.012, 0.02, 'tie']);
    b.tubes.push(['head', -0.07, 1.655, 0.065, -0.082, 1.585, 0.06, 0.006, 0.003, 'hair']); // a strand loose by her face
    return {
      ...b,
      paint(key, q, out, c) {
        if (key === 'hair') {
          // Combed back: fine dark lines running front to back, and the parting down the middle.
          if (Math.sin(q.x * 420 + q.y * 30) > 0.6) out.multiplyScalar(0.82);
          if (q.y > 1.66 && q.z > -0.02 && Math.abs(q.x) < 0.005) out.multiplyScalar(0.6);
          return;
        }
        if (key === 'skin') {
          if (q.y > 1.5 && q.z > 0.05) faceShade(q, out, c);
          return;
        }
        if (key !== 'top') return;
        // The coat's front edge, a dark seam; open below the last button on the skirt.
        if (q.z > 0.05 && Math.abs(q.x - 0.004) < 0.004 && q.y < 1.43) out.multiplyScalar(0.62);
        if (q.z > 0.05 && q.y < 0.86 && Math.abs(q.x) < (0.86 - q.y) * 0.16) out.copy(c.skirt);
        // Patch pockets low on its skirts: their edges and flaps, a shade darker.
        const px = Math.abs(q.x);
        if (q.z > 0.05 && px > 0.055 && px < 0.15 && q.y > 0.68 && q.y < 0.82) {
          if (q.y > 0.79 || px < 0.062 || px > 0.143 || q.y < 0.687) out.multiplyScalar(0.72);
        }
        // The grey top showing at her neck.
        if (q.y > 1.44 && q.z > 0.04 && Math.abs(q.x) < 0.03) out.copy(c.under);
      },
    };
  },
  wyatt() {
    const b = body({ sh: 0.96, hip: 0.9, bulk: 0.88, loose: 1.36 }); // Nov 26 (Aaron): baggy, woollen (1.18 was)
    // Nov 25 (Aaron's concept art): a red knit crew-neck jumper (was an open flannel over a T-shirt), its ribbed hem
    // loose over his jeans.
    // Nov 26 (the art again, close up): rebuilt to it. His own face (WYATT_FACE: the shared one's dots and ball
    // nose replaced; his ears kept); a dark mop of hair with a full fringe to his brows, over the tops of his ears;
    // the jumper a regular fit (natural shoulders, a ribbed crew neck, hem and cuffs); slim-hipped, straight-leg
    // jeans, faded on the thighs and knees, a fly and pocket seams; hands with fingers.
    b.masses = b.masses.filter((m) => !(m[0] === 'head' && m[8] !== 'skin') && !(m[0] === 'head' && m[5] < 0.05 && Math.abs(m[2]) < 0.05)); // the shared face's nose, eyes, brows (not the ears)
    b.masses = b.masses.filter((m) => !((m[0] === 'wristR' || m[0] === 'wristL') && m[8] === 'skin')); // the shared paddle hands
    b.masses.push(...WYATT_FACE(), ...hands());
    fingerTubes(b.tubes);
    for (const m of b.masses) if (m[1] === 'shoulderR' || m[1] === 'shoulderL') Object.assign(m, { 3: m[3] - 0.016, 5: m[5] * 0.78, 6: m[6] * 0.7, 7: m[7] * 0.78 }); // natural shoulders (they puffed)
    for (const m of b.masses) if (m[0] === 'hips' && m[8] === 'trousers') Object.assign(m, { 5: 0.152, 7: 0.104 }); // the jeans' seat (inside the jumper)
    // Straight-leg jeans with room in them (Nov 26, Aaron: roomier), not wide at the hip.
    b.limbs = b.limbs.map((l) => (l[0] === 'hipR' || l[0] === 'hipL' ? [l[0], l[1], 0.098, 0.08, 'trousers', 0.03] : l[0] === 'kneeR' || l[0] === 'kneeL' ? [l[0], l[1], 0.078, 0.074, 'trousers', 0] : l));
    // A boy's chest, not a man's: the trunk's swell into the shoulders gentler; the sleeves' heads smaller, so they
    // don't puff above the shoulder.
    b.limbs = b.limbs.map((l) => (l[0] === 'spine' && l[1] === 'neck' ? [...l.slice(0, 5), 0.18, l[6]] : l[0] === 'shoulderR' || l[0] === 'shoulderL' ? [...l.slice(0, 7), 0.7] : l));
    woolJumper(b, { hemY: 0.93, hemR: 0.176, waistR: 0.166 }); // Nov 26: baggy and woollen, the hem over his hips
    // His hair: a mop, a full fringe over his forehead to his brows, over the tops of his ears, fuller on the crown.
    b.masses.push(hairCap(1.632, -0.016, [0.099, 0.104, 0.108]));
    b.masses.push(['head', null, 0, 1.662, 0.072, 0.086, 0.034, 0.046, 'hair', [-0.35, 0, 0]]); // the fringe
    b.masses.push(['head', null, 0, 1.684, -0.01, 0.092, 0.055, 0.1, 'hair']); // the crown, full and rounded
    // The fringe's ragged edge: locks hanging down over his forehead.
    for (const x of [-0.066, -0.044, -0.022, 0, 0.022, 0.044, 0.066]) {
      const len = 0.036 + (Math.abs(x * 1000) % 7) * 0.002;
      tubeOnHead(b.tubes, x, 1.668, x * 1.08 + 0.006, 1.668 - len, 0.011, 0.004, 'hair'); // a little swept to one side
    }
    return {
      ...b,
      paint(key, q, out, c) {
        if (key === 'hair') {
          if (Math.sin(q.x * 380 + q.z * 40) > 0.6) out.multiplyScalar(0.8); // strands
          return;
        }
        if (key === 'skin') {
          if (q.y > 1.5 && q.z > 0.05) socketShade(q, out);
          return;
        }
        if (key === 'trousers') {
          // Faded denim: lighter down the front of the thighs and the knees; the fly; the front pockets' seams.
          if (q.z > 0.02) {
            const fade = Math.max(band(q.y, 0.72, 0.16), band(q.y, 0.5, 0.06) * 0.8) * Math.min(1, (q.z - 0.02) / 0.05);
            out.lerp(c.fade, fade * 0.6);
          }
          if (q.z > 0.06 && q.y > 0.84 && q.y < 0.98 && Math.abs(q.x) < 0.004) out.multiplyScalar(0.65);
          if (q.z > 0.04 && q.y > 0.88 && q.y < 0.99 && Math.abs(Math.abs(q.x) - 0.06 - (0.99 - q.y) * 0.5) < 0.004) out.multiplyScalar(0.7);
          return;
        }
        woolKnit(key, q, out, 0.93); // the chunky rib
      },
    };
  },
  // A Man in Black (the cutscenes; Session 13): a black suit, a white
  // shirt and a thin black tie, sunglasses, short dark hair; hands clasped
  // in front of him.
  mib() {
    const b = body({ sh: 1.05, hip: 1, bulk: 1 });
    b.masses.push(hairCap(1.64, -0.02, [0.093, 0.09, 0.1]));
    for (const s of [-1, 1]) b.masses.push(['head', null, s * 0.034, 1.608, 0.098, 0.026, 0.017, 0.012, 'shades']);
    b.tubes.push(['head', -0.012, 1.612, 0.106, 0.012, 1.612, 0.106, 0.004, 0.004, 'shades']);
    return {
      ...b,
      // The shirt in the jacket's V, the tie down its middle.
      paint(key, q, out, c) {
        if (key !== 'top' || q.z < 0.05) return;
        const v = (q.y - 1.18) * 0.32; // the V narrows downward
        if (q.y > 1.18 && Math.abs(q.x) < v) out.copy(Math.abs(q.x) < 0.012 ? c.tie : c.shirt);
      },
    };
  },
  junie() {
    // Nov 25 (Aaron's concept art): a purple knit jumper, a little big on her (was a hoodie), dark leggings, her
    // hair tied back messily with strands loose round her face.
    // Nov 26 (the art again, close up): rebuilt to it. Her own face (JUNIE_FACE: a child's, wide dark eyes,
    // worried brows, a small nose, a small pouting mouth, dirt on her cheeks; her ears kept); her hair loosely tied
    // back, a messy fringe and strands loose round her face; hands with fingers; the jumper muted and grubby with
    // its ribbed bands; slim charcoal trousers; grey sneakers. She keeps her rabbit (Aaron), held out where it shows.
    const b = body({ sh: 0.92, hip: 0.95, bulk: 1.06, hand: 'skin', legs: 'fitted', loose: 1.3 }); // Nov 26 (Aaron): baggy, woollen
    // Roomier trousers (Nov 26, Aaron; were leggings-fitted).
    b.limbs = b.limbs.map((l) => (l[0] === 'hipR' || l[0] === 'hipL' ? [l[0], l[1], 0.094, 0.074, 'trousers', 0.04] : l[0] === 'kneeR' || l[0] === 'kneeL' ? [l[0], l[1], 0.072, 0.066, 'trousers', 0] : l));
    b.masses = b.masses.filter((m) => !(m[0] === 'head' && m[8] !== 'skin') && !(m[0] === 'head' && m[5] < 0.05 && Math.abs(m[2]) < 0.05)); // the shared face's nose, eyes, brows (not the ears)
    b.masses = b.masses.filter((m) => !((m[0] === 'wristR' || m[0] === 'wristL') && m[8] === 'skin')); // the shared paddle hands
    b.masses.push(...JUNIE_FACE(), ...hands());
    fingerTubes(b.tubes);
    woolJumper(b, { hemY: 0.9, hemR: 0.186, waistR: 0.172, neckY: 1.458 }); // Nov 26: baggy and woollen, a little big on her
    for (const s of [-1, 1]) b.masses.push([s < 0 ? 'ankleR' : 'ankleL', null, s * 0.1, 0.02, 0.06, 0.062, 0.02, 0.13, 'sole']); // the sneakers' soles
    // Her hair: loosely tied back in a low knot, a messy fringe swept across her forehead, strands loose round her face.
    b.masses.push(hairCap(1.633, -0.018, [0.097, 0.1, 0.106]));
    b.masses.push(['head', null, 0, 1.585, -0.1, 0.04, 0.04, 0.035, 'hair'], ['head', null, 0, 1.59, -0.074, 0.026, 0.01, 0.018, 'tie']);
    b.masses.push(['head', null, -0.012, 1.668, 0.07, 0.072, 0.026, 0.04, 'hair', [-0.3, 0, -0.12]]); // the fringe, swept to her left
    for (const [x0, y0, x1, y1, r] of [
      [-0.045, 1.678, -0.012, 1.643, 0.016], [-0.008, 1.682, 0.028, 1.647, 0.015], [-0.062, 1.672, -0.048, 1.64, 0.014], // its locks, messy
      [-0.072, 1.655, -0.086, 1.545, 0.013], [0.072, 1.655, 0.086, 1.555, 0.012], [-0.064, 1.66, -0.075, 1.58, 0.01], [0.066, 1.66, 0.078, 1.59, 0.01], // strands loose by her face
    ])
      tubeOnHead(b.tubes, x0, y0, x1, y1, r, 0.003, 'hair');
    for (const s of [-1, 1]) b.masses.push(['head', null, s * 0.082, 1.585, -0.03, 0.022, 0.062, 0.058, 'hair', [0.25, 0, -s * 0.1]]); // her hair pulled back over her ears
    // Her stuffed rabbit, held out against her chest in both arms: its body, its head above her arms, long ears, a nose.
    b.masses.push(
      ['chest', null, 0, 1.2, 0.205, 0.056, 0.07, 0.046, 'rabbit'],
      ['chest', null, 0, 1.315, 0.215, 0.042, 0.04, 0.038, 'rabbit'],
      ['chest', null, -0.02, 1.385, 0.205, 0.012, 0.048, 0.009, 'rabbit', [0, 0, 0.18]],
      ['chest', null, 0.02, 1.385, 0.205, 0.012, 0.048, 0.009, 'rabbit', [0, 0, -0.18]],
      ['chest', null, -0.015, 1.322, 0.25, 0.0065, 0.0065, 0.004, 'eyes', null, true],
      ['chest', null, 0.015, 1.322, 0.25, 0.0065, 0.0065, 0.004, 'eyes', null, true],
      ['chest', null, 0, 1.305, 0.253, 0.007, 0.005, 0.005, 'nose', null, true],
      ['chest', null, -0.03, 1.14, 0.235, 0.02, 0.016, 0.022, 'rabbit', null, true],
      ['chest', null, 0.03, 1.14, 0.235, 0.02, 0.016, 0.022, 'rabbit', null, true],
    );
    return {
      ...b,
      paint(key, q, out, c) {
        if (key === 'hair') {
          if (Math.sin(q.x * 360 + q.y * 90) > 0.55) out.multiplyScalar(0.8); // strands
          return;
        }
        if (key === 'skin') {
          if (q.y > 1.5 && q.z > 0.05) {
            socketShade(q, out);
            // Dirt on her cheeks and brow.
            if (smudge(q) > 0.62) out.multiplyScalar(0.84);
          }
          return;
        }
        if (!woolKnit(key, q, out, 0.9)) return; // the chunky rib; grubby; a little mark on her chest
        if (smudge(q) > 0.66) out.multiplyScalar(0.85);
        if (key === 'top' && q.z > 0.08 && Math.hypot(q.x - 0.06, q.y - 1.385) < 0.01) out.multiplyScalar(0.6);
      },
    };
  },
  // Session 16: the Pruitts on Earl's trail-cam tape (camera four), alive:
  // Earl as his zombie looks (Session 13: sixties, a faded red trucker cap,
  // a tan work shirt, jeans), and his two kids. Seen only in grainy night
  // vision, so plain.
  earlPruitt() {
    const b = body({ sh: 1.02, hip: 1.04, bulk: 1.1 });
    b.masses.push(hairCap(1.63, -0.02, [0.096, 0.094, 0.104]));
    // The trucker cap: a crown and a peak.
    b.masses.push(['head', null, 0, 1.675, -0.005, 0.104, 0.05, 0.11, 'cap'], ['head', null, 0, 1.652, 0.105, 0.075, 0.012, 0.062, 'cap']);
    return b;
  },
  pruittBoy() {
    const b = body({ sh: 0.94, hip: 0.95, bulk: 1.02 });
    b.masses.push(hairCap(1.635, -0.01, [0.1, 0.1, 0.106]));
    return b;
  },
  pruittGirl() {
    const b = body({ sh: 0.9, hip: 0.95, bulk: 1.05, legs: 'fitted' });
    b.masses.push(hairCap(1.632, -0.012));
    b.tubes.push(['head', 0, 1.63, -0.09, 0, 1.47, -0.12, 0.024, 0.015, 'hair']); // a ponytail
    return b;
  },
  // Nov 24: the campers on their camcorder's tape (clip.camcorder), at their fire at night. Plain, by the fire's
  // light and the camera's lamp: Dan in a beanie and a red flannel, Jess with a ponytail in a puffer jacket,
  // Marcus in a hood, Kyle (holding the camera) in a canvas jacket.
  camperDan() {
    const b = body({ sh: 1.02, hip: 1, bulk: 1.06, loose: 1.15 });
    b.masses.push(hairCap(1.63, -0.02, [0.096, 0.094, 0.104]));
    b.masses.push(['head', null, 0, 1.672, -0.012, 0.104, 0.062, 0.11, 'cap']); // the beanie, pulled down
    return {
      ...b,
      paint(key, q, out) {
        if (key !== 'top' && key !== 'sleeve' && key !== 'forearm') return;
        const lines = (frac(q.x * 20) < 0.3 ? 1 : 0) + (frac(q.y * 20) < 0.3 ? 1 : 0);
        out.multiplyScalar(1 - 0.25 * lines);
      },
    };
  },
  camperJess() {
    const b = body({ sh: 0.86, hip: 1.08, waist: 0.85, female: true, bulk: 1.18, legs: 'fitted' });
    b.masses.push(hairCap(1.632, -0.012));
    b.tubes.push(['head', 0, 1.64, -0.09, 0, 1.46, -0.13, 0.026, 0.016, 'hair']); // a ponytail
    return {
      ...b,
      // The puffer's quilting: bands round her.
      paint(key, q, out) {
        if ((key === 'top' || key === 'sleeve') && frac(q.y * 14) < 0.18) out.multiplyScalar(0.72);
      },
    };
  },
  camperMarcus() {
    const b = body({ sh: 1.06, hip: 0.98, bulk: 1.08, loose: 1.2 });
    b.masses.push(hairCap(1.632, -0.014, [0.094, 0.09, 0.1]));
    b.masses.push(['chest', null, 0, 1.45, -0.11, 0.12, 0.075, 0.08, 'top']); // the hood down his back
    return b;
  },
  // Nov 24: the Hanged at the Pruitts' family plot (ai/Hanged.js): gaunt, in rags gone grey, a noose still on.
  hangedA: () => hangedBody(0),
  hangedB: () => hangedBody(1),
  hangedC: () => hangedBody(2),
  hangedD: () => hangedBody(3), // Nov 25 (Aaron): four, one for each camper (Kyle's)
  camperKyle() {
    const b = body({ sh: 1, hip: 1, bulk: 1.02 });
    b.masses.push(hairCap(1.636, -0.01, [0.1, 0.1, 0.106]));
    return b;
  },
};

// The figure-kit spec for one of them. person: config.family.people[id].
export function familySpec(id, person) {
  const look = LOOKS[id](person);
  const paint = (key, q, out, c) => {
    look.paint?.(key, q, out, c);
    crease(key, q, out);
  };
  return { ...look, paint, height: person.height, width: person.width ?? 1, head: person.head ?? 1, colours: person.colours };
}

// Creases, shaded into the cloth (the rest pose's built space): folds
// across the inside of the elbows and behind the knees, the trousers
// stacking over the shoes, the top gathering where it's tucked or belted.
function crease(key, q, out) {
  let fold = 0;
  if (key === 'sleeve' || key === 'forearm') fold = band(q.y, 1.14, 0.06) * wave(q.y * 160 + q.z * 70);
  else if (key === 'trousers') fold = Math.max(band(q.y, 0.5, 0.06) * wave(q.y * 150 - q.z * 50), band(q.y, 0.1, 0.07) * wave(q.y * 190 + q.x * 40));
  else if (key === 'top') fold = band(q.y, 0.97, 0.06) * wave(Math.atan2(q.x, q.z) * 9) * 0.7;
  if (fold > 0) out.multiplyScalar(1 - 0.16 * fold);
}

// 1 at y = at, fading to 0 at `half` either side.
function band(y, at, half) {
  return Math.max(0, 1 - Math.abs(y - at) / half);
}

// A fold's shading across its width: soft dark lines (0..1).
function wave(x) {
  return Math.max(0, Math.sin(x)) ** 2;
}


function frac(x) {
  return x - Math.floor(x);
}
