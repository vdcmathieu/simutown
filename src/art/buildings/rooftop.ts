/**
 * Things that stand on a roof: the chimney, a dormer with a round attic window, the
 * school's bell turret and the hall's clock turret. Turrets and dormers wear a small cap
 * in the roof's own colour, built by the same `roof` function as the big roofs.
 */
import { sprite, type Sprite } from '../../core/sprite';
import { canvas, done, glazed, INK, Layers, type Part, rect } from './canvas';
import { roof, type RoofColor, tint } from './roofs';
import { type LitLook, windowPart } from './windows';

/** A stone chimney with a dark cap, 12x14. It stands on the slope and clears the ridge by 6 pixels. */
export const chimney: Sprite = sprite(`
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
/** Rows a chimney stands clear above the ridge. */
export const CHIMNEY_RISE = 6;

/** A clock face, 13x13: three o'clock, forever. The face glows softly at dusk. */
export const clockFace: Part = glazed(
  `
  ....00000....
  ..00ccccc00..
  .0cccc1cccc0.
  .0cccc1cccc0.
  0ccccc1ccccc0
  0ccccc1ccccc0
  02cccc1111c20
  0ccccccccccc0
  0ccccccccccc0
  .0ccccccccc0.
  .0cccc2cccc0.
  ..00ccccc00..
  ....00000....
`,
  { c: 'r' },
);

/** A roof piece: its day and lit looks, and how many rows of it stand above the roof's top edge. */
export interface RoofPiece extends Part {
  /** Rows above the top of the roof that the piece needs. */
  rise: number;
  /** Rows of the piece that overlap the roof, counted down from the roof's top edge. */
  sink: number;
  /** Centre of its glass or bell, in pixels from the piece's top-left, for a light. */
  glowAt?: readonly [number, number];
}

function piece(l: Layers, sink: number, glowAt?: readonly [number, number]): RoofPiece {
  const lit = done(l.glow);
  return { day: done(l.day), lit: lit.px.some((v) => v !== 0) ? lit : undefined, rise: l.day.h - sink, sink, glowAt };
}

// The belfry: a small plastered box with an arched opening and a brass bell.
const belfry = sprite(`
  0cccccccccccccccb0
  0cccccccccccccccb0
  0cccc11111111cccb0
  0ccc1111qq1111ccb0
  0ccc111qrqq111ccb0
  0ccc111qrqq111ccb0
  0ccc11qrqqqp11ccb0
  0ccc11qrqqqp11ccb0
  0ccc1qrqqqqqp1ccb0
  0ccc1pppppppp1ccb0
  0ccc1111oo1111ccb0
  0cccccccccccccccb0
  000000000000000000
`);

/** The school's bell turret, 22x23. It stands on the ridge. */
export function bellTurret(color: RoofColor): RoofPiece {
  const cap = roof({ w: 22, h: 12, form: 'hip', color, lean: 4 });
  const l = new Layers(22, cap.h - 2 + belfry.h);
  l.put(belfry, 2, cap.h - 2);
  l.put(cap, 0, 0);
  return piece(l, 4);
}

// A brass ball: the top of the hall.
const finial = sprite(`
  .000.
  0rqq0
  0qqp0
  .000.
`);

/** The hall's clock turret, 31 wide: a plastered box with a clock face under a small hip roof. */
export function clockTurret(color: RoofColor): RoofPiece {
  const cap = roof({ w: 31, h: 14, form: 'hip', color, lean: 6 });
  const boxW = 25;
  const boxH = 23;
  const box = canvas(boxW, boxH);
  rect(box, INK, 0, 0, boxW, boxH);
  rect(box, 'cream.2', 1, 0, boxW - 2, boxH - 1);
  rect(box, 'cream.1', 1, 0, boxW - 2, 4);
  rect(box, 'cream.1', boxW - 3, 0, 2, boxH - 1);
  const capY = finial.h - 1;
  const boxY = capY + cap.h - 2;
  const l = new Layers(31, boxY + boxH);
  l.put(box, 3, boxY);
  l.put(clockFace, 9, boxY + 5);
  l.put(cap, 0, capY);
  l.put(finial, 13, 0);
  return piece(l, 7, [15, boxY + 11]);
}

// A dormer's own little roof, seen from the front: a lit lip, two rows of tile, a shade line.
const dormerCap = sprite(`
  .00000000000000000.
  0zzzzzzzzzzzzzzzzz0
  0zyyyyyyyyyyyyyyyx0
  0zyyyyyyyyyyyyyyyx0
  0xxxxxxxxxxxxxxxxx0
  .00000000000000000.
`);

/** A dormer with a round attic window, 19x19. It sits on the slope, just above the eave. */
export function dormer(color: RoofColor, lit: LitLook = 'warm'): RoofPiece {
  const cap = tint({ w: dormerCap.w, h: dormerCap.h, px: new Uint8Array(dormerCap.px) }, color);
  const boxW = 15;
  const boxH = 15;
  const box = canvas(boxW, boxH);
  rect(box, INK, 0, 0, boxW, boxH);
  rect(box, 'cream.2', 1, 0, boxW - 2, boxH - 1);
  rect(box, 'cream.1', 1, 0, boxW - 2, 3);
  const boxY = cap.h - 2;
  const l = new Layers(19, boxY + boxH);
  l.put(box, 2, boxY);
  l.put(windowPart('round', lit), 4, boxY + 2);
  l.put(cap, 0, 0);
  return piece(l, l.day.h, [9, boxY + 7]);
}
