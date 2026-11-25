/**
 * Render the style key: the shared visual reference every artist draws against.
 *
 *   pnpm tsx tools/stylekey.ts
 *
 * Writes four PNGs into docs/style/ (they are committed):
 *   stylekey.png    a corner of Willow Square at midday, hand-laid, at scale 4
 *   characters.png  every townsperson: rows are down, left, right, up; columns are the
 *                   two idle frames (on paving) and the four walk frames (on grass)
 *   pieces.png      the approved repeat pieces at scale 8: copy these pixels
 *   palette.png     the palette, one row per ramp, dark to light, each swatch labelled
 *                   with its slot name and its sprite-grid letter (in red)
 *
 * The ground (tile variants, fringes, inner corners) is composed by the renderer's own
 * ground pass, so the key shows edges exactly as the engine draws them. Props, people
 * and contact shadows are laid on top here, in raw palette colours.
 */
import { art } from '../src/art';
import { planBuilding, presetSpecs } from '../src/art/buildings';
import { compileTheme, daylight, lutRgb, SLOTS, type Slot } from '../src/core/palette';
import { LEGEND, type Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import { type Dir, TILE, type Town } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { buildGround } from '../src/render/ground';
import { drawText, measureText } from '../src/ui';

const lut = compileTheme(daylight);
const col = (slot: Slot, a = 255) => [...lutRgb(lut, slot), a] as const;

// g grass, c cobble (paving), d dirt, w water (natural pond), b basin (stone-rimmed water)
const TERRAIN: Record<string, string> = { g: 'grass', c: 'cobble', d: 'dirt', w: 'water', b: 'basin' };

/** Compose the ground of a hand-laid map with the renderer's ground pass. */
function ground(map: string[]): Surface {
  const w = map[0]!.length;
  const h = map.length;
  const town: Town = {
    name: 'stylekey',
    w,
    h,
    terrain: map.flatMap((row) => [...row].map((ch) => TERRAIN[ch]!)),
    props: [],
    places: {},
    solid: new Uint8Array(w * h),
  };
  const out = new Surface(w * TILE, h * TILE);
  out.draw(buildGround(town, art, lut, () => {}).surface);
  return out;
}

/** A flat ink ellipse at 22% alpha: the contact shadow the renderer draws at midday. */
function shadow(out: Surface, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const inside = (x * x) / ((rx + 0.5) * (rx + 0.5)) + (y * y) / ((ry + 0.5) * (ry + 0.5)) <= 1;
      if (inside) out.rect(cx + x, cy + y, 1, 1, col('steel.0', 56));
    }
  }
}

// ---------------------------------------------------------------------------------------
// stylekey.png: a corner of Willow Square
// ---------------------------------------------------------------------------------------

const MAP = [
  'gggggggggggggggggggggggg',
  'ggggggggggggggggggwwwggg',
  'gggggggggggggggggwwwwwgg',
  'gggggggggggggggggwwwwwwg',
  'ggggggggggggggggggwwwwwg',
  'gggggggggggggggggggwwwgg',
  'gccccccccccccccggggggggg',
  'gccccccccccccccggggggggg',
  'gcccccbbbccccccggggggggg',
  'gcccccbbbccccccccccccccc',
  'gccccccccccccccccccccccc',
  'gccccccccccccccggggggggg',
  'gggggdgggggggggggggggggg',
  'gggggddggggggggggggggggg',
  'ggggggdggggggggggggggggg',
];

// Props sit on an origin tile: the bottom-left tile of their footprint.
const PROPS: { kind: string; tx: number; ty: number }[] = [
  { kind: 'house', tx: 1, ty: 6 },
  { kind: 'townhouse', tx: 9, ty: 6 },
  { kind: 'tree', tx: 7, ty: 4 },
  { kind: 'tree', tx: 15, ty: 4 },
  { kind: 'tree', tx: 23, ty: 7 },
  { kind: 'tree', tx: 1, ty: 13 },
  { kind: 'tree', tx: 12, ty: 14 },
  { kind: 'tree', tx: 21, ty: 13 },
  { kind: 'lamp', tx: 7, ty: 6 },
  { kind: 'lamp', tx: 14, ty: 11 },
  { kind: 'bench', tx: 18, ty: 7 },
  { kind: 'stepping-stones', tx: 21, ty: 8 },
  { kind: 'stepping-stones', tx: 21, ty: 7 },
  { kind: 'lily', tx: 19, ty: 2 },
  { kind: 'lily', tx: 20, ty: 4 },
  { kind: 'flowers', tx: 16, ty: 6 },
  { kind: 'flowers', tx: 3, ty: 12 },
  { kind: 'flowers-white', tx: 14, ty: 1 },
  { kind: 'flowers-white', tx: 8, ty: 13 },
  { kind: 'flowers-white', tx: 9, ty: 13 },
  { kind: 'flowers-yellow', tx: 16, ty: 12 },
  { kind: 'flowers-yellow', tx: 17, ty: 13 },
  { kind: 'flowers-pink', tx: 23, ty: 12 },
  { kind: 'flowers-pink', tx: 3, ty: 1 },
];

