/**
 * Outfits: what each clothing zone of a body grid becomes.
 *
 * The body grids in bodies.ts mark clothing zones with lowercase letters. An outfit is a
 * table from those letters to role letters (T top, U top shade, P legs, Q legs shade,
 * S skin, K skin shade, E apron, G apron shade, R accent), one table per view, because an
 * apron has a bib in front and only its straps and bow behind.
 */

export const TOPS = ['shirt', 'sweater', 'apron', 'coat', 'dress', 'overalls', 'uniform'] as const;
export const BOTTOMS = ['trousers', 'skirt', 'shorts'] as const;
export const SLEEVES = ['short', 'long'] as const;

export type TopKind = (typeof TOPS)[number];
export type BottomKind = (typeof BOTTOMS)[number];
export type SleeveKind = (typeof SLEEVES)[number];

/** The three drawn views. Left is the side view mirrored. */
export type View = 'front' | 'back' | 'side';

/** Zone letter -> role letter. */
export type ZoneMap = Readonly<Record<string, string>>;

/** The sleeve length a top has when the spec does not say. */
export const DEFAULT_SLEEVES: Record<TopKind, SleeveKind> = {
  shirt: 'short',
  sweater: 'long',
  apron: 'short',
  coat: 'long',
  dress: 'short',
  overalls: 'short',
  uniform: 'long',
};

const LEGS: Record<BottomKind, ZoneMap> = {
  trousers: { j: 'P', h: 'P', k: 'Q', o: 'P', q: 'P', e: 'Q', g: 'P', d: 'Q' },
  shorts: { j: 'P', h: 'P', k: 'Q', o: 'P', q: 'P', e: 'Q', g: 'S', d: 'K' },
  skirt: { j: 'P', h: 'P', k: 'P', o: 'P', q: 'P', e: 'Q', g: 'S', d: 'K' },
};

/** What a top changes, on top of a plain one. `back` is merged over `all` for the back view. */
const TOP_ZONES: Record<TopKind, { all: ZoneMap; back?: ZoneMap }> = {
  shirt: { all: {} },
  // a ribbed neck
  sweater: { all: { n: 'U' } },
  // a bib from the collar to the knees; from behind, the straps and the bow
  apron: {
    all: { x: 'E', b: 'E', c: 'E', w: 'E', j: 'E', h: 'G', k: 'G' },
    back: { b: 'T', c: 'T', j: 'P', h: 'P', k: 'Q' },
  },
  // long: it covers the hips and ends in a shaded hem
  coat: { all: { n: 'U', w: 'T', y: 'T', j: 'T', o: 'T', h: 'U', k: 'U', q: 'U', e: 'U' } },
  dress: { all: {} },
  // a bib and straps in the colour of the legs, over a shirt
  overalls: { all: { x: 'P', c: 'P', w: 'P', y: 'P' } },
  // a collar in the accent colour
  uniform: { all: { n: 'R' } },
};

/** The zone table of an outfit for one view. */
export function zonesFor(top: TopKind, bottom: BottomKind, sleeves: SleeveKind, view: View): ZoneMap {
  const hem = bottom === 'skirt' ? 'P' : 'U';
  const plain: ZoneMap = { n: 'T', x: 'T', b: 'T', c: 'T', a: sleeves === 'long' ? 'T' : 'S', w: hem, y: hem };
  const extra = TOP_ZONES[top];
  // behind an apron the fork of the trousers shows again, but a skirt has none
  const behind = view === 'back' ? { ...extra.back, ...(extra.back && bottom === 'skirt' ? { k: 'P' } : {}) } : {};
  return { ...LEGS[bottom], ...plain, ...extra.all, ...behind };
}
