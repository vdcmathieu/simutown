# Working on Simutown

Simutown is a toolkit for scripting small pixel-town scenes that explain ideas.
Think of manim, but for a little town with people in it instead of equations.
It is inspired by the Smallville sandbox of Park et al. (2023), without the language models: nothing here is smart, the scene author decides what happens.
A human or a coding agent writes a short script, and the engine turns it into a deterministic animation that plays in a browser or renders to video.

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
| `src/art/terrain/`, `src/art/nature/` | Ground tiles, trees, bushes, rocks. |
| `src/art/buildings/` | The building kit and its presets. |
| `src/art/characters/` | The character kit and the townsfolk. |
| `src/art/street/`, `src/art/ui/`, `src/ui/` | Street furniture, font, bubbles, emotes, text drawing. |
| `src/world/`, `src/scene/` | Towns, pathfinding, the scripting API and timeline. |
| `src/render/` | The renderer: layers, lighting, shadows, camera. |
| `src/node/`, `src/cli/`, `src/player/`, `web/` | PNG and video export, the CLI, the browser player and gallery. |
| `src/towns/`, `scenes/` | Built-in towns and example scenes. |
| `src/fixtures/` | A hand-built town and scene for developing modules in isolation. |
| `tools/` | Developer scripts (`sheet`, `still`). |
| `docs/` | `STYLE.md` (art direction) and `scene-api.md` (the scripting API). |

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
pnpm install          # once per checkout or worktree
pnpm check            # typecheck + tests; must pass before every commit
pnpm sheet <group>    # contact sheet PNG of built-in art -> out/sheets/<group>.png
pnpm still 4          # one frame of the fixture scene -> out/still.png
```

`pnpm sheet` groups: `terrain`, `nature`, `street`, `buildings`, `characters`, `ui`, `all`.
Add `--only <text>` to filter and `--scale <n>` to zoom.

## Look at what you make

This is a visual project, and tests cannot tell you whether a tree looks like a tree.
After every meaningful change to art or rendering: render a PNG, open it with your image-reading tool, and judge it honestly against `docs/STYLE.md`.
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
