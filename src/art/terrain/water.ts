import { sprite } from '../../core/sprite';
import type { Sprite } from '../../core/sprite';
import type { Anim } from '../../core/types';

// ---------------------------------------------------------------------------------------
// Water: flat sky.1. Each variant carries one or two ripples of different lengths, on rows
// and columns that no other variant uses, so a mixed pond shows no 16-pixel grid. Ripples
// keep 2 pixels clear of the tile's sides: the shimmer slides them sideways and back.
// ---------------------------------------------------------------------------------------

const waterA = sprite(`
  9999999999999999
  9999999999999999
  9999999999999999
  999ffff999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  999999999ff99999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
`);

const waterB = sprite(`
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  999999fffff99999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
`);

const waterC = sprite(`
  9999999999999999
  999999999fff9999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  99fff99999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
`);

const waterD = sprite(`
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  9999999999999999
  99999fff59999999
  9999999999999999
  9999999999999999
`);

export const waterLooks: Sprite[] = [waterA, waterB, waterC, waterD];

/** The same tile with every pixel moved `dx` to the right, wrapping at the sides. */
function drift(s: Sprite, dx: number): Sprite {
  const px = new Uint8Array(s.px.length);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[y * s.w + ((x + dx) % s.w)] = s.px[y * s.w + x]!;
  return { ...s, px };
}

// A slow, gentle shimmer: each ripple slides 2 pixels to the right and back, 2 frames a
// second. The renderer starts every tile at its own phase, so the pond never pulses.
export const waterShimmer: Anim[] = waterLooks.map((s) => ({ frames: [s, drift(s, 1), drift(s, 2), drift(s, 1)], fps: 2 }));
