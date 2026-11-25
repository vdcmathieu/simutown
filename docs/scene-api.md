# The scripting API

This page is the reference for scene authors and for whoever maintains `src/world` and `src/scene`.
If the code and the page disagree, fix one of them.

## A scene

```ts
import { scene } from '../src';
import { willowSquare } from '../src/towns/willow-square';

export default scene({ title: 'Word of mouth', town: willowSquare, timeOfDay: 10 }, (s) => {
  const ana = s.actor('ana', { at: 'cafe.door' });
  const ben = s.actor('ben', { at: 'fountain.south', facing: 'left' });

  s.title('Word of mouth', 'How news travels in a small town');
  s.camera.cut(ana, { zoom: 2 });
  s.caption('Ana has news.');

  ana.walkTo(ben);                        // pathfinds, stops next to Ben, facing him
  ana.say('Party at the cafe on Friday!');
  s.together(() => {                      // everything in here starts at the same moment
    ben.emote('surprise');
    s.link(ana, ben);                     // a dotted line: information passing
    s.camera.pan('plaza', { duration: 2, zoom: 1 });
  });
  s.label(ben, 'knows');
  s.wait(1);
  s.fadeOut();
});
```

A script reads top to bottom like a screenplay.
Every call takes some time and moves the clock forward by that much, so calls run one after another.
`s.together(fn)` starts every call inside it at the same moment and ends when the longest one ends.
`s.sequence(fn)` groups calls back into a chain, for use inside `together`.
`s.now` is the script clock, in seconds.

The script runs once, when the scene is built.
It produces a timeline, and `scene.frame(t)` reads that timeline: any frame can be computed directly, in any order.
`t` outside `[0, duration]` is clamped.
There is no randomness and no hidden state, so the same script always gives the same film.

`scene(opts, script)` takes `title`, `town`, and optionally `timeOfDay` (default 12, noon), `seed` (default 1, for wandering) and `art` (default: the built-in registry).

## Scene builder

| Call | Effect | Default duration |
|------|--------|------------------|
| `s.actor(character, { at, facing?, id?, hidden? })` | Put a townsperson on the map. Returns an actor handle. `id` defaults to the character and is required for a second copy. | 0 |
| `s.wait(seconds)` | Let time pass. | given |
| `s.together(fn)` / `s.sequence(fn)` | Parallel and sequential groups. | longest / sum |
| `s.title(text, subtitle?, { hold? })` | Full-frame title card: 0.5 s fade in, `hold` (1.5 s), 0.5 s fade out. | 2.5 s |
| `s.caption(text, { hold? })` | Narration line at the bottom. Stays until replaced or cleared, or for `hold` seconds. | 0, or `hold` |
| `s.clearCaption()` | Remove the caption (it fades out). | 0 |
| `s.camera.cut(target, { zoom? })` | Jump the camera. On an actor, it frames where they are at that moment. | 0 |
| `s.camera.pan(target, { duration?, zoom? })` | Glide with ease-in-out. A zoom change happens halfway. | 1.5 s |
| `s.camera.follow(actor \| null)` | Keep an actor centred until the next camera call; `null` stops where it is. | 0 |
| `s.timeOfDay(hour, { duration? })` | Set or animate the hour (0-24). | 0 |
| `s.label(target, text)` / `s.unlabel(target)` | Tag above an actor, or at a place or tile. | 0 |
| `s.link(a, b, { hold?, slot? })` | Dotted line that grows from a to b (0.6 s), holds (0.9 s), then goes. | 1.5 s |
| `s.ring(actor, { hold?, slot? })` | Highlight ring under an actor: grows (0.4 s), holds (0.6 s). | 1 s |
| `s.focus(actors, { duration? })` / `s.unfocus({ duration? })` | Dim everything except these actors. | 0.4 s |
| `s.fadeIn(seconds?)` / `s.fadeOut(seconds?)` | Fade from or to ink. | 0.6 s |
| `s.wander(actor, { around, radius?, seed?, speed? })` | Background life: the actor strolls within `radius` tiles (3) of a place until its next instruction. | 0 |

A `target` or `at` is a place name (`'cafe.door'`), a tile `[tx, ty]`, or an actor handle.
For `at`, `walkTo` and `teleport`, an actor handle means a free tile next to that actor.

The camera zoom is a whole number from 1 to 16: 1 shows a 480 x 270 pixel view, 2 shows half that.
The view never leaves the town, down to the last pixel the renderer draws: near an edge it stops, and a town smaller than the view is centred.

## Actor handle

| Call | Effect | Default duration |
|------|--------|------------------|
| `a.walkTo(target, { speed? })` | Walk there along the shortest path that avoids solid tiles. | path length / speed |
| `a.face(dir \| actor)` | Turn. | 0 |
| `a.say(text, { hold?, gesture? })` | Speech bubble with typewriter reveal, held long enough to read. A standing speaker plays the `talk` pose while the text types out; `gesture: false` turns that off. | from text length |
| `a.think(text, { hold?, gesture? })` / `a.shout(text, { hold?, gesture? })` | Same, different bubble. | from text length |
| `a.emote(name, { hold? })` | Icon above the head. | 1.2 s |
| `a.pose(name, { hold? })` | Play any of the character's poses (the townsfolk have `sit`, `wave`, `talk`, `carry`), then return to idle. | 1 s |
| `a.sitOn(prop, seat?, { hold?, speed? })` | Walk to a seat of a prop (default: its first), slide onto it and sit until the next move or pose. | walk + 0.3 s + `hold` |
| `a.enter(prop, { speed? })` | Walk to the prop's `door` place, face up, fade out, and leave the map. | walk + 0.3 s |
| `a.exit(prop)` | Appear at the prop's `door` place facing down and fade in. | 0.3 s |
| `a.hide()` / `a.show()` | Remove from or return to the map. | 0 |
| `a.teleport(target)` | Move instantly. | 0 |

