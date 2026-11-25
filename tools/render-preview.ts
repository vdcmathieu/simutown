/**
 * Render the synthetic preview town (tools/render-art.ts) to PNGs, to judge the renderer by eye.
 *
 *   pnpm tsx tools/render-preview.ts [--scale 2] [--t 1.3]
 *                                    [--time-of-day 19:30] [--zoom 2] [--annotate] [--focus 0.5] [--plain]
 *                                    [--crop x,y,w,h] [--strip] [--out out/render]
 *
 * With no time given it writes the four review hours (12:00, 18:00, 19:30, 23:00).
 * `--annotate` adds rings, links and focus dimming (`--focus` sets how much, 0 for none).
 * `--plain` leaves out the bubble and the caption. `--crop` cuts a region of the native
 * frame (in pixels) before scaling, for a close look. `--strip` writes one sheet with every
 * second hour of the day, to check that the moods flow into each other.
 */
import { Surface } from '../src/core/surface';
import { type ActorState, FRAME_H, FRAME_W, type FrameState, TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { hourTag, parseHour, REVIEW_HOURS, takeFlag, takeOption } from './render-args';
import { buildPreviewTown, previewArt } from './render-art';

const args = process.argv.slice(2);
const scale = Number(takeOption(args, '--scale') ?? 2);
const t = Number(takeOption(args, '--t') ?? 1.3);
const hourArg = takeOption(args, '--time-of-day');
const zoom = Number(takeOption(args, '--zoom') ?? 1);
const crop = takeOption(args, '--crop')?.split(',').map(Number);
const outDir = takeOption(args, '--out') ?? 'out/render';
const focus = Number(takeOption(args, '--focus') ?? 1);
const annotate = takeFlag(args, '--annotate');
const plain = takeFlag(args, '--plain');
const strip = takeFlag(args, '--strip');

const town = buildPreviewTown();
const renderer = createRenderer(town, { art: previewArt });

/** The preview frame: people under lamps, by the fire, at a door and out in the dark. */
export function previewFrame(time: number, hour: number): FrameState {
  const actor = (id: string, character: string, x: number, y: number, extra: Partial<ActorState> = {}): ActorState => ({
    id,
    character,
    x,
    y,
    dir: 'down',
    pose: 'idle',
    animTime: time,
    ...extra,
  });
  const actors: ActorState[] = [
    actor('mira', 'mira', 112, 126, { dir: 'right' }),
    actor('tomas', 'tomas', 134, 128, { dir: 'left', emote: 'heart' }),
    actor('ana', 'ana', 56, 122),
    actor('ana-2', 'ana', 264, 180, { dir: 'left' }),
    actor('tomas-2', 'tomas', 214, 196, { dir: 'up' }),
    actor('mira-2', 'mira', 330, 160, { dir: 'right', pose: 'walk' }),
    actor('ana-3', 'ana', 420, 158, { dir: 'left', pose: 'walk' }),
    actor('tomas-3', 'tomas', 390, 232),
  ];
  const state: FrameState = {
    t: time,
    camera: zoom > 1 ? { x: 150, y: 120, zoom } : { x: (town.w * TILE) / 2, y: (town.h * TILE) / 2, zoom: 1 },
    timeOfDay: hour,
    actors,
    bubbles: plain ? [] : [{ actor: 'mira', text: 'Lovely evening.', kind: 'say', reveal: 1 }],
    ...(plain ? {} : { caption: { text: 'The preview town.', opacity: 1 } }),
  };
  if (annotate) {
    state.annotations = [
      { kind: 'ring', actor: 'mira', progress: 1 },
      { kind: 'ring', actor: 'ana-2', progress: 0.6 },
      { kind: 'link', from: 'mira', to: 'ana-2', progress: 0.8 },
      { kind: 'link', from: 'mira', to: 'ana', progress: 1 },
      { kind: 'label', actor: 'tomas', text: 'knows', opacity: 1 },
    ];
    state.focus = { actors: ['mira', 'tomas', 'ana-2'], amount: focus };
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

const tag = `${zoom > 1 ? `-zoom${zoom}` : ''}${annotate ? '-annot' : ''}${crop ? '-crop' : ''}`;
if (strip) {
  const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 17, 18, 19, 19.5, 20, 21, 22];
  const cols = 4;
  const sheet = new Surface(FRAME_W * cols, FRAME_H * Math.ceil(hours.length / cols));
  hours.forEach((hour, i) => sheet.draw(renderAt(hour), (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H));
  writePNG(`${outDir}/strip${tag}.png`, sheet);
  console.log(`${outDir}/strip${tag}.png (${hours.map(hourTag).join(' ')})`);
} else {
  for (const hour of hourArg === undefined ? REVIEW_HOURS : [parseHour(hourArg)]) {
    const file = `${outDir}/preview${tag}-${hourTag(hour)}.png`;
    writePNG(file, renderAt(hour).scaled(scale));
    console.log(file);
  }
}
