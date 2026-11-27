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
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadHint } from '../cli/main';
import type { Scene } from '../core/types';
import { assertScene } from '../player/scene-info';

let loads = 0;

/** The hints `loadFreshScene` adds to a failed import: the CLI's, so the two cannot drift. */
export { loadHint };

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
