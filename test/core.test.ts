import { describe, expect, it } from 'vitest';
import { compileTheme, dusk, flipX, recolor, slotIndex, sprite, stack, Surface } from '../src/core';

const lut = compileTheme(dusk);

describe('sprite', () => {
  it('parses a text grid and ignores indentation', () => {
    const s = sprite(`
      .0.
      0q0
    `);
    expect([s.w, s.h]).toEqual([3, 2]);
    expect(s.px[0]).toBe(0);
    expect(s.px[1]).toBe(slotIndex('steel.0'));
    expect(s.px[4]).toBe(slotIndex('ochre.2'));
  });

  it('rejects ragged rows and unknown characters', () => {
    expect(() => sprite('00\n000')).toThrow(/row 1 is 3 wide/);
    expect(() => sprite('0?')).toThrow(/unknown character/);
  });

  it('accepts a custom legend', () => {
    const s = sprite('H.', { legend: { H: 'plum.1' } });
    expect(s.px[0]).toBe(slotIndex('plum.1'));
  });

  it('flips, recolours and stacks', () => {
    const s = sprite('0q.', { anchor: [1, 1] });
    const f = flipX(s);
    expect(Array.from(f.px)).toEqual([0, slotIndex('ochre.2'), slotIndex('steel.0')]);
    expect(f.ax).toBe(2);
    expect(recolor(s, { 'ochre.2': 'teal.1' }).px[1]).toBe(slotIndex('teal.1'));
    expect(Array.from(stack(sprite('0.'), sprite('.q')).px)).toEqual([slotIndex('steel.0'), slotIndex('ochre.2')]);
  });
});

describe('Surface', () => {
  it('blits at the anchor and clips at the edges', () => {
    const out = new Surface(4, 4);
    const s = sprite('qq\nqq', { anchor: [1, 2] });
    out.blit(s, 0, 1, lut); // covers x -1..0, y -1..0
    expect(out.data[3]).toBe(255); // (0,0) drawn
    expect(out.data[4 + 3]).toBe(0); // (1,0) untouched
  });

  it('mirrors around the anchor with flipX', () => {
    const out = new Surface(4, 1);
    out.blit(sprite('0...', { anchor: [0, 0] }), 4, 0, lut, { flipX: true });
    expect(out.data[3 * 4 + 3]).toBe(255);
  });

  it('upscales with nearest neighbour', () => {
    const out = new Surface(1, 1).clear([10, 20, 30, 255]).scaled(3);
    expect([out.w, out.h]).toEqual([3, 3]);
    expect(Array.from(out.data.subarray(32, 36))).toEqual([10, 20, 30, 255]);
  });
});
