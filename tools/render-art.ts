/**
 * A synthetic art registry for developing the renderer before the real art lands.
 *
 * It adds to the built-in reference assets everything the renderer has to handle and the
 * reference art does not have yet: terrain variants and fringes, animated water, buildings
 * with emissive windows and lights, trees, an animated fire, flat props and several people.
 * It is painted with rectangles and ellipses, on purpose: this is a test card, not art.
 * Nothing in `src/` may import it.
 */
import { art as builtin } from '../src/art';
import { type Slot, slotIndex, type Theme } from '../src/core/palette';
import { recolor, type Sprite } from '../src/core/sprite';
import { type ArtRegistry, type CharacterDef, type Dir, type FringeSide, type PropDef, type TerrainDef, TILE, type Town } from '../src/core/types';
import { hash2 } from '../src/render/hash';

/** A tiny canvas of palette slots, for painting sprites with code. */
class Paint {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Uint8Array(w * h);
  }
  set(x: number, y: number, slot: Slot | null): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = slot === null ? 0 : slotIndex(slot);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, slot: Slot | null): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, slot);
    return this;
  }
  /** A 2x2 checker of `slot` over whatever is there. */
  checker(x: number, y: number, w: number, h: number, slot: Slot): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((i + j) & 1) this.set(i, j, slot);
    return this;
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, slot: Slot): this {
    for (let j = Math.floor(cy - ry); j <= cy + ry; j++) {
      for (let i = Math.floor(cx - rx); i <= cx + rx; i++) {
        if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) this.set(i, j, slot);
      }
    }
    return this;
  }
  /** Wrap the painted shape in a 1-pixel outline. */
  outline(slot: Slot): this {
    const edge: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y * this.w + x] !== 0) continue;
        const near = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].some(([i, j]) => i! >= 0 && j! >= 0 && i! < this.w && j! < this.h && this.px[j! * this.w + i!] !== 0);
        if (near) edge.push(y * this.w + x);
      }
    }
    for (const i of edge) this.px[i] = slotIndex(slot);
    return this;
  }
  sprite(anchor: readonly [number, number] = [0, 0]): Sprite {
    return { w: this.w, h: this.h, px: new Uint8Array(this.px), ax: anchor[0], ay: anchor[1] };
  }
}

// ---------------------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------------------

/** The same tile scrolled by (dx, dy): a cheap second look for variant hashing. */
function rolled(s: Sprite, dx: number, dy: number): Sprite {
  const px = new Uint8Array(s.px.length);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) px[y * s.w + x] = s.px[((y + dy) % s.h) * s.w + ((x + dx) % s.w)]!;
  return { ...s, px };
}

/**
 * A ragged strip of `base` creeping in from one edge of a tile, or a small blob in one
 * corner. `side` follows the TerrainDef contract: `n` is drawn on the tile to the north,
 * so its strip hugs that tile's south edge.
 */
function fringe(side: FringeSide, base: Slot, edge: Slot, seed: number): Sprite {
  const p = new Paint(TILE, TILE);
  const depth = (i: number) => 2 + (hash2(i, seed) % 3);
  for (let i = 0; i < TILE; i++) {
    const d = depth(i);
    for (let k = 0; k < d; k++) {
      const slot = k === d - 1 ? edge : base;
      if (side === 'n') p.set(i, TILE - 1 - k, slot);
      if (side === 's') p.set(i, k, slot);
      if (side === 'e') p.set(k, i, slot);
      if (side === 'w') p.set(TILE - 1 - k, i, slot);
    }
  }
  const corner: Partial<Record<FringeSide, [number, number]>> = { ne: [0, TILE - 1], nw: [TILE - 1, TILE - 1], se: [0, 0], sw: [TILE - 1, 0] };
  const at = corner[side];
  if (at) {
    p.ellipse(at[0] + 0.5, at[1] + 0.5, 3.6, 3.6, edge);
    p.ellipse(at[0] + 0.5, at[1] + 0.5, 2.6, 2.6, base);
  }
  return p.sprite();
}

function fringes(base: Slot, edge: Slot, seed: number): Partial<Record<FringeSide, Sprite>> {
  const sides: FringeSide[] = ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'];
  return Object.fromEntries(sides.map((s, i) => [s, fringe(s, base, edge, seed + i)]));
}

