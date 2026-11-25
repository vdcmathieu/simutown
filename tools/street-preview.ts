/**
 * Lay the street props out in a small plaza and render it, to check anchors, footprints,
 * places, fence joins and depth sorting against a character.
 *
 *   pnpm tsx tools/street-preview.ts [--scale 3] [--hour 12] [--frame 0]
 *
 * Writes out/street-plaza.png (lit, at --hour, default 14), out/street-plaza-night.png,
 * out/street-plaza-raw.png (lighting off: the art's own colours) and
 * out/street-plaza-debug.png (raw, with solid tiles tinted and every place marked).
 */
import { streetProps } from '../src/art';
import { compileTheme, daylight, lutRgb } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { type ActorState, FRAME_H, FRAME_W, type PlacedProp, TILE, type Town } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';

const args = process.argv.slice(2);
const opt = (name: string, dflt: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const scale = opt('scale', 3);
// --t picks the animation time, to step through the fountain's frames.
const W = 30;
const H = 17;

const props: PlacedProp[] = [
  { kind: 'fountain', tx: 13, ty: 8 },
  { kind: 'lamp', tx: 10, ty: 6 },
  { kind: 'lamp', tx: 18, ty: 6 },
  { kind: 'bench', tx: 9, ty: 10 },
  { kind: 'bench', tx: 18, ty: 10 },
  { kind: 'stall', tx: 3, ty: 4 },
  { kind: 'stall-teal', tx: 23, ty: 4 },
  { kind: 'well', tx: 3, ty: 12 },
  { kind: 'noticeboard', tx: 7, ty: 3 },
  { kind: 'signpost', tx: 21, ty: 13 },
  { kind: 'mailbox', tx: 19, ty: 3 },
  { kind: 'clock', tx: 15, ty: 3 },
  { kind: 'crate', tx: 7, ty: 5 },
  { kind: 'crate', tx: 7, ty: 6 },
  { kind: 'barrel', tx: 8, ty: 6 },
  { kind: 'planter', tx: 12, ty: 11 },
  { kind: 'planter', tx: 17, ty: 11 },
  { kind: 'bin', tx: 20, ty: 6 },
  { kind: 'cart', tx: 21, ty: 7 },
];
// A fenced garden in the bottom right: a run with two corners and two vertical runs, and a
// lone run with both ends, so every fence piece is shown joined to its neighbours.
props.push({ kind: 'fence-h-left', tx: 23, ty: 11 }, { kind: 'fence-h-right', tx: 28, ty: 11 });
for (let tx = 24; tx <= 27; tx++) props.push({ kind: 'fence-h', tx, ty: 11 });
for (let ty = 12; ty <= 15; ty++) props.push({ kind: 'fence-v', tx: 23, ty }, { kind: 'fence-v', tx: 28, ty });
props.push({ kind: 'fence-h-left', tx: 1, ty: 15 }, { kind: 'fence-h', tx: 2, ty: 15 }, { kind: 'fence-h-right', tx: 3, ty: 15 });
props.push({ kind: 'fence-v-top', tx: 0, ty: 8 }, { kind: 'fence-v', tx: 0, ty: 9 }, { kind: 'fence-v', tx: 0, ty: 10 });

function buildTown(): Town {
  const terrain: string[] = [];
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) terrain.push(tx >= 6 && tx <= 22 && ty >= 2 && ty <= 13 ? 'cobble' : 'grass');
  }
  const solid = new Uint8Array(W * H);
  const places: Town['places'] = {};
  for (const p of props) {
    const def = streetProps[p.kind];
    if (!def) throw new Error(`unknown prop "${p.kind}". Try: ${Object.keys(streetProps).join(', ')}`);
    const fp = def.footprint ?? { w: 0, h: 0 };
    for (let dy = 0; dy < fp.h; dy++) for (let dx = 0; dx < fp.w; dx++) solid[(p.ty - dy) * W + p.tx + dx] = 1;
    for (const [name, at] of Object.entries(def.places ?? {})) {
      places[`${p.kind}@${p.tx},${p.ty}.${name}`] = { tx: p.tx + at.dx, ty: p.ty + at.dy };
    }
  }
  return { name: 'plaza', w: W, h: H, terrain, props, places, solid };
}

const town = buildTown();
const cast = ['ana', 'tomas', 'mira'];
let n = 0;
const actor = (id: string, tx: number, ty: number): ActorState => ({
  id,
  character: cast[n++ % cast.length]!,
  x: tx * TILE + 8,
  y: ty * TILE + 12,
  dir: 'down',
  pose: 'idle',
  animTime: 0,
});
// Ana at the fountain's four sides, behind a stall and in front of a bench.
const actors = [
  actor('n', 14, 6), actor('s', 14, 9), actor('e', 16, 8), actor('w', 12, 8),
  actor('vendor', 4, 3), actor('bench', 10, 11),
];

const lut = compileTheme(daylight);
const state = (hour: number) => ({
  t: opt('t', 0),
  camera: { x: (W * TILE) / 2, y: (H * TILE) / 2, zoom: 1 },
  timeOfDay: hour,
  actors,
  bubbles: [],
});
// Lit at the chosen hour (shadows, grade, lamps), and once more in the art's raw colours.
const frame = new Surface(FRAME_W, FRAME_H);
createRenderer(town).render(state(opt('hour', 14)), frame);
writePNG('out/street-plaza.png', frame.scaled(scale));
createRenderer(town).render(state(20.5), frame);
writePNG('out/street-plaza-night.png', frame.scaled(scale));
createRenderer(town, { lighting: false }).render(state(12), frame);
writePNG('out/street-plaza-raw.png', frame.scaled(scale));

// Debug overlay: solid tiles tinted brick, places as teal dots, every solid place flagged.
const ox = Math.round(FRAME_W / 2 - (W * TILE) / 2);
const oy = Math.round(FRAME_H / 2 - (H * TILE) / 2);
for (let ty = 0; ty < H; ty++) {
  for (let tx = 0; tx < W; tx++) {
    if (town.solid[ty * W + tx]) frame.rect(ox + tx * TILE, oy + ty * TILE, TILE, TILE, [...lutRgb(lut, 'brick.2'), 90]);
  }
}
for (const [name, p] of Object.entries(town.places)) {
  const blocked = town.solid[p.ty * W + p.tx] === 1;
  if (blocked) console.log(`place on a solid tile: ${name}`);
  frame.rect(ox + p.tx * TILE + 6, oy + p.ty * TILE + 6, 4, 4, [...lutRgb(lut, blocked ? 'brick.0' : 'teal.1'), 255]);
}
writePNG('out/street-plaza-debug.png', frame.scaled(scale));
console.log('out/street-plaza.png, out/street-plaza-debug.png');
