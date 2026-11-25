/**
 * The building spec: what a scene author writes to get a building from `makeBuilding`.
 * Types only; `plan.ts` checks a spec and turns it into pixels.
 */
import type { DoorStyle, Paint } from './doors';
import type { AwningColor, ShutterColor } from './extras';
import type { RoofColor, RoofForm } from './roofs';
import type { SignIcon } from './signs';
import type { WallKind } from './walls';
import type { LitLook, WindowKind } from './windows';

/**
 * Where a piece sits along the facade: the distance in tiles from the building's left edge
 * to the centre of the piece. `0.5` is the middle of the first tile, `2` is the line
 * between the second and third tiles. Half tiles keep a facade tidy.
 */
export type At = number;

/** The door: where it stands and how it looks. */
export interface DoorSpec {
  /**
   * Centre of the door. A single door stands on one tile so that people line up with it:
   * use `n + 0.5`, from 1.5 to width - 1.5. A double door covers two tiles: use a whole
   * number, from 2 to width - 2.
   */
  at: At;
  /** Default 'panelled'. */
  style?: DoorStyle;
  /** Default 'red'. */
  paint?: Paint;
  /** Hang a lantern beside the door, or one on each side. Lit at dusk. */
  lantern?: 'left' | 'right' | 'both';
  /** A stone step in front of the door, for buildings that want a little ceremony. */
  step?: boolean;
}

/** One window. */
export interface WindowSpec {
  /** Centre of the window. */
  at: At;
  /** Default 'four-pane'. `tall` and `shop` only fit the ground floor. */
  kind?: WindowKind;
  /** Louvred shutters on both sides. Not on shop or round windows. */
  shutters?: ShutterColor;
  /** A window box of geraniums. Four-pane ground-floor windows only. */
  box?: boolean;
  /** How it looks at dusk. Default 'warm'. Mix in a 'dark' and a 'curtains' for life. */
  lit?: LitLook;
}

/** The roof's form, colour and height. All optional. */
export interface RoofChoice {
  /** Default: 'gable' for one storey, 'hip' for two (it keeps tall buildings from looming). */
  form?: RoofForm;
  /** Default 'red'. */
  color?: RoofColor;
  /**
   * Height in pixels. Default and limits follow STYLE.md: 32-36 for a building of three
   * tiles or less, 36-40 for a hip roof or two storeys, 40-44 for a one-storey gable.
   */
  height?: number;
}

/** A hanging sign. */
export interface SignSpec {
  /** A picture, never words. */
  icon: SignIcon;
  /** Centre of the sign. */
  at: At;
  /** Default: 'upper' on a two-storey building, 'ground' otherwise. */
  storey?: 'ground' | 'upper';
}

/**
 * Everything `makeBuilding` needs. Only `id`, `width` and `door` are required.
 *
 * @example
 * // A small bakery: shop window and door under one awning, a loaf on the sign.
 * const bakery = makeBuilding({
 *   id: 'bakery',
 *   width: 6,
 *   wall: 'yellow',
 *   roof: { color: 'orange' },
 *   door: { at: 2.5, style: 'shop', paint: 'wood' },
 *   windows: [{ at: 4.25, kind: 'shop' }],
 *   awning: 'red',
 *   sign: { icon: 'loaf', at: 1 },
 *   chimney: true,
 * });
 */
export interface BuildingSpec {
  /** The prop id, e.g. 'bakery'. Register the result under the same key. */
  id: string;
  /** Width in tiles, 3 to 10. The sprite is `width * 16` pixels wide. */
  width: number;
  /** Default 1. Nothing in town is taller than two storeys and a roof. */
  storeys?: 1 | 2;
  /** Default 'plaster'. */
  wall?: WallKind;
  roof?: RoofChoice;
  door: DoorSpec;
  /** Ground-floor windows, in any order. */
  windows?: WindowSpec[];
  /** Upper-storey windows. Needs `storeys: 2`. */
  upperWindows?: WindowSpec[];
  /**
   * `true` stands a chimney over the last bay on the right; a number is its centre in
   * tiles, which must be right of the middle of the roof (STYLE.md).
   * A roof wider than 5 tiles has a join in its tiles at 5 tiles from the left, and needs
   * a chimney, a dormer or a turret standing on it: there the default is `true`, on the join.
   */
  chimney?: boolean | At;
  /** Dormers with a round attic window, by their centres. */
  dormers?: At[];
  /** A turret in the middle of the ridge: 'bell' for a school, 'clock' for the hall. */
  turret?: 'bell' | 'clock';
  /**
   * A striped awning. A colour alone spans the door and every shop window; give `from`
   * and `to` (in tiles) to place it yourself.
   */
  awning?: AwningColor | { color: AwningColor; from: At; to: At };
  /** A hanging sign with an icon. */
  sign?: SignSpec;
  /** A clock face on the top storey of the wall, by its centre. */
  clock?: At;
}
