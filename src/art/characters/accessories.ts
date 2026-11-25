/**
 * Things carried on the body: a satchel and a cane.
 *
 * Each is a body layer (see build.ts): one 11-row grid per view, laid over the dressed
 * body. Roles: M bag, N bag shade (also its strap), O the cane's wood, S skin, and the
 * zone letter `a` for the forearm that holds the cane. `_` erases the body below.
 *
 * The scarf and the glasses are not here: they move with the head (heads.ts).
 */
import type { BodyLayer } from './build';
import { BODY_H } from './bodies';
import { grid, type Grid, mirror } from './grid';

const at = (top: number, art: string): Grid => grid(art, top, BODY_H);

// A satchel on a strap across the chest. It hangs on the hip in front and behind, and
// from the side it sits behind the hip, where it changes the silhouette.
const BAG_FRONT_ADULT = at(1, `
  ....NN..........
  ......NN........
  ........NN......
  .........00000..
  .........0MMM0..
  .........0MMN0..
  .........00000..
`);

const BAG_FRONT_CHILD = at(4, `
  .....NN.........
  .......NN0000...
  .........0MM0...
  .........0MN0...
  .........0000...
`);

/** The satchel, for the adult bodies and for the child. */
export const BAG: Record<'adult' | 'child', BodyLayer> = {
  adult: {
    front: BAG_FRONT_ADULT,
    back: mirror(BAG_FRONT_ADULT),
    side: at(1, `
      .......N........
      ......N.........
      .....N..........
      ..000...........
      ..0MM0..........
      ..0MN0..........
      ..0000..........
    `),
  },
  child: {
    front: BAG_FRONT_CHILD,
    back: mirror(BAG_FRONT_CHILD),
    side: at(4, `
      .......N........
      ..0000N.........
      ..0MM0..........
      ..0MN0..........
      ..0000..........
    `),
  },
};

// A walking stick in the hand that does not wave: on the viewer's left from the front. It stands
// on the ground while the body bobs, and the arm that holds it does not swing.
const CANE_FRONT_ADULT = at(2, `
  .0..............
  0O0.............
  0OSS............
  0O00............
  0O0.............
  0O0.............
  0O0.............
  0O0.............
  000.............
`);

const CANE_FRONT_CHILD = at(4, `
  ..0.............
  .0O0............
  .0OSS...........
  .0O00...........
  .0O0............
  .0O0............
  .000............
`);

const CANE_HIDDEN = { front: ['carry'], back: ['carry'], side: ['wave', 'talk', 'carry'] } as const;

/** The cane, for the adult bodies and for the child. */
export const CANE: Record<'adult' | 'child', BodyLayer> = {
  adult: {
    front: CANE_FRONT_ADULT,
    back: mirror(CANE_FRONT_ADULT),
    side: at(2, `
      .............0..
      ............0O0.
      ..........aSSO0.
      ...........00O0.
      ............0O0.
      ............0O0.
      ............0O0.
      ............0O0.
      ............000.
    `),
    follows: false,
    steadies: true,
    notIn: CANE_HIDDEN,
  },
  child: {
    front: CANE_FRONT_CHILD,
    back: mirror(CANE_FRONT_CHILD),
    side: at(4, `
      ............0...
      ...........0O0..
      .........aSSO0..
      ..........00O0..
      ...........0O0..
      ...........0O0..
      ...........000..
    `),
    follows: false,
    steadies: true,
    notIn: CANE_HIDDEN,
  },
};
