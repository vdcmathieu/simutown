import { type Slot, slotIndex } from './palette';

/**
 * A sprite is a small grid of palette indices (0 = transparent) plus an anchor point.
 * The anchor is the point of the sprite that lands on the position you draw it at,
 * measured in pixels from the sprite's top-left corner. A 16x24 character standing on
 * its feet has anchor [8, 24]: bottom edge, horizontal centre.
 */
export interface Sprite {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  readonly ax: number;
  readonly ay: number;
}

export type Legend = Record<string, Slot | null>;

/**
 * The shared alphabet: one character per palette slot. `.` is transparent.
 * Whitespace is never a pixel, so sprites can be indented freely in source.
 * A sprite may pass its own legend to override or extend these (the character
 * generator uses role letters such as H for hair that it remaps per person).
 */
export const LEGEND: Legend = {
  '.': null,
  '0': 'steel.0', '1': 'steel.1', '2': 'steel.2', '3': 'steel.3', '4': 'steel.4', '5': 'steel.5',
  'a': 'cream.0', 'b': 'cream.1', 'c': 'cream.2',
  'o': 'ochre.0', 'p': 'ochre.1', 'q': 'ochre.2', 'r': 'ochre.3',
  'x': 'brick.0', 'y': 'brick.1', 'z': 'brick.2',
  'g': 'moss.0', 'h': 'moss.1', 'i': 'moss.2', 'j': 'moss.3',
  'u': 'wood.0', 'v': 'wood.1', 'w': 'wood.2',
  'k': 'skin.a.0', 'l': 'skin.a.1',
  'm': 'skin.b.0', 'n': 'skin.b.1',
  's': 'skin.c.0', 't': 'skin.c.1',
  'd': 'plum.0', 'e': 'plum.1',
  '6': 'teal.0', '7': 'teal.1',
};

export interface SpriteOpts {
  /** Extra or overriding legend entries, merged over LEGEND. */
  legend?: Legend;
  /** Anchor point in pixels from the top-left. Default [0, 0]. */
  anchor?: readonly [number, number];
}

/**
 * Parse a text grid into a sprite.
 *
 *   const dot = sprite(`
 *     .00.
 *     0qq0
 *     .00.
 *   `, { anchor: [2, 3] });
 *
 * Blank lines at the start and end are dropped and each row is trimmed, so indentation
 * is free. Every row must be the same width, and every character must be in the legend.
 */
export function sprite(art: string, opts: SpriteOpts = {}): Sprite {
  const legend = opts.legend ? { ...LEGEND, ...opts.legend } : LEGEND;
  const rows = art
    .split('\n')
    .map((r) => r.trim())
    .filter((r, i, all) => {
      if (r !== '') return true;
      // keep nothing blank at the edges; a blank row in the middle is an authoring error
      const before = all.slice(0, i).some((x) => x !== '');
      const after = all.slice(i + 1).some((x) => x !== '');
      if (before && after) throw new Error(`sprite: blank row ${i} in the middle of the art`);
      return false;
    });
  if (rows.length === 0) throw new Error('sprite: empty art');
  const w = rows[0]!.length;
  const h = rows.length;
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = rows[y]!;
    if (row.length !== w) {
      throw new Error(`sprite: row ${y} is ${row.length} wide, expected ${w}: "${row}"`);
    }
    for (let x = 0; x < w; x++) {
      const ch = row[x]!;
      const slot = legend[ch];
      if (slot === undefined) throw new Error(`sprite: unknown character "${ch}" at row ${y}, col ${x}`);
      px[y * w + x] = slot === null ? 0 : slotIndex(slot);
    }
  }
  const [ax, ay] = opts.anchor ?? [0, 0];
  return { w, h, px, ax, ay };
}

/** An empty (fully transparent) sprite. */
export function blank(w: number, h: number, anchor: readonly [number, number] = [0, 0]): Sprite {
  return { w, h, px: new Uint8Array(w * h), ax: anchor[0], ay: anchor[1] };
}

/** Mirror a sprite left to right. The anchor is mirrored with it. */
export function flipX(s: Sprite): Sprite {
  const px = new Uint8Array(s.w * s.h);
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) px[y * s.w + x] = s.px[y * s.w + (s.w - 1 - x)]!;
  }
  return { w: s.w, h: s.h, px, ax: s.w - s.ax, ay: s.ay };
}

/** Swap palette slots. Map a slot to `null` to erase it. */
export function recolor(s: Sprite, map: Partial<Record<Slot, Slot | null>>): Sprite {
  const table = new Map<number, number>();
  for (const [from, to] of Object.entries(map) as [Slot, Slot | null][]) {
    table.set(slotIndex(from), to === null ? 0 : slotIndex(to));
  }
  const px = s.px.map((v) => table.get(v) ?? v);
  return { ...s, px };
}

/** Overlay same-size sprites, later ones on top. The anchor comes from the first. */
export function stack(...layers: Sprite[]): Sprite {
  const base = layers[0];
  if (!base) throw new Error('stack: no layers');
  const px = new Uint8Array(base.px);
  for (const layer of layers.slice(1)) {
    if (layer.w !== base.w || layer.h !== base.h) {
      throw new Error(`stack: layer is ${layer.w}x${layer.h}, expected ${base.w}x${base.h}`);
    }
    for (let i = 0; i < px.length; i++) if (layer.px[i] !== 0) px[i] = layer.px[i]!;
  }
  return { w: base.w, h: base.h, px, ax: base.ax, ay: base.ay };
}

/** Same pixels, different anchor. */
export function withAnchor(s: Sprite, anchor: readonly [number, number]): Sprite {
  return { ...s, ax: anchor[0], ay: anchor[1] };
}
