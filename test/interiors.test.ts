/** Interiors: rooms behind doors, people going in and out of them, and the frames that show them. */
import { describe, expect, it, vi } from 'vitest';
import { defineTown, describeTown, type FrameState, type Scene, scene, type SceneBuilder, Surface, TILE } from '../src';
import { indoorConditionAt } from '../src/render/conditions';
import { createRenderer } from '../src/render';
import { compileTheme, daylight, lutRgb } from '../src/core/palette';
import { roomArt, testRoom, townWithoutRoom, townWithRoom } from './fixtures/room';

const build = (fn: (s: SceneBuilder) => void, town = townWithRoom, timeOfDay = 12): Scene => scene({ title: 't', town, art: roomArt, timeOfDay }, fn);
const frames = (sc: Scene, step = 1 / 15): FrameState[] =>
  Array.from({ length: Math.floor(sc.duration / step) + 2 }, (_, i) => sc.frame(Math.min(sc.duration, i * step)));
const actor = (f: FrameState, id: string) => f.actors.find((a) => a.id === id);

describe('defineTown with interiors', () => {
  const outside = { name: 'Street', terrain: 'ggggggg\nggggggg\nggggggg\nggggggg\nggggggg', legend: { g: 'grass' } };

  it('keeps rooms and the indoor flag', () => {
    expect(townWithRoom.interiors?.bakery).toBe(testRoom);
    expect(testRoom.indoor).toBe(true);
    expect(townWithoutRoom.interiors).toBeUndefined();
    expect('indoor' in townWithoutRoom).toBe(false);
  });

  it('wants each key to be a building with a door, and lists those', () => {
    const spec = { ...outside, props: [{ kind: 'shed', at: [1, 3] as [number, number], id: 'shed' }, { kind: 'lamp', at: [5, 3] as [number, number] }] };
    expect(() => defineTown({ ...spec, interiors: { shd: testRoom } }, roomArt)).toThrow(/there is no prop "shd".*Did you mean "shed"\?.*Props with a door: shed\./);
    expect(() => defineTown({ ...spec, interiors: { lamp: testRoom } }, roomArt)).toThrow(/prop "lamp" has no door place/);
    expect(defineTown({ ...spec, interiors: { shed: testRoom } }, roomArt).interiors?.shed).toBe(testRoom);
  });

  it('wants each room to have a door place, and rooms not to nest', () => {
    const spec = { ...outside, props: [{ kind: 'shed', at: [1, 3] as [number, number], id: 'shed' }] };
    const noDoor = defineTown({ name: 'Closet', indoor: true, terrain: 'pp\npp', legend: { p: 'plank' }, places: { corner: [0, 0] } });
    expect(() => defineTown({ ...spec, interiors: { shed: noDoor } })).toThrow(/Unknown place "door".*Valid places: corner\..*needs a walkable place called door/);
    const nested = { ...testRoom, interiors: { x: testRoom } };
    expect(() => defineTown({ ...spec, interiors: { shed: nested } }, roomArt)).toThrow(/rooms cannot be nested/);
  });
});

describe('describeTown with rooms', () => {
  it('lists every room after the town, with qualified names', () => {
    const text = describeTown(townWithRoom, roomArt);
    expect(text).toContain('Rooms: bakery.');
    expect(text).toContain('Room bakery (inside prop "bakery")');
    expect(text).toContain('Test bakery (indoors): 12 x 7 tiles.');
    expect(text).toMatch(/\d bakery:door \[6, 6\]/);
    expect(text).toContain('bakery:bench (bench) at [4, 2]');
    expect(describeTown(townWithoutRoom, roomArt)).not.toContain('Room');
  });
});

