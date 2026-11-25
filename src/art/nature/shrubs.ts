import { sprite } from '../../core/sprite';

// Bushes and hedges. They follow the tree recipe: flat moss.1, a moss.2 rim one pixel
// inside the ink along the top and left, a moss.0 underside, a closed ink outline.

// A small bush: a round lobe with a smaller one tucked against its right side.
export const bush = sprite(
  `
  ...0000000......
  ..0jiiiiii0.....
  .0ihhhhhhhh0....
  0ihhhhhhhhhg00..
  0ihhhhhhhhggii0.
  0ihhhhhhhhgghh0.
  0ihhhhhhhhgghhg0
  0ihhhhhhhgghhhg0
  0ighhhhhhgghhgg0
  .0ggghhgggghggg0
  .0gggggggggggg0.
  ..0gggggggggg0..
  ...0000000000...
`,
  { anchor: [0, 13] },
);

// A big bush, two tiles wide: three lobes of different sizes over a low mass.
export const bushLarge = sprite(
  `
  .........000000.................
  .......00jiiiii00...............
  .....00iihhhhhhhi00.............
  ....0iihhhhhhhhhhhh0000000......
  ....0ihhhhhhhhhhhhg0iiiiii00....
  ...0ihhhhhhhhhhhhhgghhhhhhhi0...
  ...0ihhhhhhhhhhhhhgghhhhhhhhh0..
  ...0ihhhhhhhhhhhhhgghhhhhhhhhg0.
  ..0ighhhhhhhhhhhhhgghhhhhhhhgg0.
  .0jhghhhhhhhhhhhhhgghhhhhhhhgg0.
  .0ihggghhhhhhhhhhggghhhhhhhhgg0.
  0ihhhgggghhhhhhgggghhhhhhhhhgg0.
  0ihhhgggggggggggggghhhhhhhhhgg0.
  0ihhhhhggggggggggggghhhhhhgggg0.
  0ighhhhhhggggggggggggggggggggg0.
  .0ggggggggghhhhhhhhgggggggggg0..
  .0gggggggghhhhhhhhhhggggggggg0..
  ..0ggggggggggggggggggggggggg0...
  ...0ggggggggggggggggggggggg0....
  ....00000000000000000000000.....
`,
  { anchor: [0, 20] },
);

// ---------------------------------------------------------------------------------------
// Hedges: clipped, chest-high, one tile per piece, solid. A hedge is 12 pixels thick and
// rises 10: we see 8 rows of its top, a scalloped moss.0 line where the top overhangs,
// then the front face down to a shaded foot.
//
// Pieces join without a seam. In a row running east-west: `hedge-h-l`, any number of
// `hedge-h`, `hedge-h-r`. In a row running north-south: `hedge` at the north end, then
// `hedge-v` for every tile below it; each piece covers the front face of the one above.
// A corner at the north end of a north-south row is simply `hedge-h-l` or `hedge-h-r`
// with `hedge-v` below it; a corner at the south end is `hedge-sw` (the row turns east)
// or `hedge-se` (it turns west). `hedge` alone is a clipped block.
// ---------------------------------------------------------------------------------------

// The middle of an east-west row. Both sides are open on the same rows.
export const hedgeH = sprite(
  `
  ..000000...000..
  00iiiiii000iii00
  iihhhhhhiiihhhii
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  gghhhhhhggghhhgg
  hhgggggghhhggghh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhhhhh
  gghhhgggghhhgggg
  gggggggggggggggg
  gggggggggggggggg
  0000000000000000
`,
  { anchor: [0, 20] },
);

// The west end of a row, and the north-west corner.
export const hedgeHL = sprite(
  `
  ......00...000..
  ...000ii000iii00
  ..0jiihhiiihhhii
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhggghhgg
  ..0ihggggghhgghh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ighhgggghhggg
  ..0ggggggggggggg
  ..0ggggggggggggg
  ...0000000000000
`,
  { anchor: [0, 20] },
);

// The east end of a row, and the north-east corner.
export const hedgeHR = sprite(
  `
  ..000000........
  00iiiiii00000...
  iihhhhhhiiihg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  gghhhhhhggggg0..
  hhgggggghhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  gghhhgggggggg0..
  ggggggggggggg0..
  ggggggggggggg0..
  0000000000000...
`,
  { anchor: [0, 20] },
);

// A clipped block on its own, and the north end of a north-south row.
export const hedge = sprite(
  `
  .....0000.......
  ...00iiii0000...
  ..0jiihhhhiig0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhggggg0..
  ..0ihgggghhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ighhgggggg0..
  ..0gggggggggg0..
  ..0gggggggggg0..
  ...0000000000...
`,
  { anchor: [0, 20] },
);

// A tile of a north-south row. Its top is open: it covers the face of the piece above.
export const hedgeV = sprite(
  `
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhgghhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhggggg0..
  ..0ihgggghhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ighhgggggg0..
  ..0gggggggggg0..
  ..0gggggggggg0..
  ...0000000000...
`,
  { anchor: [0, 26] },
);

// The south-west corner: a north-south row that turns east.
export const hedgeSW = sprite(
  `
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhgghhgg0..
  ..0ihhhhhhhgg000
  ..0ihhhhhhhhgiii
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhggghhgg
  ..0ihggggghhgghh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ihhhhhhhhhhhh
  ..0ighhgggghhggg
  ..0ggggggggggggg
  ..0ggggggggggggg
  ...0000000000000
`,
  { anchor: [0, 26] },
);

// The south-east corner: a north-south row that turns west.
export const hedgeSE = sprite(
  `
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhhhhhgg0..
  ..0ihhhgghhgg0..
  000ihhhhhhhgg0..
  iiihhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  gghhhhhhggggg0..
  hhgggggghhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  hhhhhhhhhhhgg0..
  gghhhgggggggg0..
  ggggggggggggg0..
  ggggggggggggg0..
  0000000000000...
`,
  { anchor: [0, 26] },
);
