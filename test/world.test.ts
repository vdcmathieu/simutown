import { describe, expect, it } from 'vitest';
import { blank } from '../src/core/sprite';
import type { ArtRegistry } from '../src/core/types';
import { blockerAt, createRng, defineTown, describeTown, explainNoPath, findPath, nearest, tileAt, tileCenter, type Tile } from '../src/world';

const sp = blank(16, 16);
const art: ArtRegistry = {
  terrain: {
    grass: { id: 'grass', variants: [sp], priority: 2 },
    cobble: { id: 'cobble', variants: [sp], priority: 1 },
    water: { id: 'water', variants: [sp], priority: 3, solid: true },
  },
  props: {
    lamp: { id: 'lamp', sprite: sp, footprint: { w: 1, h: 1 } },
    house: { id: 'house', sprite: sp, footprint: { w: 3, h: 2 }, places: { door: { dx: 1, dy: 1 }, porch: { dx: 3, dy: 0 } } },
    rug: { id: 'rug', sprite: sp, flat: true },
  },
  characters: {},
  emotes: {},
  font: { height: 8, glyphs: {} },
};

const spec = {
  name: 'Test',
  terrain: `
    gggggggg
    gg~~gggg
    gg~~gggg
    ========
    gggggggg
  `,
  legend: { g: 'grass', '~': 'water', '=': 'cobble' },
  props: [
    { kind: 'house', at: [4, 2] as [number, number], id: 'home' },
    { kind: 'lamp', at: [0, 4] as [number, number] },
    { kind: 'lamp', at: [7, 4] as [number, number] },
    { kind: 'rug', at: [1, 0] as [number, number] },
  ],
  places: { plaza: [3, 3] as [number, number] },
};

const town = defineTown(spec, art);
const solidTiles = (): string[] => {
  const out: string[] = [];
  for (let ty = 0; ty < town.h; ty++) for (let tx = 0; tx < town.w; tx++) if (town.solid[ty * town.w + tx]) out.push(`${tx},${ty}`);
  return out;
};

describe('defineTown', () => {
  it('parses the grid and keeps prop ids', () => {
    expect([town.w, town.h]).toEqual([8, 5]);
    expect(town.terrain[0]).toBe('grass');
    expect(town.terrain[3 * 8]).toBe('cobble');
    expect(town.props.map((p) => p.id)).toEqual(['home', 'lamp-1', 'lamp-2', 'rug']);
  });

  it('derives solid tiles from terrain and footprints growing right and up', () => {
    // water at (2..3, 1..2); house 3x2 from origin (4,2) covers x 4..6, y 1..2; lamps at (0,4), (7,4); rug is flat.
    expect(solidTiles().sort()).toEqual(
      ['2,1', '3,1', '2,2', '3,2', '4,1', '5,1', '6,1', '4,2', '5,2', '6,2', '0,4', '7,4'].sort(),
    );
  });

  it('exposes prop places as <id>.<place>, plus extra places', () => {
    expect(town.places).toEqual({ 'home.door': { tx: 5, ty: 3 }, 'home.porch': { tx: 7, ty: 2 }, plaza: { tx: 3, ty: 3 } });
  });

  it('names a single unnamed prop after its kind', () => {
    const t = defineTown({ ...spec, props: [{ kind: 'house', at: [4, 2] }] }, art);
    expect(t.places['house.door']).toEqual({ tx: 5, ty: 3 });
  });

  it('rejects tiles that are not whole numbers', () => {
    expect(() => defineTown({ ...spec, props: [{ kind: 'lamp', at: [1.5, 1] }] }, art)).toThrow(/Prop "lamp" at \[1.5, 1\] must be on a whole tile/);
    expect(() => defineTown({ ...spec, places: { mid: [1, 0.5] } }, art)).toThrow(/Place "mid" at \[1, 0.5\] \(in places\) must be on a whole tile/);
  });

  it('rejects mistakes with the valid names and a suggestion', () => {
    const bad = (patch: object) => () => defineTown({ ...spec, ...patch }, art);
    expect(bad({ terrain: 'gg\nggg' })).toThrow(/row 1 is 3 tiles wide, expected 2/);
    expect(bad({ terrain: 'gx' })).toThrow(/Unknown terrain character "x".*Valid terrain characters: =, g, ~/);
    expect(bad({ legend: { ...spec.legend, g: 'gras' } })).toThrow(/Unknown terrain id "gras". Did you mean "grass"\? Valid terrain ids: cobble, grass, water/);
    expect(bad({ props: [{ kind: 'lmap', at: [0, 0] }] })).toThrow(/Unknown prop kind "lmap". Did you mean "lamp"\?.*Valid prop kinds: house, lamp, rug/);
    expect(bad({ props: [{ kind: 'lamp', at: [8, 0] }] })).toThrow(/outside the 8x5 map/);
    expect(bad({ props: [{ kind: 'house', at: [6, 2] }] })).toThrow(/reaches \[8, 2\], outside the 8x5 map/);
    expect(bad({ props: [{ kind: 'house', at: [0, 0] }] })).toThrow(/reaches \[0, -1\]/);
    expect(bad({ props: [{ kind: 'lamp', at: [1, 1], id: 'a' }, { kind: 'house', at: [0, 1] }] })).toThrow(/overlaps prop "a" at \[1, 1\]/);
    expect(bad({ props: [{ kind: 'lamp', at: [1, 1], id: 'a' }, { kind: 'lamp', at: [0, 0], id: 'a' }] })).toThrow(/two props are called "a"/);
    expect(bad({ places: { pond: [2, 1] } })).toThrow(/Place "pond" at \[2, 1\] \(in places\) is on a solid tile: water \(solid terrain\)/);
    expect(bad({ places: { p: [5, 2] } })).toThrow(/solid tile: prop home/);
    expect(bad({ places: { 'home.door': [0, 0] } })).toThrow(/defined twice/);
    expect(bad({ props: [{ kind: 'house', at: [4, 2] }, { kind: 'lamp', at: [5, 3] }] })).toThrow(/Place "house.door" at \[5, 3\].*prop lamp/);
  });
});

