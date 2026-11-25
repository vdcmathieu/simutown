/**
 * `makeCharacter`: mint a townsperson from a few named choices.
 *
 *   const lena = makeCharacter({
 *     id: 'lena',
 *     name: 'Lena',
 *     skin: 'b',
 *     head: 'bob',
 *     hair: 'ginger',
 *     top: { kind: 'apron', color: 'teal' },
 *     bottom: { kind: 'skirt', color: 'indigo' },
 *     accessories: { glasses: true },
 *   });
 *
 * The result is a complete CharacterDef: four directions, a 2-frame idle, a 4-frame walk
 * and the poses `sit`, `wave`, `talk` and `carry`. Register it under its id in an
 * ArtRegistry's `characters` and scenes can cast it with `s.actor('lena', ...)`.
 *
 * Every choice is checked: a wrong name throws an error that lists the valid ones.
 */
import type { Slot } from '../../core/palette';
import type { Legend } from '../../core/sprite';
import type { CharacterDef } from '../../core/types';
import { BAG, CANE } from './accessories';
import { SHAPES, type ShapeName } from './bodies';
import { build, type BodyLayer } from './build';
import { CLOTH, type ClothColor, clothTones, HAIR, type HairColor, SKINS, type SkinTone } from './colors';
import { type Grid, mapChars, overTall } from './grid';
import { BEARD, GLASSES, HATS, type HatName, HEADS, type HeadName, SCARF } from './heads';
import { BOTTOMS, type BottomKind, DEFAULT_SLEEVES, SLEEVES, type SleeveKind, TOPS, type TopKind, type View, type ZoneMap, zonesFor } from './outfits';

/** What `makeCharacter` needs to know about a person. Only `id`, `name`, `skin`, `head` and `top` are required. */
export interface CharacterSpec {
  /** Key in the art registry, and what scenes pass to `s.actor()`. Lowercase, e.g. 'lena'. */
  id: string;
  /** Display name, e.g. 'Lena'. */
  name: string;
  /**
   * Body shape. Default 'adult'.
   * - 'adult': the standard body, two heads tall.
   * - 'broad': the same height, two pixels wider across the shoulders.
   * - 'child': three pixels shorter under the same big head.
   * - 'elder': stooped, the head carried a pixel lower and further forward. Add a cane.
   */
  body?: ShapeName;
  /** Skin tone: 'a' light, 'b' medium, 'c' dark. */
  skin: SkinTone;
  /**
   * Hair style: 'short', 'flattop', 'quiff', 'bowl', 'bob', 'long', 'bun', 'ponytail',
   * 'braids', 'curls', 'spiky', 'bald' or 'balding'.
   */
  head: HeadName;
  /** Hair colour: 'brown', 'black', 'white', 'blond' or 'ginger'. Default 'brown'. */
  hair?: HairColor;
  /**
   * Headwear over the hair: 'straw-hat', 'cap', 'beret', 'headscarf' or 'chef-hat'.
   * Hair that hangs below the hat still shows. Default colours: straw yellow, a white
   * chef's hat, and red for the others.
   */
  hat?: { kind: HatName; color?: ClothColor };
  /** A small chin tuft in the hair colour. */
  beard?: boolean;
  /**
   * The top. `kind` is 'shirt', 'sweater', 'apron' (over a shirt in `color`), 'coat'
   * (long, covers the hips), 'dress' (top and skirt in one colour), 'overalls' (a bib in
   * the colour of the legs, over a shirt in `color`) or 'uniform' (a collar in the accent
   * colour). `sleeves` defaults to short for shirt, apron, dress and overalls, long for
   * the others. `apron` is the apron's own colour, default 'white'.
   */
  top: { kind: TopKind; color: ClothColor; sleeves?: SleeveKind; apron?: ClothColor };
  /**
   * The legs: 'trousers', 'skirt' or 'shorts'. Default navy trousers. With a dress, leave
   * it out: a dress brings its own skirt.
   */
  bottom?: { kind: BottomKind; color: ClothColor };
  /** Shoe colour. Default 'brown'. Shoes take the dark tone of the colour. */
  shoes?: ClothColor;
  /**
   * The one small accent of the outfit: a bun's ribbon, the ties of braids, a hat band or
   * badge, a uniform's collar. Without it those take a shade of what they sit on.
   */
  accent?: ClothColor;
  /**
   * Extras. `glasses`; a `scarf` and a `bag` (a satchel on a strap) in the colour given;
   * a `cane`, held in one hand and put away to carry things.
   */
  accessories?: { glasses?: boolean; scarf?: ClothColor; bag?: ClothColor; cane?: boolean };
  /** Walk-cycle frames per second. Default 8, or 10 for a child's quicker steps. */
  walkFps?: number;
  /** Idle frames per second. Default 2. */
  idleFps?: number;
}

