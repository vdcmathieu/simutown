/**
 * The MCP protocol layer: newline-delimited JSON-RPC 2.0 over stdio, written by hand
 * (no dependencies). It knows nothing about scenes: it lists and calls whatever tools,
 * resources and prompts a `ServerSpec` hands it. Node only.
 *
 * stdout is the protocol channel. Nothing else may write to it: logs go to stderr, and
 * while `serveStdio` runs, `console.log` and friends are routed to stderr too.
 */

import type { Readable, Writable } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { format } from 'node:util';
import type { InputSchema, PropertySchema, ServerSpec, ToolContext, ToolResult } from './types';

/** The protocol versions this server speaks, newest first. */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'] as const;

/** JSON-RPC error codes the server answers with. */
export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
} as const;

/** A JSON-RPC request id. */
type Id = string | number;

/** A JSON-RPC message the server sends: a response or a notification. */
export type OutgoingMessage = Record<string, unknown>;

/** Options of `createServer`. */
export interface ServerOptions {
  /** The project folder, absolute: tools get it as `ctx.root`. */
  root: string;
  /** Where log lines go. Defaults to stderr. Never stdout. */
  log?: (line: string) => void;
  /** Called with each server-to-client notification (progress). */
  notify?: (message: OutgoingMessage) => void;
}

/** An MCP server, independent of transport. */
export interface McpServer {
  /**
   * Handle one parsed JSON-RPC message. Resolves to the response, or to undefined for a
   * notification, a response from the client, or a request the client cancelled.
   */
  handle(message: unknown): Promise<OutgoingMessage | undefined>;
  /** Abort every call still running (for shutdown). */
  abortAll(): void;
}

/** A protocol error a handler throws, turned into a JSON-RPC error response. */
class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

/** Write one line to stderr. */
function stderrLog(line: string): void {
  process.stderr.write(line.endsWith('\n') ? line : `${line}\n`);
}

/** True for a plain object (not null, not an array). */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A short description of a value and its JSON type, for error messages. */
function describeValue(value: unknown): string {
  let type: string = typeof value;
  if (value === null) type = 'null';
  else if (Array.isArray(value)) type = 'array';
  else if (typeof value === 'number' && Number.isInteger(value)) type = 'integer';
  let shown: string;
  try {
    shown = JSON.stringify(value) ?? String(value);
  } catch {
    shown = String(value);
  }
  if (shown.length > 60) shown = `${shown.slice(0, 57)}...`;
  return `${shown} (${type})`;
}

/** True when `value` has the JSON Schema `type`. */
function hasType(value: unknown, type: PropertySchema['type']): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return isObject(value);
  }
}

/** Check one value against a property schema. Returns an error message, or undefined when it fits. */
function checkProperty(path: string, value: unknown, schema: PropertySchema): string | undefined {
  if (!hasType(value, schema.type)) {
    const article = /^[aeiou]/.test(schema.type) ? 'an' : 'a';
    return `Argument "${path}" must be ${article} ${schema.type}, got ${describeValue(value)}.`;
  }
  if (schema.enum && !schema.enum.includes(value as string | number)) {
    const valid = schema.enum.map((v) => JSON.stringify(v)).join(', ');
    return `Argument "${path}" must be one of ${valid}, got ${describeValue(value)}.`;
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      return `Argument "${path}" must be at least ${schema.minimum}, got ${value}.`;
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      return `Argument "${path}" must be at most ${schema.maximum}, got ${value}.`;
    }
  }
  if (Array.isArray(value)) {
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      return `Argument "${path}" may have at most ${schema.maxItems} items, got ${value.length}.`;
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const problem = checkProperty(`${path}[${i}]`, value[i], schema.items);
        if (problem) return problem;
      }
    }
  }
  return undefined;
}

/**
 * Check tool arguments against an input schema and fill in defaults.
 * Returns the arguments to run with, or an error message naming the argument, what was
 * expected and what was given.
 */
