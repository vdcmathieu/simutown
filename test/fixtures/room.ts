/**
 * A throwaway room built from the built-in art, for testing interiors before the real
 * interior art exists: a plank floor, a plastered wall with a skirting board, a bench,
 * a few crates and barrels, and two lamps. It is the inside of the bakery of a small
 * outdoor town, which also comes without rooms for comparison.
 */
import { art as builtin, defineTown, type TerrainDef, type Town, type TownSpec } from '../../src';
import { ground } from '../../src/art/terrain/ground';
import { sprite } from '../../src/core/sprite';

const skirting = sprite(`
  1111111111111111
  0000000000000000
`, { legend: { '0': 'wood.0', '1': 'wood.1' } });
const crack = sprite(`
  1.
  .1
`, { legend: { '1': 'cream.0' } });

/** A plaster wall, solid: the back of the room. */
const wall: TerrainDef = { id: 'wall', variants: [ground('cream.2'), ground('cream.2', [crack, 9, 6])], solid: true, priority: 20 };
/** The bottom row of the wall, with its skirting board. */
const wallBase: TerrainDef = { id: 'wall-base', variants: [ground('cream.2', [skirting, 0, 14])], solid: true, priority: 20 };

/** The built-in art plus the two wall terrains. */
export const roomArt = { ...builtin, terrain: { ...builtin.terrain, wall, 'wall-base': wallBase } };

/** The inside of the bakery: 12 x 7 tiles, its door at the bottom in the middle. */
export const testRoom: Town = defineTown(
  {
    name: 'Test bakery',
    indoor: true,
    terrain: `
      WWWWWWWWWWWW
      BBBBBBBBBBBB
      pppppppppppp
      pppppppppppp
      pppppppppppp
      pppppppppppp
      pppppppppppp
    `,
    legend: { W: 'wall', B: 'wall-base', p: 'plank-v' },
    props: [
      { kind: 'lamp', at: [1, 2], id: 'lamp-left' },
      { kind: 'lamp', at: [10, 2], id: 'lamp-right' },
      { kind: 'bench', at: [4, 2], id: 'bench' },
      { kind: 'crate', at: [8, 2] },
      { kind: 'barrel', at: [9, 3] },
      { kind: 'planter', at: [2, 5] },
    ],
    places: { door: [6, 6], counter: [7, 4], window: [3, 4] },
  },
  roomArt,
);

const outside: TownSpec = {
  name: 'Test street',
  terrain: `
    gggggggggggg
    gggggggggggg
    gggggggggggg
    gggggggggggg
    gggggggggggg
    cccccccccccc
    cccccccccccc
    gggggggggggg
  `,
  legend: { g: 'grass', c: 'cobble' },
  props: [
    { kind: 'bakery', at: [2, 4], id: 'bakery' },
    { kind: 'shed', at: [8, 4], id: 'shed' },
    { kind: 'lamp', at: [11, 4] },
  ],
  places: { plaza: [8, 6] },
};

/** The street with the bakery and its room. */
export const townWithRoom: Town = defineTown({ ...outside, interiors: { bakery: testRoom } }, roomArt);
/** The same street with no rooms. */
export const townWithoutRoom: Town = defineTown(outside, roomArt);
