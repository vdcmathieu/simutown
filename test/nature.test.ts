/**
 * The rules of docs/STYLE.md that can be checked by machine, applied to every nature prop.
 * Whether a tree looks like a tree is checked by eye: `pnpm tsx tools/terrain-preview.ts`.
 */
import { describe, expect, it } from 'vitest';
import { natureProps } from '../src/art';
import { slotIndex } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { TILE } from '../src/core/types';
import { defineTown } from '../src/world';

const INK = slotIndex('steel.0');
const GRASS = slotIndex('moss.2');
const PAVING = slotIndex('cream.1');

type Side = 'top' | 'left' | 'right';

/** Hedge pieces join their neighbours across these sides, so the outline is open there. */
const OPEN: Record<string, Side[]> = {
  'hedge-h': ['left', 'right'],
  'hedge-h-l': ['right'],
  'hedge-h-r': ['left'],
  'hedge-v': ['top'],
  'hedge-sw': ['top', 'right'],
  'hedge-se': ['top', 'left'],
};

const standing = Object.values(natureProps).filter((d) => !d.flat);
const flat = Object.values(natureProps).filter((d) => d.flat);
const frames = (id: string): Sprite[] => {
  const def = natureProps[id]!;
  return [def.sprite, ...(def.anim?.frames ?? [])];
};

/** Coloured pixels that touch an empty pixel or a closed side of the box. */
function leaks(s: Sprite, open: Side[]): string[] {
  const at = (x: number, y: number): number | undefined => (x < 0 || y < 0 || x >= s.w || y >= s.h ? undefined : s.px[y * s.w + x]);
  const out: string[] = [];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = at(x, y)!;
      if (v === 0 || v === INK) continue;
      const around: [number | undefined, Side | 'bottom'][] = [
        [at(x, y - 1), 'top'],
        [at(x - 1, y), 'left'],
        [at(x + 1, y), 'right'],
        [at(x, y + 1), 'bottom'],
      ];
      for (const [n, side] of around) {
        const joined = n === undefined && side !== 'bottom' && open.includes(side);
        if (n === 0 || (n === undefined && !joined)) out.push(`[${x}, ${y}] ${side}`);
      }
    }
  }
  return out;
}

/** The share of a sprite's coloured pixels that use one palette index. */
function share(s: Sprite, index: number): number {
  let all = 0;
  let hit = 0;
  for (const v of s.px) {
    if (v === 0 || v === INK) continue;
    all++;
    if (v === index) hit++;
  }
  return all === 0 ? 0 : hit / all;
}

/** True when the sprite holds a 3 x 3 block of one palette index. */
function hasBlock(s: Sprite, index: number): boolean {
  for (let y = 0; y + 2 < s.h; y++) {
    for (let x = 0; x + 2 < s.w; x++) {
      let full = true;
      for (let j = 0; j < 3 && full; j++) for (let i = 0; i < 3; i++) if (s.px[(y + j) * s.w + x + i] !== index) full = false;
      if (full) return true;
    }
  }
  return false;
}

describe('the library', () => {
  it('keeps the ids towns already use, and has what a town needs', () => {
    for (const id of [
      'tree', 'flowers', 'flowers-white', 'flowers-yellow', 'flowers-pink', 'lily', 'stepping-stones',
      'willow', 'oak', 'pine', 'fruit-tree', 'sapling', 'bush', 'bush-large', 'hedge', 'hedge-h', 'hedge-v',
      'reeds', 'rock', 'rock-large', 'stump', 'log', 'mushrooms', 'grass-tuft',
    ]) {
      expect(natureProps[id], id).toBeDefined();
    }
  });

  it('never ends an id in a number: defineTown names repeats "<kind>-1", "<kind>-2"', () => {
    for (const id of Object.keys(natureProps)) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});

describe('standing props', () => {
  for (const def of standing) {
    it(`${def.id} has a closed ink outline`, () => {
      for (const s of frames(def.id)) expect(leaks(s, OPEN[def.id] ?? [])).toEqual([]);
    });

    it(`${def.id} does not wear the ground colours`, () => {
      for (const s of frames(def.id)) {
        expect(share(s, GRASS)).toBeLessThan(0.2);
        expect(share(s, PAVING)).toBe(0);
        // the lit rim is at most 2 pixels deep
        expect(hasBlock(s, GRASS)).toBe(false);
      }
    });

    it(`${def.id} stands on its footprint`, () => {
      const s = def.sprite;
      expect(def.footprint).toBeDefined();
      expect(s.ay).toBe(s.h);
      // the footprint lies under the sprite, starting at the origin tile
      expect(s.ax).toBeGreaterThanOrEqual(0);
      expect(s.w - s.ax).toBeGreaterThanOrEqual((def.footprint!.w - 1) * TILE + 1);
    });
  }
});

describe('flat props', () => {
  for (const def of flat) {
    it(`${def.id} is one tile of ground: no ink, no footprint`, () => {
      const s = def.sprite;
      expect([s.w, s.h, s.ax, s.ay]).toEqual([TILE, TILE, 0, TILE]);
      expect(def.footprint).toBeUndefined();
      expect([...s.px]).not.toContain(INK);
    });
  }
});

describe('animation', () => {
  it('the willow sways between two frames that share its silhouette at the crown', () => {
    const willow = natureProps.willow!;
    expect(willow.anim?.frames.length).toBe(2);
    expect(willow.anim!.fps).toBeLessThanOrEqual(1);
    const [a, b] = willow.anim!.frames as [Sprite, Sprite];
    expect(a).toBe(willow.sprite);
    const half = (s: Sprite): number[] => [...s.px.subarray(0, s.w * 30)];
    expect(half(b)).toEqual(half(a));
    expect([...b.px]).not.toEqual([...a.px]);
  });
});

describe('in a town', () => {
  it('a hedged garden with a gate is built from the hedge pieces', () => {
    const town = defineTown({
      name: 'garden',
      terrain: `
        ggggggg
        ggggggg
        ggsssgg
        ggggggg
        ggggggg
      `,
      legend: { g: 'grass', s: 'soil' },
      props: [
        { kind: 'hedge-h-l', at: [1, 1] },
        { kind: 'hedge-h', at: [2, 1] },
        { kind: 'hedge-h-r', at: [3, 1] },
        { kind: 'hedge-h-l', at: [5, 1] },
        { kind: 'hedge-v', at: [1, 2] },
        { kind: 'hedge-sw', at: [1, 3] },
        { kind: 'hedge-h', at: [2, 3] },
        { kind: 'hedge-h', at: [3, 3] },
        { kind: 'hedge-h', at: [4, 3] },
        { kind: 'hedge-se', at: [5, 3] },
        { kind: 'hedge-v', at: [5, 2] },
        { kind: 'tulips', at: [2, 2] },
      ],
    });
    const solid = (tx: number, ty: number): boolean => town.solid[ty * town.w + tx] === 1;
    expect(solid(1, 1) && solid(3, 1) && solid(1, 2) && solid(5, 3)).toBe(true);
    // the gate, the bed and the flowers on it stay walkable
    expect(solid(4, 1) || solid(2, 2) || solid(3, 2)).toBe(false);
  });
});
