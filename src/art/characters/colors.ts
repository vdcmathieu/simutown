/**
 * Colours for people, by name. Each name stands for palette slots chosen to follow
 * docs/STYLE.md: a base and its shade from one ramp, and a light where the ramp has one.
 */
import { isSlot, type Slot } from '../../core/palette';

/** A base colour with its shade and, where the ramp has one, a light. */
export interface Tones {
  base: Slot;
  shade: Slot;
  light: Slot;
}

const tones = (base: Slot, shade: Slot, light: Slot = base): Tones => ({ base, shade, light });

/** The three skin tones of the palette: light, medium, dark. Each brings its own blush. */
export const SKINS = {
  a: { skin: 'skin.a.1', shade: 'skin.a.0', blush: 'rose.1' },
  b: { skin: 'skin.b.1', shade: 'skin.b.0', blush: 'rose.1' },
  c: { skin: 'skin.c.1', shade: 'skin.c.0', blush: 'rose.0' },
} satisfies Record<string, { skin: Slot; shade: Slot; blush: Slot }>;
export type SkinTone = keyof typeof SKINS;

/**
 * The hair table of docs/STYLE.md. Black has no shade and white has no light: the base
 * stands in, because ink is never a fill.
 */
export const HAIR = {
  brown: tones('wood.1', 'wood.0', 'wood.2'),
  black: tones('steel.1', 'steel.1', 'steel.2'),
  white: tones('steel.5', 'steel.4', 'steel.5'),
  blond: tones('ochre.2', 'ochre.1', 'ochre.3'),
  ginger: tones('ochre.1', 'ochre.0', 'ochre.2'),
} satisfies Record<string, Tones>;
export type HairColor = keyof typeof HAIR;

/**
 * Clothing colours. The bright ones are for tops, skirts, hats and scarves; the dark ones
 * (navy, indigo, maroon, charcoal) are meant for trousers and shoes.
 */
export const CLOTH = {
  red: tones('brick.1', 'brick.0', 'brick.2'),
  orange: tones('ochre.1', 'ochre.0', 'ochre.2'),
  yellow: tones('ochre.2', 'ochre.1', 'ochre.3'),
  green: tones('moss.1', 'moss.0'),
  teal: tones('teal.1', 'teal.0'),
  blue: tones('sky.1', 'sky.0', 'sky.2'),
  purple: tones('plum.1', 'plum.0'),
  pink: tones('rose.1', 'rose.0'),
  white: tones('steel.5', 'steel.4'),
  cream: tones('cream.2', 'cream.0'),
  grey: tones('steel.3', 'steel.2', 'steel.4'),
  slate: tones('steel.2', 'steel.1', 'steel.3'),
  brown: tones('wood.1', 'wood.0', 'wood.2'),
  tan: tones('wood.2', 'wood.1'),
  navy: tones('sky.0', 'steel.1'),
  indigo: tones('plum.0', 'steel.1'),
  maroon: tones('brick.0', 'steel.1'),
  charcoal: tones('steel.1', 'steel.1', 'steel.2'),
} satisfies Record<string, Tones>;
export type ClothName = keyof typeof CLOTH;

/** A clothing colour: a name from CLOTH, or a palette slot (its shade is the next darker slot of the ramp). */
export type ClothColor = ClothName | Slot;

/** Slots that clothing may not use: ink is for lines, and the two ground colours hide a person. */
const FORBIDDEN: Partial<Record<Slot, string>> = {
  'steel.0': 'ink is for outlines and eyes only',
  'moss.2': 'it is the grass colour',
  'cream.1': 'it is the paving colour',
};

/** Turn a colour name or slot into tones. Throws, listing the names, when it is neither. */
export function clothTones(color: string, what: string): Tones {
  if (color in CLOTH) return CLOTH[color as ClothName];
  if (isSlot(color)) {
    const why = FORBIDDEN[color];
    if (why) throw new Error(`${what}: "${color}" cannot be worn, ${why}. Colour names: ${Object.keys(CLOTH).join(', ')}.`);
    const dot = color.lastIndexOf('.');
    const ramp = color.slice(0, dot);
    const n = Number(color.slice(dot + 1));
    const darker = `${ramp}.${n - 1}`;
    const lighter = `${ramp}.${n + 1}`;
    // the darkest slot of a ramp borrows slate as its shade; steel.1 stays flat rather than use ink
    const shade: Slot = n > 0 && isSlot(darker) && darker !== 'steel.0' ? darker : color === 'steel.1' ? color : 'steel.1';
    const light: Slot = isSlot(lighter) && !FORBIDDEN[lighter] && !ramp.startsWith('skin') ? lighter : color;
    return { base: color, shade, light };
  }
  throw new Error(`${what}: unknown colour "${color}". Colour names: ${Object.keys(CLOTH).join(', ')}. A palette slot such as "teal.1" also works.`);
}
