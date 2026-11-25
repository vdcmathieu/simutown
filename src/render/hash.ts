/**
 * Deterministic pseudo-randomness. Nothing in the renderer may call Math.random():
 * every "random" choice is a hash of where and when it happens.
 */

/** A well-mixed unsigned 32-bit hash of two integers and an optional seed. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)) | 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** The same hash as a float in [0, 1). */
export function hash01(x: number, y: number, seed = 0): number {
  return hash2(x, y, seed) / 4294967296;
}

/** The classic 4x4 ordered-dither matrix, values 0..15, row-major. */
export const BAYER4 = new Uint8Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]);

/**
 * Ordered-dither threshold in (0, 1) for a pixel. Pass world coordinates, so the pattern
 * is glued to the ground and does not swim when the camera moves.
 */
export function bayer(x: number, y: number): number {
  return (BAYER4[((y & 3) << 2) | (x & 3)]! + 0.5) / 16;
}
