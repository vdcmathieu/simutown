import { describe, expect, it } from 'vitest';
import dayAndNight from '../scenes/day-and-night';
import hello from '../scenes/hello';
import wordOfMouth from '../scenes/word-of-mouth';
import { art } from '../src/art';
import { Surface } from '../src/core/surface';
import { FPS, FRAME_H, FRAME_W, type FrameState, type Scene, TILE } from '../src/core/types';
import { createRenderer } from '../src/render';
import { willowSquare } from '../src/towns';
import { isWalkable, tileAt } from '../src/world';

interface Expectation {
  name: string;
  scene: Scene;
  /** Seconds the scene should last, as a [min, max] range. */
  lasts: [number, number];
  cast: string[];
}

const scenes: Expectation[] = [
  { name: 'hello', scene: hello, lasts: [18, 23], cast: ['ana', 'bo', 'mira', 'kofi', 'lin'] },
  { name: 'word-of-mouth', scene: wordOfMouth, lasts: [45, 60], cast: ['ana', 'bo', 'mira', 'raj', 'zara', 'tomas', 'otto', 'yuki', 'kofi', 'lin'] },
  { name: 'day-and-night', scene: dayAndNight, lasts: [28, 34], cast: ['bo', 'ana', 'otto', 'mira', 'tomas', 'emil'] },
];

/** Tiles under a prop people sit on (the benches): a sitter is drawn on the seat, inside the footprint. */
const seatTiles = new Set<string>();
for (const p of willowSquare.props) {
  const def = art.props[p.kind]!;
  if (!def.seats || !def.footprint) continue;
  for (let dx = 0; dx < def.footprint.w; dx++) for (let dy = 0; dy < def.footprint.h; dy++) seatTiles.add(`${p.tx + dx},${p.ty - dy}`);
}

/** Every frame of a scene at 30 fps, the last one included. */
function frames(scene: Scene): FrameState[] {
  const out: FrameState[] = [];
  const n = Math.ceil(scene.duration * FPS);
  for (let i = 0; i <= n; i++) out.push(scene.frame(Math.min(scene.duration, i / FPS)));
  return out;
}

describe.each(scenes)('scene $name', ({ scene, lasts, cast }) => {
  const all = frames(scene);

  it('is set in Willow Square and lasts what it should', () => {
    expect(scene.town).toBe(willowSquare);
    expect(scene.fps).toBe(FPS);
    expect([scene.width, scene.height]).toEqual([FRAME_W, FRAME_H]);
    expect(scene.duration).toBeGreaterThanOrEqual(lasts[0]);
    expect(scene.duration).toBeLessThanOrEqual(lasts[1]);
    for (const who of cast) expect(scene.cast, who).toContain(who);
  });

  it('gives a sound frame at every thirtieth of a second', () => {
    expect(all.length).toBeGreaterThan(lasts[0] * FPS);
    for (const f of all) {
      expect(Number.isFinite(f.camera.x + f.camera.y)).toBe(true);
      expect(Number.isInteger(f.camera.zoom)).toBe(true);
      expect(f.timeOfDay).toBeGreaterThanOrEqual(0);
      expect(f.timeOfDay).toBeLessThanOrEqual(24);
      for (const a of f.actors) expect(Number.isFinite(a.x + a.y), `${a.id} at ${f.t}s`).toBe(true);
    }
  });

  it('keeps the camera inside the town', () => {
    for (const f of all) {
      const halfW = FRAME_W / f.camera.zoom / 2;
      const halfH = FRAME_H / f.camera.zoom / 2;
      expect(f.camera.x - halfW, `left edge at ${f.t}s`).toBeGreaterThanOrEqual(-1);
      expect(f.camera.x + halfW, `right edge at ${f.t}s`).toBeLessThanOrEqual(willowSquare.w * TILE + 1);
      expect(f.camera.y - halfH, `top edge at ${f.t}s`).toBeGreaterThanOrEqual(-1);
      expect(f.camera.y + halfH, `bottom edge at ${f.t}s`).toBeLessThanOrEqual(willowSquare.h * TILE + 1);
    }
  });

  it('never puts anyone on a solid tile: nobody walks through a hedge or a wall', () => {
    const stuck = new Set<string>();
    for (const f of all) {
      for (const a of f.actors) {
        if ((a.opacity ?? 1) <= 0) continue;
        const { tx, ty } = tileAt(a.x, a.y);
        if (!isWalkable(willowSquare, tx, ty) && !seatTiles.has(`${tx},${ty}`)) stuck.add(`${a.id} on [${tx}, ${ty}] at ${f.t.toFixed(2)}s`);
      }
    }
    expect([...stuck].slice(0, 5)).toEqual([]);
  });

  it('starts and ends on ink, and is the same film every time', () => {
    expect(all[all.length - 1]!.fade).toBeCloseTo(1, 5);
    const mid = scene.duration / 2;
    expect(scene.frame(mid)).toEqual(scene.frame(mid));
    expect(scene.frame(-1)).toEqual(scene.frame(0));
    expect(scene.frame(scene.duration + 5).t).toBeCloseTo(scene.duration, 5);
  });

  it('renders without a single warning', () => {
    const warnings: string[] = [];
    const renderer = createRenderer(willowSquare, { warn: (m) => warnings.push(m) });
    const out = new Surface(FRAME_W, FRAME_H);
    // twelve frames spread over the scene are enough to meet every prop, pose and overlay
    for (let i = 0; i <= 12; i++) renderer.render(scene.frame((scene.duration * i) / 12), out);
    expect(warnings).toEqual([]);
  });
});

describe('the example scenes together', () => {
  it('word of mouth ends with all ten neighbours numbered', () => {
    const f = wordOfMouth.frame(wordOfMouth.duration - 2);
    const labels = (f.annotations ?? []).filter((a) => a.kind === 'label').map((a) => (a.kind === 'label' ? a.text : ''));
    expect(labels.sort((a, b) => Number(a) - Number(b))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  it('day and night runs the clock from before dawn to late evening', () => {
    expect(dayAndNight.frame(0).timeOfDay).toBeLessThan(6);
    expect(dayAndNight.frame(dayAndNight.duration / 3).timeOfDay).toBeGreaterThan(9);
    expect(dayAndNight.frame(dayAndNight.duration).timeOfDay).toBeGreaterThan(21);
    const hours = Array.from({ length: 60 }, (_, i) => dayAndNight.frame((dayAndNight.duration * i) / 59).timeOfDay);
    for (let i = 1; i < hours.length; i++) expect(hours[i]!).toBeGreaterThanOrEqual(hours[i - 1]!);
  });

  it('hello opens before sunrise and is in daylight when Ana speaks', () => {
    expect(hello.frame(0).timeOfDay).toBeLessThan(6);
    const speaking = hello.frame(10);
    expect(speaking.bubbles.map((b) => b.actor)).toContain('ana');
    expect(speaking.timeOfDay).toBeGreaterThanOrEqual(8);
    expect(speaking.camera.zoom).toBe(2);
  });
});
