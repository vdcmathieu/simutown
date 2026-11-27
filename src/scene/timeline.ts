/**
 * The timeline a script compiles into: plain data, tracks of timed segments.
 * `frameAt(timeline, t)` reads it; it never changes the timeline, so frames can be asked for in any order.
 */
import type { Slot } from '../core/palette';
import { type ActorState, type Annotation, type Dir, FRAME_H, FRAME_W, type FrameState, TILE, type Town } from '../core/types';
import { locationTown, type Room } from './locations';
import { CAPTION_FADE, clamp01, ease, LABEL_FADE, TITLE_FADE } from './timing';

export interface Pt {
  x: number;
  y: number;
}

/** One change to an actor's body. Segments are sorted by start and folded in order. */
export type ActorSeg =
  /** Put the actor somewhere (creation, teleport, coming out of a door), in `room` (absent: outside). */
  | { kind: 'place'; start: number; x: number; y: number; dir?: Dir; visible?: boolean; opacity?: number; room?: string }
  /**
   * Go through a door into `room` (absent: outside), arriving at (x, y). Over [start, end] the
   * actor fades in on the far side while a copy of them fades out on the side they left.
   */
  | { kind: 'door'; start: number; end: number; x: number; y: number; dir: Dir; room?: string }
  /** Walk through `points`, reaching points[i] at times[i]. `dirs[i]` is the direction of leg i. */
  | { kind: 'walk'; start: number; end: number; points: Pt[]; times: number[]; dirs: Dir[]; face?: Dir; wander?: boolean }
  | { kind: 'face'; start: number; dir: Dir }
  | { kind: 'pose'; start: number; end: number; name: string }
  | { kind: 'fade'; start: number; end: number; from: number; to: number }
  | { kind: 'visible'; start: number; visible: boolean; opacity?: number };

export interface ActorTrack {
  id: string;
  character: string;
  segs: ActorSeg[];
}

/** A value that moves from `from` to `to` over [start, end] and stays there. */
export interface Ramp {
  start: number;
  end: number;
  from: number;
  to: number;
}

/** A camera target: a fixed point, or an actor (sampled at `at`, or tracked when `at` is absent). */
export type CamTarget = Pt | { actor: string; at?: number };

export type CameraSeg =
  /** With `back`, the target and zoom are where the camera last was outside, filled in by `settleCamera`. */
  | { kind: 'cut'; start: number; target: CamTarget; zoom?: number; room?: string; back?: boolean }
  | { kind: 'pan'; start: number; end: number; target: CamTarget; zoom?: number; room?: string }
  /** Follows the actor while they are in `room`; while they are in another location, holds where they left it. */
  | { kind: 'follow'; start: number; actor: string | null; room?: string };

export interface Timeline {
  town: Town;
  duration: number;
  timeOfDay: number;
  actors: ActorTrack[];
  bubbles: { actor: string; text: string; kind: 'say' | 'think' | 'shout'; start: number; typeEnd: number; end: number }[];
  emotes: { actor: string; name: string; start: number; end: number }[];
  captions: { text: string; start: number; end: number; fadeIn: boolean }[];
  titles: { text: string; subtitle?: string; start: number; end: number }[];
  labels: { actor?: string; at?: Pt; room?: string; text: string; start: number; end: number }[];
  links: { from: string; to: string; start: number; grow: number; end: number; slot?: Slot }[];
  rings: { actor: string; start: number; grow: number; end: number; slot?: Slot }[];
  focus: (Ramp & { actors: string[] })[];
  fades: Ramp[];
  hours: Ramp[];
  camera: CameraSeg[];
  /** The camera just before each camera segment starts; filled in by `settleCamera`. */
  cameraFrom: Cam[];
}

/** A camera position in world pixels of a location (`room`, absent outside) and a whole-number zoom. */
export interface Cam {
  x: number;
  y: number;
  zoom: number;
  room?: string;
}

/** An empty timeline for a town. */
export function emptyTimeline(town: Town, timeOfDay: number): Timeline {
  return {
    town,
    duration: 0,
    timeOfDay,
    actors: [],
    bubbles: [],
    emotes: [],
    captions: [],
    titles: [],
    labels: [],
    links: [],
    rings: [],
    focus: [],
    fades: [],
    hours: [],
    camera: [],
    cameraFrom: [],
  };
}

