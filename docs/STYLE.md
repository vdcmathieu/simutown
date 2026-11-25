# Art direction: Willow Square in daylight

Simutown is a small, friendly town at midday.
The meadow is a light, fresh green, the paving is pale sand, the roofs are warm, and everything has a dark, confident outline.
People are two heads tall.
It should feel like a toy town: bright, chunky, and readable from the back of a classroom.

Every artist, human or agent, draws against this page so that the town reads as one hand.
The style key is the reference picture; when this page and your eye disagree, match the style key.

| File | What it shows |
|------|---------------|
| `docs/style/stylekey.png` | A sunny corner of Willow Square, at x4. Every reference sprite in context. |
| `docs/style/characters.png` | Every frame of the reference townsfolk. Rows: down, left, right, up. Columns: 2 idle frames on paving, 4 walk frames on grass. |
| `docs/style/palette.png` | The palette, one row per ramp in the order of the table below, dark to light. |

Regenerate them with `pnpm tsx tools/stylekey.ts`.
Review single sprites with `pnpm sheet <group>`.

Willow Square is its own place.
We take the qualities of the classic handheld RPG town - brightness, chunkiness, big heads, clarity - and none of its content.
Never copy a character, creature, tile or sprite from an existing game, and never name one in this repository.
The people here are ordinary townsfolk.

## The palette

Art uses the 38 slots of the `daylight` theme in `src/core/palette.ts` and nothing else.
Ramps run dark to light, and each one is hue-shifted: the dark end leans cool, the light end leans warm.
The character in the second column is the slot's letter in a sprite grid (`LEGEND` in `src/core/sprite.ts`).

| Ramp | Grid | Use |
|------|------|-----|
| `steel.0` | `0` | Ink. Outlines and eyes, nothing else. |
| `steel.1-5` | `1 2 3 4 5` | Iron, slate, stone, and white. `steel.5` is the only white: glints, foam, daisies, cloth. |
| `cream.0-2` | `a b c` | The light ground of the town. `cream.1` is paving, `cream.0` its joints, `cream.2` plaster walls and paper. |
| `ochre.0-3` | `o p q r` | Orange to sunshine yellow: orange roofs, straw, blond and ginger hair, flower hearts. Also lamplight. |
| `brick.0-2` | `x y z` | Warm red: tiled roofs, doors, poppies, a red shirt. |
| `moss.0-3` | `g h i j` | Green. `moss.2` is the grass, `moss.1` is leaves and tufts, `moss.0` leaf shade, `moss.3` sunlit tips. |
| `wood.0-2` | `u v w` | Trunks, beams, doors and window frames, benches, brown hair. |
| `skin.a/b/c.0-1` | `k l`, `m n`, `s t` | Three skin tones, each a shade and a base. |
| `plum.0-1`, `teal.0-1` | `d e`, `6 7` | Clothing, and the odd painted shutter or awning. |
| `sky.0-2` | `8 9 f` | Water, window glass by day, blue roofs, denim. |
| `rose.0-1` | `+ *` | Flowers, cheeks, ribbons, a pink skirt. |

### Colour rules

- **Two colours own the ground.** `moss.2` (grass) and `cream.1` (paving) cover most of every frame, and they are reserved for it.
  A prop never uses either as its main colour: trees are `moss.1` with `moss.2` only as a highlight, walls are `cream.2`.
  That is why props and people pop off the ground without effort.
- **Ink is for lines.** `steel.0` draws outlines and eyes.
  It never fills an area larger than a few pixels.
- **Saturated colour goes on things that matter.** Roofs, doors, clothes and flowers get the strong reds, yellows, blues and pinks.
  Large surfaces (ground, walls, stone) stay light and quiet.
- **Three tones per material.** Shade, base, light, from one ramp. A whole sprite rarely needs more than four ramps plus ink.
- **White is rare.** `steel.5` and `ochre.3` are highlights of a few pixels, clothing, or the core of a lit window.
- **No hex colours in art, ever.** If a colour is missing, say so in your report; do not invent one.

## View and scale

