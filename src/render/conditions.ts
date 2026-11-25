/**
 * Time of day -> light condition: the ambient grade, the sun or moon shadow, and whether
 * the lamps are lit. Every colour here is derived from palette slots through the Lut, so a
 * re-themed town is graded with its own colours.
 *
 * The moods, in order: a deep but readable night, a pale dawn, daylight that leaves the art
 * exactly as drawn (09:00 to 16:00), a golden late afternoon, a blue dusk.
 */
import { type Lut, lutRgb, type RGB, type Slot } from '../core/palette';

export interface Condition {
  /** Per-channel multiplier applied to every world pixel. */
  mul: [number, number, number];
  /** Saturation, 1 = unchanged. Night is a little greyer than day. */
  sat: number;
  /** Added after the multiply (0..255), so the darkest tones do not crush to black at night. */
  lift: [number, number, number];
  /** True when the grade changes nothing: plain daylight. */
  identity: boolean;
  /** Shadow shear: a point `h` pixels above the ground casts onto (x + h * kx, y + h * ky). */
  shadowKx: number;
  shadowKy: number;
  /** Flat opacity of the shadow, 0..1. */
  shadowAlpha: number;
  /** The colour shadows blend toward. */
  shadowRgb: [number, number, number];
  /** 0..1: how lit the lamps and windows are. 0 by day. */
  lamps: number;
  /**
   * 0..1: how much the lamps' glow shows on its surroundings. A lamp that has just come on
   * in golden sunlight barely changes the ground; the same lamp at night owns it.
   */
  glow: number;
}

/** hour, tint slot, tint amount, brightness, saturation, lift */
type GradeKey = readonly [number, Slot, number, number, number, number];

const GRADE: readonly GradeKey[] = [
  [0, 'steel.2', 1.5, 0.56, 0.45, 0.05],
  [4.75, 'steel.2', 1.5, 0.56, 0.45, 0.05],
  [5.75, 'steel.3', 1.3, 0.8, 0.6, 0.03],
  [6.75, 'ochre.3', 0.4, 0.98, 1, 0],
  [9, 'cream.2', 0, 1, 1, 0],
  [16, 'cream.2', 0, 1, 1, 0],
  [18, 'ochre.2', 0.42, 1.03, 1, 0],
  [19, 'plum.1', 0.25, 0.97, 0.9, 0],
  [19.5, 'steel.3', 1.5, 0.86, 0.55, 0.02],
  [21.5, 'steel.2', 1.5, 0.56, 0.45, 0.05],
  [24, 'steel.2', 1.5, 0.56, 0.45, 0.05],
];

/** hour, kx, ky, alpha. The sun sets (alpha 0) before the short moon shadow fades in. */
const SHADOW: readonly (readonly [number, number, number, number])[] = [
  [0, -0.3, 0.28, 0.16],
  [5.4, -0.3, 0.28, 0.16],
  [5.8, -0.3, 0.28, 0],
  [5.81, -1.7, 0.4, 0],
  [6.6, -1.4, 0.4, 0.2],
  [9, -0.45, 0.38, 0.24],
  [12, 0.2, 0.4, 0.24],
  [16, 0.5, 0.38, 0.24],
  [18, 1.2, 0.42, 0.3],
  [19, 1.7, 0.4, 0.2],
  [19.25, 1.8, 0.4, 0],
  [19.26, -0.3, 0.28, 0],
  [19.75, -0.3, 0.28, 0.16],
  [24, -0.3, 0.28, 0.16],
];

/** Lamps come on around 17:30 and go off around 06:30, each over a quarter of an hour. */
const LAMPS_ON = 17.5;
const LAMPS_OFF = 6.5;
const LAMPS_RAMP = 0.25;
/** The glow reaches full strength once the ambient light has dropped by this share. */
const GLOW_DARKNESS = 0.3;

/** A colour scaled so that its largest channel is 1: its hue without its brightness. */
export function normalized(c: RGB): [number, number, number] {
  const m = Math.max(c[0], c[1], c[2], 1);
  return [c[0] / m, c[1] / m, c[2] / m];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Bring any number into [0, 24). Bad input reads as noon. */
function wrapHour(h: number): number {
  if (!Number.isFinite(h)) return 12;
  return ((h % 24) + 24) % 24;
}

/** Find the two keys around `hour` in a table sorted by its first column, and the blend between them. */
function bracket<T extends readonly [number, ...unknown[]]>(keys: readonly T[], hour: number): [T, T, number] {
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (hour <= b[0]) {
      const a = keys[i - 1]!;
      return [a, b, b[0] === a[0] ? 0 : (hour - a[0]) / (b[0] - a[0])];
    }
  }
  const last = keys[keys.length - 1]!;
  return [last, last, 0];
}

function gradeOf(lut: Lut, key: GradeKey): { mul: number[]; sat: number; lift: number[] } {
  const tint = normalized(lutRgb(lut, key[1]));
  return {
    mul: tint.map((c) => key[3] * lerp(1, c, key[2])),
    sat: key[4],
    lift: tint.map((c) => c * 255 * key[5]),
  };
}

/** 0..1: how lit the lamps are at `hour`. */
export function lampsAt(hour: number): number {
  const h = wrapHour(hour);
  const on = Math.min(1, Math.max(0, (h - LAMPS_ON) / LAMPS_RAMP));
  const off = Math.min(1, Math.max(0, (LAMPS_OFF - h) / LAMPS_RAMP));
  return Math.max(on, off);
}

/** The light condition at an hour of the day (0..24, wraps). */
export function conditionAt(hour: number, lut: Lut): Condition {
  const h = wrapHour(hour);
  const [ga, gb, gt] = bracket(GRADE, h);
  const a = gradeOf(lut, ga);
  const b = gradeOf(lut, gb);
  const mul = [0, 1, 2].map((i) => lerp(a.mul[i]!, b.mul[i]!, gt)) as [number, number, number];
  const lift = [0, 1, 2].map((i) => lerp(a.lift[i]!, b.lift[i]!, gt)) as [number, number, number];
  const sat = lerp(a.sat, b.sat, gt);
  const [sa, sb, st] = bracket(SHADOW, h);
  const ink = lutRgb(lut, 'steel.0');
  const lamps = lampsAt(h);
  const ambient = (mul[0] * 77 + mul[1] * 150 + mul[2] * 29) / 256;
  return {
    mul,
    sat,
    lift,
    identity: sat === 1 && mul.every((m) => m === 1) && lift.every((l) => l === 0),
    // sixteenths of a pixel per pixel of height: fine enough to look continuous, coarse enough to cache
    shadowKx: Math.round(lerp(sa[1], sb[1], st) * 16) / 16,
    shadowKy: Math.round(lerp(sa[2], sb[2], st) * 16) / 16,
    shadowAlpha: lerp(sa[3], sb[3], st),
    shadowRgb: [0, 1, 2].map((i) => ink[i]! * Math.min(1, mul[i]!)) as [number, number, number],
    lamps,
    glow: lamps * Math.max(0, Math.min(1, (1 - ambient) / GLOW_DARKNESS)),
  };
}

/** Plain daylight with no shadow and no lamps: what `lighting: false` renders with. */
export function flatCondition(): Condition {
  return {
    mul: [1, 1, 1],
    sat: 1,
    lift: [0, 0, 0],
    identity: true,
    shadowKx: 0,
    shadowKy: 0,
    shadowAlpha: 0,
    shadowRgb: [0, 0, 0],
    lamps: 0,
    glow: 0,
  };
}
