/**
 * The Simutown command-line tool. `bin.ts` runs it: in this repository as `pnpm simutown`,
 * and in a project that installed the package as `simutown`.
 *
 *   simutown render word-of-mouth -o out/word-of-mouth.gif
 *   simutown still scenes/hello.ts -t 4
 *   simutown info hello --beats
 *   simutown new market-day
 *   simutown list
 *
 * `run` takes the arguments and an output sink and returns an exit code, so tests can
 * drive it in-process.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import type { Scene, SceneBeat } from '../core/types';
import { renderStill, renderVideo } from '../node/video';
import { assertScene, describeScene } from '../player/scene-info';
import { starterScene } from './starter';

/** Where the CLI writes. Tests pass a recorder; the real CLI passes stdout and stderr. */
export interface CliIO {
  out(line: string): void;
  err(line: string): void;
  /** Overwrite the current status line (progress). Optional. */
  status?(line: string): void;
  /** Directory relative paths are resolved against. Default `$INIT_CWD` or the cwd. */
  cwd?: string;
  /** The project, where `scenes/` and `out/` are. Default `projectRoot(cwd)`. */
  root?: string;
}

/** File extensions a scene file may have. A `.ts` scene runs through Node's type stripping (or tsx). */
export const SCENE_EXTENSIONS = ['.ts', '.mts', '.js', '.mjs'];

/** The project a command works in: the nearest folder at or above `cwd` with a package.json, else `cwd`. */
export function projectRoot(cwd: string): string {
  for (let dir = resolve(cwd); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    if (dirname(dir) === dir) return resolve(cwd);
  }
}

export const HELP = `simutown - render pixel-town scenes

Usage
  simutown render <scene> [-o file] [--scale n] [--fps n] [--from s] [--to s]
  simutown still  <scene> [-t seconds] [-o file] [--scale n]
  simutown info   <scene> [--beats]
  simutown new    <name>
  simutown list
  simutown --help

Type "pnpm simutown" in this repository or in a project that uses pnpm, "npx simutown" with npm.

<scene> is a file that default-exports a Scene (.ts or .js), or the name of one in scenes/
or in the current folder ("hello" means scenes/hello.ts).

render   Encode the scene with ffmpeg. The format follows the extension of -o:
           .mp4   H.264, x4 (1920x1080), scene fps          (default: out/<name>.mp4)
           .gif   palette-generated, x2 (960x540), 15 fps
           .webm  VP9, x4, scene fps
         --scale   integer upscale (nearest neighbour)
         --fps     output frame rate
         --from/--to  render only this range, in seconds
still    One frame as a PNG, x4 by default. -t defaults to the middle of the scene.
info     Title, duration, town size and cast of a scene.
         --beats   and its timeline: when each walk, line, caption and camera move starts
new      Write a starter scene to scenes/<name>.ts (./<name>.ts if there is no scenes/).
list     The scenes in scenes/, with their titles and lengths.

Examples
  simutown new market-day
  simutown info market-day --beats
  simutown still market-day -t 4 -o out/market-day.png
  simutown render market-day -o out/market-day.gif --from 2 --to 6
`;

function num(name: string, v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (v.trim() === '' || !Number.isFinite(n)) throw new UsageError(`--${name} expects a number, got "${v}"`);
  return n;
}

class UsageError extends Error {}

/** Resolve a scene argument: a path, or a bare name in `<root>/scenes/` or in `cwd`. */
export function resolveScenePath(arg: string, cwd: string, root: string = projectRoot(cwd)): string {
  const direct = isAbsolute(arg) ? arg : resolve(cwd, arg);
  if (existsSync(direct) && extname(direct) !== '') return direct;
  const ext = extname(arg);
  const name = SCENE_EXTENSIONS.includes(ext) ? arg.slice(0, -ext.length) : arg;
  const tried = [join(root, 'scenes'), cwd].flatMap((dir) => SCENE_EXTENSIONS.map((e) => join(dir, name + e)));
  const found = tried.find((f) => existsSync(f));
  if (found) return found;
  const known = sceneFiles(root).map((f) => basename(f, extname(f)));
  throw new UsageError(
    `No scene file "${arg}" (looked for ${direct}, and ${name}.ts or .js in ${join(root, 'scenes')} and ${cwd}).` +
      (known.length ? `\nScenes in scenes/: ${known.join(', ')}` : ''),
  );
}

/** A hint for the usual ways importing a scene file fails, or ''. */
function loadHint(e: unknown, path: string): string {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : String(e);
  if (code === 'ERR_UNKNOWN_FILE_EXTENSION' && ['.ts', '.mts'].includes(extname(path))) {
    return `\nNode ${process.version} cannot run TypeScript files. Use Node 22.18 or later, which runs a .ts scene as it is, or write the scene in JavaScript (.js).`;
  }
  if (code === 'ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX') {
    return '\nNode runs a .ts scene by erasing its types, so the scene cannot use enums, namespaces or parameter properties.';
  }
  if (/Cannot find package 'simutown'/.test(msg)) {
    return '\nThe scene imports simutown, which is not installed in its project: install it there (see "Install" in the README).';
  }
  const missing = /Cannot find module '([^']+)'/.exec(msg)?.[1];
  if (code === 'ERR_MODULE_NOT_FOUND' && missing && extname(missing) === '') {
    return `\nNode needs the file extension in a relative import: write './${basename(missing)}.ts', not './${basename(missing)}'.`;
  }
  const exported = /does not provide an export named '([^']+)'/.exec(msg)?.[1];
  if (exported) return `\nIf ${exported} is a type, import it with "import type { ${exported} } from ...".`;
  return '';
}

