/**
 * The built-in buildings, each a `makeBuilding` spec. Read them as examples: a new
 * building is a few lines like these.
 *
 * They are meant to stand on one street, so they share parts and rules and differ where
 * it shows from across the room: width, storeys, roof form and colour, wall, where the
 * door sits, and one feature that names the place (a sign, an awning, a turret).
 */
import type { BuildingSpec } from './spec';

export const presetSpecs: BuildingSpec[] = [
  // --- houses ---
  // The reference cottage: timber frame, red gable roof, flower boxes.
  {
    id: 'house',
    width: 5,
    wall: 'timber',
    roof: { form: 'gable', color: 'red', height: 44 },
    door: { at: 2.5, style: 'panelled', paint: 'red' },
    windows: [{ at: 1, box: true }, { at: 4, box: true }],
    chimney: true,
  },
  // The reference townhouse: two storeys of pale yellow plaster under a blue hip roof.
  {
    id: 'townhouse',
    width: 4,
    storeys: 2,
    wall: 'yellow',
    roof: { form: 'hip', color: 'blue', height: 38 },
    door: { at: 1.5, style: 'panelled', paint: 'wood' },
    windows: [{ at: 3, box: true }],
    upperWindows: [{ at: 1, shutters: 'teal' }, { at: 3, shutters: 'teal' }],
    chimney: true,
  },
  // Brick under a low hip roof, the door to one side, an attic dormer.
  {
    id: 'house-brick',
    width: 5,
    wall: 'brick',
    roof: { form: 'hip', color: 'blue', height: 40 },
    door: { at: 1.5, style: 'panelled', paint: 'wood', lantern: 'right' },
    windows: [{ at: 3.5, shutters: 'teal', lit: 'curtains' }],
    dormers: [2.5],
    chimney: true,
  },
  // A small plastered cottage with a blue roof and plum shutters.
  {
    id: 'cottage-blue',
    width: 4,
    wall: 'plaster',
    roof: { form: 'gable', color: 'blue', height: 40 },
    door: { at: 1.5, style: 'plain', paint: 'teal' },
    windows: [{ at: 3, shutters: 'plum', box: true }],
    chimney: 1.25,
  },
  // A long, low stone farmhouse. The roof is wider than the face, so the chimney stands on the join.
  {
    id: 'farmhouse',
    width: 7,
    wall: 'stone',
    roof: { form: 'gable', color: 'orange', height: 44 },
    door: { at: 2.5, style: 'plain', paint: 'wood', lantern: 'right' },
    windows: [{ at: 1, shutters: 'teal' }, { at: 4.25, lit: 'curtains' }, { at: 6, lit: 'dark' }],
    chimney: 5,
  },
  // A plank shed: no windows, no chimney, a plain door.
  {
    id: 'shed',
    width: 3,
    wall: 'planks',
    roof: { form: 'gable', color: 'red', height: 32 },
    door: { at: 1.5, style: 'plain', paint: 'wood' },
  },

  // --- shops and public buildings: one feature names each ---
  // The cafe: shop window and glass door under a teal awning, a cup on the sign.
  {
    id: 'cafe',
    width: 6,
    wall: 'plaster',
    roof: { form: 'hip', color: 'orange', height: 40 },
    door: { at: 2.5, style: 'shop', paint: 'teal' },
    windows: [{ at: 4.25, kind: 'shop' }],
    awning: 'teal',
    sign: { icon: 'cup', at: 1 },
    chimney: 5,
  },
  // The bakery: two storeys, a red awning, a loaf on the sign, and a chimney for the oven.
  {
    id: 'bakery',
    width: 5,
    storeys: 2,
    wall: 'yellow',
    roof: { form: 'hip', color: 'orange', height: 38 },
    door: { at: 1.5, style: 'shop', paint: 'wood' },
    windows: [{ at: 3.5, kind: 'shop' }],
    upperWindows: [{ at: 2.75, lit: 'curtains' }, { at: 4, lit: 'dark' }],
    awning: 'red',
    sign: { icon: 'loaf', at: 1.5 },
    chimney: 4,
  },
  // The library: a formal stone front, a book over the door, a step up.
  {
    id: 'library',
    width: 5,
    storeys: 2,
    wall: 'stone',
    roof: { form: 'hip', color: 'red', height: 40 },
    door: { at: 2.5, style: 'panelled', paint: 'blue', step: true },
    windows: [{ at: 1, kind: 'tall' }, { at: 4, kind: 'tall' }],
    upperWindows: [{ at: 1 }, { at: 4, lit: 'dark' }],
    sign: { icon: 'book', at: 2.5 },
  },
  // The school: one long storey, tall windows, a double door, a bell on the ridge.
  {
    id: 'school',
    width: 8,
    wall: 'yellow',
    roof: { form: 'gable', color: 'red', height: 44 },
    door: { at: 4, style: 'double', paint: 'wood', step: true },
    windows: [{ at: 1, kind: 'tall' }, { at: 2.25, kind: 'tall' }, { at: 5.75, kind: 'tall' }, { at: 7, kind: 'tall' }],
    turret: 'bell',
  },
  // The general store: timber frame, a plum awning, a basket on the sign.
  {
    id: 'shop',
    width: 6,
    storeys: 2,
    wall: 'timber',
    roof: { form: 'gable', color: 'orange', height: 40 },
    door: { at: 1.5, style: 'shop', paint: 'green' },
    windows: [{ at: 4, kind: 'shop' }],
    upperWindows: [{ at: 3 }, { at: 5, lit: 'curtains' }],
    awning: 'plum',
    sign: { icon: 'basket', at: 1.5 },
    chimney: 5,
  },
  // The hall: the one landmark, with the clock turret. One per town, on the square.
  {
    id: 'townhall',
    width: 8,
    storeys: 2,
    wall: 'plaster',
    roof: { form: 'hip', color: 'blue', height: 40 },
    door: { at: 4, style: 'double', paint: 'red', step: true },
    windows: [{ at: 1, kind: 'tall' }, { at: 2.25, kind: 'tall' }, { at: 5.75, kind: 'tall' }, { at: 7, kind: 'tall' }],
    upperWindows: [{ at: 1 }, { at: 2.25, lit: 'curtains' }, { at: 4 }, { at: 5.75 }, { at: 7, lit: 'dark' }],
    turret: 'clock',
  },
  // The post office: a letter on the sign and a blue door with a lantern.
  {
    id: 'post-office',
    width: 5,
    wall: 'yellow',
    roof: { form: 'hip', color: 'red', height: 38 },
    door: { at: 2.5, style: 'panelled', paint: 'blue', lantern: 'right' },
    windows: [{ at: 4.25, box: true }],
    sign: { icon: 'letter', at: 1 },
    chimney: 1.25,
  },
];
