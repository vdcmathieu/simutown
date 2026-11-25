/**
 * The building kit: `makeBuilding` yields complete, well-formed PropDefs across a range of
 * specs, rejects bad specs with errors that say what is valid, and the presets are all there.
 */
import { describe, expect, it } from 'vitest';
import { art } from '../src/art';
import {
  type BuildingSpec,
  buildings,
  DOOR_STYLES,
  makeBuilding,
  PAINTS,
  presetSpecs,
  ROOF_COLORS,
  ROOF_FORMS,
  SIGN_ICONS,
  WALL_KINDS,
} from '../src/art/buildings';
import { slotIndex } from '../src/core/palette';
import { type PropDef, TILE } from '../src/core/types';
import { defineTown, findPath } from '../src/world';

const INK = slotIndex('steel.0');
const GLOW = new Set([slotIndex('ochre.1'), slotIndex('ochre.2'), slotIndex('ochre.3')]);

const fnv = (a: Uint8Array): string => {
  let h = 0x811c9dc5;
  for (const v of a) {
    h ^= v;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
};

/** Everything a renderer and a town rely on, checked on one building. */
function expectWellFormed(def: PropDef, spec: BuildingSpec): void {
  const s = def.sprite;
  const e = def.emissive!;
  expect(def.id).toBe(spec.id);
  expect(s.w).toBe(spec.width * TILE);
  expect(s.ax).toBe(0);
  // the anchor is the ground line; only a door step may hang below it
  expect(s.h - s.ay).toBe(spec.door.step ? 3 : 0);
  expect([e.w, e.h, e.ax, e.ay]).toEqual([s.w, s.h, s.ax, s.ay]);

  // nothing in town is taller than two storeys and a roof, the hall's turret excepted: 144 pixels
  expect(s.ay).toBeLessThanOrEqual(144);

  // a closed ink outline: no coloured pixel touches an empty pixel or the edge of the box
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = s.px[y * s.w + x]!;
      if (v === 0 || v === INK) continue;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as const) {
        const outside = nx < 0 || ny < 0 || nx >= s.w || ny >= s.h;
        if (outside || s.px[ny * s.w + nx] === 0) throw new Error(`${def.id}: open outline at (${x}, ${y})`);
      }
    }
  }

  // the emissive layer repaints glass only, in lamplight
  let glowing = 0;
  for (let i = 0; i < e.px.length; i++) {
    if (e.px[i] === 0) continue;
    glowing++;
    expect(GLOW.has(e.px[i]!)).toBe(true);
    expect(s.px[i]).not.toBe(0);
  }

  // footprint: as wide as the sprite, one to three tiles deep
  expect(def.footprint!.w).toBe(spec.width);
  expect(def.footprint!.h).toBeGreaterThanOrEqual(1);
  expect(def.footprint!.h).toBeLessThanOrEqual(3);

  // the door place is the tile in front of the door
  const door = def.places!.door!;
  expect(door.dy).toBe(1);
  expect(Number.isInteger(door.dx)).toBe(true);
  expect(door.dx).toBeGreaterThanOrEqual(1);
  expect(door.dx).toBeLessThan(spec.width - 1);

  // lights sit on the facade or the roof, and each one has glass under it
  for (const l of def.lights ?? []) {
    const x = l.dx;
    const y = s.ay + l.dy;
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(s.w);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(s.ay);
    // the light sits on glass: on a pane, or on the bar between two panes
    const near = [-2, -1, 0, 1, 2].flatMap((dy) => [-2, -1, 0, 1, 2].map((dx) => e.px[(y + dy) * e.w + x + dx]));
    expect(near.some((v) => v !== 0 && v !== undefined)).toBe(true);
    // anything above the ground storey glows without pooling on the street
    if (l.dy < -34) expect(l.ground).toBe(false);
  }
  if (glowing > 0) expect(def.lights!.length).toBeGreaterThan(0);

  expect(def.castHeight).toBeGreaterThan(0);
  expect(def.castHeight!).toBeLessThanOrEqual(s.ay);
}

