// The bakery and the cafe: counters with goods on show, the bread oven, racks of loaves,
// flour sacks, a tray of buns, cafe tables and chairs, a menu board and a cake display.
//
// A shop counter is three tiles wide and one deep, with `behind` (where the shopkeeper
// stands, the tile above its middle) and `front` (where the customer stands, the tile
// below its middle).
import type { PropDef } from '../../core/types';
import { Canvas, glow, outlined, STONE, WOOD } from './draw';
import { shelfCase, tableArt } from './home';

/** The places of every three-tile counter: `behind` its middle for the shopkeeper, `front` for the customer. */
export const counterPlaces = { behind: { dx: 1, dy: -1 }, front: { dx: 1, dy: 1 } };

// Bread, as small stamps. Golden crust in ochre: light on the upper left, shade below.
const loaf = `
  .qqqq.
  qrqqqp
  qqpqpp
  .pppo.
`;
const roll = `
  .qq.
  qrqp
  .pp.
`;
const baguette = `
  .qqqqqqqqq.
  qrqpqqpqqpp
  .ppppppppo.
`;

/**
 * A shop counter three tiles long: a top `top` with goods stamped along it, then a lip and
 * a panelled wooden front. Goods are stamped by `goods`, standing on row 13.
 */
export function counter(top: readonly [string, string], goods: (c: Canvas) => void): string {
  const c = new Canvas(48, 29);
  c.rect(1, 10, 46, 5, top[0]).rect(46, 10, 1, 5, top[1]);
  c.rect(1, 15, 46, 1, 'v').rect(1, 16, 46, 1, 'u');
  c.rect(2, 17, 44, 9, 'v').rect(45, 17, 1, 9, 'u');
  for (const x of [4, 19, 34]) c.rect(x, 18, 11, 7, 'u').rect(x + 1, 19, 10, 6, 'w').rect(x + 1, 19, 10, 5, 'v');
  c.rect(2, 26, 44, 1, 'w').rect(2, 27, 44, 1, 'u');
  goods(c);
  return c.text();
}

// The bakery counter: a cream marble top with a basket of rolls, a big round loaf on a
// board, and a pink cake on a stand.
const bakeryCounterArt = counter(['c', 'b'], (c) => {
  c.stamp(`
    ..qp.qp...
    .qrqpqrqp.
    wvwvwvwvwv
    .vwvwvwvw.
    ..vvvvvv..
  `, 4, 8);
  c.stamp(`
    ...qqqq....
    .qqrqqqqp..
    qqrqqpqqpp.
    qqqqpqqqpp.
    pqqqqqqqpo.
    wwwwwwwwwwv
    vvvvvvvvvvu
  `, 18, 6);
  c.stamp(`
    ...+*+....
    .********.
    *5*******+
    cccccccccb
    *********+
    .bbbbbbbb.
    ....44....
    ..444433..
  `, 33, 4);
});

// The bread oven: a brick dome on a stone base, its mouth glowing with embers.
function ovenArt(): string {
  const c = new Canvas(32, 38);
  for (let y = 2; y <= 31; y++) {
    const dy = Math.max(0, 13 - y);
    const half = Math.round(14 * Math.sqrt(Math.max(0, 1 - (dy / 12) ** 2)));
    const x0 = 16 - half;
    const x1 = 15 + half;
    c.rect(x0, y, x1 - x0 + 1, 1, 'z');
    c.rect(Math.max(x0, x1 - 2), y, Math.min(3, x1 - x0 + 1), 1, 'y');
  }
  // a few bricks, far apart
  c.rect(6, 8, 6, 1, 'y').rect(19, 12, 5, 1, 'y').rect(5, 17, 4, 1, 'y').rect(24, 22, 3, 1, 'y').rect(4, 26, 4, 1, 'y');
  c.rect(11, 3, 1, 4, 'y');
  // the mouth: a brick.0 arch, embers inside
  c.rect(9, 19, 14, 12, 'x').rect(10, 18, 12, 1, 'x');
  c.rect(10, 20, 12, 10, 'o').rect(11, 19, 10, 1, 'o');
  c.stamp(`
    ..p..q..p...
    .pqp.pqppqp.
    pqrqppqrqqpp
    qrrrqqrrrrqq
  `, 10, 26);
  c.box(1, 32, 30, 2, 3, STONE);
  return c.text();
}
const ovenGlow = { o: 'p', p: 'q', q: 'r', r: 'r' };