// Actors stand on a feet position in world pixels.
const ACTORS: { id: string; x: number; y: number; dir: Dir; pose: 'idle' | 'walk'; frame: number }[] = [
  { id: 'ana', x: 3 * TILE + 8, y: 7 * TILE + 13, dir: 'down', pose: 'walk', frame: 0 },
  { id: 'tomas', x: 17 * TILE + 8, y: 10 * TILE + 4, dir: 'left', pose: 'walk', frame: 0 },
  { id: 'mira', x: 11 * TILE + 8, y: 10 * TILE + 6, dir: 'down', pose: 'idle', frame: 0 },
];

function scene(): Surface {
  const out = ground(MAP);

  // flat props lie on the ground under everything
  for (const p of PROPS) {
    const def = art.props[p.kind]!;
    if (def.flat) out.blit(def.sprite, p.tx * TILE, (p.ty + 1) * TILE, lut);
  }

  // contact shadows: an ellipse under small things, a thin strip along a building's base
  const SHADOWS: Record<string, [number, number, number, number]> = {
    tree: [8, -2, 11, 3],
    lamp: [8, -1, 5, 2],
    bench: [16, -1, 15, 2],
  };
  for (const p of PROPS) {
    const def = art.props[p.kind]!;
    const s = SHADOWS[p.kind];
    if (s) shadow(out, p.tx * TILE + s[0], (p.ty + 1) * TILE + s[1], s[2], s[3]);
    if ((def.footprint?.h ?? 0) >= 2) {
      out.rect(p.tx * TILE + 2, (p.ty + 1) * TILE, def.sprite.w - 2, 2, col('steel.0', 56));
    }
  }
  for (const a of ACTORS) shadow(out, a.x, a.y - 1, 5, 2);

  // standing things, sorted by their base line
  const drawables: { y: number; draw: () => void }[] = [];
  for (const p of PROPS) {
    const def = art.props[p.kind]!;
    if (def.flat) continue;
    const y = (p.ty + 1) * TILE;
    drawables.push({ y, draw: () => out.blit(def.sprite, p.tx * TILE, y, lut) });
  }
  for (const a of ACTORS) {
    const def = art.characters[a.id]!;
    const frames: Sprite[] = def[a.pose][a.dir];
    drawables.push({ y: a.y, draw: () => out.blit(frames[a.frame % frames.length]!, a.x, a.y, lut) });
  }
  drawables.sort((p, q) => p.y - q.y);
  for (const d of drawables) d.draw();
  return out;
}

// ---------------------------------------------------------------------------------------
// characters.png: every frame, idle on paving and walking on grass
// ---------------------------------------------------------------------------------------

function characters(): Surface {
  const dirs: Dir[] = ['down', 'left', 'right', 'up'];
  const people = Object.values(art.characters);
  const CW = 20;
  const CH = 28;
  const GAP = 4;
  const LABEL = 9;
  // the cast wraps into rows of five people, each block labelled with its id
  const PER_ROW = 5;
  const blockW = 6 * CW;
  const blockH = dirs.length * CH;
  const rows = Math.ceil(people.length / PER_ROW);
  const cols = Math.min(people.length, PER_ROW);
  const out = new Surface(GAP + cols * (blockW + GAP), GAP + rows * (blockH + LABEL + GAP)).clear(col('cream.2'));
  people.forEach((def, i) => {
    const x0 = GAP + (i % PER_ROW) * (blockW + GAP);
    const y0 = GAP + Math.floor(i / PER_ROW) * (blockH + LABEL + GAP);
    out.rect(x0, y0, 2 * CW, blockH, col('cream.1'));
    out.rect(x0 + 2 * CW, y0, 4 * CW, blockH, col('moss.2'));
    drawText(out, lut, def.id, x0, y0 + blockH + 1);
    dirs.forEach((dir, j) => {
      const frames = [...def.idle[dir].slice(0, 2), ...def.walk[dir].slice(0, 4)];
      frames.forEach((s, k) => {
        const x = x0 + k * CW + CW / 2;
        const y = y0 + j * CH + CH - 2;
        shadow(out, x, y - 1, 5, 2);
        out.blit(s, x, y, lut);
      });
    });
  });
  return out;
}

// ---------------------------------------------------------------------------------------
// pieces.png: the parts that are meant to repeat across the town, big enough to copy
// ---------------------------------------------------------------------------------------

/** A rectangle cut out of a surface. */
function crop(src: Surface, x: number, y: number, w: number, h: number): Surface {
  const out = new Surface(w, h);
  out.draw(src, -x, -y);
  return out;
}