describe('going in and out', () => {
  const sc = build((s) => {
    const ana = s.actor('ana', { at: 'plaza' });
    s.camera.cut('bakery.door', { zoom: 2 });
    ana.enter('bakery');
    s.camera.inside('bakery');
    ana.walkTo('bakery:counter');
    ana.exit('bakery');
    s.camera.cut('plaza');
    s.wait(1);
  });
  const beats = sc.beats!;
  const enter = beats.find((b) => b.what === 'enters bakery')!;
  const exit = beats.find((b) => b.what === 'comes out of bakery')!;

  it('names inside targets and camera moves in the beats', () => {
    expect(beats.map((b) => b.what)).toEqual([
      'appears at plaza',
      'camera cuts to bakery.door at zoom 2',
      'enters bakery',
      'camera cuts inside bakery at zoom 2',
      'walks to bakery:counter',
      'comes out of bakery',
      'camera cuts to plaza (outside)',
    ]);
  });

  it('crosses the door as a fade on both sides at once', () => {
    const mid = enter.end - 0.15;
    const out = sc.frame(mid);
    expect(out.interior).toBeUndefined();
    const ghost = actor(out, 'ana')!;
    expect(ghost.opacity).toBeCloseTo(0.5, 5);
    expect(ghost.dir).toBe('up');
    // seen from inside at the same moment: the camera would be in the room
    const inside = build((s) => {
      const ana = s.actor('ana', { at: 'plaza' });
      s.camera.inside('bakery');
      ana.enter('bakery');
      s.wait(1);
    });
    const e = inside.beats!.find((b) => b.what === 'enters bakery')!;
    const f = inside.frame(e.end - 0.15);
    expect(f.interior).toBe('bakery');
    const a = actor(f, 'ana')!;
    expect(a.opacity).toBeCloseTo(0.5, 5);
    const door = testRoom.places.door!;
    expect([a.x, a.y]).toEqual([door.tx * TILE + 8, door.ty * TILE + 12]);
    expect(actor(inside.frame(e.end), 'ana')!.opacity).toBeUndefined();
    expect(actor(inside.frame(e.start), 'ana')).toBeUndefined();
  });

  it('shows only the people of the location the camera shows', () => {
    for (const f of frames(sc)) {
      const a = actor(f, 'ana');
      if (f.t > enter.end && f.t < exit.end - 0.3 && f.interior === undefined) expect(a, `at ${f.t}`).toBeUndefined();
      if (f.interior === 'bakery') expect(f.t).toBeGreaterThanOrEqual(enter.end);
    }
  });

  it('walks to the room door before coming out', () => {
    // from the counter [7, 4] to the door [6, 6]: three tiles
    expect(exit.end - exit.start).toBeCloseTo(3 / 2.5 + 0.3, 5);
    const f = sc.frame(exit.end);
    expect(f.interior).toBeUndefined();
    expect(actor(f, 'ana')).toMatchObject({ x: 3 * TILE + 8, y: 5 * TILE + 12, dir: 'down' });
  });

  it('frames a room on its centre at the largest zoom that fits it', () => {
    const f = sc.frame(enter.end + 0.01);
    expect(f.interior).toBe('bakery');
    expect(f.camera).toEqual({ x: (12 * TILE) / 2, y: (7 * TILE) / 2, zoom: 2 });
    const big = defineTown({ name: 'Hall', indoor: true, terrain: Array(9).fill('p'.repeat(16)).join('\n'), legend: { p: 'plank' }, places: { door: [8, 8] } });
    const town = defineTown({ ...townSpec(), interiors: { bakery: big } }, roomArt);
    const hall = build((s) => s.camera.inside('bakery'), town);
    expect(hall.frame(0).camera.zoom).toBe(1);
    expect(build((s) => s.camera.inside('bakery', { zoom: 3 })).frame(0).camera.zoom).toBe(3);
  });

  it('frames a room without the ink around it', () => {
    // 14 x 7 of wall and floor inside a one-tile border of ink: the map is 16 x 9
    const rows = ['#'.repeat(16), `#${'W'.repeat(14)}#`, `#${'w'.repeat(14)}#`, ...Array(5).fill(`#${'.'.repeat(14)}#`), '#'.repeat(16)];
    const boxed = defineTown({ name: 'Boxed', indoor: true, terrain: rows.join('\n'), legend: { '#': 'ink', W: 'wall-plaster', w: 'wall-plaster-base', '.': 'floor-pine' }, places: { door: [8, 7] } });
    const town = defineTown({ ...townSpec(), interiors: { bakery: boxed } }, roomArt);
    const f = build((s) => s.camera.inside('bakery'), town).frame(0);
    expect(f.camera).toEqual({ x: (16 * TILE) / 2, y: Math.ceil((9 * TILE) / 2), zoom: 2 });
  });
});

/** The outdoor spec of the fixture street, for towns with other rooms. */
function townSpec() {
  return {
    name: 'Test street',
    terrain: Array(8).fill('gggggggggggg').join('\n'),
    legend: { g: 'grass' },
    props: [{ kind: 'bakery', at: [2, 4] as [number, number], id: 'bakery' }],
    places: { plaza: [8, 6] as [number, number] },
  };
}

