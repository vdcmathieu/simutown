/**
 * Review the terrain and nature art in context, with the real engine.
 *
 *   pnpm tsx tools/terrain-preview.ts [board] [--scale 3] [--crop tx,ty,w,h] [--t 0] [--out name]
 *
 * Boards (see tools/terrain-boards.ts): `town` (default) is a small town with a park, a
 * riverside and gardens; `pairs` lays every terrain against every neighbour it may touch;
 * `lawn` is one big field per ground material, to check that large areas stay calm;
 * `props` lines up every nature prop next to a person. `all` renders every board.
 *
 * Each board is built with `defineTown`, rendered whole with lighting off (the art's own
 * colours) and written to out/terrain-<board>.png. `--crop` keeps a rectangle of tiles,
 * for a closer look at a higher scale.
 */
import { Surface } from '../src/core/surface';
import { TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { type Board, boards } from './terrain-boards';

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const which = args[0] && !args[0].startsWith('--') ? args[0] : 'town';
const scale = Number(opt('scale') ?? 3);
const t = Number(opt('t') ?? 0);
const crop = opt('crop')?.split(',').map(Number);

/** Render a whole board at native size: one pixel of the surface per world pixel. */
function renderBoard(board: Board): Surface {
  const { town } = board;
  const out = new Surface(town.w * TILE, town.h * TILE);
  createRenderer(town, { lighting: board.lighting ?? false }).render(
    {
      t,
      camera: { x: (town.w * TILE) / 2, y: (town.h * TILE) / 2, zoom: 1 },
      timeOfDay: board.hour ?? 12,
      actors: board.actors ?? [],
      bubbles: [],
    },
    out,
  );
  return out;
}

/** A rectangle of tiles cut out of a rendered board. */
function cropTiles(src: Surface, tx: number, ty: number, w: number, h: number): Surface {
  const out = new Surface(w * TILE, h * TILE);
  out.draw(src, -tx * TILE, -ty * TILE);
  return out;
}

const names = which === 'all' ? Object.keys(boards) : [which];
for (const name of names) {
  const make = boards[name];
  if (!make) throw new Error(`Unknown board "${name}". Boards: ${Object.keys(boards).join(', ')}, all.`);
  let frame = renderBoard(make());
  if (crop && crop.length === 4) frame = cropTiles(frame, crop[0]!, crop[1]!, crop[2]!, crop[3]!);
  const file = `out/${opt('out') ?? `terrain-${name}`}.png`;
  writePNG(file, frame.scaled(scale));
  console.log(`${file} (${frame.w * scale}x${frame.h * scale})`);
}
