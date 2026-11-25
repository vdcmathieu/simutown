/**
 * The View: the slice of the world the camera sees, at native (unzoomed) resolution.
 * Every world-space pass draws into it; `present` then upscales it onto the frame.
 */
import type { Lut } from '../core/palette';
import type { Sprite } from '../core/sprite';

export interface View {
  /** World pixel of the view's top-left corner. */
  x0: number;
  y0: number;
  w: number;
  h: number;
  /** RGBA, always opaque. */
  color: Uint8ClampedArray;
  /** The same pixels as `color`, one 32-bit word each, for fast copies. */
  color32: Uint32Array;
  /** Who drew each pixel: 0 = ground, n = the n-th drawable of the frame (1-based). */
  owner: Uint16Array;
  /** Sun or moon shadow strength per pixel, 0..255. */
  shade: Uint8Array;
  /** Lamp light blocked by a caster per pixel, 0..255 (share of a full glow). */
  occlusion: Uint8Array;
  /** Accumulated lamp light per pixel as RGB triples, each roughly 0..1. */
  glow: Float32Array;
}

/** Allocate a view of the given size. Buffers are reused from frame to frame. */
export function createView(w: number, h: number): View {
  const color = new Uint8ClampedArray(w * h * 4);
  return {
    x0: 0,
    y0: 0,
    w,
    h,
    color,
    color32: new Uint32Array(color.buffer),
    owner: new Uint16Array(w * h),
    shade: new Uint8Array(w * h),
    occlusion: new Uint8Array(w * h),
    glow: new Float32Array(w * h * 3),
  };
}

/**
 * Draw a sprite with its anchor on world pixel (wx, wy), clipped to the view.
 * `alpha` is 0..1. When `id` is non-zero, pixels drawn at half opacity or more are claimed
 * in the owner buffer, which later passes use for occlusion, lighting and focus.
 */
export function blitSprite(v: View, s: Sprite, wx: number, wy: number, lut: Lut, alpha = 1, id = 0): void {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 256);
  if (a === 0) return;
  const left = wx - s.ax - v.x0;
  const top = wy - s.ay - v.y0;
  const sx0 = Math.max(0, -left);
  const sy0 = Math.max(0, -top);
  const sx1 = Math.min(s.w, v.w - left);
  const sy1 = Math.min(s.h, v.h - top);
  if (sx0 >= sx1 || sy0 >= sy1) return;
  const claim = id !== 0 && a >= 128;
  const d = v.color;
  for (let sy = sy0; sy < sy1; sy++) {
    let si = sy * s.w + sx0;
    let pi = (top + sy) * v.w + left + sx0;
    for (let sx = sx0; sx < sx1; sx++, si++, pi++) {
      const p = s.px[si]!;
      if (p === 0) continue;
      const lo = p * 4;
      const o = pi * 4;
      if (a === 256) {
        d[o] = lut[lo]!;
        d[o + 1] = lut[lo + 1]!;
        d[o + 2] = lut[lo + 2]!;
      } else {
        d[o] = d[o]! + (((lut[lo]! - d[o]!) * a) >> 8);
        d[o + 1] = d[o + 1]! + (((lut[lo + 1]! - d[o + 1]!) * a) >> 8);
        d[o + 2] = d[o + 2]! + (((lut[lo + 2]! - d[o + 2]!) * a) >> 8);
      }
      if (claim) v.owner[pi] = id;
    }
  }
}

/** Blend one world pixel toward a colour, if it is inside the view. `a` is 0..1. */
export function plotWorld(v: View, wx: number, wy: number, r: number, g: number, b: number, a = 1): void {
  const x = wx - v.x0;
  const y = wy - v.y0;
  if (x < 0 || y < 0 || x >= v.w || y >= v.h) return;
  const o = (y * v.w + x) * 4;
  const d = v.color;
  d[o] = Math.round(d[o]! + (r - d[o]!) * a);
  d[o + 1] = Math.round(d[o + 1]! + (g - d[o + 1]!) * a);
  d[o + 2] = Math.round(d[o + 2]! + (b - d[o + 2]!) * a);
}