function waterFrame(phase: number): Sprite {
  const p = new Paint(TILE, TILE).rect(0, 0, TILE, TILE, 'steel.3');
  // three short ripples that drift right, and one glint that blinks
  const ripples: [number, number, number][] = [
    [1, 3, 5],
    [9, 8, 4],
    [4, 13, 6],
  ];
  for (const [x, y, len] of ripples) {
    for (let i = 0; i < len; i++) p.set((x + i + phase * 2) % TILE, y, 'steel.4');
    p.set((x + len + phase * 2) % TILE, y + 1, 'steel.2');
  }
  if (phase % 2 === 0) p.set(12, 4, 'steel.5');
  return p.sprite();
}

const grass = builtin.terrain.grass!.variants[0]!;

export const previewTerrain: Record<string, TerrainDef> = {
  grass: {
    id: 'grass',
    variants: [grass, rolled(grass, 5, 7), rolled(grass, 11, 3)],
    priority: 3,
    fringe: fringes('moss.1', 'moss.0', 10),
  },
  cobble: { ...builtin.terrain.cobble!, priority: 1 },
  water: {
    id: 'water',
    variants: [],
    anim: { frames: [0, 1, 2, 3].map(waterFrame), fps: 3 },
    solid: true,
    priority: 0,
  },
};

// ---------------------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------------------

interface HouseLook {
  roof: [Slot, Slot, Slot];
  wall: [Slot, Slot];
  door: [Slot, Slot];
}

/** An 80x64 house front: roof, plaster wall, a door and two windows that light up. */
function house(id: string, look: HouseLook): PropDef {
  const W = 80;
  const H = 64;
  const p = new Paint(W, H);
  const [roofDark, roofBase, roofLight] = look.roof;
  p.rect(1, 2, W - 2, 26, roofBase);
  for (let y = 7; y < 28; y += 5) p.rect(1, y, W - 2, 1, roofDark);
  p.checker(1, 2, W - 2, 4, roofLight).rect(1, 2, 3, 26, roofLight);
  p.rect(1, 27, W - 2, 2, 'steel.0');
  p.rect(3, 29, W - 6, 34, look.wall[1]).rect(W - 8, 29, 5, 34, look.wall[0]).rect(3, 29, W - 6, 2, look.wall[0]);
  p.rect(3, 59, W - 6, 4, 'steel.3');
  // door
  p.rect(33, 44, 14, 19, 'steel.0').rect(34, 45, 12, 18, look.door[1]).rect(40, 45, 6, 18, look.door[0]).set(43, 54, 'ochre.1');
  // windows: dark frame, cool glass, a glint
  const windows = [12, 58];
  for (const x of windows) {
    p.rect(x - 1, 37, 12, 14, 'steel.0').rect(x, 38, 10, 12, 'steel.2');
    p.rect(x, 38, 10, 4, 'steel.3').set(x + 1, 39, 'steel.4').set(x + 2, 39, 'steel.4');
    p.rect(x + 4, 38, 2, 12, 'steel.0').rect(x, 43, 10, 1, 'steel.0');
  }
  p.outline('steel.0');
  const glow = new Paint(W, H);
  for (const x of windows) {
    glow.rect(x, 38, 10, 12, 'ochre.2').rect(x + 1, 40, 8, 6, 'ochre.3');
    glow.rect(x + 4, 38, 2, 12, null).rect(x, 43, 10, 1, null);
  }
  return {
    id,
    sprite: p.sprite([0, H]),
    emissive: glow.sprite([0, H]),
    footprint: { w: 5, h: 2 },
    lights: windows.map((x) => ({ dx: x + 5, dy: -20, radius: 30 })),
    places: { door: { dx: 2, dy: 1 } },
  };
}

/** A 32x48 tree: a round canopy lit from the upper left, on a short trunk. */
function tree(): PropDef {
  const p = new Paint(32, 48);
  p.rect(13, 34, 6, 13, 'wood.1').rect(16, 34, 3, 13, 'wood.0').rect(12, 46, 8, 1, 'wood.0');
  p.ellipse(16, 20, 14, 17, 'moss.0').ellipse(15, 18, 13, 15, 'moss.1').ellipse(12, 13, 8, 8, 'moss.2');
  p.ellipse(10, 10, 3, 2, 'moss.3');
  p.outline('steel.0');
  return { id: 'tree', sprite: p.sprite([0, 48]), footprint: { w: 2, h: 1 } };
}