describe('presets', () => {
  it('registers every building the towns need', () => {
    const ids = ['house', 'townhouse', 'house-brick', 'cottage-blue', 'farmhouse', 'shed', 'cafe', 'bakery', 'library', 'school', 'shop', 'townhall', 'post-office'];
    for (const id of ids) expect(buildings[id], id).toBeDefined();
    expect(Object.keys(buildings).sort()).toEqual(presetSpecs.map((s) => s.id).sort());
    for (const id of ids) expect(art.props[id]).toBe(buildings[id]);
  });

  for (const spec of presetSpecs) {
    it(`${spec.id} is a complete PropDef`, () => {
      expectWellFormed(buildings[spec.id]!, spec);
    });
  }

  it('keeps the approved cottage pixel for pixel', () => {
    expect([buildings.house!.sprite.w, buildings.house!.sprite.h]).toEqual([80, 81]);
    expect(fnv(buildings.house!.sprite.px)).toBe('b7f4526b');
    expect(fnv(buildings.house!.emissive!.px)).toBe('1621226f');
    expect(buildings.house!.footprint).toEqual({ w: 5, h: 3 });
    expect(buildings.house!.places).toEqual({ door: { dx: 2, dy: 1 } });
  });

  it('keeps the townhouse at its size and footprint', () => {
    expect([buildings.townhouse!.sprite.w, buildings.townhouse!.sprite.h]).toEqual([64, 101]);
    expect(buildings.townhouse!.footprint).toEqual({ w: 4, h: 3 });
    expect(buildings.townhouse!.places).toEqual({ door: { dx: 1, dy: 1 } });
  });

  it('no two presets share a silhouette', () => {
    const shapes = Object.values(buildings).map((d) => fnv(d.sprite.px.map((v) => (v === 0 ? 0 : 1))));
    expect(new Set(shapes).size).toBe(shapes.length);
  });

  it('only the hall carries a clock turret, and it is the tallest thing in town', () => {
    const heights = Object.entries(buildings).map(([id, d]) => [id, d.sprite.ay] as const);
    const tallest = heights.reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(tallest[0]).toBe('townhall');
    expect(presetSpecs.filter((s) => s.turret === 'clock').map((s) => s.id)).toEqual(['townhall']);
  });
});

