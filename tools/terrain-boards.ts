/**
 * The review boards for tools/terrain-preview.ts: small towns built with `defineTown`
 * that put every terrain and every nature prop in front of the eye.
 */
import { type ActorState, TILE, type Town } from '../src/core/types';
import { defineTown, type PropSpec } from '../src/world';

export interface Board {
  town: Town;
  actors?: ActorState[];
  /** Render with shadows and the time-of-day grade. Default false. */
  lighting?: boolean;
  hour?: number;
}

/** Terrain characters shared by every board. */
export const LEGEND: Record<string, string> = {
  g: 'grass',
  m: 'meadow',
  t: 'tall-grass',
  '=': 'cobble',
  r: 'road',
  d: 'dirt',
  s: 'soil',
  a: 'sand',
  '~': 'water',
  b: 'basin',
  p: 'plank',
  P: 'plank-v',
};

/** A person standing on a tile, for scale. */
export function person(character: string, tx: number, ty: number, dir: ActorState['dir'] = 'down'): ActorState {
  return { id: `${character}@${tx},${ty}`, character, x: tx * TILE + 8, y: ty * TILE + 12, dir, pose: 'idle', animTime: 0 };
}

/** A grid of big blocks, one per terrain character, with a strip of grass between them. */
function blocks(chars: string[], perRow: number, bw: number, bh: number): string {
  const rows: string[] = [];
  for (let i = 0; i < chars.length; i += perRow) {
    const line = chars.slice(i, i + perRow).map((c) => c.repeat(bw)).join('g');
    rows.push('g'.repeat(line.length + 2));
    for (let y = 0; y < bh; y++) rows.push(`g${line}g`);
  }
  rows.push('g'.repeat(rows[0]!.length));
  return rows.join('\n');
}

/** One big field of every ground material: large areas must stay calm and show no grid. */
function fields(): Board {
  const terrain = blocks(['g', 'm', 't', '=', 'r', 'd', 's', 'a', 'p', 'P', '~', 'b'], 4, 9, 6);
  const actors = [person('ana', 5, 4), person('tomas', 15, 4), person('mira', 25, 4), person('ana', 5, 11), person('tomas', 15, 11), person('mira', 25, 18)];
  return { town: defineTown({ name: 'fields', terrain, legend: LEGEND }), actors };
}

/** A whole frame of lawn, the size a scene shows. */
function lawn(): Board {
  const terrain = Array.from({ length: 17 }, () => 'g'.repeat(30)).join('\n');
  const props: PropSpec[] = [];
  return { town: defineTown({ name: 'lawn', terrain, legend: LEGEND, props }), actors: [person('ana', 8, 8), person('tomas', 20, 5)] };
}

export const boards: Record<string, () => Board> = { fields, lawn };
