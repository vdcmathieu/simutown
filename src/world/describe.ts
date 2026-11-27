/** `describeTown`: a plain-text map, so an author who cannot see the picture can plan a scene. */
import { art as builtinArt } from '../art';
import type { ArtRegistry, Town } from '../core/types';
import { fmtTile } from './grid';

const PLACE_MARKS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@$%&+=?!<>^~;:"\'`_|/\\(){}[]';
const SPARE_MARKS = '.,:;=~-+%&^"\'`_|/\\<>(){}[]$';
/** Marks a tile whose places ran past the last free marker; the list says which. */
const OVERFLOW_MARK = '*';

/** Pick one distinct map character per terrain id: its first free lowercase letter, else a symbol. */
function terrainMarks(ids: string[]): Map<string, string> {
  const marks = new Map<string, string>();
  const used = new Set<string>(['#']);
  for (const id of ids) {
    const letters = [...id.toLowerCase()].filter((c) => /[a-z]/.test(c));
    let mark = letters.find((c) => !used.has(c)) ?? [...SPARE_MARKS].find((c) => !used.has(c)) ?? '?';
    used.add(mark);
    marks.set(id, mark);
  }
  return marks;
}

/**
 * A plain-text description of a town: size, an ASCII map with column and row numbers,
 * a legend, the props a scene can use (doors, seats, places) with their footprints, the rest
 * folded into a count of scenery, and every place name with its tile.
 * On the map, `#` is a prop footprint and each tile with places has its own mark;
 * `<who>.home` places are grouped under the door they share.
 * The town's rooms follow, each with its own map, props and places under their
 * qualified names (`bakery:door`), as scenes write them.
 */
export function describeTown(town: Town, art: ArtRegistry = builtinArt): string {
  const parts = [describeMap(town, art, '')];
  const rooms = Object.entries(town.interiors ?? {});
  if (rooms.length > 0) {
    parts.push(
      [
        `Rooms: ${rooms.map(([b]) => b).join(', ')}.`,
        'Each room has its own tiles, starting at [0, 0]. Go in with actor.enter(building) and out with actor.exit(building);',
        'name what is inside as "<building>:<name>", e.g. "' + `${rooms[0]![0]}:door` + '".',
      ].join('\n'),
    );
    for (const [building, room] of rooms) parts.push(`Room ${building} (inside prop "${building}")\n` + describeMap(room, art, `${building}:`));
  }
  return parts.join('\n\n');
}

/** The place names of one map, grouped as the list prints them. */
interface PlaceGroups {
  /** One entry per tile that has places other than homes, in name order: its names and its map marker. */
  tiles: { names: string[]; tile: { tx: number; ty: number }; mark: string }[];
  /** `<who>.home` places, grouped by tile, with the other places on that tile (usually a door). */
  homes: { who: string[]; tile: { tx: number; ty: number }; door: string[] }[];
}

/**
 * Group places by tile, so each tile gets one marker, and set the homes apart:
 * a `<who>.home` is the door of that person's house, so the door's marker serves.
 * `taken` are characters already used on the map (terrain), which a marker must not reuse.
 */
function groupPlaces(town: Town, taken: Set<string>): PlaceGroups {
  const free = [...PLACE_MARKS].filter((c) => !taken.has(c));
  const key = (p: { tx: number; ty: number }): number => p.ty * town.w + p.tx;
  const names = Object.keys(town.places).sort((a, b) => a.localeCompare(b));
  const isHome = (n: string): boolean => n.endsWith('.home');
  const tiles: PlaceGroups['tiles'] = [];
  const byTile = new Map<number, PlaceGroups['tiles'][number]>();
  for (const n of names.filter((n) => !isHome(n))) {
    const tile = town.places[n]!;
    let g = byTile.get(key(tile));
    if (!g) {
      g = { names: [], tile, mark: free[tiles.length] ?? OVERFLOW_MARK };
      byTile.set(key(tile), g);
      tiles.push(g);
    }
    g.names.push(n);
  }
  const homes: PlaceGroups['homes'] = [];
  const homeAt = new Map<number, PlaceGroups['homes'][number]>();
  for (const n of names.filter(isHome)) {
    const tile = town.places[n]!;
    let h = homeAt.get(key(tile));
    if (!h) {
      h = { who: [], tile, door: byTile.get(key(tile))?.names ?? [] };
      homeAt.set(key(tile), h);
      homes.push(h);
    }
    h.who.push(n.slice(0, -'.home'.length));
  }
  // a home on a tile with no other place still needs a marker
  for (const h of homes) {
    if (!byTile.has(key(h.tile))) {
      const g = { names: [] as string[], tile: h.tile, mark: free[tiles.length] ?? OVERFLOW_MARK };
      byTile.set(key(h.tile), g);
      tiles.push(g);
    }
  }
  return { tiles, homes };
}

