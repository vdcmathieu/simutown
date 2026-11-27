// The town's other rooms: the shop, the library, the school, the post office and the
// town hall. Built from the same parts as the home and the bakery.
import type { PropDef } from '../../core/types';
import { Canvas, glow, outlined, WOOD } from './draw';
import { shelfCase, tableArt } from './home';
import { counter, counterPlaces } from './shops';

// The shop counter: a brass-and-red till, a jar of sweets, a basket of apples.
const shopCounterArt = counter(['w', 'v'], (c) => {
  c.stamp(`
    ..444443....
    ..4f9f93....
    ..444433....
    zzzzzzzzzy..
    z5z5z5z5zyy.
    zzzzzzzzzyy.
    zyyyyyyyyxx.
    zyy3333yyxx.
    zyyyyyyyyxx.
  `, 3, 4);
  c.stamp(`
    .888.
    ff998
    f*q78
    fq7*8
    f*7q8
    99998
  `, 20, 7);
  c.stamp(`
    .yz.yz.yz.
    yzyyzyyzyy
    wvwvwvwvwv
    .vwvwvwvw.
    ..vvvvvv..
  `, 33, 8);
});

/** Shop goods: tins, packets and jars, in strong colours on a pale shelf. */
const tin = (light: string, shade: string) => `
  44
  ${light}${shade}
  ${light}${shade}
  ${shade}${shade}
`;
const packet = (light: string, shade: string) => `
  ${light}${light}${shade}
  ${light}5${shade}
  ${light}${light}${shade}
  ${light}${light}${shade}
  ${shade}${shade}${shade}
`;
const goodsShelfArt = shelfCase((c, floor, n) => {
  const row = [
    [tin('y', 'x'), tin('y', 'x'), packet('q', 'p'), packet('q', 'p'), tin('9', '8'), tin('9', '8'), packet('7', '6')],
    [packet('z', 'y'), packet('z', 'y'), tin('7', '6'), tin('7', '6'), tin('7', '6'), packet('e', 'd'), packet('e', 'd')],
    [tin('q', 'p'), tin('q', 'p'), tin('q', 'p'), packet('9', '8'), packet('9', '8'), tin('z', 'y'), tin('z', 'y')],
  ][n]!;
  let x = 4;
  for (const art of row) {
    const lines = art.trim().split('\n');
    c.stamp(art, x, floor - lines.length + 1);
    x += lines[0]!.trim().length + 1;
  }
});

// A reading desk with drawers, an open book, a stack of books and a green desk lamp.
function readingDeskArt(): string {
  const c = new Canvas(32, 27);
  c.box(1, 8, 30, 6, 2, WOOD);
  c.rect(2, 16, 28, 8, 'v').rect(29, 16, 1, 8, 'u').rect(12, 16, 8, 8, 'u').rect(2, 23, 28, 1, 'u');
  c.rect(3, 17, 8, 3, 'u').rect(4, 18, 6, 1, 'w').rect(21, 17, 8, 3, 'u').rect(22, 18, 6, 1, 'w');
  c.rect(3, 24, 2, 2, 'v').rect(27, 24, 2, 2, 'u');
  c.stamp(`
    ..hhhh..
    .hjhhhg.
    hhhhhhgg
    qqqqqqqp
    ...33...
    ...32...
    ..4433..
  `, 3, 3);
  c.stamp(`
    ccccc.ccccc
    cbbbccbbbcb
    cccccccccbb
    cbbbccbbbcb
    aaaaaaaaaaa
  `, 13, 8);
  c.stamp(`
    yyyyyx
    777776
    qqqqqp
  `, 24, 7);
  return c.text();
}
const deskLampGlow = { q: 'r', p: 'q' };

