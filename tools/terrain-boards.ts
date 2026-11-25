/**
 * The review boards for tools/terrain-preview.ts: small towns built with `defineTown`
 * that put every terrain and every nature prop in front of the eye.
 */
import { natureProps } from '../src/art';
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

/**
 * Every pair of terrains that may touch, touching. Bands from the top: each material as an
 * island in the lawn; water with its neighbours; islands in the paving; islands in the
 * road; a stream with a bridge, beds along a path and a boardwalk over a beach.
 */
function pairs(): Board {
  const terrain = `
    gggggggggggggggggggggggggggggggggggggggggggg
    gg===ggggrrrgggggdddggggsssgggggaaagggggtttg
    gg=====ggrrrrrgggdgggggssssssgggaaaaagggtttg
    gg=====ggrrrrrgggdddgggssssssgggaaaaaggttttg
    gg===ggggrrrgggggggdgggsssgggggggaaaggggttgg
    gggggggggggggggggggdgggggggggggggggggggggggg
    gggggggggggggggggggggggggggggggggggggggggggg
    ggg~~~ggggbbbbgggppppggggmmmmmggttt~~~gggggg
    gg~~~~~gggbbbbgggppppggggmmmmmggtt~~~~~ggggg
    gg~~~~~~ggbbbbgggppPPPgggmmmmmmmt~~~~~aaaggg
    ggg~~~~~gggggggggggPPPgggggmmmmgg~~~~~aaaagg
    gggg~~~ggggggggggggggggggggggggggg~~~aaaaagg
    gggggggggggggggggggggggggggggggggggggggggggg
    g==========================================g
    g==rrrrrrrrrrrr===sss====bbbb===aaaa==ppp==g
    g==rrrrrrrrrrrr===sss====bbbb==aaaaa==ppp==g
    g==rrrr========================aaa=========g
    g==rrrr==d=================================g
    gggrrrrggdgggggggggggggggggggggggggggggggggg
    grrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrg
    grrrsssrrrrbbbbrrrraaarrrrppprrrrrrrrrrrrrrg
    grrrsssrrrrbbbbrrrraaaarrrppprrrrrrrrrrrrrrg
    grrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrg
    ggggggdggg~~gggggggggggggggggggggggggggggggg
    ggggggdggg~~gggggggsssgsssggggggaaaaaaaggggg
    gddddddddPPPPdddddddddddddddddaaaapppaaagggg
    ggggggggg~~ggggggggsssgsssggggggaaapaaaagggg
    ggggggggg~~ggggggggggggggggggggggggpgggggggg
    gggggggg~~~ggggggggggggggggggggggggggggggggg
  `;
  return { town: defineTown({ name: 'pairs', terrain, legend: LEGEND }), actors: [person('ana', 11, 25, 'right'), person('tomas', 35, 25)] };
}

/**
 * Every nature prop on the lawn, in registry order, in rows 40 tiles wide, with a person
 * at the start of each row for scale. Water plants get a pond tile under them.
 */
function props(): Board {
  const W = 40;
  const placed: PropSpec[] = [];
  const wet: [number, number][] = [];
  const actors: ActorState[] = [];
  const cast = ['ana', 'tomas', 'mira'];
  let tx = 3;
  let ty = 4;
  let rowH = 0;
  const startRow = (): void => {
    actors.push(person(cast[actors.length % cast.length]!, 1, ty));
  };
  startRow();
  for (const [kind, def] of Object.entries(natureProps)) {
    const s = def.sprite;
    const left = Math.ceil(s.ax / TILE);
    const right = Math.max(def.footprint?.w ?? 1, Math.ceil((s.w - s.ax) / TILE));
    if (tx + left + right + 1 > W) {
      tx = 3;
      ty += rowH + 1;
      rowH = 0;
      startRow();
    }
    placed.push({ kind, at: [tx + left, ty] });
    if (WATER_PLANTS.test(kind)) wet.push([tx + left, ty]);
    rowH = Math.max(rowH, Math.ceil(s.ay / TILE));
    tx += left + right + 1;
  }
  const H = ty + 2;
  const rows = Array.from({ length: H }, () => Array.from({ length: W }, () => 'g'));
  for (const [x, y] of wet) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) rows[y + dy]![x + dx] = '~';
  const terrain = rows.map((r) => r.join('')).join('\n');
  return { town: defineTown({ name: 'props', terrain, legend: LEGEND, props: placed }), actors };
}

/** Props that live on the water. */
const WATER_PLANTS = /^(lily|reeds|lotus|water)/;

export const boards: Record<string, () => Board> = { fields, lawn, pairs, props };
