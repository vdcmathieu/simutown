# Art direction: steel and ochre dusk

Simutown is a small town at the end of the day.
The light is going blue, the stone is cool, and the only warm things in the frame are the lamps and the lit windows.
It should feel quiet and a little painterly, closer to a print than to a bright RPG tileset.

Every artist, human or agent, draws against this page so that the town reads as one hand.
When in doubt, render the reference sprites (`pnpm sheet all`, `pnpm still 4`) and match them.

## The palette

Art uses the 33 slots in `src/core/palette.ts` and nothing else.
Ramps run dark to light.

| Ramp | Use |
|------|-----|
| `steel.0-5` | The backbone. Outlines (`steel.0`), stone, slate roofs, water, shadow, metal, night. |
| `cream.0-2` | Plaster walls, paper, cloth, the lightest non-glowing surfaces. |
| `ochre.0-3` | Light. Lamp glass, lit windows, and very small accents. |
| `brick.0-2` | Muted warm: brick, roof tiles, clay pots, rust. |
| `moss.0-3` | Grass, leaves, hedges. Dusty, never bright green. |
| `wood.0-2` | Trunks, doors, beams, furniture, dark hair. |
| `skin.a/b/c.0-1` | Three skin tones, each a shade and a base. |
| `plum.0-1`, `teal.0-1` | Clothing and the odd painted shutter or awning. |

### The one warm colour

Ochre is rationed.
`ochre.2` and `ochre.3` appear only in emissive layers (things that glow) and in accents of a few pixels: a scarf, a flower, a sign.
If a daytime sprite has a large ochre area, it is wrong.
This rule is what makes the lamps and windows carry the picture at dusk.

## View and scale

- Top-down three-quarter view, like a classic JRPG town: we see the front faces of things and the tops of roofs. No perspective, no vanishing points.
- Tiles are 16x16. The frame is 480x270, so 30 tiles across.
- Characters are 16x24 and about two and a half heads tall: a 10-pixel-wide head, a small body. They must read at a glance from across a classroom.
- A door is about 12 wide and 18 tall, so a character fits it. A ground-floor window is about 8x10. A one-storey house front is about 3 tiles tall including the roof.
- Trees are tall: 32x48 for a full tree. A lamp post is 16x32.

## Line and shading

- **Outlines.** Characters and props have a 1-pixel `steel.0` outline around the silhouette. Inside the silhouette, separate shapes with the darker shade of the local ramp, not with `steel.0`. Terrain tiles have no outline.
- **Light direction.** The sun is low in the upper left. Top and left faces take the light shade, right and bottom faces the dark shade. Keep this consistent across every sprite.
- **Three tones per material.** Shade, base, highlight. No gradients, no banding, no pillow shading.
- **Dither sparingly.** A 2x2 checker is fine to soften a large roof, water or a ground transition. Never dither a character.
- **No cast shadows in sprites.** The renderer draws shadows for the time of day. Do not paint a shadow on the ground under a prop or a person.
- **No pure noise.** A tile should have a few deliberate marks (three or four grass tufts), not a speckle on every other pixel. Large areas must stay calm so characters stand out.
- **Tiles must tile.** Check every terrain tile in the 3x3 view of `pnpm sheet terrain`: no visible seams, no obvious repeat that draws the eye.

## Emissive layers

A prop may have an `emissive` sprite: the pixels that glow when the lights are on.
Draw lit windows with `ochre.2` and a hotter `ochre.3` core, with the window bars left dark.
The day sprite shows the same window unlit, in `steel.2` and `steel.3` with a `steel.4` glint.
The sheet shows both versions side by side: check that the lit one feels warm and inhabited.

## People

- Simple faces: two eye pixels in `steel.0`, no mouth unless an expression needs it.
- Distinct silhouettes first, colours second: hair shape, a hat, an apron, a long coat. Each townsperson should be recognisable as a black shape.
- Clothes sit in `steel`, `teal`, `plum`, `brick`, `cream` and `moss`. One small ochre accent per person at most.
- Walk cycles are four frames. The body bobs by one pixel and the feet alternate. Left is right, mirrored.

## Readability

These scenes are shown on projectors and in slides, scaled x4.
Favour big clear shapes over small detail.
If two things matter in a lesson, the viewer must be able to tell them apart at arm's length.

## Checklist before you call a sprite done

1. Rendered and looked at, at the sheet's scale.
2. Correct size and anchor (the contract test checks this).
3. Light from the upper left, three tones per material.
4. Outline rule followed.
5. Ochre rationed.
6. It still reads when you squint.
