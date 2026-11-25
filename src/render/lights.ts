/**
 * Lamp light: where the lights are, how far each one reaches, what blocks it.
 *
 * A light has two lobes. The halo is a small disc around the source itself (the lamp glass,
 * the window): it is what glows on walls and in the air. The pool is a wide ellipse on the
 * ground under the source, squashed for the three-quarter view and pushed a little toward
 * the viewer: it is what warms the street and the people standing in it.
 *
 * This file only measures light. `grade.ts` turns the measurements into pixels.
 */
import { type Lut, lutRgb } from '../core/palette';
import { normalized } from './conditions';
import { hash01 } from './hash';
import { projectSilhouette } from './shadows';
import type { Drawable, StaticProp } from './sprites';
import type { View } from './view';

/** Halo radius as a share of the light's radius. */
const HALO = 0.5;
/** Pool height over width: the ground seen at three-quarter view. */
const POOL_SQUASH = 0.6;
/** How far the pool's centre sits below the base line, as a share of the radius. */
const POOL_DROP = 0.2;
/** Peak pool brightness relative to the halo's. */
const POOL_GAIN = 0.85;
/** Height on an actor, above the feet, where halo light is sampled. */
const CHEST = 12;

/** A footprint of light intensity (0..1) around a source, shared by lights of the same shape. */
interface Stamp {
  /** Offset of the stamp's top-left from the source. */
  left: number;
  top: number;
  w: number;
  h: number;
  data: Float32Array;
}

/** Where a light is and how far it reaches: all that the lobe functions need. */
export interface LightShape {
  /** The source: lamp glass, window. */
  x: number;
  y: number;
  /** The ground line under the source (the base line of its prop). */
  gy: number;
  radius: number;
  /** Peak pool intensity. A light high above the ground reaches it weakly or not at all. */
  pool: number;
}

/** A resolved light source in world pixels. */
export interface Light extends LightShape {
  /** Light colour with its largest channel at 1. */
  color: [number, number, number];
  flicker: number;
  /** Phases of the flicker waves, hashed from the light's position. */
  phase: [number, number];
  prop: StaticProp;
  stamp: Stamp;
}

/** Pool intensity of a light at a world point. */
export function poolAt(l: LightShape, wx: number, wy: number): number {
  if (l.pool <= 0) return 0;
  const dx = (wx - l.x) / l.radius;
  const dy = (wy - (l.gy + l.radius * POOL_DROP)) / (l.radius * POOL_SQUASH);
  const d = Math.sqrt(dx * dx + dy * dy);
  return d >= 1 ? 0 : l.pool * (1 - d);
}

/** Halo intensity of a light at a world point. */
export function haloAt(l: LightShape, wx: number, wy: number): number {
  const d = Math.hypot(wx - l.x, wy - l.y) / (l.radius * HALO);
  return d >= 1 ? 0 : 1 - d;
}

/** The intensity footprint of a light whose source sits at (0, 0). */
function buildStamp(l: LightShape): Stamp {
  const r = l.radius;
  const poolY = l.gy + r * POOL_DROP;
  const left = -Math.ceil(r);
  const top = Math.floor(Math.min(-r * HALO, poolY - r * POOL_SQUASH));
  const bottom = Math.ceil(Math.max(r * HALO, poolY + r * POOL_SQUASH));
  const w = -left * 2;
  const h = bottom - top;
  const data = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const wx = left + i + 0.5;
      const wy = top + j + 0.5;
      // the two lobes add up like light does, without overshooting where they overlap
      data[j * w + i] = 1 - (1 - haloAt(l, wx, wy)) * (1 - poolAt(l, wx, wy));
    }
  }
  return { left, top, w, h, data };
}

