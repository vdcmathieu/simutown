/**
 * Fringe selection: which soft terrain edges are drawn on a tile, and in what order.
 *
 * A terrain with a higher `priority` creeps onto its lower-priority neighbours. Its
 * `fringe.n` sprite is drawn ON the tile to its north, `fringe.e` on the tile to its
 * east, and so on. Three kinds of sprite exist:
 *
 * - edges (`n`, `e`, `s`, `w`): the tile touches the terrain across one of its sides;
 * - outer corners (`ne`, ...): the tile touches the terrain only diagonally, through
 *   neither of the two sides next to that corner;
 * - inner corners (`in-ne`, ...): the tile touches the terrain across two adjacent sides
 *   at once. The single inner sprite replaces that pair of edges, which rounds off concave
 *   bends. A terrain without the inner sprite gets the two edges instead.
 */
import type { Sprite } from '../core/sprite';
import type { FringeSide, TerrainDef, Town } from '../core/types';
import { hash2 } from './hash';

export interface FringeDraw {
  /** Id of the terrain that creeps in. */
  terrain: string;
  side: FringeSide;
  sprite: Sprite;
}

type Edge = 'n' | 'e' | 's' | 'w';

/** `dx, dy` point from the tile to the neighbour that owns the fringe: `n` means the terrain lies to the south. */
const EDGES: readonly { side: Edge; dx: number; dy: number }[] = [
  { side: 'n', dx: 0, dy: 1 },
  { side: 'e', dx: -1, dy: 0 },
  { side: 's', dx: 0, dy: -1 },
  { side: 'w', dx: 1, dy: 0 },
];

const OUTER: readonly { side: FringeSide; dx: number; dy: number }[] = [
  { side: 'ne', dx: -1, dy: 1 },
  { side: 'nw', dx: 1, dy: 1 },
  { side: 'se', dx: -1, dy: -1 },
  { side: 'sw', dx: 1, dy: -1 },
];

/** Each inner corner and the pair of edges it stands in for. */
const INNER: readonly { side: FringeSide; a: Edge; b: Edge }[] = [
  { side: 'in-ne', a: 'n', b: 'e' },
  { side: 'in-nw', a: 'n', b: 'w' },
  { side: 'in-se', a: 's', b: 'e' },
  { side: 'in-sw', a: 's', b: 'w' },
];

/** One sprite for a fringe side: arrays are interchangeable looks, picked by tile position. */
function pick(entry: Sprite | Sprite[] | undefined, tx: number, ty: number): Sprite | undefined {
  if (!Array.isArray(entry)) return entry;
  return entry.length === 0 ? undefined : entry[hash2(tx, ty) % entry.length];
}

function terrainAt(town: Town, tx: number, ty: number): string | undefined {
  if (tx < 0 || ty < 0 || tx >= town.w || ty >= town.h) return undefined;
  return town.terrain[ty * town.w + tx];
}

/** The fringes one terrain puts on tile (tx, ty): edges, then outer corners, then inner corners. */
function fringesOf(town: Town, id: string, def: TerrainDef, tx: number, ty: number): FringeDraw[] {
  const is = (dx: number, dy: number): boolean => terrainAt(town, tx + dx, ty + dy) === id;
  const touching = new Set(EDGES.filter((e) => is(e.dx, e.dy)).map((e) => e.side));
  // an edge is dropped only when every bend it is part of has an inner sprite to cover it
  const bends = new Map<Edge, { all: number; covered: number }>();
  const inner: FringeDraw[] = [];
  for (const { side, a, b } of INNER) {
    if (!touching.has(a) || !touching.has(b)) continue;
    const sprite = pick(def.fringe?.[side], tx, ty);
    for (const edge of [a, b]) {
      const count = bends.get(edge) ?? { all: 0, covered: 0 };
      count.all++;
      if (sprite) count.covered++;
      bends.set(edge, count);
    }
    if (sprite) inner.push({ terrain: id, side, sprite });
  }
  const out: FringeDraw[] = [];
  for (const { side } of EDGES) {
    const bend = bends.get(side);
    const sprite = pick(def.fringe?.[side], tx, ty);
    if (touching.has(side) && sprite && !(bend && bend.covered === bend.all)) out.push({ terrain: id, side, sprite });
  }
  for (const { side, dx, dy } of OUTER) {
    const sprite = pick(def.fringe?.[side], tx, ty);
    if (sprite && is(dx, dy) && !is(dx, 0) && !is(0, dy)) out.push({ terrain: id, side, sprite });
  }
  return [...out, ...inner];
}

/**
 * The fringes to draw on tile (tx, ty), in draw order: lowest priority first, so the
 * highest-priority terrain ends up on top. Unknown terrain neither gives nor receives fringes.
 */
export function fringesFor(town: Town, defs: Record<string, TerrainDef>, tx: number, ty: number): FringeDraw[] {
  const selfId = terrainAt(town, tx, ty);
  const self = selfId === undefined ? undefined : defs[selfId];
  if (!self) return [];
  const around = new Set<string>();
  for (const { dx, dy } of [...EDGES, ...OUTER]) {
    const id = terrainAt(town, tx + dx, ty + dy);
    const def = id === undefined ? undefined : defs[id];
    if (def?.fringe && id !== selfId && def.priority > self.priority) around.add(id!);
  }
  return [...around]
    .sort((a, b) => defs[a]!.priority - defs[b]!.priority || (a < b ? -1 : 1))
    .flatMap((id) => fringesOf(town, id, defs[id]!, tx, ty));
}
