/**
 * The rooms of Willow Square: the inside of every building with a door, except the shed.
 *
 * Each room is a back wall two rows high (`wall-<look>` over its base row) and five rows of
 * floor, at most 14 tiles wide, inside a border of ink: at zoom 2 the whole room shows,
 * with its wooden cap and a margin of ink on every side. Shops and public rooms are 13 or
 * 14 tiles wide, homes 11 or 12. Each room's `door` place is on the bottom floor row,
 * under a doormat, roughly where the building's door is on its front. Tall furniture
 * stands against the back wall, so nobody at a named place is hidden behind it.
 *
 * Scenes name what is inside as `<building>:<name>`: `bakery:counter.behind`,
 * `red-house:hearth`, `school:seat-3`. `describeTown(willowSquare)` lists them all.
 */
import type { Town } from '../core/types';
import { defineTown, type PropSpec } from '../world/town';

/** What a room is made of: its wall, the wall's base row, and its floor (terrain ids). */
interface Finish {
  wall: string;
  base: string;
  floor: string;
}

/** A room `width` tiles wide: ink, two rows of wall, five rows of floor (rows 3 to 7), ink. */
function room(name: string, width: number, finish: Finish, props: PropSpec[], places: Record<string, [number, number]>): Town {
  const row = (ch: string) => `#${ch.repeat(width)}#`;
  const terrain = [row('#'), row('W'), row('B'), ...Array<string>(5).fill(row('.')), row('#')].join('\n');
  return defineTown({
    name,
    indoor: true,
    terrain,
    legend: { '#': 'ink', W: finish.wall, B: finish.base, '.': finish.floor },
    props,
    places,
  });
}

/** `kind` at each tile, with ids `<prefix>-1`, `<prefix>-2`, ... in order. */
function numbered(kind: string, prefix: string, tiles: [number, number][], from = 1): PropSpec[] {
  return tiles.map((at, i) => ({ kind, at, id: `${prefix}-${i + from}` }));
}

/** Ana and Pia's cottage: a small sitting room with a hearth and an armchair, Pia's paintings, a kitchen corner. */
const cottage = room(
  'Cottage',
  11,
  { wall: 'wall-paper', base: 'wall-paper-base', floor: 'floor-pine' },
  [
    { kind: 'bookshelf', at: [1, 3], id: 'bookshelf' },
    { kind: 'fireplace', at: [3, 3], id: 'fireplace' },
    { kind: 'armchair', at: [5, 4], id: 'armchair' },
    { kind: 'picture-flowers', at: [5, 2] },
    { kind: 'window-wide', at: [6, 2] },
    { kind: 'picture', at: [8, 2] },
    { kind: 'wall-shelf', at: [9, 2] },
    { kind: 'kitchen-counter', at: [9, 3], id: 'kitchen' },
    { kind: 'rug', at: [7, 7] },
    { kind: 'chair', at: [8, 5], id: 'chair' },
    { kind: 'table', at: [8, 6], id: 'table' },
    { kind: 'chair-back', at: [9, 7], id: 'chair-2' },
    { kind: 'side-table', at: [1, 6] },
    { kind: 'potted-plant', at: [11, 7] },
    { kind: 'doormat', at: [5, 7] },
  ],
  { door: [5, 7], hearth: [4, 4] },
);

/** Bo's bakery: the oven and the racks along the back, the serving counter in the middle. */
const bakery = room(
  'Bakery',
  13,
  { wall: 'wall-plaster', base: 'wall-brick-base', floor: 'floor-stone' },
  [
    { kind: 'bread-rack', at: [1, 3], id: 'rack' },
    { kind: 'bread-rack', at: [3, 3], id: 'rack-2' },
    { kind: 'wall-lamp', at: [5, 2] },
    { kind: 'window-wide', at: [6, 2] },
    { kind: 'wall-lamp', at: [8, 2] },
    { kind: 'oven', at: [10, 3], id: 'oven' },
    { kind: 'wall-shelf', at: [12, 2] },
    { kind: 'flour-sack', at: [12, 3] },
    { kind: 'flour-sack', at: [13, 3] },
    { kind: 'bakery-counter', at: [6, 5], id: 'counter' },
    { kind: 'tray-table', at: [11, 6], id: 'trays' },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'potted-plant', at: [13, 7] },
    { kind: 'doormat', at: [4, 7] },
  ],
  // a customer waits a step back from the counter, so their bubble leaves Bo's face clear
  { door: [4, 7], customer: [7, 7] },
);

