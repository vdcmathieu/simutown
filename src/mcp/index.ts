/**
 * The Simutown MCP server: the spec (tools, resources, the "scene" prompt) and the stdio
 * entry `simutown mcp` runs. Node only.
 *
 * Any MCP client (Claude Code, Claude Desktop, Cursor, Codex) can then list the town and
 * its people, write scenes, build them, look at stills and render films. See docs/mcp.md.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { simutownPrompts, simutownResources } from './resources';
import { serveStdio } from './server';
import { packageRoot, simutownTools } from './tools';
import type { ServerSpec } from './types';

/** How the tools fit together, sent to the client on initialize. */
export const INSTRUCTIONS = `Simutown turns a short TypeScript scene script into a deterministic pixel-town film. Nothing in the town is smart: the scene decides everything.
To make a scene: read_guide first (topic "authoring"; "scene-api" for the exact calls), or use the "scene" prompt, which spells out the whole loop.
Look up names before using them: describe_town for the places (walk to "bakery.door", not "bakery") and list_townsfolk for the cast ids.
Write with write_scene { name, source }: it builds the scene and returns its timeline, or an error that lists the valid names. Fix and call again until it builds.
Then still { scene, every_beat: true } and look at every image: people in frame, no overlapping bubbles, each caption up while its beat needs it.
When every beat reads, render { scene } writes the film to out/ (MP4; format "gif" for a GIF).`;

/** The version in the simutown package.json. */
function packageVersion(): string {
  try {
    return (JSON.parse(readFileSync(join(packageRoot(), 'package.json'), 'utf8')) as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Everything the Simutown MCP server offers. */
export function simutownServerSpec(): ServerSpec {
  return {
    name: 'simutown',
    version: packageVersion(),
    instructions: INSTRUCTIONS,
    tools: simutownTools(),
    resources: simutownResources(),
    prompts: simutownPrompts(),
  };
}

/** Options of `startMcpServer`. */
export interface StartOptions {
  /** The project folder, absolute: where `scenes/` and `out/` are. */
  root: string;
}

/**
 * Serve the Simutown MCP server over stdin and stdout until stdin ends or the process gets
 * SIGTERM or SIGINT. Either way the calls still running are aborted and awaited first, so
 * a render removes its partial file. A second signal exits at once. stdout carries only
 * protocol messages; logs go to stderr.
 */
export async function startMcpServer(opts: StartOptions): Promise<void> {
  process.stderr.write(`[simutown-mcp] serving ${opts.root} over stdio\n`);
  const stop = new AbortController();
  const onSignal = (signal: NodeJS.Signals): void => {
    if (stop.signal.aborted) process.exit(1);
    process.stderr.write(`[simutown-mcp] ${signal}: stopping the calls still running\n`);
    stop.abort();
  };
  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);
  try {
    await serveStdio(simutownServerSpec(), { root: opts.root, signal: stop.signal });
  } finally {
    process.off('SIGTERM', onSignal);
    process.off('SIGINT', onSignal);
    // stdin may still be open (after a signal): let go of it so the process can exit.
    process.stdin.destroy();
  }
}
