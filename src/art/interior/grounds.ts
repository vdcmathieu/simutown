// The grounds of a room: floors, the two rows of the back wall, and the ink outside.
//
// A room is laid out in an ASCII map like a town. Its back wall is two rows of wall
// terrain along the top: an upper row (`wall-<look>`) and a base row (`wall-<look>-base`)
// that carries the skirting or the wainscot. Any upper row goes with any base row. Below
// them lies the floor. Everything outside the room is `ink`. Every floor and wall draws
// the top of the walls as its fringe on that ink: a wooden cap above the back wall, down
// each side and along the open front, outside the room, so furniture never covers it.
// The shell needs no corner pieces: draw the room as a rectangle of wall and floor in a
// field of ink, and the cap follows its outline.
import { type Slot, slotIndex } from '../../core/palette';
import { sprite, type Sprite } from '../../core/sprite';
import { TILE, type TerrainDef } from '../../core/types';
import { pin } from '../terrain/edges';

/** A tile from a function of the pixel position, returning a slot letter. */
function tile(paint: (x: number, y: number) => string): Sprite {
  const lines: string[] = [];
  for (let y = 0; y < TILE; y++) {
    let row = '';
    for (let x = 0; x < TILE; x++) row += paint(x, y);
    lines.push(row);
  }
  return sprite(lines.join('\n'));
}

/** A w x h block of one slot. */
function block(w: number, h: number, slot: Slot): Sprite {
  return { w, h, px: new Uint8Array(w * h).fill(slotIndex(slot)), ax: 0, ay: 0 };
}

// ---------------------------------------------------------------------------------------
// Floors. Boards and slabs run on from tile to tile: the long joints sit on the same rows
// in every variant, and only the short end joints move, on different columns.
// ---------------------------------------------------------------------------------------

/**
 * Boards 7 pixels wide running left to right, a joint line one tone darker under each.
 * `ends` gives the column of the one end joint in each of the two boards, or null where
 * the board runs on: most rows cross the tile without a joint, so boards are 32 to 64
 * pixels long and the floor reads as boards, never as bricks.
 */
function boards(base: string, joint: string, ends: [number | null, number | null]): Sprite {
  return tile((x, y) => (y === 7 || y === 15 || x === ends[y >> 3] ? joint : base));
}
const boardEnds: [number | null, number | null][] = [[null, null], [6, null], [null, 11], [null, null], [13, null], [null, 3]];

/** Honey boards in cream.0 with wood.2 joints: the warmer floor. */
const woodTiles = boardEnds.map((e) => boards('a', 'w', e));

/** Pale scrubbed boards in cream.1 with cream.0 joints: the brightest floor. */
const pineTiles = boardEnds.map((e) => boards('b', 'a', e));

/** A soft checker of 8-pixel squares in two near creams: a shop or cafe floor. */
const checkerTiles = [tile((x, y) => ((x >> 3) + (y >> 3)) % 2 === 0 ? 'c' : 'b')];

/**
 * Big warm flagstones, a whole tile tall, like the road outside but in cream. Every
 * variant has the same structure, one course cut once, at a different column, so no two
 * rows stack into a brick wall. Two in five carry a small glint in the top-left corner of a slab.
 */
function flags(cut: number, glint = false): Sprite {
  return tile((x, y) => {
    if (y === 15 || x === cut) return 'a';
    // the glint hugs the top-left corner of the slab right of the cut: a lit edge, never a scratch
    if (glint && ((y === 0 && (x === cut + 1 || x === cut + 2)) || (y === 1 && x === cut + 1))) return 'c';
    return 'b';
  });
}

const stoneTiles = [flags(9, true), flags(3), flags(13), flags(6, true), flags(11)];

// ---------------------------------------------------------------------------------------
// Walls. The upper row: 2 rows of the wall's shade under the cap (which lies on the ink
// above), then the face. The base row: the face, then a skirting or a wainscot that meets
// the floor on a dark line.
// ---------------------------------------------------------------------------------------

/** An upper wall tile: `face(x, y)` below a 2-row band of `shade` under the cap. */
function upper(shade: (x: number) => string, face: (x: number, y: number) => string): Sprite {
  return tile((x, y) => (y < 2 ? shade(x) : face(x, y)));
}

/** A base wall tile: `face` above a 5-row wooden skirting. */
function skirted(face: (x: number, y: number) => string, skirting = ['w', 'v', 'v', 'v', 'u']): Sprite {
  return tile((x, y) => (y < 11 ? face(x, y) : skirting[y - 11]!));
}

/** A base wall tile: 3 rows of `face`, a dado rail, then upright wooden boards to the floor. */
function wainscot(face: (x: number, y: number) => string): Sprite {
  return tile((x, y) => {
    if (y < 3) return face(x, y);
    if (y === 3) return 'w';
    if (y < 6) return 'v';
    if (y === 14) return 'v';
    if (y === 15) return 'u';
    return x % 4 === 3 ? 'v' : 'w';
  });
}

const plaster = () => 'c';

// Wallpaper: pale yellow with small rose sprigs, one rose pixel over one leaf pixel. Each
// variant sets two sprigs on a loose diagonal, at its own offset, so a papered wall reads
// as a scattered pattern: never a grid of dots, never stray specks.
const paper = (...sprigs: [number, number][]) => (x: number, y: number) => {
  for (const [sx, sy] of sprigs) {
    if (x === sx && y === sy) return '*';
    if (x === sx && y === sy + 1) return 'h';
  }
  return 'r';
};
const paperLooks = [paper([3, 3], [11, 10]), paper([7, 5], [14, 12]), paper([1, 8], [9, 1]), paper([5, 11], [12, 4])];

