/**
 * A drafting aid for leafy sprites: lay out a canopy as overlapping lobes and get a first
 * text grid that follows the tree recipe in docs/STYLE.md (flat moss.1 lobes, a moss.0
 * underside where a lobe overhangs, a 1-pixel lit rim along the upper-left silhouette, a
 * closed ink outline).
 *
 *   pnpm tsx tools/nature-draft.ts <name> [--scale 8]
 *
 * It prints the grid and writes out/draft-<name>.png on a lawn. The grid is a starting
 * point: paste it into src/art/nature and finish it by hand. Nothing in src/ imports this.
 * The layouts in tools/nature-drafts.ts are the ones the shipped sprites started from.
 */
import { compileTheme, daylight, lutRgb } from '../src/core/palette';
import { sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import { writePNG } from '../src/node/png';
import { drafts } from './nature-drafts';

/** A leaf mass. Lobes earlier in the list lie in front of later ones. */
export type Lobe = Shape & {
  /** A lobe in the shade of the others: flat moss.0, no rim. */
  dark?: boolean;
};

type Shape =
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  /** A hanging frond or a clipped block: a box with rounded corners of radius `r`. */
  | { kind: 'box'; x: number; y: number; w: number; h: number; r: number }
  /**
   * A tier of a conifer or a hanging frond: half-width `top` at row `y0` and `bottom` at
   * row `y1`, centred on `cx` at the top and drifting `lean` pixels sideways by the bottom.
   */
  | { kind: 'tier'; cx: number; y0: number; y1: number; top: number; bottom: number; lean?: number };

export interface Draft {
  w: number;
  h: number;
  lobes: Lobe[];
  /** How deep a lobe's shade runs up from its lower edge and in from its right edge, in pixels. */
  shade?: { down: number; right: number };
  /** Art drawn behind the leaves (a trunk), without ink, and where its top-left corner goes. */
  under?: { art: string; x: number; y: number };
}

function inside(l: Lobe, px: number, py: number): boolean {
  const x = px + 0.5;
  const y = py + 0.5;
  if (l.kind === 'ellipse') return ((x - l.cx) / l.rx) ** 2 + ((y - l.cy) / l.ry) ** 2 <= 1;
  if (l.kind === 'tier') {
    if (y < l.y0 || y > l.y1) return false;
    const k = (y - l.y0) / (l.y1 - l.y0);
    // the bottom corners are rounded: the last two rows pull in
    const round = y > l.y1 - 1 ? 2 : y > l.y1 - 2 ? 1 : 0;
    return Math.abs(x - l.cx - (l.lean ?? 0) * k) <= l.top + (l.bottom - l.top) * k - round;
  }
  if (x < l.x || x > l.x + l.w || y < l.y || y > l.y + l.h) return false;
  const cx = Math.max(l.x + l.r, Math.min(l.x + l.w - l.r, x));
  const cy = Math.max(l.y + l.r, Math.min(l.y + l.h - l.r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= l.r ** 2;
}

/** Lay a draft out as a text grid in the shared sprite alphabet. */
export function draw(d: Draft): string[] {
  const grid: string[][] = Array.from({ length: d.h }, () => Array.from({ length: d.w }, () => '.'));
  const get = (x: number, y: number): string => (x < 0 || y < 0 || x >= d.w || y >= d.h ? '.' : grid[y]![x]!);
  if (d.under) {
    const rows = d.under.art.split('\n').map((r) => r.trim()).filter((r) => r !== '');
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch !== '.' && grid[d.under!.y + j]?.[d.under!.x + i] !== undefined) grid[d.under!.y + j]![d.under!.x + i] = ch;
    }));
  }
  const shade = d.shade ?? { down: 2, right: 2 };
  const owner = (x: number, y: number): number => d.lobes.findIndex((l) => inside(l, x, y));
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      const o = owner(x, y);
      if (o < 0) continue;
      const l = d.lobes[o]!;
      const low = !inside(l, x, y + shade.down) || !inside(l, x + shade.right, y) || !inside(l, x + 1, y + 1);
      grid[y]![x] = low || l.dark ? 'g' : 'h';
    }
  }
  // the lit rim: leaf pixels whose upper or left neighbour is open air
  const leaf = (x: number, y: number): boolean => owner(x, y) >= 0;
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      if (!leaf(x, y) || d.lobes[owner(x, y)]!.dark) continue;
      const up = get(x, y - 1) === '.';
      const left = get(x - 1, y) === '.';
      if ((up || left) && get(x, y + 1) !== '.') grid[y]![x] = up && left ? 'j' : 'i';
    }
  }
  // close the outline: every empty pixel beside a coloured one becomes ink
  const ink: [number, number][] = [];
  for (let y = 0; y < d.h; y++) {
    for (let x = 0; x < d.w; x++) {
      if (get(x, y) !== '.') continue;
      if ([get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].some((c) => c !== '.')) ink.push([x, y]);
    }
  }
  for (const [x, y] of ink) grid[y]![x] = '0';
  return grid.map((r) => r.join(''));
}

if (process.argv[1]?.endsWith('nature-draft.ts')) {
  const name = process.argv[2] ?? '';
  const names = name === 'all' ? Object.keys(drafts) : [name];
  const i = process.argv.indexOf('--scale');
  const scale = i >= 0 ? Number(process.argv[i + 1]) : 8;
  const lut = compileTheme(daylight);
  const made = names.map((n) => {
    const d = drafts[n];
    if (!d) throw new Error(`Unknown draft "${n}". Drafts: ${Object.keys(drafts).join(', ')}, all`);
    const rows = draw(d);
    console.log(`${n}\n${rows.map((r) => `  ${r}`).join('\n')}`);
    return { d, rows };
  });
  const out = new Surface(made.reduce((w, m) => w + m.d.w + 8, 0), Math.max(...made.map((m) => m.d.h)) + 8);
  out.clear([...lutRgb(lut, 'moss.2'), 255]);
  let x = 4;
  for (const m of made) {
    out.blit(sprite(m.rows.join('\n')), x, out.h - 4 - m.d.h, lut);
    x += m.d.w + 8;
  }
  writePNG(`out/draft-${name}.png`, out.scaled(scale));
  console.log(`out/draft-${name}.png`);
}
