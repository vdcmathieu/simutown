/** The ground pass: fringe selection, hashed variants, animated terrain and props. */
import { describe, expect, it } from 'vitest';
import type { Sprite } from '../src/core/sprite';
import { Surface } from '../src/core/surface';
import type { ArtRegistry, FringeSide, TerrainDef } from '../src/core/types';
import { createRenderer } from '../src/render';
import { fringesFor } from '../src/render/fringe';
import { frameAt, terrainSprite } from '../src/render/ground';
import { hash2 } from '../src/render/hash';
import { block, colorOf, frameState, kitArt, kitTown, pixel } from '../tools/render-testkit';

const SIDES: FringeSide[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];

/** A full set of fringe sprites; `n` is a strip along the bottom of the tile it is drawn on. */
function fringeSet(): Record<FringeSide, Sprite> {
  const set = Object.fromEntries(SIDES.map((s) => [s, block('moss.3', 16, 4, [0, 0])])) as Record<FringeSide, Sprite>;
  set.n = block('moss.3', 16, 4, [0, -12]);
  return set;
}

const defs: Record<string, TerrainDef> = {
  stone: { id: 'stone', variants: [block('steel.3')], priority: 1 },
  sand: { id: 'sand', variants: [block('cream.0')], priority: 2, fringe: fringeSet() },
  grass: { id: 'grass', variants: [block('moss.1')], priority: 3, fringe: fringeSet() },
  moss: { id: 'moss', variants: [block('moss.0')], priority: 3, fringe: fringeSet() },
};

const sides = (town: ReturnType<typeof kitTown>, tx: number, ty: number): string[] =>
  fringesFor(town, defs, tx, ty).map((f) => `${f.terrain}.${f.side}`);

describe('fringe selection', () => {
  const island = kitTown(3, 3, 'stone', { '1,1': 'grass' });

  it('draws each side on the neighbour that lies in that direction', () => {
    expect(sides(island, 1, 0)).toEqual(['grass.n']);
    expect(sides(island, 2, 1)).toEqual(['grass.e']);
    expect(sides(island, 1, 2)).toEqual(['grass.s']);
    expect(sides(island, 0, 1)).toEqual(['grass.w']);
  });

  it('uses corner sprites where the terrain touches only diagonally', () => {
    expect(sides(island, 2, 0)).toEqual(['grass.ne']);
    expect(sides(island, 0, 0)).toEqual(['grass.nw']);
    expect(sides(island, 2, 2)).toEqual(['grass.se']);
    expect(sides(island, 0, 2)).toEqual(['grass.sw']);
  });

  it('returns the very sprites of the terrain definition', () => {
    expect(fringesFor(island, defs, 1, 0)[0]!.sprite).toBe(defs.grass!.fringe!.n);
  });

  it('drops a corner when an adjacent edge already brings the terrain in', () => {
    const bar = kitTown(3, 3, 'stone', { '1,1': 'grass', '2,1': 'grass' });
    expect(sides(bar, 2, 0)).toEqual(['grass.n']);
    expect(sides(bar, 0, 0)).toEqual(['grass.nw']);
  });

  it('stacks two edges in an inner corner', () => {
    const ell = kitTown(3, 3, 'stone', { '0,1': 'grass', '1,2': 'grass' });
    expect(sides(ell, 1, 1)).toEqual(['grass.n', 'grass.e']);
  });

  it('only creeps from higher priority onto lower, never between equals or onto itself', () => {
    expect(sides(island, 1, 1)).toEqual([]);
    const pair = kitTown(2, 1, 'grass', { '1,0': 'moss' });
    expect(sides(pair, 0, 0)).toEqual([]);
    expect(sides(pair, 1, 0)).toEqual([]);
  });

  it('orders fringes so the highest priority is drawn last', () => {
    const mix = kitTown(3, 3, 'stone', { '0,1': 'grass', '1,2': 'sand' });
    expect(sides(mix, 1, 1)).toEqual(['sand.n', 'grass.e']);
    const flipped = kitTown(3, 3, 'stone', { '0,1': 'sand', '1,2': 'grass' });
    expect(sides(flipped, 1, 1)).toEqual(['sand.e', 'grass.n']);
  });

  it('ignores the map edge and unknown terrain', () => {
    expect(sides(kitTown(1, 1, 'stone'), 0, 0)).toEqual([]);
    const odd = kitTown(2, 1, 'lava', { '1,0': 'grass' });
    expect(sides(odd, 0, 0)).toEqual([]);
    expect(sides(odd, 5, 5)).toEqual([]);
  });

  it('shows up in the rendered ground', () => {
    const town = kitTown(6, 4, 'stone', { '2,2': 'grass' });
    const out = new Surface(96, 64);
    createRenderer(town, { art: { ...kitArt(), terrain: defs }, lighting: false }).render(frameState(48, 32), out);
    expect(pixel(out, 40, 17)).toEqual(colorOf('steel.3')); // top of the tile north of the grass
    expect(pixel(out, 40, 30)).toEqual(colorOf('moss.3')); // its south edge carries the `n` fringe
    expect(pixel(out, 40, 40)).toEqual(colorOf('moss.1')); // the grass itself
    expect(pixel(out, 56, 17)).toEqual(colorOf('moss.3')); // the `ne` corner tile
  });
});

