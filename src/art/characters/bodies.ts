/**
 * The bodies of the character kit.
 *
 * A body grid is 16 wide and 11 rows tall and fills the bottom of the 16x24 box: its row 0
 * is the box's row 13, the row an adult's chin covers, and its row 10 is the ink line under
 * the shoes. A frame is a legs grid with a torso grid laid over it, so the arms can hang in
 * front of the hips.
 *
 * Uppercase letters are the roles of kit.ts (T top, U its shade, S skin, P legs, F shoes,
 * X O I a carried crate). Lowercase letters are clothing zones, not palette slots: the
 * outfit decides which role each one becomes (outfits.ts).
 *
 *   n collar          x shoulder straps    b top of a bib      c chest (the bib)
 *   a forearm         w hem under a bib    y hem elsewhere
 *   j h k hips where an apron hangs (k is the fork of the trousers)
 *   o q   hips elsewhere        e the dark ends of a skirt's hem
 *   g lower leg       d the far lower leg, seen from the side
 *
 * Two shapes are drawn by hand, the adult and the child. The broad adult is the adult with
 * two columns repeated, and the elder is the adult with the head carried lower and further
 * forward (see SHAPES).
 */
import { emptyGrid, grid, type Grid, widen } from './grid';

/** Rows in a body grid. */
export const BODY_H = 11;

const at = (top: number, art: string): Grid => grid(art, top, BODY_H);

/** The torso poses of one view. */
interface Uppers {
  stand: Grid;
  /** Front: one hand high, the other low. Side: the hand out in front. */
  swingA: Grid;
  /** Side only: the hand out behind. The front view mirrors swingA instead. */
  swingB: Grid;
  /** The waving arm is missing: the `wave` over-layers draw it in front of the head. */
  armless: Grid;
  /** Side only: one hand held out, mid-sentence. The front view uses `armless` and the `talk` over-layer. */
  talk: Grid;
  /** Both hands on a crate. */
  carry: Grid;
}

/** The leg poses of one view, for one kind of legs. */
interface Lowers {
  stand: Grid;
  /** Front: the viewer's left foot lands. Side: the front foot reaches ahead, off the ground. */
  stepA: Grid;
  /** Side only: the front foot is planted and the back foot lifts. */
  stepB: Grid;
  sit: Grid;
}

interface ViewSet {
  upper: Uppers;
  legs: Lowers;
  skirt: Lowers;
}

/**
 * Everything drawn for one body shape. `wave` and `talk` are raised arms, drawn after the
 * head so that long hair cannot hide them: 24 rows, the whole box.
 */
export interface BodySet {
  front: ViewSet;
  side: ViewSet;
  wave: { front: [Grid, Grid]; side: [Grid, Grid] };
  talk: { front: Grid };
  /** How far the body sinks in a step and on a seat. */
  stepDrop: number;
  sitDrop: number;
}

// --- adult -----------------------------------------------------------------------------

const ADULT_FRONT_UPPER: Uppers = {
  stand: at(1, `
    ...0TxnnnnxT0...
    ..0TTxbbbbxTT0..
    ..0aUccccccUa0..
    ..0S0cccccc0S0..
    ...00wwwwww00...
  `),
  // The viewer's left hand swings up to the shoulder, the right one hangs a pixel lower.
  swingA: at(2, `
    ...0TxnnnnxT0...
    ..0STxbbbbxTT0..
    ..00UccccccUT0..
    ...0Ucccccc0a0..
    ....0wwwwww0S0..
    ...........000..
  `),
  swingB: emptyGrid(BODY_H),
  armless: at(1, `
    ...0TxnnnnxT0...
    ..0TTxbbbbxTT0..
    ..0aUcccccc00...
    ..0S0cccccc0....
    ...00wwwwww0....
  `),
  talk: emptyGrid(BODY_H),
  // The crate shows its lid: one light row on top, two rows of front.
  carry: at(1, `
    ...0TxnnnnxT0...
    ..0TTxbbbbxTT0..
    ..0a00000000a0..
    ..0S0XXXXXX0S0..
    ...00OOOOOI00...
    ....0OOOOOI0....
    ....00000000....
  `),
};

const ADULT_FRONT_LEGS: Lowers = {
  stand: at(6, `
    ....0jjjjjj0....
    ....0hhkkhh0....
    ....0gg00gg0....
    ....0FF00FF0....
    ....000..000....
  `),
  stepA: at(7, `
    ....0hhkkhh0....
    ....0gg00FF0....
    ...0FFF00000....
    ...00000........
  `),
  stepB: emptyGrid(BODY_H),
  sit: at(8, `
    ...0hhh00hhh0...
    ....0FF00FF0....
    ....000..000....
  `),
};

