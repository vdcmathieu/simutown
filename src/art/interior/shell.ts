// The shell of a room: the doormat at the exit, and what hangs on the back wall (windows,
// a wall lamp, pictures, a clock, a shelf), plus the standing lamp.
//
// Wall pieces are 32 pixels tall, the height of the two-row back wall, and stand on the
// base row of the wall: their sprite covers the wall face from the cap to the skirting.
import { withAnchor } from '../../core/sprite';
import type { PropDef } from '../../core/types';
import { Canvas, flatArt, glow, outlined } from './draw';

/** A prop on the back wall: no footprint, no cast shadow. */
function onWall(id: string, art: string, extra: Partial<PropDef> = {}): PropDef {
  return { id, sprite: outlined(art), castHeight: 0, ...extra };
}

// The doormat marks the way out. It lies on the bottom floor row and reaches 4 pixels
// further down, over the front cap on the ink, so the room's edge opens where the door is.
const doormatArt = `
  ................
  ................
  ................
  ................
  ................
  .xxxxxxxxxxxxxx.
  .xyyyyyyyyyyyyx.
  .xyzzzzzzzzzzyx.
  .xyyyyyyyyyyyyx.
  .xyyyyyyyyyyyyx.
  .xyzzzzzzzzzzyx.
  .xyyyyyyyyyyyyx.
  .xyyyyyyyyyyyyx.
  .xyzzzzzzzzzzyx.
  .xyyyyyyyyyyyyx.
  .xyyyyyyyyyyyyx.
  .xyzzzzzzzzzzyx.
  .xyyyyyyyyyyyyx.
  .xyyyyyyyyyyyyx.
  .xxxxxxxxxxxxxx.
`;

// A window: two by two panes in a light wooden frame, on a sill. By day the glass is sky;
// the emissive layer turns it to night glass after dusk.
function windowArt(): string {
  const c = new Canvas(16, 32);
  c.rect(2, 6, 12, 13, 'w').rect(13, 6, 1, 13, 'v').rect(2, 18, 12, 1, 'v');
  for (const [x, y] of [[3, 7], [9, 7], [3, 13], [9, 13]] as const) c.rect(x, y, 4, 5, '9').rect(x, y, 4, 1, '8');
  c.px(4, 8, 'f').px(10, 14, 'f');
  c.rect(1, 19, 14, 1, 'w').rect(1, 20, 14, 1, 'v');
  return c.text();
}

// A wide window with drawn-back curtains on a rod.
function wideWindowArt(): string {
  const c = new Canvas(32, 32);
  c.rect(5, 8, 22, 13, 'w').rect(26, 8, 1, 13, 'v').rect(5, 20, 22, 1, 'v');
  for (const [x, y] of [[6, 9], [17, 9], [6, 15], [17, 15]] as const) c.rect(x, y, 9, 5, '9').rect(x, y, 9, 1, '8');
  c.px(7, 10, 'f').px(8, 10, 'f').px(18, 16, 'f');
  c.rect(1, 6, 30, 1, 'w').rect(1, 7, 30, 1, 'v');
  // the curtains: rose drapes with one fold each, gathered a little at the foot
  c.rect(1, 8, 4, 13, '*').rect(3, 8, 1, 13, '+').rect(27, 8, 4, 13, '*').rect(29, 8, 1, 13, '+');
  c.rect(1, 20, 4, 1, '+').rect(27, 20, 4, 1, '+');
  c.rect(3, 21, 26, 1, 'w').rect(3, 22, 26, 1, 'v');
  return c.text();
}

/** Night glass: the deep blue of the evening sky, with a darker band along the top. */
const nightGlass = { '8': '1', '9': '8', f: '9' };

// A wall lantern: a small iron lantern with cream glass, standing on a bracket.
const wallLampArt = `
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  .......33.......
  ......3332......
  .....333332.....
  ....00000000....
  .....c5cccb.....
  .....c5cccb.....
  .....ccccbb.....
  .....bbbbaa.....
  ....00000000....
  .....333322.....
  .......32.......
  .......32.......
  ......3322......
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
  ................
`;

