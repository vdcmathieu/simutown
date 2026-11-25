import { describe, expect, it } from 'vitest';
import { emotes, font } from '../src/art/ui';
import { compileTheme, dusk, lutRgb } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { FRAME_H, FRAME_W } from '../src/core/types';
import {
  BUBBLE_WRAP,
  drawBubble,
  drawCaption,
  drawEmote,
  drawLabel,
  drawText,
  drawTitle,
  glyphFor,
  lineWidth,
  measureBalanced,
  measureText,
} from '../src/ui';

const lut = compileTheme(dusk);
const frame = () => new Surface(FRAME_W, FRAME_H);

/** Bounding box of the drawn (non-transparent) pixels. */
function inked(s: Surface) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      if (s.data[(y * s.w + x) * 4 + 3] === 0) continue;
      n++;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1, n };
}

describe('font', () => {
  it('covers printable ASCII, French and German letters and the extra symbols', () => {
    const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i));
    const extra = [...'àâäçéèêëîïôöùûüÿœæßÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ‘’“”–—…•←→↑↓♥«»'];
    for (const ch of [...ascii, ...extra]) expect(font.glyphs[ch], `missing "${ch}"`).toBeDefined();
  });

  it('has single-slot glyphs, one line box tall, advancing one pixel past their ink', () => {
    for (const [ch, g] of Object.entries(font.glyphs)) {
      expect(g.sprite.h, ch).toBe(font.height);
      expect(new Set([...g.sprite.px].filter((v) => v !== 0)).size, ch).toBeLessThanOrEqual(1);
      expect(g.advance, ch).toBe(g.sprite.w + 1);
    }
  });

  it('falls back to ? for unknown characters', () => {
    expect(glyphFor('漢')).toBe(font.glyphs['?']);
    expect(lineWidth('✓')).toBe(lineWidth('?'));
  });
});

describe('measureText', () => {
  it('measures a single line without the trailing letter space', () => {
    const box = measureText('Hi');
    expect(box.lines).toEqual(['Hi']);
    expect(box.w).toBe(font.glyphs.H!.advance + font.glyphs.i!.advance - 1);
    expect(box.h).toBe(font.height);
  });

  it('measures empty text as nothing', () => {
    expect(measureText('')).toEqual({ w: 0, h: 0, lines: [] });
  });

  it('wraps on spaces and keeps every line within the width', () => {
    const text = 'The quick brown fox jumps over the lazy dog, twice and then once more.';
    const box = measureText(text, 80);
    expect(box.lines.length).toBeGreaterThan(1);
    for (const l of box.lines) expect(lineWidth(l)).toBeLessThanOrEqual(80);
    expect(box.lines.join(' ')).toBe(text);
    expect(box.h).toBe(box.lines.length * font.height);
  });

  it('breaks on newlines and splits words that are wider than the line', () => {
    expect(measureText('one\ntwo').lines).toEqual(['one', 'two']);
    const long = measureText('Donaudampfschifffahrtsgesellschaft', 40);
    expect(long.lines.length).toBeGreaterThan(1);
    for (const l of long.lines) expect(lineWidth(l)).toBeLessThanOrEqual(40);
    expect(long.lines.join('')).toBe('Donaudampfschifffahrtsgesellschaft');
  });

  it('never leaves French punctuation alone at the start of a line', () => {
    // From the widest word up; narrower lines split words by character.
    for (let w = lineWidth('boulangerie\u00a0?'); w < 160; w += 3) {
      for (const l of measureText('Où est la boulangerie ? « Ici » !', w).lines) {
        expect(l, `width ${w}`).not.toMatch(/^[?!:;»]/);
        expect(l, `width ${w}`).not.toMatch(/«$/);
      }
    }
  });

  it('balances lines without adding any', () => {
    const text = 'Hello, Simutown! Bonjour à tous.';
    const greedy = measureText(text, BUBBLE_WRAP);
    const even = measureBalanced(text, BUBBLE_WRAP);
    expect(even.lines.length).toBe(greedy.lines.length);
    expect(even.w).toBeLessThanOrEqual(greedy.w);
    expect(even.lines).toEqual(['Hello, Simutown!', 'Bonjour à tous.']);
  });
});

