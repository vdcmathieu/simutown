import { describe, expect, it } from 'vitest';
import { sprite, type TerrainDef, type Town } from '../src';
import { fringesFor } from '../src/render/fringe';
import { terrainSprite } from '../src/render/ground';

const tile = (ch: string) => sprite(Array.from({ length: 16 }, () => ch.repeat(16)).join('\n'));

function strip(w: number, ids: string[]): Town {
  return { name: 't', w, h: 1, terrain: ids, props: [], places: {}, solid: new Uint8Array(w) };
}

describe('fringe variants', () => {
  it('picks one sprite per tile from an array, always the same for the same tile', () => {
    const looks = [tile('h'), tile('i'), tile('j')];
    const defs: Record<string, TerrainDef> = {
      // grass sits east or west of paving, so paving tiles receive grass.fringe.e / .w
      grass: { id: 'grass', variants: [tile('h')], priority: 2, fringe: { e: looks, w: looks } },
      cobble: { id: 'cobble', variants: [tile('b')], priority: 1 },
    };
    const ids = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 'grass' : 'cobble'));
    const town = strip(40, ids);
    const seen = new Set<unknown>();
    for (let tx = 1; tx < 39; tx += 2) {
      const first = fringesFor(town, defs, tx, 0).map((f) => f.sprite);
      expect(first.length).toBeGreaterThan(0);
      expect(fringesFor(town, defs, tx, 0).map((f) => f.sprite)).toEqual(first);
      for (const s of first) {
        expect(looks).toContain(s);
        seen.add(s);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('animated terrain variants', () => {
  it('plays one of several animations per tile, out of step with its neighbours', () => {
    const a = [tile('1'), tile('2')];
    const b = [tile('3'), tile('4')];
    const water: TerrainDef = {
      id: 'water',
      variants: [],
      priority: 0,
      anims: [
        { frames: a, fps: 2 },
        { frames: b, fps: 2 },
      ],
    };
    const used = new Set<unknown>();
    for (let tx = 0; tx < 30; tx++) {
      const s0 = terrainSprite(water, tx, 0, 0);
      const s1 = terrainSprite(water, tx, 0, 0.5);
      expect(s0).toBeDefined();
      expect(s1).not.toBe(s0); // the frame advances
      expect(terrainSprite(water, tx, 0, 0)).toBe(s0); // and is deterministic
      used.add(s0);
    }
    expect(used.size).toBeGreaterThan(2); // both animations and both phases appear
  });
});
