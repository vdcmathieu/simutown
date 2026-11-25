/**
 * The building spec: what a scene author writes to get a building, and the checks that
 * turn it into a plan in pixels. Every mistake throws an error that says what is valid.
 */
import { TILE } from '../../core/types';
import { DOOR_H, DOOR_STYLES, type DoorStyle, doorWidth, type Paint, PAINTS } from './doors';
import { AWNING_COLORS, type AwningColor, awningWidth, lantern as lanternPart, SHUTTER_COLORS, SHUTTER_W, type ShutterColor } from './extras';
import { FACE_W, HIP_LEAN, OVERHANG, ROOF_COLORS, ROOF_FORMS, type RoofColor, type RoofForm } from './roofs';
import { bellTurret, chimney, CHIMNEY_RISE, clockFace, clockTurret, dormer } from './rooftop';
import { SIGN_ICONS, SIGN_W, type SignIcon } from './signs';
import { GROUND, isTimber, TIMBER, UPPER, WALL_KINDS, type WallKind } from './walls';
import { LIT_LOOKS, type LitLook, WINDOW_KINDS, type WindowKind, windowSize } from './windows';

/**
 * Where a piece sits along the facade: the distance in tiles from the building's left edge
 * to the centre of the piece. `0.5` is the middle of the first tile, `2` is the line
 * between the second and third tiles. Half tiles keep a facade tidy.
 */
export type At = number;

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
   * `true` stands a chimney right of centre; a number is its centre in tiles.
   * A roof wider than 5 tiles has a join in its tiles at 5 tiles from the left, and needs
   * a chimney, a dormer or a turret standing on it: there the default is `true`.
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

// --- the plan: a checked spec in pixels ------------------------------------------------

export interface PlannedWindow {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: WindowKind;
  lit: LitLook;
  shutters?: ShutterColor;
  box: boolean;
  upper: boolean;
}

/** A spec with every default filled in and every position turned into pixels. */
export interface Plan {
  id: string;
  /** Sprite width, and the tile width it came from. */
  W: number;
  tiles: number;
  storeys: 1 | 2;
  wall: WallKind;
  roof: { form: RoofForm; color: RoofColor; h: number; join?: number };
  /** Rows above the roof for a chimney or a turret. */
  top: number;
  /** First row of the wall (the eave covers two rows of it) and the row of the ink base line. */
  wallTop: number;
  base: number;
  /** Footprint depth in tiles. */
  depth: number;
  door: { x: number; y: number; w: number; style: DoorStyle; paint: Paint; step: boolean; lanternXs: number[]; tile: number };
  windows: PlannedWindow[];
  chimneyX?: number;
  dormerXs: number[];
  turret?: 'bell' | 'clock';
  awning?: { x: number; y: number; w: number; color: AwningColor };
  sign?: { x: number; y: number; icon: SignIcon };
  clock?: { x: number; y: number };
}

/** Sizes of the pieces the plan has to keep apart, measured on the pieces themselves. */
const CHIMNEY_W = chimney.w;
const DORMER_W = dormer('red').day.w;
const DORMER_H = dormer('red').day.h;
const TURRET = {
  bell: { w: bellTurret('red').day.w, rise: bellTurret('red').rise },
  clock: { w: clockTurret('red').day.w, rise: clockTurret('red').rise },
} as const;
const LANTERN_W = lanternPart.day.w;
const CLOCK_W = clockFace.day.w;
/** Pieces on a wall keep at least this many pixels apart. */
const GAP = 2;
/** Tiles a building may be wide. A door needs a whole tile clear of the corners, so three is the least. */
const MIN_W = 3;
const MAX_W = 10;

const list = (names: readonly (string | number)[]): string => names.join(', ');
const tiles = (px: number): string => String(Math.round((px / TILE) * 100) / 100);

interface Span {
  what: string;
  x0: number;
  x1: number;
}

