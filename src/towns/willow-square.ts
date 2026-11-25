/**
 * Willow Square: the first Simutown town, 44 x 30 tiles.
 *
 * Three streets run east-west. The High Street (rows 9-10) passes the cottage, the bakery,
 * the cafe, the town hall, the library and the shop, and opens into the paved square with
 * its fountain, the great willow and the market. Mill Lane (rows 18-19) runs under the
 * square past the post office, the townhouse and the farmhouse. Garden Row (row 28) serves
 * the school and two houses, then turns into a footpath that crosses the stream on a plank
 * bridge to the kitchen garden. The park and its pond lie between Mill Lane and the bridge.
 *
 * Every building faces south, so a building's door place is one tile below its front and
 * its roof hides the two or three rows behind it. `describeTown(willowSquare)` prints the
 * map with every place name.
 */
import type { Town } from '../core/types';
import { createRng } from '../world/random';
import { defineTown, type PropSpec } from '../world/town';

const LEGEND: Record<string, string> = {
  g: 'grass',
  m: 'meadow',
  t: 'tall-grass',
  '=': 'cobble',
  d: 'dirt',
  s: 'soil',
  a: 'sand',
  '~': 'water',
  P: 'plank-v',
};

//          1111111111222222222233333333334444
//01234567890123456789012345678901234567890123
const TERRAIN = `
  mmmggggggggggggggggggggggggggggggggggggggmmm
  mmggggggggggggggggggggggggggggggggggggggggmm
  gggggggggggggggggggggggggggggggggggggggggggm
  gggggggggggggggggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggggggggggggggggg
  ============================================
  ============================================
  gggggggggggggg====================gggggggggg
  gggggggggggggg=ggg================gggggggggg
  gggggggggggggg=gggg===============gggggggggg
  gggggggggggggg=ggg================gggggggggg
  gggggggggggggg====================gggggggggg
  ggggggggggggggg==================ggggggggggg
  ggggggggggggggg==gggggg==gggggg==ggggggggggg
  ============================================
  ============================================
  gggaaaggggggggggggggggggdgggggmmggggggdggggg
  gggaaagggggggggggggggggddggggmmmmgggssdssssg
  gggggggggggggggggggggggdggggggmmttggssdssssg
  gggggggggggggggggmmggggdgg~~~~~ttgggddddgggg
  ggggggggggggggggmmmggggdg~~~~~~~~~ggssdggggg
  gggggggggggggggggmmggggdggt~~~~~~~ggssdggggg
  gggggggggggggggggggggggdgggtgggg~~ggggdggggg
  gggggggggggggggggggggggddddddddPPPPgggdggggg
  ======================ddgggggggPPPPddddggggg
  ggggggggggggggggggggggggmmgggggt~~tggggggmmm
`;

/** `kind` on every tile of a list. */
function each(kind: string, tiles: [number, number][]): PropSpec[] {
  return tiles.map((at) => ({ kind, at }));
}

/** An east-west hedge from x0 to x1 on row y, with an end piece at each end. */
function hedgeRow(x0: number, x1: number, y: number, ends: { west?: string; east?: string } = {}): PropSpec[] {
  const out: PropSpec[] = [];
  for (let x = x0; x <= x1; x++) {
    const kind = x === x0 ? (ends.west ?? 'hedge-h-l') : x === x1 ? (ends.east ?? 'hedge-h-r') : 'hedge-h';
    out.push({ kind, at: [x, y] });
  }
  return out;
}

/** A north-south hedge on column x from y0 down to y1. `top` is the piece at its north end. */
function hedgeCol(x: number, y0: number, y1: number, top = 'hedge'): PropSpec[] {
  const out: PropSpec[] = [{ kind: top, at: [x, y0] }];
  for (let y = y0 + 1; y <= y1; y++) out.push({ kind: 'hedge-v', at: [x, y] });
  return out;
}

const buildings: PropSpec[] = [
  // the High Street, west to east
  { kind: 'cottage-blue', at: [1, 8], id: 'cottage' },
  { kind: 'bakery', at: [6, 8], id: 'bakery' },
  { kind: 'cafe', at: [12, 8], id: 'cafe' },
  { kind: 'townhall', at: [20, 8], id: 'townhall' },
  { kind: 'library', at: [30, 8], id: 'library' },
  { kind: 'shop', at: [36, 8], id: 'shop' },
  // Mill Lane
  { kind: 'post-office', at: [1, 17], id: 'post-office' },
  { kind: 'townhouse', at: [7, 17], id: 'townhouse' },
  { kind: 'farmhouse', at: [36, 17], id: 'farmhouse' },
  // Garden Row
  { kind: 'school', at: [1, 27], id: 'school' },
  { kind: 'house-brick', at: [10, 27], id: 'brick-house' },
  { kind: 'house', at: [16, 27], id: 'red-house' },
  // the kitchen garden
  { kind: 'shed', at: [40, 26], id: 'shed' },
];