describe('scripting inside a room', () => {
  it('starts people inside, by place or by tile', () => {
    const sc = build((s) => {
      s.actor('bo', { at: 'bakery:counter' });
      s.actor('ana', { at: [2, 3], inside: 'bakery' });
      s.actor('kofi', { at: [0, 7] });
      s.camera.inside('bakery');
    });
    const f = sc.frame(0);
    expect(f.actors.map((a) => a.id).sort()).toEqual(['ana', 'bo']);
    expect(actor(f, 'ana')).toMatchObject({ x: 2 * TILE + 8, y: 3 * TILE + 12 });
    expect(sc.beats!.map((b) => b.what)).toContain('appears at bakery:[2, 3]');
  });

  it('walks, wanders, sits and teleports with the room map', () => {
    const sc = build((s) => {
      const bo = s.actor('bo', { at: 'bakery:door' });
      s.camera.inside('bakery');
      bo.walkTo([10, 5]);
      bo.sitOn('bakery:bench', 'right');
      bo.say('Nice bench.');
      s.wander(bo, { around: 'bakery:window', radius: 2 });
      s.wait(6);
      bo.teleport('plaza');
      s.camera.cut(bo);
    });
    const all = frames(sc);
    const inRoom = all.filter((f) => f.interior === 'bakery');
    for (const f of inRoom) {
      const b = actor(f, 'bo');
      if (!b) continue;
      const tx = Math.round((b.x - 8) / TILE);
      const ty = Math.round((b.y - 12) / TILE);
      expect(tx >= 0 && tx < testRoom.w && ty >= 1 && ty < testRoom.h, `bo at [${tx}, ${ty}] at ${f.t}`).toBe(true);
    }
    expect(inRoom.some((f) => actor(f, 'bo')?.pose === 'sit')).toBe(true);
    const last = sc.frame(sc.duration);
    expect(last.interior).toBeUndefined();
    expect(actor(last, 'bo')).toMatchObject({ x: 8 * TILE + 8, y: 6 * TILE + 12 });
    expect(sc.beats!.map((b) => b.what)).toEqual(expect.arrayContaining(['walks to bakery:[10, 5]', 'sits on bakery:bench.right', 'wanders around bakery:window', 'teleports to plaza']));
  });

  it('follows someone inside, and holds at the door when they leave', () => {
    const sc = build((s) => {
      const bo = s.actor('bo', { at: 'bakery:counter' });
      s.camera.follow(bo);
      bo.walkTo([2, 4]);
      bo.exit('bakery');
      s.wait(1);
    });
    expect(sc.frame(0.5).interior).toBe('bakery');
    const end = sc.frame(sc.duration);
    expect(end.interior).toBe('bakery');
    expect(end.actors).toEqual([]);
    expect(sc.beats!.find((b) => b.what.startsWith('camera follows'))!.what).toBe('camera follows bo (inside bakery)');
  });

  it('keeps the camera at the door outside when someone it follows goes straight in', () => {
    const sc = build((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      s.camera.cut(ana, { zoom: 2 });
      s.camera.follow(ana);
      ana.enter('bakery');
      s.wait(1);
    });
    const start = sc.frame(0);
    for (const f of frames(sc)) {
      expect(f.interior).toBeUndefined();
      expect(f.camera).toEqual(start.camera);
    }
  });

  it('cuts to whoever is inside, and labels a room place only in the room', () => {
    const sc = build((s) => {
      const bo = s.actor('bo', { at: 'bakery:counter' });
      s.label('bakery:window', 'window');
      s.label('plaza', 'plaza');
      s.camera.cut(bo, { zoom: 2 });
      s.wait(1);
      s.camera.cut('plaza');
      s.wait(1);
    });
    const inside = sc.frame(0.5);
    expect(inside.interior).toBe('bakery');
    const text = (f: FrameState) => (f.annotations ?? []).map((a) => (a.kind === 'label' ? a.text : ''));
    expect(text(inside)).toEqual(['window']);
    expect(text(sc.frame(1.5))).toEqual(['plaza']);
  });

  it('cuts back outside to the shot it came from, or to a target outside', () => {
    const sc = build((s) => {
      s.camera.cut([3, 6], { zoom: 3 });
      s.wait(1);
      s.camera.inside('bakery');
      s.wait(1);
      s.camera.outside();
      s.wait(1);
      s.camera.inside('bakery');
      s.camera.outside([11, 7], { zoom: 2 });
      s.wait(1);
    });
    expect(sc.frame(1.5).interior).toBe('bakery');
    expect(sc.frame(2.5).interior).toBeUndefined();
    expect(sc.frame(2.5).camera).toEqual(sc.frame(0.5).camera);
    // a tile is a town tile, even when the camera is inside
    const end = sc.frame(3.5);
    expect(end.interior).toBeUndefined();
    expect(end.camera.zoom).toBe(2);
    expect(sc.beats!.filter((b) => b.what.includes('outside')).map((b) => b.what)).toEqual(['camera cuts back outside', 'camera cuts outside to [11, 7] at zoom 2']);
    // never outside before: the opening view
    const never = build((s) => {
      s.camera.inside('bakery');
      s.wait(1);
      s.camera.outside();
      s.wait(1);
    });
    const opening = build((s) => s.wait(1));
    expect(never.frame(1.5).camera).toEqual(opening.frame(0).camera);
    expect(never.frame(1.5).interior).toBeUndefined();
  });

  it('will not cut outside to a place or someone in a room', () => {
    expect(() => build((s) => s.camera.outside('bakery:counter'))).toThrow(/s.camera.outside: bakery:counter is inside bakery at 0.00s/);
    expect(() => build((s) => s.camera.outside(s.actor('bo', { at: 'bakery:counter' })))).toThrow(/s.camera.outside: bo is inside bakery at 0.00s/);
    const sc = build((s) => {
      const ana = s.actor('ana', { at: 'plaza' });
      s.camera.inside('bakery');
      s.camera.outside(ana, { zoom: 2 });
    });
    expect(sc.frame(0).interior).toBeUndefined();
  });

  it('pans within a room, and a tile there is a room tile', () => {
    const sc = build((s) => {
      s.camera.inside('bakery', { zoom: 3 });
      s.camera.pan([1, 3], { duration: 1 });
    });
    const f = sc.frame(1);
    expect(f.interior).toBe('bakery');
    expect(f.camera.zoom).toBe(3);
    expect(sc.beats!.at(-1)!.what).toBe('camera pans to bakery:[1, 3]');
  });
});

