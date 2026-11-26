/**
 * The cutting-room log of a scene: every title, caption, line of dialogue and camera cut,
 * with when it starts and how long it is on screen.
 *
 *   pnpm tsx tools/film-log.ts <scene>
 *
 * `<scene>` is a name in scenes/. A caption that is up for less than its reading time
 * (one second plus a second per 15 characters, at least two) is marked "too short", so a
 * re-timed film can be checked without watching it. It reads the scene's frames only:
 * nothing is rendered.
 */
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FPS, type FrameState, type Scene, TILE } from '../src/core/types';

const name = process.argv[2];
if (!name) throw new Error('usage: pnpm tsx tools/film-log.ts <scene>');
const scene = ((await import(pathToFileURL(join(process.cwd(), 'scenes', `${name}.ts`)).href)) as { default: Scene }).default;

interface Entry {
  t: number;
  kind: string;
  text: string;
  /** Seconds on screen, for the things that have a length. */
  lasts?: number;
}

const entries: Entry[] = [];
/** Texts currently on screen, by kind and speaker, with the entry that opened each. */
const open = new Map<string, Entry>();

/** Note that `key` shows `text` at time t: opens an entry when the text is new, closes it when it goes. */
function track(key: string, kind: string, text: string | undefined, t: number): void {
  const current = open.get(key);
  if (current && current.text === text) return;
  if (current) current.lasts = t - current.t;
  open.delete(key);
  if (text === undefined) return;
  const entry = { t, kind, text };
  entries.push(entry);
  open.set(key, entry);
}

const tile = (v: number) => (v / TILE - 0.5).toFixed(1);
let last: FrameState | undefined;
const frames = Math.ceil(scene.duration * FPS);
for (let i = 0; i <= frames; i++) {
  const t = Math.min(scene.duration, i / FPS);
  const f = scene.frame(t);
  track('title', 'title', f.title && f.title.opacity > 0 ? [f.title.text, f.title.subtitle].filter(Boolean).join(' / ') : undefined, t);
  track('caption', 'caption', f.caption && f.caption.opacity > 0 ? f.caption.text : undefined, t);
  const speaking = new Set(f.bubbles.map((b) => b.actor));
  for (const b of f.bubbles) track(`bubble:${b.actor}`, `${b.actor} (${b.kind})`, b.text, t);
  for (const key of [...open.keys()]) if (key.startsWith('bubble:') && !speaking.has(key.slice(7))) track(key, '', undefined, t);
  // a cut: the zoom changes, or the view jumps more than two tiles in one frame
  const jump = last ? Math.hypot(f.camera.x - last.camera.x, f.camera.y - last.camera.y) : Infinity;
  if (!last || f.camera.zoom !== last.camera.zoom || jump > 2 * TILE) {
    entries.push({ t, kind: 'cut', text: `zoom ${f.camera.zoom} on [${tile(f.camera.x)}, ${tile(f.camera.y)}], ${f.timeOfDay.toFixed(1)} h` });
  }
  last = f;
}
for (const entry of open.values()) entry.lasts = scene.duration - entry.t;

console.log(`${scene.title}: ${scene.duration.toFixed(2)}s`);
for (const e of entries.sort((a, b) => a.t - b.t)) {
  const lasts = e.lasts === undefined ? '      ' : `${e.lasts.toFixed(1).padStart(5)}s`;
  const need = Math.max(2, 1 + e.text.length / 15);
  const flag = e.kind === 'caption' && e.lasts !== undefined && e.lasts < need - 0.05 ? `   <- too short, needs ${need.toFixed(1)}s` : '';
  console.log(`${e.t.toFixed(2).padStart(6)}  ${lasts}  ${e.kind.padEnd(14)} ${e.text}${flag}`);
}
