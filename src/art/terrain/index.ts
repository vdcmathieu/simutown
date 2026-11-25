import { sprite, stack } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import { TILE, type TerrainDef } from '../../core/types';
import { basinRim, pondBank } from './shores';

// Reference ground for the daylight look. These tiles set the level of detail:
// a flat, bright base colour and a handful of deliberate marks. Keep the ids `grass`
// and `cobble` (fixtures and tests use them).

// ---------------------------------------------------------------------------------------
// Grass: flat moss.2, two or three small marks per tile, never a speckle.
// ---------------------------------------------------------------------------------------

const grassA = sprite(`
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iihihiiiiiiiiiii
  iiihiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiijiii
  iiiiiiiiiiijiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiihihiiiiiii
  iiiiiiihiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
`);

const grassB = sprite(`
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiijiiiii
  iiiiiiiiijiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iihihiiiiiiiiiii
  iiihiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiijii
  iiiiiiiiiiiijiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
`);

const grassC = sprite(`
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiijiiiiiiiiiii
  iiijiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiihihii
  iiiiiiiiiiiihiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
  iiiiiiiiiiiiiiii
`);

// ---------------------------------------------------------------------------------------
// Cobble: pale sand-cream paving, the light ground of the square. Rounded stones in a
// running bond, joints one step darker, about one glint per tile. The tile starts with a
// full course of stones, so a road never opens on a half-cut row.
// ---------------------------------------------------------------------------------------

const cobbleA = sprite(`
  abbbbbaaabbbbbaa
  bccbbbbabbbbbbba
  bcbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  abbbbbaaabbbbbaa
  aaaaaaaaaaaaaaaa
  bbaaabbbbbaaabbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbaaabbbbbaaabbb
  aaaaaaaaaaaaaaaa
`);

// One long slab in the first course, and the glint on the second.
const cobbleB = sprite(`
  abbbbbbbbbbbbbaa
  bbbbbbbbbbbbbbba
  bbbbbbbbbbbbbbba
  bbbbbbbbbbbbbbba
  bbbbbbbbbbbbbbba
  bbbbbbbbbbbbbbba
  abbbbbbbbbbbbbaa
  aaaaaaaaaaaaaaaa
  bbaaabbbbbaaabbb
  bbbabccbbbbabbbb
  bbbabcbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbaaabbbbbaaabbb
  aaaaaaaaaaaaaaaa
`);

// ---------------------------------------------------------------------------------------
// Dirt: a trodden footpath. Flat cream.0 with a pebble or two and a wheel-worn scuff.
// ---------------------------------------------------------------------------------------

const dirtA = sprite(`
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaawwaaa
  aaabaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaawwwaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaba
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aawwaaaaaaaaaaaa
  aaaaaaaaaabbaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
`);

const dirtB = sprite(`
  aaaaaaaaaaaaaaaa
  aaaaabbaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaawwwa
  aaaaaaaaaaaaaaaa
  awwaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaabaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaaaaaaaaaaaaaa
  aaaawwaaaaaaaaaa
  aaaaaaaaaaaaabaa
  aaaaaaaaaaaaaaaa
`);

// ---------------------------------------------------------------------------------------
// Water: flat sky.1. Each variant carries two or three ripples of different lengths, on
// rows and columns that no other variant uses, so a mixed pond shows no 16-pixel grid.
// ---------------------------------------------------------------------------------------

const waterA = sprite(`
  9999999999999999
  9999999999999999
  999ffff999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999fff999
  9999999999999999
  9999999999999999
  9999999999999999
  9ff9999999999999
  9999999999999999
  9999999999999999
`);

const waterB = sprite(`
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  99999999fffff999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999ff9999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
`);

const waterC = sprite(`
  9999999999999999
  999999999999ff99
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  99999ffff9999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9fff999999999999
  9999999999999999
`);

const waterD = sprite(`
  9999999999999999
  9999999999999999
  9999999999999999
  9999999ff5999999
  9999999999999999
  9999999999999999
  99ff999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  99999999999ffff9
  9999999999999999
  9999999999999999
  9999999999999999
`);

const waterLooks = [waterA, waterB, waterC, waterD];

