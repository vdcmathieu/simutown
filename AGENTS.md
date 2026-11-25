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
   pnpm tsx -e "import { describeTown } from './src'; import { willowSquare } from './src/towns/willow-square'; console.log(describeTown(willowSquare))"
   ```

   Props are not places: to reach the bakery, walk to `bakery.door`. A new setting is a small `defineTown` (see `examples/market.ts`).
3. **Cast** by role from the townsfolk table in `docs/authoring.md` (the baker is `bo`, the children `kofi` and `lin`). The same list is `townsfolk` in `src/art/characters/index.ts`.
4. **Write** `scenes/<kebab-name>.ts`, default-exporting `scene({ title, town, timeOfDay }, (s) => { ... })`. Copy the shape of `scenes/hello.ts` or `examples/haggle.ts`.
5. **Build** with `pnpm simutown info <name>`. Errors list the valid names: fix and rerun.
6. **Look**: `pnpm simutown still <name> -t <seconds> -o out/<name>-<seconds>.png` for each beat, and open every PNG with your image-reading tool. Check that the people who matter are in frame and unhidden, that bubbles and labels do not overlap, and that each caption is up while its beat needs it. Repeat until every beat reads.
7. **Render** with `pnpm simutown render <name>` (MP4 in `out/`; `-o out/<name>.gif` for a GIF), and run `pnpm check`.

Pacing, in short: each call starts when the previous one ends and `s.together` runs calls at once; speech times itself, a caption takes no time (give it `{ hold }` or action after it); walking is 2.5 tiles a second; zoom 1 to set the scene and zoom 2 for dialogue; cut between places, pan within one, and keep the camera still while someone speaks.

A scene is done when it builds, its length is close to what was asked, you have looked at a still of every beat, the film is rendered, and `pnpm check` passes.
Report the scene file, the output path, the duration and the stills you checked.

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
| `src/player/`, `web/` | The browser player (`mount`); the gallery with its Scenes and Atlas views. |
| `src/fixtures/` | A hand-built town and scene for developing modules in isolation. |
| `scenes/` | Scenes: each file default-exports a `Scene`. The CLI finds them by name and the gallery lists them. |
| `examples/` | The runnable samples shown in the docs; `test/docs.test.ts` builds them all. |
| `tools/` | Developer scripts: contact sheets, the style key, previews, the docs check. |
| `docs/` | `authoring.md` (writing scenes), `scene-api.md` (the API), `making-art.md` (the kits), `STYLE.md` (art direction). |

When several agents work at once, each one edits only the paths it was given.
`src/core/`, `src/art/index.ts`, `src/index.ts`, `src/fixtures/` and `test/art-contract.test.ts` belong to the integrator.
If a contract is wrong or missing something, say so in your final report instead of changing it.

## Rules

1. **No runtime dependencies.** The engine is plain TypeScript. Dev tools (vitest, tsx, vite) are fine.
2. **Browser-safe core.** Nothing under `src/` may import `node:*`, except `src/node/` and `src/cli/`.
3. **Deterministic.** No `Math.random()`, `Date.now()` or `performance.now()` in anything that decides what a frame looks like. Use a seeded generator. The same scene and time must always give the same pixels.
4. **Whole pixels.** No sub-pixel positions, no smoothing, no anti-aliasing. Scaling is integer nearest-neighbour.
5. **Palette slots only.** Art names slots (`steel.2`), never hex colours. Soft effects use dithering or flat alpha, in palette colours.
6. **Clear errors.** A scene author is often a language model. When a script names an unknown place, character or prop, throw an error that lists the valid names.
7. **Simple over clever.** Small files, plain functions, doc comments on every export. If something can be done more simply, do that.

## Commands

```bash
pnpm install                           # once per checkout or worktree
pnpm check                             # typecheck + tests; must pass before every commit
pnpm simutown --help                   # the CLI: render, still, list, info
pnpm simutown info <scene>             # build a scene: duration, places, cast, or the error
pnpm simutown still <scene> -t 4       # one frame as a PNG -> out/<scene>-4s.png
pnpm simutown render <scene>           # the film -> out/<scene>.mp4 (needs ffmpeg); -o x.gif for a GIF
pnpm simutown list                     # the scenes in scenes/
pnpm dev                               # the gallery: scenes and the art Atlas, at http://localhost:5173
pnpm build:web                         # the gallery as a static site -> dist/web (embed with ?embed=<scene>)
pnpm sheet <group>                     # contact sheet PNG of built-in art -> out/sheets/<group>.png
pnpm still 4                           # one frame of the fixture scene -> out/still.png
pnpm tsx tools/stylekey.ts             # regenerate the style pictures in docs/style/
pnpm tsx tools/docs-check.ts           # check that the docs match examples/ and their links resolve
```

`<scene>` is a name in `scenes/` (`hello`) or a path to a `.ts` file (`examples/haggle.ts`).
`pnpm sheet` groups: `terrain`, `nature`, `street`, `buildings`, `characters`, `ui`, `all`.
Add `--only <text>` to filter and `--scale <n>` to zoom.
The gallery picks up edits to a scene at once; restart `pnpm dev` after adding a new file to `scenes/`.

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
