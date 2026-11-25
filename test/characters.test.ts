/**
 * The character kit: makeCharacter over a wide range of specs, its error messages, the
 * style rules a machine can check (closed outlines, no ground colours, plain backs of
 * heads), and the built-in cast.
 */
import { describe, expect, it } from 'vitest';
import { CHARACTER_OPTIONS, type CharacterSpec, characters, makeCharacter, person, POSES, townsfolk } from '../src/art/characters';
import { openOutline, silhouette } from '../src/art/characters/lint';
import { reviewHeads, reviewOutfits } from '../src/art/characters/review';
import { slotIndex } from '../src/core/palette';
import { flipX, type Sprite } from '../src/core/sprite';
import { CHAR_H, CHAR_W, type CharacterDef, type Dir } from '../src/core/types';

const O = CHARACTER_OPTIONS;
const DIRS: Dir[] = ['down', 'up', 'left', 'right'];
const INK = slotIndex('steel.0');

const spec = (more: Partial<CharacterSpec> = {}): CharacterSpec => ({
  id: 'test',
  name: 'Test',
  skin: 'a',
  head: 'short',
  top: { kind: 'shirt', color: 'teal' },
  ...more,
});

const sets = (def: CharacterDef): Record<string, Record<Dir, Sprite[]>> => ({ idle: def.idle, walk: def.walk, ...def.poses });
const allSprites = (def: CharacterDef): Sprite[] => [...new Set(Object.values(sets(def)).flatMap((set) => DIRS.flatMap((d) => set[d])))];
const at = (s: Sprite, x: number, y: number) => s.px[y * s.w + x]!;
const topRow = (s: Sprite) => Math.floor(s.px.findIndex((v) => v !== 0) / s.w);
const same = (a: Sprite, b: Sprite) => a.px.every((v, i) => v === b.px[i]);

/** The checks every character must pass, whatever it wears. */
function expectWellFormed(def: CharacterDef): void {
  expect(Object.keys(def.poses ?? {})).toEqual([...POSES]);
  for (const dir of DIRS) {
    expect(def.idle[dir]).toHaveLength(2);
    expect(def.walk[dir]).toHaveLength(4);
    for (const pose of POSES) expect(def.poses![pose]![dir].length).toBeGreaterThan(0);
  }
  for (const s of allSprites(def)) {
    expect([s.w, s.h, s.ax, s.ay]).toEqual([CHAR_W, CHAR_H, 8, 24]);
    const open = openOutline(s);
    if (open.length > 0) throw new Error(`${def.id}: open outline at ${open.join(' ')}\n${silhouette(s)}`);
  }
}

