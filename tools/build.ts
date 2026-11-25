/**
 * Build the package into dist/: `pnpm build` (and `prepack`, so `pnpm pack` and installs
 * from GitHub build it too).
 *
 * Why this setup: the sources use extensionless imports (moduleResolution Bundler), so
 * Node cannot run tsc's output and the JavaScript has to be bundled. esbuild does that in
 * one call for all the entries with code splitting: a module used by several entries
 * lands once, in a shared chunk, so the art registry, `Surface` and every other value are
 * the same objects whichever entry a project imports them from. The build fails if any
 * module ends up in two files, or if a browser-safe entry reaches a `node:` import.
 * Types come from tsc (TypeScript 7 has no JavaScript API, so the declaration bundlers
 * that need one cannot run): one .d.ts per source file in dist/types, with `.js` added to
 * their relative imports, which `moduleResolution: "nodenext"` requires and "bundler" accepts.
 *
 *   dist/index.js         simutown          the browser-safe core
 *   dist/node/index.js    simutown/node     renderVideo, renderStill, PNG files
 *   dist/player/index.js  simutown/player   mount, the browser player
 *   dist/towns/index.js   simutown/towns    the built-in towns
 *   dist/cli/bin.js       the simutown command
 *   dist/chunks/          code shared by the entries
 *   dist/types/           the declarations
 */
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Metafile } from 'esbuild';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** The entries: output name (in dist/) -> source. */
export const ENTRIES = {
  index: 'src/index.ts',
  'node/index': 'src/node/index.ts',
  'player/index': 'src/player/index.ts',
  'towns/index': 'src/towns/index.ts',
  'cli/bin': 'src/cli/bin.ts',
};
/** Entries that must run in a browser: nothing they load may import `node:*`. */
const BROWSER_SAFE = ['index', 'player/index', 'towns/index'];

/** Problems with the bundle: a module in two outputs, or a browser-safe entry that reaches Node. */
export function checkBundle(meta: Metafile): string[] {
  const problems: string[] = [];
  const homes = new Map<string, string[]>();
  for (const [out, o] of Object.entries(meta.outputs)) {
    for (const input of Object.keys(o.inputs)) homes.set(input, [...(homes.get(input) ?? []), out]);
  }
  for (const [input, outs] of homes) if (outs.length > 1) problems.push(`${input} is bundled ${outs.length} times: ${outs.join(', ')}`);
  for (const entry of BROWSER_SAFE) {
    const seen = new Set<string>();
    const visit = (out: string): void => {
      if (seen.has(out)) return;
      seen.add(out);
      for (const imp of meta.outputs[out]?.imports ?? []) {
        if (imp.external && imp.path.startsWith('node:')) problems.push(`${entry} reaches ${imp.path} through ${out}`);
        else if (!imp.external) visit(imp.path);
      }
    };
    visit(`dist/${entry}.js`);
  }
  return problems;
}

/** Add `.js` (or `/index.js`) to the relative imports of a declaration file in `dir`. */
export function withExtensions(source: string, dir: string): string {
  return source.replace(/((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]*)\2/g, (whole, lead: string, q: string, spec: string) => {
    if (/\.(js|mjs|cjs|json)$/.test(spec)) return whole;
    const target = resolve(dir, spec);
    const isDir = existsSync(target) && statSync(target).isDirectory();
    return `${lead}${q}${spec}${isDir ? '/index.js' : '.js'}${q}`;
  });
}

function dtsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? dtsFiles(join(dir, e.name)) : e.name.endsWith('.d.ts') ? [join(dir, e.name)] : [],
  );
}

async function main(): Promise<void> {
  // dist/web is the gallery (`pnpm build:web`): leave it alone.
  if (existsSync(DIST)) for (const f of readdirSync(DIST)) if (f !== 'web') rmSync(join(DIST, f), { recursive: true, force: true });

  const result = await build({
    absWorkingDir: ROOT,
    entryPoints: Object.fromEntries(Object.entries(ENTRIES)),
    outdir: 'dist',
    bundle: true,
    splitting: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    external: ['node:*'],
    chunkNames: 'chunks/[name]-[hash]',
    metafile: true,
    logLevel: 'warning',
  });
  const problems = checkBundle(result.metafile);
  if (problems.length > 0) throw new Error(`The bundle is wrong:\n  ${problems.join('\n  ')}`);
  chmodSync(join(DIST, 'cli/bin.js'), 0o755);

  // Declarations: tsc writes them, then their relative imports get extensions.
  const tsc = join(ROOT, 'node_modules/.bin/tsc');
  execFileSync(tsc, ['-p', 'tsconfig.build.json'], { cwd: ROOT, stdio: 'inherit' });
  const types = join(DIST, 'types');
  for (const file of dtsFiles(types)) writeFileSync(file, withExtensions(readFileSync(file, 'utf8'), dirname(file)));

  const js = Object.keys(result.metafile.outputs).length;
  console.log(`dist/: ${js} JavaScript files (${Object.keys(ENTRIES).length} entries), ${dtsFiles(types).length} declaration files`);
}

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
