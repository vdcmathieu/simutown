# Art direction: Willow Square in daylight

Simutown is a small, friendly town at midday.
The meadow is a light, fresh green, the paving is pale sand, the roofs are warm, and everything has a dark, confident outline.
People are two heads tall.
It should feel like a toy town: bright, chunky, and readable from the back of a classroom.

Every artist, human or agent, draws against this page so that the town reads as one hand.
The pictures in `docs/style/` show these rules applied.
Where a picture and a written rule disagree, the rule wins and the picture has a bug: say so in your report.

| File | What it shows |
|------|---------------|
| `docs/style/stylekey.png` | A corner of Willow Square, at x4. Every reference sprite in context. |
| `docs/style/characters.png` | Every frame of the reference townsfolk. Rows: down, left, right, up. Columns: 2 idle frames on paving, 4 walk frames on grass. |
| `docs/style/pieces.png` | The approved repeat pieces at x8: window, door, roof corners, turf edge, shores, the tree, a person standing and stepping. Copy these pixels, not this prose. |
| `docs/style/palette.png` | The palette, one row per ramp, dark to light. Each swatch carries its slot name and, in red, its letter in a sprite grid. |

Regenerate them with `pnpm tsx tools/stylekey.ts`.
Review single sprites with `pnpm sheet <group>`.

Willow Square is its own place.
We take the qualities of the classic handheld RPG town - brightness, chunkiness, big heads, clarity - and none of its content.
Never copy a character, creature, tile or sprite from an existing game, and never name one in this repository.
Avoid outfits that add up to a famous character, even by accident: change a colour or a prop until the likeness is gone.
The people here are ordinary townsfolk.

### What the style key is, and what it is not

The style key fixes the rules: palette, outline, light, proportions, level of detail.
It is a sample of the town, and the town must not be forty copies of it.

- Copy the pieces that are meant to repeat: the window, the door, the roof face, the kit body, the turf edge, the shore.
- Do not clone the cottage with a new roof colour for every building. Vary width, storeys, roof shape, wall, door and where the windows sit.
- Do not reuse the three reference people as templates for faces and hair. Start each person from a new silhouette.
- The tree is one tree. Other trees get their own lobes: three or five, taller or wider, a pine, a fruit tree.
- Do not copy the layout. A square, a pond and a road meet differently in every town.

## The palette

Art uses the 38 slots of the `daylight` theme in `src/core/palette.ts` and nothing else.
Ramps run dark to light, and each one is hue-shifted: the dark end leans cool, the light end leans warm.
The second column is the slot's letter in a sprite grid (`LEGEND` in `src/core/sprite.ts`).

| Ramp | Grid | Use |
|------|------|-----|
| `steel.0` | `0` | Ink. Outlines and eyes, nothing else. |
| `steel.1-5` | `1 2 3 4 5` | Iron, slate, stone, and white. `steel.1` is also black hair. `steel.5` is the only pure white: glints, foam, daisies, cloth, white hair. |
| `cream.0-2` | `a b c` | The light ground of the town. `cream.1` is paving, `cream.0` its joints and bare earth, `cream.2` a warm near-white for plaster walls and paper. |
| `ochre.0-3` | `o p q r` | Orange to sunshine yellow: orange roofs, straw, blond and ginger hair, flower hearts, pale yellow plaster. Also lamplight. |
| `brick.0-2` | `x y z` | Warm red: tiled roofs, doors, poppies, a red shirt. |
| `moss.0-3` | `g h i j` | Green. `moss.2` is the grass, `moss.1` is leaves and tufts, `moss.0` leaf shade, `moss.3` sunlit tips. |
| `wood.0-2` | `u v w` | Trunks, beams, doors and window frames, benches, brown hair. |
| `skin.a/b/c.0-1` | `k l`, `m n`, `s t` | Three skin tones, each a shade and a base. |
| `plum.0-1`, `teal.0-1` | `d e`, `6 7` | Clothing, shutters, awnings. |
| `sky.0-2` | `8 9 f` | Water, window glass by day, blue roofs, denim. |
| `rose.0-1` | `+ *` | Flowers, cheeks, ribbons, a pink skirt. |