/** Insert into a list sorted by `start`, after any items with the same start (stable). */
export function insertByStart<T extends { start: number }>(list: T[], item: T): void {
  let i = list.length;
  while (i > 0 && list[i - 1]!.start > item.start) i--;
  list.splice(i, 0, item);
}

/**
 * Sort items by start (stable) and cut each one short when the next item with the same key
 * starts while it is still running. `onReplace` is told about the item that cut in.
 */
export function settleByKey<T extends { start: number; end: number }>(items: T[], key: (x: T) => string, onReplace?: (x: T) => void): T[] {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const last = new Map<string, T>();
  for (const x of sorted) {
    const prev = last.get(key(x));
    if (prev && prev.end > x.start) {
      prev.end = x.start;
      onReplace?.(x);
    }
    last.set(key(x), x);
  }
  return sorted;
}

/**
 * Fill in every ramp whose `from` is NaN with the value at its start: `initial` for the first,
 * else where the previous ramp (in start order) stands at that moment.
 */
export function settleRamps(ramps: Ramp[], initial: number): void {
  ramps.forEach((r, i) => {
    if (Number.isNaN(r.from)) r.from = i === 0 ? initial : rampAt(ramps.slice(0, i), r.start, initial);
  });
}

/** The value of a list of ramps at time t (the last ramp that has started wins). */
export function rampAt(ramps: Ramp[], t: number, initial: number): number {
  let r: Ramp | undefined;
  for (const x of ramps) if (x.start <= t) r = x;
  if (!r) return initial;
  if (r.end <= r.start) return r.to;
  return r.from + (r.to - r.from) * clamp01((t - r.start) / (r.end - r.start));
}

// ---------------------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------------------

/** An actor's body at one instant. */
export interface Body {
  /** The location the body is in: a room key, or undefined outside. */
  room?: string;
  /** While going through a door: how they look on the side they are leaving, fading out. */
  leaving?: Body;
  exists: boolean;
  visible: boolean;
  x: number;
  y: number;
  dir: Dir;
  pose: string;
  poseStart: number;
  opacity: number;
}

/** Fold an actor's segments up to time t. */
export function bodyAt(segs: ActorSeg[], t: number): Body {
  const b: Body = { exists: false, visible: true, x: 0, y: 0, dir: 'down', pose: 'idle', poseStart: 0, opacity: 1 };
  for (const s of segs) {
    if (s.start > t) break;
    switch (s.kind) {
      case 'door': {
        const u = s.end > s.start ? clamp01((t - s.start) / (s.end - s.start)) : 1;
        if (u < 1) b.leaving = { ...b, leaving: undefined, opacity: 1 - u };
        else delete b.leaving;
        b.exists = true;
        b.visible = true;
        b.room = s.room;
        b.x = s.x;
        b.y = s.y;
        b.dir = s.dir;
        b.opacity = u;
        b.pose = 'idle';
        b.poseStart = s.start;
        break;
      }
      case 'place':
        b.room = s.room;
        delete b.leaving;
        b.exists = true;
        b.x = s.x;
        b.y = s.y;
        if (s.dir) b.dir = s.dir;
        if (s.visible !== undefined) b.visible = s.visible;
        if (s.opacity !== undefined) b.opacity = s.opacity;
        b.pose = 'idle';
        b.poseStart = s.start;
        break;
      case 'walk': {
        const n = s.points.length;
        if (t >= s.end) {
          Object.assign(b, s.points[n - 1]!);
          b.dir = s.face ?? s.dirs[s.dirs.length - 1] ?? b.dir;
          b.pose = 'idle';
          b.poseStart = s.end;
          break;
        }
        let i = 0;
        while (i < n - 2 && s.times[i + 1]! <= t) i++;
        const a = s.points[i]!;
        const z = s.points[i + 1]!;
        const span = s.times[i + 1]! - s.times[i]!;
        const u = span > 0 ? clamp01((t - s.times[i]!) / span) : 1;
        b.x = a.x + (z.x - a.x) * u;
        b.y = a.y + (z.y - a.y) * u;
        b.dir = s.dirs[i] ?? b.dir;
        b.pose = 'walk';
        b.poseStart = s.start;
        break;
      }
      case 'face':
        b.dir = s.dir;
        break;
      case 'pose':
        if (t < s.end) {
          b.pose = s.name;
          b.poseStart = s.start;
        } else if (b.pose === 'idle' && b.poseStart < s.end) b.poseStart = s.end;
        break;
      case 'fade':
        b.opacity = s.end > s.start ? s.from + (s.to - s.from) * clamp01((t - s.start) / (s.end - s.start)) : s.to;
        break;
      case 'visible':
        b.visible = s.visible;
        if (s.opacity !== undefined) b.opacity = s.opacity;
        break;
    }
  }
  return b;
}

