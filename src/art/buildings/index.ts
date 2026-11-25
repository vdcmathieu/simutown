import { recolor, sprite, type Sprite } from '../../core/sprite';
import { type Slot, slotIndex } from '../../core/palette';
import type { PropDef } from '../../core/types';

// The reference buildings of the daylight look: a timber-framed cottage with a red gable
// roof, and a two-storey townhouse with a blue hip roof. Both are assembled from the same
// few pieces (a roof face, a window, a door), which is how the building kit should work
// too: draw the pieces once, compose many houses.

// --- a tiny canvas to assemble pieces on -----------------------------------------------

interface Canvas {
  w: number;
  h: number;
  px: Uint8Array;
}

const canvas = (w: number, h: number): Canvas => ({ w, h, px: new Uint8Array(w * h) });

/** Copy a piece onto the canvas with its top-left corner at (x, y). */
function paste(c: Canvas, s: Sprite | Canvas, x: number, y: number): void {
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

const done = (c: Canvas, anchor: readonly [number, number]): Sprite => ({
  w: c.w,
  h: c.h,
  px: c.px,
  ax: anchor[0],
  ay: anchor[1],
});

// --- roof pieces -----------------------------------------------------------------------

// The roof face: nine courses of tiles, 5 pixels each. Tiles are 6 to 9 pixels wide so
// that no two courses line up. Some hang with a rounded bottom and some with a straight
// one, so the brick.0 shade lines never settle into a regular wave, and about one tile in
// three catches the sun along its own top lip. A roof takes as much of this as it needs,
// from the top-left corner. It must read as tiles, never as a brick wall or as stripes.
const roofFace = sprite(`
  yyyyzzzzzyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yxxxyyyyyxxxyyyyyxxyyyyyyxxyyyyxxyyyyyyxxyyyyyxxxyyyxxxyyyyyxxyyyyyyyyxxyyyyyxxx
  xyyyxxxxxyyyxxxxxyyxxxxxxxyxxxxyyxxxxxxxyxxxxxyyyxxxyyyxxxxxyyxxxxxxxxxyxxxxxyyy
  yyyyyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyxxxyyyyyxxyyyyyyxxyyyyxxyyyyyyxxyyyyyxxxyyyyyyxxyyyyyyyxxyyyyxxyyyyyyyyxxyyy
  xxxxyyyxxxxxyyxxxxxxxyxxxxyyxxxxxxxyxxxxxyyyxxxxxxyyxxxxxxxxyxxxxyyxxxxxxxxxyxxx
  yyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  xyyyyyxxxyyyyyxxyyyyyyxxyyyyxxxyyyyyxxyyyyyyyxxyyyyyxxxyyyyyyxxxyyyyxxyyyyyyyyxx
  yxxxxxyyyxxxxxyyxxxxxxxyxxxxyyyxxxxxyyxxxxxxxxyxxxxxyyyxxxxxxyyyxxxxyyxxxxxxxxxy
  yyyyyyyzzzyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyyyyyyyyyyyyyzzzzy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyxxyyyyyxxyyyxxyyyyyyxxyyyyxxxyyyyyxxxyyyyyxxyyyyyyyxxyyyyyyxxyyyyyyyyxxyyyyx
  xxxxyyxxxxxxyxxxyyxxxxxxxyxxxxyyyxxxxxyyyxxxxxyyxxxxxxxxyxxxxxxyyxxxxxxxxxyxxxxy
  yyyyyyyyyyyzzzyyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyxxyyyyyxxyyyxxxyyyyxxxyyyyxxxyyyxxxyyyyyxxxyyyyyxxyyyyyyyxxyyyyxxxyyyyyyxxyyyy
  xxyyxxxxxxyxxxyyyxxxxyyyxxxxyyyxxxyyyxxxxxyyyxxxxxyyxxxxxxxxyxxxxyyyxxxxxxyyxxxx
  yyyyyyyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyzzzzzyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyxxyyyxxyyyyyyyxxyyyyxxxyyyxxxyyyxxxyyyyyxxxyyyyyxxxyyyyxxxyyyyxxxyyyyyxxxy
  xxxxxxxyxxxyyxxxxxxxxyxxxxyyyxxxyyyxxxyyyxxxxxyyyxxxxxyyyxxxxyyyxxxxyyyxxxxxyyyx
  yyyyyyzzzyyyyyyyyyyyyyyyyyyzzzyyyyyyyyyyyyyyyyyzzzyyyyyyyyyyyyyyyyyzzzzzyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyxxxyyyxxxyyyyxxxyyyyyxxyyyyyxxyyyxxxyyyyyxxxyyyxxxyyyxxyyyyyyyxxyyyyyxxxyyyxx
  xxxyyyxxxyyyxxxxyyyxxxxxyyxxxxxxyxxxyyyxxxxxyyyxxxyyyxxxyyxxxxxxxxyxxxxxyyyxxxyy
  yyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyxxyyyyyxxxyyyyxxxyyyyyxxyyyyyxxyyyyxxyyyyyyxxyyyxxxyyyyyxxxyyyyxxxyyyxxxyy
  xxxxxxxyxxxxxyyyxxxxyyyxxxxxyyxxxxxxyxxxxyyxxxxxxxyxxxyyyxxxxxyyyxxxxyyyxxxyyyxx
  yyyyyyyyyyyyyyyyyyyyyzzzzzyyyyyyyyyyyyyyyyzzzzyyyyyyyyyyyyyyyyyyyyyyyyzzzyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
  yyyxxyyyyyyyxxyyyyxxyyyyyyyxxyyyxxyyyyyyxxyyyyxxxyyyxxyyyyyyxxyyyyyxxyyyyyxxyyyy
  xxxyyxxxxxxxxyxxxxyyxxxxxxxxyxxxyyxxxxxxxyxxxxyyyxxxyyxxxxxxxyxxxxxyyxxxxxxyxxxx
`);

// One-pixel-wide columns, repeated sideways into long strips.
// The ridge is a cap of clearly lighter tiles; the eave ends in a lit lip and a shade line.
const ridge = sprite(`
  0
  z
  z
  z
  x
`);
const ridgeJoint = sprite(`
  y
  y
`);
const eave = sprite(`
  z
  y
  y
  x
  0
`);
const ink = sprite('0');

type RoofRamp = 'brick' | 'ochre' | 'sky';

interface RoofSpec {
  w: number;
  h: number;
  /**
   * 0 for a gable roof: straight sides finished with bargeboards.
   * For a hip roof, how many pixels each side leans in between the eave and the ridge.
   */
  hip: number;
  ramp: RoofRamp;
  /** Keep the lit lips on one course in three only: for blue roofs, which must not sparkle like water. */
  calm?: boolean;
}

/** Build a roof. The eave is its bottom 5 rows; the wall tucks 2 pixels under it. */
function roof(spec: RoofSpec): Canvas {
  const { w, h, hip } = spec;
  const c = canvas(w, h);
  fill(c, roofFace, 0, 5, w, h - 10);
  if (spec.calm) {
    const lip = slotIndex('brick.2');
    for (let y = 5; y < h - 5; y++) {
      const course = Math.floor((y - 5) / 5);
      if (course % 3 === 1) continue;
      for (let x = 0; x < w; x++) if (c.px[y * w + x] === lip) c.px[y * w + x] = slotIndex('brick.1');
    }
  }
  fill(c, ridge, 0, 0, w, 5);
  for (let x = 6; x < w; x += 7) fill(c, ridgeJoint, x, 2, 1, 2);
  fill(c, eave, 0, h - 5, w, 5);

  // Sides. Light comes from the upper left, so the left edge is lit and the right one
  // shaded: cream bargeboards on a gable, a band of the roof's own tones on a hip.
  const litEdge = sprite(hip ? 'z' : 'c');
  const shadeEdge = sprite(hip ? 'x' : 'a');
  const inset = (y: number) => (y >= h - 5 ? 0 : Math.round((hip * (h - 6 - y)) / (h - 6)));
  for (let y = 0; y < h; y++) {
    const i = inset(y);
    const above = y > 0 ? inset(y - 1) : i;
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, w - 1 - x); // distance from the nearer side
      if (d < i) c.px[y * w + x] = 0;
    }
    // ink the edge, and the tread of each step where a hip leans in
    for (let d = i; d <= Math.max(i, above); d++) {
      paste(c, ink, d, y);
      paste(c, ink, w - 1 - d, y);
    }
    if (y > 0 && y < h - 1) {
      fill(c, litEdge, i + 1, y, 2, 1);
      fill(c, shadeEdge, w - 3 - i, y, 2, 1);
    }
  }
  fill(c, ink, inset(0), 0, w - 2 * inset(0), 1);
  // round the four corners by one pixel
  for (const [x, y] of [[inset(0), 0], [w - 1 - inset(0), 0], [0, h - 1], [w - 1, h - 1]] as const) {
    c.px[y * w + x] = 0;
  }
  for (const [x, y] of [[inset(0) + 1, 1], [w - 2 - inset(0), 1], [1, h - 2], [w - 2, h - 2]] as const) {
    paste(c, ink, x, y);
  }

  if (spec.ramp === 'brick') return c;
  const to = (i: number) => `${spec.ramp}.${i}` as Slot;
  const tinted = recolor(done(c, [0, 0]), { 'brick.0': to(0), 'brick.1': to(1), 'brick.2': to(2) });
  return { w, h, px: new Uint8Array(tinted.px) };
}

