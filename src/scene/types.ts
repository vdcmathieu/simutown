/** The public scripting API: the scene builder `s` and the actor handles it returns. */
import type { Slot } from '../core/palette';
import type { ArtRegistry, Dir, Town } from '../core/types';

/**
 * Where something should go: a place name (`'cafe.door'`), a tile `[tx, ty]`,
 * or an actor handle (meaning "next to that actor" for walking, "on them" for the camera).
 */
export type Target = string | [number, number] | ActorHandle;

/** Options for `scene()`. */
export interface SceneOpts {
  title: string;
  town: Town;
  /** Starting hour, 0-24. Default 12 (noon). */
  timeOfDay?: number;
  /** Seed for everything random (wandering). Default 1. */
  seed?: number | string;
  /** Art registry used to validate characters, poses and emotes. Default: the built-in art. */
  art?: ArtRegistry;
}

/** Options for `s.actor()`. */
export interface ActorOpts {
  at: Target;
  facing?: Dir;
  /** Defaults to the character id. Required when the same character appears twice. */
  id?: string;
  /** Start off the map, e.g. to `exit` a building later. */
  hidden?: boolean;
}

/** Options for `say`, `think` and `shout`. */
export interface SayOpts {
  /** Seconds the full text stays up after typing. Default: from the text length. */
  hold?: number;
  /** Play the character's `talk` pose while typing, if it has one. Default true. */
  gesture?: boolean;
}

/** A person in the scene. Every call is scheduled at the script's current time. */
export interface ActorHandle {
  readonly id: string;
  readonly character: string;
  /** Walk along a path that avoids solid tiles. Walking to an actor stops next to them, facing them. */
  walkTo(target: Target, opts?: { speed?: number }): void;
  /** Turn to a direction or towards another actor. */
  face(dir: Dir | ActorHandle): void;
  /**
   * Speech bubble with a typewriter reveal, held long enough to read. A standing character
   * with a `talk` pose gestures while the text types out; `gesture: false` turns that off.
   */
  say(text: string, opts?: SayOpts): void;
  /** Thought bubble. */
  think(text: string, opts?: SayOpts): void;
  /** Shouted bubble. */
  shout(text: string, opts?: SayOpts): void;
  /**
   * Sit on one of a prop's seats (default: its first). Walks to the prop's place named like
   * the seat, or else the nearest free tile beside the prop, then sits until the next move
   * or pose, which first steps back to that tile. Talking, emotes and turning keep them seated.
   */
  sitOn(prop: string, seat?: string, opts?: { hold?: number; speed?: number }): void;
  /** Icon above the head, by emote name. */
  emote(name: string, opts?: { hold?: number }): void;
  /** Play one of the character's extra poses, then return to idle. */
  pose(name: string, opts?: { hold?: number }): void;
  /** Walk to a prop's `door` place and fade out (the actor is then hidden). */
  enter(prop: string, opts?: { speed?: number }): void;
  /** Appear at a prop's `door` place and fade in, facing down. */
  exit(prop: string): void;
  /** Remove from the map. */
  hide(): void;
  /** Return to the map where the actor was. */
  show(): void;
  /** Move instantly. */
  teleport(target: Target): void;
}

/** Camera calls. Targets that are actors are tracked while the camera moves to them. */
export interface CameraBuilder {
  /** Jump to a target. Zoom is an integer: 1 shows the whole frame, 2 is closer. */
  cut(target: Target, opts?: { zoom?: number }): void;
  /** Glide to a target with ease-in-out. A zoom change happens halfway. */
  pan(target: Target, opts?: { duration?: number; zoom?: number }): void;
  /** Keep an actor centred until the next camera call, or `follow(null)` to stop where it is. */
  follow(actor: ActorHandle | null): void;
}

/** The `s` passed to a scene script. */
export interface SceneBuilder {
  /** The script clock: seconds at which the next call starts. */
  readonly now: number;
  /** Put a townsperson on the map. */
  actor(character: string, opts: ActorOpts): ActorHandle;
  /** Let time pass. */
  wait(seconds: number): void;
  /** Start every call inside at the same moment; ends when the longest ends. */
  together(fn: () => void): void;
  /** Chain calls one after another (the default), for use inside `together`. */
  sequence(fn: () => void): void;
  /** Full-frame title card that fades in, holds, and fades out. */
  title(text: string, subtitle?: string, opts?: { hold?: number }): void;
  /** Narration at the bottom. Stays until replaced or cleared, or for `hold` seconds. */
  caption(text: string, opts?: { hold?: number }): void;
  clearCaption(): void;
  readonly camera: CameraBuilder;
  /** Set the hour (0-24), or animate to it over `duration` seconds. */
  timeOfDay(hour: number, opts?: { duration?: number }): void;
  /** Tag above an actor, or at a place or tile. */
  label(target: Target, text: string): void;
  unlabel(target: Target): void;
  /** Dotted line that grows from a to b, holds, then goes. */
  link(a: ActorHandle, b: ActorHandle, opts?: { hold?: number; slot?: Slot }): void;
  /** Highlight ring under an actor. */
  ring(actor: ActorHandle, opts?: { hold?: number; slot?: Slot }): void;
  /** Dim everything except these actors. */
  focus(actors: ActorHandle | ActorHandle[], opts?: { duration?: number }): void;
  unfocus(opts?: { duration?: number }): void;
  /** Fade from ink. */
  fadeIn(seconds?: number): void;
  /** Fade to ink. */
  fadeOut(seconds?: number): void;
  /** Background life: the actor strolls near a place until its next instruction. */
  wander(actor: ActorHandle, opts: { around: Target; radius?: number; seed?: number | string; speed?: number }): void;
}
