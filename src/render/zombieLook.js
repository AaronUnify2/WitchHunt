// Zombie looks (pure; Session 13, #144). The sprites are a palette swap:
// the atlas paints shirts, trousers, hair and skin in grey and a mask says
// which is which, so each zombie is coloured in as it's drawn, all in one
// draw call. A look is what one zombie wears: its atlas block (variant and
// hairstyle: a hairstyle changes the outline, so each has its own block),
// four palette colours, long or short sleeves, plaid or plain, and its
// build (a little wider or taller). Looks are cosmetic: hashed from the
// zombie's look seed, never the game's random numbers.

// The atlas's blocks, in order: one per variant and hairstyle
// (texture.hairStyles). [{ variant, hair }].
export function atlasBlocks(tex) {
  const blocks = [];
  for (const variant of tex.variantOrder) {
    for (const hair of tex.hairStyles[variant] ?? ['short']) blocks.push({ variant, hair });
  }
  return blocks;
}

// How the blocks sit in the atlas: a grid no taller than maxSize (so it
// loads on any tablet), as square as it can be. Each block is
// frames x 8 rows of frameWidth x frameHeight.
export function atlasLayout(blockCount, blockWidth, blockHeight, maxSize) {
  let best = null;
  for (let cols = 1; cols <= Math.max(1, blockCount); cols++) {
    const rows = Math.ceil(blockCount / cols);
    const width = cols * blockWidth;
    const height = rows * blockHeight;
    const fits = width <= maxSize && height <= maxSize;
    const score = (fits ? 0 : 1e9) + Math.abs(width - height) + (width * height) / 1e6; // fits, then square, then small
    if (!best || score < best.score) best = { cols, rows, width, height, score };
  }
  const { cols, rows, width, height } = best;
  return { cols, rows, width, height };
}

// Every palette colour in one list (the shader's table), and where each
// variant's lists start in it: { colours: [hex], offsets: { variant: {
// shirt: [start, count], trousers, hair, skin } } }. A variant's own list
// (texture.looks[variant].shirt...) replaces the shared one.
export function paletteTable(tex) {
  const colours = [];
  const offsets = {};
  const shared = {};
  const add = (list) => {
    const start = colours.length;
    colours.push(...list);
    return [start, list.length];
  };
  for (const part of PARTS) shared[part] = add(tex.palettes[part]);
  for (const variant of tex.variantOrder) {
    const own = tex.looks[variant] ?? {};
    offsets[variant] = {};
    for (const part of PARTS) offsets[variant][part] = own[part] ? add(own[part]) : shared[part];
  }
  return { colours, offsets };
}

export const PARTS = ['shirt', 'trousers', 'hair', 'skin'];

// One zombie's look from its variant and seed. blocks: atlasBlocks();
// table: paletteTable(). Returns { block, shirt, trousers, hair, skin
// (indices into the table), sleeves (1 long, 0 short), plaid (0 / 1),
// blood (0..1, how bloody), bloodSeed (its pattern), width, height
// (scales) }. out: an object to fill (no allocation).
export function zombieLook(variant, seed, tex, blocks, table, out = {}) {
  const look = tex.looks[variant] ?? {};
  const offsets = table.offsets[variant] ?? table.offsets[tex.variantOrder[0]];
  const r = (k) => hash01(seed, k);
  // Its block: one of the variant's hairstyles (the first block if none).
  let first = -1;
  let count = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].variant !== variant) continue;
    if (first < 0) first = i;
    count++;
  }
  out.block = first < 0 ? 0 : first + Math.floor(r(1) * count);
  out.shirt = pick(offsets.shirt, r(2));
  out.trousers = pick(offsets.trousers, r(3));
  out.hair = pick(offsets.hair, r(4));
  out.skin = pick(offsets.skin, r(5));
  out.sleeves = r(6) < (look.longSleeves ?? 0.5) ? 1 : 0;
  out.plaid = r(7) < (look.plaid ?? 0) ? 1 : 0;
  // How bloody (skewed toward lightly) and its blood's pattern.
  const bb = tex.bodyBlood;
  out.blood = bb.amount[0] + (bb.amount[1] - bb.amount[0]) * Math.pow(r(10), bb.skew);
  out.bloodSeed = Math.floor(r(11) * bb.seeds);
  const b = tex.build;
  out.width = b.width[0] + (b.width[1] - b.width[0]) * r(8);
  out.height = b.height[0] + (b.height[1] - b.height[0]) * r(9);
  return out;
}

function pick([start, count], u) {
  return start + Math.min(count - 1, Math.floor(u * count));
}

// A number in [0, 1) from a seed and a key (cosmetic only).
export function hash01(seed, key) {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(key + 1, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
