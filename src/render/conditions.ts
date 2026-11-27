/**
 * Time of day -> light condition: the ambient grade, the shadows, and whether the lamps
 * are lit. Every colour here is derived from palette slots through the Lut, so a re-themed
 * town is graded with its own colours.
 *
 * The art is drawn for bright daylight, and from 09:00 to 16:00 the grade leaves it exactly
 * as drawn. The other moods tint it: a pale morning, a golden late afternoon, a pink
 * sunset, a blue evening, a deep but readable night. Tints keep the art's saturation: a
 * cheerful town at dusk is blue and violet, never grey.
 */
import { type Lut, lutRgb, type RGB, type Slot } from '../core/palette';

/** A colour transform: saturate, multiply, then add. */
export interface Grade {
  /** Saturation, 1 = unchanged. */
  sat: number;
  /** Per-channel multiplier. */
  mul: [number, number, number];
  /** Added after the multiply (0..255): the sky's own colour filling the darks. */
  lift: [number, number, number];
}

export interface Condition extends Grade {
  /** True when the grade changes nothing: plain daylight. */
  identity: boolean;
  /**
   * The grade for people. It is the same darkness with half the tint, so that faces stay
   * skin-coloured and characters stay readable against a blue town.
   */
  actor: Grade;
  /** Flat opacity of shadows, 0..1. Contact shadows always show at this opacity. */
  shadowAlpha: number;
  /** The colour shadows blend toward. */
  shadowRgb: [number, number, number];
  /** Cast-shadow shear: a point `h` pixels above the ground casts onto (x + h * kx, y + h * ky). */
  shadowKx: number;
  shadowKy: number;
  /** 0..1 strength of the cast shadow relative to the contact shadow. 0 at midday and at night. */
  cast: number;
  /** 0..1: how lit the lamps and windows are. 0 by day. */
  lamps: number;
  /**
   * 0..1: how much the lamps' glow shows on its surroundings. A lamp that has just come on
   * in golden sunlight barely changes the ground; the same lamp at night owns it.
   */
  glow: number;
  /** How strongly lamplight tints what it lights, 0..1. Default: the outdoor 0.7. */
  litTint?: number;
  /** Saturation of what lamplight lights, 1 = unchanged. Default: the outdoor 0.6. */
  litSat?: number;
}

interface Mood {
  hour: number;
  /** The light's hue: the average of these slots, brightness removed. */
  tint: Slot[];
  /** How far the multiplier moves from white toward the tint. */
  amount: number;
  bright: number;
  sat: number;
  /** How much of the `LIFT` colour is added, as a share of full brightness. */
  lift: number;
  /** Shadow opacity. */
  shadow: number;
}

const DAY: Omit<Mood, 'hour'> = { tint: ['cream.2'], amount: 0, bright: 1, sat: 1, lift: 0, shadow: 0.22 };
const NIGHT: Omit<Mood, 'hour'> = { tint: ['sky.0', 'plum.0'], amount: 0.78, bright: 0.74, sat: 1, lift: 0.07, shadow: 0.24 };

const MOODS: readonly Mood[] = [
  { hour: 0, ...NIGHT },
  { hour: 4.75, ...NIGHT },
  { hour: 5.75, tint: ['sky.0', 'plum.1'], amount: 0.5, bright: 0.86, sat: 1, lift: 0.04, shadow: 0.22 },
  { hour: 6.75, tint: ['ochre.3'], amount: 0.5, bright: 0.98, sat: 1, lift: 0, shadow: 0.22 },
  { hour: 9, ...DAY },
  { hour: 16, ...DAY },
  { hour: 18, tint: ['ochre.2'], amount: 0.3, bright: 1.03, sat: 1.05, lift: 0, shadow: 0.26 },
  { hour: 19, tint: ['rose.1', 'ochre.2'], amount: 0.3, bright: 0.97, sat: 1.05, lift: 0, shadow: 0.24 },
  { hour: 19.5, tint: ['sky.0', 'plum.1'], amount: 0.72, bright: 0.9, sat: 1.1, lift: 0.13, shadow: 0.22 },
  { hour: 21.5, ...NIGHT },
  { hour: 24, ...NIGHT },
];

