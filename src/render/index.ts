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
import { compileTheme, daylight, type Theme } from '../core/palette';
import type { Surface } from '../core/surface';
import { type ActorState, type ArtRegistry, type FrameState, type Renderer, TILE, type Town } from '../core/types';
import { dimUnfocused, drawAnnotations } from './annotations';
import { cameraFor, present } from './camera';
import { conditionAt, flatCondition, indoorConditionAt } from './conditions';
import { type FlatLight, gradePass } from './grade';
import { buildGround, paintGround } from './ground';
import { accumulateGlow, actorGlow, castActorOcclusion, collectLights, createTownOcclusion, drawEmissive } from './lights';
import { drawOverlays } from './overlays';
import { castActorShadows, copyTownMask, createTownShadows } from './shadows';
import { collectDrawables, drawFlatProps, drawSprites, resolveProps } from './sprites';
import { createView, type View } from './view';
import { createWarner, listNames } from './warn';

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

/**
 * Create the renderer for a town. Unknown ids in the town or in a frame are reported once and skipped.
 * A frame with `interior` set is drawn by a renderer for that room, made on first use and kept.
 */
export function createRenderer(town: Town, opts: RendererOpts = {}): Renderer {
  const outside = createMapRenderer(town, opts);
  const rooms = new Map<string, Renderer>();
  const warn = createWarner(opts.warn ?? ((m) => console.warn(m)));
  return {
    render(state: FrameState, out: Surface): void {
      const id = state.interior;
      if (id !== undefined) {
        const room = town.interiors?.[id];
        if (room) {
          let r = rooms.get(id);
          if (!r) rooms.set(id, (r = createMapRenderer(room, opts)));
          r.render(state, out);
          return;
        }
        warn(`room:${id}`, `unknown room "${id}", drawn as the town outside. Known rooms: ${listNames(Object.keys(town.interiors ?? {}))}`);
      }
      outside.render(state, out);
    },
  };
}

/** The renderer for one map: a town, or a room (`indoor`), which is lit by its own lamps. */
function createMapRenderer(town: Town, opts: RendererOpts): Renderer {
  const art = opts.art ?? builtinArt;
  const lut = compileTheme(opts.theme ?? daylight);
  const lighting = opts.lighting !== false;
  const warn = createWarner(opts.warn ?? ((m) => console.warn(m)));

  const mapW = Math.max(0, town.w * TILE);
  const mapH = Math.max(0, town.h * TILE);
  const ground = buildGround(town, art, lut, warn);
  const { flat, standing } = resolveProps(town, art, warn);
  const lights = collectLights([...flat, ...standing], lut);
  const townShadows = createTownShadows(mapW, mapH, standing);
  const townOcclusion = createTownOcclusion(mapW, mapH, lights, standing);
  // flat props that glow do so wherever the ground shows (owner id 0)
  const flatGlow = flat.filter((p) => p.def.emissive).map((prop) => ({ prop, x: prop.x, y: prop.y, id: 0 }));
  // one set of buffers per view size, so cutting between zoom levels allocates nothing
  const views = new Map<string, View>();

  return {
    render(state: FrameState, out: Surface): void {
      const cam = cameraFor(state.camera, out.w, out.h);
      const size = `${cam.w}x${cam.h}`;
      let v = views.get(size);
      if (!v) views.set(size, (v = createView(cam.w, cam.h)));
      v.x0 = cam.x0;
      v.y0 = cam.y0;
      const t = Number.isFinite(state.t) ? state.t : 0;
      const c = !lighting ? flatCondition() : town.indoor ? indoorConditionAt(state.timeOfDay, lut) : conditionAt(state.timeOfDay, lut);

      paintGround(v, ground, lut, t);
      drawFlatProps(v, flat, lut, t);
      const list = collectDrawables(v, standing, art, state.actors, t, warn);
      if (c.shadowAlpha > 0) {
        copyTownMask(v.shade, v, townShadows(c.shadowKx, c.shadowKy, c.cast), mapW, mapH);
        castActorShadows(v, list, c.shadowKx, c.shadowKy, c.cast);
      }
      drawSprites(v, list, lut);

      const people = new Uint8Array(list.length + 1);
      for (const d of list) if (d.actor) people[d.id] = 1;
      let flatLight: FlatLight | undefined;
      if (c.glow > 0 && lights.length > 0) {
        accumulateGlow(v, lights, t, c.glow);
        copyTownMask(v.occlusion, v, townOcclusion(), mapW, mapH);
        castActorOcclusion(v, lights, list);
        flatLight = new Float32Array((list.length + 1) * 3);
        for (const d of list) if (d.actor) flatLight.set(actorGlow(lights, d.x, d.y, t, c.glow), d.id * 3);
      }
      gradePass(v, c, mapW, mapH, people, flatLight, ground.outside);
      if (c.lamps > 0) {
        drawEmissive(v, flatGlow, lut, c.lamps);
        drawEmissive(v, list, lut, c.lamps);
      }

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

export { rendererFor, renderFrame } from './scene';