describe('makeCharacter', () => {
  it('builds four directions of idle, walk and every pose from the smallest spec', () => {
    const def = makeCharacter(spec());
    expect(def.id).toBe('test');
    expect(def.name).toBe('Test');
    expect(def.walkFps).toBe(8);
    expectWellFormed(def);
  });

  it('accepts every head with every hair colour and skin tone', () => {
    for (const head of O.head) {
      for (const hair of O.hair) {
        for (const skin of O.skin) expectWellFormed(makeCharacter(spec({ head, hair, skin, accent: 'pink' })));
      }
    }
  });

  it('accepts every hat over every head, on every body', () => {
    for (const kind of O.hat) {
      for (const head of O.head) {
        for (const body of O.body) expectWellFormed(makeCharacter(spec({ head, body, hat: { kind } })));
      }
    }
  });

  it('accepts every top on every bottom, body and sleeve length', () => {
    for (const kind of O.top) {
      for (const bottom of O.bottom) {
        if (kind === 'dress' && bottom !== 'skirt') continue;
        for (const body of O.body) {
          for (const sleeves of O.sleeves) {
            expectWellFormed(makeCharacter(spec({ body, top: { kind, color: 'red', sleeves }, bottom: { kind: bottom, color: 'navy' }, accent: 'yellow' })));
          }
        }
      }
    }
  });

  it('accepts every accessory, alone and together, on every body', () => {
    const kits: CharacterSpec['accessories'][] = [{ glasses: true }, { scarf: 'red' }, { bag: 'brown' }, { cane: true }, { glasses: true, scarf: 'blue', bag: 'tan', cane: true }];
    for (const accessories of kits) {
      for (const body of O.body) {
        for (const bottom of O.bottom) {
          expectWellFormed(makeCharacter(spec({ body, accessories, beard: true, head: 'long', bottom: { kind: bottom, color: 'grey' } })));
        }
      }
    }
  });

  it('accepts every colour name, and palette slots', () => {
    for (const color of O.color) expectWellFormed(makeCharacter(spec({ top: { kind: 'coat', color }, shoes: color, accent: color })));
    expectWellFormed(makeCharacter(spec({ top: { kind: 'shirt', color: 'plum.1' }, bottom: { kind: 'skirt', color: 'brick.0' }, shoes: 'steel.1' })));
  });

  it('the review casts cover the whole library with closed outlines', () => {
    const defs = [...reviewHeads(), ...reviewOutfits()];
    expect(defs.length).toBeGreaterThan(60);
    for (const def of defs) expectWellFormed(def);
  });

  it('is deterministic, and left is right mirrored', () => {
    const a = makeCharacter(spec({ head: 'ponytail', accessories: { bag: 'brown' } }));
    const b = makeCharacter(spec({ head: 'ponytail', accessories: { bag: 'brown' } }));
    for (const [pose, set] of Object.entries(sets(a))) {
      for (const dir of DIRS) {
        set[dir].forEach((s, i) => expect(same(s, sets(b)[pose]![dir][i]!)).toBe(true));
      }
      set.right.forEach((s, i) => expect(same(flipX(s), set.left[i]!)).toBe(true));
    }
  });

  it('puts the eyes where the style guide says, on every head', () => {
    for (const head of O.head) {
      const def = makeCharacter(spec({ head }));
      const front = def.idle.down[0]!;
      const side = def.idle.right[0]!;
      for (const y of [9, 10]) {
        expect([at(front, 5, y), at(front, 10, y)]).toEqual([INK, INK]);
        expect(at(side, 11, y)).toBe(INK);
      }
      // cheeks on the row under the eyes
      expect(at(front, 4, 11)).toBe(slotIndex('rose.1'));
      expect(at(front, 11, 11)).toBe(slotIndex('rose.1'));
    }
  });

  it('keeps the back of every bare head plain: no ink inside it', () => {
    for (const head of O.head) {
      const back = makeCharacter(spec({ head })).idle.up[0]!;
      for (let y = 4; y <= 10; y++) {
        const row = Array.from({ length: CHAR_W }, (_, x) => at(back, x, y));
        // between the outline on the left and the outline on the right there is only colour
        const isColour = (v: number) => v !== 0 && v !== INK;
        const first = row.findIndex(isColour);
        const last = row.length - 1 - [...row].reverse().findIndex(isColour);
        const inside = row.slice(first, last + 1);
        expect(inside.filter((v) => v === INK), `${head} row ${y}`).toEqual([]);
      }
    }
  });

  it('never wears the ground colours', () => {
    const ground = [slotIndex('moss.2'), slotIndex('cream.1')];
    for (const def of [...Object.values(characters), ...reviewHeads(), ...reviewOutfits()]) {
      for (const s of allSprites(def)) expect(s.px.some((v) => ground.includes(v))).toBe(false);
    }
  });

  it('draws a child three pixels shorter and an elder one pixel shorter than an adult', () => {
    const top = (body: CharacterSpec['body']) => topRow(makeCharacter(spec({ body })).idle.down[0]!);
    expect(top('child') - top('adult')).toBe(3);
    expect(top('elder') - top('adult')).toBe(1);
    expect(top('broad')).toBe(top('adult'));
  });

  it('draws a broad adult wider than an adult', () => {
    const width = (body: CharacterSpec['body']) => {
      const s = makeCharacter(spec({ body })).idle.down[0]!;
      const row = Array.from({ length: CHAR_W }, (_, x) => at(s, x, 16));
      return row.filter((v) => v !== 0).length;
    };
    expect(width('broad')).toBe(width('adult') + 2);
  });

  it('makes each step of the walk a different silhouette from standing', () => {
    for (const body of O.body) {
      for (const bottom of O.bottom) {
        const def = makeCharacter(spec({ body, bottom: { kind: bottom, color: 'navy' } }));
        for (const dir of DIRS) {
          const [stepA, standA, stepB, standB] = def.walk[dir].map(silhouette);
          expect(standA).toBe(standB);
          expect(stepA).not.toBe(standA);
          expect(stepB).not.toBe(standA);
          expect(stepA).not.toBe(stepB);
        }
      }
    }
  });

  it('shows options where they belong', () => {
    const plain = makeCharacter(spec());
    const glasses = makeCharacter(spec({ accessories: { glasses: true } }));
    expect(same(plain.idle.down[0]!, glasses.idle.down[0]!)).toBe(false);
    expect(same(plain.idle.right[0]!, glasses.idle.right[0]!)).toBe(false);
    // nothing of a pair of glasses shows from behind
    expect(same(plain.idle.up[0]!, glasses.idle.up[0]!)).toBe(true);
    // a hat changes the silhouette, a colour does not
    const hat = makeCharacter(spec({ hat: { kind: 'chef-hat' } }));
    expect(silhouette(hat.idle.down[0]!)).not.toBe(silhouette(plain.idle.down[0]!));
    const red = makeCharacter(spec({ top: { kind: 'shirt', color: 'red' } }));
    expect(silhouette(red.idle.down[0]!)).toBe(silhouette(plain.idle.down[0]!));
    expect(same(red.idle.down[0]!, plain.idle.down[0]!)).toBe(false);
  });

  it('a dress brings its own skirt in the colour of the top', () => {
    const dress = makeCharacter(spec({ top: { kind: 'dress', color: 'purple' } }));
    const twoPiece = makeCharacter(spec({ top: { kind: 'shirt', color: 'purple' }, bottom: { kind: 'skirt', color: 'purple' } }));
    expect(same(dress.idle.down[0]!, twoPiece.idle.down[0]!)).toBe(true);
  });

  it('passes walkFps and idleFps through, and children step faster by default', () => {
    expect(makeCharacter(spec({ body: 'child' })).walkFps).toBe(10);
    const def = makeCharacter(spec({ walkFps: 6, idleFps: 1 }));
    expect([def.walkFps, def.idleFps]).toEqual([6, 1]);
    expect(makeCharacter(spec()).idleFps).toBeUndefined();
  });
});

