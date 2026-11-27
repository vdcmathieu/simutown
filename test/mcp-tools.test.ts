import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hasFfmpeg } from '../src/node/video';
import { simutownPrompts, simutownResources } from '../src/mcp/resources';
import { createServer } from '../src/mcp/server';
import { beatTimes, pickStills, simutownTools } from '../src/mcp/tools';
import type { ToolContext, ToolResult } from '../src/mcp/types';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FFMPEG = await hasFfmpeg();

/** A fresh project: package.json, and scenes/good-morning.ts copied from examples/. */
function project(): string {
  const root = mkdtempSync(join(tmpdir(), 'simutown-mcp-'));
  writeFileSync(join(root, 'package.json'), '{ "type": "module" }\n');
  mkdirSync(join(root, 'scenes'));
  copyFileSync(join(REPO, 'examples/good-morning.ts'), join(root, 'scenes/good-morning.ts'));
  return root;
}

const tools = simutownTools();
const call = (name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> => {
  const tool = tools.find((t) => t.name === name);
  if (!tool) throw new Error(`no tool ${name}`);
  return tool.run(args, ctx);
};
const text = (r: ToolResult) => r.content.flatMap((c) => (c.type === 'text' ? [c.text] : [])).join('\n');

const SCENE = (title: string, line: string) => `import { scene, willowSquare } from 'simutown';
export default scene({ title: '${title}', town: willowSquare, timeOfDay: 10 }, (s) => {
  const bo = s.actor('bo', { at: 'bakery.door' });
  s.camera.cut('bakery.door', { zoom: 2 });
  s.fadeIn();
  bo.say('${line}');
  s.caption('Bread.', { hold: 1 });
  s.fadeOut();
});
`;

describe('simutown MCP tools', () => {
  it('has the tools, with schemas and annotations', () => {
    expect(tools.map((t) => t.name)).toEqual([
      'read_guide', 'describe_town', 'list_townsfolk', 'list_scenes', 'read_scene',
      'new_scene', 'write_scene', 'delete_scene', 'scene_info', 'still', 'render',
    ]);
    for (const t of tools) {
      expect(t.description.length).toBeGreaterThan(80);
      expect(t.inputSchema.type).toBe('object');
    }
    expect(tools.find((t) => t.name === 'read_guide')!.annotations?.readOnlyHint).toBe(true);
    expect(tools.find((t) => t.name === 'write_scene')!.annotations?.destructiveHint).toBe(true);
  });

  it('reads the guides, the town and the townsfolk', async () => {
    const root = project();
    const guide = await call('read_guide', {}, { root });
    expect(text(guide)).toMatch(/^# Writing a scene/);
    expect(text(await call('read_guide', { topic: 'style' }, { root }))).toMatch(/#/);
    const bad = await call('read_guide', { topic: 'nope' }, { root });
    expect(bad.isError).toBe(true);
    expect(text(bad)).toMatch(/authoring, scene-api, making-art, style, mcp/);
    expect(text(guide)).toMatch(/Reading this through MCP: .*scene_info/);
    expect(text(await call('read_guide', { topic: 'mcp' }, { root }))).toMatch(/^# Using Simutown from an agent/);

    const town = text(await call('describe_town', {}, { root }));
    expect(town).toMatch(/Willow Square/);
    expect(town).toMatch(/Place names to use as targets[^\n]*\n.*bakery\.door/);
    const unknown = await call('describe_town', { town: 'gotham' }, { root });
    expect(unknown.isError).toBe(true);
    expect(text(unknown)).toMatch(/willowSquare/);

    const folk = text(await call('list_townsfolk', {}, { root }));
    expect(folk).toMatch(/^bo - Bo, baker:/m);
    expect(folk).toMatch(/^kofi - /m);
  });

  it('lists, reads and describes scenes, and refuses unknown ones and paths outside the project', async () => {
    const root = project();
    writeFileSync(join(root, 'scenes/broken.ts'), 'export default 3;\n');
    const list = text(await call('list_scenes', {}, { root }));
    expect(list).toMatch(/good-morning\s+Good morning\s+\(12\.27s\)/);
    expect(list).toMatch(/broken\s+error: .*not a Scene/);

    expect(text(await call('read_scene', { scene: 'good-morning' }, { root }))).toMatch(/Bakery Lane/);
    const info = text(await call('scene_info', { scene: 'good-morning' }, { root }));
    expect(info).toMatch(/^Good morning/);
    expect(info).toMatch(/5\.00s - +6\.77s +ana +says "Good morning, Bo!"/);
    expect(text(await call('scene_info', { scene: 'good-morning', beats: false }, { root }))).not.toMatch(/Beats/);

    const missing = await call('scene_info', { scene: 'nope' }, { root });
    expect(missing.isError).toBe(true);
    expect(text(missing)).toMatch(/Scenes in scenes\/: .*good-morning/);

    const outside = join(REPO, 'scenes/hello.ts');
    for (const scene of ['../../etc/passwd.ts', outside]) {
      const r = await call('read_scene', { scene }, { root });
      expect(r.isError).toBe(true);
    }
    expect(text(await call('read_scene', { scene: outside }, { root }))).toMatch(/outside the project/);
    const pkg = await call('read_scene', { scene: 'package.json' }, { root });
    expect(pkg.isError).toBe(true);
    expect(text(pkg)).toMatch(/not a scene file/);
    // Refused by name, before anything outside the project is looked for.
    const up = await call('still', { scene: '../../etc/passwd' }, { root });
    expect(text(up)).toMatch(/outside the project/);
    expect(text(up)).not.toMatch(/looked for/);
  });

  it('deletes only the scenes it created in this session', async () => {
    const root = project();
    const draft = await call('write_scene', { name: 'draft', source: 'export default 3;\n' }, { root });
    expect(text(draft)).toMatch(/call delete_scene/);
    const r = await call('delete_scene', { name: 'draft' }, { root });
    expect(r.isError).toBeUndefined();
    expect(existsSync(join(root, 'scenes/draft.ts'))).toBe(false);
    const old = await call('delete_scene', { name: 'good-morning' }, { root });
    expect(old.isError).toBe(true);
    expect(text(old)).toMatch(/not created in this session/);
    expect(existsSync(join(root, 'scenes/good-morning.ts'))).toBe(true);
    expect((await call('delete_scene', { name: 'nope' }, { root })).isError).toBe(true);
  });

  it('writes a scene and answers with its beats, or with the build error', async () => {
    const root = project();
    const good = await call('write_scene', { name: 'bread', source: SCENE('Bread', 'Fresh bread!') }, { root });
    expect(good.isError).toBeUndefined();
    expect(text(good)).toMatch(/scenes\/bread\.ts written and built/);
    expect(text(good)).toMatch(/bo +says "Fresh bread!"/);

    const broken = SCENE('Bread', 'Hi').replace("'bakery.door' }", "'bakery' }");
    const bad = await call('write_scene', { name: 'bread', source: broken }, { root });
    expect(bad.isError).toBe(true);
    expect(text(bad)).toMatch(/does not build/);
    expect(text(bad)).toMatch(/bakery\.door/);
    expect(readFileSync(join(root, 'scenes/bread.ts'), 'utf8')).toBe(broken);

    for (const name of ['../escape', 'Bad Name', 'a/b']) {
      const r = await call('write_scene', { name, source: SCENE('x', 'y') }, { root });
      expect(r.isError).toBe(true);
      expect(text(r)).toMatch(/lowercase words joined by dashes/);
    }
    expect(existsSync(join(root, 'escape.ts'))).toBe(false);
  });

  it('sees a rewritten scene at once (no stale module cache)', async () => {
    const root = project();
    await call('write_scene', { name: 'bread', source: SCENE('First', 'One') }, { root });
    expect(text(await call('scene_info', { scene: 'bread' }, { root }))).toMatch(/^First/);
    await call('write_scene', { name: 'bread', source: SCENE('Second', 'Two') }, { root });
    const info = text(await call('scene_info', { scene: 'bread' }, { root }));
    expect(info).toMatch(/^Second/);
    expect(info).toMatch(/says "Two"/);
  });

  it('writes a starter with new_scene, and refuses a taken name', async () => {
    const root = project();
    const r = await call('new_scene', { name: 'market-day' }, { root });
    expect(r.isError).toBeUndefined();
    expect(text(r)).toMatch(/scenes\/market-day\.ts written/);
    expect(text(r)).toMatch(/title: 'Market day'/);
    expect(text(await call('scene_info', { scene: 'market-day' }, { root }))).toMatch(/^Market day/);
    const again = await call('new_scene', { name: 'market-day' }, { root });
    expect(again.isError).toBe(true);
    expect(text(again)).toMatch(/already exists/);
  });

  it('returns stills as PNG images, saved under out/', async () => {
    const root = project();
    const r = await call('still', { scene: 'good-morning', t: 6, scale: 1 }, { root });
    expect(r.isError).toBeUndefined();
    const img = r.content.find((c) => c.type === 'image');
    expect(img?.type).toBe('image');
    const png = Buffer.from(img!.type === 'image' ? img!.data : '', 'base64');
    expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(png.readUInt32BE(16)).toBe(480);
    expect(png.readUInt32BE(20)).toBe(270);
    expect(text(r)).toMatch(/t=6s: .*ana says "Good morning, Bo!"/);
    expect(existsSync(join(root, 'out/good-morning-6s.png'))).toBe(true);

    const two = await call('still', { scene: 'good-morning', times: [1, 2], scale: 1 }, { root });
    expect(two.content.filter((c) => c.type === 'image')).toHaveLength(2);

    const beats = await call('still', { scene: 'good-morning', every_beat: true, scale: 1 }, { root });
    const n = beats.content.filter((c) => c.type === 'image').length;
    expect(n).toBeGreaterThan(2);
    expect(n).toBeLessThanOrEqual(12);

    const late = await call('still', { scene: 'good-morning', t: 99 }, { root });
    expect(late.isError).toBe(true);
    expect(text(late)).toMatch(/between 0 and 12\.27s/);
    expect(text(late)).toMatch(/try t: 12\.2\d? for the last frame, or every_beat: true/);
  });

  it('caps every_beat at 12 stills, keeping lines and captions first', () => {
    const times = Array.from({ length: 30 }, (_, i) => ({ t: i, key: i % 10 === 0 }));
    const { kept, dropped } = pickStills(times, 12);
    expect(kept).toHaveLength(12);
    expect(dropped).toHaveLength(18);
    expect(kept).toEqual(expect.arrayContaining([0, 10, 20]));
    expect(beatTimes({ duration: 8, beats: undefined } as never).map((c) => c.t)).toEqual([1, 3, 5, 7]);
  });

  it('merges beat times that show the same moment, keeping the busiest', () => {
    const beats = [
      { start: 3, end: 4.2, actor: 'ana', what: 'walks to [22, 15]' },
      { start: 3, end: 4.6, actor: 'yuki', what: 'walks to [25, 15]' },
      { start: 3.4, end: 3.4, what: 'caption "Off they go"' },
      { start: 10, end: 12, actor: 'yuki', what: 'says "Then I am off!"' },
      { start: 11.5, end: 12.4, actor: 'yuki', what: 'emotes happy' },
    ];
    const times = beatTimes({ duration: 14, beats } as never);
    expect(times).toEqual([
      { t: 3.6, key: true },
      { t: 11, key: true },
      { t: 11.95, key: false },
    ]);
  });

  it('refuses render outputs outside the project', async () => {
    const root = project();
    const r = await call('render', { scene: 'good-morning', output: '../film.gif' }, { root });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/inside the project/);
    const ext = await call('render', { scene: 'good-morning', output: 'out/film.mov' }, { root });
    expect(ext.isError).toBe(true);
  });

  it('takes the format from the output when no format is given (through tools/call)', async () => {
    const root = project();
    const server = createServer({ name: 't', version: '0', instructions: '', tools, resources: [], prompts: [] }, { root, log: () => {} });
    const res = (await server.handle({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'render', arguments: { scene: 'good-morning', output: 'out/x.gif', from: 5, to: 5.2, scale: 1 } },
    })) as { result: ToolResult };
    expect(text(res.result)).not.toMatch(/make them agree/);
    if (FFMPEG) expect(text(res.result)).toMatch(/out\/x\.gif +gif/);
    const clash = await call('render', { scene: 'good-morning', output: 'out/x.gif', format: 'mp4' }, { root });
    expect(text(clash)).toMatch(/ends in \.gif but "format" is mp4/);
  });

  it.skipIf(!FFMPEG)('renders a short gif range, reporting progress', async () => {
    const root = project();
    const progress: number[] = [];
    const r = await call(
      'render',
      { scene: 'good-morning', format: 'gif', from: 5, to: 5.5, scale: 1 },
      { root, progress: (done) => progress.push(done) },
    );
    expect(r.isError).toBeUndefined();
    expect(text(r)).toMatch(/out\/good-morning\.gif +gif, 480x270, 8 frames at 15 fps/);
    expect(text(r)).toMatch(/\d+ bytes/);
    expect(readFileSync(join(root, 'out/good-morning.gif')).subarray(0, 3).toString()).toBe('GIF');
    expect(progress.at(-1)).toBe(8);
  });

  it.skipIf(!FFMPEG)('stops a render when the request is cancelled', async () => {
    const root = project();
    const ac = new AbortController();
    ac.abort();
    const r = await call('render', { scene: 'good-morning', format: 'gif', from: 5, to: 5.5, scale: 1 }, { root, signal: ac.signal });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/cancelled/i);
    expect(existsSync(join(root, 'out/good-morning.gif'))).toBe(false);
  });
});

describe('simutown MCP resources and prompt', () => {
  it('lists the guides, the townsfolk and the towns', async () => {
    const root = project();
    const res = simutownResources();
    expect(res.map((r) => r.uri)).toEqual(expect.arrayContaining([
      'simutown://docs/authoring', 'simutown://docs/scene-api', 'simutown://docs/making-art', 'simutown://docs/style', 'simutown://docs/mcp',
      'simutown://townsfolk', 'simutown://towns/willowSquare',
    ]));
    const folk = JSON.parse(await res.find((r) => r.uri === 'simutown://townsfolk')!.read({ root })) as { id: string }[];
    expect(folk.map((p) => p.id)).toContain('bo');
    expect(await res.find((r) => r.uri === 'simutown://towns/willowSquare')!.read({ root })).toMatch(/bakery\.door/);
  });

  it('expands the scene prompt into the authoring loop', async () => {
    const [prompt] = simutownPrompts();
    expect(prompt!.name).toBe('scene');
    const msg = await prompt!.render({ idea: 'a child asks the baker for bread' }, { root: REPO });
    expect(msg).toMatch(/about 20 seconds/);
    for (const tool of ['describe_town', 'list_townsfolk', 'write_scene', 'scene_info', 'every_beat', 'render']) expect(msg).toContain(tool);
    expect(await prompt!.render({ idea: 'x', seconds: '45' }, { root: REPO })).toMatch(/about 45 seconds/);
  });
});
