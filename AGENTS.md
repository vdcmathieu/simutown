# Working on Simutown

Simutown is a toolkit for scripting small pixel-town scenes that explain ideas.
Think of manim, but for a little town with people in it instead of equations.
It is inspired by the Smallville sandbox of Park et al. (2023), without the language models: nothing here is smart, the scene author decides what happens.
A human or a coding agent writes a short script, and the engine turns it into a deterministic animation that plays in a browser or renders to video.

Most requests are for a new scene.
Read the next section for those; the rest of this file is for changing the engine and the art.

## Writing a scene

When asked for a scene ("a 20-second scene in which ..."), follow this loop.
The full guide is [`docs/authoring.md`](docs/authoring.md); the reference for every call is [`docs/scene-api.md`](docs/scene-api.md).
Claude Code has the same steps as a skill, in `.claude/skills/simutown-scene/SKILL.md`.

1. **Plan the beats.** Write down the one idea the scene shows, then four to eight beats of 3 to 8 seconds: a title or fade in, a set-up, the event one line at a time, the point in a caption, a fade out. Fit the length that was asked for.
2. **List the places** of the town with `describeTown`, and use the names it prints as targets:

   ```bash
   pnpm tsx -e "import { describeTown, willowSquare } from 'simutown'; console.log(describeTown(willowSquare))"
   ```

   Props are not places: to reach the bakery, walk to `bakery.door`. A new setting is a small `defineTown` (see `examples/market.ts`).
   Every Willow Square building with a door but the shed has a room, listed after the town: name what is inside as `bakery:counter.behind`, go in with `actor.enter('bakery')` and out with `actor.exit('bakery')`, show the room with `s.camera.inside('bakery')` and the street again with `s.camera.outside()`. See "Going inside" in `docs/authoring.md`.
3. **Cast** by role from the townsfolk table in `docs/authoring.md` (the baker is `bo`, the children `kofi` and `lin`). The same list is `townsfolk` in `src/art/characters/index.ts`. Use only those ids: `ben` and `cy` in some `docs/scene-api.md` snippets are stand-ins.
4. **Pick the hour.** Plain daylight runs from 9 to 16; a golden late afternoon is 17 to 18 (lamps light at 17:30); sunset 19; a blue evening 19.5 to 21; night after 21.5. See "Time of day" in `docs/authoring.md`.
5. **Write** `scenes/<kebab-name>.ts`, default-exporting `scene({ title, town, timeOfDay }, (s) => { ... })`. `pnpm simutown new <kebab-name>` writes a commented starter; or copy the shape of a scene in `scenes/` (`pnpm simutown list`) or of `examples/haggle.ts`. Import the library as `simutown` and the town from `simutown/towns`.
6. **Build** with `pnpm simutown info <name>`. Errors list the valid names: fix and rerun. `pnpm simutown info <name> --beats` lists when each walk, line, caption and camera move starts.
7. **Look**: `pnpm simutown still <name> -t <seconds> -o out/<name>-<seconds>.png` for each beat, and open every PNG with your image-reading tool. Check that the people who matter are in frame and unhidden, that bubbles and labels do not overlap, and that each caption is up while its beat needs it. Repeat until every beat reads.
8. **Render** with `pnpm simutown render <name>` (MP4 in `out/`; `-o out/<name>.gif` for a GIF), and run `pnpm check`.

Pacing, in short: each call starts when the previous one ends and `s.together` runs calls at once; speech times itself; a caption takes no time (give it `{ hold }` or action after it) and, without a `hold`, stays up until the next caption or `s.clearCaption()`; walking is 2.5 tiles a second; zoom 1 to set the scene and zoom 2 for dialogue; cut between places, pan within one, and keep the camera still while someone speaks.
Indoors: cut when someone goes through a door (0.15 s into their `enter` or `exit`), shoot the room at zoom 2, and keep a customer a step back from a counter so their bubble does not cover the face behind it.
To hit a target length, adjust an `s.wait(...)` before the final fade.

A scene is done when it builds, its length is close to what was asked, you have looked at a still of every beat, the film is rendered, and `pnpm check` passes.
Report the scene file, the output path, the duration and the stills you checked.
Commit the scene if you are working on a branch of your own; in someone else's checkout or a scratch copy, leave committing to them.

## The pipeline

```
art (sprites as text)  ->  world (a Town)  ->  scene (FrameState at time t)  ->  render (pixels)
```

- A **sprite** is a text grid of palette slots. See `src/core/sprite.ts`.
- A **Town** is a static map: terrain tiles, placed props, named places, collision.
- A **Scene** is a pure function from time to `FrameState`: where everyone is, what they say, where the camera looks.
- A **Renderer** turns a `FrameState` into pixels on a `Surface`, a plain RGBA buffer with no DOM.

All shared types live in `src/core/types.ts`.
That file is the contract between modules: read it before writing anything.
Changes to it are additive only (new optional fields), and only the integrator makes them.

## Layout and ownership

