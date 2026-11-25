/**
 * Text and overlay drawing: speech bubbles, captions, title cards, labels, emotes.
 * All coordinates are screen pixels on the final FRAME_W x FRAME_H surface, so text
 * stays the same size and stays crisp whatever the camera zoom.
 *
 * Nothing here throws at draw time: unknown characters draw as `?`, unknown emotes draw
 * nothing, and non-finite positions draw nothing.
 */
import { emotes, FONT_CAP, FONT_TOP, font } from '../art/ui';
import { type Lut, lutRgb, type RGB, type Slot } from '../core/palette';
import type { Surface } from '../core/surface';
import type { Glyph } from '../core/types';

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

// ---------------------------------------------------------------------------------------
// Measuring and wrapping
// ---------------------------------------------------------------------------------------

/** Wrap width of speech bubbles, in pixels. */
export const BUBBLE_WRAP = 140;

const FALLBACK = font.glyphs['?']!;

/** The glyph for a character, or `?` when the font does not have it. */
export function glyphFor(ch: string): Glyph {
  return font.glyphs[ch] ?? (ch === '\t' ? font.glyphs[' ']! : FALLBACK);
}

/** Width in pixels of one line of text, without the trailing letter space. */
export function lineWidth(line: string): number {
  let w = 0;
  for (const ch of line) w += glyphFor(ch).advance;
  return Math.max(0, w - 1);
}

/** Break a word that is wider than `max` into pieces that fit (at least one character each). */
function breakWord(word: string, max: number): string[] {
  const parts: string[] = [];
  let cur = '';
  for (const ch of word) {
    if (cur !== '' && lineWidth(cur + ch) > max) {
      parts.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur !== '') parts.push(cur);
  return parts;
}

/** Greedy word wrap. Explicit newlines always break; long words are split by character. */
function wrap(text: string, maxWidth?: number): string[] {
  const max = maxWidth !== undefined && Number.isFinite(maxWidth) && maxWidth > 0 ? maxWidth : Infinity;
  const lines: string[] = [];
  // French spacing: never break before ? ! : ; » or after «.
  const bound = String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/ ([?!:;»])/g, '\u00a0$1')
    .replace(/« /g, '«\u00a0');
  for (const para of bound.split('\n')) {
    const words = para.split(' ').filter((w) => w !== '');
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line === '' ? word : `${line} ${word}`;
      if (lineWidth(candidate) <= max) {
        line = candidate;
        continue;
      }
      if (line !== '') lines.push(line);
      const pieces = lineWidth(word) > max ? breakWord(word, max) : [word];
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1]!;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Size of a text block once wrapped. `h` counts whole line boxes (font.height each),
 * which include the accent zone above capitals and room for descenders.
 * Empty text measures 0x0 with no lines.
 */
export function measureText(text: string, maxWidth?: number): TextBox {
  if (text === '' || text === undefined || text === null) return { w: 0, h: 0, lines: [] };
  const lines = wrap(text, maxWidth);
  const w = lines.reduce((m, l) => Math.max(m, lineWidth(l)), 0);
  return { w, h: lines.length * font.height, lines };
}

/**
 * Wrap to the narrowest width that still gives as few lines as wrapping at `maxWidth`,
 * so a bubble reads "Hello, Simutown! / Bonjour à tous." instead of leaving an orphan.
 */
export function measureBalanced(text: string, maxWidth: number): TextBox {
  const best = measureText(text, maxWidth);
  if (best.lines.length < 2) return best;
  let lo = 1;
  let hi = best.w;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (measureText(text, mid).lines.length <= best.lines.length) hi = mid;
    else lo = mid + 1;
  }
  return measureText(text, hi);
}

// ---------------------------------------------------------------------------------------
// Drawing text
// ---------------------------------------------------------------------------------------

const clamp01 = (v: number | undefined, dflt = 1) =>
  v === undefined || Number.isNaN(v) ? dflt : Math.max(0, Math.min(1, v));
const alpha255 = (opacity: number) => Math.round(clamp01(opacity) * 255);
const finite = (...v: number[]) => v.every((n) => Number.isFinite(n));

function colour(lut: Lut, slot: Slot): RGB {
  try {
    return lutRgb(lut, slot);
  } catch {
    return lutRgb(lut, 'steel.0');
  }
}

