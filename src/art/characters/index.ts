/**
 * The townsfolk of Willow Square, and the kit that makes them.
 *
 *   import { characters, townsfolk, makeCharacter } from './art/characters';
 *
 * `characters` is the registry the renderer and scenes use. `townsfolk` describes the same
 * people in words, so a scene author can cast without seeing the picture. To add someone,
 * call `makeCharacter` (see make.ts for the options) and register the result under its id.
 */
import type { CharacterDef } from '../../core/types';
import { type CharacterSpec, makeCharacter } from './make';

export { makeCharacter, CHARACTER_OPTIONS, type CharacterSpec } from './make';
export { person, type PersonSpec } from './kit';
export { POSES, type PoseName, type BodyLayer } from './build';
export { CLOTH, HAIR, SKINS, type ClothColor, type ClothName, type HairColor, type SkinTone } from './colors';
export { HATS, HEADS, type HatName, type HeadName } from './heads';
export type { ShapeName } from './bodies';
export type { BottomKind, SleeveKind, TopKind } from './outfits';

/** A townsperson in words: who they are and how to recognise them. */
export interface Townsperson {
  /** Key in `characters`, and what a scene passes to `s.actor()`. */
  id: string;
  name: string;
  /** Their job or place in the town, e.g. 'baker'. */
  role: string;
  /** How they look, in one sentence: build, hair or hat, clothes, what they carry. */
  description: string;
}

interface Entry {
  role: string;
  description: string;
  spec: CharacterSpec;
}

