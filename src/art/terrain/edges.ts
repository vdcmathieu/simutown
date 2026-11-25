import type { Slot } from '../../core/palette';
import { recolor, sprite, stack } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import { TILE, type TerrainDef } from '../../core/types';

// Edges, as fringes. A fringe piece is drawn on the NEIGHBOURING tile, so it is authored
// as a small strip and pinned to the side of that tile which faces the terrain.
// Terrain never uses ink: the darkest line of an edge is the dark end of its own ramp.

export type Fringe = NonNullable<TerrainDef['fringe']>;
type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Pin a small piece into a corner of an empty TILE x TILE sprite. */
export function pin(piece: Sprite, corner: Corner): Sprite {
  const px = new Uint8Array(TILE * TILE);
  const x0 = corner === 'tl' || corner === 'bl' ? 0 : TILE - piece.w;
  const y0 = corner === 'tl' || corner === 'tr' ? 0 : TILE - piece.h;
  for (let y = 0; y < piece.h; y++) {
    for (let x = 0; x < piece.w; x++) px[(y0 + y) * TILE + x0 + x] = piece.px[y * piece.w + x]!;
  }
  return { w: TILE, h: TILE, px, ax: 0, ay: 0 };
}

/** Turn a strip drawn left-to-right into one that runs top-to-bottom. */
export function upright(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[x * s.h + y] = s.px[y * s.w + x]!;
  return { w: s.h, h: s.w, px, ax: 0, ay: 0 };
}

/** The same piece upside down. */
export function flipV(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) px.set(s.px.subarray(y * s.w, (y + 1) * s.w), (s.h - 1 - y) * s.w);
  return { ...s, px };
}

