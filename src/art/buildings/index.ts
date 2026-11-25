import { sprite, type Sprite } from '../../core/sprite';
import type { PropDef } from '../../core/types';

// The reference house of the daylight look: a timber-framed cottage with a warm tiled
// roof. It is assembled from a few small pieces (roof tiles, a window, a door), which is
// how the building kit should work too: draw the pieces once, compose many houses.

// --- a tiny canvas to assemble pieces on -----------------------------------------------

interface Canvas {
  w: number;
  h: number;
  px: Uint8Array;
}

const canvas = (w: number, h: number): Canvas => ({ w, h, px: new Uint8Array(w * h) });

/** Copy a piece onto the canvas with its top-left corner at (x, y). */
function paste(c: Canvas, s: Sprite, x: number, y: number): void {
  for (let sy = 0; sy < s.h; sy++) {
    for (let sx = 0; sx < s.w; sx++) {
      const v = s.px[sy * s.w + sx]!;
      const cx = x + sx;
      const cy = y + sy;
      if (v !== 0 && cx >= 0 && cy >= 0 && cx < c.w && cy < c.h) c.px[cy * c.w + cx] = v;
    }
  }
}

/** Fill a rectangle by repeating a pattern piece from the rectangle's top-left corner. */
function fill(c: Canvas, s: Sprite, x: number, y: number, w: number, h: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const v = s.px[(dy % s.h) * s.w + (dx % s.w)]!;
      if (v !== 0) c.px[(y + dy) * c.w + x + dx] = v;
    }
  }
}

/** Erase single pixels (to round a corner). */
function erase(c: Canvas, points: readonly (readonly [number, number])[]): void {
  for (const [x, y] of points) c.px[y * c.w + x] = 0;
}

const done = (c: Canvas, anchor: readonly [number, number]): Sprite => ({
  w: c.w,
  h: c.h,
  px: c.px,
  ax: anchor[0],
  ay: anchor[1],
});

// --- pieces ----------------------------------------------------------------------------

// Two courses of roof tiles in a running bond. Each tile is a flat face with a sunlit
// lip; a scalloped shade line hangs under each course. No full grid of joints: the roof
// must read as tiles, not as a brick wall.
const roofTiles = sprite(`
  yzzzzyyyyzzzzyyy
  yyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyy
  xyyyyyxxxyyyyyxx
  yxxxxxyyyxxxxxyy
  zyyyyzzzzyyyyzzz
  yyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyy
  yyxxxyyyyyxxxyyy
  xxyyyxxxxxyyyxxx
`);

// One-pixel-wide columns, repeated sideways into long strips.
const ridge = sprite(`
  0
  z
  z
  y
  x
`);
const eave = sprite(`
  z
  y
  y
  x
  0
`);
const ink = sprite('0');
const lit = sprite('z');
const shade = sprite('x');

const plaster = sprite('c');
const plasterShade = sprite('b');
const beam = sprite(`
  w
  v
  v
  u
`);
const post = sprite('wvvu');
const plinth = sprite(`
  44444442
  33333332
  33333332
  22222222
`);

// A window: dark wood frame, four sky-blue panes with a glint, a sunlit sill.
const WINDOW = `
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u9ff99u.
  .u9f999u9f999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u99999u.
  .u9f999u99999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  wwwwwwwwwwwwwww
  uuuuuuuuuuuuuuu
`;
const windowDay = sprite(WINDOW);
// Lit from inside: only the panes, so the bars stay dark against them.
const windowLit = sprite(
  WINDOW.replace(/[uw]/g, '.').replace(/8/g, 'q').replace(/9/g, 'q').replace(/f/g, 'r'),
);

// A window box with geraniums.
const flowerBox = sprite(`
  .y.h.*..h.y.h*.
  hyhh*h*hhyyhh*h
  uuuuuuuuuuuuuuu
  uvvvvvvvvvvvvvu
  .uuuuuuuuuuuuu.
`);

// A red plank door with two inset panels and a brass knob. 16x24: a townsperson fits.
const door = sprite(`
  ..uuuuuuuuuuuu..
  .uuzzzzzzzzzzuu.
  uuzyyyyyyyyyyxuu
  uzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uzyyyyyyyyyqqyxu
  uzyyyyyyyyyqpyxu
  uzyyyyyyyyyyyyxu
  uzyxxxxxxxxxxyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxyyyyyyyyzyxu
  uzyxzzzzzzzzzyxu
  uzyyyyyyyyyyyyxu
  uxxxxxxxxxxxxxxu
  4444444444444444
`);

