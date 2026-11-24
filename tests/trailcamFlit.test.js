// Nov 24 (Aaron: "in the trail cam cutscenes ... the witch moves in that flitting way that she does in the campers'
// found footage"): every trail cam clip with her has her afterimages on before she moves, and her moves are bursts.
import { describe, it, expect } from 'vitest';
import cutscenes from '../src/data/cutscenes.json';

const clips = cutscenes.cutscenes.filter((c) => c.look === 'trailcam' && c.actors.some((a) => a.look === 'witch'));

describe('the witch flits on the trail cams (Nov 24)', () => {
  it('finds the four clips', () => {
    expect(clips.map((c) => c.id).sort()).toEqual(['clip.fifthSigil', 'clip.night1', 'clip.pruittTape', 'clip.sighting']);
  });
  for (const c of clips) {
    it(`${c.id}: smeared, in bursts, with the dash's sound`, () => {
      const her = c.actors.find((a) => a.look === 'witch').id;
      const smear = c.tracks.find((t) => t.do === 'smear' && t.actor === her);
      const moves = c.tracks.filter((t) => t.do === 'move' && t.actor === her);
      expect(smear).toBeDefined();
      expect(moves.length).toBeGreaterThanOrEqual(2);
      for (const m of moves) {
        expect(m.at).toBeGreaterThanOrEqual(smear.at);
        expect(m.seconds).toBeLessThanOrEqual(0.25);
      }
      expect(c.tracks.filter((t) => t.do === 'sfx' && t.sfx === 'witchDash').length).toBeGreaterThanOrEqual(2);
    });
  }
});
