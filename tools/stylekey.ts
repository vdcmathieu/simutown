/**
 * Render the style key: the shared visual reference every artist draws against.
 *
 *   pnpm tsx tools/stylekey.ts
 *
 * Writes three PNGs into docs/style/ (they are committed):
 *   stylekey.png    a corner of Willow Square at midday, hand-laid, at scale 4
 *   characters.png  every townsperson: rows are down, left, right, up; columns are the
 *                   two idle frames (on paving) and the four walk frames (on grass)
 *   palette.png     the palette, one row per ramp, dark to light, each swatch labelled
 *                   with its slot name and its sprite-grid letter (in red)
 *
 * The scene is composed here, by hand, without the renderer: the style key must not
 * change when the renderer does.
 */
import { art } from '../src/art';
import { compileTheme, daylight, lutRgb, SLOTS, type Slot } from '../src/core/palette';
import { LEGEND, type Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import { type Dir, type FringeSide, TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { drawText } from '../src/ui';

const lut = compileTheme(daylight);
const col = (slot: Slot, a = 255) => [...lutRgb(lut, slot), a] as const;

// ---------------------------------------------------------------------------------------
// stylekey.png: a sunny corner of Willow Square
// ---------------------------------------------------------------------------------------

// g grass, c cobble (paving), d dirt, w water (natural pond), b basin (stone-rimmed water)
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
const TERRAIN: Record<string, string> = { g: 'grass', c: 'cobble', d: 'dirt', w: 'water', b: 'basin' };

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

const terrainAt = (tx: number, ty: number) => {
  const row = MAP[Math.max(0, Math.min(MAP.length - 1, ty))]!;
  return art.terrain[TERRAIN[row[Math.max(0, Math.min(row.length - 1, tx))]!]!]!;
};

/** A small deterministic hash of a tile position, to pick a ground variant. */
function hash(tx: number, ty: number): number {
  let h = (Math.imul(tx + 11, 374761393) + Math.imul(ty + 7, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 15)) >>> 0;
}

/** A flat ink ellipse at 22% alpha: the contact shadow the renderer will draw at midday. */
function shadow(out: Surface, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = -ry; y <= ry; y++) {
    for (let x = -rx; x <= rx; x++) {
      const inside = (x * x) / ((rx + 0.5) * (rx + 0.5)) + (y * y) / ((ry + 0.5) * (ry + 0.5)) <= 1;
      if (inside) out.rect(cx + x, cy + y, 1, 1, col('steel.0', 56));
    }
  }
}

function scene(): Surface {
  const w = MAP[0]!.length;
  const h = MAP.length;
  const out = new Surface(w * TILE, h * TILE).clear(col('moss.2'));

  // ground, then the fringes of higher-priority neighbours on top of it
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const def = terrainAt(tx, ty);
      const looks = def.anim ? [def.anim.frames[0]!] : def.variants;
      out.blit(looks[hash(tx, ty) % looks.length]!, tx * TILE, ty * TILE, lut);
    }
  }
  // `fringe.n` is drawn on the tile north of the terrain, so a tile looks south for it.
  const edges: [FringeSide, number, number][] = [['n', 0, 1], ['s', 0, -1], ['w', 1, 0], ['e', -1, 0]];
  const corners: [FringeSide, number, number][] = [['nw', 1, 1], ['ne', -1, 1], ['sw', 1, -1], ['se', -1, -1]];
  const inner: [FringeSide, FringeSide, FringeSide][] = [
    ['in-ne', 'n', 'e'], ['in-nw', 'n', 'w'], ['in-se', 's', 'e'], ['in-sw', 's', 'w'],
  ];
  for (let ty = 0; ty < h; ty++) {
    for (let tx = 0; tx < w; tx++) {
      const here = terrainAt(tx, ty);
      const over = Object.values(art.terrain)
        .filter((t) => t.priority > here.priority && t.fringe)
        .sort((a, b) => a.priority - b.priority);
      for (const t of over) {
        const f = t.fringe!;
        const is = (dx: number, dy: number) => terrainAt(tx + dx, ty + dy) === t;
        const put = (side: FringeSide) => f[side] && out.blit(f[side]!, tx * TILE, ty * TILE, lut);
        const wanted = new Set(edges.filter(([, dx, dy]) => is(dx, dy)).map(([side]) => side));
        // two adjacent edges become one inner-corner piece, when the terrain has one
        const used = new Set<FringeSide>();
        for (const [key, a, b] of inner) {
          if (wanted.has(a) && wanted.has(b) && f[key]) {
            put(key);
            used.add(a).add(b);
          }
        }
        for (const side of wanted) if (!used.has(side)) put(side);
        for (const [side, dx, dy] of corners) {
          if (is(dx, dy) && !is(dx, 0) && !is(0, dy)) put(side);
        }
      }
    }
  }

  // flat props lie on the ground under everything
  for (const p of PROPS) {
    const def = art.props[p.kind]!;
    if (def.flat) out.blit(def.sprite, p.tx * TILE, (p.ty + 1) * TILE, lut);
  }

  // contact shadows
  const SHADOWS: Record<string, [number, number, number, number]> = {
    tree: [8, -2, 11, 3],
    lamp: [8, -1, 5, 2],
    bench: [16, -1, 15, 2],
  };
  for (const p of PROPS) {
    const s = SHADOWS[p.kind];
    if (s) shadow(out, p.tx * TILE + s[0], (p.ty + 1) * TILE + s[1], s[2], s[3]);
  }
  for (const a of ACTORS) shadow(out, a.x, a.y - 1, 5, 2);
  // a building throws a thin strip along its base
  for (const p of PROPS) {
    const def = art.props[p.kind]!;
    if ((def.footprint?.h ?? 0) >= 2) out.rect(p.tx * TILE + 2, (p.ty + 1) * TILE, def.sprite.w - 2, 2, col('steel.0', 56));
  }

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
  const blockW = 6 * CW;
  const blockH = dirs.length * CH;
  const out = new Surface(GAP + people.length * (blockW + GAP), blockH + GAP * 2).clear(col('cream.2'));
  people.forEach((def, i) => {
    const x0 = GAP + i * (blockW + GAP);
    out.rect(x0, GAP, 2 * CW, blockH, col('cream.1'));
    out.rect(x0 + 2 * CW, GAP, 4 * CW, blockH, col('moss.2'));
    dirs.forEach((dir, j) => {
      const frames = [...def.idle[dir].slice(0, 2), ...def.walk[dir].slice(0, 4)];
      frames.forEach((s, k) => {
        const x = x0 + k * CW + CW / 2;
        const y = GAP + j * CH + CH - 2;
        shadow(out, x, y - 1, 5, 2);
        out.blit(s, x, y, lut);
      });
    });
  });
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
  ['docs/style/palette.png', palette().scaled(4)],
];
for (const [path, surface] of outputs) {
  writePNG(path, surface);
  console.log(`${path} (${surface.w}x${surface.h})`);
}
