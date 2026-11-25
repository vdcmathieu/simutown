/**
 * Street furniture: lamps, benches, the plaza fountain, stalls, fences and small clutter.
 *
 * Every sprite is anchored at its bottom-left corner, [0, h], so it stands on the
 * bottom-left corner of its origin tile and rises above it (see PropDef in core/types).
 * Footprints cover the ground the prop stands on, not the air it rises into.
 */
import { sprite, type Sprite } from '../../core/sprite';
import type { PropDef } from '../../core/types';
import { fountainFrames } from './fountain-art';
import {
  barrelArt,
  benchArt,
  bicycleArt,
  binArt,
  clockArt,
  crateArt,
  fenceHArt,
  fenceVArt,
  mailboxArt,
  noticeboardArt,
  planterArt,
  signpostArt,
} from './props-art';
import { stallSprite, stallTealSprite } from './stall-art';
import { wellSprite } from './well-art';

// The lamp: a lantern on a slim post. The glass is drawn twice: unlit (steel) by day, and
// as `ochre` in the emissive layer, which the renderer shows when the lights are on.
const lampArt = `
  ................
  .......00.......
  ......0230......
  .....023320.....
  ....03322210....
  ...0000000000...
  ....0qrrqqp0....
  ....0rrrqqp0....
  ....0qrqqpp0....
  ....0qqqppp0....
  ...0000000000...
  .....023210.....
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
  ......0320......
  .....003200.....
  ....03332210....
  ....03222110....
  ....00000000....
`;

const lampDay = sprite(lampArt.replace(/[qp]/g, '4').replace(/r/g, '5'), { anchor: [0, 32] });
const lampGlow = sprite(lampArt.replace(/[0-5]/g, '.'), { anchor: [0, 32] });

/** A single-tile solid prop with no places. */
function small(id: string, s: Sprite): PropDef {
  return { id, sprite: s, footprint: { w: 1, h: 1 } };
}

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
  },
  fountain: {
    id: 'fountain',
    sprite: fountainFrames[0]!,
    anim: { frames: fountainFrames, fps: 5 },
    footprint: { w: 3, h: 2 },
    places: {
      north: { dx: 1, dy: -2 },
      south: { dx: 1, dy: 1 },
      east: { dx: 3, dy: 0 },
      west: { dx: -1, dy: 0 },
    },
  },
  signpost: { ...small('signpost', signpostArt), places: { front: { dx: 0, dy: 1 } } },
  mailbox: { ...small('mailbox', mailboxArt), places: { front: { dx: 0, dy: 1 } } },
  'fence-h': small('fence-h', fenceHArt),
  'fence-v': small('fence-v', fenceVArt),
  stall: {
    id: 'stall',
    sprite: stallSprite,
    footprint: { w: 3, h: 1 },
    places: { front: { dx: 1, dy: 1 }, vendor: { dx: 1, dy: -1 } },
  },
  'stall-teal': {
    id: 'stall-teal',
    sprite: stallTealSprite,
    footprint: { w: 3, h: 1 },
    places: { front: { dx: 1, dy: 1 }, vendor: { dx: 1, dy: -1 } },
  },
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
    sprite: wellSprite,
    footprint: { w: 2, h: 1 },
    places: { front: { dx: 0, dy: 1 } },
  },
  bin: small('bin', binArt),
  bicycle: { id: 'bicycle', sprite: bicycleArt, footprint: { w: 2, h: 1 } },
  clock: { ...small('clock', clockArt), places: { front: { dx: 0, dy: 1 } } },
};
