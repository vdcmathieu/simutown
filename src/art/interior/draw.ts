// Small helpers for drawing furniture as text grids.
//
// Furniture is written as fill only: the colours of its parts, with ink (0) only where
// one part overlaps another. `outlined` then draws the closed outline around the whole
// silhouette, so an outline is never left open and the corners come out round (a pixel
// that touches the shape only diagonally stays empty).
import { sprite, type Sprite } from '../../core/sprite';

function rows(art: string): string[] {
  return art
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '');
}

/**
 * Close a grid in a 1-pixel ink outline: every empty pixel beside a coloured one turns to
 * ink. The art must leave a free row or column on each side for it.
 */
export function outline(art: string): string {
  const grid = rows(art);
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? '.' : grid[y]![x]!);
  return grid
    .map((row, y) =>
      [...row]
        .map((ch, x) => {
          if (ch !== '.') {
            if (ch !== '0' && (x === 0 || y === 0 || x === w - 1 || y === h - 1)) {
              throw new Error(`outline: a coloured pixel at [${x}, ${y}] touches the edge of the box; leave room for the ink`);
            }
            return ch;
          }
          const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
          return near.some((c) => c !== '.' && c !== '0') ? '0' : '.';
        })
        .join(''),
    )
    .join('\n');
}

/** A standing prop: the grid outlined in ink, anchored at its bottom-left corner. */
export function outlined(art: string): Sprite {
  const grid = outline(art);
  return sprite(grid, { anchor: [0, rows(grid).length] });
}

/**
 * The emissive layer of a grid: only the characters in `map` are kept, each repainted as
 * its mapped character; everything else turns transparent. Same size and anchor.
 */
export function glow(art: string, map: Record<string, string>): Sprite {
  const grid = rows(art).map((r) => [...r].map((ch) => map[ch] ?? '.').join(''));
  return sprite(grid.join('\n'), { anchor: [0, grid.length] });
}

/** A flat prop (a rug, a mat): no ink, anchored at its bottom-left corner. */
export function flatArt(art: string): Sprite {
  return sprite(art, { anchor: [0, rows(art).length] });
}

/**
 * A grid to paint furniture on with rectangles and small stamped grids, for pieces that
 * are mostly boxes (counters, cupboards, shelves). `text` gives the grid back, ready for
 * `outlined` or `glow`.
 */
export class Canvas {
  private g: string[][];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.g = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  }
  /** One pixel; outside the grid is an error. */
  px(x: number, y: number, ch: string): this {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) throw new Error(`canvas: pixel [${x}, ${y}] is outside ${this.w}x${this.h}`);
    this.g[y]![x] = ch;
    return this;
  }
  /** A filled rectangle. */
  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, ch);
    return this;
  }
  /** A small grid pasted with its top-left at [x, y]; its `.` pixels leave the canvas showing. */
  stamp(art: string, x: number, y: number): this {
    rows(art).forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && this.px(x + i, y + j, ch)));
    return this;
  }
  /**
   * A box seen from above and in front, in one material: a top plane `top` rows deep in
   * the light tone, a front face `face` rows tall in the base tone, a shade column on the
   * right end and a shade row along the bottom.
   */
  box(x: number, y: number, w: number, top: number, face: number, [light, base, shade]: Mat): this {
    this.rect(x, y, w, top, light).rect(x + w - 1, y, 1, top, base);
    this.rect(x, y + top, w, face, base).rect(x + w - 1, y + top, 1, face, shade);
    return this.rect(x, y + top + face - 1, w, 1, shade);
  }
  text(): string {
    return this.g.map((r) => r.join('')).join('\n');
  }
}

/** A material as three tone letters: light, base, shade. */
export type Mat = readonly [light: string, base: string, shade: string];
/** Wood: `wood.2`, `wood.1`, `wood.0`. Most furniture. */
export const WOOD: Mat = ['w', 'v', 'u'];
/** Pale stone: `steel.4`, `steel.3`, `steel.2`. Hearths and the oven's base. */
export const STONE: Mat = ['4', '3', '2'];

/** Paste `top` over `base` (same size), `.` in `top` leaving `base` showing. */
export function overlay(base: string, top: string): string {
  const a = rows(base);
  const b = rows(top);
  if (a.length !== b.length || a[0]!.length !== b[0]!.length) throw new Error('overlay: the two grids differ in size');
  return a.map((row, y) => [...row].map((ch, x) => (b[y]![x] === '.' ? ch : b[y]![x])).join('')).join('\n');
}