// ---------------------------------------------------------------------------------------
// The turf edge: grass creeping over paving or dirt. A fringe piece is drawn on the
// NEIGHBOURING tile, so it is authored as a small strip and pinned to that tile's edge.
// Lumps are 1, 2 and 3 pixels deep at uneven spacing, and every side has its own rhythm.
// One line of darker green closes the edge: moss.1 where it faces the light (north and
// west), moss.0 where it faces away (south and east).
// ---------------------------------------------------------------------------------------

type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Pin a small piece into a corner of an empty TILE x TILE sprite. */
function pin(piece: Sprite, corner: Corner): Sprite {
  const px = new Uint8Array(TILE * TILE);
  const x0 = corner === 'tl' || corner === 'bl' ? 0 : TILE - piece.w;
  const y0 = corner === 'tl' || corner === 'tr' ? 0 : TILE - piece.h;
  for (let y = 0; y < piece.h; y++) {
    for (let x = 0; x < piece.w; x++) px[(y0 + y) * TILE + x0 + x] = piece.px[y * piece.w + x]!;
  }
  return { w: TILE, h: TILE, px, ax: 0, ay: 0 };
}

/** Turn a strip drawn left-to-right into one that runs top-to-bottom. */
function upright(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[x * s.h + y] = s.px[y * s.w + x]!;
  return { w: s.h, h: s.w, px, ax: 0, ay: 0 };
}

// on the tile north of the grass: its bottom rows
const turfN = pin(sprite(`
  ..........hhhh..
  .hhhh..hhhiiiih.
  hiiiihhiiiiiiihh
`), 'bl');
// on the tile south of the grass: its top rows
const turfS = pin(sprite(`
  iiiggiiiiiigggii
  ggg.giiiigg...gg
  .....gggg.......
`), 'tl');
// on the tile west of the grass: its right columns
const turfW = pin(upright(sprite(`
  ...hhh......hh..
  hhhiiih..hhhiihh
  iihiiihhhiiiiiii
`)), 'tr');
// on the tile east of the grass: its left columns
const turfE = pin(upright(sprite(`
  giiiiiiigggiiiig
  .gggiigg...gggg.
  ....gg..........
`)), 'tl');

const turf: TerrainDef['fringe'] = {
  n: turfN,
  s: turfS,
  w: turfW,
  e: turfE,
  // outer corners: the grass only touches this tile diagonally
  ne: pin(sprite(`
    h.
    ig
  `), 'bl'),
  nw: pin(sprite(`
    .h
    hi
  `), 'br'),
  se: pin(sprite(`
    ig
    g.
  `), 'tl'),
  sw: pin(sprite(`
    hi
    .g
  `), 'tr'),
  // inner corners: the two strips, plus a wedge of grass that rounds the bend
  'in-ne': stack(turfN, turfE, pin(sprite(`
    gg....
    iig...
    iiig..
    iiiig.
    iiiiig
    iiiiig
  `), 'bl')),
  'in-nw': stack(turfN, turfW, pin(sprite(`
    ....hh
    ...hii
    ..hiii
    .hiiii
    hiiiii
    hiiiii
  `), 'br')),
  'in-se': stack(turfS, turfE, pin(sprite(`
    iiiiig
    iiiiig
    iiiig.
    iiig..
    iig...
    gg....
  `), 'tl')),
  'in-sw': stack(turfS, turfW, pin(sprite(`
    hiiiii
    hiiiii
    .giiii
    ..giii
    ...gii
    ....gg
  `), 'tr')),
};

export const terrain: Record<string, TerrainDef> = {
  dirt: { id: 'dirt', variants: [dirtA, dirtB], priority: 0 },
  cobble: { id: 'cobble', variants: [cobbleA, cobbleB], priority: 1 },
  grass: { id: 'grass', variants: [grassA, grassB, grassC], priority: 2, fringe: turf },
  // A natural pond: a grass bank that curves. See shores.ts.
  water: { id: 'water', variants: waterLooks, solid: true, priority: 3, fringe: pondBank },
  // The same water in a stone rim, for squares and gardens.
  basin: { id: 'basin', variants: waterLooks, solid: true, priority: 3, fringe: basinRim },
};
