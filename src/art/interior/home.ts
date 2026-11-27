// Home furniture: a table and chairs, a stool, a bed, a wardrobe, a bookshelf, the
// fireplace, a kitchen counter, a rug and a potted plant.
//
// Every piece is drawn as fill and closed in ink by `outlined`. Seats are where a sitter's
// feet go, in pixels from the anchor; see `seats` on PropDef. A sitter facing the viewer
// sits on the chair's base line (props are drawn before people on the same line), so they
// are drawn over it and whatever stands further down the screen (the table) is drawn
// over their lap.
import type { PropDef } from '../../core/types';
import { Canvas, flatArt, glow, outlined, WOOD } from './draw';

/**
 * A table `tiles` wide, 18 pixels tall (plus `above` empty rows for goods on it): a 6-row top, a 3-row apron, two stout legs. Its
 * top edge is 17 pixels above the base line, which is 3 rows below the chin of someone
 * seated on a chair behind it: their shoulders and a strip of shirt show over the top.
 */
export function tableArt(tiles: number, above = 0): Canvas {
  const w = tiles * 16;
  const c = new Canvas(w, 18 + above);
  const y = above;
  c.box(1, y + 1, w - 2, 6, 3, WOOD);
  // two boards across the top
  c.rect(1, y + 3, w - 3, 1, 'v');
  c.rect(2, y + 10, 1, 7, 'w').rect(3, y + 10, 1, 7, 'v');
  c.rect(w - 5, y + 10, 1, 7, 'v').rect(w - 4, y + 10, 1, 7, 'u');
  return c;
}

// A chair facing the viewer: a solid back behind, an ink line, then the seat.
function chairArt(): string {
  const c = new Canvas(16, 22);
  c.rect(3, 1, 10, 1, 'w').rect(2, 2, 12, 5, 'v').rect(13, 2, 1, 5, 'u').rect(2, 7, 12, 1, 'u').rect(2, 8, 12, 1, '0');
  c.box(2, 9, 12, 4, 2, WOOD);
  c.rect(2, 15, 1, 6, 'w').rect(3, 15, 1, 6, 'v').rect(12, 15, 1, 6, 'v').rect(13, 15, 1, 6, 'u');
  return c.text();
}

// The same chair seen from behind: its back stands in front of the sitter.
function chairBackArt(): string {
  const c = new Canvas(16, 13);
  // a top rail seen from above (lit), over the back panel with a lit left edge and two
  // slats, so it reads as the back of a chair and never as a stool
  c.rect(2, 1, 12, 2, 'w').rect(13, 1, 1, 2, 'v').rect(2, 3, 12, 1, 'u');
  c.rect(2, 4, 12, 3, 'v').rect(2, 4, 1, 3, 'w').rect(13, 4, 1, 3, 'u').rect(6, 4, 1, 3, 'u').rect(9, 4, 1, 3, 'u');
  c.rect(2, 7, 1, 5, 'w').rect(3, 7, 1, 5, 'v').rect(12, 7, 1, 5, 'v').rect(13, 7, 1, 5, 'u');
  return c.text();
}

function stoolArt(): string {
  const c = new Canvas(16, 13);
  c.box(3, 1, 10, 3, 2, WOOD);
  c.rect(4, 6, 1, 6, 'w').rect(5, 6, 1, 6, 'v').rect(10, 6, 1, 6, 'v').rect(11, 6, 1, 6, 'u');
  return c.text();
}

// A single bed, head to the wall: headboard, pillow on a white sheet, a teal blanket that
// falls over the foot, a low footboard.
function bedArt(): string {
  const c = new Canvas(16, 40);
  c.rect(2, 1, 12, 1, 'w').rect(1, 2, 14, 4, 'v').rect(14, 2, 1, 4, 'u').rect(1, 6, 14, 1, 'u').rect(1, 7, 14, 1, '0');
  c.rect(1, 8, 1, 25, 'w').rect(14, 8, 1, 25, 'v');
  c.rect(2, 8, 12, 6, '5').rect(3, 8, 10, 3, 'c').rect(3, 11, 10, 1, 'b').rect(2, 13, 12, 1, '4');
  c.rect(2, 14, 12, 17, '7').rect(13, 14, 1, 17, '6').rect(2, 14, 12, 1, '5');
  c.rect(2, 31, 12, 2, '6');
  c.box(1, 33, 14, 1, 3, WOOD);
  c.rect(1, 37, 2, 2, 'v').rect(13, 37, 2, 2, 'u');
  return c.text();
}

