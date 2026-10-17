import { describe, it, expect } from 'vitest';
import { localToWorld, orbitLocal, keysAt, cameraAt, eventsDue, cutsceneLength, validateCutscenes } from '../src/story/cutsceneTimeline.js';
import { config } from '../src/config.js';
import cutsceneData from '../src/data/cutscenes.json';
import dialogueData from '../src/data/dialogue.json';

const near = (a, b) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe('anchor frames', () => {
  it('ahead is -z at yaw 0, and turns with the anchor', () => {
    const a = { x: 10, y: 2, z: 20, yaw: 0 };
    expect(localToWorld(a, [0, 1, 5])).toEqual({ x: 10, y: 3, z: 15 });
    expect(localToWorld(a, [3, 0, 0])).toEqual({ x: 13, y: 2, z: 20 });
    const turned = localToWorld({ ...a, yaw: Math.PI / 2 }, [0, 0, 5]); // facing -x
    near(turned.x, 5);
    near(turned.z, 20);
  });

  it('an orbit at angle 0 sits ahead of the anchor, looking back at it', () => {
    const o = orbitLocal({ radius: 10, height: 4, angle: 0, lookY: 1 });
    near(o.pos[0], 0);
    expect(o.pos[1]).toBe(4);
    near(o.pos[2], 10);
    expect(o.look).toEqual([0, 1, 0]);
  });
});

describe('camera keys', () => {
  const keys = [
    { at: 0, anchor: 'a', pos: [0, 0, 0], look: [0, 0, 10], fov: 40 },
    { at: 2, anchor: 'a', pos: [10, 0, 0], look: [0, 0, 10] },
    { at: 3, anchor: 'b', pos: [5, 5, 5], look: [0, 0, 0], cut: true },
  ];

  it('eases between keys, holds before and after', () => {
    expect(cameraAt(keys, -1).pos).toEqual([0, 0, 0]);
    const mid = cameraAt(keys, 1);
    near(mid.pos[0], 5); // smoothstep at halfway is halfway
    expect(cameraAt(keys, 0.5).pos[0]).toBeLessThan(2.5); // eased in
    expect(cameraAt(keys, 2.5).pos).toEqual([10, 0, 0]); // holds until the cut
    expect(cameraAt(keys, 3).anchor).toBe('b');
    expect(cameraAt(keys, 99).pos).toEqual([5, 5, 5]);
    expect(cameraAt(keys, 1).fov).toBe(40); // carried over
  });

  it('a cut, another anchor, or the other kind of key jumps', () => {
    expect(keysAt([{ at: 0, pos: [0, 0, 0] }, { at: 1, pos: [1, 0, 0], cut: true }], 0.5).k).toBe(0);
    expect(keysAt([{ at: 0, pos: [0, 0, 0] }, { at: 1, orbit: { radius: 1, height: 1 } }], 0.5).k).toBe(0);
  });

  it('orbits sweep round by angle', () => {
    const sweep = [
      { at: 0, orbit: { radius: 10, height: 2, angle: 0 } },
      { at: 1, orbit: { radius: 10, height: 2, angle: 180 } },
    ];
    const half = cameraAt(sweep, 0.5);
    near(Math.hypot(half.pos[0], half.pos[2]), 10); // on the circle, not cutting across it
  });
});

describe('events and length', () => {
  const tracks = [{ at: 0, do: 'a' }, { at: 1, do: 'b' }, { at: 2.5, do: 'c', seconds: 2 }];

  it('fires each event once as time passes it', () => {
    expect(eventsDue(tracks, -1e-6, 0).map((e) => e.do)).toEqual(['a']);
    expect(eventsDue(tracks, 0, 1).map((e) => e.do)).toEqual(['b']);
    expect(eventsDue(tracks, 1, 2)).toEqual([]);
    expect(eventsDue(tracks, 0, 3).map((e) => e.do)).toEqual(['b', 'c']);
  });

  it('runs to its duration, else its last key or event', () => {
    expect(cutsceneLength({ duration: 7, tracks })).toBe(7);
    expect(cutsceneLength({ tracks, camera: [{ at: 3 }] })).toBe(4.5);
  });
});

describe('the cutscenes file', () => {
  const list = cutsceneData.cutscenes;
  const lineIds = new Set(dialogueData.lines.map((l) => l.id));

  it('is valid: styles, looks, events, lines and actors all exist', () => {
    expect(validateCutscenes(list, { looks: config.postFX.looks, lineIds })).toEqual([]);
  });

  it("has DESIGN.md's planned clips, the final battle's intro and the ending", () => {
    const ids = list.map((c) => c.id);
    for (const id of ['opening.coldOpen', 'clip.camcorder', 'clip.night1', 'sweep.arrival', 'clip.fifthSigil', 'clip.dogfight', 'clip.mothmanContainer', 'clip.programme', 'scene.hutExplodes', 'final.intro', 'ending.victory', 'ending.defeat', 'clip.sighting']) {
      expect(ids).toContain(id);
    }
  });

  it('every style is used: CCTV, first person, the establishing sweep', () => {
    const styles = new Set(list.map((c) => c.style));
    for (const s of ['cctv', 'firstPerson', 'sweep']) expect(styles.has(s)).toBe(true);
  });

  it('the final battle intro lasts as long as the battle expects', () => {
    expect(list.find((c) => c.id === 'final.intro').duration).toBe(config.finalBattle.introSeconds);
  });

  it('catches mistakes', () => {
    const bad = [
      { id: 'x', name: 'X', style: 'cctv', look: 'nope', camera: [{ at: 1 }, { at: 0 }], tracks: [{ at: 0, do: 'dance' }, { at: 0, do: 'line', line: 'missing' }, { at: 0, do: 'move', actor: 'ghost' }] },
      { id: 'x', style: 'weird' },
    ];
    const p = validateCutscenes(bad, { looks: config.postFX.looks, lineIds });
    for (const bit of ['unknown look', 'out of order', 'unknown event dance', 'no dialogue line missing', 'no actor ghost', 'duplicate', 'unknown style', 'no name', 'no camera keys']) {
      expect(p.some((m) => m.includes(bit))).toBe(true);
    }
  });
});
