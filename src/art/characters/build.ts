/**
 * Assembles a CharacterDef from kit parts: a body shape, an outfit, three head grids and
 * any accessories. Both `person()` and `makeCharacter()` end here.
 *
 * Every frame is built as text, in this order: legs, torso, (mirror), outfit, body
 * accessories, head, waving arm. Only then does it become a sprite.
 */
import { sprite, flipX, type Legend, type Sprite } from '../../core/sprite';
import { CHAR_H, CHAR_W, type CharacterDef, type Dir } from '../../core/types';
import { BODY_H, SHAPES, type ShapeName } from './bodies';
import { emptyGrid, type Grid, mapChars, mirror, over, shift } from './grid';
import type { View, ZoneMap } from './outfits';

/** Something worn on the body: one 11-row grid per view, laid over the dressed body. */
export interface BodyLayer {
  front?: Grid;
  back?: Grid;
  side?: Grid;
  /** Follows the body down in a step and onto a seat. False for a cane: it stays on the ground. */
  follows?: boolean;
  /** The arms stop swinging while this is shown (a hand is busy holding it). */
  steadies?: boolean;
  /** Poses in which it is put away, per view. */
  notIn?: Partial<Record<View, readonly string[]>>;
}

/** The extra poses every kit character has, by key of `CharacterDef.poses`. */
export const POSES = ['sit', 'wave', 'talk', 'carry'] as const;
export type PoseName = (typeof POSES)[number];

export interface Parts {
  id: string;
  name: string;
  /** Role letter -> palette slot. */
  legend: Legend;
  shape: ShapeName;
  lower: 'legs' | 'skirt';
  zones: Record<View, ZoneMap>;
  /** Head grids, 16 wide and 14 or more rows: facing the viewer, facing away, facing right. */
  head: { down: Grid; up: Grid; right: Grid };
  layers?: readonly BodyLayer[];
  walkFps?: number;
  idleFps?: number;
}

/** One frame: which torso and legs, how far it sinks, and what is laid on top. */
interface Recipe {
  upper: 'stand' | 'swingA' | 'swingB' | 'armless' | 'talk' | 'carry';
  lower: 'stand' | 'stepA' | 'stepB' | 'sit';
  /** `step`: the walking bob. `sit`: lowered onto a seat. */
  sink?: 'step' | 'sit';
  /** Extra rows the head settles. */
  nod?: number;
  /** Mirror the body (never the head). */
  flip?: boolean;
  /** Which frame of the waving arm to add. */
  wave?: 0 | 1;
}

const STAND: Recipe = { upper: 'stand', lower: 'stand' };
const SETTLED: Recipe = { ...STAND, nod: 1 };
const rep = <T>(n: number, x: T): T[] => Array.from({ length: n }, () => x);

// Extra poses play at 6 frames a second, so slow gestures repeat their frames.
const FRONT: Record<'idle' | 'walk' | PoseName, Recipe[]> = {
  idle: [STAND, SETTLED],
  walk: [
    { upper: 'swingA', lower: 'stepA', sink: 'step' },
    STAND,
    { upper: 'swingA', lower: 'stepA', sink: 'step', flip: true },
    STAND,
  ],
  sit: [...rep(6, { upper: 'stand', lower: 'sit', sink: 'sit' } as Recipe), ...rep(6, { upper: 'stand', lower: 'sit', sink: 'sit', nod: 1 } as Recipe)],
  wave: [...rep(2, { upper: 'armless', lower: 'stand', wave: 0 } as Recipe), ...rep(2, { upper: 'armless', lower: 'stand', wave: 1 } as Recipe)],
  talk: [...rep(3, { upper: 'talk', lower: 'stand' } as Recipe), ...rep(3, SETTLED)],
  carry: [...rep(3, { upper: 'carry', lower: 'stand' } as Recipe), ...rep(3, { upper: 'carry', lower: 'stand', nod: 1 } as Recipe)],
};

const SIDE: typeof FRONT = {
  ...FRONT,
  walk: [
    { upper: 'swingA', lower: 'stepA', sink: 'step' },
    STAND,
    { upper: 'swingB', lower: 'stepB', sink: 'step' },
    STAND,
  ],
};

