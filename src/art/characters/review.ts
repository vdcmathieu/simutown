/**
 * Review casts: one throwaway character per kit part, so `tools/characters-parts.ts` can
 * lay the whole library out on a sheet and the tests can check every part for open
 * outlines. Nothing here is registered as a townsperson.
 */
import type { CharacterDef } from '../../core/types';
import { type HairColor } from './colors';
import { CHARACTER_OPTIONS, type CharacterSpec, makeCharacter } from './make';

const O = CHARACTER_OPTIONS;
const HAIRS: HairColor[] = O.hair;

const base = (id: string, more: Partial<CharacterSpec>): CharacterDef =>
  makeCharacter({ id, name: id, skin: 'a', head: 'short', top: { kind: 'shirt', color: 'teal' }, ...more });

/** Every hair style (cycling through hair colours and skin tones), every hat, and the face parts. */
export function reviewHeads(): CharacterDef[] {
  const skins = O.skin;
  const hairs = O.head.map((head, i) => base(`head-${head}`, { head, hair: HAIRS[i % HAIRS.length], skin: skins[i % skins.length], accent: 'pink' }));
  // each hat over a short, a long and a wide hair style, to show what it leaves visible
  const under = ['short', 'long', 'curls', 'bald'] as const;
  const hats = O.hat.flatMap((kind, i) =>
    under.map((head, j) => base(`hat-${kind}-on-${head}`, { head, hair: HAIRS[(i + j) % HAIRS.length], skin: skins[(i + j) % skins.length], hat: { kind }, accent: 'blue' })),
  );
  const face = [
    base('face-glasses', { accessories: { glasses: true } }),
    base('face-glasses-dark', { skin: 'c', head: 'curls', hair: 'black', accessories: { glasses: true } }),
    base('face-beard', { skin: 'c', head: 'balding', hair: 'white', beard: true }),
    base('face-beard-brown', { skin: 'b', head: 'flattop', beard: true, accessories: { glasses: true } }),
    base('face-scarf', { head: 'long', hair: 'blond', accessories: { scarf: 'red' } }),
    base('face-scarf-child', { body: 'child', head: 'spiky', accessories: { scarf: 'yellow' } }),
  ];
  return [...hairs, ...hats, ...face];
}

/** Every top on every kind of legs, every body shape, and the body accessories. */
export function reviewOutfits(): CharacterDef[] {
  const out: CharacterDef[] = [];
  for (const kind of O.top) {
    for (const bottom of O.bottom) {
      if (kind === 'dress' && bottom !== 'skirt') continue;
      out.push(
        base(`top-${kind}-${bottom}`, {
          top: { kind, color: kind === 'coat' ? 'white' : 'blue' },
          bottom: kind === 'dress' ? undefined : { kind: bottom, color: 'brown' },
          accent: 'yellow',
        }),
      );
    }
  }
  for (const body of O.body) {
    out.push(base(`body-${body}`, { body, top: { kind: 'sweater', color: 'red' } }));
    out.push(base(`body-${body}-dress`, { body, head: 'bob', top: { kind: 'dress', color: 'purple' } }));
    out.push(base(`body-${body}-apron`, { body, top: { kind: 'apron', color: 'orange' }, bottom: { kind: 'shorts', color: 'navy' } }));
    out.push(base(`body-${body}-kit`, { body, top: { kind: 'coat', color: 'tan' }, accessories: { bag: 'brown', cane: true, scarf: 'teal' } }));
    out.push(base(`body-${body}-overalls`, { body, top: { kind: 'overalls', color: 'yellow' }, bottom: { kind: 'skirt', color: 'blue' }, accessories: { bag: 'red' } }));
  }
  return out;
}