// A standing lamp: a cream drum shade with an ochre trim on a wooden pole.
const floorLampArt = `
  ................
  ................
  .....cccccc.....
  ....c5cccccb....
  ....c5cccccb....
  ...cccccccccb...
  ...cccccccbbb...
  ...cccccccbbb...
  ...qqqqqqqqpp...
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  .......wv.......
  ......wwvv......
  .....wwwwvv.....
  ....wwwwwvvv....
  ....vvvvvvuu....
  ................
  ................
  ................
`;

const shadeGlow = { c: 'r', '5': 'r', b: 'q', a: 'p' };

// A landscape in a wooden frame: sky, sun, two hills.
function pictureArt(): string {
  const c = new Canvas(16, 32);
  c.rect(2, 7, 12, 10, 'w').rect(13, 7, 1, 10, 'v').rect(2, 16, 12, 1, 'v');
  c.stamp(`
    fffffffqff
    ffffffqqqf
    fffffffqff
    ffhhffffff
    fhhhhhffii
    hhhhhiiiii
    hhhhiiiiii
    iiiiiiiiij
  `, 3, 8);
  return c.text();
}

// Flowers in a vase, in a gilt frame.
function flowersArt(): string {
  const c = new Canvas(16, 32);
  c.rect(2, 6, 12, 13, 'q').rect(13, 6, 1, 13, 'p').rect(2, 18, 12, 1, 'p');
  c.stamp(`
    7777777777
    77*777y777
    7***7yyy77
    77*h77yh77
    777hh7hh77
    7777hhh777
    777cccc777
    777ccbb777
    7777cb7777
    7777777777
    6666666666
  `, 3, 7);
  return c.text();
}

// A round wall clock: a cream dial in a wooden rim, ink hands at ten past twelve.
function wallClockArt(): string {
  const c = new Canvas(16, 32);
  c.stamp(`
    ..wwwwww..
    .wccc0ccv.
    wcccc0cccv
    wcccc0cccv
    wcccc000cv
    wccccccccv
    .wccccccv.
    ..vvvvvv..
  `, 3, 7);
  return c.text();
}

// A shelf on brackets with a jar, a honey pot, a plate stood on its edge and a mug.
function wallShelfArt(): string {
  const c = new Canvas(32, 32);
  c.rect(1, 18, 30, 2, 'w').rect(30, 18, 1, 2, 'v').rect(1, 20, 30, 1, 'v').rect(1, 21, 30, 1, 'u');
  c.stamp(`
    vw
    vu
    u.
  `, 4, 22);
  c.stamp(`
    vw
    vu
    u.
  `, 26, 22);
  c.stamp(`
    .88.
    8888
    f998
    f998
    f998
    9998
  `, 3, 13);
  c.stamp(`
    .qqq.
    rqqqp
    rqqqp
    qqqpp
    .ppo.
  `, 9, 14);
  c.stamp(`
    ..ccc..
    .c5ccb.
    cc5cccb
    ccccccb
    cccccbb
    .cccbb.
    ..bbb..
  `, 16, 12);
  c.stamp(`
    zzzy.
    zzzyy
    zzzy.
    yyyx.
  `, 25, 15);
  return c.text();
}

/** The doormat, the windows, the lamps and the things on the walls. */
export const shellProps: Record<string, PropDef> = {
  doormat: { id: 'doormat', sprite: withAnchor(flatArt(doormatArt), [0, 16]), flat: true, castHeight: 0 },
  window: onWall('window', windowArt(), { emissive: glow(windowArt(), nightGlass) }),
  'window-wide': onWall('window-wide', wideWindowArt(), { emissive: glow(wideWindowArt(), nightGlass) }),
  'wall-lamp': onWall('wall-lamp', wallLampArt, {
    emissive: glow(wallLampArt, shadeGlow),
    lights: [{ dx: 8, dy: -20, radius: 40, slot: 'ochre.2', flicker: 0.05 }],
  }),
  'floor-lamp': {
    id: 'floor-lamp',
    sprite: outlined(floorLampArt),
    emissive: glow(floorLampArt, shadeGlow),
    footprint: { w: 1, h: 1 },
    lights: [{ dx: 8, dy: -26, radius: 52, slot: 'ochre.2', flicker: 0.05 }],
  },
  picture: onWall('picture', pictureArt()),
  'picture-flowers': onWall('picture-flowers', flowersArt()),
  'wall-clock': onWall('wall-clock', wallClockArt()),
  'wall-shelf': onWall('wall-shelf', wallShelfArt()),
};
