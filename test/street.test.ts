import { describe, expect, it } from 'vitest';
import { streetProps } from '../src/art';
import { TILE } from '../src/core/types';

const REQUIRED = [
  'lamp', 'bench', 'fountain', 'signpost', 'mailbox', 'fence-h', 'fence-v',
  'stall', 'crate', 'barrel', 'planter', 'noticeboard', 'well',
];

describe('street props', () => {
  it('include every required prop', () => {
    for (const id of REQUIRED) expect(streetProps[id], id).toBeDefined();
  });

  for (const [id, def] of Object.entries(streetProps)) {
    it(`${id} stands on its origin tile and its places are walkable`, () => {
      const s = def.sprite;
      expect([s.ax, s.ay], 'anchor is bottom-left').toEqual([0, s.h]);
      expect(s.w % TILE).toBe(0);
      const fp = def.footprint ?? { w: 0, h: 0 };
      expect(fp.w * TILE).toBeLessThanOrEqual(s.w);
      expect(fp.h * TILE).toBeLessThanOrEqual(s.h);
      for (const [name, p] of Object.entries(def.places ?? {})) {
        const inside = p.dx >= 0 && p.dx < fp.w && p.dy <= 0 && p.dy > -fp.h;
        expect(inside, `${id}.${name} is on its own footprint`).toBe(false);
      }
    });
  }

  it('the lamp keeps its glowing glass and its light', () => {
    const lamp = streetProps.lamp!;
    expect(lamp.emissive).toBeDefined();
    expect([...lamp.emissive!.px].some((v) => v !== 0)).toBe(true);
    expect(lamp.lights?.length).toBe(1);
  });

  it('the fountain is a plaza centrepiece: about 48 wide, animated, solid, with four sides', () => {
    const f = streetProps.fountain!;
    expect(f.sprite.w).toBe(48);
    expect(f.anim!.frames.length).toBeGreaterThanOrEqual(2);
    expect(f.footprint).toEqual({ w: 3, h: 2 });
    expect(Object.keys(f.places!).sort()).toEqual(['east', 'north', 'south', 'west']);
  });

  it('fence segments line up with their neighbours', () => {
    const h = streetProps['fence-h']!.sprite;
    // Rails run off both side edges at the same rows, so segments join seamlessly.
    const col = (x: number) => Array.from({ length: h.h }, (_, y) => h.px[y * h.w + x]);
    expect(col(0)).toEqual(col(h.w - 1));
    expect(col(0).some((v) => v !== 0)).toBe(true);
    // The vertical rail reaches exactly one tile up, to the next post's top.
    const v = streetProps['fence-v']!.sprite;
    const top = (s: typeof v) => Math.floor([...s.px].findIndex((p) => p !== 0) / s.w);
    const postTop = top(h) + (v.h - h.h); // post tops sit at the same height in both
    expect(top(v)).toBe(postTop - TILE);
  });
});
