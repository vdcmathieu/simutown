import type { ArtRegistry } from '../core/types';
import { buildings } from './buildings';
import { characters } from './characters';
import { natureProps } from './nature';
import { streetProps } from './street';
import { terrain } from './terrain';
import { emotes, font } from './ui';

export { buildings, characters, emotes, font, natureProps, streetProps, terrain };

// The kits scene authors use to make their own art.
export { makeBuilding } from './buildings';
export type { BuildingSpec } from './buildings';

/** The built-in art: everything Simutown can draw out of the box. */
export const art: ArtRegistry = {
  terrain,
  props: { ...natureProps, ...streetProps, ...buildings },
  characters,
  emotes,
  font,
};
