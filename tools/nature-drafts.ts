/**
 * Lobe layouts for tools/nature-draft.ts: the first sketch of each leafy sprite.
 * The shipped sprites in src/art/nature were finished by hand from these.
 */
import type { Draft } from './nature-draft';

const willowTrunk = `
  ..uuuuuu....
  ..uuuuuu....
  ..vuuuuu....
  ..vvuuuu....
  ..wvvuuu....
  ..wvvuuu....
  ..wwvvuu....
  ..wwvvuu....
  ..wwvvuuu...
  ...wwvvuu...
  ...wwvvuu...
  ...wwvvuu...
  ...wwvvuu...
  ..wwvvvuu...
  ..wwvvuuu...
  ..wwvvuuu...
  ..wwvvuuu...
  ..wwvvuuu...
  .wwwvvuuu...
  .wwwvvuuuu..
  wwwvvvuuuu..
  wwvvvvvuuuu.
`;

const oakTrunk = `
  .uuuuuuuu.
  .uuuuuuuu.
  .vuuuuuuu.
  .vvuuuuuu.
  .wvvvuuuu.
  .wwvvvuuu.
  .wwvvvuuu.
  .wwvvvuuu.
  .wwvvvuuu.
  .wwvvvuuu.
  .wwvvvuuu.
  wwwvvvuuu.
  wwwvvvvuuu
  wwvvvvvuuu
`;

const fruitTrunk = `
  .uuuuu.
  .uuuuu.
  .vuuuu.
  .wvvuu.
  .wvvuu.
  .wvvuu.
  .wvvuu.
  .wvvuu.
  .wwvvu.
  wwwvvuu
  wwvvvuu
`;

const pineTrunk = `
  .uuuu.
  .vuuu.
  .wvuu.
  .wvuu.
  .wvuu.
  wwvvuu
  wwvvuu
`;

const saplingTrunk = `
  .uu.
  .uu.
  .vu.
  .vu.
  .wu.
  .wu.
  .wu.
  .wu.
  .wu.
  .wu.
  .wu.
  .wu.
  .wvu
  wwvu
`;

export const drafts: Record<string, Draft> = {
  willow: {
    w: 48,
    h: 56,
    shade: { down: 2, right: 1 },
    under: { art: willowTrunk, x: 18, y: 33 },
    lobes: [
      { kind: 'ellipse', cx: 18, cy: 10, rx: 11, ry: 9 },
      { kind: 'ellipse', cx: 32.5, cy: 12.5, rx: 9.5, ry: 7.5 },
      { kind: 'ellipse', cx: 8, cy: 18, rx: 7, ry: 6.5 },
      { kind: 'ellipse', cx: 40, cy: 19, rx: 6.5, ry: 6 },
      { kind: 'tier', cx: 5.5, y0: 18, y1: 41, top: 3, bottom: 2.2, lean: 1 },
      { kind: 'tier', cx: 12.5, y0: 16, y1: 48, top: 3.2, bottom: 2.4 },
      { kind: 'tier', cx: 20, y0: 16, y1: 37, top: 3.2, bottom: 2.4 },
      { kind: 'tier', cx: 28.5, y0: 16, y1: 40, top: 3.2, bottom: 2.4 },
      { kind: 'tier', cx: 35.5, y0: 16, y1: 49, top: 3.2, bottom: 2.4 },
      { kind: 'tier', cx: 42.5, y0: 18, y1: 42, top: 3, bottom: 2.2, lean: -1 },
      { kind: 'tier', cx: 9, y0: 16, y1: 37, top: 3, bottom: 2.2, dark: true },
      { kind: 'tier', cx: 16.5, y0: 16, y1: 42, top: 3, bottom: 2.2, dark: true },
      { kind: 'tier', cx: 24.5, y0: 16, y1: 32, top: 3, bottom: 2.2, dark: true },
      { kind: 'tier', cx: 32, y0: 16, y1: 44, top: 3, bottom: 2.2, dark: true },
      { kind: 'tier', cx: 39, y0: 16, y1: 38, top: 3, bottom: 2.2, dark: true },
      { kind: 'ellipse', cx: 24, cy: 16, rx: 21, ry: 10 },
    ],
  },
  oak: {
    w: 48,
    h: 46,
    under: { art: oakTrunk, x: 19, y: 31 },
    lobes: [
      { kind: 'ellipse', cx: 19, cy: 11, rx: 11, ry: 9.5 },
      { kind: 'ellipse', cx: 33, cy: 12, rx: 9, ry: 8 },
      { kind: 'ellipse', cx: 8.5, cy: 20, rx: 7.5, ry: 7 },
      { kind: 'ellipse', cx: 40, cy: 20.5, rx: 7, ry: 7 },
      { kind: 'ellipse', cx: 25, cy: 25.5, rx: 13, ry: 6.5 },
      { kind: 'ellipse', cx: 24, cy: 18, rx: 16, ry: 9, dark: true },
    ],
  },
  'fruit-tree': {
    w: 32,
    h: 32,
    under: { art: fruitTrunk, x: 12, y: 20 },
    lobes: [
      { kind: 'ellipse', cx: 13, cy: 9, rx: 8.5, ry: 7.5 },
      { kind: 'ellipse', cx: 21.5, cy: 13.5, rx: 8, ry: 7 },
      { kind: 'ellipse', cx: 9, cy: 16.5, rx: 7.5, ry: 6.5 },
      { kind: 'ellipse', cx: 15, cy: 16, rx: 6, ry: 5, dark: true },
    ],
  },
  pine: {
    w: 24,
    h: 42,
    shade: { down: 3, right: 2 },
    under: { art: pineTrunk, x: 9, y: 34 },
    lobes: [
      { kind: 'tier', cx: 12, y0: 1, y1: 11, top: 0.8, bottom: 5.5 },
      { kind: 'tier', cx: 11.5, y0: 7, y1: 20, top: 2.5, bottom: 8 },
      { kind: 'tier', cx: 12.5, y0: 15, y1: 29, top: 4, bottom: 10 },
      { kind: 'tier', cx: 12, y0: 24, y1: 36, top: 5, bottom: 11 },
    ],
  },
  sapling: {
    w: 16,
    h: 26,
    under: { art: saplingTrunk, x: 6, y: 11 },
    lobes: [
      { kind: 'ellipse', cx: 7, cy: 6.5, rx: 5.2, ry: 5 },
      { kind: 'ellipse', cx: 10.5, cy: 10, rx: 4, ry: 3.5 },
    ],
  },
  bush: {
    w: 16,
    h: 15,
    shade: { down: 3, right: 2 },
    lobes: [
      { kind: 'ellipse', cx: 6.5, cy: 6.5, rx: 5.5, ry: 5 },
      { kind: 'ellipse', cx: 11, cy: 9, rx: 4, ry: 4.5 },
      { kind: 'box', x: 2, y: 8, w: 12, h: 6, r: 2.5 },
    ],
  },
  'bush-large': {
    w: 32,
    h: 21,
    shade: { down: 3, right: 2 },
    lobes: [
      { kind: 'ellipse', cx: 12, cy: 8, rx: 8.5, ry: 7 },
      { kind: 'ellipse', cx: 23, cy: 10.5, rx: 7.5, ry: 6.5 },
      { kind: 'ellipse', cx: 6, cy: 13, rx: 5, ry: 5.5 },
      { kind: 'box', x: 3, y: 12, w: 26, h: 8, r: 3 },
    ],
  },
};
