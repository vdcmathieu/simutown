/**
 * A minimal art registry and helpers for the renderer tests (test/render*.test.ts).
 * Every sprite is a flat block of one palette slot, so a test can say exactly which colour
 * a pixel must have.
 */
import { compileTheme, daylight, lutRgb, type Slot, slotIndex } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import type { ActorState, ArtRegistry, CharacterDef, Dir, FrameState, PlacedProp, Town } from '../src/core/types';

export const lut = compileTheme(daylight);

/** RGB of a slot in the default theme. */
export function colorOf(slot: Slot): number[] {
  return [...lutRgb(lut, slot)];
}

/** A w x h block of one slot. */
export function block(slot: Slot, w = 16, h = 16, anchor: readonly [number, number] = [0, 0]): Sprite {
  return { w, h, px: new Uint8Array(w * h).fill(slotIndex(slot)), ax: anchor[0], ay: anchor[1] };
}

/** A 16x24 character that is one flat colour in every pose and direction. */
export function person(id: string, slot: Slot): CharacterDef {
  const frames = [block(slot, 16, 24, [8, 24])];
  const all: Record<Dir, Sprite[]> = { down: frames, up: frames, left: frames, right: frames };
  return { id, name: id, idle: all, walk: all };
}

/** The test registry: two plain terrains, a post, a lamp with a glowing head, two people. */
export function kitArt(): ArtRegistry {
  return {
    terrain: {
      stone: { id: 'stone', variants: [block('steel.3')], priority: 1 },
      lawn: { id: 'lawn', variants: [block('moss.1')], priority: 2 },
    },
    props: {
      post: { id: 'post', sprite: block('wood.1', 16, 32, [0, 32]), footprint: { w: 1, h: 1 } },
      // a 4x32 pole standing in the middle of its tile; the top 8 rows are the glowing head
      lamp: {
        id: 'lamp',
        sprite: block('steel.1', 4, 32, [-6, 32]),
        emissive: { ...block('ochre.3', 4, 32, [-6, 32]), px: new Uint8Array(4 * 32).fill(slotIndex('ochre.3'), 0, 4 * 8) },
        lights: [{ dx: 8, dy: -28, radius: 40, flicker: 0.2 }],
      },
      rug: { id: 'rug', sprite: block('plum.0', 16, 16, [0, 16]), flat: true },
    },
    characters: { red: person('red', 'brick.1'), blue: person('blue', 'teal.1') },
    emotes: {},
    font: { height: 8, glyphs: {} },
  };
}

/** A w x h town of one terrain, optionally with other terrain at given tiles and some props. */
export function kitTown(w: number, h: number, base = 'stone', patches: Record<string, string> = {}, props: PlacedProp[] = []): Town {
  const terrain: string[] = [];
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) terrain.push(patches[`${tx},${ty}`] ?? base);
  return { name: 'kit', w, h, terrain, props, places: {}, solid: new Uint8Array(w * h) };
}

/** An idle actor facing down. */
export function actor(id: string, character: string, x: number, y: number, extra: Partial<ActorState> = {}): ActorState {
  return { id, character, x, y, dir: 'down', pose: 'idle', animTime: 0, ...extra };
}

/** A frame at noon with the camera on (cx, cy). */
export function frameState(cx: number, cy: number, extra: Partial<FrameState> = {}): FrameState {
  return { t: 0, camera: { x: cx, y: cy, zoom: 1 }, timeOfDay: 12, actors: [], bubbles: [], ...extra };
}

/** RGB of one pixel of a surface. */
export function pixel(s: Surface, x: number, y: number): number[] {
  const o = (y * s.w + x) * 4;
  return [s.data[o]!, s.data[o + 1]!, s.data[o + 2]!];
}

/** Perceived brightness of an RGB triple. */
export function luma(c: number[]): number {
  return c[0]! * 0.3 + c[1]! * 0.59 + c[2]! * 0.11;
}
