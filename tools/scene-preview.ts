/**
 * Script a short demo scene on a town built from the reference art and write a handful of
 * PNG frames, to check by eye that people are where the script says.
 *
 *   pnpm tsx tools/scene-preview.ts [outDir] [--scale 3]
 */
import { Surface } from '../src/core/surface';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { scene } from '../src/scene';
import { defineTown, describeTown, tileAt } from '../src/world';

const args = process.argv.slice(2);
const si = args.indexOf('--scale');
const scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 3;
const outDir = args[0] ?? 'out/scene-preview';

// 30 x 17 tiles: exactly one 480 x 270 frame. A cobble road with a square in the middle.
const rows: string[] = [];
for (let ty = 0; ty < 17; ty++) {
  let row = '';
  for (let tx = 0; tx < 30; tx++) {
    const road = ty === 8 || ty === 9;
    const square = tx >= 12 && tx <= 17 && ty >= 5 && ty <= 12;
    row += road || square ? '=' : 'g';
  }
  rows.push(row);
}

const town = defineTown({
  name: 'Preview Lane',
  terrain: rows.join('\n'),
  legend: { g: 'grass', '=': 'cobble' },
  props: [
    { kind: 'lamp', at: [12, 7], id: 'lamp-nw' },
    { kind: 'lamp', at: [17, 7], id: 'lamp-ne' },
    { kind: 'lamp', at: [12, 10], id: 'lamp-sw' },
    { kind: 'lamp', at: [17, 10], id: 'lamp-se' },
    // A wall of lamps across the road forces a detour around it.
    { kind: 'lamp', at: [23, 8], id: 'post-a' },
    { kind: 'lamp', at: [23, 9], id: 'post-b' },
    { kind: 'bench', at: [14, 11] },
  ],
  places: { west: [2, 9], east: [27, 8], square: [15, 6], corner: [4, 3] },
});

const sc = scene({ title: 'Preview', town, timeOfDay: 10 }, (s) => {
  const ana = s.actor('ana', { at: [8, 9], facing: 'right' });
  const tomas = s.actor('tomas', { at: 'east', facing: 'left' });
  s.together(() => {
    ana.walkTo('square'); // 7 tiles right, 3 up: 4 s
    tomas.walkTo([20, 8]); // around the posts
  });
  tomas.walkTo(ana); // stops on the free tile beside Ana, facing her
  ana.face(tomas);
  ana.say('Did you hear the news?');
  s.together(() => {
    ana.sitOn('bench', 'left');
    tomas.sitOn('bench', 'right');
  });
  tomas.say('Tell me everything!');
  ana.walkTo('corner', { speed: 4 }); // gets up first, then walks
  s.wait(0.5);
});

console.log(describeTown(town));
console.log(`\nscene duration ${sc.duration.toFixed(2)} s`);
const renderer = createRenderer(town);
const frame = new Surface(sc.width, sc.height);
const n = 7;
for (let i = 0; i < n; i++) {
  const t = (sc.duration * i) / (n - 1);
  const state = sc.frame(t);
  renderer.render(state, frame);
  const path = `${outDir}/frame-${i}.png`;
  writePNG(path, frame.scaled(scale));
  const who = state.actors.map((a) => {
    const tile = tileAt(a.x, a.y);
    return `${a.id} [${tile.tx}, ${tile.ty}] ${a.pose} ${a.dir}`;
  });
  const said = state.bubbles.map((b) => `${b.actor}: "${b.text.slice(0, Math.round(b.text.length * b.reveal))}"`);
  console.log(`${path}  t=${t.toFixed(2)}  ${who.join(' | ')}${said.length ? '  ' + said.join(' ') : ''}`);
}