// A rack of bread: round loaves, baguettes, a basket of rolls.
const breadRackArt = shelfCase((c, floor, n) => {
  if (n === 0) for (const x of [4, 11, 18]) c.stamp(loaf, x, floor - 3);
  if (n === 0) c.stamp(roll, 25, floor - 2);
  if (n === 1) {
    c.stamp(baguette, 5, floor - 2);
    c.stamp(baguette, 15, floor - 2);
    c.stamp(baguette, 9, floor - 4);
  }
  if (n === 2) {
    c.stamp(`
      .qp.qp.qp..
      qrqpqrqqrqp
      wvwvwvwvwvw
      .vwvwvwvwv.
    `, 4, floor - 3);
    c.stamp(loaf, 20, floor - 3);
  }
});

// A fat sack of flour, tied at the neck, with two blue stripes woven in.
const flourSackArt = `
  ................
  ................
  ................
  ......c.cb......
  .......cb.......
  ......vvvu......
  .....ccccbb.....
  ....cccccccb....
  ...cc5cccccbb...
  ..ccc5cccccbbb..
  ..999999999988..
  ..ccccccccccbb..
  ..999999999988..
  ..ccccccccccbb..
  ..cccccccccbbb..
  ..ccccccccccbb..
  ...ccccccccbb...
  ...abbbbbbbaa...
  ................
`;

// A table with a tray of buns.
function trayTableArt(): string {
  const c = tableArt(2);
  c.rect(5, 2, 22, 5, '4').rect(26, 2, 1, 5, '3').rect(5, 6, 22, 1, '3');
  for (const [x, y] of [[7, 2], [12, 3], [17, 2], [22, 3]] as const) c.stamp(roll, x, y);
  return c.text();
}

// A round cafe table: a cream top on an iron pedestal, with a teal cup of coffee.
function cafeTableArt(cup: boolean): string {
  const c = new Canvas(16, 21);
  c.stamp(`
    ..cccccccccc..
    .cccccccccccb.
    cccccccccccccb
    cccccccccccccb
    .ccccccccccbb.
    .bbbbbbbbbbbb.
    ..aaaaaaaaaa..
  `, 1, 1);
  c.rect(7, 8, 1, 9, '2').rect(8, 8, 1, 9, '1');
  c.rect(4, 17, 8, 1, '2').rect(3, 18, 10, 1, '1');
  if (cup) c.stamp(`
    .77.
    7uu76
    .66.
  `, 8, 1);
  return c.text();
}

// A bistro chair seen from the side: the back on the left, a teal cushion on the seat.
// `faces` is where the sitter looks; the back is on the other side.
function cafeChairArt(faces: 'right' | 'left'): string {
  const c = new Canvas(16, 22);
  const back = faces === 'right' ? 3 : 10;
  c.rect(back, 1, 3, 1, 'w').rect(back, 2, 3, 9, 'v').rect(back, 2, 1, 9, 'w').rect(back + 2, 2, 1, 9, 'u');
  c.box(3, 11, 10, 3, 2, WOOD);
  c.rect(4, 11, 8, 2, '7').rect(4, 12, 8, 1, '6');
  c.rect(3, 16, 1, 5, 'w').rect(4, 16, 1, 5, 'v').rect(11, 16, 1, 5, 'v').rect(12, 16, 1, 5, 'u');
  return c.text();
}

// The cafe bar: a wooden top with the coffee machine, a cup of coffee and a cake dome.
const barCounterArt = counter(['w', 'v'], (c) => {
  c.stamp(`
    .5555555555..
    54444444443..
    44444444433..
    44yyyyyyy33..
    44444444433..
    44422222433..
    44442442433..
    44442c52433..
    44442cb2433..
    44444444433..
    33333333322..
  `, 3, 3);
  // a cup and saucer at the front edge of the top, clear of where a barista's feet show
  c.stamp(`
    .77.
    7uu76
    cccccb
  `, 27, 10);
  c.stamp(`
    ....ff....
    ..ff55ff..
    .f5....ff.
    f5.+*+..ff
    f.*****..f
    f*5*****+f
    fcccccccbf
    f*******+f
    4444444443
  `, 34, 4);
});