/** Plan a building: check the spec and work out where every piece goes. Throws on any mistake. */
export function planBuilding(spec: BuildingSpec): Plan {
  const id = typeof spec?.id === 'string' && spec.id !== '' ? spec.id : '?';
  const fail = (message: string): never => {
    throw new Error(`makeBuilding("${id}"): ${message}`);
  };
  const oneOf = <T extends string | number>(value: unknown, valid: readonly T[], what: string): T => {
    if (!valid.includes(value as T)) fail(`unknown ${what} ${JSON.stringify(value)}. Valid: ${list(valid)}.`);
    return value as T;
  };
  const keys = (obj: object, valid: readonly string[], what: string): void => {
    for (const k of Object.keys(obj)) if (!valid.includes(k)) fail(`unknown option "${k}" in ${what}. Valid options: ${list(valid)}.`);
  };
  const num = (value: unknown, what: string): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${what} must be a number, got ${JSON.stringify(value)}.`);
    return value as number;
  };

  if (typeof spec !== 'object' || spec === null) fail('the spec must be an object: { id, width, door, ... }.');
  if (id === '?') fail('"id" must be a non-empty string, e.g. "bakery".');
  keys(spec, ['id', 'width', 'storeys', 'wall', 'roof', 'door', 'windows', 'upperWindows', 'chimney', 'dormers', 'turret', 'awning', 'sign', 'clock'], 'the spec');
  if (!Number.isInteger(spec.width) || spec.width < MIN_W || spec.width > MAX_W) {
    fail(`"width" is ${JSON.stringify(spec.width)}: it must be a whole number of tiles from ${MIN_W} to ${MAX_W}.`);
  }
  const storeys = oneOf(spec.storeys ?? 1, [1, 2] as const, 'number of storeys');
  const wall = oneOf(spec.wall ?? 'plaster', WALL_KINDS, 'wall');
  const timber = isTimber(wall);
  const W = spec.width * TILE;

  // --- roof ---
  const roofSpec = spec.roof ?? {};
  keys(roofSpec, ['form', 'color', 'height'], '"roof"');
  const form = oneOf(roofSpec.form ?? (storeys === 2 ? 'hip' : 'gable'), ROOF_FORMS, 'roof form');
  const color = oneOf(roofSpec.color ?? 'red', ROOF_COLORS, 'roof colour');
  const narrow = spec.width <= 3;
  const [minH, maxH] = narrow ? [32, 36] : storeys === 2 || form === 'hip' ? [36, 40] : [40, 44];
  const roofH = roofSpec.height ?? (narrow ? 34 : storeys === 2 || form === 'hip' ? 38 : 44);
  if (!Number.isInteger(roofH) || roofH < minH || roofH > maxH) {
    const why = narrow ? 'a building of three tiles or less' : storeys === 2 ? 'a two-storey building' : `a one-storey ${form} roof`;
    fail(`roof height ${JSON.stringify(roofSpec.height)} is out of range: ${why} takes a roof ${minH} to ${maxH} pixels tall.`);
  }
  const lean = form === 'hip' ? HIP_LEAN : 0;

  // --- rooftop ---
  const turret = spec.turret === undefined ? undefined : oneOf(spec.turret, ['bell', 'clock'] as const, 'turret');
  const wide = W > FACE_W;
  // A wide roof restarts its tiles at the join: under the turret if there is one, else at 80 pixels.
  const join = wide ? (turret ? W / 2 : FACE_W) : undefined;
  const dormerAts = spec.dormers ?? [];
  if (!Array.isArray(dormerAts)) fail('"dormers" must be a list of positions in tiles, e.g. [2.5].');
  const roofSpans: Span[] = [];
  if (turret) roofSpans.push({ what: `the ${turret} turret`, x0: W / 2 - Math.floor(TURRET[turret].w / 2), x1: W / 2 + Math.ceil(TURRET[turret].w / 2) - 1 });
  const dormerXs = dormerAts.map((at, i) => {
    const x = Math.round(num(at, `dormer ${i + 1}`) * TILE) - Math.floor(DORMER_W / 2);
    if (roofH - 5 - DORMER_H < 5) fail(`a dormer needs a roof at least ${DORMER_H + 10} pixels tall; this roof is ${roofH}.`);
    roofSpans.push({ what: `dormer ${i + 1}`, x0: x, x1: x + DORMER_W - 1 });
    return x;
  });
  const onJoin = (s: Span) => join !== undefined && s.x0 <= join - 1 && s.x1 >= join;
  // `true` stands the chimney on the join of a wide roof, else over the last window bay on the right.
  let chimneyX: number | undefined;
  if (typeof spec.chimney === 'number') chimneyX = Math.round(num(spec.chimney, '"chimney"') * TILE) - CHIMNEY_W / 2;
  else if (spec.chimney === true || (spec.chimney === undefined && wide && !roofSpans.some(onJoin))) {
    chimneyX = wide && !turret ? FACE_W - CHIMNEY_W / 2 : W - 23;
  } else if (spec.chimney !== undefined && spec.chimney !== false) fail(`"chimney" must be true, false or a position in tiles, got ${JSON.stringify(spec.chimney)}.`);
  if (chimneyX !== undefined) roofSpans.push({ what: 'the chimney', x0: chimneyX, x1: chimneyX + CHIMNEY_W - 1 });
  if (wide && !roofSpans.some(onJoin)) {
    fail(
      `a roof wider than ${FACE_W / TILE} tiles restarts its tiles ${FACE_W / TILE} tiles from the left, and something must stand on that join. ` +
        `Use chimney: true (or chimney: ${FACE_W / TILE}), dormers: [${FACE_W / TILE}], or a turret.`,
    );
  }
  const roofMin = lean + 2;
  const roofMax = W - 1 - lean - 2;
  for (const s of roofSpans) {
    if (s.x0 < roofMin || s.x1 > roofMax) {
      const half = (s.x1 - s.x0 + 1) / 2;
      fail(`${s.what} does not fit on the roof there. Its centre can be from ${tiles(roofMin + half)} to ${tiles(roofMax + 1 - half)} tiles.`);
    }
  }
  const apart = (spans: Span[], where: string): void => {
    const sorted = [...spans].sort((a, b) => a.x0 - b.x0);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1]!;
      const b = sorted[i]!;
      if (b.x0 - a.x1 - 1 < GAP) {
        fail(
          `${b.what} (${tiles(b.x0)} to ${tiles(b.x1 + 1)} tiles) is too close to ${a.what} (${tiles(a.x0)} to ${tiles(a.x1 + 1)} tiles) ${where}. ` +
            `Leave at least ${GAP} pixels (${tiles(GAP)} tiles) between pieces.`,
        );
      }
    }
  };
  apart(roofSpans, 'on the roof');

  // --- rows ---
  const top = Math.max(chimneyX !== undefined ? CHIMNEY_RISE : 0, turret ? TURRET[turret].rise : 0);
  const wallTop = top + roofH - 2;
  const wallH = GROUND + (storeys === 2 ? UPPER : 0);
  const base = wallTop + wallH;
  // The ridge, in pixels above the ground line. See the footprint rule in make.ts.
  const ridge = wallH + roofH - 2;
  const depth = Math.max(1, Math.min(3, Math.floor((ridge - 26) / TILE)));

  // --- the facade ---
  // Pieces stay clear of the wall's edge, and of the corner posts of a timber frame.
  const edge = OVERHANG + (timber ? TIMBER : 0) + GAP;
  const xMin = edge;
  const xMax = W - 1 - edge;
  /** Left edge of a piece `w` wide centred on `at`. Pieces lean outwards by the odd half pixel, so a facade can be mirror-symmetric. */
  const leftOf = (at: number, w: number): number => {
    const c = Math.round(at * TILE);
    return 2 * c < W ? c - Math.floor(w / 2) : c - Math.ceil(w / 2);
  };
  const fits = (s: Span, w: number): void => {
    if (s.x0 < xMin || s.x1 > xMax) {
      const half = w / 2;
      fail(
        `${s.what} does not fit in the wall${timber ? ' between the corner posts' : ''}: it would cover ${tiles(s.x0)} to ${tiles(s.x1 + 1)} tiles. ` +
          `Its centre "at" can be from ${tiles(xMin + half)} to ${tiles(xMax + 1 - half)} on this ${spec.width}-tile building.`,
      );
    }
  };

  // door
  if (typeof spec.door !== 'object' || spec.door === null) fail('"door" is required: { at: 2.5 } puts a door on the third tile.');
  keys(spec.door, ['at', 'style', 'paint', 'lantern', 'step'], '"door"');
  const style = oneOf(spec.door.style ?? 'panelled', DOOR_STYLES, 'door style');
  const paint = oneOf(spec.door.paint ?? 'red', PAINTS, 'door paint');
  const doorAt = num(spec.door.at, '"door.at"');
  const dw = doorWidth(style);
  if (style === 'double') {
    if (!Number.isInteger(doorAt) || doorAt < 2 || doorAt > spec.width - 2) {
      const valid = Array.from({ length: Math.max(0, spec.width - 3) }, (_, i) => i + 2);
      fail(
        `a double door covers two whole tiles, so "door.at" must be a whole number${valid.length ? `: ${list(valid)}` : ''}. Got ${doorAt}.` +
          (valid.length ? '' : ` A ${spec.width}-tile building is too narrow for one: use at least 4 tiles.`),
      );
    }
  } else if (!Number.isInteger(doorAt - 0.5) || doorAt < 1.5 || doorAt > spec.width - 1.5) {
    const valid = Array.from({ length: spec.width - 2 }, (_, i) => i + 1.5);
    fail(`a single door stands on one tile so that people line up with it: "door.at" must be one of ${list(valid)}. Got ${doorAt}.`);
  }
  const doorX = Math.round(doorAt * TILE) - dw / 2;
  const lantern = spec.door.lantern === undefined ? undefined : oneOf(spec.door.lantern, ['left', 'right', 'both'] as const, 'lantern side');
  // On a timber frame a post stands 2 pixels off each side of the door, and the lantern hangs on it.
  const lanternXs: number[] = [];
  if (lantern === 'left' || lantern === 'both') lanternXs.push(doorX - 7);
  if (lantern === 'right' || lantern === 'both') lanternXs.push(doorX + dw + 2);
  const reach = timber ? 6 : 0;
  const doorSpan: Span = {
    what: timber ? 'the door and its posts' : lantern ? 'the door and its lantern' : 'the door',
    x0: Math.min(doorX - reach, ...lanternXs),
    x1: Math.max(doorX + dw - 1 + reach, ...lanternXs.map((x) => x + LANTERN_W - 1)),
  };
  if (doorSpan.x0 < xMin - GAP || doorSpan.x1 > xMax + GAP) fail(`${doorSpan.what} do not fit at ${doorAt}: move the door one tile towards the middle, or drop the lantern.`);

  // windows
  const ground: Span[] = [doorSpan];
  const upper: Span[] = [];
  const windows: PlannedWindow[] = [];
  const addWindows = (specs: WindowSpec[] | undefined, isUpper: boolean): void => {
    const name = isUpper ? 'upperWindows' : 'windows';
    if (specs === undefined) return;
    if (!Array.isArray(specs)) fail(`"${name}" must be a list of windows, e.g. [{ at: 1 }, { at: 4 }].`);
    specs.forEach((ws, i) => {
      const what = `${isUpper ? 'upper' : 'ground-floor'} window ${i + 1}`;
      if (typeof ws !== 'object' || ws === null) fail(`${what} must be an object like { at: 1 }.`);
      keys(ws, ['at', 'kind', 'shutters', 'box', 'lit'], `${what}`);
      const kind = oneOf(ws.kind ?? 'four-pane', WINDOW_KINDS, 'window kind');
      const lit = oneOf(ws.lit ?? 'warm', LIT_LOOKS, 'lit look');
      const shutters = ws.shutters === undefined ? undefined : oneOf(ws.shutters, SHUTTER_COLORS, 'shutter colour');
      if (isUpper && (kind === 'tall' || kind === 'shop')) fail(`${what}: a ${kind} window only fits the ground floor. Upstairs use four-pane or round.`);
      if (shutters && (kind === 'shop' || kind === 'round')) fail(`${what}: shutters hang on four-pane and tall windows, not on a ${kind} one.`);
      if (ws.box && (kind !== 'four-pane' || isUpper)) fail(`${what}: a flower box goes under a four-pane window on the ground floor.`);
      const { w, h } = windowSize(kind);
      const x = leftOf(num(ws.at, `${what} "at"`), w);
      const y = (isUpper ? wallTop + 8 : base - DOOR_H + 1) + (kind === 'round' ? 1 : 0);
      const grow = shutters ? SHUTTER_W - 1 : 0;
      const span: Span = { what: `${what}${shutters ? ' and its shutters' : ''}`, x0: x - grow, x1: x + w - 1 + grow };
      fits(span, w + 2 * grow);
      (isUpper ? upper : ground).push(span);
      windows.push({ x, y, w, h, kind, lit, shutters, box: ws.box === true, upper: isUpper });
    });
  };
  addWindows(spec.windows, false);
  if (spec.upperWindows !== undefined && storeys === 1) fail('"upperWindows" needs storeys: 2. This building has one storey: put them in "windows".');
  addWindows(spec.upperWindows, true);

  // sign
  let sign: Plan['sign'];
  let signOnGround = false;
  if (spec.sign !== undefined) {
    keys(spec.sign, ['icon', 'at', 'storey'], '"sign"');
    const icon = oneOf(spec.sign.icon, SIGN_ICONS, 'sign icon');
    const where = oneOf(spec.sign.storey ?? (storeys === 2 ? 'upper' : 'ground'), ['ground', 'upper'] as const, 'sign storey');
    if (where === 'upper' && storeys === 1) fail('sign.storey is "upper" but the building has one storey.');
    const x = leftOf(num(spec.sign.at, '"sign.at"'), SIGN_W);
    const span: Span = { what: 'the sign', x0: x, x1: x + SIGN_W - 1 };
    fits(span, SIGN_W);
    (where === 'upper' ? upper : ground).push(span);
    signOnGround = where === 'ground';
    sign = { x, y: where === 'upper' ? wallTop + 7 : base - DOOR_H, icon };
  }

  // wall clock, on the top storey
  let clock: Plan['clock'];
  if (spec.clock !== undefined) {
    const x = leftOf(num(spec.clock, '"clock"'), CLOCK_W);
    const span: Span = { what: 'the clock', x0: x, x1: x + CLOCK_W - 1 };
    fits(span, CLOCK_W);
    (storeys === 2 ? upper : ground).push(span);
    clock = { x, y: storeys === 2 ? wallTop + 7 : base - DOOR_H - 1 };
  }
  apart(ground, 'on the ground floor');
  apart(upper, 'on the upper storey');

  // awning: over the door and every shop window, or where the author says
  let awning: Plan['awning'];
  if (spec.awning !== undefined) {
    const a: { color: AwningColor; from?: At; to?: At } = typeof spec.awning === 'string' ? { color: spec.awning } : spec.awning;
    if (typeof a !== 'object' || a === null) fail(`"awning" must be a colour (${list(AWNING_COLORS)}) or { color, from, to }.`);
    keys(a, ['color', 'from', 'to'], '"awning"');
    const aColor = oneOf(a.color, AWNING_COLORS, 'awning colour');
    let x0: number;
    let x1: number;
    if (a.from !== undefined || a.to !== undefined) {
      x0 = Math.round(num(a.from, '"awning.from"') * TILE);
      x1 = Math.round(num(a.to, '"awning.to"') * TILE) - 1;
      if (x1 - x0 < 13) fail('"awning.to" must be at least one tile right of "awning.from".');
    } else {
      const shops = windows.filter((w) => w.kind === 'shop' && !w.upper);
      x0 = Math.min(doorX, ...shops.map((w) => w.x)) - 3;
      x1 = Math.max(doorX + dw - 1, ...shops.map((w) => w.x + w.w - 1)) + 3;
    }
    const w = awningWidth(x1 - x0 + 1);
    let x = Math.round((x0 + x1 + 1 - w) / 2);
    // slide it back inside the wall if rounding the stripes pushed it over the edge
    x = Math.max(OVERHANG + 1, Math.min(W - OVERHANG - 1 - w, x));
    if (w > W - 2 * OVERHANG - 2) fail(`the awning would be ${w} pixels wide, wider than the wall (${W - 2 * OVERHANG - 2}). Give it a shorter "from" and "to".`);
    const y = base - GROUND + 2;
    if (sign && signOnGround && sign.x <= x + w - 1 + GAP && sign.x + SIGN_W - 1 >= x - GAP) {
      fail(`the sign hangs where the awning is (${tiles(x)} to ${tiles(x + w)} tiles). Move the sign clear of it${storeys === 2 ? ', or set sign.storey: "upper"' : ''}.`);
    }
    awning = { x, y, w, color: aColor };
  }

  return {
    id,
    W,
    tiles: spec.width,
    storeys,
    wall,
    roof: { form, color, h: roofH, join },
    top,
    wallTop,
    base,
    depth,
    door: { x: doorX, y: base - DOOR_H, w: dw, style, paint, step: spec.door.step === true, lanternXs, tile: style === 'double' ? doorAt - 1 : doorAt - 0.5 },
    windows,
    chimneyX,
    dormerXs,
    turret,
    awning,
    sign,
    clock,
  };
}
