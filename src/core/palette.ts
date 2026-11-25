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
  // added for the daylight look; new slots only ever go at the end
  'sky.0', 'sky.1', 'sky.2',
  'rose.0', 'rose.1',
] as const;

export type Slot = (typeof SLOTS)[number];

export interface Theme {
  name: string;
  colors: Record<Slot, string>;
}

/**
 * The default look: a sunny midday in Willow Square.
 *
 * 38 colours. Every ramp is hue-shifted: its dark end leans cool (towards blue and
 * violet) and its light end leans warm (towards yellow), which is what makes flat
 * colours feel sunlit. Nothing is pure black, pure white or pure grey.
 */
export const daylight: Theme = {
  name: 'daylight',
  colors: {
    // steel: ink, then cool stone greys up to white
    'steel.0': '#2A2944', // ink: every outline, pupils. Deep indigo, never black
    'steel.1': '#4A4E70', // iron, slate shade, dark hair
    'steel.2': '#727B9A', // slate, stone shade
    'steel.3': '#9DA8BE', // stone
    'steel.4': '#C9D2DE', // pale stone
    'steel.5': '#F5F8F8', // white: glints, foam, daisies, aprons
    // cream: sand and plaster, the light ground of the town
    'cream.0': '#DDBB82', // paving joints, plaster shade
    'cream.1': '#F3DFAC', // paving, sand
    'cream.2': '#FDF5DC', // plaster walls, paper: the lightest large surface
    // ochre: orange to sunshine yellow; also the colour of lamplight
    'ochre.0': '#B5602B', // burnt orange shade
    'ochre.1': '#EF9434', // orange: roofs, pumpkins, ginger hair
    'ochre.2': '#FFCB4D', // sunny yellow; lamplight
    'ochre.3': '#FFF2B0', // pale glow: the core of a lit window
    // brick: warm reds
    'brick.0': '#93303F', // roof shade, deep red
    'brick.1': '#DA4E3D', // roof red, doors, poppies
    'brick.2': '#F68B5C', // sunlit tile, terracotta
    // moss: greens, from cool pine shade to yellow-green light
    'moss.0': '#2A7A5C', // leaf shade
    'moss.1': '#4BAF58', // leaf, grass tufts
    'moss.2': '#8DD45F', // grass: the main colour of the frame
    'moss.3': '#C6EE85', // sunlit grass and leaves
    // wood
    'wood.0': '#6E3F30', // bark shade, dark hair
    'wood.1': '#AA6C40', // bark, beams, doors, brown hair
    'wood.2': '#DFAA6A', // planks, sunlit wood
    // skin: three tones, each a shade and a base
    'skin.a.0': '#EFA57E',
    'skin.a.1': '#FFD9B2',
    'skin.b.0': '#C88355',
    'skin.b.1': '#EBB184',
    'skin.c.0': '#7E4B3A',
    'skin.c.1': '#AE7150',
    // plum and teal: clothing and paint
    'plum.0': '#6B4298',
    'plum.1': '#A97DD8',
    'teal.0': '#1E8C8B',
    'teal.1': '#53CEB9',
    // sky: water, window glass by day, blue roofs, denim
    'sky.0': '#2F62C4', // deep water, shade
    'sky.1': '#4C9FEE', // water
    'sky.2': '#9DDDF8', // ripples, glass
    // rose: flowers, cheeks, a pink dress
    'rose.0': '#DB4B78',
    'rose.1': '#FFA1B6',
  },
};

/**
 * The old name of the default theme, kept so existing imports keep working.
 * It is the same object as `daylight`: there is no dark theme any more. Dusk and
 * night are moods the renderer derives from `daylight` at draw time.
 */
export const dusk: Theme = daylight;

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