// A stone chimney with a dark cap. It stands on the roof slope.
const chimney = sprite(`
  .0000000000.
  044444444430
  043333333320
  000000000000
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0443333320.
  .0000000000.
`);

// --- the house -------------------------------------------------------------------------

const W = 80;
const H = 80;
const ROOF_TOP = 6;
const ROOF_H = 44;
const WALL_TOP = ROOF_TOP + ROOF_H - 2; // the eave overhangs the wall by two pixels
const WALL_X = 2;
const WALL_W = W - 4;
const DOOR_X = 32;
const WINDOW_XS = [9, 56];
const WINDOW_Y = WALL_TOP + 8; // level with the top of the door

function buildHouse(): { day: Sprite; glow: Sprite } {
  const c = canvas(W, H);

  // wall: plaster, a shadow under the eave, timber frame, stone plinth
  fill(c, plaster, WALL_X, WALL_TOP, WALL_W, H - WALL_TOP);
  fill(c, plasterShade, WALL_X, WALL_TOP, WALL_W, 4);
  fill(c, beam, WALL_X, WALL_TOP + 4, WALL_W, 4);
  fill(c, plinth, WALL_X, H - 5, WALL_W, 4);
  for (const x of [WALL_X, DOOR_X - 6, DOOR_X + 18, WALL_X + WALL_W - 4]) {
    fill(c, post, x, WALL_TOP + 4, 4, H - 5 - (WALL_TOP + 4));
  }
  for (const x of WINDOW_XS) {
    paste(c, windowDay, x, WINDOW_Y);
    paste(c, flowerBox, x, WINDOW_Y + 11);
  }
  paste(c, door, DOOR_X, H - 1 - door.h);
  // ink outline of the wall: both sides and the base line
  fill(c, ink, WALL_X - 1, WALL_TOP, 1, H - 1 - WALL_TOP);
  fill(c, ink, WALL_X + WALL_W, WALL_TOP, 1, H - 1 - WALL_TOP);
  fill(c, ink, WALL_X, H - 1, WALL_W, 1);

  // roof: tile courses between a ridge cap and an eave, lit on the left, shaded on the right
  fill(c, roofTiles, 0, ROOF_TOP + 5, W, ROOF_H - 10);
  fill(c, ridge, 0, ROOF_TOP, W, 5);
  fill(c, eave, 0, ROOF_TOP + ROOF_H - 5, W, 5);
  fill(c, lit, 1, ROOF_TOP + 1, 2, ROOF_H - 2);
  fill(c, shade, W - 3, ROOF_TOP + 1, 2, ROOF_H - 2);
  fill(c, ink, 0, ROOF_TOP, 1, ROOF_H);
  fill(c, ink, W - 1, ROOF_TOP, 1, ROOF_H);
  // round the roof's corners by one pixel
  erase(c, [
    [0, ROOF_TOP],
    [W - 1, ROOF_TOP],
    [0, ROOF_TOP + ROOF_H - 1],
    [W - 1, ROOF_TOP + ROOF_H - 1],
  ]);
  paste(c, ink, 1, ROOF_TOP + 1);
  paste(c, ink, W - 2, ROOF_TOP + 1);
  paste(c, ink, 1, ROOF_TOP + ROOF_H - 2);
  paste(c, ink, W - 2, ROOF_TOP + ROOF_H - 2);

  paste(c, chimney, 57, 0);

  const g = canvas(W, H);
  for (const x of WINDOW_XS) paste(g, windowLit, x, WINDOW_Y);

  return { day: done(c, [0, H]), glow: done(g, [0, H]) };
}

const house = buildHouse();

export const buildings: Record<string, PropDef> = {
  house: {
    id: 'house',
    sprite: house.day,
    emissive: house.glow,
    footprint: { w: 5, h: 3 },
    lights: [
      { dx: 16, dy: -16, radius: 28, slot: 'ochre.2' },
      { dx: 63, dy: -16, radius: 28, slot: 'ochre.2' },
    ],
    places: { door: { dx: 2, dy: 1 } },
  },
};
