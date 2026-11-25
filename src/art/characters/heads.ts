/**
 * The head library: hair styles, headwear and things worn on the face.
 *
 * Every part is drawn three times: facing the viewer (`down`), facing away (`up`) and
 * facing right (`right`; left is mirrored). A head grid is 16 wide and at least 14 tall:
 * two spare rows for a bun or a hat, then the 12 rows of the head, the last being the
 * chin's ink line. Rows after that hang over the body (long hair, braids).
 *
 * The face never moves, so parts can be combined:
 *   - facing the viewer: skin on columns 3 to 12, eyes on rows 9 and 10 at columns 5 and
 *     10, cheeks on row 11 at columns 4 and 11;
 *   - facing right: one eye at column 11, the face ends at column 13, the cheek is at
 *     column 12 of row 11.
 *
 * Roles: S skin, K skin shade, B blush, H hair, D hair shade, L hair light, R accent
 * (a ribbon, a hat band), A hat, Y hat light, Z hat shade, C glasses frame, J lens,
 * V scarf, W scarf shade.
 *
 * Headwear and face parts are overlays: `.` leaves the head below alone and `_` erases
 * it, which is how a hat removes the bun under it. The back of every head is plain:
 * a streak and a dot there read as a face.
 */
import { grid, type Grid } from './grid';

/** One part in the three drawn views. */
export interface HeadViews {
  down: Grid;
  up: Grid;
  right: Grid;
}

const views = (down: string, up: string, right: string): HeadViews => ({ down: grid(down), up: grid(up), right: grid(right) });

// --- hair ------------------------------------------------------------------------------

/** Short and neat, with a side parting; the ears are free, so the head narrows below the hair. */
const short = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHSSSSSHHD0.
    .0HSSSSSSSSSSD0.
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    ..0HHHHHHHHDD0..
    ..0DDDDDDDDDD0..
    ..0SSSSSSSSSS0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHSSSS0.
    .0DHHHHHSSSSSS0.
    ..0DHHSSSSS0SS0.
    ..0DDSSSSSS0SS0.
    ..0KSSSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** A flat top: cut square and close at the sides. */
const flattop = views(
  `
    ................
    ................
    ...0000000000...
    ..0HLLHHHHHHH0..
    ..0HLHHHHHHHD0..
    ..0HHHHHHHHHD0..
    ..0HHSSSSSSHD0..
    ..0HSSSSSSSSD0..
    ..0SSSSSSSSSS0..
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ................
    ...0000000000...
    ..0HLLHHHHHHH0..
    ..0HLHHHHHHHD0..
    ..0HHHHHHHHHD0..
    ..0HHHHHHHHHD0..
    ..0HHHHHHHHDD0..
    ..0HHHHHHHDDD0..
    ..0DDDDDDDDDD0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ................
    ...0000000000...
    ..0HLLHHHHHHH00.
    ..0HLHHHHHHHHH0.
    ..0HHHHHHHHHHH0.
    ..0HHHHHHSSSSS0.
    ..0DHHHHSSSSSS0.
    ..0DHHSSSSSSSS0.
    ..0DDSSSSSS0SS0.
    ..0SSSSSSSS0SS0.
    ..0KSSSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** Short, with a quiff swept up at the front. */
const quiff = views(
  `
    .........000....
    ......000HHH0...
    ....00HHHHH00...
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHSSSSHHHHD0.
    .0HSSSSSSSSSSD0.
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ....000.........
    ...0HHH000......
    ...00HHHHH00....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    ..0HHHHHHHHDD0..
    ..0DDDDDDDDDD0..
    ..0SSSSSSSSSS0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ..........000...
    ........00HHH0..
    ....0000HHHHH0..
    ...0HHHHHHHHHH0.
    ..0HLLHHHHHHHH0.
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHSSSS0.
    .0DHHHHHSSSSSS0.
    ..0DHHSSSSS0SS0.
    ..0DDSSSSSS0SS0.
    ..0KSSSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** A round mop with a straight fringe that covers the ears. */
const bowl = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHSSSSSSSSHD0.
    .0HSS0SSSS0SSD0.
    .0HSS0SSSS0SSD0.
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    .0DHHHHHHHHDDD0.
    ..0DDDDDDDDDD0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0DHHHHHHSSSSS0.
    .0DHHHHHSSS0SS0.
    .0DDHHHHSSS0SS0.
    ..0DDDSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** Chin length and flared: the widest head in town at the jaw. */
const bob = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHSSSSSHHHH0.
    .0HHSSSSSSSSHH0.
    .0HSS0SSSS0SSH0.
    0HHSS0SSSS0SSHD0
    0HHSBSSSSSSBSHD0
    0HH0SSSSSSSS0HD0
    .00000000000000.
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    0HHHHHHHHHHHHDD0
    0HHHHHHHHHHHDDD0
    0DDDDDDDDDDDDDD0
    .00000000000000.
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHSSS0.
    .0HHHHHHHSSSSS0.
    .0HHHHHHSSS0SS0.
    0HHHHHHHSSS0SS0.
    0HHHHHHDSSSSB0..
    0DDDDDDDSSSS0...
    .00000000000....
  `,
);

/** Long and straight, hanging over the shoulders. */
const long = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHSSSSHHHH0.
    .0HHSSSSSSSSHH0.
    .0HSS0SSSS0SSH0.
    .0HSS0SSSS0SSH0.
    .0HSBSSSSSSBSH0.
    .0HH0SSSSSS0HH0.
    .0HH00000000HH0.
    .0HH0......0HH0.
    ..00........00..
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    ..0HHHHHHHHHH0..
    ...0000000000...
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHHSSH0.
    .0HHHHHHHSSSSS0.
    .0HHHHHHSSS0SS0.
    .0HHHHHHSSS0SS0.
    .0HHHHHHSSSSSB0.
    .0HHHHHHSSSSS0..
    .0HHHHH0000000..
    ..0HHHH0........
    ..0HHHH0........
    ...0000.........
  `,
);

