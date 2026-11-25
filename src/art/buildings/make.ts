/**
 * `makeBuilding`: assemble a building from the kit's parts and return a complete PropDef.
 */
import { TILE, type LightDef, type PropDef } from '../../core/types';
import { done, Layers } from './canvas';
import { door } from './doors';
import { awning, flowerBox, lantern, shutter, SHUTTER_W, step, STEP_H } from './extras';
import { OVERHANG, roof } from './roofs';
import { bellTurret, chimney, CHIMNEY_RISE, clockFace, clockTurret, dormer, type RoofPiece } from './rooftop';
import { sign } from './signs';
import { type BuildingSpec, planBuilding } from './spec';
import { GROUND, isTimber, TIMBER, timberPosts, UPPER, wall, wallOutline, type WallSpec } from './walls';
import { type WindowKind, windowPart } from './windows';

/** Glow radius of a lit window by kind, and the centre of its glass from its top-left corner. */
const GLASS: Record<WindowKind, { radius: number; cx: number; cy: number }> = {
  'four-pane': { radius: 28, cx: 7, cy: 5 },
  tall: { radius: 30, cx: 7, cy: 8 },
  shop: { radius: 36, cx: 14, cy: 5 },
  round: { radius: 20, cx: 5, cy: 5 },
};

/**
 * Build a building from a spec. The result is a complete PropDef, ready for a town:
 *
 * - `sprite` and `emissive`: the day look, and the lit windows, glass door, lantern and clock.
 * - `footprint`: as wide as the building and one to three tiles deep (see below).
 * - `lights`: one per lit window and lantern; upstairs windows, dormers and clocks glow
 *   without pooling on the ground.
 * - `places.door`: the walkable tile in front of the door. A double door also has
 *   `door-right`, in front of its right leaf.
 * - `castHeight`: the real height of the ridge, for the sun's shadow.
 *
 * Positions are in tiles from the building's left edge to the centre of each piece.
 * A bad spec throws an error that names the problem and lists what is valid.
 *
 * @example
 * // A plain plastered house, five tiles wide, with a blue door between two windows.
 * const home = makeBuilding({
 *   id: 'home',
 *   width: 5,
 *   door: { at: 2.5, paint: 'blue' },
 *   windows: [{ at: 1, box: true }, { at: 4, lit: 'curtains' }],
 *   chimney: true,
 * });
 * // then: defineTown({ ..., props: [{ kind: 'home', at: [3, 6] }] }, { ...art, props: { ...art.props, home } })
 */