// A child's school desk with a book on it: one tile, with a closed front 10 rows tall,
// so it hides the feet and legs of whoever stands right behind it.
function schoolDeskArt(): string {
  const c = new Canvas(16, 24);
  c.box(1, 1, 14, 7, 10, WOOD);
  c.rect(1, 8, 14, 1, 'w').rect(3, 10, 10, 5, 'u').rect(4, 11, 9, 4, 'v');
  c.stamp(`
    .9999.
    99f998
    999988
  `, 5, 3);
  c.rect(2, 18, 2, 5, 'v').rect(2, 18, 1, 5, 'w').rect(12, 18, 2, 5, 'u').rect(12, 18, 1, 5, 'v');
  return c.text();
}

// A blackboard three tiles wide, with chalk shapes (no lettering) and a chalk ledge.
function blackboardArt(): string {
  const c = new Canvas(48, 32);
  c.rect(2, 5, 44, 19, 'w').rect(45, 5, 1, 19, 'v');
  c.rect(4, 7, 40, 15, 'g');
  c.stamp(`
    ..555..
    .5...5.
    5.....5
    5.....5
    5.....5
    .5...5.
    ..555..
  `, 7, 10);
  c.stamp(`
    ...5...
    ..5.5..
    .5...5.
    5.....5
    5555555
  `, 18, 12);
  c.stamp(`
    ..5..
    ..5..
    55555
    ..5..
    ..5..
  `, 28, 12);
  c.rect(35, 11, 6, 1, '4').rect(35, 14, 4, 1, '4').rect(35, 17, 6, 1, '4').rect(8, 19, 9, 1, '4');
  c.rect(1, 23, 46, 1, 'w').rect(1, 24, 46, 1, 'v');
  c.rect(30, 22, 4, 1, '5').rect(38, 21, 5, 2, 'u').rect(38, 21, 5, 1, 'v');
  return c.text();
}

// The post office counter: a pale top with a parcel tied in red string, a letter and a pile of envelopes.
const postCounterArt = counter(['c', 'b'], (c) => {
  c.stamp(`
    .wwwwwwwwv.
    wwwwywwwwvv
    yyyyyyyyyyy
    wwwwywwwwvv
    vvvvyvvvvuu
    vvvvyvvvvuu
    vvvvyvvvvuu
    uuuuuuuuuuu
  `, 4, 5);
  c.stamp(`
    55555.
    5c5c54
    555554
    .4444.
  `, 19, 9);
  c.stamp(`
    55555554
    5c555c54
    55c5c554
    555c5554
    44444443
    55555554
    44444443
  `, 33, 7);
});

// Pigeon-holes: a wooden case of cubbies, some holding letters.
function pigeonHolesArt(): string {
  const c = new Canvas(32, 34);
  c.rect(2, 1, 28, 1, 'w').rect(1, 2, 30, 30, 'v').rect(30, 2, 1, 30, 'u');
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 7;
      const y = 3 + j * 7;
      c.rect(x, y, 5, 5, 'u');
      if ((i * 3 + j * 5) % 4 !== 1) c.rect(x + 1, y + 2, 3, 3, (i + j) % 3 === 0 ? 'c' : '5').rect(x + 3, y + 2, 1, 3, 'b');
      if ((i + j * 2) % 5 === 0) c.px(x + 2, y + 3, 'y');
    }
  }
  c.rect(1, 31, 30, 1, 'u').rect(2, 32, 3, 1, 'u').rect(27, 32, 3, 1, 'u');
  return c.text();
}

// A tall long-case clock for the town hall: a hood with the dial, a trunk with the
// pendulum showing through glass, a plinth.
function grandClockArt(): string {
  const c = new Canvas(16, 46);
  c.rect(3, 1, 10, 1, 'w').rect(2, 2, 12, 2, 'v').rect(13, 2, 1, 2, 'u').rect(2, 4, 12, 1, 'u');
  c.rect(3, 5, 10, 11, 'v').rect(12, 5, 1, 11, 'u');
  c.stamp(`
    .cccccc.
    cccc0ccb
    cccc0ccb
    ccc00ccb
    ccccccbb
    .cbbbbb.
  `, 4, 7);
  c.rect(2, 16, 12, 1, 'w').rect(2, 17, 12, 1, 'u');
  c.rect(4, 18, 8, 20, 'v').rect(11, 18, 1, 20, 'u');
  c.rect(6, 20, 4, 14, 'f').rect(6, 20, 4, 1, '9').px(7, 21, '5');
  c.rect(7, 21, 2, 9, 'p').rect(6, 29, 4, 3, 'q').rect(9, 29, 1, 3, 'p');
  c.rect(3, 38, 10, 1, 'w').rect(3, 39, 10, 4, 'v').rect(12, 39, 1, 4, 'u').rect(3, 42, 10, 1, 'u');
  c.rect(3, 43, 2, 1, 'u').rect(11, 43, 2, 1, 'u');
  return c.text();
}

