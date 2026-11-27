/**
 * Screen-space overlays, drawn on the final frame after the zoom so that text is the same
 * size and stays crisp at any zoom: labels, emotes, bubbles, the caption, the title card and
 * the fade to ink. The drawing itself belongs to `src/ui`; this file decides where things go.
 *
 * Several things can sit above one head at once. They stack upward in a fixed order, with
 * a small gap between them and nothing on the face: the emote just above the head, then
 * the label, then the speech bubble. One exception: an emote under a bubble, with no label
 * between them, would sit on the bubble's tail. It moves beside the head instead, and the
 * tail runs past it down to the head.
 */
import { type Lut, lutRgb } from '../core/palette';
import type { Surface } from '../core/surface';
import { type ActorState, type ArtRegistry, CHAR_H, type FrameState } from '../core/types';
import { drawBubble, drawCaption, drawEmote, drawLabel, drawTitle, measureEmote, measureLabel, type UiArt } from '../ui';
import { type Camera, toScreen } from './camera';
import type { WarnOnce } from './warn';

/** Clear screen pixels between the top of the head and whatever sits above it, and between stacked overlays. */
const GAP = 2;
/** Half the width of a head, in world pixels: an emote beside the head starts past it. */
const HEAD_HALF = 5;
/** How far below the top of the sprite an emote beside the head ends, in world pixels: level with the face, clear of the bubble. */
const BESIDE_DROP = 6;


/** Blend the whole frame toward ink. `amount` is 0..1. */
export function fadeToInk(out: Surface, lut: Lut, amount: number): void {
  const a = Math.max(0, Math.min(1, amount));
  if (!(a > 0)) return;
  const [r, g, b] = lutRgb(lut, 'steel.0');
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i]! + (r - d[i]!) * a;
    d[i + 1] = d[i + 1]! + (g - d[i + 1]!) * a;
    d[i + 2] = d[i + 2]! + (b - d[i + 2]!) * a;
    d[i + 3] = 255;
  }
}

/** Draw every screen-space overlay of a frame, in order, ending with the fade. */
export function drawOverlays(out: Surface, lut: Lut, art: ArtRegistry, state: FrameState, cam: Camera, actors: Map<string, ActorState>, warn: WarnOnce): void {
  // where the next overlay above each head goes; overlays push it upward as they stack.
  // the ui functions draw just above the point they are given, hence GAP - 1
  const ui: UiArt = { font: art.font, emotes: art.emotes };
  const heads = new Map<string, [number, number]>();
  const head = (id: string, what: string): [number, number] | undefined => {
    let at = heads.get(id);
    if (at) return at;
    const a = actors.get(id);
    if (!a || !Number.isFinite(a.x + a.y)) {
      warn(`${what}:${id}`, `${what} refers to actor "${id}", which is not in the frame; skipped`);
      return undefined;
    }
    at = toScreen(cam, a.x, a.y - CHAR_H);
    at[1] -= GAP - 1;
    heads.set(id, at);
    return at;
  };

  // A tag or an emote belongs to a person you can see. When its owner is outside the view it
  // is skipped, instead of being pinned to the edge of the frame where it points at nobody.
  // (A speech bubble still shows: a voice from off-screen is useful.)
  const inView = (at: [number, number]): boolean => at[0] >= -8 && at[0] <= out.w + 8 && at[1] >= -8 && at[1] <= out.h + CHAR_H;

  const speaking = new Set(state.bubbles.map((b) => b.actor));
  const labelled = new Set((state.annotations ?? []).flatMap((n) => (n.kind === 'label' && n.actor !== undefined ? [n.actor] : [])));
  for (const a of state.actors) {
    if (!a.emote || (a.opacity ?? 1) <= 0) continue;
    const at = head(a.id, 'emote');
    if (!at || !inView(at)) continue;
    if (speaking.has(a.id) && !labelled.has(a.id)) {
      // beside the head, on the right unless that leaves the frame; the stack does not grow
      const w = measureEmote(a.emote, ui).w;
      const reach = (HEAD_HALF + 1) * cam.zoom + Math.ceil(w / 2);
      const x = at[0] + reach + Math.ceil(w / 2) <= out.w ? at[0] + reach : at[0] - reach;
      drawEmote(out, lut, a.emote, x, at[1] + BESIDE_DROP * cam.zoom, ui);
      continue;
    }
    drawEmote(out, lut, a.emote, at[0], at[1], ui);
    const size = measureEmote(a.emote, ui);
    // measureEmote counts the free row under the icon, which the head offset already holds
    if (size.h > 0) at[1] -= size.h - 1 + GAP;
  }
  for (const n of state.annotations ?? []) {
    if (n.kind !== 'label') continue;
    if (n.actor !== undefined) {
      const at = head(n.actor, 'label');
      if (!at || !inView(at)) continue;
      drawLabel(out, lut, n.text, at[0], at[1], n.opacity, ui);
      at[1] -= measureLabel(n.text, ui).h + GAP;
    } else if (n.at) {
      // `at` is a spot on the ground: lift the tag to where a head would be
      const [x, y] = toScreen(cam, n.at.x, n.at.y - CHAR_H);
      drawLabel(out, lut, n.text, x, y, n.opacity, ui);
    }
  }
  for (const b of state.bubbles) {
    const at = head(b.actor, 'bubble');
    if (at) drawBubble(out, lut, { x: at[0], y: at[1], text: b.text, kind: b.kind, reveal: b.reveal }, ui);
  }
  if (state.caption && state.caption.opacity > 0) drawCaption(out, lut, state.caption.text, state.caption.opacity, ui);
  if (state.title && state.title.opacity > 0) drawTitle(out, lut, state.title.text, state.title.subtitle, state.title.opacity, ui);
  if (state.fade) fadeToInk(out, lut, state.fade);
}
