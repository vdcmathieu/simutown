/**
 * Pass 2, shadows. Two kinds share one mask, so they never darken a pixel twice:
 *
 * - The contact shadow grounds a thing at any hour: a small flat ellipse under a person or
 *   a prop, a thin strip along the base of a building. Its size comes from the sprite's
 *   silhouette. At midday it is the only shadow, as in the style key.
 * - The cast shadow is the silhouette laid on the ground: every sprite pixel `h` pixels
 *   above the base line lands on (x + h * kx, base + h * ky). The shear (kx, ky) comes from
 *   the time of day: nothing at noon, long and sideways at golden hour.
 *
 * Prop shadows are static per condition and cached for the whole town; actor shadows are
 * added per frame.
 */
import type { Sprite } from '../core/sprite';
import { CHAR_W, TILE } from '../core/types';
import type { Drawable, StaticProp } from './sprites';
import type { View } from './view';

type Plot = (wx: number, wy: number) => void;

/** Contact ellipse under a person, in pixels: the style key's 11x5 blob. */
const ACTOR_RX = Math.round(CHAR_W * 0.3);
const ACTOR_RY = 2;
/** A prop's ellipse is at least this share of its widest row: a tree's follows its crown, not its trunk. */
const CROWN_SHARE = 0.34;
/** Height of the strip under a building, in pixels. */
const STRIP = 2;

/**
 * Call `plot(wx, wy)` for every ground pixel under the sheared silhouette of sprite `s`
 * anchored at world (x, y). A pixel may be reported more than once. Rows higher than
 * `maxHeight` pixels above the base cast as if they were at `maxHeight`.
 */
export function projectSilhouette(s: Sprite, x: number, y: number, kx: number, ky: number, plot: Plot, maxHeight = Infinity): void {
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

/** Call `plot` for every pixel of a flat ellipse, the same shape the style key draws. */
export function plotEllipse(cx: number, cy: number, rx: number, ry: number, plot: Plot): void {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / ((rx + 0.5) * (rx + 0.5)) + (y * y) / ((ry + 0.5) * (ry + 0.5)) <= 1) plot(cx + x, cy + y);
    }
  }
}

/**
 * How tall a prop stands, for casting: its `castHeight` when the art gives one, else a
 * guess. A building drawn in three-quarter view shows its roof receding behind the front
 * wall, so the top of the sprite is depth, not height: the guess takes one tile off for
 * every tile of footprint depth beyond the first. 0 means the prop casts no shadow at all.
 */
export function castHeight(p: StaticProp): number {
  if (p.def.castHeight !== undefined) return Math.max(0, p.def.castHeight);
  const depth = Math.max(1, p.def.footprint?.h ?? 1);
  return Math.max(TILE, p.def.sprite.ay - (depth - 1) * TILE);
}

/** The widest row of a sprite, and the left and right ends of its lowest rows, in sprite pixels. */
function footing(s: Sprite): { widest: number; left: number; right: number } {
  let widest = 0;
  let left = s.w;
  let right = -1;
  let rowsSeen = 0;
  for (let sy = s.h - 1; sy >= 0; sy--) {
    let a = s.w;
    let b = -1;
    for (let sx = 0; sx < s.w; sx++) {
      if (s.px[sy * s.w + sx] === 0) continue;
      if (sx < a) a = sx;
      b = sx;
    }
    if (b < 0) continue;
    widest = Math.max(widest, b - a + 1);
    if (rowsSeen++ < 3) {
      left = Math.min(left, a);
      right = Math.max(right, b);
    }
  }
  return { widest, left, right };
}

/** The contact shadow of a standing prop: a strip for anything more than a tile deep, else an ellipse. */
export function plotPropContact(p: StaticProp, plot: Plot): void {
  const s = p.def.sprite;
  const { widest, left, right } = footing(s);
  if (right < left) return;
  const x0 = p.x - s.ax;
  if ((p.def.footprint?.h ?? 1) >= 2) {
    // lit from the upper left: the strip starts a little in from the left corner
    for (let j = 0; j < STRIP; j++) for (let wx = x0 + left + 2; wx <= x0 + right; wx++) plot(wx, p.y + j);
    return;
  }
  const rx = Math.max(Math.ceil((right - left + 1) / 2) + 1, Math.round(widest * CROWN_SHARE));
  const ry = rx >= 8 && s.h >= 2 * TILE ? 3 : 2;
  plotEllipse(x0 + Math.round((left + right + 1) / 2), p.y - ry + 1, rx, ry, plot);
}

/** The static shadow mask of every standing prop, town-sized, for one shear and cast strength. */
export type TownShadows = (kx: number, ky: number, cast: number) => Uint8Array;

/** How many conditions to remember. A scene usually sits at one hour, or sweeps through a few. */
const CACHE_SIZE = 6;

/** Build the cached prop-shadow source for a town of `w` x `h` pixels. */
export function createTownShadows(w: number, h: number, props: StaticProp[]): TownShadows {
  const cache = new Map<string, Uint8Array>();
  return (kx, ky, cast) => {
    const key = `${kx},${ky},${cast}`;
    let mask = cache.get(key);
    if (mask) return mask;
    mask = new Uint8Array(w * h);
    const m = mask;
    const put = (value: number): Plot => (wx, wy) => {
      if (wx < 0 || wy < 0 || wx >= w || wy >= h) return;
      const i = wy * w + wx;
      if (m[i]! < value) m[i] = value;
    };
    const castValue = Math.round(cast * 255);
    const casting = castValue > 0 && (kx !== 0 || ky !== 0);
    for (const p of props) {
      const height = castHeight(p);
      if (height === 0) continue;
      plotPropContact(p, put(255));
      if (casting) projectSilhouette(p.def.sprite, p.x, p.y, kx, ky, put(castValue), height);
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

/** Add the actors' contact and cast shadows to the view's shade mask. A fading actor casts a fading shadow. */
export function castActorShadows(v: View, list: Drawable[], kx: number, ky: number, cast: number): void {
  const put = (value: number): Plot => (wx, wy) => {
    const x = wx - v.x0;
    const y = wy - v.y0;
    if (x < 0 || y < 0 || x >= v.w || y >= v.h) return;
    const i = y * v.w + x;
    if (v.shade[i]! < value) v.shade[i] = value;
  };
  const casting = cast > 0 && (kx !== 0 || ky !== 0);
  for (const d of list) {
    if (!d.actor) continue;
    plotEllipse(d.x, d.y - 1, ACTOR_RX, ACTOR_RY, put(Math.round(d.alpha * 255)));
    if (casting) projectSilhouette(d.sprite, d.x, d.y, kx, ky, put(Math.round(d.alpha * cast * 255)));
  }
}
