/** Light and overlays: the time-of-day grade, shadows, lamps, emissive layers, focus, annotations, fade. */
import { describe, expect, it } from 'vitest';
import { Surface } from '../src/core/surface';
import type { FrameState, Town } from '../src/core/types';
import { createRenderer } from '../src/render';
import { conditionAt, lampsAt } from '../src/render/conditions';
import { actor, block, colorOf, frameState, kitArt, kitTown, luma, lut, pixel } from '../tools/render-testkit';

const W = 96;
const H = 64;
const quiet = { art: kitArt(), warn: () => {} };

function render(town: Town, extra: Partial<FrameState> = {}, opts: object = {}): Surface {
  const out = new Surface(W, H);
  createRenderer(town, { ...quiet, ...opts }).render(frameState(48, 32, extra), out);
  return out;
}

/** How many pixels differ between two frames. */
function diff(a: Surface, b: Surface): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++;
  }
  return n;
}

/** The distinct colours inside a rectangle. */
function colours(s: Surface, x0: number, y0: number, x1: number, y1: number): Set<string> {
  const set = new Set<string>();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set.add(pixel(s, x, y).join());
  return set;
}

const plain = kitTown(8, 6);
// the lamp's pole covers x 38..41, y 0..31; its light is at (40, 4) and pools on the ground around (40, 40)
const lit = kitTown(8, 6, 'stone', {}, [{ kind: 'lamp', tx: 2, ty: 1 }]);

describe('time of day', () => {
  it('leaves the art exactly as drawn in daylight', () => {
    for (const timeOfDay of [9, 12, 14.5, 16]) {
      expect(conditionAt(timeOfDay, lut).identity).toBe(true);
      const out = render(plain, { timeOfDay, actors: [actor('a', 'red', 40, 40)] });
      expect(pixel(out, 80, 10)).toEqual(colorOf('steel.3'));
      expect(pixel(out, 40, 30)).toEqual(colorOf('brick.1'));
    }
  });

  it('has a warm golden hour, a blue dusk and a deep but readable night', () => {
    const at = (timeOfDay: number): number[] => pixel(render(plain, { timeOfDay }), 80, 10);
    const [noon, golden, dusk, night] = [12, 18, 19.5, 23].map(at) as [number[], number[], number[], number[]];
    expect(golden[0]! - golden[2]!).toBeGreaterThan(noon[0]! - noon[2]!);
    expect(dusk[2]! - dusk[0]!).toBeGreaterThan(noon[2]! - noon[0]!);
    expect(luma(dusk)).toBeLessThan(luma(noon));
    expect(luma(night)).toBeLessThan(luma(dusk));
    expect(luma(night)).toBeGreaterThan(luma(noon) * 0.25);
  });

  it('wraps around midnight without a jump', () => {
    expect(conditionAt(24, lut).mul).toEqual(conditionAt(0, lut).mul);
    expect(conditionAt(-1, lut).mul).toEqual(conditionAt(23, lut).mul);
    expect(conditionAt(25, lut).mul).toEqual(conditionAt(1, lut).mul);
  });

  it('lights the lamps from about 17:30 to 06:30', () => {
    expect([12, 7, 17.4].map(lampsAt)).toEqual([0, 0, 0]);
    expect([18, 23, 0, 3, 6].map(lampsAt)).toEqual([1, 1, 1, 1, 1]);
    expect(lampsAt(17.6)).toBeGreaterThan(0);
    expect(lampsAt(17.6)).toBeLessThan(1);
  });

  it('can be switched off', () => {
    const out = render(lit, { timeOfDay: 23, actors: [actor('a', 'red', 60, 50)] }, { lighting: false });
    expect(colours(out, 44, 34, 96, 64)).toEqual(new Set([colorOf('steel.3').join(), colorOf('brick.1').join()]));
  });
});

