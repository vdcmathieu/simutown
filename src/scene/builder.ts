/**
 * `scene(opts, script)`: run a script once into a Timeline and wrap it as a Scene.
 *
 * The builder keeps a clock. Sequential groups move it forward call by call; `together`
 * starts each child at the group's start. Every call records timed segments and returns.
 */
import { art as builtinArt } from '../art';
import { type ArtRegistry, type Dir, FPS, FRAME_H, FRAME_W, type Scene } from '../core/types';
import { blockerAt, fmtTile, inBounds, isWalkable, type Tile, tileAt, tileCenter } from '../world/grid';
import { unknownName } from '../world/names';
import { explainNoPath, findPath } from '../world/path';
import { createRng, type Rng } from '../world/random';
import { type ActorSeg, bodyAt, type Body, type CamTarget, dirBetween, emptyTimeline, frameAt, insertByStart, type Pt, rampAt, type Timeline } from './timeline';
import * as T from './timing';
import type { ActorHandle, ActorOpts, SceneBuilder, SceneOpts, Target } from './types';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const NEIGHBOURS: [number, number][] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

interface Group {
  par: boolean;
  start: number;
  cursor: number;
  end: number;
}

interface Wander {
  start: number;
  around: Tile;
  radius: number;
  speed: number;
  rng: Rng;
  /** When the last stroll ends. */
  free: number;
  /** Start of the next stroll, once its pause has been drawn. */
  pending?: number;
}

interface ActorRec {
  handle: ActorHandle;
  segs: ActorSeg[];
  wander?: Wander;
}

function checkSeconds(what: string, v: number | undefined): void {
  if (v !== undefined && !(Number.isFinite(v) && v >= 0)) throw new Error(`${what} must be a number of seconds >= 0, got ${v}.`);
}

/**
 * Build a scene. The script runs once, now, and records a timeline;
 * `frame(t)` then reads that timeline for any t, in any order.
 */