describe('calls that look at someone in another branch of s.together', () => {
  /** The same film whichever of the two calls is scripted first. */
  const bothOrders = (setup: (s: SceneBuilder) => Record<string, ReturnType<SceneBuilder['actor']>>, a: (s: SceneBuilder, who: Record<string, ReturnType<SceneBuilder['actor']>>) => void, b: typeof a) => {
    const make = (first: typeof a, second: typeof a) =>
      build((s) => {
        const who = setup(s);
        s.together(() => {
          first(s, who);
          second(s, who);
        });
        s.wait(1);
      });
    const [x, y] = [make(a, b), make(b, a)];
    expect(y.duration).toBe(x.duration);
    const byWhat = (sc: Scene) => [...sc.beats!].map((bt) => JSON.stringify(bt)).sort();
    expect(byWhat(y)).toEqual(byWhat(x));
    for (const f of frames(x)) expect(JSON.stringify(y.frame(f.t)), `at ${f.t}`).toBe(JSON.stringify(f));
    return x;
  };
  const lin = (s: SceneBuilder) => ({ lin: s.actor('lin', { at: 'bakery.door' }), ana: s.actor('ana', { at: 'bakery:counter' }) });
  const enters = (s: SceneBuilder, w: Record<string, ReturnType<SceneBuilder['actor']>>) => w.lin!.enter('bakery');

  it('a cut to someone halfway through a door goes in with them', () => {
    const sc = bothOrders(lin, enters, (s, w) => {
      s.sequence(() => {
        s.wait(0.15);
        s.camera.cut(w.lin!);
      });
    });
    expect(sc.frame(1).interior).toBe('bakery');
    expect(actor(sc.frame(1), 'lin')).toBeDefined();
    expect(sc.beats!.map((b) => b.what)).toContain('camera cuts to lin (inside bakery)');
  });

  it('following and cutting outside to someone, in either order', () => {
    bothOrders(lin, enters, (s, w) => s.camera.follow(w.lin!));
    bothOrders(lin, enters, (s, w) => {
      s.camera.inside('bakery');
      s.camera.outside(w.lin!);
    });
  });

  it('walking up to someone: script their move first, and the error says so', () => {
    const run = (walkFirst: boolean) =>
      build((s) => {
        const w = lin(s);
        s.together(() => {
          if (walkFirst) w.ana!.walkTo(w.lin!);
          w.lin!.enter('bakery');
          if (!walkFirst) w.ana!.walkTo(w.lin!);
        });
      });
    expect(run(false).beats!.map((b) => b.what)).toContain('walks to lin');
    expect(() => run(true)).toThrow(
      "ana.walkTo: lin is outside, but ana is inside bakery at 0.00s. Use ana.exit('bakery') first. If lin's move there is scripted later in the same s.together, script it first.",
    );
  });
});