### Colour rules

- **Two colours own the ground.** `moss.2` (grass) and `cream.1` (paving) cover most of every frame, and they are reserved for it.
  A standing prop never uses either as its main colour: trees are `moss.1` with `moss.2` only as a highlight, walls are `cream.2` or `ochre.3`.
  That is why props and people pop off the ground without effort.
- **Ink is for lines.** `steel.0` draws outlines and eyes.
  It never fills an area larger than a few pixels.
- **Saturated colour goes on things that matter.** Roofs, doors, clothes and flowers get the strong reds, yellows, blues and pinks.
  Large surfaces (ground, walls, stone) stay light and quiet.
- **Three tones per material, where the ramp has them.** Shade, base, light, from one ramp.
  Two-slot ramps (`skin`, `plum`, `teal`, `rose`) are shade and base only: do not borrow a third tone from another ramp.
  A whole sprite rarely needs more than four ramps plus ink.
- **White is rare.** `steel.5` is the one pure white, for highlights of a few pixels, clothing and white hair; it is never a wall.
  `cream.2` and `ochre.3` are the two warm near-whites, and they are the wall colours. `ochre.3` is also the core of a lit window.
- **No hex colours in art, ever.** If a colour is missing, say so in your report; do not invent one.

## View and scale

- Top-down three-quarter view: we see the front faces of things and the tops of roofs. No perspective, no vanishing points.
- Tiles are 16x16. The frame is 480x270, so 30 tiles across. Everything is shown at x4 on a projector.

| Thing | Size in pixels | Notes |
|-------|----------------|-------|
| Person | 16x24 box, anchor [8, 24] | The figure itself is about 22 tall. Head 12 tall and 12 to 14 wide; body 10 tall, 12 wide at the arms. |
| Door | 16 wide, 24 tall | One tile wide, a tile and a half tall, frame included. A person must fit it. |
| Window | 15 wide, 13 tall | Four panes of 5x4 and a sill. A ground-floor window has its top level with the top of the door. |
| Ground storey | 32 tall | Two tiles, including a 4-pixel stone plinth. |
| Upper storey | 26 tall | At most one. Nothing in town is taller than two storeys and a roof. |
| Roof | 36 to 44 tall | See the roof rules below. |
| Cottage | 80x81 | Five tiles wide, one storey, footprint 5x3, door place one tile below the door. |
| Townhouse | 64x101 | Four tiles wide, two storeys, footprint 4x3. |
| Tree | 32x36 | A lobed canopy two tiles wide on a short, 6-pixel trunk. About one and a half people tall. |
| Lamp post | 16x32 | A 2-pixel post with a fat lantern. |
| Bench | 32x20 | Two tiles wide; the seat's top plane is 4 pixels deep. |
| Flower | 3x3 | A plus of petals around a heart. About eight to a patch, all one colour. |
| Paving stone | 8x8 | Rounded corners, running bond. |

Chunky beats detailed.
If a shape is thinner than 2 pixels (plus its outline), make it fatter or leave it out.

### Small props show their top

In this view we look down a little on everything.
Any prop with a flat surface below eye level shows that surface: a bench its seat, a crate its lid, a barrel its top, a table its board, a well or a planter its rim and what is inside.

