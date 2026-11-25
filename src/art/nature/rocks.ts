import { sprite } from '../../core/sprite';

// Stone and dead wood: rocks, a stump, a fallen log. Standing props with a closed ink
// outline. Each shows its top: the rock a pale top plane, the stump and the log their rings.

// A small rock: a pale top plane with one glint, a steel.3 face, slate shade low on the right.
export const rock = sprite(
  `
  .....000000.....
  ...0044444400...
  ..044544444330..
  .04444444433330.
  .04444443333320.
  0443333333332220
  0333333333322220
  0333333332222220
  .02222222222220.
  ..000000000000..
`,
  { anchor: [0, 10] },
);

// A boulder two tiles wide, with a second rock leaning against its right foot.
export const rockLarge = sprite(
  `
  ..........0000000...............
  .......0004444444000............
  .....00444544444444300..........
  ....04445544444444433300........
  ...04444444444444444333300......
  ..0444444444444444433333330.....
  ..04444444444444433333333320....
  .0444444444444333333333333220...
  .04444444443333333333333332220..
  04444443333333333333300000002200
  0443333333333333333304444444400.
  0333333333333333333044544444330.
  03333333333333333320444444433330
  03333333333333332220444443333330
  03333333333333222220333333333320
  .0333333333322222220333333332220
  .0222222222222222220333333222220
  ..002222222222222220222222222200
  ....000000000000000.0000000000..
`,
  { anchor: [0, 19] },
);

// A tree stump: the cut top with one ring and a heart, bark below, roots at the foot.
export const stump = sprite(
  `
  ....00000000....
  ..00wwwwwwww00..
  .0wwwvvvvvvwww0.
  .0wwvwwwwwwvww0.
  .0wwvwwvvwwvww0.
  .0wwwvvvvvvwww0.
  .0vwwwwwwwwwwu0.
  .0vvvwwwwwwuuu0.
  .0wvvvvvvvvuuu0.
  .0wvvuvvvvvuuu0.
  .0wvvuvvvvvuuu0.
  0wwvvvvvvvvvuuu0
  0wwvvvvvvvvuuuu0
  .00000000000000.
`,
  { anchor: [0, 14] },
);

// A fallen log, two tiles long: the cut end with its rings on the left, bark lit along
// the top, a knot, and a tuft of moss.
export const log = sprite(
  `
  ...000.000000000000000000000....
  ..0www0wwwwwwwwwwwwwwwwwwwww00..
  .0wwwww0wwwwwwihhgwwwwwwwwwvv0..
  0wwvvvww0vvvvvvgggvvvvvvvvvvvu0.
  0wvwwwvw0vvvvvvvvvvvvvvvvvvvuu0.
  0wvwvwvw0vvvvvvvvvvuuvvvvvvvuu0.
  0wvwwwvw0vvvvvvvvvvvvvvvvvvuuu0.
  0wwvvvww0uuvvvvvvvvvvvvvvuuuuu0.
  .0vwwwv0uuuuuuuuuuuuuuuuuuuuu0..
  ..0vvv0.000000000000000000000...
  ...000..........................
`,
  { anchor: [0, 11] },
);
