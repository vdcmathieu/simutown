/**
 * See the townsfolk move, in the real engine.
 *
 * A small square where six people each walk a loop (right, down, left, up) and then run
 * through the poses (wave, talk, carry, sit). Run it to get film strips of consecutive
 * frames, the way to judge a walk cycle without a video player:
 *
 *   pnpm tsx tools/characters-preview.ts [--cast ana,mira,kofi,otto,bo,raj] [--scale 4]
 *
 *   out/characters/walk-<dir>.png   one row per person, 12 consecutive frames 1/16 s apart
 *                                   (each walk frame shows twice, so sliding feet show too)
 *   out/characters/poses.png        one row per person: wave, talk, carry, sit, facing down
 *   out/characters/preview-<n>.png  whole frames along the scene
 *
 * The file also default-exports the scene, so the CLI can film it:
 *
 *   pnpm simutown render tools/characters-preview.ts -o out/characters/preview.mp4
 *   ffmpeg -i out/characters/preview.mp4 -vf fps=16 out/characters/f-%03d.png
 */
import { pathToFileURL } from 'node:url';
import { characters } from '../src/art/characters';
import { Surface } from '../src/core/surface';
import type { Dir, Scene } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { scene } from '../src/scene';
import { defineTown } from '../src/world';

const DEFAULT_CAST = ['ana', 'mira', 'kofi', 'otto', 'bo', 'raj'];

/** Tiles each loop is wide and tall, and where the loops start: a 3 x 2 grid of them. */
const LOOP_W = 5;
const LOOP_H = 3;
const origin = (i: number): [number, number] => [3 + (i % 3) * 9, 3 + Math.floor(i / 3) * 7];

/** Seconds per tile at the default walking speed of 2.5 tiles a second. */
const TILE_S = 1 / 2.5;
const POSE_ORDER = ['wave', 'talk', 'carry', 'sit'] as const;
const POSE_HOLD = 1.5;

/** Build the preview scene for up to six character ids. */
export function previewScene(cast: string[] = DEFAULT_CAST): Scene {
  const unknown = cast.filter((id) => !characters[id]);
  if (unknown.length > 0) throw new Error(`unknown character ${unknown.join(', ')}. Valid: ${Object.keys(characters).join(', ')}`);
  if (cast.length < 1 || cast.length > 6) throw new Error(`the preview takes 1 to 6 characters, got ${cast.length}`);

  // 30 x 17 tiles, one frame: paving on the left two thirds, lawn on the right.
  const rows = Array.from({ length: 17 }, () => '='.repeat(20) + 'g'.repeat(10));
  const town = defineTown({ name: 'Parade Ground', terrain: rows.join('\n'), legend: { g: 'grass', '=': 'cobble' }, props: [], places: {} });

  return scene({ title: 'Townsfolk preview', town, timeOfDay: 12 }, (s) => {
    const actors = cast.map((id, i) => s.actor(id, { at: origin(i), facing: 'right' }));
    s.together(() => {
      actors.forEach((a, i) => {
        const [x, y] = origin(i);
        s.sequence(() => {
          a.walkTo([x + LOOP_W, y]);
          a.walkTo([x + LOOP_W, y + LOOP_H]);
          a.walkTo([x, y + LOOP_H]);
          a.walkTo([x, y]);
          a.face('down');
          for (const pose of POSE_ORDER) a.pose(pose, { hold: POSE_HOLD });
        });
      });
    });
    s.wait(0.5);
  });
}

/** When each leg of the loop starts, in seconds. */
const LEG_START: Record<Dir, number> = {
  right: 0,
  down: LOOP_W * TILE_S,
  left: (LOOP_W + LOOP_H) * TILE_S,
  up: (2 * LOOP_W + LOOP_H) * TILE_S,
};

function main(): void {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const scale = Number(option('scale') ?? 4);
  const cast = option('cast')?.split(',') ?? DEFAULT_CAST;
  const sc = previewScene(cast);
  const renderer = createRenderer(sc.town);
  const frame = new Surface(sc.width, sc.height);
  const shoot = (t: number) => {
    const state = sc.frame(t);
    renderer.render(state, frame);
    return state;
  };
  /** Cut a cell around each actor out of the current frame and paste it at column `k`. */
  const CELL_W = 28;
  const CELL_H = 34;
  const paste = (sheet: Surface, state: ReturnType<Scene['frame']>, k: number) => {
    cast.forEach((id, j) => {
      const a = state.actors.find((x) => x.id === id)!;
      const cell = new Surface(CELL_W, CELL_H);
      cell.draw(frame, -(Math.round(a.x) - CELL_W / 2), -(Math.round(a.y) - CELL_H + 6));
      sheet.draw(cell, k * (CELL_W + 1), j * (CELL_H + 1));
    });
  };

  const STEPS = 12;
  for (const dir of ['right', 'down', 'left', 'up'] as Dir[]) {
    const sheet = new Surface(STEPS * (CELL_W + 1), cast.length * (CELL_H + 1));
    for (let k = 0; k < STEPS; k++) paste(sheet, shoot(LEG_START[dir] + 0.3 + k / 16), k);
    const path = `out/characters/walk-${dir}.png`;
    writePNG(path, sheet.scaled(scale));
    console.log(`${path}  rows: ${cast.join(', ')}; columns: ${STEPS} frames, 1/16 s apart`);
  }

  // two moments of each pose, a third and two thirds of the way through its hold
  const posesAt = 2 * (LOOP_W + LOOP_H) * TILE_S;
  const sheet = new Surface(POSE_ORDER.length * 2 * (CELL_W + 1), cast.length * (CELL_H + 1));
  POSE_ORDER.forEach((_, p) => {
    paste(sheet, shoot(posesAt + (p + 0.3) * POSE_HOLD), p * 2);
    paste(sheet, shoot(posesAt + (p + 0.7) * POSE_HOLD), p * 2 + 1);
  });
  writePNG('out/characters/poses.png', sheet.scaled(scale));
  console.log(`out/characters/poses.png  rows: ${cast.join(', ')}; columns: ${POSE_ORDER.join(', ')} (two moments each)`);

  const stills = 6;
  for (let i = 0; i < stills; i++) {
    const t = (sc.duration * (i + 0.5)) / stills;
    shoot(t);
    writePNG(`out/characters/preview-${i}.png`, frame.scaled(2));
    console.log(`out/characters/preview-${i}.png  t=${t.toFixed(2)}s`);
  }
  console.log(`scene: ${sc.duration.toFixed(2)} s. Film it with: pnpm simutown render tools/characters-preview.ts -o out/characters/preview.mp4`);
}

export default previewScene();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
