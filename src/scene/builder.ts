/**
 * `scene(opts, script)`: run a script once into a Timeline and wrap it as a Scene.
 *
 * The builder keeps a clock. Sequential groups move it forward call by call; `together`
 * starts each child at the group's start. Every call records timed segments and returns.
 */
import { art as builtinArt } from '../art';
import { type ArtRegistry, type Dir, FPS, FRAME_H, FRAME_W, type PlacedProp, type Scene, type SceneBeat, TILE, type Town } from '../core/types';
import { blockerAt, fmtTile, inBounds, isWalkable, type Tile, tileAt, tileCenter } from '../world/grid';
import { nearest, unknownName } from '../world/names';
import { explainNoPath, findPath } from '../world/path';
import { createRng, type Rng } from '../world/random';
import { type ActorSeg, bodyAt, type Body, type CameraSeg, type CamTarget, cutWalk, dirBetween, emptyTimeline, frameAt, insertByStart, type Pt, type Ramp, settleByKey, settleCamera, settleRamps, type Timeline } from './timeline';
import { allPlaces, findPlace, fitZoom, locationTown, qualify, type Room, roomBounds, splitName, where } from './locations';
import * as T from './timing';
import type { ActorHandle, ActorOpts, SayOpts, SceneBuilder, SceneOpts, Target } from './types';

const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
/** Tiles beside an actor, in order of preference on ties: side by side reads best as a conversation. */
const NEIGHBOURS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, 1],
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
  /** The location the strolls are in. */
  room: Room;
  around: Tile;
  radius: number;
  speed: number;
  rng: Rng;
  /** When the last stroll ends. */
  free: number;
  /** Start of the next stroll, once its pause has been drawn. */
  pending?: number;
}

/** Someone on a seat, from `start` (when they begin to sit down) until `end` (when they get up). */
interface Seating {
  key: string;
  prop: string;
  seats: string[];
  actor: string;
  start: number;
  end: number;
}

interface ActorRec {
  handle: ActorHandle;
  segs: ActorSeg[];
  wander?: Wander;
  /** Set while seated: the tile they came from, the seat pixel, the open sit pose. */
  seat?: { tile: Tile; at: Pt; pose: ActorSeg & { kind: 'pose' }; seating: Seating };
}

/** Throw if two actors would be on the same seat at the same time (checked in scene time, after the script). */
function checkSeats(seatings: Seating[]): void {
  const sorted = [...seatings].sort((a, b) => a.start - b.start);
  sorted.forEach((b, j) => {
    const a = sorted.slice(0, j).find((x) => x.key === b.key && x.actor !== b.actor && x.end > b.start);
    if (!a) return;
    const busy = (seat: string) => sorted.some((x) => x.key === `${b.prop}.${seat}` && x.start <= b.start && x.end > b.start);
    const free = b.seats.filter((seat) => !busy(seat));
    const until = Number.isFinite(a.end) ? ` until ${a.end.toFixed(2)}s` : '';
    throw new Error(
      `Seat "${b.key}" is taken: ${a.actor} sits there from ${a.start.toFixed(2)}s${until}, and ${b.actor} would sit there at ${b.start.toFixed(2)}s. ` +
        `Free seats on ${b.prop}: ${free.join(', ') || 'none'}.`,
    );
  });
}

