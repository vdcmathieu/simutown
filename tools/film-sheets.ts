/**
 * Contact sheets of a rendered film, for watching it frame by frame without a video player.
 *
 *   pnpm tsx tools/film-sheets.ts <scene> [--render] [--fps 2] [--from s] [--to s]
 *                                 [--cols 3] [--rows 3] [--scale 1] [--out dir]
 *
 * `<scene>` is a name in scenes/ (the film is out/<scene>.mp4) or a path to a video file.
 * `--render` renders the scene to out/<scene>.mp4 first. ffmpeg then samples the film at
 * `--fps` frames a second (2 for a full viewing, 6 for a closer look at a few seconds
 * picked with `--from` and `--to`), and the frames are tiled into sheets of `--cols` x
 * `--rows`, each frame under its timestamp. A frame is 480 x 270 times `--scale`, so the
 * default sheet is 1444 x 850: every film pixel is one sheet pixel.
 *
 * Sheets go to out/sheets/film/<scene>-<fps>fps-<nn>.png, and the list is printed with the
 * seconds each one covers. No shell is involved: ffmpeg is run directly.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileTheme, dusk, lutRgb } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { FRAME_H, FRAME_W, type Scene } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { renderVideo } from '../src/node/video';
import { drawText } from '../src/ui';
import { takeFlag, takeOption } from './render-args';

const args = process.argv.slice(2);
const render = takeFlag(args, '--render');
const fps = Number(takeOption(args, '--fps') ?? 2);
const from = Number(takeOption(args, '--from') ?? 0);
const toArg = takeOption(args, '--to');
const cols = Number(takeOption(args, '--cols') ?? 3);
const rows = Number(takeOption(args, '--rows') ?? 3);
const scale = Number(takeOption(args, '--scale') ?? 1);
const outDir = takeOption(args, '--out') ?? 'out/sheets/film';
const target = args[0];
if (!target) throw new Error('usage: pnpm tsx tools/film-sheets.ts <scene> [--render] [--fps 2] [--from s] [--to s]');

const isFile = extname(target) !== '';
const name = basename(target, extname(target));
const film = isFile ? target : `out/${name}.mp4`;

if (render) {
  if (isFile) throw new Error('--render needs a scene name, not a video file');
  const mod = (await import(pathToFileURL(join(process.cwd(), 'scenes', `${name}.ts`)).href)) as { default: Scene };
  const warnings: string[] = [];
  const result = await renderVideo(mod.default, film, { warn: (m) => warnings.push(m) });
  console.log(`${film}: ${result.frames} frames, ${warnings.length} warning(s)`);
  for (const w of warnings) console.log(`  warning: ${w}`);
}
if (!existsSync(film)) throw new Error(`${film} does not exist: render it first, or pass --render`);

/** Frame size on the sheet, and the strip above each frame that carries its timestamp. */
const W = FRAME_W * scale;
const H = FRAME_H * scale;
const STRIP = 12;
const GAP = 2;

const range = [...(from > 0 ? ['-ss', String(from)] : []), ...(toArg === undefined ? [] : ['-to', String(toArg)])];
const ffmpeg = spawnSync(
  'ffmpeg',
  ['-v', 'error', ...range, '-i', film, '-vf', `fps=${fps},scale=${W}:${H}:flags=neighbor`, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
  { maxBuffer: 2 ** 31 - 1 },
);
if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed: ${ffmpeg.stderr.toString() || ffmpeg.error?.message}`);

const bytes = W * H * 4;
const count = Math.floor(ffmpeg.stdout.length / bytes);
const lut = compileTheme(dusk);
const ink = lutRgb(lut, 'steel.0');
const perSheet = cols * rows;

for (let first = 0; first < count; first += perSheet) {
  const n = Math.min(perSheet, count - first);
  const usedRows = Math.ceil(n / cols);
  const sheet = new Surface(cols * W + (cols - 1) * GAP, usedRows * (H + STRIP) + (usedRows - 1) * GAP).clear(ink);
  for (let i = 0; i < n; i++) {
    const frame = new Surface(W, H);
    frame.data.set(ffmpeg.stdout.subarray((first + i) * bytes, (first + i + 1) * bytes));
    const x = (i % cols) * (W + GAP);
    const y = Math.floor(i / cols) * (H + STRIP + GAP);
    drawText(sheet, lut, `${name}  ${(from + (first + i) / fps).toFixed(2)}s`, x + 2, y, { slot: 'steel.5' });
    sheet.draw(frame, x, y + STRIP);
  }
  const file = join(outDir, `${name}-${fps}fps-${String(first / perSheet + 1).padStart(2, '0')}.png`);
  writePNG(file, sheet);
  const t0 = from + first / fps;
  console.log(`${file}  ${t0.toFixed(1)}s to ${(t0 + (n - 1) / fps).toFixed(1)}s`);
}
