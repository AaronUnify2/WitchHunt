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

function body({ sh = 1, hip = 1, bulk = 1, waist = 1, female = false, hand = 'skin', top = 'top', legs = 'loose' }) {
  const cap = female ? 0.056 : 0.068; // the shoulders' caps
  const w = 1 - (1 - waist) * EASE.waist; // the waist under a loose top
  const g = EASE.girth;
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
    ['shoulderR', 'elbowR', 0.047 * bulk, 0.051 * bulk, 'sleeve', 0.07, 1, 0.9],
    ['elbowR', 'wristR', 0.049 * bulk, 0.043 * bulk, 'forearm', 0.02],
    ['shoulderL', 'elbowL', 0.047 * bulk, 0.051 * bulk, 'sleeve', 0.07, 1, 0.9],
    ['elbowL', 'wristL', 0.049 * bulk, 0.043 * bulk, 'forearm', 0.02],
  ];
  if (legs === 'fitted') {
    for (const s of ['R', 'L']) limbs.push([`hip${s}`, `knee${s}`, 0.085 * hip, 0.058, 'trousers', 0.1], [`knee${s}`, `ankle${s}`, 0.056, 0.04, 'trousers', 0.14]);
  } else {
    // Straight-cut legs, the hems sitting over the shoes.
    for (const s of ['R', 'L']) limbs.push([`hip${s}`, `knee${s}`, 0.092 * hip, 0.07, 'trousers', 0.03], [`knee${s}`, `ankle${s}`, 0.068, 0.062, 'trousers', 0]);
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
function hairCap(y = 1.632, z = -0.016, r = [0.097, 0.1, 0.104]) {
  return ['head', null, 0, y, z, r[0], r[1], r[2], 'hair'];
}

const LOOKS = {
  ellen(p) {
    const b = body({ sh: 0.84, hip: 1.12, waist: 0.8, female: true });
    b.masses.push(hairCap(), ['head', null, 0, 1.57, -0.112, 0.034, 0.07, 0.034, 'hair'], ['head', null, 0, 1.605, -0.1, 0.022, 0.02, 0.022, 'tie']);
    // Thin wire glasses: two rims and a bridge.
    b.rings.push(['head', -0.034, 1.608, 0.104, 0.021, 0.0032, 'frames'], ['head', 0.034, 1.608, 0.104, 0.021, 0.0032, 'frames']);
    b.tubes.push(['head', -0.013, 1.61, 0.106, 0.013, 1.61, 0.106, 0.003, 0.003, 'frames']);
    return {
      ...b,
      // The fleece: zipped up the front, the grey top showing at the collar.
      paint(key, q, out, c) {
        if (key !== 'top') return;
        if (q.z > 0.05 && Math.abs(q.x) < 0.006) out.copy(c.zip);
        else if (q.y > 1.43 && q.z > 0.04 && Math.abs(q.x) < 0.04) out.copy(c.under);
      },
    };
  },
  wyatt() {
    const b = body({ sh: 0.98, hip: 0.95, bulk: 0.92 });
    b.masses.push(hairCap(1.638, -0.008, [0.099, 0.098, 0.108]));
    // Messy tufts.
    for (const [x, y, z, r] of [
      [-0.05, 1.7, 0.05, 0.022],
      [0.03, 1.71, 0.03, 0.024],
      [0.07, 1.68, 0.06, 0.02],
      [-0.07, 1.67, -0.02, 0.022],
      [0.01, 1.7, -0.06, 0.023],
      [0.0, 1.675, 0.09, 0.02],
    ])
      b.masses.push(['head', null, x, y, z, r, r * 0.8, r, 'hair']);
    return {
      ...b,
      // The flannel's plaid; open down the front over the band T-shirt (a pale print on its chest).
      paint(key, q, out, c) {
        if (key !== 'top' && key !== 'sleeve' && key !== 'forearm') return;
        if (key === 'top' && q.z > 0.035 && Math.abs(q.x) < 0.06) {
          out.copy(Math.abs(q.x) < 0.022 && q.y > 1.27 && q.y < 1.32 && q.z > 0.09 ? c.print : c.tee);
          return;
        }
        const lines = (frac(q.x * 22) < 0.28 ? 1 : 0) + (frac(q.y * 22) < 0.28 ? 1 : 0) + (frac(q.z * 22) < 0.28 ? 0.5 : 0);
        out.multiplyScalar(1 - 0.22 * Math.min(2, lines));
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
    // The hoodie: big on her, the sleeves over her hands, the hood down her back.
    const b = body({ sh: 0.92, hip: 0.95, bulk: 1.15, hand: 'sleeve', legs: 'fitted' });
    b.masses.push(['chest', null, 0, 1.44, -0.105, 0.11, 0.07, 0.075, 'top']);
    b.masses.push(hairCap(1.63, -0.012));
    // Two braids down her back, tied.
    for (const s of [-1, 1]) {
      b.tubes.push(['head', s * 0.07, 1.57, -0.05, s * 0.085, 1.39, -0.06, 0.021, 0.016, 'hair']);
      b.masses.push(['head', null, s * 0.085, 1.385, -0.06, 0.018, 0.014, 0.018, 'tie']);
    }
    // Her stuffed rabbit, held to her chest.
    b.masses.push(
      ['chest', null, 0, 1.22, 0.175, 0.05, 0.065, 0.042, 'rabbit'],
      ['chest', null, 0, 1.31, 0.18, 0.04, 0.038, 0.036, 'rabbit'],
      ['chest', null, -0.017, 1.37, 0.175, 0.011, 0.042, 0.009, 'rabbit'],
      ['chest', null, 0.017, 1.37, 0.175, 0.011, 0.042, 0.009, 'rabbit'],
      ['chest', null, -0.014, 1.315, 0.214, 0.006, 0.006, 0.004, 'eyes'],
      ['chest', null, 0.014, 1.315, 0.214, 0.006, 0.006, 0.004, 'eyes'],
    );
    return {
      ...b,
      // The hoodie's front pocket.
      paint(key, q, out) {
        if (key === 'top' && q.z > 0.06 && q.y > 1.0 && q.y < 1.12 && Math.abs(q.x) < 0.09) out.multiplyScalar(0.82);
      },
    };
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
