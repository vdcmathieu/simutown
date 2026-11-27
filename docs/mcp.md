# Using Simutown from an agent (MCP)

`simutown mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server.
It lets any coding agent that speaks MCP (Claude Code, Claude Desktop, Cursor, Codex and others) look up the town and its people, write scenes, build them, look at stills and render films, all through tools.
The agent does not need a shell, and it gets errors that list the valid names, timelines and pictures back as tool results.

The server speaks MCP over stdio and has no dependencies.
It works in one project folder, its root: scenes go in `<root>/scenes/`, stills and films in `<root>/out/`.

## Connecting it

### Claude Code, in this repository

The [`.mcp.json`](../.mcp.json) at the root of this repository starts the server from the sources:

```json
{
  "mcpServers": {
    "simutown": {
      "command": "node",
      "args": ["--import", "tsx", "src/cli/bin.ts", "mcp"]
    }
  }
}
```

Run `pnpm install` once, start `claude` in the repository root, and approve the `simutown` server when Claude Code asks.
`/mcp` shows it and its tools.
Do not start it with `pnpm simutown mcp`: pnpm prints a banner on stdout, which is the protocol channel (`pnpm --silent simutown mcp` works).

### Claude Code, in a project that installed simutown

```bash
claude mcp add simutown -- npx simutown mcp
```

The project folder is the one with the nearest `package.json` above where the server starts; pass `--root <dir>` to choose another.

`claude mcp add` runs the server in the project, so `npx` finds the project's own install.

### Claude Desktop, Cursor and others

Clients that start servers from a JSON file (Claude Desktop's `claude_desktop_config.json`, Cursor's `.cursor/mcp.json`) take the same shape.
They often start the server outside your project, where `npx simutown` cannot see the project's install and looks for simutown on the npm registry instead.
So run the installed command with `node`, by its absolute path, and give the root as an absolute path too:

```json
{
  "mcpServers": {
    "simutown": {
      "command": "node",
      "args": [
        "/absolute/path/to/your/project/node_modules/simutown/dist/cli/bin.js",
        "mcp",
        "--root",
        "/absolute/path/to/your/project"
      ]
    }
  }
}
```

### Codex

Codex reads servers from `~/.codex/config.toml`, and takes the same absolute paths:

```toml
[mcp_servers.simutown]
command = "node"
args = ["/absolute/path/to/your/project/node_modules/simutown/dist/cli/bin.js", "mcp", "--root", "/absolute/path/to/your/project"]
```

## Tools

| Tool | What it does |
|------|--------------|
| `read_guide` | Returns a guide from `docs/`: `authoring` (start here), `scene-api`, `making-art`, `style` or `mcp` (this page). |
| `describe_town` | The map, props and place names of a built-in town, the names a scene walks to. |
| `list_townsfolk` | The built-in characters: id, name, role and look. |
| `list_scenes` | The scenes in `scenes/` with their titles and lengths, or why one does not build. |
| `read_scene` | The source of a scene file. |
| `new_scene` | Writes a commented starter scene to `scenes/<name>.ts`. |
| `write_scene` | Writes a scene's source, builds it, and returns its timeline or the error. |
| `delete_scene` | Deletes a scene that `new_scene` or `write_scene` created in this session, such as a draft that does not build. |
| `scene_info` | Title, length, town, cast and the timeline of beats of a scene. |
| `still` | Frames of a scene as PNG images, at one time, several, or one per beat (`every_beat`); also saved in `out/`. |
| `render` | The film as MP4, GIF or WebM in `out/`, with progress. Needs ffmpeg. |

A scene argument is a name in `scenes/` (`hello`) or a path to a `.ts` or `.js` file inside the project folder.
Every tool reports a failure as a result with `isError` and a message that says how to fix it.
That includes arguments that do not fit the tool's schema: the model sees a tool result and can fix the call itself, while a JSON-RPC error (-32602) would usually reach only the client.
An unknown tool name is a JSON-RPC error.

## Resources and the prompt

The server also offers read-only resources: the five guides as `simutown://docs/<topic>`, the townsfolk as JSON at `simutown://townsfolk`, and each built-in town as `simutown://towns/<name>`.

It has one prompt, `scene`, with an `idea` and an optional length in `seconds` (default 20).
It expands to the whole authoring loop below, in terms of the tools.
Claude Code shows it as the slash command `/mcp__simutown__scene`.

## The loop an agent should follow

1. `read_guide` with `authoring`, and `scene-api` for the exact calls.
2. Plan four to eight beats of 3 to 8 seconds around one idea.
3. `describe_town` for the places and `list_townsfolk` for the cast; use only the names they list.
4. `write_scene` until it builds; `scene_info` to check the timing.
5. `still` with `every_beat: true`, and look at every image: people in frame, no overlapping bubbles, each caption up while its beat needs it.
6. Fix with `write_scene` and look again until every beat reads.
7. `render`, and report the scene file, the film and its length.

## Stopping

The server stops when the client closes its stdin (how MCP clients end a session), when stdout is closed, or on SIGTERM or SIGINT.
It first cancels the calls still running, so a render stops ffmpeg and removes its partial file, and waits for them.
A second signal stops it at once.

## Limits

- Scene code runs inside the server process with your rights, as it does in the CLI: only connect the server to projects whose scenes you trust.
  The checks that keep scene paths and outputs inside the project guard against mistakes; they are not a sandbox, and they do not follow symlinks.
- A scene that never finishes building (a loop without an end) blocks the server: it cannot answer anything, cancellations included, until the client restarts it.
- Each build re-reads the scene file when it changed, but helper modules a scene imports (`./helpers.ts`) keep their first version until the server restarts.
- `render` needs ffmpeg on the `PATH`; without it the tool says how to install it.
- Scenes import `simutown`, so they build only in a project where the package is installed (or in this repository).
- Under plain Node (the installed package), a `.ts` scene needs Node 22.18 or later and must use only erasable TypeScript, with file extensions in relative imports.
