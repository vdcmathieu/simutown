# The scripting API

This page is the target for the world and scene modules, and later the reference for scene authors.
Whoever implements it keeps this page true: if the code and the page disagree, fix one of them.

## A scene

```ts
import { scene } from '../src';
import { willowSquare } from '../src/towns/willow-square';

export default scene({ title: 'Word of mouth', town: willowSquare, timeOfDay: 18.5 }, (s) => {
  const ana = s.actor('ana', { at: 'cafe.door' });
  const ben = s.actor('ben', { at: 'fountain.south', facing: 'left' });

  s.title('Word of mouth', 'How news travels in a small town');
  s.camera.cut(ana, { zoom: 2 });
  s.caption('Ana has news.');

  ana.walkTo(ben);                        // pathfinds, stops next to Ben
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

The script runs once, when the scene is built.
It produces a timeline, and `scene.frame(t)` reads that timeline: any frame can be computed directly, in any order.
There is no randomness and no hidden state, so the same script always gives the same film.

## Scene builder

| Call | Effect | Default duration |
|------|--------|------------------|
| `s.actor(character, { at, facing?, id?, hidden? })` | Put a townsperson on the map. Returns an actor handle. | 0 |
| `s.wait(seconds)` | Let time pass. | given |
| `s.together(fn)` / `s.sequence(fn)` | Parallel and sequential groups. | longest / sum |
| `s.title(text, subtitle?, { hold? })` | Full-frame title card that fades in and out. | 2.5 s |
| `s.caption(text, { hold? })` | Narration line at the bottom. Stays until replaced or cleared. | 0, or `hold` |
| `s.clearCaption()` | Remove the caption. | 0 |
| `s.camera.cut(target, { zoom? })` | Jump the camera. | 0 |
| `s.camera.pan(target, { duration?, zoom? })` | Glide the camera. | 1.5 s |
| `s.camera.follow(actor \| null)` | Keep an actor centred until told otherwise. | 0 |
| `s.timeOfDay(hour, { duration? })` | Set or animate the hour (0-24). | 0 |
| `s.label(actor, text)` / `s.unlabel(actor)` | Tag above an actor. | 0 |
| `s.link(a, b, { hold? })` | Dotted line that grows from a to b, holds, then goes. | 1.5 s |
| `s.ring(actor, { hold? })` | Highlight ring under an actor. | 1 s |
| `s.focus(actors, { duration? })` / `s.unfocus()` | Dim everything except these actors. | 0.4 s |
| `s.fadeIn(seconds?)` / `s.fadeOut(seconds?)` | Fade from or to ink. | 0.6 s |
| `s.wander(actor, { around, radius?, seed? })` | Background life: the actor strolls near a place until its next instruction. | 0 |

A `target` or `at` is a place name (`'cafe.door'`), a tile `[tx, ty]`, or an actor handle.

## Actor handle

| Call | Effect | Default duration |
|------|--------|------------------|
| `a.walkTo(target, { speed? })` | Walk there along a path that avoids solid tiles. Walking to an actor stops on a free tile next to them, facing them. | path length / speed |
| `a.face(dir \| actor)` | Turn. | 0 |
| `a.say(text, { hold? })` | Speech bubble with typewriter reveal, held long enough to read. | from text length |
| `a.think(text)` / `a.shout(text)` | Same, different bubble. | from text length |
| `a.emote(name, { hold? })` | Icon above the head. | 1.2 s |
| `a.pose(name, { hold? })` | Play an extra pose if the character has it. | 1 s |
| `a.enter(prop)` / `a.exit(prop)` | Walk to a building's door and fade out, or appear at the door. | walk + 0.3 s |
| `a.hide()` / `a.show()` | Remove from or return to the map. | 0 |
| `a.teleport(target)` | Move instantly. | 0 |

Walking speed defaults to 2.5 tiles per second.
Reading time is the typewriter time (30 characters per second) plus a hold of at least 1.2 seconds that grows with the text.

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

`defineTown` validates everything and computes the collision grid.
Each prop's own places are exposed as `<id>.<place>`, for example `cafe.door`.
Unknown terrain ids, unknown prop kinds, props outside the map and places on solid tiles are errors, and the message lists what is valid.

Helpers:

- `findPath(town, from, to)` - shortest walkable path between two tiles (4-connected), or `null`.
- `tileCenter(tx, ty)` - the feet position for someone standing on a tile.
- `describeTown(town)` - a plain-text map with every place name, so an author who cannot see the picture can still plan a scene.
