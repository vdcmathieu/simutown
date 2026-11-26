/**
 * Refresh the pictures the README shows of the three example films.
 *
 *   pnpm tsx tools/film-media.ts [name ...] [--out docs/media] [--scale n] [--fps n] [--from s] [--to s]
 *
 * For each film (all three, or the ones named) it writes `<out>/<name>.gif`, a loop small
 * enough for a README (under 4 MB), and `<out>/<name>.png`, a 1920 x 1080 still of its
 * most telling moment. The settings are in `FILMS` below; `--scale`, `--fps`, `--from` and
 * `--to` override them for a trial. The town map is a separate tool: `pnpm tsx tools/town-map.ts`.
 *
 * The GIFs are encoded here rather than by `simutown render`, to keep them small: one
 * palette with a transparent entry and `diff_mode=rectangle`, so a frame stores only the
 * pixels that changed. With a locked camera that is a few people, not the whole town.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Surface } from '../src/core/surface';
import type { Scene } from '../src/core/types';
import { renderStill } from '../src/node/video';
import { createRenderer } from '../src/render';
import { takeOption } from './render-args';

interface Film {
  name: string;
  /** The still: seconds into the film. */
  still: number;
  /** The GIF: integer upscale, frames a second, and the part of the film it shows. A negative `to` counts back from the end. */
  gif: { scale: number; fps: number; from?: number; to?: number };
}

const FILMS: Film[] = [
  // Ana's welcome, with the children at the fountain. The GIF opens on the morning square: the pan
  // through the dawn before it changes every pixel of every frame, and would double the file.
  { name: 'hello', still: 11, gif: { scale: 2, fps: 12, from: 3, to: -0.8 } },
  // The party: all ten numbered and ringed around the fountain, under the last caption. The GIF
  // leaves out the fade in and the fade out, and loops from the party back to the title card.
  { name: 'word-of-mouth', still: 52.55, gif: { scale: 2, fps: 10, from: 0.5, to: -1 } },
  // Dusk: lamps and windows on, the last people heading home. The light changes the whole picture
  // all day long, so this GIF is at x1; it loops from the night straight into the next dawn.
  { name: 'day-and-night', still: 19.5, gif: { scale: 1, fps: 12, from: 0.8, to: -1 } },
];

const args = process.argv.slice(2);
const outDir = takeOption(args, '--out') ?? 'docs/media';
const scaleArg = takeOption(args, '--scale');
const fpsArg = takeOption(args, '--fps');
const fromArg = takeOption(args, '--from');
const toArg = takeOption(args, '--to');
const chosen = args.length ? FILMS.filter((f) => args.includes(f.name)) : FILMS;
if (chosen.length === 0) throw new Error(`no such film: ${args.join(', ')}. Films: ${FILMS.map((f) => f.name).join(', ')}`);
mkdirSync(outDir, { recursive: true });

/** Encode part of a scene as a GIF with ffmpeg, frame by frame over a pipe. */
async function writeGif(scene: Scene, file: string, scale: number, fps: number, from: number, to: number): Promise<number> {
  const filter =
    `[0:v]scale=${scene.width * scale}:${scene.height * scale}:flags=neighbor,split[a][b];` +
    '[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle';
  const ffmpeg = spawn(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${scene.width}x${scene.height}`, '-r', String(fps), '-i', 'pipe:0', '-filter_complex', filter, '-loop', '0', file],
    { stdio: ['pipe', 'ignore', 'inherit'] },
  );
  const closed = once(ffmpeg, 'close');
  const renderer = createRenderer(scene.town, { art: scene.art });
  const frame = new Surface(scene.width, scene.height);
  const frames = Math.round((to - from) * fps);
  for (let i = 0; i < frames; i++) {
    renderer.render(scene.frame(from + i / fps), frame);
    if (!ffmpeg.stdin.write(Buffer.from(frame.data))) await once(ffmpeg.stdin, 'drain');
  }
  ffmpeg.stdin.end();
  const [code] = await closed;
  if (code !== 0) throw new Error(`ffmpeg failed to write ${file} (exit ${code})`);
  return frames;
}

for (const film of chosen) {
  const scene = ((await import(pathToFileURL(join(process.cwd(), 'scenes', `${film.name}.ts`)).href)) as { default: Scene }).default;
  const still = renderStill(scene, film.still, join(outDir, `${film.name}.png`), { scale: 4 });
  console.log(`${still.path}  ${still.width}x${still.height}, t=${film.still}s`);

  const scale = Number(scaleArg ?? film.gif.scale);
  const fps = Number(fpsArg ?? film.gif.fps);
  const from = Number(fromArg ?? film.gif.from ?? 0);
  const toSet = Number(toArg ?? film.gif.to ?? scene.duration);
  const to = toSet < 0 ? scene.duration + toSet : toSet;
  const file = join(outDir, `${film.name}.gif`);
  const frames = await writeGif(scene, file, scale, fps, from, to);
  const mb = statSync(file).size / 1e6;
  console.log(`${file}  ${scene.width * scale}x${scene.height * scale}, ${frames} frames at ${fps} fps (${from}s to ${to.toFixed(1)}s), ${mb.toFixed(2)} MB${mb > 4 ? '   <- over 4 MB' : ''}`);
}
