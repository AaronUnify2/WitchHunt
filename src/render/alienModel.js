// The grey alien (Session 13; DESIGN.md "Aliens", "Crashed plane"): the
// crashed plane's lone survivor, and the body every Martian is built on
// (the ship's cowboy kit is added to it later). Built with the figure kit,
// on its own skeleton: about 1.4 m, a huge swept-back cranium on a stalk
// of a neck, a narrow chest, long spindly limbs (the arms reach its
// knees), big black almond eyes with a wet glint, two nose slits, a slit of
// a mouth, three long fingers and a thumb. Smooth grey with a blue-green
// cast, darker down its back. It carries an Earth pump shotgun (the first,
// quiet hint of the cowboy drift: Aaron, Session 13).
//
// The cowboy drift (DESIGN.md "Aliens"; Aaron, Session 13: see the full
// gear now): KIT_STAGES, from the plain grey with its shotgun, through a hat
// and bandana and a gun belt, to the full saloon gunslinger (vest, boots
// and spurs, two holsters). The ship dresses each by how deep it stands.
//
// Built at 1.7 m like every figure-kit spec and scaled to config height.
// Model space: faces +z, feet at y = 0, its right hand on -x.

// The skeleton: [name, parent, x, y, z] (the rest pose: arms hanging).
export const ALIEN_JOINTS = [
  ['root', null, 0, 0, 0],
  ['hips', 'root', 0, 0.9, 0],
  ['spine', 'hips', 0, 1.08, 0],
  ['chest', 'spine', 0, 1.26, 0],
  ['neck', 'chest', 0, 1.36, 0.01],
  ['head', 'neck', 0, 1.44, 0.02],
  ['shoulderR', 'chest', -0.14, 1.32, 0],
  ['elbowR', 'shoulderR', -0.18, 0.98, 0.02],
  ['wristR', 'elbowR', -0.2, 0.64, 0.04],
  ['shoulderL', 'chest', 0.14, 1.32, 0],
  ['elbowL', 'shoulderL', 0.18, 0.98, 0.02],
  ['wristL', 'elbowL', 0.2, 0.64, 0.04],
  ['hipR', 'hips', -0.075, 0.88, 0],
  ['kneeR', 'hipR', -0.08, 0.48, 0.02],
  ['ankleR', 'kneeR', -0.08, 0.07, -0.02],
  ['hipL', 'hips', 0.075, 0.88, 0],
  ['kneeL', 'hipL', 0.08, 0.48, 0.02],
  ['ankleL', 'kneeL', 0.08, 0.07, -0.02],
];

// A hand's fingers: three long ones and a thumb, from its wrist (x mirrored by side).
function hand(side, bone, wx, wy, wz) {
  const tubes = [];
  const masses = [[bone, null, wx, wy - 0.03, wz, 0.022, 0.035, 0.014, 'skin']];
  for (const [dx, len, dz] of [
    [-0.018, 0.16, 0.006],
    [0, 0.18, 0.01],
    [0.018, 0.15, 0.006],
  ]) {
    const x = wx + side * dx;
    tubes.push([bone, x, wy - 0.05, wz, x + side * dx * 0.6, wy - 0.05 - len, wz + dz, 0.008, 0.005, 'skin']);
    masses.push([bone, null, x + side * dx * 0.6, wy - 0.05 - len, wz + dz, 0.009, 0.011, 0.009, 'skin']); // the fingertip's pad
    masses.push([bone, null, x + side * dx * 0.3, wy - 0.05 - len * 0.5, wz + dz * 0.5, 0.0095, 0.012, 0.0095, 'skin']); // a knuckle
  }
  // The thumb, toward the front.
  tubes.push([bone, wx - side * 0.012, wy - 0.035, wz + 0.012, wx - side * 0.03, wy - 0.12, wz + 0.05, 0.008, 0.005, 'skin']);
  return { tubes, masses };
}

// The cowboy drift's stages, each adding to the last.
export const KIT_STAGES = [
  { id: 'plain', name: 'Plain, with a shotgun (the crashed plane)', shotgun: true },
  { id: 'hat', name: 'Hat and bandana', shotgun: true, hat: true, bandana: true },
  { id: 'belt', name: 'Gun belt and holster', shotgun: true, hat: true, bandana: true, belt: true, holsters: 1 },
  { id: 'gunslinger', name: 'Full saloon gunslinger', shotgun: true, hat: true, bandana: true, belt: true, holsters: 2, vest: true, boots: true },
];

