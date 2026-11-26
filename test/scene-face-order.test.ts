/**
 * Regression: `a.face(b)` must look at where `b` is in scene time, whichever branch of a
 * `together` was written first. It used to read `b` from the tracks declared so far.
 */
import { describe, expect, it } from 'vitest';
import { defineTown, scene, type Scene } from '../src';

const town = defineTown({
  name: 'face',
  terrain: Array.from({ length: 6 }, () => 'g'.repeat(10)).join('\n'),
  legend: { g: 'grass' },
});

function build(anaFirst: boolean): Scene {
  return scene({ title: 'face', town }, (s) => {
    const ana = s.actor('ana', { at: [5, 2], facing: 'up' });
    const bo = s.actor('bo', { at: [5, 3] });
    const anaTrack = () =>
      s.sequence(() => {
        s.wait(3);
        ana.face(bo);
      });
    const boTrack = () => bo.walkTo([4, 2]);
    s.together(() => {
      if (anaFirst) {
        anaTrack();
        boTrack();
      } else {
        boTrack();
        anaTrack();
      }
    });
    s.wait(1);
  });
}

const anaDir = (sc: Scene) => sc.frame(3.5).actors.find((a) => a.id === 'ana')!.dir;

describe('a.face(actor) inside together', () => {
  it('faces where the other actor is at that moment, whatever the order of the branches', () => {
    expect(anaDir(build(false))).toBe('left');
    expect(anaDir(build(true))).toBe('left'); // Bo has walked to her left by 3 s
  });
});
