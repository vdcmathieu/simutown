import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { checkArguments, createServer, serveStdio, type OutgoingMessage } from '../src/mcp/server';
import type { ServerSpec, ToolResult } from '../src/mcp/types';

/** A fake spec: an echo tool, a slow tool with progress, a throwing tool, a resource and a prompt. */
function fakeSpec(): ServerSpec {
  return {
    name: 'fake',
    version: '1.2.3',
    instructions: 'Use echo.',
    tools: [
      {
        name: 'echo',
        description: 'Echo the arguments.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            count: { type: 'integer', minimum: 1, maximum: 5, default: 2 },
            mood: { type: 'string', enum: ['happy', 'sad'] },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 2 },
            loud: { type: 'boolean' },
          },
          required: ['text'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        async run(args, ctx) {
          return { content: [{ type: 'text', text: JSON.stringify({ args, root: ctx.root }) }] };
        },
      },
      {
        name: 'slow',
        description: 'Report progress, then wait until released or cancelled.',
        inputSchema: { type: 'object', properties: {} },
        run(_args, ctx) {
          ctx.progress?.(1, 3, 'one');
          ctx.progress?.(2, 3);
          return new Promise<ToolResult>((resolve) => {
            ctx.signal?.addEventListener('abort', () => resolve({ content: [{ type: 'text', text: 'aborted' }] }));
            slowRelease = () => resolve({ content: [{ type: 'text', text: 'done' }] });
          });
        },
      },
      {
        name: 'boom',
        description: 'Throw.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
          throw new Error('kaboom');
        },
      },
      {
        name: 'leaky',
        description: 'Write to stdout around the console.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
          console.dir({ dir: 1 });
          console.table([1]);
          process.stdout.write('raw stdout\n');
          return { content: [{ type: 'text', text: 'ok' }] };
        },
      },
      {
        name: 'chatty',
        description: 'Log to the console.',
        inputSchema: { type: 'object', properties: {} },
        async run() {
          console.log('hello from a scene');
          return { content: [{ type: 'text', text: 'ok' }] };
        },
      },
    ],
    resources: [
      {
        uri: 'fake://docs/guide',
        name: 'guide',
        description: 'The guide.',
        mimeType: 'text/markdown',
        async read() {
          return '# Guide';
        },
      },
    ],
    prompts: [
      {
        name: 'scene',
        description: 'Write a scene.',
        arguments: [
          { name: 'idea', description: 'The idea.', required: true },
          { name: 'length', description: 'Seconds.' },
        ],
        async render(args) {
          return `Write a scene about ${args.idea}.`;
        },
      },
    ],
  };
}

let slowRelease: (() => void) | undefined;

const req = (id: number | string, method: string, params?: unknown) => ({ jsonrpc: '2.0', id, method, params });
const silent = () => {};

function setup() {
  const notes: OutgoingMessage[] = [];
  const server = createServer(fakeSpec(), { root: '/proj', log: silent, notify: (m) => notes.push(m) });
  return { server, notes };
}

async function call(name: string, args?: unknown) {
  const { server } = setup();
  const res = (await server.handle(req(1, 'tools/call', { name, arguments: args }))) as { result: ToolResult };
  return res.result;
}

const textOf = (r: ToolResult) => (r.content[0] as { text: string }).text;