/** The colour of the lift: sky blue fills the darks in the evening. */
const LIFT: Slot = 'sky.0';
/** How much of the tint people keep, relative to the town around them. */
const ACTOR_TINT = 0.5;

/**
 * hour, kx, ky, strength of the cast shadow. At midday and at night there is only the
 * contact shadow; morning and evening shadows grow out of it, long and to the side.
 */
const SUN: readonly (readonly [number, number, number, number])[] = [
  [0, 0, 0, 0],
  [5.8, 0, 0, 0],
  [5.81, -1.7, 0.4, 0],
  [6.6, -1.4, 0.4, 1],
  [9, -0.35, 0.18, 1],
  [11, 0, 0, 1],
  [14, 0, 0, 1],
  [16, 0.4, 0.2, 1],
  [18, 1.2, 0.42, 1],
  [19, 1.7, 0.4, 0.6],
  [19.25, 1.8, 0.4, 0],
  [19.26, 0, 0, 0],
  [24, 0, 0, 0],
];

/** Lamps come on around 17:30 and go off around 06:30, each over a quarter of an hour. */
const LAMPS_ON = 17.5;
const LAMPS_OFF = 6.5;
const LAMPS_RAMP = 0.25;
/** The glow reaches full strength once the ambient light has dropped by this share. */
const GLOW_DARKNESS = 0.3;

type Vec = [number, number, number];

