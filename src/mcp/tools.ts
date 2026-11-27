/**
 * The Simutown tools an MCP client can call: read the guides, look at a town and its
 * people, write a scene, build it, look at stills and render the film. Node only.
 *
 * Every tool reports failure as a `ToolResult` with `isError: true` and a message that
 * says how to fix it (listing valid names where that helps); nothing throws out of `run`.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { townsfolk } from '../art/characters';
import type { Scene, SceneBeat, Town } from '../core/types';
import { SCENE_EXTENSIONS, formatBeats, newScene, resolveScenePath, sceneFiles } from '../cli/main';
import { renderStill, renderVideo } from '../node/video';
import { describeScene } from '../player/scene-info';
import * as builtinTowns from '../towns';
import { describeTown } from '../world/describe';
import { loadFreshScene } from './load';
import type { ToolDef, ToolResult } from './types';

/** The guides in docs/, by topic. */
export const GUIDES = {
  authoring: { file: 'authoring.md', title: 'Writing a scene: the loop from idea to film. Start here.' },
  'scene-api': { file: 'scene-api.md', title: 'The scripting API: every call a scene can make.' },
  'making-art': { file: 'making-art.md', title: 'The art kits: new characters, buildings and props.' },
  style: { file: 'STYLE.md', title: 'Art direction: what Simutown pictures should look like.' },
} as const;

/** A guide topic: a key of `GUIDES`. */
export type GuideTopic = keyof typeof GUIDES;

/** The built-in towns, by their export name (`willowSquare`, ...). */
export const TOWNS: Record<string, Town> = Object.fromEntries(
  Object.entries(builtinTowns).filter(([, v]) => typeof v === 'object' && v !== null && 'terrain' in v),
) as Record<string, Town>;

/**
 * The folder of the simutown package: the nearest folder above this file whose package.json
 * is named "simutown". Works from the sources and from the built package (dist/...).
 */
export function packageRoot(): string {
  for (let dir = dirname(fileURLToPath(import.meta.url)); ; dir = dirname(dir)) {
    const pkg = join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if ((JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }).name === 'simutown') return dir;
      } catch {
        // not a readable package.json: keep looking
      }
    }
    if (dirname(dir) === dir) throw new Error('Cannot find the simutown package folder (its package.json) above ' + fileURLToPath(import.meta.url));
  }
}

/** The markdown of a guide in docs/. Throws when the file is missing. */
export function readGuide(topic: GuideTopic): string {
  const guide = GUIDES[topic];
  if (!guide) throw new Error(`Unknown guide "${topic}". Guides: ${Object.keys(GUIDES).join(', ')}.`);
  return readFileSync(join(packageRoot(), 'docs', guide.file), 'utf8');
}

/** The place names of a town, sorted: the targets `walk`, `appear` and the camera take. */
export function placeNames(town: Town): string[] {
  return Object.keys(town.places).sort();
}

/** Everything a model needs to use a town: the describeTown map, then a plain list of place names. */
export function townText(name: string, town: Town): string {
  return `${describeTown(town)}\n\nPlace names to use as targets (import { ${name} } from 'simutown'):\n${placeNames(town).join(', ')}`;
}

/** The townsfolk as text, one person per line: id, name, role and how they look. */
export function townsfolkText(): string {
  return [
    'Cast by id: s.actor(\'<id>\', { at: \'<place>\' }). Only these ids exist.',
    ...townsfolk.map((p) => `${p.id} - ${p.name}, ${p.role}: ${p.description}`),
  ].join('\n');
}

const ok = (text: string): ToolResult => ({ content: [{ type: 'text', text }] });
const fail = (text: string): ToolResult => ({ content: [{ type: 'text', text }], isError: true });
const secs = (s: number) => `${Number(s.toFixed(2))}s`;
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Run `fn`, turning anything it throws into an error result. */
async function guard(fn: () => Promise<ToolResult> | ToolResult): Promise<ToolResult> {
  try {
    return await fn();
  } catch (e) {
    return fail(message(e));
  }
}

