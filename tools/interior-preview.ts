/**
 * Render every room of Willow Square the way a scene author gets it: for each room a tiny
 * scene puts two or three townsfolk in it through the real API (`s.actor` at the room's
 * named places, `sitOn` a seat, `s.camera.inside`), and the frame after they have sat
 * down is drawn in the indoor light.
 *
 *   pnpm tsx tools/interior-preview.ts [--scale 4] [--only <room>]
 *
 * Writes out/interior-<room>.png at noon, out/interior-<room>-night.png at 21:00, and
 * out/interior-<room>-debug.png (noon, with solid floor tiles tinted and every place marked).
 */
import { art } from '../src/art';
import { compileTheme, daylight, lutRgb } from '../src/core/palette';
import { Surface } from '../src/core/surface';
import { FRAME_H, FRAME_W, type Scene, TILE } from '../src/core/types';
import { writePNG } from '../src/node/png';
import { createRenderer } from '../src/render';
import { scene } from '../src/scene';
import { willowSquare, willowSquareHomes } from '../src/towns/willow-square';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const scale = Number(flag('scale') ?? 4);
const only = flag('only');

const rooms = willowSquare.interiors ?? {};

/** Who works in a room that is nobody's home. */
const STAFF: Record<string, string[]> = {
  cafe: ['zara', 'emil'],
  townhall: ['otto', 'idris'],
  library: ['emil', 'mira'],
  'post-office': ['raj', 'pia'],
  school: ['yuki', 'kofi', 'lin'],
};
/** Anyone else, to fill a room up to three people. */
const VISITORS = ['ana', 'tomas', 'kofi', 'lin', 'noor', 'pia'];

/** Two or three people for a room: who lives or works there, then visitors. */
function castFor(room: string): string[] {
  const home = Object.entries(willowSquareHomes).filter(([, b]) => b === room).map(([who]) => who);
  return [...new Set([...home, ...(STAFF[room] ?? []), ...VISITORS])].slice(0, 3);
}

/** A tiny scene in `room` at `hour`: one person at a named place, one seated, one at the door. */
function roomScene(room: string, hour: number): Scene {
  const town = rooms[room]!;
  const [a, b, c] = castFor(room);
  const places = Object.keys(town.places).filter((p) => p !== 'door');
  const stand = places.find((p) => p.endsWith('.behind')) ?? places[0];
  const seat = town.props.find((p) => hasSeats(p.kind));
  return scene({ title: `${room} preview`, town: willowSquare, timeOfDay: hour }, (s) => {
    const first = s.actor(a!, { at: `${room}:${stand ?? 'door'}` });
    const second = s.actor(b!, { at: `${room}:door` });
    const third = c ? s.actor(c, { at: `${room}:${places.find((p) => p !== stand && !p.endsWith('.behind')) ?? 'door'}` }) : undefined;
    s.camera.inside(room);
    first.face('down');
    third?.face('down');
    if (seat) second.sitOn(`${room}:${seat.id ?? seat.kind}`);
    else second.walkTo(`${room}:${places.at(-1) ?? 'door'}`);
    s.wait(0.5);
  });
}

/** True for a prop kind people can sit on. */
function hasSeats(kind: string): boolean {
  return Object.keys(art.props[kind]?.seats ?? {}).length > 0;
}

const lut = compileTheme(daylight);

function main(): void {
  for (const room of Object.keys(rooms)) {
    if (only && room !== only) continue;
    const town = rooms[room]!;
    for (const [hour, suffix] of [[12, ''], [21, '-night']] as const) {
      const sc = roomScene(room, hour);
      const state = sc.frame(sc.duration - 0.05);
      const frame = new Surface(FRAME_W, FRAME_H);
      createRenderer(sc.town).render(state, frame);
      writePNG(`out/interior-${room}${suffix}.png`, frame.scaled(scale));
      if (suffix) continue;
      // the debug view: solid floor tiles tinted, places marked
      const { x: cx, y: cy, zoom } = state.camera;
      const sx = (wx: number) => Math.round(FRAME_W / 2 + (wx - cx) * zoom);
      const sy = (wy: number) => Math.round(FRAME_H / 2 + (wy - cy) * zoom);
      const T = TILE * zoom;
      for (let ty = 0; ty < town.h; ty++) {
        for (let tx = 0; tx < town.w; tx++) {
          if (town.solid[ty * town.w + tx] && town.terrain[ty * town.w + tx]!.startsWith('floor')) {
            frame.rect(sx(tx * TILE), sy(ty * TILE), T, T, [...lutRgb(lut, 'brick.2'), 90]);
          }
        }
      }
      for (const p of Object.values(town.places)) frame.rect(sx(p.tx * TILE) + T / 2 - 3, sy(p.ty * TILE) + T / 2 - 3, 6, 6, [...lutRgb(lut, 'teal.1'), 255]);
      writePNG(`out/interior-${room}-debug.png`, frame.scaled(scale));
    }
    console.log(`out/interior-${room}.png, -night.png, -debug.png  (${castFor(room).join(', ')})`);
  }
}

main();