/** Every sprite of a fringe set with its slots swapped: the same edge in another material. */
export function recolorFringe(f: Fringe, map: Partial<Record<Slot, Slot | null>>): Fringe {
  const out: Fringe = {};
  for (const [side, entry] of Object.entries(f) as [keyof Fringe, Sprite | Sprite[]][]) {
    out[side] = Array.isArray(entry) ? entry.map((s) => recolor(s, map)) : recolor(entry, map);
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// The turf edge: grass creeping over paving, dirt, soil. Lumps are 1, 2 and 3 pixels deep
// in runs of uneven length. Every side has three interchangeable strips (the renderer
// picks one per tile), and every strip starts and ends 2 deep, so any strip joins any
// other and a long edge never repeats on a 16-pixel beat. One line of darker green closes
// the edge: moss.1 where it faces the light (north and west), moss.0 where it faces away
// (south and east).
// ---------------------------------------------------------------------------------------

// on the tile north of the grass: its bottom rows
const turfN = [
  pin(sprite(`
    .....hhhh.....h.
    hh..hiiiih..hhih
    iihhiiiiiihhiiii
  `), 'bl'),
  pin(sprite(`
    .hh......hhh....
    hiih....hiiih..h
    iiiihhhhiiiiihhi
  `), 'bl'),
  pin(sprite(`
    .....hh.....hhh.
    h..hhiih...hiiih
    ihhiiiiihhhiiiii
  `), 'bl'),
];
// on the tile south of the grass: its top rows
const turfS = [
  pin(sprite(`
    iggiiiiiggggiiii
    g..giiig....giig
    ....ggg......gg.
  `), 'tl'),
  pin(sprite(`
    iggiiiiigggiiiii
    g..ggiig...giiig
    .....gg.....ggg.
  `), 'tl'),
  pin(sprite(`
    iiiiggiiiiiiggii
    gigg..giiiig..gg
    .g.....gggg.....
  `), 'tl'),
];
// on the tile west of the grass: its right columns
const turfW = [
  pin(upright(sprite(`
    .....hh.....hhh.
    h..hhiih...hiiih
    ihhiiiiihhhiiiii
  `)), 'tr'),
  pin(upright(sprite(`
    .h.....hhhh.....
    hihh..hiiiih..hh
    iiiihhiiiiiihhii
  `)), 'tr'),
  pin(upright(sprite(`
    .hh......hhh....
    hiih....hiiih..h
    iiiihhhhiiiiihhi
  `)), 'tr'),
];
// on the tile east of the grass: its left columns
const turfE = [
  pin(upright(sprite(`
    iiiiigggiiiiiggi
    giiig...giigg..g
    .ggg.....gg.....
  `)), 'tl'),
  pin(upright(sprite(`
    iiggiiiiiiggiiii
    gg..giiiig..ggig
    .....gggg.....g.
  `)), 'tl'),
  pin(upright(sprite(`
    iggiiiiiggggiiii
    g..giiig....giig
    ....ggg......gg.
  `)), 'tl'),
];

/** Grass creeping over a lower ground. Shared by `grass` and `meadow`. */
export const turf: Fringe = {
  n: turfN,
  s: turfS,
  w: turfW,
  e: turfE,
  // outer corners: the grass only touches this tile diagonally
  ne: pin(sprite(`
    h.
    ig
  `), 'bl'),
  nw: pin(sprite(`
    .h
    hi
  `), 'br'),
  se: pin(sprite(`
    ig
    g.
  `), 'tl'),
  sw: pin(sprite(`
    hi
    .g
  `), 'tr'),
  // inner corners: the two strips, plus a wedge of grass that rounds the bend
  'in-ne': stack(turfN[0]!, turfE[0]!, pin(sprite(`
    gg....
    iig...
    iiig..
    iiiig.
    iiiiig
    iiiiig
  `), 'bl')),
  'in-nw': stack(turfN[0]!, turfW[0]!, pin(sprite(`
    ....hh
    ...hii
    ..hiii
    .hiiii
    hiiiii
    hiiiii
  `), 'br')),
  'in-se': stack(turfS[0]!, turfE[0]!, pin(sprite(`
    iiiiig
    iiiiig
    iiiig.
    iiig..
    iig...
    gg....
  `), 'tl')),
  'in-sw': stack(turfS[0]!, turfW[0]!, pin(sprite(`
    hiiiii
    hiiiii
    .giiii
    ..giii
    ...gii
    ....gg
  `), 'tr')),
};

// ---------------------------------------------------------------------------------------
// A drift edge: a loose material (sand) spilling over its neighbours in long, shallow
// tongues. Drawn once, for the north side, in two letters: F is the fill and L the line
// that closes it. The other three sides are the same strips turned and flipped, in a
// different order, so opposite banks never mirror each other. Strips start and end 2 deep.
// ---------------------------------------------------------------------------------------

const DRIFT = [
  `
    ......LLLLL.....
    LL..LLFFFFFLL..L
    FFLLFFFFFFFFFLLF
  `,
  `
    ................
    LLLL.....LLLLLLL
    FFFFLLLLLFFFFFFF
  `,
  `
    ..LLLLL.........
    LLFFFFFLL....LLL
    FFFFFFFFFLLLLFFF
  `,
];

/** A full fringe set of drift strips in one fill colour and one closing line. */
export function driftEdge(fill: Slot, line: Slot): Fringe {
  const legend = { F: fill, L: line };
  const strips = DRIFT.map((art) => sprite(art, { legend }));
  const at = (i: number): Sprite => strips[i % strips.length]!;
  const n = [0, 1, 2].map((i) => pin(at(i), 'bl'));
  const s = [2, 0, 1].map((i) => pin(flipV(at(i)), 'tl'));
  const w = [1, 2, 0].map((i) => pin(upright(at(i)), 'tr'));
  const e = [0, 2, 1].map((i) => pin(upright(flipV(at(i))), 'tl'));
  const wedge = sprite(`
    ....LL
    ...LFF
    ..LFFF
    .LFFFF
    LFFFFF
    LFFFFF
  `, { legend });
  const flipH = (p: Sprite): Sprite => upright(flipV(upright(p)));
  return {
    n,
    s,
    w,
    e,
    ne: pin(sprite('L.\nFL', { legend }), 'bl'),
    nw: pin(sprite('.L\nLF', { legend }), 'br'),
    se: pin(sprite('FL\nL.', { legend }), 'tl'),
    sw: pin(sprite('LF\n.L', { legend }), 'tr'),
    'in-nw': stack(n[0]!, w[0]!, pin(wedge, 'br')),
    'in-ne': stack(n[0]!, e[0]!, pin(flipH(wedge), 'bl')),
    'in-sw': stack(s[0]!, w[0]!, pin(flipV(wedge), 'tr')),
    'in-se': stack(s[0]!, e[0]!, pin(flipV(flipH(wedge)), 'tl')),
  };
}

// ---------------------------------------------------------------------------------------
// Straight edges, for built ground. A line of one colour along each side, `depth` rows of
// it on the south side, where the three-quarter view shows a front face.
// ---------------------------------------------------------------------------------------

/** A w x h block of one slot. */
function block(w: number, h: number, slot: Slot): Sprite {
  return sprite(Array.from({ length: h }, () => 'X'.repeat(w)).join('\n'), { legend: { X: slot } });
}

/** One block on top of another, the same width. */
function over(top: Sprite, bottom: Sprite): Sprite {
  const px = new Uint8Array(top.w * (top.h + bottom.h));
  px.set(top.px, 0);
  px.set(bottom.px, top.w * top.h);
  return { w: top.w, h: top.h + bottom.h, px, ax: 0, ay: 0 };
}

/**
 * A straight border: `lit` along the north and west sides, `shade` along the east, and on
 * the south side a front face `face` rows tall in `lit` over one row of `shade`.
 * With `face` 0 the south side is a single `shade` line like the east.
 */
export function straightEdge(lit: Slot, shade: Slot, face = 0): Fringe {
  const south = face > 0 ? over(block(TILE, face, lit), block(TILE, 1, shade)) : block(TILE, 1, shade);
  const southEnd = (slot: Slot): Sprite => (face > 0 ? over(block(1, face, slot), block(1, 1, shade)) : block(1, 1, shade));
  return {
    n: pin(block(TILE, 1, lit), 'bl'),
    w: pin(block(1, TILE, lit), 'tr'),
    e: pin(block(1, TILE, shade), 'tl'),
    s: pin(south, 'tl'),
    ne: pin(block(1, 1, shade), 'bl'),
    nw: pin(block(1, 1, lit), 'br'),
    se: pin(southEnd(shade), 'tl'),
    sw: pin(southEnd(lit), 'tr'),
  };
}
