/**
 * Text and overlay drawing: speech bubbles, captions, title cards, labels, emotes.
 * All coordinates are screen pixels on the final FRAME_W x FRAME_H surface, so text
 * stays the same size and stays crisp whatever the camera zoom.
 *
 * Nothing here throws at draw time: unknown characters draw as `?`, unknown emotes draw
 * nothing, and non-finite positions draw nothing.
 */
import { emotes as builtinEmotes, font as builtinFont } from '../art/ui';
import { type Lut, lutRgb, type RGB, type Slot } from '../core/palette';
import { blank, type Sprite } from '../core/sprite';
import type { Surface } from '../core/surface';
import type { BitmapFont, Glyph } from '../core/types';

/**
 * Optional art for every function here: a renderer with a custom ArtRegistry passes its
 * `font` and `emotes` so they are the ones drawn. Both default to the built-ins.
 */
export interface UiArt {
  font?: BitmapFont;
  emotes?: Record<string, Sprite>;
}

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

const EMPTY: Glyph = { sprite: blank(1, 1), advance: 2 };

/** The glyph for a character, or `?` when the font does not have it (then a blank). */
export function glyphFor(ch: string, font: BitmapFont = builtinFont): Glyph {
  const g = font.glyphs ?? {};
  return g[ch] ?? (ch === '\t' || ch === '\u00a0' ? g[' '] : undefined) ?? g['?'] ?? EMPTY;
}

/** Width in pixels of one line of text, without the trailing letter space. */
export function lineWidth(line: string, font: BitmapFont = builtinFont): number {
  let w = 0;
  for (const ch of line) w += glyphFor(ch, font).advance;
  return Math.max(0, w - 1);
}

/** Where a font's capitals sit inside its line box, measured once from its `H`. */
interface Metrics {
  /** Rows above the capital top. */
  top: number;
  /** Capital height in pixels. */
  cap: number;
  /** Glyphs with ink below the baseline (descenders). */
  deep: Set<string>;
}

const METRICS = new WeakMap<BitmapFont, Metrics>();

function inkRows(s: Sprite): [number, number] {
  let lo = -1;
  let hi = -1;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (s.px[y * s.w + x] === 0) continue;
      if (lo < 0) lo = y;
      hi = y;
    }
  }
  return [lo, hi];
}

function metrics(font: BitmapFont): Metrics {
  let m = METRICS.get(font);
  if (m) return m;
  const glyphs = font.glyphs ?? {};
  const ref = glyphs.H ?? glyphs.A ?? Object.values(glyphs)[0];
  const [lo, hi] = ref ? inkRows(ref.sprite) : [0, Math.max(1, font.height) - 1];
  const top = Math.max(0, lo);
  const base = Math.max(top, hi);
  const deep = new Set<string>();
  for (const [ch, g] of Object.entries(glyphs)) if (inkRows(g.sprite)[1] > base) deep.add(ch);
  m = { top, cap: base - top + 1, deep };
  METRICS.set(font, m);
  return m;
}

/** Whether a line has any descender, which needs one more row of padding below it. */
const hasDescender = (line: string, font: BitmapFont) => [...line].some((ch) => metrics(font).deep.has(ch));