/** A 16x16 brazier whose flame animates and flickers: a prop animation and a lively light. */
function brazier(): PropDef {
  const frame = (n: number): [Sprite, Sprite] => {
    const p = new Paint(16, 20);
    p.rect(4, 12, 8, 3, 'steel.1').rect(5, 15, 6, 2, 'steel.2').rect(7, 17, 2, 2, 'steel.1').rect(5, 19, 6, 1, 'steel.1');
    const fire = new Paint(16, 20);
    const lean = [0, 1, 0, -1][n]!;
    fire.ellipse(8, 9, 3, 3, 'ochre.1').ellipse(8 + lean, 6, 2, 3, 'ochre.2').ellipse(8, 10, 1.5, 2, 'ochre.3');
    fire.set(8 + lean * 2, 2 + (n % 2), 'ochre.2');
    for (let i = 0; i < fire.px.length; i++) if (fire.px[i] !== 0) p.px[i] = fire.px[i]!;
    p.outline('steel.0');
    return [p.sprite([0, 20]), fire.sprite([0, 20])];
  };
  const frames = [0, 1, 2, 3].map(frame);
  return {
    id: 'brazier',
    sprite: frames[0]![0],
    anim: { frames: frames.map((f) => f[0]), fps: 6 },
    emissive: frames[0]![1],
    footprint: { w: 1, h: 1 },
    lights: [{ dx: 8, dy: -10, radius: 38, slot: 'ochre.1', flicker: 0.45 }],
  };
}

/** A flat flower bed: part of the ground, so people walk over it and shadows fall on it. */
function flowers(): PropDef {
  const p = new Paint(16, 16);
  p.ellipse(8, 9, 7, 5, 'moss.0').ellipse(8, 8, 6, 4, 'moss.2');
  const dots: [number, number, Slot][] = [
    [4, 8, 'plum.1'],
    [7, 6, 'cream.2'],
    [10, 9, 'plum.1'],
    [12, 7, 'ochre.2'],
    [6, 10, 'cream.2'],
  ];
  for (const [x, y, slot] of dots) p.set(x, y, slot);
  return { id: 'flowers', sprite: p.sprite([0, 16]), flat: true };
}

/** A 32x16 bench. */
function bench(): PropDef {
  const p = new Paint(32, 16);
  p.rect(2, 3, 28, 4, 'wood.2').rect(2, 6, 28, 1, 'wood.0').rect(2, 9, 28, 3, 'wood.1').rect(2, 11, 28, 1, 'wood.0');
  p.rect(4, 7, 2, 8, 'steel.1').rect(26, 7, 2, 8, 'steel.1');
  p.outline('steel.0');
  return { id: 'bench', sprite: p.sprite([0, 16]), footprint: { w: 2, h: 1 } };
}

export const previewProps: Record<string, PropDef> = {
  ...builtin.props,
  house: house('house', { roof: ['steel.1', 'steel.2', 'steel.3'], wall: ['cream.0', 'cream.1'], door: ['wood.0', 'wood.1'] }),
  cottage: house('cottage', { roof: ['brick.0', 'brick.1', 'brick.2'], wall: ['cream.1', 'cream.2'], door: ['teal.0', 'teal.1'] }),
  tree: tree(),
  brazier: brazier(),
  flowers: flowers(),
  bench: bench(),
};

// ---------------------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------------------

/** A townsperson made by swapping slots on the reference character. */
function variant(id: string, name: string, map: Partial<Record<Slot, Slot>>): CharacterDef {
  const base = builtin.characters.ana!;
  const swap = (set: Record<Dir, Sprite[]>): Record<Dir, Sprite[]> =>
    Object.fromEntries(Object.entries(set).map(([dir, frames]) => [dir, frames.map((f) => recolor(f, map))])) as Record<Dir, Sprite[]>;
  return { id, name, idle: swap(base.idle), walk: swap(base.walk) };
}

export const previewCharacters: Record<string, CharacterDef> = {
  ...builtin.characters,
  ben: variant('ben', 'Ben', { 'teal.1': 'brick.2', 'teal.0': 'brick.1', 'wood.1': 'steel.1', 'wood.0': 'steel.0', 'skin.a.1': 'skin.c.1', 'skin.a.0': 'skin.c.0' }),
  cy: variant('cy', 'Cy', { 'teal.1': 'plum.1', 'teal.0': 'plum.0', 'wood.1': 'ochre.0', 'skin.a.1': 'skin.b.1', 'skin.a.0': 'skin.b.0' }),
  dee: variant('dee', 'Dee', { 'teal.1': 'cream.2', 'teal.0': 'cream.0', 'wood.1': 'brick.1', 'wood.0': 'brick.0' }),
};

