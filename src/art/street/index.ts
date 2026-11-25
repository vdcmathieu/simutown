/**
 * Street furniture: lamps, benches, the plaza fountain, stalls, fences and small clutter.
 *
 * Every sprite is anchored at its bottom-left corner, [0, h], so it stands on the
 * bottom-left corner of its origin tile and rises above it (see PropDef in core/types).
 * Footprints cover the ground the prop stands on, not the air it rises into.
 *
 * The lamp and the bench below are the art director's exemplars for the daylight style.
 * Everything else is drawn as text grids in props-art.ts and fountain-art.ts.
 */
import { sprite, type Sprite } from '../../core/sprite';
import type { PropDef } from '../../core/types';
import { fountainFrames } from './fountain-art';
import {
  barrelArt,
  cartArt,
  binArt,
  clockArt,
  clockGlowArt,
  crateArt,
  fenceHArt,
  fenceHLeftArt,
  fenceHRightArt,
  fenceVArt,
  fenceVTopArt,
  mailboxArt,
  noticeboardArt,
  planterArt,
  signpostArt,
  stallArt,
  stallTealArt,
  wellArt,
} from './props-art';

// The lamp: a chunky iron lantern on a post. By day the glass is frosted cream; the
// emissive layer repaints the same pixels in lamplight when the lights come on.
const lampArt = `
  .......00.......
  ......0330......
  ....00322300....
  ...0333322220...
  ...0000000000...
  ....0c5cccb0....
  ....0c5cccb0....
  ....0cccccb0....
  ....0cccccb0....
  ....0bbbbba0....
  ...0000000000...
  ....03332220....
  .....000000.....
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  ......0320......
  .....033220.....
  ....03332220....
  ....03332220....
  ....00000000....
`;

const lampDay = sprite(lampArt, { anchor: [0, 32] });
// The emissive layer keeps only the glass, relit: cream becomes lamplight.
const lampGlow = sprite(
  lampArt
    .replace(/[0123]/g, '.')
    .replace(/[5c]/g, 'r')
    .replace(/b/g, 'q')
    .replace(/a/g, 'p'),
  { anchor: [0, 32] },
);

// A park bench in three-quarter view: the backrest behind with a wood.0 underside, the
// seat's top plane in the lightest wood, stubby armrests, and the right end in shade.
const benchArt: Sprite = sprite(`
  ..0000000000000000000000000000..
  .0wwwwwwwwwwwwwwwwwwwwwwwwwwwu0.
  .0vvvvvvvvvvvvvvvvvvvvvvvvvvvu0.
  .0vvvvvvvvvvvvvvvvvvvvvvvvvvvu0.
  .0uuuuuuuuuuuuuuuuuuuuuuuuuuuu0.
  .0wwwwwwwwwwwwwwwwwwwwwwwwwwwu0.
  0000vvvvvvvvvvvvvvvvvvvvvvvv0000
  0ww0uuuuuuuuuuuuuuuuuuuuuuuu0vu0
  0wv00000000000000000000000000uu0
  0vv0wwwwwwwwwwwwwwwwwwwwwwww0uu0
  0000wwwwwwwwwwwwwwwwwwwwwwww0000
  .0wwwwwwwwwwwwwwwwwwwwwwwwwwwv0.
  .0wwwwwwwwwwwwwwwwwwwwwwwwwwwv0.
  .0vvvvvvvvvvvvvvvvvvvvvvvvvvvu0.
  .0uuuuuuuuuuuuuuuuuuuuuuuuuuuu0.
  ..0000000000000000000000000000..
  ..0320....................0210..
  ..0320....................0210..
  ..0320....................0210..
  ..0000....................0000..
`, { anchor: [0, 20] });

/** A single-tile solid prop. */
function small(id: string, s: Sprite, extra: Partial<PropDef> = {}): PropDef {
  return { id, sprite: s, footprint: { w: 1, h: 1 }, ...extra };
}

/** A fence piece: waist-high, so its shadow is cast from the 12-pixel post, not the box. */
function fence(id: string, s: Sprite): PropDef {
  return small(id, s, { castHeight: 12 });
}

const stallPlaces = { front: { dx: 1, dy: 1 }, vendor: { dx: 1, dy: -1 } };

/**
 * The built-in street props. Fences come in runs: `fence-h-left`, any number of `fence-h`,
 * then `fence-h-right`, so a run ends on a post; a vertical run is `fence-v` pieces under a
 * `fence-v-top`, or under any horizontal piece at a corner.
 */
export const streetProps: Record<string, PropDef> = {
  lamp: {
    id: 'lamp',
    sprite: lampDay,
    emissive: lampGlow,
    footprint: { w: 1, h: 1 },
    lights: [{ dx: 8, dy: -25, radius: 44, slot: 'ochre.2', flicker: 0.1 }],
  },
  bench: {
    id: 'bench',
    sprite: benchArt,
    footprint: { w: 2, h: 1 },
    places: { left: { dx: 0, dy: 1 }, right: { dx: 1, dy: 1 } },
    // feet land 2 px in front of the bench's base line, so the sitter is drawn over the seat
    seats: { left: { x: 8, y: 2 }, right: { x: 24, y: 2 } },
  },
  fountain: {
    id: 'fountain',
    sprite: fountainFrames[0]!,
    anim: { frames: fountainFrames, fps: 4 },
    footprint: { w: 3, h: 2 },
    // The basin is low and only the column stands tall: cast from the basin's height.
    castHeight: 14,
    places: {
      north: { dx: 1, dy: -2 },
      south: { dx: 1, dy: 1 },
      east: { dx: 3, dy: 0 },
      west: { dx: -1, dy: 0 },
    },
  },
  signpost: small('signpost', signpostArt, { places: { front: { dx: 0, dy: 1 } } }),
  mailbox: small('mailbox', mailboxArt, { places: { front: { dx: 0, dy: 1 } } }),
  'fence-h': fence('fence-h', fenceHArt),
  'fence-h-left': fence('fence-h-left', fenceHLeftArt),
  'fence-h-right': fence('fence-h-right', fenceHRightArt),
  'fence-v': fence('fence-v', fenceVArt),
  'fence-v-top': fence('fence-v-top', fenceVTopArt),
  stall: { id: 'stall', sprite: stallArt, footprint: { w: 3, h: 1 }, places: stallPlaces },
  'stall-teal': { id: 'stall-teal', sprite: stallTealArt, footprint: { w: 3, h: 1 }, places: stallPlaces },
  crate: small('crate', crateArt),
  barrel: small('barrel', barrelArt),
  planter: small('planter', planterArt),
  noticeboard: {
    id: 'noticeboard',
    sprite: noticeboardArt,
    footprint: { w: 2, h: 1 },
    places: { front: { dx: 0, dy: 1 } },
  },
  well: {
    id: 'well',
    sprite: wellArt,
    footprint: { w: 2, h: 1 },
    places: { front: { dx: 0, dy: 1 } },
  },
  bin: small('bin', binArt),
  cart: { id: 'cart', sprite: cartArt, footprint: { w: 2, h: 1 }, places: { handle: { dx: 2, dy: 0 } } },
  // The clock face glows at night; the glow stays on the face and does not pool below.
  clock: small('clock', clockArt, {
    emissive: clockGlowArt,
    lights: [{ dx: 8, dy: -38, radius: 14, slot: 'ochre.2', ground: false }],
    places: { front: { dx: 0, dy: 1 } },
  }),
};
