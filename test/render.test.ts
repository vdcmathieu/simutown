/**
 * The renderer's structure: determinism, depth order, zoom, camera offset and robustness.
 * Frames here are 96x64, so with the camera on (48, 32) at zoom 1 a screen pixel is a world pixel.
 */
import { describe, expect, it } from 'vitest';
import { Surface } from '../src/core/surface';
import type { FrameState } from '../src/core/types';
import { createRenderer } from '../src/render';
import { cameraFor, toScreen } from '../src/render/camera';
import { actor, colorOf, frameState, kitArt, kitTown, pixel } from '../tools/render-testkit';

const W = 96;
const H = 64;
const art = kitArt();
const quiet = { art, warn: () => {} };

function render(town = kitTown(8, 6), state: FrameState = frameState(48, 32), opts: object = {}): Surface {
  const out = new Surface(W, H);
  createRenderer(town, { ...quiet, ...opts }).render(state, out);
  return out;
}

/** A busy night frame: lamp, post, two people, annotations and focus. */
function busy(extra: Partial<FrameState> = {}): FrameState {
  return frameState(48, 32, {
    t: 1.7,
    timeOfDay: 21,
    actors: [actor('a', 'red', 40, 50), actor('b', 'blue', 70, 44, { opacity: 0.5, pose: 'walk', animTime: 0.4 })],
    annotations: [
      { kind: 'ring', actor: 'a', progress: 0.7 },
      { kind: 'link', from: 'a', to: 'b', progress: 1 },
    ],
    focus: { actors: ['a'], amount: 0.5 },
    ...extra,
  });
}

const busyTown = kitTown(8, 6, 'lawn', { '3,3': 'stone' }, [
  { kind: 'lamp', tx: 2, ty: 2 },
  { kind: 'post', tx: 5, ty: 3 },
  { kind: 'rug', tx: 1, ty: 3 },
]);

describe('determinism', () => {
  it('gives the same bytes for the same state, from any renderer, in any order', () => {
    const first = render(busyTown, busy());
    const second = render(busyTown, busy());
    expect(Buffer.compare(Buffer.from(first.data), Buffer.from(second.data))).toBe(0);

    const renderer = createRenderer(busyTown, quiet);
    const out = new Surface(W, H);
    renderer.render(busy({ t: 9, timeOfDay: 12, camera: { x: 10, y: 80, zoom: 2 } }), out);
    renderer.render(busy(), out);
    expect(Buffer.compare(Buffer.from(first.data), Buffer.from(out.data))).toBe(0);
  });

  it('changes with scene time when a light flickers', () => {
    const a = render(busyTown, busy({ t: 0 }));
    const b = render(busyTown, busy({ t: 0.37 }));
    expect(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data))).not.toBe(0);
  });

  it('always writes an opaque frame', () => {
    const out = render(busyTown, busy({ camera: { x: -500, y: -500, zoom: 1 } }));
    for (let i = 3; i < out.data.length; i += 4) expect(out.data[i]).toBe(255);
  });
});