// --- wall pieces -----------------------------------------------------------------------

const plaster = sprite('c');
const plasterShade = sprite('b');
const paleYellow = sprite('r');
const beam = sprite(`
  w
  v
  v
  u
`);
const post = sprite('wvvu');
// a string course between two storeys
const course = sprite(`
  c
  a
`);
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

// A louvred shutter, hung on each side of an upstairs window.
const shutter = sprite(`
  6666
  6776
  6776
  6666
  6776
  6776
  6666
  6776
  6776
  6776
  6666
`);

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
// The same door in plain varnished wood.
const woodDoor = recolor(door, { 'brick.0': 'wood.0', 'brick.1': 'wood.1', 'brick.2': 'wood.2' });

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

/** How far the roof overhangs the wall on each side. */
const OVERHANG = 3;
/** Height of a ground storey, plinth included, and of each storey above it. */
const GROUND = 32;
const UPPER = 26;
/** Rows the chimney stands clear above the ridge. */
const CHIMNEY_RISE = 6;

interface Built {
  day: Sprite;
  glow: Sprite;
}

// --- the cottage: one storey, timber frame, red gable roof -----------------------------

function buildCottage(): Built {
  const W = 80;
  const ROOF_H = 44;
  const top = CHIMNEY_RISE;
  const wallTop = top + ROOF_H - 2;
  const H = wallTop + GROUND + 1; // one more row for the ink base line
  const wallX = OVERHANG;
  const wallW = W - 2 * OVERHANG;
  const base = H - 1;
  const doorX = 32;
  const windowXs = [9, 56];
  const windowY = base - door.h + 1; // level with the top of the door

  const c = canvas(W, H);
  fill(c, plaster, wallX, wallTop, wallW, GROUND);
  fill(c, plasterShade, wallX, wallTop, wallW, 4);
  fill(c, beam, wallX, wallTop + 4, wallW, 4);
  fill(c, plinth, wallX, base - 4, wallW, 4);
  for (const x of [wallX, doorX - 6, doorX + 18, wallX + wallW - 4]) {
    fill(c, post, x, wallTop + 4, 4, base - 4 - (wallTop + 4));
  }
  for (const x of windowXs) {
    paste(c, windowDay, x, windowY);
    paste(c, flowerBox, x, windowY + 11);
  }
  paste(c, door, doorX, base - door.h);
  // ink outline of the wall: both sides and the base line
  fill(c, ink, wallX - 1, wallTop, 1, GROUND);
  fill(c, ink, wallX + wallW, wallTop, 1, GROUND);
  fill(c, ink, wallX, base, wallW, 1);

  paste(c, roof({ w: W, h: ROOF_H, hip: 0, ramp: 'brick' }), 0, top);
  paste(c, chimney, 57, 0);

  const g = canvas(W, H);
  for (const x of windowXs) paste(g, windowLit, x, windowY);
  return { day: done(c, [0, H]), glow: done(g, [0, H]) };
}