/** An inset panel: shade on its top and left, light on its bottom and right. */
function panel(c: Canvas, x: number, y: number, w: number, h: number, [light, base, shade]: readonly string[]): void {
  c.rect(x, y, w, h, base!).rect(x, y, w, 1, shade!).rect(x, y, 1, h, shade!);
  c.rect(x, y + h - 1, w, 1, light!).rect(x + w - 1, y, 1, h, light!);
}

// A tall wardrobe with two panelled doors under a cornice. Above eye level: no top plane.
function wardrobeArt(): string {
  const c = new Canvas(32, 39);
  c.rect(2, 1, 28, 1, 'w').rect(1, 2, 30, 2, 'v').rect(30, 2, 1, 2, 'u').rect(1, 4, 30, 1, 'u');
  c.rect(2, 5, 28, 29, 'v').rect(29, 5, 1, 29, 'u').rect(15, 6, 1, 27, 'u');
  for (const x of [4, 18]) {
    panel(c, x, 7, 9, 11, WOOD);
    panel(c, x, 20, 9, 11, WOOD);
  }
  c.px(13, 18, 'q').px(17, 18, 'q');
  c.rect(1, 34, 30, 1, 'w').rect(1, 35, 30, 1, 'u');
  c.rect(2, 36, 3, 2, 'u').rect(27, 36, 3, 2, 'u');
  return c.text();
}

/** Book spines: colours as light/shade pairs, laid left to right with the odd gap. */
const SPINES = [['y', 'x'], ['7', '6'], ['q', 'p'], ['9', '8'], ['e', 'd'], ['*', '+'], ['h', 'g'], ['z', 'y']] as const;

/** Fill a shelf from x0 to x1, standing on row `floor`, `tall` rows at most. */
function books(c: Canvas, x0: number, x1: number, floor: number, tall: number, seed: number): void {
  let x = x0;
  let i = seed;
  while (x + 2 <= x1) {
    const [light, shade] = SPINES[i % SPINES.length]!;
    const w = i % 3 === 0 ? 3 : 2;
    if (x + w > x1 + 1) break;
    const h = tall - ((i * 5) % 3);
    c.rect(x, floor - h + 1, w, h, light).rect(x + w - 1, floor - h + 1, 1, h, shade);
    c.rect(x, floor - h + 3, w, 1, shade);
    x += w + (i % 4 === 3 ? 2 : 0);
    i++;
  }
}

/** A tall open case: cornice, sides, three shelves. `fill` stocks each shelf. */
export function shelfCase(fill: (c: Canvas, floor: number, n: number) => void): string {
  const c = new Canvas(32, 39);
  c.rect(2, 1, 28, 1, 'w').rect(1, 2, 30, 2, 'v').rect(30, 2, 1, 2, 'u').rect(1, 4, 30, 1, 'u');
  c.rect(1, 5, 2, 31, 'v').rect(1, 5, 1, 31, 'w').rect(29, 5, 2, 31, 'v').rect(30, 5, 1, 31, 'u');
  c.rect(3, 5, 26, 31, 'v');
  [14, 24, 34].forEach((y, n) => {
    c.rect(3, y - 9, 26, 1, 'u');
    fill(c, y - 1, n);
    c.rect(3, y, 26, 1, 'w').rect(3, y + 1, 26, 1, 'u');
  });
  c.rect(2, 36, 3, 2, 'u').rect(27, 36, 3, 2, 'u');
  return c.text();
}

const bookshelfArt = shelfCase((c, floor, n) => books(c, 4, 27, floor, 7 + (n % 2), n * 3));

// The fireplace: stone surround under a wooden mantel with two candles, a sooty arch with
// a log fire in three frames. The bottom two rows of the fire are the same in every frame:
// they are the embers, and the emissive layer keeps them glowing at night.
const flames = [
  `
  ....q.....
  ...qq...q.
  ...qrq..q.
  ..qqrq.qq.
  .qqrrqqqrq
  .qrrrrqrrq
  qqrrrrrrrq
  pqrrrrrrqp
  ppqqqqqqpp
  `,
  `
  ......q...
  .q...qq...
  .qq..qrq..
  .qrq.qrqq.
  qqrqqrrrq.
  qrrrqrrrqq
  qrrrrrrrrq
  pqrrrrrrqp
  ppqqqqqqpp
  `,
  `
  ..q.......
  ..qq..q...
  .qrq..qq..
  .qrqqqrq.q
  qqrrqrrqqq
  qrrrrrrrrq
  qqrrrrrrqq
  pqrrrrrrqp
  ppqqqqqqpp
  `,
];