- Top-down three-quarter view: we see the front faces of things and the tops of roofs. No perspective, no vanishing points.
- Tiles are 16x16. The frame is 480x270, so 30 tiles across. Everything is shown at x4 on a projector.

| Thing | Size in pixels | Notes |
|-------|----------------|-------|
| Person | 16x24 box, anchor [8, 24] | The figure itself is about 22 tall. Head 12 tall and 12 to 14 wide; body 10 tall, 12 wide at the arms. |
| Door | 16 wide, 24 tall | One tile wide, a tile and a half tall, frame included. A person must fit it. |
| Window | 15 wide, 13 tall | Four panes of 5x4 and a sill. Its top sits level with the top of the door. |
| Wall | 32 tall per storey | Two tiles, including a 4-pixel stone plinth. |
| Roof | about 1.4 times the wall height | The roof is the biggest, warmest shape in town. Give it room. |
| House | 80x80 | Five tiles wide, footprint 5x3, door place one tile below the door. |
| Tree | 32x36 | A round canopy two tiles wide on a short, 6-pixel trunk. About one and a half people tall. |
| Lamp post | 16x32 | A 2-pixel post with a fat lantern. |
| Bench | 32x18 | Two tiles wide; the seat is 9 pixels off the ground. |
| Flower | 3x3 | A plus of petals around a heart. Five to a patch. |
| Paving stone | 8x8 | Rounded corners, running bond. |

Chunky beats detailed.
If a shape is thinner than 2 pixels (plus its outline), make it fatter or leave it out.

## Line and shading

- **Outlines.** People and standing props have a closed 1-pixel ink outline around the silhouette, base line included.
  Round the corners by dropping the corner pixel; nothing in this town has a sharp square corner except a wall.
- **Ink inside a sprite** separates major parts that overlap: head over body, hat brim over face, roof over wall, seat over backrest.
- **Detail inside one part** uses that part's own dark shade: `wood.0` around a window, `brick.0` under a course of roof tiles, the shirt's shade under an arm.
- **Terrain and flat props have no ink at all.** Their darkest line is the dark end of their own ramp.
- **Light comes from the upper left.** Top and left faces take the light tone, right and bottom faces the shade.
  Highlights are small (a lip, a glint, the top-left of a leaf clump); shade may be a broad crescent on the lower right.
- **Flat colour.** No gradients, no dithering, no anti-aliasing, no pillow shading.
- **No cast shadows in sprites.** The renderer draws them: a flat ink ellipse at about 22% under every person and standing prop, and a 2-pixel strip along the base of a building. The style key shows the midday version.
- **Calm ground.** A grass tile carries two or three small marks (a `moss.1` tuft, a `moss.3` blade), never a speckle. Large areas must stay quiet so that people stand out.
- **Tiles must tile.** Check every terrain tile in the 3x3 and mixed views of `pnpm sheet terrain`: no seams, no repeat that draws the eye.

## Ground and water

- `grass` has three variants; the renderer mixes them by tile position.
- `cobble` is the town's pale paving. Lesser paths can use it one tile wide.
- `water` is flat `sky.1` with a few `sky.2` ripples that drift between two frames. It is solid.
- Edges are fringes: thin strips that a higher-priority terrain draws on its neighbours. Priorities are `cobble` 1, `grass` 2, `water` 3.
- Grass creeps over paving with a lumpy turf line, `moss.1` on the lit north and west sides, `moss.0` on the shaded south and east sides.
- Water sits in a rim of pale stone with a shadow under its north bank and a line of foam along the south and east.
- Keep fringe strips to 5 pixels or less. Two strips cross wherever a shoreline turns an inner corner, and thin strips still read cleanly there.

## People

People are built by the kit in `src/art/characters/kit.ts`: a shared body in role letters, plus three head grids per person (facing down, up and right; left is right mirrored).

- **Two heads tall.** The head, hair included, is 12 rows; the body is 10. Do not grow the body to add detail.
- **Faces.** Two ink eyes, each 1 pixel wide and 2 tall, on rows 9 and 10 of the box, at columns 5 and 10 when facing the viewer.
  No nose, no mouth. A light-skinned face may have one `rose.1` pixel per cheek.
