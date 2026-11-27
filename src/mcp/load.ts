/**
 * Loading a scene file in a long-lived process. Node only.
 *
 * Node caches ES modules by URL, so a server that imports `scenes/x.ts`, sees the author
 * edit it, and imports it again would get the old scene. `loadFreshScene` imports the
 * file under a URL with a query that changes with every load, so each load runs the file
 * as it is on disk now.
 *
 * Known limit: only the scene file itself is re-imported. Helper modules it imports
 * (`./helpers.ts`) keep their first version until the server restarts. Each load also
 * keeps its module in memory, which is fine for the few hundred loads of a session.
 */
import { statSync } from 'node:fs';
import { basename, extname, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Scene } from '../core/types';
import { assertScene } from '../player/scene-info';

let loads = 0;

/**
 * A hint for the usual ways importing a scene file fails, or ''.
 * The same hints as `loadScene` in src/cli/main.ts, whose helper is private.
 */
export function loadHint(e: unknown, path: string): string {
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

/**
 * Import the scene file at `path` as it is on disk now (bypassing the module cache) and
 * check its default export. Throws an error that says what is wrong and how to fix it.
 * `shownFrom` is the folder paths in messages are relative to (default the cwd).
 */
export async function loadFreshScene(path: string, shownFrom: string = process.cwd()): Promise<Scene> {
  const shown = relative(shownFrom, path) || path;
  let mod: { default?: unknown };
  try {
    const mtime = Math.floor(statSync(path).mtimeMs);
    const url = `${pathToFileURL(path).href}?simutown-load=${mtime}-${++loads}`;
    mod = (await import(url)) as { default?: unknown };
  } catch (e) {
    throw new Error(`could not load ${shown}: ${e instanceof Error ? e.message : String(e)}${loadHint(e, path)}`);
  }
  return assertScene(mod.default, shown);
}
