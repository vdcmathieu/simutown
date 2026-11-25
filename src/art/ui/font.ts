/**
 * Simutown's bitmap font: proportional, 7-pixel capitals, 5-pixel x-height, 2-pixel descenders.
 *
 * Every glyph sprite is FONT_H rows tall with its top-left at the pen position:
 *
 *   rows 0-2   accent zone (capital accents on rows 0-1, lowercase accents on rows 2-3)
 *   rows 3-9   capital height; the baseline is row 9
 *   rows 10-11 descenders and the cedilla
 *
 * Glyphs are drawn side by side in strips below, one 9-row token per character
 * (7 rows of cap height, then 2 rows of descender). Accented letters are composed
 * from a base letter and an accent mark, so they always match their base.
 */
import { sprite } from '../../core/sprite';
import type { BitmapFont, Glyph } from '../../core/types';

/** Line height and glyph box height in pixels. */
export const FONT_H = 12;
/** Rows above the capital height inside a glyph box. */
export const FONT_TOP = 3;
/** Capital height in pixels. */
export const FONT_CAP = 7;

type Grid = string[];

/** Split a strip of side-by-side glyph tokens into one grid per character. */
function strip(chars: string, art: string): Record<string, Grid> {
  const keys = [...chars];
  const rows = art
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '')
    .map((r) => r.split(/\s+/));
  if (rows.length !== 9) throw new Error(`font strip "${chars}": ${rows.length} rows, expected 9`);
  const out: Record<string, Grid> = {};
  keys.forEach((ch, i) => {
    const g = rows.map((r, y) => {
      const tok = r[i];
      if (tok === undefined) throw new Error(`font strip "${chars}": row ${y} has no token for "${ch}"`);
      return tok;
    });
    if (g.some((r) => r.length !== g[0]!.length)) throw new Error(`font: ragged glyph "${ch}"`);
    out[ch] = [...Array.from({ length: FONT_TOP }, () => '.'.repeat(g[0]!.length)), ...g];
  });
  return out;
}

const UPPER_A_M = strip('ABCDEFGHIJKLM', `
  .###. ####. .###. ####. ##### ##### .###. #...# ### ....# #...# #.... #...#
  #...# #...# #...# #...# #.... #.... #...# #...# .#. ....# #..#. #.... ##.##
  #...# #...# #.... #...# #.... #.... #.... #...# .#. ....# #.#.. #.... #.#.#
  ##### ####. #.... #...# ####. ####. #.### ##### .#. ....# ##... #.... #.#.#
  #...# #...# #.... #...# #.... #.... #...# #...# .#. #...# #.#.. #.... #...#
  #...# #...# #...# #...# #.... #.... #...# #...# .#. #...# #..#. #.... #...#
  #...# ####. .###. ####. ##### #.... .###. #...# ### .###. #...# ##### #...#
  ..... ..... ..... ..... ..... ..... ..... ..... ... ..... ..... ..... .....
  ..... ..... ..... ..... ..... ..... ..... ..... ... ..... ..... ..... .....
`);

const UPPER_N_Z = strip('NOPQRSTUVWXYZ', `
  #...# .###. ####. .###. ####. .###. ##### #...# #...# #...# #...# #...# #####
  ##..# #...# #...# #...# #...# #...# ..#.. #...# #...# #...# #...# #...# ....#
  #.#.# #...# #...# #...# #...# #.... ..#.. #...# #...# #...# .#.#. .#.#. ...#.
  #..## #...# ####. #...# ####. .###. ..#.. #...# #...# #.#.# ..#.. ..#.. ..#..
  #...# #...# #.... #.#.# #.#.. ....# ..#.. #...# .#.#. #.#.# .#.#. ..#.. .#...
  #...# #...# #.... #..#. #..#. #...# ..#.. #...# .#.#. ##.## #...# ..#.. #....
  #...# .###. #.... .##.# #...# .###. ..#.. .###. ..#.. #...# #...# ..#.. #####
  ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... .....
  ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... ..... .....
`);