// From behind the crate is hidden by the body: the arms simply hang. The hand that waves
// and talks is the same hand, so from behind it is on the other side of the picture.
const BACK: typeof FRONT = {
  ...FRONT,
  wave: [...rep(2, { upper: 'armless', lower: 'stand', wave: 0, flip: true } as Recipe), ...rep(2, { upper: 'armless', lower: 'stand', wave: 1, flip: true } as Recipe)],
  talk: [...rep(3, { upper: 'talk', lower: 'stand', flip: true } as Recipe), ...rep(3, SETTLED)],
  carry: [...rep(3, STAND), ...rep(3, SETTLED)],
};

function drawFrame(parts: Parts, view: View, pose: string, r: Recipe): Sprite {
  const shape = SHAPES[parts.shape];
  const set = shape.set;
  const grids = view === 'side' ? set.side : set.front;
  const bodyDrop = r.sink === 'step' ? set.stepDrop : r.sink === 'sit' ? set.sitDrop : 0;
  const headDrop = (r.sink === 'step' ? 1 : bodyDrop) + (r.nod ?? 0);
  const zones = parts.zones[view];

  const layers = (parts.layers ?? []).filter((l) => l[view] && !l.notIn?.[view]?.includes(pose));
  // a hand that holds a cane does not swing: the torso stands still and only sinks
  const steady = layers.some((l) => l.steadies);
  const swings = r.upper === 'swingA' || r.upper === 'swingB';
  const rest = view === 'side' ? 'armless' : 'stand';
  let upper = grids.upper[steady && (swings || r.upper === 'stand') ? rest : r.upper];
  if (r.sink === 'sit' || (steady && swings)) upper = shift(upper, 0, bodyDrop);
  let body = over(grids[parts.lower][r.lower], upper);
  if (r.flip) body = mirror(body);
  body = mapChars(body, zones);
  for (const layer of layers) body = over(body, mapChars(layer[view]!, zones), 0, layer.follows === false ? 0 : bodyDrop);

  const stoop = view === 'side' ? -shape.stoop : 0;
  let box = over(emptyGrid(CHAR_H), body, stoop, CHAR_H - BODY_H);
  const head = view === 'front' ? parts.head.down : view === 'back' ? parts.head.up : parts.head.right;
  box = over(box, head, 0, shape.headDy + headDrop);
  if (r.wave !== undefined) {
    const arm = view === 'side' ? set.wave.side[r.wave] : set.wave.front[r.wave];
    box = over(box, mapChars(r.flip ? mirror(arm) : arm, zones), stoop, bodyDrop);
  }
  try {
    return sprite(box.join('\n'), { legend: parts.legend, anchor: [CHAR_W / 2, CHAR_H] });
  } catch (err) {
    throw new Error(`character "${parts.id}": ${(err as Error).message}`);
  }
}

/** Build the full CharacterDef: four directions of idle, walk and every pose in POSES. */
export function build(parts: Parts): CharacterDef {
  for (const [view, g] of Object.entries(parts.head)) {
    if (g.length < 14 || g.length + SHAPES[parts.shape].headDy >= CHAR_H) {
      throw new Error(`character "${parts.id}": head.${view} is ${g.length} rows tall, expected 14 to ${CHAR_H - 1 - SHAPES[parts.shape].headDy}`);
    }
  }
  const frames = (view: View, table: typeof FRONT, pose: keyof typeof FRONT): Sprite[] => {
    // repeated recipes share one sprite
    const cache = new Map<Recipe, Sprite>();
    return table[pose].map((r) => {
      let s = cache.get(r);
      if (!s) cache.set(r, (s = drawFrame(parts, view, pose, r)));
      return s;
    });
  };
  const set = (pose: keyof typeof FRONT): Record<Dir, Sprite[]> => {
    const right = frames('side', SIDE, pose);
    return { down: frames('front', FRONT, pose), up: frames('back', BACK, pose), right, left: right.map(flipX) };
  };
  const def: CharacterDef = {
    id: parts.id,
    name: parts.name,
    idle: set('idle'),
    walk: set('walk'),
    walkFps: parts.walkFps ?? SHAPES[parts.shape].walkFps,
    poses: Object.fromEntries(POSES.map((p) => [p, set(p)])),
  };
  if (parts.idleFps !== undefined) def.idleFps = parts.idleFps;
  return def;
}