describe('depth order', () => {
  const flat = { lighting: false };

  it('draws the actor lower on screen in front, whatever the input order', () => {
    const back = actor('back', 'red', 40, 40);
    const front = actor('front', 'blue', 44, 44);
    for (const actors of [
      [back, front],
      [front, back],
    ]) {
      const out = render(kitTown(8, 6), frameState(48, 32, { actors }), flat);
      expect(pixel(out, 40, 30)).toEqual(colorOf('teal.1')); // both overlap here
      expect(pixel(out, 33, 18)).toEqual(colorOf('brick.1')); // only the back one
    }
  });

  it('sorts actors with props by base line', () => {
    const town = kitTown(8, 6, 'stone', {}, [{ kind: 'post', tx: 3, ty: 2 }]); // post covers x 48..63, y 16..47
    const behind = render(town, frameState(48, 32, { actors: [actor('a', 'red', 56, 46)] }), flat);
    expect(pixel(behind, 56, 40)).toEqual(colorOf('wood.1'));
    const inFront = render(town, frameState(48, 32, { actors: [actor('a', 'red', 56, 50)] }), flat);
    expect(pixel(inFront, 56, 40)).toEqual(colorOf('brick.1'));
    const level = render(town, frameState(48, 32, { actors: [actor('a', 'red', 56, 48)] }), flat);
    expect(pixel(level, 56, 40)).toEqual(colorOf('brick.1')); // a tie goes to the actor
  });

  it('keeps flat props under everyone', () => {
    const town = kitTown(8, 6, 'stone', {}, [{ kind: 'rug', tx: 2, ty: 2 }]); // rug covers x 32..47, y 32..47
    const out = render(town, frameState(48, 32, { actors: [actor('a', 'red', 40, 36)] }), flat);
    expect(pixel(out, 40, 34)).toEqual(colorOf('brick.1')); // the actor's feet are above the rug's base line
    expect(pixel(out, 40, 44)).toEqual(colorOf('plum.0'));
  });

  it('blends a fading actor with what is behind', () => {
    const out = render(kitTown(8, 6), frameState(48, 32, { actors: [actor('a', 'red', 40, 40, { opacity: 0.5 })] }), flat);
    const [r] = pixel(out, 40, 30);
    const lo = Math.min(colorOf('brick.1')[0]!, colorOf('steel.3')[0]!);
    const hi = Math.max(colorOf('brick.1')[0]!, colorOf('steel.3')[0]!);
    expect(r).toBeGreaterThan(lo);
    expect(r).toBeLessThan(hi);
    const gone = render(kitTown(8, 6), frameState(48, 32, { actors: [actor('a', 'red', 40, 40, { opacity: 0 })] }), flat);
    expect(pixel(gone, 40, 30)).toEqual(colorOf('steel.3'));
  });
});

describe('zoom', () => {
  it('is the nearest-neighbour upscale of the same world pixels, lighting included', () => {
    const at = (zoom: number): Surface => render(busyTown, busy({ camera: { x: 48, y: 32, zoom } }));
    const one = at(1);
    for (const zoom of [2, 3, 4]) {
      const big = at(zoom);
      const cam = cameraFor({ x: 48, y: 32, zoom }, W, H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          expect(pixel(big, x, y)).toEqual(pixel(one, cam.x0 + Math.floor(x / zoom), cam.y0 + Math.floor(y / zoom)));
        }
      }
    }
  });

  it('rounds odd zooms to whole numbers', () => {
    const a = render(busyTown, busy({ camera: { x: 48, y: 32, zoom: 2 } }));
    const b = render(busyTown, busy({ camera: { x: 48, y: 32, zoom: 2.3 } }));
    expect(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data))).toBe(0);
    expect(cameraFor({ x: 0, y: 0, zoom: 0 }, W, H).zoom).toBe(1);
    expect(cameraFor({ x: 0, y: 0, zoom: Number.NaN }, W, H).zoom).toBe(1);
  });

  it('maps world points to the top-left of their zoomed block', () => {
    const cam = cameraFor({ x: 48, y: 32, zoom: 2 }, W, H);
    expect([cam.x0, cam.y0, cam.w, cam.h]).toEqual([24, 16, 48, 32]);
    expect(toScreen(cam, 48, 32)).toEqual([48, 32]);
    expect(toScreen(cam, 25.4, 17)).toEqual([2, 2]);
  });
});

describe('camera', () => {
  it('shifts the picture by whole pixels', () => {
    const a = render(busyTown, busy());
    const b = render(busyTown, busy({ camera: { x: 48 + 7, y: 32 + 5, zoom: 1 } }));
    for (let y = 0; y < H - 5; y++) for (let x = 0; x < W - 7; x++) expect(pixel(b, x, y)).toEqual(pixel(a, x + 7, y + 5));
  });

  it('rounds fractional camera positions', () => {
    const a = render(busyTown, busy({ camera: { x: 48.4, y: 31.6, zoom: 1 } }));
    const b = render(busyTown, busy());
    expect(Buffer.compare(Buffer.from(a.data), Buffer.from(b.data))).toBe(0);
  });

  it('shows steel.0 outside the map at any hour', () => {
    for (const timeOfDay of [12, 21]) {
      const out = render(kitTown(2, 2), frameState(16, 16, { timeOfDay })); // the 32x32 map sits at x 32..63, y 16..47
      expect(pixel(out, 2, 2)).toEqual(colorOf('steel.0'));
      expect(pixel(out, 90, 60)).toEqual(colorOf('steel.0'));
      expect(pixel(out, 40, 30)).not.toEqual(colorOf('steel.0'));
    }
  });
});