const LOWER_A_M = strip('abcdefghijklm', `
  ..... #.... .... ....# ..... ..## ..... #.... # ..# #... #. .....
  ..... #.... .... ....# ..... .#.. ..... #.... . ... #... #. .....
  .###. ####. .### .#### .###. #### .#### ####. # ..# #..# #. ####.
  ....# #...# #... #...# #...# .#.. #...# #...# # ..# #.#. #. #.#.#
  .#### #...# #... #...# ##### .#.. #...# #...# # ..# ##.. #. #.#.#
  #...# #...# #... #...# #.... .#.. #...# #...# # ..# #.#. #. #.#.#
  .#### ####. .### .#### .###. .#.. .#### #...# # ..# #..# .# #.#.#
  ..... ..... .... ..... ..... .... ....# ..... . ..# .... .. .....
  ..... ..... .... ..... ..... .... .###. ..... . ##. .... .. .....
`);

const LOWER_N_Z = strip('nopqrstuvwxyz', `
  ..... ..... ..... ..... .... .... .#.. ..... ..... ..... ..... ..... .....
  ..... ..... ..... ..... .... .... .#.. ..... ..... ..... ..... ..... .....
  ####. .###. ####. .#### #.## .### #### #...# #...# #...# #...# #...# #####
  #...# #...# #...# #...# ##.. #... .#.. #...# #...# #...# .#.#. #...# ...#.
  #...# #...# #...# #...# #... .##. .#.. #...# #...# #.#.# ..#.. #...# ..#..
  #...# #...# #...# #...# #... ...# .#.. #...# .#.#. #.#.# .#.#. #...# .#...
  #...# .###. ####. .#### #... ###. ..## .#### ..#.. .#.#. #...# .#### #####
  ..... ..... #.... ....# .... .... .... ..... ..... ..... ..... ....# .....
  ..... ..... #.... ....# .... .... .... ..... ..... ..... ..... .###. .....
`);

const DIGITS = strip('0123456789', `
  .###. .#. .###. .###. ...#. ##### .###. ##### .###. .###.
  #...# ##. #...# #...# ..##. #.... #.... ....# #...# #...#
  #..## .#. ....# ....# .#.#. ####. #.... ...#. #...# #...#
  #.#.# .#. ...#. ..##. #..#. ....# ####. ..#.. .###. .####
  ##..# .#. ..#.. ....# ##### ....# #...# ..#.. #...# ....#
  #...# .#. .#... #...# ...#. #...# #...# ..#.. #...# ....#
  .###. ### ##### .###. ...#. .###. .###. ..#.. .###. .###.
  ..... ... ..... ..... ..... ..... ..... ..... ..... .....
  ..... ... ..... ..... ..... ..... ..... ..... ..... .....
`);

const PUNCT_1 = strip(`!"#$%&'()*+,-./`, `
  # #.# .#.#. ..#.. ##..# .##.. # .# #. ..... ..... .. ... . ..#
  # #.# .#.#. .#### ##.#. #..#. # #. .# ..#.. ..#.. .. ... . ..#
  # ... ##### #.#.. ...#. #.#.. . #. .# #.#.# ..#.. .. ... . .#.
  # ... .#.#. .###. ..#.. .#... . #. .# .###. ##### .. ### . .#.
  # ... ##### ..#.# .#... #.#.# . #. .# #.#.# ..#.. .. ... . .#.
  . ... .#.#. ####. .#.## #..#. . #. .# ..#.. ..#.. .# ... . #..
  # ... .#.#. ..#.. #..## .##.# . .# #. ..... ..... .# ... # #..
  . ... ..... ..... ..... ..... . .. .. ..... ..... .# ... . ...
  . ... ..... ..... ..... ..... . .. .. ..... ..... #. ... . ...
`);