/** The cafe: the bar with its stools and the cake display on the left, little tables by the windows. */
const cafe = room(
  'Cafe',
  14,
  { wall: 'wall-stripe', base: 'wall-stripe-base', floor: 'floor-checker' },
  [
    { kind: 'menu-board', at: [2, 2] },
    { kind: 'bar-counter', at: [1, 4], id: 'bar' },
    { kind: 'bar-stool', at: [1, 5], id: 'stool-1' },
    { kind: 'bar-stool', at: [3, 5], id: 'stool-2' },
    { kind: 'cake-display', at: [5, 3], id: 'cakes' },
    { kind: 'wall-lamp', at: [7, 2] },
    { kind: 'window-wide', at: [9, 2] },
    { kind: 'picture-flowers', at: [11, 2] },
    { kind: 'window-wide', at: [12, 2] },
    { kind: 'wall-lamp', at: [14, 2] },
    { kind: 'cafe-chair', at: [9, 4], id: 'chair-1' },
    { kind: 'cafe-table', at: [10, 4], id: 'table-1' },
    { kind: 'cafe-chair-left', at: [11, 4], id: 'chair-2' },
    { kind: 'cafe-chair', at: [11, 6], id: 'chair-3' },
    { kind: 'cafe-table', at: [12, 6], id: 'table-2' },
    { kind: 'cafe-chair-left', at: [13, 6], id: 'chair-4' },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'potted-plant', at: [14, 7] },
    { kind: 'doormat', at: [6, 7] },
  ],
  { door: [6, 7], tables: [10, 5] },
);

/** The town hall: the council at its long table under the founder's portrait, a lectern, banners, public seats. */
const townhall = room(
  'Town hall',
  14,
  { wall: 'wall-panel', base: 'wall-panel-base', floor: 'floor-stone' },
  [
    { kind: 'bookshelf', at: [1, 3], id: 'records' },
    { kind: 'window-wide', at: [3, 2] },
    { kind: 'grand-clock', at: [5, 3], id: 'clock' },
    { kind: 'wall-lamp', at: [6, 2] },
    { kind: 'banner', at: [7, 2] },
    { kind: 'picture', at: [8, 2] },
    { kind: 'banner', at: [9, 2] },
    { kind: 'window-wide', at: [10, 2] },
    { kind: 'wall-lamp', at: [12, 2] },
    { kind: 'bookshelf', at: [13, 3], id: 'records-2' },
    { kind: 'chair', at: [7, 4], id: 'council-1' },
    { kind: 'chair', at: [8, 4], id: 'mayor' },
    { kind: 'chair', at: [9, 4], id: 'council-2' },
    { kind: 'table-long', at: [7, 5], id: 'council' },
    { kind: 'lectern', at: [11, 5], id: 'lectern' },
    ...numbered('chair-back', 'seat', [[3, 7], [4, 7], [5, 7], [10, 7], [11, 7], [12, 7]]),
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'potted-plant', at: [14, 7] },
    { kind: 'doormat', at: [8, 7] },
  ],
  { door: [8, 7], aisle: [8, 6] },
);

/** The library: shelves along the back wall, the clock, two lamp-lit reading desks and a globe. */
const library = room(
  'Library',
  13,
  { wall: 'wall-panel', base: 'wall-panel-base', floor: 'floor-wood' },
  [
    { kind: 'bookshelf', at: [1, 3], id: 'shelf-1' },
    { kind: 'bookshelf', at: [3, 3], id: 'shelf-2' },
    { kind: 'bookshelf', at: [5, 3], id: 'shelf-3' },
    { kind: 'grand-clock', at: [7, 3], id: 'clock' },
    { kind: 'bookshelf', at: [8, 3], id: 'shelf-4' },
    { kind: 'bookshelf', at: [10, 3], id: 'shelf-5' },
    { kind: 'bookshelf', at: [12, 3], id: 'shelf-6' },
    { kind: 'reading-desk', at: [2, 5], id: 'desk-1' },
    { kind: 'chair-back', at: [3, 6], id: 'chair-1' },
    { kind: 'reading-desk', at: [10, 5], id: 'desk-2' },
    { kind: 'chair-back', at: [11, 6], id: 'chair-2' },
    { kind: 'rug-round', at: [6, 6] },
    { kind: 'globe', at: [13, 7] },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'doormat', at: [7, 7] },
  ],
  { door: [7, 7], stacks: [5, 4] },
);