const ADULT_FRONT_SKIRT: Lowers = {
  stand: at(6, `
    ...0ojjjjjjo0...
    ..0eqhhhhhhqe0..
    ..000SS00SS000..
    ....0FF00FF0....
    ....000..000....
  `),
  stepA: at(6, `
    ...0ojjjjjjo0...
    ..0eqhhhhhhqe0..
    ..000SS00FF000..
    ...0FFF0000.....
    ...00000........
  `),
  stepB: emptyGrid(BODY_H),
  sit: at(8, `
    ..0eqhhhhhhqe0..
    ..000FF00FF000..
    ....000..000....
  `),
};

const ADULT_SIDE_UPPER: Uppers = {
  stand: at(1, `
    .....0TTTnn0....
    ....0TTTTTbb0...
    ....0TUaaUcc0...
    ....0TUSSUcc0...
    .....0yyyww0....
  `),
  swingA: at(2, `
    .....0TTTnn0....
    ....0TTTTTbb0...
    ....0TTTUacc0...
    ....0TTTTUSS0...
    .....0yyyy000...
  `),
  swingB: at(2, `
    .....0TTTnn0....
    ....0TTTTTbb0...
    ....0aUTTTcc0...
    ...0SSUTTTcc0...
    ...000yyyww0....
  `),
  armless: at(1, `
    .....0TTTnn0....
    ....0TTTTTbb0...
    ....0TTTTTcc0...
    ....0TTTTTcc0...
    .....0yyyww0....
  `),
  talk: at(1, `
    .....0TTTnn0....
    ....0TTTTTbb00..
    ....0TTTUTccaS0.
    ....0TTTTUcc00..
    .....0yyyww0....
  `),
  carry: at(1, `
    .....0TTTnn0....
    ....0TTTTT000000
    ....0TUaaU0XXXX0
    ....0TUaSS0OOOI0
    .....0yyyy0OOOI0
    ..........000000
  `),
};

const ADULT_SIDE_LEGS: Lowers = {
  stand: at(6, `
    .....0ooojj0....
    .....0qqqhh0....
    .....0gggg0.....
    .....0FFFFF0....
    .....0000000....
  `),
  // The far leg leads, off the ground; the near leg pushes off behind.
  stepA: at(7, `
    ....0oooojjj0...
    ...0ggg00dFFF0..
    ...0FF0..00000..
    ...0000.........
  `),
  // The near leg leads and is planted; the far foot lifts behind.
  stepB: at(7, `
    ....0oooojjj0...
    ...0FFd00ggg0...
    ...000000FFFF0..
    ........000000..
  `),
  sit: at(7, `
    ............0...
    .....0ooojjjj0..
    .....000000gFF0.
    ..........00000.
  `),
};

const ADULT_SIDE_SKIRT: Lowers = {
  stand: at(6, `
    ....0ooooojj0...
    ....0eqqqhhe0...
    ....000SS0000...
    ......0FFF0.....
    ......00000.....
  `),
  stepA: at(6, `
    ....0ooooooo0...
    ...0eqqqqqhhe0..
    ...00S0000KFF0..
    ...0FF0..00000..
    ...0000.........
  `),
  stepB: at(6, `
    ....0ooooooo0...
    ...0eqqqqqhhe0..
    ...0FF0000SS0...
    ...0000.0FFFF0..
    ........000000..
  `),
  sit: at(7, `
    ............0...
    .....0ooojjjj0..
    .....000000gFF0.
    ..........00000.
  `),
};

// The waving arm, in box rows: it rises in front of the head from the viewer's right
// shoulder. Frame two tips the hand inwards.
const ADULT_WAVE_FRONT: [Grid, Grid] = [
  grid(`
    ..............0.
    .............0S0
    .............0S0
    .............0a0
    .............0T0
    ............0T0.
    .............0..
  `, 9, 24),
  grid(`
    .............0..
    ............0S0.
    ............0S00
    .............0a0
    .............0T0
    ............0T0.
    .............0..
  `, 9, 24),
];

// Seen from the side the hand comes up in front of the chin, and dips.
const ADULT_WAVE_SIDE: [Grid, Grid] = [
  grid(`
    .............00.
    ............0SS0
    ............0aa0
    ...........0TT0.
    ............00..
  `, 11, 24),
  grid(`
    .............00.
    ............0SS0
    ...........0Ta0.
    ............00..
  `, 12, 24),
];

