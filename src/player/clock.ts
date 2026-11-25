/**
 * The player's arithmetic, kept free of the DOM so it can be tested: the playback clock,
 * the integer scale that fits a box, and time formatting.
 */

/** Advance the clock by `dt` seconds of wall time. At the end it wraps (loop) or stops. */
export function advance(
  t: number,
  dt: number,
  speed: number,
  duration: number,
  loop: boolean,
): { t: number; ended: boolean } {
  const next = t + dt * speed;
  if (next < duration) return { t: Math.max(0, next), ended: false };
  if (loop && duration > 0) return { t: next % duration, ended: false };
  return { t: duration, ended: true };
}

/** The index of the frame shown at time `t`. Playback and export agree on it. */
export function frameIndex(t: number, fps: number, duration: number): number {
  const last = Math.max(0, Math.ceil(duration * fps) - 1);
  return Math.min(last, Math.max(0, Math.floor(t * fps + 1e-6)));
}

/**
 * The CSS size of a w x h canvas inside an availW x availH box (CSS pixels).
 * It uses the largest whole number of *device* pixels per art pixel that fits, so every
 * art pixel is a crisp square on screen. Only when that would be smaller than one CSS
 * pixel per art pixel (a phone: 480 art pixels in a 375 px wide screen) does it fill the
 * box with a fractional scale instead, and say so with `exact: false`; a postage stamp
 * of perfect pixels is worse than slightly uneven ones on a dense screen.
 */
export function fitScale(
  availW: number,
  availH: number,
  w: number,
  h: number,
  dpr = 1,
): { k: number; cssW: number; cssH: number; exact: boolean } {
  const k = Math.floor(Math.min((availW * dpr) / w, (availH * dpr) / h) + 1e-6);
  if (k >= 1 && k >= Math.min(dpr, Math.floor(dpr))) return { k, cssW: (w * k) / dpr, cssH: (h * k) / dpr, exact: true };
  const f = Math.max(0, Math.min(availW / w, availH / h));
  return { k: f * dpr, cssW: w * f, cssH: h * f, exact: false };
}

/** "0:04.2" style time, with tenths. */
export function formatTime(t: number): string {
  const tenths = Math.floor(Math.max(0, t) * 10 + 1e-6);
  const m = Math.floor(tenths / 600);
  const s = Math.floor((tenths % 600) / 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenths % 10}`;
}