/** Zara's shop: goods on the shelves, sacks of flour, a display table and the counter with its till. */
const shop = room(
  'Shop',
  13,
  { wall: 'wall-panel', base: 'wall-panel-base', floor: 'floor-checker' },
  [
    { kind: 'goods-shelf', at: [1, 3], id: 'shelf-1' },
    { kind: 'goods-shelf', at: [3, 3], id: 'shelf-2' },
    { kind: 'goods-shelf', at: [5, 3], id: 'shelf-3' },
    { kind: 'window', at: [7, 2] },
    { kind: 'wall-clock', at: [8, 2] },
    { kind: 'wall-lamp', at: [9, 2] },
    { kind: 'goods-shelf', at: [10, 3], id: 'shelf-4' },
    { kind: 'flour-sack', at: [12, 3] },
    { kind: 'flour-sack', at: [13, 3] },
    { kind: 'shop-counter', at: [9, 5], id: 'counter' },
    { kind: 'display-table', at: [2, 6], id: 'display' },
    { kind: 'potted-plant', at: [13, 7] },
    { kind: 'doormat', at: [4, 7] },
  ],
  { door: [4, 7], shelves: [4, 4] },
);

/** The post office: the counter in front of the pigeon-holes, mail sacks, a bench to wait on, a writing desk. */
const postOffice = room(
  'Post office',
  13,
  { wall: 'wall-plaster', base: 'wall-panel-base', floor: 'floor-wood' },
  [
    { kind: 'window', at: [2, 2] },
    { kind: 'wall-clock', at: [4, 2] },
    { kind: 'wall-lamp', at: [5, 2] },
    { kind: 'sofa', at: [1, 3], id: 'bench' },
    { kind: 'pigeon-holes', at: [6, 3], id: 'pigeon-holes' },
    { kind: 'banner', at: [9, 2] },
    { kind: 'flour-sack', at: [10, 3], id: 'mailbag' },
    { kind: 'flour-sack', at: [11, 3], id: 'mailbag-2' },
    { kind: 'wall-lamp', at: [12, 2] },
    { kind: 'window', at: [13, 2] },
    { kind: 'post-counter', at: [6, 5], id: 'counter' },
    { kind: 'chair', at: [12, 5], id: 'desk-chair' },
    { kind: 'table', at: [11, 6], id: 'desk' },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'potted-plant', at: [13, 7] },
    { kind: 'doormat', at: [7, 7] },
  ],
  { door: [7, 7], queue: [8, 7] },
);

/** The townhouse: Otto's books and fireside armchair, Mira's plants, the sofa, Emil's lamp-lit desk. */
const townhouse = room(
  'Townhouse',
  12,
  { wall: 'wall-panel', base: 'wall-panel-base', floor: 'floor-wood' },
  [
    { kind: 'bookshelf', at: [1, 3], id: 'bookshelf' },
    { kind: 'window-wide', at: [3, 2] },
    { kind: 'potted-plant', at: [5, 3] },
    { kind: 'picture-flowers', at: [6, 2] },
    { kind: 'wall-clock', at: [7, 2] },
    { kind: 'fireplace', at: [8, 3], id: 'fireplace' },
    { kind: 'armchair', at: [10, 4], id: 'armchair' },
    { kind: 'window', at: [11, 2] },
    { kind: 'potted-plant', at: [12, 3] },
    { kind: 'sofa', at: [2, 5], id: 'sofa' },
    { kind: 'side-table', at: [4, 5] },
    { kind: 'rug-round', at: [2, 7] },
    { kind: 'reading-desk', at: [10, 6], id: 'desk' },
    { kind: 'chair-back', at: [11, 7], id: 'desk-chair' },
    { kind: 'doormat', at: [5, 7] },
  ],
  { door: [5, 7], hearth: [7, 4] },
);

/** Tomas and Yuki's farmhouse: a big kitchen with a long table, the hearth, Yuki's books and globe. */
const farmhouse = room(
  'Farmhouse',
  13,
  { wall: 'wall-plaster', base: 'wall-brick-base', floor: 'floor-stone' },
  [
    { kind: 'kitchen-counter', at: [1, 3], id: 'kitchen' },
    { kind: 'wall-shelf', at: [1, 2] },
    { kind: 'flour-sack', at: [4, 3], id: 'sack' },
    { kind: 'window-wide', at: [5, 2] },
    { kind: 'wall-clock', at: [8, 2] },
    { kind: 'fireplace', at: [9, 3], id: 'fireplace' },
    { kind: 'bookshelf', at: [12, 3], id: 'bookshelf' },
    { kind: 'chair', at: [5, 4], id: 'chair' },
    { kind: 'chair', at: [7, 4], id: 'chair-2' },
    { kind: 'table-long', at: [5, 5], id: 'table' },
    { kind: 'chair-back', at: [6, 6], id: 'chair-3' },
    { kind: 'armchair', at: [11, 5], id: 'armchair' },
    { kind: 'globe', at: [13, 5] },
    { kind: 'rug-round', at: [10, 7] },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'doormat', at: [5, 7] },
  ],
  { door: [5, 7], hearth: [10, 4] },
);

