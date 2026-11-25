/**
 * Review sheets for the character kit, closer to the work than `pnpm sheet characters`.
 *
 *   pnpm tsx tools/characters-parts.ts cast   [--ids ana,bo] [--poses idle,walk] [--dirs down,right] [--scale 4]
 *   pnpm tsx tools/characters-parts.ts heads  [--only bun] [--scale 5]     every head and hat, three views
 *   pnpm tsx tools/characters-parts.ts outfits [--scale 4]                 every top on every bottom and shape
 *   pnpm tsx tools/characters-parts.ts lint                                open outlines in the whole kit
 *   pnpm tsx tools/characters-parts.ts ascii <id> <pose> <dir> [frame]     one frame as text
 *
 * Sheets go to out/characters/<name>.png. One character per row; each pose shows its
 * distinct frames once, for the directions asked (default down, left, right, up).
 * The backdrop is the grass colour, with a strip of paving on the left, because those
 * are the two grounds people stand on.
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

/** One row per character, frames side by side. Returns the labels of each row. */
function sheet(path: string, defs: CharacterDef[], poses: string[] | undefined, dirs: Dir[], scale: number): void {
  const CELL_W = 18;
  const CELL_H = 27;
  const rows = defs.map((def) => {
    const cells: { s: Sprite; gap: boolean }[] = [];
    for (const [pose, set] of Object.entries(sets(def))) {
      if (poses && !poses.includes(pose)) continue;
      for (const dir of dirs) distinct(set[dir]).forEach((s, i) => cells.push({ s, gap: i === 0 }));
    }
    return { def, cells };
  });
  const width = Math.max(...rows.map((r) => r.cells.length * CELL_W + r.cells.filter((c) => c.gap).length * 3)) + 4;
  const out = new Surface(width, rows.length * CELL_H + 2).clear(col('moss.2'));
  out.rect(0, 0, CELL_W * 2 + 5, out.h, col('cream.1'));
  rows.forEach((row, j) => {
    let x = 2;
    for (const c of row.cells) {
      if (c.gap) x += 3;
      out.blit(c.s, x + 1 + c.s.ax, j * CELL_H + 2 + c.s.ay, lut);
      x += CELL_W;
    }
  });
  writePNG(path, out.scaled(scale));
  console.log(`${path} (${out.w * scale}x${out.h * scale})`);
  rows.forEach((r, j) => console.log(`  row ${j + 1}: ${r.def.id}`));
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
if (mode === 'cast') {
  const ids = list('ids');
  const unknown = (ids ?? []).filter((id) => !characters[id]);
  if (unknown.length) throw new Error(`unknown character ${unknown.join(', ')}. Valid: ${Object.keys(characters).join(', ')}`);
  const defs = ids ? ids.map((id) => characters[id]!) : Object.values(characters);
  sheet(`out/characters/${option('name') ?? 'cast'}.png`, defs, list('poses'), (list('dirs') as Dir[] | undefined) ?? ALL_DIRS, scale);
} else if (mode === 'heads') {
  const only = option('only');
  const defs = reviewHeads().filter((d) => !only || d.id.includes(only));
  sheet('out/characters/heads.png', defs, list('poses') ?? ['idle'], (list('dirs') as Dir[] | undefined) ?? ALL_DIRS, scale);
} else if (mode === 'outfits') {
  const only = option('only');
  const defs = reviewOutfits().filter((d) => !only || d.id.includes(only));
  sheet('out/characters/outfits.png', defs, list('poses') ?? ['idle', 'walk'], (list('dirs') as Dir[] | undefined) ?? ['down', 'right', 'up'], scale);
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
