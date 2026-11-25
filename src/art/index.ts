import type { ArtRegistry } from '../core/types';
import { buildings } from './buildings';
import { characters } from './characters';
import { natureProps } from './nature';
import { streetProps } from './street';
import { terrain } from './terrain';
import { emotes, font } from './ui';

export { buildings, characters, emotes, font, natureProps, streetProps, terrain };

/** The built-in art: everything Simutown can draw out of the box. */
export const art: ArtRegistry = {
  terrain,
  props: { ...natureProps, ...streetProps, ...buildings },
  characters,
  emotes,
  font,
};