/** Every light on the map, from the `lights` of the standing and flat props. */
export function collectLights(props: StaticProp[], lut: Lut): Light[] {
  const stamps = new Map<string, Stamp>();
  const lights: Light[] = [];
  for (const prop of props) {
    for (const def of prop.def.lights ?? []) {
      if (!(def.radius > 0)) continue;
      const x = Math.round(prop.x + def.dx);
      const y = Math.round(prop.y + def.dy);
      const gy = Math.max(y, prop.y);
      const radius = def.radius;
      // full strength while the source is within reach of the ground, then fading out
      const pool = POOL_GAIN * Math.max(0, Math.min(1, (1.6 * radius - (gy - y)) / radius));
      const partial = {
        x,
        y,
        gy,
        radius,
        pool,
        color: normalized(lutRgb(lut, def.slot ?? 'ochre.2')),
        flicker: Math.max(0, Math.min(1, def.flicker ?? 0)),
        phase: [hash01(x, y, 1) * Math.PI * 2, hash01(x, y, 2) * Math.PI * 2] as [number, number],
        prop,
      };
      const key = `${radius}:${gy - y}`;
      let stamp = stamps.get(key);
      if (!stamp) {
        // stamps are positioned relative to the source, so one serves every light of this shape
        stamp = buildStamp({ x: 0, y: 0, gy: gy - y, radius, pool });
        stamps.set(key, stamp);
      }
      lights.push({ ...partial, stamp });
    }
  }
  return lights;
}

/** Brightness of a light at scene time `t`: 1 for a steady light, a slow uneven wobble for a flame. */
export function flickerAt(l: Light, t: number): number {
  if (l.flicker === 0) return 1;
  const wave = 0.6 * Math.sin(t * 9.1 + l.phase[0]) + 0.4 * Math.sin(t * 23.3 + l.phase[1]);
  return 1 - l.flicker * (0.5 + 0.5 * wave);
}

/** Sum every visible light into the view's glow buffer, scaled by `amount` (the lamps' 0..1 state). */
export function accumulateGlow(v: View, lights: Light[], t: number, amount: number): void {
  const glow = v.glow;
  glow.fill(0);
  for (const l of lights) {
    const s = l.stamp;
    const left = l.x + s.left - v.x0;
    const top = l.y + s.top - v.y0;
    const i0 = Math.max(0, -left);
    const j0 = Math.max(0, -top);
    const i1 = Math.min(s.w, v.w - left);
    const j1 = Math.min(s.h, v.h - top);
    if (i0 >= i1 || j0 >= j1) continue;
    const f = amount * flickerAt(l, t);
    const [cr, cg, cb] = l.color;
    for (let j = j0; j < j1; j++) {
      let si = j * s.w + i0;
      let o = ((top + j) * v.w + left + i0) * 3;
      for (let i = i0; i < i1; i++, si++, o += 3) {
        const k = s.data[si]! * f;
        if (k <= 0) continue;
        glow[o] = glow[o]! + k * cr;
        glow[o + 1] = glow[o + 1]! + k * cg;
        glow[o + 2] = glow[o + 2]! + k * cb;
      }
    }
  }
}

/**
 * The light falling on an actor standing at world (x, y), as one flat RGB value for the
 * whole sprite. People are never dithered: they warm up evenly as they step into a pool.
 */
export function actorGlow(lights: Light[], x: number, y: number, t: number, amount: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const l of lights) {
    const k = Math.max(poolAt(l, x, y), haloAt(l, x, y - CHEST));
    if (k <= 0) continue;
    const f = k * amount * flickerAt(l, t);
    r += f * l.color[0];
    g += f * l.color[1];
    b += f * l.color[2];
  }
  return [r, g, b];
}

/**
 * The shear of the shadow a caster standing at (fx, fy) throws away from a light, or
 * undefined if the light's pool does not reach it.
 */
