/**
 * The timeline a script compiles into: plain data, tracks of timed segments.
 * `frameAt(timeline, t)` reads it; it never changes the timeline, so frames can be asked for in any order.
 */
import type { Slot } from '../core/palette';
import { type ActorState, type Annotation, type Dir, FRAME_H, FRAME_W, type FrameState, TILE, type Town } from '../core/types';
import { CAPTION_FADE, clamp01, ease, LABEL_FADE, TITLE_FADE } from './timing';

export interface Pt {
  x: number;
  y: number;
}

/** One change to an actor's body. Segments are sorted by start and folded in order. */
export type ActorSeg =
  /** Put the actor somewhere (creation, teleport, coming out of a door). */
  | { kind: 'place'; start: number; x: number; y: number; dir?: Dir; visible?: boolean; opacity?: number }
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
  | { kind: 'cut'; start: number; target: CamTarget; zoom?: number }
  | { kind: 'pan'; start: number; end: number; target: CamTarget; zoom?: number }
  | { kind: 'follow'; start: number; actor: string | null };

export interface Timeline {
  town: Town;
  duration: number;
  timeOfDay: number;
  actors: ActorTrack[];
  bubbles: { actor: string; text: string; kind: 'say' | 'think' | 'shout'; start: number; typeEnd: number; end: number }[];
  emotes: { actor: string; name: string; start: number; end: number }[];
  captions: { text: string; start: number; end: number; fadeIn: boolean }[];
  titles: { text: string; subtitle?: string; start: number; end: number }[];
  labels: { actor?: string; at?: Pt; text: string; start: number; end: number }[];
  links: { from: string; to: string; start: number; grow: number; end: number; slot?: Slot }[];
  rings: { actor: string; start: number; grow: number; end: number; slot?: Slot }[];
  focus: (Ramp & { actors: string[] })[];
  fades: Ramp[];
  hours: Ramp[];
  camera: CameraSeg[];
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
  };
}

/** Insert into a list sorted by `start`, after any items with the same start (stable). */
export function insertByStart<T extends { start: number }>(list: T[], item: T): void {
  let i = list.length;
  while (i > 0 && list[i - 1]!.start > item.start) i--;
  list.splice(i, 0, item);
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
      case 'place':
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

interface Cam {
  x: number;
  y: number;
  zoom: number;
}

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

function actorPos(tl: Timeline, id: string, t: number): Pt {
  const b = bodyAt(tl.actors.find((a) => a.id === id)!.segs, t);
  // Centre on the body, not the feet.
  return { x: b.x, y: b.y - 12 };
}

function targetPos(tl: Timeline, target: CamTarget, t: number): Pt {
  return 'actor' in target ? actorPos(tl, target.actor, target.at ?? t) : target;
}

/** The camera after the first `count` camera segments, at time t. */
function cameraAt(tl: Timeline, count: number, t: number): Cam {
  if (count === 0) return clampCamera(tl.town, { x: (tl.town.w * TILE) / 2, y: (tl.town.h * TILE) / 2, zoom: 1 });
  const s = tl.camera[count - 1]!;
  const before = (): Cam => cameraAt(tl, count - 1, s.start);
  switch (s.kind) {
    case 'cut': {
      const p = targetPos(tl, s.target, s.start);
      return clampCamera(tl.town, { ...p, zoom: s.zoom ?? before().zoom });
    }
    case 'follow': {
      const from = before();
      if (s.actor === null) return from;
      return clampCamera(tl.town, { ...actorPos(tl, s.actor, t), zoom: from.zoom });
    }
    case 'pan': {
      const from = before();
      const u = s.end > s.start ? clamp01((t - s.start) / (s.end - s.start)) : 1;
      const zoom = u >= 0.5 ? (s.zoom ?? from.zoom) : from.zoom;
      const to = clampCamera(tl.town, { ...targetPos(tl, s.target, Math.min(t, s.end)), zoom });
      const e = ease(u);
      return clampCamera(tl.town, { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, zoom });
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

/** Everything visible at time t (clamped to [0, duration]). Pure: reads the timeline only. */
export function frameAt(tl: Timeline, time: number): FrameState {
  const t = Number.isFinite(time) ? Math.min(tl.duration, Math.max(0, time)) : 0;
  const shown = new Set<string>();
  const actors: ActorState[] = [];
  for (const a of tl.actors) {
    const b = bodyAt(a.segs, t);
    if (!b.exists || !b.visible) continue;
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
    if (t < l.start || t >= l.end + LABEL_FADE || (l.actor && !shown.has(l.actor))) continue;
    const opacity = inOut(t, l.start, l.end + LABEL_FADE, LABEL_FADE, LABEL_FADE);
    annotations.push({ kind: 'label', ...(l.actor ? { actor: l.actor } : { at: l.at! }), text: l.text, opacity });
  }
  for (const l of tl.links) {
    if (t < l.start || t >= l.end || !shown.has(l.from) || !shown.has(l.to)) continue;
    annotations.push({ kind: 'link', from: l.from, to: l.to, progress: clamp01((t - l.start) / l.grow), ...(l.slot ? { slot: l.slot } : {}) });
  }
  for (const r of tl.rings) {
    if (t < r.start || t >= r.end || !shown.has(r.actor)) continue;
    annotations.push({ kind: 'ring', actor: r.actor, progress: clamp01((t - r.start) / r.grow), ...(r.slot ? { slot: r.slot } : {}) });
  }

  const frame: FrameState = {
    t,
    camera: (() => {
      const c = cameraAt(tl, tl.camera.filter((s) => s.start <= t).length, t);
      return { x: Math.round(c.x), y: Math.round(c.y), zoom: c.zoom };
    })(),
    timeOfDay: rampAt(tl.hours, t, tl.timeOfDay),
    actors,
    bubbles,
    annotations,
    fade: rampAt(tl.fades, t, 0),
  };

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
  if (focus && amount > 0) frame.focus = { actors: focus.actors, amount };
  return frame;
}