/** True when `path` is `root` or inside it. */
function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/** A path as shown to the agent: relative to the project, with forward slashes. */
function shown(root: string, path: string): string {
  return (relative(root, path) || path).split(sep).join('/');
}

/** Find a scene file from a tool's `scene` argument (a name in scenes/ or a path in the project). */
function scenePath(arg: unknown, root: string): string {
  if (typeof arg !== 'string' || arg.trim() === '') throw new Error(`"scene" must be a scene name, such as ${exampleNames(root)}.`);
  const path = resolveScenePath(arg, root, root);
  if (!inside(root, path)) {
    throw new Error(`"${arg}" is outside the project folder ${root}. Name a scene in scenes/ (${exampleNames(root)}) or give a path inside the project.`);
  }
  return path;
}

function exampleNames(root: string): string {
  const names = sceneFiles(root).map((f) => basename(f, extname(f)));
  return names.length ? names.map((n) => `"${n}"`).join(', ') : '"my-scene" (there are no scenes yet: use new_scene or write_scene)';
}

/** Load the scene a tool's `scene` argument names, fresh from disk. */
async function sceneArg(arg: unknown, root: string): Promise<{ path: string; name: string; scene: Scene }> {
  const path = scenePath(arg, root);
  return { path, name: basename(path, extname(path)), scene: await loadFreshScene(path, root) };
}

/** What `simutown info` prints, and the beats when `beats` is true. */
export function infoText(scene: Scene, path: string, root: string, beats: boolean): string {
  const i = describeScene(scene);
  const lines = [
    i.title,
    `  file      ${shown(root, path)}`,
    `  duration  ${secs(i.duration)}, ${i.frames} frames at ${i.fps} fps`,
    `  frame     ${i.width}x${i.height} (x4 = ${i.width * 4}x${i.height * 4})`,
    `  town      ${i.town.name}, ${i.town.w}x${i.town.h} tiles, ${i.town.props} props`,
    `  places    ${i.town.places.join(', ') || 'none'}`,
    `  cast      ${i.cast.join(', ') || 'nobody'}`,
  ];
  if (beats) {
    lines.push('');
    if (scene.beats) lines.push('Beats', ...formatBeats(scene.beats));
    else lines.push('No beats: this scene was not built with scene(), so it has no timeline to show.');
  }
  return lines.join('\n');
}

/** What is going on at time `t`: the calls that take time and are running, and the caption up. */
export function runningAt(beats: readonly SceneBeat[] | undefined, t: number): string {
  if (!beats) return '';
  const running = beats.filter((b) => b.end > b.start + 1e-9 && b.start <= t + 1e-9 && t < b.end - 1e-9);
  const parts = running.map((b) => `${b.actor ? `${b.actor} ` : ''}${b.what}`);
  const caption = [...beats].reverse().find((b) => b.start <= t + 1e-9 && /^caption/.test(b.what));
  if (caption && caption.what !== 'caption cleared' && !running.includes(caption)) parts.push(`${caption.what} (up since ${secs(caption.start)})`);
  return parts.length ? parts.join('; ') : 'nothing running (a pause)';
}

/** Most images one `still` call returns. */
export const MAX_STILLS = 12;

/**
 * One time per beat worth looking at: the middle of every call that takes time, and just
 * after every caption appears. Sorted, without near-duplicates.
 */