// A menu board for the wall: a green chalkboard in a wooden frame, a cup drawn on it and
// lines of chalk that stand for writing (signs never carry real lettering).
function menuBoardArt(): string {
  const c = new Canvas(32, 32);
  c.rect(3, 5, 26, 18, 'w').rect(28, 5, 1, 18, 'v').rect(3, 22, 26, 1, 'v');
  c.rect(5, 7, 22, 14, 'g');
  c.stamp(`
    .5..5..
    ..5..5.
    555555.
    5....555
    5....5.5
    5....555
    .5555...
  `, 6, 8);
  for (const [x, y, w] of [[13, 9, 7], [21, 9, 3], [13, 12, 5], [19, 12, 5], [7, 16, 6], [14, 16, 4], [7, 19, 4], [12, 19, 8], [22, 16, 3]] as const) c.rect(x, y, w, 1, '4');
  return c.text();
}

// The cake display: a glass case on a wooden cabinet, with cakes on two shelves.
function cakeDisplayArt(): string {
  const c = new Canvas(32, 28);
  c.rect(1, 3, 30, 3, 'f').rect(1, 3, 30, 1, '5');
  c.rect(1, 6, 30, 12, 'c').rect(1, 6, 1, 12, '4').rect(30, 6, 1, 12, '3').rect(1, 12, 30, 1, '4');
  c.stamp(`
    ..+*+..
    .******
    *5****+
    cccccbb
    *****++
  `, 3, 7);
  c.stamp(`
    .qq.qq.
    qrqpqrq
    ppppppp
  `, 12, 9);
  c.stamp(`
    ..ee..
    .eeeed
    ecccce
    eeeedd
  `, 22, 8);
  c.stamp(`
    .****+
    *5***+
    ccccbb
    ****++
  `, 4, 13);
  c.stamp(`
    .wwww.
    wcwwvv
    vvvvvu
  `, 14, 14);
  c.stamp(`
    .+*+.
    *****
    ****+
  `, 23, 14);
  // glints on the glass
  c.px(26, 7, '5').px(25, 8, '5').px(27, 13, '5').px(26, 14, '5');
  c.rect(1, 17, 30, 1, '4');
  c.rect(1, 18, 30, 1, 'w').rect(1, 19, 30, 7, 'v').rect(30, 18, 1, 8, 'u').rect(1, 25, 30, 1, 'u');
  c.rect(3, 20, 12, 4, 'u').rect(4, 21, 11, 3, 'v').rect(17, 20, 12, 4, 'u').rect(18, 21, 11, 3, 'v');
  return c.text();
}

/** The bakery and the cafe. */
export const shopProps: Record<string, PropDef> = {
  'bakery-counter': { id: 'bakery-counter', sprite: outlined(bakeryCounterArt), footprint: { w: 3, h: 1 }, places: counterPlaces },
  oven: {
    id: 'oven',
    sprite: outlined(ovenArt()),
    emissive: glow(ovenArt(), ovenGlow),
    footprint: { w: 2, h: 1 },
    lights: [{ dx: 16, dy: -12, radius: 56, slot: 'ochre.1', flicker: 0.25 }],
    places: { front: { dx: 0, dy: 1 } },
  },
  'bread-rack': { id: 'bread-rack', sprite: outlined(breadRackArt), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  'flour-sack': { id: 'flour-sack', sprite: outlined(flourSackArt), footprint: { w: 1, h: 1 } },
  'tray-table': { id: 'tray-table', sprite: outlined(trayTableArt()), footprint: { w: 2, h: 1 } },
  'cafe-table': { id: 'cafe-table', sprite: outlined(cafeTableArt(true)), footprint: { w: 1, h: 1 } },
  'cafe-chair': {
    id: 'cafe-chair',
    sprite: outlined(cafeChairArt('right')),
    footprint: { w: 1, h: 1 },
    seats: { seat: { x: 9, y: 2, dir: 'right' } },
  },
  'cafe-chair-left': {
    id: 'cafe-chair-left',
    sprite: outlined(cafeChairArt('left')),
    footprint: { w: 1, h: 1 },
    seats: { seat: { x: 7, y: 2, dir: 'left' } },
  },
  'bar-counter': { id: 'bar-counter', sprite: outlined(barCounterArt), footprint: { w: 3, h: 1 }, places: counterPlaces },
  'menu-board': { id: 'menu-board', sprite: outlined(menuBoardArt()), castHeight: 0 },
  'cake-display': { id: 'cake-display', sprite: outlined(cakeDisplayArt()), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
};
