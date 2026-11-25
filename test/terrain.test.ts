/**
 * The ground rules of docs/STYLE.md that can be checked by machine. Whether a field stays
 * calm is checked by eye: `pnpm tsx tools/terrain-preview.ts fields`.
 */
import { describe, expect, it } from 'vitest';
import { terrain } from '../src/art';
import { slotIndex } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import type { FringeSide, TerrainDef } from '../src/core/types';
import { createRenderer } from '../src/render';
import { fringesFor } from '../src/render/fringe';
import { Surface } from '../src/core/surface';
import { defineTown } from '../src/world';

const INK = slotIndex('steel.0');
const looks = (def: TerrainDef): Sprite[] => [
  ...def.variants,
  ...(def.anims ?? []).flatMap((a) => a.frames),
  ...Object.values(def.fringe ?? {}).flat(),
];

describe('the library', () => {
  it('has the ground a town needs, in the documented order', () => {
    const order = Object.values(terrain)
      .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : 1))
      .map((d) => d.id);
    expect(order).toEqual(['dirt', 'cobble', 'road', 'soil', 'grass', 'meadow', 'tall-grass', 'basin', 'water', 'sand', 'plank', 'plank-v']);
  });

  it('only water blocks walking', () => {
    const solid = Object.values(terrain).filter((d) => d.solid).map((d) => d.id);
    expect(solid.sort()).toEqual(['basin', 'water']);
  });
});

for (const def of Object.values(terrain)) {
  describe(def.id, () => {
    it('has at least three looks, so a field shows no grid', () => {
      expect(new Set(def.variants).size).toBeGreaterThanOrEqual(3);
    });

    it('uses no ink', () => {
      for (const s of looks(def)) expect([...s.px]).not.toContain(INK);
    });

    it('is opaque: a tile never shows what is under it', () => {
      for (const s of [...def.variants, ...(def.anims ?? []).flatMap((a) => a.frames)]) expect([...s.px]).not.toContain(0);
    });

    if (def.fringe) {
      it('brings an edge for every side and every outer corner', () => {
        const sides: FringeSide[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
        for (const side of sides) expect([def.fringe![side]].flat().filter(Boolean).length, side).toBeGreaterThan(0);
      });
    }
  });
}

describe('grass', () => {
  it('is sparse: eight looks, one of them plain, no more than two marks on any', () => {
    const base = slotIndex('moss.2');
    const marks = terrain.grass!.variants.map((s) => [...s.px].filter((v) => v !== base).length);
    expect(marks.length).toBe(8);
    expect(marks.filter((n) => n === 0).length).toBe(1);
    // a tuft is 3 pixels and a blade 2
    expect(Math.max(...marks)).toBeLessThanOrEqual(5);
  });

  it('shares its base colour with the meadow, so the two meet without an edge', () => {
    const town = defineTown({ name: 't', terrain: 'gm\nmg', legend: { g: 'grass', m: 'meadow' } });
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) expect(fringesFor(town, terrain, tx, ty)).toEqual([]);
  });
});

describe('edges', () => {
  /** The terrain ids whose fringe lands on tile [0, 0] of a two-tile strip `a b`. */
  const creeping = (a: string, b: string): string[] => {
    const town = defineTown({ name: 't', terrain: 'ab', legend: { a, b } });
    return [...new Set(fringesFor(town, terrain, 0, 0).map((f) => f.terrain))];
  };

  it('grass creeps over paths, paving and beds', () => {
    for (const low of ['dirt', 'cobble', 'road', 'soil']) expect(creeping(low, 'grass')).toEqual(['grass']);
  });

  it('water cuts its bank into the lawn, and sand drifts into the water', () => {
    expect(creeping('grass', 'water')).toEqual(['water']);
    expect(creeping('tall-grass', 'water')).toEqual(['water']);
    expect(creeping('water', 'sand')).toEqual(['sand']);
    expect(creeping('grass', 'sand')).toEqual(['sand']);
  });

  it('a deck lies over everything and the two plank directions join without an edge', () => {
    for (const low of ['dirt', 'cobble', 'road', 'grass', 'water', 'sand']) expect(creeping(low, 'plank')).toEqual(['plank']);
    expect(creeping('plank', 'plank-v')).toEqual([]);
    expect(creeping('plank-v', 'plank')).toEqual([]);
  });
});

describe('in a town', () => {
  it('renders every terrain next to its neighbours without a warning', () => {
    const town = defineTown({
      name: 'sampler',
      terrain: `
        ggggggggggggg
        g==rrddssmmtg
        g==rrggssmmtg
        ggggggggggggg
        g~~~PPPP~~aag
        g~~~gggg~~aag
        ggggggggggggg
      `,
      legend: { g: 'grass', '=': 'cobble', r: 'road', d: 'dirt', s: 'soil', m: 'meadow', t: 'tall-grass', '~': 'water', a: 'sand', P: 'plank-v' },
    });
    const warnings: string[] = [];
    const out = new Surface(town.w * 16, town.h * 16);
    createRenderer(town, { lighting: false, warn: (m) => warnings.push(m) }).render(
      { t: 0, camera: { x: out.w / 2, y: out.h / 2, zoom: 1 }, timeOfDay: 12, actors: [], bubbles: [] },
      out,
    );
    expect(warnings).toEqual([]);
    // every pixel of the frame was painted
    for (let i = 3; i < out.data.length; i += 4) expect(out.data[i]).toBe(255);
  });
});