export function beatTimes(scene: Scene): number[] {
  const beats = scene.beats ?? [];
  const raw: number[] = [];
  for (const b of beats) {
    if (b.end > b.start + 1e-9) raw.push((b.start + b.end) / 2);
    else if (/^caption "/.test(b.what)) raw.push(Math.min(b.start + 0.5, scene.duration));
  }
  if (raw.length === 0) raw.push(...[0.125, 0.375, 0.625, 0.875].map((f) => f * scene.duration));
  const times: number[] = [];
  for (const t of raw.map((t) => Math.round(t * 100) / 100).sort((a, b) => a - b)) {
    if (times.length === 0 || t - times.at(-1)! > 0.1) times.push(t);
  }
  return times;
}

/** Keep `max` times spread evenly over the list (first and last included); return kept and dropped. */
function spread(times: number[], max: number): { kept: number[]; dropped: number[] } {
  if (times.length <= max) return { kept: times, dropped: [] };
  const pick = new Set(Array.from({ length: max }, (_, i) => Math.round((i * (times.length - 1)) / (max - 1))));
  return { kept: times.filter((_, i) => pick.has(i)), dropped: times.filter((_, i) => !pick.has(i)) };
}

const SCENE_ARG = {
  type: 'string',
  description: 'A scene name in scenes/ (e.g. "hello" for scenes/hello.ts), or a path to a scene file relative to the project folder.',
} as const;

const NAME_ARG = {
  type: 'string',
  description: 'The scene name: lowercase words joined by dashes, such as "market-day". The file is scenes/<name>.ts.',
} as const;

const readGuideTool: ToolDef = {
  name: 'read_guide',
  description:
    'Read a Simutown guide (markdown). Simutown scripts short pixel-town animations that explain one idea: a TypeScript ' +
    'scene file places townsfolk in a town and says what they do, line by line, and the engine renders it. ' +
    'Start with topic "authoring" (how to plan, write, check and render a scene) before writing your first scene; ' +
    'read "scene-api" for every call a scene can make. Next: describe_town and list_townsfolk.',
  inputSchema: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        enum: Object.keys(GUIDES),
        default: 'authoring',
        description: Object.entries(GUIDES).map(([k, g]) => `"${k}": ${g.title}`).join(' '),
      },
    },
    additionalProperties: false,
  },
  annotations: { title: 'Read a guide', readOnlyHint: true, idempotentHint: true },
  run: (args) =>
    guard(() => {
      const topic = (args.topic ?? 'authoring') as string;
      if (!(topic in GUIDES)) return fail(`Unknown topic "${topic}". Topics: ${Object.keys(GUIDES).join(', ')}.`);
      return ok(readGuide(topic as GuideTopic));
    }),
};

const describeTownTool: ToolDef = {
  name: 'describe_town',
  description:
    'Describe a built-in town as text: an ASCII map with tile coordinates, its props, and every named place. ' +
    'Use the place names it lists (such as "bakery.door") as targets for walk, appear and the camera: props are not ' +
    'places, so to reach a building walk to its door place. Call this before writing a scene; next, list_townsfolk.',
  inputSchema: {
    type: 'object',
    properties: {
      town: {
        type: 'string',
        enum: Object.keys(TOWNS),
        default: 'willowSquare',
        description: `The town's export name; import it in the scene with import { <name> } from 'simutown'. Towns: ${Object.keys(TOWNS).join(', ')}.`,
      },
    },
    additionalProperties: false,
  },
  annotations: { title: 'Describe a town', readOnlyHint: true, idempotentHint: true },
  run: (args) =>
    guard(() => {
      const name = (args.town ?? 'willowSquare') as string;
      const town = TOWNS[name];
      if (!town) return fail(`Unknown town "${name}". Towns: ${Object.keys(TOWNS).join(', ')}.`);
      return ok(townText(name, town));
    }),
};

const listTownsfolkTool: ToolDef = {
  name: 'list_townsfolk',
  description:
    'List the built-in characters: id, name, role (baker, child, ...) and how they look. Cast a scene by role from this ' +
    'list and pass the id to s.actor(); no other ids exist. Next: write the scene with new_scene or write_scene.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { title: 'List the townsfolk', readOnlyHint: true, idempotentHint: true },
  run: () => guard(() => ok(townsfolkText())),
};

