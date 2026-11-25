import { sprite } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import { upright } from './edges';

// Built ground: the pale cobbles of the square, the grey flagstones of a road, the planks
// of a deck or a bridge, and the tilled soil of a garden bed. Courses and furrows sit on
// the same rows in every variant, so they run on from tile to tile.

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

// All small stones, the glint on the right of the first course.
const cobbleC = sprite(`
  abbbbbaaabbbbbaa
  bbbbbbbabccbbbba
  bbbbbbbabcbbbbba
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

// No glint at all: a quiet tile between the others.
const cobbleD = sprite(`
  abbbbbaaabbbbbaa
  bbbbbbbabbbbbbba
  bbbbbbbabbbbbbba
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

export const cobbleTiles: Sprite[] = [cobbleA, cobbleB, cobbleC, cobbleD];

// ---------------------------------------------------------------------------------------
// Road: big flagstones of pale grey stone, for a street that carts use. A course is a
// whole tile tall, and each variant cuts it at a different column or not at all, so the
// flags come out 10 to 30 pixels long and never stack into a brick wall. One variant
// lays two half-height flags instead, and one carries the only glint.
// ---------------------------------------------------------------------------------------

const roadA = sprite(`
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  4444444443444444
  3333333333333333
`);

const roadB = sprite(`
  4443444444444444
  4443444444444444
  4443445544444444
  4443445444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  4443444444444444
  3333333333333333
`);

const roadC = sprite(`
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  4444444444444344
  3333333333333333
`);

const roadD = sprite(`
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  3333333333333333
`);

const roadE = sprite(`
  4444434444444444
  4444434444444444
  4444434444444444
  4444434444444444
  4444434444444444
  4444434444444444
  4444434444444444
  3333333333333333
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  4444444444444444
  3333333333333333
`);

export const roadTiles: Sprite[] = [roadA, roadB, roadC, roadD, roadE];

// ---------------------------------------------------------------------------------------
// Plank: the deck of a boardwalk, a jetty or a bridge. Boards 4 pixels deep in sunlit
// wood.2 with wood.1 gaps; each variant butts two boards at its own columns.
// `plankTiles` has the boards running east-west, `plankUprightTiles` north-south.
// ---------------------------------------------------------------------------------------

const plankA = sprite(`
  wwwwwvwwwwwwwwww
  wwwwwvwwwwwwwwww
  wwwwwvwwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwvwwww
  wwwwwwwwwwwvwwww
  wwwwwwwwwwwvwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
`);

const plankB = sprite(`
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwvwwwwwww
  wwwwwwwwvwwwwwww
  wwwwwwwwvwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwvwwwwwwwwwwwww
  wwvwwwwwwwwwwwww
  wwvwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
`);

const plankC = sprite(`
  wwwwwwwwwwwwwvww
  wwwwwwwwwwwwwvww
  wwwwwwwwwwwwwvww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwvwwwwwwwww
  wwwwwwvwwwwwwwww
  wwwwwwvwwwwwwwww
  vvvvvvvvvvvvvvvv
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  wwwwwwwwwwwwwwww
  vvvvvvvvvvvvvvvv
`);

export const plankTiles: Sprite[] = [plankA, plankB, plankC];
export const plankUprightTiles: Sprite[] = plankTiles.map(upright);

// ---------------------------------------------------------------------------------------
// Soil: a tilled garden bed. Flat wood.1 with a furrow every 8 pixels: a broken wood.0
// line in the trough and a few wood.2 crumbs on the ridge above it. A row of plants
// stands on each ridge.
// ---------------------------------------------------------------------------------------

const soilA = sprite(`
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvwwvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuuuuvvuuuuuuuu
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvwvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuuuuuuuuuuvuuu
`);

const soilB = sprite(`
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvwwvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuuuuuuuuuuuuuu
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvwvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuvvuuuuuuuuuuu
`);

const soilC = sprite(`
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvwvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuuuuuuuuuvuuuu
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvwwvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  vvvvvvvvvvvvvvvv
  uuuuuuuuvuuuuuuu
`);

export const soilTiles: Sprite[] = [soilA, soilB, soilC];