/** A copy of a walk that stops at time t (start < t < end), where the walker is at that moment. */
export function cutWalk(s: ActorSeg & { kind: 'walk' }, t: number): ActorSeg & { kind: 'walk' } {
  let i = 0;
  while (i < s.points.length - 2 && s.times[i + 1]! <= t) i++;
  const a = s.points[i]!;
  const z = s.points[i + 1]!;
  const span = s.times[i + 1]! - s.times[i]!;
  const u = span > 0 ? clamp01((t - s.times[i]!) / span) : 1;
  const stop = { x: a.x + (z.x - a.x) * u, y: a.y + (z.y - a.y) * u };
  return {
    ...s,
    end: t,
    points: [...s.points.slice(0, i + 1), stop],
    times: [...s.times.slice(0, i + 1), t],
    dirs: s.dirs.slice(0, i + 1),
  };
}

/** Direction of travel from a to b (horizontal wins ties). */
export function dirBetween(a: Pt, b: Pt): Dir {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// ---------------------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------------------

/** Keep the view inside the town; centre the town on an axis where it is smaller than the view. */
export function clampCamera(town: Town, c: Cam): Cam {
  const axis = (v: number, view: number, size: number): number =>
    size <= view ? size / 2 : Math.min(size - view / 2, Math.max(view / 2, v));
  return {
    x: axis(c.x, FRAME_W / c.zoom, town.w * TILE),
    y: axis(c.y, FRAME_H / c.zoom, town.h * TILE),
    zoom: c.zoom,
  };
}

/** Where an actor is seen in location `room`: mid-door, the side of the door in that room. */
function actorPos(tl: Timeline, id: string, t: number, room: Room): Pt {
  const here = bodyAt(tl.actors.find((a) => a.id === id)!.segs, t);
  const b = here.room !== room && here.leaving && here.leaving.room === room ? here.leaving : here;
  // Centre on the body, not the feet.
  return { x: b.x, y: b.y - 12 };
}

function targetPos(tl: Timeline, target: CamTarget, t: number, room: Room): Pt {
  return 'actor' in target ? followPos(tl, target.actor, target.at ?? t, room) : target;
}

/** The default camera: the town's centre at zoom 1. */
function homeCamera(town: Town): Cam {
  return clampCamera(town, { x: (town.w * TILE) / 2, y: (town.h * TILE) / 2, zoom: 1 });
}

/** Clamp a camera to the map of its own location. */
function clampIn(tl: Timeline, c: Cam): Cam {
  const out = clampCamera(locationTown(tl.town, c.room), c);
  if (c.room !== undefined) out.room = c.room;
  return out;
}

/**
 * Where a followed actor is seen in location `room` at t: where they are while they are there
 * (or mid-door on its side), else where they were just before they last left it.
 */
function followPos(tl: Timeline, id: string, t: number, room: Room): Pt {
  const segs = tl.actors.find((a) => a.id === id)!.segs;
  const here = bodyAt(segs, t);
  if (here.room === room || (here.leaving && here.leaving.room === room)) return actorPos(tl, id, t, room);
  // the last segment that took them from `room` to somewhere else: where they were just before it
  let left = -1;
  let was: Room | null = null;
  segs.forEach((s, i) => {
    if (s.start > t || (s.kind !== 'door' && s.kind !== 'place')) return;
    if (was === room && s.room !== room) left = i;
    was = s.room;
  });
  if (left < 0) return actorPos(tl, id, t, room);
  // every segment up to that one, also those that start at the same instant (being placed there)
  const b = bodyAt(segs.slice(0, left), segs[left]!.start);
  return { x: b.x, y: b.y - 12 };
}

/**
 * Record, for every camera segment, the camera just before it starts (position, location and
 * the zoom carried forward). Call once after the script; each frame then evaluates a single segment.
 */
export function settleCamera(tl: Timeline): void {
  let from = homeCamera(tl.town);
  // where the camera last was outside: at first, the opening view
  let outside = from;
  tl.cameraFrom = tl.camera.map((s, i) => {
    if (i > 0) from = segCamera(tl, tl.camera[i - 1]!, from, s.start);
    if (from.room === undefined) outside = from;
    if (s.kind === 'cut' && s.back) {
      s.target = { x: outside.x, y: outside.y };
      s.zoom ??= outside.zoom;
    }
    return from;
  });
}

/** The camera at time t: the last segment that has started, from its recorded starting camera. */
function cameraAt(tl: Timeline, t: number): Cam {
  let lo = 0;
  let hi = tl.camera.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tl.camera[mid]!.start <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo === 0 ? homeCamera(tl.town) : segCamera(tl, tl.camera[lo - 1]!, tl.cameraFrom[lo - 1]!, t);
}

/**
 * Round the camera to whole pixels so that the view the renderer draws (top-left corner
 * round(centre - view / 2), size ceil(view)) stays inside the town, also when view / 2 is not whole.
 */
export function snapCamera(town: Town, c: Cam): Cam {
  const axis = (v: number, view: number, size: number): number => {
    const w = Math.ceil(view);
    if (size <= w) return Math.round(size / 2);
    const half = view / 2;
    const x0 = Math.min(size - w, Math.max(0, Math.round(Math.round(v) - half)));
    // The whole-pixel centre whose rounded corner is exactly x0 (and v itself when v is inside).
    return x0 + Math.ceil(half - 0.5);
  };
  return { x: axis(c.x, FRAME_W / c.zoom, town.w * TILE), y: axis(c.y, FRAME_H / c.zoom, town.h * TILE), zoom: c.zoom };
}

/** The camera during segment `s` at time t, given the camera `from` just before it started. */
function segCamera(tl: Timeline, s: CameraSeg, from: Cam, t: number): Cam {
  const room = s.room;
  switch (s.kind) {
    case 'cut':
      return clampIn(tl, { ...targetPos(tl, s.target, s.start, room), zoom: s.zoom ?? from.zoom, room });
    case 'follow':
      if (s.actor === null) return from;
      // while the actor is through a door, the camera stays where they were last seen
      return clampIn(tl, { ...followPos(tl, s.actor, t, room), zoom: from.zoom, room });
    case 'pan': {
      const u = s.end > s.start ? clamp01((t - s.start) / (s.end - s.start)) : 1;
      const zoom = u >= 0.5 ? (s.zoom ?? from.zoom) : from.zoom;
      const to = clampIn(tl, { ...targetPos(tl, s.target, Math.min(t, s.end), room), zoom, room });
      const e = ease(u);
      return clampIn(tl, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, zoom, room });
    }
  }
}

