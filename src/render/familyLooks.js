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
// ribcage and waist, softer shoulders, wider hips and a bust.
function body({ sh = 1, hip = 1, bulk = 1, waist = 1, female = false, hand = 'skin', top = 'top' }) {
  const cap = female ? 0.056 : 0.068; // the shoulders' caps
  const masses = [
    ['hips', null, 0, 0.95, 0, 0.155 * hip, 0.11, 0.11 * (female ? 1.08 : 1), 'trousers'],
    ['chest', 'spine', 0, 1.31, 0.005, 0.18 * sh * bulk, 0.13, (female ? 0.1 : 0.115) * bulk, top],
    ['chest', 'shoulderR', -0.163 * sh, female ? 1.398 : 1.405, 0, cap * bulk, cap * 0.9, cap * bulk, top],
    ['chest', 'shoulderL', 0.163 * sh, female ? 1.398 : 1.405, 0, cap * bulk, cap * 0.9, cap * bulk, top],
    ['neck', 'chest', 0, 1.475, 0, 0.046, 0.05, 0.046, 'skin'],
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
  if (female) {
    // A modest bust, soft under the clothes.
    for (const s of [-1, 1]) masses.push(['chest', null, s * 0.052, 1.285, 0.072, 0.064, 0.058, 0.052, top]);
  }
  const limbs = [
    // The trunk: an oval from the hips to the shoulders, so the shapes on it
    // blend, pinched at the waist (the spine joint).
    ['hips', 'spine', 0.15 * hip, 0.145 * bulk * waist, top, 0, 0.7], // the shirt hangs over the waistband
    // It narrows into the neck (the chest and the shoulders' caps make the shoulders: no ledge).
    ['spine', 'neck', 0.145 * bulk * waist, 0.085 * bulk, top, female ? 0.25 : 0.4, 0.75],
    ['shoulderR', 'elbowR', 0.047 * bulk, 0.04 * bulk, 'sleeve', 0.1],
    ['elbowR', 'wristR', 0.04 * bulk, 0.03 * bulk, 'forearm', 0.08],
    ['shoulderL', 'elbowL', 0.047 * bulk, 0.04 * bulk, 'sleeve', 0.1],
    ['elbowL', 'wristL', 0.04 * bulk, 0.03 * bulk, 'forearm', 0.08],
    ['hipR', 'kneeR', 0.085 * hip, 0.058, 'trousers', 0.1],
    ['kneeR', 'ankleR', 0.056, 0.04, 'trousers', 0.14],
    ['hipL', 'kneeL', 0.085 * hip, 0.058, 'trousers', 0.1],
    ['kneeL', 'ankleL', 0.056, 0.04, 'trousers', 0.14],
  ];
  return { masses, limbs, tubes: [], rings: [] };
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
  junie() {
    // The hoodie: big on her, the sleeves over her hands, the hood down her back.
    const b = body({ sh: 0.92, hip: 0.95, bulk: 1.15, hand: 'sleeve' });
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
  return { ...look, height: person.height, width: person.width ?? 1, head: person.head ?? 1, colours: person.colours };
}

export const FAMILY_IDS = Object.keys(LOOKS);

function frac(x) {
  return x - Math.floor(x);
}