describe('drawing', () => {
  it('draws text in the requested slot, at flat alpha', () => {
    const s = new Surface(40, 14);
    drawText(s, lut, 'Hi', 0, 0, { slot: 'cream.2', opacity: 0.5 });
    const { n } = inked(s);
    expect(n).toBeGreaterThan(0);
    const o = [...s.data].findIndex((v, i) => i % 4 === 3 && v !== 0);
    expect(s.data[o]).toBe(128);
  });

  it('aligns text to the left, centre and right of x', () => {
    const at = (align: 'left' | 'center' | 'right') => {
      const s = new Surface(100, 14);
      drawText(s, lut, 'II', 50, 0, { align });
      return inked(s);
    };
    const w = lineWidth('II');
    expect(at('left').x0).toBe(50);
    expect(at('right').x1).toBe(49);
    expect(at('center').x0).toBe(50 - Math.floor(w / 2));
  });

  it('keeps bubbles inside the frame and points the tail at the speaker', () => {
    const corners: [number, number][] = [[0, 0], [FRAME_W, 0], [0, FRAME_H], [FRAME_W, FRAME_H], [-50, 120], [900, 120]];
    for (const kind of ['say', 'think', 'shout'] as const) {
      for (const [x, y] of corners) {
        const s = frame();
        drawBubble(s, lut, { x, y, kind, text: 'A rather long sentence that wraps onto a second line.', reveal: 1 });
        const b = inked(s);
        expect(b.n, `${kind} at ${x},${y}`).toBeGreaterThan(0);
        expect(b.x0).toBeGreaterThanOrEqual(1);
        expect(b.y0).toBeGreaterThanOrEqual(1);
        expect(b.x1).toBeLessThanOrEqual(FRAME_W - 2);
        expect(b.y1).toBeLessThanOrEqual(FRAME_H - 2);
      }
    }
    // In open space, the tail reaches down to just above the head.
    const s = frame();
    drawBubble(s, lut, { x: 200, y: 150, kind: 'say', text: 'Hello!', reveal: 1 });
    expect(inked(s).y1).toBe(149);
  });

  it('keeps the bubble size while typing and reveals text progressively', () => {
    const ink = lutRgb(lut, 'steel.0');
    const at = (reveal: number) => {
      const s = frame();
      drawBubble(s, lut, { x: 240, y: 150, kind: 'say', text: 'Typing slowly.', reveal });
      let dark = 0;
      for (let i = 0; i < s.data.length; i += 4) if (s.data[i] === ink[0] && s.data[i + 1] === ink[1] && s.data[i + 2] === ink[2]) dark++;
      return { ...inked(s), dark };
    };
    const [none, half, all] = [at(0), at(0.5), at(1)];
    expect([none.x0, none.y0, none.x1, none.y1]).toEqual([all.x0, all.y0, all.x1, all.y1]);
    expect(none.dark).toBeLessThan(half.dark);
    expect(half.dark).toBeLessThan(all.dark);
  });

  it('draws captions, titles, labels and emotes, and skips unknown emotes', () => {
    const s = frame();
    drawCaption(s, lut, 'One line of narration, which wraps onto two lines when it gets long enough to need it, and more.', 1);
    expect(inked(s).y1).toBeLessThan(FRAME_H);
    drawTitle(s, lut, 'Title', 'Subtitle', 1);
    expect(inked(s).n).toBe(FRAME_W * FRAME_H);
    const e = frame();
    drawEmote(e, lut, 'nope', 100, 100);
    expect(inked(e).n).toBe(0);
    drawEmote(e, lut, 'heart', 100, 100);
    const b = inked(e);
    expect(b.y1).toBeLessThan(100);
    expect(Math.abs((b.x0 + b.x1) / 2 - 100)).toBeLessThanOrEqual(1);
    expect(Object.keys(emotes).sort()).toEqual(
      ['anger', 'dots', 'happy', 'heart', 'idea', 'note', 'question', 'sad', 'surprise', 'zzz'],
    );
    for (const sp of Object.values(emotes)) expect([sp.w, sp.h, sp.ax, sp.ay]).toEqual([11, 11, 5, 11]);
    const l = frame();
    drawLabel(l, lut, 'Ana', 240, 100, 1);
    expect(inked(l).y1).toBeLessThan(100);
  });

  it('never throws on odd input', () => {
    const s = frame();
    const odd = [NaN, Infinity, -Infinity, -1e9, 1e9];
    for (const v of odd) {
      expect(() => drawText(s, lut, 'x 漢 ✓', v, v, { maxWidth: v, opacity: v })).not.toThrow();
      expect(() => drawBubble(s, lut, { x: v, y: 10, text: '漢字', kind: 'say', reveal: v })).not.toThrow();
      expect(() => drawBubble(s, lut, { x: 10, y: v, text: 'hi', kind: 'think', reveal: 1 })).not.toThrow();
      expect(() => drawLabel(s, lut, 'x', v, v, v)).not.toThrow();
      expect(() => drawCaption(s, lut, '', v)).not.toThrow();
      expect(() => drawTitle(s, lut, '', undefined, v)).not.toThrow();
      expect(() => drawEmote(s, lut, 'heart', v, v)).not.toThrow();
    }
    const tiny = new Surface(4, 4);
    expect(() => drawBubble(tiny, lut, { x: 2, y: 2, text: 'too big for this surface', kind: 'shout', reveal: 1 })).not.toThrow();
    expect(() => drawCaption(tiny, lut, 'caption', 1)).not.toThrow();
    expect(() => drawTitle(tiny, lut, 'Title', 'sub', 1)).not.toThrow();
    expect(() => drawLabel(tiny, lut, 'label', 2, 2, 1)).not.toThrow();
  });
});
