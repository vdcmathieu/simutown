import { sprite } from '../../core/sprite';
import type { TerrainDef } from '../../core/types';

// Reference tiles from the pin. They set the level of detail; improve and extend them,
// but keep the ids `grass` and `cobble` (fixtures and tests use them).

const grass = sprite(`
  hhhhhhhhhhhhhhhh
  hhhihhhhhhhhghhh
  hhihhhhhhhhhhhhh
  hhhhhhhhhihhhhhh
  hhhhhghhhhihhhhh
  hhhhhhhhhhhhhhhh
  hihhhhhhhhhhhhih
  hhhhhhhhhhhhhihh
  hhhhhhhihhhhhhhh
  hhghhhhhihhhhhhh
  hhhhhhhhhhhhhhhh
  hhhhhhhhhhhhghhh
  hhhhihhhhhhhhhhh
  hhhihhhhhhhhhhhh
  hhhhhhhhhhihhhhh
  hhhhhhhhhhhhhhhh
`);

const cobble = sprite(`
  4332433243324332
  3332333233323332
  3332333233323332
  2222222222222222
  3243324332433243
  3233323332333233
  3233323332333233
  2222222222222222
  4332433243324332
  3332333233323332
  3332333233323332
  2222222222222222
  3243324332433243
  3233323332333233
  3233323332333233
  2222222222222222
`);

export const terrain: Record<string, TerrainDef> = {
  grass: { id: 'grass', variants: [grass], priority: 2 },
  cobble: { id: 'cobble', variants: [cobble], priority: 1 },
};