/** A bun on top, tied with a ribbon in the accent colour. */
const bun = views(
  `
    ......0000......
    .....0HLHH0.....
    ....00RRRR00....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHSSHHHSSHD0.
    .0HHSSSSSSSSHD0.
    .0HSS0SSSS0SSD0.
    .0HSS0SSSS0SSD0.
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ......0000......
    .....0HLHH0.....
    ....00RRRR00....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    .0DHHHHHHHHDDD0.
    ..0DDHHHHDDDD0..
    ...0DDDDDDDD0...
    ....00000000....
  `,
  `
    ......0000......
    .....0HLHH0.....
    ....00RRRR00....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHSSHH0.
    .0DHHHHHSSSSSS0.
    .0DHHHHSSSS0SS0.
    .0DDHHHSSSS0SS0.
    ..0DDHSSSSSSB0..
    ...0DDSSSSSS0...
    ....00000000....
  `,
);

/** A ponytail: from the front its end shows beside the neck, from the side it swings behind. */
const ponytail = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHSSSSSHHD0.
    .0HSSSSSSSSSSD0.
    ..0SS0SSSS0SS00.
    ..0SS0SSSS0SS0H0
    ..0SBSSSSSSBS0H0
    ...0SSSSSSSS0HD0
    ....000000000HD0
    .............00.
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHRRHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    ..0DHHHHHHHDD0..
    ..0DDDHHHHDDD0..
    ..0SS0HHHH0SS0..
    ...0K0HHHD0K0...
    ....00HHHD00....
    .....0HHDD0.....
    ......0000......
  `,
  `
    ................
    ................
    .....0000000....
    .0000HHHHHHH0...
    0HHHRLLHHHHHH0..
    0HD0HLHHHHHHHH0.
    0HD0HHHHHHHHHH0.
    0HD0HHHHHHSSSS0.
    0HD0DHHHSSSSSS0.
    0HD0DHHSSSS0SS0.
    .0D0DDSSSSS0SS0.
    ..00SSSSSSSSB0..
    ....0KSSSSSS0...
    .....0000000....
  `,
);

/** Two plaits over the shoulders, each tied in the accent colour. */
const braids = views(
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHSSSSHHHD0.
    .0HHSSSSSSSSHD0.
    .0HSS0SSSS0SSD0.
    .0HSS0SSSS0SSD0.
    0HDSBSSSSSSBSHD0
    0DH0SSSSSSSS0DH0
    0HD0000000000HD0
    0DH0........0DH0
    0RR0........0RR0
    0HH0........0HH0
    .00..........00.
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    .0HHHHHHHHHDDD0.
    0HDDDHHHHDDDDHD0
    0DH0DDDDDDDD0DH0
    0HD0000000000HD0
    0DH0........0DH0
    0RR0........0RR0
    0HH0........0HH0
    .00..........00.
  `,
  `
    ................
    ................
    ....00000000....
    ...0HHHHHHHH0...
    ..0HLLHHHHHHH0..
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHSSSS0.
    .0DHHHHHSSSSSS0.
    .0DHHHHSSSS0SS0.
    .0DDHHHSSSS0SS0.
    ..0DDHSSSSSSB0..
    ...0HD0SSSSS0...
    ...0DH000000....
    ...0HD0.........
    ...0RR0.........
    ...0HH0.........
    ....00..........
  `,
);