describe('createServer', () => {
  it('initializes with the client version when supported, else the latest', async () => {
    const { server } = setup();
    const a = (await server.handle(req(1, 'initialize', { protocolVersion: '2024-11-05', capabilities: {} }))) as any;
    expect(a.result).toEqual({
      protocolVersion: '2024-11-05',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'fake', version: '1.2.3' },
      instructions: 'Use echo.',
    });
    const b = (await server.handle(req(2, 'initialize', { protocolVersion: '2025-03-26' }))) as any;
    expect(b.result.protocolVersion).toBe('2025-03-26');
    const c = (await server.handle(req(3, 'initialize', { protocolVersion: '1999-01-01' }))) as any;
    expect(c.result.protocolVersion).toBe('2025-06-18');
  });

  it('answers ping and ignores notifications', async () => {
    const { server } = setup();
    expect(await server.handle(req('p', 'ping'))).toEqual({ jsonrpc: '2.0', id: 'p', result: {} });
    expect(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined();
    expect(await server.handle({ jsonrpc: '2.0', method: 'notifications/whatever' })).toBeUndefined();
  });

  it('lists tools with schemas and annotations', async () => {
    const { server } = setup();
    const res = (await server.handle(req(1, 'tools/list'))) as any;
    expect(res.result.tools.map((t: any) => t.name)).toEqual(['echo', 'slow', 'boom', 'leaky', 'chatty']);
    expect(res.result.tools[0]).toMatchObject({
      description: 'Echo the arguments.',
      inputSchema: { type: 'object', required: ['text'] },
      annotations: { readOnlyHint: true },
    });
  });

  it('calls a tool with defaults applied and the root in the context', async () => {
    const r = await call('echo', { text: 'hi' });
    expect(r.isError).toBeUndefined();
    expect(JSON.parse(textOf(r))).toEqual({ args: { text: 'hi', count: 2 }, root: '/proj' });
  });

  it('rejects an unknown tool with -32602 listing the valid tools', async () => {
    const { server } = setup();
    const res = (await server.handle(req(1, 'tools/call', { name: 'nope' }))) as any;
    expect(res.error.code).toBe(-32602);
    expect(res.error.message).toContain('echo, slow, boom, leaky, chatty');
  });

  it('checks arguments and says what was expected and given', async () => {
    expect(textOf(await call('echo', {}))).toContain('Missing required argument "text"');
    expect(textOf(await call('echo', undefined))).toContain('Missing required argument "text"');
    const wrongType = await call('echo', { text: 3 });
    expect(wrongType.isError).toBe(true);
    expect(textOf(wrongType)).toContain('Argument "text" must be a string, got 3 (integer)');
    expect(textOf(await call('echo', { text: 'a', count: 1.5 }))).toContain('"count" must be an integer, got 1.5 (number)');
    expect(textOf(await call('echo', { text: 'a', count: 0 }))).toContain('"count" must be at least 1, got 0');
    expect(textOf(await call('echo', { text: 'a', count: 9 }))).toContain('"count" must be at most 5, got 9');
    expect(textOf(await call('echo', { text: 'a', mood: 'meh' }))).toContain('"mood" must be one of "happy", "sad", got "meh"');
    expect(textOf(await call('echo', { text: 'a', tags: ['x', 1] }))).toContain('"tags[1]" must be a string');
    expect(textOf(await call('echo', { text: 'a', tags: ['x', 'y', 'z'] }))).toContain('at most 2 items, got 3');
    expect(textOf(await call('echo', { text: 'a', loud: 'yes' }))).toContain('"loud" must be a boolean');
    const unknown = await call('echo', { text: 'a', colour: 'red' });
    expect(textOf(unknown)).toContain('Unknown argument "colour". Valid arguments: text, count, mood, tags, loud.');
    expect(textOf(await call('echo', [1]))).toContain('Arguments must be an object');
  });

  it('keeps unknown properties when additionalProperties is not false', () => {
    const r = checkArguments({ type: 'object', properties: {} }, { extra: 1 });
    expect(r).toEqual({ ok: true, args: { extra: 1 } });
  });

  it('turns a thrown tool into an error result', async () => {
    const r = await call('boom', {});
    expect(r).toEqual({ content: [{ type: 'text', text: 'kaboom' }], isError: true });
  });

  it('sends progress when the call has a progress token, and none without', async () => {
    const { server, notes } = setup();
    const pending = server.handle(req(1, 'tools/call', { name: 'slow', arguments: {}, _meta: { progressToken: 'tok' } }));
    await Promise.resolve();
    slowRelease!();
    expect(await pending).toEqual({ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'done' }] } });
    expect(notes).toEqual([
      { jsonrpc: '2.0', method: 'notifications/progress', params: { progressToken: 'tok', progress: 1, total: 3, message: 'one' } },
      { jsonrpc: '2.0', method: 'notifications/progress', params: { progressToken: 'tok', progress: 2, total: 3 } },
    ]);

    const quiet = setup();
    const p2 = quiet.server.handle(req(2, 'tools/call', { name: 'slow', arguments: {} }));
    await Promise.resolve();
    slowRelease!();
    await p2;
    expect(quiet.notes).toEqual([]);
  });

  it('aborts a cancelled call and sends no response for it', async () => {
    const { server } = setup();
    const pending = server.handle(req(7, 'tools/call', { name: 'slow', arguments: {} }));
    await Promise.resolve();
    expect(await server.handle({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 7 } })).toBeUndefined();
    expect(await pending).toBeUndefined();
    // Later requests with the same id answer normally.
    expect(await server.handle(req(7, 'ping'))).toEqual({ jsonrpc: '2.0', id: 7, result: {} });
  });

  it('lists and reads resources', async () => {
    const { server } = setup();
    const list = (await server.handle(req(1, 'resources/list'))) as any;
    expect(list.result.resources).toEqual([
      { uri: 'fake://docs/guide', name: 'guide', description: 'The guide.', mimeType: 'text/markdown' },
    ]);
    const read = (await server.handle(req(2, 'resources/read', { uri: 'fake://docs/guide' }))) as any;
    expect(read.result).toEqual({ contents: [{ uri: 'fake://docs/guide', mimeType: 'text/markdown', text: '# Guide' }] });
    const bad = (await server.handle(req(3, 'resources/read', { uri: 'fake://nope' }))) as any;
    expect(bad.error.code).toBe(-32002);
    expect(bad.error.data).toEqual({ uri: 'fake://nope' });
    expect(bad.error.message).toContain('fake://docs/guide');
  });

  it('lists and gets prompts, rejecting missing required arguments', async () => {
    const { server } = setup();
    const list = (await server.handle(req(1, 'prompts/list'))) as any;
    expect(list.result.prompts[0]).toMatchObject({ name: 'scene', arguments: [{ name: 'idea', required: true }, { name: 'length' }] });
    const got = (await server.handle(req(2, 'prompts/get', { name: 'scene', arguments: { idea: 'bread' } }))) as any;
    expect(got.result).toEqual({
      description: 'Write a scene.',
      messages: [{ role: 'user', content: { type: 'text', text: 'Write a scene about bread.' } }],
    });
    const missing = (await server.handle(req(3, 'prompts/get', { name: 'scene', arguments: {} }))) as any;
    expect(missing.error.code).toBe(-32602);
    expect(missing.error.message).toContain('idea');
    const unknown = (await server.handle(req(4, 'prompts/get', { name: 'x' }))) as any;
    expect(unknown.error.message).toContain('Valid prompts: scene');
  });

  it('answers protocol errors with the right codes', async () => {
    const { server } = setup();
    expect(((await server.handle(req(1, 'nope/method'))) as any).error.code).toBe(-32601);
    expect(await server.handle({ id: 1, method: 'ping' })).toMatchObject({ id: 1, error: { code: -32600 } });
    expect(await server.handle({ jsonrpc: '2.0', id: 2 })).toMatchObject({ id: 2, error: { code: -32600 } });
    expect(await server.handle('hello')).toMatchObject({ id: null, error: { code: -32600 } });
    expect(await server.handle([])).toMatchObject({ id: null, error: { code: -32600 } });
    expect(await server.handle({ jsonrpc: '2.0', id: 1.5, method: 'ping' })).toMatchObject({ id: null, error: { code: -32600 } });
    expect(await server.handle({ jsonrpc: '2.0', id: { x: 1 }, method: 'ping' })).toMatchObject({ id: null, error: { code: -32600 } });
    expect(await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list', params: 5 })).toMatchObject({ id: 3, error: { code: -32602 } });
    // A batch gets the array of its responses; notifications in it get none.
    expect(await server.handle([req(1, 'ping'), { jsonrpc: '2.0', method: 'notifications/initialized' }, req(2, 'nope')])).toEqual([
      { jsonrpc: '2.0', id: 1, result: {} },
      { jsonrpc: '2.0', id: 2, error: { code: -32601, message: 'Unknown method "nope".' } },
    ]);
    expect(await server.handle([{ jsonrpc: '2.0', method: 'notifications/initialized' }])).toBeUndefined();
    // A response from the client is ignored.
    expect(await server.handle({ jsonrpc: '2.0', id: 9, result: {} })).toBeUndefined();
  });
});