export function checkArguments(
  schema: InputSchema,
  args: unknown,
): { ok: true; args: Record<string, unknown> } | { ok: false; error: string } {
  if (args === undefined || args === null) args = {};
  if (!isObject(args)) {
    return { ok: false, error: `Arguments must be an object, got ${describeValue(args)}.` };
  }
  const names = Object.keys(schema.properties);
  const validNames = names.length ? names.join(', ') : '(none)';
  for (const name of schema.required ?? []) {
    if (args[name] === undefined) {
      const prop = schema.properties[name];
      const what = prop ? ` (${prop.type}${prop.description ? `: ${prop.description}` : ''})` : '';
      return { ok: false, error: `Missing required argument "${name}"${what}.` };
    }
  }
  const out: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(args)) {
    const prop = schema.properties[name];
    if (!prop) {
      if (schema.additionalProperties === false) {
        return { ok: false, error: `Unknown argument "${name}". Valid arguments: ${validNames}.` };
      }
      out[name] = value;
      continue;
    }
    if (value === undefined) continue;
    const problem = checkProperty(name, value, prop);
    if (problem) return { ok: false, error: problem };
    out[name] = value;
  }
  for (const [name, prop] of Object.entries(schema.properties)) {
    if (out[name] === undefined && prop.default !== undefined) out[name] = structuredClone(prop.default);
  }
  return { ok: true, args: out };
}

