/**
 * The interior kit: ids, footprints, places, seats, the ink rules, and how the rooms of
 * Willow Square use it.
 */
import { describe, expect, it } from 'vitest';
import { buildings, interiorProps, interiorTerrain, natureProps, streetProps, terrain } from '../src/art';
import { slotIndex } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import { willowSquare } from '../src/towns';

const INK = slotIndex('steel.0');
const hasInk = (s: Sprite) => s.px.includes(INK);

/** Props that hang on the back wall: no footprint, no shadow, 32 pixels tall (the wall). */
const WALL = ['window', 'window-wide', 'wall-lamp', 'picture', 'picture-flowers', 'wall-clock', 'wall-shelf', 'menu-board', 'blackboard', 'banner', 'inner-door'];

describe('interior ids', () => {
  it('do not collide with the town art', () => {
    const outdoor = new Set([...Object.keys(terrain), ...Object.keys(natureProps), ...Object.keys(streetProps), ...Object.keys(buildings)]);
    for (const id of [...Object.keys(interiorTerrain), ...Object.keys(interiorProps)]) expect(outdoor.has(id), id).toBe(false);
  });

  it('every wall look has an upper row and a base row', () => {
    const walls = Object.keys(interiorTerrain).filter((id) => id.startsWith('wall-') && !id.endsWith('-base'));
    expect(walls.length).toBeGreaterThanOrEqual(3);
    for (const id of walls) expect(interiorTerrain[`${id}-base`], `${id}-base`).toBeDefined();
    expect(Object.keys(interiorTerrain).filter((id) => id.startsWith('floor-')).length).toBeGreaterThanOrEqual(3);
  });
});

describe('interior grounds', () => {
  it('walls and the ink are solid, floors are not', () => {
    for (const [id, def] of Object.entries(interiorTerrain)) expect(def.solid === true, id).toBe(!id.startsWith('floor-'));
  });

  it('every floor and wall draws the cap on the ink, which draws nothing', () => {
    expect(interiorTerrain.ink!.fringe).toBeUndefined();
    for (const [id, def] of Object.entries(interiorTerrain)) {
      if (id === 'ink') continue;
      expect(def.priority, id).toBeGreaterThan(interiorTerrain.ink!.priority);
      expect(def.priority, id).toBe(interiorTerrain['floor-pine']!.priority);
      expect(Object.keys(def.fringe ?? {}).sort(), id).toEqual(['e', 'n', 'ne', 'nw', 's', 'se', 'sw', 'w']);
    }
  });

  it('use no ink, except the ink itself', () => {
    for (const [id, def] of Object.entries(interiorTerrain)) {
      if (id === 'ink') continue;
      for (const s of def.variants) expect(hasInk(s), id).toBe(false);
    }
  });
});

describe('interior props', () => {
  for (const [id, def] of Object.entries(interiorProps)) {
    it(`${id}: anchored at its bottom-left corner`, () => {
      // the doormat alone reaches 4 pixels below its tile, over the front cap
      expect([def.sprite.ax, def.sprite.ay]).toEqual([0, id === 'doormat' ? def.sprite.h - 4 : def.sprite.h]);
      if (def.footprint) expect(def.sprite.w).toBe(def.footprint.w * 16);
    });

    if (def.flat) {
      it(`${id}: flat, so no ink and no footprint`, () => {
        expect(hasInk(def.sprite)).toBe(false);
        expect(def.footprint).toBeUndefined();
      });
    } else {
      it(`${id}: no coloured pixel on the edge of its box, so its outline is closed`, () => {
        for (const s of [def.sprite, ...(def.anim?.frames ?? [])]) {
          for (let y = 0; y < s.h; y++) {
            for (let x = 0; x < s.w; x++) {
              if (x > 0 && y > 0 && x < s.w - 1 && y < s.h - 1) continue;
              const v = s.px[y * s.w + x]!;
              expect(v === 0 || v === INK, `${id} [${x}, ${y}]`).toBe(true);
            }
          }
        }
      });
    }

    if (def.places) {
      it(`${id}: places lie beside its footprint, never on it`, () => {
        const fp = def.footprint ?? { w: 0, h: 0 };
        for (const [name, p] of Object.entries(def.places!)) {
          const inside = p.dx >= 0 && p.dx < fp.w && p.dy <= 0 && p.dy > -fp.h;
          expect(inside, `${id}.${name}`).toBe(false);
          const beside = p.dx >= -1 && p.dx <= fp.w && p.dy >= -fp.h && p.dy <= 1;
          expect(beside, `${id}.${name}`).toBe(true);
        }
      });
    }

    if (def.seats) {
      it(`${id}: seats sit on the prop`, () => {
        for (const seat of Object.values(def.seats!)) {
          expect(seat.x).toBeGreaterThanOrEqual(4);
          expect(seat.x).toBeLessThanOrEqual(def.sprite.w - 4);
          // on the base line (drawn over the seat), or behind it, facing away (the seat drawn over them)
          expect(seat.y).toBeGreaterThanOrEqual(seat.dir === 'up' ? -16 : 0);
          expect(seat.y).toBeLessThanOrEqual(4);
          expect(def.footprint).toBeDefined();
        }
      });
    }
  }

  it('wall pieces hang on the wall: two tiles tall, no footprint, no shadow', () => {
    for (const id of WALL) {
      const def = interiorProps[id]!;
      expect(def, id).toBeDefined();
      expect(def.footprint, id).toBeUndefined();
      expect(def.castHeight, id).toBe(0);
      expect(def.sprite.h, id).toBe(32);
    }
  });

  it('windows have night glass and no light; lamps have both a glow and a light', () => {
    for (const id of ['window', 'window-wide']) {
      expect(interiorProps[id]!.emissive, id).toBeDefined();
      expect(interiorProps[id]!.lights, id).toBeUndefined();
    }
    for (const id of ['wall-lamp', 'floor-lamp', 'fireplace', 'oven', 'side-table']) {
      expect(interiorProps[id]!.emissive, id).toBeDefined();
      expect(interiorProps[id]!.lights?.length, id).toBeGreaterThan(0);
    }
  });
});

// The rooms of Willow Square are built from this kit; their size, doors and paths are
// checked in test/willow-square-rooms.test.ts. Here: that they use the kit as it is meant.
describe('the rooms of Willow Square use the kit', () => {
  for (const [building, room] of Object.entries(willowSquare.interiors ?? {})) {
    it(`${building}: only interior grounds, a two-row back wall, wall pieces on its base row`, () => {
      for (const id of room.terrain) expect(interiorTerrain[id], id).toBeDefined();
      const row = (ty: number) => room.terrain.slice(ty * room.w + 1, (ty + 1) * room.w - 1);
      expect(row(1).every((id) => id.startsWith('wall-') && !id.endsWith('-base'))).toBe(true);
      expect(row(2).every((id) => id.startsWith('wall-') && id.endsWith('-base'))).toBe(true);
      for (const p of room.props.filter((q) => WALL.includes(q.kind))) expect(p.ty, `${p.kind} at ${p.tx}`).toBe(2);
    });
  }
});
