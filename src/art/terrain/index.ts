import type { TerrainDef } from '../../core/types';
import { driftEdge, recolorFringe, straightEdge, turf } from './edges';
import { dirtTiles, grassTiles, meadowTiles, sandTiles, tallGrassTiles } from './ground';
import { cobbleTiles, plankTiles, plankUprightTiles, roadTiles, soilTiles } from './paving';
import { basinRim, pondBank } from './shores';
import { waterLooks, waterShimmer } from './water';

// The ground of the town. Every material is a flat, bright base colour and a handful of
// deliberate marks; edges are fringes that a higher-priority terrain draws on its
// lower-priority neighbours. Keep the ids `grass` and `cobble` (fixtures and tests use them).
//
// Priority order, low to high. A terrain creeps over everything below it:
//
//   0  dirt         a footpath; no edge of its own
//   1  cobble       the pale paving of the square; no edge of its own
//   2  road         grey flagstones; a kerb line on cobble and dirt
//   3  soil         a garden bed; a crumbling dark border on road, cobble and dirt
//   4  grass        the lawn; the turf edge on everything above
//   4  meadow       the lawn with wild flowers; the turf edge too, and no edge against grass
//   5  tall-grass   stands above the lawn; a turf edge in deeper green
//   6  water        a natural pond or stream; its bank curves into the land
//   6  basin        the same water in a stone rim
//   7  sand         a beach or a sandpit; drifts over the land and into the water
//   8  plank        a deck; a straight wooden edge with a front face, over anything
//   8  plank-v      the same deck with its boards running north-south

// Sand spills over its neighbours in shallow tongues, closed by a line of darker, wet sand.
const sandDrift = driftEdge('ochre.3', 'cream.0');
// Tall grass borrows the turf edge, one tone down: a moss.1 lump, shaded moss.0 on the far side.
const tallGrassEdge = recolorFringe(turf, { 'moss.2': 'moss.1' });
// A bed's border: the turf lumps in earth, closed all round by its dark tone.
const soilBorder = recolorFringe(turf, { 'moss.2': 'wood.1', 'moss.1': 'wood.0', 'moss.0': 'wood.0' });
// A road's kerb: a pale line where it faces the light, a slate line where it faces away.
const kerb = straightEdge('steel.3', 'steel.2');
// A deck's edge, with a front face 2 pixels tall on a dark base line.
const deckEdge = straightEdge('wood.1', 'wood.0', 2);

export const terrain: Record<string, TerrainDef> = {
  dirt: { id: 'dirt', variants: dirtTiles, priority: 0 },
  cobble: { id: 'cobble', variants: cobbleTiles, priority: 1 },
  road: { id: 'road', variants: roadTiles, priority: 2, fringe: kerb },
  soil: { id: 'soil', variants: soilTiles, priority: 3, fringe: soilBorder },
  grass: { id: 'grass', variants: grassTiles, priority: 4, fringe: turf },
  meadow: { id: 'meadow', variants: meadowTiles, priority: 4, fringe: turf },
  'tall-grass': { id: 'tall-grass', variants: tallGrassTiles, priority: 5, fringe: tallGrassEdge },
  // A natural pond: a grass bank that curves. See shores.ts.
  water: { id: 'water', variants: waterLooks, anims: waterShimmer, solid: true, priority: 6, fringe: pondBank },
  // The same water in a stone rim, for squares and gardens.
  basin: { id: 'basin', variants: waterLooks, anims: waterShimmer, solid: true, priority: 6, fringe: basinRim },
  sand: { id: 'sand', variants: sandTiles, priority: 7, fringe: sandDrift },
  plank: { id: 'plank', variants: plankTiles, priority: 8, fringe: deckEdge },
  'plank-v': { id: 'plank-v', variants: plankUprightTiles, priority: 8, fringe: deckEdge },
};