describe('terrain variants and animation', () => {
  const looks = [block('moss.0'), block('moss.1'), block('moss.2')];
  const field: TerrainDef = { id: 'field', variants: looks, priority: 1 };

  it('picks a variant from a hash of the tile position', () => {
    expect(terrainSprite(field, 3, 4, 0)).toBe(looks[hash2(3, 4) % 3]);
    expect(terrainSprite(field, 3, 4, 99)).toBe(terrainSprite(field, 3, 4, 0));
    const used = new Set<Sprite>();
    for (let ty = 0; ty < 8; ty++) for (let tx = 0; tx < 8; tx++) used.add(terrainSprite(field, tx, ty, 0)!);
    expect(used.size).toBe(3);
  });

  it('plays terrain animation from scene time and prefers it over variants', () => {
    const frames = [block('steel.2'), block('steel.4')];
    const water: TerrainDef = { id: 'water', variants: looks, anim: { frames, fps: 2 }, priority: 0 };
    expect(terrainSprite(water, 0, 0, 0)).toBe(frames[0]);
    expect(terrainSprite(water, 0, 0, 0.6)).toBe(frames[1]);
    expect(terrainSprite(water, 0, 0, 1.1)).toBe(frames[0]);
    expect(frameAt(4, 8, -0.01)).toBe(3);
    expect(frameAt(4, 8, Number.NaN)).toBe(0);
  });

  it('redraws animated tiles each frame, with the fringes that sit on them', () => {
    const frames = [block('steel.2'), block('steel.4')];
    const art: ArtRegistry = {
      ...kitArt(),
      terrain: { ...defs, water: { id: 'water', variants: [], anim: { frames, fps: 2 }, priority: 0 } },
    };
    const town = kitTown(6, 4, 'water', { '2,2': 'grass' });
    const renderer = createRenderer(town, { art, lighting: false });
    const out = new Surface(96, 64);
    renderer.render(frameState(48, 32, { t: 0 }), out);
    expect(pixel(out, 8, 8)).toEqual(colorOf('steel.2'));
    renderer.render(frameState(48, 32, { t: 0.5 }), out);
    expect(pixel(out, 8, 8)).toEqual(colorOf('steel.4'));
    expect(pixel(out, 40, 30)).toEqual(colorOf('moss.3')); // the fringe survived the redraw
    expect(pixel(out, 40, 17)).toEqual(colorOf('steel.4'));
  });

  it('plays prop animation from scene time', () => {
    const art = kitArt();
    art.props.flag = { id: 'flag', sprite: block('plum.0', 16, 16, [0, 16]), anim: { frames: [block('plum.0', 16, 16, [0, 16]), block('plum.1', 16, 16, [0, 16])], fps: 4 } };
    const renderer = createRenderer(kitTown(6, 4, 'stone', {}, [{ kind: 'flag', tx: 1, ty: 1 }]), { art, lighting: false });
    const out = new Surface(96, 64);
    renderer.render(frameState(48, 32, { t: 0 }), out);
    expect(pixel(out, 20, 20)).toEqual(colorOf('plum.0'));
    renderer.render(frameState(48, 32, { t: 0.3 }), out);
    expect(pixel(out, 20, 20)).toEqual(colorOf('plum.1'));
  });
});
