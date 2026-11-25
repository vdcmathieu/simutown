/**
 * Render the whole of a built-in town to one picture, and print its text map.
 *
 *   pnpm tsx tools/town-map.ts [--scale 2] [--hour 12] [--crop tx,ty,w,h] [--labels] [--out file.png]
 *
 * Writes docs/media/willow-square-map.png by default: every tile of the town at noon, with
 * the shadows on. `--hour` picks another time of day (20 shows the lamps and windows lit),
 * `--crop` keeps a rectangle of tiles for a closer look, and `--labels` tags the main
 * places, which helps when planning a scene.
 */
import { Surface } from '../src/core/surface';
import { type Annotation, TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { willowSquare } from '../src/towns';
import { describeTown, tileCenter } from '../src/world';
import { parseHour, takeFlag, takeOption } from './render-args';

const args = process.argv.slice(2);
const scale = Number(takeOption(args, '--scale') ?? 2);
const hour = parseHour(takeOption(args, '--hour') ?? '12');
const crop = takeOption(args, '--crop')?.split(',').map(Number);
const labels = takeFlag(args, '--labels');
const file = takeOption(args, '--out') ?? 'docs/media/willow-square-map.png';

const town = willowSquare;
/** Places worth a tag on the labelled map: doors and the named spots, not every bench seat. */
const tagged = Object.keys(town.places).filter((name) => /\.door$/.test(name) || !name.includes('.') || /^(bridge|pond|park|garden|square)\./.test(name));
const annotations: Annotation[] = labels
  ? tagged.map((name) => {
      const p = town.places[name]!;
      return { kind: 'label', at: tileCenter(p.tx, p.ty), text: name.replace(/\.door$/, ''), opacity: 1 };
    })
  : [];

let frame = new Surface(town.w * TILE, town.h * TILE);
createRenderer(town).render(
  { t: 0, camera: { x: (town.w * TILE) / 2, y: (town.h * TILE) / 2, zoom: 1 }, timeOfDay: hour, actors: [], bubbles: [], annotations },
  frame,
);
if (crop && crop.length === 4) {
  const [tx, ty, w, h] = crop as [number, number, number, number];
  const part = new Surface(w * TILE, h * TILE);
  part.draw(frame, -tx * TILE, -ty * TILE);
  frame = part;
}
writePNG(file, frame.scaled(scale));
console.log(describeTown(town));
console.log(`\n${file} (${frame.w * scale}x${frame.h * scale})`);