// ---------------------------------------------------------------------------------------
// Frame
// ---------------------------------------------------------------------------------------

/** The last item that has started by time t and is still running (t < end). */
function active<T extends { start: number; end: number }>(items: T[], t: number, keep?: (x: T) => boolean): T | undefined {
  let found: T | undefined;
  for (const x of items) if (x.start <= t && t < x.end && (!keep || keep(x))) found = x;
  return found;
}

/** Fade in over `fin` at the start and out over `fout` at the end of [start, end]. */
function inOut(t: number, start: number, end: number, fin: number, fout: number): number {
  return Math.min(fin > 0 ? clamp01((t - start) / fin) : 1, fout > 0 ? clamp01((end - t) / fout) : 1);
}

/**
 * Everything visible at time t (clamped to [0, duration]). Pure: reads the timeline only.
 * The frame shows one location, the camera's: only the people there (and their bubbles and
 * annotations) are in it, and someone going through a door shows on both sides.
 */
export function frameAt(tl: Timeline, time: number): FrameState {
  const t = Number.isFinite(time) ? Math.min(tl.duration, Math.max(0, time)) : 0;
  const cam = cameraAt(tl, t);
  const room = cam.room;
  const shown = new Set<string>();
  const actors: ActorState[] = [];
  for (const a of tl.actors) {
    const here = bodyAt(a.segs, t);
    const b = here.room === room ? here : here.leaving?.room === room ? here.leaving : undefined;
    if (!b || !b.exists || !b.visible) continue;
    shown.add(a.id);
    const st: ActorState = {
      id: a.id,
      character: a.character,
      x: Math.round(b.x),
      y: Math.round(b.y),
      dir: b.dir,
      pose: b.pose,
      animTime: t - b.poseStart,
    };
    const emote = active(tl.emotes, t, (e) => e.actor === a.id);
    if (emote) st.emote = emote.name;
    if (b.opacity < 1) st.opacity = Math.max(0, b.opacity);
    actors.push(st);
  }

  const bubbles = tl.actors.flatMap((a) => {
    const bub = shown.has(a.id) ? active(tl.bubbles, t, (x) => x.actor === a.id) : undefined;
    if (!bub) return [];
    const span = bub.typeEnd - bub.start;
    return [{ actor: bub.actor, text: bub.text, kind: bub.kind, reveal: span > 0 ? clamp01((t - bub.start) / span) : 1 }];
  });

  const annotations: Annotation[] = [];
  for (const l of tl.labels) {
    if (t < l.start || t >= l.end + LABEL_FADE || (l.actor ? !shown.has(l.actor) : l.room !== room)) continue;
    const opacity = inOut(t, l.start, l.end + LABEL_FADE, LABEL_FADE, LABEL_FADE);
    annotations.push({ kind: 'label', ...(l.actor ? { actor: l.actor } : { at: { ...l.at! } }), text: l.text, opacity });
  }
  for (const l of tl.links) {
    if (t < l.start || t >= l.end || !shown.has(l.from) || !shown.has(l.to)) continue;
    annotations.push({ kind: 'link', from: l.from, to: l.to, progress: clamp01((t - l.start) / l.grow), ...(l.slot ? { slot: l.slot } : {}) });
  }
  for (const r of tl.rings) {
    if (t < r.start || t >= r.end || !shown.has(r.actor)) continue;
    annotations.push({ kind: 'ring', actor: r.actor, progress: clamp01((t - r.start) / r.grow), ...(r.slot ? { slot: r.slot } : {}) });
  }

  const { x, y, zoom } = snapCamera(locationTown(tl.town, room), cam);
  const frame: FrameState = {
    t,
    camera: { x, y, zoom },
    timeOfDay: rampAt(tl.hours, t, tl.timeOfDay),
    actors,
    bubbles,
    annotations,
    fade: rampAt(tl.fades, t, 0),
  };
  if (room !== undefined) frame.interior = room;

  let caption: Timeline['captions'][number] | undefined;
  for (const c of tl.captions) if (c.start <= t) caption = c;
  if (caption && t < caption.end + CAPTION_FADE) {
    const fin = caption.fadeIn ? CAPTION_FADE : 0;
    frame.caption = { text: caption.text, opacity: inOut(t, caption.start, caption.end + CAPTION_FADE, fin, CAPTION_FADE) };
  }

  const title = active(tl.titles, t);
  if (title) {
    frame.title = { text: title.text, opacity: inOut(t, title.start, title.end, TITLE_FADE, TITLE_FADE) };
    if (title.subtitle !== undefined) frame.title.subtitle = title.subtitle;
  }

  let focus: Timeline['focus'][number] | undefined;
  for (const f of tl.focus) if (f.start <= t) focus = f;
  const amount = rampAt(tl.focus, t, 0);
  if (focus && amount > 0) frame.focus = { actors: [...focus.actors], amount };
  return frame;
}