- The top plane takes the material's light tone and is a third to a half as deep as the front face is tall.
- Where one part stands behind another (a bench's backrest behind its seat), give the rear part an underside row in the material's dark tone before the ink line, so the two do not fuse.
- The front face takes the base tone. Side faces are not drawn; a 1 or 2-pixel column of shade on the right end is enough.
- Things at or above eye level (a lamp's lantern, a sign, a roof ridge) are drawn from the front, with no top plane.
- A prop seen only from the front, as a flat cut-out, is wrong.

## Line and shading

- **Outlines.** People and standing props have a closed 1-pixel ink outline around the silhouette, base line included.
  Closed means closed: no coloured pixel touches an empty pixel or the edge of the sprite's box, so leave a row or column free for the ink.
  Round the corners by dropping the corner pixel; nothing in this town has a sharp square corner except a wall.
- **Ink inside a sprite** separates major parts that overlap: head over body, hat brim over face, roof over wall, seat over backrest.
- **Detail inside one part** uses that part's own dark shade: `wood.0` around a window, `brick.0` under a course of roof tiles, the shirt's shade under an arm.
- **Terrain and flat props have no ink at all.** Their darkest line is the dark end of their own ramp.
- **Light comes from the upper left.** Top and left faces take the light tone, right and bottom faces the shade.
  Highlights are small (a lip, a glint, a 1-pixel rim on a leaf lobe); shade may be broader on the lower right.
- **Flat colour.** No gradients, no dithering, no anti-aliasing, no pillow shading.
- **No cast shadows in sprites.** The renderer draws them: a flat ink ellipse at about 22% under every person and standing prop, and a 2-pixel strip along the base of a building. The style key shows the midday version.
- **Calm ground.** A grass tile carries two or three small marks (a `moss.1` tuft, a `moss.3` blade), never a speckle. Large areas must stay quiet so that people stand out.
- **No visible grid.** A material that covers many tiles needs at least three variants whose marks sit on different rows and columns. Check the mixed view of `pnpm sheet terrain`: no seams, no repeat that draws the eye.
- **No faces by accident.** Two marks side by side on a round shape read as eyes. Leave round shapes plain.

## Ground

- `grass` has three variants; the renderer mixes them by tile position.
- `cobble` is the town's pale paving, for squares and streets. A tile opens with a full course of stones, so a road never starts on a half-cut row. About one glint per tile.
- `dirt` is a trodden footpath: flat `cream.0` with at most three marks per tile (a `wood.2` scuff, a `cream.1` pebble). It may be one tile wide, and it should wander: turn it every two or three tiles.
- A door that opens onto a lawn gets the `stepping-stones` flat prop, one tile per step. Never pave a one-tile spur to a door.
- Edges are fringes: thin pieces that a higher-priority terrain draws on its neighbours. Priorities are `dirt` 0, `cobble` 1, `grass` 2, water 3.
- **The turf edge.** Grass creeps over paving and dirt in lumps 1, 2 and 3 pixels deep, in runs of uneven length. Never a regular wave: it reads as battlements.
  Each side has three interchangeable strips, which the renderer picks per tile, so a long edge does not repeat every 16 pixels. Every strip starts and ends 2 pixels deep, so any strip joins any other.
  One line of darker green closes the edge: `moss.1` where it faces the light (north and west), `moss.0` where it faces away. Inner corners (`in-ne` and friends) add a wedge of grass that rounds the bend.

### Which grounds may touch

A fringe exists only where the table says yes; any other pair meets in a hard, ugly seam.

| | `cobble` | `dirt` | `water` | `basin` |
|---|---|---|---|---|
| `grass` | yes: turf edge | yes: turf edge | yes: the pond's bank | yes, in a garden |
| `cobble` | | end-on only | no | yes: the stone rim |
| `dirt` | | | no | no |
| `water` | | | | no |

- "End-on only": a dirt path may run into paving across the width of the path. Dirt and paving never run side by side.
- Where the table says no, put at least one tile of grass between the two.
- New terrain (sand, flower bed, planks) must say which row and column of this table it joins, and bring the fringe for it.

## Water

- Water is flat `sky.1`. Each of the four variants carries one or two `sky.2` ripples of different lengths (2 to 5 pixels), on rows and columns no other variant uses. More than two per tile reads as confetti. One variant may have a single `steel.5` sparkle.
- Water shimmers slowly: each variant is a 4-frame animation in `anims`, at 2 frames a second, in which the ripples slide 2 pixels to the right and back. Ripples keep 2 pixels clear of the tile's sides so the slide never splits one. Nothing else in the water moves.
- **Shores curve.** The water spills 8 pixels into its neighbours, outer corners are quarter discs, and the `in-*` pieces round the tip of land where the shore turns inwards. Lay a pond as a blob: step its outline one tile at a time, keep it at least two tiles across everywhere, and avoid a straight shore longer than four tiles.
- **`water` is a natural pond**, for meadows and parks: grass, a 1-pixel `moss.0` lip, then the water. Along the north and west banks the land throws a 2-pixel `sky.0` shadow on the water; along the south and east banks there is a 1-pixel `sky.2` line of foam instead.
- **`basin` is the same water in a rim of pale stone**, for squares and gardens: a `steel.2` outer line, a 3-pixel `steel.4` top with `steel.3` joints, shadow and foam as above. Basins are rectangles with rounded corners and sit on paving.
- Lily pads and reeds are flat props placed on water tiles, away from the shore pieces.

## People

People are built by the kit in `src/art/characters/kit.ts`: a shared body in role letters, plus three head grids per person (facing down, up and right; left is right mirrored).

- **Two heads tall.** The head, hair included, is 12 rows; the body is 10. Do not grow the body to add detail.
  In the kit, a head grid is 14 rows: 2 spare rows on top for a bun or a hat, then the 12 rows of the head, the last of which is the chin's ink line. A body grid is 11 rows: 1 row that the chin covers, then the 10 rows of the body. Together they fill the 24-row box, overlapping by that one row.
- **Faces.** Two ink eyes, each 1 pixel wide and 2 tall, on rows 9 and 10 of the box, at columns 5 and 10 when facing the viewer.
  No nose, no mouth.
- **Cheeks.** One pixel per cheek, on the row under the eyes: `rose.1` on `skin.a` and `skin.b`, `rose.0` on `skin.c`. Every skin tone gets them or none does.
- **Hair** has a base, and where the ramp allows a shade and a light:

  | Hair | Shade | Base | Light |
  |------|-------|------|-------|
  | Brown | `wood.0` | `wood.1` | `wood.2` |
  | Black | none | `steel.1` | `steel.2` |
  | White or grey | `steel.4` | `steel.5` | none |
  | Blond | `ochre.1` | `ochre.2` | `ochre.3` |
  | Ginger | `ochre.0` | `ochre.1` | `ochre.2` |

  Black hair has a base and a light only: never map a hair role to `steel.0`, because ink is not a fill.
  The light is a short sheen on the upper-left of the crown. Keep the back of a head plain: a streak and a dot there read as a face.
- **Silhouette first.** Each person must be recognisable as a black shape: a bun, a straw hat, long hair, a chin tuft, a skirt.
  Hair and hats may use the two rows above the head and may hang over the shoulders.
- **Colour second.** One strong colour for the top, a different one for the legs, and at most one small accent (a ribbon, a hat band). Avoid `moss.2` and `cream.1` in clothes: they are the ground.
- **Bodies are plain.** No buttons, belts or pockets. A sleeve is separated from the chest by one pixel of the top's shade.
- **Facial hair stays small.** A beard is a tuft on the chin, 4 pixels wide and 2 tall, with a row of skin above it and skin on both sides; from the side it is 2 pixels at the chin. A wider or higher patch of white reads as a grin or a mask. A sideburn is 1 pixel wide and 2 tall.
- **Idle** is two frames: the head settles by 1 pixel on the second.
- **Walk** is four frames: step, stand, other step, stand.
  A step must change the silhouette, or it reads as jitter on a projector.
  Facing the viewer or away: the head and body drop 1 pixel, the landing foot is 3 pixels wide and low, the other leg stays in its own column and ends one row higher, and the arms swing against the legs (one hand 2 pixels up, the other 1 pixel down).
  Facing sideways: the front foot reaches ahead on a baseline 1 pixel above the ground, the back foot stays on the ground behind, and the hand swings out past the body, in front on one stride and behind on the other.
- All three skin tones are in the reference cast; keep it that way as the cast grows.

## Buildings

A building is a roof, a wall and a plinth, assembled from small pieces (see `src/art/buildings/index.ts`).

### Roofs

- Every roof shows its long slope to the viewer, with the ridge running left to right. We do not draw a triangular gable facing the viewer: tile courses stay horizontal across the whole town.
- **The face.** Courses are 5 pixels tall. Tiles are 6 to 9 pixels wide so that no two courses line up. Some tiles hang with a rounded bottom and some with a straight one, so the shade lines under the courses never settle into a regular wave. About one tile in three has a lit lip, and a lip spans its own tile, from joint to joint. No full grid of joints: a roof must read as tiles, never as a brick wall or as stripes.
- **Blue roofs stay calm.** On a `sky` roof keep the lit lips on one course in three, or the roof sparkles like the pond.
- **Wide roofs.** The roof face is 80 pixels wide. On a wider building, continue it from its left edge again but two courses (10 pixels) further down, so the join never lines up, and stand a chimney or a dormer on the join. No building is wider than ten tiles.
- **The ridge** is a cap of the ramp's light tone, 3 pixels tall, with a joint every 7 pixels and a shade line under it.
- **The eave** is the bottom 5 rows: a lit lip, two rows of base, a shade line, ink. It covers the top 2 pixels of the wall.
- **Overhang.** The roof is 3 pixels wider than the wall on each side.
- **Gable roof** (the cottage): straight sides, finished with 2-pixel bargeboards, `cream.2` on the lit left and `cream.0` on the shaded right. 40 to 44 tall on a one-storey house, about 1.4 times the wall.
- **Hip roof** (the townhouse): each side leans in 8 pixels between the eave and the ridge, in steps of 1 pixel every 4 rows. No bargeboards: a 2-pixel band of the roof's light tone runs up the left edge and of its shade up the right. 36 to 40 tall.
- **Two storeys.** The roof does not grow with the building: keep it 36 to 40 tall, about two thirds of the wall. Prefer a hip roof on tall buildings; it keeps them from looming.
- **Narrow buildings** (three tiles or less) take a roof of 32 to 36.
- **Colour.** Red (`brick`) is the default; orange (`ochre`) and blue (`sky`) are the alternatives. Recolour the whole roof ramp for ramp; do not mix.
- A chimney stands on the slope, right of centre, and clears the ridge by 6 pixels.

### Walls

- Walls are `cream.2` plaster, or `ochre.3` for a pale yellow house, with a `cream.1` shadow 4 pixels deep under the eave and a `steel` plinth.
- A cottage has a `wood` timber frame: a beam under the eave and posts at the corners and beside the door, each 4 pixels wide.
- A plain plastered house marks its storeys with a 2-pixel string course and may hang `teal` or `plum` shutters beside the upstairs windows.
- **Doors** are painted a strong colour or left in varnished wood, with inset panels (shade on the top and left of a panel, light on the bottom and right) and a brass knob in `ochre.2`.
- **Windows** by day are `sky.1` glass with a `sky.0` shadow along the top of each pane and a small `sky.2` glint, in a `wood.0` frame.
  A window box of flowers is welcome on the ground floor.

### Shops, the school, the hall

A teaching town needs a few buildings that are not houses.
They are built from the same pieces and the same rules; each gets one feature that names it, and no other ornament.

- **Shop.** A house with a wide shop window (two windows side by side, sharing a sill) and a striped awning over window and door: stripes 4 pixels wide, `steel.5` and one strong colour, 8 to 10 pixels tall, with a shaded lower edge. A hanging sign, about 12x10 on an iron bracket, shows an icon of two or three colours (a loaf, a book, a boot). Signs never carry lettering: it cannot be read at this size.
- **School.** One storey, seven or eight tiles wide, under a gable roof. Tall windows (the usual window with a third row of panes), a double door in the middle (two doors side by side, 32 wide), and a small bell turret on the ridge.
- **Hall.** The one landmark of a town, and the only building that may rise above two storeys: two storeys and a hip roof, plus a clock turret in the middle, to at most nine tiles (144 pixels) in all. One per town. It sits on the square.
- Everything else (a cafe, a clinic, a library) is a house or a townhouse with a sign and at most one extra: an awning, a bench, a planter.

## Nature

- **Trees are built from lobes.** Three to five overlapping leaf lobes over a darker mass, never a single ball and never mirror-symmetric.
  Lay the lobes off-grid: one larger crown lobe left of centre, a smaller lobe tucked under it on the right, lower lobes of different widths. Never four lobes in a 2x2 block.
  Each lobe is flat `moss.1`, with its own `moss.0` underside where it overhangs the lobe below. The undersides meet in T-junctions; they never cross in a "+", which reads as a quartered ball.
- **The lit rim is thin.** `moss.2` is the grass colour, so a wide band of it inside the outline reads as lawn and the canopy dissolves. The sunlit rim is 1 pixel inside the ink along the upper-left silhouette, never more than 2, with a few `moss.3` pixels at the top-left tips.
- **The outline is always closed**, all the way round the canopy and the trunk.
- No dots, ovals or dashes inside a lobe.
- A hedge or a bush follows the same recipe.
- Trunks are short and fat: `wood.2`, `wood.1`, `wood.0` in three vertical bands from left to right, darker where the canopy shades them.
- **Flowers come in clusters of one colour**: poppies (`brick.1`), daisies (`steel.5`), buttercups (`ochre.2`), pinks (`rose.1`), each with a contrasting heart and a few `moss.1` leaves.
- Flowers, lily pads and stepping stones are flat props: no ink, no footprint, drawn under people.
- A flat prop made of stone or wood sits on a base of its own dark tone along its lower edge (stepping stones: `cream.1` on `cream.0`), or it floats over the lawn.

## Fences and other long things

- A fence is waist-high on a person: 10 to 12 pixels, never taller than a body.
- Posts are 4 pixels wide with their outline and rounded on top; two rails, each 2 pixels tall, `wood.2` with a `wood.1` underside. No 1-pixel rails or pickets.
- Rails leave both sides of the tile on the same rows, so segments join without a seam. A run ends on a post.
- A hedge follows the tree recipe: flat `moss.1`, a 1-pixel lit rim along the top-left, a `moss.0` underside, a closed ink outline.
- Anything that repeats along a street (fence, hedge, wall, kerb) needs an end piece and must look right three tiles long and ten tiles long.

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
- Reuse the reference pieces: the window, the door, the roof face, the kit body, the shores. `docs/style/pieces.png` shows them at x8.
- Look at your sprite in the style key's company, at x4, from across the room.
- Lay walk frames side by side and check that they read as walking.

Do not:

- Use ink as a fill (not even as a hair shade), or leave an outline open.
- Put a band of `moss.2` wider than 2 pixels inside a tree or a hedge.
- Use `moss.2` or `cream.1` as the main colour of a standing prop or of clothing.
- Dither, anti-alias, or shade with more than three tones of one ramp.
- Speckle the ground, repeat one tile across a field, or draw an edge as a regular wave.
- Paint a cast shadow into a sprite.
- Draw thin things: a 1-pixel fence rail, a 1-pixel limb.
- Draw a prop as a flat front view when its top would be visible.
- Give a person a small head, a mouth, or realistic proportions.
- Light anything from the right.

## Checklist before you call a sprite done

1. Rendered and looked at, at x4, next to the style key.
2. Correct size and anchor (the contract test checks this).
3. Bright: each material's base is the middle or light tone of its ramp; the dark tone is only shade. Iron is the one exception.
4. Chunky: no part thinner than 2 pixels, corners rounded.
5. Closed ink outline on people and standing props, with no coloured pixel on the edge of the box; no ink on terrain and flat props.
6. Light from the upper left, at most three tones per material.
7. It does not use the ground colours as its own.
8. Its top plane shows, if it has one below eye level.
9. Nothing in it repeats on a visible grid.
10. Anything that glows has an emissive layer.
11. It still reads when you squint.