/** The whole synthetic registry: pass it as `RendererOpts.art`. */
export const previewArt: ArtRegistry = {
  terrain: previewTerrain,
  props: previewProps,
  characters: previewCharacters,
  emotes: builtin.emotes,
  font: builtin.font,
};

// ---------------------------------------------------------------------------------------
// A town to show it all in
// ---------------------------------------------------------------------------------------

const MAP = `
  gggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggg
  gggggggggggggggggggggggggggggg
  gg==========================gg
  gg==========================gg
  gg==========================gg
  gggggggggggg====gggggggggggggg
  gggggggggggg====ggggg~~~~~gggg
  gggggggggggg====gggg~~~~~~~ggg
  gggggggggggg====gggg~~~~~~~ggg
  gggggggggggg====ggggg~~~~~gggg
  gggggggggggg====gggggggggggggg
  gggggggggggg====gggggggggggggg
  gggggggggggg====gggggggggggggg
`;

const LEGEND: Record<string, string> = { g: 'grass', '=': 'cobble', '~': 'water' };

/** A 30x17 square with two houses, a street, a pond, lamps, trees and a brazier. */
export function buildPreviewTown(): Town {
  const rows = MAP.trim().split('\n').map((r) => r.trim());
  const h = rows.length;
  const w = rows[0]!.length;
  const terrain = rows.flatMap((r) => [...r].map((ch) => LEGEND[ch]!));
  const props = [
    { kind: 'house', tx: 3, ty: 5 },
    { kind: 'cottage', tx: 19, ty: 5 },
    { kind: 'lamp', tx: 10, ty: 5 },
    { kind: 'lamp', tx: 16, ty: 5 },
    { kind: 'lamp', tx: 11, ty: 12 },
    { kind: 'lamp', tx: 27, ty: 9 },
    { kind: 'tree', tx: 0, ty: 4 },
    { kind: 'tree', tx: 12, ty: 3 },
    { kind: 'tree', tx: 26, ty: 3 },
    { kind: 'tree', tx: 3, ty: 11 },
    { kind: 'tree', tx: 7, ty: 14 },
    { kind: 'tree', tx: 17, ty: 15 },
    { kind: 'tree', tx: 27, ty: 15 },
    { kind: 'bench', tx: 6, ty: 9 },
    { kind: 'brazier', tx: 23, ty: 8 },
    { kind: 'flowers', tx: 2, ty: 5 },
    { kind: 'flowers', tx: 8, ty: 5 },
    { kind: 'flowers', tx: 18, ty: 9 },
  ];
  const solid = new Uint8Array(w * h);
  terrain.forEach((id, i) => {
    if (previewTerrain[id]?.solid) solid[i] = 1;
  });
  return { name: 'preview', w, h, terrain, props, places: { plaza: { tx: 14, ty: 7 } }, solid };
}

/**
 * A stand-in for the brighter palette that is on its way: same slots, sunnier colours.
 * It exists only to check that the renderer assumes nothing about how dark a slot is.
 */
export const sunny: Theme = {
  name: 'sunny',
  colors: {
    'steel.0': '#2B2E4A',
    'steel.1': '#444B6E',
    'steel.2': '#66799B',
    'steel.3': '#8FA6C4',
    'steel.4': '#B9CCE0',
    'steel.5': '#E3EDF5',
    'cream.0': '#D9C39A',
    'cream.1': '#F0E0B8',
    'cream.2': '#FFF7E0',
    'ochre.0': '#B5651D',
    'ochre.1': '#E89A2C',
    'ochre.2': '#FFC94A',
    'ochre.3': '#FFF0A8',
    'brick.0': '#8E3B3B',
    'brick.1': '#C85A48',
    'brick.2': '#E88A6A',
    'moss.0': '#3F8A4F',
    'moss.1': '#6CBF5E',
    'moss.2': '#8FD672',
    'moss.3': '#C4EE8E',
    'wood.0': '#5E4030',
    'wood.1': '#8B6242',
    'wood.2': '#B98A5C',
    'skin.a.0': '#E0A27C',
    'skin.a.1': '#FAD4B0',
    'skin.b.0': '#B87850',
    'skin.b.1': '#DDA273',
    'skin.c.0': '#7A4E3C',
    'skin.c.1': '#A9714F',
    'plum.0': '#7B4A8C',
    'plum.1': '#B07CC0',
    'teal.0': '#2E8C8C',
    'teal.1': '#5CC4B8',
  },
};