/** An hour of the day as a clock time: 18.5 is "18:30". */
function clock(hour: number): string {
  const minutes = Math.round(hour * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
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
  /** What each call does and when, for `Scene.beats`. */
  const beats: SceneBeat[] = [];
  const beat = (start: number, end: number, what: string, actor?: string): SceneBeat => {
    const b: SceneBeat = actor === undefined ? { start, end, what } : { start, end, actor, what };
    beats.push(b);
    return b;
  };

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
  /** A target as a beat names it: an actor id, a place, or a tile (`bakery:[3, 2]` for a tile in a room). */
  const named = (target: Target, room?: Room): string =>
    isHandle(target) ? target.id : typeof target === 'string' ? target : qualify(room, `[${target.join(', ')}]`);
  /** Where a body is, for messages: "outside", "inside bakery", or going through a door. */
  const whereNow = (b: Body): string => (b.leaving ? `going through the door ${b.room === undefined ? 'out of' : 'into'} ${b.room ?? b.leaving.room}` : where(b.room));
  /** The map of a location. */
  const loc = (room: Room): Town => locationTown(town, room);
  /** Where someone stands just inside a room's entrance: its `door` place. */
  const roomDoor = (building: string): Pt => {
    const d = loc(building).places.door;
    if (!d) throw unknownName('place', 'door', Object.keys(loc(building).places), `(room ${building} needs a place called door, just inside its entrance)`);
    return tileCenter(d.tx, d.ty);
  };

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
      const map = loc(w.room);
      const options: Tile[] = [];
      for (let ty = w.around.ty - w.radius; ty <= w.around.ty + w.radius; ty++) {
        for (let tx = w.around.tx - w.radius; tx <= w.around.tx + w.radius; tx++) {
          if (isWalkable(map, tx, ty) && (tx !== from.tx || ty !== from.ty)) options.push({ tx, ty });
        }
      }
      for (let tries = 0; tries < 4 && options.length > 0; tries++) {
        const goal = w.rng.pick(options);
        const seg = walkSeg(b, goal, t0, w.speed, map);
        if (!seg) continue;
        seg.wander = true;
        insertByStart(r.segs, seg);
        w.free = seg.end;
        break;
      }
    }
  };

  /** Turns towards another actor, settled after the script: see `face`. */
  const pendingFaces: { seg: { dir: Dir }; self: ActorRec; other: ActorRec; t: number }[] = [];

  /** The body of an actor at build time t (wandering actors are extended to t first). */
  const body = (r: ActorRec, t: number): Body => {
    extendWander(r, t);
    return bodyAt(r.segs, t);
  };
  /**
   * Someone as a camera sees them at t: a door crossing that starts at that very moment has
   * shown nothing on the far side yet, so they are still on the side they are leaving.
   */
  const camSees = (r: ActorRec, t: number): Body => {
    const b = body(r, t);
    return b.leaving && b.opacity === 0 ? b.leaving : b;
  };
  /**
   * Camera calls, settled after the script like `face`: where an actor they look at is may be
   * written later in the script (another branch of a `together`). Holds each beat to finish.
   */
  const camCalls = new Map<
    CameraSeg,
    {
      kind: 'cut' | 'outside' | 'pan' | 'follow';
      beat: SceneBeat;
      /** The beat text, given the location of the target. */
      text: (room: Room) => string;
      /** What the call is on, for errors, given its location. */
      label: (room: Room) => string;
      what: string;
      actor?: ActorRec;
      /** A place's location, known at once. */
      room?: Room;
      /** A tile: a tile of the location the camera shows at that moment (outside: of the town). */
      tile?: [number, number];
    }
  >();

  /** A new instruction for this actor at time t: any wander stops here. */
  const touch = (r: ActorRec, t: number): void => {
    const w = r.wander;
    if (!w || t < w.start) return;
    extendWander(r, t);
    // Strolls not yet started are dropped; the one under way stops where the actor is at t.
    r.segs = r.segs
      .filter((s) => !(s.kind === 'walk' && s.wander && s.start >= t))
      .map((s) => (s.kind === 'walk' && s.wander && s.end > t ? cutWalk(s, t) : s));
    r.wander = undefined;
  };

  const seatings: Seating[] = [];

  /** A seated actor gets up at t: back to the tile they came from. Returns the seconds it takes. */
  const rise = (r: ActorRec, t: number): number => {
    const st = r.seat;
    if (!st) return 0;
    r.seat = undefined;
    st.pose.end = t;
    st.seating.end = t;
    const to = tileCenter(st.tile.tx, st.tile.ty);
    addMove(r, { kind: 'walk', start: t, end: t + T.SIT_MOVE, points: [st.at, to], times: [t, t + T.SIT_MOVE], dirs: [dirBetween(st.at, to)] });
    return T.SIT_MOVE;
  };

  /** Record a segment that moves the actor; moves must be added in time order. */
  const addMove = (r: ActorRec, seg: ActorSeg): void => {
    const later = r.segs.find((s) => (s.kind === 'walk' || s.kind === 'place' || s.kind === 'door') && s.start > seg.start && !(s.kind === 'walk' && s.wander));
    if (later) {
      throw new Error(
        `${r.handle.id} already has a move starting at ${later.start.toFixed(2)}s, later than this one at ${seg.start.toFixed(2)}s. ` +
          `Inside s.together(), give each actor its moves in time order.`,
      );
    }
    insertByStart(r.segs, seg);
  };

  /** A walk segment from a body's position to a goal tile of map `map`, or null when unreachable. */
  const walkSeg = (b: Body, goal: Tile, t0: number, speed: number, map: Town): (ActorSeg & { kind: 'walk' }) | null => {
    const path = findPath(map, tileAt(b.x, b.y), goal);
    if (!path) return null;
    const centres = path.map((p) => tileCenter(p.tx, p.ty));
    // Mid-step, the start tile's centre may lie behind the actor on the way to the next one:
    // skip it rather than step back to it.
    const [c0, c1] = centres;
    if (c0 && c1 && (c0.x - b.x) * (c1.x - b.x) + (c0.y - b.y) * (c1.y - b.y) < 0) centres.shift();
    const points: Pt[] = [{ x: b.x, y: b.y }];
    for (const c of centres) {
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

  /**
   * An unknown name. Things in a room are named "<building>:<name>"; when `who` (an actor, or
   * the camera) is in a room and uses a bare name, the error points at the room's own names.
   */
  const unknownHere = (kind: string, name: string, room: Room, local: string[], all: string[], who: string, hint = ''): Error => {
    if (room === undefined || name.includes(':')) return unknownName(kind, name, all, hint);
    const near = local.includes(name) ? name : nearest(name, local);
    const named = local.map((n) => qualify(room, n)).sort();
    return new Error(
      `Unknown ${kind} "${name}". ${who} is inside ${room}${near ? `: did you mean "${qualify(room, near)}"?` : '.'} ` +
        `Name what is in a room as "${room}:<${kind}>". ${kind[0]!.toUpperCase()}${kind.slice(1)}s in ${room}: ${named.join(', ') || 'none'}.${hint ? ` ${hint}` : ''}`,
    );
  };
  const placeError = (name: string, room: Room, who: string): Error => {
    const hint = byId.has(name) ? `"${name}" is an actor: pass its handle (the value s.actor() returned), not the id string.` : '';
    // "cafe:nowhere": the places of the cafe, not of the whole town
    const prefix = name.includes(':') ? name.slice(0, name.indexOf(':')) : undefined;
    if (prefix !== undefined && town.interiors?.[prefix]) {
      return unknownName('place', name, Object.keys(loc(prefix).places).map((p) => qualify(prefix, p)), hint);
    }
    return unknownHere('place', name, room, room === undefined ? [] : Object.keys(loc(room).places), allPlaces(town), who, hint);
  };

  /** A tile `[tx, ty]` of a location's map. */
  const checkTile = (v: [number, number], what: string, room: Room): Tile => {
    const [tx, ty] = v;
    const map = loc(room);
    if (!Number.isInteger(tx) || !Number.isInteger(ty) || !inBounds(map, tx, ty)) {
      const of = room === undefined ? `the ${map.w}x${map.h} map` : `the ${map.w}x${map.h} room ${room}`;
      throw new Error(`${what}: tile ${JSON.stringify(v)} is not a tile of ${of} (tiles [0, 0] to [${map.w - 1}, ${map.h - 1}]).`);
    }
    return { tx, ty };
  };

  /** A place or a tile, and the location it is in; a tile is a tile of location `tileRoom`. */
  const spot = (target: string | [number, number], what: string, tileRoom: Room, who = 'The camera'): { room: Room; tile: Tile } => {
    if (typeof target !== 'string') return { room: tileRoom, tile: checkTile(target, what, tileRoom) };
    const found = findPlace(town, target);
    if (!found) throw placeError(target, tileRoom, who);
    return found;
  };

  /** The error for a target in another location than the actor. */
  const elsewhere = (who: string, what: string, target: string, room: Room, mine: Room, t: number): Error => {
    const way = mine !== undefined ? `${who}.exit('${mine}')` : `${who}.enter('${room}')`;
    return new Error(`${what}: ${target} is ${where(room)}, but ${who} is ${where(mine)} at ${t.toFixed(2)}s. Use ${way} first.`);
  };

  /** A free tile next to another actor at time t, in their location, preferring the one closest to `from`. */
  const besideActor = (other: ActorRec, t: number, what: string, from?: Body): { tile: Tile; target: Tile; room: Room } => {
    const ob = body(other, t);
    if (!ob.exists) throw new Error(`${what}: ${other.handle.id} is not on the map yet at ${t.toFixed(2)}s.`);
    const map = loc(ob.room);
    const target = tileAt(ob.x, ob.y);
    let best: { tile: Tile; len: number } | undefined;
    for (const [dx, dy] of NEIGHBOURS) {
      const tile = { tx: target.tx + dx, ty: target.ty + dy };
      if (!isWalkable(map, tile.tx, tile.ty)) continue;
      const len = from ? (findPath(map, tileAt(from.x, from.y), tile)?.length ?? Infinity) : 0;
      if (!best || len < best.len) best = { tile, len };
    }
    if (!best || best.len === Infinity) {
      const around = NEIGHBOURS.map(([dx, dy]) => `${fmtTile({ tx: target.tx + dx, ty: target.ty + dy })} ${blockerAt(map, target.tx + dx, target.ty + dy, art)}`);
      throw new Error(`${what}: no free tile next to ${other.handle.id} at ${fmtTile(target)} can be reached. Around them: ${around.join(', ')}.`);
    }
    return { tile: best.tile, target, room: ob.room };
  };

  /** The free tile beside a prop's footprint (or its origin tile) on map `map` that is quickest to reach from `from`. */
  const besideProp = (p: PlacedProp, from: Body, what: string, map: Town): Tile => {
    const fp = art.props[p.kind]?.footprint ?? { w: 1, h: 1 };
    const inside = (tx: number, ty: number) => tx >= p.tx && tx < p.tx + fp.w && ty <= p.ty && ty > p.ty - fp.h;
    let best: { tile: Tile; len: number } | undefined;
    for (let dy = 0; dy < fp.h; dy++) {
      for (let dx = 0; dx < fp.w; dx++) {
        for (const [nx, ny] of NEIGHBOURS) {
          const tile = { tx: p.tx + dx + nx, ty: p.ty - dy + ny };
          if (inside(tile.tx, tile.ty) || !isWalkable(map, tile.tx, tile.ty)) continue;
          const len = findPath(map, tileAt(from.x, from.y), tile)?.length ?? Infinity;
          if (len < (best?.len ?? Infinity)) best = { tile, len };
        }
      }
    }
    if (!best) throw new Error(`${what}: no free tile next to prop "${p.id ?? p.kind}" at ${fmtTile(p)} can be reached.`);
    return best.tile;
  };

  /**
   * A walkable tile to stand on for a target (an actor target means beside them), and its
   * location. A tile target is a tile of location `tileRoom`.
   */
  const standTile = (target: Target, t: number, what: string, tileRoom: Room, who = "someone"): { room: Room; tile: Tile } => {
    if (isHandle(target)) {
      const b = besideActor(rec(target, what), t, what);
      return { room: b.room, tile: b.tile };
    }
    const { room, tile } = spot(target, what, tileRoom, who);
    const map = loc(room);
    if (!isWalkable(map, tile.tx, tile.ty)) {
      throw new Error(`${what}: ${fmtTile(tile)}${room === undefined ? '' : ` in ${room}`} is not walkable: ${blockerAt(map, tile.tx, tile.ty, art)}.`);
    }
    return { room, tile };
  };

  /**
   * The location the camera shows at t: that of the last camera call started by then. While the
   * script runs it is a guess; `settleCameraCalls` makes it final.
   */
  const cameraRoom = (t: number): Room => {
    let room: Room;
    for (const c of tl.camera) if (c.start <= t) room = c.room;
    return room;
  };

  /**
   * A camera target, as far as it is known while the script runs: an actor is kept as an actor;
   * a place becomes a point in its location. A tile is left for `settleCameraCalls`, which
   * knows the location the camera shows at that moment.
   */
  const camTarget = (target: Target, what: string, t: number, at?: number): { target: CamTarget; room: Room; tile?: [number, number] } => {
    if (isHandle(target)) {
      const r = rec(target, what);
      return { target: { actor: r.handle.id, ...(at !== undefined ? { at } : {}) }, room: camSees(r, t).room };
    }
    if (Array.isArray(target)) return { target: { x: 0, y: 0 }, room: undefined, tile: target };
    const { room, tile } = spot(target, what, cameraRoom(t)); // for a place, the location only shapes an error
    const c = tileCenter(tile.tx, tile.ty);
    return { target: { x: c.x, y: c.y - 12 }, room };
  };
  /** The point a camera aims at for a tile of a location. */
  const tilePoint = (v: [number, number], what: string, room: Room): Pt => {
    const tile = checkTile(v, what, room);
    const c = tileCenter(tile.tx, tile.ty);
    return { x: c.x, y: c.y - 12 };
  };
  /** A room as an optional field, so that everything outside stays exactly as it was. */
  const inRoom = (room: Room): { room?: string } => (room === undefined ? {} : { room });
  /** What a camera beat adds when the camera changes location. */
  const moveNote = (room: Room, was: Room): string => (room === was ? '' : room === undefined ? ' (outside)' : ` (inside ${room})`);

  const checkZoom = (zoom: number | undefined): void => {
    if (zoom !== undefined && !(Number.isInteger(zoom) && zoom >= 1 && zoom <= 16)) throw new Error(`Camera zoom must be a whole number from 1 to 16, got ${zoom}.`);
  };

  // --- actor handles ------------------------------------------------------------------

  const makeActor = (character: string, o: ActorOpts): ActorHandle => {
    const def = art.characters[character];
    if (!def) throw unknownName('character', character, Object.keys(art.characters));
    const id = o.id ?? character;
    if (byId.has(id)) throw new Error(`There is already an actor "${id}". Give the second one an id: s.actor('${character}', { id: '${character}-2', at: ... }).`);
    if (o.facing && !DIRS.includes(o.facing)) throw unknownName('direction', o.facing, DIRS);
    const t0 = now();
    if (o.inside !== undefined) {
      loc(o.inside);
      if (!Array.isArray(o.at)) throw new Error(`s.actor('${character}'): "inside" is for a tile [tx, ty] of a room; for a place, name it "${o.inside}:<place>" instead.`);
    }
    const { room, tile } = standTile(o.at, t0, `s.actor('${character}')`, o.inside);
    const c = tileCenter(tile.tx, tile.ty);
    const segs: ActorSeg[] = [{ kind: 'place', start: t0, x: c.x, y: c.y, dir: o.facing ?? 'down', visible: !o.hidden, opacity: 1, ...inRoom(room) }];
    beat(t0, t0, `${o.hidden ? 'waits, hidden,' : 'appears'} at ${named(o.at, room)}`, id);

    const say = (kind: 'say' | 'think' | 'shout') => (text: string, opts: SayOpts = {}) => {
      checkSeconds(`${id}.${kind} hold`, opts.hold);
      const typeEnd = T.typeTime(text);
      const d = typeEnd + (opts.hold ?? T.readHold(text));
      const t = start(d);
      tl.bubbles.push({ actor: id, text, kind, start: t, typeEnd: t + typeEnd, end: t + d });
      beat(t, t + d, `${kind}s ${JSON.stringify(text)}`, id);
      // A standing speaker gestures while the words appear.
      if (opts.gesture !== false && def.poses?.talk && !r.seat && typeEnd > 0 && body(r, t).pose === 'idle') {
        insertByStart(r.segs, { kind: 'pose', start: t, end: t + typeEnd, name: 'talk' });
      }
    };
    /** Start a move or pose at the current time: stop any wander, get up from any seat. Returns [start, delay]. */
    const begin = (): [number, number] => {
      const t0 = now();
      touch(r, t0);
      const up = rise(r, t0);
      return [t0 + up, up];
    };
    /** Reserve time for a call on this actor and stop any wander at its start. */
    const start = (d: number): number => {
      const t = advance(d);
      touch(r, t);
      return t;
    };
    /** Walk to a goal tile of the location the actor is in at t. Returns the seconds it takes. */
    const walk = (goal: Tile, t: number, speed: number, face?: Dir): number => {
      const b = body(r, t);
      const map = loc(b.room);
      const seg = walkSeg(b, goal, t, speed, map);
      if (!seg) {
        const inside = b.room === undefined ? '' : ` (inside ${b.room})`;
        throw new Error(`${id} cannot walk from ${fmtTile(tileAt(b.x, b.y))} to ${fmtTile(goal)}${inside}. ${explainNoPath(map, tileAt(b.x, b.y), goal, art)}`);
      }
      if (face) seg.face = face;
      addMove(r, seg);
      return seg.end - t;
    };
    /** Where the actor is at t, for targets: an error when `room` is another location. */
    const sameRoom = (room: Room, t: number, what: string, target: string): void => {
      const mine = body(r, t).room;
      if (room !== mine) throw elsewhere(id, what, target, room, mine, t);
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
        const what = `${id}.walkTo`;
        const them = isHandle(target) ? rec(target, what) : undefined;
        const [t, up] = begin();
        const mine = body(r, t).room;
        if (them) {
          const theirs = body(them, t).room;
          if (theirs !== mine) {
            const e = elsewhere(id, what, them.handle.id, theirs, mine, t);
            throw new Error(`${e.message} If ${them.handle.id}'s move there is scripted later in the same s.together, script it first.`);
          }
          // Someone walking up to a wandering actor makes them stop and wait.
          touch(them, t);
          const me = body(r, t);
          const { tile, target: other } = besideActor(them, t, what, me);
          const goalPt = tileCenter(tile.tx, tile.ty);
          const face = dirBetween(goalPt, tileCenter(other.tx, other.ty));
          const d = up + walk(tile, t, speed, face);
          advance(d);
          beat(t - up, t - up + d, `walks to ${named(target)}`, id);
          return;
        }
        const goal = standTile(target, t, what, mine, id);
        sameRoom(goal.room, t, what, named(target, goal.room));
        const d = up + walk(goal.tile, t, speed);
        advance(d);
        beat(t - up, t - up + d, `walks to ${named(target, mine)}`, id);
      },
      face(dir) {
        const t = start(0);
        let d: Dir;
        if (isHandle(dir)) {
          const other = body(rec(dir, `${id}.face`), t);
          d = dirBetween(body(r, t), other);
        } else if (DIRS.includes(dir)) d = dir;
        else throw unknownName('direction', String(dir), DIRS, `(in ${id}.face; or pass an actor handle)`);
        const seg = { kind: 'face' as const, start: t, dir: d };
        insertByStart(r.segs, seg);
        // the other actor's track may not be written yet (a later branch of a `together`):
        // the direction is settled once the whole script has run
        if (isHandle(dir)) pendingFaces.push({ seg, self: r, other: rec(dir, `${id}.face`), t });
        beat(t, t, `faces ${isHandle(dir) ? dir.id : d}`, id);
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
        beat(t, t + d, `emotes ${name}`, id);
      },
      pose(name, opts = {}) {
        const poses = Object.keys(def.poses ?? {});
        if (!poses.includes(name)) throw unknownName('pose', name, poses, `(for character "${character}")`);
        checkSeconds(`${id}.pose hold`, opts.hold);
        const d = opts.hold ?? T.POSE_HOLD;
        const [t, up] = begin();
        insertByStart(r.segs, { kind: 'pose', start: t, end: t + d, name });
        advance(up + d);
        beat(t - up, t + d, `poses ${name}`, id);
      },
      sitOn(prop, seatName, opts = {}) {
        const what = `${id}.sitOn`;
        const speed = checkSpeed(opts.speed);
        checkSeconds(`${what} hold`, opts.hold);
        if (!def.poses?.sit) {
          throw new Error(`${id} cannot sit: character "${character}" has no "sit" pose. Its poses: ${Object.keys(def.poses ?? {}).join(', ') || 'none'}.`);
        }
        // a prop in a room is named "<building>:<prop>"
        const { room, local } = splitName(town, prop, (n) => town.props.some((p) => (p.id ?? p.kind) === n));
        const map = loc(room);
        const ids = map.props.map((p) => qualify(room, p.id ?? p.kind));
        const placed = map.props.find((p) => (p.id ?? p.kind) === local);
        if (!placed) {
          const mine = body(r, now()).room;
          const localIds = mine === undefined ? [] : loc(mine).props.map((p) => p.id ?? p.kind);
          throw unknownHere('prop', prop, room === undefined ? mine : undefined, localIds, ids, id, `(in ${what})`);
        }
        const pdef = art.props[placed.kind]!;
        const names = Object.keys(pdef.seats ?? {});
        if (names.length === 0) {
          const withSeats = map.props.filter((p) => Object.keys(art.props[p.kind]?.seats ?? {}).length > 0).map((p) => qualify(room, p.id ?? p.kind));
          throw new Error(`${what}: prop "${prop}" has no seats. Props with seats: ${withSeats.sort().join(', ') || 'none'}.`);
        }
        const name = seatName ?? names[0]!;
        const seat = pdef.seats![name];
        if (!seat) throw unknownName('seat', name, names, `(on prop "${prop}")`);
        sameRoom(room, now(), what, `prop "${prop}"`);
        const [t, up] = begin();
        const tile = map.places[`${local}.${name}`] ?? besideProp(placed, body(r, t), what, map);
        const t1 = t + walk(tile, t, speed);
        const from = tileCenter(tile.tx, tile.ty);
        const at = { x: placed.tx * TILE + seat.x, y: (placed.ty + 1) * TILE + seat.y };
        const t2 = t1 + T.SIT_MOVE;
        addMove(r, { kind: 'walk', start: t1, end: t2, points: [from, at], times: [t1, t2], dirs: [dirBetween(from, at)], face: seat.dir ?? 'down' });
        const pose: ActorSeg & { kind: 'pose' } = { kind: 'pose', start: t2, end: Infinity, name: 'sit' };
        insertByStart(r.segs, pose);
        const seating: Seating = { key: `${prop}.${name}`, prop, seats: names, actor: id, start: t1, end: Infinity };
        seatings.push(seating);
        r.seat = { tile, at, pose, seating };
        advance(up + (t2 - t) + (opts.hold ?? 0));
        beat(t - up, t2 + (opts.hold ?? 0), `sits on ${prop}.${name}`, id);
      },
      enter(prop, opts = {}) {
        const what = `${id}.enter`;
        const speed = checkSpeed(opts.speed);
        const tile = door(prop, what);
        const mine = body(r, now()).room;
        if (mine !== undefined) throw new Error(`${what}('${prop}'): ${id} is inside ${mine} at ${now().toFixed(2)}s. Use ${id}.exit('${mine}') first.`);
        const [t, up] = begin();
        const w = walk(tile, t, speed, 'up');
        const t1 = t + w;
        const room = town.interiors?.[prop];
        if (room) {
          // through the door: out of sight outside, into the room on its door place
          const c = roomDoor(prop);
          addMove(r, { kind: 'door', start: t1, end: t1 + T.DOOR_FADE, x: c.x, y: c.y, dir: 'up', room: prop });
        } else {
          insertByStart(r.segs, { kind: 'fade', start: t1, end: t1 + T.DOOR_FADE, from: 1, to: 0 });
          insertByStart(r.segs, { kind: 'visible', start: t1 + T.DOOR_FADE, visible: false, opacity: 1 });
        }
        advance(up + w + T.DOOR_FADE);
        beat(t - up, t1 + T.DOOR_FADE, `enters ${prop}`, id);
      },
      exit(prop, opts = {}) {
        const what = `${id}.exit`;
        const speed = checkSpeed(opts.speed);
        const tile = door(prop, what);
        const c = tileCenter(tile.tx, tile.ty);
        const mine = body(r, now()).room;
        if (mine === undefined) {
          // not inside: appear at the door, as if coming out
          rise(r, now());
          const t = start(T.DOOR_FADE);
          addMove(r, { kind: 'place', start: t, x: c.x, y: c.y, dir: 'down', visible: true, opacity: 0 });
          insertByStart(r.segs, { kind: 'fade', start: t, end: t + T.DOOR_FADE, from: 0, to: 1 });
          beat(t, t + T.DOOR_FADE, `comes out of ${prop}`, id);
          return;
        }
        if (mine !== prop) {
          // in at one door, out of another: they fade from the room they are in and in at this door
          rise(r, now());
          const t = start(T.DOOR_FADE);
          addMove(r, { kind: 'door', start: t, end: t + T.DOOR_FADE, x: c.x, y: c.y, dir: 'down' });
          beat(t, t + T.DOOR_FADE, `comes out of ${prop}`, id);
          return;
        }
        const [t, up] = begin();
        const d = roomDoor(prop);
        const b = body(r, t);
        const w = b.x === d.x && b.y === d.y ? 0 : walk(tileAt(d.x, d.y), t, speed, 'down');
        const t1 = t + w;
        addMove(r, { kind: 'door', start: t1, end: t1 + T.DOOR_FADE, x: c.x, y: c.y, dir: 'down' });
        advance(up + w + T.DOOR_FADE);
        beat(t - up, t1 + T.DOOR_FADE, `comes out of ${prop}`, id);
      },
      hide() {
        const t = start(0);
        insertByStart(r.segs, { kind: 'visible', start: t, visible: false });
        beat(t, t, 'hides', id);
      },
      show() {
        const t = start(0);
        insertByStart(r.segs, { kind: 'visible', start: t, visible: true });
        beat(t, t, 'shows', id);
      },
      teleport(target) {
        const mine = body(r, now()).room;
        rise(r, now());
        const t = start(0);
        const { room, tile } = standTile(target, t, `${id}.teleport`, mine, id);
        const c = tileCenter(tile.tx, tile.ty);
        addMove(r, { kind: 'place', start: t, x: c.x, y: c.y, ...inRoom(room) });
        beat(t, t, `teleports to ${named(target, room)}`, id);
      },
    };
    const r: ActorRec = { handle, segs };
    recs.set(handle, r);
    byId.set(id, r);
    tl.actors.push({ id, character, segs: [] });
    return handle;
  };

  // --- the builder --------------------------------------------------------------------

  /** A ramp that starts from wherever the value is at its start; `settleRamps` fills that in at the end. */
  const addRamp = <R extends Ramp>(list: R[], item: Omit<R, 'from'>): R => {
    const ramp = { ...item, from: Number.NaN } as R;
    insertByStart(list, ramp);
    return ramp;
  };
  /** Unfocus ramps keep dimming whoever was focused before them, found once the script is done. */
  const unfocusRamps = new Set<Ramp>();
  const actorIds = (actors: ActorHandle | ActorHandle[], what: string): string[] =>
    (Array.isArray(actors) ? actors : [actors]).map((a) => rec(a, what).handle.id);
  /**
   * What a label is on: an actor, or a point of a location. A tile is one of the location the
   * camera shows, left for after the script (`settleLabelTiles`).
   */
  const labelKey = (target: Target, what: string): { actor?: string; at?: Pt; room?: string; tile?: [number, number] } => {
    if (isHandle(target)) return { actor: rec(target, what).handle.id };
    if (Array.isArray(target)) return { tile: target };
    const { room, tile } = spot(target, what, cameraRoom(now())); // for a place, the location only shapes an error
    return { at: tileCenter(tile.tx, tile.ty), ...inRoom(room) };
  };
  /** Captions and labels as calls made them; `text: null` is a clear. Settled in scene time at the end. */
  const captions: { text: string | null; start: number; end: number; fadeIn: boolean }[] = [];
  const labels: { actor?: string; at?: Pt; room?: string; tile?: [number, number]; text: string | null; start: number; end: number }[] = [];
  /** Labels on a tile, with their beat and what to call them, settled once the camera is. */
  const tileLabels: { label: (typeof labels)[number]; beat: SceneBeat; text: (where: string) => string; what: string }[] = [];

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
      beat(t, t + d, `title ${JSON.stringify(text)}${subtitle !== undefined ? `, ${JSON.stringify(subtitle)}` : ''}`);
    },
    caption(text, opts = {}) {
      checkSeconds('s.caption hold', opts.hold);
      const t = advance(opts.hold ?? 0);
      captions.push({ text, start: t, end: opts.hold !== undefined ? t + opts.hold : Infinity, fadeIn: true });
      beat(t, t + (opts.hold ?? 0), `caption ${JSON.stringify(text)}`);
    },
    clearCaption() {
      const t = advance(0);
      captions.push({ text: null, start: t, end: t, fadeIn: false });
      beat(t, t, 'caption cleared');
    },
    camera: {
      cut(target, opts = {}) {
        checkZoom(opts.zoom);
        const t = advance(0);
        const to = camTarget(target, 's.camera.cut', t, t);
        const text = (room: Room) => `camera cuts to ${named(target, room)}${opts.zoom ? ` at zoom ${opts.zoom}` : ''}`;
        const seg: CameraSeg = { kind: 'cut', start: t, target: to.target, ...(opts.zoom ? { zoom: opts.zoom } : {}), ...inRoom(to.room) };
        insertByStart(tl.camera, seg);
        const actor = isHandle(target) ? rec(target, 's.camera.cut') : undefined;
        const call = { kind: 'cut' as const, beat: beat(t, t, text(to.room)), text, label: (room: Room) => named(target, room), what: 's.camera.cut', room: to.room };
        camCalls.set(seg, { ...call, ...(actor ? { actor } : {}), ...(to.tile ? { tile: to.tile } : {}) });
      },
      inside(building, opts = {}) {
        checkZoom(opts.zoom);
        const b = roomBounds(loc(building), art);
        const zoom = opts.zoom ?? fitZoom(b);
        const t = advance(0);
        insertByStart(tl.camera, { kind: 'cut', start: t, target: { x: b.x + b.w / 2, y: b.y + b.h / 2 }, zoom, room: building });
        beat(t, t, `camera cuts inside ${building} at zoom ${zoom}`);
      },
      outside(target, opts = {}) {
        checkZoom(opts.zoom);
        const t = advance(0);
        const zoomed = opts.zoom ? ` at zoom ${opts.zoom}` : '';
        if (target === undefined) {
          insertByStart(tl.camera, { kind: 'cut', start: t, target: { x: 0, y: 0 }, back: true, ...(opts.zoom ? { zoom: opts.zoom } : {}) });
          beat(t, t, `camera cuts back outside${zoomed}`);
          return;
        }
        // a tile is always a tile of the town; a place or an actor must be outside
        let to: { target: CamTarget; room: Room };
        if (Array.isArray(target)) to = { target: tilePoint(target, 's.camera.outside', undefined), room: undefined };
        else to = camTarget(target, 's.camera.outside', t, t);
        // a place in a room is wrong now; whether an actor is outside is checked once the script has run
        if (to.room !== undefined && !isHandle(target)) {
          throw new Error(`s.camera.outside: ${named(target)} is inside ${to.room} at ${t.toFixed(2)}s. Use s.camera.cut(...) to show a room, or name something outside.`);
        }
        const seg: CameraSeg = { kind: 'cut', start: t, target: to.target, ...(opts.zoom ? { zoom: opts.zoom } : {}) };
        insertByStart(tl.camera, seg);
        const text = () => `camera cuts outside to ${named(target)}${zoomed}`;
        const actor = isHandle(target) ? rec(target, 's.camera.outside') : undefined;
        camCalls.set(seg, { kind: 'outside', beat: beat(t, t, text()), text, label: () => named(target), what: 's.camera.outside', ...(actor ? { actor } : {}) });
      },
      pan(target, opts = {}) {
        checkZoom(opts.zoom);
        checkSeconds('s.camera.pan duration', opts.duration);
        const d = opts.duration ?? T.PAN;
        const t = advance(d);
        const to = camTarget(target, 's.camera.pan', t);
        // its location, and whether it would go through a wall, are settled once the script has run
        const seg: CameraSeg = { kind: 'pan', start: t, end: t + d, target: to.target, ...(opts.zoom ? { zoom: opts.zoom } : {}) };
        insertByStart(tl.camera, seg);
        const text = (room: Room) => `camera pans to ${named(target, room)}${opts.zoom ? ` at zoom ${opts.zoom}` : ''}`;
        const actor = isHandle(target) ? rec(target, 's.camera.pan') : undefined;
        const call = { kind: 'pan' as const, beat: beat(t, t + d, text(to.room)), text, label: (room: Room) => named(target, room), what: 's.camera.pan', room: to.room };
        camCalls.set(seg, { ...call, ...(actor ? { actor } : {}), ...(to.tile ? { tile: to.tile } : {}) });
      },
      follow(actor) {
        const r = actor === null ? null : rec(actor, 's.camera.follow');
        const id = r === null ? null : r.handle.id;
        const t = advance(0);
        const room = r === null ? cameraRoom(t) : camSees(r, t).room;
        const seg: CameraSeg = { kind: 'follow', start: t, actor: id, ...inRoom(room) };
        insertByStart(tl.camera, seg);
        const text = () => (id === null ? 'camera stops following' : `camera follows ${id}`);
        camCalls.set(seg, { kind: 'follow', beat: beat(t, t, text()), text, label: () => id ?? '', what: 's.camera.follow', ...(r ? { actor: r } : {}), room });
      },
    },
    timeOfDay(hour, opts = {}) {
      if (!(hour >= 0 && hour <= 24)) throw new Error(`s.timeOfDay: hour must be between 0 and 24, got ${hour}.`);
      checkSeconds('s.timeOfDay duration', opts.duration);
      const d = opts.duration ?? 0;
      const t = advance(d);
      addRamp(tl.hours, { start: t, end: t + d, to: hour });
      beat(t, t + d, `time of day ${d > 0 ? 'turns' : 'set'} to ${clock(hour)}`);
    },
    label(target, text) {
      const key = labelKey(target, 's.label');
      const t = advance(0);
      const label = { ...key, text, start: t, end: Infinity };
      labels.push(label);
      const words = (on: string) => `label ${JSON.stringify(text)} on ${on}`;
      const b = beat(t, t, words(named(target)));
      if (key.tile) tileLabels.push({ label, beat: b, text: words, what: 's.label' });
    },
    unlabel(target) {
      const key = labelKey(target, 's.unlabel');
      const t = advance(0);
      const label = { ...key, text: null, start: t, end: t };
      labels.push(label);
      const words = (from: string) => `label removed from ${from}`;
      const b = beat(t, t, words(named(target)));
      if (key.tile) tileLabels.push({ label, beat: b, text: words, what: 's.unlabel' });
    },
    link(a, b, opts = {}) {
      checkSeconds('s.link hold', opts.hold);
      const [from, to] = [rec(a, 's.link').handle.id, rec(b, 's.link').handle.id];
      const d = T.LINK_GROW + (opts.hold ?? T.LINK_HOLD);
      const t = advance(d);
      tl.links.push({ from, to, start: t, grow: T.LINK_GROW, end: t + d, ...(opts.slot ? { slot: opts.slot } : {}) });
      beat(t, t + d, `link from ${from} to ${to}`);
    },
    ring(actor, opts = {}) {
      checkSeconds('s.ring hold', opts.hold);
      const id = rec(actor, 's.ring').handle.id;
      const d = T.RING_GROW + (opts.hold ?? T.RING_HOLD);
      const t = advance(d);
      tl.rings.push({ actor: id, start: t, grow: T.RING_GROW, end: t + d, ...(opts.slot ? { slot: opts.slot } : {}) });
      beat(t, t + d, `ring around ${id}`);
    },
    focus(actors, opts = {}) {
      checkSeconds('s.focus duration', opts.duration);
      const ids = actorIds(actors, 's.focus');
      const d = opts.duration ?? T.FOCUS_RAMP;
      const t = advance(d);
      addRamp(tl.focus, { start: t, end: t + d, to: 1, actors: ids });
      beat(t, t + d, `focus on ${ids.join(', ')}`);
    },
    unfocus(opts = {}) {
      checkSeconds('s.unfocus duration', opts.duration);
      const d = opts.duration ?? T.FOCUS_RAMP;
      const t = advance(d);
      unfocusRamps.add(addRamp(tl.focus, { start: t, end: t + d, to: 0, actors: [] }));
      beat(t, t + d, 'focus off');
    },
    fadeIn(seconds) {
      checkSeconds('s.fadeIn', seconds);
      const d = seconds ?? T.FADE;
      const t = advance(d);
      // Fading in from the very start means the scene opens on ink.
      insertByStart(tl.fades, { start: t, end: t + d, from: 1, to: 0 });
      beat(t, t + d, 'fade in');
    },
    fadeOut(seconds) {
      checkSeconds('s.fadeOut', seconds);
      const d = seconds ?? T.FADE;
      const t = advance(d);
      addRamp(tl.fades, { start: t, end: t + d, to: 1 });
      beat(t, t + d, 'fade out');
    },
    wander(actor, opts) {
      const r = rec(actor, 's.wander');
      const radius = opts.radius ?? T.WANDER_RADIUS;
      if (!(Number.isInteger(radius) && radius >= 1)) throw new Error(`s.wander: radius must be a whole number of tiles >= 1, got ${radius}.`);
      const speed = opts.speed ?? T.WANDER_SPEED;
      if (!(speed > 0)) throw new Error(`s.wander: speed must be positive, got ${speed}.`);
      const t0 = advance(0);
      touch(r, t0);
      const t = t0 + rise(r, t0);
      const mine = body(r, t).room;
      const { room, tile: around } = standTile(opts.around, t, 's.wander', mine, r.handle.id);
      if (room !== mine) throw elsewhere(r.handle.id, 's.wander', named(opts.around, room), room, mine, t);
      const rng = createRng(`${seed}/${opts.seed ?? ''}/${r.handle.id}/${t}`);
      r.wander = { start: t, room, around, radius, speed, rng, free: t };
      beat(t, t, `wanders around ${named(opts.around, room)}`, r.handle.id);
    },
  };

  script(s);
  if (stack.length !== 1) throw new Error('Internal error: unbalanced together/sequence groups.');
  tl.duration = stack[0]!.cursor;
  // Everything is collected and sorted by scene time: now resolve what depends on what came before.
  for (const f of [...pendingFaces].sort((x, y) => x.t - y.t)) {
    const [me, them] = [body(f.self, f.t), body(f.other, f.t)];
    if (me.room !== them.room) {
      const [who, other] = [f.self.handle.id, f.other.handle.id];
      throw new Error(`${who}.face: ${other} is ${whereNow(them)}, but ${who} is ${whereNow(me)} at ${f.t.toFixed(2)}s. Turn to someone in the same place, or pass a direction.`);
    }
    f.seg.dir = dirBetween(me, them);
  }
  settleCameraCalls();
  settleRamps(tl.hours, hour0);
  settleRamps(tl.fades, 0);
  settleRamps(tl.focus, 0);
  // A bubble, emote, caption or label ends when the next one for the same speaker or spot starts.
  tl.bubbles = settleByKey(tl.bubbles, (b) => b.actor);
  tl.emotes = settleByKey(tl.emotes, (e) => e.actor);
  tl.captions = settleByKey(captions, () => '', (c) => (c.fadeIn = false))
    .filter((c) => c.text !== null)
    .map((c) => ({ ...c, text: c.text! }));
  tl.labels = settleByKey(labels, (l) => l.actor ?? `${l.room ?? ''}:${l.at!.x},${l.at!.y}`)
    .filter((l) => l.text !== null)
    .map((l) => ({ ...l, text: l.text! }));
  tl.focus.forEach((f, i) => {
    if (unfocusRamps.has(f)) f.actors = i > 0 ? tl.focus[i - 1]!.actors : [];
  });
  for (const r of recs.values()) {
    extendWander(r, tl.duration);
    tl.actors.find((a) => a.id === r.handle.id)!.segs = r.segs;
  }
  // Needs the final actor tracks: camera segments may point at actors.
  settleCamera(tl);
  checkSeats(seatings);

  return {
    title: opts.title,
    town,
    duration: tl.duration,
    fps: FPS,
    width: FRAME_W,
    height: FRAME_H,
    cast: [...new Set(tl.actors.map((a) => a.character))],
    art,
    // A stable sort: calls that start together stay in script order.
    beats: beats.sort((a, b) => a.start - b.start),
    frame: (t: number) => frameAt(tl, t),
  };

  /**
   * Once every track is written, in scene time: the location of each camera call on an actor,
   * the checks that depend on it (a pan through a wall, `outside` on someone inside), and the
   * beat text, which says when the camera changes location.
   */
  function settleCameraCalls(): void {
    let shown: Room;
    for (const seg of tl.camera) {
      const c = camCalls.get(seg);
      if (c) {
        const t = seg.start;
        const them = c.actor ? camSees(c.actor, t) : undefined;
        // a tile is a tile of the location the camera shows at that moment
        if (c.tile && seg.kind !== 'follow') {
          c.room = shown;
          seg.target = tilePoint(c.tile, c.what, shown);
        }
        const at = them ? them.room : c.room;
        const place = (r: Room): void => {
          if (r === undefined) delete seg.room;
          else seg.room = r;
        };
        if (c.kind === 'pan') {
          if (at !== shown) {
            throw new Error(
              `s.camera.pan: ${c.label(at)} is ${them ? whereNow(them) : where(at)}, but the camera shows ${where(shown)} at ${t.toFixed(2)}s. ` +
                `A pan cannot go through a wall: use s.camera.cut(...) instead.`,
            );
          }
          place(shown);
          c.beat.what = c.text(shown);
        } else if (c.kind === 'outside') {
          if (them && at !== undefined) {
            throw new Error(`s.camera.outside: ${c.label(at)} is ${whereNow(them)} at ${t.toFixed(2)}s. Use s.camera.cut(...) to show a room, or name something outside.`);
          }
        } else {
          place(c.kind === 'follow' && !c.actor ? shown : at);
          if (c.kind === 'cut' || c.actor) c.beat.what = c.text(at) + moveNote(seg.room, shown);
        }
      }
      shown = seg.room;
    }
    // labels on a tile: a tile of the location the camera shows when the label goes up
    for (const l of tileLabels) {
      const room = cameraRoom(l.label.start);
      const tile = checkTile(l.label.tile!, l.what, room);
      l.label.at = tileCenter(tile.tx, tile.ty);
      if (room !== undefined) l.label.room = room;
      delete l.label.tile;
      l.beat.what = l.text(named([tile.tx, tile.ty], room));
    }
  }
}
