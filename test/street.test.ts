import { describe, expect, it } from 'vitest';
import { streetProps } from '../src/art';
import { slotIndex } from '../src/core/palette';
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

  it('standing props have a closed ink outline inside their box', () => {
    const INK = slotIndex('steel.0');
    for (const [id, def] of Object.entries(streetProps)) {
      if (id.startsWith('fence')) continue; // fence rails must run off the box to join
      for (const s of [def.sprite, ...(def.anim?.frames ?? [])]) {
        const at = (x: number, y: number) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? -1 : s.px[y * s.w + x]!);
        for (let y = 0; y < s.h; y++) {
          for (let x = 0; x < s.w; x++) {
            const v = at(x, y);
            if (v === 0 || v === INK) continue;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
              expect(at(x + dx, y + dy), `${id}: colour at ${x},${y} touches nothing`).not.toBe(0);
              expect(at(x + dx, y + dy), `${id}: colour at ${x},${y} on the box edge`).not.toBe(-1);
            }
          }
        }
      }
    }
  });

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
    // Posts sit at the same height in both, and the vertical rail reaches up to just under
    // the base line of the post one tile above, without covering its ink.
    const v = streetProps['fence-v']!.sprite;
    const top = (s: typeof v) => Math.floor([...s.px].findIndex((p) => p !== 0) / s.w);
    const bottom = (s: typeof v) => Math.floor([...s.px].findLastIndex((p) => p !== 0) / s.w);
    expect(bottom(v) - v.h).toBe(bottom(h) - h.h);
    expect(top(v)).toBe(bottom(v) - TILE + 1);
    // Runs end on a post: the end pieces have rails on one side only, and the top of a
    // vertical run has no rail going up.
    const hasInk = (s: typeof v, x: number) => Array.from({ length: s.h }, (_, y) => s.px[y * s.w + x]).some((p) => p !== 0);
    expect(hasInk(streetProps['fence-h-left']!.sprite, 0)).toBe(false);
    expect(hasInk(streetProps['fence-h-left']!.sprite, 15)).toBe(true);
    expect(hasInk(streetProps['fence-h-right']!.sprite, 15)).toBe(false);
    expect(top(streetProps['fence-v-top']!.sprite)).toBeGreaterThan(top(v));
  });
});
