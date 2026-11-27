# The scripting API

This page is the reference for scene authors and for whoever maintains `src/world` and `src/scene`.
If the code and the page disagree, fix one of them.

## A scene

```ts
import { scene } from 'simutown';
import { willowSquare } from 'simutown/towns';

export default scene({ title: 'Word of mouth', town: willowSquare, timeOfDay: 10 }, (s) => {
  const ana = s.actor('ana', { at: 'cafe.door' });
  const bo = s.actor('bo', { at: 'fountain.south', facing: 'left' });

  s.title('Word of mouth', 'How news travels in a small town');
  s.camera.cut(ana, { zoom: 2 });
  s.caption('Ana has news.');

  ana.walkTo(bo);                        // pathfinds, stops next to Bo, facing him
  ana.say('Party at the cafe on Friday!');
  s.together(() => {                      // everything in here starts at the same moment
    bo.emote('surprise');
    s.link(ana, bo);                     // a dotted line: information passing
    s.camera.pan('plaza', { duration: 2, zoom: 1 });
  });
  s.label(bo, 'knows');
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
| `s.actor(character, { at, facing?, id?, hidden?, inside? })` | Put a townsperson on the map. Returns an actor handle. `id` defaults to the character and is required for a second copy. `inside` names the room a tile `at` is in. | 0 |
| `s.wait(seconds)` | Let time pass. | given |
| `s.together(fn)` / `s.sequence(fn)` | Parallel and sequential groups. | longest / sum |
| `s.title(text, subtitle?, { hold? })` | Full-frame title card: 0.5 s fade in, `hold` (1.5 s), 0.5 s fade out. | 2.5 s |
| `s.caption(text, { hold? })` | Narration line at the bottom. Stays until replaced or cleared, or for `hold` seconds. | 0, or `hold` |
| `s.clearCaption()` | Remove the caption (it fades out). | 0 |
| `s.camera.cut(target, { zoom? })` | Jump the camera. On an actor, it frames where they are at that moment. A place in a room, or someone inside, shows that room. | 0 |
| `s.camera.inside(building, { zoom? })` | Cut to a room, framed on its centre. The zoom defaults to the largest at which the whole room fits. | 0 |
| `s.camera.outside(target?, { zoom? })` | Cut back to the town: with no target, to where the camera last was outside at the zoom it had there; with a target, to that place, town tile or actor outside. | 0 |
| `s.camera.pan(target, { duration?, zoom? })` | Glide with ease-in-out. A zoom change happens halfway. It stays in the location the camera shows. | 1.5 s |
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
A place inside a room is written `'<building>:<place>'`, such as `'bakery:door'`: see [Rooms](#rooms).

The camera zoom is a whole number from 1 to 16: 1 shows a 480 x 270 pixel view, 2 shows half that.
The view never leaves the town, down to the last pixel the renderer draws: near an edge it stops, and a town smaller than the view is centred.

## Actor handle

| Call | Effect | Default duration |
|------|--------|------------------|
| `a.walkTo(target, { speed? })` | Walk there along the shortest path that avoids solid tiles. | path length / speed |
| `a.face(dir \| actor)` | Turn. | 0 |
| `a.say(text, { hold?, gesture? })` | Speech bubble with typewriter reveal, held long enough to read. A standing speaker plays the `talk` pose while the text types out; `gesture: false` turns that off. | from text length |
| `a.think(text, { hold?, gesture? })` / `a.shout(text, { hold?, gesture? })` | Same, different bubble. | from text length |
| `a.emote(name, { hold? })` | Icon above the head; beside it while the person also speaks or thinks. | 1.2 s |
| `a.pose(name, { hold? })` | Play any of the character's poses (the townsfolk have `sit`, `wave`, `talk`, `carry`), then return to idle. | 1 s |
| `a.sitOn(prop, seat?, { hold?, speed? })` | Walk to a seat of a prop (default: its first), slide onto it and sit until the next move or pose. | walk + 0.3 s + `hold` |
| `a.enter(prop, { speed? })` | Walk to the prop's `door` place, face up and go through the door (0.3 s). When the building has a room, the actor is then inside it on its `door` place, facing up; otherwise they leave the map. | walk + 0.3 s |
| `a.exit(prop, { speed? })` | Come out of the prop's door, facing down. From inside its room, walk to the room's `door` place first; from inside another room, fade out there; from outside, appear at the door and fade in. | walk + 0.3 s |
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
const kofi = s.actor('kofi', { at: 'cafe.door', hidden: true });
s.wait(2);
kofi.exit('cafe');
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
A walk to someone (`walkTo`, `at` or `wander` around an actor) sees them as the calls scripted so far put them, so when their move starts at the same moment in another branch, script that move first.
Camera calls on an actor are settled after the script and do not depend on the order.
A later walk may interrupt an earlier one: the actor sets off from wherever they are.

## Rooms

A building can have a room: its inside, a small map of its own (see [A town](#a-town)).
Every actor is in one location at a time, outside or in one room, and every frame shows one location, the camera's.
Only the people in that location are in the frame, with their bubbles, emotes, labels, links and rings.
`describeTown(town)` lists each room with its own map, props and places under their qualified names.

Name what is in a room as `'<building>:<name>'`:

```ts
const bo = s.actor('bo', { at: 'bakery:counter.behind' });      // starts inside the bakery
const ana = s.actor('ana', { at: 'square' });
const lin = s.actor('lin', { at: [3, 4], inside: 'bakery' });   // a tile of the room

