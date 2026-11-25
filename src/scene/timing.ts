/** Default durations and speeds, in seconds and tiles per second. One place to tune the pacing. */

/** Walking speed in tiles per second. */
export const WALK_SPEED = 2.5;
/** Wandering is a slower stroll. */
export const WANDER_SPEED = 1.5;
/** Default wander radius in tiles around the chosen place. */
export const WANDER_RADIUS = 3;
/** Pause between wander strolls: a random length in this range. */
export const WANDER_PAUSE: [number, number] = [0.8, 2.5];
/** Typewriter speed for bubbles, in characters per second. */
export const TYPE_CPS = 30;
/** Reading speed for the hold after the typewriter, in characters per second. */
export const READ_CPS = 15;
/** The shortest hold after a bubble is fully revealed. */
export const MIN_HOLD = 1.2;
export const EMOTE_HOLD = 1.2;
export const POSE_HOLD = 1;
/** Fade out at a door, or in when coming out of one. */
export const DOOR_FADE = 0.3;
export const TITLE_FADE = 0.5;
export const TITLE_HOLD = 1.5;
export const CAPTION_FADE = 0.25;
export const LABEL_FADE = 0.2;
export const LINK_GROW = 0.6;
export const LINK_HOLD = 0.9;
export const RING_GROW = 0.4;
export const RING_HOLD = 0.6;
export const FOCUS_RAMP = 0.4;
export const FADE = 0.6;
export const PAN = 1.5;

/** Seconds the typewriter takes to reveal `text`. */
export function typeTime(text: string): number {
  return text.length / TYPE_CPS;
}

/** Seconds a fully revealed bubble stays up: at least MIN_HOLD, longer for longer text. */
export function readHold(text: string): number {
  return Math.max(MIN_HOLD, text.length / READ_CPS);
}

/** Smooth ease-in-out on 0..1. */
export function ease(u: number): number {
  return u * u * (3 - 2 * u);
}

/** Clamp to 0..1. */
export function clamp01(u: number): number {
  return u < 0 ? 0 : u > 1 ? 1 : u;
}
