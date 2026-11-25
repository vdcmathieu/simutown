/**
 * Review sheets for the character kit, closer to the work than `pnpm sheet characters`.
 *
 *   pnpm tsx tools/characters-parts.ts cast   [--ids ana,bo] [--poses idle,walk] [--dirs down,right] [--scale 4] [--cols 3] [--first]
 *   pnpm tsx tools/characters-parts.ts heads  [--only bun] [--scale 5]     every head and hat, three views
 *   pnpm tsx tools/characters-parts.ts outfits [--scale 4]                 every top on every bottom and shape
 *   pnpm tsx tools/characters-parts.ts lint                                open outlines in the whole kit
 *   pnpm tsx tools/characters-parts.ts ascii <id> <pose> <dir> [frame]     one frame as text
 *
 * Sheets go to out/characters/<name>.png: one block per character, `--cols` blocks per
 * row. Each pose shows its distinct frames once (or only its first with `--first`), for
 * the directions asked (default down, left, right, up). The first frame of a block stands
 * on paving and the rest on grass, because those are the two grounds people stand on.
 */
import { characters } from '../src/art/characters';
import { openOutline, silhouette } from '../src/art/characters/lint';
import { reviewHeads, reviewOutfits } from '../src/art/characters/review';
import { compileTheme, daylight, lutRgb, type Slot } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import type { CharacterDef, Dir } from '../src/core/types';
import { writePNG } from '../src/node/png';

const lut = compileTheme(daylight);
const col = (slot: Slot) => [...lutRgb(lut, slot), 255] as const;
const ALL_DIRS: Dir[] = ['down', 'left', 'right', 'up'];

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const list = (name: string): string[] | undefined => option(name)?.split(',');

/** The distinct sprites of a frame list, in order. */
const distinct = (frames: Sprite[]): Sprite[] => frames.filter((s, i) => frames.indexOf(s) === i);

function sets(def: CharacterDef): Record<string, Record<Dir, Sprite[]>> {
  return { idle: def.idle, walk: def.walk, ...(def.poses ?? {}) };
}

/**
 * One block per character, frames side by side; `cols` blocks per sheet row. With `first`
 * only the first frame of each pose and direction is drawn. The first frame of every
 * block stands on paving, the rest on grass.
 */
function sheet(path: string, defs: CharacterDef[], poses: string[] | undefined, dirs: Dir[], scale: number, cols: number, first: boolean): void {
  const CELL_W = 18;
  const CELL_H = 27;
  const blocks = defs.map((def) => {
    const cells: Sprite[] = [];
    for (const [pose, set] of Object.entries(sets(def))) {
      if (poses && !poses.includes(pose)) continue;
      for (const dir of dirs) cells.push(...(first ? [set[dir][0]!] : distinct(set[dir])));
    }
    return { def, cells };
  });
  const blockW = Math.max(...blocks.map((b) => b.cells.length)) * CELL_W + 6;
  const rows = Math.ceil(blocks.length / cols);
  const out = new Surface(Math.min(cols, blocks.length) * blockW + 2, rows * CELL_H + 2).clear(col('moss.2'));
  blocks.forEach((block, i) => {
    const x0 = (i % cols) * blockW + 2;
    const y0 = Math.floor(i / cols) * CELL_H + 2;
    out.rect(x0, y0 - 2, CELL_W, CELL_H, col('cream.1'));
    block.cells.forEach((s, k) => out.blit(s, x0 + 1 + k * CELL_W + s.ax, y0 + s.ay, lut));
  });
  writePNG(path, out.scaled(scale));
  console.log(`${path} (${out.w * scale}x${out.h * scale})`);
  for (let r = 0; r < rows; r++) console.log(`  row ${r + 1}: ${blocks.slice(r * cols, (r + 1) * cols).map((b) => b.def.id).join(' | ')}`);
}

function lint(defs: CharacterDef[]): number {
  let bad = 0;
  for (const def of defs) {
    const seen = new Set<Sprite>();
    for (const [pose, set] of Object.entries(sets(def))) {
      for (const dir of ['down', 'right', 'up'] as Dir[]) {
        set[dir].forEach((s, i) => {
          if (seen.has(s)) return;
          seen.add(s);
          const open = openOutline(s);
          if (open.length === 0) return;
          bad++;
          console.log(`${def.id}.${pose}.${dir}#${i}: open at ${open.join(' ')}\n${silhouette(s)}`);
        });
      }
    }
  }
  return bad;
}

const mode = args.shift() ?? 'cast';
const scale = Number(option('scale') ?? 4);
const cols = Number(option('cols') ?? 1);
const first = args.includes('--first') ? (args.splice(args.indexOf('--first'), 1), true) : false;
if (mode === 'cast') {
  const ids = list('ids');
  const unknown = (ids ?? []).filter((id) => !characters[id]);
  if (unknown.length) throw new Error(`unknown character ${unknown.join(', ')}. Valid: ${Object.keys(characters).join(', ')}`);
  const defs = ids ? ids.map((id) => characters[id]!) : Object.values(characters);
  sheet(`out/characters/${option('name') ?? 'cast'}.png`, defs, list('poses'), (list('dirs') as Dir[] | undefined) ?? ALL_DIRS, scale, cols, first);
} else if (mode === 'heads') {
  const only = option('only');
  const defs = reviewHeads().filter((d) => !only || d.id.includes(only));
  sheet('out/characters/heads.png', defs, list('poses') ?? ['idle'], (list('dirs') as Dir[] | undefined) ?? ALL_DIRS, scale, cols, first);
} else if (mode === 'outfits') {
  const only = option('only');
  const defs = reviewOutfits().filter((d) => !only || d.id.includes(only));
  sheet('out/characters/outfits.png', defs, list('poses') ?? ['idle', 'walk'], (list('dirs') as Dir[] | undefined) ?? ['down', 'right', 'up'], scale, cols, first);
} else if (mode === 'lint') {
  const bad = lint([...Object.values(characters), ...reviewHeads(), ...reviewOutfits()]);
  console.log(bad === 0 ? 'every outline is closed' : `${bad} frame(s) with an open outline`);
  process.exitCode = bad === 0 ? 0 : 1;
} else if (mode === 'ascii') {
  const [id, pose = 'idle', dir = 'down', frame = '0'] = args;
  const def = characters[id ?? ''] ?? [...reviewHeads(), ...reviewOutfits()].find((d) => d.id === id);
  if (!def) throw new Error(`unknown character "${id}". Valid: ${Object.keys(characters).join(', ')}`);
  const s = sets(def)[pose]?.[dir as Dir]?.[Number(frame)];
  if (!s) throw new Error(`no frame ${pose}.${dir}#${frame} for "${id}"`);
  console.log(silhouette(s));
} else {
  throw new Error(`unknown mode "${mode}". Try: cast, heads, outfits, lint, ascii`);
}
