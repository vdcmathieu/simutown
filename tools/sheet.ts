/**
 * Render a contact sheet of the built-in art to a PNG, so art can be reviewed by eye.
 *
 *   pnpm sheet <terrain|nature|street|buildings|characters|ui|all> [--scale 6] [--only text]
 *
 * Output goes to out/sheets/<group>.png, and the cell order is printed to stdout.
 * Props with an emissive layer are shown twice: by day, and lit on a dark backdrop.
 */
import { art, buildings, natureProps, streetProps } from '../src/art';
import { compileTheme, daylight, lutRgb, type Slot } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import type { Dir, PropDef } from '../src/core/types';
import { writePNG } from '../src/node/png';

const lut = compileTheme(daylight);
const col = (slot: Slot, a = 255) => [...lutRgb(lut, slot), a] as const;

interface Cell {
  label: string;
  w: number;
  h: number;
  draw(out: Surface, x: number, y: number): void;
  /** Start a new row before this cell. */
  br?: boolean;
}

const PAD = 3;

function spriteCell(label: string, s: Sprite, bg: Slot, overlay?: Sprite, br?: boolean): Cell {
  return {
    label,
    w: s.w + PAD * 2,
    h: s.h + PAD * 2,
    br,
    draw(out, x, y) {
      out.rect(x, y, s.w + PAD * 2, s.h + PAD * 2, col(bg));
      out.blit(s, x + PAD + s.ax, y + PAD + s.ay, lut);
      if (overlay) out.blit(overlay, x + PAD + s.ax, y + PAD + s.ay, lut);
    },
  };
}

function terrainCells(): Cell[] {
  const cells: Cell[] = [];
  for (const def of Object.values(art.terrain)) {
    const looks = def.anims?.length ? def.anims.flatMap((a) => a.frames) : def.anim ? def.anim.frames : def.variants;
    looks.forEach((s, i) => {
      cells.push({
        label: `${def.id}${def.anim ? '~' : '#'}${i} (3x3)`,
        w: s.w * 3,
        h: s.h * 3,
        br: i === 0,
        draw(out, x, y) {
          for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) out.blit(s, x + k * s.w, y + j * s.h, lut);
        },
      });
    });
    // all variants mixed, the way a real field looks
    if (!def.anim && def.variants.length > 1) {
      cells.push({
        label: `${def.id} mixed (5x3)`,
        w: 16 * 5,
        h: 16 * 3,
        draw(out, x, y) {
          for (let j = 0; j < 3; j++) {
            for (let k = 0; k < 5; k++) {
              const v = def.variants[(k * 7 + j * 13 + k * j) % def.variants.length]!;
              out.blit(v, x + k * 16, y + j * 16, lut);
            }
          }
        },
      });
    }
    for (const [side, entry] of Object.entries(def.fringe ?? {})) {
      [entry].flat().forEach((s, i) => cells.push(spriteCell(`${def.id}.fringe.${side}#${i}`, s, 'steel.3')));
    }
  }
  return cells;
}

function propCells(props: Record<string, PropDef>): Cell[] {
  const cells: Cell[] = [];
  for (const def of Object.values(props)) {
    const frames = def.anim ? def.anim.frames : [def.sprite];
    frames.forEach((s, i) => cells.push(spriteCell(`${def.id}${def.anim ? `~${i}` : ''}`, s, 'moss.2')));
    if (def.emissive) cells.push(spriteCell(`${def.id} (lit)`, frames[0]!, 'steel.1', def.emissive));
  }
  return cells;
}

function characterCells(): Cell[] {
  const cells: Cell[] = [];
  const dirs: Dir[] = ['down', 'left', 'right', 'up'];
  for (const def of Object.values(art.characters)) {
    let first = true;
    const push = (pose: string, set: Record<Dir, Sprite[]>) => {
      for (const dir of dirs) {
        set[dir].forEach((s, i) => {
          cells.push(spriteCell(`${def.id}.${pose}.${dir}#${i}`, s, 'moss.2', undefined, first));
          first = false;
        });
      }
    };
    push('idle', def.idle);
    push('walk', def.walk);
    for (const [pose, set] of Object.entries(def.poses ?? {})) push(pose, set);
  }
  return cells;
}

function uiCells(): Cell[] {
  const cells: Cell[] = [];
  for (const [name, s] of Object.entries(art.emotes)) cells.push(spriteCell(`emote.${name}`, s, 'moss.2'));
  let first = true;
  for (const [ch, g] of Object.entries(art.font.glyphs)) {
    cells.push(spriteCell(`glyph ${JSON.stringify(ch)}`, g.sprite, 'cream.2', undefined, first));
    first = false;
  }
  return cells;
}

const GROUPS: Record<string, () => Cell[]> = {
  terrain: terrainCells,
  nature: () => propCells(natureProps),
  street: () => propCells(streetProps),
  buildings: () => propCells(buildings),
  characters: characterCells,
  ui: uiCells,
};

function layout(cells: Cell[], maxW: number) {
  const GAP = 4;
  const placed: { cell: Cell; x: number; y: number }[] = [];
  const rows: string[][] = [];
  let x = GAP;
  let y = GAP;
  let rowH = 0;
  let width = 0;
  for (const cell of cells) {
    if ((cell.br && x > GAP) || (x > GAP && x + cell.w + GAP > maxW)) {
      x = GAP;
      y += rowH + GAP;
      rowH = 0;
    }
    if (x === GAP) rows.push([]);
    placed.push({ cell, x, y });
    rows[rows.length - 1]!.push(cell.label);
    x += cell.w + GAP;
    rowH = Math.max(rowH, cell.h);
    width = Math.max(width, x);
  }
  return { placed, rows, w: Math.max(width, GAP * 2), h: y + rowH + GAP };
}

function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const scaleArg = flag('scale');
  const only = flag('only');
  const group = args[0] ?? 'all';
  const names = group === 'all' ? Object.keys(GROUPS) : [group];
  for (const name of names) {
    const make = GROUPS[name];
    if (!make) throw new Error(`unknown group "${name}". Try: ${Object.keys(GROUPS).join(', ')}, all`);
    let cells = make();
    if (only) cells = cells.filter((c) => c.label.includes(only));
    if (cells.length === 0) {
      console.log(`${name}: nothing to draw`);
      continue;
    }
    const { placed, rows, w, h } = layout(cells, 340);
    const sheet = new Surface(w, h).clear(col('steel.3'));
    for (const p of placed) p.cell.draw(sheet, p.x, p.y);
    const scale = scaleArg ? Number(scaleArg) : Math.max(2, Math.min(6, Math.floor(2400 / Math.max(w, h))));
    const path = `out/sheets/${name}.png`;
    writePNG(path, sheet.scaled(scale));
    console.log(`${name}: ${path} (${w * scale}x${h * scale}, scale ${scale})`);
    rows.forEach((r, i) => console.log(`  row ${i + 1}: ${r.join(' | ')}`));
  }
}

main();