const PUNCT_2 = strip(':;<=>?@[\\]^_`{|}~', `
  . .. .... .... .... .###. .###. ## #.. ## .#. ..... #. ..# # #.. ....
  . .. ...# .... #... #...# #...# #. #.. .# #.# ..... .# .#. # .#. ....
  # .# ..#. #### .#.. ....# #.### #. .#. .# ... ..... .. .#. # .#. .#.#
  . .. .#.. .... ..#. ..##. #.#.# #. .#. .# ... ..... .. #.. # ..# #.#.
  . .. ..#. #### .#.. ..#.. #.### #. .#. .# ... ..... .. .#. # .#. ....
  . .# ...# .... #... ..... #.... #. ..# .# ... ..... .. .#. # .#. ....
  # .# .... .... .... ..#.. .###. ## ..# ## ... ..... .. ..# # #.. ....
  . .# .... .... .... ..... ..... .. ... .. ... ##### .. ... # ... ....
  . #. .... .... .... ..... ..... .. ... .. ... ..... .. ... . ... ....
`);

const SPECIAL = strip('‘’“”–—…•←→↑↓♥«»€°·', `
  .# ## .#..# ##.## ..... ........ ..... ... ....... ....... ..#.. ..#.. ....... ..... ..... ..### .#. .
  #. .# #..#. .#..# ..... ........ ..... ... ..#.... ....#.. .###. ..#.. .##.##. ..... ..... .#... #.# .
  ## #. ##.## #..#. ..... ........ ..... ... .#..... .....#. #.#.# ..#.. ####### ..#.# #.#.. ####. .#. .
  .. .. ..... ..... ##### ######## ..... ### ####### ####### ..#.. ..#.. ####### .#.#. .#.#. .#... ... #
  .. .. ..... ..... ..... ........ ..... ### .#..... .....#. ..#.. #.#.# .#####. #.#.. ..#.# ####. ... .
  .. .. ..... ..... ..... ........ ..... ### ..#.... ....#.. ..#.. .###. ..###.. .#.#. .#.#. .#... ... .
  .. .. ..... ..... ..... ........ #.#.# ... ....... ....... ..#.. ..#.. ...#... ..#.# #.#.. ..### ... .
  .. .. ..... ..... ..... ........ ..... ... ....... ....... ..... ..... ....... ..... ..... ..... ... .
  .. .. ..... ..... ..... ........ ..... ... ....... ....... ..... ..... ....... ..... ..... ..... ... .
`);

const LIGATURES = strip('œæŒÆßı', `
  ....... ....... .###### .###### .##.. .
  ....... ....... #..#... #..#... #..#. .
  .##.##. .##.##. #..#... #..#... #..#. #
  #..#..# ...#..# #..###. ######. #.##. #
  #..#### .###### #..#... #..#... #...# #
  #..#... #..#... #..#... #..#... #...# #
  .##.### .##.### .###### #..#### #.##. #
  ....... ....... ....... ....... ..... .
  ....... ....... ....... ....... ..... .
`);

/** Accent marks: two rows each, with a bias for horizontal placement. */
const MARKS: Record<string, { rows: Grid; bias: 'left' | 'right' }> = {
  grave: { rows: ['#.', '.#'], bias: 'left' },
  acute: { rows: ['.#', '#.'], bias: 'right' },
  circ: { rows: ['.#.', '#.#'], bias: 'left' },
  diaer: { rows: ['...', '#.#'], bias: 'left' },
  tilde: { rows: ['.#.#', '#.#.'], bias: 'left' },
  cedilla: { rows: ['.#', '#.'], bias: 'left' },
};

/** Put a mark on a base grid. Lowercase marks sit two rows lower than capital ones. */
function compose(base: Grid, mark: keyof typeof MARKS, upper: boolean): Grid {
  const { rows, bias } = MARKS[mark]!;
  const bw = base[0]!.length;
  const mw = rows[0]!.length;
  const w = Math.max(bw, mw);
  const bx = Math.floor((w - bw) / 2);
  const mx = bias === 'left' ? Math.floor((w - mw) / 2) : Math.ceil((w - mw) / 2);
  const my = mark === 'cedilla' ? FONT_TOP + FONT_CAP : upper ? 0 : 2;
  return base.map((row, y) => {
    const cells = ('.'.repeat(bx) + row + '.'.repeat(w - bw - bx)).split('');
    const m = rows[y - my];
    if (m) for (let i = 0; i < mw; i++) if (m[i] === '#') cells[mx + i] = '#';
    return cells.join('');
  });
}