/** A cloud of curls with a scalloped edge. */
const curls = views(
  `
    ................
    ....0000.000....
    ...0HHHH0HHH00..
    .00HLLHHHHHHHH0.
    0HHLHHHHHHHHHHH0
    0HHHHHHHHHHHHHD0
    .0HHHHHHHHHHHD0.
    0HHHHSSSSSSHHHD0
    0HHSSSSSSSSSSHD0
    .0HSS0SSSS0SSD0.
    0HHSS0SSSS0SSHD0
    .0HSBSSSSSSBSD0.
    ..00SSSSSSSS00..
    ....00000000....
  `,
  `
    ................
    ....0000.000....
    ...0HHHH0HHH00..
    .00HLLHHHHHHHH0.
    0HHLHHHHHHHHHHH0
    0HHHHHHHHHHHHHD0
    .0HHHHHHHHHHHD0.
    0HHHHHHHHHHHHHD0
    0HHHHHHHHHHHHDD0
    .0HHHHHHHHHHDD0.
    0HHHHHHHHHHDDDD0
    .0DDDHHHHDDDDD0.
    ..00DDDDDDDD00..
    ....00000000....
  `,
  `
    ................
    ....0000.000....
    ...0HHHH0HHH00..
    .00HLLHHHHHHHH0.
    0HHLHHHHHHHHHHH0
    0HHHHHHHHHHHHHH0
    .0HHHHHHHHHHHH0.
    0HHHHHHHHHSSSS0.
    0HHHHHHHSSSSSS0.
    .0HHHHHSSSS0SS0.
    0HHHHHHSSSS0SS0.
    .0DHHHSSSSSSB0..
    ..00DDSSSSSS0...
    ....00000000....
  `,
);

/** Short and spiked: three tufts stand up from the crown. */
const spiky = views(
  `
    ................
    ...00..00..00...
    ..0HH00HH00HH0..
    ..0HHHHHHHHHH0..
    .0HLLHHHHHHHHD0.
    .0HLHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHSSHHSSSHD0.
    .0HSSSSSSSSSSD0.
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ...00..00..00...
    ..0HH00HH00HH0..
    ..0HHHHHHHHHH0..
    .0HLLHHHHHHHHD0.
    .0HLHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHHD0.
    .0HHHHHHHHHHDD0.
    ..0HHHHHHHHDD0..
    ..0DDDDDDDDDD0..
    ..0SSSSSSSSSS0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ...00..00..00...
    ..0HH00HH00HH0..
    ..0HHHHHHHHHH0..
    .0HLLHHHHHHHHH0.
    .0HLHHHHHHHHHH0.
    .0HHHHHHHHHHHH0.
    .0HHHHHHHHSSSS0.
    .0DHHHHHSSSSSS0.
    ..0DHHSSSSS0SS0.
    ..0DDSSSSSS0SS0.
    ..0KSSSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** No hair at all. */
const bald = views(
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSK0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSSS0.
    ..0SSSSSSSSSSS0.
    ..0SSSSSSSSSSS0.
    ..0KSSSSSSS0SS0.
    ..0KSSSSSSS0SS0.
    ..0KKSSSSSSSB0..
    ...0KKSSSSSS0...
    ....00000000....
  `,
);

