/**
 * A hand-built town and scene, used to develop and test modules in isolation.
 * Real towns come from `defineTown` and real scenes from `scene` once those exist;
 * this fixture deliberately uses neither.
 */
import { FPS, FRAME_H, FRAME_W, type FrameState, type Scene, TILE, type Town } from '../core/types';

const W = 30;
const H = 17;

function buildTinyTown(): Town {
  const terrain: string[] = [];
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) terrain.push(ty === 8 || ty === 9 ? 'cobble' : 'grass');
  }
  const props = [
    { kind: 'lamp', tx: 6, ty: 7, id: 'lamp-west' },
    { kind: 'lamp', tx: 22, ty: 7, id: 'lamp-east' },
  ];
  const solid = new Uint8Array(W * H);
  for (const p of props) solid[p.ty * W + p.tx] = 1;
  return {
    name: 'tiny',
    w: W,
    h: H,
    terrain,
    props,
    places: { west: { tx: 2, ty: 9 }, east: { tx: 27, ty: 9 }, middle: { tx: 15, ty: 9 } },
    solid,
  };
}

export const tinyTown: Town = buildTinyTown();

const DURATION = 8;

/** Ana walks along the road from west to east, stops in the middle and says hello. */
function tinyFrame(t: number): FrameState {
  const y = 9 * TILE + 12;
  const x0 = 2 * TILE + 8;
  const xMid = 15 * TILE + 8;
  const x1 = 27 * TILE + 8;
  let x: number;
  let pose = 'walk';
  if (t < 3) x = x0 + ((xMid - x0) * t) / 3;
  else if (t < 5.5) {
    x = xMid;
    pose = 'idle';
  } else x = xMid + ((x1 - xMid) * Math.min(1, (t - 5.5) / 2.5));
  const talking = t >= 3 && t < 5.5;
  return {
    t,
    camera: { x: (W * TILE) / 2, y: (H * TILE) / 2, zoom: 1 },
    timeOfDay: 19,
    actors: [
      {
        id: 'ana',
        character: 'ana',
        x,
        y,
        dir: pose === 'idle' ? 'down' : 'right',
        pose,
        animTime: pose === 'idle' ? t - 3 : t,
        ...(talking ? { emote: 'heart' } : {}),
      },
    ],
    bubbles: talking
      ? [{ actor: 'ana', text: 'Hello, Simutown!', kind: 'say', reveal: Math.min(1, (t - 3) / 0.8) }]
      : [],
    annotations: talking ? [{ kind: 'label', actor: 'ana', text: 'Ana', opacity: 1 }] : [],
    caption: { text: 'A tiny town, for testing.', opacity: t < 1 ? t : 1 },
    fade: t > DURATION - 0.5 ? (t - (DURATION - 0.5)) / 0.5 : 0,
  };
}

export const tinyScene: Scene = {
  title: 'Tiny',
  town: tinyTown,
  duration: DURATION,
  fps: FPS,
  width: FRAME_W,
  height: FRAME_H,
  frame: tinyFrame,
};
