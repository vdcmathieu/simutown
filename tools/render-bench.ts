/**
 * Time the renderer on the preview town (tools/render-art.ts): 480x270 frames, seven
 * actors, some thirty props and ten lights. Prints the median and the 95th percentile per case.
 *
 *   pnpm tsx tools/render-bench.ts [--frames 300]
 *
 * Timing uses the wall clock, which is fine here: nothing in this file decides what a
 * frame looks like.
 */
import { Surface } from '../src/core/surface';
import { FRAME_H, FRAME_W, type FrameState, TILE } from '../src/core/types';
import { createRenderer } from '../src/render';
import { takeOption } from './render-args';
import { buildPreviewTown, previewArt } from './render-art';

const args = process.argv.slice(2);
const frames = Number(takeOption(args, '--frames') ?? 300);

const town = buildPreviewTown();
const out = new Surface(FRAME_W, FRAME_H);

/** A busy frame: seven people walking in a slow circle around the plaza. */
function frame(i: number, hour: number, zoom: number): FrameState {
  const t = i / 30;
  const characters = ['ana', 'tomas', 'mira'];
  return {
    t,
    camera: { x: (town.w * TILE) / 2 + Math.round(Math.sin(t) * 20), y: (town.h * TILE) / 2, zoom },
    timeOfDay: hour,
    actors: Array.from({ length: 7 }, (_, n) => ({
      id: `a${n}`,
      character: characters[n % characters.length]!,
      x: 240 + Math.cos(t * 0.7 + n) * (60 + n * 18),
      y: 120 + Math.sin(t * 0.7 + n) * (20 + n * 6),
      dir: 'down' as const,
      pose: 'walk',
      animTime: t,
    })),
    bubbles: [],
    annotations: [{ kind: 'ring', actor: 'a0', progress: 1 }],
  };
}

function bench(label: string, hourAt: (i: number) => number, zoom = 1): void {
  const renderer = createRenderer(town, { art: previewArt });
  for (let i = 0; i < 30; i++) renderer.render(frame(i, hourAt(i), zoom), out);
  const times: number[] = [];
  for (let i = 0; i < frames; i++) {
    const state = frame(i, hourAt(i), zoom);
    const start = performance.now();
    renderer.render(state, out);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)]!;
  const p95 = times[Math.floor(times.length * 0.95)]!;
  console.log(`${label.padEnd(34)} median ${median.toFixed(2)} ms   p95 ${p95.toFixed(2)} ms`);
}

console.log(`${FRAME_W}x${FRAME_H}, ${frames} frames per case`);
bench('daylight 12:00', () => 12);
bench('golden hour 18:00', () => 18);
bench('dusk 19:30 (lamps, glow)', () => 19.5);
bench('night 23:00', () => 23);
bench('dusk 19:30, zoom 2', () => 19.5, 2);
bench('sweep 16:00 -> 22:00 (no cache)', (i) => 16 + (6 * i) / frames);
