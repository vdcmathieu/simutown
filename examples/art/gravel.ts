// examples/art/gravel.ts - a new ground: tile variants, a priority and a fringe.
import { art, ground, sprite, straightEdge, type TerrainDef } from 'simutown';

// Marks are tiny sprites stamped on a flat base colour; no ink on terrain.
const pebble = sprite(`
  .5.
  433
`);
const grit = sprite(`
  3.3
`);

// Four variants whose marks sit on different rows and columns, so a large area shows no grid.
// The renderer picks one per tile from its position.
const looks = [
  ground('steel.4', [pebble, 3, 3], [grit, 10, 11]),
  ground('steel.4', [grit, 6, 6]),
  ground('steel.4', [pebble, 11, 1], [grit, 1, 13]),
  ground('steel.4'),
];

export const gravel: TerrainDef = {
  id: 'gravel',
  variants: looks,
  // Above cobble (1) and dirt (0), below grass (4): grass creeps over gravel with its turf
  // edge, and gravel draws its own edge on cobble and dirt.
  priority: 1.5,
  // A straight border, pale on the lit sides (north, west) and slate on the shaded ones.
  fringe: straightEdge('steel.5', 'steel.3'),
};

art.terrain.gravel = gravel;