// A banner for the hall's wall: plum cloth on a rod, a golden bell, a golden fringe.
function bannerArt(): string {
  const c = new Canvas(16, 32);
  c.rect(1, 3, 14, 1, 'q').rect(1, 4, 14, 1, 'p');
  c.rect(3, 5, 10, 17, 'e').rect(11, 5, 2, 17, 'd');
  c.stamp(`
    ..qq..
    .qqqp.
    .qqqp.
    qqqqpp
    ..pp..
  `, 5, 10);
  c.rect(3, 22, 10, 1, 'q').rect(3, 23, 1, 1, 'q').rect(5, 23, 1, 1, 'q').rect(7, 23, 1, 1, 'q').rect(9, 23, 1, 1, 'q').rect(11, 23, 1, 1, 'q');
  return c.text();
}

// A lectern for the town hall: a sloping top with an open book, on a column and a foot.
function lecternArt(): string {
  const c = new Canvas(16, 30);
  c.stamp(`
    ....wwwwww....
    ..wwccccccww..
    wwcbccccbcccww
    wwccccccccccvv
    vvvvvvvvvvvvuu
    uuuuuuuuuuuuuu
  `, 1, 1);
  c.rect(4, 7, 8, 16, 'v').rect(4, 7, 2, 16, 'w').rect(10, 7, 2, 16, 'u').rect(4, 7, 8, 1, 'u');
  c.rect(5, 12, 6, 1, 'q');
  c.rect(2, 23, 12, 1, 'w').rect(2, 24, 12, 3, 'v').rect(13, 24, 1, 3, 'u').rect(2, 26, 12, 1, 'u');
  return c.text();
}

// A bar stool: a wide red cushion on splayed wooden legs with a footrest. The legs stand
// out at both sides, so they still show beside someone sitting on it.
function barStoolArt(): string {
  const c = new Canvas(16, 20);
  c.stamp(`
    .zzzzzzzzzzzz.
    zzzzzzzzzzzzzy
    yyyyyyyyyyyyyx
    .xxxxxxxxxxxx.
  `, 1, 1);
  c.stamp(`
    .wv......vu.
    .wv......vu.
    .wv......vu.
    wv........vu
    wwwwwwwwwwvu
    vvvvvvvvvvvu
    wv........vu
    wv........vu
    wv........vu
    wv........vu
    wv........vu
  `, 2, 5);
  return c.text();
}

// The teacher's desk: two tiles, a closed front 10 rows tall, an apple, a pile of papers
// and a brass bell on the top.
function teacherDeskArt(): string {
  const c = new Canvas(32, 28);
  c.stamp(`
    ..h.
    .yzy
    yzyyx
    yyyxx
    .xx.
  `, 4, 2);
  c.stamp(`
    55555554
    5c555c54
    44444443
    55555554
    44444443
  `, 12, 3);
  c.stamp(`
    .q.
    qrqp
    qqpp
    3333
  `, 24, 3);
  c.box(1, 7, 30, 7, 10, WOOD);
  c.rect(1, 14, 30, 1, 'w');
  c.rect(3, 16, 11, 7, 'u').rect(4, 17, 10, 6, 'v').rect(18, 16, 11, 7, 'u').rect(19, 17, 10, 6, 'v');
  c.px(12, 19, 'q').px(20, 19, 'q');
  c.rect(2, 24, 3, 3, 'v').rect(27, 24, 3, 3, 'u');
  return c.text();
}

