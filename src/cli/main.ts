/**
 * The Simutown command-line tool.
 *
 *   pnpm simutown render scenes/tiny.ts -o out/tiny.mp4
 *   pnpm simutown still scenes/tiny.ts -t 4
 *   pnpm simutown list
 *   pnpm simutown info tiny
 *
 * `run` takes the arguments and an output sink and returns an exit code, so tests can
 * drive it in-process; the bottom of the file wires it to the real process.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { Scene } from '../core/types';
import { renderStill, renderVideo } from '../node/video';
import { assertScene, describeScene } from '../player/scene-info';

/** Where the CLI writes. Tests pass a recorder; the real CLI passes stdout and stderr. */
export interface CliIO {
  out(line: string): void;
  err(line: string): void;
  /** Overwrite the current status line (progress). Optional. */
  status?(line: string): void;
  /** Directory relative paths are resolved against. Default `$INIT_CWD` or the cwd. */
  cwd?: string;
}

/** The repository root, where `scenes/` lives. */
export const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');

export const HELP = `simutown - render pixel-town scenes

Usage
  pnpm simutown render <scene> [-o file] [--scale n] [--fps n] [--from s] [--to s]
  pnpm simutown still  <scene> [-t seconds] [-o file] [--scale n]
  pnpm simutown list
  pnpm simutown info   <scene>
  pnpm simutown --help

<scene> is a .ts file that default-exports a Scene, or the name of one in scenes/
("tiny" means scenes/tiny.ts).

render   Encode the scene with ffmpeg. The format follows the extension of -o:
           .mp4   H.264, x4 (1920x1080), scene fps          (default: out/<name>.mp4)
           .gif   palette-generated, x2 (960x540), 15 fps
           .webm  VP9, x4, scene fps
         --scale   integer upscale (nearest neighbour)
         --fps     output frame rate
         --from/--to  render only this range, in seconds
still    One frame as a PNG, x4 by default. -t defaults to the middle of the scene.
list     The scenes in scenes/, with their titles and lengths.
info     Title, duration, town size and cast of a scene.

Examples
  pnpm simutown render tiny
  pnpm simutown render scenes/tiny.ts -o out/tiny.gif --from 2 --to 6
  pnpm simutown still tiny -t 4 -o out/tiny.png
`;

function num(name: string, v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (v.trim() === '' || !Number.isFinite(n)) throw new UsageError(`--${name} expects a number, got "${v}"`);
  return n;
}

class UsageError extends Error {}

/** Resolve a scene argument: a path, or a bare name in scenes/. */
export function resolveScenePath(arg: string, cwd: string): string {
  const direct = isAbsolute(arg) ? arg : resolve(cwd, arg);
  if (existsSync(direct) && extname(direct) !== '') return direct;
  const named = join(ROOT, 'scenes', arg.endsWith('.ts') ? arg : `${arg}.ts`);
  if (existsSync(named)) return named;
  const known = sceneFiles().map((f) => basename(f, '.ts'));
  throw new UsageError(
    `No scene file "${arg}" (looked for ${direct} and ${named}).` +
      (known.length ? `\nScenes in scenes/: ${known.join(', ')}` : ''),
  );
}

/** Import a scene file and check its default export. */
export async function loadScene(path: string): Promise<Scene> {
  let mod: { default?: unknown };
  try {
    mod = (await import(pathToFileURL(path).href)) as { default?: unknown };
  } catch (e) {
    throw new Error(`could not load ${relative(process.cwd(), path) || path}: ${e instanceof Error ? e.message : String(e)}`);
  }
  return assertScene(mod.default, relative(process.cwd(), path) || path);
}

