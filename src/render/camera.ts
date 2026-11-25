/**
 * Pass 6, the camera: which world rectangle is visible, and how the native-size view is
 * blown up onto the frame. Zoom is a whole number and the upscale is nearest-neighbour.
 */
import type { Surface } from '../core/surface';
import type { FrameState } from '../core/types';
import type { View } from './view';

export interface Camera {
  /** World pixel at the view's top-left corner. */
  x0: number;
  y0: number;
  /** View size in world pixels. */
  w: number;
  h: number;
  zoom: number;
}

const MAX_ZOOM = 16;

/** The world rectangle a camera sees on a frame of `outW` x `outH`. Odd zooms are rounded to whole numbers. */
export function cameraFor(camera: FrameState['camera'], outW: number, outH: number): Camera {
  const z = Number.isFinite(camera.zoom) ? Math.max(1, Math.min(MAX_ZOOM, Math.round(camera.zoom))) : 1;
  const cx = Number.isFinite(camera.x) ? camera.x : 0;
  const cy = Number.isFinite(camera.y) ? camera.y : 0;
  return {
    x0: Math.round(cx - outW / (2 * z)),
    y0: Math.round(cy - outH / (2 * z)),
    w: Math.ceil(outW / z),
    h: Math.ceil(outH / z),
    zoom: z,
  };
}

/** Screen pixel of a world point: the top-left corner of that world pixel on the frame. */
export function toScreen(cam: Camera, wx: number, wy: number): [number, number] {
  return [(Math.round(wx) - cam.x0) * cam.zoom, (Math.round(wy) - cam.y0) * cam.zoom];
}

/** Copy the view onto the frame, each view pixel becoming a zoom x zoom block. */
export function present(v: View, out: Surface, zoom: number): void {
  const src = v.color32;
  const dst = new Uint32Array(out.data.buffer, out.data.byteOffset, out.w * out.h);
  if (zoom === 1 && v.w === out.w && v.h === out.h) {
    dst.set(src);
    return;
  }
  for (let y = 0; y < v.h; y++) {
    const row = y * zoom * out.w;
    if (y * zoom >= out.h) break;
    for (let x = 0, X = 0; x < v.w; x++) {
      const c = src[y * v.w + x]!;
      for (let k = 0; k < zoom && X < out.w; k++, X++) dst[row + X] = c;
    }
    for (let k = 1; k < zoom && y * zoom + k < out.h; k++) dst.copyWithin(row + k * out.w, row, row + out.w);
  }
}