describe('errors that say where everyone is', () => {
  const fails = (fn: (s: SceneBuilder) => void) => () => build(fn);

  it('across locations: use enter or exit first', () => {
    expect(fails((s) => s.actor('ana', { at: 'plaza' }).walkTo('bakery:counter'))).toThrow(
      'ana.walkTo: bakery:counter is inside bakery, but ana is outside at 0.00s. Use ana.enter(\'bakery\') first.',
    );
    expect(fails((s) => s.actor('bo', { at: 'bakery:counter' }).walkTo('plaza'))).toThrow(/plaza is outside, but bo is inside bakery.*Use bo.exit\('bakery'\) first/);
    expect(
      fails((s) => {
        const bo = s.actor('bo', { at: 'bakery:counter' });
        s.actor('ana', { at: 'plaza' }).walkTo(bo);
      }),
    ).toThrow(/bo is inside bakery, but ana is outside/);
    expect(fails((s) => s.actor('bo', { at: 'bakery:counter' }).enter('bakery'))).toThrow(/bo is inside bakery at 0.00s. Use bo.exit\('bakery'\) first/);
    expect(fails((s) => s.wander(s.actor('bo', { at: 'bakery:counter' }), { around: 'plaza' }))).toThrow(/plaza is outside, but bo is inside bakery/);
    expect(fails((s) => s.actor('ana', { at: 'plaza' }).sitOn('bakery:bench'))).toThrow(/prop "bakery:bench" is inside bakery, but ana is outside/);
  });

  it('a pan cannot go through a wall', () => {
    expect(
      fails((s) => {
        s.camera.cut('plaza');
        s.camera.pan('bakery:door');
      }),
    ).toThrow(/s.camera.pan: bakery:door is inside bakery, but the camera shows outside at 0.00s.*use s.camera.cut/);
  });

  it('turning to someone in another location', () => {
    expect(
      fails((s) => {
        const bo = s.actor('bo', { at: 'bakery:counter' });
        s.actor('ana', { at: 'plaza' }).face(bo);
      }),
    ).toThrow('ana.face: bo is inside bakery, but ana is outside at 0.00s. Turn to someone in the same place, or pass a direction.');
  });

  it('a bare name inside a room points at the room name', () => {
    const inside = (fn: (s: SceneBuilder, bo: ReturnType<SceneBuilder['actor']>) => void) => fails((s) => fn(s, s.actor('bo', { at: 'bakery:counter' })));
    expect(inside((s, bo) => bo.sitOn('bench'))).toThrow(
      'Unknown prop "bench". bo is inside bakery: did you mean "bakery:bench"? Name what is in a room as "bakery:<prop>". Props in bakery: bakery:barrel, bakery:bench, bakery:crate, bakery:lamp-left, bakery:lamp-right, bakery:planter. (in bo.sitOn)',
    );
    expect(inside((s, bo) => bo.walkTo('counter'))).toThrow(/Unknown place "counter". bo is inside bakery: did you mean "bakery:counter"\?.*Places in bakery: bakery:bench.left/);
    expect(inside((s, bo) => bo.teleport('windw'))).toThrow(/did you mean "bakery:window"\?/);
    expect(inside((s, bo) => s.wander(bo, { around: 'window' }))).toThrow(/bo is inside bakery: did you mean "bakery:window"\?/);
    expect(
      fails((s) => {
        s.camera.inside('bakery');
        s.label('window', 'light');
      }),
    ).toThrow(/Unknown place "window". The camera is inside bakery: did you mean "bakery:window"\?/);
    expect(
      fails((s) => {
        s.camera.inside('bakery');
        s.camera.cut('counter');
      }),
    ).toThrow(/did you mean "bakery:counter"\?/);
    // outside, a bare unknown name lists the outside names as before
    expect(fails((s) => s.actor('ana', { at: 'plaza' }).walkTo('counter'))).toThrow(/Unknown place "counter". Valid places: /);
  });

  it('a pan on someone going through a door says so', () => {
    expect(
      fails((s) => {
        const ana = s.actor('ana', { at: 'bakery.door' });
        s.camera.cut('plaza');
        s.together(() => {
          ana.enter('bakery');
          s.sequence(() => {
            s.wait(0.15);
            s.camera.pan(ana);
          });
        });
      }),
    ).toThrow('s.camera.pan: ana is going through the door into bakery, but the camera shows outside at 0.15s.');
    // at the very moment she starts through, she is still on the street: the pan ends at the door
    const sc = build((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      s.camera.cut('plaza', { zoom: 3 });
      s.together(() => {
        ana.enter('bakery');
        s.camera.pan(ana, { duration: 1 });
      });
      s.wait(1);
    });
    const door = sc.frame(sc.duration);
    expect(door.interior).toBeUndefined();
    expect(door.camera).toEqual(sc.frame(1).camera);
  });

  it('a place in a room lists only that room, and a building without a room says so', async () => {
    const { willowSquare } = await import('../src/towns');
    const ws = (fn: (s: SceneBuilder) => void) => () => scene({ title: 't', town: willowSquare }, fn);
    expect(ws((s) => s.actor('bo', { at: 'cafe:nowhere' }))).toThrow(/^Unknown place "cafe:nowhere". Valid places: (cafe:[\w.-]+(, |\.$))+$/);
    expect(ws((s) => s.camera.inside('shed'))).toThrow(/^"shed" has a door but no room. Buildings with rooms: bakery, .*cafe/);
  });

  it('unknown rooms and room places list what there is', () => {
    expect(fails((s) => s.actor('bo', { at: 'bakry:door' }))).toThrow(/Unknown room "bakry". Did you mean "bakery"\? Valid rooms: bakery\./);
    expect(fails((s) => s.actor('bo', { at: 'bakery:dor' }))).toThrow(/Unknown place "bakery:dor". Did you mean "bakery:door"\?.*bakery:counter/);
    expect(fails((s) => s.camera.inside('cafe'))).toThrow(/Unknown room "cafe".*Valid rooms: bakery/);
    expect(fails((s) => s.actor('bo', { at: [1, 1], inside: 'cafe' }))).toThrow(/Unknown room "cafe"/);
    expect(fails((s) => s.actor('bo', { at: [20, 3], inside: 'bakery' }))).toThrow(/is not a tile of the 12x7 room bakery/);
    expect(fails((s) => s.actor('bo', { at: 'bakery:counter' }).sitOn('bakery:crate'))).toThrow(/prop "bakery:crate" has no seats. Props with seats: bakery:bench\./);
    expect(fails((s) => s.actor('bo', { at: 'bakery:counter' }).exit('bakry'))).toThrow(/Unknown prop "bakry"/);
  });
});

