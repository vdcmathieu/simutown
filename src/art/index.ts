import type { ArtRegistry } from '../core/types';
import { buildings } from './buildings';
import { characters } from './characters';
import { interiorProps, interiorTerrain } from './interior';
import { natureProps } from './nature';
import { streetProps } from './street';
import { terrain } from './terrain';
import { emotes, font } from './ui';

export { buildings, characters, emotes, font, interiorProps, interiorTerrain, natureProps, streetProps, terrain };

// The kits scene authors use to make their own art.
export { makeBuilding } from './buildings';
export type { BuildingSpec } from './buildings';
export { CHARACTER_OPTIONS, makeCharacter, person, townsfolk } from './characters';
export type { CharacterSpec, PersonSpec, Townsperson } from './characters';
// The helpers for new grounds (docs/making-art.md): marks on a flat tile, and the usual edges.
export { ground } from './terrain/ground';
export { driftEdge, recolorFringe, straightEdge, turf } from './terrain/edges';

/** The built-in art: everything Simutown can draw out of the box. */
export const art: ArtRegistry = {
  terrain: { ...terrain, ...interiorTerrain },
  props: { ...natureProps, ...streetProps, ...buildings, ...interiorProps },
  characters,
  emotes,
  font,
};
