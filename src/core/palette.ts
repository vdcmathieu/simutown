/**
 * Palette slots.
 *
 * Art never names a hex colour. It names a slot, and a Theme maps slots to colours.
 * That keeps every sprite inside one palette and lets a whole town be re-themed later.
 *
 * Ramps run dark to light: `steel.0` is the darkest steel, `steel.5` the lightest.
 */
export const SLOTS = [
  'steel.0', 'steel.1', 'steel.2', 'steel.3', 'steel.4', 'steel.5',
  'cream.0', 'cream.1', 'cream.2',
  'ochre.0', 'ochre.1', 'ochre.2', 'ochre.3',
  'brick.0', 'brick.1', 'brick.2',
  'moss.0', 'moss.1', 'moss.2', 'moss.3',
  'wood.0', 'wood.1', 'wood.2',
  'skin.a.0', 'skin.a.1', 'skin.b.0', 'skin.b.1', 'skin.c.0', 'skin.c.1',
  'plum.0', 'plum.1',
  'teal.0', 'teal.1',
] as const;

export type Slot = (typeof SLOTS)[number];

export interface Theme {
  name: string;
  colors: Record<Slot, string>;
}

/** The default look: steel blues and slate, cream paper, ochre lamplight. */
export const dusk: Theme = {
  name: 'dusk',
  colors: {
    'steel.0': '#151C2B', // ink: outlines, deepest shadow
    'steel.1': '#232F44',
    'steel.2': '#34455C',
    'steel.3': '#4A6076',
    'steel.4': '#7F97A8',
    'steel.5': '#B9C7CF',
    'cream.0': '#B8A88C',
    'cream.1': '#DCCBAA',
    'cream.2': '#F1E6CF', // paper: lightest non-emissive colour
    'ochre.0': '#7A4E1C',
    'ochre.1': '#C98A2B',
    'ochre.2': '#E8B95A', // lamplight
    'ochre.3': '#FBE3A1', // the hottest pixel in the frame
    'brick.0': '#4F2A2B',
    'brick.1': '#8C4A3A',
    'brick.2': '#B8705A',
    'moss.0': '#2A3A36',
    'moss.1': '#415647',
    'moss.2': '#5E7257',
    'moss.3': '#8C9C6E',
    'wood.0': '#3B2B28',
    'wood.1': '#5F4435',
    'wood.2': '#8A684A',
    'skin.a.0': '#C4906F',
    'skin.a.1': '#EBC6A2',
    'skin.b.0': '#9C6A4C',
    'skin.b.1': '#C99670',
    'skin.c.0': '#5E3D33',
    'skin.c.1': '#8A5D45',
    'plum.0': '#4E3550',
    'plum.1': '#7C5878',
    'teal.0': '#2F5560',
    'teal.1': '#56888A',
  },
};

const INDEX = new Map<string, number>(SLOTS.map((s, i) => [s, i + 1]));

/** 1-based palette index of a slot. Index 0 is always transparent. */
export function slotIndex(slot: Slot): number {
  const i = INDEX.get(slot);
  if (i === undefined) throw new Error(`unknown palette slot "${slot}"`);
  return i;
}

export function isSlot(s: string): s is Slot {
  return INDEX.has(s);
}

export type RGB = readonly [number, number, number];
export type RGBA = readonly [number, number, number, number];

function parseHex(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`bad hex colour "${hex}"`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A compiled theme: 4 bytes (RGBA) per palette index.
 * Index 0 is transparent, index i+1 is SLOTS[i].
 */
export type Lut = Uint8Array;

export function compileTheme(theme: Theme): Lut {
  const lut = new Uint8Array((SLOTS.length + 1) * 4);
  SLOTS.forEach((slot, i) => {
    const [r, g, b] = parseHex(theme.colors[slot]);
    lut.set([r, g, b, 255], (i + 1) * 4);
  });
  return lut;
}

/** RGB of a slot in a theme. */
export function rgb(theme: Theme, slot: Slot): RGB {
  return parseHex(theme.colors[slot]);
}

/** RGB of a slot from a compiled Lut. */
export function lutRgb(lut: Lut, slot: Slot): RGB {
  const o = slotIndex(slot) * 4;
  return [lut[o]!, lut[o + 1]!, lut[o + 2]!];
}