const listScenesTool: ToolDef = {
  name: 'list_scenes',
  description:
    'List the scenes in the project\'s scenes/ folder with their titles and lengths, or the error that stops a broken ' +
    'one from loading. Use it to find a scene name, or to copy the shape of an existing scene with read_scene.',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  annotations: { title: 'List scenes', readOnlyHint: true },
  run: (_args, ctx) =>
    guard(async () => {
      const files = sceneFiles(ctx.root);
      if (files.length === 0) return ok(`No scenes in ${join(ctx.root, 'scenes')} yet. Write one with new_scene or write_scene.`);
      const width = Math.max(...files.map((f) => basename(f, extname(f)).length));
      const lines: string[] = [];
      for (const f of files) {
        const name = basename(f, extname(f)).padEnd(width);
        try {
          const s = await loadFreshScene(f, ctx.root);
          lines.push(`${name}  ${s.title}  (${secs(s.duration)})`);
        } catch (e) {
          lines.push(`${name}  error: ${message(e).split('\n')[0]}`);
        }
      }
      return ok(lines.join('\n'));
    }),
};

const readSceneTool: ToolDef = {
  name: 'read_scene',
  description:
    'Read the source of a scene file. Use it before changing a scene, or to copy the shape of a working one. ' +
    'To change it, send the whole new source to write_scene.',
  inputSchema: { type: 'object', properties: { scene: SCENE_ARG }, required: ['scene'], additionalProperties: false },
  annotations: { title: 'Read a scene', readOnlyHint: true },
  run: (args, ctx) =>
    guard(() => {
      const path = scenePath(args.scene, ctx.root);
      return ok(`// ${shown(ctx.root, path)}\n${readFileSync(path, 'utf8')}`);
    }),
};

/** The project's scenes/ folder, created if missing. */
function scenesDir(root: string): string {
  const dir = join(root, 'scenes');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const newSceneTool: ToolDef = {
  name: 'new_scene',
  description:
    'Write a short, commented starter scene to scenes/<name>.ts that builds and renders as it is, and return its source. ' +
    'Use it to start a new scene from a working shape; then edit the source and send it back with write_scene. ' +
    'Refuses a name that is already taken.',
  inputSchema: { type: 'object', properties: { name: NAME_ARG }, required: ['name'], additionalProperties: false },
  annotations: { title: 'New starter scene' },
  run: (args, ctx) =>
    guard(() => {
      const dir = scenesDir(ctx.root);
      const path = newScene(String(args.name), dir, ctx.root);
      return ok(`${shown(ctx.root, path)} written. Edit it and send it back with write_scene.\n\n${readFileSync(path, 'utf8')}`);
    }),
};

/** A scene name as given, without a scene file extension. */
function bareName(name: string): string {
  const ext = extname(name);
  return SCENE_EXTENSIONS.includes(ext) ? name.slice(0, -ext.length) : name;
}

const writeSceneTool: ToolDef = {
  name: 'write_scene',
  description:
    'Write the whole source of a scene to scenes/<name>.ts (creating it, or overwriting the scene of that name), then ' +
    'build it and return either its summary and timeline (when each walk, line, caption and camera move starts) or the ' +
    'error that stops it, which names the valid places, characters or props. The file is written either way. ' +
    'A scene default-exports scene({ title, town, timeOfDay }, (s) => { ... }), importing from \'simutown\'. ' +
    'Fix errors and call again; once it builds, look at it with still (every_beat: true).',
  inputSchema: {
    type: 'object',
    properties: {
      name: NAME_ARG,
      source: { type: 'string', description: 'The complete TypeScript source of the scene file.' },
    },
    required: ['name', 'source'],
    additionalProperties: false,
  },
  annotations: { title: 'Write and build a scene', destructiveHint: true, idempotentHint: true },
  run: (args, ctx) =>
    guard(async () => {
      const name = bareName(String(args.name));
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
        return fail(`A scene name is lowercase words joined by dashes, such as "market-day"; got "${args.name}". The file goes in scenes/.`);
      }
      if (typeof args.source !== 'string' || args.source.trim() === '') return fail('"source" must be the complete source of the scene file.');
      const dir = scenesDir(ctx.root);
      // Overwrite the scene of that name whatever its extension; a new one gets the extension newScene picks.
      const path = SCENE_EXTENSIONS.map((e) => join(dir, name + e)).find((f) => existsSync(f)) ?? newScene(name, dir, ctx.root);
      writeFileSync(path, args.source);
      let scene: Scene;
      try {
        scene = await loadFreshScene(path, ctx.root);
      } catch (e) {
        return fail(`${shown(ctx.root, path)} written, but it does not build:\n${message(e)}`);
      }
      return ok(
        `${shown(ctx.root, path)} written and built.\n\n${infoText(scene, path, ctx.root, true)}\n\n` +
          `Next: still { scene: "${name}", every_beat: true } and look at every image.`,
      );
    }),
};

