/**
 * Hanging signs: a 12x10 board on an iron bracket, with an icon of two or three colours.
 * Signs never carry lettering: it cannot be read at this size.
 */
import { sprite, type Sprite } from '../../core/sprite';
import { canvas, done, paste } from './canvas';

export type SignIcon = 'cup' | 'loaf' | 'book' | 'letter' | 'bell' | 'scissors' | 'basket' | 'key';

export const SIGN_ICONS: readonly SignIcon[] = ['cup', 'loaf', 'book', 'letter', 'bell', 'scissors', 'basket', 'key'];

/** A sign, bracket included, is this big. */
export const SIGN_W = 14;
export const SIGN_H = 14;

// The iron arm, two hooks, and the cream board with a shaded lower-right edge.
const board = sprite(`
  .111111111111.
  11111111111111
  ..1........1..
  ..1........1..
  .000000000000.
  .0cccccccccc0.
  .0cccccccccc0.
  .0cccccccccc0.
  .0cccccccccc0.
  .0cccccccccc0.
  .0cccccccccc0.
  .0cccccccccb0.
  .0bbbbbbbbbb0.
  .000000000000.
`);

// Icons are 8 wide and up to 7 tall, and sit centred on the board.
const ICONS: Record<SignIcon, string> = {
  // a teal mug with a handle and a curl of steam
  cup: `
    ..3.3...
    .3.3....
    777776..
    77777.6.
    77777.6.
    777776..
    .666....
  `,
  // a crusty loaf, scored three times
  loaf: `
    ..pppp..
    .pqpqpp.
    pqpqpqpp
    pqqqqqpp
    pppppppo
    .oooooo.
  `,
  // a closed blue book with a page edge
  book: `
    .999999.
    89999998
    89ffff98
    89999998
    89999998
    8cccccc8
    .888888.
  `,
  // an envelope with a red seal
  letter: `
    22222222
    25555552
    22555522
    25222252
    2555y552
    25555552
    22222222
  `,
  // a brass bell
  bell: `
    ...qq...
    ..qrqq..
    ..qrqq..
    .qrqqqp.
    .qrqqqp.
    pppppppp
    ...oo...
  `,
  // scissors: steel blades, red handles
  scissors: `
    2......2
    22....22
    .22..22.
    ..2222..
    yyy22yyy
    y.y..y.y
    yyy..yyy
  `,
  // a wicker basket with a hoop handle
  basket: `
    ..uuuu..
    .u....u.
    .u....u.
    wwwwwwww
    vwvwvwvw
    wvwvwvwv
    .vvvvvv.
  `,
  // a brass key
  key: `
    .ppp....
    pp.pp...
    pp.ppppp
    pp.pp.pp
    .ppp..oo
  `,
};

/** A hanging sign with one of the icons. Pictures, not words. */
export function sign(icon: SignIcon): Sprite {
  const c = canvas(SIGN_W, SIGN_H);
  paste(c, board, 0, 0);
  const pic = sprite(ICONS[icon]);
  // the board's face is 10x8 at (2, 5)
  paste(c, pic, 2 + Math.floor((10 - pic.w) / 2), 5 + Math.floor((8 - pic.h) / 2));
  return done(c);
}