function fireplaceArt(frame: number): string {
  const c = new Canvas(32, 36);
  // candles on the mantel
  for (const x of [4, 24]) c.px(x + 1, 1, 'q').rect(x, 2, 3, 4, 'c').rect(x + 2, 2, 1, 4, 'b');
  c.box(1, 6, 30, 2, 2, WOOD);
  c.rect(1, 10, 30, 1, '0');
  c.rect(3, 11, 26, 21, '4').rect(27, 11, 2, 21, '3').rect(3, 11, 24, 1, '3');
  c.rect(5, 15, 4, 1, '3').rect(21, 24, 4, 1, '3').rect(4, 27, 3, 1, '3').rect(24, 14, 2, 1, '3');
  // the arch: rounded at the top, sooty inside
  c.rect(9, 16, 14, 16, '1').rect(10, 15, 12, 1, '1').rect(8, 17, 1, 15, '2').rect(23, 17, 1, 15, '3');
  c.stamp(flames[frame]!, 11, 21);
  c.rect(10, 29, 12, 2, 'v').rect(10, 29, 12, 1, 'w').rect(10, 29, 1, 2, 'w').rect(21, 29, 1, 2, 'u');
  c.box(1, 32, 30, 1, 2, ['4', '3', '2']);
  return c.text();
}

// A kitchen counter three tiles long: a wooden worktop over teal cupboards, with a bowl of
// fruit, the sink and its tap, and a red pot on the hob.
function kitchenArt(): string {
  const c = new Canvas(48, 28);
  c.rect(1, 9, 46, 5, 'w').rect(46, 9, 1, 5, 'v').rect(1, 14, 46, 1, 'v').rect(1, 15, 46, 1, 'u');
  c.rect(2, 16, 44, 10, '7').rect(45, 16, 1, 10, '6').rect(2, 25, 44, 1, '6');
  for (const x of [4, 19, 34]) {
    c.rect(x, 17, 10, 7, '6').rect(x + 1, 18, 9, 6, '7');
    c.px(x + (x === 19 ? 1 : 8), 20, 'q');
  }
  c.rect(17, 16, 1, 9, '6').rect(32, 16, 1, 9, '6');
  // fruit bowl
  c.stamp(`
    ..yy.qq..
    .yzyyqqp.
    444444443
    .3333333.
    ..22222..
  `, 4, 6);
  // sink and tap
  c.rect(19, 9, 12, 5, '4').rect(20, 10, 10, 3, '3').rect(20, 10, 10, 1, '2').px(22, 11, 'f').px(23, 11, 'f');
  c.rect(24, 3, 2, 7, '4').rect(25, 3, 1, 7, '3').rect(24, 3, 5, 2, '4').rect(27, 5, 2, 1, '3');
  // hob and pot
  c.rect(34, 10, 11, 3, '2').rect(34, 10, 11, 1, '3');
  c.stamp(`
    ....11....
    .zzzzzzzy.
    zzzzzzzzyy
    0000000000
    zyyyyyyyxx
    zyyyyyyyxx
    zyyyyyyyxx
    .yyyyyyyx.
  `, 35, 2);
  return c.text();
}

// A red rug with a light band and a golden diamond, tasselled at both ends. Flat: no ink.
function rugArt(): string {
  const W = 48;
  const H = 32;
  const c = new Canvas(W, H);
  const [x0, y0, x1, y1] = [3, 3, W - 4, H - 4];
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.min(x - x0, x1 - x, y - y0, y1 - y);
      const diamond = Math.abs(x - cx) / 2 + Math.abs(y - cy);
      let ch = 'y';
      if (d === 0) ch = 'x';
      else if (d <= 2) ch = 'z';
      else if (d === 3) ch = 'x';
      else if (diamond <= 2.5) ch = 'q';
      else if (diamond <= 5) ch = 'z';
      c.px(x, y, ch);
    }
  }
  for (let y = y0 + 2; y <= y1 - 2; y += 3) c.rect(x0 - 2, y, 2, 1, 'c').rect(x1 + 1, y, 2, 1, 'c');
  return c.text();
}

