---
name: simutown-scene
description: Write, check and render a Simutown scene from a one-line request such as "a scene where a child asks the baker for bread". Use whenever someone asks for a new scene, film, animation or clip in this repository, or asks to change, fix, re-time or re-render one in scenes/.
---

# Writing a Simutown scene

A scene is one TypeScript file in `scenes/` that default-exports `scene(options, script)`.
The engine turns it into a deterministic film; you decide everything that happens.
Your job: turn the request into a short, clear film, check it by looking at stills, and render it.

## Where things are

- `docs/authoring.md`: the guide, with a worked example, pacing rules, common errors and a checklist. Read it once.
- `docs/scene-api.md`: the reference for every call and its timing.
- The cast: the table in `docs/authoring.md` (section 3), or `townsfolk` in `src/art/characters/index.ts`.
- The built-in town: `willowSquare` (`src/towns/willow-square.ts`), imported from `simutown`.
- `scenes/`: the example scenes to copy from, such as `hello.ts`; `pnpm simutown list` lists them.
- `examples/haggle.ts`: the worked example of the guide, in a town of its own (`examples/market.ts`).

## The loop

1. **Plan the beats** before writing code.
   Write down the one idea the scene shows, then four to eight beats of 3 to 8 seconds each: a title, a set-up, the event one line at a time, the point in a caption, and a fade out.
   Match the requested length: a 15-second scene has room for a title or a fade, three or four lines of dialogue and one caption.
2. **List the places** of the town you will use:

   ```bash
   pnpm tsx -e "import { describeTown, willowSquare } from 'simutown'; console.log(describeTown(willowSquare))"
   ```

   Use the place names it prints: to reach the bakery, walk to `bakery.door`.
   The rooms follow the town: every building with a door but the shed has one, and what is inside is named `<building>:<place>`, such as `bakery:counter.behind` or `red-house:chair-2`.
   If no town has the setting you need, define a small one with `defineTown` (30 x 17 tiles fills the frame); see `examples/market.ts`.
3. **Cast** by role from the townsfolk table: the baker is `bo`, the children are `kofi` and `lin`, and so on.
   Use ids from that table only; an unknown id is an error that lists the valid ones, and the stand-in names in some `docs/scene-api.md` snippets (`ben`, `cy`) are not in the cast.
   Pick the hour too: plain daylight runs from 9 to 16, a golden late afternoon is 17 to 18 (lamps light at 17:30), sunset 19, a blue evening 19.5 to 21, night after 21.5. The table is in `docs/authoring.md` under "Time of day".
4. **Write** `scenes/<kebab-name>.ts`:

   ```ts
   import { scene } from 'simutown';
   import { willowSquare } from 'simutown/towns';

   export default scene({ title: 'My scene', town: willowSquare, timeOfDay: 10 }, (s) => {
     const a = s.actor('ana', { at: 'some.place' });
     s.camera.cut(a, { zoom: 2 });
     s.fadeIn();
     // ... the beats ...
     s.fadeOut();
   });
   ```

   Replace `some.place` with a place from step 2.
   `pnpm simutown new <kebab-name>` writes a commented starter of this shape to begin from.
   Scenes import the library as `simutown` (and the towns as `simutown/towns`); in this repository that name points at `src/`.
5. **Build it**: `pnpm simutown info <name>` prints the duration, places and cast, or the error.
   Errors name the problem and list the valid choices: fix and rerun.
6. **Look at stills**, one per beat, and open each PNG with your image-reading tool:

   ```bash
   pnpm simutown still <name> -t 3 -o out/<name>-3.png
   ```

   To find when each beat starts, run `pnpm simutown info <name> --beats`: it lists every walk, line, caption and camera move with its start time.
   Check that the people who matter are in frame and not behind a roof or a tree, that bubbles and labels do not cover each other, that each caption is up when its beat needs it, and that dialogue is shot at zoom 2.
   Fix the script and look again until every beat reads.
7. **Render**: `pnpm simutown render <name>` writes `out/<name>.mp4` (add `-o out/<name>.gif` for a GIF).
8. **Run `pnpm check`**: it must pass with the new scene in `scenes/`.

## Pacing rules

- Every call starts when the previous one ends; `s.together(() => { ... })` starts its calls at the same moment.
- Speech times itself: a bubble types at 30 characters a second and then holds for at least 1.2 seconds. Dialogue lines can simply follow each other.
- A caption takes no time. Give it `{ hold: seconds }` (about 1 + characters / 15, at least 2) or enough action after it, or the next caption replaces it at once.
- A caption without a `hold` stays up until the next caption or `s.clearCaption()`, through all the dialogue in between: clear the set-up caption before the conversation starts.
- To hit a target length, add or trim an `s.wait(...)` before the final fade and check the duration with `info`.
- Keep a bubble under about 60 characters and a caption under about 80.
- Walking is 2.5 tiles a second: start people near where they are needed.
- Zoom 1 sets the scene; zoom 2 for conversation. Cut to change place or after a fade; pan to move within a place. Do not move the camera while someone speaks.
- Indoors: `actor.enter(building)` and `actor.exit(building)` go through the door (0.3 s); cut 0.15 s into it, with `s.camera.inside(building)` going in and `s.camera.outside()` coming out (back to the street shot from before, at its zoom; `s.camera.outside(target)` for another place, town tile or person outside). A tile in a cut is a tile of the place the camera shows. `scenes/fresh-bread.ts` is the example; "Going inside" in `docs/authoring.md` has the rest.
- Start with `s.title(...)` or `s.fadeIn()`, end with `s.fadeOut()`, and hold 1 to 2 seconds after the key moment.

## Common mistakes

- A prop id as a target: `walkTo('bakery')` fails; use `bakery.door` or another place.
- A room's place from outside, or an outside place from inside: `enter` or `exit` first. Inside a room, a bare name is still an outside name: write `bakery:counter.front`.
- Two captions in a row with nothing between: the first is never seen.
- The same character twice without `id`: `s.actor('kofi', { id: 'kofi-2', at: ... })`.
- A string where an actor handle is expected: pass the value `s.actor()` returned.
- New art (`makeCharacter`, `makeBuilding`) must be registered in the shared `art` registry or the renderer skips it; see `docs/making-art.md`.

## Done means

- The file is in `scenes/`, and `pnpm simutown info <name>` builds it.
- Its length is within a few seconds of what was asked.
- You have looked at a still of every beat and fixed what was wrong.
- The film is rendered to `out/`, and `pnpm check` passes.
- Your reply names the scene file, the output path, the duration, and the stills you looked at.