// Talking: the forearm comes up beside the shoulder, the hand at chin height.
const ADULT_TALK_FRONT = grid(`
  .............0..
  ............0S0.
  ............0a0.
  ...........0T0..
  ............0...
`, 13, 24);

const ADULT: BodySet = {
  front: { upper: ADULT_FRONT_UPPER, legs: ADULT_FRONT_LEGS, skirt: ADULT_FRONT_SKIRT },
  side: { upper: ADULT_SIDE_UPPER, legs: ADULT_SIDE_LEGS, skirt: ADULT_SIDE_SKIRT },
  wave: { front: ADULT_WAVE_FRONT, side: ADULT_WAVE_SIDE },
  talk: { front: ADULT_TALK_FRONT },
  stepDrop: 1,
  sitDrop: 2,
};

// --- child -----------------------------------------------------------------------------
// Seven rows instead of ten, under the same big head. A child does not sink in a step:
// the head bobs and one foot lifts.

const CHILD_FRONT_UPPER: Uppers = {
  stand: at(4, `
    ....0xnnnnx0....
    ...0aUccccUa0...
    ...0S0wwww0S0...
  `),
  swingA: at(4, `
    ....0xnnnnx0....
    ...0SUccccUa0...
    ....00wwww0S0...
  `),
  swingB: emptyGrid(BODY_H),
  armless: at(4, `
    ....0xnnnnx0....
    ...0aUccccU0....
    ...0S0wwww0.....
  `),
  talk: emptyGrid(BODY_H),
  carry: at(4, `
    ....0xnnnnx0....
    ...0a000000a0...
    ...0S0XXXX0S0...
    ....00OOOI00....
    .....000000.....
  `),
};

const CHILD_FRONT_LEGS: Lowers = {
  stand: at(7, `
    ....0hhkkhh0....
    ....0gg00gg0....
    ....0FF00FF0....
    ....000..000....
  `),
  stepA: at(7, `
    ....0hhkkhh0....
    ....0gg00FF0....
    ...0FFF00000....
    ...00000........
  `),
  stepB: emptyGrid(BODY_H),
  sit: at(8, `
    ...0hhh00hhh0...
    ....0FF00FF0....
    ....000..000....
  `),
};

const CHILD_FRONT_SKIRT: Lowers = {
  stand: at(7, `
    ....0jjjjjj0....
    ...0ehhhhhhe0...
    ....0FF00FF0....
    ....000..000....
  `),
  stepA: at(7, `
    ....0jjjjjj0....
    ...0ehhhhhhe0...
    ...0FFF00000....
    ...00000........
  `),
  stepB: emptyGrid(BODY_H),
  sit: at(8, `
    ...0ehhhhhhe0...
    ....0FF00FF0....
    ....000..000....
  `),
};

const CHILD_SIDE_UPPER: Uppers = {
  stand: at(4, `
    ......0Tnn0.....
    .....0TaaUc0....
    .....0ySSyw0....
  `),
  swingA: at(4, `
    ......0Tnn0.....
    .....0TTUac0....
    .....0yyyUSS0...
  `),
  swingB: at(4, `
    ......0Tnn0.....
    .....0aUTTc0....
    ....0SSUyyw0....
  `),
  armless: at(4, `
    ......0Tnn0.....
    .....0TTTTc0....
    .....0yyyyw0....
  `),
  talk: at(4, `
    ......0Tnn00....
    .....0TTUcaS0...
    .....0yyyyw00...
  `),
  carry: at(4, `
    ......0Tn00000..
    .....0TaU0XXX0..
    .....0yaS0OOI0..
    .........00000..
  `),
};

const CHILD_SIDE_LEGS: Lowers = {
  stand: at(7, `
    .....0oojj0.....
    .....0gggg0.....
    .....0FFFFF0....
    .....0000000....
  `),
  stepA: at(7, `
    ....0ooojjj0....
    ...0ggg00dFF0...
    ...0FF0..0000...
    ...0000.........
  `),
  stepB: at(7, `
    ....0ooojjj0....
    ...0FFd00ggg0...
    ...000000FFFF0..
    ........000000..
  `),
  sit: at(8, `
    .....0ooojjj0...
    .....00000gFF0..
    .........00000..
  `),
};

