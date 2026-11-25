/**
 * Pass 4, light: one walk over the view that applies the time-of-day grade, the sun or moon
 * shadow, and the lamp glow.
 *
 * For every pixel:
 *   1. grade the art's colour for the hour (nothing at all in plain daylight);
 *   2. on the ground, blend toward the shadow colour where the shade mask says so;
 *   3. where lamp light reaches, blend back toward the art's own colour seen under warm
 *      light. That is why a lamp at night reveals the true colours around it while the
 *      rest of the frame stays blue.
 *
 * Glow on the ground and on props falls off in dithered bands so it reads as pixel art.
 * Actors get one flat light value each instead: a face is never dithered.
 */
import type { Condition } from './conditions';
import { BAYER4 } from './hash';
import type { View } from './view';

/** Number of brightness bands in a glow. */
const LEVELS = 5;
/** Share of each band that is a dithered transition into the next; the rest is flat. */
const DITHER = 0.6;
/** How strongly a light's colour tints what it lights (0 = white light). */
const TINT = 0.55;
/** Brightness of lit surfaces relative to daylight. */
const GAIN = 1.08;
/** A little of the light's own colour added on top, strongest near the source. */
const BLOOM = 34;
/** Blend toward the lit colour at full glow. */
const REACH = 0.92;
/** Share of a light's pool that a caster's shadow removes. */
const OCCLUSION = 0.9;

/**
 * Per-drawable flat light, four floats per owner id: r, g, b and a flag (non-zero means
 * "use this instead of the dithered glow"). Index 0, the ground, is never flat.
 */
export type FlatLight = Float32Array;

/**
 * Grade and light the view in place. `mapW` x `mapH` is the town in pixels: ground pixels
 * outside it are left untouched, so the void around the map stays `steel.0`.
 * Pass `flat` only when the lamps are lit and the view's glow buffer has been filled.
 */
export function gradePass(v: View, c: Condition, mapW: number, mapH: number, flat: FlatLight | undefined): void {
  const { color: d, owner, shade, occlusion, glow, w, h } = v;
  const [mr, mg, mb] = c.mul;
  const [lr, lg, lb] = c.lift;
  const [sr, sg, sb] = c.shadowRgb;
  const sat = c.sat;
  const identity = c.identity;
  const shadowA = c.shadowAlpha / 255;
  const shadows = shadowA > 0;
  if (identity && !shadows && !flat) return;
  for (let y = 0; y < h; y++) {
    const wy = v.y0 + y;
    const rowInMap = wy >= 0 && wy < mapH;
    const bayerRow = (wy & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = owner[i]!;
      const wx = v.x0 + x;
      if (o === 0 && !(rowInMap && wx >= 0 && wx < mapW)) continue;
      const p = i * 4;
      const ar = d[p]!;
      const ag = d[p + 1]!;
      const ab = d[p + 2]!;
      let r = ar;
      let g = ag;
      let b = ab;
      if (!identity) {
        const lum = (ar * 77 + ag * 150 + ab * 29) >> 8;
        r = (lum + (ar - lum) * sat) * mr + lr;
        g = (lum + (ag - lum) * sat) * mg + lg;
        b = (lum + (ab - lum) * sat) * mb + lb;
      }
      if (shadows && o === 0) {
        const s = shade[i]!;
        if (s !== 0) {
          const a = s * shadowA;
          r += (sr - r) * a;
          g += (sg - g) * a;
          b += (sb - b) * a;
        }
      }
      if (flat) {
        let kr: number;
        let kg: number;
        let kb: number;
        let k: number;
        let weight: number;
        if (o !== 0 && flat[o * 4 + 3] !== 0) {
          kr = flat[o * 4]!;
          kg = flat[o * 4 + 1]!;
          kb = flat[o * 4 + 2]!;
          k = kr > kg ? (kr > kb ? kr : kb) : kg > kb ? kg : kb;
          weight = k > 1 ? 1 : k;
        } else {
          kr = glow[i * 3]!;
          kg = glow[i * 3 + 1]!;
          kb = glow[i * 3 + 2]!;
          k = kr > kg ? (kr > kb ? kr : kb) : kg > kb ? kg : kb;
          weight = 0;
          if (k > 0.01) {
            let lit = k;
            if (o === 0 && occlusion[i] !== 0) lit = Math.max(0, k - occlusion[i]! * (OCCLUSION / 255));
            const scaled = (lit > 1 ? 1 : lit) * LEVELS;
            let level = Math.floor(scaled);
            // flat bands with a dithered seam: only the middle of each step is mixed
            if ((scaled - level - 0.5) / DITHER + 0.5 > (BAYER4[bayerRow | (wx & 3)]! + 0.5) / 16) level++;
            weight = level / LEVELS;
          }
        }
        if (weight > 0) {
          const inv = 1 / k;
          const tr = kr * inv;
          const tg = kg * inv;
          const tb = kb * inv;
          const bloom = BLOOM * weight;
          // the art's colour under this light; light only ever adds, so never go below the grade
          const litR = ar * (1 - TINT + TINT * tr) * GAIN + tr * bloom;
          const litG = ag * (1 - TINT + TINT * tg) * GAIN + tg * bloom;
          const litB = ab * (1 - TINT + TINT * tb) * GAIN + tb * bloom;
          const a = weight * REACH;
          if (litR > r) r += (litR - r) * a;
          if (litG > g) g += (litG - g) * a;
          if (litB > b) b += (litB - b) * a;
        }
      }
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
    }
  }
}