describe('makeCharacter errors', () => {
  const bad = (more: Record<string, unknown>) => () => makeCharacter({ ...spec(), ...more } as CharacterSpec);

  it('lists the valid heads, hair colours, skins, bodies and hats', () => {
    expect(bad({ head: 'mohawk' })).toThrow(/makeCharacter\("test"\): unknown head "mohawk"\. Valid: short, flattop, quiff, bowl, bob, long, bun, ponytail, braids, curls, spiky, bald, balding\./);
    expect(bad({ hair: 'green' })).toThrow(/unknown hair "green"\. Valid: brown, black, white, blond, ginger\./);
    expect(bad({ skin: 'pale' })).toThrow(/unknown skin "pale"\. Valid: a, b, c\./);
    expect(bad({ skin: undefined })).toThrow(/unknown skin undefined\. Valid: a, b, c\./);
    expect(bad({ body: 'giant' })).toThrow(/unknown body "giant"\. Valid: adult, broad, child, elder\./);
    expect(bad({ hat: { kind: 'crown' } })).toThrow(/unknown hat\.kind "crown"\. Valid: straw-hat, cap, beret, headscarf, chef-hat\./);
    expect(bad({ hat: 'cap' })).toThrow(/`hat` must be an object such as \{ kind: 'cap', color: 'blue' \}\. Kinds: straw-hat, cap/);
  });

  it('lists the valid clothes', () => {
    expect(bad({ top: { kind: 'cape', color: 'red' } })).toThrow(/unknown top\.kind "cape"\. Valid: shirt, sweater, apron, coat, dress, overalls, uniform\./);
    expect(bad({ top: 'shirt' })).toThrow(/`top` must be an object such as \{ kind: 'shirt', color: 'teal' \}\. Kinds: shirt, sweater/);
    expect(bad({ top: { kind: 'shirt', color: 'teal', sleeves: 'puffy' } })).toThrow(/unknown top\.sleeves "puffy"\. Valid: short, long\./);
    expect(bad({ bottom: { kind: 'kilt', color: 'red' } })).toThrow(/unknown bottom\.kind "kilt"\. Valid: trousers, skirt, shorts\./);
    expect(bad({ top: { kind: 'dress', color: 'red' }, bottom: { kind: 'trousers', color: 'navy' } })).toThrow(/a dress brings its own skirt, so `bottom` must be left out \(got kind "trousers"\)/);
  });

  it('lists the colour names, and explains the slots nobody may wear', () => {
    expect(bad({ top: { kind: 'shirt', color: 'turquoise' } })).toThrow(/top\.color: unknown colour "turquoise"\. Colour names: red, orange, yellow, green, teal, blue/);
    expect(bad({ top: { kind: 'shirt' } })).toThrow(/top\.color needs a colour\. Colour names: red, orange/);
    expect(bad({ shoes: 'moss.2' })).toThrow(/shoes: "moss\.2" cannot be worn, it is the grass colour/);
    expect(bad({ accent: 'cream.1' })).toThrow(/accent: "cream\.1" cannot be worn, it is the paving colour/);
    expect(bad({ accessories: { scarf: 'steel.0' } })).toThrow(/accessories\.scarf: "steel\.0" cannot be worn, ink is for outlines and eyes only/);
  });

  it('names unknown options and accessories', () => {
    expect(bad({ hairColor: 'black' })).toThrow(/unknown option "hairColor"\. Valid: id, name, body, skin, head, hair, hat, beard, top, bottom, shoes, accent, accessories, walkFps, idleFps\./);
    expect(bad({ accessories: { monocle: true } })).toThrow(/unknown accessory "monocle"\. Valid: glasses, scarf, bag, cane\./);
    expect(bad({ accessories: ['glasses'] })).toThrow(/`accessories` must be an object such as \{ glasses: true, scarf: 'red' \}/);
    expect(bad({ top: { kind: 'shirt', color: 'teal', colour: 'red' } })).toThrow(/unknown key in `top` "colour"\. Valid: kind, color, sleeves, apron\./);
  });

  it('asks for an id and a name', () => {
    expect(() => makeCharacter({ ...spec(), id: '' })).toThrow(/the spec needs an `id`/);
    expect(() => makeCharacter({ ...spec(), name: '' })).toThrow(/makeCharacter\("test"\): the spec needs a `name`/);
    expect(() => makeCharacter(undefined as unknown as CharacterSpec)).toThrow(/expected a spec object\. Required: id, name, skin, head, top\./);
  });
});

