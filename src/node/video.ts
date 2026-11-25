/**
 * Video and still export. Node only.
 *
 * Every frame comes from `scene.frame(t)` and `createRenderer`, is drawn at the native
 * FRAME_W x FRAME_H, and is piped as raw RGBA into ffmpeg, which upscales it with
 * nearest neighbour and encodes it. Nothing is smoothed anywhere.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import type { Writable } from 'node:stream';
import { Surface } from '../core/surface';
import type { Renderer, Scene } from '../core/types';
import { frameCount } from '../player/clock';
import { createRenderer, type RendererOpts } from '../render';
import { writePNG } from './png';

/** The containers `renderVideo` can write, picked from the file extension. */
export type VideoFormat = 'mp4' | 'gif' | 'webm';

export interface VideoProgress {
  /** Frames written so far, and the total. */
  frame: number;
  frames: number;
  /** Scene time of the last frame written, in seconds. */
  t: number;
}

export interface VideoOpts extends RendererOpts {
  /** Integer upscale factor. Default 4 (1920x1080), or 2 for gif. */
  scale?: number;
  /** Output frame rate. Default the scene's fps, or 15 for gif. */
  fps?: number;
  /** Start of the range, in seconds. Default 0. */
  from?: number;
  /** End of the range, in seconds (exclusive). Default the scene's duration. */
  to?: number;
  /** Override the container instead of using the file extension. */
  format?: VideoFormat;
  /** Called after every frame is handed to ffmpeg. */
  onProgress?: (p: VideoProgress) => void;
  /** The ffmpeg binary. Default `$SIMUTOWN_FFMPEG` or `ffmpeg` on the PATH. */
  ffmpeg?: string;
  /** Use this renderer instead of creating one for the scene's town. */
  renderer?: Renderer;
}

export interface VideoResult {
  path: string;
  format: VideoFormat;
  frames: number;
  fps: number;
  width: number;
  height: number;
  /** Seconds of video written. */
  duration: number;
  /** Wall-clock milliseconds the export took. */
  elapsedMs: number;
}

export interface StillOpts extends RendererOpts {
  /** Integer upscale factor. Default 4. */
  scale?: number;
  renderer?: Renderer;
}

const FORMATS: readonly VideoFormat[] = ['mp4', 'gif', 'webm'];

/** The container for a path such as `out/scene.mp4`, or a clear error. */
export function formatFromPath(path: string): VideoFormat {
  const ext = extname(path).slice(1).toLowerCase();
  if ((FORMATS as readonly string[]).includes(ext)) return ext as VideoFormat;
  throw new Error(
    `Cannot tell the video format from "${path}". Use one of: ${FORMATS.map((f) => `.${f}`).join(', ')}.`,
  );
}

/** Resolved export settings: defaults applied and everything validated. */
export interface VideoPlan {
  format: VideoFormat;
  scale: number;
  fps: number;
  /** Scene time of every frame to render, in order. */
  times: number[];
  width: number;
  height: number;
}

/**
 * Work out what to render: format defaults, the frame times in [from, to), and the
 * output size. Pure, so it is easy to test and to show before a long render.
 */
export function planVideo(scene: Scene, path: string, opts: VideoOpts = {}): VideoPlan {
  const format = opts.format ?? formatFromPath(path);
  const scale = opts.scale ?? (format === 'gif' ? 2 : 4);
  const fps = opts.fps ?? (format === 'gif' ? 15 : scene.fps);
  if (!Number.isInteger(scale) || scale < 1 || scale > 16) {
    throw new Error(`scale must be a whole number from 1 to 16, got ${scale}`);
  }
  if (!Number.isFinite(fps) || fps <= 0 || fps > 120) throw new Error(`fps must be between 0 and 120, got ${fps}`);
  const from = opts.from ?? 0;
  const to = opts.to ?? scene.duration;
  if (!Number.isFinite(from) || from < 0) throw new Error(`from must be 0 or more, got ${from}`);
  if (!Number.isFinite(to) || to > scene.duration + 1e-9) {
    throw new Error(`to must be at most the scene's duration (${scene.duration}s), got ${to}`);
  }
  if (to <= from) throw new Error(`the range is empty: from ${from}s to ${to}s`);
  // Frame i shows time from + i / fps; the count is shared with the player.
  const count = frameCount(to - from, fps);
  const times = Array.from({ length: count }, (_, i) => from + i / fps);
  return { format, scale, fps, times, width: scene.width * scale, height: scene.height * scale };
}

