// Nov 24 (Aaron: sweeps for the Pruitt yard (house, yard, scarecrow) and the family plot (ground, sigil, moths, the Hanged)).
import { describe, it, expect } from 'vitest';
import cutscenes from '../src/data/cutscenes.json';
import { validateCutscenes, cutsceneLength } from '../src/story/cutsceneTimeline.js';
import { config } from '../src/config.js';
import { FamilyPlot } from '../src/encounters/FamilyPlot.js';

const by = Object.fromEntries(cutscenes.cutscenes.map((c) => [c.id, c]));

describe('the Pruitt sweeps (Nov 24)', () => {
  it('sweep.farm ends on the scarecrow (its garden spot), torch on, and it looks into the lens', () => {
    const c = by['sweep.farm'];
    const last = c.camera[c.camera.length - 1];
    const [sx, sz] = [-config.pruittFarm.scarecrow.at[0], config.pruittFarm.scarecrow.at[1]]; // (the model's mirrored x)
    expect(Math.hypot(last.look[0] - sx, last.look[2] - sz)).toBeLessThan(0.5);
    const ev = c.tracks.map((t) => t.event);
    expect(ev).toContain('sweep:torch');
    expect(ev).toContain('farm:scarecrowLooks');
    expect(cutsceneLength(c)).toBeGreaterThan(10);
  });

  it('sweep.plot: the tree, the sigil, then a Hanged twitching', () => {
    const c = by['sweep.plot'];
    expect(c).toBeDefined();
    const ev = c.tracks.filter((t) => t.do === 'emit').map((t) => t.event);
    expect(ev).toEqual(['sweep:torch', 'plot:twitch']); // Nov 25: no moths
    // The sigil shot looks at where NightTwo buries it (the plot's frame: it's at -1.5, 2.5 there).
    expect(c.camera.some((k) => Math.hypot(k.look[0] + 1.5, k.look[2] - 2.5) < 0.2)).toBe(true);
    const problems = validateCutscenes([by['sweep.farm'], c], { looks: {}, lineIds: new Set() });
    expect(problems.filter((p) => /unknown event/.test(String(p)))).toEqual([]);
  });

  it('the plot plays it once, as he first comes near, while they still hang', () => {
    const played = [];
    const fp = Object.create(FamilyPlot.prototype);
    Object.assign(fp, {
      pc: config.familyPlot, ready: true, swept: false, demo: null, dead: new Set(),
      plot: { x: 0, z: 0, radius: 18 }, frame: { x: 0, z: 0, fx: 0, fz: 1, rx: 1, rz: 0 },
      player: { position: { x: 0, z: -50 } },
      cutscenes: { active: false, play: (id) => (played.push(id), true) },
      hanged: { list: [{ state: 'hang' }], update() {} },
      model: null, ropeMeshes: null,
    });
    fp.update(0.1, true);
    expect(played).toEqual([]);
    fp.player.position.z = -(config.familyPlot.sweepAt - 1);
    fp.update(0.1, true);
    fp.update(0.1, true);
    expect(played).toEqual(['sweep.plot']);
    expect(fp.saveState().swept).toBe(true);
  });

  it('both start well before their places (Nov 25, Aaron: "I felt like I was already at the place")', () => {
    expect(config.pruittFarm.sweepAt).toBeGreaterThanOrEqual(config.pruittFarm.radius + 15);
    expect(config.familyPlot.sweepAt).toBeGreaterThanOrEqual(45);
    expect(config.pruittFarm.plot.moths).toBe(0); // and the plot's moths are gone
  });
});