/** A bald crown with a puff of hair over each ear. */
const balding = views(
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    .00SSSSSSSSSS00.
    0HHSSSSSSSSSSHD0
    0HHSSSSSSSSSSHD0
    .0HSS0SSSS0SSD0.
    ..0SS0SSSS0SS0..
    ..0SBSSSSSSBS0..
    ...0SSSSSSSS0...
    ....00000000....
  `,
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    .00SSSSSSSSSS00.
    0HHHSSSSSSSSHHD0
    0HHHHHHHHHHHHDD0
    .0HHHHHHHHHHDD0.
    ..0DDDDDDDDDD0..
    ..0SSSSSSSSSS0..
    ...0KKKKKKKK0...
    ....00000000....
  `,
  `
    ................
    ................
    ................
    .....000000.....
    ...00SSSSSS00...
    ..0SSSSSSSSSS0..
    .00SSSSSSSSSSS0.
    0HHHHSSSSSSSSS0.
    0HHHHHSSSSSSSS0.
    .0DHHHSSSSS0SS0.
    ..0DDSSSSSS0SS0.
    ..0KSSSSSSSSB0..
    ...0KSSSSSSS0...
    ....00000000....
  `,
);

/** Every hair style, by name. */
export const HEADS = { short, flattop, quiff, bowl, bob, long, bun, ponytail, braids, curls, spiky, bald, balding };
export type HeadName = keyof typeof HEADS;

// --- headwear --------------------------------------------------------------------------

const ERASED = '________________';

/** A straw hat with a wide brim and a band in the accent colour. */
const strawHat: HeadViews = (() => {
  const g = grid(`
    ________________
    _____000000_____
    ____0YYAAAA0____
    ___0RRRRRRRR0___
    _00YYAAAAAAAZ00_
    0YAAAAAAAAAAAAZ0
    _00000000000000_
  `);
  return { down: g, up: g, right: g };
})();