ana.walkTo('bakery.door');                // the door outside
s.camera.inside('bakery');                // cut into the room, the whole room in frame
ana.enter('bakery');                      // she fades in on the room's door place
ana.walkTo('bakery:customer');            // a step back from the counter
ana.say('Two loaves, please!');
bo.walkTo('bakery:oven.front');           // a place in the room
ana.exit('bakery');                       // back to the room's door, then out
s.camera.outside();                       // back to the street, framed as before
```

- A tile `[tx, ty]` is a tile of the location the actor is in, for `walkTo`, `wander` and `teleport`, and of the location the camera shows, for the camera and `label`. `s.actor` takes `inside` for a tile in a room.
- `walkTo`, `wander` and `sitOn` work inside a room with the room's own collision, props and seats. Walking to a place or a person in another location is an error that says where the actor is and to `enter` or `exit` first. `teleport` may go anywhere.
- Going through a door takes 0.3 s and is a fade on both sides at once: the actor fades out at the door being left and fades in at the door being reached. `enter` arrives on the room's `door` place facing up; `exit` arrives on the building's `door` place outside facing down.
- `enter` while inside a room is an error. `exit` of another building than the room the actor is in takes them out of that room and in at the named building's door, both fading, as before rooms (in at one door, out of another). `exit` while outside is the old entrance: appear at the door and fade in.
- `face(actor)` towards someone in another location is an error that says who is where.
- `s.camera.cut` to a room place, or to an actor who is inside at that moment, shows that room; to a place or actor outside, the town. `s.camera.inside(building)` frames the room on its centre at the largest whole zoom at which it fits (rooms are designed for zoom 2: at most 14 x 7 tiles, walls included). The border of `ink` around a room's map does not count: only the room itself has to fit.
A cut keeps the zoom it had, so coming from a zoom-1 street shot, pass `{ zoom: 2 }` to a cut into a room, or use `s.camera.inside(building)`, which picks the zoom that fits.
- `s.camera.pan` cannot leave the location the camera shows: it is an error that says to cut instead.
- `s.camera.follow(actor)` shows the location the actor is in when it starts. While they are in another location, the camera holds where they left it, as a film would; when they come back, it follows them again.
- `s.camera.outside()` cuts back to where the camera last was outside, at the zoom it had there (the opening view if it never was). `s.camera.outside(target)` cuts to a place, tile or actor outside; a tile is always a tile of the town, and a place or an actor in a room is an error. Beats read `camera cuts back outside` and `camera cuts outside to [8, 9] at zoom 2`.
- Someone placed inside, such as `at: 'bakery:counter.behind'`, is not seen until the camera goes inside: `s.camera.inside('bakery')`, or a cut to them or to a place in the room.
- Inside a room, a bare name is still an outside name: `bo.sitOn('bench')` is an error that asks whether you meant `bakery:bench` and lists the room's names.
- A label on a room place shows only in that room.
- Beats name inside targets by their qualified names (`walks to bakery:counter`, `appears at bakery:[3, 4]`), and a camera beat that changes location says so: `camera cuts to bo (inside bakery)`, `camera cuts inside bakery at zoom 2`, `camera cuts to plaza (outside)`.

A script that never names a room gives the same film whether or not its town has rooms, with one exception by design: `enter` into a building with a room puts the actor inside, so a later cut to them goes in.
After such an `enter`, a few more calls behave differently than before the building had a room:

- `walkTo` an outside place is an error (before: an unseen walk while hidden);
- `teleport` to an outside place shows the actor there (before: they stayed hidden);
- `show()` does not bring them back to the street (before: they reappeared at the door); `exit` does.

A room is drawn with its own light (`indoor: true`): by day, the art's own colours with only the small contact shadows under people and furniture; when the lamps come on (from about 17:30) it dims a little and turns warm, and its lamps and glowing windows light it.
It never turns to the blue night outside, and everything beyond its walls is ink.

## Errors

Mistakes throw when the scene is built, with the valid names and a guess:

```
Unknown place "cafe.dor". Did you mean "cafe.door"? Valid places: cafe.door, east, plaza, west.
Unknown pose "wav". Did you mean "wave"? Valid poses: sit, wave. (for character "ana")
ana cannot walk from [1, 5] to [18, 11]. The target [18, 11] is in an enclosed area of 1 tile(s), walled in by: [18, 10] water (solid terrain), ...
```

Unknown characters, places, rooms, props, seats, poses, emotes and directions are all reported this way, as are a prop with no seats and a character with no `sit` pose.
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

Two more fields make rooms.
`indoor: true` marks a town as a room: no sun or moon shadows, never darkened to night, lit by its own lamps after dusk, ink beyond its walls.
`interiors` gives a town its rooms, keyed by the id of the building prop each one is the inside of:

```ts
// examples/bakery-room.ts (excerpt)
const bakeryRoom = defineTown({
  name: 'Bakery',
  indoor: true,
  terrain: `
    ##############
    #WWWWWWWWWWWW#
    #BBBBBBBBBBBB#
    #............#
    #............#
    #............#
    #............#
    #............#
    ##############
  `,
  legend: { '#': 'ink', W: 'wall-plaster', B: 'wall-brick-base', '.': 'floor-stone' },
  props: [
    { kind: 'bread-rack', at: [1, 3] },
    { kind: 'window-wide', at: [5, 2] },
    { kind: 'wall-lamp', at: [8, 2] },
    { kind: 'oven', at: [10, 3], id: 'oven' },
    { kind: 'bakery-counter', at: [6, 5], id: 'counter' },
    { kind: 'doormat', at: [4, 7] },
  ],
  places: { door: [4, 7], customer: [7, 7] },
});
```

The room is built from the interior kit (see "A room" in [Making art](making-art.md)): a back wall two rows high, `wall-<look>` over a base row, floor below it, and `ink` all around, which draws the wooden cap on the walls.
Give the props that scenes will name a short `id`: the counter above gives `bakery:counter.behind` and `bakery:counter.front`.
The town it belongs to lists it under `interiors`, keyed by the id of the building:

```ts
// examples/bakery-room.ts (excerpt)
  props: [
    { kind: 'bakery', at: [12, 6] },
    { kind: 'lamp', at: [10, 6] },
  ],
  places: { west: [2, 8] },
  interiors: { bakery: bakeryRoom },
});
```

`examples/bakery-room.ts` is the whole file, with a scene that goes in and comes out again; Willow Square's rooms are in `src/towns/willow-square-rooms.ts`.

Each room is its own town, in its own tile coordinates from `[0, 0]`, with a walkable place called `door` just inside its entrance.
Each key must be the id of a prop with a `door` place outside; rooms cannot have rooms.
A key that is not such a building, and a room without a `door` place, are errors that list what is valid.

Helpers, all from `src/world`:

- `findPath(town, from, to)` - shortest walkable path between two tiles `{ tx, ty }` (4-connected), both ends included, or `null`. Among equally short paths it takes the one with fewest turns, and is deterministic.
- `explainNoPath(town, from, to)` - why there is no path, naming the blocking tiles.
- `tileCenter(tx, ty)` - the feet position for someone standing on a tile; `tileAt(x, y)` is its inverse.
- `describeTown(town)` - a plain-text map with a legend, the props and every place name, so an author who cannot see the picture can still plan a scene. A town's rooms follow, each with its own map, props and places under their qualified names (`bakery:door`).
- `createRng(seed)` - a seeded random generator (`next`, `int`, `range`, `pick`) for anything that needs variation.

`describeTown` output looks like this.
`#` is a prop footprint and every tile with places has a mark of its own.
Props without doors, seats or places fold into one `Scenery` line, and `<who>.home` places are listed under the door they share:

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
  any other mark is a place, listed under Places

Props with doors, seats or places (origin = bottom-left tile of the footprint):
  home (house) at [4, 2], footprint 3x2 tiles
Scenery, 3 more props (solid ones show as # on the map): 2 lamp, rug.

Places (walkable tiles you can use as targets):
  1 home.door [5, 3]
  2 home.porch [7, 2]
  3 plaza [3, 3]
```

`pnpm tsx tools/scene-preview.ts` scripts a short demo on the reference art and writes PNG frames to `out/scene-preview/`.