const sceneInfoTool: ToolDef = {
  name: 'scene_info',
  description:
    'Build a scene and describe it: title, duration, town, places, cast and (by default) its timeline of beats, with the ' +
    'start and end second of every walk, line, caption and camera move. Use the times to pick stills; to hit a target ' +
    'length, change an s.wait(...) before the final fade. Returns the build error if the scene does not build.',
  inputSchema: {
    type: 'object',
    properties: {
      scene: SCENE_ARG,
      beats: { type: 'boolean', default: true, description: 'Include the timeline of beats.' },
    },
    required: ['scene'],
    additionalProperties: false,
  },
  annotations: { title: 'Scene info', readOnlyHint: true },
  run: (args, ctx) =>
    guard(async () => {
      const { scene, path } = await sceneArg(args.scene, ctx.root);
      return ok(infoText(scene, path, ctx.root, args.beats !== false));
    }),
};

const stillTool: ToolDef = {
  name: 'still',
  description:
    'Render frames of a scene as PNG images you can look at, each with its time and what is running then; they are ' +
    'also saved under out/. Use every_beat: true after a change to see one frame per beat (up to 12), and look at every ' +
    'image: are the people who matter in frame and visible, do speech bubbles and labels overlap, is each caption up ' +
    'while its beat needs it? Fix with write_scene and look again. When every beat reads, render the film with render.',
  inputSchema: {
    type: 'object',
    properties: {
      scene: SCENE_ARG,
      t: { type: 'number', minimum: 0, description: 'One time in seconds. Default: the middle of the scene.' },
      times: { type: 'array', items: { type: 'number', minimum: 0 }, maxItems: 8, description: 'Several times in seconds (up to 8).' },
      every_beat: {
        type: 'boolean',
        default: false,
        description: 'One frame in the middle of each beat that takes time and just after each caption appears (up to 12).',
      },
      scale: { type: 'integer', minimum: 1, maximum: 4, default: 2, description: 'Upscale: 1 is 480x270, 2 is 960x540.' },
    },
    required: ['scene'],
    additionalProperties: false,
  },
  annotations: { title: 'Render stills', readOnlyHint: false, idempotentHint: true },
  run: (args, ctx) =>
    guard(async () => {
      const { scene, name } = await sceneArg(args.scene, ctx.root);
      const scale = (args.scale ?? 2) as number;
      if (!Number.isInteger(scale) || scale < 1 || scale > 4) return fail(`"scale" must be a whole number from 1 to 4, got ${args.scale}.`);
      let times: number[];
      let note = '';
      if (args.every_beat === true) {
        const { kept, dropped } = spread(beatTimes(scene), MAX_STILLS);
        times = kept;
        if (!scene.beats) note = 'This scene has no timeline of beats (it was not built with scene()), so these frames are spread evenly.\n';
        if (dropped.length) {
          note += `Showing ${kept.length} of ${kept.length + dropped.length} beats; not shown: ${dropped.map(secs).join(', ')} (ask for them with times).\n`;
        }
      } else if (Array.isArray(args.times) && args.times.length > 0) {
        times = args.times as number[];
        if (times.length > 8) return fail(`"times" takes up to 8 times, got ${times.length}. Use every_beat for a frame per beat.`);
      } else {
        times = [typeof args.t === 'number' ? args.t : scene.duration / 2];
      }
      const bad = times.filter((t) => typeof t !== 'number' || !Number.isFinite(t) || t < 0 || t > scene.duration);
      if (bad.length) return fail(`Times must be between 0 and ${secs(scene.duration)} (the scene's length); got ${bad.join(', ')}.`);

      const result: ToolResult = { content: [] };
      if (note) result.content.push({ type: 'text', text: note.trimEnd() });
      for (const t of times) {
        if (ctx.signal?.aborted) return fail('Cancelled.');
        const path = join(ctx.root, 'out', `${name}-${Number(t.toFixed(2))}s.png`);
        const res = renderStill(scene, t, path, { scale });
        result.content.push({ type: 'text', text: `t=${secs(t)}: ${runningAt(scene.beats, t)}  [${shown(ctx.root, res.path)}, ${res.width}x${res.height}]` });
        result.content.push({ type: 'image', data: readFileSync(res.path).toString('base64'), mimeType: 'image/png' });
      }
      return result;
    }),
};