describe('camera calls at the instant someone is placed and goes through a door', () => {
  // a town larger than the frame, so that a wrong camera position shows
  const spec = { name: 'Big', terrain: Array(30).fill('g'.repeat(60)).join('\n'), legend: { g: 'grass' }, props: [{ kind: 'bakery', at: [20, 15] as [number, number], id: 'bakery' }] };
  const roomy = defineTown({ ...spec, interiors: { bakery: testRoom } }, roomArt);
  const plain = defineTown(spec, roomArt);
  const both = (fn: (s: SceneBuilder) => void) => [plain, roomy].map((town) => scene({ title: 't', town, art: roomArt }, fn));

  it('a follow stays at the outside door, as without rooms', () => {
    const [a, b] = both((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      s.camera.cut(ana, { zoom: 3 });
      s.camera.follow(ana);
      ana.enter('bakery');
      s.wait(1);
    });
    expect(b!.frame(0.3).camera).toEqual(b!.frame(0.15).camera);
    for (const f of frames(a!)) expect(JSON.stringify(b!.frame(f.t)), `at ${f.t}`).toBe(JSON.stringify(f));
  });

  it('a cut, a pan and outside(actor) see them on the street side', () => {
    const [a, b] = both((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      s.camera.cut([10, 10], { zoom: 2 });
      s.together(() => {
        s.camera.pan(ana, { duration: 1 });
        ana.enter('bakery');
      });
      s.camera.cut([5, 5]);
      const bo = s.actor('bo', { at: 'bakery.door' });
      s.camera.cut(bo, { zoom: 3 });
      bo.enter('bakery');
      s.camera.cut([5, 5]);
      const lin = s.actor('lin', { at: 'bakery.door' });
      s.camera.outside(lin);
      lin.enter('bakery');
      s.wait(1);
    });
    expect(b!.beats).toEqual(a!.beats);
    for (const f of frames(a!)) expect(JSON.stringify(b!.frame(f.t)), `at ${f.t}`).toBe(JSON.stringify(f));
  });
});

describe('camera calls after one settled on someone going through a door', () => {
  const repro = (after: (s: SceneBuilder) => void, enterFirst: boolean) =>
    build((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      s.together(() => {
        if (enterFirst) ana.enter('bakery');
        s.sequence(() => {
          s.wait(1);
          s.camera.cut(ana);
          s.wait(1);
          after(s);
        });
        if (!enterFirst) ana.enter('bakery');
      });
      s.wait(1);
    });
  const sameBothOrders = (after: (s: SceneBuilder) => void) => {
    const [x, y] = [repro(after, true), repro(after, false)];
    for (const f of frames(x)) expect(JSON.stringify(y.frame(f.t)), `at ${f.t}`).toBe(JSON.stringify(f));
    expect([...y.beats!].map((b) => JSON.stringify(b)).sort()).toEqual([...x.beats!].map((b) => JSON.stringify(b)).sort());
    return x;
  };

  it('a pan to a tile pans inside the room', () => {
    const sc = sameBothOrders((s) => s.camera.pan([3, 4], { duration: 0.5 }));
    expect(sc.frame(2.6).interior).toBe('bakery');
    expect(sc.beats!.map((b) => b.what)).toContain('camera pans to bakery:[3, 4]');
  });

  it('a cut to a tile cuts inside the room', () => {
    const sc = sameBothOrders((s) => s.camera.cut([3, 4]));
    expect(sc.frame(2.5).interior).toBe('bakery');
    expect(sc.beats!.map((b) => b.what)).toContain('camera cuts to bakery:[3, 4]');
  });

  it('a label on a tile goes up in the room', () => {
    const sc = sameBothOrders((s) => s.label([3, 4], 'here'));
    const f = sc.frame(2.5);
    expect(f.interior).toBe('bakery');
    expect((f.annotations ?? []).map((a) => (a.kind === 'label' ? a.text : ''))).toEqual(['here']);
    expect(sc.beats!.map((b) => b.what)).toContain('label "here" on bakery:[3, 4]');
  });
});

