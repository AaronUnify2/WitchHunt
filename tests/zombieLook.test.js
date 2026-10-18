import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { atlasBlocks, atlasLayout, paletteTable, zombieLook, hash01, PARTS } from '../src/render/zombieLook.js';
import { ZOMBIE_FRAMES } from '../src/ai/Zombie.js';

const tex = config.zombies.texture;

describe('zombie atlas blocks and layout', () => {
  it('has a block per variant and hairstyle, in order', () => {
    const blocks = atlasBlocks(tex);
    const expected = tex.variantOrder.flatMap((v) => {
      const hairs = tex.hairStyles[v] ?? ['short'];
      return [...hairs.map((hair) => ({ variant: v, hair, bare: false })), ...(tex.looks[v]?.bare ? [{ variant: v, hair: hairs[0], bare: true }] : [])];
    });
    expect(blocks).toEqual(expected);
  });

  it('fits the atlas inside the size limit', () => {
    const blocks = atlasBlocks(tex);
    const bw = tex.frameWidth * ZOMBIE_FRAMES.count;
    const bh = tex.frameHeight * 5; // angles 0-4 stored
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
        expect(blocks[look.block].bare).toBe(false);
        if (look.bare >= 0) expect(blocks[look.bare]).toMatchObject({ variant: v, bare: true });
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
        expect([0, 1, 2]).toContain(look.pattern);
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
      plaid += look.pattern === 1 ? 1 : 0;
    }
    expect(hair.size).toBe(tex.hairStyles.citizen.length);
    expect(shirts.size).toBe(tex.palettes.shirt.length);
    expect(long / n).toBeGreaterThan(tex.looks.citizen.longSleeves - 0.08);
    expect(long / n).toBeLessThan(tex.looks.citizen.longSleeves + 0.08);
    expect(plaid / n).toBeGreaterThan(tex.looks.citizen.plaid - 0.08);
    expect(plaid / n).toBeLessThan(tex.looks.citizen.plaid + 0.08);
  });

  it('gives each zombie its own blood, from light to heavy, mostly light', () => {
    const bb = tex.bodyBlood;
    const seeds = new Set();
    let light = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const look = zombieLook('citizen', seed, tex, blocks, table);
      expect(look.blood).toBeGreaterThanOrEqual(bb.amount[0]);
      expect(look.blood).toBeLessThanOrEqual(bb.amount[1]);
      expect(Number.isInteger(look.bloodSeed)).toBe(true);
      seeds.add(look.bloodSeed);
      if (look.blood < (bb.amount[0] + bb.amount[1]) / 2) light++;
    }
    expect(seeds.size).toBeGreaterThan(400);
    expect(light).toBeGreaterThan(500);
  });

  it('never plaids a uniform; the army always in long sleeves and camouflage, and able to lose its helmet', () => {
    for (let seed = 1; seed < 200; seed++) {
      expect(zombieLook('police', seed, tex, blocks, table).pattern).toBe(0);
      const army = zombieLook('army', seed, tex, blocks, table);
      expect(army.sleeves).toBe(1);
      expect(army.pattern).toBe(2);
      expect(blocks[army.bare]).toMatchObject({ variant: 'army', bare: true });
    }
  });

  it('dresses the dead Men in Black alike: a plain white shirt, long sleeves, its own palettes, no hat to lose', () => {
    const own = table.offsets.mib;
    for (let seed = 1; seed < 200; seed++) {
      const m = zombieLook('mib', seed, tex, blocks, table);
      expect(m.pattern).toBe(0);
      expect(m.sleeves).toBe(1);
      expect(m.bare).toBe(-1);
      expect(blocks[m.block].variant).toBe('mib');
      expect(m.shirt).toBeGreaterThanOrEqual(own.shirt[0]);
      expect(m.shirt).toBeLessThan(own.shirt[0] + own.shirt[1]);
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
