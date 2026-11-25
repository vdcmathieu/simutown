/** Tiles, coordinates and collision queries on a Town. */
import { art as builtinArt } from '../art';
import { type ArtRegistry, TILE, type Town } from '../core/types';

/** A tile coordinate. x grows right, y grows down, [0, 0] is the top-left tile. */
export interface Tile {
  tx: number;
  ty: number;
}

/** The feet position (world pixels) of someone standing on tile (tx, ty). */
export function tileCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE + 8, y: ty * TILE + 12 };
}

/** The tile under a feet position: the inverse of `tileCenter`. */
export function tileAt(x: number, y: number): Tile {
  return { tx: Math.round((x - 8) / TILE), ty: Math.round((y - 12) / TILE) };
}

/** True when the tile is inside the map. */
export function inBounds(town: Town, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < town.w && ty < town.h;
}

/** True when the tile is inside the map and not solid. */
export function isWalkable(town: Town, tx: number, ty: number): boolean {
  return inBounds(town, tx, ty) && town.solid[ty * town.w + tx] === 0;
}

/** Format a tile as `[tx, ty]`, the way scripts write it. */
export function fmtTile(t: Tile): string {
  return `[${t.tx}, ${t.ty}]`;
}

/**
 * Why a tile blocks walking, in words: "outside the map", "water (solid terrain)",
 * "prop cafe", or "walkable" when it does not block.
 */
export function blockerAt(town: Town, tx: number, ty: number, art: ArtRegistry = builtinArt): string {
  if (!inBounds(town, tx, ty)) return 'outside the map';
  const terrain = town.terrain[ty * town.w + tx]!;
  if (art.terrain[terrain]?.solid) return `${terrain} (solid terrain)`;
  for (const p of town.props) {
    const fp = art.props[p.kind]?.footprint;
    if (fp && tx >= p.tx && tx < p.tx + fp.w && ty <= p.ty && ty > p.ty - fp.h) return `prop ${p.id ?? p.kind}`;
  }
  return town.solid[ty * town.w + tx] ? 'solid' : 'walkable';
}