/** Draw one line of glyphs with the pen's top-left at (x, y), each pixel `scale` x `scale`. */
function drawLine(out: Surface, c: RGB, a: number, line: string, x: number, y: number, scale = 1, limit = Infinity): number {
  let pen = x;
  let n = 0;
  for (const ch of line) {
    if (n >= limit) break;
    n++;
    const g = glyphFor(ch);
    const s = g.sprite;
    for (let sy = 0; sy < s.h; sy++) {
      for (let sx = 0; sx < s.w; sx++) {
        if (s.px[sy * s.w + sx] === 0) continue;
        for (let k = 0; k < scale * scale; k++) {
          out.plot(pen + sx * scale + (k % scale), y + sy * scale + Math.floor(k / scale), c[0], c[1], c[2], a);
        }
      }
    }
    pen += g.advance * scale;
  }
  return n;
}

/** Shared by drawText and the overlays: draw wrapped lines, revealing at most `limit` characters. */
function drawLines(
  out: Surface,
  c: RGB,
  a: number,
  lines: string[],
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
  scale = 1,
  limit = Infinity,
): void {
  let left = limit;
  lines.forEach((line, i) => {
    if (left <= 0) return;
    const w = lineWidth(line) * scale;
    const lx = align === 'center' ? x - Math.floor(w / 2) : align === 'right' ? x - w : x;
    left -= drawLine(out, c, a, line, Math.round(lx), Math.round(y + i * font.height * scale), scale, left);
  });
}

/** Draw text with its top-left (or top-centre / top-right, per `align`) at (x, y). */
export function drawText(out: Surface, lut: Lut, text: string, x: number, y: number, style?: TextStyle): void {
  if (!finite(x, y) || !text) return;
  const a = alpha255(style?.opacity ?? 1);
  if (a === 0) return;
  const { lines } = measureText(text, style?.maxWidth);
  drawLines(out, colour(lut, style?.slot ?? 'steel.0'), a, lines, x, y, style?.align ?? 'left');
}

// ---------------------------------------------------------------------------------------
// Shapes: a boolean mask, filled and then ringed with a 1-pixel outline
// ---------------------------------------------------------------------------------------

/** A boolean pixel mask in screen coordinates, covering [x0, x0 + w) x [y0, y0 + h). */
class Mask {
  readonly on: Uint8Array;
  constructor(
    readonly x0: number,
    readonly y0: number,
    readonly w: number,
    readonly h: number,
  ) {
    this.on = new Uint8Array(Math.max(1, w * h));
  }

  get(x: number, y: number): boolean {
    const lx = x - this.x0;
    const ly = y - this.y0;
    return lx >= 0 && ly >= 0 && lx < this.w && ly < this.h && this.on[ly * this.w + lx] === 1;
  }

  set(x: number, y: number): void {
    const lx = x - this.x0;
    const ly = y - this.y0;
    if (lx >= 0 && ly >= 0 && lx < this.w && ly < this.h) this.on[ly * this.w + lx] = 1;
  }

