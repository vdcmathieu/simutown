/**
 * Text-grid helpers for the character kit.
 *
 * The kit assembles a person from layers (legs, torso, accessories, head, hat) before
 * anything becomes a sprite, so layers are plain text: a `Grid` is a list of rows, one
 * character per pixel. `.` is empty and `_` means "erase what is below" when a grid is
 * laid over another one (a hat uses it to remove the bun it covers).
 */

/** Rows of equal width, one character per pixel. */
export type Grid = readonly string[];

/** Every character grid is this wide. */
export const GRID_W = 16;

const EMPTY_ROW = '.'.repeat(GRID_W);

/** An empty grid of `h` rows. */
export function emptyGrid(h: number): Grid {
  return Array.from({ length: h }, () => EMPTY_ROW);
}

/**
 * Parse a block of art into a grid. Rows are trimmed, blank rows dropped, and every row
 * must be GRID_W wide. With `top` and `height` the art is placed on row `top` of an
 * otherwise empty grid `height` rows tall, so a small piece can be written without its
 * empty rows.
 */
export function grid(art: string, top = 0, height?: number): Grid {
  const rows = art
    .split('\n')
    .map((r) => r.trim())
    .filter((r) => r !== '');
  for (const r of rows) {
    if (r.length !== GRID_W) throw new Error(`character grid row is ${r.length} wide, expected ${GRID_W}: "${r}"`);
  }
  const h = height ?? top + rows.length;
  if (top + rows.length > h) throw new Error(`character grid of ${rows.length} rows does not fit at row ${top} of ${h}`);
  return [...emptyGrid(top), ...rows, ...emptyGrid(h - top - rows.length)];
}

/**
 * Lay `layer` over `base`, moved by (dx, dy). Empty pixels of the layer leave the base
 * alone, `_` erases it. Parts of the layer that fall outside the base are dropped.
 */
export function over(base: Grid, layer: Grid, dx = 0, dy = 0): Grid {
  const out = base.map((r) => r.split(''));
  layer.forEach((row, y) => {
    const target = out[y + dy];
    if (!target) return;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const tx = x + dx;
      if (ch === '.' || tx < 0 || tx >= target.length) continue;
      target[tx] = ch === '_' ? '.' : ch;
    }
  });
  return out.map((r) => r.join(''));
}

/** Mirror a grid left to right. */
export function mirror(g: Grid): Grid {
  return g.map((r) => r.split('').reverse().join(''));
}

/** Replace characters: `table` maps a character to its replacement. */
export function mapChars(g: Grid, table: Readonly<Record<string, string>>): Grid {
  return g.map((r) =>
    r
      .split('')
      .map((ch) => table[ch] ?? ch)
      .join(''),
  );
}

/**
 * Make a grid wider by repeating the given columns, then cut it back to GRID_W by dropping
 * `cut` columns on the left and the rest on the right. Repeating a column never opens an
 * outline, so this is how the broad body is derived from the adult one.
 */
export function widen(g: Grid, columns: readonly number[], cut: number): Grid {
  return g.map((r) => {
    let out = '';
    for (let x = 0; x < r.length; x++) out += columns.includes(x) ? r[x]! + r[x]! : r[x]!;
    return out.slice(cut, cut + GRID_W);
  });
}

/** Move a grid by (dx, dy), keeping its size. What leaves the grid is lost. */
export function shift(g: Grid, dx: number, dy = 0): Grid {
  return over(emptyGrid(g.length), g, dx, dy);
}

/** Lay `layer` over `base` like `over`, but grow the base downwards first so nothing of the layer is lost. */
export function overTall(base: Grid, layer: Grid): Grid {
  const tall = layer.length > base.length ? [...base, ...emptyGrid(layer.length - base.length)] : base;
  return over(tall, layer);
}