describe('grid helpers', () => {
  it('maps tiles to feet positions and back', () => {
    expect(tileCenter(2, 3)).toEqual({ x: 40, y: 60 });
    expect(tileAt(40, 60)).toEqual({ tx: 2, ty: 3 });
    expect(tileAt(47, 66)).toEqual({ tx: 2, ty: 3 });
  });

  it('explains what blocks a tile', () => {
    expect(blockerAt(town, 2, 1, art)).toBe('water (solid terrain)');
    expect(blockerAt(town, 6, 1, art)).toBe('prop home');
    expect(blockerAt(town, 9, 0, art)).toBe('outside the map');
    expect(blockerAt(town, 0, 0, art)).toBe('walkable');
  });
});

describe('findPath', () => {
  const len = (p: Tile[] | null) => (p ? p.length - 1 : -1);
  const valid = (p: Tile[]) =>
    p.every((t, i) => i === 0 || Math.abs(t.tx - p[i - 1]!.tx) + Math.abs(t.ty - p[i - 1]!.ty) === 1) &&
    p.every((t) => !town.solid[t.ty * town.w + t.tx]);

  it('finds a shortest 4-connected path around obstacles', () => {
    const p = findPath(town, { tx: 1, ty: 1 }, { tx: 7, ty: 1 })!;
    expect(p[0]).toEqual({ tx: 1, ty: 1 });
    expect(p[p.length - 1]).toEqual({ tx: 7, ty: 1 });
    expect(valid(p)).toBe(true);
    // Over the top row: 1,1 -> 1,0 -> 7,0 -> 7,1 is 8 steps.
    expect(len(p)).toBe(8);
  });

  it('prefers the straightest of equally short paths', () => {
    const p = findPath(town, { tx: 0, ty: 3 }, { tx: 7, ty: 3 })!;
    expect(p.every((t) => t.ty === 3)).toBe(true);
    const q = findPath(town, { tx: 0, ty: 0 }, { tx: 1, ty: 4 })!;
    const turns = q.filter((t, i) => i > 0 && i < q.length - 1 && (q[i - 1]!.tx === t.tx) !== (q[i + 1]!.tx === t.tx)).length;
    expect(turns).toBe(1);
  });

  it('is deterministic', () => {
    const a = JSON.stringify(findPath(town, { tx: 0, ty: 0 }, { tx: 6, ty: 4 }));
    for (let i = 0; i < 5; i++) expect(JSON.stringify(findPath(town, { tx: 0, ty: 0 }, { tx: 6, ty: 4 }))).toBe(a);
  });

  it('returns a single tile for a path to itself, null for solid or unreachable ends', () => {
    expect(findPath(town, { tx: 0, ty: 0 }, { tx: 0, ty: 0 })).toEqual([{ tx: 0, ty: 0 }]);
    expect(findPath(town, { tx: 0, ty: 0 }, { tx: 2, ty: 1 })).toBeNull();
    expect(findPath(town, { tx: 0, ty: 0 }, { tx: 20, ty: 1 })).toBeNull();
    const walled = defineTown({ name: 'W', terrain: 'g~g\ng~g', legend: { g: 'grass', '~': 'water' } }, art);
    expect(findPath(walled, { tx: 0, ty: 0 }, { tx: 2, ty: 1 })).toBeNull();
  });

  it('matches breadth-first distances on every pair of a town', () => {
    const tiles: Tile[] = [];
    for (let ty = 0; ty < town.h; ty++) for (let tx = 0; tx < town.w; tx++) if (!town.solid[ty * town.w + tx]) tiles.push({ tx, ty });
    const bfs = (from: Tile): Map<string, number> => {
      const d = new Map([[`${from.tx},${from.ty}`, 0]]);
      const q = [from];
      while (q.length) {
        const c = q.shift()!;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const n = { tx: c.tx + dx, ty: c.ty + dy };
          const k = `${n.tx},${n.ty}`;
          if (n.tx < 0 || n.ty < 0 || n.tx >= town.w || n.ty >= town.h || town.solid[n.ty * town.w + n.tx] || d.has(k)) continue;
          d.set(k, d.get(`${c.tx},${c.ty}`)! + 1);
          q.push(n);
        }
      }
      return d;
    };
    for (const a of tiles) {
      const d = bfs(a);
      for (const b of tiles) {
        const p = findPath(town, a, b);
        expect(len(p)).toBe(d.get(`${b.tx},${b.ty}`) ?? -1);
        if (p) expect(valid(p)).toBe(true);
      }
    }
  });

  it('explains which tiles block an unreachable target', () => {
    const walled = defineTown({ name: 'W', terrain: 'ggggg\ng~~~g\ng~g~g\ng~~~g', legend: { g: 'grass', '~': 'water' } }, art);
    const msg = explainNoPath(walled, { tx: 0, ty: 0 }, { tx: 2, ty: 2 }, art);
    expect(msg).toMatch(/The target \[2, 2\] is in an enclosed area of 1 tile\(s\), walled in by: .*\[2, 1\] water \(solid terrain\)/);
    expect(explainNoPath(walled, { tx: 0, ty: 0 }, { tx: 1, ty: 1 }, art)).toBe('The target [1, 1] is not walkable: water (solid terrain).');
  });
});