export function makeBuilding(spec: BuildingSpec): PropDef {
  const p = planBuilding(spec);
  const { W, wallTop, base } = p;
  const H = base + 1 + (p.door.step ? STEP_H : 0);
  // The ground line is the row under the wall's base line; a door step hangs below it.
  const ground = base + 1;
  const l = new Layers(W, H);
  const lights: LightDef[] = [];
  const light = (x: number, y: number, radius: number, more: Partial<LightDef> = {}): void => {
    lights.push({ dx: x, dy: y - ground, radius, slot: 'ochre.2', ...more });
  };

  // --- wall ---
  const ws: WallSpec = { kind: p.wall, x: OVERHANG, w: W - 2 * OVERHANG, top: wallTop, base, storeys: p.storeys };
  wall(l.day, ws);
  if (isTimber(p.wall)) {
    timberPosts(l.day, ws, [ws.x, ws.x + ws.w - TIMBER]);
    // door posts stand on the ground storey only
    const from = p.storeys === 2 ? wallTop + UPPER - TIMBER : undefined;
    timberPosts(l.day, ws, [p.door.x - 6, p.door.x + p.door.w + 2], from);
  }

  // --- openings ---
  for (const w of p.windows) {
    l.put(windowPart(w.kind, w.lit), w.x, w.y);
    if (w.shutters) {
      const s = shutter(w.shutters, w.h - 2);
      l.put(s, w.x - (SHUTTER_W - 1), w.y);
      l.put(s, w.x + w.w - 1, w.y);
    }
    if (w.box) l.put(flowerBox, w.x, w.y + 11);
    if (w.lit !== 'dark') {
      const g = GLASS[w.kind];
      light(w.x + g.cx, w.y + g.cy, w.upper ? g.radius - 4 : g.radius, w.upper ? { ground: false } : {});
    }
  }
  l.put(door(p.door.style, p.door.paint), p.door.x, p.door.y);
  if (p.door.style === 'shop') light(p.door.x + 8, p.door.y + 8, 18);
  for (const x of p.door.lanternXs) {
    l.put(lantern, x, base - 21);
    light(x + 2, base - 17, 22, { flicker: 0.1 });
  }
  if (p.sign) l.put(sign(p.sign.icon), p.sign.x, p.sign.y);
  if (p.clock) {
    l.put(clockFace, p.clock.x, p.clock.y);
    light(p.clock.x + 6, p.clock.y + 6, 16, { ground: false });
  }
  if (p.awning) l.put(awning(p.awning.color, p.awning.w), p.awning.x, p.awning.y);
  wallOutline(l.day, ws);

  // --- roof ---
  l.put(roof({ w: W, h: p.roof.h, form: p.roof.form, color: p.roof.color, join: p.roof.join }), 0, p.top);
  const stand = (piece: RoofPiece, x: number, y: number): void => {
    l.put(piece, x, y);
    if (piece.lit && piece.glowAt) light(x + piece.glowAt[0], y + piece.glowAt[1], 16, { ground: false });
  };
  // a dormer sits on the slope with its sill just above the eave
  for (const x of p.dormerXs) {
    const d = dormer(p.roof.color);
    stand(d, x, p.top + p.roof.h - 5 - d.day.h);
  }
  if (p.chimneyX !== undefined) l.put(chimney, p.chimneyX, p.top - CHIMNEY_RISE);
  if (p.turret) {
    const t = p.turret === 'bell' ? bellTurret(p.roof.color) : clockTurret(p.roof.color);
    stand(t, W / 2 - Math.floor(t.day.w / 2), p.top - t.rise);
  }

  if (p.door.step) l.put(step(p.door.w + 4), p.door.x - 2, base);

  // The footprint rule. In this three-quarter view the picture of a building is taller
  // than the ground it stands on: the wall is pure height, and the roof is partly height
  // and partly depth. The footprint is the ground the building really covers:
  //
  //   - as wide as the sprite, so nobody walks through a wall or squeezes past a corner;
  //   - `depth` tiles deep, counted up from the base line. Someone on the first free row
  //     behind it has their feet 16 * depth + 4 pixels above the base line and the top of
  //     their head 24 pixels higher. The depth is the largest (up to 3) for which the ridge
  //     still hides them: at most 2 pixels of hair show above it.
  //
  // So an actor walking behind a building disappears behind its roof line through plain
  // depth sorting (their base line is above the building's), and walks back into view at
  // either end. Nobody ever stands "on" the roof. Two storeys, or one storey under a
  // 44-pixel roof, give 3 tiles; a lower roof on one storey gives 2.
  const wallH = GROUND + (p.storeys === 2 ? UPPER : 0);
  const ridge = wallH + p.roof.h - 2;

  const places: Record<string, { dx: number; dy: number }> = { door: { dx: p.door.tile, dy: 1 } };
  if (p.door.style === 'double') places['door-right'] = { dx: p.door.tile + 1, dy: 1 };

  return {
    id: p.id,
    sprite: done(l.day, [0, ground]),
    emissive: done(l.glow, [0, ground]),
    footprint: { w: p.tiles, h: p.depth },
    lights,
    places,
    // The ridge sits half the depth back, so that much of its picture height is depth, not height.
    castHeight: Math.max(wallH, ridge - (p.depth * TILE) / 2),
  };
}
