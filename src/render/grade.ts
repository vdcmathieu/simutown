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

/** Share of each band that is a dithered transition into the next; the rest is flat. */
const DITHER = 0.6;
/** How strongly a light's colour tints what it lights (0 = white light). */
const TINT = 0.7;
/** Saturation of lit surfaces: lamplight washes colours out a little, so lit grass turns gold, not lime. */
const LIT_SAT = 0.6;
/** A little of the light's own colour added on top, strongest near the source. */
const BLOOM = 56;
/**
 * Blend toward the lit colour for each band, from none to the hottest. The first step is
 * the biggest, so the rim of a pool is a clear edge and not a haze.
 */
const BAND_WEIGHT = [0, 0.26, 0.46, 0.64, 0.8, 0.94];
/** Number of brightness bands in a glow. */
const LEVELS = BAND_WEIGHT.length - 1;
/** Share of a light's pool that a caster's shadow removes. */
const OCCLUSION = 0.9;

/** The band weights read as a smooth curve, for flat-lit actors. `scaled` is 0..LEVELS. */
function bandWeight(scaled: number): number {
  const level = Math.min(LEVELS - 1, Math.floor(scaled));
  return BAND_WEIGHT[level]! + (BAND_WEIGHT[level + 1]! - BAND_WEIGHT[level]!) * (scaled - level);
}

/**
 * The lamp light on each person, three floats per owner id: r, g, b. People take this one
 * flat value instead of the dithered glow.
 */
export type FlatLight = Float32Array;

/**
 * Grade and light the view in place. `mapW` x `mapH` is the town in pixels: ground pixels
 * outside it are left untouched, so the void around the map stays `steel.0`.
 * `people[id]` is 1 for owner ids that are actors: they get the gentler grade and flat light.
 * Pass `flat` only when the lamps are lit and the view's glow buffer has been filled.
 */
export function gradePass(v: View, c: Condition, mapW: number, mapH: number, people: Uint8Array, flat: FlatLight | undefined): void {
  const { color: d, owner, shade, occlusion, glow, w, h } = v;
  const [mr, mg, mb] = c.mul;
  const [lr, lg, lb] = c.lift;
  const [pmr, pmg, pmb] = c.actor.mul;
  const [plr, plg, plb] = c.actor.lift;
  const [sr, sg, sb] = c.shadowRgb;
  const sat = c.sat;
  const psat = c.actor.sat;
  const identity = c.identity;
  const shadowA = c.shadowAlpha / 255;
  const shadows = shadowA > 0;
  if (identity && !shadows && !flat) return;
  // in plain daylight only shadowed pixels change: skip the rest quickly
  const shadeOnly = identity && !flat;
  for (let y = 0; y < h; y++) {
    const wy = v.y0 + y;
    const rowInMap = wy >= 0 && wy < mapH;
    const bayerRow = (wy & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (shadeOnly && shade[i] === 0) continue;
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
      const person = o !== 0 && people[o] === 1;
      if (!identity) {
        const lum = (ar * 77 + ag * 150 + ab * 29) >> 8;
        if (person) {
          r = (lum + (ar - lum) * psat) * pmr + plr;
          g = (lum + (ag - lum) * psat) * pmg + plg;
          b = (lum + (ab - lum) * psat) * pmb + plb;
        } else {
          r = (lum + (ar - lum) * sat) * mr + lr;
          g = (lum + (ag - lum) * sat) * mg + lg;
          b = (lum + (ab - lum) * sat) * mb + lb;
        }
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
        if (person) {
          kr = flat[o * 3]!;
          kg = flat[o * 3 + 1]!;
          kb = flat[o * 3 + 2]!;
          k = kr > kg ? (kr > kb ? kr : kb) : kg > kb ? kg : kb;
          weight = k > 0 ? bandWeight((k > 1 ? 1 : k) * LEVELS) : 0;
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
            weight = BAND_WEIGHT[level]!;
          }
        }
        if (weight > 0) {
          const inv = 1 / k;
          const tr = kr * inv;
          const tg = kg * inv;
          const tb = kb * inv;
          const bloom = BLOOM * weight;
          const lum = (ar * 77 + ag * 150 + ab * 29) >> 8;
          // blend toward the art's own colour as it looks under this light
          r += ((lum + (ar - lum) * LIT_SAT) * (1 - TINT + TINT * tr) + tr * bloom - r) * weight;
          g += ((lum + (ag - lum) * LIT_SAT) * (1 - TINT + TINT * tg) + tg * bloom - g) * weight;
          b += ((lum + (ab - lum) * LIT_SAT) * (1 - TINT + TINT * tb) + tb * bloom - b) * weight;
        }
      }
      d[p] = r;
      d[p + 1] = g;
      d[p + 2] = b;
    }
  }
}