describe('robustness', () => {
  it('draws unknown terrain as a visible placeholder and warns once', () => {
    const warnings: string[] = [];
    const town = kitTown(8, 6, 'stone', { '1,1': 'lava', '2,1': 'lava' });
    const renderer = createRenderer(town, { art, lighting: false, warn: (m) => warnings.push(m) });
    const out = new Surface(W, H);
    renderer.render(frameState(48, 32), out);
    renderer.render(frameState(48, 32), out);
    const seen = new Set<string>();
    for (let y = 16; y < 32; y++) for (let x = 16; x < 48; x++) seen.add(pixel(out, x, y).join());
    expect([...seen].sort()).toEqual([colorOf('plum.1').join(), colorOf('steel.0').join()].sort());
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/unknown terrain "lava".*lawn, stone/);
  });

  it('skips unknown props and characters with one warning each, and never throws', () => {
    const warnings: string[] = [];
    const town = kitTown(8, 6, 'stone', {}, [
      { kind: 'gazebo', tx: 2, ty: 2 },
      { kind: 'gazebo', tx: 4, ty: 2 },
    ]);
    const renderer = createRenderer(town, { art, lighting: false, warn: (m) => warnings.push(m) });
    const out = new Surface(W, H);
    const state = frameState(48, 32, {
      actors: [actor('a', 'ghost', 40, 40), actor('b', 'ghost', 60, 40), actor('c', 'red', 20, 40, { pose: 'moonwalk' })],
      bubbles: [{ actor: 'nobody', text: 'hi', kind: 'say', reveal: 1 }],
      annotations: [
        { kind: 'ring', actor: 'nobody', progress: 1 },
        { kind: 'link', from: 'c', to: 'nobody', progress: 1 },
        { kind: 'label', actor: 'nobody', text: 'x', opacity: 1 },
      ],
    });
    for (let i = 0; i < 3; i++) expect(() => renderer.render(state, out)).not.toThrow();
    expect(pixel(out, 40, 30)).toEqual(colorOf('steel.3')); // the ghost is not drawn
    expect(pixel(out, 20, 30)).toEqual(colorOf('brick.1')); // an unknown pose falls back to idle
    expect(warnings.filter((m) => m.includes('"gazebo"'))).toHaveLength(1);
    expect(warnings.filter((m) => m.includes('"ghost"'))).toHaveLength(1);
    expect(warnings.filter((m) => m.includes('"moonwalk"'))).toHaveLength(1);
    expect(warnings.filter((m) => m.includes('"nobody"')).length).toBeGreaterThan(0);
    expect(warnings.length).toBeLessThanOrEqual(6);
  });

  it('survives nonsense numbers', () => {
    const out = new Surface(W, H);
    const renderer = createRenderer(busyTown, quiet);
    const bad = busy({
      t: Number.NaN,
      timeOfDay: Number.POSITIVE_INFINITY,
      camera: { x: Number.NaN, y: 1e12, zoom: -3 },
      actors: [actor('a', 'red', Number.NaN, 10), actor('b', 'blue', 1e9, -1e9, { animTime: Number.NaN, opacity: 7 })],
      fade: 2,
    });
    expect(() => renderer.render(bad, out)).not.toThrow();
    expect(() => renderer.render(busy({ timeOfDay: -7.5 }), out)).not.toThrow();
  });

  it('handles an empty town and odd frame sizes', () => {
    const empty = { name: 'void', w: 0, h: 0, terrain: [], props: [], places: {}, solid: new Uint8Array(0) };
    const out = new Surface(33, 17);
    expect(() => createRenderer(empty, quiet).render(frameState(0, 0, { camera: { x: 0, y: 0, zoom: 2 } }), out)).not.toThrow();
    expect(pixel(out, 32, 16)).toEqual(colorOf('steel.0'));
  });
});