/**
 * Whether a prop is something a scene can use: a door to go through, a seat, or named
 * places around it. The rest (grass tufts, flowers, hedge segments, lamps) is scenery.
 */
function usable(kind: string, art: ArtRegistry): boolean {
  const def = art.props[kind];
  return !def || Object.keys(def.places ?? {}).length > 0 || Object.keys(def.seats ?? {}).length > 0;
}

/** One map: its size, the ASCII map, legend, props and places. Names get `prefix` (`bakery:` in a room). */
function describeMap(town: Town, art: ArtRegistry, prefix: string): string {
  const ids = [...new Set(town.terrain)];
  const marks = terrainMarks(ids);
  const grid = town.terrain.map((id) => marks.get(id)!);
  for (let i = 0; i < grid.length; i++) {
    if (town.solid[i] && !art.terrain[town.terrain[i]!]?.solid) grid[i] = '#';
  }
  const { tiles, homes } = groupPlaces(town, new Set(marks.values()));
  for (const g of tiles) grid[g.tile.ty * town.w + g.tile.tx] = g.mark;
  const markAt = new Map(tiles.map((g) => [g.tile.ty * town.w + g.tile.tx, g.mark]));

  const lines: string[] = [];
  lines.push(`${town.name}${town.indoor ? ' (indoors)' : ''}: ${town.w} x ${town.h} tiles. x grows right, y grows down, [0, 0] is the top-left tile.`);
  lines.push('');
  const pad = String(town.h - 1).length;
  const head = (f: (x: number) => string): string => ' '.repeat(pad + 1) + Array.from({ length: town.w }, (_, x) => f(x)).join('');
  if (town.w > 10) lines.push(head((x) => (x % 10 === 0 ? String(Math.floor(x / 10) % 10) : ' ')));
  lines.push(head((x) => String(x % 10)));
  for (let ty = 0; ty < town.h; ty++) {
    lines.push(`${String(ty).padStart(pad)} ${grid.slice(ty * town.w, (ty + 1) * town.w).join('')}`);
  }
  lines.push('');
  lines.push('Legend:');
  for (const id of ids) lines.push(`  ${marks.get(id)} ${id}${art.terrain[id]?.solid ? ' (solid)' : ''}`);
  lines.push('  # prop footprint (solid)');
  if (tiles.length > 0) lines.push('  any other mark is a place, listed under Places');
  if (tiles.some((g) => g.mark === OVERFLOW_MARK)) lines.push(`  ${OVERFLOW_MARK} a place past the last free marker (see the list)`);
  lines.push('');
  const used = town.props.filter((p) => usable(p.kind, art));
  const scenery = town.props.filter((p) => !usable(p.kind, art));
  lines.push('Props with doors, seats or places (origin = bottom-left tile of the footprint):');
  if (used.length === 0) lines.push('  none');
  for (const p of used) {
    const fp = art.props[p.kind]?.footprint;
    const size = fp ? `, footprint ${fp.w}x${fp.h} tiles` : ', no footprint (walkable)';
    lines.push(`  ${prefix}${p.id ?? p.kind} (${p.kind}) at ${fmtTile(p)}${size}`);
  }
  if (scenery.length > 0) {
    const count = new Map<string, number>();
    for (const p of scenery) count.set(p.kind, (count.get(p.kind) ?? 0) + 1);
    const kinds = [...count].sort(([a, m], [b, n]) => n - m || a.localeCompare(b)).map(([k, n]) => (n > 1 ? `${n} ${k}` : k));
    lines.push(`Scenery, ${scenery.length} more props (solid ones show as # on the map): ${kinds.join(', ')}.`);
  }
  lines.push('');
  lines.push('Places (walkable tiles you can use as targets):');
  if (tiles.length === 0) lines.push('  none');
  for (const g of tiles) {
    if (g.names.length === 0) continue;
    const [first, ...rest] = g.names.map((n) => prefix + n);
    lines.push(`  ${g.mark} ${first} ${fmtTile(g.tile)}${rest.length > 0 ? ` (same tile: ${rest.join(', ')})` : ''}`);
  }
  if (homes.length > 0) {
    lines.push('');
    lines.push('Homes ("<who>.home", e.g. ' + `"${prefix}${homes[0]!.who[0]}.home"` + '):');
    for (const h of homes) {
      const at = h.door.length > 0 ? `at ${prefix}${h.door[0]} ${fmtTile(h.tile)}` : `at ${fmtTile(h.tile)}`;
      lines.push(`  ${markAt.get(h.tile.ty * town.w + h.tile.tx)} ${h.who.join(', ')} ${at}`);
    }
  }
  return lines.join('\n');
}
