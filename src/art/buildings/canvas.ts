/**
 * A tiny mutable canvas for assembling buildings out of parts, and the Part type itself.
 *
 * A Part is a piece of a building with a day look and, when it has glass, a lit look of
 * the same size that holds only the glowing pixels. `Layers` keeps the two in step while a
 * building is put together: whatever is pasted on top of a window also covers its glow.
 */
import { type Slot, slotIndex } from '../../core/palette';
import { sprite, type Sprite } from '../../core/sprite';

/** A grid of palette indices that can still be drawn on. */
export interface Canvas {
  w: number;
  h: number;
  px: Uint8Array;
}

/** A piece of a building: how it looks by day, and which of its pixels glow at dusk. */
export interface Part {
  day: Sprite;
  /** Same size as `day`. Only the glass, relit; everything else is transparent. */
  lit?: Sprite;
}

/** An empty canvas. */
export const canvas = (w: number, h: number): Canvas => ({ w, h, px: new Uint8Array(w * h) });

/** Copy a piece onto the canvas with its top-left corner at (x, y). Clipped at the edges. */
export function paste(c: Canvas, s: Sprite | Canvas, x: number, y: number): void {
  for (let sy = 0; sy < s.h; sy++) {
    for (let sx = 0; sx < s.w; sx++) {
      const v = s.px[sy * s.w + sx]!;
      const cx = x + sx;
      const cy = y + sy;
      if (v !== 0 && cx >= 0 && cy >= 0 && cx < c.w && cy < c.h) c.px[cy * c.w + cx] = v;
    }
  }
}

/** Clear every canvas pixel that lies under an opaque pixel of the piece. */
export function erase(c: Canvas, s: Sprite | Canvas, x: number, y: number): void {
  for (let sy = 0; sy < s.h; sy++) {
    for (let sx = 0; sx < s.w; sx++) {
      const cx = x + sx;
      const cy = y + sy;
      if (s.px[sy * s.w + sx] !== 0 && cx >= 0 && cy >= 0 && cx < c.w && cy < c.h) c.px[cy * c.w + cx] = 0;
    }
  }
}

/**
 * Fill a rectangle by repeating a pattern piece. The pattern starts at the rectangle's
 * top-left corner, shifted by (ox, oy) pixels into the pattern. Clipped at the edges.
 */
export function fill(c: Canvas, s: Sprite, x: number, y: number, w: number, h: number, ox = 0, oy = 0): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const cx = x + dx;
      const cy = y + dy;
      if (cx < 0 || cy < 0 || cx >= c.w || cy >= c.h) continue;
      const v = s.px[((dy + oy) % s.h) * s.w + ((dx + ox) % s.w)]!;
      if (v !== 0) c.px[cy * c.w + cx] = v;
    }
  }
}

/** Fill a rectangle with one palette slot. */
export function rect(c: Canvas, slot: Slot, x: number, y: number, w: number, h: number): void {
  const v = slotIndex(slot);
  for (let cy = Math.max(0, y); cy < Math.min(c.h, y + h); cy++) {
    for (let cx = Math.max(0, x); cx < Math.min(c.w, x + w); cx++) c.px[cy * c.w + cx] = v;
  }
}

/** Freeze a canvas into a sprite. */
export const done = (c: Canvas, anchor: readonly [number, number] = [0, 0]): Sprite => ({
  w: c.w,
  h: c.h,
  px: c.px,
  ax: anchor[0],
  ay: anchor[1],
});

/** The single ink pixel, for outlines. */
export const INK: Slot = 'steel.0';

/**
 * Derive a part's lit look from its day art: every character in `glass` becomes the slot
 * letter it maps to, and everything else becomes transparent. So frames and bars stay out
 * of the glow and read dark against it.
 */
export function litFrom(art: string, glass: Record<string, string>): Sprite {
  return sprite(art.replace(/\S/g, (ch) => glass[ch] ?? '.'));
}

/** The usual relighting: glass and its shadow turn to lamplight, the glint to its pale core. */
export const WARM: Record<string, string> = { '8': 'q', '9': 'q', f: 'r' };

/** A part with glass, from one text grid. */
export function glazed(art: string, glass: Record<string, string> = WARM): Part {
  return { day: sprite(art), lit: litFrom(art, glass) };
}

/**
 * The day and glow canvases of a building under construction. `put` pastes a part on the
 * day canvas and makes the glow follow: pixels the part covers stop glowing, and the
 * part's own lit pixels start to.
 */
export class Layers {
  readonly day: Canvas;
  readonly glow: Canvas;

  constructor(w: number, h: number) {
    this.day = canvas(w, h);
    this.glow = canvas(w, h);
  }

  /** Paste a part (or a plain sprite or canvas) at (x, y). `lit: false` leaves its glass dark. */
  put(part: Part | Sprite | Canvas, x: number, y: number, lit = true): void {
    const p: Part = 'day' in part ? part : { day: done(part as Canvas) };
    paste(this.day, p.day, x, y);
    erase(this.glow, p.day, x, y);
    if (lit && p.lit) paste(this.glow, p.lit, x, y);
  }
}