Walking speed defaults to 2.5 tiles per second; a wander strolls at 1.5.
Walking to an actor stops on the free tile beside them that is closest, side by side on ties, facing them.
It aims for where they stand when the walk starts, and it makes a wandering actor stop and wait.
Reading time is the typewriter time (30 characters per second) plus a hold of at least 1.2 seconds, or one second per 15 characters if longer.
A new bubble from the same actor replaces the old one.
Any call on a wandering actor ends the wander at that moment.

Start an actor with `hidden: true` at a door, then `exit` the building, to have them come out later:

```ts
const cy = s.actor('cy', { at: 'cafe.door', hidden: true });
s.wait(2);
cy.exit('cafe');
```

Seats belong to props: the built-in `bench` has `left` and `right`.
`sitOn` walks to the prop's place named like the seat (`bench.left`), or else the nearest free tile beside the prop, then slides onto the seat and faces the seat's direction.
Talking, emotes and `face` keep a sitter seated; the next move or pose first steps them back to that tile (0.3 s), then carries on.
Two actors on one seat at the same time is an error that lists the free seats.

```ts
const ana = s.actor('ana', { at: 'plaza' });
const kofi = s.actor('kofi', { at: 'fountain.south' });
s.together(() => {
  ana.sitOn('bench', 'left');
  kofi.sitOn('bench', 'right');
});
ana.say('Did you hear about Friday?');
kofi.say('Tell me everything!');
ana.walkTo('cafe.door'); // gets up, then walks
```

Inside `together`, give each actor its moves in time order; an earlier move after a later one is an error.
A later walk may interrupt an earlier one: the actor sets off from wherever they are.

## Errors

Mistakes throw when the scene is built, with the valid names and a guess:

```
Unknown place "cafe.dor". Did you mean "cafe.door"? Valid places: cafe.door, east, plaza, west.
Unknown pose "wav". Did you mean "wave"? Valid poses: sit, wave. (for character "ana")
ana cannot walk from [1, 5] to [18, 11]. The target [18, 11] is in an enclosed area of 1 tile(s), walled in by: [18, 10] water (solid terrain), ...
```

Unknown characters, places, props, seats, poses, emotes and directions are all reported this way, as are a prop with no seats and a character with no `sit` pose.
Passing an actor's id as a string where a handle is expected says so.

## A town

```ts
import { defineTown } from '../world';

export const willowSquare = defineTown({
  name: 'Willow Square',
  // One character per tile. The legend maps characters to terrain ids.
  terrain: `
    gggggggggggg
    gg========gg
    gg==~~~~==gg
  `,
  legend: { g: 'grass', '=': 'cobble', '~': 'water' },
  props: [
    { kind: 'cafe', at: [3, 6], id: 'cafe' },   // origin tile = bottom-left of the footprint
    { kind: 'lamp', at: [9, 7] },
  ],
  places: { plaza: [6, 9] },
});
```

`defineTown(spec, art?)` validates everything and computes the collision grid.
A tile is solid when its terrain is solid or a prop's footprint covers it; a footprint grows right and up from the origin tile.
Each prop's own places are exposed as `<id>.<place>`, for example `cafe.door`.
A prop's `id` defaults to its kind; several unnamed props of one kind become `lamp-1`, `lamp-2`, and so on.
Unknown terrain characters and ids, unknown prop kinds, props outside the map or overlapping each other, duplicate names, and places on solid tiles are errors, and the message lists what is valid.
Prop and place coordinates must be whole tiles: `[1.5, 1]` is an error.

Helpers, all from `src/world`:

- `findPath(town, from, to)` - shortest walkable path between two tiles `{ tx, ty }` (4-connected), both ends included, or `null`. Among equally short paths it takes the one with fewest turns, and is deterministic.
- `explainNoPath(town, from, to)` - why there is no path, naming the blocking tiles.
- `tileCenter(tx, ty)` - the feet position for someone standing on a tile; `tileAt(x, y)` is its inverse.
- `describeTown(town)` - a plain-text map with a legend, the props and every place name, so an author who cannot see the picture can still plan a scene.
- `createRng(seed)` - a seeded random generator (`next`, `int`, `range`, `pick`) for anything that needs variation.

`describeTown` output looks like this (`#` is a prop footprint, digits mark places):

```
Test: 8 x 5 tiles. x grows right, y grows down, [0, 0] is the top-left tile.

  01234567
0 gggggggg
1 ggww###g
2 ggww###2
3 ccc3c1cc
4 #gggggg#

Legend:
  g grass
  w water (solid)
  c cobble
  # prop footprint (solid)

Props (origin = bottom-left tile of the footprint):
  home (house) at [4, 2], footprint 3x2 tiles
  ...

Places (walkable tiles you can use as targets):
  1 home.door [5, 3]
  2 home.porch [7, 2]
  3 plaza [3, 3]
```

`pnpm tsx tools/scene-preview.ts` scripts a short demo on the reference art and writes PNG frames to `out/scene-preview/`.