/** Import a scene file and check its default export. */
export async function loadScene(path: string): Promise<Scene> {
  const shown = relative(process.cwd(), path) || path;
  let mod: { default?: unknown };
  try {
    mod = (await import(pathToFileURL(path).href)) as { default?: unknown };
  } catch (e) {
    throw new Error(`could not load ${shown}: ${e instanceof Error ? e.message : String(e)}${loadHint(e, path)}`);
  }
  return assertScene(mod.default, shown);
}

/** The scene files in `<root>/scenes/`, sorted. */
export function sceneFiles(root: string): string[] {
  const dir = join(root, 'scenes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => SCENE_EXTENSIONS.includes(extname(f)) && !/\.d\.m?ts$/.test(f))
    .sort()
    .map((f) => join(dir, f));
}

/** Write a starter scene called `name` into `<root>/scenes/` if there is one, else into `cwd`. Returns its path. */
export function newScene(name: string, cwd: string, root: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    throw new UsageError(`A scene name is lowercase words joined by dashes, such as "market-day"; got "${name}".`);
  }
  const scenes = join(root, 'scenes');
  const path = join(existsSync(scenes) ? scenes : cwd, `${name}.ts`);
  if (existsSync(path)) throw new UsageError(`${path} already exists: pick another name.`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, starterScene(name));
  return path;
}

/** Beats as aligned lines: start (and end, for calls that take time), who, what. */
export function formatBeats(beats: readonly SceneBeat[]): string[] {
  const t = (s: number) => `${s.toFixed(2).padStart(6)}s`;
  const who = Math.max(0, ...beats.map((b) => (b.actor ?? '').length));
  return beats.map((b) => {
    const span = b.end > b.start + 1e-9 ? `${t(b.start)} - ${t(b.end)}` : t(b.start).padEnd(17);
    return `  ${span}  ${(b.actor ?? '').padEnd(who)}  ${b.what}`.trimEnd();
  });
}

const secs = (s: number) => `${Number(s.toFixed(2))}s`;

/** Run the CLI. Returns the process exit code. */
export async function run(argv: string[], io: CliIO): Promise<number> {
  const cwd = io.cwd ?? process.env.INIT_CWD ?? process.cwd();
  const root = io.root ?? projectRoot(cwd);
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
        beats: { type: 'boolean' },
      },
    });
    const [command, target, ...extra] = positionals;
    if (values.help || command === undefined || command === 'help') {
      io.out(HELP);
      return command === undefined && !values.help ? 1 : 0;
    }
    if (extra.length > 0) throw new UsageError(`Unexpected arguments: ${extra.join(' ')}`);
    const needScene = async () => {
      if (!target) throw new UsageError(`"${command}" needs a scene, e.g. simutown ${command} hello`);
      const path = resolveScenePath(target, cwd, root);
      return { path, scene: await loadScene(path), name: basename(path, extname(path)) };
    };
    const outPath = (fallback: string) => resolve(cwd, values.output ?? fallback);
    const show = (p: string) => relative(cwd, p) || p;

    switch (command) {
      case 'render': {
        const { scene, name } = await needScene();
        const path = outPath(join(root, 'out', `${name}.mp4`));
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
        const path = outPath(join(root, 'out', `${name}-${Number(t.toFixed(2))}s.png`));
        const res = renderStill(scene, t, path, { scale: num('scale', values.scale) });
        io.out(`${show(res.path)}  ${res.width}x${res.height}, t=${secs(t)}`);
        return 0;
      }
      case 'list': {
        const files = sceneFiles(root);
        if (files.length === 0) {
          io.out(
            `No scenes in ${show(join(root, 'scenes'))}/ yet. "simutown new <name>" writes a starter scene there ` +
              '(or here, without a scenes/ folder); a scene file anywhere else renders by its path.',
          );
          return 0;
        }
        let failed = 0;
        const width = Math.max(...files.map((f) => basename(f, extname(f)).length));
        for (const f of files) {
          const name = basename(f, extname(f)).padEnd(width);
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
        if (values.beats) {
          io.out('');
          if (scene.beats) io.out(['Beats', ...formatBeats(scene.beats)].join('\n'));
          else io.out('No beats: this scene was not built with scene(), so it has no timeline to show.');
        }
        return 0;
      }
      case 'new': {
        if (!target) throw new UsageError('"new" needs a name, e.g. simutown new market-day');
        const path = newScene(target, cwd, root);
        io.out(`${show(path)}  written. Next: simutown info ${target} --beats, then simutown still ${target}`);
        return 0;
      }
      default:
        throw new UsageError(`Unknown command "${command}". Commands: render, still, info, new, list. Try --help.`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    io.err(`simutown: ${msg}`);
    if (e instanceof UsageError || (e as { code?: string }).code?.startsWith('ERR_PARSE_ARGS')) {
      io.err('Run "simutown --help" for usage.');
    }
    return 1;
  }
}