- **Silhouette first.** Each person must be recognisable as a black shape: a bun, a straw hat, long hair, a beard, a skirt.
  Hair and hats may use the two rows above the head and may hang over the shoulders.
- **Colour second.** One strong colour for the top, a different one for the legs, and at most one small accent (a ribbon, a hat band). Avoid `moss.2` and `cream.1` in clothes: they are the ground.
- **Bodies are plain.** No buttons, belts or pockets. A sleeve is separated from the chest by one pixel of the top's shade.
- **Idle** is two frames: the head settles by 1 pixel on the second.
- **Walk** is four frames: step, stand, other step, stand. On a step the head and body drop 1 pixel, one foot is planted and the other lifted.
- All three skin tones are in the reference cast; keep it that way as the cast grows.

## Buildings

- A house is a roof, a wall and a plinth, assembled from small pieces (see `src/art/buildings/index.ts`).
- **Roofs** are `brick` (red) or `ochre` (orange), sometimes `sky` (blue) or `steel` (slate). Courses are 5 pixels tall with a scalloped shade line under each and a short lit lip on every tile. No full grid of joints: a roof must not read as a brick wall.
  The left edge of the roof is lit, the right edge shaded, and an ink line separates the eave from the wall.
- **Walls** are `cream.2` plaster with a `cream.1` shadow under the eave, a `wood` timber frame, and a `steel` plinth.
- **Doors** are painted a strong colour, with inset panels (shade on the top and left of a panel, light on the bottom and right) and a brass knob in `ochre.2`.
- **Windows** by day are `sky.1` glass with a `sky.0` shadow along the top of each pane and a small `sky.2` glint, in a `wood.0` frame.
  A window box of flowers is welcome.

## Nature

- A tree canopy is a lumpy ball: `moss.1` all over, a handful of sunlit clumps of `moss.2` towards the upper left with a few `moss.3` pixels at their top-left, and a broad `moss.0` crescent along the lower right.
- Trunks are short and fat: `wood.2`, `wood.1`, `wood.0` in three vertical bands from left to right.
- Flowers and lily pads are flat props: no ink, no footprint, drawn under people.

## Daylight, dusk and night

Bright daylight is the default, and all art is drawn for it.
The renderer will also offer dusk and night moods by darkening and tinting the frame, and then switching the lights on.

- Any prop that can glow keeps an `emissive` sprite of the same size and anchor, plus `lights`.
- The day sprite shows the thing unlit: window glass in `sky`, lamp glass in `cream`.
- The emissive sprite repaints only the glass: `ochre.2` with an `ochre.3` core. Window bars and frames stay out of it, so they read dark against the glow.
- `pnpm sheet` shows both versions side by side. Check that the lit one feels warm and inhabited.

## Do and do not

Do:

- Start from the silhouette, fill it with one flat colour, then add one shade and one light.
- Reuse the reference pieces: the window, the door, the roof course, the kit body.
- Look at your sprite in the style key's company, at x4, from across the room.

Do not:

- Use ink as a fill, or leave an outline open.
- Use `moss.2` or `cream.1` as the main colour of a prop or of clothing.
- Dither, anti-alias, or shade with more than three tones of one ramp.
- Speckle the ground, or put a detail on every tile.
- Paint a cast shadow into a sprite.
- Draw thin things: a 1-pixel fence rail, a 1-pixel limb.
- Give a person a small head, a mouth, or realistic proportions.
- Light anything from the right.

## Checklist before you call a sprite done

1. Rendered and looked at, at x4, next to the style key.
2. Correct size and anchor (the contract test checks this).
3. Bright: each material's base is the middle or light tone of its ramp; the dark tone is only shade. Iron is the one exception.
4. Chunky: no part thinner than 2 pixels, corners rounded.
5. Closed ink outline on people and standing props; no ink on terrain and flat props.
6. Light from the upper left, at most three tones per material.
7. It does not use the ground colours as its own.
8. Anything that glows has an emissive layer.
9. It still reads when you squint.