const BASE: Record<string, Grid> = {
  ...UPPER_A_M, ...UPPER_N_Z, ...LOWER_A_M, ...LOWER_N_Z, ...DIGITS,
  ...PUNCT_1, ...PUNCT_2, ...SPECIAL, ...LIGATURES,
};

/** Accented letters as [base, mark]. Lowercase i takes its accents on the dotless ı. */
const ACCENTED: Record<string, [string, keyof typeof MARKS]> = {
  à: ['a', 'grave'], á: ['a', 'acute'], â: ['a', 'circ'], ä: ['a', 'diaer'], ã: ['a', 'tilde'],
  è: ['e', 'grave'], é: ['e', 'acute'], ê: ['e', 'circ'], ë: ['e', 'diaer'],
  ì: ['ı', 'grave'], í: ['ı', 'acute'], î: ['ı', 'circ'], ï: ['ı', 'diaer'],
  ò: ['o', 'grave'], ó: ['o', 'acute'], ô: ['o', 'circ'], ö: ['o', 'diaer'], õ: ['o', 'tilde'],
  ù: ['u', 'grave'], ú: ['u', 'acute'], û: ['u', 'circ'], ü: ['u', 'diaer'],
  ý: ['y', 'acute'], ÿ: ['y', 'diaer'], ñ: ['n', 'tilde'], ç: ['c', 'cedilla'],
  À: ['A', 'grave'], Á: ['A', 'acute'], Â: ['A', 'circ'], Ä: ['A', 'diaer'], Ã: ['A', 'tilde'],
  È: ['E', 'grave'], É: ['E', 'acute'], Ê: ['E', 'circ'], Ë: ['E', 'diaer'],
  Ì: ['I', 'grave'], Í: ['I', 'acute'], Î: ['I', 'circ'], Ï: ['I', 'diaer'],
  Ò: ['O', 'grave'], Ó: ['O', 'acute'], Ô: ['O', 'circ'], Ö: ['O', 'diaer'], Õ: ['O', 'tilde'],
  Ù: ['U', 'grave'], Ú: ['U', 'acute'], Û: ['U', 'circ'], Ü: ['U', 'diaer'],
  Ý: ['Y', 'acute'], Ÿ: ['Y', 'diaer'], Ñ: ['N', 'tilde'], Ç: ['C', 'cedilla'],
};

/** Word space: a blank glyph. */
const SPACE_W = 3;

function toGlyph(g: Grid): Glyph {
  return { sprite: sprite(g.join('\n'), { legend: { '#': 'steel.0' } }), advance: g[0]!.length + 1 };
}

function buildFont(): BitmapFont {
  const glyphs: Record<string, Glyph> = {};
  glyphs[' '] = toGlyph(Array.from({ length: FONT_H }, () => '.'.repeat(SPACE_W)));
  for (const [ch, g] of Object.entries(BASE)) glyphs[ch] = toGlyph(g);
  for (const [ch, [base, mark]] of Object.entries(ACCENTED)) {
    const upper = base !== base.toLowerCase();
    glyphs[ch] = toGlyph(compose(BASE[base]!, mark, upper));
  }
  // The non-breaking space looks like a space.
  glyphs[' '] = glyphs[' ']!;
  return { height: FONT_H, glyphs };
}

/**
 * The built-in font. Covers printable ASCII, French and German accented letters
 * (and a few Spanish ones), œ æ ß, curly quotes, guillemets, dashes, ellipsis, bullet,
 * arrows, a heart, the euro, degree and middle dot. Glyphs are drawn in `steel.0`;
 * the text drawer recolours them.
 */
export const font: BitmapFont = buildFont();
