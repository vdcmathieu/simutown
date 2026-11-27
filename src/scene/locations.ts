/**
 * Locations: the town outside, or one of its rooms. Every actor is in one location at a
 * time, and the camera shows one. A location is named by its room key (the id of the
 * building it is the inside of), or `undefined` for outside.
 * Scripts name what is inside a room as "<building>:<name>", e.g. "bakery:counter.front".
 */
import { type ArtRegistry, FRAME_H, FRAME_W, TILE, type Town } from '../core/types';
import type { Tile } from '../world/grid';
import { unknownName } from '../world/names';

/** A location: a room key, or undefined for the town outside. */
export type Room = string | undefined;

/** The keys of a town's rooms. */
export function roomKeys(town: Town): string[] {
  return Object.keys(town.interiors ?? {});
}

/** The map of a location: the town itself outside, else the room. Throws on an unknown room. */
export function locationTown(town: Town, room: Room): Town {
  if (room === undefined) return town;
  const inside = town.interiors?.[room];
  if (!inside) {
    const rooms = roomKeys(town).sort();
    if (town.places[`${room}.door`]) {
      throw new Error(`"${room}" has a door but no room. Buildings with rooms: ${rooms.join(', ') || 'none'}.`);
    }
    throw unknownName('room', room, rooms, rooms.length ? '' : `(town "${town.name}" has no interiors)`);
  }
  return inside;
}

/** "outside" or "inside bakery", for messages. */
export function where(room: Room): string {
  return room === undefined ? 'outside' : `inside ${room}`;
}

/** A name in a location as scripts write it: "plaza" outside, "bakery:door" in a room. */
export function qualify(room: Room, name: string): string {
  return room === undefined ? name : `${room}:${name}`;
}

/** Every place a script can name: the town's own, then every room's as "<building>:<place>". */
export function allPlaces(town: Town): string[] {
  const names = Object.keys(town.places);
  for (const [room, inside] of Object.entries(town.interiors ?? {})) {
    for (const p of Object.keys(inside.places)) names.push(qualify(room, p));
  }
  return names;
}

/**
 * Split a qualified name "<building>:<name>" into its room and local name. A name without
 * a colon, or one the town itself defines, is outside. An unknown building throws.
 */
export function splitName(town: Town, name: string, own: (n: string) => boolean): { room: Room; local: string } {
  const i = name.indexOf(':');
  if (i < 0 || own(name)) return { room: undefined, local: name };
  const room = name.slice(0, i);
  locationTown(town, room);
  return { room, local: name.slice(i + 1) };
}

/** A place by name, outside or in a room, or undefined when there is no such place. */
export function findPlace(town: Town, name: string): { room: Room; tile: Tile } | undefined {
  const { room, local } = splitName(town, name, (n) => n in town.places);
  const tile = locationTown(town, room).places[local];
  return tile ? { room, tile } : undefined;
}

/** A rectangle in world pixels. */
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The part of a room's map that is the room: everything but the `outside` ground around
 * its walls (the ink). The whole map when there is no such ground, or nothing else.
 */
export function roomBounds(room: Town, art: ArtRegistry): Bounds {
  let [x0, y0, x1, y1] = [room.w, room.h, -1, -1];
  room.terrain.forEach((id, i) => {
    if (art.terrain[id]?.outside) return;
    const [tx, ty] = [i % room.w, Math.floor(i / room.w)];
    [x0, y0, x1, y1] = [Math.min(x0, tx), Math.min(y0, ty), Math.max(x1, tx), Math.max(y1, ty)];
  });
  if (x1 < 0) return { x: 0, y: 0, w: room.w * TILE, h: room.h * TILE };
  return { x: x0 * TILE, y: y0 * TILE, w: (x1 - x0 + 1) * TILE, h: (y1 - y0 + 1) * TILE };
}

/** The largest whole zoom at which a rectangle of the world fits the frame (at least 1). */
export function fitZoom(b: Bounds): number {
  let zoom = 1;
  while (zoom < 16 && b.w * (zoom + 1) <= FRAME_W && b.h * (zoom + 1) <= FRAME_H) zoom++;
  return zoom;
}