describe('makeBuilding', () => {
  it('builds valid PropDefs across widths, storeys, walls, roofs and doors', () => {
    let n = 0;
    for (let width = 3; width <= 10; width++) {
      for (const storeys of [1, 2] as const) {
        const wall = WALL_KINDS[n % WALL_KINDS.length]!;
        const form = ROOF_FORMS[n % ROOF_FORMS.length]!;
        const color = ROOF_COLORS[n % ROOF_COLORS.length]!;
        const style = DOOR_STYLES[n % DOOR_STYLES.length]!;
        const double = style === 'double';
        const spec: BuildingSpec = {
          id: `b${n}`,
          width,
          storeys,
          wall,
          roof: { form, color },
          // a double door needs four tiles; fall back to a plain one on a three-tile building
          door: double && width >= 4 ? { at: 2, style, paint: PAINTS[n % PAINTS.length], step: n % 3 === 0 } : { at: 1.5, style: double ? 'plain' : style, paint: PAINTS[n % PAINTS.length], lantern: width >= 5 && n % 2 ? 'right' : undefined },
          windows: width >= 6 ? [{ at: width - 1.25, kind: n % 2 ? 'tall' : 'four-pane', box: n % 2 === 0 }] : [],
          upperWindows: storeys === 2 && width >= 5 ? [{ at: width - 1.5, shutters: 'plum', lit: 'curtains' }, { at: 1.5, kind: 'round', lit: 'dark' }] : undefined,
          sign: width >= 7 ? { icon: SIGN_ICONS[n % SIGN_ICONS.length]!, at: width / 2 + 0.75, storey: 'ground' } : undefined,
          chimney: n % 4 === 0 ? undefined : true,
        };
        expectWellFormed(makeBuilding(spec), spec);
        n++;
      }
    }
    expect(n).toBe(16);
  });

  it('builds the extras: awning, dormers, turrets, wall clock, both lanterns', () => {
    const specs: BuildingSpec[] = [
      { id: 'a', width: 6, door: { at: 2.5, style: 'shop' }, windows: [{ at: 4.25, kind: 'shop' }], awning: 'blue', sign: { icon: 'key', at: 1 } },
      { id: 'b', width: 6, door: { at: 2.5 }, awning: { color: 'plum', from: 1, to: 5 }, dormers: [2, 5] },
      { id: 'c', width: 8, door: { at: 4, style: 'double' }, turret: 'bell' },
      { id: 'd', width: 9, storeys: 2, wall: 'stone', door: { at: 4.5, lantern: 'both', step: true }, turret: 'clock', chimney: 7.5 },
      { id: 'e', width: 5, storeys: 2, door: { at: 2.5 }, clock: 2.5, upperWindows: [{ at: 1 }, { at: 4 }] },
      { id: 'f', width: 10, wall: 'brick', roof: { color: 'orange' }, door: { at: 5, style: 'double' }, chimney: false, dormers: [5] },
    ];
    for (const spec of specs) expectWellFormed(makeBuilding(spec), spec);
    // a double door offers a place in front of each leaf
    expect(makeBuilding(specs[2]!).places).toEqual({ door: { dx: 3, dy: 1 }, 'door-right': { dx: 4, dy: 1 } });
    // a turret is lit by its clock, never by its bell
    expect(makeBuilding(specs[3]!).lights!.filter((l) => l.ground === false).length).toBe(1);
    expect(makeBuilding(specs[2]!).lights).toEqual([]);
  });

  it('is deterministic', () => {
    const spec = presetSpecs.find((s) => s.id === 'bakery')!;
    const a = makeBuilding(spec);
    const b = makeBuilding(spec);
    expect(fnv(a.sprite.px)).toBe(fnv(b.sprite.px));
    expect(a.lights).toEqual(b.lights);
  });

  it('lights upstairs windows without pooling on the ground, and leaves dark windows dark', () => {
    const def = makeBuilding({
      id: 't',
      width: 5,
      storeys: 2,
      door: { at: 2.5 },
      windows: [{ at: 1 }, { at: 4, lit: 'dark' }],
      upperWindows: [{ at: 1, lit: 'curtains' }, { at: 4 }],
    });
    const groundLights = def.lights!.filter((l) => l.ground !== false);
    const upperLights = def.lights!.filter((l) => l.ground === false);
    expect(groundLights.length).toBe(1);
    expect(upperLights.length).toBe(2);
    expect(groundLights[0]!.dx).toBeLessThan(40);
    // nothing glows on the right half of the ground storey
    const e = def.emissive!;
    for (let y = e.ay - 30; y < e.ay; y++) for (let x = 40; x < e.w; x++) expect(e.px[y * e.w + x]).toBe(0);
  });

  it('deepens the footprint only when the roof hides whoever walks behind', () => {
    const base = { id: 'x', width: 5, door: { at: 2.5 } } as const;
    expect(makeBuilding({ ...base, roof: { height: 44 } }).footprint).toEqual({ w: 5, h: 3 });
    expect(makeBuilding({ ...base, roof: { height: 40 } }).footprint).toEqual({ w: 5, h: 2 });
    expect(makeBuilding({ ...base, storeys: 2 }).footprint).toEqual({ w: 5, h: 3 });
    expect(makeBuilding({ ...base, width: 3, door: { at: 1.5 } }).footprint).toEqual({ w: 3, h: 2 });
    // the ridge hides a 24-pixel person on the first free row behind, to within 2 pixels of hair
    for (const def of Object.values(buildings)) {
      const s = def.sprite;
      // the ridge is the first row that is drawn across more than half the width
      let row = 0;
      while (s.px.subarray(row * s.w, (row + 1) * s.w).filter((v) => v !== 0).length <= s.w / 2) row++;
      const ridge = s.ay - row;
      const headBehind = def.footprint!.h * TILE + 4 + 24;
      expect(headBehind - ridge, def.id).toBeLessThanOrEqual(2);
    }
  });

  it('stands in a town: solid walls, a walkable door tile, a way round the back', () => {
    const cafe = buildings.cafe!;
    const town = defineTown({
      name: 'Test',
      terrain: Array.from({ length: 8 }, () => 'g'.repeat(10)).join('\n'),
      legend: { g: 'grass' },
      props: [{ kind: 'cafe', at: [2, 5] }],
    });
    const door = town.places['cafe.door']!;
    expect(door).toEqual({ tx: 2 + cafe.places!.door!.dx, ty: 6 });
    for (let dy = 0; dy < cafe.footprint!.h; dy++) {
      for (let dx = 0; dx < cafe.footprint!.w; dx++) expect(town.solid[(5 - dy) * town.w + 2 + dx]).toBe(1);
    }
    // the row behind the footprint is free, and reachable from the door
    const behind = { tx: door.tx, ty: 5 - cafe.footprint!.h };
    expect(town.solid[behind.ty * town.w + behind.tx]).toBe(0);
    expect(findPath(town, door, behind)).not.toBeNull();
  });
});

