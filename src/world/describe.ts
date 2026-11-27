/** `describeTown`: a plain-text map, so an author who cannot see the picture can plan a scene. */
import { art as builtinArt } from '../art';
import type { ArtRegistry, Town } from '../core/types';
import { fmtTile } from './grid';

const PLACE_MARKS = '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SPARE_MARKS = '.,:;=~-+%&^"\'`_|/\\<>(){}[]$';

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
 * a legend, the props with their footprints, and every place name with its tile.
 * On the map, `#` is a prop footprint and digits or capitals mark places.
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

/** One map: its size, the ASCII map, legend, props and places. Names get `prefix` (`bakery:` in a room). */
function describeMap(town: Town, art: ArtRegistry, prefix: string): string {
  const ids = [...new Set(town.terrain)];
  const marks = terrainMarks(ids);
  const grid = town.terrain.map((id) => marks.get(id)!);
  for (let i = 0; i < grid.length; i++) {
    if (town.solid[i] && !art.terrain[town.terrain[i]!]?.solid) grid[i] = '#';
  }
  const places = Object.entries(town.places).sort(([a], [b]) => a.localeCompare(b));
  places.forEach(([, p], i) => {
    grid[p.ty * town.w + p.tx] = PLACE_MARKS[i] ?? '*';
  });

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
  lines.push('');
  lines.push('Props (origin = bottom-left tile of the footprint):');
  if (town.props.length === 0) lines.push('  none');
  for (const p of town.props) {
    const fp = art.props[p.kind]?.footprint;
    const size = fp ? `, footprint ${fp.w}x${fp.h} tiles` : ', no footprint (walkable)';
    lines.push(`  ${prefix}${p.id ?? p.kind} (${p.kind}) at ${fmtTile(p)}${size}`);
  }
  lines.push('');
  lines.push('Places (walkable tiles you can use as targets):');
  if (places.length === 0) lines.push('  none');
  places.forEach(([name, p], i) => lines.push(`  ${PLACE_MARKS[i] ?? '*'} ${prefix}${name} ${fmtTile(p)}`));
  return lines.join('\n');
}
