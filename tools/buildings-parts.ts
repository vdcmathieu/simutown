/**
 * A contact sheet of the building kit's parts, for reviewing each piece on its own.
 *
 *   pnpm tsx tools/buildings-parts.ts [--scale 6] [--row 5]
 *
 * Writes out/buildings-parts.png. Rows: 1 doors, 2 windows (by day, then each lit look on
 * a dark wall), 3 wall materials with roofs, 4 wall extras, 5 signs, 6 rooftop pieces.
 * `--row` keeps one row, for a closer look.
 */
import {
  awning,
  AWNING_COLORS,
  bellTurret,
  chimney,
  clockFace,
  clockTurret,
  door,
  DOOR_STYLES,
  dormer,
  flowerBox,
  lantern,
  type Part,
  PAINTS,
  roof,
  ROOF_COLORS,
  shutter,
  sign,
  SIGN_ICONS,
  step,
  wall,
  WALL_KINDS,
  WINDOW_KINDS,
  windowPart,
} from '../src/art/buildings';
import { compileTheme, daylight, lutRgb, type Slot } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import { writePNG } from '../src/node/png';

const lut = compileTheme(daylight);
const col = (slot: Slot) => [...lutRgb(lut, slot), 255] as const;
const PAD = 3;
const GAP = 4;

interface Cell {
  w: number;
  h: number;
  draw(out: Surface, x: number, y: number): void;
}

const isPart = (p: Part | Sprite): p is Part => 'day' in p;

/** A part on a plaster-coloured backdrop; `lit` shows it on a night wall with its glow on. */
function cell(p: Part | Sprite | { w: number; h: number; px: Uint8Array }, lit = false, bg: Slot = lit ? 'steel.1' : 'cream.2'): Cell {
  const day: Sprite = isPart(p as Part) ? (p as Part).day : { ...(p as Sprite), ax: 0, ay: 0 };
  const glow = isPart(p as Part) ? (p as Part).lit : undefined;
  return {
    w: day.w + PAD * 2,
    h: day.h + PAD * 2,
    draw(out, x, y) {
      out.rect(x, y, day.w + PAD * 2, day.h + PAD * 2, col(bg));
      out.blit({ ...day, ax: 0, ay: 0 }, x + PAD, y + PAD, lut, lit ? { alpha: 0.55 } : {});
      if (lit && glow) out.blit({ ...glow, ax: 0, ay: 0 }, x + PAD, y + PAD, lut);
    },
  };
}

/** A swatch of wall under a strip of roof. */
function swatch(kind: (typeof WALL_KINDS)[number], color: (typeof ROOF_COLORS)[number], form: 'gable' | 'hip'): Cell {
  const w = 64;
  const c = { w, h: 60, px: new Uint8Array(w * 60) };
  wall(c, { kind, x: 3, w: w - 6, top: 16, base: 59, storeys: 1 });
  const r = roof({ w, h: 40, form, color });
  for (let y = 0; y < 18; y++) for (let x = 0; x < w; x++) c.px[y * w + x] = r.px[(y + 22) * w + x]!;
  return cell(c, false, 'moss.2');
}

const allRows: Cell[][] = [
  DOOR_STYLES.flatMap((style) => PAINTS.slice(0, style === 'panelled' ? 6 : 2).map((paint) => cell(door(style, paint)))),
  [
    ...WINDOW_KINDS.map((k) => cell(windowPart(k))),
    ...WINDOW_KINDS.flatMap((k) => [cell(windowPart(k, 'warm'), true), cell(windowPart(k, 'curtains'), true)]),
    cell(door('shop', 'teal'), true),
  ],
  WALL_KINDS.map((k, i) => swatch(k, ROOF_COLORS[i % 3]!, i % 2 ? 'hip' : 'gable')),
  [
    ...AWNING_COLORS.map((c) => cell(awning(c, 38))),
    cell(shutter('teal')),
    cell(shutter('plum', 16)),
    cell(flowerBox),
    cell(lantern),
    cell(lantern, true),
    cell(step(20), false, 'cream.1'),
    cell(clockFace),
    cell(clockFace, true),
  ],
  SIGN_ICONS.map((icon) => cell(sign(icon))),
  [
    cell(chimney, false, 'moss.2'),
    ...ROOF_COLORS.map((c) => cell(bellTurret(c), false, 'moss.2')),
    ...ROOF_COLORS.map((c) => cell(clockTurret(c), false, 'moss.2')),
    cell(clockTurret('red'), true),
    ...ROOF_COLORS.map((c) => cell(dormer(c), false, 'brick.1')),
    cell(dormer('blue'), true),
  ],
];

const option = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
};
const scale = option('--scale', 6);
const row = option('--row', 0);
const rows = row > 0 ? allRows.slice(row - 1, row) : allRows;
const W = Math.max(...rows.map((r) => r.reduce((n, c) => n + c.w + GAP, GAP)));
const H = rows.reduce((n, r) => n + Math.max(...r.map((c) => c.h)) + GAP, GAP);
const sheet = new Surface(W, H).clear(col('steel.3'));
let y = GAP;
for (const row of rows) {
  let x = GAP;
  for (const c of row) {
    c.draw(sheet, x, y);
    x += c.w + GAP;
  }
  y += Math.max(...row.map((c) => c.h)) + GAP;
}
writePNG('out/buildings-parts.png', sheet.scaled(scale));
console.log(`out/buildings-parts.png (${W * scale}x${H * scale}, scale ${scale})`);
