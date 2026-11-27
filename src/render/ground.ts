/**
 * Pass 1, the ground: terrain tiles with hashed variants, fringes by priority, animated
 * terrain and flat props. The static part is composed once per town and copied per frame.
 */
import { type Lut, lutRgb, slotIndex } from '../core/palette';
import type { Sprite } from '../core/sprite';
import { Surface } from '../core/surface';
import { type ArtRegistry, type TerrainDef, TILE, type Town } from '../core/types';
import { fringesFor } from './fringe';
import { hash2 } from './hash';
import { blitSprite, type View } from './view';
import { listNames, type WarnOnce } from './warn';

/** A tile whose terrain animates: redrawn every frame, with the fringes that sit on it. */
interface AnimatedTile {
  tx: number;
  ty: number;
  def: TerrainDef;
  fringes: Sprite[];
}

export interface Ground {
  /** The whole town's terrain at native size, opaque. Animated tiles hold their first frame. */
  surface: Surface;
  animated: AnimatedTile[];
  /**
   * Per ground pixel of the town, 1 where it shows `outside` terrain (the dark beyond a room's
   * walls) and nothing drawn over it: light and the time of day leave it alone, like the void
   * beyond the map. Absent when the town has no such terrain.
   */
  outside?: Uint8Array;
}

/** A loud checker for unknown terrain: clearly not art, so a typo in a town is seen at once. */
export function placeholderTile(): Sprite {
  const a = slotIndex('plum.1');
  const b = slotIndex('steel.0');
  const px = new Uint8Array(TILE * TILE);
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px[y * TILE + x] = ((x >> 2) + (y >> 2)) & 1 ? a : b;
  return { w: TILE, h: TILE, px, ax: 0, ay: 0 };
}

/** Index into an animation's frames at time `t`, safe for odd inputs. */
export function frameAt(count: number, fps: number, t: number): number {
  if (count <= 1) return 0;
  const i = Math.floor(t * fps);
  if (!Number.isFinite(i)) return 0;
  return ((i % count) + count) % count;
}

/** The look of one terrain tile at time `t`: the animation frame, or a variant hashed from (tx, ty). */
export function terrainSprite(def: TerrainDef, tx: number, ty: number, t: number): Sprite | undefined {
  const many = def.anims?.filter((a) => a.frames.length > 0);
  if (many && many.length > 0) {
    const h = hash2(tx, ty);
    const a = many[h % many.length]!;
    // each tile starts at its own phase so neighbours do not shimmer in step
    return a.frames[frameAt(a.frames.length, a.fps, t + ((h >>> 8) % 97) / a.fps)];
  }
  const frames = def.anim?.frames;
  if (frames && frames.length > 0) return frames[frameAt(frames.length, def.anim!.fps, t)];
  if (def.variants.length === 0) return undefined;
  return def.variants[hash2(tx, ty) % def.variants.length];
}

/** Compose the static ground for a town. Unknown terrain ids get the placeholder and one warning. */
export function buildGround(town: Town, art: ArtRegistry, lut: Lut, warn: WarnOnce): Ground {
  const surface = new Surface(Math.max(1, town.w * TILE), Math.max(1, town.h * TILE));
  surface.clear([...lutRgb(lut, 'steel.0'), 255]);
  const placeholder = placeholderTile();
  const animated: AnimatedTile[] = [];
  const outside = town.terrain.some((id) => art.terrain[id]?.outside) ? new Uint8Array(surface.w * surface.h) : undefined;
  for (let ty = 0; ty < town.h; ty++) {
    for (let tx = 0; tx < town.w; tx++) {
      const id = town.terrain[ty * town.w + tx];
      const def = id === undefined ? undefined : art.terrain[id];
      const tile = def ? terrainSprite(def, tx, ty, 0) : undefined;
      if (!tile) {
        warn(`terrain:${id}`, `unknown terrain "${id}" drawn as a placeholder. Known terrain: ${listNames(Object.keys(art.terrain))}`);
        surface.blit(placeholder, tx * TILE, ty * TILE, lut);
        continue;
      }
      surface.blit(tile, tx * TILE, ty * TILE, lut);
      const fringes = fringesFor(town, art.terrain, tx, ty).map((f) => f.sprite);
      for (const f of fringes) surface.blit(f, tx * TILE, ty * TILE, lut);
      if (outside && def!.outside) markOutside(outside, surface.w, tx, ty, fringes);
      const moving = (def!.anim?.frames.length ?? 0) > 1 || (def!.anims ?? []).some((a) => a.frames.length > 1);
      if (moving) animated.push({ tx, ty, def: def!, fringes });
    }
  }
  return { surface, animated, ...(outside ? { outside } : {}) };
}

/** Mark a tile of outside terrain, except the pixels its fringes (a room's wall cap) cover. */
function markOutside(mask: Uint8Array, w: number, tx: number, ty: number, fringes: Sprite[]): void {
  for (let y = 0; y < TILE; y++) mask.fill(1, (ty * TILE + y) * w + tx * TILE, (ty * TILE + y) * w + tx * TILE + TILE);
  for (const f of fringes) {
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const wx = tx * TILE + x - f.ax;
        const wy = ty * TILE + y - f.ay;
        if (f.px[y * f.w + x] !== 0 && wx >= 0 && wy >= 0 && wx < w && wy * w + wx < mask.length) mask[wy * w + wx] = 0;
      }
    }
  }
}

/**
 * Start a frame: clear the view to `steel.0`, copy in the visible part of the static ground
 * and redraw the animated tiles for time `t`.
 */
export function paintGround(v: View, ground: Ground, lut: Lut, t: number): void {
  const [r, g, b] = lutRgb(lut, 'steel.0');
  const d = v.color;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  v.owner.fill(0);
  const src = ground.surface;
  const x0 = Math.max(0, v.x0);
  const y0 = Math.max(0, v.y0);
  const x1 = Math.min(src.w, v.x0 + v.w);
  const y1 = Math.min(src.h, v.y0 + v.h);
  if (x0 >= x1 || y0 >= y1) return;
  for (let y = y0; y < y1; y++) {
    const from = (y * src.w + x0) * 4;
    d.set(src.data.subarray(from, from + (x1 - x0) * 4), ((y - v.y0) * v.w + (x0 - v.x0)) * 4);
  }
  for (const a of ground.animated) {
    const wx = a.tx * TILE;
    const wy = a.ty * TILE;
    if (wx >= x1 || wy >= y1 || wx + TILE <= x0 || wy + TILE <= y0) continue;
    const frame = terrainSprite(a.def, a.tx, a.ty, t);
    if (frame) blitSprite(v, frame, wx, wy, lut);
    for (const f of a.fringes) blitSprite(v, f, wx, wy, lut);
  }
}