/** Break a word that is wider than `max` into pieces that fit (at least one character each). */
function breakWord(word: string, max: number, font: BitmapFont): string[] {
  const parts: string[] = [];
  let cur = '';
  for (const ch of word) {
    if (cur !== '' && lineWidth(cur + ch, font) > max) {
      parts.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur !== '') parts.push(cur);
  return parts;
}

/** Greedy word wrap. Explicit newlines always break; long words are split by character. */
function wrap(text: string, maxWidth: number | undefined, font: BitmapFont): string[] {
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
      if (lineWidth(candidate, font) <= max) {
        line = candidate;
        continue;
      }
      if (line !== '') lines.push(line);
      const pieces = lineWidth(word, font) > max ? breakWord(word, max, font) : [word];
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
export function measureText(text: string, maxWidth?: number, art?: UiArt): TextBox {
  if (text === '' || text === undefined || text === null) return { w: 0, h: 0, lines: [] };
  const font = art?.font ?? builtinFont;
  const lines = wrap(text, maxWidth, font);
  const w = lines.reduce((m, l) => Math.max(m, lineWidth(l, font)), 0);
  return { w, h: lines.length * font.height, lines };
}

/**
 * Wrap to the narrowest width that still gives as few lines as wrapping at `maxWidth`,
 * so a bubble reads "Hello, Simutown! / Bonjour à tous." instead of leaving an orphan.
 */
export function measureBalanced(text: string, maxWidth: number, art?: UiArt): TextBox {
  const best = measureText(text, maxWidth, art);
  if (best.lines.length < 2) return best;
  let lo = 1;
  let hi = best.w;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (measureText(text, mid, art).lines.length <= best.lines.length) hi = mid;
    else lo = mid + 1;
  }
  return measureText(text, hi, art);
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
function drawLine(out: Surface, font: BitmapFont, c: RGB, a: number, line: string, x: number, y: number, scale = 1, limit = Infinity): number {
  let pen = x;
  let n = 0;
  for (const ch of line) {
    if (n >= limit) break;
    n++;
    const g = glyphFor(ch, font);
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
  font: BitmapFont,
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
    const w = lineWidth(line, font) * scale;
    const lx = align === 'center' ? x - Math.floor(w / 2) : align === 'right' ? x - w : x;
    left -= drawLine(out, font, c, a, line, Math.round(lx), Math.round(y + i * font.height * scale), scale, left);
  });
}

/** Draw text with its top-left (or top-centre / top-right, per `align`) at (x, y). */
export function drawText(out: Surface, lut: Lut, text: string, x: number, y: number, style?: TextStyle, art?: UiArt): void {
  if (!finite(x, y) || !text) return;
  const a = alpha255(style?.opacity ?? 1);
  if (a === 0) return;
  const font = art?.font ?? builtinFont;
  const { lines } = measureText(text, style?.maxWidth, art);
  drawLines(out, font, colour(lut, style?.slot ?? 'steel.0'), a, lines, x, y, style?.align ?? 'left');
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
const inkHeight = (lines: number, font: BitmapFont) => (lines - 1) * font.height + metrics(font).cap;

/**
 * Draw a speech bubble, kept fully inside the surface, with its tail pointing at (x, y).
 * The box is sized for the whole text, so it does not grow while `reveal` types it out.
 * `say` is a rounded box with a pointed tail, `think` a cloud with a trail of puffs,
 * `shout` a spiky box with a jagged tail.
 */
export function drawBubble(out: Surface, lut: Lut, bubble: BubbleSpec, art?: UiArt): void {
  const { x, y, kind } = bubble;
  if (!finite(x, y) || !bubble.text) return;
  const font = art?.font ?? builtinFont;
  const { w: tw, lines } = measureBalanced(bubble.text, BUBBLE_WRAP, art);
  if (lines.length === 0) return;

  // Cloud bumps and spikes stick out of the box, so those kinds keep a wider margin.
  const edge = kind === 'say' ? MARGIN : MARGIN + 3;
  const w = Math.max(tw + PAD_X * 2, 16);
  const h = PAD_TOP + inkHeight(lines.length, font) + PAD_BOTTOM + (hasDescender(lines[lines.length - 1]!, font) ? 1 : 0);
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
  const textY = by + PAD_TOP - metrics(font).top;
  drawLines(out, font, colour(lut, 'steel.0'), 255, lines, bx + Math.floor(w / 2), textY, 'center', 1, shown);
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
function ellipsize(line: string, max: number, font: BitmapFont): string {
  if (lineWidth(line, font) <= max) return line;
  let s = line;
  while (s.length > 0 && lineWidth(`${s}…`, font) > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/**
 * A line of narration along the bottom of the frame: a calm ink panel with centred
 * cream text, up to two lines. Longer text is cut with an ellipsis.
 */
export function drawCaption(out: Surface, lut: Lut, text: string, opacity: number, art?: UiArt): void {
  const a = alpha255(opacity);
  if (a === 0 || !text) return;
  const font = art?.font ?? builtinFont;
  const maxW = Math.min(out.w - 40, 400);
  let { lines } = measureBalanced(text, maxW, art);
  if (lines.length > 2) lines = [lines[0]!, ellipsize(lines.slice(1).join(' '), maxW, font)];
  const tw = lines.reduce((m, l) => Math.max(m, lineWidth(l, font)), 0);
  const w = Math.min(out.w - 8, tw + 20);
  const h = 5 + inkHeight(lines.length, font) + 6;
  const x = Math.floor((out.w - w) / 2);
  const y = out.h - 6 - h;
  const panel = new Mask(x, y, w, h);
  panel.box(x, y, w, h, 2);
  const ink = colour(lut, 'steel.0');
  const fill = Math.round(a * 0.84);
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (panel.get(xx, yy)) out.plot(xx, yy, ink[0], ink[1], ink[2], fill);
  drawLines(out, font, colour(lut, 'cream.2'), a, lines, Math.floor(out.w / 2), y + 5 - metrics(font).top, 'center');
}

/**
 * A full-frame title card: ink background, the title in large cream letters (the font
 * scaled x3, or x2 when it would not fit), a thin ochre rule, and an optional subtitle.
 */
export function drawTitle(out: Surface, lut: Lut, title: string, subtitle: string | undefined, opacity: number, art?: UiArt): void {
  const a = alpha255(opacity);
  if (a === 0) return;
  const font = art?.font ?? builtinFont;
  const { top } = metrics(font);
  const ink = colour(lut, 'steel.0');
  out.rect(0, 0, out.w, out.h, [ink[0], ink[1], ink[2], a]);
  const maxW = out.w - 48;
  const scale = lineWidth(title ?? '', font) * 3 <= maxW ? 3 : 2;
  const tLines = title ? measureBalanced(title, Math.floor(maxW / scale), art).lines.slice(0, 3) : [];
  const sLines = subtitle ? measureBalanced(subtitle, Math.min(maxW, 320), art).lines.slice(0, 3) : [];

  const titleH = tLines.length ? inkHeight(tLines.length, font) * scale : 0;
  const gap = 10;
  const subH = sLines.length ? inkHeight(sLines.length, font) : 0;
  const total = titleH + (subH ? gap * 2 + 1 + subH : gap + 1);
  let y = Math.floor((out.h - total) / 2);
  const cx = Math.floor(out.w / 2);
  drawLines(out, font, colour(lut, 'cream.2'), a, tLines, cx, y - top * scale, 'center', scale);
  y += titleH + gap;
  const ruleW = Math.min(64, Math.max(24, Math.floor(tLines.reduce((m, l) => Math.max(m, lineWidth(l, font)), 0) * scale * 0.4)));
  out.rect(cx - Math.floor(ruleW / 2), y, ruleW, 1, [...colour(lut, 'ochre.2'), a]);
  y += 1 + gap;
  if (sLines.length) drawLines(out, font, colour(lut, 'steel.5'), a, sLines, cx, y - top, 'center');
}

/** Rows between the pill's bottom edge and the point it marks (the pointer). */
const LABEL_POINTER = 3;

/** The pill of a label: its one line of text and the pill's size without the outline. */
function labelPill(text: string, maxW: number, font: BitmapFont) {
  const line = ellipsize(measureText(text, undefined, { font }).lines.join(' '), maxW, font);
  return { line, w: lineWidth(line, font) + 8, h: 3 + metrics(font).cap + 3 + (hasDescender(line, font) ? 1 : 0) };
}

/**
 * The space a label takes, outline and pointer included: `w` wide and `h` tall, sitting in
 * the `h` rows directly above the point it marks (rows y - h to y - 1). Stack the next
 * overlay at y - h - gap. With the built-in font a label is 18 tall, or 19 when its text
 * has a descender (g, j, p, q, y, comma).
 */
export function measureLabel(text: string, art?: UiArt): { w: number; h: number } {
  if (!text) return { w: 0, h: 0 };
  const pill = labelPill(text, Infinity, art?.font ?? builtinFont);
  return { w: pill.w + 2, h: pill.h + LABEL_POINTER + 2 };
}

/**
 * A small tag centred above (x, y), used for teaching labels: a cream pill with an ink
 * outline and ink text, and a short pointer down to the point. Kept inside the frame.
 * `measureLabel` gives its size.
 */
export function drawLabel(out: Surface, lut: Lut, text: string, x: number, y: number, opacity: number, art?: UiArt): void {
  const a = alpha255(opacity);
  if (a === 0 || !text || !finite(x, y)) return;
  const font = art?.font ?? builtinFont;
  const { line, w, h } = labelPill(text, out.w - 20, font);
  const tipX = Math.round(clampTo(x, MARGIN, out.w - 1 - MARGIN));
  // The pointer's outline ends on the row just above the point.
  const tipY = Math.round(clampTo(y - 1, MARGIN, out.h - 1 - MARGIN));
  const bx = Math.round(clampTo(x - w / 2, MARGIN, out.w - MARGIN - w));
  const by = Math.round(clampTo(tipY - LABEL_POINTER - h, MARGIN, out.h - MARGIN - h));
  const m = new Mask(bx - 2, by - 2, w + 4, Math.max(h, tipY - by + 1) + 4);
  m.box(bx, by, w, h, 2);
  if (tipY - (by + h) >= 2) {
    const base = clampTo(tipX, bx + 4, bx + w - 4);
    m.tri(base - 2.5, by + h - 1, base + 2.5, by + h - 1, base + 0.5, tipY - 0.5);
  }
  m.paint(out, colour(lut, 'cream.2'), colour(lut, 'steel.0'), a);
  drawLines(out, font, colour(lut, 'steel.0'), a, [line], bx + Math.floor(w / 2), by + 3 - metrics(font).top, 'center');
}

/**
 * The space an emote takes: its sprite box (outline included) plus one free row under it,
 * in the `h` rows directly above the point (rows y - h to y - 1). The built-in emotes are
 * 11x11, so `h` is 12. Unknown names measure 0x0.
 */
export function measureEmote(name: string, art?: UiArt): { w: number; h: number } {
  const s = (art?.emotes ?? builtinEmotes)[name];
  return s ? { w: s.w, h: s.h + 1 } : { w: 0, h: 0 };
}

/** An emote icon centred above (x, y). Unknown names draw nothing. */
export function drawEmote(out: Surface, lut: Lut, name: string, x: number, y: number, art?: UiArt): void {
  const s = (art?.emotes ?? builtinEmotes)[name];
  if (!s || !finite(x, y)) return;
  out.blit(s, Math.round(x) - Math.floor(s.w / 2) + s.ax, Math.round(y) - 1 - s.h + s.ay, lut);
}
