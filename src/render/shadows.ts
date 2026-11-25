/**
 * Pass 2, shadows. A shadow is the caster's own silhouette laid on the ground: every sprite
 * pixel `h` pixels above the base line lands on (x + h * kx, base + h * ky). The shear
 * (kx, ky) comes from the time of day, so shadows are short at noon and long at dusk.
 *
 * Shadows are collected in a mask and applied once, so overlapping shadows never darken
 * twice. Prop shadows are static per shear and cached for the whole town; actor shadows
 * are added per frame.
 */
import type { Sprite } from '../core/sprite';
import { TILE } from '../core/types';
import type { Drawable, StaticProp } from './sprites';
import type { View } from './view';

/**
 * Call `plot(wx, wy)` for every ground pixel under the sheared silhouette of sprite `s`
 * anchored at world (x, y). A pixel may be reported more than once. Rows higher than
 * `maxHeight` pixels above the base cast as if they were at `maxHeight`.
 */
export function projectSilhouette(s: Sprite, x: number, y: number, kx: number, ky: number, plot: (wx: number, wy: number) => void, maxHeight = Infinity): void {
  // tall shears skip rows unless each sprite row is laid down in several sub-steps
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(kx), Math.abs(ky))));
  const left = x - s.ax;
  const base = y - 1;
  for (let sy = 0; sy < s.h; sy++) {
    const height = Math.min(maxHeight, Math.max(0, s.ay - 1 - sy));
    for (let step = 0; step < steps; step++) {
      const h = height + step / steps;
      const dx = Math.round(h * kx);
      const wy = base + Math.round(h * ky);
      for (let sx = 0; sx < s.w; sx++) {
        if (s.px[sy * s.w + sx] !== 0) plot(left + sx + dx, wy);
      }
    }
  }
}

/**
 * How tall a prop stands, for casting. A building drawn in three-quarter view shows its roof
 * receding behind the front wall: the top of the sprite is depth, not height. One tile of
 * sprite is taken off for every tile of footprint depth beyond the first.
 */
export function castHeight(p: StaticProp): number {
  const depth = Math.max(1, p.def.footprint?.h ?? 1);
  return Math.max(TILE, p.def.sprite.ay - (depth - 1) * TILE);
}

/** The static shadow mask of every standing prop, town-sized, for one shear. */
export type TownShadows = (kx: number, ky: number) => Uint8Array;

/** How many shears to remember. A scene usually sits at one hour, or sweeps through a few. */
const CACHE_SIZE = 6;

/** Build the cached prop-shadow source for a town of `w` x `h` pixels. */
export function createTownShadows(w: number, h: number, props: StaticProp[]): TownShadows {
  const cache = new Map<string, Uint8Array>();
  return (kx, ky) => {
    const key = `${kx},${ky}`;
    let mask = cache.get(key);
    if (mask) return mask;
    mask = new Uint8Array(w * h);
    const m = mask;
    for (const p of props) {
      const plot = (wx: number, wy: number): void => {
        if (wx >= 0 && wy >= 0 && wx < w && wy < h) m[wy * w + wx] = 255;
      };
      projectSilhouette(p.def.sprite, p.x, p.y, kx, ky, plot, castHeight(p));
    }
    if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value!);
    cache.set(key, mask);
    return mask;
  };
}

/** Copy the part of a town-sized mask that the view sees into a view-sized mask; the rest is zeroed. */
export function copyTownMask(dst: Uint8Array, v: View, src: Uint8Array, w: number, h: number): void {
  dst.fill(0);
  const x0 = Math.max(0, v.x0);
  const y0 = Math.max(0, v.y0);
  const x1 = Math.min(w, v.x0 + v.w);
  const y1 = Math.min(h, v.y0 + v.h);
  if (x0 >= x1) return;
  for (let y = y0; y < y1; y++) {
    dst.set(src.subarray(y * w + x0, y * w + x1), (y - v.y0) * v.w + (x0 - v.x0));
  }
}

/** Add the actors' shadows to the view's shade mask. A fading actor casts a fading shadow. */
export function castActorShadows(v: View, list: Drawable[], kx: number, ky: number): void {
  for (const d of list) {
    if (!d.actor) continue;
    const strength = Math.round(d.alpha * 255);
    projectSilhouette(d.sprite, d.x, d.y, kx, ky, (wx, wy) => {
      const x = wx - v.x0;
      const y = wy - v.y0;
      if (x < 0 || y < 0 || x >= v.w || y >= v.h) return;
      const i = y * v.w + x;
      if (v.shade[i]! < strength) v.shade[i] = strength;
    });
  }
}
