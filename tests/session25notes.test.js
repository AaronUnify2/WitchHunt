// Session 25: Aaron's play-through notes (Nov 10), the pure parts.
import { describe, it, expect } from 'vitest';
import { config } from '../src/config.js';
import { lumaOf } from '../src/render/propKit.js';
import { fitText } from '../src/render/RoadNorthProps.js';
import { NightWatch } from '../src/base/NightWatch.js';
import { EnemyManager } from '../src/ai/EnemyManager.js';
import { ZombieBrain } from '../src/ai/ZombieBrain.js';
import gas from '../src/data/gasStation.json';
import cutscenes from '../src/data/cutscenes.json';

describe("Earl's road signs (Session 25)", () => {
  const k = config.map.roadNorth.look;

  it("don't glare under the torch: every paint dull (luma under 0.45)", () => {
    for (const name of ['earlBoard', 'earlInk', 'earlYellow', 'earlYellowInk']) expect(lumaOf(k[name]), name).toBeLessThan(0.45);
    expect(lumaOf(k.earlTint)).toBeLessThan(0.75); // and the board's material darkened on top
  });

  it('fit their lettering inside the board (HOME OF BIGFOOT lost its H and T)', () => {
    let font = '';
    const ctx = {
      set font(f) { font = f; },
      get font() { return font; },
      measureText: (t) => ({ width: t.length * parseInt(font.match(/(\d+)px/)[1], 10) * 0.62 }),
      fillText() {},
    };
    const px = fitText(ctx, 'HOME OF BIGFOOT', 256, 80, 432, 64, 'bold', 'serif');
    expect(px).toBeLessThan(64);
    expect(ctx.measureText('HOME OF BIGFOOT').width).toBeLessThanOrEqual(432);
    expect(fitText(ctx, 'HI', 256, 80, 432, 64, 'bold', 'serif')).toBe(64);
  });
});

describe('the night forecast (Session 25)', () => {
  it('closes on A, and swallows the press so it does not also jump', () => {
    const nw = Object.create(NightWatch.prototype);
    nw.forecastTimer = 10;
    nw.el = { classList: { add() { nw.hidden = true; } } };
    let swallowed = false;
    const input = { wasPressed: (a) => a === 'menuConfirm', swallowHeld: () => (swallowed = true) };
    expect(nw.handleDismiss(input)).toBe(true);
    expect(nw.forecastShowing).toBe(false);
    expect(swallowed).toBe(true);
    expect(nw.hidden).toBe(true);
    expect(nw.handleDismiss(input)).toBe(false); // nothing showing: the press is left alone
    expect(config.nights.forecastSeconds).toBe(14); // the same time up
  });
});

describe('cutscenes and the dead (Session 25)', () => {
  const brain = new ZombieBrain(config.detection, config.zombies.wander ?? { pace: 0.5, waypointReach: 1 }, null, null, { range: () => 0, chance: () => false });
  const zombie = (x, z, mode) => {
    const zb = { x, z, alive: true };
    brain.reset(zb, mode);
    return zb;
  };

  it('as one starts, the dead chasing Tom from afar forget him and go back to their errands', () => {
    const em = Object.create(EnemyManager.prototype);
    em.brain = brain;
    const far = zombie(30, 0, 'linger');
    brain.chase(far, 0, 0, 10);
    const near = zombie(4, 0, 'wander');
    brain.chase(near, 0, 0, 10);
    const authored = zombie(30, 0, 'chase');
    authored.authored = 'gasStation';
    em.living = [far, near, authored];
    expect(em.forgetPlayer({ x: 0, z: 0 }, config.detection.cutsceneForgetBeyond)).toBe(1);
    expect(far.mode).toBe('linger');
    expect(near.mode).toBe('chase');
    expect(authored.mode).toBe('chase');
  });

  it('hears nothing while one plays', () => {
    const em = Object.create(EnemyManager.prototype);
    em.brain = brain;
    em.stats = { notice: 1 };
    em.detCfg = config.detection;
    const zb = zombie(10, 0, 'wander');
    em.living = [zb];
    em.quiet = true;
    expect(em.alert(0, 0, 60)).toBe(0);
    expect(zb.mode).toBe('wander');
    em.quiet = false;
    expect(em.alert(0, 0, 60)).toBe(1);
  });
});

describe('the gas station (Session 25)', () => {
  it('wakes the mutant within about 2 m', () => {
    expect(gas.wake.near).toBeLessThanOrEqual(2);
    expect(gas.wake.aisle).toBeLessThan(3.5);
  });

  it("sweeps round the store's west side (+x), clear of the store and the canopy, to the sign", () => {
    const sweep = cutscenes.cutscenes.find((c) => c.id === 'sweep.gasStation');
    const b = gas.building;
    for (const key of sweep.camera.slice(1, -1)) expect(key.pos[0]).toBeGreaterThan(b.x1 + 2);
    const last = sweep.camera[sweep.camera.length - 1];
    expect(last.pos[2]).toBeGreaterThan(gas.canopy.z1);
    expect(last.look[0]).toBeCloseTo(gas.sign.x, 1);
    expect(last.look[2]).toBeCloseTo(gas.sign.z, 1);
  });

  it("the witch leaves on a rush of wind, not the shriek", () => {
    const w = cutscenes.cutscenes.find((c) => c.id === 'gas.witch');
    const sounds = w.tracks.filter((t) => t.do === 'sfx').map((t) => t.sfx);
    expect(sounds).toContain('witchRush');
    expect(sounds).not.toContain('witchShriek');
  });
});

describe('the tower (Session 25)', () => {
  it('shows the craft, then it zips off before the pan to the smoke', () => {
    const t = cutscenes.cutscenes.find((c) => c.id === 'day1.tower');
    expect(t.actors.find((a) => a.kind === 'ufo')).toBeTruthy();
    expect(t.actors.find((a) => a.kind === 'glow')).toBeFalsy();
    const fly = t.tracks.find((e) => e.do === 'fly');
    const keys = fly.path;
    // Hangs about 2 s, then gone in under a second, accelerating.
    const leave = keys.findIndex((k) => Math.hypot(...k.p) > 5);
    expect(keys[leave - 1].at).toBeGreaterThan(1.8);
    expect(keys[keys.length - 1].at - keys[leave - 1].at).toBeLessThan(1.2);
    const speeds = keys.slice(leave).map((k, i) => Math.hypot(...k.p.map((v, j) => v - keys[leave - 1 + i].p[j])) / (k.at - keys[leave - 1 + i].at));
    for (let i = 1; i < speeds.length; i++) expect(speeds[i]).toBeGreaterThan(speeds[i - 1]);
    const pan = t.tracks.find((e) => e.do === 'lookAt' && e.target === 'campsite');
    expect(pan.at).toBeGreaterThan(keys[keys.length - 1].at);
  });
});

describe('the belted grey (Session 25)', async () => {
  const { alienSpec, KIT_STAGES } = await import('../src/render/alienModel.js');
  it('wears loose trousers from the belt on (not skin tight)', () => {
    for (const kit of KIT_STAGES) {
      const spec = alienSpec(config.aliens.grey, kit);
      const legs = spec.limbs.filter((l) => l[4] === 'trousers');
      expect(legs.length > 0, kit.id).toBe(Boolean(kit.belt));
      const skin = spec.limbs.find((l) => l[0] === 'hipR' && l[4] === 'skin');
      for (const l of legs) expect(l[2]).toBeGreaterThan(skin[2] * 1.4);
    }
    expect(lumaOf(config.aliens.grey.colours.trousers)).toBeLessThan(0.45);
  });
});