const square: PropSpec[] = [
  { kind: 'fountain', at: [22, 14], id: 'fountain' },
  { kind: 'willow', at: [16, 14], id: 'willow' },
  { kind: 'bench', at: [16, 15], id: 'square.bench' },
  { kind: 'bench', at: [29, 15], id: 'market.bench' },
  { kind: 'noticeboard', at: [20, 12], id: 'noticeboard' },
  { kind: 'clock', at: [26, 11], id: 'clock' },
  // the market
  { kind: 'stall', at: [27, 13], id: 'market.fruit' },
  { kind: 'stall-teal', at: [31, 13], id: 'market.greens' },
  { kind: 'crate', at: [30, 13] },
  { kind: 'barrel', at: [26, 13] },
  { kind: 'cart', at: [26, 15], id: 'market.cart' },
  // the cafe front and the bakery's delivery
  { kind: 'planter', at: [12, 9] },
  { kind: 'planter', at: [16, 9] },
  { kind: 'crate', at: [9, 9] },
  { kind: 'barrel', at: [10, 9] },
  { kind: 'bin', at: [18, 15] },
  { kind: 'bin', at: [33, 15] },
  // under the willow
  { kind: 'flowers-white', at: [18, 13] },
  { kind: 'flowers-pink', at: [15, 12] },
  { kind: 'grass-tuft-small', at: [17, 12] },
  { kind: 'clover', at: [15, 14] },
  // the green strip between the square and Mill Lane
  ...hedgeRow(18, 21, 17),
  ...hedgeRow(26, 29, 17),
  { kind: 'bush', at: [17, 17] },
  { kind: 'bush', at: [30, 17] },
];

const lamps: PropSpec[] = [
  // the High Street: one in each gap between the buildings
  { kind: 'lamp', at: [5, 8], id: 'lamp.cottage' },
  { kind: 'lamp', at: [11, 8], id: 'lamp.bakery' },
  { kind: 'lamp', at: [19, 8], id: 'lamp.hall-west' },
  { kind: 'lamp', at: [28, 8], id: 'lamp.hall-east' },
  { kind: 'lamp', at: [35, 8], id: 'lamp.library' },
  { kind: 'lamp', at: [42, 8], id: 'lamp.shop' },
  // the square
  { kind: 'lamp', at: [13, 12], id: 'lamp.square-nw' },
  { kind: 'lamp', at: [34, 12], id: 'lamp.square-ne' },
  { kind: 'lamp', at: [14, 16], id: 'lamp.square-sw' },
  { kind: 'lamp', at: [33, 16], id: 'lamp.square-se' },
  { kind: 'lamp', at: [22, 17], id: 'lamp.gate-west' },
  { kind: 'lamp', at: [25, 17], id: 'lamp.gate-east' },
  // Mill Lane
  { kind: 'lamp', at: [0, 17], id: 'lamp.post' },
  { kind: 'lamp', at: [11, 17], id: 'lamp.townhouse' },
  { kind: 'lamp', at: [43, 17], id: 'lamp.farm' },
  { kind: 'lamp', at: [9, 20], id: 'lamp.school' },
  { kind: 'lamp', at: [21, 20], id: 'lamp.park' },
  { kind: 'lamp', at: [34, 20], id: 'lamp.stream' },
  // Garden Row and the bridge
  { kind: 'lamp', at: [9, 27], id: 'lamp.garden-row' },
  { kind: 'lamp', at: [22, 27], id: 'lamp.row-end' },
  { kind: 'lamp', at: [30, 26], id: 'lamp.bridge' },
];

const northEdge: PropSpec[] = [
  // a line of trees behind the High Street, seen over the roofs and in the gaps
  ...each('pine', [[0, 3], [5, 2], [11, 3], [18, 2], [29, 2], [35, 3], [43, 4], [42, 1]]),
  ...each('tree', [[3, 2], [8, 1], [15, 3], [33, 1], [39, 1]]),
  ...each('oak', [[13, 1], [19, 5], [28, 5]]),
  ...each('pine', [[0, 6], [5, 5], [11, 6], [35, 6], [43, 7]]),
  { kind: 'bush', at: [18, 8] },
  { kind: 'bush', at: [29, 8] },
  { kind: 'bush', at: [0, 8] },
  { kind: 'flowers-blue', at: [2, 0] },
  { kind: 'flowers-yellow', at: [41, 3] },
];