const renderTool: ToolDef = {
  name: 'render',
  description:
    'Render a scene to a video file with ffmpeg: mp4 (1920x1080, for slides and players), gif (960x540, 15 fps, for ' +
    'READMEs and chat) or webm. Returns the file path, size, frame count and length. A full render takes a while: check ' +
    'the beats with still first. Use from/to to render a short range.',
  inputSchema: {
    type: 'object',
    properties: {
      scene: SCENE_ARG,
      format: { type: 'string', enum: ['mp4', 'gif', 'webm'], default: 'mp4', description: 'The container.' },
      output: { type: 'string', description: 'Where to write, relative to the project folder. Default out/<scene>.<format>.' },
      from: { type: 'number', minimum: 0, description: 'Start of the range, in seconds. Default 0.' },
      to: { type: 'number', minimum: 0, description: "End of the range, in seconds. Default the scene's length." },
      scale: { type: 'integer', minimum: 1, maximum: 8, description: 'Upscale of the 480x270 frame. Default 4 (2 for gif).' },
      fps: { type: 'number', minimum: 1, maximum: 60, description: "Frame rate. Default the scene's (15 for gif)." },
    },
    required: ['scene'],
    additionalProperties: false,
  },
  annotations: { title: 'Render a film' },
  run: (args, ctx) =>
    guard(async () => {
      const { scene, name } = await sceneArg(args.scene, ctx.root);
      let format = (args.format ?? 'mp4') as string;
      let path = join(ctx.root, 'out', `${name}.${format}`);
      if (typeof args.output === 'string' && args.output !== '') {
        path = resolve(ctx.root, args.output);
        if (!inside(ctx.root, path)) return fail(`"output" must stay inside the project folder ${ctx.root}; got "${args.output}". Try "out/${name}.${format}".`);
        const ext = extname(path).slice(1).toLowerCase();
        if (ext === '') path += `.${format}`;
        else if (!['mp4', 'gif', 'webm'].includes(ext)) return fail(`"output" must end in .mp4, .gif or .webm; got "${args.output}".`);
        else if (args.format !== undefined && ext !== format) return fail(`"output" ends in .${ext} but "format" is ${format}: make them agree.`);
        else format = ext;
      }
      const res = await renderVideo(scene, path, {
        scale: args.scale as number | undefined,
        fps: args.fps as number | undefined,
        from: args.from as number | undefined,
        to: args.to as number | undefined,
        onProgress: (p) => {
          // renderVideo stops, kills ffmpeg and removes the partial file when a callback throws.
          if (ctx.signal?.aborted) throw new Error('Render cancelled.');
          if (p.frame === p.frames || p.frame % 10 === 0) ctx.progress?.(p.frame, p.frames, `frame ${p.frame} of ${p.frames}`);
        },
      });
      const bytes = statSync(res.path).size;
      return ok(
        `${shown(ctx.root, res.path)}  ${res.format}, ${res.width}x${res.height}, ${res.frames} frames at ${res.fps} fps, ` +
          `${secs(res.duration)}, ${bytes} bytes (rendered in ${secs(res.elapsedMs / 1000)})`,
      );
    }),
};

/** All the Simutown tools, in the order an author uses them. */
export function simutownTools(): ToolDef[] {
  return [
    readGuideTool,
    describeTownTool,
    listTownsfolkTool,
    listScenesTool,
    readSceneTool,
    newSceneTool,
    writeSceneTool,
    sceneInfoTool,
    stillTool,
    renderTool,
  ];
}

