// More of the home: a double bed, an armchair and a sofa, an inner door for the back
// wall, a side table with a table lamp, and a chest of drawers.
import type { PropDef } from '../../core/types';
import { Canvas, glow, outlined, WOOD } from './draw';

// A double bed, head to the wall: a headboard, two pillows, a rose quilt over the foot.
function doubleBedArt(): string {
  const c = new Canvas(32, 40);
  c.rect(2, 1, 28, 1, 'w').rect(1, 2, 30, 4, 'v').rect(30, 2, 1, 4, 'u').rect(1, 6, 30, 1, 'u').rect(1, 7, 30, 1, '0');
  c.rect(1, 8, 1, 25, 'w').rect(30, 8, 1, 25, 'v');
  c.rect(2, 8, 28, 6, '5');
  for (const x of [3, 17]) c.rect(x, 8, 12, 3, 'c').rect(x, 11, 12, 1, 'b');
  c.rect(2, 13, 28, 1, '4');
  c.rect(2, 14, 28, 17, '*').rect(29, 14, 1, 17, '+').rect(2, 14, 28, 1, '5');
  // a quilted band across the middle, never a grid
  c.rect(2, 22, 27, 1, '+');
  c.rect(2, 31, 28, 2, '+');
  c.box(1, 33, 30, 1, 3, WOOD);
  c.rect(1, 37, 2, 2, 'v').rect(29, 37, 2, 2, 'u');
  return c.text();
}

/**
 * An upholstered seat facing the viewer, `w` pixels wide with `n` cushions: a rounded
 * back `tall` rows above the arms, two arms, cushions as top planes, a front face, stubby
 * legs. Brick red, lit from the upper left; ink lines part the arms and the back from the
 * cushions. A back that rises 4 rows above a seated head keeps an armchair visible under
 * its sitter.
 */
function upholstered(w: number, n: number, tall = 0): string {
  const c = new Canvas(w, 23 + tall);
  const t = tall;
  // the back
  c.rect(3, 1, w - 6, 1, 'z').rect(2, 2, w - 4, 8 + t, 'y').rect(2, 2, 1, 8 + t, 'z').rect(3, 2, w - 6, 1, 'z').rect(w - 3, 2, 1, 8 + t, 'x');
  c.rect(4, 10 + t, w - 8, 1, '0');
  // the arms
  c.rect(1, 8 + t, 3, 12, 'y').rect(1, 8 + t, 3, 2, 'z').rect(w - 4, 8 + t, 3, 12, 'y').rect(w - 4, 8 + t, 3, 2, 'z').rect(w - 2, 10 + t, 1, 10, 'x');
  c.rect(4, 11 + t, 1, 4, '0').rect(w - 5, 11 + t, 1, 4, '0');
  // the cushions
  const inner = w - 10;
  const cw = Math.floor(inner / n);
  for (let i = 0; i < n; i++) {
    const x = 5 + i * cw;
    c.rect(x, 11 + t, cw, 4, 'z').rect(x + cw - 1, 11 + t, 1, 4, i === n - 1 ? 'y' : '0');
  }
  // the front
  c.rect(1, 15 + t, w - 2, 5, 'y').rect(w - 2, 15 + t, 1, 5, 'x').rect(1, 19 + t, w - 2, 1, 'x').rect(1, 15 + t, w - 2, 1, 'z');
  c.rect(2, 20 + t, 2, 2, 'v').rect(w - 4, 20 + t, 2, 2, 'u');
  return c.text();
}

// An inner door in the back wall: a panelled wooden door in a light frame, a brass knob.
// It is a wall piece and only decoration: rooms are left by the doormat.
function innerDoorArt(): string {
  const c = new Canvas(16, 32);
  c.rect(1, 6, 14, 25, 'w').rect(14, 6, 1, 25, 'v');
  c.rect(3, 8, 10, 23, 'v').rect(12, 8, 1, 23, 'u');
  for (const y of [10, 21]) c.rect(4, y, 7, 8, 'u').rect(5, y + 1, 6, 7, 'w').rect(5, y + 1, 6, 6, 'v');
  c.px(11, 19, 'q').px(11, 20, 'p');
  return c.text();
}

// A side table with a drawer, and a table lamp with a cream shade on it.
function sideTableArt(): string {
  const c = new Canvas(16, 27);
  c.stamp(`
    ..cccccc..
    .c5ccccbb.
    .c5cccccb.
    cccccccbbb
    qqqqqqqqpp
    ....qp....
    ....qp....
    ...qqqpp..
  `, 3, 1);
  c.box(1, 9, 14, 5, 6, WOOD);
  c.rect(3, 15, 10, 3, 'u').rect(4, 16, 8, 1, 'w').px(8, 16, 'q');
  c.rect(2, 20, 2, 6, 'v').rect(2, 20, 1, 6, 'w').rect(12, 20, 2, 6, 'u').rect(12, 20, 1, 6, 'v');
  return c.text();
}
const tableLampGlow = { c: 'r', '5': 'r', b: 'q' };

// A chest of three drawers with a small potted fern on top.
function drawersArt(): string {
  const c = new Canvas(32, 32);
  c.stamp(`
    .h.jh.
    hjhhhg
    .hhgg.
    zzzzy.
    .zyyx.
  `, 22, 1);
  c.box(1, 6, 30, 5, 18, WOOD);
  for (const y of [12, 17, 22]) c.rect(3, y, 26, 4, 'u').rect(4, y + 1, 25, 3, 'v').rect(4, y + 3, 25, 1, 'w').rect(15, y + 1, 2, 1, 'q');
  c.rect(2, 29, 3, 2, 'v').rect(27, 29, 3, 2, 'u');
  return c.text();
}

/** The second round of home furniture. */
export const livingProps: Record<string, PropDef> = {
  'bed-double': { id: 'bed-double', sprite: outlined(doubleBedArt()), footprint: { w: 2, h: 2 }, places: { side: { dx: 2, dy: 0 } } },
  armchair: {
    id: 'armchair',
    sprite: outlined(upholstered(16, 1, 5)),
    footprint: { w: 1, h: 1 },
    seats: { seat: { x: 8, y: 0, dir: 'down' } },
  },
  sofa: {
    id: 'sofa',
    sprite: outlined(upholstered(32, 2, 2)),
    footprint: { w: 2, h: 1 },
    seats: { left: { x: 10, y: 0, dir: 'down' }, right: { x: 22, y: 0, dir: 'down' } },
  },
  'inner-door': { id: 'inner-door', sprite: outlined(innerDoorArt()), castHeight: 0 },
  'side-table': {
    id: 'side-table',
    sprite: outlined(sideTableArt()),
    emissive: glow(sideTableArt(), tableLampGlow),
    footprint: { w: 1, h: 1 },
    lights: [{ dx: 8, dy: -22, radius: 36, slot: 'ochre.2', flicker: 0.05 }],
  },
  'chest-of-drawers': { id: 'chest-of-drawers', sprite: outlined(drawersArt()), footprint: { w: 2, h: 1 }, places: { front: { dx: 0, dy: 1 } } },
};
