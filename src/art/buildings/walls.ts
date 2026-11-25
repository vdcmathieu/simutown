/**
 * Walls: a light, quiet material, a 4-pixel shadow under the eave, a stone plinth, and
 * for two storeys a string course (or a second beam on a timber frame).
 *
 * Large surfaces stay calm: brick and stone show a few courses and joints, never a full
 * grid, and their base is the light tone of the ramp.
 */
import type { Slot } from '../../core/palette';
import { sprite, type Sprite } from '../../core/sprite';
import { type Canvas, fill, INK, rect } from './canvas';

export type WallKind = 'plaster' | 'yellow' | 'timber' | 'brick' | 'stone' | 'planks';

export const WALL_KINDS: readonly WallKind[] = ['plaster', 'yellow', 'timber', 'brick', 'stone', 'planks'];

/** Height of a ground storey, its 4-pixel plinth included, and of the storey above it. */
export const GROUND = 32;
export const UPPER = 26;
/** Height of the stone plinth, and of the shadow the eave throws on the wall. */
export const PLINTH = 4;
export const EAVE_SHADE = 4;
/** Timber beams and posts are this thick. */
export const TIMBER = 4;

// Terracotta brick, running bond, 4-pixel courses. Only a few bricks are drawn, far
// apart, so the wall reads as brick without turning into a grid.
const brick = sprite(`
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  yyyyyyyyyyyyyyyyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzz
  zzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzz
  zzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzyyyyyyyyyyyyyyyyzzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzyyyyyyyyyzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzyyyyyyyyyyyyyyyyzzzzzzzzzzzyyyyyyyyy
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzyzzzz
  zzzyyyyyyyyzzzzzzzzzzzzzzzzzzzzzzzzzzyyyyyyyyyyy
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzyzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
  zzzzzzzzzzzzzzzzzzzzzzzzyyyyyyyyyyzzzzzzzzzzzzzz
`);

// Pale dressed stone: blocks about 10 by 6, with part of the joints drawn.
const stone = sprite(`
  4444444443444444444444444444444444444444
  4444444443444444444444444444444444444444
  4444444443444444444444444444444444444444
  4444444443444444444444444444444444444444
  4444444443444444444444444444444444444444
  3333333333333344444444444444433333333333
  4444444444444444444344444444444444444444
  4444444444444444444344444444444444444444
  4444444444444444444344444444444444444444
  4444444444444444444344444444444444444444
  4444444444444444444344444444444444444444
  4444444444443333333333333333444444444444
  4444444444444444444444444444444434444444
  4444444444444444444444444444444434444444
  4444444444444444444444444444444434444444
  4444444444444444444444444444444434444444
  4444444444444444444444444444444434444444
  4444333333334444444444444443333333333333
`);

// Upright boards, 6 pixels wide.
const planks = sprite('wwwwwv');

const flat = (ch: string): Sprite => sprite(ch);

interface WallLook {
  fill: Sprite;
  /** The eave's shadow on this material. */
  shade: Slot;
  /** The 2-pixel string course between storeys: its lit row and its shade row. */
  course: readonly [Slot, Slot];
  timber?: boolean;
}

const LOOKS: Record<WallKind, WallLook> = {
  plaster: { fill: flat('c'), shade: 'cream.1', course: ['cream.2', 'cream.0'] },
  yellow: { fill: flat('r'), shade: 'cream.1', course: ['cream.2', 'cream.0'] },
  timber: { fill: flat('c'), shade: 'cream.1', course: ['cream.2', 'cream.0'], timber: true },
  brick: { fill: brick, shade: 'brick.1', course: ['cream.2', 'cream.0'] },
  stone: { fill: stone, shade: 'steel.3', course: ['steel.5', 'steel.3'] },
  planks: { fill: planks, shade: 'wood.1', course: ['wood.2', 'wood.0'] },
};

const beam = sprite(`
  w
  v
  v
  u
`);
const post = sprite('wvvu');
const plinth = sprite(`
  44444442
  33333332
  33333332
  22222222
`);

export interface WallSpec {
  kind: WallKind;
  /** Left edge of the wall and its width, in pixels, without the ink lines. */
  x: number;
  w: number;
  /** Top row of the wall (the eave covers its first 2 rows) and the row of the ink base line. */
  top: number;
  base: number;
  storeys: 1 | 2;
}

/** Paint the wall surface: material, eave shadow, plinth, and the storey line. No openings yet. */
export function wall(c: Canvas, s: WallSpec): void {
  const look = LOOKS[s.kind];
  fill(c, look.fill, s.x, s.top, s.w, s.base - s.top);
  rect(c, look.shade, s.x, s.top, s.w, EAVE_SHADE);
  if (look.timber) fill(c, beam, s.x, s.top + EAVE_SHADE, s.w, TIMBER);
  if (s.storeys === 2) {
    const line = s.top + UPPER;
    if (look.timber) fill(c, beam, s.x, line - TIMBER, s.w, TIMBER);
    else {
      rect(c, look.course[0], s.x, line - 2, s.w, 1);
      rect(c, look.course[1], s.x, line - 1, s.w, 1);
    }
  }
  fill(c, plinth, s.x, s.base - PLINTH, s.w, PLINTH);
}

/** Stand timber posts with their left edges at `xs`, from under the top beam down to the plinth. */
export function timberPosts(c: Canvas, s: WallSpec, xs: number[], fromTop = s.top + EAVE_SHADE): void {
  for (const x of xs) fill(c, post, x, fromTop, TIMBER, s.base - PLINTH - fromTop);
}

/** The wall's ink outline: both sides and the base line. Draw it after the openings. */
export function wallOutline(c: Canvas, s: WallSpec): void {
  rect(c, INK, s.x - 1, s.top, 1, s.base - s.top);
  rect(c, INK, s.x + s.w, s.top, 1, s.base - s.top);
  rect(c, INK, s.x, s.base, s.w, 1);
}

/** Whether a wall kind has a timber frame (posts at the corners and beside the door). */
export const isTimber = (kind: WallKind): boolean => LOOKS[kind].timber === true;