// Stripes: cream and pale sky, 4 pixels each.
const stripe = (x: number) => (x % 8 < 4 ? 'f' : 'c');

// Wood panelling: upright boards 8 pixels wide.
const panel = (x: number) => (x % 8 === 7 ? 'v' : 'w');

// Brick: warm brick.2 with a few bricks drawn in brick.1, far apart: a brick is its lower
// joint and one end joint. Never a course line across the tile, never a full grid.
function bricks(...drawn: [x0: number, x1: number, y: number][]) {
  return (x: number, y: number) => {
    for (const [a, b, yy] of drawn) {
      if (y === yy && x >= a && x <= b) return 'y';
      if (x === b && y >= yy - 3 && y < yy) return 'y';
    }
    return 'z';
  };
}
const brickLooks = [bricks([2, 8, 9]), bricks(), bricks([9, 14, 13]), bricks([4, 10, 5])];
const brickBaseLooks = [bricks([6, 12, 6]), bricks(), bricks([1, 6, 8])];

// ---------------------------------------------------------------------------------------
// The ink outside the room, and the cap it draws on the room's edge tiles: a wooden band
// 4 pixels wide, the top of the walls seen from above.
// ---------------------------------------------------------------------------------------

/** A band of slots, one per row from the top, `len` long. */
function band(slots: Slot[], len: number): Sprite {
  const w = len;
  const h = slots.length;
  const px = new Uint8Array(w * h);
  slots.forEach((s, y) => px.fill(slotIndex(s), y * w, (y + 1) * w));
  return { w, h, px, ax: 0, ay: 0 };
}
/** A column of slots, one per column from the left, `len` tall. */
function column(slots: Slot[], len: number): Sprite {
  const w = slots.length;
  const px = new Uint8Array(w * len);
  for (let y = 0; y < len; y++) slots.forEach((s, x) => (px[y * w + x] = slotIndex(s)));
  return { w, h: len, px, ax: 0, ay: 0 };
}

const capCorner = block(4, 4, 'wood.2');
/**
 * The cap: the top of the walls seen from above, a wooden band 4 pixels wide. Every floor
 * and wall draws it as a fringe on the ink around the room, so it lies outside the room
 * and no furniture standing against a wall can cover it. Each piece runs from the room
 * (inside, dark) to the ink (outside): dark, light, light, mid.
 */
const cap = {
  // on the ink above the back wall: its bottom rows
  n: pin(band(['wood.1', 'wood.2', 'wood.2', 'wood.0'], TILE), 'bl'),
  // on the ink below the front floor row: its top rows
  s: pin(band(['wood.0', 'wood.2', 'wood.2', 'wood.1'], TILE), 'tl'),
  // on the ink east of the room: its left columns
  e: pin(column(['wood.0', 'wood.2', 'wood.2', 'wood.1'], TILE), 'tl'),
  // on the ink west of the room: its right columns
  w: pin(column(['wood.1', 'wood.2', 'wood.2', 'wood.0'], TILE), 'tr'),
  // on the ink at the room's corners
  ne: pin(capCorner, 'bl'),
  nw: pin(capCorner, 'br'),
  se: pin(capCorner, 'tl'),
  sw: pin(capCorner, 'tr'),
};

const ink = tile(() => '0');

/** A floor or a wall: priority 21, the cap as its fringe on the ink (priority 19). */
function room(id: string, variants: Sprite[], solid: boolean): TerrainDef {
  return { id, variants, solid, priority: 21, fringe: cap };
}

/**
 * Priorities: floors and walls 21, ink 19, all above the outdoor grounds (0 to 8), which
 * never touch them. Floors and walls share a priority, so they meet each other on a
 * straight line, and each draws the cap on the ink beside it.
 */
export const interiorTerrain: Record<string, TerrainDef> = {
  ink: { id: 'ink', variants: [ink], solid: true, outside: true, priority: 19 },

  'floor-wood': room('floor-wood', woodTiles, false),
  'floor-pine': room('floor-pine', pineTiles, false),
  'floor-checker': room('floor-checker', checkerTiles, false),
  'floor-stone': room('floor-stone', stoneTiles, false),

  'wall-plaster': room('wall-plaster', [upper(() => 'b', plaster)], true),
  'wall-plaster-base': room('wall-plaster-base', [skirted(plaster)], true),

  'wall-paper': room('wall-paper', paperLooks.map((f) => upper(() => 'b', f)), true),
  'wall-paper-base': room('wall-paper-base', [wainscot(paper())], true),

  'wall-stripe': room('wall-stripe', [upper((x) => (stripe(x) === 'f' ? '9' : 'b'), stripe)], true),
  'wall-stripe-base': room('wall-stripe-base', [wainscot(stripe)], true),

  'wall-panel': room('wall-panel', [upper(() => 'v', panel)], true),
  'wall-panel-base': room('wall-panel-base', [skirted(panel, ['v', 'u', 'w', 'v', 'u'])], true),

  // no shade band under the cap: on brick it would stripe the wall; the cap's dark inner edge is enough
  'wall-brick': room('wall-brick', brickLooks.map((f) => tile(f)), true),
  'wall-brick-base': room('wall-brick-base', brickBaseLooks.map((f) => skirted(f)), true),
};
