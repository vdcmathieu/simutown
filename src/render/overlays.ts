/**
 * Screen-space overlays, drawn on the final frame after the zoom so that text is the same
 * size and stays crisp at any zoom: labels, emotes, bubbles, the caption, the title card and
 * the fade to ink. The drawing itself belongs to `src/ui`; this file decides where things go.
 *
 * Several things can sit above one head at once. They stack upward in a fixed order, with
 * a small gap between them and nothing on the face: the emote just above the head, then
 * the label, then the speech bubble.
 */
import { type Lut, lutRgb } from '../core/palette';
import type { Surface } from '../core/surface';
import { type ActorState, type ArtRegistry, type BitmapFont, CHAR_H, type FrameState } from '../core/types';
import { drawBubble, drawCaption, drawEmote, drawLabel, drawTitle } from '../ui';
import { type Camera, toScreen } from './camera';
import type { WarnOnce } from './warn';

/** Clear screen pixels between the top of the head and whatever sits above it, and between stacked overlays. */
const GAP = 2;

/**
 * Height in screen pixels of a label tag, pointer included.
 * An estimate of what `drawLabel` draws; swap it for `measureLabel` from `src/ui` when that lands.
 */
export function labelHeight(font: BitmapFont): number {
  return font.height + 6;
}

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

  for (const a of state.actors) {
    if (!a.emote || (a.opacity ?? 1) <= 0) continue;
    const at = head(a.id, 'emote');
    if (!at) continue;
    drawEmote(out, lut, a.emote, at[0], at[1]);
    const icon = art.emotes[a.emote];
    if (icon) at[1] -= icon.h + GAP;
  }
  for (const n of state.annotations ?? []) {
    if (n.kind !== 'label') continue;
    if (n.actor !== undefined) {
      const at = head(n.actor, 'label');
      if (!at) continue;
      drawLabel(out, lut, n.text, at[0], at[1], n.opacity);
      at[1] -= labelHeight(art.font) + GAP;
    } else if (n.at) {
      // `at` is a spot on the ground: lift the tag to where a head would be
      const [x, y] = toScreen(cam, n.at.x, n.at.y - CHAR_H);
      drawLabel(out, lut, n.text, x, y, n.opacity);
    }
  }
  for (const b of state.bubbles) {
    const at = head(b.actor, 'bubble');
    if (at) drawBubble(out, lut, { x: at[0], y: at[1], text: b.text, kind: b.kind, reveal: b.reveal });
  }
  if (state.caption && state.caption.opacity > 0) drawCaption(out, lut, state.caption.text, state.caption.opacity);
  if (state.title && state.title.opacity > 0) drawTitle(out, lut, state.title.text, state.title.subtitle, state.title.opacity);
  if (state.fade) fadeToInk(out, lut, state.fade);
}