describe('describeTown', () => {
  it('draws a numbered map with a legend, props and every place', () => {
    const text = describeTown(town, art);
    expect(text).toContain('Test: 8 x 5 tiles.');
    expect(text).toContain('  01234567');
    expect(text).toContain('0 gggggggg');
    expect(text).toContain('1 ggww###g');
    expect(text).toContain('2 ggww###2');
    expect(text).toContain('3 ccc3c1cc');
    expect(text).toContain('4 #gggggg#');
    expect(text).toContain('w water (solid)');
    expect(text).toContain('home (house) at [4, 2], footprint 3x2 tiles');
    expect(text).toContain('Scenery, 3 more props (solid ones show as # on the map): 2 lamp, rug.');
    expect(text).toContain('1 home.door [5, 3]');
    expect(text).toContain('3 plaza [3, 3]');
  });
});

describe('createRng', () => {
  it('repeats for the same seed and differs between seeds', () => {
    const a = createRng(42);
    const b = createRng(42);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    expect(createRng('x').next()).toBe(createRng('x').next());
    expect(createRng(43).next()).not.toBe(xs[0]);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    const r = createRng(7);
    for (let i = 0; i < 100; i++) {
      const n = r.int(3);
      expect(Number.isInteger(n) && n >= 0 && n < 3).toBe(true);
    }
  });
});

describe('nearest', () => {
  it('suggests close names only', () => {
    expect(nearest('cafe.dor', ['cafe.door', 'plaza'])).toBe('cafe.door');
    expect(nearest('xyzzy', ['cafe.door', 'plaza'])).toBeUndefined();
  });
});

describe('prop ids (regression)', () => {
  it('never generates an id that a prop or a lone kind already uses', async () => {
    const { defineTown } = await import('../src/world');
    const { art: builtin } = await import('../src/art');
    const lamp = builtin.props.lamp!;
    const art = { ...builtin, props: { lamp, 'lamp-2': { ...lamp, id: 'lamp-2' } } };
    const town = defineTown(
      {
        name: 'ids',
        terrain: 'gggggggg\ngggggggg',
        legend: { g: 'grass' },
        props: [
          { kind: 'lamp', at: [0, 1] },
          { kind: 'lamp', at: [2, 1] },
          { kind: 'lamp-2', at: [4, 1] },
          { kind: 'lamp', at: [6, 1], id: 'lamp-1' },
        ],
      },
      art,
    );
    const ids = town.props.map((p) => p.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).toEqual(['lamp-3', 'lamp-4', 'lamp-2', 'lamp-1']);
  });
});