describe('makeBuilding rejects bad specs and says what is valid', () => {
  const ok: BuildingSpec = { id: 'ok', width: 5, door: { at: 2.5 }, windows: [{ at: 1 }, { at: 4 }] };
  const bad = (change: Record<string, unknown>) => () => makeBuilding({ ...ok, ...change } as BuildingSpec);

  it('accepts the base spec', () => {
    expectWellFormed(makeBuilding(ok), ok);
  });

  it('names the building in every error', () => {
    expect(bad({ wall: 'marble' })).toThrow(/^makeBuilding\("ok"\): /);
  });

  it.each([
    ['an unknown wall', { wall: 'marble' }, /unknown wall "marble". Valid: plaster, yellow, timber, brick, stone, planks/],
    ['an unknown roof colour', { roof: { color: 'green' } }, /unknown roof colour "green". Valid: red, orange, blue/],
    ['an unknown roof form', { roof: { form: 'flat' } }, /unknown roof form "flat". Valid: gable, hip/],
    ['a roof that is too tall', { roof: { height: 60 } }, /roof height 60 is out of range: a one-storey gable roof takes a roof 40 to 44 pixels tall/],
    ['a width out of range', { width: 11 }, /"width" is 11: it must be a whole number of tiles from 3 to 10/],
    ['a fractional width', { width: 4.5 }, /whole number of tiles/],
    ['three storeys', { storeys: 3 }, /unknown number of storeys 3. Valid: 1, 2/],
    ['a missing door', { door: undefined }, /"door" is required/],
    ['a door between tiles', { door: { at: 2 } }, /a single door stands on one tile.*must be one of 1.5, 2.5, 3.5. Got 2/],
    ['a door in the corner', { door: { at: 0.5 } }, /must be one of 1.5, 2.5, 3.5/],
    ['a double door on half a tile', { door: { at: 2.5, style: 'double' } }, /a double door covers two whole tiles.*: 2, 3. Got 2.5/],
    ['an unknown door style', { door: { at: 2.5, style: 'sliding' } }, /unknown door style "sliding". Valid: plain, panelled, double, shop/],
    ['an unknown paint', { door: { at: 2.5, paint: 'pink' } }, /unknown door paint "pink". Valid: red, wood, blue, teal, plum, green/],
    ['a window over the door', { windows: [{ at: 2 }] }, /the door .* is too close to ground-floor window 1 .* on the ground floor. Leave at least 2 pixels/],
    ['a window off the wall', { windows: [{ at: 0.25 }] }, /ground-floor window 1 does not fit in the wall.*Its centre "at" can be from 0.78 to 4.22/],
    ['an unknown window kind', { windows: [{ at: 1, kind: 'bay' }] }, /unknown window kind "bay". Valid: four-pane, tall, shop, round/],
    ['a tall window upstairs', { storeys: 2, upperWindows: [{ at: 1, kind: 'tall' }] }, /a tall window only fits the ground floor/],
    ['upstairs windows on one storey', { upperWindows: [{ at: 1 }] }, /"upperWindows" needs storeys: 2/],
    ['shutters on a round window', { windows: [{ at: 1, kind: 'round', shutters: 'teal' }] }, /shutters hang on four-pane and tall windows/],
    ['an unknown lit look', { windows: [{ at: 1, lit: 'neon' }] }, /unknown lit look "neon". Valid: warm, curtains, dark/],
    ['an unknown sign icon', { sign: { icon: 'sword', at: 1 }, windows: [] }, /unknown sign icon "sword". Valid: cup, loaf, book, letter, bell, scissors, basket, key/],
    ['a sign on a missing storey', { sign: { icon: 'cup', at: 1, storey: 'upper' }, windows: [] }, /the building has one storey/],
    ['a sign under the awning', { width: 6, windows: [], door: { at: 3.5 }, sign: { icon: 'cup', at: 1.25 }, awning: { color: 'red', from: 1, to: 5 } }, /the sign hangs where the awning is/],
    ['an unknown awning colour', { awning: 'gold' }, /unknown awning colour "gold". Valid: red, teal, plum, blue/],
    ['an unknown turret', { turret: 'spire' }, /unknown turret "spire". Valid: bell, clock/],
    ['a chimney left of centre', { chimney: 1 }, /a chimney stands right of centre: "chimney" can be from 2.5 to 4.5 tiles, or true. Got 1/],
    ['a chimney off the roof', { chimney: 4.9 }, /the chimney does not fit on the roof there. Its centre can be from/],
    ['a chimney on a dormer', { chimney: 2.5, dormers: [2.5] }, /is too close to .* on the roof/],
    ['a wide roof with a bare join', { width: 7, chimney: false }, /a roof wider than 5 tiles.*Use chimney: true \(or chimney: 5\), dormers: \[5\], or a turret/],
    ['a misspelt option', { window: [{ at: 1 }] }, /unknown option "window" in the spec. Valid options: id, width, storeys, wall, roof, door, windows/],
    ['a misspelt door option', { door: { at: 2.5, colour: 'red' } }, /unknown option "colour" in "door". Valid options: at, style, paint, lantern, step/],
    ['a position that is not a number', { windows: [{ at: 'left' }] }, /ground-floor window 1 "at" must be a number, got "left"/],
    ['an empty id', { id: '' }, /"id" must be a non-empty string/],
  ])('%s', (_name, change, message) => {
    expect(bad(change)).toThrow(message);
  });

  it('refuses a double door on a three-tile building, and says why', () => {
    expect(() => makeBuilding({ id: 'tiny', width: 3, door: { at: 1.5, style: 'double' } })).toThrow(/too narrow for one: use at least 4 tiles/);
  });
});
