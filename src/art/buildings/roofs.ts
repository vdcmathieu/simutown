/**
 * Roofs. Every roof shows its long slope to the viewer, with the ridge running left to
 * right: a ridge cap, courses of tiles from the approved roof face, and an eave whose
 * bottom rows cover the top 2 pixels of the wall.
 */
import { type Slot, slotIndex } from '../../core/palette';
import { recolor, sprite } from '../../core/sprite';
import { type Canvas, canvas, done, fill, INK, rect } from './canvas';
import { roofFace } from './roof-face';

/** Gable: straight sides with cream bargeboards. Hip: the sides lean in towards the ridge. */
export type RoofForm = 'gable' | 'hip';
/** The three roof colours STYLE.md allows. Red is the default of the town. */
export type RoofColor = 'red' | 'orange' | 'blue';

export const ROOF_FORMS: readonly RoofForm[] = ['gable', 'hip'];
export const ROOF_COLORS: readonly RoofColor[] = ['red', 'orange', 'blue'];

/** The palette ramp behind each roof colour. The art is drawn in `brick` and recoloured ramp for ramp. */
export const ROOF_RAMP: Record<RoofColor, 'brick' | 'ochre' | 'sky'> = { red: 'brick', orange: 'ochre', blue: 'sky' };

/** The roof face is this wide; a wider roof restarts it (see `join`). */
export const FACE_W = roofFace.w;
/** How far a hip roof leans in on each side between the eave and the ridge. */
export const HIP_LEAN = 8;
/** How far a roof overhangs the wall on each side. */
export const OVERHANG = 3;

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

export interface RoofSpec {
  /** Width in pixels, overhang included. */
  w: number;
  /** Height in pixels, ridge and eave included. At least 10. */
  h: number;
  form: RoofForm;
  color: RoofColor;
  /**
   * For a roof wider than the face (80 pixels): the column where the face starts again,
   * two courses further down so the join never lines up. Default 80. Stand a chimney, a
   * dormer or a turret on it.
   */
  join?: number;
  /** Hip roofs only: pixels each side leans in. Default 8; small turret caps use less. */
  lean?: number;
}

/** Recolour anything drawn in the red (brick) ramp into a roof colour. */
export function tint(c: Canvas, color: RoofColor): Canvas {
  const ramp = ROOF_RAMP[color];
  if (ramp === 'brick') return c;
  const to = (i: number) => `${ramp}.${i}` as Slot;
  const tinted = recolor(done(c), { 'brick.0': to(0), 'brick.1': to(1), 'brick.2': to(2) });
  return { w: c.w, h: c.h, px: new Uint8Array(tinted.px) };
}

/** Build a roof. The eave is its bottom 5 rows; the wall tucks 2 pixels under it. */
export function roof(spec: RoofSpec): Canvas {
  const { w, h } = spec;
  const hip = spec.form === 'hip' ? (spec.lean ?? HIP_LEAN) : 0;
  const join = w > FACE_W ? (spec.join ?? FACE_W) : w;
  const c = canvas(w, h);

  // The face, from its top-left corner; right of the join it starts again 10 rows down.
  const faceH = h - 10;
  fill(c, roofFace, 0, 5, join, faceH);
  fill(c, roofFace, join, 5, w - join, faceH, 0, 10);
  if (spec.color === 'blue') {
    // Blue roofs stay calm: lit lips on one course in three, or the roof sparkles like the pond.
    const lip = slotIndex('brick.2');
    const base = slotIndex('brick.1');
    for (let y = 5; y < h - 5; y++) {
      for (let x = 0; x < w; x++) {
        const course = Math.floor((y - 5 + (x >= join ? 10 : 0)) / 5);
        if (course % 3 !== 1 && c.px[y * w + x] === lip) c.px[y * w + x] = base;
      }
    }
  }
  fill(c, ridge, 0, 0, w, 5);
  for (let x = 6; x < w; x += 7) fill(c, ridgeJoint, x, 2, 1, 2);
  fill(c, eave, 0, h - 5, w, 5);

  // Sides. Light comes from the upper left, so the left edge is lit and the right one
  // shaded: cream bargeboards on a gable, a band of the roof's own tones on a hip.
  const litEdge: Slot = hip ? 'brick.2' : 'cream.2';
  const shadeEdge: Slot = hip ? 'brick.0' : 'cream.0';
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
      rect(c, INK, d, y, 1, 1);
      rect(c, INK, w - 1 - d, y, 1, 1);
    }
    if (y > 0 && y < h - 1) {
      rect(c, litEdge, i + 1, y, 2, 1);
      rect(c, shadeEdge, w - 3 - i, y, 2, 1);
    }
  }
  rect(c, INK, inset(0), 0, w - 2 * inset(0), 1);
  // round the four corners by one pixel
  for (const [x, y] of [[inset(0), 0], [w - 1 - inset(0), 0], [0, h - 1], [w - 1, h - 1]] as const) {
    c.px[y * w + x] = 0;
  }
  for (const [x, y] of [[inset(0) + 1, 1], [w - 2 - inset(0), 1], [1, h - 2], [w - 2, h - 2]] as const) {
    rect(c, INK, x, y, 1, 1);
  }
  return tint(c, spec.color);
}
