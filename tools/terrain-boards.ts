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
    ggggggdggggggggggggggggggggggggggggggggggggg
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

/** A terrain map painted in spans, then handed to `defineTown` as text. */
class Painter {
  private readonly rows: string[][];
  constructor(w: number, h: number, ch: string) {
    this.rows = Array.from({ length: h }, () => Array.from({ length: w }, () => ch));
  }
  /** Paint `ch` on row `y` from column `x0` to `x1`, both included. */
  span(ch: string, y: number, x0: number, x1: number): this {
    for (let x = x0; x <= x1; x++) this.rows[y]![x] = ch;
    return this;
  }
  /** Paint several rows at once: one [x0, x1] pair per row, starting at row `y`. */
  blob(ch: string, y: number, spans: [number, number][]): this {
    spans.forEach(([x0, x1], i) => this.span(ch, y + i, x0, x1));
    return this;
  }
  rect(ch: string, x0: number, y0: number, x1: number, y1: number): this {
    for (let y = y0; y <= y1; y++) this.span(ch, y, x0, x1);
    return this;
  }
  text(): string {
    return this.rows.map((r) => r.join('')).join('\n');
  }
}

/** `kind` on every tile of a list. */
function each(kind: string, tiles: [number, number][]): PropSpec[] {
  return tiles.map((at) => ({ kind, at }));
}

/**
 * A small town: a wood and tall grass in the north-west, a paved square with a basin, a
 * road that crosses a stream on a plank bridge, a hedged kitchen garden and an orchard in
 * the south-west, a park with a willow by its pond, and a lake with a beach and a jetty.
 */
