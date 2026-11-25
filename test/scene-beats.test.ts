import { describe, expect, it } from 'vitest';
import { scene, willowSquare } from 'simutown';

describe('Scene.beats', () => {
  const s = scene({ title: 'Beats', town: willowSquare, timeOfDay: 10 }, (s) => {
    const ana = s.actor('ana', { at: 'cafe.door' });
    const bo = s.actor('bo', { at: 'bakery.door', hidden: true });
    s.title('Beats', 'a test');
    s.together(() => {
      s.camera.pan('square', { duration: 2, zoom: 1 });
      ana.say('Hello!');
      s.caption('Two things at once.');
    });
    bo.show();
    s.timeOfDay(18.5, { duration: 3 });
    s.wait(1);
    s.fadeOut();
  });
  const b = s.beats!;

  it('lists every call with its start, end, actor and a short description', () => {
    expect(b.map((x) => [x.start, x.actor ?? '', x.what])).toEqual([
      [0, 'ana', 'appears at cafe.door'],
      [0, 'bo', 'waits, hidden, at bakery.door'],
      [0, '', 'title "Beats", "a test"'],
      [b[2]!.end, '', 'camera pans to square at zoom 1'],
      [b[2]!.end, 'ana', 'says "Hello!"'],
      [b[2]!.end, '', 'caption "Two things at once."'],
      [b[6]!.start, 'bo', 'shows'],
      [b[6]!.start, '', 'time of day turns to 18:30'],
      [b[6]!.start + 4, '', 'fade out'],
    ]);
  });

  it('gives calls that take time their end, and the last one ends the scene', () => {
    expect(b[3]!.end).toBe(b[3]!.start + 2);
    expect(b[4]!.end).toBeGreaterThan(b[4]!.start);
    expect(b[1]!.end).toBe(b[1]!.start);
    expect(b.at(-1)!.end).toBeCloseTo(s.duration);
  });
});