/** Start serveStdio on PassThrough streams and collect the output lines. */
function stdio() {
  const input = new PassThrough();
  const output = new PassThrough();
  const lines: any[] = [];
  let partial = '';
  output.on('data', (chunk: Buffer) => {
    partial += chunk.toString('utf8');
    const parts = partial.split('\n');
    partial = parts.pop()!;
    for (const p of parts) lines.push(JSON.parse(p));
  });
  const done = serveStdio(fakeSpec(), { root: '/proj', input, output, log: silent });
  return { input, lines, done };
}

const until = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i++) await new Promise((r) => setTimeout(r, 5));
  expect(check()).toBe(true);
};

describe('serveStdio', () => {
  it('handles partial lines, several messages per chunk, CRLF and blank lines', async () => {
    const { input, lines, done } = stdio();
    const a = JSON.stringify(req(1, 'ping'));
    const b = JSON.stringify(req(2, 'ping'));
    input.write(a.slice(0, 10));
    input.write(`${a.slice(10)}\r\n\n${b}\n${JSON.stringify(req(3, 'ping')).slice(0, 5)}`);
    input.end(`${JSON.stringify(req(3, 'ping')).slice(5)}`); // last line without a newline
    await done;
    expect(lines.map((l) => l.id).sort()).toEqual([1, 2, 3]);
  });

  it('answers an unparseable line with -32700 and id null', async () => {
    const { input, lines, done } = stdio();
    input.end('{not json\n');
    await done;
    expect(lines).toEqual([{ jsonrpc: '2.0', id: null, error: { code: -32700, message: expect.stringContaining('Parse error') } }]);
  });

  it('runs requests concurrently: a slow call does not block a ping, and progress goes out', async () => {
    const { input, lines, done } = stdio();
    input.write(`${JSON.stringify(req(1, 'tools/call', { name: 'slow', _meta: { progressToken: 5 } }))}\n`);
    input.write(`${JSON.stringify(req(2, 'ping'))}\n`);
    await until(() => lines.some((l) => l.id === 2));
    expect(lines.some((l) => l.id === 1)).toBe(false);
    expect(lines.filter((l) => l.method === 'notifications/progress').map((l) => l.params.progress)).toEqual([1, 2]);
    slowRelease!();
    input.end();
    await done;
    expect(lines.at(-1)).toMatchObject({ id: 1, result: { content: [{ text: 'done' }] } });
  });

  it('cancels over stdio without answering the cancelled request', async () => {
    const { input, lines, done } = stdio();
    input.write(`${JSON.stringify(req('c', 'tools/call', { name: 'slow' }))}\n`);
    input.end(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 'c', reason: 'stop' } })}\n`);
    await done;
    expect(lines.filter((l) => l.id === 'c')).toEqual([]);
  });

  it('routes console.log to stderr while serving, and restores it after', async () => {
    const original = console.log;
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdout = vi.spyOn(process.stdout, 'write');
    try {
      const { input, lines, done } = stdio();
      input.end(`${JSON.stringify(req(1, 'tools/call', { name: 'chatty' }))}\n`);
      await done;
      expect(lines).toEqual([{ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'ok' }] } }]);
      expect(stderr.mock.calls.some(([s]) => String(s).includes('hello from a scene'))).toBe(true);
      expect(stdout.mock.calls.some(([s]) => String(s).includes('hello from a scene'))).toBe(false);
    } finally {
      stderr.mockRestore();
      stdout.mockRestore();
    }
    expect(console.log).toBe(original);
  });

  it('routes console.dir, console.table and process.stdout.write to stderr too', async () => {
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const realStdoutWrite = process.stdout.write;
    const stdout: string[] = [];
    process.stdout.write = ((s: string) => (stdout.push(String(s)), true)) as typeof process.stdout.write;
    try {
      const { input, lines, done } = stdio();
      input.end(`${JSON.stringify(req(1, 'tools/call', { name: 'leaky' }))}\n`);
      await done;
      expect(lines).toEqual([{ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'ok' }] } }]);
      const err = stderr.mock.calls.map(([s]) => String(s)).join('');
      expect(err).toContain('dir: 1');
      expect(err).toContain('raw stdout');
      expect(stdout).toEqual([]);
    } finally {
      process.stdout.write = realStdoutWrite;
      stderr.mockRestore();
    }
  });

  it('aborts the calls still running when the input ends, and answers them', async () => {
    const { input, lines, done } = stdio();
    input.end(`${JSON.stringify(req(1, 'tools/call', { name: 'slow' }))}\n`);
    await done;
    expect(lines).toEqual([{ jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'aborted' }] } }]);
  });

  it('shuts down on its signal, aborting what runs, with the input still open', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const stop = new AbortController();
    const out: string[] = [];
    output.on('data', (c: Buffer) => out.push(c.toString()));
    const done = serveStdio(fakeSpec(), { root: '/proj', input, output, log: silent, signal: stop.signal });
    input.write(`${JSON.stringify(req(1, 'tools/call', { name: 'slow' }))}\n`);
    await new Promise((r) => setTimeout(r, 10));
    stop.abort();
    await done;
    expect(out.join('')).toContain('aborted');
  });

  it('shuts down instead of crashing when the output fails (EPIPE)', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const done = serveStdio(fakeSpec(), { root: '/proj', input, output, log: silent });
    input.write(`${JSON.stringify(req(1, 'tools/call', { name: 'slow' }))}\n`);
    await new Promise((r) => setTimeout(r, 10));
    output.emit('error', Object.assign(new Error('write EPIPE'), { code: 'EPIPE' }));
    await done;
    output.emit('error', new Error('late')); // logged, not thrown
  });
});
