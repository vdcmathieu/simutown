/**
 * Pass 3, props and actors: resolve what stands on the map, pick animation frames and
 * draw everything back to front by base line.
 */
import type { Lut } from '../core/palette';
import type { Sprite } from '../core/sprite';
import { type ActorState, type ArtRegistry, type CharacterDef, type PropDef, TILE, type Town } from '../core/types';
import { frameAt } from './ground';
import { blitSprite, type View } from './view';
import { listNames, type WarnOnce } from './warn';

/** A placed prop with its definition resolved and its anchor in world pixels. */
export interface StaticProp {
  def: PropDef;
  /** World pixel where the sprite anchor lands: the bottom-left corner of the origin tile. */
  x: number;
  y: number;
}

/** One sprite to draw this frame. */
export interface Drawable {
  sprite: Sprite;
  /** World pixel of the anchor. `y` is also the base line used for depth sorting. */
  x: number;
  y: number;
  alpha: number;
  prop?: StaticProp;
  actor?: ActorState;
  /** 1-based position in draw order; written to the view's owner buffer. */
  id: number;
}

/** Frames per second for actor poses. Walk cycles are four frames, so two steps a second. */
const POSE_FPS: Record<string, number> = { idle: 2, walk: 8 };
const DEFAULT_POSE_FPS = 6;
/** An actor this close to the view is kept even when off screen: its shadow may reach in. */
const CAST_REACH = 48;

/** Split a town's props into flat ones (part of the ground) and standing ones. Unknown kinds are skipped. */
export function resolveProps(town: Town, art: ArtRegistry, warn: WarnOnce): { flat: StaticProp[]; standing: StaticProp[] } {
  const flat: StaticProp[] = [];
  const standing: StaticProp[] = [];
  for (const p of town.props) {
    const def = art.props[p.kind];
    if (!def) {
      warn(`prop:${p.kind}`, `unknown prop "${p.kind}" skipped. Known props: ${listNames(Object.keys(art.props))}`);
      continue;
    }
    (def.flat ? flat : standing).push({ def, x: p.tx * TILE, y: (p.ty + 1) * TILE });
  }
  return { flat, standing };
}

/** The sprite a prop shows at scene time `t`. */
export function propSprite(def: PropDef, t: number): Sprite {
  const frames = def.anim?.frames;
  if (!frames || frames.length === 0) return def.sprite;
  return frames[frameAt(frames.length, def.anim!.fps, t)]!;
}

/** The sprite an actor shows, from its pose, direction and `animTime`. Unknown poses fall back to idle. */
export function actorSprite(def: CharacterDef, a: ActorState, warn: WarnOnce): Sprite | undefined {
  let set = a.pose === 'walk' ? def.walk : a.pose === 'idle' ? def.idle : def.poses?.[a.pose];
  if (!set) {
    warn(
      `pose:${def.id}:${a.pose}`,
      `character "${def.id}" has no pose "${a.pose}", using idle. Poses: ${listNames(['idle', 'walk', ...Object.keys(def.poses ?? {})])}`,
    );
    set = def.idle;
  }
  const frames = set[a.dir] ?? set.down;
  if (!frames || frames.length === 0) return undefined;
  return frames[frameAt(frames.length, POSE_FPS[a.pose] ?? DEFAULT_POSE_FPS, a.animTime)];
}

/** True when the sprite's box, grown by `margin` pixels, touches the view. */
function visible(v: View, s: Sprite, x: number, y: number, margin = 0): boolean {
  const left = x - s.ax;
  const top = y - s.ay;
  return left - margin < v.x0 + v.w && top - margin < v.y0 + v.h && left + s.w + margin > v.x0 && top + s.h + margin > v.y0;
}

/** Draw the flat props that are in view straight onto the ground. */
export function drawFlatProps(v: View, flat: StaticProp[], lut: Lut, t: number): void {
  for (const p of flat) {
    const s = propSprite(p.def, t);
    if (visible(v, s, p.x, p.y)) blitSprite(v, s, p.x, p.y, lut);
  }
}

/**
 * Everything standing in view, sorted back to front: by base line, then props before
 * actors, then left to right, then in input order. Unknown characters are skipped.
 */
export function collectDrawables(v: View, standing: StaticProp[], art: ArtRegistry, actors: ActorState[], t: number, warn: WarnOnce): Drawable[] {
  const list: Drawable[] = [];
  for (const prop of standing) {
    const sprite = propSprite(prop.def, t);
    if (visible(v, sprite, prop.x, prop.y)) list.push({ sprite, x: prop.x, y: prop.y, alpha: 1, prop, id: 0 });
  }
  for (const actor of actors) {
    const def = art.characters[actor.character];
    if (!def) {
      warn(
        `character:${actor.character}`,
        `unknown character "${actor.character}" skipped. Known characters: ${listNames(Object.keys(art.characters))}`,
      );
      continue;
    }
    const alpha = Math.max(0, Math.min(1, actor.opacity ?? 1));
    const sprite = actorSprite(def, actor, warn);
    const x = Math.round(actor.x);
    const y = Math.round(actor.y);
    if (!sprite || !(alpha > 0) || !Number.isFinite(x + y) || !visible(v, sprite, x, y, CAST_REACH)) continue;
    list.push({ sprite, x, y, alpha, actor, id: 0 });
  }
  const seq = new Map(list.map((d, i) => [d, i]));
  list.sort((a, b) => a.y - b.y || (a.actor ? 1 : 0) - (b.actor ? 1 : 0) || a.x - b.x || seq.get(a)! - seq.get(b)!);
  list.forEach((d, i) => (d.id = i + 1));
  return list;
}

/** Draw the sorted drawables, claiming their pixels in the owner buffer. */
export function drawSprites(v: View, list: Drawable[], lut: Lut): void {
  for (const d of list) blitSprite(v, d.sprite, d.x, d.y, lut, d.alpha, d.id);
}
