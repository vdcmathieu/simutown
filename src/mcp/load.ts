/**
 * Loading a scene file in a long-lived process. Node only.
 *
 * Node caches ES modules by URL, so a server that imports `scenes/x.ts`, sees the author
 * edit it, and imports it again would get the old scene. `loadFreshScene` imports the
 * file under a URL with a query made of its modification time and size, so an edited file
 * runs again as it is on disk now, while an unchanged one comes from the cache for free.
 *
 * Known limits: only the scene file itself is re-imported. Helper modules it imports
 * (`./helpers.ts`) keep their first version until the server restarts. Each version of a
 * file that was loaded stays in memory (a few hundred KB per edit).
 *
 * When a scene fails to build, the error gets a hint for the usual slips of an agent: a
 * call that does not exist, a missing import, an argument of the wrong type, a syntax error.
 */
import { readFileSync, statSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as simutown from '../index';
import { loadHint } from '../cli/main';
import type { Scene, SceneBeat } from '../core/types';
import { assertScene } from '../player/scene-info';
import { scene as buildScene } from '../scene';
import { willowSquare } from '../towns';

/** The hints `loadFreshScene` adds to a failed import: the CLI's, so the two cannot drift. */
export { loadHint };

/**
 * Import the scene file at `path` as it is on disk now (bypassing the module cache when it
 * changed) and check its default export. Throws an error that says what is wrong and how to
 * fix it. `shownFrom` is the folder paths in messages are relative to (default the cwd).
 */
export async function loadFreshScene(path: string, shownFrom: string = process.cwd()): Promise<Scene> {
  const shown = relative(shownFrom, path) || path;
  let mod: { default?: unknown };
  try {
    const stat = statSync(path);
    const url = `${pathToFileURL(path).href}?simutown-load=${stat.mtimeMs}-${stat.size}`;
    mod = (await import(url)) as { default?: unknown };
  } catch (e) {
    // Paths relative to the project, and no terminal colours (some transformers add them).
    const msg = (e instanceof Error ? e.message : String(e)).split(path).join(shown).replace(/\x1b\[[0-9;]*m/g, '');
    throw new Error(`could not load ${shown}: ${msg}${loadHint(e, path)}${agentHint(e, path)}`);
  }
  try {
    return assertScene(mod.default, shown);
  } catch (e) {
    throw new Error(`${e instanceof Error ? e.message : String(e)}${durationHint(mod.default)}`);
  }
}

/** The calls of `s`, of `s.camera` and of an actor handle, read off a real scene builder once. */
let calls: { scene: string[]; camera: string[]; actor: string[] } | undefined;
function knownCalls(): { scene: string[]; camera: string[]; actor: string[] } {
  if (calls) return calls;
  const fns = (o: object) => Object.keys(o).filter((k) => typeof (o as Record<string, unknown>)[k] === 'function');
  buildScene({ title: 'calls', town: willowSquare }, (s) => {
    const actor = s.actor('bo', { at: Object.keys(willowSquare.places)[0]! });
    calls = { scene: fns(s), camera: fns(s.camera), actor: fns(actor) };
    s.wait(0.1);
  });
  return calls!;
}

/** A hint for a call that does not exist, a missing import, or a syntax error; or ''. */
export function agentHint(e: unknown, path: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  const call = /^(\S+?)\.(\w+) is not a function$/.exec(msg);
  if (e instanceof TypeError && call) {
    const [, receiver, method] = call as unknown as [string, string, string];
    const { scene, camera, actor } = knownCalls();
    if (receiver === 'camera' || receiver.endsWith('.camera')) return `\n${method} is not a camera call. Camera calls: ${camera.join(', ')}.`;
    if (receiver === 's') return `\n${method} is not a scene call. Scene calls (s.*): ${scene.join(', ')}; the camera is s.camera.`;
    return (
      `\n${method} is not a call. If ${receiver} is an actor, its calls are: ${actor.join(', ')}.` +
      ` Scene calls (s.*): ${scene.join(', ')}.`
    );
  }
  const undefinedName = /^(\w+) is not defined$/.exec(msg)?.[1];
  if (e instanceof ReferenceError && undefinedName && undefinedName in simutown) {
    return `\n${undefinedName} comes from simutown: add it to the import, as in import { scene, ${undefinedName} } from 'simutown';`;
  }
  const at = /:(\d+):(\d+): ERROR: /.exec(msg);
  if (at) {
    const line = Number(at[1]);
    const col = Number(at[2]);
    let source: string[];
    try {
      source = readFileSync(path, 'utf8').split('\n');
    } catch {
      return '';
    }
    // At the end of the file, show the last line that has something on it.
    let n = Math.min(line, source.length);
    while (n > 1 && !source[n - 1]!.trim()) n--;
    const text = source[n - 1] ?? '';
    const caret = n === line ? col : text.length;
    return `\n  ${n} | ${text}\n  ${' '.repeat(String(n).length)} | ${' '.repeat(caret)}^`;
  }
  return '';
}

/** When a scene's length came out wrong, say why that usually happens and where the timeline broke; or ''. */
function durationHint(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  const { duration, beats } = value as { duration?: unknown; beats?: SceneBeat[] };
  if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) return '';
  let where = '';
  if (Array.isArray(beats)) {
    const ok = (b: SceneBeat) => Number.isFinite(b.start) && Number.isFinite(b.end);
    const firstBad = beats.findIndex((b) => !ok(b));
    const name = (b: SceneBeat) => `${b.actor ? `${b.actor} ` : ''}${b.what}`;
    if (firstBad > 0) where = ` The timeline breaks after "${name(beats[firstBad - 1]!)}", at "${name(beats[firstBad]!)}".`;
    else if (firstBad === 0) where = ` The timeline breaks at its first call, "${name(beats[0]!)}".`;
  }
  return (
    `\nThe scene's length is ${String(duration)}: a call probably got an argument of the wrong type, such as say(42) ` +
    `instead of say('42'), or wait('2') instead of wait(2).${where}`
  );
}