const CHILD_SIDE_SKIRT: Lowers = {
  stand: at(7, `
    ....0ooooojj0...
    ....0eqqqhhe0...
    ....000FFF000...
    ......00000.....
  `),
  stepA: at(7, `
    ....0ooooojj0...
    ...0eqqqqhhhe0..
    ...0FF00000000..
    ...0000.........
  `),
  stepB: at(7, `
    ....0ooooojj0...
    ...0eqqqqhhhe0..
    ...0000000FFF0..
    ..........00000.
  `),
  sit: at(8, `
    .....0ooojjj0...
    .....00000gFF0..
    .........00000..
  `),
};

const CHILD_WAVE_FRONT: [Grid, Grid] = [
  grid(`
    .............0..
    ............0S0.
    ............0S0.
    ............0a0.
    ............0T0.
    ...........TT0..
    ............0...
  `, 12, 24),
  grid(`
    ............0...
    ...........0S0..
    ...........0S00.
    ............0a0.
    ............0T0.
    ...........TT0..
    ............0...
  `, 12, 24),
];

const CHILD_WAVE_SIDE: [Grid, Grid] = [
  grid(`
    ............00..
    ...........0SS0.
    ...........0aa0.
    ..........0TT0..
    ...........00...
  `, 14, 24),
  grid(`
    ............00..
    ...........0SS0.
    ..........0Ta0..
    ...........00...
  `, 15, 24),
];

const CHILD_TALK_FRONT = grid(`
  ............0...
  ...........0S0..
  ...........aa0..
  ...........00...
`, 16, 24);

const CHILD: BodySet = {
  front: { upper: CHILD_FRONT_UPPER, legs: CHILD_FRONT_LEGS, skirt: CHILD_FRONT_SKIRT },
  side: { upper: CHILD_SIDE_UPPER, legs: CHILD_SIDE_LEGS, skirt: CHILD_SIDE_SKIRT },
  wave: { front: CHILD_WAVE_FRONT, side: CHILD_WAVE_SIDE },
  talk: { front: CHILD_TALK_FRONT },
  stepDrop: 0,
  sitDrop: 1,
};

// --- broad -----------------------------------------------------------------------------

function mapSet<T extends Uppers | Lowers>(set: T, fn: (g: Grid) => Grid): T {
  return Object.fromEntries(Object.entries(set).map(([k, g]) => [k, fn(g as Grid)])) as unknown as T;
}

function mapView(v: ViewSet, fn: (g: Grid) => Grid): ViewSet {
  return { upper: mapSet(v.upper, fn), legs: mapSet(v.legs, fn), skirt: mapSet(v.skirt, fn) };
}

// Two pixels wider across the shoulders and hips, one pixel deeper from the side.
const broadFront = (g: Grid) => widen(g, [5, 10], 1);
const broadSide = (g: Grid) => widen(g, [9], 1);

/**
 * The widened shoulders stick out past the chin, so their two outer pixels become ink:
 * a rounded corner instead of colour against the sky.
 */
function roundShoulders(g: Grid): Grid {
  const top = g.findIndex((row) => /[A-Za-z]/.test(row));
  if (top < 0) return g;
  const row = g[top]!.split('');
  const first = row.findIndex((ch) => /[A-Za-z]/.test(ch));
  const last = row.length - 1 - [...row].reverse().findIndex((ch) => /[A-Za-z]/.test(ch));
  row[first] = '0';
  row[last] = '0';
  return g.map((r, i) => (i === top ? row.join('') : r));
}

const BROAD_FRONT = mapView(ADULT.front, broadFront);

const BROAD: BodySet = {
  ...ADULT,
  front: { ...BROAD_FRONT, upper: mapSet(BROAD_FRONT.upper, roundShoulders) },
  side: mapView(ADULT.side, broadSide),
};

// --- shapes ----------------------------------------------------------------------------

/** A body shape: which grids it wears and where the head sits on them. */
export interface Shape {
  set: BodySet;
  /** Rows the head sits lower than on the adult body. */
  headDy: number;
  /** Seen from the side, pixels the body stands back behind the head: a stoop. */
  stoop: number;
  /** Default walk-cycle frames per second. */
  walkFps: number;
}

export const SHAPES = {
  adult: { set: ADULT, headDy: 0, stoop: 0, walkFps: 8 },
  broad: { set: BROAD, headDy: 0, stoop: 0, walkFps: 8 },
  child: { set: CHILD, headDy: 3, stoop: 0, walkFps: 10 },
  elder: { set: ADULT, headDy: 1, stoop: 1, walkFps: 8 },
} satisfies Record<string, Shape>;

export type ShapeName = keyof typeof SHAPES;
