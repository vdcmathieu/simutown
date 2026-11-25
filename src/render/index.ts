/**
 * The renderer: FrameState -> pixels.
 *
 * This file is a stub from the pin: flat terrain, props and actors, no lighting, no zoom,
 * no overlays. The signature of `createRenderer` is the contract; the body is not.
 */
import { art as builtinArt } from '../art';
import { compileTheme, dusk, lutRgb, type Theme } from '../core/palette';
import type { Surface } from '../core/surface';
import { type ArtRegistry, type FrameState, type Renderer, TILE, type Town } from '../core/types';

export interface RendererOpts {
  theme?: Theme;
  art?: ArtRegistry;
}

export function createRenderer(town: Town, opts: RendererOpts = {}): Renderer {
  const art = opts.art ?? builtinArt;
  const lut = compileTheme(opts.theme ?? dusk);
  return {
    render(state: FrameState, out: Surface): void {
      out.clear([...lutRgb(lut, 'steel.1'), 255]);
      const ox = Math.round(out.w / 2 - state.camera.x);
      const oy = Math.round(out.h / 2 - state.camera.y);
      for (let ty = 0; ty < town.h; ty++) {
        for (let tx = 0; tx < town.w; tx++) {
          const def = art.terrain[town.terrain[ty * town.w + tx]!];
          const tile = def?.variants[0];
          if (tile) out.blit(tile, ox + tx * TILE, oy + ty * TILE, lut);
        }
      }
      const drawables: { y: number; draw: () => void }[] = [];
      for (const p of town.props) {
        const def = art.props[p.kind];
        if (!def) continue;
        const x = ox + p.tx * TILE;
        const y = oy + (p.ty + 1) * TILE;
        drawables.push({
          y,
          draw: () => {
            out.blit(def.sprite, x, y, lut);
            if (def.emissive) out.blit(def.emissive, x, y, lut);
          },
        });
      }
      for (const a of state.actors) {
        const def = art.characters[a.character];
        if (!def) continue;
        const frames = (a.pose === 'walk' ? def.walk : def.idle)[a.dir];
        const frame = frames[Math.floor(a.animTime * 6) % frames.length]!;
        const y = oy + a.y;
        drawables.push({ y, draw: () => out.blit(frame, ox + a.x, y, lut, { alpha: a.opacity ?? 1 }) });
      }
      drawables.sort((p, q) => p.y - q.y);
      for (const d of drawables) d.draw();
    },
  };
}
