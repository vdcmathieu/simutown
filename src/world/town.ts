/** `defineTown`: turn an ASCII map plus props into a validated Town with a collision grid. */
import { art as builtinArt } from '../art';
import type { ArtRegistry, PlacedProp, Town } from '../core/types';
import { blockerAt, fmtTile, inBounds } from './grid';
import { nearest, unknownName } from './names';

/** A prop to place: `at` is its origin tile, the bottom-left tile of its footprint. */
export interface PropSpec {
  /** Key into the art registry's props, e.g. 'lamp'. */
  kind: string;
  at: [number, number];
  /**
   * Instance name; its places are exposed as `<id>.<place>`.
   * Defaults to `kind`, or `kind-1`, `kind-2`, ... when several unnamed props share a kind.
   */
  id?: string;
}

/** What you write to define a town. */
export interface TownSpec {
  name: string;
  /** One character per tile, one line per row. Indentation and blank lines are ignored. */
  terrain: string;
  /** Maps each terrain character to a terrain id in the art registry. */
  legend: Record<string, string>;
  props?: PropSpec[];
  /** Extra named walkable tiles, e.g. `{ plaza: [6, 9] }`. */
  places?: Record<string, [number, number]>;
  /** True for a room, the inside of a building: lit by its own lamps, no sun, ink beyond its walls. */
  indoor?: boolean;
  /**
   * The rooms behind this town's doors, keyed by the id of the building prop each is the inside of.
   * Each room is a Town of its own (usually `indoor: true`) with a walkable place called `door`.
   * The building must have a `door` place outside. Scenes name what is inside as `<building>:<name>`.
   */
  interiors?: Record<string, Town>;
}

function parseGrid(spec: TownSpec, art: ArtRegistry): { w: number; h: number; terrain: string[] } {
  const rows = spec.terrain
    .split('\n')
    .map((r) => r.replace(/\s+/g, ''))
    .filter((r) => r.length > 0);
  if (rows.length === 0) throw new Error(`Town "${spec.name}": the terrain map is empty.`);
  const w = rows[0]!.length;
  const terrain: string[] = [];
  rows.forEach((row, ty) => {
    if (row.length !== w) {
      throw new Error(`Town "${spec.name}": terrain row ${ty} is ${row.length} tiles wide, expected ${w} like row 0.`);
    }
    for (let tx = 0; tx < w; tx++) {
      const ch = row[tx]!;
      const id = spec.legend[ch];
      if (id === undefined) {
        throw unknownName('terrain character', ch, Object.keys(spec.legend), `(at ${fmtTile({ tx, ty })}; add it to the legend)`);
      }
      terrain.push(id);
    }
  });
  for (const id of new Set(Object.values(spec.legend))) {
    if (!art.terrain[id]) throw unknownName('terrain id', id, Object.keys(art.terrain), `(in the legend of town "${spec.name}")`);
  }
  return { w, h: rows.length, terrain };
}

/**
 * Give every prop an id: its own, its kind, or kind-n when the kind repeats.
 * A generated kind-n never takes an id that is already in use (a prop given that id, or a
 * lone prop whose kind is literally "kind-n"): the number moves on to the next free one.
 */
function propIds(props: PropSpec[]): string[] {
  const unnamed = new Map<string, number>();
  for (const p of props) if (!p.id) unnamed.set(p.kind, (unnamed.get(p.kind) ?? 0) + 1);
  const taken = new Set<string>();
  for (const p of props) {
    if (p.id) taken.add(p.id);
    else if (unnamed.get(p.kind) === 1) taken.add(p.kind);
  }
  const next = new Map<string, number>();
  return props.map((p) => {
    if (p.id) return p.id;
    if (unnamed.get(p.kind) === 1) return p.kind;
    let n = (next.get(p.kind) ?? 0) + 1;
    while (taken.has(`${p.kind}-${n}`)) n++;
    next.set(p.kind, n);
    taken.add(`${p.kind}-${n}`);
    return `${p.kind}-${n}`;
  });
}

/**
 * Build a Town from a spec. Validates terrain, props and places, computes the `solid` grid
 * from solid terrain and prop footprints, and exposes each prop's places as `<id>.<place>`.
 * Every mistake throws an error that names the problem and lists what is valid.
 * `art` defaults to the built-in registry.
 */