export function scene(opts: SceneOpts, script: (s: SceneBuilder) => void): Scene {
  const art: ArtRegistry = opts.art ?? builtinArt;
  const town = opts.town;
  const hour0 = opts.timeOfDay ?? 12;
  if (!(hour0 >= 0 && hour0 <= 24)) throw new Error(`timeOfDay must be an hour between 0 and 24, got ${hour0}.`);
  const tl: Timeline = emptyTimeline(town, hour0);
  const seed = opts.seed ?? 1;
  const recs = new Map<ActorHandle, ActorRec>();
  const byId = new Map<string, ActorRec>();
  const stack: Group[] = [{ par: false, start: 0, cursor: 0, end: 0 }];

  // --- clock ------------------------------------------------------------------------

  const top = (): Group => stack[stack.length - 1]!;
  const now = (): number => (top().par ? top().start : top().cursor);
  /** Reserve `d` seconds at the current time; returns the start time. */
  const advance = (d: number): number => {
    const g = top();
    const t0 = now();
    if (g.par) g.end = Math.max(g.end, t0 + d);
    else g.cursor = t0 + d;
    return t0;
  };
  const group = (par: boolean, fn: () => void): void => {
    const t0 = now();
    const g: Group = { par, start: t0, cursor: t0, end: t0 };
    stack.push(g);
    try {
      fn();
    } finally {
      stack.pop();
    }
    advance((par ? g.end : g.cursor) - t0);
  };

  // --- lookups ------------------------------------------------------------------------

  const rec = (a: ActorHandle, what: string): ActorRec => {
    const r = recs.get(a);
    if (!r) throw new Error(`${what}: expected an actor handle returned by s.actor(), got ${JSON.stringify(a)}.`);
    return r;
  };
  const isHandle = (x: unknown): x is ActorHandle => typeof x === 'object' && x !== null && !Array.isArray(x);

  /** Stroll generation: extend an actor's wander with whole strolls that start before `until`. */
  const extendWander = (r: ActorRec, until: number): void => {
    const w = r.wander;
    if (!w) return;
    for (;;) {
      if (w.pending === undefined) w.pending = w.free + w.rng.range(T.WANDER_PAUSE[0], T.WANDER_PAUSE[1]);
      if (w.pending >= until) return;
      const t0 = w.pending;
      w.pending = undefined;
      w.free = t0;
      const b = bodyAt(r.segs, t0);
      const from = tileAt(b.x, b.y);
      const options: Tile[] = [];
      for (let ty = w.around.ty - w.radius; ty <= w.around.ty + w.radius; ty++) {
        for (let tx = w.around.tx - w.radius; tx <= w.around.tx + w.radius; tx++) {
          if (isWalkable(town, tx, ty) && (tx !== from.tx || ty !== from.ty)) options.push({ tx, ty });
        }
      }
      for (let tries = 0; tries < 4 && options.length > 0; tries++) {
        const goal = w.rng.pick(options);
        const seg = walkSeg(b, goal, t0, w.speed);
        if (!seg) continue;
        seg.wander = true;
        insertByStart(r.segs, seg);
        w.free = seg.end;
        break;
      }
    }
  };

  /** The body of an actor at build time t (wandering actors are extended to t first). */
  const body = (r: ActorRec, t: number): Body => {
    extendWander(r, t);
    return bodyAt(r.segs, t);
  };

  /** A new instruction for this actor at time t: any wander stops here. */
  const touch = (r: ActorRec, t: number): void => {
    const w = r.wander;
    if (!w || t < w.start) return;
    extendWander(r, t);
    r.segs = r.segs.filter((s) => !(s.kind === 'walk' && s.wander && s.start >= t));
    r.wander = undefined;
  };

  /** Record a segment that moves the actor; moves must be added in time order. */
  const addMove = (r: ActorRec, seg: ActorSeg): void => {
    const later = r.segs.find((s) => (s.kind === 'walk' || s.kind === 'place') && s.start > seg.start && !(s.kind === 'walk' && s.wander));
    if (later) {
      throw new Error(
        `${r.handle.id} already has a move starting at ${later.start.toFixed(2)}s, later than this one at ${seg.start.toFixed(2)}s. ` +
          `Inside s.together(), give each actor its moves in time order.`,
      );
    }
    insertByStart(r.segs, seg);
  };

  /** A walk segment from a body's position to a goal tile, or null when unreachable. */
  const walkSeg = (b: Body, goal: Tile, t0: number, speed: number): (ActorSeg & { kind: 'walk' }) | null => {
    const path = findPath(town, tileAt(b.x, b.y), goal);
    if (!path) return null;
    const points: Pt[] = [{ x: b.x, y: b.y }];
    for (const p of path) {
      const c = tileCenter(p.tx, p.ty);
      const last = points[points.length - 1]!;
      if (c.x !== last.x || c.y !== last.y) points.push(c);
    }
    const times = [t0];
    const dirs: Dir[] = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const z = points[i]!;
      times.push(times[i - 1]! + Math.hypot(z.x - a.x, z.y - a.y) / 16 / speed);
      dirs.push(dirBetween(a, z));
    }
    return { kind: 'walk', start: t0, end: times[times.length - 1]!, points, times, dirs };
  };

  const placeError = (name: string): Error => {
    const hint = byId.has(name) ? `"${name}" is an actor: pass its handle (the value s.actor() returned), not the id string.` : '';
    return unknownName('place', name, Object.keys(town.places), hint);
  };

  const checkTile = (v: [number, number], what: string): Tile => {
    const [tx, ty] = v;
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || !inBounds(town, tx, ty)) {
      throw new Error(`${what}: tile ${JSON.stringify(v)} is not a tile of the ${town.w}x${town.h} map (tiles [0, 0] to [${town.w - 1}, ${town.h - 1}]).`);
    }
    return { tx, ty };
  };

  /** A free tile next to another actor at time t, preferring the one closest to `from`. */
  const besideActor = (other: ActorRec, t: number, what: string, from?: Body): { tile: Tile; target: Tile } => {
    const ob = body(other, t);
    if (!ob.exists) throw new Error(`${what}: ${other.handle.id} is not on the map yet at ${t.toFixed(2)}s.`);
    const target = tileAt(ob.x, ob.y);
    let best: { tile: Tile; len: number } | undefined;
    for (const [dx, dy] of NEIGHBOURS) {
      const tile = { tx: target.tx + dx, ty: target.ty + dy };
      if (!isWalkable(town, tile.tx, tile.ty)) continue;
      const len = from ? (findPath(town, tileAt(from.x, from.y), tile)?.length ?? Infinity) : 0;
      if (!best || len < best.len) best = { tile, len };
    }
    if (!best || best.len === Infinity) {
      const around = NEIGHBOURS.map(([dx, dy]) => `${fmtTile({ tx: target.tx + dx, ty: target.ty + dy })} ${blockerAt(town, target.tx + dx, target.ty + dy, art)}`);
      throw new Error(`${what}: no free tile next to ${other.handle.id} at ${fmtTile(target)} can be reached. Around them: ${around.join(', ')}.`);
    }
    return { tile: best.tile, target };
  };

  /** A walkable tile to stand on for a target (an actor target means beside them). */
  const standTile = (target: Target, t: number, what: string): Tile => {
    if (isHandle(target)) return besideActor(rec(target, what), t, what).tile;
    const tile = typeof target === 'string' ? town.places[target] : checkTile(target, what);
    if (!tile) throw placeError(target as string);
    if (!isWalkable(town, tile.tx, tile.ty)) {
      throw new Error(`${what}: ${fmtTile(tile)} is not walkable: ${blockerAt(town, tile.tx, tile.ty, art)}.`);
    }
    return tile;
  };

  /** A camera target: actors are kept as actors, places and tiles become points. */
  const camTarget = (target: Target, what: string, at?: number): CamTarget => {
    if (isHandle(target)) return { actor: rec(target, what).handle.id, ...(at !== undefined ? { at } : {}) };
    const tile = typeof target === 'string' ? town.places[target] : checkTile(target, what);
    if (!tile) throw placeError(target as string);
    const c = tileCenter(tile.tx, tile.ty);
    return { x: c.x, y: c.y - 12 };
  };

  const checkZoom = (zoom: number | undefined): void => {
    if (zoom !== undefined && !(Number.isInteger(zoom) && zoom >= 1)) throw new Error(`Camera zoom must be a whole number >= 1, got ${zoom}.`);
  };

  // --- actor handles ------------------------------------------------------------------

  const makeActor = (character: string, o: ActorOpts): ActorHandle => {
    const def = art.characters[character];
    if (!def) throw unknownName('character', character, Object.keys(art.characters));
    const id = o.id ?? character;
    if (byId.has(id)) throw new Error(`There is already an actor "${id}". Give the second one an id: s.actor('${character}', { id: '${character}-2', at: ... }).`);
    if (o.facing && !DIRS.includes(o.facing)) throw unknownName('direction', o.facing, DIRS);
    const t0 = now();
    const tile = standTile(o.at, t0, `s.actor('${character}')`);
    const c = tileCenter(tile.tx, tile.ty);
    const segs: ActorSeg[] = [{ kind: 'place', start: t0, x: c.x, y: c.y, dir: o.facing ?? 'down', visible: !o.hidden, opacity: 1 }];

    const say = (kind: 'say' | 'think' | 'shout') => (text: string, opts: { hold?: number } = {}) => {
      checkSeconds(`${id}.${kind} hold`, opts.hold);
      const typeEnd = T.typeTime(text);
      const d = typeEnd + (opts.hold ?? T.readHold(text));
      const t = start(d);
      for (const b of tl.bubbles) if (b.actor === id && b.start < t && b.end > t) b.end = t;
      tl.bubbles.push({ actor: id, text, kind, start: t, typeEnd: t + typeEnd, end: t + d });
    };
    /** Reserve time for a call on this actor and stop any wander at its start. */
    const start = (d: number): number => {
      const t = advance(d);
      touch(r, t);
      return t;
    };
    const walk = (goal: Tile, t: number, speed: number, face?: Dir): number => {
      const b = body(r, t);
      const seg = walkSeg(b, goal, t, speed);
      if (!seg) throw new Error(`${id} cannot walk from ${fmtTile(tileAt(b.x, b.y))} to ${fmtTile(goal)}. ${explainNoPath(town, tileAt(b.x, b.y), goal, art)}`);
      if (face) seg.face = face;
      addMove(r, seg);
      return seg.end - t;
    };
    const checkSpeed = (speed: number | undefined): number => {
      const v = speed ?? T.WALK_SPEED;
      if (!(v > 0 && Number.isFinite(v))) throw new Error(`${id}: walking speed must be a positive number of tiles per second, got ${speed}.`);
      return v;
    };
    const door = (prop: string, what: string): Tile => {
      const ids = town.props.map((p) => p.id ?? p.kind);
      if (!ids.includes(prop)) throw unknownName('prop', prop, ids, `(in ${what})`);
      const tile = town.places[`${prop}.door`];
      if (!tile) {
        const withDoors = ids.filter((p) => town.places[`${p}.door`]);
        throw new Error(`${what}: prop "${prop}" has no door place. Props with a door: ${withDoors.join(', ') || 'none'}.`);
      }
      return tile;
    };

    const handle: ActorHandle = {
      id,
      character,
      walkTo(target, opts = {}) {
        const speed = checkSpeed(opts.speed);
        const t = now();
        touch(r, t);
        const what = `${id}.walkTo`;
        if (isHandle(target)) {
          // Someone walking up to a wandering actor makes them stop and wait.
          const them = rec(target, what);
          touch(them, t);
          const me = body(r, t);
          const { tile, target: other } = besideActor(them, t, what, me);
          const goalPt = tileCenter(tile.tx, tile.ty);
          const face = dirBetween(goalPt, tileCenter(other.tx, other.ty));
          advance(walk(tile, t, speed, face));
          return;
        }
        advance(walk(standTile(target, t, what), t, speed));
      },
      face(dir) {
        const t = start(0);
        let d: Dir;
        if (isHandle(dir)) {
          const other = body(rec(dir, `${id}.face`), t);
          d = dirBetween(body(r, t), other);
        } else if (DIRS.includes(dir)) d = dir;
        else throw unknownName('direction', String(dir), DIRS, `(in ${id}.face; or pass an actor handle)`);
        insertByStart(r.segs, { kind: 'face', start: t, dir: d });
      },
      say: say('say'),
      think: say('think'),
      shout: say('shout'),
      emote(name, opts = {}) {
        if (!art.emotes[name]) throw unknownName('emote', name, Object.keys(art.emotes), `(in ${id}.emote)`);
        checkSeconds(`${id}.emote hold`, opts.hold);
        const d = opts.hold ?? T.EMOTE_HOLD;
        const t = start(d);
        tl.emotes.push({ actor: id, name, start: t, end: t + d });
      },
      pose(name, opts = {}) {
        const poses = Object.keys(def.poses ?? {});
        if (!poses.includes(name)) throw unknownName('pose', name, poses, `(for character "${character}")`);
        checkSeconds(`${id}.pose hold`, opts.hold);
        const d = opts.hold ?? T.POSE_HOLD;
        const t = start(d);
        insertByStart(r.segs, { kind: 'pose', start: t, end: t + d, name });
      },
      enter(prop, opts = {}) {
        const speed = checkSpeed(opts.speed);
        const tile = door(prop, `${id}.enter`);
        const t = now();
        touch(r, t);
        const w = walk(tile, t, speed, 'up');
        const t1 = t + w;
        insertByStart(r.segs, { kind: 'fade', start: t1, end: t1 + T.DOOR_FADE, from: 1, to: 0 });
        insertByStart(r.segs, { kind: 'visible', start: t1 + T.DOOR_FADE, visible: false, opacity: 1 });
        advance(w + T.DOOR_FADE);
      },
      exit(prop) {
        const tile = door(prop, `${id}.exit`);
        const t = start(T.DOOR_FADE);
        const c = tileCenter(tile.tx, tile.ty);
        addMove(r, { kind: 'place', start: t, x: c.x, y: c.y, dir: 'down', visible: true, opacity: 0 });
        insertByStart(r.segs, { kind: 'fade', start: t, end: t + T.DOOR_FADE, from: 0, to: 1 });
      },
      hide() {
        insertByStart(r.segs, { kind: 'visible', start: start(0), visible: false });
      },
      show() {
        insertByStart(r.segs, { kind: 'visible', start: start(0), visible: true });
      },
      teleport(target) {
        const t = start(0);
        const tile = standTile(target, t, `${id}.teleport`);
        const c = tileCenter(tile.tx, tile.ty);
        addMove(r, { kind: 'place', start: t, x: c.x, y: c.y });
      },
    };
    const r: ActorRec = { handle, segs };
    recs.set(handle, r);
    byId.set(id, r);
    tl.actors.push({ id, character, segs: [] });
    return handle;
  };

  // --- the builder --------------------------------------------------------------------

  const addRamp = <R extends { start: number; end: number; from: number; to: number }>(list: R[], initial: number, item: Omit<R, 'from'>): void => {
    insertByStart(list, { ...item, from: rampAt(list, item.start, initial) } as R);
  };
  const actorIds = (actors: ActorHandle | ActorHandle[], what: string): string[] =>
    (Array.isArray(actors) ? actors : [actors]).map((a) => rec(a, what).handle.id);
  const labelKey = (target: Target, what: string): { actor?: string; at?: Pt } => {
    if (isHandle(target)) return { actor: rec(target, what).handle.id };
    const tile = typeof target === 'string' ? town.places[target] : checkTile(target, what);
    if (!tile) throw placeError(target as string);
    return { at: tileCenter(tile.tx, tile.ty) };
  };
  const sameKey = (a: { actor?: string; at?: Pt }, b: { actor?: string; at?: Pt }): boolean =>
    a.actor !== undefined ? a.actor === b.actor : !!b.at && a.at!.x === b.at.x && a.at!.y === b.at.y;

  const s: SceneBuilder = {
    get now() {
      return now();
    },
    actor: makeActor,
    wait(seconds) {
      checkSeconds('s.wait', seconds);
      advance(seconds);
    },
    together: (fn) => group(true, fn),
    sequence: (fn) => group(false, fn),
    title(text, subtitle, opts = {}) {
      checkSeconds('s.title hold', opts.hold);
      const d = 2 * T.TITLE_FADE + (opts.hold ?? T.TITLE_HOLD);
      const t = advance(d);
      tl.titles.push({ text, ...(subtitle !== undefined ? { subtitle } : {}), start: t, end: t + d });
    },
    caption(text, opts = {}) {
      checkSeconds('s.caption hold', opts.hold);
      const t = advance(opts.hold ?? 0);
      let fadeIn = true;
      for (const c of tl.captions) {
        if (c.start <= t && c.end > t) {
          c.end = t;
          fadeIn = false;
        }
      }
      insertByStart(tl.captions, { text, start: t, end: opts.hold !== undefined ? t + opts.hold : Infinity, fadeIn });
    },
    clearCaption() {
      const t = advance(0);
      for (const c of tl.captions) if (c.start <= t && c.end > t) c.end = t;
    },
    camera: {
      cut(target, opts = {}) {
        checkZoom(opts.zoom);
        const t = advance(0);
        insertByStart(tl.camera, { kind: 'cut', start: t, target: camTarget(target, 's.camera.cut', t), ...(opts.zoom ? { zoom: opts.zoom } : {}) });
      },
      pan(target, opts = {}) {
        checkZoom(opts.zoom);
        checkSeconds('s.camera.pan duration', opts.duration);
        const d = opts.duration ?? T.PAN;
        const t = advance(d);
        insertByStart(tl.camera, { kind: 'pan', start: t, end: t + d, target: camTarget(target, 's.camera.pan'), ...(opts.zoom ? { zoom: opts.zoom } : {}) });
      },
      follow(actor) {
        const id = actor === null ? null : rec(actor, 's.camera.follow').handle.id;
        insertByStart(tl.camera, { kind: 'follow', start: advance(0), actor: id });
      },
    },
    timeOfDay(hour, opts = {}) {
      if (!(hour >= 0 && hour <= 24)) throw new Error(`s.timeOfDay: hour must be between 0 and 24, got ${hour}.`);
      checkSeconds('s.timeOfDay duration', opts.duration);
      const d = opts.duration ?? 0;
      const t = advance(d);
      addRamp(tl.hours, hour0, { start: t, end: t + d, to: hour });
    },
    label(target, text) {
      const key = labelKey(target, 's.label');
      const t = advance(0);
      for (const l of tl.labels) if (sameKey(key, l) && l.start <= t && l.end > t) l.end = t;
      tl.labels.push({ ...key, text, start: t, end: Infinity });
    },
    unlabel(target) {
      const key = labelKey(target, 's.unlabel');
      const t = advance(0);
      for (const l of tl.labels) if (sameKey(key, l) && l.start <= t && l.end > t) l.end = t;
    },
    link(a, b, opts = {}) {
      checkSeconds('s.link hold', opts.hold);
      const [from, to] = [rec(a, 's.link').handle.id, rec(b, 's.link').handle.id];
      const d = T.LINK_GROW + (opts.hold ?? T.LINK_HOLD);
      const t = advance(d);
      tl.links.push({ from, to, start: t, grow: T.LINK_GROW, end: t + d, ...(opts.slot ? { slot: opts.slot } : {}) });
    },
    ring(actor, opts = {}) {
      checkSeconds('s.ring hold', opts.hold);
      const id = rec(actor, 's.ring').handle.id;
      const d = T.RING_GROW + (opts.hold ?? T.RING_HOLD);
      const t = advance(d);
      tl.rings.push({ actor: id, start: t, grow: T.RING_GROW, end: t + d, ...(opts.slot ? { slot: opts.slot } : {}) });
    },
    focus(actors, opts = {}) {
      checkSeconds('s.focus duration', opts.duration);
      const ids = actorIds(actors, 's.focus');
      const d = opts.duration ?? T.FOCUS_RAMP;
      const t = advance(d);
      addRamp(tl.focus, 0, { start: t, end: t + d, to: 1, actors: ids });
    },
    unfocus(opts = {}) {
      checkSeconds('s.unfocus duration', opts.duration);
      const d = opts.duration ?? T.FOCUS_RAMP;
      const t = advance(d);
      let actors: string[] = [];
      for (const f of tl.focus) if (f.start <= t) actors = f.actors;
      addRamp(tl.focus, 0, { start: t, end: t + d, to: 0, actors });
    },
    fadeIn(seconds) {
      checkSeconds('s.fadeIn', seconds);
      const d = seconds ?? T.FADE;
      const t = advance(d);
      // Fading in from the very start means the scene opens on ink.
      insertByStart(tl.fades, { start: t, end: t + d, from: 1, to: 0 });
    },
    fadeOut(seconds) {
      checkSeconds('s.fadeOut', seconds);
      const d = seconds ?? T.FADE;
      const t = advance(d);
      addRamp(tl.fades, 0, { start: t, end: t + d, to: 1 });
    },
    wander(actor, opts) {
      const r = rec(actor, 's.wander');
      const radius = opts.radius ?? T.WANDER_RADIUS;
      if (!(Number.isInteger(radius) && radius >= 1)) throw new Error(`s.wander: radius must be a whole number of tiles >= 1, got ${radius}.`);
      const speed = opts.speed ?? T.WANDER_SPEED;
      if (!(speed > 0)) throw new Error(`s.wander: speed must be positive, got ${speed}.`);
      const t = advance(0);
      touch(r, t);
      const around = standTile(opts.around, t, 's.wander');
      const rng = createRng(`${seed}/${opts.seed ?? ''}/${r.handle.id}/${t}`);
      r.wander = { start: t, around, radius, speed, rng, free: t };
    },
  };

  script(s);
  if (stack.length !== 1) throw new Error('Internal error: unbalanced together/sequence groups.');
  tl.duration = stack[0]!.cursor;
  for (const r of recs.values()) {
    extendWander(r, tl.duration);
    tl.actors.find((a) => a.id === r.handle.id)!.segs = r.segs;
  }

  return {
    title: opts.title,
    town,
    duration: tl.duration,
    fps: FPS,
    width: FRAME_W,
    height: FRAME_H,
    frame: (t: number) => frameAt(tl, t),
  };
}
