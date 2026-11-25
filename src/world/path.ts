/** Pathfinding: A* on the 4-connected tile grid, plus a readable reason when there is no path. */
import { art as builtinArt } from '../art';
import type { ArtRegistry, Town } from '../core/types';
import { blockerAt, fmtTile, isWalkable, type Tile } from './grid';

/** Neighbour order is fixed (right, down, left, up), which keeps results deterministic. */
const STEPS: readonly [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

/** A binary min-heap of [priority..., payload] entries compared lexicographically. */
class Heap {
  private items: number[][] = [];
  get size(): number {
    return this.items.length;
  }
  private less(a: number[], b: number[]): boolean {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! < b[i]!;
    return false;
  }
  push(item: number[]): void {
    const it = this.items;
    it.push(item);
    let i = it.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(it[i]!, it[p]!)) break;
      [it[i], it[p]] = [it[p]!, it[i]!];
      i = p;
    }
  }
  pop(): number[] {
    const it = this.items;
    const top = it[0]!;
    const last = it.pop()!;
    if (it.length > 0) {
      it[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < it.length && this.less(it[l]!, it[m]!)) m = l;
        if (r < it.length && this.less(it[r]!, it[m]!)) m = r;
        if (m === i) break;
        [it[i], it[m]] = [it[m]!, it[i]!];
        i = m;
      }
    }
    return top;
  }
}

/**
 * The shortest walkable path between two tiles, moving in 4 directions, including both ends.
 * Among equally short paths it takes the one with the fewest turns, and ties after that are
 * broken by a fixed neighbour order, so the same query always returns the same path.
 * Returns null when either end is solid or outside the map, or no path exists.
 */
export function findPath(town: Town, from: Tile, to: Tile): Tile[] | null {
  if (!isWalkable(town, from.tx, from.ty) || !isWalkable(town, to.tx, to.ty)) return null;
  if (from.tx === to.tx && from.ty === to.ty) return [{ tx: from.tx, ty: from.ty }];
  const { w } = town;
  // Cost = steps * BIG + turns: shortest first, then straightest. Turns never exceed w * h.
  const BIG = w * town.h + 1;
  // A search state is a tile plus the direction we arrived from (4 = start, no direction).
  const n = w * town.h * 5;
  const cost = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heur = (i: number): number => (Math.abs((i % w) - to.tx) + Math.abs(Math.floor(i / w) - to.ty)) * BIG;
  const start = (from.ty * w + from.tx) * 5 + 4;
  cost[start] = 0;
  const open = new Heap();
  let seq = 0;
  open.push([heur(Math.floor(start / 5)), 0, seq++, start]);
  const goal = to.ty * w + to.tx;
  while (open.size > 0) {
    const [, g, , s] = open.pop() as [number, number, number, number];
    if (g > cost[s]!) continue;
    const tile = Math.floor(s / 5);
    const dir = s % 5;
    if (tile === goal) {
      const out: Tile[] = [];
      for (let c = s; c !== -1; c = prev[c]!) {
        const t = Math.floor(c / 5);
        out.push({ tx: t % w, ty: Math.floor(t / w) });
      }
      return out.reverse();
    }
    const tx = tile % w;
    const ty = Math.floor(tile / w);
    STEPS.forEach(([dx, dy], d) => {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!isWalkable(town, nx, ny)) return;
      const ns = (ny * w + nx) * 5 + d;
      const ng = g + BIG + (dir !== 4 && dir !== d ? 1 : 0);
      if (ng < cost[ns]!) {
        cost[ns] = ng;
        prev[ns] = s;
        open.push([ng + heur(ny * w + nx), ng, seq++, ns]);
      }
    });
  }
  return null;
}

/** Every walkable tile reachable from `from`, as a set of tile indices (ty * w + tx). */
export function reachable(town: Town, from: Tile): Set<number> {
  const seen = new Set<number>();
  if (!isWalkable(town, from.tx, from.ty)) return seen;
  const queue: Tile[] = [from];
  seen.add(from.ty * town.w + from.tx);
  while (queue.length > 0) {
    const { tx, ty } = queue.shift()!;
    for (const [dx, dy] of STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      const i = ny * town.w + nx;
      if (isWalkable(town, nx, ny) && !seen.has(i)) {
        seen.add(i);
        queue.push({ tx: nx, ty: ny });
      }
    }
  }
  return seen;
}

/**
 * Explain why there is no path from `from` to `to`, naming the tiles that block it, e.g.
 * `[14, 3] is solid: prop cafe.` or `[20, 5] is walled in by: [19, 5] water (solid terrain), ...`.
 */
export function explainNoPath(town: Town, from: Tile, to: Tile, art: ArtRegistry = builtinArt): string {
  for (const [end, t] of [['start', from], ['target', to]] as const) {
    if (!isWalkable(town, t.tx, t.ty)) return `The ${end} ${fmtTile(t)} is not walkable: ${blockerAt(town, t.tx, t.ty, art)}.`;
  }
  // The smaller of the two areas is the enclosed one; list the solid tiles around it.
  const a = reachable(town, from);
  const b = reachable(town, to);
  const [area, which, t] = a.size <= b.size ? [a, 'start', from] : [b, 'target', to];
  const walls: string[] = [];
  const seen = new Set<string>();
  for (const i of [...area].sort((p, q) => p - q)) {
    const tx = i % town.w;
    const ty = Math.floor(i / town.w);
    for (const [dx, dy] of STEPS) {
      const nx = tx + dx;
      const ny = ty + dy;
      const key = `${nx},${ny}`;
      if (isWalkable(town, nx, ny) || seen.has(key)) continue;
      seen.add(key);
      walls.push(`${fmtTile({ tx: nx, ty: ny })} ${blockerAt(town, nx, ny, art)}`);
    }
  }
  const shown = walls.slice(0, 12).join(', ') + (walls.length > 12 ? `, and ${walls.length - 12} more` : '');
  return `The ${which} ${fmtTile(t)} is in an enclosed area of ${area.size} tile(s), walled in by: ${shown}.`;
}