export function defineTown(spec: TownSpec, art: ArtRegistry = builtinArt): Town {
  const { w, h, terrain } = parseGrid(spec, art);
  const solid = new Uint8Array(w * h);
  terrain.forEach((id, i) => {
    if (art.terrain[id]!.solid) solid[i] = 1;
  });

  const specs = spec.props ?? [];
  const ids = propIds(specs);
  const props: PlacedProp[] = [];
  const owner = new Map<number, string>();
  const town: Town = { name: spec.name, w, h, terrain, props, places: {}, solid };

  specs.forEach((p, i) => {
    const id = ids[i]!;
    const def = art.props[p.kind];
    if (!def) throw unknownName('prop kind', p.kind, Object.keys(art.props), `(prop "${id}")`);
    if (props.some((q) => q.id === id)) throw new Error(`Town "${spec.name}": two props are called "${id}". Give each a unique id.`);
    const [tx, ty] = p.at;
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) {
      throw new Error(`Prop "${id}" at ${fmtTile({ tx, ty })} must be on a whole tile: use integers, like [${Math.floor(tx)}, ${Math.floor(ty)}].`);
    }
    if (!inBounds(town, tx, ty)) {
      throw new Error(`Prop "${id}" at ${fmtTile({ tx, ty })} is outside the ${w}x${h} map (tiles [0, 0] to [${w - 1}, ${h - 1}]).`);
    }
    const fp = def.footprint;
    if (fp) {
      for (let dy = 0; dy < fp.h; dy++) {
        for (let dx = 0; dx < fp.w; dx++) {
          const x = tx + dx;
          const y = ty - dy;
          if (!inBounds(town, x, y)) {
            throw new Error(`Prop "${id}" (${p.kind}, ${fp.w}x${fp.h} tiles, growing right and up from ${fmtTile({ tx, ty })}) reaches ${fmtTile({ tx: x, ty: y })}, outside the ${w}x${h} map.`);
          }
          const other = owner.get(y * w + x);
          if (other) throw new Error(`Prop "${id}" overlaps prop "${other}" at ${fmtTile({ tx: x, ty: y })}.`);
          owner.set(y * w + x, id);
          solid[y * w + x] = 1;
        }
      }
    }
    props.push({ kind: p.kind, tx, ty, id });
  });

  const addPlace = (name: string, tx: number, ty: number, from: string): void => {
    if (town.places[name]) throw new Error(`Place "${name}" is defined twice (${from}).`);
    if (!Number.isInteger(tx) || !Number.isInteger(ty)) {
      throw new Error(`Place "${name}" at ${fmtTile({ tx, ty })} (${from}) must be on a whole tile: use integers, like [${Math.floor(tx)}, ${Math.floor(ty)}].`);
    }
    if (!inBounds(town, tx, ty)) throw new Error(`Place "${name}" at ${fmtTile({ tx, ty })} (${from}) is outside the ${w}x${h} map.`);
    if (solid[ty * w + tx]) {
      throw new Error(`Place "${name}" at ${fmtTile({ tx, ty })} (${from}) is on a solid tile: ${blockerAt(town, tx, ty, art)}. Places must be walkable.`);
    }
    town.places[name] = { tx, ty };
  };
  props.forEach((p) => {
    for (const [name, d] of Object.entries(art.props[p.kind]!.places ?? {})) {
      addPlace(`${p.id}.${name}`, p.tx + d.dx, p.ty + d.dy, `place "${name}" of prop "${p.id}"`);
    }
  });
  for (const [name, [tx, ty]] of Object.entries(spec.places ?? {})) addPlace(name, tx, ty, 'in places');
  if (spec.indoor) town.indoor = true;
  if (spec.interiors) town.interiors = checkInteriors(town, spec.interiors);
  return town;
}

/** Check that every room belongs to a building with a door, and has a `door` place of its own. */
function checkInteriors(town: Town, interiors: Record<string, Town>): Record<string, Town> {
  const withDoors = town.props.map((p) => p.id ?? p.kind).filter((id) => town.places[`${id}.door`]);
  for (const [key, room] of Object.entries(interiors)) {
    if (!withDoors.includes(key)) {
      const ids = town.props.map((p) => p.id ?? p.kind);
      const why = ids.includes(key) ? `prop "${key}" has no door place` : `there is no prop "${key}"`;
      const guess = nearest(key, withDoors);
      throw new Error(
        `Town "${town.name}": interiors.${key} cannot be a room: ${why}. ` +
          `Each key of interiors must be the id of a prop with a door place.${guess ? ` Did you mean "${guess}"?` : ''} ` +
          `Props with a door: ${[...withDoors].sort().join(', ') || 'none'}.`,
      );
    }
    if (!room || typeof room !== 'object' || !room.places) {
      throw new Error(`Town "${town.name}": interiors.${key} must be a room built with defineTown({ ..., indoor: true }).`);
    }
    if (!room.places.door) {
      throw unknownName('place', 'door', Object.keys(room.places), `(the room "${room.name}" for "${key}" needs a walkable place called door, just inside its entrance)`);
    }
    if (room.interiors && Object.keys(room.interiors).length > 0) {
      throw new Error(`Room "${room.name}" (interiors.${key}) has rooms of its own: rooms cannot be nested.`);
    }
  }
  return { ...interiors };
}
