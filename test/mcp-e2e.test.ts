/**
 * The MCP server end to end: spawn `simutown mcp` as a child process the way .mcp.json does,
 * talk to it over stdin and stdout, and check that stdout carries nothing but protocol.
 */
import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const REPO = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** A JSON-RPC client over a child's stdio: `request` resolves with the response of that id. */
function client(child: ChildProcessWithoutNullStreams) {
  const lines: string[] = [];
  const waiting = new Map<number, (m: Record<string, unknown>) => void>();
  let buffer = '';
  let nextId = 1;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 1);
      lines.push(line);
      const message = JSON.parse(line) as Record<string, unknown>; // throws if stdout is not pure JSON lines
      waiting.get(message.id as number)?.(message);
    }
  });
  const send = (message: Record<string, unknown>) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
  return {
    lines,
    notify: (method: string, params?: unknown) => send({ method, params }),
    request(method: string, params?: unknown): Promise<Record<string, unknown>> {
      const id = nextId++;
      return new Promise((done) => {
        waiting.set(id, done);
        send({ id, method, params });
      });
    },
  };
}

it('serves Simutown over stdio as .mcp.json starts it', { timeout: 30_000 }, async () => {
  const config = JSON.parse(readFileSync(resolve(REPO, '.mcp.json'), 'utf8')) as {
    mcpServers: { simutown: { command: string; args: string[] } };
  };
  const { command, args } = config.mcpServers.simutown;
  const child = spawn(command === 'node' ? process.execPath : command, [...args, '--root', REPO], { cwd: REPO });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (s: string) => (stderr += s));
  const exited = new Promise<number | null>((done) => child.on('close', done));
  const rpc = client(child);

  const init = await rpc.request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'e2e', version: '0' },
  });
  const info = init.result as { serverInfo: { name: string }; instructions: string; capabilities: Record<string, unknown> };
  expect(info.serverInfo.name).toBe('simutown');
  expect(info.instructions).toContain('read_guide');
  expect(Object.keys(info.capabilities)).toEqual(expect.arrayContaining(['tools', 'resources', 'prompts']));
  rpc.notify('notifications/initialized');

  const list = (await rpc.request('tools/list')).result as { tools: { name: string }[] };
  expect(list.tools.map((t) => t.name)).toEqual(
    expect.arrayContaining(['read_guide', 'describe_town', 'list_townsfolk', 'write_scene', 'scene_info', 'still', 'render']),
  );

  const town = (await rpc.request('tools/call', { name: 'describe_town', arguments: {} })).result as {
    content: { type: string; text?: string }[];
    isError?: boolean;
  };
  expect(town.isError).toBeFalsy();
  expect(town.content[0]?.text).toContain('bakery.door');

  const still = (await rpc.request('tools/call', { name: 'still', arguments: { scene: 'tiny', t: 3, scale: 1 } })).result as {
    content: { type: string; text?: string; data?: string; mimeType?: string }[];
    isError?: boolean;
  };
  expect(still.isError).toBeFalsy();
  const image = still.content.find((c) => c.type === 'image');
  expect(image?.mimeType).toBe('image/png');
  const png = Buffer.from(image?.data ?? '', 'base64');
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([480, 270]);

  const doc = (await rpc.request('resources/read', { uri: 'simutown://docs/authoring' })).result as {
    contents: { uri: string; mimeType: string; text: string }[];
  };
  expect(doc.contents[0]?.mimeType).toBe('text/markdown');
  expect(doc.contents[0]?.text).toMatch(/^# /);

  child.stdin.end();
  expect(await exited).toBe(0);
  // Every stdout line was JSON (the parser above would have thrown); logs went to stderr.
  expect(rpc.lines).toHaveLength(5);
  expect(stderr).toContain('[simutown-mcp]');
});