/** A peaked cap with a small badge in the accent colour. The peak shows best from the side. */
const cap = views(
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAARRAAAA0__
    _0AAAAAAAAAAAZ0_
    _0ZZZZZZZZZZZZ0_
    _00000000000000_
  `,
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAAAAAAAA0__
    _0AAAAAAAAAAAZ0_
    _0AAAAAAAAAAZZ0_
    _00000000000000_
  `,
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAAAAAAAA0__
    _0AAAAAAAAAAAA00
    _0AAAAAAAAAZZZZ0
    _000000000000000
  `,
);

/** A soft beret, pulled down on one side, with its stalk. */
const beret = views(
  `
    ${ERASED}
    ________00______
    ___00000AA00____
    _00YYAAAAAAA000_
    0YYAAAAAAAAAAAZ0
    0AAAAAAAAAAAAZZ0
    _0000000000AZZ0_
    ..........00000.
  `,
  `
    ${ERASED}
    ______00________
    ____00AA00000___
    _000YYAAAAAAA00_
    0YYAAAAAAAAAAAZ0
    0AAAAAAAAAAAAZZ0
    _0AAZ0000000000_
    .00000..........
  `,
  `
    ${ERASED}
    _______00_______
    __00000AA000____
    _0YYAAAAAAAA00__
    0YAAAAAAAAAAAA0_
    0AAAAAAAAAAAAAZ0
    0AZZ00000000000_
    .000............
  `,
);

/** A headscarf knotted under the chin; a strip of hair shows at the brow. */
const headscarf = views(
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAAAAAAAA0__
    _0YAAAAAAAAAAZ0_
    _0AAAHHHHHHAAZ0_
    _0AASSSSSSSSAZ0_
    _0AASSSSSSSSAZ0_
    _0ASS0SSSS0SSZ0_
    _0ASS0SSSS0SSZ0_
    __0ABSSSSSSBZ0__
    ___0AASSSSZZ0___
    ____00AAZZ00____
    ______0AZ0______
    _______00_______
    ${ERASED}
    ${ERASED}
  `,
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAAAAAAAA0__
    _0YAAAAAAAAAAZ0_
    _0AAAAAAAAAAAZ0_
    _0AAAAAAAAAAAZ0_
    _0AAAAAAAAAAZZ0_
    _0AAAAAAAAAAZZ0_
    _0AAAAAAAAAZZZ0_
    __0ZAAAAAAZZZ0__
    ___0ZZAAAZZZ0___
    ____00ZAAZ00____
    ______0ZZ0______
    _______00_______
    ${ERASED}
    ${ERASED}
  `,
  `
    ${ERASED}
    ${ERASED}
    ____00000000____
    ___0YYAAAAAA0___
    __0YAAAAAAAAA0__
    _0YAAAAAAAAAAA0_
    _0AAAAAAAAHHHH0_
    _0AAAAAAAASSSS0_
    _0AAAAAAASSSSS0_
    _0ZAAAAASSS0SS0_
    _0ZAAAAASSS0SS0_
    __0ZAAAASSSSB0__
    ___0ZZAAASSS0___
    ____00000AA0____
    _________0AZ0___
    __________00____
    ${ERASED}
    ${ERASED}
  `,
);

/** A tall chef's hat: a puffed crown over a straight band. */
const chefHat: HeadViews = (() => {
  const g = grid(`
    ___0000000000___
    __0YAAAAAAAAA0__
    _0YAAAAAAAAAAZ0_
    _0AAAAAAAAAAAZ0_
    _0AAAAAAAAAAZZ0_
    __0ZZZZZZZZZZ0__
    __0AAAAAAAAAZ0__
    _00000000000000_
  `);
  return { down: g, up: g, right: g };
})();

/** Every piece of headwear, by name. Each is laid over a hair style. */
export const HATS = { 'straw-hat': strawHat, cap, beret, headscarf, 'chef-hat': chefHat };
export type HatName = keyof typeof HATS;

// --- face ------------------------------------------------------------------------------

/** Glasses: a lens on each side of the eye, joined by a bridge. Nothing shows from behind. */
export const GLASSES: HeadViews = {
  down: grid(
    `
    ...CJ.JCCJ.JC...
    ....J.J..J.J....
  `,
    9,
    14,
  ),
  up: grid(ERASED.replace(/_/g, '.'), 0, 14),
  right: grid(
    `
    .......CCCJ.J...
    ..........J.J...
  `,
    9,
    14,
  ),
};

/**
 * A chin tuft in the hair colour. It hangs below the chin, with a full row of skin
 * between it and the cheeks: a patch of white on the face itself reads as a grin.
 */
export const BEARD: HeadViews = {
  down: grid(
    `
    ....00HHHH00....
    ......0DD0......
    .......00.......
  `,
    13,
    16,
  ),
  up: grid(ERASED.replace(/_/g, '.'), 0, 14),
  right: grid(
    `
    ....000000HH0...
    ..........00....
  `,
    13,
    15,
  ),
};

/** A scarf under the chin, with one end hanging. It moves with the head. */
export const SCARF: Record<'adult' | 'child', HeadViews> = {
  adult: {
    down: grid(
      `
      ...0VVVVVVVW0...
      .....VW.........
      .....VW.........
    `,
      14,
      17,
    ),
    up: grid(
      `
      ...0VVVVVVVW0...
      .........VW.....
      .........VW.....
    `,
      14,
      17,
    ),
    right: grid(
      `
      .....0VVVVW0....
      ....0VW.........
      ....0VW.........
    `,
      14,
      17,
    ),
  },
  child: {
    down: grid(
      `
      ....0VVVVVW0....
      ......VW........
    `,
      14,
      16,
    ),
    up: grid(
      `
      ....0VVVVVW0....
      ........VW......
    `,
      14,
      16,
    ),
    right: grid(
      `
      ......0VVW0.....
      .....0VW........
    `,
      14,
      16,
    ),
  },
};