/** The school: the teacher's desk under the blackboard, two staggered rows of pupils' desks facing it. */
const school = room(
  'School',
  14,
  { wall: 'wall-plaster', base: 'wall-plaster-base', floor: 'floor-wood' },
  [
    { kind: 'window-wide', at: [2, 2] },
    { kind: 'wall-lamp', at: [5, 2] },
    { kind: 'blackboard', at: [6, 2] },
    { kind: 'teacher-desk', at: [7, 4], id: 'desk' },
    { kind: 'wall-clock', at: [11, 2] },
    { kind: 'window-wide', at: [12, 2] },
    { kind: 'wall-lamp', at: [14, 2] },
    // staggered, so no desk stands right in front of a pupil in the row ahead; the row
    // along the back wall stays clear at both ends, so every seat can be reached
    ...[[2, 4], [4, 4], [11, 4], [13, 4], [3, 6], [5, 6], [10, 6], [12, 6]].map(([x, y]): PropSpec => ({ kind: 'school-desk', at: [x!, y!] })),
    ...numbered('chair-back', 'seat', [[2, 5], [4, 5], [11, 5], [13, 5], [3, 7], [5, 7], [10, 7], [12, 7]]),
    { kind: 'doormat', at: [8, 7] },
  ],
  { door: [8, 7], front: [6, 4], aisle: [8, 6] },
);

/** Idris and Kofi's brick house: the carpenter's workbench, a kitchen table, Kofi's bed. */
const brickHouse = room(
  'Brick house',
  11,
  { wall: 'wall-plaster', base: 'wall-brick-base', floor: 'floor-checker' },
  [
    { kind: 'wall-shelf', at: [1, 2] },
    { kind: 'table-long', at: [1, 4], id: 'workbench' },
    { kind: 'wall-lamp', at: [4, 2] },
    { kind: 'window', at: [5, 2] },
    { kind: 'kitchen-counter', at: [5, 3], id: 'kitchen' },
    { kind: 'wall-clock', at: [8, 2] },
    { kind: 'bed', at: [10, 4], id: 'bed' },
    { kind: 'chair', at: [6, 5], id: 'chair' },
    { kind: 'chair', at: [7, 5], id: 'chair-2' },
    { kind: 'table', at: [6, 6], id: 'table' },
    { kind: 'stool', at: [2, 6], id: 'stool' },
    { kind: 'rug-round', at: [9, 7] },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'doormat', at: [4, 7] },
  ],
  { door: [4, 7], workshop: [4, 4] },
);

/** Raj, Noor and Lin's red house: the family table before the fire, the kitchen, a reading corner. */
const redHouse = room(
  'Red house',
  12,
  { wall: 'wall-stripe', base: 'wall-panel-base', floor: 'floor-pine' },
  [
    { kind: 'bookshelf', at: [1, 3], id: 'bookshelf' },
    { kind: 'fireplace', at: [3, 3], id: 'fireplace' },
    { kind: 'floor-lamp', at: [5, 3] },
    { kind: 'window-wide', at: [6, 2] },
    { kind: 'wall-clock', at: [8, 2] },
    { kind: 'wall-lamp', at: [9, 2] },
    { kind: 'wall-shelf', at: [10, 2] },
    { kind: 'kitchen-counter', at: [10, 3], id: 'kitchen' },
    { kind: 'chair', at: [6, 4], id: 'chair' },
    { kind: 'chair', at: [7, 4], id: 'chair-2' },
    { kind: 'chair', at: [8, 4], id: 'chair-3' },
    { kind: 'table-long', at: [6, 5], id: 'table' },
    { kind: 'armchair', at: [11, 5], id: 'armchair' },
    { kind: 'side-table', at: [12, 5] },
    { kind: 'rug-round', at: [10, 7] },
    { kind: 'potted-plant', at: [1, 7] },
    { kind: 'doormat', at: [7, 7] },
  ],
  { door: [7, 7], hearth: [4, 4], 'table.front': [7, 6] },
);

/** The rooms of Willow Square, keyed by the id of the building each one is the inside of. */
export const willowSquareRooms: Record<string, Town> = {
  cottage,
  bakery,
  cafe,
  townhall,
  library,
  shop,
  'post-office': postOffice,
  townhouse,
  farmhouse,
  school,
  'brick-house': brickHouse,
  'red-house': redHouse,
};