// Keep the ids `ana`, `tomas` and `mira`: fixtures, tests and the style key use them.
const CAST: Entry[] = [
  {
    role: 'neighbour',
    description: 'A young woman with a brown bun tied with a pink ribbon, a teal jumper and dark purple trousers.',
    spec: {
      id: 'ana',
      name: 'Ana',
      skin: 'a',
      head: 'bun',
      hair: 'brown',
      top: { kind: 'shirt', color: 'teal', sleeves: 'long' },
      bottom: { kind: 'trousers', color: 'indigo' },
      accent: 'rose.0',
    },
  },
  {
    role: 'gardener',
    description: 'An older man with dark skin, a wide straw hat, white hair over the ears and a small white chin tuft, in a blue shirt and brown trousers.',
    spec: {
      id: 'tomas',
      name: 'Tomas',
      skin: 'c',
      head: 'balding',
      hair: 'white',
      hat: { kind: 'straw-hat' },
      beard: true,
      top: { kind: 'shirt', color: 'blue', sleeves: 'long' },
      bottom: { kind: 'trousers', color: 'brown' },
      shoes: 'charcoal',
      accent: 'brown',
    },
  },
  {
    role: 'florist',
    description: 'A young woman with long straight black hair over her shoulders, a white blouse and a pink skirt.',
    spec: {
      id: 'mira',
      name: 'Mira',
      skin: 'b',
      head: 'long',
      hair: 'black',
      top: { kind: 'shirt', color: 'white', sleeves: 'long' },
      bottom: { kind: 'skirt', color: 'pink' },
      shoes: 'maroon',
    },
  },
  {
    role: 'baker',
    description: 'A broad man in a tall white chef\'s hat and a white apron over a yellow shirt, with a ginger chin tuft.',
    spec: {
      id: 'bo',
      name: 'Bo',
      body: 'broad',
      skin: 'a',
      head: 'short',
      hair: 'ginger',
      hat: { kind: 'chef-hat' },
      beard: true,
      top: { kind: 'apron', color: 'yellow' },
      bottom: { kind: 'trousers', color: 'slate' },
    },
  },
  {
    role: 'teacher',
    description: 'A woman with a black bob and glasses, in a purple jumper and a grey skirt.',
    spec: {
      id: 'yuki',
      name: 'Yuki',
      skin: 'a',
      head: 'bob',
      hair: 'black',
      top: { kind: 'sweater', color: 'purple' },
      bottom: { kind: 'skirt', color: 'grey' },
      shoes: 'charcoal',
      accessories: { glasses: true },
    },
  },
  {
    role: 'child',
    description: 'A small boy with dark skin and spiky black hair, in an orange T-shirt and blue shorts.',
    spec: {
      id: 'kofi',
      name: 'Kofi',
      body: 'child',
      skin: 'c',
      head: 'spiky',
      hair: 'black',
      top: { kind: 'shirt', color: 'orange' },
      bottom: { kind: 'shorts', color: 'navy' },
      shoes: 'red',
    },
  },
  {
    role: 'child',
    description: 'A small girl with two long brown plaits tied in yellow, in a red pinafore over a white shirt.',
    spec: {
      id: 'lin',
      name: 'Lin',
      body: 'child',
      skin: 'b',
      head: 'braids',
      hair: 'brown',
      top: { kind: 'overalls', color: 'white' },
      bottom: { kind: 'skirt', color: 'red' },
      accent: 'yellow',
    },
  },
  {
    role: 'elder',
    description: 'A stooped old man who walks with a cane: bald on top with white hair over the ears, glasses, a long tan coat.',
    spec: {
      id: 'otto',
      name: 'Otto',
      body: 'elder',
      skin: 'a',
      head: 'balding',
      hair: 'white',
      top: { kind: 'coat', color: 'tan' },
      bottom: { kind: 'trousers', color: 'charcoal' },
      accessories: { glasses: true, cane: true },
    },
  },
  {
    role: 'postal worker',
    description: 'A man in a blue peaked cap and a blue uniform with a yellow collar, a brown satchel on a strap across his chest.',
    spec: {
      id: 'raj',
      name: 'Raj',
      skin: 'b',
      head: 'short',
      hair: 'black',
      hat: { kind: 'cap', color: 'blue' },
      top: { kind: 'uniform', color: 'blue' },
      bottom: { kind: 'trousers', color: 'navy' },
      shoes: 'charcoal',
      accent: 'yellow',
      accessories: { bag: 'brown' },
    },
  },
  {
    role: 'shopkeeper',
    description: 'A woman with dark skin and a big cloud of black curls, in a cream apron over a red shirt and a grey-blue skirt.',
    spec: {
      id: 'zara',
      name: 'Zara',
      skin: 'c',
      head: 'curls',
      hair: 'black',
      top: { kind: 'apron', color: 'red', apron: 'cream' },
      bottom: { kind: 'skirt', color: 'slate' },
    },
  },
  {
    role: 'student',
    description: 'A young man with a brown quiff, a green jumper, a yellow scarf and a grey-blue satchel.',
    spec: {
      id: 'emil',
      name: 'Emil',
      skin: 'a',
      head: 'quiff',
      hair: 'brown',
      top: { kind: 'sweater', color: 'green' },
      bottom: { kind: 'trousers', color: 'tan' },
      accessories: { scarf: 'yellow', bag: 'slate' },
    },
  },
  {
    role: 'doctor',
    description: 'A woman in a teal headscarf and glasses, wearing a long white coat over navy trousers.',
    spec: {
      id: 'noor',
      name: 'Noor',
      skin: 'b',
      head: 'short',
      hair: 'black',
      hat: { kind: 'headscarf', color: 'teal' },
      top: { kind: 'coat', color: 'white' },
      bottom: { kind: 'trousers', color: 'navy' },
      shoes: 'charcoal',
      accessories: { glasses: true },
    },
  },
  {
    role: 'carpenter',
    description: 'A broad man with dark skin and a black flat-top, in brown overalls over a cream shirt.',
    spec: {
      id: 'idris',
      name: 'Idris',
      body: 'broad',
      skin: 'c',
      head: 'flattop',
      hair: 'black',
      top: { kind: 'overalls', color: 'cream' },
      bottom: { kind: 'trousers', color: 'brown' },
      shoes: 'charcoal',
    },
  },
  {
    role: 'painter',
    description: 'A woman in a red beret over a ginger ponytail, with a grey-blue jumper and a yellow skirt.',
    spec: {
      id: 'pia',
      name: 'Pia',
      skin: 'a',
      head: 'ponytail',
      hair: 'ginger',
      hat: { kind: 'beret', color: 'red' },
      top: { kind: 'sweater', color: 'slate' },
      bottom: { kind: 'skirt', color: 'yellow' },
    },
  },
];

/** The built-in townsfolk, by id. */
export const characters: Record<string, CharacterDef> = Object.fromEntries(CAST.map((e) => [e.spec.id, makeCharacter(e.spec)]));

/** The same people in words, in the order of `characters`: cast from this without seeing the picture. */
export const townsfolk: Townsperson[] = CAST.map((e) => ({ id: e.spec.id, name: e.spec.name, role: e.role, description: e.description }));
