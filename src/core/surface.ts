import type { Lut, RGB, RGBA } from './palette';
import type { Sprite } from './sprite';

export interface BlitOpts {
  /** Mirror the sprite left to right around its anchor. */
  flipX?: boolean;
  /** 0..1 opacity. Default 1. */
  alpha?: number;
}

/**
 * A plain RGBA pixel buffer. The whole engine draws into Surfaces, with no DOM or canvas
 * involved, so the same code renders in Node (to PNG and video) and in a browser.
 */
export class Surface {
  readonly data: Uint8ClampedArray;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w <= 0 || h <= 0) {
      throw new Error(`Surface: bad size ${w}x${h}`);
    }
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  /** Fill the whole surface. Default is fully transparent. */
  clear(c: RGB | RGBA = [0, 0, 0, 0]): this {
    const a = c.length === 4 ? c[3]! : 255;
    const d = this.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = a;
    }
    return this;
  }

  /** Alpha-blend one pixel. Out-of-bounds writes are ignored. `a` is 0..255. */
  plot(x: number, y: number, r: number, g: number, b: number, a = 255): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || a <= 0) return;
    const d = this.data;
    const o = (y * this.w + x) * 4;
    if (a >= 255) {
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
      return;
    }
    const k = a / 255;
    const da = d[o + 3]! / 255;
    const oa = k + da * (1 - k);
    d[o] = (r * k + d[o]! * da * (1 - k)) / oa;
    d[o + 1] = (g * k + d[o + 1]! * da * (1 - k)) / oa;
    d[o + 2] = (b * k + d[o + 2]! * da * (1 - k)) / oa;
    d[o + 3] = oa * 255;
  }

  /** Filled rectangle, alpha-blended and clipped. */
  rect(x: number, y: number, w: number, h: number, c: RGB | RGBA): void {
    const a = c.length === 4 ? c[3]! : 255;
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.plot(xx, yy, c[0], c[1], c[2], a);
  }

  /**
   * Draw a sprite so that its anchor lands on (x, y). Positions are rounded to whole
   * pixels: there is no sub-pixel drawing anywhere in the engine.
   */
  blit(s: Sprite, x: number, y: number, lut: Lut, opts: BlitOpts = {}): void {
    const flip = opts.flipX === true;
    const alpha = Math.round(Math.max(0, Math.min(1, opts.alpha ?? 1)) * 255);
    if (alpha === 0) return;
    const x0 = Math.round(x) - (flip ? s.w - s.ax : s.ax);
    const y0 = Math.round(y) - s.ay;
    for (let sy = 0; sy < s.h; sy++) {
      const dy = y0 + sy;
      if (dy < 0 || dy >= this.h) continue;
      for (let sx = 0; sx < s.w; sx++) {
        const dx = x0 + sx;
        if (dx < 0 || dx >= this.w) continue;
        const v = s.px[sy * s.w + (flip ? s.w - 1 - sx : sx)]!;
        if (v === 0) continue;
        const o = v * 4;
        this.plot(dx, dy, lut[o]!, lut[o + 1]!, lut[o + 2]!, alpha);
      }
    }
  }

  /** Composite another surface on top of this one at (dx, dy). */
  draw(src: Surface, dx = 0, dy = 0): void {
    const s = src.data;
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const o = (y * src.w + x) * 4;
        this.plot(dx + x, dy + y, s[o]!, s[o + 1]!, s[o + 2]!, s[o + 3]!);
      }
    }
  }

  /** Integer nearest-neighbour upscale, the only kind of scaling pixel art should get. */
  scaled(k: number): Surface {
    if (!Number.isInteger(k) || k < 1) throw new Error(`Surface.scaled: bad factor ${k}`);
    const out = new Surface(this.w * k, this.h * k);
    const s = this.data;
    const d = out.data;
    for (let y = 0; y < out.h; y++) {
      const sy = Math.floor(y / k);
      for (let x = 0; x < out.w; x++) {
        const so = (sy * this.w + Math.floor(x / k)) * 4;
        const o = (y * out.w + x) * 4;
        d[o] = s[so]!;
        d[o + 1] = s[so + 1]!;
        d[o + 2] = s[so + 2]!;
        d[o + 3] = s[so + 3]!;
      }
    }
    return out;
  }
}
