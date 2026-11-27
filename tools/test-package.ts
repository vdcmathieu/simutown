/**
 * Use the package the way another project would: `pnpm test:package`.
 *
 * Packs the library (`pnpm pack`, which builds it), installs the tarball into a new
 * project in the system's temporary folder, and there:
 *   - checks what the tarball ships (dist, docs, no tests, tools or media);
 *   - writes scenes that import from `simutown` and `simutown/towns`, a .ts and a .js one;
 *   - runs the installed `simutown` command: list, info --beats, new, still, and render to mp4;
 *   - does the same `new` in a CommonJS project, where the starter must be a .mts file;
 *   - imports every entry in Node and checks they share one copy of the engine;
 *   - typechecks a file that uses every entry, under moduleResolution "bundler" (no Node
 *     types: the browser entries must not need them) and under "nodenext".
 * With `--git` it also installs the committed HEAD of this repository with npm, the way
 * `npm install github:vdcmathieu/simutown` does: npm clones it, installs its dev dependencies
 * and runs `prepare`, which must build the package. That needs the network and about a minute.
 * It needs pnpm and ffmpeg on the PATH, and is slower than `pnpm check` (about 20 s).
 * On failure it says which step failed, with the command's output, and keeps the project.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = mkdtempSync(join(tmpdir(), 'simutown-package-'));
const PROJECT = join(TMP, 'project');
// The CLI resolves paths against $INIT_CWD when a package manager sets it: here it would be this repository.
const ENV = { ...process.env, INIT_CWD: undefined, NODE_OPTIONS: undefined };

class StepError extends Error {}

/** Run a command; on failure, throw with everything it printed. */
function sh(cmd: string, args: string[], cwd: string): string {
  try {
    return execFileSync(cmd, args, { cwd, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  } catch (e) {
    const { stdout = '', stderr = '', status } = e as { stdout?: string; stderr?: string; status?: number };
    throw new StepError(`\`${[cmd, ...args].join(' ')}\` in ${cwd} exited with ${status ?? 'an error'}:\n${`${stdout}\n${stderr}`.trim()}`);
  }
}

function expect(ok: unknown, what: string): void {
  if (!ok) throw new StepError(what);
}

let current = '';
function step(name: string, fn: () => void): void {
  current = name;
  const t0 = performance.now();
  fn();
  console.log(`ok   ${name} (${((performance.now() - t0) / 1000).toFixed(1)} s)`);
}

function write(rel: string, text: string): void {
  const path = join(PROJECT, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

// Commands are run through Node, not through node_modules/.bin: a .bin entry is a shell
// script on Unix and a .cmd file on Windows, and only the first can be executed directly.
const node = (script: string, args: string[], cwd: string) => sh(process.execPath, [script, ...args], cwd);
const cliOf = (project: string) => join(project, 'node_modules/simutown/dist/cli/bin.js');
const simutown = (...args: string[]) => node(cliOf(PROJECT), args, PROJECT);
const tsc = (config: string) => node(join(ROOT, 'node_modules/typescript/bin/tsc'), ['-p', config], PROJECT);
const GIT = process.argv.includes('--git');

function main(): void {
  let tarball = '';
  step('pack the library (pnpm pack, which builds it)', () => {
    // Remove the built entry first: if packing did not run the build, the tarball check below fails.
    rmSync(join(ROOT, 'dist/index.js'), { force: true });
    sh('pnpm', ['pack', '--pack-destination', TMP], ROOT);
    const found = readdirSync(TMP).find((f) => f.endsWith('.tgz'));
    expect(found, `pnpm pack wrote no .tgz into ${TMP}`);
    tarball = join(TMP, found!);
  });

  step('check what the tarball ships', () => {
    const files = sh('tar', ['tzf', tarball], TMP).split('\n').filter(Boolean).map((f) => f.replace(/^package\//, ''));
    for (const f of ['package.json', 'README.md', 'LICENSE', 'dist/index.js', 'dist/node/index.js', 'dist/player/index.js',
      'dist/towns/index.js', 'dist/cli/bin.js', 'dist/types/index.d.ts', 'docs/authoring.md']) {
      expect(files.includes(f), `the tarball is missing ${f}`);
    }
    const stray = files.filter((f) => /^(src|test|tools|scenes|examples|web|docs\/(media|images|style))\/|^dist\/web\//.test(f));
    expect(stray.length === 0, `the tarball ships files it should not:\n  ${stray.join('\n  ')}`);
  });

  step('install the tarball into a new project', () => {
    write('package.json', `${JSON.stringify({ name: 'simutown-consumer', private: true, type: 'module' }, null, 2)}\n`);
    sh('pnpm', ['add', tarball, '--ignore-workspace'], PROJECT);
    const bins = readdirSync(join(PROJECT, 'node_modules/.bin'));
    expect(bins.some((f) => f === 'simutown' || f === 'simutown.cmd'), `no simutown command was linked into node_modules/.bin (found: ${bins.join(', ')})`);
  });

  step('write scenes that import from simutown and simutown/towns', () => {
    write('scenes/greeting.ts', `import { scene, type SceneBuilder } from 'simutown';
import { willowSquare } from 'simutown/towns';

export default scene({ title: 'Greeting', town: willowSquare, timeOfDay: 10 }, (s: SceneBuilder) => {
  const ana = s.actor('ana', { at: 'cafe.door', facing: 'down' });
  s.camera.cut(ana, { zoom: 2 });
  ana.say('Hello from a project!');
});
`);
    write('scenes/plain.js', `import { scene, willowSquare } from 'simutown';

export default scene({ title: 'Plain', town: willowSquare }, (s) => {
  s.actor('bo', { at: 'bakery.door' });
  s.wait(1);
});
`);
  });

  step('simutown list and info --beats', () => {
    const list = simutown('list');
    expect(/greeting\s+Greeting/.test(list) && /plain\s+Plain/.test(list), `simutown list did not show both scenes:\n${list}`);
    const info = simutown('info', 'greeting', '--beats');
    expect(/ana\s+says "Hello from a project!"/.test(info), `simutown info --beats did not show the line of dialogue:\n${info}`);
  });

  step('simutown still, from a .ts and a .js scene', () => {
    simutown('still', 'greeting', '-t', '1', '-o', 'out/greeting.png');
    simutown('still', 'plain', '-o', 'out/plain.png', '--scale', '1');
    for (const f of ['out/greeting.png', 'out/plain.png']) {
      const png = readFileSync(join(PROJECT, f));
      expect(png.subarray(1, 4).toString() === 'PNG', `${f} is not a PNG`);
    }
    expect(readFileSync(join(PROJECT, 'out/greeting.png')).readUInt32BE(16) === 1920, 'out/greeting.png is not 1920 pixels wide');
  });

  step('simutown render to mp4', () => {
    simutown('render', 'greeting', '-o', 'out/greeting.mp4');
    const mp4 = readFileSync(join(PROJECT, 'out/greeting.mp4'));
    expect(mp4.subarray(4, 8).toString() === 'ftyp' && mp4.length > 10_000, `out/greeting.mp4 is not an mp4 (${mp4.length} bytes)`);
  });

  step('simutown new writes a starter that renders as it is', () => {
    simutown('new', 'starter');
    simutown('still', 'starter', '-o', 'out/starter.png', '--scale', '1');
    expect(statSync(join(PROJECT, 'out/starter.png')).size > 1000, 'out/starter.png is empty');
  });

  step('simutown new in a CommonJS project writes a .mts starter that loads', () => {
    const cjs = join(TMP, 'commonjs-project');
    mkdirSync(cjs, { recursive: true });
    writeFileSync(join(cjs, 'package.json'), `${JSON.stringify({ name: 'simutown-cjs-consumer', private: true, type: 'commonjs' }, null, 2)}\n`);
    sh('pnpm', ['add', tarball, '--ignore-workspace'], cjs);
    node(cliOf(cjs), ['new', 'starter'], cjs);
    expect(statSync(join(cjs, 'starter.mts')).size > 100, 'simutown new did not write starter.mts in a CommonJS project');
    const info = node(cliOf(cjs), ['info', 'starter'], cjs);
    expect(/Starter/.test(info), `simutown info could not load the .mts starter in a CommonJS project:\n${info}`);
  });

  if (GIT) {
    step('npm install from git: clone, dev dependencies, prepare builds the package', () => {
      const head = sh('git', ['rev-parse', 'HEAD'], ROOT).trim();
      const proj = join(TMP, 'git-project');
      mkdirSync(proj, { recursive: true });
      writeFileSync(join(proj, 'package.json'), `${JSON.stringify({ name: 'simutown-git-consumer', private: true, type: 'module' }, null, 2)}\n`);
      sh('npm', ['install', '--no-audit', '--no-fund', `git+file://${ROOT}#${head}`], proj);
      expect(statSync(join(proj, 'node_modules/simutown/dist/index.js')).size > 1000, 'the git install has no built dist/index.js: prepare did not build');
      const info = node(cliOf(proj), ['--help'], proj);
      expect(/simutown - render pixel-town scenes/.test(info), `the git-installed command did not run:\n${info}`);
    });
  }

  step('every entry imports in Node and shares one engine', () => {
    write('identity.mjs', `import * as core from 'simutown';
import * as node from 'simutown/node';
import * as player from 'simutown/player';
import * as towns from 'simutown/towns';

const fail = (what) => { console.error(what); process.exit(1); };
if (core.willowSquare !== towns.willowSquare) fail('simutown and simutown/towns have different copies of willowSquare');
const s = core.scene({ title: 'x', town: towns.willowSquare }, (b) => b.wait(1));
if (s.art !== core.art) fail('a scene from simutown does not use the art registry of simutown');
if (player.assertScene(s, 'x') !== s) fail('simutown/player does not accept a scene from simutown');
if (typeof player.mount !== 'function' || typeof node.renderVideo !== 'function') fail('an entry lacks its main export');
if (node.encodePNG(new core.Surface(2, 2)).subarray(1, 4).toString() !== 'PNG') fail('simutown/node cannot encode a Surface from simutown');
`);
    sh(process.execPath, ['identity.mjs'], PROJECT);
  });

  const usage = `import { mount, type Player } from 'simutown/player';
import { scene, type Scene, Surface } from 'simutown';
import { willowSquare } from 'simutown/towns';

const s: Scene = scene({ title: 'Typed', town: willowSquare }, (b) => b.wait(1));
export const surface: Surface = new Surface(4, 4);
export function play(el: HTMLElement): Player {
  // @ts-expect-error - the types are real: a string is not a Scene
  mount(el, 'not a scene');
  return mount(el, s, { autoplay: true });
}
`;
  step('typecheck under moduleResolution "bundler" (browser, no Node types)', () => {
    write('typed/bundler.ts', usage);
    write('tsconfig.bundler.json', JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', lib: ['ES2023', 'DOM'], types: [],
        strict: true, noEmit: true, skipLibCheck: false },
      files: ['typed/bundler.ts'],
    }));
    tsc('tsconfig.bundler.json');
  });

  step('typecheck under moduleResolution "nodenext"', () => {
    write('typed/nodenext.ts', `${usage}
import { renderStill, renderVideo, type VideoResult } from 'simutown/node';

export const still: (scene: Scene, t: number, path: string) => { path: string } = renderStill;
export const film: Promise<VideoResult> = renderVideo(s, 'out/typed.mp4');
// @ts-expect-error - renderVideo needs a path
void renderVideo(s);
`);
    write('tsconfig.nodenext.json', JSON.stringify({
      compilerOptions: { target: 'ES2022', module: 'nodenext', moduleResolution: 'nodenext', lib: ['ES2023', 'DOM'],
        types: ['node'], typeRoots: [join(ROOT, 'node_modules/@types')], strict: true, noEmit: true, skipLibCheck: false },
      files: ['typed/nodenext.ts'],
    }));
    tsc('tsconfig.nodenext.json');
  });
}

try {
  main();
  rmSync(TMP, { recursive: true, force: true });
  console.log('The package works from another project.');
} catch (e) {
  console.error(`\nFAILED ${current}\n\n${e instanceof Error ? e.message : String(e)}\n`);
  console.error(`The project is kept in ${PROJECT} to look at.`);
  process.exitCode = 1;
}