// The figure-kit spec. alien: config.aliens.grey; kit: one of KIT_STAGES.
export function alienSpec(alien, kit = KIT_STAGES[0]) {
  const armed = kit.shotgun;
  const masses = [
    // The body: one thin, smooth form (the trunk below carries it; these
    // only shape it: hips, a narrow ribcage, small shoulders).
    ['hips', null, 0, 0.9, 0, 0.088, 0.07, 0.064, 'skin'],
    ['chest', 'spine', 0, 1.21, 0.004, 0.092, 0.11, 0.066, 'skin'],
    ['chest', 'shoulderR', -0.12, 1.305, 0, 0.03, 0.028, 0.03, 'skin'],
    ['chest', 'shoulderL', 0.12, 1.305, 0, 0.03, 0.028, 0.03, 'skin'],
    // The head: a huge cranium swept back, the face narrowing to a small chin.
    ['head', null, 0, 1.6, -0.03, 0.155, 0.15, 0.18, 'skin'],
    ['head', null, 0, 1.52, 0.06, 0.1, 0.1, 0.1, 'skin'],
    ['head', null, 0, 1.445, 0.1, 0.04, 0.04, 0.04, 'skin'],
    // Eyes: big black almonds slanting up and out, a wet glint in each.
    ['head', null, -0.058, 1.535, 0.14, 0.052, 0.026, 0.024, 'eyes', [0, -0.35, -0.42]],
    ['head', null, 0.058, 1.535, 0.14, 0.052, 0.026, 0.024, 'eyes', [0, 0.35, 0.42]],
    ['head', null, -0.07, 1.548, 0.161, 0.008, 0.006, 0.004, 'shine'],
    ['head', null, 0.046, 1.548, 0.163, 0.008, 0.006, 0.004, 'shine'],
    // Two nose slits and a lipless mouth.
    ['head', null, -0.009, 1.477, 0.134, 0.003, 0.008, 0.004, 'slit'],
    ['head', null, 0.009, 1.477, 0.134, 0.003, 0.008, 0.004, 'slit'],
    ['head', null, 0, 1.45, 0.134, 0.022, 0.003, 0.006, 'slit'],
    // Feet: long, thin.
    ['ankleR', null, -0.08, 0.03, 0.05, 0.035, 0.028, 0.085, 'skin'],
    ['ankleL', null, 0.08, 0.03, 0.05, 0.035, 0.028, 0.085, 'skin'],
  ];
  const limbs = [
    // A thin trunk, so the shapes on it blend.
    ['hips', 'spine', 0.085, 0.072, 'skin', 0.05, 0.78],
    ['spine', 'neck', 0.072, 0.045, 'skin', 0.3, 0.78],
    ['neck', 'head', 0.027, 0.03, 'skin', 0, 1],
    // Spindly limbs, knobbly at the joints.
    ['shoulderR', 'elbowR', 0.027, 0.02, 'skin', 0.1],
    ['elbowR', 'wristR', 0.022, 0.016, 'skin', 0.1],
    ['shoulderL', 'elbowL', 0.027, 0.02, 'skin', 0.1],
    ['elbowL', 'wristL', 0.022, 0.016, 'skin', 0.1],
    ['hipR', 'kneeR', 0.04, 0.028, 'skin', 0.15],
    ['kneeR', 'ankleR', 0.03, 0.02, 'skin', 0.2],
    ['hipL', 'kneeL', 0.04, 0.028, 'skin', 0.15],
    ['kneeL', 'ankleL', 0.03, 0.02, 'skin', 0.2],
  ];
  const tubes = [];
  for (const [side, bone, w] of [
    [-1, 'wristR', ALIEN_JOINTS[8]],
    [1, 'wristL', ALIEN_JOINTS[11]],
  ]) {
    const h = hand(side, bone, w[2], w[3], w[4]);
    masses.push(...h.masses);
    tubes.push(...h.tubes);
  }
  if (armed) {
    // The shotgun in its right hand, held low, the barrel pointing ahead
    // (the poses raise it to aim). Barrel, magazine tube, pump, stock.
    const [, , x, y, z] = ALIEN_JOINTS[8];
    const gy = y - 0.09;
    tubes.push(['wristR', x, gy + 0.02, z - 0.05, x, gy + 0.03, z + 0.62, 0.012, 0.012, 'gunMetal']);
    tubes.push(['wristR', x, gy, z, x, gy + 0.008, z + 0.5, 0.011, 0.011, 'gunMetal']);
    masses.push(['wristR', null, x, gy + 0.004, z + 0.3, 0.02, 0.022, 0.06, 'gunWood']); // the pump
    masses.push(['wristR', null, x, gy + 0.012, z - 0.04, 0.022, 0.035, 0.06, 'gunMetal']); // the receiver
    masses.push(['wristR', null, x, gy - 0.012, z - 0.16, 0.017, 0.032, 0.11, 'gunWood', [0.2, 0, 0]]); // the stock
  }
  const rings = [];
  const flat = [Math.PI / 2, 0, 0]; // a ring lying level
  if (kit.hat) {
    // A cowboy hat perched on the huge cranium, tipped back: far too small for it.
    masses.push(['head', null, 0, 1.745, -0.01, 0.15, 0.01, 0.16, 'hat', [-0.22, 0, 0]]); // the brim
    masses.push(['head', null, 0, 1.79, -0.02, 0.075, 0.05, 0.085, 'hat', [-0.22, 0, 0]]); // the crown
    masses.push(['head', null, 0, 1.83, -0.03, 0.03, 0.012, 0.06, 'hatBand', [-0.22, 0, 0]]); // the crease
    rings.push(['head', 0, 1.765, -0.015, 0.076, 0.009, 'hatBand', [Math.PI / 2 - 0.22, 0, 0]]);
  }
  if (kit.bandana) {
    // A red bandana knotted at the neck, its point hanging down the chest.
    rings.push(['neck', 0, 1.37, 0.012, 0.038, 0.016, 'bandana', flat]);
    masses.push(['chest', null, 0, 1.325, 0.05, 0.045, 0.045, 0.012, 'bandana', [0.25, 0, Math.PI / 4]]);
  }
  if (kit.belt) {
    // A gun belt with a buckle, a holstered revolver on each hip it wears one.
    rings.push(['hips', 0, 0.905, 0, 0.082, 0.016, 'leather', flat]);
    masses.push(['hips', null, 0, 0.905, 0.082, 0.022, 0.016, 0.007, 'buckle']);
    for (const side of kit.holsters === 2 ? [-1, 1] : [-1]) {
      masses.push(['hips', null, side * 0.1, 0.83, 0, 0.022, 0.065, 0.032, 'leather']);
      masses.push(['hips', null, side * 0.1, 0.9, -0.012, 0.012, 0.03, 0.018, 'gunWood', [-0.4, 0, 0]]); // the revolver's grip
    }
  }
  if (kit.boots) {
    // Spurs at its heels.
    for (const side of [-1, 1]) rings.push([side < 0 ? 'ankleR' : 'ankleL', side * 0.08, 0.045, -0.045, 0.02, 0.004, 'spur', [0, Math.PI / 2, 0]]);
  }
  return {
    joints: ALIEN_JOINTS,
    masses,
    limbs,
    tubes,
    rings,
    height: alien.height,
    width: 1,
    head: 1,
    colours: alien.colours,
    // Darker down its back; faintly mottled. The gunslinger's vest (open in
    // a V at the front) and boots are painted on.
    paint(key, q, out, c) {
      if (key !== 'skin') return;
      if (kit.vest && q.y > 0.93 && q.y < 1.34 && Math.abs(q.x) < 0.115 && !(q.z > 0.03 && Math.abs(q.x) < (1.34 - q.y) * 0.22)) {
        out.copy(c.vest);
        return;
      }
      if (kit.boots && q.y < 0.3) {
        out.copy(c.boots);
        return;
      }
      if (q.z < -0.02) out.lerp(c.back, Math.min(1, (-0.02 - q.z) * 8));
      const m = Math.sin(q.x * 61 + q.y * 37) * Math.sin(q.y * 53 - q.z * 41);
      out.multiplyScalar(0.93 + 0.07 * m);
    },
  };
}
