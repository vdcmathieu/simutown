/**
 * Checks a character sprite against the outline rule of docs/STYLE.md: people have a
 * closed ink outline, so no coloured pixel may touch an empty pixel or the edge of the box.
 */
import { slotIndex } from '../../core/palette';
import type { Sprite } from '../../core/sprite';

const INK = slotIndex('steel.0');

/** The coloured pixels of `s` that touch an empty pixel or the edge, as "x,y" strings. */
export function openOutline(s: Sprite): string[] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 0 : s.px[y * s.w + x]!);
  const open: string[] = [];
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = at(x, y);
      if (v === 0 || v === INK) continue;
      if (at(x - 1, y) === 0 || at(x + 1, y) === 0 || at(x, y - 1) === 0 || at(x, y + 1) === 0) open.push(`${x},${y}`);
    }
  }
  return open;
}

/** The sprite as text, one character per pixel: `.` empty, `#` ink, `o` colour. For error messages. */
export function silhouette(s: Sprite): string {
  let out = '';
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = s.px[y * s.w + x]!;
      out += v === 0 ? '.' : v === INK ? '#' : 'o';
    }
    out += '\n';
  }
  return out;
}
