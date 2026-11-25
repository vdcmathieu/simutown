/**
 * Small things that hang on a wall or stand at a door: shutters, a flower box, a striped
 * awning, a door lantern, a stone step.
 */
import type { Slot } from '../../core/palette';
import { recolor, sprite, type Sprite } from '../../core/sprite';
import { type Canvas, canvas, done, glazed, INK, type Part, rect } from './canvas';

export type ShutterColor = 'teal' | 'plum';
export type AwningColor = 'red' | 'teal' | 'plum' | 'blue';

export const SHUTTER_COLORS: readonly ShutterColor[] = ['teal', 'plum'];
export const AWNING_COLORS: readonly AwningColor[] = ['red', 'teal', 'plum', 'blue'];

/** Shutters are this wide; one hangs on each side of a window, overlapping its sill by a pixel. */
export const SHUTTER_W = 4;

/** A louvred shutter as tall as the glazed part of a window (11 rows, or 16 for a tall one). */
export function shutter(color: ShutterColor = 'teal', h = 11): Sprite {
  // slats of two rows between rails; the last slat takes whatever rows are left
  const rows: string[] = [];
  for (let y = 0; y < h; y++) rows.push(y === h - 1 || (y % 3 === 0 && y < h - 2) ? '6666' : '6776');
  const s = sprite(rows.join('\n'));
  return color === 'teal' ? s : recolor(s, { 'teal.0': 'plum.0', 'teal.1': 'plum.1' });
}

/** A window box with geraniums, 15x5. It hangs over the sill of a ground-floor window. */
export const flowerBox: Sprite = sprite(`
  .y.h.*..h.y.h*.
  hyhh*h*hhyyhh*h
  uuuuuuuuuuuuuuu
  uvvvvvvvvvvvvvu
  .uuuuuuuuuuuuu.
`);

/** Awnings are this tall: an ink line, five rows of cloth, a two-row shaded valance, an ink line. */
export const AWNING_H = 9;

const AWNING_RAMP: Record<AwningColor, readonly [Slot, Slot]> = {
  red: ['brick.0', 'brick.1'],
  teal: ['teal.0', 'teal.1'],
  plum: ['plum.0', 'plum.1'],
  blue: ['sky.0', 'sky.1'],
};

/**
 * The nearest awning width, at or above `w`, whose stripes come out whole and end on the
 * colour at both sides: 2 pixels of ink plus an odd number of 4-pixel stripes.
 */
export function awningWidth(w: number): number {
  const stripes = Math.max(3, Math.ceil((w - 2) / 4));
  return (stripes % 2 === 1 ? stripes : stripes + 1) * 4 + 2;
}

/**
 * A striped awning `w` pixels wide (use `awningWidth`): stripes 4 pixels wide, white and
 * one strong colour, with a shaded lower edge.
 */
export function awning(color: AwningColor, w: number): Sprite {
  const [shade, base] = AWNING_RAMP[color];
  const c: Canvas = canvas(w, AWNING_H);
  rect(c, INK, 0, 0, w, AWNING_H);
  for (let x = 1; x < w - 1; x++) {
    const strong = Math.floor((x - 1) / 4) % 2 === 0;
    rect(c, strong ? base : 'steel.5', x, 1, 1, AWNING_H - 4);
    rect(c, strong ? shade : 'steel.4', x, AWNING_H - 3, 1, 2);
  }
  // rounded corners
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, AWNING_H - 1], [w - 1, AWNING_H - 1]] as const) c.px[y * w + x] = 0;
  return done(c);
}

/** A door lantern, 5x8: an iron cage with frosted glass by day, lamplight at dusk. */
export const lantern: Part = glazed(
  `
  ..1..
  .000.
  03330
  0c5c0
  0ccc0
  0cbc0
  02220
  .000.
`,
  { c: 'r', '5': 'r', b: 'q' },
);

/** A stone step is this many rows tall below the wall's base line. */
export const STEP_H = 3;

/**
 * A stone step `w` pixels wide. Its first row is the lit top plane and replaces the wall's
 * base line under the door; the front face and its ink line hang below the base line.
 */
export function step(w: number): Sprite {
  const c = canvas(w, STEP_H + 1);
  rect(c, INK, 0, 0, w, STEP_H + 1);
  rect(c, 'steel.4', 1, 0, w - 2, 1);
  rect(c, 'steel.3', 1, 1, w - 2, 2);
  rect(c, 'steel.2', w - 2, 1, 1, 2);
  c.px[STEP_H * w] = 0;
  c.px[STEP_H * w + w - 1] = 0;
  return done(c);
}