describe('shadows', () => {
  // the post covers x 32..47, y 0..31 and stands on the line y = 32
  const town = kitTown(8, 6, 'stone', {}, [{ kind: 'post', tx: 2, ty: 1 }]);

  it('fall on the ground beside props and actors, in one flat tone', () => {
    const out = render(town, { actors: [actor('a', 'red', 76, 30)] });
    expect(luma(pixel(out, 42, 36))).toBeLessThan(luma(colorOf('steel.3')));
    expect(luma(pixel(out, 78, 32))).toBeLessThan(luma(colorOf('steel.3')));
    expect(pixel(out, 78, 32)).toEqual(pixel(out, 42, 36));
    expect(pixel(out, 10, 60)).toEqual(colorOf('steel.3'));
    expect(colours(out, 0, 32, 96, 64).size).toBe(2);
  });

  it('never darken a sprite', () => {
    const out = render(town, { actors: [actor('a', 'red', 44, 44)] }); // standing in the post's shadow
    expect(colours(out, 36, 20, 52, 44)).toEqual(new Set([colorOf('brick.1').join()]));
  });

  it('are long at golden hour and short at noon', () => {
    // how far right of the post (which ends at x = 47) its shadow reaches on the ground
    const reach = (timeOfDay: number): number => {
      const [a, b] = [render(town, { timeOfDay }), render(plain, { timeOfDay })];
      let x = W - 1;
      while (x > 47 && [...Array(H - 32).keys()].every((y) => pixel(a, x, 32 + y).join() === pixel(b, x, 32 + y).join())) x--;
      return x - 47;
    };
    expect(reach(12)).toBeGreaterThan(2);
    expect(reach(18)).toBeGreaterThan(reach(12) * 3);
    expect(conditionAt(18, lut).shadowKx).toBeGreaterThan(conditionAt(12, lut).shadowKx * 2);
    expect(conditionAt(9, lut).shadowKx).toBeLessThan(0); // the morning sun is on the other side
  });

  it('fade with the actor', () => {
    const shade = (opacity: number): number => luma(pixel(render(plain, { actors: [actor('a', 'red', 40, 30, { opacity })] }), 42, 32));
    expect(shade(1)).toBeLessThan(shade(0.5));
    expect(shade(0.5)).toBeLessThan(shade(0));
  });
});

describe('lamps', () => {
  it('warm and brighten the ground near them at night, in dithered bands', () => {
    const out = render(lit, { timeOfDay: 23 });
    const near = pixel(out, 44, 40);
    const far = pixel(out, 92, 2);
    expect(luma(near)).toBeGreaterThan(luma(far) * 1.5);
    expect(near[0]! - near[2]!).toBeGreaterThan(far[0]! - far[2]!);
    expect(colours(out, 0, 32, 96, 64).size).toBeGreaterThan(3);
    expect(render(lit, { timeOfDay: 12 }).data).toEqual(render(lit, { timeOfDay: 12 }, { art: { ...kitArt(), props: { ...kitArt().props, lamp: { ...kitArt().props.lamp!, lights: [] } } } }).data);
  });

  it('show emissive pixels at full palette brightness, only when lit', () => {
    expect(pixel(render(lit, { timeOfDay: 23 }), 39, 3)).toEqual(colorOf('ochre.3'));
    expect(pixel(render(lit, { timeOfDay: 12 }), 39, 3)).toEqual(colorOf('steel.1'));
  });

  it('hide emissive pixels behind whatever stands in front', () => {
    const art = kitArt();
    art.props.window = { id: 'window', sprite: block('cream.1', 16, 16, [0, 16]), emissive: block('ochre.2', 16, 16, [0, 16]) };
    const town = kitTown(8, 6, 'stone', {}, [{ kind: 'window', tx: 2, ty: 2 }]); // covers x 32..47, y 32..47
    const out = render(town, { timeOfDay: 23, actors: [actor('a', 'red', 44, 50)] }, { art }); // covers x 36..51
    expect(pixel(out, 33, 40)).toEqual(colorOf('ochre.2'));
    expect(pixel(out, 40, 40)).not.toEqual(colorOf('ochre.2'));
  });

  it('light a person with one flat value, warmer the closer they stand', () => {
    const person = (x: number, y: number): Surface => render(lit, { timeOfDay: 23, actors: [actor('a', 'red', x, y)] });
    const near = person(60, 44);
    expect(colours(near, 52, 20, 68, 44).size).toBe(1);
    const far = person(88, 28);
    const [a, b] = [pixel(near, 60, 30), pixel(far, 88, 14)];
    expect(luma(a)).toBeGreaterThan(luma(b));
    expect(a[0]! - a[2]!).toBeGreaterThan(b[0]! - b[2]!);
  });

  it('let people cast shadows away from the lamp', () => {
    const empty = render(lit, { timeOfDay: 23 });
    const withActor = render(lit, { timeOfDay: 23, actors: [actor('a', 'red', 56, 44)] });
    // down and to the right of the feet, on the far side from the lamp
    expect(luma(pixel(withActor, 62, 49))).toBeLessThan(luma(pixel(empty, 62, 49)));
    // the same distance on the lamp's side is untouched
    expect(pixel(withActor, 30, 49)).toEqual(pixel(empty, 30, 49));
  });
});