/** Every option of `makeCharacter` with its valid values, for menus, tests and error messages. */
export const CHARACTER_OPTIONS = {
  body: Object.keys(SHAPES) as ShapeName[],
  skin: Object.keys(SKINS) as SkinTone[],
  head: Object.keys(HEADS) as HeadName[],
  hair: Object.keys(HAIR) as HairColor[],
  hat: Object.keys(HATS) as HatName[],
  top: [...TOPS],
  bottom: [...BOTTOMS],
  sleeves: [...SLEEVES],
  color: Object.keys(CLOTH) as (keyof typeof CLOTH)[],
  accessories: ['glasses', 'scarf', 'bag', 'cane'] as const,
};

const SPEC_KEYS = ['id', 'name', 'body', 'skin', 'head', 'hair', 'hat', 'beard', 'top', 'bottom', 'shoes', 'accent', 'accessories', 'walkFps', 'idleFps'];

const DEFAULT_HAT_COLOR: Record<HatName, ClothColor> = {
  'straw-hat': 'yellow',
  cap: 'red',
  beret: 'red',
  headscarf: 'red',
  'chef-hat': 'white',
};

/** Check that `value` is one of `valid`, or throw naming the option and listing the choices. */
function oneOf<T extends string>(who: string, option: string, value: unknown, valid: readonly T[]): T {
  if (typeof value === 'string' && (valid as readonly string[]).includes(value)) return value as T;
  throw new Error(`makeCharacter(${who}): unknown ${option} ${JSON.stringify(value)}. Valid: ${valid.join(', ')}.`);
}

function onlyKeys(who: string, what: string, obj: object, valid: readonly string[]): void {
  const extra = Object.keys(obj).filter((k) => !valid.includes(k));
  if (extra.length > 0) throw new Error(`makeCharacter(${who}): unknown ${what} ${extra.map((k) => `"${k}"`).join(', ')}. Valid: ${valid.join(', ')}.`);
}