function lampShear(l: Light, fx: number, fy: number): [number, number] | undefined {
  if (poolAt(l, fx, fy) < 0.03) return undefined;
  const vx = fx - l.x;
  const vy = (fy - l.gy) / POOL_SQUASH;
  const dist = Math.hypot(vx, vy);
  const height = Math.max(8, l.gy - l.y);
  // the further from the lamp and the lower the lamp, the longer the shadow
  const len = Math.max(0.3, Math.min(1.4, dist / height));
  if (dist < 1) return [0, len * POOL_SQUASH];
  return [(vx / dist) * len, (vy / dist) * len * POOL_SQUASH];
}

/** Lay one caster's lamp shadows into a mask: each pixel records the pool light it blocks. */
function castOcclusion(lights: Light[], d: { sprite: Drawable['sprite']; x: number; y: number }, fx: number, strength: number, owner: StaticProp | undefined, put: (wx: number, wy: number, value: number) => void): void {
  for (const l of lights) {
    if (l.prop === owner) continue;
    const shear = lampShear(l, fx, d.y);
    if (!shear) continue;
    projectSilhouette(d.sprite, d.x, d.y, shear[0], shear[1], (wx, wy) => {
      const k = poolAt(l, wx + 0.5, wy + 0.5);
      if (k > 0) put(wx, wy, Math.round(k * 255 * strength));
    });
  }
}

/** The static lamp-shadow mask of every standing prop, town-sized. Built on first use. */
export function createTownOcclusion(w: number, h: number, lights: Light[], props: StaticProp[]): () => Uint8Array {
  let mask: Uint8Array | undefined;
  return () => {
    if (mask) return mask;
    const m = (mask = new Uint8Array(w * h));
    for (const p of props) {
      const s = p.def.sprite;
      castOcclusion(lights, { sprite: s, x: p.x, y: p.y }, p.x - s.ax + s.w / 2, 1, p, (wx, wy, value) => {
        if (wx < 0 || wy < 0 || wx >= w || wy >= h) return;
        const i = wy * w + wx;
        if (m[i]! < value) m[i] = value;
      });
    }
    return m;
  };
}

/** Add the actors' lamp shadows to the view's occlusion mask. */
export function castActorOcclusion(v: View, lights: Light[], list: Drawable[]): void {
  for (const d of list) {
    if (!d.actor) continue;
    castOcclusion(lights, d, d.x, d.alpha, undefined, (wx, wy, value) => {
      const x = wx - v.x0;
      const y = wy - v.y0;
      if (x < 0 || y < 0 || x >= v.w || y >= v.h) return;
      const i = y * v.w + x;
      if (v.occlusion[i]! < value) v.occlusion[i] = value;
    });
  }
}

/**
 * Draw the emissive layers at full palette brightness, on top of the graded frame.
 * A glowing pixel only shows where its prop is the front-most thing, so a person standing
 * in front of a lit window still covers it.
 */
export function drawEmissive(v: View, list: Drawable[], lut: Lut, amount: number): void {
  const a = Math.round(Math.max(0, Math.min(1, amount)) * 256);
  if (a === 0) return;
  const d = v.color;
  for (const item of list) {
    const s = item.prop?.def.emissive;
    if (!s) continue;
    const left = item.x - s.ax - v.x0;
    const top = item.y - s.ay - v.y0;
    const sx0 = Math.max(0, -left);
    const sy0 = Math.max(0, -top);
    const sx1 = Math.min(s.w, v.w - left);
    const sy1 = Math.min(s.h, v.h - top);
    for (let sy = sy0; sy < sy1; sy++) {
      for (let sx = sx0; sx < sx1; sx++) {
        const p = s.px[sy * s.w + sx]!;
        const pi = (top + sy) * v.w + left + sx;
        if (p === 0 || v.owner[pi] !== item.id) continue;
        const o = pi * 4;
        const lo = p * 4;
        d[o] = d[o]! + (((lut[lo]! - d[o]!) * a) >> 8);
        d[o + 1] = d[o + 1]! + (((lut[lo + 1]! - d[o + 1]!) * a) >> 8);
        d[o + 2] = d[o + 2]! + (((lut[lo + 2]! - d[o + 2]!) * a) >> 8);
      }
    }
  }
}