describe('a script that never names a room', () => {
  /** Everything a script can do outside, including going in and out of the bakery. */
  const script = (s: SceneBuilder) => {
    const ana = s.actor('ana', { at: 'plaza' });
    const bo = s.actor('bo', { at: 'bakery.door', hidden: true });
    s.camera.cut(ana, { zoom: 2 });
    s.camera.follow(ana);
    s.label([8, 6], 'here');
    bo.exit('bakery');
    bo.walkTo([9, 6]);
    ana.walkTo(bo);
    ana.say('Hello!');
    s.together(() => {
      bo.enter('bakery');
      s.camera.pan('bakery.door', { duration: 1 });
    });
    bo.exit('bakery');
    s.wander(bo, { around: 'plaza', radius: 2 });
    s.camera.follow(ana);
    ana.enter('bakery');
    s.wait(1);
    s.camera.cut('bakery.door');
    s.wait(1);
    ana.exit('bakery');
    s.ring(ana);
    // followed in, out and on: the camera picks her up again when she comes back
    s.camera.cut(ana, { zoom: 3 });
    s.camera.follow(ana);
    ana.enter('bakery');
    s.wait(1);
    ana.exit('bakery');
    ana.walkTo([11, 6]);
    ana.walkTo([0, 6]);
    // in at one door, out of another
    bo.enter('bakery');
    s.wait(0.5);
    bo.exit('shed');
    bo.walkTo('plaza');
    s.fadeOut();
  };

  it('follows someone again when they come back out', () => {
    const roomy = build(script, townWithRoom);
    const last = roomy.beats!.filter((b) => b.what === 'walks to [0, 6]').at(-1)!;
    expect(roomy.frame(last.start).camera.x).not.toBe(roomy.frame(last.end).camera.x);
  });

  it('gives the same film whether or not the town has rooms', () => {
    const plain = build(script, townWithoutRoom);
    const roomy = build(script, townWithRoom);
    expect(roomy.duration).toBe(plain.duration);
    expect(roomy.beats).toEqual(plain.beats);
    for (let i = 0; i <= Math.ceil(plain.duration * 30); i++) {
      const t = Math.min(plain.duration, i / 30);
      expect(JSON.stringify(roomy.frame(t)), `at ${t}s`).toBe(JSON.stringify(plain.frame(t)));
    }
  });
});

describe('what changes once a building has a room (as docs/scene-api.md lists)', () => {
  const after = (town: typeof townWithRoom, fn: (s: SceneBuilder, ana: ReturnType<SceneBuilder['actor']>) => void) =>
    build((s) => {
      const ana = s.actor('ana', { at: 'bakery.door' });
      ana.enter('bakery');
      fn(s, ana);
      s.wait(0.5);
    }, town);

  it('walkTo an outside place after enter is an error (before: an unseen walk)', () => {
    expect(() => after(townWithoutRoom, (s, ana) => ana.walkTo('plaza'))).not.toThrow();
    expect(() => after(townWithRoom, (s, ana) => ana.walkTo('plaza'))).toThrow(/plaza is outside, but ana is inside bakery/);
  });

  it('teleport outside shows the actor (before: stayed hidden)', () => {
    const shown = (town: typeof townWithRoom) => actor(after(town, (s, ana) => ana.teleport('plaza')).frame(1), 'ana');
    expect(shown(townWithoutRoom)).toBeUndefined();
    expect(shown(townWithRoom)).toBeDefined();
  });

  it('show() does not bring them back to the street (before: reappeared at the door)', () => {
    const shown = (town: typeof townWithRoom) => actor(after(town, (s, ana) => ana.show()).frame(1), 'ana');
    expect(shown(townWithoutRoom)).toBeDefined();
    expect(shown(townWithRoom)).toBeUndefined();
  });
});

describe('the built-in scenes once Willow Square has rooms', () => {
  const files = ['../scenes/hello', '../scenes/tiny', '../scenes/day-and-night', '../scenes/word-of-mouth', '../examples/haggle', '../examples/good-morning', '../examples/new-art'];

  /** What must not change: duration, beats and a frame every fifteenth of a second. */
  const film = (sc: Scene) => ({ duration: sc.duration, beats: sc.beats, frames: frames(sc).map((f) => JSON.stringify(f)) });

  it('are unchanged', async () => {
    const before = new Map<string, ReturnType<typeof film>>();
    for (const f of files) before.set(f, film((await import(f)).default as Scene));
    vi.resetModules();
    const { willowSquare } = await import('../src/towns');
    const doors = willowSquare.props.map((p) => p.id ?? p.kind).filter((id) => willowSquare.places[`${id}.door`]);
    expect(doors.length).toBeGreaterThan(5);
    willowSquare.interiors = Object.fromEntries(doors.map((id) => [id, testRoom]));
    try {
      let roomy = 0;
      for (const f of files) {
        const sc = (await import(f)).default as Scene;
        if (sc.town.interiors) roomy++;
        const was = before.get(f)!;
        const now = film(sc);
        expect(now.duration, f).toBe(was.duration);
        expect(now.beats, f).toEqual(was.beats);
        expect(now.frames.findIndex((x, i) => x !== was.frames[i]), f).toBe(-1);
      }
      // hello, day-and-night and word-of-mouth are set in Willow Square
      expect(roomy).toBe(3);
    } finally {
      delete willowSquare.interiors;
      vi.resetModules();
    }
  }, 60_000);
});

