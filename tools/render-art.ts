/**
 * The preview town for developing the renderer: a corner of a square laid out with the
 * real built-in art, plus the one thing the real set has nothing for yet: a brazier, which
 * is an animated prop with an animated emissive flame and a strongly flickering light.
 * Nothing in `src/` may import this file.
 */
import { art as builtin } from '../src/art';
import { type Slot, slotIndex } from '../src/core/palette';
import type { Sprite } from '../src/core/sprite';
import type { ArtRegistry, PlacedProp, PropDef, Town } from '../src/core/types';

/** A tiny canvas of palette slots, for painting a sprite with code. */
class Paint {
  readonly px: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Uint8Array(w * h);
  }
  set(x: number, y: number, slot: Slot): this {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = slotIndex(slot);
    return this;
  }
  rect(x: number, y: number, w: number, h: number, slot: Slot): this {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, slot);
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

/** A 16x20 iron brazier. The flame is in every frame; the first frame's flame is the emissive layer. */
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

/** The built-in art plus the brazier: pass it as `RendererOpts.art`. */
export const previewArt: ArtRegistry = { ...builtin, props: { ...builtin.props, brazier: brazier() } };

// g grass, c cobble (paving), d dirt, w water (pond), b basin (stone-rimmed water)
const LEGEND: Record<string, string> = { g: 'grass', c: 'cobble', d: 'dirt', w: 'water', b: 'basin' };

const MAP = `
  gggggggggggggggggggggggggggggg
  ggggggggggggggggggggggwwwwgggg
  gggggggggggggggggggggwwwwwwggg
  gggggggggggggggggggggwwwwwwwgg
  ggggggggggggggggggggggwwwwwwgg
  gggggggggggggggggggggggwwwwggg
  gggggggggggggggggggggggggggggg
  gccccccccccccccccccggggggggggg
  gccccccccccccccccccggggggggggg
  gcccccccbbbbcccccccccccccccccc
  gcccccccbbbbcccccccccccccccccc
  gcccccccbbbbcccccccggggggggggg
  gccccccccccccccccccggggggggggg
  gggggggddggggggggggggggggggggg
  ggggggggddgggggggggggggggggggg
  gggggggggdgggggggggggggggggggg
  gggggggggddggggggggggggggggggg
`;

/** kind, origin tile x, origin tile y (the bottom-left tile of the footprint). */
const PROPS: [string, number, number][] = [
  ['house', 1, 6],
  ['townhouse', 9, 6],
  ['stall', 15, 6],
  ['barrel', 18, 6],
  ['mailbox', 6, 6],
  ['lamp', 7, 6],
  ['lamp', 14, 6],
  ['lamp', 19, 12],
  ['lamp', 22, 8],
  ['bench', 23, 7],
  ['brazier', 15, 10],
  ['tree', 0, 3],
  ['tree', 7, 3],
  ['tree', 13, 2],
  ['tree', 19, 5],
  ['tree', 28, 7],
  ['tree', 2, 15],
  ['tree', 13, 15],
  ['tree', 22, 14],
  ['tree', 27, 16],
  ['lily', 23, 2],
  ['lily', 25, 4],
  ['stepping-stones', 20, 7],
  ['flowers', 20, 6],
  ['flowers-white', 16, 1],
  ['flowers-pink', 4, 1],
  ['flowers-yellow', 25, 12],
  ['flowers', 4, 14],
  ['flowers-white', 16, 14],
  ['flowers-pink', 28, 13],
];

/** A 30x17 corner of a square: two houses, a basin, a pond, lamps, trees, a stall and a brazier. */
export function buildPreviewTown(): Town {
  const rows = MAP.trim().split('\n').map((r) => r.trim());
  const h = rows.length;
  const w = rows[0]!.length;
  const terrain = rows.flatMap((r) => [...r].map((ch) => LEGEND[ch]!));
  const props: PlacedProp[] = PROPS.map(([kind, tx, ty]) => ({ kind, tx, ty }));
  const solid = new Uint8Array(w * h);
  terrain.forEach((id, i) => {
    if (previewArt.terrain[id]?.solid) solid[i] = 1;
  });
  return { name: 'preview', w, h, terrain, props, places: { plaza: { tx: 13, ty: 9 } }, solid };
}
