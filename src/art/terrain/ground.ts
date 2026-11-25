import { type Slot, slotIndex } from '../../core/palette';
import { sprite } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import { TILE } from '../../core/types';

// Soft ground: grass, meadow, tall grass, dirt, sand. Each tile is a flat base colour
// with a handful of deliberate marks, so a tile is written as its marks and where they
// sit. Across the variants of one material no two marks share a row and a column, which
// is what keeps a big field from falling into a grid.

type Mark = readonly [mark: Sprite, x: number, y: number];

/** A flat TILE x TILE tile of one slot, with small marks stamped on it at their top-left [x, y]. */
export function ground(base: Slot, ...marks: Mark[]): Sprite {
  const px = new Uint8Array(TILE * TILE).fill(slotIndex(base));
  for (const [m, x0, y0] of marks) {
    if (x0 < 0 || y0 < 0 || x0 + m.w > TILE || y0 + m.h > TILE) throw new Error(`ground: a ${m.w}x${m.h} mark at [${x0}, ${y0}] leaves the tile`);
    for (let y = 0; y < m.h; y++) {
      for (let x = 0; x < m.w; x++) {
        const v = m.px[y * m.w + x]!;
        if (v !== 0) px[(y0 + y) * TILE + x0 + x] = v;
      }
    }
  }
  return { w: TILE, h: TILE, px, ax: 0, ay: 0 };
}

// ---------------------------------------------------------------------------------------
// Grass: flat moss.2. Eight variants with nought, one or two small marks, so a lawn
// averages a little over one mark a tile and never settles into a beat.
// ---------------------------------------------------------------------------------------

const tuft = sprite(`
  h.h
  .h.
`);
const blade = sprite(`
  .j
  j.
`);
const sprig = sprite(`
  h.
  .h
`);

export const grassTiles: Sprite[] = [
  ground('moss.2', [tuft, 2, 2], [blade, 11, 9]),
  ground('moss.2', [blade, 5, 4], [tuft, 10, 12]),
  ground('moss.2', [tuft, 12, 5]),
  ground('moss.2', [sprig, 3, 11]),
  ground('moss.2'),
  ground('moss.2', [tuft, 6, 7], [sprig, 13, 13]),
  ground('moss.2', [blade, 9, 1], [sprig, 1, 8]),
  ground('moss.2', [blade, 7, 14]),
];

// ---------------------------------------------------------------------------------------
// Meadow: the same lawn with wild flowers in it. About one flower a tile, a plus of
// petals around a heart, in white, yellow and pink, with a tuft or a bud beside it. It shares the grass base,
// so a meadow fades into a lawn without an edge.
// ---------------------------------------------------------------------------------------

const daisy = sprite(`
  .5.
  5q5
  .5.
`);
const buttercup = sprite(`
  .q.
  qpq
  .q.
`);
const pink = sprite(`
  .*.
  *q*
  .*.
`);
const bud = sprite(`
  5
  h
`);
const budYellow = sprite(`
  q
  h
`);

export const meadowTiles: Sprite[] = [
  ground('moss.2', [daisy, 3, 3], [tuft, 10, 11]),
  ground('moss.2', [buttercup, 9, 6]),
  ground('moss.2', [blade, 4, 5], [pink, 11, 10]),
  ground('moss.2', [daisy, 12, 2], [budYellow, 4, 12]),
  ground('moss.2', [tuft, 6, 8]),
  ground('moss.2', [buttercup, 2, 9], [bud, 12, 13]),
  ground('moss.2', [daisy, 7, 12], [sprig, 13, 4]),
  ground('moss.2', [pink, 5, 1], [daisy, 12, 8]),
];

// ---------------------------------------------------------------------------------------
// Tall grass: a deeper green that stands above the lawn, flat moss.1 with clumps of
// sunlit blades. Three clumps a tile, each a chunky V on a dark foot.
// ---------------------------------------------------------------------------------------

const clump = sprite(`
  i...i
  .i.i.
  .iii.
  ..g..
`);
const clumpTall = sprite(`
  j...
  i..i
  i.i.
  .ii.
  .g..
`);
const stalk = sprite(`
  i.
  ii
  .g
`);

export const tallGrassTiles: Sprite[] = [
  ground('moss.1', [clump, 1, 1], [clumpTall, 10, 4], [stalk, 5, 11]),
  ground('moss.1', [clumpTall, 3, 5], [clump, 9, 11], [stalk, 12, 1]),
  ground('moss.1', [stalk, 2, 2], [clump, 7, 6], [clumpTall, 12, 10]),
  ground('moss.1', [clump, 5, 0], [stalk, 14, 7], [clumpTall, 1, 9]),
];

// ---------------------------------------------------------------------------------------
// Dirt: a trodden footpath. Flat cream.0 with at most three marks a tile: a wood.2 scuff,
// a cream.1 pebble.
// ---------------------------------------------------------------------------------------

const scuff2 = sprite('ww');
const scuff3 = sprite('www');
const pebble = sprite('b');
const pebble2 = sprite('bb');

export const dirtTiles: Sprite[] = [
  ground('cream.0', [scuff2, 11, 2], [scuff3, 5, 7], [pebble, 3, 12]),
  ground('cream.0', [pebble2, 5, 1], [scuff3, 11, 5], [scuff2, 2, 10]),
  ground('cream.0', [pebble, 13, 9], [scuff2, 7, 13]),
  ground('cream.0', [scuff2, 1, 4], [pebble, 9, 3], [scuff3, 10, 14]),
];

// ---------------------------------------------------------------------------------------
// Sand: pale ochre.3, lighter and yellower than the paving and without a joint in it.
// A tile carries two or three short ripples in cream.1 and now and then a shell.
// ---------------------------------------------------------------------------------------

const ripple = sprite(`
  .bbb
  b...
`);
const ripple2 = sprite(`
  bb..
  ..bb
`);
const grain = sprite('bb');
const shell = sprite(`
  5
  a
`);

export const sandTiles: Sprite[] = [
  ground('ochre.3', [ripple, 2, 2], [ripple2, 9, 8], [grain, 4, 13]),
  ground('ochre.3', [ripple2, 6, 4], [ripple, 10, 12], [shell, 2, 9]),
  ground('ochre.3', [grain, 11, 1], [ripple, 3, 6], [ripple2, 8, 14]),
  ground('ochre.3', [ripple, 11, 5], [grain, 2, 11]),
];
