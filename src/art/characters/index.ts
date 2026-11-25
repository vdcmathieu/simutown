import type { CharacterDef } from '../../core/types';
import { person } from './kit';

// The reference townsfolk of Willow Square. Keep the id `ana` (fixtures and tests use it).
// See kit.ts for the role letters.

const ana = person({
  id: 'ana',
  name: 'Ana',
  legend: {
    S: 'skin.a.1', K: 'skin.a.0', B: 'rose.1',
    H: 'wood.1', D: 'wood.0', L: 'wood.2',
    T: 'teal.1', U: 'teal.0',
    P: 'plum.0', Q: 'steel.1',
    F: 'wood.0',
    R: 'rose.0', // the ribbon under her bun
  },
  head: {
    down: `
      ......0000......
      .....0HLHH0.....
      ....00RRRR00....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHD0.
      .0HHHSSHHHSSHD0.
      .0HHSSSSSSSSHD0.
      .0HSS0SSSS0SSD0.
      .0HSS0SSSS0SSD0.
      ..0SBSSSSSSBS0..
      ...0SSSSSSSS0...
      ....00000000....
    `,
    up: `
      ......0000......
      .....0HLHH0.....
      ....00RRRR00....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHD0.
      .0HHHHHHHHHHHD0.
      .0HHHHHHHHHHHD0.
      .0HHHHHHHHHHDD0.
      .0DHHHHHHHHDDD0.
      ..0DDHHHHDDDD0..
      ...0DDDDDDDD0...
      ....00000000....
    `,
    right: `
      ......0000......
      .....0HLHH0.....
      ....00RRRR00....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHSSHH0.
      .0DHHHHHSSSSSS0.
      .0DHHHHSSSS0SS0.
      .0DDHHHSSSS0SS0.
      ..0DDHSSSSSSB0..
      ...0DDSSSSSS0...
      ....00000000....
    `,
  },
});

const tomas = person({
  id: 'tomas',
  name: 'Tomas',
  legend: {
    S: 'skin.c.1', K: 'skin.c.0', B: 'skin.c.1',
    H: 'steel.5', D: 'steel.4', L: 'steel.5',
    T: 'brick.1', U: 'brick.0',
    P: 'sky.0', Q: 'steel.1',
    F: 'wood.0',
    // straw hat: light, base, shade, band
    Y: 'ochre.3', A: 'ochre.2', Z: 'ochre.1', R: 'brick.1',
  },
  head: {
    down: `
      ................
      .....000000.....
      ....0YYAAAA0....
      ...0RRRRRRRR0...
      .00YYAAAAAAAZ00.
      0YAAAAAAAAAAAAZ0
      .00000000000000.
      ..0HSSSSSSSSH0..
      ..0SSSSSSSSSS0..
      ..0SS0SSSS0SS0..
      ..0SS0SSSS0SS0..
      ..0HHSSSSSSHH0..
      ...0HHHHHHHH0...
      ....00000000....
    `,
    up: `
      ................
      .....000000.....
      ....0YYAAAA0....
      ...0RRRRRRRR0...
      .00YYAAAAAAAZ00.
      0YAAAAAAAAAAAAZ0
      .00000000000000.
      ..0HHHHHHHHHD0..
      ..0HHHHHHHHHD0..
      ..0HHHHHHHHDD0..
      ..0SDDDDDDDDS0..
      ..0SSSSSSSSSS0..
      ...0SSSSSSSS0...
      ....00000000....
    `,
    right: `
      ................
      .....000000.....
      ....0YYAAAA0....
      ...0RRRRRRRR0...
      .00YYAAAAAAAZ00.
      0YAAAAAAAAAAAAZ0
      .00000000000000.
      ..0HHHSSSSSSS0..
      ..0HHSSSSSSSS0..
      ..0HHSSSSS0SS0..
      ..0SSSSSSS0SS0..
      ..0SSSSSHHHHH0..
      ...0SSSHHHHH0...
      ....00000000....
    `,
  },
});

const mira = person({
  id: 'mira',
  name: 'Mira',
  body: 'dress',
  legend: {
    S: 'skin.b.1', K: 'skin.b.0', B: 'rose.1',
    H: 'steel.1', D: 'steel.0', L: 'steel.2',
    T: 'steel.5', U: 'steel.4',
    P: 'rose.1', Q: 'rose.0',
    F: 'brick.0',
  },
  // long hair: the head grids run past row 14 and hang over the shoulders
  head: {
    down: `
      ................
      ................
      ....00000000....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHSSSSHHHH0.
      .0HHSSSSSSSSHH0.
      .0HSS0SSSS0SSH0.
      .0HSS0SSSS0SSH0.
      .0HSBSSSSSSBSH0.
      .0HH0SSSSSS0HH0.
      .0HH00000000HH0.
      .0HH0......0HH0.
      ..00........00..
    `,
    up: `
      ................
      ................
      ....00000000....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHLHHHHHHHHH0.
      .0HHLHHHHHHDHH0.
      .0HHHLHHHHHDHH0.
      ..0HHHHHHHHHH0..
      ...0000000000...
    `,
    right: `
      ................
      ................
      ....00000000....
      ...0HHHHHHHH0...
      ..0HLLHHHHHHH0..
      .0HLHHHHHHHHHH0.
      .0HHHHHHHHHHHH0.
      .0HHHHHHHHHSSH0.
      .0HHHHHHHSSSSS0.
      .0HHHHHHSSS0SS0.
      .0HHHHHHSSS0SS0.
      .0HHHHHHSSSSSB0.
      .0HHHHHHSSSSS0..
      .0HHHHH0000000..
      ..0HHHH0........
      ..0HHHH0........
      ...0000.........
    `,
  },
});

export const characters: Record<string, CharacterDef> = { ana, tomas, mira };