describe('focus, annotations and fade', () => {
  const pair = [actor('a', 'red', 30, 40), actor('b', 'blue', 70, 40)];

  it('dims everything except the focused actors', () => {
    const out = render(plain, { actors: pair, focus: { actors: ['a'], amount: 1 } });
    expect(pixel(out, 30, 30)).toEqual(colorOf('brick.1'));
    expect(luma(pixel(out, 70, 30))).toBeLessThan(luma(colorOf('teal.1')));
    expect(luma(pixel(out, 90, 60))).toBeLessThan(luma(colorOf('steel.3')));
    const off = render(plain, { actors: pair, focus: { actors: ['a'], amount: 0 } });
    expect(off.data).toEqual(render(plain, { actors: pair }).data);
  });

  it('draws a ring on the ground under an actor, growing with progress', () => {
    const ring = (progress: number, slot?: 'teal.1'): Surface =>
      render(plain, { actors: [actor('a', 'red', 48, 40)], annotations: [{ kind: 'ring', actor: 'a', progress, ...(slot ? { slot } : {}) }] }, { lighting: false });
    const full = ring(1);
    expect(pixel(full, 59, 38)).toEqual(colorOf('cream.2')); // the ring's right-hand tip
    expect(pixel(full, 48, 43)).toEqual(colorOf('cream.2')); // its front
    expect(pixel(full, 48, 33)).toEqual(colorOf('brick.1')); // its back is hidden by the actor
    expect(pixel(ring(1, 'teal.1'), 59, 38)).toEqual(colorOf('teal.1'));
    const none = render(plain, { actors: [actor('a', 'red', 48, 40)] }, { lighting: false });
    expect(diff(ring(0), none)).toBe(0);
    expect(diff(ring(0.5), none)).toBeGreaterThan(0);
    expect(diff(ring(0.5), none)).toBeLessThan(diff(full, none));
  });

  it('draws a dotted link that grows from one actor to another and marches with time', () => {
    const actors = [actor('a', 'red', 16, 60), actor('b', 'blue', 80, 60)];
    const link = (progress: number, t = 0): Surface =>
      render(plain, { t, actors, annotations: [{ kind: 'link', from: 'a', to: 'b', progress }] }, { lighting: false });
    const none = render(plain, { actors }, { lighting: false });
    const paper = colorOf('cream.2').join();
    const dots = (s: Surface, x0: number, x1: number): number => [...Array(H).keys()].flatMap((y) => [...Array(x1 - x0).keys()].filter((x) => pixel(s, x0 + x, y).join() === paper)).length;
    expect(diff(link(0), none)).toBe(0);
    expect(dots(link(1), 0, W)).toBeGreaterThan(dots(link(0.5), 0, W));
    expect(dots(link(0.5), 0, 48)).toBeGreaterThan(0);
    expect(dots(link(0.5), 56, W)).toBe(0); // half way: nothing near the target yet
    expect(dots(link(1), 56, W)).toBeGreaterThan(0);
    expect(diff(link(1, 0), link(1, 0.3))).toBeGreaterThan(0);
  });

  it('fades the whole frame to ink', () => {
    const black = render(lit, { timeOfDay: 23, actors: pair, fade: 1 });
    expect(colours(black, 0, 0, W, H)).toEqual(new Set([colorOf('steel.0').join()]));
    const half = render(plain, { fade: 0.5 });
    expect(luma(pixel(half, 50, 50))).toBeLessThan(luma(colorOf('steel.3')));
    expect(luma(pixel(half, 50, 50))).toBeGreaterThan(luma(colorOf('steel.0')));
  });
});
