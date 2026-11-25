/**
 * Line every building preset up as two streets and render them with the real engine, to
 * judge them in context: by day in raw colours, and at 20:00 with the lights on.
 *
 *   pnpm tsx tools/buildings-preview.ts [--scale 3] [--hour 20] [--only cafe,bakery]
 *
 * Writes into out/:
 *   buildings-street-day.png    noon, `lighting: false`: the art's own colours
 *   buildings-street-lit.png    the same view at --hour (default 20:00), lighting on
 *   buildings-street-<n>-day.png / -lit.png   the same, cut into frame-sized parts at x4
 * and prints the town map with its footprints and door places.
 *
 * The north street faces a strip of paving; the south street stands with its back to that
 * strip, so people on the paving pass behind its roofs. Townsfolk stand at a few doors to
 * check scale, and one walks behind a roof to check depth sorting.
 */
import { buildings } from '../src/art';
import { Surface } from '../src/core/surface';
import { type ActorState, type Dir, FRAME_H, FRAME_W, TILE, type Town } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { defineTown, describeTown, type PropSpec, tileCenter } from '../src/world';
import { takeOption } from './render-args';

const args = process.argv.slice(2);
const scale = Number(takeOption(args, '--scale') ?? 3);
const hour = Number(takeOption(args, '--hour') ?? 20);
const only = takeOption(args, '--only')?.split(',');

// Tall buildings on the north street, low ones on the south, so no roof hides a door.
const NORTH = ['townhouse', 'bakery', 'townhall', 'library', 'shop', 'school'];
const SOUTH = ['house', 'cafe', 'cottage-blue', 'post-office', 'house-brick', 'farmhouse', 'shed'];
const listed = new Set([...NORTH, ...SOUTH]);
const missing = Object.keys(buildings).filter((id) => !listed.has(id));
if (missing.length > 0) throw new Error(`buildings-preview: add these presets to a street: ${missing.join(', ')}`);

const keep = (ids: string[]) => ids.filter((id) => !only || only.includes(id));
const widthOf = (ids: string[]) => ids.reduce((n, id) => n + buildings[id]!.footprint!.w + 1, 1);
const north = keep(NORTH);
const south = keep(SOUTH);
const W = Math.max(widthOf(north), widthOf(south), 12);
// rows: 0-8 the north street's sprites, 9-11 paving, 12-14 lawn behind the south street,
// 15-17 its footprints, 18-20 paving, 21 lawn
const NORTH_ROW = 8;
const SOUTH_ROW = 17;
const H = 22;

const props: PropSpec[] = [];
function street(ids: string[], row: number): void {
  let tx = 1 + Math.floor((W - widthOf(ids)) / 2);
  for (const id of ids) {
    props.push({ kind: id, at: [tx, row], id });
    tx += buildings[id]!.footprint!.w + 1;
  }
}
street(north, NORTH_ROW);
street(south, SOUTH_ROW);
// a few street lamps, well apart, so the windows still carry the dusk frame
for (let tx = 6; tx < W - 2; tx += 13) props.push({ kind: 'lamp', at: [tx, 11] });

const paved = (ty: number) => (ty >= 9 && ty <= 11) || (ty >= 18 && ty <= 20);
const terrain = Array.from({ length: H }, (_, ty) => (paved(ty) ? '=' : 'g').repeat(W)).join('\n');
const town: Town = defineTown({ name: 'Building preview', terrain, legend: { g: 'grass', '=': 'cobble' }, props });
console.log(describeTown(town));

// Townsfolk at doors, for scale; one behind the south street's roofs, for depth.
const actors: ActorState[] = [];
function stand(character: string, place: string, dir: Dir = 'down', dy = 0): void {
  const p = town.places[place];
  if (!p) return; // filtered out by --only
  const c = tileCenter(p.tx, p.ty + dy);
  actors.push({ id: `${character}@${place}${dy}`, character, x: c.x, y: c.y, dir, pose: 'idle', animTime: 0 });
}
stand('ana', 'townhall.door', 'up');
stand('tomas', 'townhall.door-right');
stand('mira', 'bakery.door');
stand('ana', 'school.door-right');
stand('tomas', 'shop.door', 'up');
stand('mira', 'cafe.door');
stand('ana', 'house.door');
stand('tomas', 'farmhouse.door');
stand('mira', 'shed.door', 'up');
stand('ana', 'library.door');
// behind a roof: the first free row behind the building, three and four rows above the door row
stand('tomas', 'post-office.door', 'down', -(buildings['post-office']!.footprint!.h + 1));
stand('mira', 'house-brick.door', 'left', -(buildings['house-brick']!.footprint!.h + 1));

function render(lit: boolean): Surface {
  const out = new Surface(W * TILE, H * TILE);
  const renderer = createRenderer(town, { lighting: lit });
  renderer.render({ t: 0, camera: { x: (W * TILE) / 2, y: (H * TILE) / 2, zoom: 1 }, timeOfDay: lit ? hour : 12, actors, bubbles: [] }, out);
  return out;
}

/** Copy a rectangle out of a surface. */
function crop(src: Surface, x: number, y: number, w: number, h: number): Surface {
  const out = new Surface(w, h);
  out.draw(src, -x, -y);
  return out;
}

for (const [name, lit] of [['day', false], ['lit', true]] as const) {
  const full = render(lit);
  writePNG(`out/buildings-street-${name}.png`, full.scaled(scale));
  // frame-sized close-ups at x4, the size the town is shown at on a projector
  const cols = Math.ceil(full.w / FRAME_W);
  const partW = Math.ceil(full.w / cols);
  let n = 1;
  for (const y of [0, full.h - Math.min(full.h, FRAME_H - 60)]) {
    for (let c = 0; c < cols; c++, n++) {
      const x = Math.min(c * partW, full.w - partW);
      writePNG(`out/buildings-street-${n}-${name}.png`, crop(full, x, y, partW, Math.min(full.h, FRAME_H - 60)).scaled(4));
    }
  }
  console.log(`out/buildings-street-${name}.png (${full.w * scale}x${full.h * scale}) and ${n - 1} close-ups out/buildings-street-<n>-${name}.png`);
}