// A globe on a wooden stand: blue sea, green land, a brass meridian.
function globeArt(): string {
  const c = new Canvas(16, 26);
  c.stamp(`
    ....99999...
    ..9ff9hh998.
    .9f9hhh9998q
    .99hhh99hh8q
    9999h999hhhq
    9999999hh98q
    999h9999988q
    .99hh99988q.
    .99999988q.
    ..998888qq..
    ....qqqq....
  `, 2, 1);
  c.rect(7, 12, 2, 8, 'v').rect(7, 12, 1, 8, 'w');
  c.rect(4, 20, 8, 1, 'w').rect(3, 21, 10, 2, 'v').rect(12, 21, 1, 2, 'u').rect(3, 23, 10, 1, 'u');
  return c.text();
}

// The shop's display table: a cloth over a table, with folded cloth, a basket of apples
// and jars of jam.
function displayTableArt(): string {
  const c = tableArt(2, 6);
  c.rect(1, 7, 30, 6, 'c').rect(30, 7, 1, 6, 'b').rect(1, 13, 30, 4, 'b').rect(1, 16, 30, 1, 'a');
  c.stamp(`
    7777776
    6666666
    ******+
    +++++++
    9999998
    8888888
  `, 3, 3);
  c.stamp(`
    .yz.yz.
    yzyyzyy
    wvwvwvw
    .vwvwv.
  `, 12, 5);
  for (const x of [21, 25]) c.stamp(`
    55
    yz
    yy
    yx
  `, x, 6);
  return c.text();
}

/** Furniture for the town's other rooms. */
export const civicProps: Record<string, PropDef> = {
  'shop-counter': { id: 'shop-counter', sprite: outlined(shopCounterArt), footprint: { w: 3, h: 1 }, places: counterPlaces },
  'goods-shelf': { id: 'goods-shelf', sprite: outlined(goodsShelfArt), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  'reading-desk': {
    id: 'reading-desk',
    sprite: outlined(readingDeskArt()),
    emissive: glow(readingDeskArt(), deskLampGlow),
    footprint: { w: 2, h: 1 },
    lights: [{ dx: 7, dy: -21, radius: 28, slot: 'ochre.2' }],
    places: { front: { dx: 0, dy: 1 } },
  },
  'school-desk': { id: 'school-desk', sprite: outlined(schoolDeskArt()), footprint: { w: 1, h: 1 } },
  blackboard: { id: 'blackboard', sprite: outlined(blackboardArt()), castHeight: 0 },
  'post-counter': { id: 'post-counter', sprite: outlined(postCounterArt), footprint: { w: 3, h: 1 }, places: counterPlaces },
  'pigeon-holes': { id: 'pigeon-holes', sprite: outlined(pigeonHolesArt()), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  'grand-clock': { id: 'grand-clock', sprite: outlined(grandClockArt()), footprint: { w: 1, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
  banner: { id: 'banner', sprite: outlined(bannerArt()), castHeight: 0 },
  'table-long': {
    id: 'table-long',
    sprite: outlined(tableArt(3).text()),
    footprint: { w: 3, h: 1 },
  },
  lectern: { id: 'lectern', sprite: outlined(lecternArt()), footprint: { w: 1, h: 1 }, places: { behind: { dx: 0, dy: -1 }, front: { dx: 0, dy: 1 } } },
  'bar-stool': {
    id: 'bar-stool',
    sprite: outlined(barStoolArt()),
    footprint: { w: 1, h: 1 },
    // a bar stool faces the bar: the sitter turns their back to the viewer and sits 14
    // pixels behind the stool's base line, so the stool is drawn over them: its cushion
    // just under their seat, its legs below
    seats: { seat: { x: 8, y: -14, dir: 'up' } },
  },
  'teacher-desk': { id: 'teacher-desk', sprite: outlined(teacherDeskArt()), footprint: { w: 2, h: 1 }, places: { behind: { dx: 1, dy: -1 } } },
  globe: { id: 'globe', sprite: outlined(globeArt()), footprint: { w: 1, h: 1 } },
  'display-table': { id: 'display-table', sprite: outlined(displayTableArt()), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
};