/** Build a townsperson from named parts. See CharacterSpec for the options. */
export function makeCharacter(spec: CharacterSpec): CharacterDef {
  if (typeof spec !== 'object' || spec === null) throw new Error('makeCharacter: expected a spec object. Required: id, name, skin, head, top.');
  if (typeof spec.id !== 'string' || spec.id === '') throw new Error('makeCharacter: the spec needs an `id`, e.g. "lena".');
  const who = `"${spec.id}"`;
  if (typeof spec.name !== 'string' || spec.name === '') throw new Error(`makeCharacter(${who}): the spec needs a \`name\`, e.g. "Lena".`);
  onlyKeys(who, 'option', spec, SPEC_KEYS);
  const O = CHARACTER_OPTIONS;
  const color = (what: string, c: unknown) => {
    if (typeof c !== 'string') throw new Error(`makeCharacter(${who}): ${what} needs a colour. Colour names: ${O.color.join(', ')}.`);
    return clothTones(c, `makeCharacter(${who}): ${what}`);
  };

  const shape = oneOf(who, 'body', spec.body ?? 'adult', O.body);
  const skin = SKINS[oneOf(who, 'skin', spec.skin, O.skin)];
  const headName = oneOf(who, 'head', spec.head, O.head);
  const hair = HAIR[oneOf(who, 'hair', spec.hair ?? 'brown', O.hair)];

  if (typeof spec.top !== 'object' || spec.top === null) {
    throw new Error(`makeCharacter(${who}): \`top\` must be an object such as { kind: 'shirt', color: 'teal' }. Kinds: ${O.top.join(', ')}.`);
  }
  onlyKeys(who, 'key in `top`', spec.top, ['kind', 'color', 'sleeves', 'apron']);
  const topKind = oneOf(who, 'top.kind', spec.top.kind, O.top);
  const top = color('top.color', spec.top.color);
  const sleeves = oneOf(who, 'top.sleeves', spec.top.sleeves ?? DEFAULT_SLEEVES[topKind], O.sleeves);
  const apron = color('top.apron', spec.top.apron ?? 'white');

  if (spec.bottom !== undefined && (typeof spec.bottom !== 'object' || spec.bottom === null)) {
    throw new Error(`makeCharacter(${who}): \`bottom\` must be an object such as { kind: 'trousers', color: 'navy' }. Kinds: ${O.bottom.join(', ')}.`);
  }
  if (spec.bottom) onlyKeys(who, 'key in `bottom`', spec.bottom, ['kind', 'color']);
  let bottomKind: BottomKind = oneOf(who, 'bottom.kind', spec.bottom?.kind ?? 'trousers', O.bottom);
  let bottom = color('bottom.color', spec.bottom?.color ?? 'navy');
  if (topKind === 'dress') {
    if (spec.bottom && spec.bottom.kind !== 'skirt') {
      throw new Error(`makeCharacter(${who}): a dress brings its own skirt, so \`bottom\` must be left out (got kind "${spec.bottom.kind}"). For a top over ${spec.bottom.kind}, use one of: ${O.top.filter((t) => t !== 'dress').join(', ')}.`);
    }
    bottomKind = 'skirt';
    bottom = top;
  }
  const shoes = color('shoes', spec.shoes ?? 'brown');
  const accent = spec.accent === undefined ? undefined : color('accent', spec.accent);

  if (spec.hat !== undefined && (typeof spec.hat !== 'object' || spec.hat === null)) {
    throw new Error(`makeCharacter(${who}): \`hat\` must be an object such as { kind: 'cap', color: 'blue' }. Kinds: ${O.hat.join(', ')}.`);
  }
  if (spec.hat) onlyKeys(who, 'key in `hat`', spec.hat, ['kind', 'color']);
  const hatKind = spec.hat ? oneOf(who, 'hat.kind', spec.hat.kind, O.hat) : undefined;
  const hat = hatKind ? color('hat.color', spec.hat?.color ?? DEFAULT_HAT_COLOR[hatKind]) : undefined;

  const acc = spec.accessories ?? {};
  if (typeof acc !== 'object' || acc === null || Array.isArray(acc)) {
    throw new Error(`makeCharacter(${who}): \`accessories\` must be an object such as { glasses: true, scarf: 'red' }. Valid: ${O.accessories.join(', ')}.`);
  }
  onlyKeys(who, 'accessory', acc, O.accessories);
  const scarf = acc.scarf === undefined ? undefined : color('accessories.scarf', acc.scarf);
  const bag = acc.bag === undefined ? undefined : color('accessories.bag', acc.bag);

  // Roles to slots. See kit.ts for the letters.
  const dark = (t: { base: Slot; shade: Slot }): Slot => (t.shade === 'steel.1' || t.shade === t.base ? t.base : t.shade);
  const legend: Legend = {
    S: skin.skin, K: skin.shade, B: skin.blush,
    H: hair.base, D: hair.shade, L: hair.light,
    T: top.base, U: top.shade,
    P: bottom.base, Q: bottom.shade,
    F: dark(shoes),
    E: apron.base, G: apron.shade,
    X: 'wood.2', O: 'wood.1', I: 'wood.0',
    C: 'steel.1', J: 'sky.2',
  };
  if (accent) legend.R = accent.base;
  if (hat) Object.assign(legend, { A: hat.base, Y: hat.light, Z: hat.shade });
  if (scarf) Object.assign(legend, { V: scarf.base, W: scarf.shade });
  if (bag) Object.assign(legend, { M: bag.base, N: bag.shade });

  // The head: hair, then hat, beard, glasses and scarf. Without an accent colour, ribbons
  // and bands take the shade of what they sit on.
  const family = shape === 'child' ? 'child' : 'adult';
  const head = (view: 'down' | 'up' | 'right'): Grid => {
    const plain = (g: Grid, shade: string) => (accent ? g : mapChars(g, { R: shade }));
    let g = plain(HEADS[headName][view], 'D');
    if (hatKind) g = overTall(g, plain(HATS[hatKind][view], 'Z'));
    if (spec.beard) g = overTall(g, BEARD[view]);
    if (acc.glasses) g = overTall(g, GLASSES[view]);
    if (scarf) g = overTall(g, SCARF[family][view]);
    return g;
  };

  const zones = (view: View): ZoneMap => {
    const z = zonesFor(topKind, bottomKind, sleeves, view);
    return accent ? z : Object.fromEntries(Object.entries(z).map(([zone, role]) => [zone, role === 'R' ? 'U' : role]));
  };

  const layers: BodyLayer[] = [];
  if (bag) layers.push(BAG[family]);
  if (acc.cane) layers.push(CANE[family]);

  return build({
    id: spec.id,
    name: spec.name,
    legend,
    shape,
    lower: bottomKind === 'skirt' ? 'skirt' : 'legs',
    zones: { front: zones('front'), back: zones('back'), side: zones('side') },
    head: { down: head('down'), up: head('up'), right: head('right') },
    layers,
    walkFps: spec.walkFps,
    idleFps: spec.idleFps,
  });
}
