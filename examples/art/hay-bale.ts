// examples/art/hay-bale.ts - a prop drawn as a text grid, with a footprint.
import { art, type PropDef, sprite } from '../../src';

// One character per pixel, one letter per palette slot (docs/style/palette.png):
// 0 ink, r q p the ochre ramp from light to dark, v wood for the twine, . transparent.
// The top plane is lit (r), the front face takes the base tone (q), the right end is in shade (p).
const bale = sprite(
  `
  ..0000000000000000000000000000..
  .0rrrrrrrvvrrrrrrrrrrrvvrrrrrr0.
  0rrrrrrrrvvrrrrrrrrrrrvvrrrrrrp0
  0rrrrrrrrvvrrrrrrrrrrrvvrrrrrrp0
  0rrrrrrrrvvrrrrrrrrrrrvvrrrrrrp0
  0pppppppppppppppppppppppppppppp0
  0qqqqqqqqvvqqqqqqqqqqqvvqqqqqpp0
  0qqpqqqqqvvqqqqpqqqqqqvvqqqqqpp0
  0qqqqqqqqvvqqqqqqqqqqqvvqpqqqpp0
  0qqqqqpqqvvqqqqqqqqpqqvvqqqqqpp0
  0qqqqqqqqvvqqqqqqqqqqqvvqqqqqpp0
  0qpqqqqqqvvqqqpqqqqqqqvvqqqqqpp0
  0qqqqqqqqvvqqqqqqqqqqqvvqqqpqpp0
  0pppppppppppppppppppppppppppppp0
  .000000000000000000000000000000.
`,
  // The anchor is the bottom-left corner: it lands on the bottom-left corner of the origin tile.
  { anchor: [0, 15] },
);

export const hayBale: PropDef = {
  id: 'hay-bale',
  sprite: bale,
  // Two tiles wide and one deep are solid, growing right and up from the origin tile.
  footprint: { w: 2, h: 1 },
};

art.props['hay-bale'] = hayBale;
