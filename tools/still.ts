/**
 * Render one frame of the tiny fixture scene to a PNG: a quick end-to-end smoke check.
 *
 *   pnpm still [seconds] [out.png] [--scale 3]
 */
import { Surface } from '../src/core/surface';
import { tinyScene } from '../src/fixtures/tiny';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';

const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 3;
const t = Number(args[0] ?? 4);
const path = args[1] ?? 'out/still.png';

const frame = new Surface(tinyScene.width, tinyScene.height);
createRenderer(tinyScene.town).render(tinyScene.frame(t), frame);
writePNG(path, frame.scaled(scale));
console.log(`${path} (t=${t}s, ${frame.w * scale}x${frame.h * scale})`);
