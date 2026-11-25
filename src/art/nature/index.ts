import type { Sprite } from '../../core/sprite';
import type { PropDef } from '../../core/types';
import {
  buttercups,
  cabbages,
  clover,
  cornflowers,
  daisies,
  fern,
  grassTuft,
  grassTuftSmall,
  leaves,
  mushrooms,
  mushroomsBrown,
  pebbles,
  pinks,
  poppies,
  pumpkins,
  sprouts,
  steppingStones,
  tulips,
  tulipsPink,
  tulipsYellow,
  violets,
} from './patches';
import { log, rock, rockLarge, stump } from './rocks';
import { bush, bushLarge, hedge, hedgeH, hedgeHL, hedgeHR, hedgeSE, hedgeSW, hedgeV } from './shrubs';
import { fruitTree, oak, pine, sapling, tree, willow, willowSway } from './trees';
import { lily, lilyPads, lotus, reeds, reedsSmall, waterRocks } from './water-plants';

// The nature of the town: trees, bushes and hedges, rocks and dead wood, flat patches for
// lawns and garden beds, and plants for the water.
//
// Standing props are solid on their footprint and are anchored so that the trunk (or the
// left end of a wide prop) stands on the origin tile; a canopy overhangs its neighbours
// and people can walk behind it. Flat props have no footprint and lie under people.

/** A standing prop that blocks `w` tiles, starting at its origin tile. */
function standing(id: string, sprite: Sprite, w = 1): PropDef {
  return { id, sprite, footprint: { w, h: 1 } };
}

/** A flat patch: part of the ground, walked over. */
function patch(id: string, sprite: Sprite): PropDef {
  return { id, sprite, flat: true };
}

const defs: PropDef[] = [
  // trees: the trunk tile is solid
  standing('tree', tree),
  // the willow sways: one slow change of frame, about every second and a half
  { ...standing('willow', willow), anim: { frames: [willow, willowSway], fps: 0.7 } },
  standing('oak', oak),
  standing('pine', pine),
  standing('fruit-tree', fruitTree),
  standing('sapling', sapling),
  // bushes and hedges
  standing('bush', bush),
  standing('bush-large', bushLarge, 2),
  standing('hedge', hedge),
  standing('hedge-h', hedgeH),
  standing('hedge-h-l', hedgeHL),
  standing('hedge-h-r', hedgeHR),
  standing('hedge-v', hedgeV),
  standing('hedge-sw', hedgeSW),
  standing('hedge-se', hedgeSE),
  // stone and dead wood
  standing('rock', rock),
  standing('rock-large', rockLarge, 2),
  standing('stump', stump),
  standing('log', log, 2),
  // flowers
  patch('flowers', poppies),
  patch('flowers-white', daisies),
  patch('flowers-yellow', buttercups),
  patch('flowers-pink', pinks),
  patch('flowers-blue', cornflowers),
  patch('flowers-purple', violets),
  patch('tulips', tulips),
  patch('tulips-yellow', tulipsYellow),
  patch('tulips-pink', tulipsPink),
  // greenery on the ground
  patch('grass-tuft', grassTuft),
  patch('grass-tuft-small', grassTuftSmall),
  patch('clover', clover),
  patch('fern', fern),
  // the kitchen garden, for `soil`
  patch('cabbages', cabbages),
  patch('sprouts', sprouts),
  patch('pumpkins', pumpkins),
  // odds and ends
  patch('mushrooms', mushrooms),
  patch('mushrooms-brown', mushroomsBrown),
  patch('leaves', leaves),
  patch('pebbles', pebbles),
  patch('stepping-stones', steppingStones),
  // on the water
  patch('lily', lily),
  patch('lily-pads', lilyPads),
  patch('lotus', lotus),
  patch('reeds', reeds),
  patch('reeds-small', reedsSmall),
  patch('water-rocks', waterRocks),
];

export const natureProps: Record<string, PropDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