describe('the ink around a Willow Square room', () => {
  it('is one flat colour at every hour, and no lamp lights it', async () => {
    const { willowSquare } = await import('../src/towns');
    const { art } = await import('../src/art');
    const ink = [...lutRgb(compileTheme(daylight), 'steel.0')];
    const renderer = createRenderer(willowSquare);
    for (const [id, room] of Object.entries(willowSquare.interiors ?? {})) {
      for (const hour of [12, 20, 23]) {
        const sc = scene({ title: id, town: willowSquare, timeOfDay: hour }, (s) => s.camera.inside(id, { zoom: 1 }));
        const f = sc.frame(0);
        const out = new Surface(480, 270);
        renderer.render(f, out);
        const x0 = Math.round(f.camera.x - 240);
        const y0 = Math.round(f.camera.y - 135);
        const odd: string[] = [];
        // the middle of every ink tile, clear of the wall cap drawn along its inner edge
        for (let ty = 0; ty < room.h; ty++) {
          for (let tx = 0; tx < room.w; tx++) {
            if (!art.terrain[room.terrain[ty * room.w + tx]!]?.outside) continue;
            for (const [dx, dy] of [[8, 8], [6, 6], [10, 10]] as const) {
              const sx = tx * TILE + dx - x0;
              const sy = ty * TILE + dy - y0;
              if (sx < 0 || sy < 0 || sx >= 480 || sy >= 270) continue;
              const o = (sy * 480 + sx) * 4;
              const px = [out.data[o]!, out.data[o + 1]!, out.data[o + 2]!];
              if (px.join() !== ink.join()) odd.push(`[${tx}, ${ty}] ${px.join(',')}`);
            }
          }
        }
        expect(odd.slice(0, 3), `${id} at ${hour}:00`).toEqual([]);
      }
    }
  });
});

describe('rendering a room', () => {
  const sc = build((s) => {
    s.actor('bo', { at: 'bakery:counter' });
    s.actor('ana', { at: 'bakery:window' });
    s.camera.inside('bakery');
  });
  const draw = (state: FrameState, warn: (m: string) => void = () => {}) => {
    const out = new Surface(480, 270);
    createRenderer(townWithRoom, { art: roomArt, warn }).render(state, out);
    return out;
  };
  const ink = lutRgb(compileTheme(daylight), 'steel.0');
  const px = (s: Surface, x: number, y: number) => [s.data[(y * s.w + x) * 4]!, s.data[(y * s.w + x) * 4 + 1]!, s.data[(y * s.w + x) * 4 + 2]!];
  const mean = (s: Surface, x0: number, y0: number, x1: number, y1: number) => {
    const sum = [0, 0, 0];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px(s, x, y).forEach((v, i) => (sum[i]! += v));
    return sum.map((v) => v / ((x1 - x0) * (y1 - y0)));
  };

  it('draws the room, with ink beyond its walls', () => {
    const f = sc.frame(0);
    const room = draw(f);
    const street = draw({ ...f, interior: undefined });
    expect(Buffer.from(room.data).equals(Buffer.from(street.data))).toBe(false);
    // the room is 192 x 112 pixels, 384 x 224 at zoom 2: a band of ink on every side
    expect(px(room, 10, 135)).toEqual([...ink]);
    expect(px(room, 240, 5)).toEqual([...ink]);
    expect(px(room, 240, 135)).not.toEqual([...ink]);
  });

  it('warns once about an unknown room and draws the town instead', () => {
    const warnings: string[] = [];
    const r = createRenderer(townWithRoom, { art: roomArt, warn: (m) => warnings.push(m) });
    const out = new Surface(480, 270);
    const f = { ...sc.frame(0), interior: 'cellar' };
    r.render(f, out);
    r.render(f, out);
    expect(warnings).toEqual(['simutown render: unknown room "cellar", drawn as the town outside. Known rooms: bakery']);
  });

  it('is never blue at night: lamps on, gently dimmed and warm', () => {
    const lut = compileTheme(daylight);
    const noon = indoorConditionAt(12, lut);
    expect(noon.identity).toBe(true);
    expect(noon.cast).toBe(0);
    expect(noon.lamps).toBe(0);
    for (const hour of [18, 22, 2]) {
      const c = indoorConditionAt(hour, lut);
      expect(c.lamps).toBe(1);
      expect(c.cast).toBe(0);
      expect(c.mul[0]).toBeGreaterThan(c.mul[2]);
      expect(Math.min(...c.mul)).toBeGreaterThan(0.6);
    }
    const day = mean(draw(sc.frame(0)), 60, 100, 420, 240);
    const night = mean(draw({ ...sc.frame(0), timeOfDay: 22 }), 60, 100, 420, 240);
    const lum = (c: number[]) => c[0]! * 0.3 + c[1]! * 0.59 + c[2]! * 0.11;
    expect(lum(night)).toBeGreaterThan(lum(day) * 0.75);
    expect(night[0]! / night[2]!).toBeGreaterThan(day[0]! / day[2]!);
  });
});
