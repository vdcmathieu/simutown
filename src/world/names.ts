/**
 * Error messages a scene author (often a language model) can act on:
 * every "unknown name" error lists the valid names and suggests the nearest one.
 */

/** Edit distance between two strings (case-insensitive). */
function distance(a: string, b: string): number {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const sub = prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur.push(Math.min(prev[j]! + 1, cur[j - 1]! + 1, sub));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** The valid name closest to `name`, or undefined when nothing is close enough to be a likely typo. */
export function nearest(name: string, valid: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestD = Infinity;
  for (const v of valid) {
    const d = distance(name, v);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  const limit = Math.max(2, Math.floor(name.length / 3));
  return bestD <= limit ? best : undefined;
}

/**
 * Build an error for an unknown name, e.g.
 * `Unknown place "cafe.dor". Did you mean "cafe.door"? Valid places: cafe.door, plaza.`
 */
export function unknownName(what: string, name: string, valid: readonly string[], hint = ''): Error {
  const sorted = [...valid].sort();
  const guess = nearest(name, sorted);
  const parts = [`Unknown ${what} "${name}".`];
  if (guess) parts.push(`Did you mean "${guess}"?`);
  parts.push(sorted.length ? `Valid ${what}s: ${sorted.join(', ')}.` : `There are no ${what}s.`);
  if (hint) parts.push(hint);
  return new Error(parts.join(' '));
}
