/**
 * Loading the scenes in scenes/ for the gallery, one module at a time, so a scene that
 * throws while it is built (an unknown place, say) is listed with its error instead of
 * taking the whole gallery down with it. No DOM here, so it can be tested in Node.
 */
import type { Scene } from '../src/core/types';
import { assertScene } from '../src/player/scene-info';

/** One entry of scenes/: a valid scene, or the error explaining why it is not. */
export type SceneEntry = { name: string; file: string } & (
  | { scene: Scene; error?: undefined }
  | { scene?: undefined; error: string }
);

/** Lazy module loaders keyed by path, the shape `import.meta.glob` returns. */
export type SceneLoaders = Record<string, () => Promise<unknown>>;

/** Import every scene module and check it, each on its own. Sorted by file name. */
export async function loadSceneEntries(loaders: SceneLoaders): Promise<SceneEntry[]> {
  const entries = await Promise.all(
    Object.entries(loaders).map(async ([path, load]): Promise<SceneEntry> => {
      const file = path.replace(/^(\.\.\/)+/, '');
      const name = file.replace(/^scenes\//, '').replace(/\.ts$/, '');
      try {
        const mod = (await load()) as { default?: unknown } | undefined;
        return { name, file, scene: assertScene(mod?.default, file) };
      } catch (e) {
        return { name, file, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
