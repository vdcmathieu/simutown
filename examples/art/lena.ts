// examples/art/lena.ts - a new townsperson from named choices.
import { art, makeCharacter } from '../../src';

export const lena = makeCharacter({
  id: 'lena',
  name: 'Lena',
  skin: 'b',
  head: 'bob',
  hair: 'ginger',
  top: { kind: 'apron', color: 'teal' },
  bottom: { kind: 'skirt', color: 'indigo' },
  accessories: { glasses: true },
});

// Register her in the built-in registry, so that scenes, the CLI and the gallery can all use her.
art.characters.lena = lena;
