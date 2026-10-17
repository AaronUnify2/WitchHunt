import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { atlasBlocks, atlasLayout, paletteTable, zombieLook, hash01, PARTS } from '../src/render/zombieLook.js';
import { ZOMBIE_FRAMES } from '../src/ai/Zombie.js';

const tex = config.zombies.texture;

describe('zombie atlas blocks and layout', () => {
  it('has a block per variant and hairstyle, in order', () => {
    const blocks = atlasBlocks(tex);
    const expected = tex.variantOrder.flatMap((v) => (tex.hairStyles[v] ?? ['short']).map((hair) => ({ variant: v, hair })));
    expect(blocks).toEqual(expected);
  });

  it('fits the atlas inside the size limit', () => {
    const blocks = atlasBlocks(tex);
    const bw = tex.frameWidth * ZOMBIE_FRAMES.count;
    const bh = tex.frameHeight * 8;
    const l = atlasLayout(blocks.length, bw, bh, tex.atlasMaxSize);
    expect(l.width).toBeLessThanOrEqual(tex.atlasMaxSize);
    expect(l.height).toBeLessThanOrEqual(tex.atlasMaxSize);
    expect(l.cols * l.rows).toBeGreaterThanOrEqual(blocks.length);
    expect(l.width).toBe(l.cols * bw);
    expect(l.height).toBe(l.rows * bh);
  });

  it('lays out squarely and never wastes a whole row', () => {
    expect(atlasLayout(1, 1000, 1000, 4096)).toMatchObject({ cols: 1, rows: 1 });
    expect(atlasLayout(4, 1000, 1000, 4096)).toMatchObject({ cols: 2, rows: 2 });
    const l = atlasLayout(6, 1056, 1024, 4096);
    expect(l.cols * l.rows - 6).toBeLessThan(l.cols);
  });
});

describe('zombie palettes', () => {
  it('gives every variant a range of each part inside the table', () => {
    const table = paletteTable(tex);
    for (const v of tex.variantOrder) {
      for (const part of PARTS) {
        const [start, count] = table.offsets[v][part];
        expect(count).toBeGreaterThan(0);
        expect(start + count).toBeLessThanOrEqual(table.colours.length);
      }
    }
  });

  it("uses a variant's own colours where it has them", () => {
    const table = paletteTable(tex);
    const [start, count] = table.offsets.police.shirt;
    expect(table.colours.slice(start, start + count)).toEqual(tex.looks.police.shirt);
  });
});

describe('zombie looks', () => {
  const blocks = atlasBlocks(tex);
  const table = paletteTable(tex);

  it('is the same for the same seed and variant', () => {
    expect(zombieLook('citizen', 42, tex, blocks, table)).toEqual(zombieLook('citizen', 42, tex, blocks, table));
  });

  it("picks one of the variant's own blocks, colours and a build in range", () => {
    for (const v of tex.variantOrder) {
      for (let seed = 1; seed < 300; seed++) {
        const look = zombieLook(v, seed, tex, blocks, table);
        expect(blocks[look.block].variant).toBe(v);
        for (const part of PARTS) {
          const [start, count] = table.offsets[v][part];
          expect(look[part]).toBeGreaterThanOrEqual(start);
          expect(look[part]).toBeLessThan(start + count);
        }
        expect(look.width).toBeGreaterThanOrEqual(tex.build.width[0]);
        expect(look.width).toBeLessThanOrEqual(tex.build.width[1]);
        expect(look.height).toBeGreaterThanOrEqual(tex.build.height[0]);
        expect(look.height).toBeLessThanOrEqual(tex.build.height[1]);
        expect([0, 1]).toContain(look.sleeves);
        expect([0, 1]).toContain(look.plaid);
      }
    }
  });

  it('varies the citizens: every hairstyle, many shirts, both sleeves, some plaid', () => {
    const hair = new Set();
    const shirts = new Set();
    let long = 0;
    let plaid = 0;
    const n = 1000;
    for (let seed = 1; seed <= n; seed++) {
      const look = zombieLook('citizen', seed, tex, blocks, table);
      hair.add(blocks[look.block].hair);
      shirts.add(look.shirt);
      long += look.sleeves;
      plaid += look.plaid;
    }
    expect(hair.size).toBe(tex.hairStyles.citizen.length);
    expect(shirts.size).toBe(tex.palettes.shirt.length);
    expect(long / n).toBeGreaterThan(tex.looks.citizen.longSleeves - 0.08);
    expect(long / n).toBeLessThan(tex.looks.citizen.longSleeves + 0.08);
    expect(plaid / n).toBeGreaterThan(tex.looks.citizen.plaid - 0.08);
    expect(plaid / n).toBeLessThan(tex.looks.citizen.plaid + 0.08);
  });

  it('never plaids a uniform, and the army always wears long sleeves', () => {
    for (let seed = 1; seed < 200; seed++) {
      expect(zombieLook('police', seed, tex, blocks, table).plaid).toBe(0);
      expect(zombieLook('army', seed, tex, blocks, table).sleeves).toBe(1);
    }
  });

  it('hashes evenly into [0, 1)', () => {
    let sum = 0;
    for (let i = 0; i < 5000; i++) {
      const u = hash01(i, 3);
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      sum += u;
    }
    expect(sum / 5000).toBeGreaterThan(0.47);
    expect(sum / 5000).toBeLessThan(0.53);
  });
});
