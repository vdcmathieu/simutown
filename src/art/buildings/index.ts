/**
 * The building kit.
 *
 * - Parts (`roof`, `door`, `windowPart`, `awning`, `sign`, ...) are the approved pieces of
 *   the style pin, drawn once.
 * - `makeBuilding(spec)` assembles them into a complete PropDef. Read `BuildingSpec`.
 * - `buildings` is the registry of presets, each built by `makeBuilding` from a spec in
 *   `presets.ts`.
 *
 *   import { makeBuilding } from './art/buildings';
 *   const clinic = makeBuilding({ id: 'clinic', width: 5, door: { at: 2.5, paint: 'teal' }, windows: [{ at: 1 }, { at: 4 }] });
 */
import type { PropDef } from '../../core/types';
import { makeBuilding } from './make';
import { presetSpecs } from './presets';

export { type Canvas, Layers, type Part } from './canvas';
export { door, DOOR_STYLES, type DoorStyle, type Paint, PAINTS } from './doors';
export { awning, AWNING_COLORS, type AwningColor, awningWidth, flowerBox, lantern, shutter, SHUTTER_COLORS, type ShutterColor, step } from './extras';
export { makeBuilding } from './make';
export { presetSpecs } from './presets';
export { roof, ROOF_COLORS, ROOF_FORMS, type RoofColor, type RoofForm, type RoofSpec } from './roofs';
export { bellTurret, chimney, clockFace, clockTurret, dormer, type RoofPiece } from './rooftop';
export { sign, SIGN_ICONS, type SignIcon } from './signs';
export { type At, type BuildingSpec, type DoorSpec, planBuilding, type Plan, type RoofChoice, type SignSpec, type WindowSpec } from './spec';
export { wall, WALL_KINDS, type WallKind, type WallSpec } from './walls';
export { LIT_LOOKS, type LitLook, WINDOW_KINDS, type WindowKind, windowPart } from './windows';

/** Every built-in building, by id. */
export const buildings: Record<string, PropDef> = Object.fromEntries(presetSpecs.map((spec) => [spec.id, makeBuilding(spec)]));
