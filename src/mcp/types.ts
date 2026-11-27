/**
 * The contract between the MCP protocol layer (`server.ts`) and the Simutown tools
 * (`tools.ts`, `resources.ts`). Node only.
 *
 * The server speaks the Model Context Protocol over stdio (newline-delimited JSON-RPC 2.0)
 * with no dependencies. It knows nothing about scenes: it lists and calls whatever
 * `ToolDef`s, `ResourceDef`s and `PromptDef`s a `ServerSpec` hands it.
 *
 * Tools report failure in their result (`isError: true` with a message that says how to
 * fix it), never by throwing: an agent reads the message and tries again. A tool that does
 * throw is turned into such a result by the server.
 */

/** The JSON Schema subset tool inputs use: an object of named, typed properties. */
export interface InputSchema {
  type: 'object';
  properties: Record<string, PropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

/** One property of an input schema. The server checks `type`, `enum`, `items`, `minimum` and `maximum`. */
export interface PropertySchema {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: readonly (string | number)[];
  items?: PropertySchema;
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  default?: unknown;
}

/** A piece of a tool result: text, or a PNG the agent can look at. */
export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: 'image/png' };

/** What a tool returns. */
export interface ToolResult {
  content: ToolContent[];
  /** True when the call failed; `content` then says why and how to fix it. */
  isError?: boolean;
}

/** What a tool call gets besides its arguments. */
export interface ToolContext {
  /** The project folder: `scenes/` and `out/` are in it. Absolute. */
  root: string;
  /** Report progress on a long call (a render). The server forwards it when the client asked for progress. */
  progress?(done: number, total: number, message?: string): void;
  /** Aborted when the client cancels the request. */
  signal?: AbortSignal;
}

/** Hints for the client about what a tool does. All optional. */
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/** A tool the server lists and calls. */
export interface ToolDef {
  /** snake_case, unique. */
  name: string;
  /** What the tool does and when to use it, written for a language model. */
  description: string;
  inputSchema: InputSchema;
  annotations?: ToolAnnotations;
  /** Run the tool. `args` has already been checked against `inputSchema`. */
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}

/** A read-only document the server lists, such as a guide in docs/. */
export interface ResourceDef {
  /** For example `simutown://docs/authoring`. */
  uri: string;
  name: string;
  title?: string;
  description: string;
  mimeType: string;
  read(ctx: ToolContext): Promise<string>;
}

/** An argument of a prompt template. */
export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

/** A prompt template (clients such as Claude Code show these as slash commands). */
export interface PromptDef {
  name: string;
  title?: string;
  description: string;
  arguments: PromptArgument[];
  /** The user message the prompt expands to. Missing required arguments are rejected by the server first. */
  render(args: Record<string, string>, ctx: ToolContext): Promise<string>;
}

/** Everything one MCP server offers. */
export interface ServerSpec {
  name: string;
  version: string;
  /** Sent to the client on initialize: how to use the tools together, in a few lines. */
  instructions: string;
  tools: ToolDef[];
  resources: ResourceDef[];
  prompts: PromptDef[];
}
