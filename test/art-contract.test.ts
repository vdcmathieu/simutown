/**
 * Structural checks on every built-in asset. Art agents: keep this green, do not edit it
 * to make a sprite pass.
 */
import { describe, expect, it } from 'vitest';
import { art, CHAR_H, CHAR_W, type Dir, type Sprite, TILE } from '../src';

const dirs: Dir[] = ['down', 'up', 'left', 'right'];
const size = (s: Sprite) => `${s.w}x${s.h}`;

describe('terrain', () => {
  for (const [key, def] of Object.entries(art.terrain)) {
    it(`${key} is well formed`, () => {
      expect(def.id).toBe(key);
      const looks = [...def.variants, ...(def.anim?.frames ?? []), ...Object.values(def.fringe ?? {})];
      expect(def.variants.length + (def.anim?.frames.length ?? 0)).toBeGreaterThan(0);
      for (const s of looks) {
        expect(size(s)).toBe(`${TILE}x${TILE}`);
        expect([s.ax, s.ay]).toEqual([0, 0]);
      }
    });
  }
});

describe('props', () => {
  for (const [key, def] of Object.entries(art.props)) {
    it(`${key} is well formed`, () => {
      expect(def.id).toBe(key);
      const anchor = [def.sprite.ax, def.sprite.ay];
      for (const s of [def.emissive, ...(def.anim?.frames ?? [])]) {
        if (!s) continue;
        expect(size(s)).toBe(size(def.sprite));
        expect([s.ax, s.ay]).toEqual(anchor);
      }
      if (def.footprint) {
        expect(def.footprint.w).toBeGreaterThan(0);
        expect(def.footprint.h).toBeGreaterThan(0);
      }
    });
  }
});

describe('characters', () => {
  for (const [key, def] of Object.entries(art.characters)) {
    it(`${key} is well formed`, () => {
      expect(def.id).toBe(key);
      for (const set of [def.idle, def.walk, ...Object.values(def.poses ?? {})]) {
        for (const dir of dirs) {
          expect(set[dir].length).toBeGreaterThan(0);
          for (const s of set[dir]) {
            expect(size(s)).toBe(`${CHAR_W}x${CHAR_H}`);
            expect([s.ax, s.ay]).toEqual([8, 24]);
          }
        }
      }
    });
  }
});

describe('fixtures', () => {
  it('the ids the tiny fixture relies on exist', () => {
    expect(art.terrain.grass).toBeDefined();
    expect(art.terrain.cobble).toBeDefined();
    expect(art.props.lamp).toBeDefined();
    expect(art.characters.ana).toBeDefined();
  });
});
