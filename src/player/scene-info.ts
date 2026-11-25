/**
 * Checking that a module's default export really is a Scene. Browser-safe: the CLI and
 * the web gallery both use it, so a broken scene file fails the same way everywhere.
 */
import type { Scene } from '../core/types';
import { frameCount } from './clock';

/**
 * Return `value` as a Scene, or throw an error that says what is wrong and how to fix it.
 * `source` names the file in the message.
 */
export function assertScene(value: unknown, source: string): Scene {
  const hint =
    `A scene file must default-export a Scene, for example:\n` +
    `  import { tinyScene } from '../src/fixtures/tiny';\n` +
    `  export default tinyScene;`;
  if (value === undefined) throw new Error(`${source} has no default export.\n${hint}`);
  if (value === null || typeof value !== 'object') {
    throw new Error(`${source}: the default export is ${value === null ? 'null' : typeof value}, not a Scene.\n${hint}`);
  }
  const s = value as Record<string, unknown>;
  const problems: string[] = [];
  if (typeof s.title !== 'string' || s.title === '') problems.push('`title` must be a non-empty string');
  if (typeof s.duration !== 'number' || !(s.duration > 0) || !Number.isFinite(s.duration)) {
    problems.push('`duration` must be a positive number of seconds');
  }
  if (typeof s.fps !== 'number' || !(s.fps > 0)) problems.push('`fps` must be a positive number');
  if (!Number.isInteger(s.width) || (s.width as number) <= 0) problems.push('`width` must be a positive integer');
  if (!Number.isInteger(s.height) || (s.height as number) <= 0) problems.push('`height` must be a positive integer');
  if (typeof s.frame !== 'function') problems.push('`frame(t)` must be a function returning a FrameState');
  const town = s.town as Record<string, unknown> | undefined;
  if (!town || typeof town !== 'object') problems.push('`town` must be a Town');
  else if (
    typeof town.w !== 'number' ||
    typeof town.h !== 'number' ||
    !Array.isArray(town.terrain) ||
    !Array.isArray(town.props)
  ) {
    problems.push('`town` must have w, h, terrain[] and props[] (build it with defineTown)');
  }
  if (problems.length > 0) {
    const keys = Object.keys(s).join(', ') || 'none';
    throw new Error(`${source}: the default export is not a valid Scene.\n  - ${problems.join('\n  - ')}\nIt has the keys: ${keys}.\n${hint}`);
  }
  return value as Scene;
}

/** A summary of a scene for listings: what `simutown info` prints and the gallery shows. */
export interface SceneInfo {
  title: string;
  duration: number;
  fps: number;
  frames: number;
  width: number;
  height: number;
  town: { name: string; w: number; h: number; props: number; places: string[] };
  /** Character ids that appear: `scene.cast` when declared, else found by sampling. */
  cast: string[];
}

/**
 * Describe a scene. The cast comes from `scene.cast` when the scene declares it;
 * otherwise it is found by sampling `frame(t)` every `step` seconds (default: every
 * frame, capped at 2000 samples), in order of first appearance.
 */
export function describeScene(scene: Scene, step?: number): SceneInfo {
  const frames = frameCount(scene.duration, scene.fps);
  let cast = scene.cast;
  if (!cast) {
    const seen = new Set<string>();
    const dt = step ?? Math.max(1 / scene.fps, scene.duration / 2000);
    const n = Math.floor(scene.duration / dt + 1e-9);
    for (let i = 0; i <= n; i++) {
      for (const a of scene.frame(Math.min(i * dt, scene.duration)).actors) seen.add(a.character);
    }
    cast = [...seen];
  }
  const { town } = scene;
  return {
    title: scene.title,
    duration: scene.duration,
    fps: scene.fps,
    frames,
    width: scene.width,
    height: scene.height,
    town: { name: town.name, w: town.w, h: town.h, props: town.props.length, places: Object.keys(town.places ?? {}) },
    cast: [...cast],
  };
}
