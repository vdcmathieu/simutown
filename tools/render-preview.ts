/**
 * Render the synthetic preview town (tools/render-art.ts) to PNGs, to judge the renderer by eye.
 *
 *   pnpm tsx tools/render-preview.ts [--theme dusk|sunny] [--scale 2] [--t 1.3]
 *                                    [--time-of-day 19:30] [--zoom 2] [--annotate] [--focus 0.5]
 *                                    [--crop x,y,w,h] [--strip] [--out out/render]
 *
 * With no time given it writes the four review hours (12:00, 18:00, 19:30, 23:00).
 * `--annotate` adds rings, links and focus dimming (`--focus` sets how much, 0 for none).
 * `--crop` cuts a region of the native
 * frame (in pixels) before scaling, for a close look. `--strip` writes one sheet with every
 * second hour of the day, to check that the moods flow into each other.
 */
import { dusk } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { type ActorState, FRAME_H, FRAME_W, type FrameState, TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { hourTag, parseHour, REVIEW_HOURS, takeFlag, takeOption } from './render-args';
import { buildPreviewTown, previewArt, sunny } from './render-art';

const args = process.argv.slice(2);
const themeName = takeOption(args, '--theme') ?? 'dusk';
const scale = Number(takeOption(args, '--scale') ?? 2);
const t = Number(takeOption(args, '--t') ?? 1.3);
const hourArg = takeOption(args, '--time-of-day');
const zoom = Number(takeOption(args, '--zoom') ?? 1);
const crop = takeOption(args, '--crop')?.split(',').map(Number);
const outDir = takeOption(args, '--out') ?? 'out/render';
const focus = Number(takeOption(args, '--focus') ?? 1);
const annotate = takeFlag(args, '--annotate');
const strip = takeFlag(args, '--strip');

const town = buildPreviewTown();
const renderer = createRenderer(town, { art: previewArt, theme: themeName === 'sunny' ? sunny : dusk });

/** Feet position of someone standing on a tile, nudged by a few pixels. */
function at(tx: number, ty: number, dx = 0, dy = 0): { x: number; y: number } {
  return { x: tx * TILE + 8 + dx, y: ty * TILE + 12 + dy };
}

/** The preview frame: people under lamps, by the fire, at a window and out in the dark. */
export function previewFrame(time: number, hour: number): FrameState {
  const actor = (id: string, character: string, pos: { x: number; y: number }, pose = 'idle'): ActorState => ({
    id,
    character,
    ...pos,
    dir: 'down',
    pose,
    animTime: time,
  });
  const actors: ActorState[] = [
    actor('ana', 'ana', at(11, 6, 4, 2)),
    actor('ben', 'ben', at(12, 6, 12, 4)),
    actor('cy', 'cy', at(13, 12, 6, 0), 'walk'),
    actor('dee', 'dee', at(18, 12, 0, 0)),
    actor('fay', 'dee', at(24, 8, 10, 4)),
    actor('gus', 'ben', at(20, 6, -2, -2)),
    actor('hal', 'cy', at(5, 7, 0, 0)),
  ];
  const state: FrameState = {
    t: time,
    camera: zoom > 1 ? { x: 13 * TILE, y: 6 * TILE + 8, zoom } : { x: (town.w * TILE) / 2, y: (town.h * TILE) / 2, zoom: 1 },
    timeOfDay: hour,
    actors,
    bubbles: [{ actor: 'ana', text: 'Lovely evening.', kind: 'say', reveal: 1 }],
    caption: { text: 'The preview town.', opacity: 1 },
  };
  if (annotate) {
    state.annotations = [
      { kind: 'ring', actor: 'ana', progress: 1 },
      { kind: 'ring', actor: 'fay', progress: 0.6 },
      { kind: 'link', from: 'ana', to: 'fay', progress: 0.8 },
      { kind: 'link', from: 'ana', to: 'ben', progress: 1 },
      { kind: 'label', actor: 'ana', text: 'knows', opacity: 1 },
    ];
    state.focus = { actors: ['ana', 'ben', 'fay'], amount: focus };
  }
  return state;
}

function renderAt(hour: number): Surface {
  const frame = new Surface(FRAME_W, FRAME_H);
  renderer.render(previewFrame(t, hour), frame);
  if (!crop) return frame;
  const [cx = 0, cy = 0, cw = FRAME_W, ch = FRAME_H] = crop;
  const cut = new Surface(cw, ch);
  cut.draw(frame, -cx, -cy);
  return cut;
}

const tag = `${themeName}${zoom > 1 ? `-zoom${zoom}` : ''}${annotate ? '-annot' : ''}${crop ? '-crop' : ''}`;
if (strip) {
  const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 19.5, 20, 21, 22];
  const cols = 4;
  const sheet = new Surface(FRAME_W * cols, FRAME_H * Math.ceil(hours.length / cols));
  hours.forEach((hour, i) => sheet.draw(renderAt(hour), (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H));
  writePNG(`${outDir}/strip-${tag}.png`, sheet);
  console.log(`${outDir}/strip-${tag}.png (${hours.map(hourTag).join(' ')})`);
} else {
  for (const hour of hourArg === undefined ? REVIEW_HOURS : [parseHour(hourArg)]) {
    const file = `${outDir}/preview-${tag}-${hourTag(hour)}.png`;
    writePNG(file, renderAt(hour).scaled(scale));
    console.log(file);
  }
}