/** The ffmpeg command line (without the binary) for a plan. Exposed for tests. */
export function ffmpegArgs(plan: VideoPlan, srcW: number, srcH: number, path: string): string[] {
  const input = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${srcW}x${srcH}`, '-r', String(plan.fps), '-i', 'pipe:0'];
  const up = `scale=${plan.width}:${plan.height}:flags=neighbor`;
  // The palette is tiny, so convert to YUV with a stated matrix and tag it, or players guess.
  const bt709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
  const yuv = `${up}:out_color_matrix=bt709:out_range=tv,format=yuv420p`;
  switch (plan.format) {
    case 'mp4':
      // H.264 High, yuv420p and faststart: plays in QuickTime, Keynote, PowerPoint and browsers.
      return [...input, '-vf', yuv, '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation',
        '-profile:v', 'high', '-pix_fmt', 'yuv420p', ...bt709, '-movflags', '+faststart', path];
    case 'webm':
      return [...input, '-vf', yuv, '-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0', '-row-mt', '1',
        '-deadline', 'good', '-cpu-used', '2', '-pix_fmt', 'yuv420p', ...bt709, path];
    case 'gif':
      // One palette for the whole clip, no dithering: pixel art keeps its flat colours.
      return [...input, '-filter_complex',
        `[0:v]${up},split[a][b];[a]palettegen=max_colors=256:stats_mode=full:reserve_transparent=0[p];` +
          `[b][p]paletteuse=dither=none`,
        '-loop', '0', path];
  }
}

function ffmpegBinary(opts: { ffmpeg?: string }): string {
  return opts.ffmpeg ?? process.env.SIMUTOWN_FFMPEG ?? 'ffmpeg';
}

function missingFfmpeg(bin: string): Error {
  return new Error(
    `ffmpeg was not found (tried "${bin}"). Video export needs it:\n` +
      '  macOS:   brew install ffmpeg\n' +
      '  Debian:  sudo apt install ffmpeg\n' +
      '  Windows: winget install ffmpeg\n' +
      'or point SIMUTOWN_FFMPEG at the binary. Stills (PNG) work without it.',
  );
}

/** True when ffmpeg can be started. Used to skip video tests where it is absent. */
export function hasFfmpeg(opts: { ffmpeg?: string } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn(ffmpegBinary(opts), ['-version'], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
  });
}

/** Write a chunk, waiting for 'drain' when the pipe is full. */
function write(stream: Writable, chunk: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (e: Error) => reject(e);
    stream.once('error', onError);
    const ok = stream.write(chunk);
    const done = () => {
      stream.off('error', onError);
      resolve();
    };
    if (ok) done();
    else stream.once('drain', done);
  });
}

/**
 * Render `scene` to a video file. The format comes from the extension (.mp4, .gif, .webm).
 *
 *   await renderVideo(myScene, 'out/scene.mp4');                     // 1920x1080, 30 fps
 *   await renderVideo(myScene, 'out/scene.gif', { from: 2, to: 5 }); // 960x540, 15 fps
 */
export async function renderVideo(scene: Scene, path: string, opts: VideoOpts = {}): Promise<VideoResult> {
  const started = performance.now();
  const plan = planVideo(scene, path, opts);
  const renderer = opts.renderer ?? createRenderer(scene.town, opts);
  const bin = ffmpegBinary(opts);
  mkdirSync(dirname(path), { recursive: true });
  // ffmpeg writes to a sibling; it replaces `path` only on success, so a failed export
  // never leaves half a file behind or destroys a good one already there.
  const ext = extname(path);
  const partial = join(dirname(path), `${basename(path, ext)}.partial${ext}`);
  try {
    await encode(scene, renderer, plan, bin, partial, path, opts);
    renameSync(partial, path);
  } catch (e) {
    rmSync(partial, { force: true });
    throw e;
  }
  return {
    path,
    format: plan.format,
    frames: plan.times.length,
    fps: plan.fps,
    width: plan.width,
    height: plan.height,
    duration: plan.times.length / plan.fps,
    elapsedMs: performance.now() - started,
  };
}

/** Render every planned frame into ffmpeg, which writes `file`. Errors name `path`. */
async function encode(
  scene: Scene,
  renderer: Renderer,
  plan: VideoPlan,
  bin: string,
  file: string,
  path: string,
  opts: VideoOpts,
): Promise<void> {
  const proc = spawn(bin, ffmpegArgs(plan, scene.width, scene.height, file), {
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  let stderr = '';
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', (s: string) => {
    stderr = (stderr + s).slice(-4000);
  });
  const exited = new Promise<number | null>((resolve, reject) => {
    proc.on('error', (e: NodeJS.ErrnoException) => reject(e.code === 'ENOENT' ? missingFfmpeg(bin) : e));
    proc.on('close', (code) => resolve(code));
  });
  // A broken pipe means ffmpeg died; its exit code and stderr explain why.
  proc.stdin.on('error', () => {});

  const frame = new Surface(scene.width, scene.height);
  let piping = false;
  try {
    // Wait until the process has really started, so a missing binary fails before rendering.
    await new Promise<void>((resolve, reject) => {
      proc.once('spawn', () => resolve());
      exited.catch(reject);
    });
    for (let i = 0; i < plan.times.length; i++) {
      const t = plan.times[i]!;
      renderer.render(scene.frame(t), frame);
      // Copy: the pipe may hold on to the chunk after write() returns, and `frame` is reused.
      piping = true;
      await write(proc.stdin, Buffer.from(frame.data));
      piping = false;
      opts.onProgress?.({ frame: i + 1, frames: plan.times.length, t });
    }
    proc.stdin.end();
  } catch (e) {
    proc.kill('SIGKILL');
    const code = await exited; // rejects with the missing-ffmpeg error if it never started
    // A scene, renderer or progress callback that throws keeps its own error.
    if (!piping) throw e;
    throw new Error(`ffmpeg stopped while writing ${path} (exit ${code}):\n${stderr.trim() || String(e)}`);
  }
  const code = await exited;
  if (code !== 0) throw new Error(`ffmpeg failed to write ${path} (exit ${code}):\n${stderr.trim()}`);
}

/** Render the frame at time `t` to a PNG, upscaled (default x4, 1920x1080). No ffmpeg needed. */
export function renderStill(scene: Scene, t: number, path: string, opts: StillOpts = {}): { path: string; width: number; height: number } {
  if (extname(path).toLowerCase() !== '.png') throw new Error(`Stills are PNG files; "${path}" should end in .png`);
  if (!Number.isFinite(t) || t < 0 || t > scene.duration) {
    throw new Error(`t must be between 0 and the scene's duration (${scene.duration}s), got ${t}`);
  }
  const scale = opts.scale ?? 4;
  if (!Number.isInteger(scale) || scale < 1 || scale > 16) {
    throw new Error(`scale must be a whole number from 1 to 16, got ${scale}`);
  }
  const frame = new Surface(scene.width, scene.height);
  (opts.renderer ?? createRenderer(scene.town, opts)).render(scene.frame(t), frame);
  const out = scale === 1 ? frame : frame.scaled(scale);
  writePNG(path, out);
  return { path, width: out.w, height: out.h };
}
