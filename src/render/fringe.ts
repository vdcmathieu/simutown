/**
 * Fringe selection: which soft terrain edges are drawn on a tile, and in what order.
 *
 * A terrain with a higher `priority` creeps onto its lower-priority neighbours. Its
 * `fringe.n` sprite is drawn ON the tile to its north, `fringe.e` on the tile to its
 * east, and so on. Corner sprites are for outer corners only: they are used when the tile
 * touches that terrain diagonally and through neither of the two edges next to the corner.
 */
import type { Sprite } from '../core/sprite';
import type { FringeSide, TerrainDef, Town } from '../core/types';

export interface FringeDraw {
  /** Id of the terrain that creeps in. */
  terrain: string;
  side: FringeSide;
  sprite: Sprite;
}

/** Edges first, then corners. `dx, dy` point from the tile to the neighbour that owns the fringe. */
const NEIGHBOURS: readonly { side: FringeSide; dx: number; dy: number }[] = [
  { side: 'n', dx: 0, dy: 1 }, // the tile is north of a neighbour that lies to its south
  { side: 'e', dx: -1, dy: 0 },
  { side: 's', dx: 0, dy: -1 },
  { side: 'w', dx: 1, dy: 0 },
  { side: 'ne', dx: -1, dy: 1 },
  { side: 'nw', dx: 1, dy: 1 },
  { side: 'se', dx: -1, dy: -1 },
  { side: 'sw', dx: 1, dy: -1 },
];

function terrainAt(town: Town, tx: number, ty: number): string | undefined {
  if (tx < 0 || ty < 0 || tx >= town.w || ty >= town.h) return undefined;
  return town.terrain[ty * town.w + tx];
}

/**
 * The fringes to draw on tile (tx, ty), in draw order: lowest priority first, so the
 * highest-priority terrain ends up on top. Unknown terrain neither gives nor receives fringes.
 */
export function fringesFor(town: Town, defs: Record<string, TerrainDef>, tx: number, ty: number): FringeDraw[] {
  const selfId = terrainAt(town, tx, ty);
  const self = selfId === undefined ? undefined : defs[selfId];
  if (!self) return [];
  const found: (FringeDraw & { priority: number; order: number })[] = [];
  NEIGHBOURS.forEach(({ side, dx, dy }, order) => {
    const id = terrainAt(town, tx + dx, ty + dy);
    const def = id === undefined ? undefined : defs[id];
    if (!def || id === selfId || def.priority <= self.priority) return;
    const sprite = def.fringe?.[side];
    if (!sprite) return;
    // an outer corner only counts when neither adjacent edge already brings this terrain in
    if (dx !== 0 && dy !== 0 && (terrainAt(town, tx + dx, ty) === id || terrainAt(town, tx, ty + dy) === id)) return;
    found.push({ terrain: id!, side, sprite, priority: def.priority, order });
  });
  found.sort((a, b) => a.priority - b.priority || (a.terrain < b.terrain ? -1 : a.terrain > b.terrain ? 1 : 0) || a.order - b.order);
  return found.map(({ terrain, side, sprite }) => ({ terrain, side, sprite }));
}