  /** A rectangle with its corners cut: pixels whose distance from a corner (dx + dy) is below `cut`. */
  box(x: number, y: number, w: number, h: number, cut: number): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dx = Math.min(i, w - 1 - i);
        const dy = Math.min(j, h - 1 - j);
        if (dx + dy >= cut) this.set(x + i, y + j);
      }
    }
  }

  /** A filled disc centred on (cx, cy), tested at pixel centres. */
  disc(cx: number, cy: number, r: number): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) this.set(x, y);
      }
    }
  }

  /** A filled triangle, tested at pixel centres. */
  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
    const side = (px: number, py: number, qx: number, qy: number, x: number, y: number) =>
      (qx - px) * (y - py) - (qy - py) * (x - px);
    for (let y = Math.floor(Math.min(ay, by, cy)); y <= Math.ceil(Math.max(ay, by, cy)); y++) {
      for (let x = Math.floor(Math.min(ax, bx, cx)); x <= Math.ceil(Math.max(ax, bx, cx)); x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const d1 = side(ax, ay, bx, by, px, py);
        const d2 = side(bx, by, cx, cy, px, py);
        const d3 = side(cx, cy, ax, ay, px, py);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.set(x, y);
      }
    }
  }

  /** Fill the mask and draw a 1-pixel outline just outside it (4-neighbour). */
  paint(out: Surface, fill: RGB, line: RGB, a: number): void {
    for (let y = this.y0 - 1; y <= this.y0 + this.h; y++) {
      for (let x = this.x0 - 1; x <= this.x0 + this.w; x++) {
        if (this.get(x, y)) out.plot(x, y, fill[0], fill[1], fill[2], a);
        else if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) {
          out.plot(x, y, line[0], line[1], line[2], a);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------------------
// Speech bubbles
// ---------------------------------------------------------------------------------------

export interface BubbleSpec {
  /** Screen position of the top of the speaker's head; the bubble sits above it. */
  x: number;
  y: number;
  text: string;
  kind: 'say' | 'think' | 'shout';
  /** 0..1 share of the text revealed. */
  reveal: number;
}

/** Keep this many pixels between an overlay and the frame edge. */
const MARGIN = 3;
const PAD_X = 5;
/** Space between the bubble's top edge and the capital top of the first line. */
const PAD_TOP = 4;
/** Space between the last baseline and the bubble's bottom edge. */
const PAD_BOTTOM = 4;
/** How far the tail reaches below the box. */
const TAIL = 7;

const clampTo = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));

/** Height of a text block measured from the first capital top to the last baseline. */
const inkHeight = (lines: number) => (lines - 1) * font.height + FONT_CAP;

/**
 * Draw a speech bubble, kept fully inside the surface, with its tail pointing at (x, y).
 * The box is sized for the whole text, so it does not grow while `reveal` types it out.
 * `say` is a rounded box with a pointed tail, `think` a cloud with a trail of puffs,
 * `shout` a spiky box with a jagged tail.
 */
export function drawBubble(out: Surface, lut: Lut, bubble: BubbleSpec): void {
  const { x, y, kind } = bubble;
  if (!finite(x, y) || !bubble.text) return;
  const { w: tw, lines } = measureBalanced(bubble.text, BUBBLE_WRAP);
  if (lines.length === 0) return;

  // Cloud bumps and spikes stick out of the box, so those kinds keep a wider margin.
  const edge = kind === 'say' ? MARGIN : MARGIN + 3;
  const w = Math.max(tw + PAD_X * 2, 16);
  const h = PAD_TOP + inkHeight(lines.length) + PAD_BOTTOM + (lines.some((l) => /[gjpqyç,;]/.test(l)) ? 1 : 0);
  const tipX = Math.round(clampTo(x, MARGIN, out.w - 1 - MARGIN));
  // The tail's outline ends one pixel above the head.
  const tipY = Math.round(clampTo(y - 2, MARGIN, out.h - 1 - MARGIN));
  const bx = Math.round(clampTo(x - w / 2, edge, out.w - edge - w));
  const by = Math.round(clampTo(tipY - (kind === 'think' ? TAIL + 6 : TAIL) - h, edge, out.h - edge - h));
  const tail = tipY - (by + h);

  const mask = new Mask(bx - 8, by - 8, w + 16, Math.max(h, tipY - by + 1) + 16);
  if (kind === 'think') thinkShape(mask, bx, by, w, h, tipX, tipY, tail);
  else if (kind === 'shout') shoutShape(mask, bx, by, w, h, tipX, tipY, tail);
  else sayShape(mask, bx, by, w, h, tipX, tipY, tail);
  mask.paint(out, colour(lut, 'cream.2'), colour(lut, 'steel.0'), 255);

  const total = lines.reduce((n, l) => n + [...l].length, 0);
  const reveal = clamp01(Number.isFinite(bubble.reveal) ? bubble.reveal : 1);
  const shown = Math.floor(reveal * total + 1e-9);
  const textY = by + PAD_TOP - FONT_TOP;
  drawLines(out, colour(lut, 'steel.0'), 255, lines, bx + Math.floor(w / 2), textY, 'center', 1, shown);
}

/** Where a tail leaves the box: under the speaker, but never on a rounded corner. */
const tailBase = (bx: number, w: number, tipX: number, inset: number) => clampTo(tipX, bx + inset, bx + w - inset);

function sayShape(m: Mask, bx: number, by: number, w: number, h: number, tipX: number, tipY: number, tail: number) {
  m.box(bx, by, w, h, 2);
  if (tail < 3) return;
  const base = tailBase(bx, w, tipX, 7);
  // The tail leans toward the speaker but its tip stays below the box.
  const tx = clampTo(tipX, base - 6, base + 6);
  m.tri(base - 3.5, by + h - 1, base + 3.5, by + h - 1, tx + 0.5, tipY + 0.5);
}

function thinkShape(m: Mask, bx: number, by: number, w: number, h: number, tipX: number, tipY: number, tail: number) {
  m.box(bx, by, w, h, 4);
  // Puffs along the top and bottom edges turn the box into a cloud.
  const n = Math.max(2, Math.round((w - 8) / 12));
  for (let i = 0; i <= n; i++) {
    const cx = bx + 5 + ((w - 10) * i) / n;
    m.disc(cx, by + 3, 6);
    m.disc(cx, by + h - 3, 6);
  }
  for (let j = 1; j < Math.max(2, Math.round(h / 10)); j++) {
    const cy = by + (h * j) / Math.max(2, Math.round(h / 10));
    m.disc(bx + 2, cy, 3.5);
    m.disc(bx + w - 2, cy, 3.5);
  }
  if (tail < 9) return;
  // A trail of shrinking puffs from the cloud to the speaker.
  const sx = tailBase(bx, w, tipX, 6);
  const sy = by + h + 4;
  const at = (k: number) => [sx + (tipX - sx) * k, sy + (tipY - sy) * k] as const;
  const [ax, ay] = at(0.35);
  const [cx2, cy2] = at(0.95);
  m.disc(ax + 0.5, ay, 2.6);
  m.disc(cx2 + 0.5, cy2, 1.6);
}

function shoutShape(m: Mask, bx: number, by: number, w: number, h: number, tipX: number, tipY: number, tail: number) {
  m.box(bx, by, w, h, 1);
  // Spikes all around: small triangles pointing out of every edge, and one per corner.
  const sp = 3;
  const nx = Math.max(1, Math.round(w / 12));
  for (let i = 0; i < nx; i++) {
    const cx = bx + ((i + 0.5) * w) / nx;
    m.tri(cx - 3, by, cx + 3, by, cx + (i % 2 ? 1 : -1), by - sp);
    if (tail >= 3 && Math.abs(cx - tailBase(bx, w, tipX, 8)) < 8) continue;
    m.tri(cx - 3, by + h, cx + 3, by + h, cx + (i % 2 ? -1 : 1), by + h + sp);
  }
  const ny = Math.max(1, Math.round(h / 12));
  for (let j = 0; j < ny; j++) {
    const cy = by + ((j + 0.5) * h) / ny;
    m.tri(bx, cy - 3, bx, cy + 3, bx - sp, cy);
    m.tri(bx + w, cy - 3, bx + w, cy + 3, bx + w + sp, cy);
  }
  m.tri(bx, by + 3, bx + 3, by, bx - 2, by - 2);
  m.tri(bx + w - 3, by, bx + w, by + 3, bx + w + 2, by - 2);
  m.tri(bx, by + h - 3, bx + 3, by + h, bx - 2, by + h + 2);
  m.tri(bx + w - 3, by + h, bx + w, by + h - 3, bx + w + 2, by + h + 2);
  if (tail < 3) return;
  // A zigzag tail: two offset wedges, like a lightning bolt.
  const base = tailBase(bx, w, tipX, 8);
  const tx = clampTo(tipX, base - 6, base + 6);
  const midY = by + h + Math.floor(tail / 2);
  m.tri(base - 4, by + h - 1, base + 3, by + h - 1, base + 3, midY + 1);
  m.tri(base, midY - 1, base + 4, midY - 1, tx + 0.5, tipY + 0.5);
}

// ---------------------------------------------------------------------------------------
// Captions, title cards, labels, emotes
// ---------------------------------------------------------------------------------------

/** Shorten a line with an ellipsis until it fits `max` pixels. */
function ellipsize(line: string, max: number): string {
  if (lineWidth(line) <= max) return line;
  let s = line;
  while (s.length > 0 && lineWidth(`${s}…`) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/**
 * A line of narration along the bottom of the frame: a calm ink panel with centred
 * cream text, up to two lines. Longer text is cut with an ellipsis.
 */
export function drawCaption(out: Surface, lut: Lut, text: string, opacity: number): void {
  const a = alpha255(opacity);
  if (a === 0 || !text) return;
  const maxW = Math.min(out.w - 40, 400);
  let { lines } = measureBalanced(text, maxW);
  if (lines.length > 2) lines = [lines[0]!, ellipsize(lines.slice(1).join(' '), maxW)];
  const tw = lines.reduce((m, l) => Math.max(m, lineWidth(l)), 0);
  const w = Math.min(out.w - 8, tw + 20);
  const h = 5 + inkHeight(lines.length) + 6;
  const x = Math.floor((out.w - w) / 2);
  const y = out.h - 6 - h;
  const panel = new Mask(x, y, w, h);
  panel.box(x, y, w, h, 2);
  const ink = colour(lut, 'steel.0');
  const fill = Math.round(a * 0.84);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (panel.get(xx, yy)) out.plot(xx, yy, ink[0], ink[1], ink[2], fill);
  drawLines(out, colour(lut, 'cream.2'), a, lines, Math.floor(out.w / 2), y + 5 - FONT_TOP, 'center');
}

/**
 * A full-frame title card: ink background, the title in large cream letters (the font
 * scaled x3, or x2 when it would not fit), a thin ochre rule, and an optional subtitle.
 */
export function drawTitle(out: Surface, lut: Lut, title: string, subtitle: string | undefined, opacity: number): void {
  const a = alpha255(opacity);
  if (a === 0) return;
  const ink = colour(lut, 'steel.0');
  out.rect(0, 0, out.w, out.h, [ink[0], ink[1], ink[2], a]);
  const maxW = out.w - 48;
  const scale = lineWidth(title ?? '') * 3 <= maxW ? 3 : 2;
  const tLines = title ? measureBalanced(title, Math.floor(maxW / scale)).lines.slice(0, 3) : [];
  const sLines = subtitle ? measureBalanced(subtitle, Math.min(maxW, 320)).lines.slice(0, 3) : [];

  const titleH = tLines.length ? inkHeight(tLines.length) * scale : 0;
  const gap = 10;
  const subH = sLines.length ? inkHeight(sLines.length) : 0;
  const total = titleH + (subH ? gap * 2 + 1 + subH : gap + 1);
  let y = Math.floor((out.h - total) / 2);
  const cx = Math.floor(out.w / 2);
  drawLines(out, colour(lut, 'cream.2'), a, tLines, cx, y - FONT_TOP * scale, 'center', scale);
  y += titleH + gap;
  const ruleW = Math.min(64, Math.max(24, Math.floor(tLines.reduce((m, l) => Math.max(m, lineWidth(l)), 0) * scale * 0.4)));
  out.rect(cx - Math.floor(ruleW / 2), y, ruleW, 1, [...colour(lut, 'ochre.2'), a]);
  y += 1 + gap;
  if (sLines.length) drawLines(out, colour(lut, 'steel.5'), a, sLines, cx, y - FONT_TOP, 'center');
}

/**
 * A small tag centred above (x, y), used for teaching labels: a cream pill with an ink
 * outline and ink text, and a short pointer down to the point. Kept inside the frame.
 */
export function drawLabel(out: Surface, lut: Lut, text: string, x: number, y: number, opacity: number): void {
  const a = alpha255(opacity);
  if (a === 0 || !text || !finite(x, y)) return;
  const line = ellipsize(measureText(text).lines.join(' '), out.w - 20);
  const tw = lineWidth(line);
  const hasDesc = /[gjpqyç,;]/.test(line);
  const w = tw + 8;
  const h = 3 + FONT_CAP + 3 + (hasDesc ? 1 : 0);
  const tipX = Math.round(clampTo(x, MARGIN, out.w - 1 - MARGIN));
  const tipY = Math.round(clampTo(y - 1, MARGIN, out.h - 1 - MARGIN));
  const bx = Math.round(clampTo(x - w / 2, MARGIN, out.w - MARGIN - w));
  const by = Math.round(clampTo(tipY - 3 - h, MARGIN, out.h - MARGIN - h));
  const m = new Mask(bx - 2, by - 2, w + 4, Math.max(h, tipY - by + 1) + 4);
  m.box(bx, by, w, h, 2);
  if (tipY - (by + h) >= 2) {
    const base = clampTo(tipX, bx + 4, bx + w - 4);
    m.tri(base - 2.5, by + h - 1, base + 2.5, by + h - 1, base + 0.5, tipY - 0.5);
  }
  m.paint(out, colour(lut, 'cream.2'), colour(lut, 'steel.0'), a);
  drawLines(out, colour(lut, 'steel.0'), a, [line], bx + Math.floor(w / 2), by + 3 - FONT_TOP, 'center');
}

/** An emote icon centred above (x, y). Unknown names draw nothing. */
export function drawEmote(out: Surface, lut: Lut, name: string, x: number, y: number): void {
  const s = emotes[name];
  if (!s || !finite(x, y)) return;
  out.blit(s, Math.round(x) - Math.floor(s.w / 2) + s.ax, Math.round(y) - 1 - s.h + s.ay, lut);
}
