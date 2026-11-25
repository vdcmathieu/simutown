/**
 * Windows. By day: sky glass with a shadow along the top of each pane and a small glint,
 * in a dark wood frame. Lit: only the glass, in lamplight with a pale core, so the bars
 * read dark against the glow.
 */
import { sprite, type Sprite } from '../../core/sprite';
import { litFrom, type Part, WARM } from './canvas';

/**
 * - `four-pane`: the approved window, 15x13: four panes of 5x4 and a sunlit sill.
 * - `tall`: the same with a third row of panes, 15x18. Ground floor only (schools, halls).
 * - `shop`: two windows side by side sharing a sill, 28x13. Ground floor only.
 * - `round`: an 11x11 attic window. Small walls, upper storeys and dormers.
 */
export type WindowKind = 'four-pane' | 'tall' | 'shop' | 'round';
/**
 * How a window looks when the lights are on.
 * `warm` is plain lamplight, `curtains` adds drawn-back drapes, `dark` stays unlit:
 * nobody home, or already asleep. A street with all three feels inhabited.
 */
export type LitLook = 'warm' | 'curtains' | 'dark';

export const WINDOW_KINDS: readonly WindowKind[] = ['four-pane', 'tall', 'shop', 'round'];
export const LIT_LOOKS: readonly LitLook[] = ['warm', 'curtains', 'dark'];

const FOUR_PANE = `
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u9ff99u.
  .u9f999u9f999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u99999u.
  .u9f999u99999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  wwwwwwwwwwwwwww
  uuuuuuuuuuuuuuu
`;

const TALL = `
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u9ff99u.
  .u9f999u9f999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u9ff99u99999u.
  .u9f999u99999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  .u88888u88888u.
  .u99999u9ff99u.
  .u99999u9f999u.
  .u99999u99999u.
  .uuuuuuuuuuuuu.
  wwwwwwwwwwwwwww
  uuuuuuuuuuuuuuu
`;

const SHOP = `
  .uuuuuuuuuuuuuuuuuuuuuuuuuu.
  .u88888u88888uu88888u88888u.
  .u9ff99u9ff99uu9ff99u99999u.
  .u9f999u9f999uu9f999u99999u.
  .u99999u99999uu99999u99999u.
  .uuuuuuuuuuuuuuuuuuuuuuuuuu.
  .u88888u88888uu88888u88888u.
  .u9ff99u99999uu99999u9ff99u.
  .u9f999u99999uu99999u9f999u.
  .u99999u99999uu99999u99999u.
  .uuuuuuuuuuuuuuuuuuuuuuuuuu.
  wwwwwwwwwwwwwwwwwwwwwwwwwwww
  uuuuuuuuuuuuuuuuuuuuuuuuuuuu
`;

const ROUND = `
  ...uuuuu...
  ..u88u88u..
  .u988u988u.
  u9ff9u9999u
  u9f99u9999u
  uuuuuuuuuuu
  u8888u8888u
  u9999u9ff9u
  .u999u9f9u.
  ..u99u99u..
  ...uuuuu...
`;

const ART: Record<WindowKind, string> = { 'four-pane': FOUR_PANE, tall: TALL, shop: SHOP, round: ROUND };

/**
 * Drawn-back curtains: the top row of the glass and its two outer columns turn to a deeper
 * orange, as cloth lit from behind. Works on any window whose glass is a rectangle of panes.
 */
function curtains(art: string): Sprite {
  const rows = art.split('\n').map((r) => r.trim()).filter((r) => r !== '');
  const glass = (ch: string | undefined) => ch === '8' || ch === '9' || ch === 'f';
  const cols = rows[0]!.length;
  let first = cols;
  let last = -1;
  rows.forEach((r) => {
    for (let x = 0; x < cols; x++) {
      if (glass(r[x])) {
        first = Math.min(first, x);
        last = Math.max(last, x);
      }
    }
  });
  const top = rows.findIndex((r) => [...r].some(glass));
  const out = rows.map((r, y) =>
    [...r]
      .map((ch, x) => {
        if (!glass(ch)) return '.';
        // a pelmet across the top, and drapes two pixels wide that taper off below
        if (y === top) return 'p';
        if (x < first + 2 || x > last - 2) return 'p';
        return WARM[ch]!;
      })
      .join(''),
  );
  return sprite(out.join('\n'));
}

/** A window of one kind. `lit` picks its look at dusk; `dark` has no lit layer at all. */
export function windowPart(kind: WindowKind = 'four-pane', lit: LitLook = 'warm'): Part {
  const art = ART[kind];
  const day = sprite(art);
  if (lit === 'dark') return { day };
  return { day, lit: lit === 'curtains' ? curtains(art) : litFrom(art, WARM) };
}

/** Pixel size of a window kind. */
export function windowSize(kind: WindowKind): { w: number; h: number } {
  const s = sprite(ART[kind]);
  return { w: s.w, h: s.h };
}