| Path | What |
|------|------|
| `src/core/` | Palette, sprite format, Surface, shared types. Frozen. |
| `src/art/terrain/`, `src/art/nature/` | Ground tiles and their edges; trees, bushes, hedges, rocks, flowers, water plants. |
| `src/art/buildings/` | The building kit (`makeBuilding`) and its presets. |
| `src/art/characters/` | The character kit (`makeCharacter`) and the townsfolk. |
| `src/art/street/`, `src/art/ui/`, `src/ui/` | Street furniture and fences; the font, bubbles and emotes; text drawing. |
| `src/world/` | `defineTown`, `describeTown`, places, collision, pathfinding, a seeded random generator. |
| `src/scene/` | The scripting API (`scene`) and its timeline. |
| `src/render/` | The renderer: ground, shadows, sprites, time-of-day grade and lamps, overlays, camera. |
| `src/towns/` | Built-in towns, such as `willow-square.ts`. |
| `src/node/`, `src/cli/` | PNG and video export; the `simutown` command. |
| `src/mcp/` | The MCP server (`simutown mcp`): the stdio protocol, the tools, resources and the `scene` prompt. See `docs/mcp.md`. |
| `src/player/`, `web/` | The browser player (`mount`); the gallery with its Scenes and Atlas views. |
| `src/fixtures/` | A hand-built town and scene for developing modules in isolation. |
| `scenes/` | Scenes: each file default-exports a `Scene`. The CLI finds them by name and the gallery lists them. |
| `examples/` | The runnable samples shown in the docs; `test/docs.test.ts` builds them all. |
| `tools/` | Developer scripts: contact sheets, the style key, previews, the docs check, the package build and its test. |
| `docs/` | `authoring.md` (writing scenes), `scene-api.md` (the API), `making-art.md` (the kits), `STYLE.md` (art direction), `mcp.md` (the MCP server). |
| `dist/` | Built, not committed: the package (`pnpm build`) and the gallery site (`dist/web`). |

The package has four entries, set in `exports` of `package.json` and built by `tools/build.ts`: `simutown` (`src/index.ts`, browser-safe), `simutown/towns`, `simutown/player` and `simutown/node` (Node only).
Scenes and examples import the library by those names, as a project that installed it would; `tsconfig.json` and `vite.config.ts` point the names at `src/`.
Code in `src/`, `web/`, `tools/` and `test/` uses relative imports.

When several agents work at once, each one edits only the paths it was given.
`src/core/`, `src/art/index.ts`, `src/index.ts`, `src/fixtures/` and `test/art-contract.test.ts` belong to the integrator.
If a contract is wrong or missing something, say so in your final report instead of changing it.

## Rules

1. **No runtime dependencies.** The engine is plain TypeScript. Dev tools (vitest, tsx, vite, esbuild) are fine.
2. **Browser-safe core.** Nothing under `src/` may import `node:*`, except `src/node/`, `src/cli/` and `src/mcp/`.
3. **Deterministic.** No `Math.random()`, `Date.now()` or `performance.now()` in anything that decides what a frame looks like. Use a seeded generator. The same scene and time must always give the same pixels.
4. **Whole pixels.** No sub-pixel positions, no smoothing, no anti-aliasing. Scaling is integer nearest-neighbour.
5. **Palette slots only.** Art names slots (`steel.2`), never hex colours. Soft effects use dithering or flat alpha, in palette colours.
6. **Clear errors.** A scene author is often a language model. When a script names an unknown place, character or prop, throw an error that lists the valid names.
7. **Simple over clever.** Small files, plain functions, doc comments on every export. If something can be done more simply, do that.

## Commands

```bash
pnpm install                           # once per checkout or worktree (also builds the package)
pnpm check                             # typecheck + tests; must pass before every commit
pnpm simutown --help                   # the CLI: render, still, info, new, list
pnpm simutown new <name>               # a commented starter scene -> scenes/<name>.ts
pnpm simutown info <scene>             # build a scene: duration, places, cast, or the error
pnpm simutown info <scene> --beats     # and when each walk, line, caption and camera move starts
pnpm simutown still <scene> -t 4       # one frame as a PNG -> out/<scene>-4s.png
pnpm simutown render <scene>           # the film -> out/<scene>.mp4 (needs ffmpeg); -o x.gif for a GIF
pnpm simutown list                     # the scenes in scenes/
pnpm simutown mcp                      # the MCP server over stdio, for agents (docs/mcp.md; .mcp.json starts it)
pnpm dev                               # the gallery: scenes and the art Atlas, at http://localhost:5173
pnpm build:web                         # the gallery as a static site -> dist/web (embed with ?embed=<scene>)
pnpm build                             # the package: bundles and types -> dist/ (tools/build.ts)
pnpm test:package                      # pack it, install it in a new project, render there (needs ffmpeg)
pnpm sheet <group>                     # contact sheet PNG of built-in art -> out/sheets/<group>.png
pnpm still 4                           # one frame of the fixture scene -> out/still.png
pnpm tsx tools/stylekey.ts             # regenerate the style pictures in docs/style/
pnpm tsx tools/docs-check.ts           # check that the docs match examples/ and their links resolve
```

`<scene>` is a name in `scenes/` (`hello`) or a path to a `.ts` or `.js` file (`examples/haggle.ts`).
`pnpm sheet` groups: `terrain`, `nature`, `street`, `buildings`, `characters`, `ui`, `all`.
Add `--only <text>` to filter and `--scale <n>` to zoom.
The gallery picks up edits to a scene, and new files in `scenes/`, at once.

## Look at what you make

This is a visual project, and tests cannot tell you whether a tree looks like a tree.
After every meaningful change to art, rendering or a scene: render a PNG, open it with your image-reading tool, and judge it honestly against `docs/STYLE.md`.
Expect to redraw things several times.
A sprite you have not looked at is not done.

## Working in a fleet

- Run `git status && git log --oneline -5` first: you may be resuming earlier work. Resume it, do not restart.
- Commit early and often, on your own branch, with short messages. Uncommitted work is lost if you are interrupted.
- Never run `git reset --hard`, `git checkout .`, `git clean`, `git stash` or `rm -rf` on anything you did not create in this session.
- Keep reasoning bursts short: act, observe, act. Run any command that may take over two minutes in the background and poll it.
- Do not add yourself as co-author in commit messages.
- Finish with a short report: what you built, how you verified it, what you would change in the contracts, and what is left.

## Writing style

Use "-" instead of the em dash in code, commits and docs.
In long Markdown files, write one sentence per line.