function town(): Board {
  const m = new Painter(40, 26, 'g');
  // the wood's undergrowth
  m.blob('t', 1, [[4, 7], [3, 8], [2, 7], [3, 5]]);
  // the square and its basin
  m.blob('=', 2, [[14, 23], [13, 24]]).rect('=', 12, 4, 25, 8).rect('b', 16, 5, 19, 7);
  // the road, and the bridge over the stream (it starts one tile inland on each bank)
  m.rect('r', 0, 9, 39, 10).rect('P', 30, 9, 33, 10);
  // the stream, widening into a lake
  m.blob('~', 0, [[32, 33], [32, 33], [32, 33], [31, 33], [31, 32], [31, 32], [31, 32], [31, 32], [31, 32]]);
  m.blob('~', 11, [[31, 32], [31, 32], [30, 33], [29, 34], [28, 35], [28, 35], [28, 35], [28, 35], [28, 35], [29, 35], [30, 34], [31, 33]]);
  // the beach on its east shore, and the jetty
  m.blob('a', 14, [[35, 37], [36, 38], [36, 38], [36, 38], [36, 38], [36, 38], [36, 38], [35, 37], [34, 36]]);
  m.span('P', 17, 33, 36);
  // a meadow in the north-east
  m.blob('m', 2, [[36, 38], [35, 38], [35, 39], [36, 39], [36, 38]]);
  // the park: a meadow and a pond
  m.blob('m', 12, [[18, 23], [16, 25], [15, 26], [15, 25], [17, 23]]);
  m.blob('~', 17, [[19, 22], [18, 23], [18, 23], [19, 21]]);
  // the garden path, wandering on to the park
  m.rect('d', 6, 11, 6, 20).span('d', 20, 6, 9).rect('d', 9, 20, 9, 22).span('d', 22, 9, 14).rect('d', 14, 21, 14, 22).span('d', 21, 14, 16);
  // four beds
  for (const [x, y] of [[2, 13], [8, 13], [2, 16], [8, 16]] as const) m.rect('s', x, y, x + 2, y + 1);

  const props: PropSpec[] = [
    { kind: 'townhouse', at: [13, 4] },
    { kind: 'house', at: [20, 4] },
    { kind: 'lamp', at: [14, 8] },
    { kind: 'bench', at: [21, 8] },
    // the wood
    ...each('pine', [[1, 2], [5, 1], [9, 3], [0, 7]]),
    ...each('oak', [[3, 6], [28, 6]]),
    ...each('tree', [[7, 5], [10, 7], [27, 1], [38, 12]]),
    { kind: 'log', at: [5, 7] },
    { kind: 'stump', at: [8, 7] },
    { kind: 'rock', at: [1, 5] },
    ...each('fern', [[4, 4], [2, 3], [9, 5]]),
    { kind: 'mushrooms', at: [6, 3] },
    { kind: 'mushrooms-brown', at: [4, 7] },
    { kind: 'leaves', at: [2, 7] },
    { kind: 'leaves', at: [4, 5] },
    ...each('sapling', [[2, 8], [29, 11]]),
    // the north-east meadow
    { kind: 'bush-large', at: [36, 7] },
    { kind: 'bush', at: [35, 1] },
    { kind: 'flowers-blue', at: [34, 5] },
    { kind: 'grass-tuft', at: [39, 7] },
    // the garden: a hedge with a gate north and south, beds, an orchard below
    { kind: 'hedge-h-l', at: [1, 12] },
    ...each('hedge-h', [[2, 12], [3, 12], [4, 12]]),
    { kind: 'hedge-h-r', at: [5, 12] },
    { kind: 'hedge-h-l', at: [7, 12] },
    ...each('hedge-h', [[8, 12], [9, 12], [10, 12]]),
    { kind: 'hedge-h-r', at: [11, 12] },
    ...each('hedge-v', [[1, 13], [1, 14], [1, 15], [1, 16], [1, 17], [11, 13], [11, 14], [11, 15], [11, 16], [11, 17]]),
    { kind: 'hedge-sw', at: [1, 18] },
    ...each('hedge-h', [[2, 18], [3, 18], [4, 18]]),
    { kind: 'hedge-h-r', at: [5, 18] },
    { kind: 'hedge-h-l', at: [7, 18] },
    ...each('hedge-h', [[8, 18], [9, 18], [10, 18]]),
    { kind: 'hedge-se', at: [11, 18] },
    ...each('cabbages', [[2, 13], [3, 13], [4, 13]]),
    ...each('sprouts', [[2, 14], [3, 14], [4, 14]]),
    { kind: 'tulips', at: [8, 13] },
    { kind: 'tulips-yellow', at: [9, 13] },
    { kind: 'tulips-pink', at: [10, 13] },
    { kind: 'tulips-pink', at: [8, 14] },
    { kind: 'tulips', at: [9, 14] },
    { kind: 'tulips-yellow', at: [10, 14] },
    ...each('pumpkins', [[2, 16], [4, 17]]),
    ...each('sprouts', [[3, 16], [2, 17], [3, 17], [4, 16]]),
    ...each('cabbages', [[8, 16], [9, 16], [10, 17]]),
    ...each('sprouts', [[10, 16], [8, 17], [9, 17]]),
    ...each('fruit-tree', [[2, 21], [4, 23], [7, 24], [11, 24]]),
    { kind: 'stepping-stones', at: [5, 21] },
    { kind: 'stepping-stones', at: [5, 22] },
    { kind: 'clover', at: [9, 24] },
    { kind: 'grass-tuft-small', at: [1, 23] },
    { kind: 'hedge', at: [12, 20] },
    // the park
    { kind: 'willow', at: [17, 19] },
    { kind: 'bench', at: [24, 20] },
    { kind: 'bush', at: [26, 17] },
    { kind: 'bush-large', at: [12, 15] },
    { kind: 'rock-large', at: [22, 23] },
    { kind: 'rock', at: [24, 22] },
    { kind: 'flowers', at: [15, 12] },
    { kind: 'flowers-white', at: [26, 13] },
    { kind: 'flowers-yellow', at: [16, 24] },
    { kind: 'flowers-pink', at: [26, 22] },
    { kind: 'flowers-purple', at: [19, 23] },
    { kind: 'grass-tuft', at: [24, 16] },
    { kind: 'pebbles', at: [21, 21] },
    { kind: 'lily', at: [20, 18] },
    { kind: 'lotus', at: [21, 19] },
    { kind: 'reeds-small', at: [22, 18] },
    // the stream, the lake and the beach
    { kind: 'water-rocks', at: [32, 1] },
    { kind: 'water-rocks', at: [31, 6] },
    { kind: 'reeds', at: [29, 16] },
    { kind: 'reeds', at: [29, 17] },
    { kind: 'reeds-small', at: [30, 19] },
    { kind: 'lily-pads', at: [31, 15] },
    { kind: 'lily', at: [33, 20] },
    { kind: 'lotus', at: [30, 18] },
    { kind: 'rock', at: [37, 14] },
    { kind: 'pebbles', at: [37, 19] },
    { kind: 'log', at: [36, 21] },
    { kind: 'grass-tuft', at: [39, 16] },
    { kind: 'bush', at: [39, 20] },
    { kind: 'pine', at: [38, 24] },
    { kind: 'oak', at: [30, 24] },
  ];
  const actors = [
    person('ana', 31, 9, 'right'),
    person('tomas', 6, 15),
    person('mira', 17, 20),
    person('ana', 37, 17, 'left'),
    person('tomas', 5, 3),
    person('mira', 22, 8),
    person('ana', 3, 22),
    person('tomas', 34, 17, 'left'),
  ];
  return { town: defineTown({ name: 'town', terrain: m.text(), legend: LEGEND, props }), actors };
}

/** Props that live on the water. */
const WATER_PLANTS = /^(lily|reeds|lotus|water)/;

/** The town at five in the afternoon, with shadows and the grade: do the props cast well? */
function evening(): Board {
  return { ...town(), lighting: true, hour: 17 };
}

export const boards: Record<string, () => Board> = { town, pairs, fields, lawn, props, evening };
