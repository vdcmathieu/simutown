import { sprite } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import { TILE, type TerrainDef } from '../../core/types';

// Reference ground for the daylight look. These tiles set the level of detail:
// a flat, bright base colour and a handful of deliberate marks. Keep the ids `grass`
// and `cobble` (fixtures and tests use them).

// ---------------------------------------------------------------------------------------
// Grass: flat moss.2, three or four small marks per tile, never a speckle.
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
// Cobble: pale sand-cream paving, the light ground of the square. Rounded 8x8 stones in
// a running bond, joints one step darker, a small glint on every other stone.
// ---------------------------------------------------------------------------------------

const cobble = sprite(`
  abbbbbaaabbbbbaa
  bccbbbbabbbbbbba
  bcbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  bbbbbbbabbbbbbba
  abbbbbaaabbbbbaa
  aaaaaaaaaaaaaaaa
  bbaaabbbbbaaabbb
  bbbabbbbbbbabccb
  bbbabbbbbbbabcbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbbabbbbbbbabbbb
  bbaaabbbbbaaabbb
  aaaaaaaaaaaaaaaa
`);

// ---------------------------------------------------------------------------------------
// Water: flat sky.1 with a few short ripples that drift between two frames.
// ---------------------------------------------------------------------------------------

const waterA = sprite(`
  9999999999999999
  99fff99999999999
  9999999999999999
  9999999999999999
  9999999999ff9999
  9999999999999999
  9999999999999999
  9999fff999999999
  9999999999999999
  9999999999999999
  999999999999fff9
  9999999999999999
  9ff9999999999999
  9999999999999999
  9999999ff9999999
  9999999999999999
`);

const waterB = sprite(`
  9999999999999999
  999fff9999999999
  9999999999999999
  9999999999999999
  999999999fff9999
  9999999999999999
  9999999999999999
  99999ff999999999
  9999999999999999
  9999999999999999
  9999999999999ff9
  9999999999999999
  9fff999999999999
  9999999999999999
  99999999fff99999
  9999999999999999
`);

// ---------------------------------------------------------------------------------------
// Fringes. A fringe piece is drawn on the NEIGHBOURING tile, so it is authored as a small
// strip or corner and pinned to the edge of an otherwise empty tile.
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

// Grass creeps over paving with a lumpy turf edge: one line of darker green, moss.1 on
// the lit sides (north and west), moss.0 on the shaded sides (south and east).
const grassFringe: TerrainDef['fringe'] = {
  // on the tile north of the grass: its bottom rows
  n: pin(sprite(`
    ..hhhhh...hhhhh.
    hhiiiiihhhiiiiih
    iiiiiiiiiiiiiiii
  `), 'bl'),
  // on the tile south of the grass: its top rows
  s: pin(sprite(`
    iiiiiiiiiiiiiiii
    ggiiiiigggiiiiig
    ..ggggg...ggggg.
  `), 'tl'),
  // on the tile west of the grass: its right columns
  w: pin(upright(sprite(`
    ..hhhhh...hhhhh.
    hhiiiiihhhiiiiih
    iiiiiiiiiiiiiiii
  `)), 'tr'),
  // on the tile east of the grass: its left columns
  e: pin(upright(sprite(`
    iiiiiiiiiiiiiiii
    ggiiiiigggiiiiig
    ..ggggg...ggggg.
  `)), 'tl'),
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
};

// The pond's bank: a rim of pale stone, drawn on the tiles around the water. We look at
// the north bank from the south, so it shows its inner face and throws a shadow on the
// water; the south and east banks catch a line of foam. Terrain never uses ink: the rim's
// darkest line is steel.2.
// Where two strips cross on one tile (an inner corner) they simply overlap, which reads
// as one more joint in the masonry.
const waterFringe: TerrainDef['fringe'] = {
  n: pin(sprite(`
    2222222222222222
    5444444354444443
    4444444344444443
    3333333233333332
    8888888888888888
  `), 'bl'),
  s: pin(sprite(`
    ffffffffffffffff
    4443544444435444
    4443444444434444
    2222222222222222
  `), 'tl'),
  w: pin(upright(sprite(`
    2222222222222222
    5444444354444443
    4444444344444443
    8888888888888888
  `)), 'tr'),
  e: pin(upright(sprite(`
    ffffffffffffffff
    4443544444435444
    4443444444434444
    2222222222222222
  `)), 'tl'),
  ne: pin(sprite(`
    222.
    4442
    4442
    3442
    8442
  `), 'bl'),
  nw: pin(sprite(`
    .222
    2544
    2444
    2443
    2448
  `), 'br'),
  se: pin(sprite(`
    f442
    4442
    4442
    222.
  `), 'tl'),
  sw: pin(sprite(`
    2448
    2444
    2444
    .222
  `), 'tr'),
};

export const terrain: Record<string, TerrainDef> = {
  cobble: { id: 'cobble', variants: [cobble], priority: 1 },
  grass: { id: 'grass', variants: [grassA, grassB, grassC], priority: 2, fringe: grassFringe },
  water: {
    id: 'water',
    variants: [waterA],
    anim: { frames: [waterA, waterB], fps: 2 },
    solid: true,
    priority: 3,
    fringe: waterFringe,
  },
};
