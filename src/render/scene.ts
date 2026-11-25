/**
 * Rendering a Scene, as opposed to a bare Town: the scene knows which art it was built
 * with, and every output path (video, stills, the player) must draw it with that art.
 */
import { Surface } from '../core/surface';
import type { Renderer, Scene } from '../core/types';
import { createRenderer, type RendererOpts } from './index';

/** A renderer for a scene's town that uses the scene's own art unless `opts.art` overrides it. */
export function rendererFor(scene: Scene, opts: RendererOpts = {}): Renderer {
  return createRenderer(scene.town, { ...opts, art: opts.art ?? scene.art });
}

/** Draw one moment of a scene into a new Surface of the scene's size. */
export function renderFrame(scene: Scene, t: number, opts: RendererOpts = {}): Surface {
  const out = new Surface(scene.width, scene.height);
  rendererFor(scene, opts).render(scene.frame(t), out);
  return out;
}