/** A colour scaled so that its largest channel is 1: its hue without its brightness. */
export function normalized(c: RGB): Vec {
  const m = Math.max(c[0], c[1], c[2], 1);
  return [c[0] / m, c[1] / m, c[2] / m];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(a: Vec, b: Vec, t: number): Vec {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Bring any number into [0, 24). Bad input reads as noon. */
function wrapHour(h: number): number {
  if (!Number.isFinite(h)) return 12;
  return ((h % 24) + 24) % 24;
}

/** The two rows around `hour` in a table sorted by hour, and the blend between them. */
function bracket<T>(rows: readonly T[], hourOf: (row: T) => number, hour: number): [T, T, number] {
  for (let i = 1; i < rows.length; i++) {
    const b = rows[i]!;
    if (hour <= hourOf(b)) {
      const a = rows[i - 1]!;
      const span = hourOf(b) - hourOf(a);
      return [a, b, span === 0 ? 0 : (hour - hourOf(a)) / span];
    }
  }
  const last = rows[rows.length - 1]!;
  return [last, last, 0];
}

/** The town's grade and the gentler one for people, for one mood. */
function gradesOf(lut: Lut, m: Mood): { town: Grade; actor: Grade } {
  const hues = m.tint.map((slot) => normalized(lutRgb(lut, slot)));
  const hue = [0, 1, 2].map((i) => hues.reduce((sum, h) => sum + h[i]!, 0) / hues.length) as Vec;
  const sky = normalized(lutRgb(lut, LIFT));
  const grade = (amount: number, lift: number): Grade => ({
    sat: m.sat,
    mul: hue.map((c) => m.bright * lerp(1, c, amount)) as Vec,
    lift: sky.map((c) => c * 255 * lift) as Vec,
  });
  return { town: grade(m.amount, m.lift), actor: grade(m.amount * ACTOR_TINT, m.lift * ACTOR_TINT) };
}

function blend(a: Grade, b: Grade, t: number): Grade {
  return { sat: lerp(a.sat, b.sat, t), mul: mix(a.mul, b.mul, t), lift: mix(a.lift, b.lift, t) };
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
  const [ma, mb, mt] = bracket(MOODS, (m) => m.hour, h);
  const a = gradesOf(lut, ma);
  const b = gradesOf(lut, mb);
  const town = blend(a.town, b.town, mt);
  const [sa, sb, st] = bracket(SUN, (row) => row[0], h);
  const ink = lutRgb(lut, 'steel.0');
  const lamps = lampsAt(h);
  const ambient = (town.mul[0] * 77 + town.mul[1] * 150 + town.mul[2] * 29) / 256;
  return {
    ...town,
    identity: town.sat === 1 && town.mul.every((m) => m === 1) && town.lift.every((l) => l === 0),
    actor: blend(a.actor, b.actor, mt),
    shadowAlpha: lerp(ma.shadow, mb.shadow, mt),
    shadowRgb: ink.map((c, i) => c * Math.min(1, town.mul[i]!)) as Vec,
    // sixteenths: fine enough to look continuous, coarse enough for the town's shadows to be cached
    shadowKx: Math.round(lerp(sa[1], sb[1], st) * 16) / 16,
    shadowKy: Math.round(lerp(sa[2], sb[2], st) * 16) / 16,
    cast: Math.round(lerp(sa[3], sb[3], st) * 16) / 16,
    lamps,
    glow: lamps * Math.max(0, Math.min(1, (1 - ambient) / GLOW_DARKNESS)),
  };
}

/**
 * Indoors after dark: the warm, slightly dimmer room its lamps light. By day a room is drawn
 * as the art is; from the lamp hour it moves to this as the lamps come on.
 */
const ROOM_NIGHT: Omit<Mood, 'hour'> = { tint: ['ochre.1', 'rose.1'], amount: 0.2, bright: 0.82, sat: 1.04, lift: 0, shadow: 0.2 };
/**
 * Lamplight in a room. It falls on a lit room, not a dark blue night: at the outdoor strength
 * it bleaches faces and turns blue cloth olive. So it is weaker, less yellow, and keeps more
 * of the colours it lands on.
 */
const ROOM_GLOW = 0.65;
const ROOM_LIT_TINT = 0.45;
const ROOM_LIT_SAT = 0.9;
/** Indoors there is no sun: only contact shadows, at this opacity. */
const ROOM_SHADOW = 0.2;

/**
 * The light condition in a room (`Town.indoor`) at an hour of the day. A room has no sun and
 * no sky: no cast shadows (only the contact shadows that ground people and furniture), and no
 * blue night. By day it shows the art's own colours; when the lamps come on (on the town's
 * schedule) it dims a little and warms, and the lamps light it.
 */
export function indoorConditionAt(hour: number, lut: Lut): Condition {
  const lamps = lampsAt(hour);
  const day = gradesOf(lut, { hour: 0, ...DAY });
  const night = gradesOf(lut, { hour: 0, ...ROOM_NIGHT });
  const town = blend(day.town, night.town, lamps);
  const ink = lutRgb(lut, 'steel.0');
  return {
    ...town,
    identity: lamps === 0,
    actor: blend(day.actor, night.actor, lamps),
    shadowAlpha: ROOM_SHADOW,
    shadowRgb: ink.map((c, i) => c * Math.min(1, town.mul[i]!)) as Vec,
    shadowKx: 0,
    shadowKy: 0,
    cast: 0,
    lamps,
    // the room is already bright: its lamps warm it gently and keep its colours
    glow: lamps * ROOM_GLOW,
    litTint: ROOM_LIT_TINT,
    litSat: ROOM_LIT_SAT,
  };
}

/** Plain daylight with no shadow and no lamps: what `lighting: false` renders with. */
export function flatCondition(): Condition {
  const none: Grade = { sat: 1, mul: [1, 1, 1], lift: [0, 0, 0] };
  return { ...none, identity: true, actor: none, shadowAlpha: 0, shadowRgb: [0, 0, 0], shadowKx: 0, shadowKy: 0, cast: 0, lamps: 0, glow: 0 };
}