const westGardens: PropSpec[] = [
  // behind the post office and the townhouse: a hedge along the High Street, lawns, an oak
  ...hedgeRow(0, 5, 11, { west: 'hedge-h' }),
  ...hedgeRow(7, 10, 11),
  { kind: 'oak', at: [12, 14] },
  { kind: 'fruit-tree', at: [2, 13] },
  { kind: 'tulips-pink', at: [6, 12] },
  { kind: 'tulips', at: [6, 13] },
  { kind: 'flowers-yellow', at: [0, 13] },
  { kind: 'flowers', at: [11, 12] },
  { kind: 'flowers-purple', at: [13, 13] },
  { kind: 'bush', at: [13, 15] },
  { kind: 'mailbox', at: [6, 17], id: 'mailbox' },
  { kind: 'signpost', at: [12, 17], id: 'signpost' },
  { kind: 'flowers-white', at: [13, 17] },
];

const eastGardens: PropSpec[] = [
  // behind the farmhouse: an orchard
  ...each('fruit-tree', [[36, 12], [38, 12], [40, 12], [42, 12]]),
  { kind: 'well', at: [34, 15], id: 'well' },
  { kind: 'flowers', at: [35, 13] },
  { kind: 'flowers-white', at: [37, 11] },
  { kind: 'flowers-yellow', at: [41, 11] },
  { kind: 'grass-tuft', at: [39, 13] },
  { kind: 'log', at: [34, 13] },
  { kind: 'stepping-stones', at: [35, 17] },
];

const gardenRow: PropSpec[] = [
  // the school yard and the back gardens along Mill Lane
  ...hedgeCol(9, 21, 23),
  ...hedgeCol(15, 20, 22),
  { kind: 'fence-h-left', at: [0, 20] },
  { kind: 'fence-h', at: [1, 20] },
  { kind: 'fence-h-right', at: [2, 20] },
  { kind: 'fence-h-left', at: [6, 20] },
  { kind: 'fence-h', at: [7, 20] },
  { kind: 'fence-h-right', at: [8, 20] },
  // the yard's trees stand clear of the fence, so its rails are not hidden behind a trunk
  { kind: 'tree', at: [7, 22] },
  { kind: 'sapling', at: [1, 22] },
  { kind: 'fruit-tree', at: [12, 22] },
  { kind: 'flowers-pink', at: [11, 21] },
  { kind: 'flowers', at: [13, 20] },
  { kind: 'tulips-yellow', at: [14, 22] },
  { kind: 'bush-large', at: [17, 21] },
  { kind: 'flowers-blue', at: [19, 20] },
  { kind: 'planter', at: [9, 28] },
  { kind: 'bush', at: [15, 27] },
  { kind: 'flowers-white', at: [3, 29] },
  { kind: 'flowers-yellow', at: [13, 29] },
  { kind: 'tulips', at: [20, 29] },
  { kind: 'pine', at: [0, 29] },
];

const park: PropSpec[] = [
  { kind: 'bench', at: [27, 21], id: 'park.bench' },
  { kind: 'bench', at: [21, 24], id: 'pond.bench' },
  { kind: 'oak', at: [31, 21] },
  { kind: 'tree', at: [25, 21] },
  { kind: 'pine', at: [26, 29] },
  { kind: 'sapling', at: [25, 28] },
  { kind: 'bush', at: [22, 21] },
  { kind: 'bush-large', at: [28, 29] },
  { kind: 'rock-large', at: [24, 26] },
  { kind: 'rock', at: [31, 23] },
  { kind: 'stump', at: [29, 28] },
  { kind: 'flowers', at: [25, 22] },
  { kind: 'flowers-yellow', at: [22, 25] },
  { kind: 'flowers-purple', at: [26, 26] },
  { kind: 'flowers-pink', at: [30, 28] },
  { kind: 'flowers-white', at: [24, 29] },
  { kind: 'fern', at: [30, 26] },
  { kind: 'mushrooms', at: [22, 27] },
  { kind: 'pebbles', at: [25, 26] },
  // in the water
  { kind: 'lily-pads', at: [28, 24] },
  { kind: 'lotus', at: [30, 24] },
  { kind: 'lily', at: [29, 25] },
  { kind: 'reeds', at: [26, 23] },
  { kind: 'reeds-small', at: [27, 25] },
  { kind: 'water-rocks', at: [33, 26] },
  { kind: 'reeds-small', at: [32, 29] },
];

