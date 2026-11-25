/**
 * Render one frame of the tiny fixture scene to a PNG: a quick end-to-end smoke check.
 *
 *   pnpm still [seconds] [out.png] [--scale 3] [--time-of-day 19:30] [--all-times]
 *
 * `--time-of-day` overrides the scene's hour (`19.5` and `19:30` both work).
 * `--all-times` renders the same frame at 12:00, 18:00, 19:30 and 23:00, into
 * out/still-1200.png and so on, to review the moods side by side.
 */
import { Surface } from '../src/core/surface';
import { tinyScene } from '../src/fixtures/tiny';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { hourTag, parseHour, REVIEW_HOURS, takeFlag, takeOption } from './render-args';

const args = process.argv.slice(2);
const scale = Number(takeOption(args, '--scale') ?? 3);
const hourArg = takeOption(args, '--time-of-day');
const allTimes = takeFlag(args, '--all-times');
const t = Number(args[0] ?? 4);
const path = args[1] ?? 'out/still.png';

const renderer = createRenderer(tinyScene.town);
const hours: (number | undefined)[] = allTimes ? [...REVIEW_HOURS] : [hourArg === undefined ? undefined : parseHour(hourArg)];
for (const hour of hours) {
  const state = tinyScene.frame(t);
  if (hour !== undefined) state.timeOfDay = hour;
  const frame = new Surface(tinyScene.width, tinyScene.height);
  renderer.render(state, frame);
  const file = allTimes ? path.replace(/(\.png)?$/, `-${hourTag(hour!)}.png`) : path;
  writePNG(file, frame.scaled(scale));
  console.log(`${file} (t=${t}s, ${hourTag(state.timeOfDay)}, ${frame.w * scale}x${frame.h * scale})`);
}
