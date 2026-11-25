/**
 * The character kit, low level: a shared body, and a head per person.
 *
 * Most people are made with `makeCharacter` (make.ts), which picks everything by name.
 * `person()` is the layer under it, for a townsperson with a hand-drawn head.
 *
 * A townsperson is two heads tall. The head (hair or hat included) is a grid 16 wide and
 * 14 tall, the body a 16x11 grid; the head is drawn over the body, so its chin hides the
 * neck. Every frame is CHAR_W x CHAR_H with the feet on the bottom row, anchor [8, 24].
 *
 * Grids use role letters instead of palette characters, and each person maps the roles
 * to slots:
 *
 *   S skin        K skin shade     B blush
 *   H hair        D hair shade     L hair light   (black hair has no D: never map a
 *                                                   hair role to steel.0, ink is not a fill)
 *   T top         U top shade
 *   P trousers or skirt    Q their shade
 *   F shoes
 *   E apron       G apron shade    R the one accent: a ribbon, a hat band, a collar
 *   A hat         Y hat light      Z hat shade
 *   V scarf       W scarf shade    M bag        N bag shade
 *   C glasses frame   J lens
 *   X O I  a wooden thing in the hands (light, base, shade): the crate of `carry`, a cane
 *
 * A head may also use plain palette characters (`q`, `5`, ...) for a one-off detail.
 * `0` is ink, as everywhere.
 */
import type { Slot } from '../../core/palette';
import type { Legend } from '../../core/sprite';
import type { CharacterDef } from '../../core/types';
import type { ShapeName } from './bodies';
import { build, type BodyLayer } from './build';
import { grid } from './grid';
import { type BottomKind, type SleeveKind, type TopKind, type View, type ZoneMap, zonesFor } from './outfits';

/** Roles the shared body always needs. */
const BODY_ROLES = ['S', 'K', 'T', 'U', 'P', 'Q', 'F'] as const;

/** The wooden crate of the `carry` pose, unless the legend says otherwise. */
const PROP_ROLES: Record<string, Slot> = { X: 'wood.2', O: 'wood.1', I: 'wood.0' };

export interface PersonSpec {
  id: string;
  name: string;
  /** Role letter -> palette slot, for the heads and the shared body. Needs S K T U P Q F. */
  legend: Legend;
  /** Which shared body to wear: long sleeves over trousers, or over a skirt. Default 'trousers'. */
  body?: 'trousers' | 'dress';
  /** Body shape. Default 'adult'. */
  shape?: ShapeName;
  /** Override the outfit that `body` implies. */
  outfit?: { top: TopKind; bottom: BottomKind; sleeves: SleeveKind };
  /**
   * Three head grids, 16 wide and at least 14 tall: facing the viewer, facing away,
   * facing right. The eyes sit on rows 9 and 10: columns 5 and 10 from the front,
   * column 11 from the side. Rows past the 14th hang over the body.
   */
  head: { down: string; up: string; right: string };
  /** Accessories and other layers over the body. */
  layers?: readonly BodyLayer[];
  walkFps?: number;
  idleFps?: number;
}

/**
 * Build a full CharacterDef from a spec with hand-drawn heads: four directions, a 2-frame
 * idle, a 4-frame walk and the poses `sit`, `wave`, `talk` and `carry`.
 */
export function person(spec: PersonSpec): CharacterDef {
  const missing = BODY_ROLES.filter((r) => !spec.legend[r]);
  if (missing.length > 0) {
    throw new Error(`person "${spec.id}": the legend has no slot for ${missing.join(', ')}. The body needs: ${BODY_ROLES.join(', ')}.`);
  }
  const outfit = spec.outfit ?? { top: 'sweater' as const, bottom: spec.body === 'dress' ? ('skirt' as const) : ('trousers' as const), sleeves: 'long' as const };
  const zones = (view: View): ZoneMap => {
    const z = zonesFor(outfit.top, outfit.bottom, outfit.sleeves, view);
    // the plain reference bodies have no ribbed neck
    return spec.outfit ? z : { ...z, n: 'T' };
  };
  return build({
    id: spec.id,
    name: spec.name,
    legend: { ...PROP_ROLES, ...spec.legend },
    shape: spec.shape ?? 'adult',
    lower: outfit.bottom === 'skirt' ? 'skirt' : 'legs',
    zones: { front: zones('front'), back: zones('back'), side: zones('side') },
    head: { down: grid(spec.head.down), up: grid(spec.head.up), right: grid(spec.head.right) },
    layers: spec.layers,
    walkFps: spec.walkFps,
    idleFps: spec.idleFps,
  });
}