const kitchenGarden: PropSpec[] = [
  // the hedge, with a gate to Mill Lane, a gate to the bridge path and the shed's door
  ...hedgeRow(35, 37, 20),
  ...hedgeRow(39, 43, 20),
  ...hedgeCol(35, 21, 26, 'hedge-v'),
  ...hedgeCol(43, 21, 26, 'hedge-v'),
  { kind: 'hedge-sw', at: [35, 27] },
  ...hedgeRow(36, 37, 27, { west: 'hedge-h' }),
  ...hedgeRow(39, 40, 27),
  { kind: 'hedge-h-l', at: [42, 27] },
  { kind: 'hedge-se', at: [43, 27] },
  // the beds
  ...each('cabbages', [[36, 21], [37, 21], [39, 22], [40, 22]]),
  ...each('sprouts', [[36, 22], [37, 22], [36, 24], [41, 21], [42, 21]]),
  ...each('pumpkins', [[37, 24], [36, 25]]),
  { kind: 'tulips', at: [39, 21] },
  { kind: 'tulips-yellow', at: [40, 21] },
  { kind: 'cabbages', at: [37, 25] },
  { kind: 'sprouts', at: [41, 22] },
  { kind: 'cabbages', at: [42, 22] },
  { kind: 'barrel', at: [39, 26] },
  { kind: 'crate', at: [39, 25] },
  { kind: 'grass-tuft', at: [36, 26] },
  // outside the hedge
  { kind: 'signpost', at: [34, 26], id: 'bridge.signpost' },
  { kind: 'flowers', at: [40, 28] },
  { kind: 'tree', at: [42, 29] },
];

/** Tufts and clover on a few lawn tiles, so no stretch of grass is bare. Seeded: always the same. */
function lawnDetails(placed: PropSpec[]): PropSpec[] {
  const rows = TERRAIN.split('\n').map((r) => r.trim()).filter((r) => r.length > 0);
  const taken = new Set(placed.map((p) => `${p.at[0]},${p.at[1]}`));
  const rng = createRng('willow-square-lawn');
  const kinds = ['grass-tuft-small', 'grass-tuft', 'clover', 'grass-tuft-small', 'leaves'];
  const out: PropSpec[] = [];
  rows.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const roll = rng.next();
      if (ch !== 'g' || taken.has(`${tx},${ty}`) || roll > 0.05) return;
      out.push({ kind: rng.pick(kinds), at: [tx, ty] });
    });
  });
  return out;
}

const handPlaced: PropSpec[] = [
  ...buildings,
  ...square,
  ...lamps,
  ...northEdge,
  ...westGardens,
  ...eastGardens,
  ...gardenRow,
  ...park,
  ...kitchenGarden,
];

/** Who lives where: the id of the building each townsperson calls home, for `enter` and `exit`. */
export const willowSquareHomes: Record<string, string> = {
  ana: 'cottage',
  pia: 'cottage',
  bo: 'bakery',
  zara: 'shop',
  otto: 'townhouse',
  mira: 'townhouse',
  emil: 'townhouse',
  raj: 'red-house',
  noor: 'red-house',
  lin: 'red-house',
  idris: 'brick-house',
  kofi: 'brick-house',
  tomas: 'farmhouse',
  yuki: 'farmhouse',
};

/** The door tile of each building in `willowSquareHomes`. */
const DOORS: Record<string, [number, number]> = {
  cottage: [2, 9],
  bakery: [7, 9],
  shop: [37, 9],
  townhouse: [8, 18],
  'red-house': [18, 28],
  'brick-house': [11, 28],
  farmhouse: [38, 18],
};

const homePlaces: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(willowSquareHomes).map(([who, building]) => [`${who}.home`, DOORS[building]!]),
);

/**
 * Willow Square. Besides every prop's own places (`cafe.door`, `fountain.south`,
 * `park.bench.left`, `market.fruit.vendor`...), it names the spots a scene is likely to
 * need, and `<name>.home` for the door of each townsperson's home.
 */
export const willowSquare: Town = defineTown({
  name: 'Willow Square',
  terrain: TERRAIN,
  legend: LEGEND,
  props: [...handPlaced, ...lawnDetails(handPlaced)],
  places: {
    // the square
    square: [23, 11],
    'square.north': [23, 10],
    'square.south': [23, 16],
    'square.west': [14, 13],
    'square.east': [33, 14],
    'square.gate': [23, 17],
    'willow.shade': [19, 13],
    market: [30, 14],
    // the streets, at the edges of the map
    'highstreet.west': [0, 10],
    'highstreet.east': [43, 10],
    'milllane.west': [0, 19],
    'milllane.east': [43, 19],
    'gardenrow.west': [0, 28],
    // the park
    'park.gate': [24, 20],
    park: [24, 22],
    'pond.north': [28, 22],
    'pond.west': [24, 24],
    'pond.south': [28, 26],
    // the bridge over the stream
    'bridge.west': [30, 27],
    bridge: [32, 27],
    'bridge.east': [35, 28],
    // the kitchen garden and the school yard
    'garden.gate': [38, 20],
    garden: [38, 23],
    'garden.beds': [36, 23],
    'garden.south-gate': [38, 27],
    orchard: [39, 13],
    playground: [4, 21],
    ...homePlaces,
  },
});
