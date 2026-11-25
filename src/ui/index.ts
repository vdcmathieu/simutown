/**
 * Text and overlay drawing: speech bubbles, captions, title cards, labels, emotes.
 * All coordinates are screen pixels on the final FRAME_W x FRAME_H surface, so text
 * stays the same size and stays crisp whatever the camera zoom.
 *
 * This file is a stub from the pin. The signatures are the contract; the bodies are not.
 */
import type { Lut, Slot } from '../core/palette';
import type { Surface } from '../core/surface';

export interface TextStyle {
  /** Text colour. Default 'steel.0'. */
  slot?: Slot;
  align?: 'left' | 'center' | 'right';
  /** Wrap width in pixels. Default: no wrapping. */
  maxWidth?: number;
  /** 0..1. Default 1. */
  opacity?: number;
}

export interface TextBox {
  w: number;
  h: number;
  lines: string[];
}

/** Size of a text block once wrapped. */
export function measureText(text: string, maxWidth?: number): TextBox {
  void maxWidth;
  return { w: 0, h: 0, lines: [text] };
}

/** Draw text with its top-left (or top-centre / top-right, per `align`) at (x, y). */
export function drawText(out: Surface, lut: Lut, text: string, x: number, y: number, style?: TextStyle): void {
  void [out, lut, text, x, y, style];
}

export interface BubbleSpec {
  /** Screen position of the top of the speaker's head; the bubble sits above it. */
  x: number;
  y: number;
  text: string;
  kind: 'say' | 'think' | 'shout';
  /** 0..1 share of the text revealed. */
  reveal: number;
}

/** Draw a speech bubble, kept fully inside the surface, with its tail pointing at (x, y). */
export function drawBubble(out: Surface, lut: Lut, bubble: BubbleSpec): void {
  void [out, lut, bubble];
}

/** A line of narration along the bottom of the frame. */
export function drawCaption(out: Surface, lut: Lut, text: string, opacity: number): void {
  void [out, lut, text, opacity];
}

/** A full-frame title card. */
export function drawTitle(out: Surface, lut: Lut, title: string, subtitle: string | undefined, opacity: number): void {
  void [out, lut, title, subtitle, opacity];
}

/** A small tag centred above (x, y), used for teaching labels. */
export function drawLabel(out: Surface, lut: Lut, text: string, x: number, y: number, opacity: number): void {
  void [out, lut, text, x, y, opacity];
}

/** An emote icon centred above (x, y). Unknown names draw nothing. */
export function drawEmote(out: Surface, lut: Lut, name: string, x: number, y: number): void {
  void [out, lut, name, x, y];
}
