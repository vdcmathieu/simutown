/**
 * Pass 5, teaching overlays in world space: focus dimming, rings and links.
 * They are drawn after the light pass, in plain palette colours, so they read the same at
 * noon and at midnight. Labels are text and live in screen space: see `overlays.ts`.
 */
import { type Lut, lutRgb, type Slot } from '../core/palette';
import { type ActorState, type Annotation, CHAR_H, type FrameState } from '../core/types';
import type { Drawable } from './sprites';
import { plotWorld, type View } from './view';
import type { WarnOnce } from './warn';

/** How far unfocused pixels sink toward ink at full focus. */
const FOCUS_DEPTH = 0.62;
/** Ring radii in pixels: an ellipse on the ground around the feet. */
const RING_RX = 11;
const RING_RY = 5;
/** Distance between link dots, and how fast they march toward the target, in pixels (per second). */
const LINK_GAP = 6;
const LINK_SPEED = 9;
/** Default colour of rings and links: the lightest paper tone. */
const DEFAULT_SLOT: Slot = 'cream.2';

/** Darken everything that is not one of the focused actors. */
export function dimUnfocused(v: View, list: Drawable[], focus: NonNullable<FrameState['focus']>, lut: Lut): void {
  const amount = Math.max(0, Math.min(1, focus.amount)) * FOCUS_DEPTH;
  if (!(amount > 0)) return;
  const keep = new Uint8Array(list.length + 1);
  const ids = new Set(focus.actors);
  for (const d of list) if (d.actor && ids.has(d.actor.id)) keep[d.id] = 1;
  const [ir, ig, ib] = lutRgb(lut, 'steel.0');
  const d = v.color;
  for (let i = 0, p = 0; i < v.owner.length; i++, p += 4) {
    if (keep[v.owner[i]!] === 1) continue;
    d[p] = d[p]! + (ir - d[p]!) * amount;
    d[p + 1] = d[p + 1]! + (ig - d[p + 1]!) * amount;
    d[p + 2] = d[p + 2]! + (ib - d[p + 2]!) * amount;
  }
}

/** True when a world pixel is in view and shows the ground (nothing stands on it). */
function isGround(v: View, wx: number, wy: number): boolean {
  const x = wx - v.x0;
  const y = wy - v.y0;
  return x >= 0 && y >= 0 && x < v.w && y < v.h && v.owner[y * v.w + x] === 0;
}

/**
 * A ring on the ground around an actor's feet, drawn in clockwise from the back.
 * It only touches ground pixels, so the actor and anyone in front stand on top of it.
 */
function drawRing(v: View, a: ActorState, progress: number, slot: Slot, lut: Lut): void {
  const [r, g, b] = lutRgb(lut, slot);
  const [ir, ig, ib] = lutRgb(lut, 'steel.0');
  const cx = Math.round(a.x);
  const cy = Math.round(a.y) - 2;
  const steps = 96;
  const shown = Math.round(Math.max(0, Math.min(1, progress)) * steps);
  const lit = new Map<string, [number, number]>();
  for (let i = 0; i < shown; i++) {
    const angle = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const wx = cx + Math.round(Math.cos(angle) * RING_RX);
    const wy = cy + Math.round(Math.sin(angle) * RING_RY);
    lit.set(`${wx},${wy}`, [wx, wy]);
  }
  // an ink line under the ring lifts it off light and dark ground alike
  for (const [wx, wy] of lit.values()) {
    if (!lit.has(`${wx},${wy + 1}`) && isGround(v, wx, wy + 1)) plotWorld(v, wx, wy + 1, ir, ig, ib, 0.55);
  }
  for (const [wx, wy] of lit.values()) {
    if (isGround(v, wx, wy)) plotWorld(v, wx, wy, r, g, b);
  }
}

/**
 * A dotted arc from one actor to another. `progress` grows it from the source, and the
 * dots march toward the target with scene time, so the direction of travel is visible.
 */
function drawLink(v: View, from: ActorState, to: ActorState, progress: number, slot: Slot, lut: Lut, t: number): void {
  const [r, g, b] = lutRgb(lut, slot);
  const [ir, ig, ib] = lutRgb(lut, 'steel.0');
  const mid = Math.round(CHAR_H * 0.6);
  const x0 = Math.round(from.x);
  const y0 = Math.round(from.y) - mid;
  const x1 = Math.round(to.x);
  const y1 = Math.round(to.y) - mid;
  const span = Math.hypot(x1 - x0, y1 - y0);
  if (span < 1) return;
  // a quadratic curve lifted in the middle, walked in small steps to measure its length
  const lift = Math.min(28, span / 4);
  const cxm = (x0 + x1) / 2;
  const cym = (y0 + y1) / 2 - lift * 2;
  const at = (u: number): [number, number] => [
    (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cxm + u * u * x1,
    (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * cym + u * u * y1,
  ];
  const samples = Math.max(8, Math.ceil(span));
  const reach = Math.max(0, Math.min(1, progress));
  const march = (((t * LINK_SPEED) % LINK_GAP) + LINK_GAP) % LINK_GAP;
  let walked = 0;
  let next = march;
  let [px, py] = at(0);
  const dots: [number, number][] = [];
  for (let i = 1; i <= samples * reach; i++) {
    const [qx, qy] = at(i / samples);
    walked += Math.hypot(qx - px, qy - py);
    if (walked >= next) {
      dots.push([Math.round(qx), Math.round(qy)]);
      next += LINK_GAP;
    }
    px = qx;
    py = qy;
  }
  // each dot is 2x2 in the link colour on a 4x4 ink pad with the corners cut
  for (const [dx, dy] of dots) {
    for (let j = -1; j <= 2; j++) {
      for (let i = -1; i <= 2; i++) {
        if ((i === -1 || i === 2) && (j === -1 || j === 2)) continue;
        plotWorld(v, dx + i, dy + j, ir, ig, ib);
      }
    }
  }
  for (const [dx, dy] of dots) {
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= 1; i++) plotWorld(v, dx + i, dy + j, r, g, b);
  }
}

/** Draw the world-space annotations (rings, then links). Annotations naming unknown actors are skipped. */
export function drawAnnotations(v: View, annotations: Annotation[], actors: Map<string, ActorState>, lut: Lut, t: number, warn: WarnOnce): void {
  const find = (id: string): ActorState | undefined => {
    const a = actors.get(id);
    if (!a) warn(`annotation:${id}`, `annotation refers to actor "${id}", which is not in the frame; skipped`);
    return a;
  };
  for (const n of annotations) {
    if (n.kind !== 'ring') continue;
    const a = find(n.actor);
    if (a) drawRing(v, a, n.progress, n.slot ?? DEFAULT_SLOT, lut);
  }
  for (const n of annotations) {
    if (n.kind !== 'link') continue;
    const from = find(n.from);
    const to = find(n.to);
    if (from && to) drawLink(v, from, to, n.progress, n.slot ?? DEFAULT_SLOT, lut, t);
  }
}