// --- the townhouse: two storeys, pale yellow plaster, blue hip roof --------------------

function buildTownhouse(): Built {
  const W = 64;
  const ROOF_H = 38;
  const top = CHIMNEY_RISE;
  const wallTop = top + ROOF_H - 2;
  const wallH = UPPER + GROUND;
  const H = wallTop + wallH + 1;
  const wallX = OVERHANG;
  const wallW = W - 2 * OVERHANG;
  const base = H - 1;
  const doorX = 9;
  const upperY = wallTop + 8;
  const groundY = base - door.h + 1;
  const windows: [number, number][] = [
    [9, upperY],
    [40, upperY],
    [40, groundY],
  ];

  const c = canvas(W, H);
  fill(c, paleYellow, wallX, wallTop, wallW, wallH);
  fill(c, plasterShade, wallX, wallTop, wallW, 4);
  fill(c, course, wallX, wallTop + UPPER - 2, wallW, 2);
  fill(c, plinth, wallX, base - 4, wallW, 4);
  for (const [x, y] of windows) paste(c, windowDay, x, y);
  for (const x of [9, 40]) {
    paste(c, shutter, x - 3, upperY);
    paste(c, shutter, x + 14, upperY);
  }
  paste(c, flowerBox, 40, groundY + 11);
  paste(c, woodDoor, doorX, base - door.h);
  fill(c, ink, wallX - 1, wallTop, 1, wallH);
  fill(c, ink, wallX + wallW, wallTop, 1, wallH);
  fill(c, ink, wallX, base, wallW, 1);

  paste(c, roof({ w: W, h: ROOF_H, hip: 8, ramp: 'sky', calm: true }), 0, top);
  paste(c, chimney, 40, 0);

  const g = canvas(W, H);
  for (const [x, y] of windows) paste(g, windowLit, x, y);
  return { day: done(c, [0, H]), glow: done(g, [0, H]) };
}

const cottage = buildCottage();
const townhouse = buildTownhouse();

export const buildings: Record<string, PropDef> = {
  house: {
    id: 'house',
    sprite: cottage.day,
    emissive: cottage.glow,
    footprint: { w: 5, h: 3 },
    lights: [
      { dx: 16, dy: -16, radius: 28, slot: 'ochre.2' },
      { dx: 63, dy: -16, radius: 28, slot: 'ochre.2' },
    ],
    places: { door: { dx: 2, dy: 1 } },
  },
  townhouse: {
    id: 'townhouse',
    sprite: townhouse.day,
    emissive: townhouse.glow,
    footprint: { w: 4, h: 3 },
    lights: [
      { dx: 47, dy: -16, radius: 28, slot: 'ochre.2' },
      { dx: 16, dy: -48, radius: 24, slot: 'ochre.2' },
      { dx: 47, dy: -48, radius: 24, slot: 'ochre.2' },
    ],
    places: { door: { dx: 1, dy: 1 } },
  },
};
