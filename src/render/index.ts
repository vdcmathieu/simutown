/**
 * The renderer: FrameState -> pixels.
 *
 * A frame is drawn in six passes, each in its own file:
 *
 *   1. ground.ts       terrain, fringes, animated tiles, flat props
 *   2. shadows.ts      sun and moon shadows from sprite silhouettes
 *   3. sprites.ts      props and actors, sorted by base line
 *   4. grade.ts        time-of-day grade and lamp glow (lights.ts measures the light)
 *   5. annotations.ts  focus dimming, rings, links
 *   6. camera.ts       integer zoom onto the frame, then overlays.ts for text and the fade
 *
 * Passes 1 to 5 draw the visible slice of the world at native size into a View. Everything
 * that is static for a town (the composed ground, prop shadows, the lights) is cached in
 * the renderer, so create one per town and reuse it for every frame.
 */
import { art as builtinArt } from '../art';
import { compileTheme, dusk, type Theme } from '../core/palette';
import type { Surface } from '../core/surface';
import { type ActorState, type ArtRegistry, type FrameState, type Renderer, TILE, type Town } from '../core/types';
import { dimUnfocused, drawAnnotations } from './annotations';
import { cameraFor, present } from './camera';
import { conditionAt, flatCondition } from './conditions';
import { type FlatLight, gradePass } from './grade';
import { buildGround, paintGround } from './ground';
import { accumulateGlow, actorGlow, castActorOcclusion, collectLights, createTownOcclusion, drawEmissive } from './lights';
import { drawOverlays } from './overlays';
import { castActorShadows, copyTownMask, createTownShadows } from './shadows';
import { collectDrawables, drawFlatProps, drawSprites, resolveProps } from './sprites';
import { createView, type View } from './view';
import { createWarner } from './warn';

export interface RendererOpts {
  theme?: Theme;
  art?: ArtRegistry;
  /**
   * Set to false to skip shadows, the time-of-day grade and lamps: the art's own colours,
   * whatever the hour. Useful for reviewing art and for tests. Default true.
   */
  lighting?: boolean;
  /** Where warnings about unknown terrain, props, characters and actors go. Default `console.warn`. */
  warn?: (message: string) => void;
}

/** Create the renderer for a town. Unknown ids in the town or in a frame are reported once and skipped. */
export function createRenderer(town: Town, opts: RendererOpts = {}): Renderer {
  const art = opts.art ?? builtinArt;
  const lut = compileTheme(opts.theme ?? dusk);
  const lighting = opts.lighting !== false;
  const warn = createWarner(opts.warn ?? ((m) => console.warn(m)));

  const mapW = Math.max(0, town.w * TILE);
  const mapH = Math.max(0, town.h * TILE);
  const ground = buildGround(town, art, lut, warn);
  const { flat, standing } = resolveProps(town, art, warn);
  const lights = collectLights([...flat, ...standing], lut);
  const townShadows = createTownShadows(mapW, mapH, standing);
  const townOcclusion = createTownOcclusion(mapW, mapH, lights, standing);
  let view: View | undefined;

  return {
    render(state: FrameState, out: Surface): void {
      const cam = cameraFor(state.camera, out.w, out.h);
      if (!view || view.w !== cam.w || view.h !== cam.h) view = createView(cam.w, cam.h);
      const v = view;
      v.x0 = cam.x0;
      v.y0 = cam.y0;
      const t = Number.isFinite(state.t) ? state.t : 0;
      const c = lighting ? conditionAt(state.timeOfDay, lut) : flatCondition();

      paintGround(v, ground, lut, t);
      drawFlatProps(v, flat, lut, t);
      const list = collectDrawables(v, standing, art, state.actors, t, warn);
      if (c.shadowAlpha > 0) {
        copyTownMask(v.shade, v, townShadows(c.shadowKx, c.shadowKy), mapW, mapH);
        castActorShadows(v, list, c.shadowKx, c.shadowKy);
      }
      drawSprites(v, list, lut);

      let flatLight: FlatLight | undefined;
      if (c.glow > 0 && lights.length > 0) {
        accumulateGlow(v, lights, t, c.glow);
        copyTownMask(v.occlusion, v, townOcclusion(), mapW, mapH);
        castActorOcclusion(v, lights, list);
        flatLight = new Float32Array((list.length + 1) * 4);
        for (const d of list) {
          if (!d.actor) continue;
          flatLight.set(actorGlow(lights, d.x, d.y, t, c.glow), d.id * 4);
          flatLight[d.id * 4 + 3] = 1;
        }
      }
      gradePass(v, c, mapW, mapH, flatLight);
      if (c.lamps > 0) drawEmissive(v, list, lut, c.lamps);

      // overlays may point at any actor that has a real position, drawn or not
      const actors = new Map<string, ActorState>();
      for (const a of state.actors) if (Number.isFinite(a.x + a.y)) actors.set(a.id, a);
      if (state.focus) dimUnfocused(v, list, state.focus, lut);
      if (state.annotations) drawAnnotations(v, state.annotations, actors, lut, t, warn);

      present(v, out, cam.zoom);
      drawOverlays(out, lut, art, state, cam, actors, warn);
    },
  };
}