describe('person', () => {
  const head = `
    ................
    ................
    ....00000000....
    ...0qqqqqqqq0...
    ..0qqqqqqqqqq0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SSSSSSSSSS0..
    ..0SS0SSSS0SS0..
    ..0SS0SSSS0SS0..
    ..0SSSSSSSSSS0..
    ...0SSSSSSSS0...
    ....00000000....
  `;
  const legend = { S: 'skin.b.1', K: 'skin.b.0', T: 'brick.1', U: 'brick.0', P: 'sky.0', Q: 'steel.1', F: 'wood.0' } as const;

  it('builds a full character around hand-drawn heads, palette letters included', () => {
    const def = person({ id: 'custom', name: 'Custom', legend, head: { down: head, up: head, right: head } });
    expectWellFormed(def);
    expect(at(def.idle.down[0]!, 5, 3)).toBe(slotIndex('ochre.2'));
    expectWellFormed(person({ id: 'custom', name: 'Custom', legend, body: 'dress', shape: 'child', head: { down: head, up: head, right: head } }));
  });

  it('says which roles the legend is missing', () => {
    expect(() => person({ id: 'custom', name: 'Custom', legend: { S: 'skin.a.1', T: 'teal.1' }, head: { down: head, up: head, right: head } })).toThrow(
      /person "custom": the legend has no slot for K, U, P, Q, F\. The body needs: S, K, T, U, P, Q, F\./,
    );
  });

  it('rejects a head grid of the wrong size', () => {
    const short = head.split('\n').slice(0, 8).join('\n');
    expect(() => person({ id: 'custom', name: 'Custom', legend, head: { down: short, up: head, right: head } })).toThrow(/head\.down is 7 rows tall, expected 14 to 23/);
  });
});

describe('the cast', () => {
  it('has at least twelve townsfolk, the reference three among them', () => {
    expect(Object.keys(characters).length).toBeGreaterThanOrEqual(12);
    for (const id of ['ana', 'tomas', 'mira']) expect(characters[id]).toBeDefined();
  });

  it('describes every character in `townsfolk`, in the same order', () => {
    expect(townsfolk.map((t) => t.id)).toEqual(Object.keys(characters));
    for (const t of townsfolk) {
      expect(characters[t.id]!.name).toBe(t.name);
      expect(t.role.length).toBeGreaterThan(2);
      expect(t.description.length).toBeGreaterThan(30);
    }
    expect(new Set(townsfolk.map((t) => t.name)).size).toBe(townsfolk.length);
    const roles = townsfolk.map((t) => t.role);
    for (const role of ['baker', 'teacher', 'child', 'elder', 'postal worker', 'shopkeeper', 'gardener', 'student', 'doctor']) expect(roles).toContain(role);
  });

  it('is well formed, with every pose', () => {
    for (const def of Object.values(characters)) expectWellFormed(def);
  });

  it('gives everyone their own silhouette, from the front and from the side', () => {
    for (const dir of ['down', 'right'] as Dir[]) {
      const shapes = Object.values(characters).map((def) => silhouette(def.idle[dir][0]!).replace(/#/g, 'o'));
      expect(new Set(shapes).size).toBe(shapes.length);
    }
  });
});