/** A sprite on a flat backdrop, with a 2-pixel margin. */
function onGround(s: Sprite, slot: Slot): Surface {
  const out = new Surface(s.w + 4, s.h + 4).clear(col(slot));
  out.blit(s, 2 + s.ax, 2 + s.ay, lut);
  return out;
}

function pieces(): Surface {
  const cottage = onGround(art.props.house!.sprite, 'moss.2');
  const townhouse = onGround(art.props.townhouse!.sprite, 'moss.2');
  const ana = art.characters.ana!;
  // Find the window and the door where the building kit put them, so the crops follow the
  // art when it changes. +2 for the margin of onGround; the crops keep a little wall around.
  const plan = planBuilding(presetSpecs.find((s) => s.id === 'house')!);
  const win = plan.windows[0]!;
  const cells: [string, Surface][] = [
    ['window', crop(cottage, win.x, win.y, win.w + 4, win.h + 7)],
    ['door', crop(cottage, plan.door.x, plan.door.y, plan.door.w + 4, 27)],
    ['gable roof', crop(cottage, 0, 6, 34, 26)],
    ['eave and wall', crop(cottage, 0, 38, 34, 22)],
    ['hip roof', crop(townhouse, 0, 6, 34, 26)],
    ['turf edge', crop(ground(['ggggg', 'gcccc', 'gcccc', 'ggccc']), 4, 4, 56, 56)],
    ['pond shore', crop(ground(['ggggg', 'ggwww', 'gwwww', 'gwwww']), 4, 4, 60, 56)],
    ['basin rim', crop(ground(['cccc', 'cbbb', 'cbbb']), 4, 4, 44, 40)],
    ['tree', onGround(art.props.tree!.sprite, 'moss.2')],
    ['front', onGround(ana.idle.down[0]!, 'cream.1')],
    ['side', onGround(ana.idle.right[0]!, 'cream.1')],
    ['step', onGround(ana.walk.down[0]!, 'moss.2')],
    ['stride', onGround(ana.walk.right[0]!, 'moss.2')],
  ];
  const GAP = 6;
  const LABEL = 9;
  const MAX_W = 232;
  // flow the cells into rows
  const placed: { x: number; y: number; w: number; label: string; s: Surface }[] = [];
  let x = GAP;
  let y = GAP;
  let rowH = 0;
  let width = 0;
  for (const [label, s] of cells) {
    const w = Math.max(s.w, measureText(label).w);
    if (x > GAP && x + w + GAP > MAX_W) {
      x = GAP;
      y += rowH + LABEL + GAP;
      rowH = 0;
    }
    placed.push({ x, y, w, label, s });
    x += w + GAP;
    rowH = Math.max(rowH, s.h);
    width = Math.max(width, x);
  }
  const out = new Surface(width, y + rowH + LABEL + GAP).clear(col('cream.2'));
  for (const p of placed) {
    out.draw(p.s, p.x, p.y);
    drawText(out, lut, p.label, p.x, p.y + p.s.h + 1);
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// palette.png
// ---------------------------------------------------------------------------------------

function palette(): Surface {
  const ramps = new Map<string, Slot[]>();
  for (const slot of SLOTS) {
    const ramp = slot.slice(0, slot.lastIndexOf('.'));
    ramps.set(ramp, [...(ramps.get(ramp) ?? []), slot]);
  }
  const letter = new Map<string, string>();
  for (const [ch, slot] of Object.entries(LEGEND)) if (slot) letter.set(slot, ch);
  const CW = 46;
  const CH = 26;
  const GAP = 4;
  const rows = [...ramps.values()];
  const cols = Math.max(...rows.map((r) => r.length));
  const out = new Surface(GAP + cols * CW, GAP + rows.length * CH).clear(col('cream.2'));
  rows.forEach((ramp, j) => {
    ramp.forEach((slot, i) => {
      const x = GAP + i * CW;
      const y = GAP + j * CH;
      out.rect(x, y, CW - GAP, 12, col('steel.0'));
      out.rect(x + 1, y + 1, CW - GAP - 2, 10, col(slot));
      // the slot name, then the letter that stands for it in a sprite grid
      drawText(out, lut, slot, x, y + 13);
      drawText(out, lut, letter.get(slot) ?? '', x + CW - GAP, y + 13, { align: 'right', slot: 'brick.1' });
    });
  });
  return out;
}

const outputs: [string, Surface][] = [
  ['docs/style/stylekey.png', scene().scaled(4)],
  ['docs/style/characters.png', characters().scaled(5)],
  ['docs/style/pieces.png', pieces().scaled(8)],
  ['docs/style/palette.png', palette().scaled(4)],
];
for (const [path, surface] of outputs) {
  writePNG(path, surface);
  console.log(`${path} (${surface.w}x${surface.h})`);
}