// A round rose rug: a woven border, a cream ring, a small golden diamond at the centre, and a
// tasselled fringe at both ends. Flat: no ink.
function roundRugArt(): string {
  const c = new Canvas(32, 32);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const dx = (x - 15.5) / 12;
      const dy = (y - 15.5) / 10;
      const r = Math.hypot(dx, dy);
      if (r > 1) continue;
      let ch = '*';
      if (r > 0.88) ch = '+';
      else if (r > 0.74) ch = (x + y) % 4 < 2 ? '*' : '+';
      else if (r > 0.62) ch = 'c';
      else if (Math.abs(x - 15.5) + Math.abs(y - 15.5) <= 3) ch = 'q';
      else if (Math.abs(x - 15.5) + Math.abs(y - 15.5) <= 4) ch = 'p';
      c.px(x, y, ch);
    }
  }
  for (const y of [12, 15, 18]) c.rect(1, y, 2, 1, 'c').rect(29, y, 2, 1, 'c');
  return c.text();
}

// A leafy plant in a terracotta pot: lobes of leaf with dark undersides, a lit rim at the
// upper left.
const plantArt = `
  ................
  ......jhh.......
  .....jhhhh.jh...
  ....jhhhhhhhhh..
  ...jhhhhghhhhhh.
  ...hhhhgghhhhgh.
  ..jhhhhhhhggggh.
  ..hhhhhhggghhhh.
  ..hhhgggghhhhgh.
  ...hggghhhhhggh.
  ....hhhhhhhggg..
  .....gghhggg....
  .......gg.......
  ....zzzzzzzzy...
  ....zyyyyyyyx...
  ....xxxxxxxxx...
  .....zyyyyyx....
  .....zyyyyyx....
  .....zyyyyyx....
  .....zyyyyyx....
  ......xxxxx.....
  ................
`;

/** The home: furniture with seats, the bed, cupboards, the hearth, the kitchen. */
export const homeProps: Record<string, PropDef> = {
  table: {
    id: 'table',
    sprite: outlined(tableArt(2).text()),
    footprint: { w: 2, h: 1 },
  },
  chair: {
    id: 'chair',
    sprite: outlined(chairArt()),
    footprint: { w: 1, h: 1 },
    seats: { seat: { x: 8, y: 0, dir: 'down' } },
  },
  'chair-back': {
    id: 'chair-back',
    sprite: outlined(chairBackArt()),
    footprint: { w: 1, h: 1 },
    // the sitter sits behind the chair's back, which hides their lower half
    seats: { seat: { x: 8, y: -5, dir: 'up' } },
  },
  stool: {
    id: 'stool',
    sprite: outlined(stoolArt()),
    footprint: { w: 1, h: 1 },
    seats: { seat: { x: 8, y: 2, dir: 'down' } },
  },
  bed: {
    id: 'bed',
    sprite: outlined(bedArt()),
    footprint: { w: 1, h: 2 },
    places: { side: { dx: 1, dy: 0 } },
  },
  wardrobe: { id: 'wardrobe', sprite: outlined(wardrobeArt()), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  bookshelf: { id: 'bookshelf', sprite: outlined(bookshelfArt), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  fireplace: {
    id: 'fireplace',
    sprite: outlined(fireplaceArt(0)),
    anim: { frames: [0, 1, 2].map((f) => outlined(fireplaceArt(f))), fps: 6 },
    emissive: glow(fireplaceArt(0).split('\n').map((r, y) => (y >= 28 || y < 3 ? r : '.'.repeat(r.length))).join('\n'), { q: 'q', r: 'r', p: 'p' }),
    footprint: { w: 2, h: 1 },
    lights: [{ dx: 16, dy: -10, radius: 60, slot: 'ochre.2', flicker: 0.35 }],
    places: { front: { dx: 0, dy: 1 } },
  },
  'kitchen-counter': {
    id: 'kitchen-counter',
    sprite: outlined(kitchenArt()),
    footprint: { w: 3, h: 1 },
    places: { front: { dx: 1, dy: 1 } },
  },
  rug: { id: 'rug', sprite: flatArt(rugArt()), flat: true, castHeight: 0 },
  'rug-round': { id: 'rug-round', sprite: flatArt(roundRugArt()), flat: true, castHeight: 0 },
  'potted-plant': { id: 'potted-plant', sprite: outlined(plantArt), footprint: { w: 1, h: 1 } },
};

