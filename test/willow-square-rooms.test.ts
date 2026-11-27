import { describe, expect, it } from 'vitest';
import { art } from '../src/art';
import { scene } from '../src/scene';
import { willowSquare } from '../src/towns';
import { findPath, isWalkable } from '../src/world';

const rooms = Object.entries(willowSquare.interiors ?? {});

describe('the rooms of Willow Square', () => {
  it('give every building with a door a room, except the shed', () => {
    const buildings = willowSquare.props.filter((p) => art.props[p.kind]?.places?.door).map((p) => p.id);
    expect(rooms.map(([b]) => b).sort()).toEqual(buildings.filter((b) => b !== 'shed').sort());
  });

  it.each(rooms)('%s is a room of at most 14 x 7 tiles inside its ink, with a door on the bottom floor row', (building, room) => {
    expect(room.indoor).toBe(true);
    // A ring of ink around walls and floor.
    expect(room.w).toBeLessThanOrEqual(16);
    expect(room.h).toBeLessThanOrEqual(9);
    for (let tx = 0; tx < room.w; tx++) expect([room.terrain[tx], room.terrain[(room.h - 1) * room.w + tx]]).toEqual(['ink', 'ink']);
    const door = room.places.door!;
    expect(door.ty).toBe(room.h - 2);
    const mat = room.props.find((p) => p.kind === 'doormat');
    expect(mat && [mat.tx, mat.ty]).toEqual([door.tx, door.ty]);
    // the camera frames it whole at zoom 2
    const sc = scene({ title: building, town: willowSquare }, (s) => s.camera.inside(building));
    expect(sc.beats?.map((b) => b.what)).toContain(`camera cuts inside ${building} at zoom 2`);
  });

  it.each(rooms)('%s: every place is reachable on foot from the door', (_, room) => {
    const door = room.places.door!;
    for (const [name, at] of Object.entries(room.places)) {
      expect(isWalkable(room, at.tx, at.ty), name).toBe(true);
      expect(findPath(room, door, at), `${name} from the door`).not.toBeNull();
    }
  });

  it.each(rooms)('%s: someone coming in can walk to every place and sit on every seat', (building) => {
    const room = willowSquare.interiors![building]!;
    const places = Object.keys(room.places);
    const seats = room.props.flatMap((p) => Object.keys(art.props[p.kind]?.seats ?? {}).map((seat) => [p.id ?? p.kind, seat] as const));
    const sc = scene({ title: building, town: willowSquare, timeOfDay: 12 }, (s) => {
      const ana = s.actor('ana', { at: `${building}.door` });
      ana.enter(building);
      for (const place of places) ana.walkTo(`${building}:${place}`);
      for (const [prop, seat] of seats) {
        ana.sitOn(`${building}:${prop}`, seat);
        ana.walkTo(`${building}:door`);
      }
      ana.exit(building);
    });
    expect(sc.duration).toBeGreaterThan(0);
  });
});