/** The .ts files in scenes/, sorted. */
export function sceneFiles(): string[] {
  const dir = join(ROOT, 'scenes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
    .sort()
    .map((f) => join(dir, f));
}

const secs = (s: number) => `${Number(s.toFixed(2))}s`;

/** Run the CLI. Returns the process exit code. */
export async function run(argv: string[], io: CliIO): Promise<number> {
  const cwd = io.cwd ?? process.env.INIT_CWD ?? process.cwd();
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        output: { type: 'string', short: 'o' },
        scale: { type: 'string' },
        fps: { type: 'string' },
        from: { type: 'string' },
        to: { type: 'string' },
        time: { type: 'string', short: 't' },
      },
    });
    const [command, target, ...extra] = positionals;
    if (values.help || command === undefined || command === 'help') {
      io.out(HELP);
      return command === undefined && !values.help ? 1 : 0;
    }
    if (extra.length > 0) throw new UsageError(`Unexpected arguments: ${extra.join(' ')}`);
    const needScene = async () => {
      if (!target) throw new UsageError(`"${command}" needs a scene, e.g. pnpm simutown ${command} tiny`);
      const path = resolveScenePath(target, cwd);
      return { path, scene: await loadScene(path), name: basename(path, extname(path)) };
    };
    const outPath = (fallback: string) => resolve(cwd, values.output ?? fallback);
    const show = (p: string) => relative(cwd, p) || p;

    switch (command) {
      case 'render': {
        const { scene, name } = await needScene();
        const path = outPath(join(ROOT, 'out', `${name}.mp4`));
        const res = await renderVideo(scene, path, {
          scale: num('scale', values.scale),
          fps: num('fps', values.fps),
          from: num('from', values.from),
          to: num('to', values.to),
          onProgress: (p) => {
            if (p.frame === p.frames || p.frame % 10 === 0) {
              io.status?.(`rendering ${p.frame}/${p.frames} frames (${Math.round((100 * p.frame) / p.frames)}%)`);
            }
          },
        });
        io.status?.('');
        const speed = res.frames / (res.elapsedMs / 1000);
        io.out(
          `${show(res.path)}  ${res.width}x${res.height}, ${res.frames} frames at ${res.fps} fps (${secs(res.duration)}), ` +
            `rendered in ${secs(res.elapsedMs / 1000)} (${speed.toFixed(0)} frames/s)`,
        );
        return 0;
      }
      case 'still': {
        const { scene, name } = await needScene();
        const t = num('time', values.time) ?? scene.duration / 2;
        const path = outPath(join(ROOT, 'out', `${name}-${Number(t.toFixed(2))}s.png`));
        const res = renderStill(scene, t, path, { scale: num('scale', values.scale) });
        io.out(`${show(res.path)}  ${res.width}x${res.height}, t=${secs(t)}`);
        return 0;
      }
      case 'list': {
        const files = sceneFiles();
        if (files.length === 0) {
          io.out('No scenes yet. Add a .ts file to scenes/ that default-exports a Scene.');
          return 0;
        }
        let failed = 0;
        const width = Math.max(...files.map((f) => basename(f, '.ts').length));
        for (const f of files) {
          const name = basename(f, '.ts').padEnd(width);
          try {
            const s = await loadScene(f);
            io.out(`${name}  ${s.title}  (${secs(s.duration)})`);
          } catch (e) {
            failed++;
            io.err(`${name}  error: ${(e as Error).message.split('\n')[0]}`);
          }
        }
        return failed ? 1 : 0;
      }
      case 'info': {
        const { scene, path } = await needScene();
        const i = describeScene(scene);
        io.out(
          [
            i.title,
            `  file      ${show(path)}`,
            `  duration  ${secs(i.duration)}, ${i.frames} frames at ${i.fps} fps`,
            `  frame     ${i.width}x${i.height} (x4 = ${i.width * 4}x${i.height * 4})`,
            `  town      ${i.town.name}, ${i.town.w}x${i.town.h} tiles, ${i.town.props} props`,
            `  places    ${i.town.places.join(', ') || 'none'}`,
            `  cast      ${i.cast.join(', ') || 'nobody'}`,
          ].join('\n'),
        );
        return 0;
      }
      default:
        throw new UsageError(`Unknown command "${command}". Commands: render, still, list, info. Try --help.`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    io.err(`simutown: ${msg}`);
    if (e instanceof UsageError || (e as { code?: string }).code?.startsWith('ERR_PARSE_ARGS')) {
      io.err('Run "pnpm simutown --help" for usage.');
    }
    return 1;
  }
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const tty = process.stderr.isTTY;
  run(process.argv.slice(2), {
    out: (s) => console.log(s),
    err: (s) => console.error(s),
    status: (s) => {
      if (tty) process.stderr.write(`\r\x1b[2K${s}`);
    },
  }).then((code) => {
    process.exitCode = code;
  });
}