/** A tool result that reports an error to the agent. */
function errorResult(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

/** The message of anything thrown. */
function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Pick the protocol version to answer `initialize` with. */
function negotiateVersion(requested: unknown): string {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly unknown[]).includes(requested)
    ? (requested as string)
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

/** The `params` of a request as an object, or an InvalidParams error. */
function paramsOf(message: Record<string, unknown>): Record<string, unknown> {
  const params = message.params;
  if (params === undefined) return {};
  if (!isObject(params)) throw new RpcError(ErrorCode.InvalidParams, 'params must be an object.');
  return params;
}

/** Create an MCP server for a spec. Feed it parsed messages with `handle`. */
export function createServer(spec: ServerSpec, opts: ServerOptions): McpServer {
  const log = opts.log ?? stderrLog;
  const notify = opts.notify ?? (() => {});
  const running = new Map<Id, AbortController>();
  /** Ids of calls the client cancelled: they get no response. */
  const cancelled = new Set<Id>();
  const tools = new Map(spec.tools.map((t) => [t.name, t]));
  const resources = new Map(spec.resources.map((r) => [r.uri, r]));
  const prompts = new Map(spec.prompts.map((p) => [p.name, p]));
  const baseCtx = (): ToolContext => ({ root: opts.root });

  /** Run `tools/call`. */
  async function callTool(id: Id, params: Record<string, unknown>): Promise<ToolResult> {
    const name = params.name;
    const tool = typeof name === 'string' ? tools.get(name) : undefined;
    if (!tool) {
      const valid = [...tools.keys()].join(', ') || '(none)';
      throw new RpcError(ErrorCode.InvalidParams, `Unknown tool ${JSON.stringify(name)}. Valid tools: ${valid}.`);
    }
    const checked = checkArguments(tool.inputSchema, params.arguments);
    if (!checked.ok) return errorResult(`${checked.error} Fix the arguments of ${tool.name} and call it again.`);

    const meta = isObject(params._meta) ? params._meta : {};
    const token = meta.progressToken;
    const hasToken = typeof token === 'string' || typeof token === 'number';
    const controller = new AbortController();
    running.set(id, controller);
    const ctx: ToolContext = {
      root: opts.root,
      signal: controller.signal,
      progress(done, total, message) {
        if (!hasToken || controller.signal.aborted) return;
        const p: Record<string, unknown> = { progressToken: token, progress: done, total };
        if (message !== undefined) p.message = message;
        notify({ jsonrpc: '2.0', method: 'notifications/progress', params: p });
      },
    };
    try {
      const result = await tool.run(checked.args, ctx);
      if (!isObject(result) || !Array.isArray(result.content)) {
        return errorResult(`Tool ${tool.name} returned no content.`);
      }
      return result;
    } catch (err) {
      log(`[simutown-mcp] tool ${tool.name} threw: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
      return errorResult(messageOf(err));
    } finally {
      running.delete(id);
    }
  }

  /** Answer one request; throws RpcError for protocol errors. */
  async function dispatch(id: Id, method: string, message: Record<string, unknown>): Promise<unknown> {
    const params = paramsOf(message);
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: negotiateVersion(params.protocolVersion),
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: spec.name, version: spec.version },
          instructions: spec.instructions,
        };
      case 'ping':
        return {};
      case 'tools/list':
        return {
          tools: spec.tools.map((t) => ({
            name: t.name,
            ...(t.annotations?.title ? { title: t.annotations.title } : {}),
            description: t.description,
            inputSchema: t.inputSchema,
            ...(t.annotations ? { annotations: t.annotations } : {}),
          })),
        };
      case 'tools/call':
        return callTool(id, params);
      case 'resources/list':
        return {
          resources: spec.resources.map((r) => ({
            uri: r.uri,
            name: r.name,
            ...(r.title ? { title: r.title } : {}),
            description: r.description,
            mimeType: r.mimeType,
          })),
        };
      case 'resources/templates/list':
        return { resourceTemplates: [] };
      case 'resources/read': {
        const resource = typeof params.uri === 'string' ? resources.get(params.uri) : undefined;
        if (!resource) {
          const valid = [...resources.keys()].join(', ') || '(none)';
          throw new RpcError(ErrorCode.InvalidParams, `Unknown resource ${JSON.stringify(params.uri)}. Valid uris: ${valid}.`);
        }
        const text = await resource.read(baseCtx());
        return { contents: [{ uri: resource.uri, mimeType: resource.mimeType, text }] };
      }
      case 'prompts/list':
        return {
          prompts: spec.prompts.map((p) => ({
            name: p.name,
            ...(p.title ? { title: p.title } : {}),
            description: p.description,
            arguments: p.arguments,
          })),
        };
      case 'prompts/get': {
        const prompt = typeof params.name === 'string' ? prompts.get(params.name) : undefined;
        if (!prompt) {
          const valid = [...prompts.keys()].join(', ') || '(none)';
          throw new RpcError(ErrorCode.InvalidParams, `Unknown prompt ${JSON.stringify(params.name)}. Valid prompts: ${valid}.`);
        }
        const given = params.arguments === undefined ? {} : params.arguments;
        if (!isObject(given)) throw new RpcError(ErrorCode.InvalidParams, 'Prompt arguments must be an object of strings.');
        const args: Record<string, string> = {};
        for (const [k, v] of Object.entries(given)) {
          if (typeof v !== 'string') {
            throw new RpcError(ErrorCode.InvalidParams, `Prompt argument "${k}" must be a string, got ${describeValue(v)}.`);
          }
          args[k] = v;
        }
        const missing = prompt.arguments.filter((a) => a.required && !args[a.name]).map((a) => a.name);
        if (missing.length) {
          throw new RpcError(
            ErrorCode.InvalidParams,
            `Prompt ${prompt.name} is missing required argument${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`,
          );
        }
        const text = await prompt.render(args, baseCtx());
        return { description: prompt.description, messages: [{ role: 'user', content: { type: 'text', text } }] };
      }
      default:
        throw new RpcError(ErrorCode.MethodNotFound, `Unknown method ${JSON.stringify(method)}.`);
    }
  }

  /** Act on a notification from the client. */
  function onNotification(method: string, message: Record<string, unknown>): void {
    if (method === 'notifications/cancelled') {
      const params = isObject(message.params) ? message.params : {};
      const requestId = params.requestId;
      if (typeof requestId === 'string' || typeof requestId === 'number') {
        const controller = running.get(requestId);
        if (controller) {
          cancelled.add(requestId);
          controller.abort(typeof params.reason === 'string' ? params.reason : 'Cancelled by the client');
        }
      }
    }
    // notifications/initialized and anything else need no action.
  }

  /** An error response. */
  const errorResponse = (id: Id | null, code: number, msg: string): OutgoingMessage => ({
    jsonrpc: '2.0',
    id,
    error: { code, message: msg },
  });

  return {
    async handle(message) {
      if (!isObject(message)) {
        return errorResponse(null, ErrorCode.InvalidRequest, Array.isArray(message) ? 'Batches are not supported.' : 'A message must be a JSON object.');
      }
      const rawId = message.id;
      const idOk = typeof rawId === 'string' || (typeof rawId === 'number' && Number.isFinite(rawId));
      const id: Id | null = idOk ? (rawId as Id) : null;
      if (message.jsonrpc !== '2.0') {
        return errorResponse(id, ErrorCode.InvalidRequest, 'jsonrpc must be "2.0".');
      }
      if (message.method === undefined && ('result' in message || 'error' in message)) {
        return undefined; // a response from the client: the server sends no requests, so ignore it
      }
      if (typeof message.method !== 'string') {
        return errorResponse(id, ErrorCode.InvalidRequest, 'method must be a string.');
      }
      if (!('id' in message)) {
        onNotification(message.method, message);
        return undefined;
      }
      if (!idOk) return errorResponse(null, ErrorCode.InvalidRequest, 'id must be a string or a number.');
      try {
        const result = await dispatch(id as Id, message.method, message);
        if (cancelled.delete(id as Id)) return undefined;
        return { jsonrpc: '2.0', id, result };
      } catch (err) {
        if (err instanceof RpcError) return errorResponse(id, err.code, err.message);
        log(`[simutown-mcp] ${message.method} failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
        return errorResponse(id, ErrorCode.InternalError, messageOf(err));
      }
    },
    abortAll() {
      for (const c of running.values()) c.abort('The server is shutting down');
    },
  };
}

/** Options of `serveStdio`. */
export interface StdioOptions {
  /** The project folder, absolute: tools get it as `ctx.root`. */
  root: string;
  /** Where messages come from. Defaults to process.stdin. */
  input?: Readable;
  /** Where responses and notifications go. Defaults to process.stdout. */
  output?: Writable;
  /** Where log lines go. Defaults to stderr. */
  log?: (line: string) => void;
}

/** The console methods that would write to stdout, routed to stderr while the server runs. */
const CONSOLE_METHODS = ['log', 'info', 'debug', 'warn'] as const;

/**
 * Serve a spec over stdio: one JSON-RPC message per line in, one per line out.
 * Requests run concurrently, so responses may go out of order. Resolves when the input
 * ends and the calls still running have finished. While it runs, console.log, info,
 * debug and warn write to stderr, so that nothing but the protocol reaches stdout.
 */
export async function serveStdio(spec: ServerSpec, opts: StdioOptions): Promise<void> {
  const input = opts.input ?? process.stdin;
  const output = opts.output ?? process.stdout;
  const log = opts.log ?? stderrLog;
  const send = (message: OutgoingMessage): void => {
    output.write(`${JSON.stringify(message)}\n`);
  };
  const server = createServer(spec, { root: opts.root, log, notify: send });

  const saved = CONSOLE_METHODS.map((m) => console[m]);
  for (const m of CONSOLE_METHODS) console[m] = (...args: unknown[]) => stderrLog(format(...args));

  const inFlight = new Set<Promise<void>>();
  const onLine = (line: string): void => {
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line.trim()) return;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch (err) {
      log(`[simutown-mcp] unparseable line: ${messageOf(err)}`);
      send({ jsonrpc: '2.0', id: null, error: { code: ErrorCode.ParseError, message: `Parse error: ${messageOf(err)}` } });
      return;
    }
    const job = server
      .handle(message)
      .then((response) => {
        if (response) send(response);
      })
      .catch((err) => log(`[simutown-mcp] ${messageOf(err)}`))
      .finally(() => inFlight.delete(job));
    inFlight.add(job);
  };

  try {
    await new Promise<void>((resolve, reject) => {
      const decoder = new StringDecoder('utf8');
      let buffer = '';
      input.on('data', (chunk: Buffer | string) => {
        buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
        let newline = buffer.indexOf('\n');
        while (newline >= 0) {
          onLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf('\n');
        }
      });
      input.once('end', () => {
        buffer += decoder.end();
        if (buffer) onLine(buffer);
        resolve();
      });
      input.once('error', reject);
    });
    while (inFlight.size) await Promise.all(inFlight);
  } finally {
    CONSOLE_METHODS.forEach((m, i) => {
      console[m] = saved[i]!;
    });
  }
}
